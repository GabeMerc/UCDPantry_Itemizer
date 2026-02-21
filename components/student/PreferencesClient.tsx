"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DietaryTag, StudentPreferences } from "@/lib/types";

const ALL_TAGS: DietaryTag[] = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "halal",
  "kosher",
];

const CUISINE_OPTIONS = [
  "American",
  "Chinese",
  "French",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Thai",
  "Vietnamese",
];

const STORAGE_KEY = "pantry_preferences";

const BUY_OPTIONS: { value: number | null; label: string; desc: string }[] = [
  { value: 0, label: "Pantry only", desc: "I don't want to buy anything" },
  { value: 3, label: "A few items", desc: "Up to 3 non-pantry ingredients" },
  { value: 8, label: "Some items", desc: "Up to 8 non-pantry ingredients" },
  { value: null, label: "No limit", desc: "Best meals regardless" },
];

const DEFAULT_PREFS: StudentPreferences = {
  dietaryRestrictions: [],
  proteinGoal: null,
  calorieGoal: null,
  carbGoal: null,
  fatGoal: null,
  cuisinePreferences: [],
  mealsPerDay: 3,
  dislikedIngredients: [],
  maxBuyItems: null,
};

export default function PreferencesClient() {
  const [prefs, setPrefs] = useState<StudentPreferences>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dislikedInput, setDislikedInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
        if (parsed.dislikedIngredients?.length) {
          setDislikedInput(parsed.dislikedIngredients.join(", "));
        }
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  function toggleTag(tag: DietaryTag) {
    setPrefs((p) => ({
      ...p,
      dietaryRestrictions: p.dietaryRestrictions.includes(tag)
        ? p.dietaryRestrictions.filter((t) => t !== tag)
        : [...p.dietaryRestrictions, tag],
    }));
    setSaved(false);
  }

  function toggleCuisine(c: string) {
    setPrefs((p) => ({
      ...p,
      cuisinePreferences: p.cuisinePreferences.includes(c)
        ? p.cuisinePreferences.filter((x) => x !== c)
        : [...p.cuisinePreferences, c],
    }));
    setSaved(false);
  }

  function handleSave() {
    const finalPrefs = {
      ...prefs,
      dislikedIngredients: dislikedInput
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    setPrefs(finalPrefs);
    setSaved(true);
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY);
    setPrefs(DEFAULT_PREFS);
    setDislikedInput("");
    setSaved(false);
  }

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      {/* Quick re-onboard link */}
      <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
        <p className="text-sm text-blue-800">Want a guided setup?</p>
        <Link
          href="/onboarding"
          className="text-sm font-medium text-ucd-blue hover:underline"
        >
          Run setup wizard →
        </Link>
      </div>

      {/* Dietary restrictions */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800 mb-1">
            Dietary Restrictions
          </h2>
          <p className="text-sm text-gray-500">
            Items that match will be highlighted and filters auto-applied.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                prefs.dietaryRestrictions.includes(tag)
                  ? "bg-ucd-blue text-white border-ucd-blue"
                  : "bg-white text-gray-600 border-gray-300 hover:border-ucd-blue"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Nutrition goals */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Daily Goals</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Calories (kcal/day)</label>
            <input
              type="number"
              min={0}
              max={10000}
              className="input"
              placeholder="e.g. 2000"
              value={prefs.calorieGoal ?? ""}
              onChange={(e) => {
                setSaved(false);
                setPrefs((p) => ({
                  ...p,
                  calorieGoal: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                }));
              }}
            />
          </div>
          <div>
            <label className="label">Protein (g/day)</label>
            <input
              type="number"
              min={0}
              max={500}
              className="input"
              placeholder="e.g. 50"
              value={prefs.proteinGoal ?? ""}
              onChange={(e) => {
                setSaved(false);
                setPrefs((p) => ({
                  ...p,
                  proteinGoal: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                }));
              }}
            />
          </div>
          <div>
            <label className="label">Carbs (g/day)</label>
            <input
              type="number"
              min={0}
              max={1000}
              className="input"
              placeholder="e.g. 250"
              value={prefs.carbGoal ?? ""}
              onChange={(e) => {
                setSaved(false);
                setPrefs((p) => ({
                  ...p,
                  carbGoal: e.target.value ? parseInt(e.target.value) : null,
                }));
              }}
            />
          </div>
          <div>
            <label className="label">Fat (g/day)</label>
            <input
              type="number"
              min={0}
              max={500}
              className="input"
              placeholder="e.g. 65"
              value={prefs.fatGoal ?? ""}
              onChange={(e) => {
                setSaved(false);
                setPrefs((p) => ({
                  ...p,
                  fatGoal: e.target.value ? parseInt(e.target.value) : null,
                }));
              }}
            />
          </div>
        </div>
      </div>

      {/* Cuisine preferences */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Cuisine Preferences</h2>
          <p className="text-sm text-gray-500">
            Matching recipes get a score boost.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => toggleCuisine(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                prefs.cuisinePreferences.includes(c)
                  ? "bg-ucd-gold text-gray-900 border-ucd-gold"
                  : "bg-white text-gray-600 border-gray-300 hover:border-ucd-gold"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grocery budget */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Grocery Budget</h2>
          <p className="text-sm text-gray-500">
            How many non-pantry items are you willing to buy each week?
          </p>
        </div>
        <div className="space-y-2">
          {BUY_OPTIONS.map((opt) => {
            const isSelected = prefs.maxBuyItems === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => {
                  setSaved(false);
                  setPrefs((p) => ({ ...p, maxBuyItems: opt.value }));
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "bg-ucd-blue/5 border-ucd-blue"
                    : "bg-white border-gray-200 hover:border-gray-400"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    isSelected ? "text-ucd-blue" : "text-gray-800"
                  }`}
                >
                  {isSelected ? "✓ " : ""}
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meals per day + disliked */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Extras</h2>
        <div>
          <label className="label mb-2">Meals per day</label>
          <div className="flex gap-3">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setSaved(false);
                  setPrefs((p) => ({ ...p, mealsPerDay: n }));
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                  prefs.mealsPerDay === n
                    ? "bg-ucd-blue text-white border-ucd-blue"
                    : "bg-white text-gray-600 border-gray-200 hover:border-ucd-blue"
                }`}
              >
                {n} {n === 1 ? "meal" : "meals"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Disliked ingredients</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. cilantro, mushrooms, olives"
            value={dislikedInput}
            onChange={(e) => {
              setDislikedInput(e.target.value);
              setSaved(false);
            }}
          />
          <p className="text-xs text-gray-400 mt-1">
            Comma-separated. Recipes with these will be penalized in swipe mode.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          Save preferences
        </button>
        <button onClick={handleClear} className="btn-secondary text-sm">
          Clear all
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}
