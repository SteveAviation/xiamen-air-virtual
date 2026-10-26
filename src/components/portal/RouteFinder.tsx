"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type EnrichedRoute = {
  routeNumber: string;
  flightNo: string;
  dep: string;
  arr: string;
  depCity: string;
  arrCity: string;
  aircraft: string;
  minutes: number;
  airline: string;
  category: "regional" | "continental" | "longhaul" | "ultralong";
  ap: number;
  spotlight: boolean;
  rotw: boolean;
  simbrief: string;
};

const CATS = [
  { id: "all", label: "All" },
  { id: "regional", label: "Short" },
  { id: "continental", label: "Medium" },
  { id: "longhaul", label: "Long" },
  { id: "ultralong", label: "Ultra-long" },
];

function fmt(min: number) {
  return `${Math.floor(min / 60)}h ${(min % 60).toString().padStart(2, "0")}m`;
}

export function RouteFinder({ routes, airlines }: { routes: EnrichedRoute[]; airlines: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [airline, setAirline] = useState("All");
  const [sort, setSort] = useState<"ap" | "dur" | "az">("ap");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = routes.filter((x) => {
      if (cat !== "all" && x.category !== cat) return false;
      if (airline !== "All" && x.airline !== airline) return false;
      if (!needle) return true;
      return (
        x.flightNo.toLowerCase().includes(needle) ||
        x.routeNumber.toLowerCase().includes(needle) ||
        x.dep.toLowerCase().includes(needle) ||
        x.arr.toLowerCase().includes(needle) ||
        x.depCity.toLowerCase().includes(needle) ||
        x.arrCity.toLowerCase().includes(needle)
      );
    });
    r = [...r].sort((a, b) =>
      sort === "ap" ? b.ap - a.ap : sort === "dur" ? a.minutes - b.minutes : a.arrCity.localeCompare(b.arrCity),
    );
    return r;
  }, [routes, q, cat, airline, sort]);

  return (
    <div>
      {/* controls */}
      <div className="sticky top-16 z-10 -mx-1 mb-5 rounded-2xl border border-obsidian glass p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-faint" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a flight — AY15, Tokyo, ZSAM, Xiamen…"
              className="w-full rounded-xl border border-obsidian bg-ink-850 py-2.5 pl-10 pr-4 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-obsidian bg-ink-850 p-0.5">
              {CATS.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${cat === c.id ? "bg-gold text-white" : "text-cream-dim hover:text-cream"}`}>{c.label}</button>
              ))}
            </div>
            <select value={airline} onChange={(e) => setAirline(e.target.value)} className="rounded-xl border border-obsidian bg-ink-850 px-3 py-2 text-xs text-cream-dim outline-none focus:border-gold">
              {airlines.map((a) => <option key={a}>{a}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as "ap" | "dur" | "az")} className="rounded-xl border border-obsidian bg-ink-850 px-3 py-2 text-xs text-cream-dim outline-none focus:border-gold">
              <option value="ap">Top AP</option>
              <option value="dur">Shortest</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-cream-faint">{filtered.length} routes</p>
      </div>

      {/* results */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <div key={r.routeNumber} className="group rounded-2xl border border-obsidian bg-ink-900 p-4 lift">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                {r.rotw && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-gold">ROTW</span>}
                {r.spotlight && <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-rose">2×</span>}
                {r.airline !== "Xiamen Air Virtual" && <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[0.6rem] uppercase text-cream-faint">{r.airline}</span>}
              </div>
              <span className="font-mono text-xs text-cream-faint">{r.flightNo}</span>
            </div>
            <div className="mt-2.5">
              <p className="font-display text-lg font-semibold text-cream">{r.depCity} <span className="text-gold">→</span> {r.arrCity}</p>
              <p className="text-xs text-cream-faint">{r.dep} – {r.arr} · {r.aircraft}</p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-obsidian/60 pt-3">
              <span className="text-xs text-cream-faint">{fmt(r.minutes)}</span>
              <span className="text-sm font-semibold text-cream">✦ {r.ap.toLocaleString()}</span>
            </div>
            <a href={r.simbrief} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-xs font-semibold text-gold-soft transition-colors hover:bg-gold/10">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 12h7l2-9 2 9h7M3 12l9 9 9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Dispatch on SimBrief
            </a>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-16 text-center text-sm text-cream-faint">No routes match “{q}”. <button onClick={() => { setQ(""); setCat("all"); setAirline("All"); }} className="text-gold">Clear filters</button></p>}
    </div>
  );
}
