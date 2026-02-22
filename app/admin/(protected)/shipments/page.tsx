import { createClient } from "@/lib/supabase/server";
import type { Shipment } from "@/lib/types";
import ShipmentsManager from "@/components/admin/ShipmentsManager";

export const revalidate = 0;

export default async function ShipmentsPage() {
  const supabase = await createClient();
  // Use local date (not UTC) so shipments don't flip to "past" due to timezone offset
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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
