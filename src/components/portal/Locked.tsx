import Link from "next/link";

/* Shown when a pilot hasn't reached the rank that unlocks a section. */
export function Locked({
  title,
  rank,
  hours,
  current,
  blurb,
  accent = "gold",
}: {
  title: string;
  rank: string;
  hours: number;
  current: number; // pilot's current hours
  blurb: string;
  accent?: "gold" | "rose";
}) {
  const pct = Math.min(100, Math.round((current / hours) * 100));
  const toGo = Math.max(0, Math.ceil(hours - current));
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center lg:px-8">
      <div className="rise mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-white" style={{ background: accent === "rose" ? "linear-gradient(135deg,#7f1894,#0c0243)" : "linear-gradient(135deg,#0c0243,#3a1f7a)" }}>🔒</div>
      <h1 className="rise mt-5 font-display text-3xl font-semibold text-cream">{title}</h1>
      <p className="rise mx-auto mt-3 max-w-md text-cream-dim">{blurb}</p>
      <div className="rise mx-auto mt-7 max-w-sm rounded-2xl border border-obsidian bg-ink-900 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream-dim">Unlocks at <span className="font-semibold text-cream">{rank}</span></span>
          <span className="text-cream-faint">{hours.toLocaleString()}h</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800">
          <div className="bar-fill h-full rounded-full" style={{ ["--to" as string]: `${pct}%`, background: accent === "rose" ? "linear-gradient(90deg,#7f1894,#c451d6)" : "linear-gradient(90deg,#0c0243,#7b6cf0)" }} />
        </div>
        <p className="mt-2 text-xs text-cream-faint">{toGo.toLocaleString()} more flight hours to go</p>
      </div>
      <Link href="/crew/file" className="rise mt-6 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-medium text-white">Keep flying</Link>
    </div>
  );
}
