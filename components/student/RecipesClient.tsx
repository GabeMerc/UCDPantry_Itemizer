"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type {
  EnrichedRecipe,
  PopularRecipe,
  StudentPreferences,
  DietaryTag,
  CachedRecipe,
  RecipeNutrition,
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

type Tab = "suggestions" | "popular";

interface WeeklyTopPick {
  recipe_id: number;
  recipe_title: string;
  recipe_image_url: string | null;
  count: number;
}

export default function RecipesClient({
  ingredientNames,
  popularRecipes,
  weeklyTopPicks = [],
  cachedRecipes = [],
}: {
  ingredientNames: string[];
  popularRecipes: PopularRecipe[];
  weeklyTopPicks?: WeeklyTopPick[];
  cachedRecipes?: CachedRecipe[];
}) {
  const [tab, setTab] = useState<Tab>("suggestions");
  const [recipes, setRecipes] = useState<EnrichedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [hasFetched, setHasFetched] = useState(false);

  // Build cache lookup
  const cacheMap = new Map<number, CachedRecipe>();
  for (const c of cachedRecipes) {
    cacheMap.set(c.spoonacular_id, c);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pantry_preferences");
      if (raw) setPrefs(JSON.parse(raw));
      const rawLikes = localStorage.getItem("pantry_liked_recipes");
      if (rawLikes) setLikedIds(new Set(JSON.parse(rawLikes)));
    } catch {
      // ignore
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    if (ingredientNames.length === 0) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      ingredients: ingredientNames.join(","),
      refresh: "1", // always fetch fresh from Spoonacular with current inventory
    });

    // Map dietary preferences to Spoonacular diet parameter
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
      setRecipes(json.recipes ?? []);
      setHasFetched(true);

      // Track views for all returned recipes
      for (const r of json.recipes ?? []) {
        void trackInteraction(r.id, r.title, r.image, "view");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [ingredientNames, prefs]);

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
      // non-critical, ignore
    }
  }

  function toggleLike(recipe: EnrichedRecipe) {
    const newLiked = new Set(likedIds);
    const isLiking = !likedIds.has(recipe.id);

    if (isLiking) {
      newLiked.add(recipe.id);
      void trackInteraction(recipe.id, recipe.title, recipe.image, "like");
    } else {
      newLiked.delete(recipe.id);
    }

    setLikedIds(newLiked);
    localStorage.setItem(
      "pantry_liked_recipes",
      JSON.stringify([...newLiked])
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { key: "suggestions", label: "For You" },
            { key: "popular", label: `Popular (${popularRecipes.length})` },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-ucd-blue text-ucd-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Suggestions tab */}
      {tab === "suggestions" && (
        <div className="space-y-4">
          {!hasFetched ? (
            <div className="card p-8 text-center space-y-4">
              <p className="text-gray-600">
                Get recipe ideas based on the{" "}
                <strong>{ingredientNames.length} items</strong> currently in
                stock.
              </p>
              {prefs?.dietaryRestrictions?.length ? (
                <p className="text-sm text-gray-400">
                  Dietary filters: {prefs.dietaryRestrictions.join(", ")}
                </p>
              ) : null}
              {prefs?.maxBuyItems !== null && prefs?.maxBuyItems !== undefined && (
                <p className="text-sm text-gray-400">
                  Budget:{" "}
                  {prefs.maxBuyItems === 0
                    ? "Pantry only (no extra purchases)"
                    : `Up to ${prefs.maxBuyItems} non-pantry items`}
                </p>
              )}
              <button
                onClick={fetchRecipes}
                disabled={loading || ingredientNames.length === 0}
                className="btn-primary"
              >
                {loading ? "Finding recipes…" : "Find recipes"}
              </button>
              {ingredientNames.length === 0 && (
                <p className="text-sm text-orange-600">
                  No items are currently in stock.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {recipes.length} recipes based on today&apos;s inventory
                </p>
                <button
                  onClick={fetchRecipes}
                  disabled={loading}
                  className="text-sm text-ucd-blue hover:underline"
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              {recipes.length === 0 && !loading && (
                <div className="card p-8 text-center space-y-4">
                  <div className="text-5xl">🍽️</div>
                  <p className="text-gray-600 font-medium">
                    No recipes matched your requirements.
                  </p>
                  {prefs?.maxBuyItems !== null &&
                    prefs?.maxBuyItems !== undefined && (
                      <p className="text-sm text-gray-400">
                        Your budget is set to{" "}
                        <strong>
                          {prefs.maxBuyItems === 0
                            ? "pantry only"
                            : `${prefs.maxBuyItems} non-pantry items`}
                        </strong>
                        . Try increasing your budget in{" "}
                        <a
                          href="/preferences"
                          className="text-ucd-blue hover:underline"
                        >
                          Preferences
                        </a>{" "}
                        to see more recipes.
                      </p>
                    )}
                  {(!prefs?.maxBuyItems && prefs?.maxBuyItems !== 0) && (
                    <p className="text-sm text-gray-400">
                      Try adjusting your dietary preferences or refreshing.
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    liked={likedIds.has(recipe.id)}
                    onLike={() => toggleLike(recipe)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Popular tab */}
      {tab === "popular" && (
        <div className="space-y-6">
          {/* This Week's Top Picks */}
          {weeklyTopPicks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <h2 className="text-lg font-bold text-gray-900">
                  This Week&apos;s Top Picks
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {weeklyTopPicks.map((pick, idx) => {
                  const cached = cacheMap.get(pick.recipe_id);
                  return (
                    <WeeklyTopCard
                      key={pick.recipe_id}
                      pick={pick}
                      rank={idx + 1}
                      cached={cached}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* All popular recipes */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">All Popular</h2>
            {popularRecipes.length === 0 ? (
              <p className="text-gray-400 text-center py-12">
                No recipe interactions yet. Be the first to explore!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularRecipes.map((r) => (
                  <PopularRecipeCard key={r.recipe_id} recipe={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  liked,
  onLike,
}: {
  recipe: EnrichedRecipe;
  liked: boolean;
  onLike: () => void;
}) {
  const allMissed = recipe.missedIngredients ?? [];
  const upcoming = recipe.upcomingIngredients ?? [];
  const trulyMissed = allMissed.filter(
    (ing) =>
      !upcoming.some(
        (u) => u.name.toLowerCase() === ing.name.toLowerCase()
      )
  );

  return (
    <div className="card overflow-hidden flex flex-col">
      {recipe.image && (
        <div className="relative h-44 bg-gray-100">
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-gray-900 leading-tight">
          {recipe.title}
        </h3>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="text-green-600 font-medium">
            ✓ {recipe.usedIngredientCount} in stock
          </span>
          {trulyMissed.length > 0 && (
            <span className="text-red-500">
              ✗ {trulyMissed.length} missing
            </span>
          )}
          {upcoming.length > 0 && (
            <span className="text-blue-500">
              ⏳ {upcoming.length} coming soon
            </span>
          )}
          {recipe.ready_in_minutes && (
            <span className="text-gray-400">
              {recipe.ready_in_minutes} min
            </span>
          )}
        </div>

        {/* Nutrition from cache */}
        {recipe.nutrition && (
          <div className="flex gap-2 text-xs text-gray-400">
            <span>{Math.round(recipe.nutrition.calories)} cal</span>
            <span>{Math.round(recipe.nutrition.protein)}g protein</span>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-800 space-y-0.5">
            {upcoming.map((u) => (
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

        <div className="mt-auto pt-2 flex items-center justify-between">
          <a
            href={`https://spoonacular.com/recipes/${recipe.title.toLowerCase().replace(/\s+/g, "-")}-${recipe.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ucd-blue hover:underline"
          >
            View recipe →
          </a>
          <button
            onClick={onLike}
            className={`text-sm transition-colors ${
              liked ? "text-red-500" : "text-gray-300 hover:text-red-400"
            }`}
            title={liked ? "Unlike" : "Like"}
          >
            {liked ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WeeklyTopCard({
  pick,
  rank,
  cached,
}: {
  pick: WeeklyTopPick;
  rank: number;
  cached?: CachedRecipe;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="card overflow-hidden flex flex-col border-2 border-ucd-gold/30">
      {pick.recipe_image_url && (
        <div className="relative h-44 bg-gray-100">
          <Image
            src={pick.recipe_image_url}
            alt={pick.recipe_title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-lg w-8 h-8 rounded-full flex items-center justify-center shadow">
            {medals[rank - 1] ?? rank}
          </div>
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 leading-tight">
          {pick.recipe_title}
        </h3>
        <p className="text-xs text-ucd-gold font-medium">
          {pick.count} like{pick.count !== 1 ? "s" : ""} this week
        </p>

        {/* Show cache details if available */}
        {cached && (
          <div className="space-y-1">
            {cached.nutrition && (
              <div className="flex gap-2 text-xs text-gray-400">
                <span>
                  {Math.round(
                    (cached.nutrition as RecipeNutrition).calories
                  )}{" "}
                  cal
                </span>
                <span>
                  {Math.round(
                    (cached.nutrition as RecipeNutrition).protein
                  )}
                  g protein
                </span>
              </div>
            )}
            {cached.cuisines && cached.cuisines.length > 0 && (
              <p className="text-xs text-gray-400">
                {cached.cuisines.join(", ")}
              </p>
            )}
            {cached.ready_in_minutes && (
              <p className="text-xs text-gray-400">
                {cached.ready_in_minutes} min
              </p>
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          <a
            href={`https://spoonacular.com/recipes/${pick.recipe_title.toLowerCase().replace(/\s+/g, "-")}-${pick.recipe_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ucd-blue hover:underline"
          >
            View recipe →
          </a>
        </div>
      </div>
    </div>
  );
}

function PopularRecipeCard({ recipe }: { recipe: PopularRecipe }) {
  return (
    <div className="card overflow-hidden flex flex-col">
      {recipe.recipe_image_url && (
        <div className="relative h-44 bg-gray-100">
          <Image
            src={recipe.recipe_image_url}
            alt={recipe.recipe_title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 leading-tight">
          {recipe.recipe_title}
        </h3>
        <div className="flex gap-3 text-xs text-gray-400">
          <span>{recipe.view_count} views</span>
          <span>{recipe.like_count} likes</span>
        </div>
        <div className="mt-auto pt-2">
          <a
            href={`https://spoonacular.com/recipes/${recipe.recipe_title.toLowerCase().replace(/\s+/g, "-")}-${recipe.recipe_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ucd-blue hover:underline"
          >
            View recipe →
          </a>
        </div>
      </div>
    </div>
  );
}
