import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  EnrichedRecipe,
  InventoryItem,
  CachedRecipe,
  RecipeNutrition,
  CachedIngredient,
} from "@/lib/types";

// Students always read from recipes_cache — no Spoonacular calls here.
// Admins trigger Spoonacular fetches via /api/admin/fetch-recipes.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ingredients = searchParams.get("ingredients") ?? "";
  const maxBuyParam = searchParams.get("maxBuyItems");
  const maxBuyItems: number | null =
    maxBuyParam !== null ? parseInt(maxBuyParam, 10) : null;

  if (!ingredients) {
    return NextResponse.json({ recipes: [], source: "cache" });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const ingredientList = ingredients
    .split(",")
    .map((s) => s.trim().toLowerCase());

  // Build shipment map for "arriving soon" annotations
  const shipmentMap = await buildShipmentMap(supabase, today);

  // Read all matching recipes from cache (GIN overlap on ingredient_names)
  const { data: cached, error } = await supabase
    .from("recipes_cache")
    .select("*")
    .overlaps("ingredient_names", ingredientList);

  if (error) {
    return NextResponse.json(
      { error: "Failed to query recipe library." },
      { status: 500 }
    );
  }

  const enriched = buildEnrichedFromCache(
    (cached ?? []) as CachedRecipe[],
    ingredientList,
    shipmentMap
  );

  const filtered = applyBudgetFilter(enriched, maxBuyItems, shipmentMap);
  return NextResponse.json({ recipes: filtered, source: "cache" });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyBudgetFilter(
  recipes: EnrichedRecipe[],
  maxBuyItems: number | null,
  shipmentMap: Record<string, string>
): EnrichedRecipe[] {
  if (maxBuyItems === null || isNaN(maxBuyItems)) return recipes;

  return recipes.filter((recipe) => {
    const missed = recipe.missedIngredients ?? [];
    const upcoming = recipe.upcomingIngredients ?? [];
    const upcomingNames = new Set(upcoming.map((u) => u.name.toLowerCase()));

    const buyCount = missed.filter(
      (ing) => !upcomingNames.has(ing.name.toLowerCase())
    ).length;

    return buyCount <= maxBuyItems;
  });
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
    .sort((a, b) => b.usedIngredientCount - a.usedIngredientCount);
}
