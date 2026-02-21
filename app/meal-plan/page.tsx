import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";
import MealPlanClient from "@/components/student/MealPlanClient";

export const revalidate = 60;

export default async function MealPlanPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Get all in-stock inventory for grocery cross-reference
  const { data: inStock } = await supabase
    .from("inventory")
    .select("name, quantity, unit, date_available")
    .or(`date_available.is.null,date_available.lte.${today}`)
    .gt("quantity", 0);

  // Get arriving-soon items
  const { data: arrivingSoon } = await supabase
    .from("inventory")
    .select("name, quantity, unit, date_available")
    .gt("date_available", today);

  return (
    <MealPlanClient
      inStockItems={(inStock ?? []) as InventoryItem[]}
      arrivingSoonItems={(arrivingSoon ?? []) as InventoryItem[]}
    />
  );
}
