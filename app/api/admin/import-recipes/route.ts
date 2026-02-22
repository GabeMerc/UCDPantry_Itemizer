import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import starterRecipes from "@/data/recipes.json";
import { fetchRecipeImage } from "@/lib/google-image";

export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept a custom recipes array in the body, or fall back to starter library
  let recipes: typeof starterRecipes;
  try {
    const body = await req.json();
    recipes = body.recipes ?? starterRecipes;
  } catch {
    recipes = starterRecipes;
  }

  if (!Array.isArray(recipes) || recipes.length === 0) {
    return NextResponse.json({ error: "No recipes to import." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve Pexels key — DB first, then env fallback
  const { data: pexelsKeyData } = await supabase.from("site_settings").select("value").eq("key", "pexels_api_key").single();
  const pexelsKey: string | undefined = (pexelsKeyData?.value as string) ?? process.env.PEXELS_API_KEY;

  let imported = 0;
  let failed = 0;

  for (const r of recipes) {
    const row = {
      spoonacular_id: r.spoonacular_id,
      title: r.title,
      image_url: r.image_url ?? null,
      ingredient_names: r.ingredient_names,
      ingredients: r.ingredients as unknown as Record<string, unknown>,
      instructions: r.instructions ?? null,
      nutrition: r.nutrition as unknown as Record<string, unknown>,
      dietary_tags: r.dietary_tags ?? [],
      cuisines: r.cuisines ?? [],
      ready_in_minutes: r.ready_in_minutes ?? null,
      source_url: r.source_url ?? null,
      meal_type: r.meal_type ?? "unknown",
      last_fetched_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("recipes_cache")
      .upsert(row, { onConflict: "spoonacular_id" });

    if (error) {
      failed++;
    } else {
      imported++;
    }
  }

  // Auto-fetch Google images for imported recipes that have no image (up to 5 per batch)
  const needImages = recipes
    .filter((r) => !r.image_url)
    .slice(0, 5);

  let imagesAdded = 0;
  for (const r of needImages) {
    const url = await fetchRecipeImage(r.title, pexelsKey);
    if (url) {
      await supabase
        .from("recipes_cache")
        .update({ image_url: url })
        .eq("spoonacular_id", r.spoonacular_id);
      imagesAdded++;
    }
  }

  return NextResponse.json({
    imported,
    failed,
    imagesAdded,
    total: recipes.length,
    message: `Imported ${imported} of ${recipes.length} recipes.${imagesAdded ? ` Auto-fetched ${imagesAdded} image${imagesAdded !== 1 ? "s" : ""} from Google.` : ""}`,
  });
}
