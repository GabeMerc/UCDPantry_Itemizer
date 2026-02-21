import { createClient } from "@/lib/supabase/server";
import type { InventoryItem, PopularRecipe } from "@/lib/types";
import SwipeClient from "@/components/student/SwipeClient";

export const revalidate = 60;

export default async function SwipePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [inventoryRes, popularRes] = await Promise.all([
    supabase
      .from("inventory")
      .select("name, dietary_tags, date_available, quantity")
      .or(`date_available.is.null,date_available.lte.${today}`)
      .gt("quantity", 0),
    supabase
      .from("popular_recipes")
      .select("*")
      .order("total_interactions", { ascending: false })
      .limit(50),
  ]);

  const ingredientNames = (inventoryRes.data ?? []).map(
    (i: Pick<InventoryItem, "name">) => i.name
  );

  return (
    <SwipeClient
      ingredientNames={ingredientNames}
      popularRecipes={(popularRes.data ?? []) as PopularRecipe[]}
    />
  );
}
