import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { CachedIngredient, MealType, RecipeNutrition } from "@/lib/types";
import BackButton from "./BackButton";

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-100 text-amber-800",
  lunch:     "bg-green-100 text-green-800",
  dinner:    "bg-blue-100 text-blue-800",
  unknown:   "bg-gray-100 text-gray-600",
};

/** Strip HTML tags and collapse whitespace, keeping newlines meaningful. */
function stripHtml(html: string): string {
  return html
    .replace(/<\/?(li|p|br|ol|ul|div|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split instructions into step strings. */
function parseSteps(instructions: string): string[] {
  const clean = stripHtml(instructions);
  return clean
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const supabase = await createClient();
  const { data: recipe, error } = await supabase
    .from("recipes_cache")
    .select("*")
    .eq("spoonacular_id", numId)
    .single();

  if (error || !recipe) notFound();

  const ingredients = (recipe.ingredients ?? []) as CachedIngredient[];
  const nutrition   = recipe.nutrition as RecipeNutrition | null;
  const mealType    = (recipe.meal_type ?? "unknown") as MealType;
  const steps       = recipe.instructions ? parseSteps(recipe.instructions) : [];

  return (
    <div className="min-h-screen bg-[#faf5ec]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton />
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-800 truncate">
            {recipe.title}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {recipe.title}
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                MEAL_TYPE_COLORS[mealType]
              }`}
            >
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </span>
            {recipe.ready_in_minutes && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {recipe.ready_in_minutes} min
              </span>
            )}
            {(recipe.dietary_tags as string[])?.map((tag) => (
              <span
                key={tag}
                className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Image */}
        {recipe.image_url && (
          <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
        )}

        {/* Nutrition */}
        {nutrition && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Nutrition per serving</h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              {(
                [
                  { label: "Calories", value: nutrition.calories, unit: "kcal" },
                  { label: "Protein",  value: nutrition.protein,  unit: "g" },
                  { label: "Carbs",    value: nutrition.carbs,    unit: "g" },
                  { label: "Fat",      value: nutrition.fat,      unit: "g" },
                ] as { label: string; value: number; unit: string }[]
              ).map(({ label, value, unit }) => (
                <div key={label} className="bg-gray-50 rounded-xl py-3 px-2">
                  <p className="text-lg font-bold text-gray-900">
                    {Math.round(value)}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">
                      {unit}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">
              Ingredients
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({ingredients.length})
              </span>
            </h2>
            <ul className="space-y-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pantry-gold shrink-0" />
                  {ing.original || [ing.amount, ing.unit, ing.name].filter(Boolean).join(" ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preparation */}
        {steps.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Preparation</h2>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-pantry-coral text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* External source link (Spoonacular recipes) */}
        {recipe.source_url && (
          <div className="text-center">
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ucd-blue hover:underline"
            >
              View original recipe ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
