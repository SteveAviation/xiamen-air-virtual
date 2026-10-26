"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { routeNumber: string; dep: string; arr: string; aircraft: string; minutes: number; airline: string };

export function CodeshareManager({ routes, partners }: { routes: Row[]; partners: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [f, setF] = useState({ airline: partners[0] ?? "", routeNumber: "", dep: "", arr: "", aircraft: "", hours: "", minutes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<{ added: number; errors: { routeNumber: string; error: string }[] } | null>(null);
  const [rq, setRq] = useState("");
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function addBulk(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBulkResult(null);
    setBusy(true);
    const res = await fetch("/api/crew/codeshare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk", text: bulkText }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setBulkResult({ added: j.added ?? 0, errors: j.errors ?? [] }); if ((j.added ?? 0) > 0) { setBulkText(""); router.refresh(); } }
    else { setError(j.error || "Could not add routes."); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const minutes = (Number(f.hours) || 0) * 60 + (Number(f.minutes) || 0);
    setBusy(true);
    const res = await fetch("/api/crew/codeshare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ...f, minutes }),
    });
    setBusy(false);
    if (res.ok) { setF({ ...f, routeNumber: "", dep: "", arr: "", aircraft: "", hours: "", minutes: "" }); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); setError(j.error || "Could not add route."); }
  }

  async function del(routeNumber: string) {
    if (!confirm(`Remove ${routeNumber}?`)) return;
    const res = await fetch("/api/crew/codeshare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", routeNumber }) });
    if (res.ok) router.refresh();
  }

  const input = "w-full rounded-xl border border-obsidian bg-ink-850 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold";
  const label = "mb-1.5 block text-xs uppercase tracking-wide text-cream-faint";

  const bulkForm = (
    <form onSubmit={addBulk} className="rounded-2xl border border-obsidian bg-ink-900 p-6">
      <h2 className="font-display text-xl font-semibold text-cream">Bulk add — paste routes</h2>
      <p className="mt-1 text-sm text-cream-dim">One route per line: <span className="font-mono text-xs text-cream">flightNo, DEP, ARR, minutes, airline, aircraft</span> (aircraft optional). Commas or tabs.</p>
      <textarea
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        placeholder={"BA811, ZSAM, EGLL, 175, British Airways, Airbus A320\nQR301, ZSAM, OTHH, 360, Qatar Airways, Boeing 787-8\nAA141, ZSAM, KJFK, 510, American Airlines"}
        className={`${input} min-h-[180px] font-mono`}
      />
      {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
      {bulkResult && (
        <div className="mt-3 rounded-xl border border-obsidian bg-ink-850 px-3.5 py-3 text-sm">
          <p className="text-cream">✓ Added {bulkResult.added} route{bulkResult.added === 1 ? "" : "s"}.</p>
          {bulkResult.errors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-cream-faint">
              {bulkResult.errors.slice(0, 12).map((er, i) => (
                <li key={i}><span className="font-mono">{er.routeNumber}</span> — {er.error}</li>
              ))}
              {bulkResult.errors.length > 12 && <li>…and {bulkResult.errors.length - 12} more.</li>}
            </ul>
          )}
        </div>
      )}
      <button type="submit" disabled={busy || !bulkText.trim()} className="mt-4 rounded-full bg-gold px-6 py-3 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">{busy ? "Adding…" : "Add all"}</button>
    </form>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="mb-4 inline-flex rounded-full border border-obsidian bg-ink-900 p-1 text-sm">
          <button type="button" onClick={() => { setMode("single"); setError(""); }} className={`rounded-full px-4 py-1.5 transition-colors ${mode === "single" ? "bg-gold text-white" : "text-cream-faint hover:text-cream"}`}>Single</button>
          <button type="button" onClick={() => { setMode("bulk"); setError(""); }} className={`rounded-full px-4 py-1.5 transition-colors ${mode === "bulk" ? "bg-gold text-white" : "text-cream-faint hover:text-cream"}`}>Bulk paste</button>
        </div>
        {mode === "bulk" ? bulkForm : (
      <form onSubmit={add} className="rounded-2xl border border-obsidian bg-ink-900 p-6">
        <h2 className="font-display text-xl font-semibold text-cream">Add codeshare route</h2>
        <p className="mt-1 text-sm text-cream-dim">New routes appear instantly in the pilot route database and SkyTeam Discover.</p>
        <div className="mt-5 space-y-4">
          <div><label className={label}>Partner airline</label>
            <input list="partners" className={input} value={f.airline} onChange={(e) => set("airline", e.target.value)} placeholder="British Airways" />
            <datalist id="partners">{partners.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={label}>Flight no.</label><input className={`${input} font-mono uppercase`} value={f.routeNumber} onChange={(e) => set("routeNumber", e.target.value)} placeholder="BA793" /></div>
            <div><label className={label}>From</label><input className={`${input} font-mono uppercase`} maxLength={4} value={f.dep} onChange={(e) => set("dep", e.target.value)} placeholder="ZSAM" /></div>
            <div><label className={label}>To</label><input className={`${input} font-mono uppercase`} maxLength={4} value={f.arr} onChange={(e) => set("arr", e.target.value)} placeholder="EGLL" /></div>
          </div>
          <div><label className={label}>Aircraft</label><input className={input} value={f.aircraft} onChange={(e) => set("aircraft", e.target.value)} placeholder="Boeing 787-8" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label}>Block hours</label><input type="number" min={0} className={input} value={f.hours} onChange={(e) => set("hours", e.target.value)} placeholder="2" /></div>
            <div><label className={label}>Minutes</label><input type="number" min={0} max={59} className={input} value={f.minutes} onChange={(e) => set("minutes", e.target.value)} placeholder="55" /></div>
          </div>
          {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={busy} className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">{busy ? "Adding…" : "Add to database"}</button>
        </div>
      </form>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold text-cream">Codeshare routes <span className="ml-2 rounded-full bg-gold/10 px-2.5 py-0.5 text-sm text-gold">{routes.length}</span></h2>
        <input value={rq} onChange={(e) => setRq(e.target.value)} placeholder="Search by airline, city, ICAO or flight no…" className={`${input} mb-3 mt-3`} />
        {routes.length === 0 && <div className="rounded-2xl border border-dashed border-obsidian bg-ink-900 p-8 text-center text-sm text-cream-faint">No codeshare routes added yet.</div>}
        {(() => {
          const n = rq.trim().toLowerCase();
          const shown = n
            ? routes.filter((r) => [r.airline, r.dep, r.arr, r.routeNumber, r.aircraft].some((v) => String(v).toLowerCase().includes(n)))
            : routes;
          const byAirline = new Map<string, Row[]>();
          for (const r of shown) {
            if (!byAirline.has(r.airline)) byAirline.set(r.airline, []);
            byAirline.get(r.airline)!.push(r);
          }
          const airlines = [...byAirline.keys()].sort();
          if (routes.length && shown.length === 0) return <p className="rounded-xl border border-dashed border-obsidian px-3 py-6 text-center text-sm text-cream-faint">No routes match your search.</p>;
          return (
            <div className="space-y-5">
              {airlines.map((air) => (
                <div key={air}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cream">
                    {air}
                    <span className="rounded-full bg-obsidian/60 px-2 py-0.5 text-[0.65rem] font-normal text-cream-faint">{byAirline.get(air)!.length}</span>
                  </p>
                  <div className="space-y-2">
                    {byAirline.get(air)!.map((r) => (
                      <div key={r.routeNumber} className="flex items-center justify-between rounded-xl border border-obsidian bg-ink-900 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-cream">{r.dep} → {r.arr} <span className="ml-1 font-mono text-xs text-cream-faint">{r.routeNumber}</span></p>
                          <p className="text-xs text-cream-faint">{r.aircraft} · {Math.floor(r.minutes / 60)}h {(r.minutes % 60).toString().padStart(2, "0")}m</p>
                        </div>
                        <button onClick={() => del(r.routeNumber)} className="rounded-full border border-obsidian px-3 py-1.5 text-xs text-cream-faint hover:border-rose/50 hover:text-rose">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
