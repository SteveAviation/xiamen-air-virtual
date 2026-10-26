"use client";

import { useEffect, useState } from "react";

type Row = {
  id: number;
  callsign: string;
  displayName: string;
  rank: string;
  minutes: number;
  flights: number;
};

type Range = "week" | "month" | "all";
type Metric = "credited" | "raw";

const RANGE_LABELS: Record<Range, string> = {
  week: "This week",
  month: "This month",
  all: "All-time",
};

function fmt(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function StatsBoard({
  metricToggle = false,
  initialRange = "all",
}: {
  metricToggle?: boolean;
  initialRange?: Range;
}) {
  const [range, setRange] = useState<Range>(initialRange);
  const [metric, setMetric] = useState<Metric>("credited");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/stats/leaderboard?range=${range}&metric=${metric}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setRows(Array.isArray(d.rows) ? d.rows : []);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, metric]);

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition-colors ${
      active ? "bg-gold/20 text-gold-soft" : "text-cream-faint hover:text-cream-dim"
    }`;

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-full border border-obsidian/50 bg-ink-900 p-1">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={pill(range === r)}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {metricToggle && (
          <div className="flex gap-1 rounded-full border border-obsidian/50 bg-ink-900 p-1">
            <button onClick={() => setMetric("credited")} className={pill(metric === "credited")}>
              With multipliers
            </button>
            <button onClick={() => setMetric("raw")} className={pill(metric === "raw")}>
              Raw hours
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-obsidian/50 bg-ink-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-obsidian/50 text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">
              <th className="px-5 py-4 font-normal">#</th>
              <th className="px-5 py-4 font-normal">Pilot</th>
              <th className="px-5 py-4 font-normal">Rank</th>
              <th className="px-5 py-4 font-normal text-right">Flights</th>
              <th className="px-5 py-4 font-normal text-right">
                {metric === "raw" ? "Raw hours" : "Hours"}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-cream-faint">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-obsidian/30 last:border-0 transition-colors hover:bg-ink-850"
                >
                  <td className="px-5 py-4">
                    <span
                      className={`font-display text-xl ${
                        i < 3 ? "gold-text font-semibold" : "text-cream-faint"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-cream">{r.callsign}</span>
                    <span className="ml-2 text-cream-faint">{r.displayName}</span>
                  </td>
                  <td className="px-5 py-4 text-gold-soft">{r.rank}</td>
                  <td className="px-5 py-4 text-right text-cream-dim">{r.flights}</td>
                  <td className="px-5 py-4 text-right font-mono text-cream">
                    {fmt(r.minutes)}
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-cream-faint">
                  {range === "all"
                    ? "No approved flights yet — be the first on the board."
                    : `No flights logged ${RANGE_LABELS[range].toLowerCase()} yet.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
