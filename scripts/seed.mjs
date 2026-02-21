/**
 * UC Davis Pantry — Seed Script
 * Run with: node scripts/seed.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Load .env.local manually (no dotenv needed) ──────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envFile = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
    .filter(([k]) => k)
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON_KEY = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const apiKey = SERVICE_ROLE_KEY || ANON_KEY;
if (!apiKey) {
  console.error("❌  No Supabase key found in .env.local");
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.log("⚠️   SUPABASE_SERVICE_ROLE_KEY not found, using anon key (needs RLS permissions)");
}

const supabase = createClient(SUPABASE_URL, apiKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Dates ─────────────────────────────────────────────────────────────────────
const today = new Date();
const inDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

// ─── 1. Inventory seed data ────────────────────────────────────────────────────
const inventory = [
  // Produce
  { name: "Bananas", category: "Produce", quantity: 30, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Apples", category: "Produce", quantity: 25, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Oranges", category: "Produce", quantity: 20, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Baby Carrots", category: "Produce", quantity: 15, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Spinach", category: "Produce", quantity: 10, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Sweet Potatoes", category: "Produce", quantity: 18, unit: "lbs", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Yellow Onions", category: "Produce", quantity: 20, unit: "lbs", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Garlic", category: "Produce", quantity: 12, unit: "head", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },

  // Proteins
  { name: "Canned Black Beans", category: "Proteins", quantity: 40, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Canned Chickpeas", category: "Proteins", quantity: 35, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Canned Kidney Beans", category: "Proteins", quantity: 28, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Peanut Butter", category: "Proteins", quantity: 20, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Canned Tuna", category: "Proteins", quantity: 30, unit: "can", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Canned Salmon", category: "Proteins", quantity: 18, unit: "can", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Eggs", category: "Proteins", quantity: 20, unit: "dozen", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Red Lentils", category: "Proteins", quantity: 15, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },

  // Grains
  { name: "White Rice", category: "Grains", quantity: 20, unit: "5 lb bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Brown Rice", category: "Grains", quantity: 15, unit: "5 lb bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Spaghetti", category: "Grains", quantity: 25, unit: "box", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Penne Pasta", category: "Grains", quantity: 20, unit: "box", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Rolled Oats", category: "Grains", quantity: 18, unit: "container", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Whole Wheat Bread", category: "Grains", quantity: 12, unit: "loaf", dietary_tags: ["vegetarian", "dairy-free"], date_available: null },
  { name: "Flour Tortillas", category: "Grains", quantity: 15, unit: "pack", dietary_tags: ["vegetarian", "dairy-free"], date_available: null },

  // Dairy & Alternatives
  { name: "Oat Milk", category: "Dairy & Alternatives", quantity: 20, unit: "carton", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Almond Milk", category: "Dairy & Alternatives", quantity: 15, unit: "carton", dietary_tags: ["vegan", "vegetarian", "dairy-free", "gluten-free"], date_available: null },
  { name: "Cheddar Cheese", category: "Dairy & Alternatives", quantity: 10, unit: "block", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Greek Yogurt", category: "Dairy & Alternatives", quantity: 25, unit: "cup", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },

  // Canned & Pantry
  { name: "Canned Diced Tomatoes", category: "Pantry", quantity: 30, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Tomato Sauce", category: "Pantry", quantity: 22, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Chicken Broth", category: "Pantry", quantity: 20, unit: "carton", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Vegetable Broth", category: "Pantry", quantity: 18, unit: "carton", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Olive Oil", category: "Pantry", quantity: 10, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Soy Sauce", category: "Pantry", quantity: 14, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },

  // Snacks
  { name: "Granola Bars", category: "Snacks", quantity: 40, unit: "bar", dietary_tags: ["vegetarian", "dairy-free"], date_available: null },
  { name: "Trail Mix", category: "Snacks", quantity: 20, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Saltine Crackers", category: "Snacks", quantity: 15, unit: "box", dietary_tags: ["vegetarian", "dairy-free"], date_available: null },
  { name: "Applesauce Cups", category: "Snacks", quantity: 30, unit: "cup", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },

  // ── Fresh Proteins ──
  { name: "Chicken Breast", category: "Proteins", quantity: 30, unit: "lbs", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Ground Beef", category: "Proteins", quantity: 25, unit: "lbs", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Ground Turkey", category: "Proteins", quantity: 18, unit: "lbs", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Bacon", category: "Proteins", quantity: 12, unit: "pack", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Tofu", category: "Proteins", quantity: 20, unit: "block", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Shrimp", category: "Proteins", quantity: 15, unit: "bag", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },

  // ── More Produce ──
  { name: "Bell Peppers", category: "Produce", quantity: 20, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Tomatoes", category: "Produce", quantity: 25, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Romaine Lettuce", category: "Produce", quantity: 12, unit: "head", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Cucumbers", category: "Produce", quantity: 15, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Zucchini", category: "Produce", quantity: 14, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Mushrooms", category: "Produce", quantity: 12, unit: "pack", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Green Beans", category: "Produce", quantity: 10, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Potatoes", category: "Produce", quantity: 20, unit: "lbs", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Lemons", category: "Produce", quantity: 18, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Limes", category: "Produce", quantity: 15, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Fresh Ginger", category: "Produce", quantity: 8, unit: "piece", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Cilantro", category: "Produce", quantity: 10, unit: "bunch", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Jalapeños", category: "Produce", quantity: 12, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Celery", category: "Produce", quantity: 10, unit: "bunch", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Corn on the Cob", category: "Produce", quantity: 15, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Avocados", category: "Produce", quantity: 15, unit: "each", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Cabbage", category: "Produce", quantity: 8, unit: "head", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Kale", category: "Produce", quantity: 8, unit: "bunch", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Green Onions", category: "Produce", quantity: 10, unit: "bunch", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },

  // ── More Grains ──
  { name: "Elbow Macaroni", category: "Grains", quantity: 18, unit: "box", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Ramen Noodles", category: "Grains", quantity: 30, unit: "pack", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Quinoa", category: "Grains", quantity: 12, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Couscous", category: "Grains", quantity: 10, unit: "box", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Breadcrumbs", category: "Grains", quantity: 8, unit: "container", dietary_tags: ["vegetarian", "dairy-free"], date_available: null },

  // ── More Dairy ──
  { name: "Butter", category: "Dairy & Alternatives", quantity: 15, unit: "stick", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Parmesan Cheese", category: "Dairy & Alternatives", quantity: 10, unit: "block", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Mozzarella Cheese", category: "Dairy & Alternatives", quantity: 12, unit: "bag", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Sour Cream", category: "Dairy & Alternatives", quantity: 10, unit: "tub", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Heavy Cream", category: "Dairy & Alternatives", quantity: 8, unit: "pint", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Cream Cheese", category: "Dairy & Alternatives", quantity: 10, unit: "block", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },
  { name: "Whole Milk", category: "Dairy & Alternatives", quantity: 15, unit: "gallon", dietary_tags: ["vegetarian", "gluten-free"], date_available: null },

  // ── Pantry Staples & Spices ──
  { name: "All-Purpose Flour", category: "Pantry", quantity: 12, unit: "bag", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: null },
  { name: "Granulated Sugar", category: "Pantry", quantity: 10, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Brown Sugar", category: "Pantry", quantity: 8, unit: "bag", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Salt", category: "Pantry", quantity: 15, unit: "container", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Black Pepper", category: "Pantry", quantity: 12, unit: "container", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Cumin", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Paprika", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Chili Powder", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Dried Oregano", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Dried Basil", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Cinnamon", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Garlic Powder", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Onion Powder", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Red Pepper Flakes", category: "Pantry", quantity: 6, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Baking Powder", category: "Pantry", quantity: 8, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Baking Soda", category: "Pantry", quantity: 8, unit: "box", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Vanilla Extract", category: "Pantry", quantity: 6, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Apple Cider Vinegar", category: "Pantry", quantity: 8, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "White Vinegar", category: "Pantry", quantity: 8, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Honey", category: "Pantry", quantity: 8, unit: "bottle", dietary_tags: ["vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Maple Syrup", category: "Pantry", quantity: 6, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Ketchup", category: "Pantry", quantity: 10, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Yellow Mustard", category: "Pantry", quantity: 8, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Mayonnaise", category: "Pantry", quantity: 8, unit: "jar", dietary_tags: ["vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Hot Sauce", category: "Pantry", quantity: 10, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Coconut Milk", category: "Pantry", quantity: 15, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Sesame Oil", category: "Pantry", quantity: 6, unit: "bottle", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Cornstarch", category: "Pantry", quantity: 8, unit: "box", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Worcestershire Sauce", category: "Pantry", quantity: 6, unit: "bottle", dietary_tags: ["gluten-free", "dairy-free"], date_available: null },
  { name: "Salsa", category: "Pantry", quantity: 12, unit: "jar", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },
  { name: "Canned Tomato Paste", category: "Pantry", quantity: 15, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: null },

  // Arriving soon (future date_available)
  { name: "Fresh Strawberries", category: "Produce", quantity: 24, unit: "pint", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: inDays(7) },
  { name: "Canned Corn", category: "Pantry", quantity: 36, unit: "can", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: inDays(5) },
  { name: "Whole Grain Cereal", category: "Grains", quantity: 20, unit: "box", dietary_tags: ["vegan", "vegetarian", "dairy-free"], date_available: inDays(10) },
  { name: "Broccoli", category: "Produce", quantity: 16, unit: "head", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: inDays(3) },
  { name: "Steak", category: "Proteins", quantity: 15, unit: "lbs", dietary_tags: ["gluten-free", "dairy-free"], date_available: inDays(4) },
  { name: "Salmon Fillet", category: "Proteins", quantity: 12, unit: "lbs", dietary_tags: ["gluten-free", "dairy-free"], date_available: inDays(5) },
  { name: "Asparagus", category: "Produce", quantity: 10, unit: "bunch", dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"], date_available: inDays(6) },
];

// ─── 2. Recipe interactions seed data ─────────────────────────────────────────
// Using real Spoonacular recipe IDs
const recipeInteractions = [
  // Pasta e Fagioli - very popular
  { recipe_id: 716429, recipe_title: "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs", recipe_image_url: "https://img.spoonacular.com/recipes/716429-312x231.jpg", interaction_type: "view" },
  { recipe_id: 716429, recipe_title: "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs", recipe_image_url: "https://img.spoonacular.com/recipes/716429-312x231.jpg", interaction_type: "view" },
  { recipe_id: 716429, recipe_title: "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs", recipe_image_url: "https://img.spoonacular.com/recipes/716429-312x231.jpg", interaction_type: "like" },
  { recipe_id: 716429, recipe_title: "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs", recipe_image_url: "https://img.spoonacular.com/recipes/716429-312x231.jpg", interaction_type: "like" },
  { recipe_id: 716429, recipe_title: "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs", recipe_image_url: "https://img.spoonacular.com/recipes/716429-312x231.jpg", interaction_type: "view" },

  // Black Bean Tacos
  { recipe_id: 782585, recipe_title: "Cannellini Bean and Asparagus Salad with Mushrooms", recipe_image_url: "https://img.spoonacular.com/recipes/782585-312x231.jpg", interaction_type: "view" },
  { recipe_id: 782585, recipe_title: "Cannellini Bean and Asparagus Salad with Mushrooms", recipe_image_url: "https://img.spoonacular.com/recipes/782585-312x231.jpg", interaction_type: "view" },
  { recipe_id: 782585, recipe_title: "Cannellini Bean and Asparagus Salad with Mushrooms", recipe_image_url: "https://img.spoonacular.com/recipes/782585-312x231.jpg", interaction_type: "like" },

  // Oatmeal
  { recipe_id: 642583, recipe_title: "Farfalle with Peas, Ham and Cream Sauce", recipe_image_url: "https://img.spoonacular.com/recipes/642583-312x231.jpg", interaction_type: "view" },
  { recipe_id: 642583, recipe_title: "Farfalle with Peas, Ham and Cream Sauce", recipe_image_url: "https://img.spoonacular.com/recipes/642583-312x231.jpg", interaction_type: "view" },
  { recipe_id: 642583, recipe_title: "Farfalle with Peas, Ham and Cream Sauce", recipe_image_url: "https://img.spoonacular.com/recipes/642583-312x231.jpg", interaction_type: "view" },
  { recipe_id: 642583, recipe_title: "Farfalle with Peas, Ham and Cream Sauce", recipe_image_url: "https://img.spoonacular.com/recipes/642583-312x231.jpg", interaction_type: "like" },

  // Rice and Beans
  { recipe_id: 511728, recipe_title: "Pasta Margherita", recipe_image_url: "https://img.spoonacular.com/recipes/511728-312x231.jpg", interaction_type: "view" },
  { recipe_id: 511728, recipe_title: "Pasta Margherita", recipe_image_url: "https://img.spoonacular.com/recipes/511728-312x231.jpg", interaction_type: "like" },

  // Greek Pasta Salad
  { recipe_id: 716408, recipe_title: "Greek Pasta Salad", recipe_image_url: "https://img.spoonacular.com/recipes/716408-312x231.jpg", interaction_type: "view" },
  { recipe_id: 716408, recipe_title: "Greek Pasta Salad", recipe_image_url: "https://img.spoonacular.com/recipes/716408-312x231.jpg", interaction_type: "view" },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting seed...\n");

  // 1. Clear existing seed data (optional — comment out if you want to keep existing rows)
  console.log("🗑️  Clearing existing inventory and interactions...");
  await supabase.from("recipe_interactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("inventory").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 2. Seed inventory
  console.log(`📦 Inserting ${inventory.length} inventory items...`);
  const { data: invData, error: invError } = await supabase
    .from("inventory")
    .insert(inventory)
    .select();

  if (invError) {
    console.error("❌  Inventory insert failed:", invError.message);
    process.exit(1);
  }
  console.log(`✅  Inserted ${invData.length} inventory rows`);

  // 3. Seed recipe interactions
  console.log(`\n📊 Inserting ${recipeInteractions.length} recipe interactions...`);
  const { data: recData, error: recError } = await supabase
    .from("recipe_interactions")
    .insert(recipeInteractions)
    .select();

  if (recError) {
    console.error("❌  Recipe interactions insert failed:", recError.message);
    process.exit(1);
  }
  console.log(`✅  Inserted ${recData.length} recipe interaction rows`);

  // 4. Create / confirm admin user
  const adminEmail = "gabmercado299@gmail.com";
  const adminPassword = "HelloWorld21!";

  console.log(`\n👤 Checking admin user: ${adminEmail}`);
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("❌  Could not list users:", listError.message);
    process.exit(1);
  }

  const existingUser = listData.users.find((u) => u.email === adminEmail);

  if (existingUser) {
    console.log(`✅  Admin user already exists (id: ${existingUser.id})`);
    // Update password to ensure it matches
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: adminPassword, email_confirm: true }
    );
    if (updateError) {
      console.error("⚠️   Could not update password:", updateError.message);
    } else {
      console.log("✅  Password confirmed/updated");
    }
  } else {
    console.log("   User not found — creating...");
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // bypass email confirmation
    });

    if (createError) {
      console.error("❌  Could not create admin user:", createError.message);
      process.exit(1);
    }
    console.log(`✅  Created admin user (id: ${newUser.user.id})`);
  }

  // 5. Summary
  const inStock = inventory.filter((i) => !i.date_available).length;
  const arriving = inventory.filter((i) => i.date_available).length;
  const views = recipeInteractions.filter((r) => r.interaction_type === "view").length;
  const likes = recipeInteractions.filter((r) => r.interaction_type === "like").length;

  console.log("\n─────────────────────────────────────────");
  console.log("🎉 Seed complete!\n");
  console.log(`  Inventory rows:      ${invData.length}`);
  console.log(`    • In stock:        ${inStock}`);
  console.log(`    • Arriving soon:   ${arriving}`);
  console.log(`  Recipe interactions: ${recData.length}`);
  console.log(`    • Views:           ${views}`);
  console.log(`    • Likes:           ${likes}`);
  console.log(`  Admin user:          ${adminEmail}`);
  console.log("─────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
