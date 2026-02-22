import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  SpoonacularRecipeDetail,
  CachedIngredient,
  RecipeNutrition,
  MealType,
} from "@/lib/types";

const PANTRY_SKIP = new Set([
  "salt", "black pepper", "granulated sugar", "brown sugar",
  "all-purpose flour", "baking powder", "baking soda", "vanilla extract",
  "cinnamon", "cumin", "paprika", "chili powder", "dried oregano",
  "dried basil", "garlic powder", "onion powder", "red pepper flakes",
  "cornstarch", "white vinegar", "apple cider vinegar",
]);

export async function POST(req: NextRequest) {
  // Auth check — must be a signed-in admin
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve Spoonacular API key: DB-saved key takes priority over env var
  const apiKey = await resolveSpoonacularKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Spoonacular API key configured. Go to Admin → Settings to add one." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const ingredients: string[] = body.ingredients ?? [];
  const count: number = Math.min(body.count ?? 24, 50);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "No ingredients provided." }, { status: 400 });
  }

  // Strip staples to keep query clean
  const queryIngredients = ingredients.filter(
    (i) => !PANTRY_SKIP.has(i.toLowerCase())
  );

  // ── Step 1: findByIngredients ─────────────────────────────────────────────
  const params = new URLSearchParams({
    apiKey,
    ingredients: queryIngredients.join(","),
    number: String(count),
    ranking: "2",
    ignorePantry: "true",
  });

  const findController = new AbortController();
  const findTimeout = setTimeout(() => findController.abort(), 25000);

  let findRes: Response;
  try {
    findRes = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`,
      { signal: findController.signal }
    );
  } catch {
    return NextResponse.json({ error: "Spoonacular request timed out. Try again." }, { status: 504 });
  } finally {
    clearTimeout(findTimeout);
  }

  if (!findRes.ok) {
    const text = await findRes.text();
    return NextResponse.json(
      { error: `Spoonacular error: ${text}` },
      { status: 502 }
    );
  }

  const found: Array<{ id: number }> = await findRes.json();
  if (found.length === 0) {
    return NextResponse.json({ added: 0, message: "No recipes found for those ingredients." });
  }

  const recipeIds = found.map((r) => r.id);

  // ── Step 2: informationBulk (nutrition + details) ────────────────────────
  const detailParams = new URLSearchParams({
    apiKey,
    ids: recipeIds.join(","),
    includeNutrition: "true",
  });

  const detailController = new AbortController();
  const detailTimeout = setTimeout(() => detailController.abort(), 25000);

  let detailRes: Response;
  try {
    detailRes = await fetch(
      `https://api.spoonacular.com/recipes/informationBulk?${detailParams.toString()}`,
      { signal: detailController.signal }
    );
  } catch {
    return NextResponse.json({ error: "Spoonacular detail request timed out. Try again." }, { status: 504 });
  } finally {
    clearTimeout(detailTimeout);
  }

  if (!detailRes.ok) {
    const text = await detailRes.text();
    return NextResponse.json(
      { error: `Spoonacular detail error: ${text}` },
      { status: 502 }
    );
  }

  const details: SpoonacularRecipeDetail[] = await detailRes.json();

  // ── Step 3: Upsert to recipes_cache (service role bypasses RLS) ──────────
  const supabase = createServiceClient();
  let added = 0;

  for (const d of details) {
    const ingredientNames = (d.extendedIngredients ?? []).map((i) =>
      i.name.toLowerCase()
    );

    const ingredientsData: CachedIngredient[] = (d.extendedIngredients ?? []).map(
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
      const find = (name: string) =>
        d.nutrition!.nutrients.find(
          (n) => n.name.toLowerCase() === name.toLowerCase()
        )?.amount ?? 0;

      nutrition = {
        calories: find("Calories"),
        protein: find("Protein"),
        carbs: find("Carbohydrates"),
        fat: find("Fat"),
      };
    }

    const mealType = classifyMealType(d.dishTypes ?? []);

    const { error } = await supabase.from("recipes_cache").upsert(
      {
        spoonacular_id: d.id,
        title: d.title,
        image_url: d.image,
        ingredient_names: ingredientNames,
        ingredients: ingredientsData as unknown as Record<string, unknown>,
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

    if (!error) added++;
  }

  return NextResponse.json({
    added,
    total: details.length,
    message: `Successfully added/updated ${added} recipes.`,
  });
}

/** Reads the Spoonacular key from site_settings, falling back to env var. */
async function resolveSpoonacularKey(): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "spoonacular_api_key")
      .single();
    if (data?.value) return data.value as string;
  } catch {
    // table may not exist yet — fall through to env
  }
  return process.env.SPOONACULAR_API_KEY ?? null;
}

function classifyMealType(dishTypes: string[]): MealType {
  const types = (dishTypes ?? []).map((t) => t.toLowerCase());
  if (types.some((t) => ["breakfast", "morning meal", "brunch"].includes(t)))
    return "breakfast";
  if (types.some((t) => ["lunch", "soup", "salad", "sandwich", "snack"].includes(t)))
    return "lunch";
  if (types.some((t) => ["dinner", "main course", "main dish"].includes(t)))
    return "dinner";
  return "unknown";
}
