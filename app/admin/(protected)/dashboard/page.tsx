import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { InventoryItem, Shipment } from "@/lib/types";

export const revalidate = 0;

async function getDashboardData() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [inventoryRes, shipmentsRes, lowStockRes, outOfStockRes] = await Promise.all([
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
    supabase
      .from("inventory")
      .select("*")
      .eq("quantity", 0)
      .order("name", { ascending: true }),
  ]);

  return {
    inventory: (inventoryRes.data ?? []) as InventoryItem[],
    upcomingShipments: (shipmentsRes.data ?? []) as Shipment[],
    lowStock: (lowStockRes.data ?? []) as InventoryItem[],
    outOfStock: (outOfStockRes.data ?? []) as InventoryItem[],
  };
}

export default async function DashboardPage() {
  const { inventory, upcomingShipments, lowStock, outOfStock } = await getDashboardData();

  const totalItems = inventory.length;
  const inStock = totalItems - outOfStock.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Items In Stock" value={inStock} color="green" />
        <StatCard label="Out of Stock" value={outOfStock.length} color="red" />
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
            <Link href="/admin/inventory" className="text-sm text-ucd-blue hover:underline">
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">All items are well-stocked.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lowStock.map((item) => (
                <li key={item.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-800">{item.name}</span>
                    <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
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
            <Link href="/admin/shipments" className="text-sm text-ucd-blue hover:underline">
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
                    <span className="text-sm text-gray-800">{shipment.item_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(shipment.expected_date + "T00:00:00").toLocaleDateString(
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

      {/* Out of stock */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Out of Stock</h2>
            {outOfStock.length > 0 && (
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {outOfStock.length}
              </span>
            )}
          </div>
          <Link href="/admin/inventory" className="text-sm text-ucd-blue hover:underline">
            Manage inventory
          </Link>
        </div>
        {outOfStock.length === 0 ? (
          <p className="text-sm text-gray-500">No items are out of stock.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {outOfStock.map((item) => (
              <li key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                    {item.category}
                  </span>
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded shrink-0">
                  Out of stock
                </span>
              </li>
            ))}
          </ul>
        )}
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
