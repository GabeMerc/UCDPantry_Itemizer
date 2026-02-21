import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";
import BrowseClient from "@/components/student/BrowseClient";

export const revalidate = 60;

export default async function BrowsePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .or(`date_available.is.null,date_available.lte.${today}`)
    .gt("quantity", 0)
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-red-600">
        Could not load inventory: {error.message}
      </div>
    );
  }

  return <BrowseClient items={(data ?? []) as InventoryItem[]} />;
}
