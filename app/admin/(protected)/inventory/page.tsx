import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";
import InventoryTable from "@/components/admin/InventoryTable";

export const revalidate = 0;

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load inventory: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
      </div>
      <InventoryTable initialItems={(data ?? []) as InventoryItem[]} />
    </div>
  );
}
