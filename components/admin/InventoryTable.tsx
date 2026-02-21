"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem, DietaryTag } from "@/lib/types";

const ALL_DIETARY_TAGS: DietaryTag[] = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "halal",
  "kosher",
];

const TAG_COLORS: Record<DietaryTag, string> = {
  vegan: "bg-green-100 text-green-800",
  vegetarian: "bg-lime-100 text-lime-800",
  "gluten-free": "bg-yellow-100 text-yellow-800",
  "dairy-free": "bg-blue-100 text-blue-800",
  "nut-free": "bg-orange-100 text-orange-800",
  halal: "bg-teal-100 text-teal-800",
  kosher: "bg-purple-100 text-purple-800",
};

type SortKey = "name" | "category" | "quantity" | "date_available";

export default function InventoryTable({
  initialItems,
}: {
  initialItems: InventoryItem[];
}) {
  const supabase = createClient();

  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<DietaryTag | "">("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<InventoryItem>>({
    name: "",
    category: "",
    quantity: 0,
    unit: "item",
    dietary_tags: [],
    date_available: null,
  });

  // Derived categories for filter dropdown
  const categories = [...new Set(items.map((i) => i.category))].sort();

  // Filter + sort
  const today = new Date().toISOString().split("T")[0];

  const filtered = items
    .filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchTag =
        !filterTag || item.dietary_tags.includes(filterTag as DietaryTag);
      const matchCategory =
        !filterCategory || item.category === filterCategory;
      return matchSearch && matchTag && matchCategory;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category")
        cmp = a.category.localeCompare(b.category);
      else if (sortKey === "quantity") cmp = a.quantity - b.quantity;
      else if (sortKey === "date_available") {
        const aDate = a.date_available ?? "0000-00-00";
        const bDate = b.date_available ?? "0000-00-00";
        cmp = aDate.localeCompare(bDate);
      }
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditForm({ ...item });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setError(null);
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("inventory")
      .update({
        name: editForm.name,
        category: editForm.category,
        quantity: editForm.quantity,
        unit: editForm.unit,
        dietary_tags: editForm.dietary_tags,
        date_available: editForm.date_available ?? null,
      })
      .eq("id", editingId)
      .select()
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === editingId ? (data as InventoryItem) : i))
    );
    cancelEdit();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function addItem() {
    if (!addForm.name?.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("inventory")
      .insert({
        name: addForm.name!.trim(),
        category: addForm.category || "General",
        quantity: addForm.quantity ?? 0,
        unit: addForm.unit || "item",
        dietary_tags: addForm.dietary_tags ?? [],
        date_available: addForm.date_available ?? null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) => [...prev, data as InventoryItem]);
    setShowAddForm(false);
    setAddForm({
      name: "",
      category: "",
      quantity: 0,
      unit: "item",
      dietary_tags: [],
      date_available: null,
    });
  }

  function toggleTag(
    tag: DietaryTag,
    current: DietaryTag[],
    setter: (tags: DietaryTag[]) => void
  ) {
    setter(
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search by name or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input w-40"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value as DietaryTag | "")}
          className="input w-40"
        >
          <option value="">All dietary tags</option>
          {ALL_DIETARY_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setShowAddForm(true);
            setError(null);
          }}
          className="btn-primary whitespace-nowrap"
        >
          + Add Item
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Add item form */}
      {showAddForm && (
        <div className="card p-4 space-y-3 border-ucd-blue border">
          <h3 className="font-semibold text-gray-800">New Item</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                value={addForm.name ?? ""}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={addForm.category ?? ""}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="General"
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min={0}
                className="input"
                value={addForm.quantity ?? 0}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    quantity: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input
                className="input"
                value={addForm.unit ?? "item"}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, unit: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Available date (leave blank = in stock now)</label>
            <input
              type="date"
              className="input w-48"
              value={addForm.date_available ?? ""}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  date_available: e.target.value || null,
                }))
              }
            />
          </div>
          <div>
            <label className="label">Dietary tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    toggleTag(
                      tag,
                      addForm.dietary_tags ?? [],
                      (tags) => setAddForm((f) => ({ ...f, dietary_tags: tags }))
                    )
                  }
                  className={`badge border cursor-pointer transition-colors ${
                    (addForm.dietary_tags ?? []).includes(tag)
                      ? TAG_COLORS[tag] + " border-current"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Add Item"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setError(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th onClick={() => toggleSort("name")}>
                  Name{sortArrow("name")}
                </Th>
                <Th onClick={() => toggleSort("category")}>
                  Category{sortArrow("category")}
                </Th>
                <Th onClick={() => toggleSort("quantity")}>
                  Qty{sortArrow("quantity")}
                </Th>
                <Th>Unit</Th>
                <Th>Dietary Tags</Th>
                <Th onClick={() => toggleSort("date_available")}>
                  Available{sortArrow("date_available")}
                </Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No items found.
                  </td>
                </tr>
              )}
              {filtered.map((item) =>
                editingId === item.id ? (
                  <EditRow
                    key={item.id}
                    form={editForm}
                    setForm={setEditForm}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    saving={saving}
                  />
                ) : (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {item.category}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-semibold ${
                        item.quantity === 0
                          ? "text-red-600"
                          : item.quantity <= 5
                          ? "text-orange-600"
                          : "text-gray-800"
                      }`}
                    >
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {item.dietary_tags.map((tag) => (
                          <span
                            key={tag}
                            className={`badge ${TAG_COLORS[tag as DietaryTag] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {item.date_available ? (
                        <span
                          className={
                            item.date_available > today
                              ? "text-blue-600"
                              : "text-green-600"
                          }
                        >
                          {new Date(item.date_available).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      ) : (
                        <span className="text-green-600">In stock</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-ucd-blue hover:underline text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-500 hover:underline text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
          {filtered.length} of {items.length} items
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${
        onClick ? "cursor-pointer select-none hover:text-gray-800" : ""
      }`}
    >
      {children}
    </th>
  );
}

function EditRow({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: Partial<InventoryItem>;
  setForm: React.Dispatch<React.SetStateAction<Partial<InventoryItem>>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const ALL_DIETARY_TAGS: DietaryTag[] = [
    "vegan",
    "vegetarian",
    "gluten-free",
    "dairy-free",
    "nut-free",
    "halal",
    "kosher",
  ];

  function toggleTag(tag: DietaryTag) {
    const current = form.dietary_tags ?? [];
    setForm((f) => ({
      ...f,
      dietary_tags: current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    }));
  }

  return (
    <tr className="bg-blue-50">
      <td className="px-4 py-2">
        <input
          className="input text-xs"
          value={form.name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </td>
      <td className="px-4 py-2">
        <input
          className="input text-xs"
          value={form.category ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          className="input text-xs w-20"
          value={form.quantity ?? 0}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              quantity: parseFloat(e.target.value) || 0,
            }))
          }
        />
      </td>
      <td className="px-4 py-2">
        <input
          className="input text-xs w-20"
          value={form.unit ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {ALL_DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`badge cursor-pointer text-xs border transition-colors ${
                (form.dietary_tags ?? []).includes(tag)
                  ? TAG_COLORS[tag] + " border-current"
                  : "bg-white text-gray-400 border-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          className="input text-xs w-36"
          value={form.date_available ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              date_available: e.target.value || null,
            }))
          }
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="text-green-600 hover:underline text-xs font-medium"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:underline text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
