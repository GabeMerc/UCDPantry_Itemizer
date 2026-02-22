import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchRecipeImage } from "@/lib/google-image";

async function getPexelsKey(supabase: ReturnType<typeof createServiceClient>): Promise<string | null> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "pexels_api_key").single();
  return (data?.value as string) ?? process.env.PEXELS_API_KEY ?? null;
}

/** GET — count recipes with no image_url. */
export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { count } = await supabase
    .from("recipes_cache")
    .select("*", { count: "exact", head: true })
    .is("image_url", null);

  return NextResponse.json({ missing: count ?? 0 });
}

/**
 * POST — fetch Pexels images for recipes that have no image_url.
 *
 * Body (all optional):
 *   spoonacular_id  – target a specific recipe; omit to process the oldest N missing
 *   limit           – how many to process (default 1); omit or pass -1 to fill all
 */
export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const pexelsKey = await getPexelsKey(supabase);

  if (!pexelsKey) {
    return NextResponse.json(
      { error: "Pexels API key not configured. Add it in Admin → Settings or set PEXELS_API_KEY in your environment variables." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({})) as {
    spoonacular_id?: number;
    limit?: number;
  };

  // limit === -1 means fill all; otherwise default to 1
  const limit = body.limit === -1 ? undefined : (body.limit ?? 1);

  // Build query — either a specific recipe, first N missing, or all missing
  let q = supabase
    .from("recipes_cache")
    .select("spoonacular_id, title")
    .is("image_url", null)
    .order("created_at", { ascending: true });

  if (body.spoonacular_id !== undefined) {
    q = q.eq("spoonacular_id", body.spoonacular_id);
  } else if (limit !== undefined) {
    q = q.limit(limit);
  }
  // if limit is undefined (fill all), no .limit() call → returns everything

  const { data: recipes, error: fetchError } = await q;
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ updated: 0, remaining: 0, message: "No recipes are missing images." });
  }

  let updated = 0;
  for (const recipe of recipes) {
    const imageUrl = await fetchRecipeImage(recipe.title, pexelsKey);
    if (imageUrl) {
      const { error } = await supabase
        .from("recipes_cache")
        .update({ image_url: imageUrl })
        .eq("spoonacular_id", recipe.spoonacular_id);
      if (!error) updated++;
    }
  }

  const { count: remaining } = await supabase
    .from("recipes_cache")
    .select("*", { count: "exact", head: true })
    .is("image_url", null);

  return NextResponse.json({
    updated,
    remaining: remaining ?? 0,
    message: `Updated ${updated} of ${recipes.length} recipe${recipes.length !== 1 ? "s" : ""} with Pexels images.`,
  });
}
