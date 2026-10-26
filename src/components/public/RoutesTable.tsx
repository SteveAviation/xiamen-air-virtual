"use client";

import { useMemo, useState } from "react";

export type RouteRow = {
  outNo: string;
  retNo: string;
  depCity: string;
  dep: string;
  arrCity: string;
  arr: string;
  aircraft: string;
  minutes: number;
  time: string;
  airline: string;
};

type Haul = "all" | "short" | "medium" | "long" | "ultra";

const HAULS: { key: Haul; label: string; hint: string }[] = [
  { key: "all", label: "All", hint: "Every sector" },
  { key: "short", label: "Short", hint: "< 2h" },
  { key: "medium", label: "Medium", hint: "2–6h" },
  { key: "long", label: "Long", hint: "6–15h" },
  { key: "ultra", label: "Ultra-long", hint: "15h+" },
];

function haulOf(min: number): Haul {
  if (min < 120) return "short";
  if (min <= 360) return "medium";
  if (min <= 900) return "long";
  return "ultra";
}

export function RoutesTable({ rows }: { rows: RouteRow[] }) {
  const [q, setQ] = useState("");
  const [haul, setHaul] = useState<Haul>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (haul !== "all" && haulOf(r.minutes) !== haul) return false;
      if (!needle) return true;
      return (
        r.depCity.toLowerCase().includes(needle) ||
        r.arrCity.toLowerCase().includes(needle) ||
        r.dep.toLowerCase().includes(needle) ||
        r.arr.toLowerCase().includes(needle) ||
        r.aircraft.toLowerCase().includes(needle) ||
        r.outNo.toLowerCase().includes(needle) ||
        r.retNo.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, haul]);

  return (
    <div>
      {/* Search + haul filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream-faint" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search city, ICAO, aircraft, or flight number…"
            className="w-full rounded-md border border-obsidian bg-ink-850 py-2.5 pl-9 pr-3 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold-soft"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HAULS.map((h) => {
            const on = haul === h.key;
            return (
              <button
                key={h.key}
                onClick={() => setHaul(h.key)}
                title={h.hint}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-gold/50 bg-gold/[0.08] text-gold-soft" : "border-obsidian text-cream-faint hover:text-cream"}`}
              >
                {h.label}
                <span className="ml-1.5 hidden text-[0.65rem] opacity-70 sm:inline">{h.key === "all" ? "" : h.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-obsidian bg-ink-900">
        <div className="max-h-[460px] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-ink-900">
              <tr className="border-b border-obsidian text-xs uppercase tracking-wide text-cream-faint">
                <th className="px-5 py-3 font-normal">Outbound</th>
                <th className="px-5 py-3 font-normal">Return</th>
                <th className="px-5 py-3 font-normal">Departure</th>
                <th className="px-5 py-3 font-normal">Arrival</th>
                <th className="px-5 py-3 font-normal">Aircraft</th>
                <th className="px-5 py-3 font-normal text-right">Flight time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.outNo + r.arr} className="border-t border-obsidian/40 hover:bg-ink-850">
                  <td className="px-5 py-3 font-mono text-cream">{r.outNo}</td>
                  <td className="px-5 py-3 font-mono text-cream-dim">{r.retNo}</td>
                  <td className="px-5 py-3 text-cream-dim">{r.depCity} <span className="text-cream-faint">({r.dep})</span></td>
                  <td className="px-5 py-3 text-cream-dim">{r.arrCity} <span className="text-cream-faint">({r.arr})</span></td>
                  <td className="px-5 py-3 text-cream-dim">{r.aircraft}</td>
                  <td className="px-5 py-3 text-right text-cream-dim">{r.time}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-cream-faint">No routes match “{q}”{haul !== "all" ? ` in the ${HAULS.find((h) => h.key === haul)?.label.toLowerCase()}-haul band` : ""}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-cream-faint">{filtered.length} of {rows.length} sectors shown. Staff can add codeshare partner routes to this database as the network grows.</p>
    </div>
  );
}
