// ─── Database Types ────────────────────────────────────────────────────────────

export type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "halal"
  | "kosher";

export type MealType = "breakfast" | "lunch" | "dinner" | "unknown";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  dietary_tags: DietaryTag[];
  date_available: string | null; // ISO date string; null = available now
  created_at: string;
}

export interface Shipment {
  id: string;
  item_name: string;
  category: string;
  expected_quantity: number;
  unit: string;
  expected_date: string; // ISO date string
  notes: string | null;
  created_at: string;
}

export type InteractionType = "view" | "like";

export interface RecipeInteraction {
  id: string;
  recipe_id: number; // Spoonacular recipe ID
  recipe_title: string;
  recipe_image_url: string | null;
  interaction_type: InteractionType;
  created_at: string;
}

// ─── Cache Types ──────────────────────────────────────────────────────────────

export interface CachedIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CachedRecipe {
  spoonacular_id: number;
  title: string;
  image_url: string | null;
  ingredient_names: string[];
  ingredients: CachedIngredient[];
  instructions: string | null;
  nutrition: RecipeNutrition | null;
  dietary_tags: string[];
  cuisines: string[];
  ready_in_minutes: number | null;
  source_url: string | null;
  meal_type: MealType;
  created_at: string;
  last_fetched_at: string;
}

// ─── Spoonacular Types ─────────────────────────────────────────────────────────

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: SpoonacularIngredient[];
  usedIngredients: SpoonacularIngredient[];
  unusedIngredients: SpoonacularIngredient[];
  likes: number;
}

export interface SpoonacularIngredient {
  id: number;
  amount: number;
  unit: string;
  unitLong: string;
  unitShort: string;
  aisle: string;
  name: string;
  original: string;
  originalName: string;
  meta: string[];
  image: string;
}

export interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  instructions: string;
  diets: string[];
  cuisines: string[];
  dishTypes: string[];
  sourceUrl: string;
  extendedIngredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    original: string;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

// ─── App Types ─────────────────────────────────────────────────────────────────

export interface StudentPreferences {
  dietaryRestrictions: DietaryTag[];
  proteinGoal: number | null; // grams per day
  calorieGoal: number | null;
  carbGoal: number | null;
  fatGoal: number | null;
  cuisinePreferences: string[];
  mealsPerDay: number;
  dislikedIngredients: string[];
  maxBuyItems: number | null; // null = no limit; 0 = pantry only; 3 = a few; 8 = some
  swipesPerMeal: number; // how many recipe cards to show per meal type session (default 10)
  selectedMealTypes?: MealType[]; // for mealsPerDay < 3
}

// A recipe from Spoonacular, enriched with upcoming-ingredient info + cache data
export interface EnrichedRecipe extends SpoonacularRecipe {
  upcomingIngredients: Array<{
    name: string;
    availableDate: string; // ISO date
  }>;
  // From cache (when available)
  nutrition?: RecipeNutrition;
  cuisines?: string[];
  dietary_tags?: string[];
  ready_in_minutes?: number | null;
  source_url?: string | null;
  instructions?: string | null;
  meal_type?: MealType;
}

// Scored recipe for swipe mode
export interface ScoredRecipe extends EnrichedRecipe {
  score: number;
  buyCount: number; // how many non-pantry ingredients
}

// Aggregated recipe popularity for the Popular Recipes tab
export interface PopularRecipe {
  recipe_id: number;
  recipe_title: string;
  recipe_image_url: string | null;
  view_count: number;
  like_count: number;
  total_interactions: number;
}

// Meal plan types
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export interface MealSlot {
  day: Weekday;
  mealIndex: number;
  recipe: ScoredRecipe | null;
}

export interface GroceryItem {
  name: string;
  amount: number;
  unit: string;
  status: "in-stock" | "arriving-soon" | "need-to-buy";
  availableDate?: string; // for arriving-soon items
  mealTypes: MealType[]; // which meal types use this ingredient
}
