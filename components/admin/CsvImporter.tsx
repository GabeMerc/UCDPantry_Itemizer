"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DietaryTag } from "@/lib/types";

// The fields we need to import into inventory
const INVENTORY_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "category", label: "Category", required: false },
  { key: "quantity", label: "Quantity", required: true },
  { key: "unit", label: "Unit", required: false },
  { key: "dietary_tags", label: "Dietary Tags", required: false },
  { key: "date_available", label: "Available Date", required: false },
] as const;

type FieldKey = (typeof INVENTORY_FIELDS)[number]["key"];

type ParsedRow = Record<string, string>;

type ColumnMapping = Record<FieldKey, string>; // field key -> csv column name

type Step = "upload" | "map" | "preview" | "done";

const DIETARY_TAG_LIST: DietaryTag[] = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "halal",
  "kosher",
];

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function guessMappings(headers: string[]): Partial<ColumnMapping> {
  const guess: Partial<ColumnMapping> = {};
  const normalized = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));

  const patterns: Record<FieldKey, RegExp[]> = {
    name: [/name/, /item/, /product/, /food/],
    category: [/category/, /type/, /group/, /section/],
    quantity: [/quantity/, /qty/, /amount/, /count/, /stock/],
    unit: [/unit/, /measure/, /uom/],
    dietary_tags: [/diet/, /tag/, /restriction/, /flag/],
    date_available: [/date/, /available/, /arrival/, /expected/],
  };

  for (const [field, regexes] of Object.entries(patterns) as [
    FieldKey,
    RegExp[],
  ][]) {
    for (let i = 0; i < normalized.length; i++) {
      if (regexes.some((r) => r.test(normalized[i]))) {
        guess[field] = headers[i];
        break;
      }
    }
  }

  return guess;
}

function parseTagsFromString(value: string): DietaryTag[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/[,;|/]/)
    .map((t) => t.trim())
    .filter((t): t is DietaryTag => DIETARY_TAG_LIST.includes(t as DietaryTag));
}

export default function CsvImporter() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    errors: string[];
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsv(text);

      if (headers.length === 0) {
        setFileError("Could not parse CSV. Make sure it has a header row.");
        return;
      }

      setHeaders(headers);
      setRows(rows);
      setMapping(guessMappings(headers));
      setStep("map");
    };
    reader.readAsText(file);
  }

  function setField(field: FieldKey, column: string) {
    setMapping((m) => ({ ...m, [field]: column || undefined }));
  }

  // Build preview rows from mapping
  const previewRows = rows.slice(0, 5).map((row) => ({
    name: row[mapping.name ?? ""] ?? "",
    category: row[mapping.category ?? ""] ?? "General",
    quantity: parseFloat(row[mapping.quantity ?? ""] ?? "0") || 0,
    unit: row[mapping.unit ?? ""] ?? "item",
    dietary_tags: parseTagsFromString(row[mapping.dietary_tags ?? ""] ?? ""),
    date_available: row[mapping.date_available ?? ""]?.trim() || null,
  }));

  async function handleImport() {
    if (!mapping.name || !mapping.quantity) return;
    setImporting(true);

    const records = rows.map((row) => ({
      name: row[mapping.name!]?.trim() ?? "",
      category: row[mapping.category ?? ""]?.trim() || "General",
      quantity: parseFloat(row[mapping.quantity!] ?? "0") || 0,
      unit: row[mapping.unit ?? ""]?.trim() || "item",
      dietary_tags: parseTagsFromString(row[mapping.dietary_tags ?? ""] ?? ""),
      date_available: row[mapping.date_available ?? ""]?.trim() || null,
    }));

    const valid = records.filter((r) => r.name);
    const errors: string[] = [];

    // Insert in batches of 100
    let inserted = 0;
    for (let i = 0; i < valid.length; i += 100) {
      const batch = valid.slice(i, i + 100);
      const { error } = await supabase.from("inventory").insert(batch);
      if (error) {
        errors.push(`Rows ${i + 1}–${i + batch.length}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    setImporting(false);
    setImportResult({ inserted, errors });
    setStep("done");
  }

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">→</span>}
            <span
              className={`font-medium ${step === s ? "text-ucd-blue" : "text-gray-400"}`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </span>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="card p-8 border-dashed border-2 border-gray-300 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <span className="text-4xl">📄</span>
            <span className="text-gray-700 font-medium">
              Click to upload a CSV file
            </span>
            <span className="text-xs text-gray-400">
              Any column names are fine — you will map them in the next step
            </span>
          </label>
          {fileError && (
            <p className="mt-4 text-sm text-red-600">{fileError}</p>
          )}
        </div>
      )}

      {/* Step: Map columns */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              Map your columns
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({rows.length} rows detected)
              </span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              We auto-guessed some mappings. Adjust anything that looks wrong.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INVENTORY_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <select
                    className="input"
                    value={mapping[field.key] ?? ""}
                    onChange={(e) => setField(field.key, e.target.value)}
                  >
                    <option value="">— skip this field —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {field.key === "dietary_tags" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Expects comma-separated tags, e.g.: vegan, gluten-free
                    </p>
                  )}
                  {field.key === "date_available" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Leave blank = in stock today. Use YYYY-MM-DD format.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("preview")}
              disabled={!mapping.name || !mapping.quantity}
              className="btn-primary"
            >
              Preview import →
            </button>
            <button onClick={reset} className="btn-secondary">
              Start over
            </button>
          </div>
          {(!mapping.name || !mapping.quantity) && (
            <p className="text-sm text-orange-600">
              Name and Quantity columns are required.
            </p>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">
                Preview (first 5 rows of {rows.length} total)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Qty</th>
                    <th className="px-4 py-2 text-left">Unit</th>
                    <th className="px-4 py-2 text-left">Tags</th>
                    <th className="px-4 py-2 text-left">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={!row.name ? "bg-red-50" : "hover:bg-gray-50"}
                    >
                      <td className="px-4 py-2">
                        {row.name || (
                          <span className="text-red-500">missing</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {row.category}
                      </td>
                      <td className="px-4 py-2">{row.quantity}</td>
                      <td className="px-4 py-2 text-gray-600">{row.unit}</td>
                      <td className="px-4 py-2">
                        {row.dietary_tags.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {row.date_available ?? "In stock"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary"
            >
              {importing
                ? "Importing…"
                : `Import all ${rows.length} rows`}
            </button>
            <button
              onClick={() => setStep("map")}
              className="btn-secondary"
              disabled={importing}
            >
              Back to mapping
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && importResult && (
        <div className="card p-6 space-y-4">
          <div
            className={`text-lg font-semibold ${
              importResult.errors.length === 0
                ? "text-green-700"
                : "text-orange-700"
            }`}
          >
            {importResult.errors.length === 0
              ? `✓ ${importResult.inserted} items imported successfully`
              : `Imported ${importResult.inserted} items with ${importResult.errors.length} error(s)`}
          </div>
          {importResult.errors.length > 0 && (
            <ul className="text-sm text-red-600 space-y-1">
              {importResult.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button onClick={reset} className="btn-secondary">
              Import another file
            </button>
            <a href="/admin/inventory" className="btn-primary">
              View inventory
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
