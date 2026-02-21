import { createClient } from "@/lib/supabase/server";
import type { Shipment } from "@/lib/types";
import ShipmentsManager from "@/components/admin/ShipmentsManager";

export const revalidate = 0;

export default async function ShipmentsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .order("expected_date", { ascending: true });

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load shipments: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
      <ShipmentsManager
        initialShipments={(data ?? []) as Shipment[]}
        today={today}
      />
    </div>
  );
}
