"use client";

import { useState, useEffect } from "react";
import type { InventoryItem, DietaryTag, StudentPreferences } from "@/lib/types";

const TAG_COLORS: Record<string, string> = {
  vegan: "bg-green-100 text-green-800",
  vegetarian: "bg-lime-100 text-lime-800",
  "gluten-free": "bg-yellow-100 text-yellow-800",
  "dairy-free": "bg-blue-100 text-blue-800",
  "nut-free": "bg-orange-100 text-orange-800",
  halal: "bg-teal-100 text-teal-800",
  kosher: "bg-purple-100 text-purple-800",
};

const ALL_TAGS: DietaryTag[] = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "halal",
  "kosher",
];

export default function BrowseClient({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<DietaryTag[]>([]);
  const [matchAll, setMatchAll] = useState(false);
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);

  // Load preferences from localStorage to auto-apply dietary filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pantry_preferences");
      if (raw) {
        const parsed: StudentPreferences = JSON.parse(raw);
        setPrefs(parsed);
        if (parsed.dietaryRestrictions.length > 0) {
          setSelectedTags(parsed.dietaryRestrictions);
          setMatchAll(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleTag(tag: DietaryTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchTags =
      selectedTags.length === 0 ||
      (matchAll
        ? selectedTags.every((t) => item.dietary_tags.includes(t))
        : selectedTags.some((t) => item.dietary_tags.includes(t)));

    return matchSearch && matchTags;
  });

  // Group by category
  const grouped: Record<string, InventoryItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today's Pantry</h1>
        <p className="text-gray-500 mt-1">
          {items.length} items available · Free for all students
        </p>
      </div>

      {prefs && prefs.dietaryRestrictions.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
          Showing items matching your preferences.
          <button
            onClick={() => {
              setSelectedTags([]);
              setMatchAll(false);
            }}
            className="ml-2 underline hover:no-underline"
          >
            Show all
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 font-medium">Filter:</span>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`badge cursor-pointer border transition-colors ${
                selectedTags.includes(tag)
                  ? TAG_COLORS[tag] + " border-current"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 1 && (
            <button
              onClick={() => setMatchAll((v) => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              Match: {matchAll ? "ALL selected" : "ANY selected"}
            </button>
          )}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-red-400 hover:text-red-600 ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No items match your filters.
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, catItems]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {catItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}

function ItemCard({ item }: { item: InventoryItem }) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 leading-tight">{item.name}</h3>
        <span
          className={`text-xs font-semibold shrink-0 ${
            item.quantity <= 5 ? "text-orange-600" : "text-green-600"
          }`}
        >
          {item.quantity} {item.unit}
        </span>
      </div>
      {item.dietary_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.dietary_tags.map((tag) => (
            <span
              key={tag}
              className={`badge text-xs ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600"}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
