import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import RecipeManager from "@/components/admin/RecipeManager";
import type { InventoryItem } from "@/lib/types";

export const revalidate = 0;

export default async function AdminRecipesPage() {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const today = new Date().toISOString().split("T")[0];

  const [inventoryRes, countRes] = await Promise.all([
    supabase
      .from("inventory")
      .select("*")
      .or(`date_available.is.null,date_available.lte.${today}`)
      .order("name", { ascending: true }),
    serviceSupabase
      .from("recipes_cache")
      .select("spoonacular_id", { count: "exact", head: true }),
  ]);

  const inventoryItems = (inventoryRes.data ?? []) as InventoryItem[];
  const totalRecipes = countRes.count ?? 0;

  return (
    <RecipeManager
      inventoryItems={inventoryItems}
      initialTotal={totalRecipes}
    />
  );
}
