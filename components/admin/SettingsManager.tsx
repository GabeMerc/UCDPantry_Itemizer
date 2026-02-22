"use client";

import { useState, useEffect } from "react";

interface KeyStatus {
  key_set: boolean;
  key_preview: string | null;
  source: "database" | "env" | "none";
}

export default function SettingsManager({
  spoonacularStatus,
  pexelsStatus,
}: {
  spoonacularStatus: KeyStatus;
  pexelsStatus: KeyStatus;
}) {
  const [spoonStatus, setSpoonStatus] = useState<KeyStatus>(spoonacularStatus);
  const [spoonInput, setSpoonInput] = useState("");
  const [showSpoon, setShowSpoon] = useState(false);
  const [spoonSave, setSpoonSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [spoonSaveMsg, setSpoonSaveMsg] = useState("");
  const [spoonTest, setSpoonTest] = useState<"idle" | "testing" | "valid" | "invalid">("idle");
  const [spoonTestMsg, setSpoonTestMsg] = useState("");
  const [spoonQuota, setSpoonQuota] = useState<{ requests: number | null; points: number | null } | null>(null);
  const [spoonClear, setSpoonClear] = useState<"idle" | "clearing">("idle");

  const [pxStatus, setPxStatus] = useState<KeyStatus>(pexelsStatus);
  const [pxInput, setPxInput] = useState("");
  const [showPx, setShowPx] = useState(false);
  const [pxSave, setPxSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pxSaveMsg, setPxSaveMsg] = useState("");
  const [pxClear, setPxClear] = useState<"idle" | "clearing">("idle");

  async function refreshStatuses() {
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    if (json.spoonacular) setSpoonStatus(json.spoonacular);
    if (json.pexels) setPxStatus(json.pexels);
  }

  // ── Spoonacular handlers ───────────────────────────────────────────────────

  async function handleSpoonTest() {
    const key = spoonInput.trim();
    if (!key) return;
    setSpoonTest("testing");
    setSpoonTestMsg("");
    setSpoonQuota(null);

    try {
      const res = await fetch("/api/admin/test-spoonacular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key }),
      });
      const json = await res.json();

      if (json.valid) {
        setSpoonTest("valid");
        setSpoonTestMsg("Key is valid");
        setSpoonQuota({ requests: json.requests_remaining, points: json.points_remaining });
      } else {
        setSpoonTest("invalid");
        setSpoonTestMsg(json.error ?? "Key test failed");
      }
    } catch {
      setSpoonTest("invalid");
      setSpoonTestMsg("Could not connect to Spoonacular.");
    }
  }

  async function handleSpoonSave() {
    const key = spoonInput.trim();
    if (!key) return;
    setSpoonSave("saving");
    setSpoonSaveMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spoonacular_api_key: key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSpoonSave("saved");
      setSpoonSaveMsg("Key saved successfully.");
      setSpoonInput("");
      setSpoonTest("idle");
      await refreshStatuses();
    } catch (e) {
      setSpoonSave("error");
      setSpoonSaveMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleSpoonClear() {
    if (!confirm("Remove the saved Spoonacular key? The site will fall back to the .env.local value if one exists.")) return;
    setSpoonClear("clearing");
    await fetch("/api/admin/settings?key=spoonacular", { method: "DELETE" });
    await refreshStatuses();
    setSpoonClear("idle");
  }

  // ── Pexels handlers ────────────────────────────────────────────────────────

  async function handlePxSave() {
    const key = pxInput.trim();
    if (!key) return;
    setPxSave("saving");
    setPxSaveMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pexels_api_key: key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setPxSave("saved");
      setPxSaveMsg("Key saved successfully.");
      setPxInput("");
      await refreshStatuses();
    } catch (e) {
      setPxSave("error");
      setPxSaveMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handlePxClear() {
    if (!confirm("Remove the saved Pexels key? The site will fall back to the .env.local value if one exists.")) return;
    setPxClear("clearing");
    await fetch("/api/admin/settings?key=pexels", { method: "DELETE" });
    await refreshStatuses();
    setPxClear("idle");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Site-wide configuration for the UC Davis Pantry admin panel.
        </p>
      </div>

      {/* ── Spoonacular API Key ─────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">🥄</div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Spoonacular API Key</h2>
            <p className="text-sm text-gray-500 mt-1">
              Used by the admin &quot;Fetch Recipes&quot; feature to pull new recipes from Spoonacular. Get a free key at{" "}
              <a href="https://spoonacular.com/food-api" target="_blank" rel="noopener noreferrer" className="text-ucd-blue hover:underline">
                spoonacular.com/food-api
              </a>.
            </p>
          </div>
        </div>

        {/* Current status */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Key</p>
            {spoonStatus.key_set ? (
              <p className="text-sm font-mono text-gray-800">{spoonStatus.key_preview}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No key configured</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              spoonStatus.source === "database" ? "bg-green-100 text-green-700"
              : spoonStatus.source === "env" ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-600"
            }`}>
              {spoonStatus.source === "database" ? "Saved in database"
                : spoonStatus.source === "env" ? "From .env.local"
                : "Not set"}
            </span>
            {spoonStatus.source === "database" && (
              <button onClick={handleSpoonClear} disabled={spoonClear === "clearing"} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                {spoonClear === "clearing" ? "Clearing…" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Input + actions */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Paste new API key</label>
          <div className="relative">
            <input
              type={showSpoon ? "text" : "password"}
              value={spoonInput}
              onChange={(e) => { setSpoonInput(e.target.value); setSpoonSave("idle"); setSpoonTest("idle"); }}
              placeholder="Paste your Spoonacular API key here…"
              className="input pr-20 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowSpoon((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {showSpoon ? "Hide" : "Show"}
            </button>
          </div>

          {spoonTest === "valid" && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 space-y-1">
              <p className="font-medium">✓ {spoonTestMsg}</p>
              {spoonQuota && (
                <p className="text-green-600 text-xs">
                  {spoonQuota.requests !== null ? `${spoonQuota.requests} requests remaining today` : "Quota info not available"}
                  {spoonQuota.points !== null ? ` · ${spoonQuota.points} points remaining` : ""}
                </p>
              )}
            </div>
          )}
          {spoonTest === "invalid" && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">✗ {spoonTestMsg}</div>
          )}
          {spoonSave === "saved" && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 font-medium">✓ {spoonSaveMsg}</div>
          )}
          {spoonSave === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">✗ {spoonSaveMsg}</div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSpoonTest} disabled={!spoonInput.trim() || spoonTest === "testing"} className="btn-secondary text-sm">
              {spoonTest === "testing" ? "Testing…" : "Test Key"}
            </button>
            <button onClick={handleSpoonSave} disabled={!spoonInput.trim() || spoonSave === "saving"} className="btn-primary text-sm">
              {spoonSave === "saving" ? "Saving…" : "Save Key"}
            </button>
          </div>
          <p className="text-xs text-gray-400">The key is stored securely in your Supabase database and never exposed to students or the browser.</p>
        </div>
      </div>

      {/* ── Pexels API Key ──────────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">📷</div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Pexels API Key</h2>
            <p className="text-sm text-gray-500 mt-1">
              Used to automatically fetch food photos for recipes that don&apos;t have an image. Free tier: 200 requests/hour. Get a key at{" "}
              <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-ucd-blue hover:underline">
                pexels.com/api
              </a>.
            </p>
          </div>
        </div>

        {/* Current status */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Key</p>
            {pxStatus.key_set ? (
              <p className="text-sm font-mono text-gray-800">{pxStatus.key_preview}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No key configured</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              pxStatus.source === "database" ? "bg-green-100 text-green-700"
              : pxStatus.source === "env" ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-600"
            }`}>
              {pxStatus.source === "database" ? "Saved in database"
                : pxStatus.source === "env" ? "From .env.local"
                : "Not set"}
            </span>
            {pxStatus.source === "database" && (
              <button onClick={handlePxClear} disabled={pxClear === "clearing"} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                {pxClear === "clearing" ? "Clearing…" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Input + actions */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Paste new API key</label>
          <div className="relative">
            <input
              type={showPx ? "text" : "password"}
              value={pxInput}
              onChange={(e) => { setPxInput(e.target.value); setPxSave("idle"); }}
              placeholder="Paste your Pexels API key here…"
              className="input pr-20 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowPx((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {showPx ? "Hide" : "Show"}
            </button>
          </div>

          {pxSave === "saved" && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 font-medium">✓ {pxSaveMsg}</div>
          )}
          {pxSave === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">✗ {pxSaveMsg}</div>
          )}

          <div className="flex gap-3">
            <button onClick={handlePxSave} disabled={!pxInput.trim() || pxSave === "saving"} className="btn-primary text-sm">
              {pxSave === "saving" ? "Saving…" : "Save Key"}
            </button>
          </div>
          <p className="text-xs text-gray-400">The key is stored securely in your Supabase database and never exposed to students or the browser.</p>
        </div>
      </div>
    </div>
  );
}
