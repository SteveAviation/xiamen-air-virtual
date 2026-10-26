"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type CargoLeg = {
  id: string;
  dep: string;
  arr: string;
  depCity: string;
  arrCity: string;
  flightNo: string;
  aircraft: string;
  timeLabel: string;
  riskLabel: string;
  risk: "low" | "medium" | "high";
  scenario: string;
  potentialLc: number;
  lcMin: number;
  punctualBonus: number;
  windowMinutes: number;
};

const RISK_CLASS: Record<string, string> = {
  low: "bg-ink-800 text-cream-dim",
  medium: "bg-amber-500/12 text-amber-600",
  high: "bg-rose/12 text-rose",
};

function fileHref(leg: CargoLeg, expired: boolean) {
  const q = new URLSearchParams({
    flightNo: leg.flightNo, dep: leg.dep, arr: leg.arr, ac: leg.aircraft, type: "Cargo",
    ...(expired ? { expired: "1" } : {}),
  });
  return `/crew/file?${q.toString()}`;
}

export function CargoDispatch({ legs }: { legs: CargoLeg[] }) {
  const [accepted, setAccepted] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fnva.cargo.accepts");
      if (raw) setAccepted(JSON.parse(raw));
    } catch {}
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function accept(id: string) {
    setAccepted((a) => {
      const next = { ...a, [id]: Date.now() };
      try { localStorage.setItem("fnva.cargo.accepts", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {legs.map((leg, i) => {
        const at = accepted[leg.id];
        const isAccepted = !!at;
        const remaining = at ? at + leg.windowMinutes * 60_000 - now : 0;
        const expired = isAccepted && remaining <= 0;
        return (
          <div key={leg.id} className="rise flex flex-col rounded-2xl border border-obsidian bg-ink-900 p-5 lift" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${RISK_CLASS[leg.risk]}`}>{leg.riskLabel}</span>
              <span className="font-mono text-xs text-cream-faint">{leg.flightNo}</span>
            </div>
            <p className="mt-3 font-display text-lg font-semibold text-cream">{leg.depCity} <span className="text-rose">→</span> {leg.arrCity}</p>
            <p className="mt-0.5 text-xs text-cream-faint">{leg.dep}–{leg.arr} · {leg.aircraft} · {leg.timeLabel}</p>
            <p className="mt-2 rounded-lg bg-ink-850 px-3 py-1.5 text-xs text-cream-dim">📦 {leg.scenario}</p>

            {!isAccepted ? (
              <div className="mt-auto flex items-center justify-between border-t border-obsidian/70 pt-3.5">
                <div>
                  <p className="text-xs text-cream-faint">potential payout</p>
                  <p className="font-display text-lg font-semibold text-cream">◈ {leg.potentialLc.toLocaleString()} LC</p>
                  {leg.risk === "high"
                    ? <p className="text-[0.65rem] text-rose">min ◈ {leg.lcMin.toLocaleString()} (−20% risk) · +{leg.punctualBonus} on-time</p>
                    : <p className="text-[0.65rem] text-cream-faint">+{leg.punctualBonus} LC on-time bonus</p>}
                </div>
                <button onClick={() => accept(leg.id)} className="rounded-full px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-125" style={{ background: "var(--color-rose)" }}>Accept</button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-obsidian/70 bg-ink-850 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-rose">✓ Accepted</span>
                  <span className={`text-xs font-medium ${expired ? "text-rose" : "text-cream-dim"}`}>{expired ? "Window expired" : `Due in ${fmtCountdown(remaining)}`}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cream-faint">potential payout</p>
                    <p className="font-display text-base font-semibold text-cream">◈ {leg.potentialLc.toLocaleString()} LC</p>
                    {!expired && <p className="text-[0.65rem] text-cream-faint">+{leg.punctualBonus} if filed in time</p>}
                  </div>
                  <Link href={fileHref(leg, expired)} className="rounded-full px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-125" style={{ background: "var(--color-rose)" }}>File PIREP</Link>
                </div>
                {expired
                  ? <p className="mt-2 text-[0.65rem] text-rose">Filed late — the {leg.punctualBonus} LC on-time bonus no longer applies.</p>
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
