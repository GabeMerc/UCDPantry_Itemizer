"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { InventoryItem } from "@/lib/types";

type Tab = "manual" | "csv" | "import" | "fetch" | "library";

interface LibraryRecipe {
  spoonacular_id: number;
  title: string;
  image_url: string | null;
  meal_type: string;
  dietary_tags: string[];
  cuisines: string[];
  ready_in_minutes: number | null;
  last_fetched_at: string;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-amber-100 text-amber-800",
  lunch: "bg-green-100 text-green-800",
  dinner: "bg-blue-100 text-blue-800",
  unknown: "bg-gray-100 text-gray-600",
};

const DIETARY_TAG_OPTIONS = [
  "vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "halal", "kosher",
];

const MEAL_TYPE_OPTIONS = ["breakfast", "lunch", "dinner", "unknown"];

// Generate a local ID in the 8M range, far from Spoonacular IDs
function localId() {
  return 8000000 + Math.floor(Math.random() * 999999);
}

export default function RecipeManager({
  inventoryItems,
  initialTotal,
}: {
  inventoryItems: InventoryItem[];
  initialTotal: number;
}) {
  const [tab, setTab] = useState<Tab>("manual");

  const TABS: { key: Tab; label: string }[] = [
    { key: "manual", label: "Manual Entry" },
    { key: "csv", label: "Import CSV" },
    { key: "import", label: "Import Library" },
    { key: "fetch", label: "Fetch from Spoonacular" },
    { key: "library", label: "Manage Library" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipe Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            {initialTotal} recipes in database
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === key
                ? "border-ucd-blue text-ucd-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "manual"  && <ManualEntryTab />}
      {tab === "csv"     && <CsvImportTab />}
      {tab === "import"  && <ImportTab />}
      {tab === "fetch"   && <FetchTab inventoryItems={inventoryItems} />}
      {tab === "library" && <LibraryTab />}
    </div>
  );
}

// ── Manual Entry Tab ──────────────────────────────────────────────────────────

interface IngRow { name: string; amount: string; unit: string }

interface ManualForm {
  title: string;
  mealType: string;
  dietaryTags: string[];
  ingredients: IngRow[];
  instructions: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  readyInMinutes: string;
  imageUrl: string;
}

const DEFAULT_FORM: ManualForm = {
  title: "",
  mealType: "unknown",
  dietaryTags: [],
  ingredients: [{ name: "", amount: "1", unit: "" }],
  instructions: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  readyInMinutes: "",
  imageUrl: "",
};

function ManualEntryTab() {
  const [form, setForm] = useState<ManualForm>(DEFAULT_FORM);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  function setField<K extends keyof ManualForm>(k: K, v: ManualForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus("idle");
  }

  function updateIng(i: number, field: keyof IngRow, val: string) {
    setForm((f) => {
      const rows = [...f.ingredients];
      rows[i] = { ...rows[i], [field]: val };
      return { ...f, ingredients: rows };
    });
  }

  function addIngRow() {
    setForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, { name: "", amount: "1", unit: "" }],
    }));
  }

  function removeIngRow(i: number) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, idx) => idx !== i),
    }));
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      dietaryTags: f.dietaryTags.includes(tag)
        ? f.dietaryTags.filter((t) => t !== tag)
        : [...f.dietaryTags, tag],
    }));
  }

  async function handleSubmit() {
    const validIngs = form.ingredients.filter((i) => i.name.trim());
    if (!form.title.trim() || validIngs.length === 0) {
      setStatus("error");
      setMessage("Title and at least one ingredient are required.");
      return;
    }

    setStatus("saving");
    setMessage("");

    const ingredients = validIngs.map((i, idx) => ({
      id: idx + 1,
      name: i.name.trim().toLowerCase(),
      amount: parseFloat(i.amount) || 1,
      unit: i.unit.trim(),
      original: [i.amount, i.unit, i.name].filter(Boolean).join(" ").trim(),
    }));

    const hasNutrition = form.calories || form.protein || form.carbs || form.fat;
    const nutrition = hasNutrition
      ? {
          calories: parseFloat(form.calories) || 0,
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fat: parseFloat(form.fat) || 0,
        }
      : null;

    const recipe = {
      spoonacular_id: localId(),
      title: form.title.trim(),
      image_url: form.imageUrl.trim() || null,
      ingredient_names: ingredients.map((i) => i.name),
      ingredients,
      instructions: form.instructions.trim() || null,
      nutrition,
      dietary_tags: form.dietaryTags,
      cuisines: [],
      ready_in_minutes: form.readyInMinutes ? parseInt(form.readyInMinutes) : null,
      source_url: null,
      meal_type: form.mealType,
    };

    try {
      const res = await fetch("/api/admin/import-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes: [recipe] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setStatus("done");
      setMessage(`"${form.title.trim()}" added to library.`);
      setForm(DEFAULT_FORM);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Title + meta */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Recipe Details</h2>
        <div>
          <label className="label">Title <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="e.g. Black Bean Tacos"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Meal type</label>
            <select
              className="input"
              value={form.mealType}
              onChange={(e) => setField("mealType", e.target.value)}
            >
              {MEAL_TYPE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ready in (minutes)</label>
            <input
              type="number"
              min={1}
              className="input"
              placeholder="e.g. 30"
              value={form.readyInMinutes}
              onChange={(e) => setField("readyInMinutes", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label mb-2">Dietary tags</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.dietaryTags.includes(tag)
                    ? "bg-ucd-blue text-white border-ucd-blue"
                    : "bg-white text-gray-600 border-gray-300 hover:border-ucd-blue"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Image URL (optional)</label>
          <input
            className="input"
            placeholder="https://…"
            value={form.imageUrl}
            onChange={(e) => setField("imageUrl", e.target.value)}
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">
          Ingredients <span className="text-red-500">*</span>
        </h2>
        <div className="space-y-2">
          {form.ingredients.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="input w-16"
                placeholder="Qty"
                value={row.amount}
                onChange={(e) => updateIng(i, "amount", e.target.value)}
              />
              <input
                className="input w-20"
                placeholder="Unit"
                value={row.unit}
                onChange={(e) => updateIng(i, "unit", e.target.value)}
              />
              <input
                className="input flex-1"
                placeholder="Ingredient name"
                value={row.name}
                onChange={(e) => updateIng(i, "name", e.target.value)}
              />
              {form.ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngRow(i)}
                  className="text-red-400 hover:text-red-600 text-sm px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngRow}
          className="text-sm text-ucd-blue hover:underline"
        >
          + Add ingredient
        </button>
      </div>

      {/* Instructions */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Instructions</h2>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ucd-blue/30"
          rows={5}
          placeholder="Step-by-step preparation instructions…"
          value={form.instructions}
          onChange={(e) => setField("instructions", e.target.value)}
        />
      </div>

      {/* Nutrition */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">
          Nutrition{" "}
          <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
            <div key={field}>
              <label className="label capitalize">{field}</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder={field === "calories" ? "kcal" : "g"}
                value={form[field]}
                onChange={(e) => setField(field, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {status === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          ✗ {message}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={status === "saving"}
        className="btn-primary"
      >
        {status === "saving" ? "Saving…" : "Add Recipe to Library"}
      </button>
    </div>
  );
}

// ── CSV Import Tab ─────────────────────────────────────────────────────────────

interface CsvRow {
  title: string;
  ingredients: string[];     // full strings from col 2 (with sizes) → CachedIngredient[]
  ingredientNames: string[]; // clean names from col 5 → ingredient_names for GIN queries
  instructions: string;
  calories: number | null;
}

/**
 * RFC-4180 compliant CSV parser that handles:
 * - Quoted fields with embedded commas, newlines, and doubled-quote escapes
 * - \r\n and \n line endings
 * - Unicode content (fractions, degree symbols, etc.)
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';  // escaped double-quote
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;  // includes embedded newlines
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = "";
        i++;
      } else if (ch === '\r' || ch === '\n') {
        row.push(field);
        field = "";
        if (row.some((f) => f.trim())) rows.push(row);
        row = [];
        if (ch === '\r' && text[i + 1] === '\n') i += 2;
        else i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // flush last field / row
  if (field || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim())) rows.push(row);
  }

  return rows;
}

/**
 * Clean a single ingredient name from the Ingredients_No_Sizes column.
 * Strips common artifacts left by automated quantity/size removal.
 */
function cleanIngredientName(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^[:\s,]+/, "");          // ": everything cheese" → "everything cheese"
  s = s.split(" or ")[0].trim();          // "white or red onion" → "white onion" (keep before or)
  s = s.replace(/^a\s+of\s+/i, "");      // "a of sea salt" → "sea salt"
  s = s.replace(/^of\s+/i, "");          // "of sweet corn" → "sweet corn"
  s = s.replace(/,.*$/, "").trim();       // "ginger, finely" → "ginger"
  s = s.replace(/[;:\s]+$/, "");         // trailing punctuation
  return s;
}

function parseIngredientString(raw: string, idx: number) {
  const t = raw.trim();
  // "2 tbsp soy sauce" → amount, unit, name
  const m1 = t.match(/^(\d+\.?\d*)\s+([a-zA-Z]+)\s+(.+)$/);
  if (m1) return { id: idx + 1, amount: parseFloat(m1[1]), unit: m1[2], name: m1[3].trim().toLowerCase(), original: t };
  // "200g chicken breast" → amount, unit, name
  const m2 = t.match(/^(\d+\.?\d*)([a-zA-Z]+)\s+(.+)$/);
  if (m2) return { id: idx + 1, amount: parseFloat(m2[1]), unit: m2[2], name: m2[3].trim().toLowerCase(), original: t };
  // "2 chicken breasts" → amount, name
  const m3 = t.match(/^(\d+\.?\d*)\s+(.+)$/);
  if (m3) return { id: idx + 1, amount: parseFloat(m3[1]), unit: "", name: m3[2].trim().toLowerCase(), original: t };
  // Just a name
  return { id: idx + 1, amount: 1, unit: "", name: t.toLowerCase(), original: t };
}

function CsvImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [skipHeader, setSkipHeader] = useState(true);
  const [parsed, setParsed] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setParsed([]);
    setStatus("idle");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const allRows = parseCSV(text);
        const dataRows = skipHeader ? allRows.slice(1) : allRows;

        const rows: CsvRow[] = dataRows.map((cols) => {
          // col 0: Recipe (may have trailing space in header, trim values)
          const title = (cols[0] ?? "").trim();
          // col 1: Ingredients (full, with sizes) — semicolon-delimited
          const ingFull = (cols[1] ?? "").trim();
          // col 2: Preparation / instructions
          const instructions = (cols[2] ?? "").trim();
          // col 3: Calories (may be empty or contain non-numeric chars)
          const calStr = (cols[3] ?? "").trim().replace(/[^\d.]/g, "");
          // col 4: Ingredients_No_Sizes — clean names for GIN index queries
          const ingClean = (cols[4] ?? "").trim();

          const ingredients = ingFull
            ? ingFull.split(";").map((s) => s.trim()).filter(Boolean)
            : [];

          // Use Ingredients_No_Sizes (col 5) for clean GIN-queryable names,
          // then normalize each name to remove leftover artifacts
          const ingredientNames = ingClean
            ? ingClean.split(";").map(cleanIngredientName).filter(Boolean)
            : ingredients.map((s) => {
                // best-effort fallback: strip leading quantity/unit from col 2
                return s.replace(/^[\d\s½⅓¼¾⅔]+([a-zA-Z]+\s+)?/, "").trim().toLowerCase();
              });

          return {
            title,
            ingredients,
            ingredientNames,
            instructions,
            calories: calStr ? parseFloat(calStr) : null,
          };
        }).filter((r) => r.title);

        if (rows.length === 0) {
          setParseError("No valid rows found. Check the file format.");
        } else {
          setParsed(rows);
        }
      } catch {
        setParseError("Failed to parse file. Make sure it is a valid CSV.");
      }
    };
    reader.readAsText(file);
  }

  // Re-parse when skipHeader changes (if a file is already loaded)
  function handleSkipToggle(val: boolean) {
    setSkipHeader(val);
    setParsed([]);
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setStatus("importing");
    setMessage("");

    const baseId = localId();
    const recipes = parsed.map((row, i) => {
      const ingredients = row.ingredients.map((s, idx) => parseIngredientString(s, idx));
      return {
        spoonacular_id: baseId + i,
        title: row.title,
        image_url: null,
        // Use the clean Ingredients_No_Sizes names for GIN overlap queries;
        // fall back to names parsed from the full ingredient strings
        ingredient_names: row.ingredientNames.length > 0
          ? row.ingredientNames
          : ingredients.map((g) => g.name),
        ingredients,
        instructions: row.instructions || null,
        nutrition: row.calories !== null
          ? { calories: row.calories, protein: 0, carbs: 0, fat: 0 }
          : null,
        dietary_tags: [],
        cuisines: [],
        ready_in_minutes: null,
        source_url: null,
        meal_type: "unknown",
      };
    });

    try {
      const res = await fetch("/api/admin/import-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setStatus("done");
      setMessage(json.message);
      setParsed([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Import from CSV</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-700">Expected column order:</p>
          <p><span className="font-mono bg-white border border-gray-200 px-1 rounded">A</span> Recipe name</p>
          <p><span className="font-mono bg-white border border-gray-200 px-1 rounded">B</span> Ingredients (separated by <code>;</code> semicolons)</p>
          <p><span className="font-mono bg-white border border-gray-200 px-1 rounded">C</span> Preparation / instructions</p>
          <p><span className="font-mono bg-white border border-gray-200 px-1 rounded">D</span> Calories</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={skipHeader}
            onChange={(e) => handleSkipToggle(e.target.checked)}
            className="rounded border-gray-300 text-ucd-blue"
          />
          Skip first row (header row)
        </label>

        <div>
          <label className="label">Select CSV file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-ucd-blue file:text-white hover:file:bg-ucd-blue/90"
          />
        </div>

        {parseError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{parseError}</p>
        )}
      </div>

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Preview — {parsed.length} recipe{parsed.length !== 1 ? "s" : ""} from{" "}
              <span className="font-mono text-xs text-gray-500">{fileName}</span>
            </h2>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {parsed.slice(0, 50).map((row, i) => (
              <div key={i} className="px-4 py-2.5 text-sm">
                <p className="font-medium text-gray-900 truncate">{row.title}</p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">
                  {row.ingredientNames.slice(0, 5).join(" · ")}
                  {row.ingredientNames.length > 5 && ` +${row.ingredientNames.length - 5} more`}
                  {row.calories !== null && ` · ${row.calories} cal`}
                </p>
              </div>
            ))}
            {parsed.length > 50 && (
              <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50">
                …and {parsed.length - 50} more
              </div>
            )}
          </div>

          {status === "done" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm font-medium">
              ✓ {message}
            </div>
          )}
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
              ✗ {message}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={status === "importing"}
            className="btn-primary"
          >
            {status === "importing"
              ? "Importing…"
              : `Import ${parsed.length} recipe${parsed.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Import Tab ────────────────────────────────────────────────────────────────

function ImportTab() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [importMode, setImportMode] = useState<"starter" | "custom">("starter");

  async function handleImport(useStarter: boolean) {
    setStatus("loading");
    setMessage("");

    try {
      const body = useStarter
        ? {}
        : { recipes: JSON.parse(jsonText) };

      const res = await fetch("/api/admin/import-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setStatus("done");
      setMessage(json.message);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📦</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 text-lg">
              Starter Recipe Library
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Load 20 curated recipes built around the UC Davis pantry inventory.
              Includes breakfast, lunch, and dinner options using pantry staples.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["5 breakfast", "7 lunch", "8 dinner"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-ucd-blue/10 text-ucd-blue px-2 py-0.5 rounded font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => { setImportMode("starter"); handleImport(true); }}
          disabled={status === "loading"}
          className="btn-primary"
        >
          {status === "loading" && importMode === "starter"
            ? "Importing…"
            : "Import Starter Library (20 recipes)"}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📋</div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">
              Import Custom JSON
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Paste a JSON array of recipes following the recipe schema.
              Each recipe must have a unique{" "}
              <code className="bg-gray-100 px-1 rounded">spoonacular_id</code>.
            </p>
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='[{"spoonacular_id": 2001, "title": "My Recipe", "meal_type": "dinner", ...}]'
          rows={8}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ucd-blue/30"
        />

        <button
          onClick={() => { setImportMode("custom"); handleImport(false); }}
          disabled={status === "loading" || !jsonText.trim()}
          className="btn-primary"
        >
          {status === "loading" && importMode === "custom"
            ? "Importing…"
            : "Import Custom Recipes"}
        </button>
      </div>

      {status === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          ✗ {message}
        </div>
      )}
    </div>
  );
}

// ── Fetch Tab ─────────────────────────────────────────────────────────────────

function FetchTab({ inventoryItems }: { inventoryItems: InventoryItem[] }) {
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    () => new Set(inventoryItems.slice(0, 30).map((i) => i.name.toLowerCase()))
  );
  const [count, setCount] = useState(24);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const filteredItems = inventoryItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleIngredient(name: string) {
    const next = new Set(selectedIngredients);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedIngredients(next);
  }

  function selectAll() {
    setSelectedIngredients(new Set(inventoryItems.map((i) => i.name.toLowerCase())));
  }

  function clearAll() {
    setSelectedIngredients(new Set());
  }

  async function handleFetch() {
    if (selectedIngredients.size === 0) return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/admin/fetch-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: [...selectedIngredients], count }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fetch failed");
      setStatus("done");
      setMessage(json.message);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>API Quota:</strong> Spoonacular free tier allows 150 requests/day.
          Each fetch uses 2 requests (search + details).
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Select Ingredients ({selectedIngredients.size} selected)
          </h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-ucd-blue hover:underline">
              Select all
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-xs text-gray-500 hover:underline">
              Clear
            </button>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ucd-blue/30"
        />

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {filteredItems.map((item) => {
            const key = item.name.toLowerCase();
            const checked = selectedIngredients.has(key);
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleIngredient(key)}
                  className="rounded border-gray-300 text-ucd-blue"
                />
                <span className="text-sm text-gray-800">{item.name}</span>
                <span className="ml-auto text-xs text-gray-400">{item.category}</span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Recipes to fetch:</label>
          <select
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ucd-blue/30"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={50}>50</option>
          </select>
        </div>

        <button
          onClick={handleFetch}
          disabled={status === "loading" || selectedIngredients.size === 0}
          className="btn-primary"
        >
          {status === "loading" ? "Fetching from Spoonacular…" : "Fetch Recipes"}
        </button>
      </div>

      {status === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm font-medium">
          ✓ {message}
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          ✗ {message}
        </div>
      )}
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────

function LibraryTab() {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [missingImages, setMissingImages] = useState<number | null>(null);
  const [fillingImages, setFillingImages] = useState(false);
  const [imageMsg, setImageMsg] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/recipes?page=${p}`);
      const json = await res.json();
      setRecipes(json.recipes ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMissingCount = useCallback(() => {
    fetch("/api/admin/fetch-recipe-images")
      .then((r) => r.json())
      .then((d) => setMissingImages(d.missing ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPage(0);
    refreshMissingCount();
  }, [fetchPage, refreshMissingCount]);

  async function handleDelete(id: number) {
    if (!confirm("Remove this recipe from the library?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/recipes?id=${id}`, { method: "DELETE" });
      setRecipes((prev) => prev.filter((r) => r.spoonacular_id !== id));
      setTotal((prev) => prev - 1);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFillImages(limit: number) {
    setFillingImages(true);
    setImageMsg(null);
    try {
      const res = await fetch("/api/admin/fetch-recipe-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageMsg(data.error ?? "Failed to fetch images.");
      } else {
        setMissingImages(data.remaining ?? 0);
        setImageMsg(data.message);
        // Refresh the list so newly-added images are visible
        fetchPage(page);
      }
    } finally {
      setFillingImages(false);
    }
  }

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Missing images banner */}
      {missingImages !== null && missingImages > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {missingImages} recipe{missingImages !== 1 ? "s" : ""} missing images
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Uses Pexels API · 200 free requests/hour
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleFillImages(1)}
                disabled={fillingImages}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                {fillingImages ? "Fetching…" : "Fill 1"}
              </button>
              <button
                onClick={() => handleFillImages(-1)}
                disabled={fillingImages}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {fillingImages ? "Fetching…" : `Fill All (${missingImages})`}
              </button>
            </div>
          </div>
          {imageMsg && (
            <p className="text-xs text-amber-700 mt-2 border-t border-amber-200 pt-2">
              {imageMsg}
            </p>
          )}
        </div>
      )}
      {missingImages === 0 && (
        <p className="text-xs text-pantry-green font-medium">✓ All recipes have images</p>
      )}

      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search library…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ucd-blue/30"
        />
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {total} recipes total
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {total === 0
            ? "No recipes in the library yet. Use Import or Fetch to add some."
            : "No recipes match your search."}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {filtered.map((r) => (
            <div
              key={r.spoonacular_id}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-pantry-sand/60 shrink-0 flex items-center justify-center">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-pantry-neutral/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      MEAL_TYPE_COLORS[r.meal_type] ?? MEAL_TYPE_COLORS.unknown
                    }`}
                  >
                    {r.meal_type}
                  </span>
                  {r.cuisines?.slice(0, 2).map((c) => (
                    <span key={c} className="text-xs text-gray-400">{c}</span>
                  ))}
                  {r.ready_in_minutes && (
                    <span className="text-xs text-gray-400">{r.ready_in_minutes} min</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 hidden sm:block">
                ID: {r.spoonacular_id}
              </span>
              <button
                onClick={() => handleDelete(r.spoonacular_id)}
                disabled={deletingId === r.spoonacular_id}
                className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0"
              >
                {deletingId === r.spoonacular_id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchPage(page - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => fetchPage(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
