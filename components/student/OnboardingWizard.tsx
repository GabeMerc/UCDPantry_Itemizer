"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DietaryTag, MealType, StudentPreferences } from "@/lib/types";

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

const BUY_OPTIONS: { value: number | null; label: string; desc: string }[] = [
  { value: 0, label: "Pantry only", desc: "I don't want to buy anything" },
  {
    value: 3,
    label: "A few items",
    desc: "Up to 3 non-pantry ingredients across the whole week",
  },
  {
    value: 8,
    label: "Some items",
    desc: "Up to 8 non-pantry ingredients",
  },
  {
    value: null,
    label: "No limit",
    desc: "Show me the best meals regardless",
  },
];

const STORAGE_KEY = "pantry_preferences";
const STEPS = ["Diet", "Goals", "Cuisines", "Budget", "Extras"];

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
  swipesPerMeal: 10,
};

const SWIPE_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 5,  label: "5 cards",  desc: "Quick" },
  { value: 10, label: "10 cards", desc: "Balanced" },
  { value: 15, label: "15 cards", desc: "Thorough" },
  { value: 20, label: "20 cards", desc: "Full" },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<StudentPreferences>(DEFAULT_PREFS);
  const [dislikedInput, setDislikedInput] = useState("");
  const [loaded, setLoaded] = useState(false);

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
      // ignore
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
  }

  function toggleCuisine(c: string) {
    setPrefs((p) => ({
      ...p,
      cuisinePreferences: p.cuisinePreferences.includes(c)
        ? p.cuisinePreferences.filter((x) => x !== c)
        : [...p.cuisinePreferences, c],
    }));
  }

  function handleFinish() {
    const finalPrefs = {
      ...prefs,
      dislikedIngredients: dislikedInput
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    router.push("/swipe");
  }

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-ucd-gold" : "bg-gray-200"
              }`}
            />
            <p
              className={`text-xs mt-1 text-center ${
                i === step
                  ? "text-ucd-blue font-semibold"
                  : i < step
                  ? "text-gray-500"
                  : "text-gray-300"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Step 1: Dietary restrictions */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Dietary Restrictions
            </h2>
            <p className="text-sm text-gray-500">
              Select any that apply. This filters out recipes that don&apos;t
              match.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                  prefs.dietaryRestrictions.includes(tag)
                    ? "bg-ucd-blue text-white border-ucd-blue scale-105"
                    : "bg-white text-gray-600 border-gray-200 hover:border-ucd-blue"
                }`}
              >
                {prefs.dietaryRestrictions.includes(tag) ? "✓ " : ""}
                {tag}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            You can skip this step if none apply.
          </p>
        </div>
      )}

      {/* Step 2: Nutrition goals */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Nutrition Goals
            </h2>
            <p className="text-sm text-gray-500">
              Set daily targets — recipes will be scored by how closely they
              match.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calories (cal/day)
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                className="input"
                placeholder="e.g. 2000"
                value={prefs.calorieGoal ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    calorieGoal: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protein (g/day)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                className="input"
                placeholder="e.g. 50"
                value={prefs.proteinGoal ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    proteinGoal: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carbs (g/day)
              </label>
              <input
                type="number"
                min={0}
                max={1000}
                className="input"
                placeholder="e.g. 250"
                value={prefs.carbGoal ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    carbGoal: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fat (g/day)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                className="input"
                placeholder="e.g. 65"
                value={prefs.fatGoal ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    fatGoal: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Leave blank to skip — recipes won&apos;t be filtered by nutrition.
          </p>
        </div>
      )}

      {/* Step 3: Cuisine preferences */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Cuisine Preferences
            </h2>
            <p className="text-sm text-gray-500">
              Pick your favorites — matching recipes get a boost.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggleCuisine(c)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  prefs.cuisinePreferences.includes(c)
                    ? "bg-ucd-gold text-gray-900 border-ucd-gold scale-105"
                    : "bg-white text-gray-600 border-gray-200 hover:border-ucd-gold"
                }`}
              >
                {prefs.cuisinePreferences.includes(c) ? "★ " : ""}
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Grocery budget */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Grocery Budget
            </h2>
            <p className="text-sm text-gray-500">
              How many items are you willing to buy outside the pantry each week?
            </p>
          </div>
          <div className="space-y-2">
            {BUY_OPTIONS.map((opt) => {
              const isSelected =
                prefs.maxBuyItems === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() =>
                    setPrefs((p) => ({ ...p, maxBuyItems: opt.value }))
                  }
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
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
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 5: Meals per day + disliked ingredients */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Almost Done!</h2>
            <p className="text-sm text-gray-500">
              A couple more details for your meal plan.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meals per day
            </label>
            <div className="flex gap-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setPrefs((p) => {
                      const defaults: Record<number, MealType[]> = {
                        1: ["dinner"],
                        2: ["lunch", "dinner"],
                        3: ["breakfast", "lunch", "dinner"],
                      };
                      return { ...p, mealsPerDay: n, selectedMealTypes: defaults[n] };
                    })
                  }
                  className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                    prefs.mealsPerDay === n
                      ? "bg-ucd-blue text-white border-ucd-blue"
                      : "bg-white text-gray-600 border-gray-200 hover:border-ucd-blue"
                  }`}
                >
                  {n} {n === 1 ? "meal" : "meals"}
                </button>
              ))}
            </div>

            {/* Meal type selector — shown when < 3 meals */}
            {prefs.mealsPerDay < 3 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">
                  Which meal{prefs.mealsPerDay > 1 ? "s" : ""}?
                </p>
                <div className="flex gap-2">
                  {(["breakfast", "lunch", "dinner"] as MealType[]).map((mt) => {
                    const selected = (prefs.selectedMealTypes ?? []).includes(mt);
                    return (
                      <button
                        key={mt}
                        onClick={() =>
                          setPrefs((p) => {
                            const current = p.selectedMealTypes ?? [];
                            if (selected) {
                              if (current.length <= p.mealsPerDay) return p;
                              return { ...p, selectedMealTypes: current.filter((t) => t !== mt) };
                            } else {
                              if (p.mealsPerDay === 1) {
                                return { ...p, selectedMealTypes: [mt] };
                              } else {
                                const updated = [...current.filter((t) => t !== mt), mt];
                                return { ...p, selectedMealTypes: updated.slice(-p.mealsPerDay) };
                              }
                            }
                          })
                        }
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all capitalize ${
                          selected
                            ? "bg-ucd-blue text-white border-ucd-blue scale-105"
                            : "bg-white text-gray-600 border-gray-200 hover:border-ucd-blue"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {mt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipes per swipe session
            </label>
            <p className="text-xs text-gray-400 mb-2">
              How many recipe cards to show per meal type when swiping for the week.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {SWIPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs((p) => ({ ...p, swipesPerMeal: opt.value }))}
                  className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-all flex flex-col items-center gap-0.5 ${
                    (prefs.swipesPerMeal ?? 10) === opt.value
                      ? "bg-ucd-blue text-white border-ucd-blue scale-105"
                      : "bg-white text-gray-600 border-gray-200 hover:border-ucd-blue"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-xs font-normal ${(prefs.swipesPerMeal ?? 10) === opt.value ? "text-blue-200" : "text-gray-400"}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disliked ingredients
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. cilantro, mushrooms, olives"
              value={dislikedInput}
              onChange={(e) => setDislikedInput(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Comma-separated. Recipes with these ingredients will be penalized.
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2">
        {step > 0 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary"
          >
            Next →
          </button>
        ) : (
          <button onClick={handleFinish} className="btn-primary">
            Start swiping! →
          </button>
        )}
      </div>
    </div>
  );
}
