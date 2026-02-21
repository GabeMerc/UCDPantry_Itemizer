import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  EnrichedRecipe,
  InventoryItem,
  CachedRecipe,
  RecipeNutrition,
  CachedIngredient,
  SpoonacularRecipeDetail,
  MealType,
} from "@/lib/types";

const CACHE_MAX_AGE_DAYS = 7;
const CACHE_HIT_THRESHOLD = 10;

// Pantry staples that Spoonacular's ignorePantry already handles.
// Sending them wastes URL space and can cause long-URL issues.
const PANTRY_SKIP = new Set([
  "salt", "black pepper", "granulated sugar", "brown sugar",
  "all-purpose flour", "baking powder", "baking soda", "vanilla extract",
  "cinnamon", "cumin", "paprika", "chili powder", "dried oregano",
  "dried basil", "garlic powder", "onion powder", "red pepper flakes",
  "cornstarch", "white vinegar", "apple cider vinegar",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ingredients = searchParams.get("ingredients") ?? "";
  const diet = searchParams.get("diet") ?? "";
  const forceRefresh = searchParams.get("refresh") === "1";
  const maxBuyParam = searchParams.get("maxBuyItems");
  const maxBuyItems: number | null =
    maxBuyParam !== null ? parseInt(maxBuyParam, 10) : null;

  if (!ingredients) {
    return NextResponse.json({ recipes: [] });
  }

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Spoonacular API key not configured." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const ingredientList = ingredients.split(",").map((s) => s.trim().toLowerCase());

  // Filter out common pantry staples for the Spoonacular query (keeps local matching intact)
  const spoonacularIngredients = ingredientList.filter(
    (name) => !PANTRY_SKIP.has(name.toLowerCase())
  );

  // ── Build shipment map for "arriving soon" annotations ─────────────────────
  const shipmentMap = await buildShipmentMap(supabase, today);

  // ── Step 1: Try cache (skip if force-refresh) ─────────────────────────────
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - CACHE_MAX_AGE_DAYS);

  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("recipes_cache")
      .select("*")
      .overlaps("ingredient_names", ingredientList)
      .gte("last_fetched_at", staleCutoff.toISOString());

    if (cached && cached.length >= CACHE_HIT_THRESHOLD) {
      // Serve from cache — compute used/missed counts dynamically
      const enriched = buildEnrichedFromCache(
        cached as CachedRecipe[],
        ingredientList,
        shipmentMap
      );
      const filtered = applyBudgetFilter(enriched, maxBuyItems, shipmentMap);
      return NextResponse.json({ recipes: filtered, source: "cache" });
    }
  }

  // ── Step 2: Call Spoonacular findByIngredients ────────────────────────────
  const params = new URLSearchParams({
    apiKey,
    ingredients: spoonacularIngredients.join(","),
    number: "24",
    ranking: "2",
    ignorePantry: "true",
  });
  if (diet) params.set("diet", diet);

  const spoonRes = await fetch(
    `https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`
  );

  if (!spoonRes.ok) {
    const text = await spoonRes.text();
    return NextResponse.json(
      { error: `Spoonacular error: ${text}` },
      { status: 502 }
    );
  }

  const raw: EnrichedRecipe[] = await spoonRes.json();

  // ── Step 3: Fetch full details for recipes not in cache (or stale) ────────
  const recipeIds = raw.map((r) => r.id);

  // Find which IDs are already fresh in cache
  const { data: existingCached } = await supabase
    .from("recipes_cache")
    .select("spoonacular_id")
    .in("spoonacular_id", recipeIds)
    .gte("last_fetched_at", staleCutoff.toISOString());

  const freshIds = new Set((existingCached ?? []).map((r: { spoonacular_id: number }) => r.spoonacular_id));
  const idsToFetch = recipeIds.filter((id) => !freshIds.has(id));

  if (idsToFetch.length > 0) {
    // Fetch full details + nutrition from Spoonacular informationBulk
    try {
      const detailParams = new URLSearchParams({
        apiKey,
        ids: idsToFetch.join(","),
        includeNutrition: "true",
      });

      const detailRes = await fetch(
        `https://api.spoonacular.com/recipes/informationBulk?${detailParams.toString()}`
      );

      if (detailRes.ok) {
        const details: SpoonacularRecipeDetail[] = await detailRes.json();
        await upsertToCache(supabase, details);
      }
    } catch {
      // Non-critical — we still have the findByIngredients results
    }
  }

  // ── Step 4: Read back all cache entries for these recipes ─────────────────
  const { data: fullCached } = await supabase
    .from("recipes_cache")
    .select("*")
    .in("spoonacular_id", recipeIds);

  const cacheMap = new Map<number, CachedRecipe>();
  for (const c of (fullCached ?? []) as CachedRecipe[]) {
    cacheMap.set(c.spoonacular_id, c);
  }

  // ── Step 5: Enrich results with cache data + shipment info ────────────────
  const enriched: EnrichedRecipe[] = raw.map((recipe) => {
    const upcomingIngredients = computeUpcomingIngredients(
      recipe.missedIngredients ?? [],
      shipmentMap
    );

    const cached = cacheMap.get(recipe.id);
    return {
      ...recipe,
      upcomingIngredients,
      ...(cached
        ? {
            nutrition: cached.nutrition as RecipeNutrition | undefined,
            cuisines: cached.cuisines,
            dietary_tags: cached.dietary_tags,
            ready_in_minutes: cached.ready_in_minutes,
            source_url: cached.source_url,
            instructions: cached.instructions,
            meal_type: cached.meal_type,
          }
        : {}),
    };
  });

  const filtered = applyBudgetFilter(enriched, maxBuyItems, shipmentMap);
  return NextResponse.json({ recipes: filtered, source: "api" });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Hard-filter recipes by maxBuyItems budget.
 * A recipe's "buy count" = missed ingredients that are NOT arriving soon.
 * If maxBuyItems is 0, only recipes with 0 non-pantry ingredients pass.
 */
function applyBudgetFilter(
  recipes: EnrichedRecipe[],
  maxBuyItems: number | null,
  shipmentMap: Record<string, string>
): EnrichedRecipe[] {
  if (maxBuyItems === null || isNaN(maxBuyItems)) return recipes;

  return recipes.filter((recipe) => {
    const missed = recipe.missedIngredients ?? [];
    const upcoming = recipe.upcomingIngredients ?? [];
    const upcomingNames = new Set(
      upcoming.map((u) => u.name.toLowerCase())
    );

    // Count missed ingredients that are NOT arriving soon
    const buyCount = missed.filter(
      (ing) => !upcomingNames.has(ing.name.toLowerCase())
    ).length;

    return buyCount <= maxBuyItems;
  });
}

function classifyMealType(dishTypes: string[]): MealType {
  const types = (dishTypes ?? []).map((t) => t.toLowerCase());
  if (types.some((t) => ["breakfast", "morning meal", "brunch"].includes(t)))
    return "breakfast";
  if (
    types.some((t) =>
      ["lunch", "soup", "salad", "sandwich", "snack"].includes(t)
    )
  )
    return "lunch";
  if (
    types.some((t) => ["dinner", "main course", "main dish"].includes(t))
  )
    return "dinner";
  return "unknown";
}

async function buildShipmentMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  today: string
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  const [{ data: shipments }, { data: comingSoon }] = await Promise.all([
    supabase
      .from("shipments")
      .select("item_name, expected_date")
      .gte("expected_date", today),
    supabase
      .from("inventory")
      .select("name, date_available")
      .gt("date_available", today),
  ]);

  for (const s of shipments ?? []) {
    map[s.item_name.toLowerCase()] = s.expected_date;
  }
  for (const item of comingSoon ?? []) {
    if (item.date_available) {
      map[(item as InventoryItem).name.toLowerCase()] = item.date_available;
    }
  }

  return map;
}

function computeUpcomingIngredients(
  missedIngredients: Array<{ name: string }>,
  shipmentMap: Record<string, string>
): Array<{ name: string; availableDate: string }> {
  return missedIngredients
    .map((ing) => {
      const key = ing.name.toLowerCase();
      const match = Object.entries(shipmentMap).find(
        ([shipName]) => shipName.includes(key) || key.includes(shipName)
      );
      if (match) return { name: ing.name, availableDate: match[1] };
      return null;
    })
    .filter(Boolean) as Array<{ name: string; availableDate: string }>;
}

function buildEnrichedFromCache(
  cached: CachedRecipe[],
  ingredientList: string[],
  shipmentMap: Record<string, string>
): EnrichedRecipe[] {
  return cached
    .map((c) => {
      const allIngredients = (c.ingredients as CachedIngredient[]) ?? [];
      const ingredientSet = new Set(ingredientList);

      const usedIngredients = allIngredients.filter((ing) =>
        ingredientSet.has(ing.name.toLowerCase())
      );
      const missedIngredients = allIngredients.filter(
        (ing) => !ingredientSet.has(ing.name.toLowerCase())
      );

      const upcomingIngredients = computeUpcomingIngredients(
        missedIngredients,
        shipmentMap
      );

      return {
        id: c.spoonacular_id,
        title: c.title,
        image: c.image_url ?? "",
        imageType: "jpg",
        usedIngredientCount: usedIngredients.length,
        missedIngredientCount: missedIngredients.length,
        usedIngredients: usedIngredients.map((ing) => ({
          id: ing.id,
          amount: ing.amount,
          unit: ing.unit,
          unitLong: ing.unit,
          unitShort: ing.unit,
          aisle: "",
          name: ing.name,
          original: ing.original,
          originalName: ing.name,
          meta: [],
          image: "",
        })),
        missedIngredients: missedIngredients.map((ing) => ({
          id: ing.id,
          amount: ing.amount,
          unit: ing.unit,
          unitLong: ing.unit,
          unitShort: ing.unit,
          aisle: "",
          name: ing.name,
          original: ing.original,
          originalName: ing.name,
          meta: [],
          image: "",
        })),
        unusedIngredients: [],
        likes: 0,
        upcomingIngredients,
        nutrition: c.nutrition as RecipeNutrition | undefined,
        cuisines: c.cuisines,
        dietary_tags: c.dietary_tags,
        ready_in_minutes: c.ready_in_minutes,
        source_url: c.source_url,
        instructions: c.instructions,
        meal_type: c.meal_type,
      } as EnrichedRecipe;
    })
    .sort((a, b) => b.usedIngredientCount - a.usedIngredientCount)
    .slice(0, 24);
}

async function upsertToCache(
  supabase: Awaited<ReturnType<typeof createClient>>,
  details: SpoonacularRecipeDetail[]
) {
  for (const d of details) {
    const ingredientNames = (d.extendedIngredients ?? []).map((i) =>
      i.name.toLowerCase()
    );

    const ingredients: CachedIngredient[] = (d.extendedIngredients ?? []).map(
      (i) => ({
        id: i.id,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        original: i.original,
      })
    );

    let nutrition: RecipeNutrition | null = null;
    if (d.nutrition?.nutrients) {
      const findNutrient = (name: string) =>
        d.nutrition!.nutrients.find(
          (n) => n.name.toLowerCase() === name.toLowerCase()
        )?.amount ?? 0;

      nutrition = {
        calories: findNutrient("Calories"),
        protein: findNutrient("Protein"),
        carbs: findNutrient("Carbohydrates"),
        fat: findNutrient("Fat"),
      };
    }

    const mealType = classifyMealType(d.dishTypes ?? []);

    await supabase.from("recipes_cache").upsert(
      {
        spoonacular_id: d.id,
        title: d.title,
        image_url: d.image,
        ingredient_names: ingredientNames,
        ingredients: ingredients as unknown as Record<string, unknown>,
        instructions: d.instructions,
        nutrition: nutrition as unknown as Record<string, unknown>,
        dietary_tags: d.diets ?? [],
        cuisines: d.cuisines ?? [],
        ready_in_minutes: d.readyInMinutes,
        source_url: d.sourceUrl,
        meal_type: mealType,
        last_fetched_at: new Date().toISOString(),
      },
      { onConflict: "spoonacular_id" }
    );
  }
}
