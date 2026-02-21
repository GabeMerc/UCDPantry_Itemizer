"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Shipment } from "@/lib/types";

const EMPTY_FORM = {
  item_name: "",
  expected_quantity: 0,
  unit: "item",
  expected_date: "",
  notes: "",
};

export default function ShipmentsManager({
  initialShipments,
  today,
}: {
  initialShipments: Shipment[];
  today: string;
}) {
  const supabase = createClient();
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(s: Shipment) {
    setEditingId(s.id);
    setForm({
      item_name: s.item_name,
      expected_quantity: s.expected_quantity,
      unit: s.unit,
      expected_date: s.expected_date,
      notes: s.notes ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    if (!form.item_name.trim() || !form.expected_date) {
      setError("Item name and expected date are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      item_name: form.item_name.trim(),
      expected_quantity: form.expected_quantity,
      unit: form.unit || "item",
      expected_date: form.expected_date,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("shipments")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }

      setShipments((prev) =>
        prev
          .map((s) => (s.id === editingId ? (data as Shipment) : s))
          .sort(
            (a, b) =>
              new Date(a.expected_date).getTime() -
              new Date(b.expected_date).getTime()
          )
      );
    } else {
      const { data, error } = await supabase
        .from("shipments")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }

      setShipments((prev) =>
        [...prev, data as Shipment].sort(
          (a, b) =>
            new Date(a.expected_date).getTime() -
            new Date(b.expected_date).getTime()
        )
      );
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this shipment?")) return;
    const { error } = await supabase
      .from("shipments")
      .delete()
      .eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    setShipments((prev) => prev.filter((s) => s.id !== id));
  }

  const upcoming = shipments.filter((s) => s.expected_date >= today);
  const past = shipments.filter((s) => s.expected_date < today);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="btn-primary">
          + Add Shipment
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-ucd-blue border space-y-4">
          <h2 className="font-semibold text-gray-800">
            {editingId ? "Edit Shipment" : "New Shipment"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="label">
                Item name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={form.item_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, item_name: e.target.value }))
                }
                placeholder="e.g. Canned Black Beans"
              />
            </div>
            <div>
              <label className="label">Expected quantity</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.expected_quantity}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expected_quantity: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
                placeholder="item, lbs, cases…"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Expected date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="input"
                value={form.expected_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expected_date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Donation from Food Bank, etc."
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add Shipment"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setError(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Upcoming ({upcoming.length})
          </h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            No upcoming shipments.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((s) => (
              <ShipmentRow
                key={s.id}
                shipment={s}
                onEdit={openEdit}
                onDelete={handleDelete}
                isPast={false}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <details className="card overflow-hidden">
          <summary className="px-5 py-3 border-b border-gray-100 bg-gray-50 cursor-pointer font-semibold text-gray-500 text-sm list-none">
            Past shipments ({past.length}) ▾
          </summary>
          <ul className="divide-y divide-gray-100">
            {[...past].reverse().map((s) => (
              <ShipmentRow
                key={s.id}
                shipment={s}
                onEdit={openEdit}
                onDelete={handleDelete}
                isPast
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ShipmentRow({
  shipment: s,
  onEdit,
  onDelete,
  isPast,
}: {
  shipment: Shipment;
  onEdit: (s: Shipment) => void;
  onDelete: (id: string) => void;
  isPast: boolean;
}) {
  const dateLabel = new Date(s.expected_date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <li className={`px-5 py-3 flex items-start justify-between gap-4 ${isPast ? "opacity-60" : ""}`}>
      <div>
        <p className="font-medium text-gray-900">{s.item_name}</p>
        <p className="text-sm text-gray-500">
          {s.expected_quantity} {s.unit} · {dateLabel}
          {s.notes && ` · ${s.notes}`}
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={() => onEdit(s)}
          className="text-ucd-blue hover:underline text-xs font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(s.id)}
          className="text-red-500 hover:underline text-xs font-medium"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
