import { createClient } from "@/lib/supabase/server";
import type { InventoryItem, PopularRecipe, CachedRecipe } from "@/lib/types";
import RecipesClient from "@/components/student/RecipesClient";

export const revalidate = 60;

export default async function RecipesPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // 7 days ago for weekly top picks
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  const [inventoryRes, popularRes, weeklyTopRes] = await Promise.all([
    supabase
      .from("inventory")
      .select("name, dietary_tags, date_available, quantity")
      .or(`date_available.is.null,date_available.lte.${today}`)
      .gt("quantity", 0),
    supabase
      .from("popular_recipes")
      .select("*")
      .order("total_interactions", { ascending: false })
      .limit(20),
    // Weekly top picks: top 3 liked recipes in the past 7 days
    supabase
      .from("recipe_interactions")
      .select("recipe_id, recipe_title, recipe_image_url")
      .eq("interaction_type", "like")
      .gte("created_at", weekAgoISO),
  ]);

  const ingredientNames = (inventoryRes.data ?? []).map(
    (i: Pick<InventoryItem, "name">) => i.name
  );

  // Compute weekly top 3 by counting likes
  const weeklyLikes = weeklyTopRes.data ?? [];
  const likeCountMap = new Map<
    number,
    { recipe_id: number; recipe_title: string; recipe_image_url: string | null; count: number }
  >();
  for (const row of weeklyLikes) {
    const existing = likeCountMap.get(row.recipe_id);
    if (existing) {
      existing.count++;
    } else {
      likeCountMap.set(row.recipe_id, {
        recipe_id: row.recipe_id,
        recipe_title: row.recipe_title,
        recipe_image_url: row.recipe_image_url,
        count: 1,
      });
    }
  }
  const weeklyTopPicks = [...likeCountMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Fetch cache data for all popular recipes (images, nutrition, cuisines)
  const topPickIds = weeklyTopPicks.map((p) => p.recipe_id);
  const allPopularIds = [
    ...new Set([
      ...topPickIds,
      ...(popularRes.data ?? []).map((r: { recipe_id: number }) => r.recipe_id),
    ]),
  ];
  let cachedDetails: CachedRecipe[] = [];
  if (allPopularIds.length > 0) {
    const { data } = await supabase
      .from("recipes_cache")
      .select("*")
      .in("spoonacular_id", allPopularIds);
    cachedDetails = (data ?? []) as CachedRecipe[];
  }

  return (
    <RecipesClient
      ingredientNames={ingredientNames}
      popularRecipes={(popularRes.data ?? []) as PopularRecipe[]}
      weeklyTopPicks={weeklyTopPicks}
      cachedRecipes={cachedDetails}
    />
  );
}
