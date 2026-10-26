"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type CareerLeg = {
  id: string;
  dep: string;
  arr: string;
  depCity: string;
  arrCity: string;
  flightNo: string;
  aircraft: string; // first authorised type, for PIREP autofill
  aircraftLabel: string; // as displayed
  timeLabel: string;
  haul: string;
  spotlight: boolean;
  potentialAp: number;
  punctualBonus: number;
  windowMinutes: number;
};

const HAUL_COLOR: Record<string, string> = { Short: "#12B5A8", Medium: "#3B6FE0", Long: "#A855C7", Ultra: "#D63A5E" };

function fileHref(leg: CareerLeg, expired: boolean) {
  const q = new URLSearchParams({
    flightNo: leg.flightNo, dep: leg.dep, arr: leg.arr, ac: leg.aircraft, type: "Career",
    ...(expired ? { expired: "1" } : {}),
  });
  return `/crew/file?${q.toString()}`;
}

export function CareerDispatch({ legs }: { legs: CareerLeg[] }) {
  // Accepted state persists per-dispatch for the day (demo: localStorage).
  const [accepted, setAccepted] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fnva.accepts");
      if (raw) setAccepted(JSON.parse(raw));
    } catch {}
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function accept(id: string) {
    setAccepted((a) => {
      const next = { ...a, [id]: Date.now() };
      try { localStorage.setItem("fnva.accepts", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {legs.map((leg, i) => {
        const at = accepted[leg.id];
        const isAccepted = !!at;
        const dueAt = at ? at + leg.windowMinutes * 60_000 : 0;
        const remaining = dueAt - now;
        const expired = isAccepted && remaining <= 0;
        const color = HAUL_COLOR[leg.haul] ?? "#3B6FE0";

        return (
          <div key={leg.id} className="rise flex flex-col rounded-2xl border border-obsidian bg-ink-900 p-5 lift" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white" style={{ background: color }}>{leg.haul} haul</span>
              {leg.spotlight && <span className="rounded-full bg-rose/12 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-rose">2× Spotlight</span>}
            </div>

            <p className="mt-3 font-display text-lg font-semibold text-cream">{leg.depCity} <span style={{ color }}>→</span> {leg.arrCity}</p>
            <p className="mt-0.5 text-xs text-cream-faint">{leg.flightNo} · {leg.dep}–{leg.arr} · {leg.aircraftLabel} · {leg.timeLabel}</p>

            {!isAccepted ? (
              <div className="mt-auto flex items-center justify-between border-t border-obsidian/70 pt-3.5">
                <div>
                  <p className="text-xs text-cream-faint">potential AP{leg.spotlight ? " · 2×" : ""}</p>
                  <p className="font-display text-lg font-semibold text-cream">✦ {leg.potentialAp.toLocaleString()}</p>
                  <p className="text-[0.65rem] text-cream-faint">+{leg.punctualBonus} on-time bonus</p>
                </div>
                <button onClick={() => accept(leg.id)} className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-125">Accept</button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-obsidian/70 bg-ink-850 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-gold">✓ Accepted</span>
                  <span className={`text-xs font-medium ${expired ? "text-rose" : "text-cream-dim"}`}>{expired ? "Window expired" : `Due in ${fmtCountdown(remaining)}`}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cream-faint">potential AP</p>
                    <p className="font-display text-base font-semibold text-cream">✦ {leg.potentialAp.toLocaleString()}</p>
                    {!expired && <p className="text-[0.65rem] text-cream-faint">+{leg.punctualBonus} if filed in time</p>}
                  </div>
                  <Link href={fileHref(leg, expired)} className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-125">File PIREP</Link>
                </div>
                {expired
                  ? <p className="mt-2 text-[0.65rem] text-rose">Filed late — the {leg.punctualBonus} AP on-time bonus no longer applies.</p>
                  : <p className="mt-2 text-[0.65rem] text-cream-faint">Window = flight time + 2h.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
