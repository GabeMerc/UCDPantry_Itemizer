"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Shipment } from "@/lib/types";
import { CATEGORIES, UNITS, normalizeUnit } from "@/lib/constants";

const EMPTY_FORM = {
  item_name: "",
  category: "Pantry",
  expected_quantity: 0,
  unit: "item",
  expected_date: "",
  notes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m1 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, "0")}-${m1[2].padStart(2, "0")}`;
  const m2 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  return null;
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(field); field = ""; }
      else { field += ch; }
    }
  }
  fields.push(field);
  return fields;
}

function formatDateHeader(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function groupByDate(shipments: Shipment[]): [string, Shipment[]][] {
  const map: Record<string, Shipment[]> = {};
  for (const s of shipments) {
    (map[s.expected_date] ??= []).push(s);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShipmentsManager({
  initialShipments,
  today,
}: {
  initialShipments: Shipment[];
  today: string;
}) {
  const supabase = createClient();
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [showForm, setShowForm] = useState(false);
  const [showCsvPanel, setShowCsvPanel] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setShowCsvPanel(false);
    setError(null);
  }

  function openEdit(s: Shipment) {
    setEditingId(s.id);
    setForm({
      item_name: s.item_name,
      category: s.category,
      expected_quantity: s.expected_quantity,
      unit: s.unit,
      expected_date: s.expected_date,
      notes: s.notes ?? "",
    });
    setShowForm(true);
    setShowCsvPanel(false);
    setError(null);
  }

  async function handleSave() {
    if (!form.item_name.trim() || !form.expected_date) {
      setError("Item name and expected date are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      item_name: form.item_name.trim(),
      category: form.category,
      expected_quantity: form.expected_quantity,
      unit: form.unit || "item",
      expected_date: form.expected_date,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("shipments")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (error) { setError(error.message); setSaving(false); return; }
      setShipments((prev) =>
        prev.map((s) => (s.id === editingId ? (data as Shipment) : s))
          .sort((a, b) => a.expected_date.localeCompare(b.expected_date))
      );
    } else {
      const { data, error } = await supabase
        .from("shipments")
        .insert(payload)
        .select()
        .single();
      if (error) { setError(error.message); setSaving(false); return; }
      setShipments((prev) =>
        [...prev, data as Shipment].sort((a, b) =>
          a.expected_date.localeCompare(b.expected_date)
        )
      );
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this shipment?")) return;
    const { error } = await supabase.from("shipments").delete().eq("id", id);
    if (error) { alert("Delete failed: " + error.message); return; }
    setShipments((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleReceive(s: Shipment) {
    if (!confirm(
      `Receive "${s.item_name}"?\n\nThis will add ${s.expected_quantity} ${s.unit} to inventory under "${s.category}" and remove this shipment.`
    )) return;

    const { error: invError } = await supabase.from("inventory").insert({
      name: s.item_name,
      category: s.category,
      quantity: s.expected_quantity,
      unit: s.unit,
      dietary_tags: [],
      date_available: null,
    });
    if (invError) { alert("Failed to add to inventory: " + invError.message); return; }

    const { error: delError } = await supabase.from("shipments").delete().eq("id", s.id);
    if (delError) { alert("Added to inventory but failed to remove shipment: " + delError.message); return; }

    setShipments((prev) => prev.filter((sh) => sh.id !== s.id));
  }

  function onCsvImport(imported: Shipment[]) {
    setShipments((prev) =>
      [...prev, ...imported].sort((a, b) =>
        a.expected_date.localeCompare(b.expected_date)
      )
    );
    setShowCsvPanel(false);
  }

  const upcoming = shipments.filter((s) => s.expected_date >= today);
  const past = shipments.filter((s) => s.expected_date < today);
  const upcomingGroups = groupByDate(upcoming);

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => { setShowCsvPanel((v) => !v); setShowForm(false); }}
          className="btn-secondary text-sm"
        >
          {showCsvPanel ? "Cancel CSV" : "Import CSV"}
        </button>
        <button onClick={openAdd} className="btn-primary">
          + Add Shipment
        </button>
      </div>

      {/* CSV import panel */}
      {showCsvPanel && (
        <CsvImportPanel today={today} supabase={supabase} onImport={onCsvImport} />
      )}

      {/* Manual form */}
      {showForm && (
        <div className="card p-5 border-ucd-blue border space-y-4">
          <h2 className="font-semibold text-gray-800">
            {editingId ? "Edit Shipment" : "New Shipment"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="label">
                Item name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={form.item_name}
                onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                placeholder="e.g. Canned Black Beans"
              />
            </div>
            <div>
              <label className="label">Expected quantity</label>
              <input
                type="number" min={0} className="input"
                value={form.expected_quantity}
                onChange={(e) => setForm((f) => ({ ...f, expected_quantity: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">
                Expected date <span className="text-red-500">*</span>
              </label>
              <input type="date" className="input" min={today}
                value={form.expected_date}
                onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Donation from Food Bank, etc."
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Update" : "Add Shipment"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
              className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upcoming — grouped by date */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Upcoming ({upcoming.length})
          </h2>
        </div>
        {upcomingGroups.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            No upcoming shipments.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingGroups.map(([date, group]) => (
              <div key={date}>
                {/* Date header */}
                <div className="px-5 py-2 bg-gray-50/80 flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {formatDateHeader(date, today)}
                  </span>
                  {date === today && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                      Today
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {group.length} item{group.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {group.map((s) => (
                    <ShipmentRow
                      key={s.id}
                      shipment={s}
                      today={today}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onReceive={handleReceive}
                      isPast={false}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past / overdue */}
      {past.length > 0 && (
        <details className="card overflow-hidden">
          <summary className="px-5 py-3 border-b border-gray-100 bg-gray-50 cursor-pointer font-semibold text-gray-500 text-sm list-none">
            Past shipments ({past.length}) ▾
          </summary>
          <ul className="divide-y divide-gray-100">
            {[...past].reverse().map((s) => (
              <ShipmentRow
                key={s.id}
                shipment={s}
                today={today}
                onEdit={openEdit}
                onDelete={handleDelete}
                onReceive={handleReceive}
                isPast
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── CSV Import Panel ──────────────────────────────────────────────────────────

interface CsvShipmentRow {
  item_name: string;
  category: string;
  expected_quantity: number;
  unit: string;
  expected_date: string;
  notes: string;
}

function CsvImportPanel({
  today,
  supabase,
  onImport,
}: {
  today: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  onImport: (imported: Shipment[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [skipHeader, setSkipHeader] = useState(true);
  const [parsed, setParsed] = useState<CsvShipmentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsed([]);
    setParseErrors([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const dataLines = skipHeader ? lines.slice(1) : lines;
      const rows: CsvShipmentRow[] = [];
      const errors: string[] = [];

      dataLines.forEach((line, idx) => {
        const rowNum = idx + (skipHeader ? 2 : 1);
        const cols = parseCSVRow(line);
        const item_name = (cols[0] ?? "").trim();
        const category = (cols[1] ?? "").trim();
        const qtyStr = (cols[2] ?? "").trim();
        const unit = normalizeUnit(cols[3] ?? "item");
        const dateRaw = (cols[4] ?? "").trim();
        const notes = (cols[5] ?? "").trim();

        if (!item_name) { errors.push(`Row ${rowNum}: missing item name`); return; }

        const expected_date = normalizeDate(dateRaw);
        if (!expected_date) { errors.push(`Row ${rowNum}: invalid date "${dateRaw}"`); return; }
        if (expected_date < today) { errors.push(`Row ${rowNum}: date ${expected_date} is in the past — skipped`); return; }

        const expected_quantity = parseFloat(qtyStr) || 0;
        const validCategory = (CATEGORIES as readonly string[]).includes(category) ? category : "Pantry";

        rows.push({ item_name, category: validCategory, expected_quantity, unit, expected_date, notes });
      });

      setParsed(rows);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  }

  function resetFile() {
    setParsed([]);
    setParseErrors([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setImporting(true);
    setResult(null);

    const { data, error } = await supabase
      .from("shipments")
      .insert(parsed.map((r) => ({ ...r, notes: r.notes || null })))
      .select();

    setImporting(false);
    if (error) {
      setResult("Error: " + error.message);
      return;
    }
    setResult(`✓ Imported ${data.length} shipment${data.length !== 1 ? "s" : ""}.`);
    onImport(data as Shipment[]);
    resetFile();
  }

  return (
    <div className="card p-5 border-ucd-blue border space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">Import Shipments from CSV</h2>

        {/* Format instructions */}
        <details className="mt-2">
          <summary className="text-xs text-ucd-blue hover:underline cursor-pointer font-medium">
            CSV format instructions ▾
          </summary>
          <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <p className="text-gray-700 font-medium">
              Your CSV must have these 6 columns in order:
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200 text-gray-700">
                    <th className="px-3 py-1.5 text-left rounded-tl">Column</th>
                    <th className="px-3 py-1.5 text-left">Required</th>
                    <th className="px-3 py-1.5 text-left">Format</th>
                    <th className="px-3 py-1.5 text-left rounded-tr">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    ["Item Name", "Yes", "Text", "Canned Black Beans"],
                    ["Category", "Yes", "One of the categories below", "Proteins"],
                    ["Quantity", "Yes", "Number", "50"],
                    ["Unit", "Yes", "lbs, oz, cans, bags, item, etc.", "lbs"],
                    ["Expected Date", "Yes", "YYYY-MM-DD or MM/DD/YYYY", "2026-03-10"],
                    ["Notes", "No", "Text (leave blank if none)", "Food Bank Donation"],
                  ].map(([col, req, fmt, ex]) => (
                    <tr key={col} className="bg-white">
                      <td className="px-3 py-1.5 font-medium text-gray-800">{col}</td>
                      <td className="px-3 py-1.5 text-gray-500">{req}</td>
                      <td className="px-3 py-1.5 text-gray-500">{fmt}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-600">{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-gray-600 font-medium mb-1">Valid categories:</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <span key={c} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Any unrecognized category defaults to "Pantry".
              </p>
            </div>
            <div>
              <p className="text-gray-600 font-medium mb-1">Valid units (common aliases like "pounds", "lb", "cans" are auto-normalized):</p>
              <div className="flex flex-wrap gap-1.5">
                {UNITS.map((u) => (
                  <span key={u} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
                    {u}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Unrecognized units default to "item".
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded p-3">
              <p className="text-gray-600 font-medium mb-1 text-xs">Example rows:</p>
              <pre className="text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed">
{`Item Name,Category,Quantity,Unit,Expected Date,Notes
Canned Black Beans,Proteins,50,lbs,2026-03-10,Food Bank Donation
Brown Rice,Grains,100,lbs,2026-03-10,
Whole Milk,Dairy & Alternatives,24,cartons,2026-03-15,`}
              </pre>
            </div>
            <p className="text-xs text-gray-400">
              Dates in the past are skipped automatically. Past dates are not allowed.
            </p>
          </div>
        </details>
      </div>

      {/* File input */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={skipHeader} onChange={(e) => { setSkipHeader(e.target.checked); resetFile(); }}
            className="rounded border-gray-300 text-ucd-blue" />
          Skip first row (header)
        </label>
        <input
          ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile}
          className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-ucd-blue file:text-white hover:file:bg-ucd-blue/90"
        />
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs text-amber-800">{e}</p>
          ))}
        </div>
      )}

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {parsed.length} shipment{parsed.length !== 1 ? "s" : ""} ready to import
            {" "}from <span className="font-mono text-xs text-gray-500">{fileName}</span>
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto divide-y divide-gray-100">
            {Object.entries(
              parsed.reduce((acc, r) => {
                (acc[r.expected_date] ??= []).push(r);
                return acc;
              }, {} as Record<string, CsvShipmentRow[]>)
            ).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => (
              <div key={date}>
                <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="px-4 py-2 text-sm flex items-center justify-between gap-4">
                    <span className="font-medium text-gray-900 truncate">{r.item_name}</span>
                    <span className="text-gray-400 text-xs shrink-0">
                      {r.expected_quantity} {r.unit} · {r.category}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {result && (
            <p className={`text-sm font-medium ${result.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>
              {result}
            </p>
          )}

          <button onClick={handleImport} disabled={importing} className="btn-primary">
            {importing ? "Importing…" : `Import ${parsed.length} shipment${parsed.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shipment Row ──────────────────────────────────────────────────────────────

function ShipmentRow({
  shipment: s,
  today,
  onEdit,
  onDelete,
  onReceive,
  isPast,
}: {
  shipment: Shipment;
  today: string;
  onEdit: (s: Shipment) => void;
  onDelete: (id: string) => void;
  onReceive: (s: Shipment) => void;
  isPast: boolean;
}) {
  const canReceive = s.expected_date <= today;

  return (
    <li className={`px-5 py-3 flex items-start justify-between gap-4 ${isPast && !canReceive ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">{s.item_name}</p>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
            {s.category}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {s.expected_quantity} {s.unit}
          {s.notes && ` · ${s.notes}`}
        </p>
      </div>
      <div className="flex gap-2 shrink-0 items-center flex-wrap justify-end">
        {canReceive && (
          <button onClick={() => onReceive(s)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
            ✓ Receive
          </button>
        )}
        <button onClick={() => onEdit(s)}
          className="text-ucd-blue hover:underline text-xs font-medium">
          Edit
        </button>
        <button onClick={() => onDelete(s.id)}
          className="text-red-500 hover:underline text-xs font-medium">
          Delete
        </button>
      </div>
    </li>
  );
}
