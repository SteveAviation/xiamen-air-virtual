"use client";

import Link from "next/link";
import { useState } from "react";

export type DispatchLite = {
  id: string;
  dep: string;
  arr: string;
  depCity: string;
  arrCity: string;
  flightNo: string;
  timeLabel: string;
  spotlight: boolean;
  potentialAp: number;
};

export type CargoLite = {
  id: string;
  dep: string;
  arr: string;
  depCity: string;
  arrCity: string;
  flightNo: string;
  timeLabel: string;
  riskLabel: string;
  potentialLc: number;
};

/* Today's dispatch card — pilots flip between their Career and Cargo summaries.
   Every leg shows ICAO codes; rewards are labelled "potential". */
export function DispatchSwitcher({
  career,
  cargo,
  careerOpen,
  cargoOpen,
}: {
  career: DispatchLite[];
  cargo: CargoLite[];
  careerOpen: boolean;
  cargoOpen: boolean;
}) {
  const [tab, setTab] = useState<"career" | "cargo">(careerOpen ? "career" : "cargo");

  return (
    <div className="rise rounded-2xl border border-obsidian bg-ink-900 lift">
      <div className="flex items-center justify-between border-b border-obsidian/70 px-5 py-3">
        <p className="text-sm font-semibold text-cream">Today&apos;s dispatch</p>
        <div className="flex items-center gap-1 rounded-full bg-ink-850 p-0.5">
          <button onClick={() => setTab("career")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${tab === "career" ? "bg-gold text-white" : "text-cream-faint hover:text-cream"}`}>Career</button>
          <button onClick={() => setTab("cargo")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${tab === "cargo" ? "bg-rose text-white" : "text-cream-faint hover:text-cream"}`}>Cargo</button>
        </div>
      </div>

      {tab === "career" ? (
        careerOpen ? (
          <>
            <ul className="divide-y divide-obsidian/60">
              {career.map((dp) => (
                <li key={dp.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cream">{dp.depCity} <span className="text-cream-faint">({dp.dep})</span> → {dp.arrCity} <span className="text-cream-faint">({dp.arr})</span></p>
                    <p className="text-xs text-cream-faint">{dp.flightNo} · {dp.timeLabel}{dp.spotlight ? " · 2×" : ""}</p>
                  </div>
                  <span className="shrink-0 pl-3 text-right text-sm font-semibold text-cream">
                    ✦ {dp.potentialAp.toLocaleString()}
                    <span className="block text-[0.6rem] font-normal uppercase text-cream-faint">potential</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/crew/career" className="block border-t border-obsidian/60 px-5 py-2.5 text-center text-xs text-gold hover:underline">Open Career dispatch →</Link>
          </>
        ) : (
          <Locked label="Career Mode" rank="Elysian" />
        )
      ) : cargoOpen ? (
        <>
          <ul className="divide-y divide-obsidian/60">
            {cargo.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-cream">{c.depCity} <span className="text-cream-faint">({c.dep})</span> → {c.arrCity} <span className="text-cream-faint">({c.arr})</span></p>
                  <p className="text-xs text-cream-faint">{c.flightNo} · {c.timeLabel} · {c.riskLabel}</p>
                </div>
                <span className="shrink-0 pl-3 text-right text-sm font-semibold text-cream">
                  ◈ {c.potentialLc.toLocaleString()}
                  <span className="block text-[0.6rem] font-normal uppercase text-cream-faint">potential LC</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/crew/cargo" className="block border-t border-obsidian/60 px-5 py-2.5 text-center text-xs text-rose hover:underline">Open Cargo dispatch →</Link>
        </>
      ) : (
        <Locked label="Cargo Mode" rank="Zenith" />
      )}
    </div>
  );
}

function Locked({ label, rank }: { label: string; rank: string }) {
  return (
    <div className="px-5 py-6 text-center">
      <p className="text-sm text-cream-dim">{label} unlocks at <span className="font-medium text-cream">{rank}</span></p>
      <p className="mt-1 text-xs text-cream-faint">Keep logging hours to unlock your dispatch board.</p>
    </div>
  );
}
