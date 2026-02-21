import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { InventoryItem, Shipment } from "@/lib/types";

export const revalidate = 0;

async function getDashboardData() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [inventoryRes, shipmentsRes, lowStockRes] = await Promise.all([
    supabase
      .from("inventory")
      .select("*")
      .or(`date_available.is.null,date_available.lte.${today}`),
    supabase
      .from("shipments")
      .select("*")
      .gte("expected_date", today)
      .order("expected_date", { ascending: true })
      .limit(5),
    supabase
      .from("inventory")
      .select("*")
      .or(`date_available.is.null,date_available.lte.${today}`)
      .lte("quantity", 5)
      .gt("quantity", 0),
  ]);

  return {
    inventory: (inventoryRes.data ?? []) as InventoryItem[],
    upcomingShipments: (shipmentsRes.data ?? []) as Shipment[],
    lowStock: (lowStockRes.data ?? []) as InventoryItem[],
  };
}

export default async function DashboardPage() {
  const { inventory, upcomingShipments, lowStock } = await getDashboardData();

  const totalItems = inventory.length;
  const outOfStock = inventory.filter((i) => i.quantity === 0).length;
  const inStock = totalItems - outOfStock;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Items In Stock" value={inStock} color="green" />
        <StatCard label="Out of Stock" value={outOfStock} color="red" />
        <StatCard
          label="Upcoming Shipments"
          value={upcomingShipments.length}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Low Stock Items</h2>
            <Link
              href="/admin/inventory"
              className="text-sm text-ucd-blue hover:underline"
            >
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">All items are well-stocked.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lowStock.map((item) => (
                <li
                  key={item.id}
                  className="py-2 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-800">{item.name}</span>
                  <span className="text-sm font-medium text-orange-600">
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming shipments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Upcoming Shipments</h2>
            <Link
              href="/admin/shipments"
              className="text-sm text-ucd-blue hover:underline"
            >
              View all
            </Link>
          </div>
          {upcomingShipments.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming shipments.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingShipments.map((shipment) => (
                <li key={shipment.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">
                      {shipment.item_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(shipment.expected_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {shipment.expected_quantity} {shipment.unit}
                    {shipment.notes && ` · ${shipment.notes}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "blue";
}) {
  const colorMap = {
    green: "text-green-700 bg-green-50 border-green-100",
    red: "text-red-700 bg-red-50 border-red-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
  };
  return (
    <div className={`card p-5 border ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
