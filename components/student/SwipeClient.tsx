"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type {
  EnrichedRecipe,
  ScoredRecipe,
  StudentPreferences,
  PopularRecipe,
  DietaryTag,
  RecipeNutrition,
  MealType,
} from "@/lib/types";

const SPOONACULAR_DIET_MAP: Record<DietaryTag, string> = {
  vegan: "vegan",
  vegetarian: "vegetarian",
  "gluten-free": "gluten free",
  "dairy-free": "dairy free",
  "nut-free": "",
  halal: "",
  kosher: "",
};

const SWIPE_THRESHOLD = 100;
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
const MEAL_COMBOS_2: { label: string; types: MealType[] }[] = [
  { label: "Breakfast + Lunch", types: ["breakfast", "lunch"] },
  { label: "Breakfast + Dinner", types: ["breakfast", "dinner"] },
  { label: "Lunch + Dinner", types: ["lunch", "dinner"] },
];
const MEAL_SINGLE: { label: string; types: MealType[] }[] = [
  { label: "Breakfast", types: ["breakfast"] },
  { label: "Lunch", types: ["lunch"] },
  { label: "Dinner", types: ["dinner"] },
];

interface SwipeSession {
  mealType: MealType;
  recipes: ScoredRecipe[];
  currentIndex: number;
  liked: ScoredRecipe[];
  skipped: ScoredRecipe[];
}

export default function SwipeClient({
  ingredientNames,
  popularRecipes,
}: {
  ingredientNames: string[];
  popularRecipes: PopularRecipe[];
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);
  const [allRecipes, setAllRecipes] = useState<ScoredRecipe[]>([]);
  const [sessions, setSessions] = useState<SwipeSession[]>([]);
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "pre-fetch" | "choose-meals" | "swiping" | "finished"
  >("pre-fetch");
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>([]);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(
    null
  );
  const startXRef = useRef(0);

  // Load preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pantry_preferences");
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs({ ...parsed });
        if (parsed.selectedMealTypes?.length) {
          setSelectedMealTypes(parsed.selectedMealTypes);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const scoreRecipes = useCallback(
    (enriched: EnrichedRecipe[]): ScoredRecipe[] => {
      const popularMap = new Map<number, PopularRecipe>();
      for (const p of popularRecipes) {
        popularMap.set(p.recipe_id, p);
      }

      const pantrySet = new Set(ingredientNames.map((n) => n.toLowerCase()));

      return enriched
        .map((recipe) => {
          let score = 0;

          // Compute buy count (non-pantry, non-arriving-soon ingredients)
          const missedNames = (recipe.missedIngredients ?? []).map((i) =>
            i.name.toLowerCase()
          );
          const upcomingNames = new Set(
            (recipe.upcomingIngredients ?? []).map((u) => u.name.toLowerCase())
          );
          const buyCount = missedNames.filter(
            (n) => !upcomingNames.has(n)
          ).length;

          // 1. Dietary hard filter
          if (prefs?.dietaryRestrictions?.length && recipe.dietary_tags) {
            const recipeTags = recipe.dietary_tags.map((t) => t.toLowerCase());
            const hasViolation = prefs.dietaryRestrictions.some(
              (restriction) => !recipeTags.includes(restriction.toLowerCase())
            );
            if (hasViolation) score -= 50;
          }

          // 2. Buy count — proportional penalty (hard filtering done server-side)
          if (buyCount > 0) {
            const maxBuy = prefs?.maxBuyItems;
            if (maxBuy !== null && maxBuy !== undefined && maxBuy > 0) {
              const ratio = buyCount / maxBuy;
              score -= Math.round(ratio * 15);
            }
          }

          // 3. Macro proximity (0–30 pts)
          if (recipe.nutrition) {
            score += macroScore(recipe.nutrition, prefs);
          } else {
            score += 15;
          }

          // 4. Cuisine match (0–20 pts)
          if (prefs?.cuisinePreferences?.length && recipe.cuisines?.length) {
            const cuisineMatch = recipe.cuisines.some((c) =>
              prefs.cuisinePreferences
                .map((p) => p.toLowerCase())
                .includes(c.toLowerCase())
            );
            if (cuisineMatch) score += 20;
          }

          // 5. Pantry coverage (0–20 pts)
          const totalIngredients =
            recipe.usedIngredientCount + recipe.missedIngredientCount;
          if (totalIngredients > 0) {
            score += Math.round(
              (recipe.usedIngredientCount / totalIngredients) * 20
            );
          }

          // 6. Popularity boost (0–10 pts)
          const pop = popularMap.get(recipe.id);
          if (pop) {
            const popScore = Math.min(
              10,
              Math.round((pop.like_count * 3 + pop.view_count) / 5)
            );
            score += popScore;
          }

          // 7. Disliked ingredient penalty
          if (prefs?.dislikedIngredients?.length) {
            const allIngNames = [
              ...(recipe.usedIngredients ?? []),
              ...(recipe.missedIngredients ?? []),
            ].map((i) => i.name.toLowerCase());

            for (const disliked of prefs.dislikedIngredients) {
              if (
                allIngNames.some(
                  (n) => n.includes(disliked) || disliked.includes(n)
                )
              ) {
                score -= 5;
              }
            }
          }

          return { ...recipe, score, buyCount } as ScoredRecipe;
        })
        .sort((a, b) => b.score - a.score);
    },
    [prefs, popularRecipes, ingredientNames]
  );

  const buildSessions = useCallback(
    (scored: ScoredRecipe[], mealTypes: MealType[]): SwipeSession[] => {
      return mealTypes.map((mt) => {
        let recipes = scored.filter((r) => r.meal_type === mt);
        // Backfill with unknown if <5
        if (recipes.length < 5) {
          const unknowns = scored.filter(
            (r) =>
              r.meal_type === "unknown" &&
              !recipes.some((ex) => ex.id === r.id)
          );
          recipes = [...recipes, ...unknowns].slice(0, Math.max(recipes.length, 5));
        }
        return {
          mealType: mt,
          recipes,
          currentIndex: 0,
          liked: [],
          skipped: [],
        };
      });
    },
    []
  );

  const fetchRecipes = useCallback(async () => {
    if (ingredientNames.length === 0) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      ingredients: ingredientNames.join(","),
      refresh: "1", // bypass stale cache to find recipes with current inventory
    });

    if (prefs?.dietaryRestrictions?.length) {
      const diet = prefs.dietaryRestrictions
        .map((t) => SPOONACULAR_DIET_MAP[t])
        .find(Boolean);
      if (diet) params.set("diet", diet);
    }

    // Pass budget constraint for server-side hard filtering
    if (prefs?.maxBuyItems !== null && prefs?.maxBuyItems !== undefined) {
      params.set("maxBuyItems", String(prefs.maxBuyItems));
    }

    try {
      const res = await fetch(`/api/recipes?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch recipes");
      const scored = scoreRecipes(json.recipes ?? []);
      setAllRecipes(scored);

      if (scored.length === 0) {
        // No recipes passed the budget filter
        setPhase("finished");
        return;
      }

      const mealsPerDay = prefs?.mealsPerDay ?? 3;
      if (mealsPerDay === 3) {
        const types: MealType[] = ["breakfast", "lunch", "dinner"];
        setSelectedMealTypes(types);
        setSessions(buildSessions(scored, types));
        setCurrentSessionIdx(0);
        setPhase("swiping");
      } else {
        // Need user to choose which meals
        setPhase("choose-meals");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [ingredientNames, prefs, scoreRecipes, buildSessions]);

  function handleChooseMeals(types: MealType[]) {
    setSelectedMealTypes(types);
    // Save selection to prefs
    const updatedPrefs = { ...prefs, selectedMealTypes: types };
    localStorage.setItem("pantry_preferences", JSON.stringify(updatedPrefs));

    setSessions(buildSessions(allRecipes, types));
    setCurrentSessionIdx(0);
    setPhase("swiping");
  }

  // ── Swipe gesture handlers ────────────────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    setIsDragging(true);
    setExitDirection(null);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    setDragX(e.clientX - startXRef.current);
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) handleLike();
    else if (dragX < -SWIPE_THRESHOLD) handleSkip();
    else setDragX(0);
  }

  function handleLike() {
    const session = sessions[currentSessionIdx];
    if (!session || session.currentIndex >= session.recipes.length) return;
    const recipe = session.recipes[session.currentIndex];
    setExitDirection("right");

    void trackInteraction(recipe.id, recipe.title, recipe.image, "like");

    setTimeout(() => {
      setSessions((prev) => {
        const updated = [...prev];
        updated[currentSessionIdx] = {
          ...updated[currentSessionIdx],
          liked: [...updated[currentSessionIdx].liked, recipe],
          currentIndex: updated[currentSessionIdx].currentIndex + 1,
        };
        return updated;
      });
      setDragX(0);
      setExitDirection(null);
    }, 300);
  }

  function handleSkip() {
    const session = sessions[currentSessionIdx];
    if (!session || session.currentIndex >= session.recipes.length) return;
    setExitDirection("left");

    setTimeout(() => {
      setSessions((prev) => {
        const updated = [...prev];
        updated[currentSessionIdx] = {
          ...updated[currentSessionIdx],
          skipped: [
            ...updated[currentSessionIdx].skipped,
            updated[currentSessionIdx].recipes[
              updated[currentSessionIdx].currentIndex
            ],
          ],
          currentIndex: updated[currentSessionIdx].currentIndex + 1,
        };
        return updated;
      });
      setDragX(0);
      setExitDirection(null);
    }, 300);
  }

  function handleUndo() {
    const session = sessions[currentSessionIdx];
    if (!session || session.currentIndex === 0) return;
    const prevIdx = session.currentIndex - 1;
    const prevRecipe = session.recipes[prevIdx];

    setSessions((prev) => {
      const updated = [...prev];
      updated[currentSessionIdx] = {
        ...updated[currentSessionIdx],
        currentIndex: prevIdx,
        liked: updated[currentSessionIdx].liked.filter(
          (r) => r.id !== prevRecipe.id
        ),
        skipped: updated[currentSessionIdx].skipped.filter(
          (r) => r.id !== prevRecipe.id
        ),
      };
      return updated;
    });
  }

  function handleNextSession() {
    if (currentSessionIdx < sessions.length - 1) {
      setCurrentSessionIdx((i) => i + 1);
    } else {
      setPhase("finished");
    }
  }

  function handleFinish() {
    // Combine liked recipes from all sessions (tagged with meal_type)
    const allLiked: ScoredRecipe[] = [];
    for (const s of sessions) {
      for (const r of s.liked) {
        allLiked.push({ ...r, meal_type: s.mealType });
      }
    }

    localStorage.setItem(
      "pantry_liked_recipe_data",
      JSON.stringify(allLiked)
    );

    const existingLikes = (() => {
      try {
        const raw = localStorage.getItem("pantry_liked_recipes");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const mergedIds = [
      ...new Set([...existingLikes, ...allLiked.map((r) => r.id)]),
    ];
    localStorage.setItem("pantry_liked_recipes", JSON.stringify(mergedIds));
    router.push("/meal-plan");
  }

  async function trackInteraction(
    id: number,
    title: string,
    image: string,
    type: "view" | "like"
  ) {
    try {
      await fetch("/api/recipe-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: id,
          recipe_title: title,
          recipe_image_url: image,
          interaction_type: type,
        }),
      });
    } catch {
      // non-critical
    }
  }

  // Current session state
  const currentSession = sessions[currentSessionIdx];
  const currentRecipe = currentSession?.recipes[currentSession?.currentIndex];
  const sessionFinished =
    currentSession &&
    currentSession.currentIndex >= currentSession.recipes.length;
  const sessionProgress =
    currentSession && currentSession.recipes.length > 0
      ? (currentSession.currentIndex / currentSession.recipes.length) * 100
      : 0;

  const totalLiked = sessions.reduce((sum, s) => sum + s.liked.length, 0);
  const totalSkipped = sessions.reduce((sum, s) => sum + s.skipped.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recipe Swipe</h1>
        {!prefs && (
          <a
            href="/onboarding"
            className="text-sm text-ucd-blue hover:underline"
          >
            Set up preferences first →
          </a>
        )}
      </div>

      {/* ── Pre-fetch ─────────────────────────────────────────────────── */}
      {phase === "pre-fetch" && (
        <div className="card p-8 text-center space-y-4">
          <div className="text-6xl">🍳</div>
          <h2 className="text-lg font-semibold text-gray-800">
            Ready to find your favorites?
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            We&apos;ll show you recipes based on{" "}
            <strong>{ingredientNames.length} items</strong> in stock, grouped by
            meal type. Swipe right to like, left to skip!
          </p>
          {prefs?.dietaryRestrictions?.length ? (
            <p className="text-xs text-gray-400">
              Filters: {prefs.dietaryRestrictions.join(", ")}
            </p>
          ) : null}
          {prefs?.maxBuyItems !== null && prefs?.maxBuyItems !== undefined && (
            <p className="text-xs text-gray-400">
              Budget: up to {prefs.maxBuyItems} non-pantry items
              {prefs.maxBuyItems === 0 ? " (pantry only)" : ""}
            </p>
          )}
          <button
            onClick={fetchRecipes}
            disabled={loading || ingredientNames.length === 0}
            className="btn-primary text-lg px-8 py-3"
          >
            {loading ? "Loading recipes…" : "Start swiping!"}
          </button>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
      )}

      {/* ── Choose meals (for 1 or 2 meals/day) ──────────────────────── */}
      {phase === "choose-meals" && (
        <div className="card p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">
              Which meals are you planning?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              You selected {prefs?.mealsPerDay ?? 1} meal
              {(prefs?.mealsPerDay ?? 1) !== 1 ? "s" : ""} per day.
            </p>
          </div>

          <div className="space-y-3">
            {(prefs?.mealsPerDay === 2 ? MEAL_COMBOS_2 : MEAL_SINGLE).map(
              (opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleChooseMeals(opt.types)}
                  className="w-full text-left px-5 py-4 rounded-lg border-2 border-gray-200 hover:border-ucd-blue transition-all"
                >
                  <p className="font-semibold text-gray-800">{opt.label}</p>
                  <div className="flex gap-2 mt-1">
                    {opt.types.map((t) => (
                      <span
                        key={t}
                        className={`text-xs px-2 py-0.5 rounded-full ${MEAL_TYPE_COLORS[t]}`}
                      >
                        {MEAL_TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Active swiping ────────────────────────────────────────────── */}
      {phase === "swiping" && currentSession && !sessionFinished && currentRecipe && (
        <div className="space-y-4">
          {/* Session header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  MEAL_TYPE_COLORS[currentSession.mealType]
                }`}
              >
                {MEAL_TYPE_LABELS[currentSession.mealType]}
              </span>
              <span className="text-sm text-gray-400">
                Session {currentSessionIdx + 1} of {sessions.length}
              </span>
            </div>
            <span className="text-sm text-gray-500 tabular-nums">
              {currentSession.currentIndex + 1} / {currentSession.recipes.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-ucd-gold rounded-full transition-all duration-300"
              style={{ width: `${sessionProgress}%` }}
            />
          </div>

          {/* Swipe card */}
          <div className="flex justify-center">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="card w-full max-w-sm overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none relative"
              style={{
                transform: exitDirection
                  ? `translateX(${exitDirection === "right" ? 500 : -500}px) rotate(${exitDirection === "right" ? 20 : -20}deg)`
                  : `translateX(${dragX}px) rotate(${dragX * 0.08}deg)`,
                transition:
                  exitDirection || !isDragging
                    ? "transform 0.3s ease-out"
                    : "none",
                opacity: exitDirection ? 0 : 1,
              }}
            >
              {/* Swipe indicators */}
              {dragX > 30 && (
                <div className="absolute top-4 left-4 z-10 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm rotate-[-12deg]">
                  LIKE
                </div>
              )}
              {dragX < -30 && (
                <div className="absolute top-4 right-4 z-10 bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-sm rotate-[12deg]">
                  SKIP
                </div>
              )}

              {/* Image */}
              {currentRecipe.image && (
                <div className="relative h-56 bg-gray-100">
                  <Image
                    src={currentRecipe.image}
                    alt={currentRecipe.title}
                    fill
                    className="object-cover pointer-events-none"
                    sizes="400px"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        MEAL_TYPE_COLORS[currentSession.mealType]
                      }`}
                    >
                      {MEAL_TYPE_LABELS[currentSession.mealType]}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    Score: {currentRecipe.score}
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3">
                <h3 className="font-bold text-lg text-gray-900 leading-tight">
                  {currentRecipe.title}
                </h3>

                {/* Info pills */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {currentRecipe.usedIngredientCount} in stock
                  </span>
                  {currentRecipe.buyCount > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      {currentRecipe.buyCount} to buy
                    </span>
                  )}
                  {(currentRecipe.upcomingIngredients?.length ?? 0) > 0 && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      {currentRecipe.upcomingIngredients.length} arriving soon
                    </span>
                  )}
                  {currentRecipe.ready_in_minutes && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {currentRecipe.ready_in_minutes} min
                    </span>
                  )}
                </div>

                {/* Nutrition */}
                {currentRecipe.nutrition && (
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <NutrientPill label="Cal" value={currentRecipe.nutrition.calories} unit="" />
                    <NutrientPill label="Protein" value={currentRecipe.nutrition.protein} unit="g" />
                    <NutrientPill label="Carbs" value={currentRecipe.nutrition.carbs} unit="g" />
                    <NutrientPill label="Fat" value={currentRecipe.nutrition.fat} unit="g" />
                  </div>
                )}

                {/* Arriving soon */}
                {(currentRecipe.upcomingIngredients?.length ?? 0) > 0 && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-800 space-y-0.5">
                    {currentRecipe.upcomingIngredients.map((u) => (
                      <p key={u.name}>
                        <strong>{u.name}</strong> available{" "}
                        {new Date(u.availableDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={handleUndo}
              disabled={currentSession.currentIndex === 0}
              className="w-12 h-12 rounded-full border-2 border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 disabled:opacity-30 transition-colors flex items-center justify-center text-lg"
              title="Undo"
            >
              ↩
            </button>
            <button
              onClick={handleSkip}
              className="w-16 h-16 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors flex items-center justify-center text-2xl font-bold shadow-md"
              title="Skip"
            >
              ✕
            </button>
            <button
              onClick={handleLike}
              className="w-16 h-16 rounded-full bg-green-100 text-green-500 hover:bg-green-200 transition-colors flex items-center justify-center text-2xl shadow-md"
              title="Like"
            >
              ♥
            </button>
          </div>

          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <span>♥ {currentSession.liked.length} liked</span>
            <span>✕ {currentSession.skipped.length} skipped</span>
          </div>
        </div>
      )}

      {/* ── Session finished, next session available ──────────────────── */}
      {phase === "swiping" && currentSession && sessionFinished && (
        <div className="card p-8 text-center space-y-4">
          <span
            className={`inline-block text-sm font-bold px-4 py-1.5 rounded-full ${
              MEAL_TYPE_COLORS[currentSession.mealType]
            }`}
          >
            {MEAL_TYPE_LABELS[currentSession.mealType]} complete!
          </span>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {currentSession.liked.length}
              </p>
              <p className="text-xs text-gray-500">Liked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">
                {currentSession.skipped.length}
              </p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
          </div>

          {currentSession.recipes.length === 0 && (
            <p className="text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
              No {MEAL_TYPE_LABELS[currentSession.mealType].toLowerCase()} recipes
              available. Try browsing more items or adjusting your preferences.
            </p>
          )}

          {currentSessionIdx < sessions.length - 1 ? (
            <button onClick={handleNextSession} className="btn-primary">
              Next: {MEAL_TYPE_LABELS[sessions[currentSessionIdx + 1].mealType]} →
            </button>
          ) : (
            <button onClick={() => setPhase("finished")} className="btn-primary">
              See results →
            </button>
          )}
        </div>
      )}

      {/* ── All done ──────────────────────────────────────────────────── */}
      {phase === "finished" && (
        <div className="card p-8 text-center space-y-6">
          {/* No recipes at all — budget filtered everything */}
          {allRecipes.length === 0 && sessions.length === 0 ? (
            <>
              <div className="text-5xl">🍽️</div>
              <h2 className="text-xl font-bold text-gray-900">
                No recipes matched your requirements
              </h2>
              {prefs?.maxBuyItems !== null &&
                prefs?.maxBuyItems !== undefined && (
                  <p className="text-sm text-gray-500">
                    Your budget is set to{" "}
                    <strong>
                      {prefs.maxBuyItems === 0
                        ? "pantry only"
                        : `${prefs.maxBuyItems} non-pantry items`}
                    </strong>
                    . Try increasing your budget to see more recipes.
                  </p>
                )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setPhase("pre-fetch");
                    setSessions([]);
                    setAllRecipes([]);
                  }}
                  className="btn-primary"
                >
                  Try again
                </button>
                <a href="/preferences" className="btn-secondary">
                  Edit preferences
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">All done!</h2>

              {/* Per-session breakdown */}
              <div className="flex justify-center gap-6 flex-wrap">
                {sessions.map((s) => (
                  <div key={s.mealType} className="text-center">
                    <span
                      className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${
                        MEAL_TYPE_COLORS[s.mealType]
                      }`}
                    >
                      {MEAL_TYPE_LABELS[s.mealType]}
                    </span>
                    <p className="text-lg font-bold text-green-600">
                      {s.liked.length} liked
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-gray-500 text-sm">
                Total: {totalLiked} liked, {totalSkipped} skipped
              </p>

              {totalLiked > 0 ? (
                <>
                  <p className="text-gray-600 text-sm">
                    Your liked recipes will fill your weekly meal plan by type.
                  </p>
                  <button
                    onClick={handleFinish}
                    className="btn-primary text-lg px-8 py-3"
                  >
                    Build my meal plan →
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 text-sm">
                    You didn&apos;t like any recipes. Try again or adjust preferences.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setPhase("pre-fetch");
                        setSessions([]);
                      }}
                      className="btn-primary"
                    >
                      Try again
                    </button>
                    <a href="/preferences" className="btn-secondary">
                      Edit preferences
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NutrientPill({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg py-1.5 px-1">
      <p className="font-bold text-gray-800">
        {Math.round(value)}
        {unit}
      </p>
      <p className="text-gray-400">{label}</p>
    </div>
  );
}

function macroScore(
  nutrition: RecipeNutrition,
  prefs: StudentPreferences | null
): number {
  if (!prefs) return 15;

  let totalPoints = 0;
  let goalCount = 0;

  if (prefs.calorieGoal) {
    goalCount++;
    const perMealGoal = prefs.calorieGoal / (prefs.mealsPerDay || 3);
    const diff = Math.abs(nutrition.calories - perMealGoal);
    const pct = Math.max(0, 1 - diff / perMealGoal);
    totalPoints += pct * 7.5;
  }
  if (prefs.proteinGoal) {
    goalCount++;
    const perMealGoal = prefs.proteinGoal / (prefs.mealsPerDay || 3);
    const diff = Math.abs(nutrition.protein - perMealGoal);
    const pct = Math.max(0, 1 - diff / perMealGoal);
    totalPoints += pct * 7.5;
  }
  if (prefs.carbGoal) {
    goalCount++;
    const perMealGoal = prefs.carbGoal / (prefs.mealsPerDay || 3);
    const diff = Math.abs(nutrition.carbs - perMealGoal);
    const pct = Math.max(0, 1 - diff / perMealGoal);
    totalPoints += pct * 7.5;
  }
  if (prefs.fatGoal) {
    goalCount++;
    const perMealGoal = prefs.fatGoal / (prefs.mealsPerDay || 3);
    const diff = Math.abs(nutrition.fat - perMealGoal);
    const pct = Math.max(0, 1 - diff / perMealGoal);
    totalPoints += pct * 7.5;
  }

  if (goalCount === 0) return 15;
  return Math.round((totalPoints / goalCount) * (30 / 7.5));
}
