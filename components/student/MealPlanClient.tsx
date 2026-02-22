"use client";

import { useState, useEffect, Fragment } from "react";
import Image from "next/image";
import type {
  ScoredRecipe,
  InventoryItem,
  StudentPreferences,
  Weekday,
  GroceryItem,
  MealType,
} from "@/lib/types";

const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEKDAY_FULL: Record<Weekday, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday",
};
const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: "🍳", lunch: "🥗", dinner: "🍽️", unknown: "🍴",
};

// ── ICS helpers ───────────────────────────────────────────────────────────────

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Returns YYYYMMDD strings for this week's Mon–Fri. */
function getWeekDates(): Record<Weekday, string> {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun … 6=Sat
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon);

  const result = {} as Record<Weekday, string>;
  WEEKDAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result[day] = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  });
  return result;
}

/** Add one calendar day to a YYYYMMDD string (for DTEND). */
function nextDay(yyyymmdd: string): string {
  const d = new Date(
    parseInt(yyyymmdd.slice(0, 4)),
    parseInt(yyyymmdd.slice(4, 6)) - 1,
    parseInt(yyyymmdd.slice(6, 8)) + 1,
  );
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** Format a YYYYMMDD string for display (e.g. "Feb 23"). */
function fmtDate(yyyymmdd: string): string {
  const d = new Date(
    parseInt(yyyymmdd.slice(0, 4)),
    parseInt(yyyymmdd.slice(4, 6)) - 1,
    parseInt(yyyymmdd.slice(6, 8)),
  );
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  unknown: "Other",
};
const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-100 text-amber-700",
  lunch: "bg-emerald-100 text-emerald-700",
  dinner: "bg-purple-100 text-purple-700",
  unknown: "bg-gray-100 text-gray-600",
};

interface MealPlan {
  [day: string]: { [mealType: string]: ScoredRecipe | null };
}

export default function MealPlanClient({
  inStockItems,
  arrivingSoonItems,
}: {
  inStockItems: InventoryItem[];
  arrivingSoonItems: InventoryItem[];
}) {
  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);
  const [activeMealTypes, setActiveMealTypes] = useState<MealType[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buyItemCount, setBuyItemCount] = useState(0);

  useEffect(() => {
    // Load preferences
    let loadedPrefs: StudentPreferences | null = null;
    try {
      const rawPrefs = localStorage.getItem("pantry_preferences");
      if (rawPrefs) {
        loadedPrefs = JSON.parse(rawPrefs);
        setPrefs(loadedPrefs);
      }
    } catch {
      // ignore
    }

    // Load liked recipes (already tagged with meal_type from swipe sessions)
    let likedRecipes: ScoredRecipe[] = [];
    try {
      const raw = localStorage.getItem("pantry_liked_recipe_data");
      if (raw) likedRecipes = JSON.parse(raw);
    } catch {
      // ignore
    }

    // Determine active meal types
    const mealsPerDay = loadedPrefs?.mealsPerDay ?? 3;
    let mealTypes: MealType[];
    if (loadedPrefs?.selectedMealTypes?.length) {
      mealTypes = loadedPrefs.selectedMealTypes;
    } else if (mealsPerDay === 3) {
      mealTypes = ["breakfast", "lunch", "dinner"];
    } else if (mealsPerDay === 2) {
      mealTypes = ["lunch", "dinner"];
    } else {
      mealTypes = ["dinner"];
    }
    setActiveMealTypes(mealTypes);

    // Group liked recipes by meal_type
    const recipesByType: Record<string, ScoredRecipe[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      unknown: [],
    };
    for (const r of likedRecipes) {
      const mt = r.meal_type ?? "unknown";
      if (recipesByType[mt]) {
        recipesByType[mt].push(r);
      } else {
        recipesByType.unknown.push(r);
      }
    }

    // Build meal plan respecting meal types
    const plan: MealPlan = {};
    const typeIndex: Record<string, number> = {};

    // Track aggregate non-pantry ingredients for budget enforcement
    const maxBuy = loadedPrefs?.maxBuyItems;
    const usedNonPantryIngredients = new Set<string>();
    const inStockSet = new Set(inStockItems.map((i) => i.name.toLowerCase()));
    const arrivingSet = new Set(
      arrivingSoonItems.map((i) => i.name.toLowerCase())
    );

    function getNonPantryCount(recipe: ScoredRecipe): string[] {
      const missed = (recipe.missedIngredients ?? []).map((i) =>
        i.name.toLowerCase()
      );
      const upcoming = new Set(
        (recipe.upcomingIngredients ?? []).map((u) => u.name.toLowerCase())
      );
      return missed.filter(
        (n) =>
          !upcoming.has(n) &&
          ![...inStockSet].some((s) => s.includes(n) || n.includes(s)) &&
          ![...arrivingSet].some((s) => s.includes(n) || n.includes(s))
      );
    }

    // Daily nutrition tracking — allow up to 110% of daily goal before blocking
    const dailyNutrition: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};

    function exceedsDailyLimits(day: string, recipe: ScoredRecipe): boolean {
      if (!loadedPrefs || !recipe.nutrition) return false;
      const { calorieGoal, proteinGoal, carbGoal, fatGoal } = loadedPrefs;
      if (!calorieGoal && !proteinGoal && !carbGoal && !fatGoal) return false;
      const dn = dailyNutrition[day] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      const tolerance = 1.1;
      if (calorieGoal && (dn.calories + recipe.nutrition.calories) > calorieGoal * tolerance) return true;
      if (proteinGoal && (dn.protein + recipe.nutrition.protein) > proteinGoal * tolerance) return true;
      if (carbGoal && (dn.carbs + recipe.nutrition.carbs) > carbGoal * tolerance) return true;
      if (fatGoal && (dn.fat + recipe.nutrition.fat) > fatGoal * tolerance) return true;
      return false;
    }

    function addDailyNutrition(day: string, recipe: ScoredRecipe) {
      if (!recipe.nutrition) return;
      const dn = dailyNutrition[day] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      dailyNutrition[day] = {
        calories: dn.calories + recipe.nutrition.calories,
        protein: dn.protein + recipe.nutrition.protein,
        carbs: dn.carbs + recipe.nutrition.carbs,
        fat: dn.fat + recipe.nutrition.fat,
      };
    }

    for (const day of WEEKDAYS) {
      plan[day] = {};
      dailyNutrition[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      for (const mt of mealTypes) {
        const pool = recipesByType[mt];
        if (!typeIndex[mt]) typeIndex[mt] = 0;

        if (pool.length > 0) {
          // Try to place a recipe, checking budget and daily nutrition limits
          let placed = false;
          const startIdx = typeIndex[mt];
          for (let attempts = 0; attempts < pool.length; attempts++) {
            const candidate = pool[(startIdx + attempts) % pool.length];
            const nonPantry = getNonPantryCount(candidate);
            const newItems = nonPantry.filter(
              (n) => !usedNonPantryIngredients.has(n)
            );

            // Check if adding this recipe would exceed budget
            if (
              maxBuy !== null &&
              maxBuy !== undefined &&
              usedNonPantryIngredients.size + newItems.length > maxBuy
            ) {
              continue; // skip, over budget
            }

            // Check if adding this recipe would exceed daily nutrition limits
            if (exceedsDailyLimits(day, candidate)) {
              continue; // skip, over daily macro limit
            }

            plan[day][mt] = candidate;
            for (const n of nonPantry) usedNonPantryIngredients.add(n);
            addDailyNutrition(day, candidate);
            typeIndex[mt] = (startIdx + attempts + 1) % pool.length;
            placed = true;
            break;
          }

          if (!placed) {
            // Couldn't fit within budget/nutrition — try unknown type as last resort
            const unknownPool = recipesByType.unknown;
            for (const fallback of unknownPool) {
              const nonPantry = getNonPantryCount(fallback);
              const newItems = nonPantry.filter(
                (n) => !usedNonPantryIngredients.has(n)
              );
              if (
                (maxBuy === null || maxBuy === undefined || usedNonPantryIngredients.size + newItems.length <= maxBuy) &&
                !exceedsDailyLimits(day, fallback)
              ) {
                plan[day][mt] = { ...fallback, meal_type: "unknown" };
                for (const n of nonPantry) usedNonPantryIngredients.add(n);
                addDailyNutrition(day, fallback);
                placed = true;
                break;
              }
            }
            if (!placed) {
              plan[day][mt] = null; // leave empty
            }
          }
        } else {
          // No typed recipes — try unknown as backfill
          const unknowns = recipesByType.unknown;
          if (!typeIndex[`unknown_${mt}`]) typeIndex[`unknown_${mt}`] = 0;
          if (unknowns.length > 0) {
            const idx = typeIndex[`unknown_${mt}`] % unknowns.length;
            const candidate = unknowns[idx];
            if (!exceedsDailyLimits(day, candidate)) {
              plan[day][mt] = { ...candidate, meal_type: "unknown" };
              addDailyNutrition(day, candidate);
            } else {
              plan[day][mt] = null;
            }
            typeIndex[`unknown_${mt}`] = idx + 1;
          } else {
            plan[day][mt] = null;
          }
        }
      }
    }

    setMealPlan(plan);
    setBuyItemCount(usedNonPantryIngredients.size);

    // Build grocery list
    const ingredientMap = new Map<
      string,
      { amount: number; unit: string; mealTypes: Set<MealType> }
    >();

    const usedRecipeIds = new Set<number>();
    for (const day of WEEKDAYS) {
      for (const mt of mealTypes) {
        const recipe = plan[day]?.[mt];
        if (!recipe) continue;
        if (usedRecipeIds.has(recipe.id)) {
          // Still tag meal type even if already counted
          const allIngs = [
            ...(recipe.usedIngredients ?? []),
            ...(recipe.missedIngredients ?? []),
          ];
          for (const ing of allIngs) {
            const key = ing.name.toLowerCase();
            const existing = ingredientMap.get(key);
            if (existing) existing.mealTypes.add(mt);
          }
          continue;
        }
        usedRecipeIds.add(recipe.id);

        const allIngredients = [
          ...(recipe.usedIngredients ?? []),
          ...(recipe.missedIngredients ?? []),
        ];
        for (const ing of allIngredients) {
          const key = ing.name.toLowerCase();
          const existing = ingredientMap.get(key);
          if (existing) {
            existing.amount += ing.amount;
            existing.mealTypes.add(mt);
          } else {
            ingredientMap.set(key, {
              amount: ing.amount,
              unit: ing.unit || "",
              mealTypes: new Set([mt]),
            });
          }
        }
      }
    }

    // Cross-reference with pantry
    const arrivingMap = new Map<string, string>();
    for (const item of arrivingSoonItems) {
      if (item.date_available) {
        arrivingMap.set(item.name.toLowerCase(), item.date_available);
      }
    }

    const grocery: GroceryItem[] = [];
    for (const [name, { amount, unit, mealTypes: mts }] of ingredientMap) {
      const inStock = [...inStockSet].some(
        (s) => s.includes(name) || name.includes(s)
      );
      const arrivingMatch = [...arrivingMap.entries()].find(
        ([s]) => s.includes(name) || name.includes(s)
      );

      if (inStock) {
        grocery.push({
          name,
          amount,
          unit,
          status: "in-stock",
          mealTypes: [...mts],
        });
      } else if (arrivingMatch) {
        grocery.push({
          name,
          amount,
          unit,
          status: "arriving-soon",
          availableDate: arrivingMatch[1],
          mealTypes: [...mts],
        });
      } else {
        grocery.push({
          name,
          amount,
          unit,
          status: "need-to-buy",
          mealTypes: [...mts],
        });
      }
    }

    grocery.sort((a, b) => {
      const order = { "need-to-buy": 0, "arriving-soon": 1, "in-stock": 2 };
      return order[a.status] - order[b.status];
    });

    setGroceryList(grocery);
    setLoaded(true);
  }, [inStockItems, arrivingSoonItems]);

  function handleCopyGrocery() {
    const needToBuy = groceryList.filter((g) => g.status === "need-to-buy");
    const arriving = groceryList.filter((g) => g.status === "arriving-soon");
    const inStock = groceryList.filter((g) => g.status === "in-stock");

    let text = "=== GROCERY LIST ===\n\n";

    if (needToBuy.length > 0) {
      text += "NEED TO BUY:\n";
      for (const g of needToBuy) {
        text += `  [ ] ${g.name} — ${Math.round(g.amount)} ${g.unit} (${g.mealTypes.join(", ")})\n`;
      }
      text += "\n";
    }
    if (arriving.length > 0) {
      text += "ARRIVING SOON:\n";
      for (const g of arriving) {
        text += `  ~ ${g.name} — arriving ${g.availableDate}\n`;
      }
      text += "\n";
    }
    if (inStock.length > 0) {
      text += "IN STOCK AT PANTRY:\n";
      for (const g of inStock) {
        text += `  ✓ ${g.name}\n`;
      }
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSwapSlot(day: Weekday, mealType: MealType) {
    let likedRecipes: ScoredRecipe[] = [];
    try {
      const raw = localStorage.getItem("pantry_liked_recipe_data");
      if (raw) likedRecipes = JSON.parse(raw);
    } catch {
      return;
    }

    // Filter to same meal type
    const current = mealPlan[day]?.[mealType];
    const pool = likedRecipes.filter(
      (r) =>
        (r.meal_type === mealType || r.meal_type === "unknown") &&
        (!current || r.id !== current.id)
    );
    if (pool.length === 0) return;

    const newRecipe = pool[Math.floor(Math.random() * pool.length)];
    setMealPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [mealType]: newRecipe },
    }));
  }

  function handleExportICS() {
    const weekDates = getWeekDates();
    const events: string[] = [];

    for (const day of WEEKDAYS) {
      const dateStr = weekDates[day];
      for (const mt of activeMealTypes) {
        const recipe = mealPlan[day]?.[mt];
        if (!recipe) continue;

        const summary = `${MEAL_EMOJI[mt]} ${recipe.title}`;

        const descParts: string[] = [MEAL_TYPE_LABELS[mt]];
        if (recipe.nutrition?.calories) descParts.push(`${Math.round(recipe.nutrition.calories)} cal`);
        if (recipe.ready_in_minutes) descParts.push(`${recipe.ready_in_minutes} min`);
        const ings = [...(recipe.usedIngredients ?? []), ...(recipe.missedIngredients ?? [])]
          .map((i) => i.name).slice(0, 8);
        if (ings.length) descParts.push(`Ingredients: ${ings.join(", ")}`);
        const recipeUrl = recipe.source_url ?? `${window.location.origin}/recipe/${recipe.id}`;

        events.push([
          "BEGIN:VEVENT",
          `UID:mealplan-${day}-${mt}-${recipe.id}-${dateStr}@ucdpantry`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `DTEND;VALUE=DATE:${nextDay(dateStr)}`,
          `SUMMARY:${escapeICS(summary)}`,
          `DESCRIPTION:${escapeICS(descParts.join("\\n"))}`,
          `URL:${recipeUrl}`,
          "END:VEVENT",
        ].join("\r\n"));
      }
    }

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UC Davis Pantry//Meal Plan//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meal-plan.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return (
      <div className="text-center py-12 text-gray-400">Loading meal plan…</div>
    );
  }

  const hasRecipes = Object.values(mealPlan).some((day) =>
    Object.values(day).some((r) => r !== null)
  );
  const maxBuy = prefs?.maxBuyItems;
  const needToBuyCount = groceryList.filter(
    (g) => g.status === "need-to-buy"
  ).length;

  const weekDates = getWeekDates();
  const weekLabel = `${fmtDate(weekDates.Mon)} – ${fmtDate(weekDates.Fri)}`;

  return (
    <div className="space-y-8">
      {/* Print-only title */}
      <div className="hidden print-title">
        <h1 className="text-2xl font-bold text-gray-900">UC Davis Pantry — Weekly Meal Plan</h1>
        <p className="text-gray-500 text-sm mt-1">{weekLabel} · {activeMealTypes.map((t) => MEAL_TYPE_LABELS[t]).join(", ")}</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 print-hide">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Meal Plan</h1>
          <p className="text-gray-500 text-sm mt-1">
            {weekLabel} · {activeMealTypes.map((t) => MEAL_TYPE_LABELS[t]).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRecipes && (
            <>
              <button
                onClick={handleExportICS}
                className="btn-secondary text-sm"
                title="Download .ics file — works with Google Calendar, Apple Calendar, Outlook"
              >
                Export to Calendar
              </button>
              <button
                onClick={() => window.print()}
                className="btn-secondary text-sm"
              >
                Print / PDF
              </button>
            </>
          )}
          <a href="/swipe" className="text-sm text-ucd-blue hover:underline">
            ← Swipe more
          </a>
        </div>
      </div>

      {!hasRecipes && (
        <div className="card p-8 text-center space-y-4 print-hide">
          <div className="text-5xl">📋</div>
          <p className="text-gray-600">
            No liked recipes yet. Swipe some recipes first!
          </p>
          <a href="/swipe" className="btn-primary inline-block">
            Start swiping →
          </a>
        </div>
      )}

      {hasRecipes && (
        <>
          {/* Meal plan grid */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div
              className="grid gap-3 meal-grid"
              style={{
                gridTemplateColumns: `100px repeat(5, minmax(140px, 1fr))`,
              }}
            >
              {/* Header row */}
              <div />
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center font-bold text-sm text-gray-700 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Meal type rows */}
              {activeMealTypes.map((mt) => (
                <Fragment key={mt}>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${MEAL_TYPE_COLORS[mt]}`}
                    >
                      {MEAL_TYPE_LABELS[mt]}
                    </span>
                  </div>
                  {WEEKDAYS.map((day) => {
                    const recipe = mealPlan[day]?.[mt];
                    return (
                      <MealSlotCard
                        key={`${day}-${mt}`}
                        recipe={recipe}
                        expectedMealType={mt}
                        onSwap={() => handleSwapSlot(day as Weekday, mt)}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Grocery list */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Grocery List</h2>
              <button
                onClick={handleCopyGrocery}
                className="btn-secondary text-sm print-hide"
              >
                {copied ? "✓ Copied!" : "Copy as text"}
              </button>
            </div>

            {/* Budget summary */}
            {maxBuy !== null && maxBuy !== undefined && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  needToBuyCount > maxBuy
                    ? "bg-red-50 text-red-700"
                    : needToBuyCount >= maxBuy * 0.8
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                <p className="font-semibold">
                  {needToBuyCount} of {maxBuy} non-pantry items used
                </p>
                {needToBuyCount >= maxBuy && maxBuy > 0 && (
                  <p className="text-xs mt-0.5 opacity-80">
                    You&apos;re at your non-pantry item limit. Consider swapping
                    a meal to reduce your shopping list.
                  </p>
                )}
                {needToBuyCount > maxBuy && (
                  <p className="text-xs mt-0.5 opacity-80 font-semibold">
                    Over budget! Swap some meals for pantry-friendly options.
                  </p>
                )}
              </div>
            )}

            {groceryList.length === 0 ? (
              <p className="text-gray-400 text-sm">No ingredients needed.</p>
            ) : (
              <div className="space-y-5">
                {/* Need to buy — grouped by meal type */}
                {groceryList.some((g) => g.status === "need-to-buy") && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      Need to buy
                    </h3>
                    {/* Sub-group by meal type */}
                    {activeMealTypes.map((mt) => {
                      const items = groceryList.filter(
                        (g) =>
                          g.status === "need-to-buy" &&
                          g.mealTypes.includes(mt)
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={mt} className="mb-2">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${MEAL_TYPE_COLORS[mt]}`}
                          >
                            {MEAL_TYPE_LABELS[mt]}
                          </span>
                          <div className="space-y-1">
                            {items.map((g) => (
                              <div
                                key={`${g.name}-${mt}`}
                                className="flex items-center justify-between py-1.5 px-3 bg-red-50 rounded-lg text-sm"
                              >
                                <span className="text-gray-800 capitalize">
                                  {g.name}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {Math.round(g.amount)} {g.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Arriving soon */}
                {groceryList.some((g) => g.status === "arriving-soon") && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      Arriving soon at pantry
                    </h3>
                    <div className="space-y-1">
                      {groceryList
                        .filter((g) => g.status === "arriving-soon")
                        .map((g) => (
                          <div
                            key={g.name}
                            className="flex items-center justify-between py-1.5 px-3 bg-blue-50 rounded-lg text-sm"
                          >
                            <span className="text-gray-800 capitalize">
                              {g.name}
                            </span>
                            <span className="text-blue-600 text-xs">
                              {g.availableDate &&
                                new Date(g.availableDate).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* In stock */}
                {groceryList.some((g) => g.status === "in-stock") && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      Available at pantry
                    </h3>
                    <div className="space-y-1">
                      {groceryList
                        .filter((g) => g.status === "in-stock")
                        .map((g) => (
                          <div
                            key={g.name}
                            className="flex items-center justify-between py-1.5 px-3 bg-green-50 rounded-lg text-sm"
                          >
                            <span className="text-gray-800 capitalize">
                              {g.name}
                            </span>
                            <span className="text-green-600 text-xs">
                              ✓ In stock
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MealSlotCard({
  recipe,
  expectedMealType,
  onSwap,
}: {
  recipe: ScoredRecipe | null;
  expectedMealType: MealType;
  onSwap: () => void;
}) {
  if (!recipe) {
    return (
      <div className="bg-gray-100 rounded-lg p-2 flex flex-col items-center justify-center min-h-[100px] text-xs text-gray-400 text-center">
        <p>Not enough recipes</p>
        <a href="/swipe" className="text-ucd-blue hover:underline mt-1 print-hide">
          Swipe more
        </a>
      </div>
    );
  }

  const isUnconfirmed =
    recipe.meal_type === "unknown" &&
    expectedMealType !== "unknown";

  return (
    <div className="card overflow-hidden group relative min-h-[100px]">
      {recipe.image && (
        <div className="relative h-16 bg-gray-100">
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="160px"
          />
        </div>
      )}
      <div className="p-2">
        <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">
          {recipe.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {recipe.nutrition && (
            <span className="text-[10px] text-gray-400">
              {Math.round(recipe.nutrition.calories)} cal
            </span>
          )}
          {isUnconfirmed && (
            <span className="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded">
              Unconfirmed
            </span>
          )}
        </div>
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 print-hide">
        <button
          onClick={onSwap}
          className="bg-white text-gray-800 text-xs font-medium px-2 py-1 rounded shadow hover:bg-gray-50"
          title="Swap recipe"
        >
          Swap
        </button>
        <a
          href={recipe.source_url ?? `/recipe/${recipe.id}`}
          target={recipe.source_url ? "_blank" : "_self"}
          rel={recipe.source_url ? "noopener noreferrer" : undefined}
          className="bg-ucd-blue text-white text-xs font-medium px-2 py-1 rounded shadow hover:bg-ucd-blue/90"
          title="View full recipe"
        >
          Recipe ↗
        </a>
      </div>
    </div>
  );
}
