"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = { routeNumber: string; label: string; discontinued: boolean; rename: string };

/* Staff editor for the base Xiamen Air network — search a route, change its flight
   number, or discontinue (retire) it. Overrides persist and apply everywhere
   the route database is read. */
export function XiamenRouteEditor({ routes }: { routes: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return routes.slice(0, 40);
    return routes.filter((r) => r.label.toLowerCase().includes(n) || r.routeNumber.toLowerCase().includes(n)).slice(0, 60);
  }, [q, routes]);

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key);
    await fetch("/api/crew/codeshare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy("");
    router.refresh();
  }

  const input = "rounded-lg border border-obsidian bg-ink-850 px-2.5 py-1.5 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold";

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Xiamen Air routes — flight no, city, ICAO…"
        className={`${input} mb-4 w-full`}
      />
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.routeNumber} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${r.discontinued ? "border-rose/30 bg-rose/[0.04]" : "border-obsidian bg-ink-900"}`}>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${r.discontinued ? "text-cream-faint line-through" : "text-cream"}`}>{r.label}</p>
              <p className="font-mono text-[0.7rem] text-cream-faint">{r.routeNumber}{r.rename ? ` → ${r.rename}` : ""}{r.discontinued ? " · discontinued" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                className={`${input} w-32 font-mono uppercase`}
                placeholder="New flight no."
                defaultValue={r.rename}
                onChange={(e) => setDrafts((d) => ({ ...d, [r.routeNumber]: e.target.value }))}
              />
              <button
                onClick={() => post({ action: "renameRoute", routeNumber: r.routeNumber, newNumber: drafts[r.routeNumber] ?? r.rename }, r.routeNumber + ":ren")}
                disabled={busy === r.routeNumber + ":ren"}
                className="rounded-full border border-obsidian px-3 py-1.5 text-xs text-cream-dim hover:text-cream disabled:opacity-50"
              >
                Save no.
              </button>
              <button
                onClick={() => post({ action: "discontinueRoute", routeNumber: r.routeNumber, on: !r.discontinued }, r.routeNumber + ":disc")}
                disabled={busy === r.routeNumber + ":disc"}
                className={`rounded-full border px-3 py-1.5 text-xs disabled:opacity-50 ${r.discontinued ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" : "border-rose/40 text-rose hover:bg-rose/10"}`}
              >
                {r.discontinued ? "Restore" : "Discontinue"}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="rounded-xl border border-dashed border-obsidian px-3 py-6 text-center text-sm text-cream-faint">No routes match &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
