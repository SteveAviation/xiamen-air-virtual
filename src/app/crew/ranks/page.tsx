import Image from "next/image";
import { getPilotDashboard } from "@/lib/portal";
import { RANKS, LICENSES, TIERS } from "@/lib/career";

export const metadata = { title: "Rank Ladder" };
export const dynamic = "force-dynamic";

const RANK_COLOR: Record<string, string> = {
  Horizon: "#14A88F", Polaris: "#3B7BE0", Elysian: "#7A5CF0", Solstice: "#D98A1F",
  Zenith: "#D63A5E", Astralis: "#4A5BF0", Celestia: "#B645C8", Sovereign: "#C99A2E", Luminary: "#8AA0C8",
};

export default async function RanksPage() {
  const d = await getPilotDashboard();
  const currentN = d?.rank.current.n ?? 0;
  const hours = d?.totalHours ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <header className="rise">
        <p className="eyebrow">Progression</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream">The rank ladder</h1>
        <p className="mt-3 max-w-2xl text-cream-dim">
          Nine ranks from <span className="text-cream">Horizon</span> to <span className="text-cream">Luminary</span>. Every verified hour
          banks toward the next. The final three are exclusive ranks with special perks and privileges.
        </p>
      </header>

      {/* ladder */}
      <ol className="mt-8 space-y-3">
        {RANKS.map((r, i) => {
          const reached = hours >= r.hours;
          const isCurrent = r.n === currentN;
          return (
            <li key={r.name} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`flex items-stretch gap-4 rounded-2xl border p-4 transition-colors lift ${isCurrent ? "border-gold bg-gold/5" : reached ? "border-obsidian bg-ink-900" : "border-dashed border-obsidian bg-ink-900/60"}`}>
                <RankBadge name={r.name} n={r.n} dimmed={!reached} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`font-display text-xl font-semibold ${reached ? "text-cream" : "text-cream-faint"}`}>{r.name}</h2>
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-cream-dim">{r.hours.toLocaleString()}h+</span>
                    {r.group === "exclusive" && <span className="rounded-full bg-rose/10 px-2 py-0.5 text-xs text-rose">Exclusive</span>}
                    {r.apMultiplier && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">{r.apMultiplier}× AP</span>}
                    {isCurrent && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-white">You are here</span>}
                  </div>
                  <p className="mt-1 text-sm text-cream-dim">{r.blurb}</p>
                  {r.perks && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream-faint">
                      {r.perks.map((p) => <li key={p} className="flex items-center gap-1.5"><span className="text-gold">•</span>{p}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* licences + tiers reference */}
      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h2 className="font-display text-lg font-semibold text-cream">Pilot licences</h2>
          <p className="mt-1 text-sm text-cream-dim">Unlock fleet access with Strait Points.</p>
          <ul className="mt-4 space-y-2.5">
            {LICENSES.map((l) => (
              <li key={l.short} className="flex items-start justify-between gap-3 border-t border-obsidian/60 pt-2.5 text-sm">
                <div>
                  <span className="font-semibold text-cream">{l.name}</span>
                  <span className="ml-2 text-xs text-cream-faint">{l.apCost === 0 ? "Free" : `${l.apCost.toLocaleString()} AP`}</span>
                  <p className="text-xs text-cream-faint">Max flight time ≤{l.maxHours}h</p>
                </div>
                {(d?.apBalance ?? 0) >= l.cumulativeAp && <span className="text-xs text-gold">✓</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h2 className="font-display text-lg font-semibold text-cream">Egret Miles tiers</h2>
          <p className="mt-1 text-sm text-cream-dim">Cosmetic status from your Strait-Points balance.</p>
          <ul className="mt-4 space-y-2.5">
            {TIERS.map((t) => (
              <li key={t.name} className="flex items-center justify-between border-t border-obsidian/60 pt-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                  <span className="font-semibold text-cream">{t.name}</span>
                </span>
                <span className="text-xs text-cream-faint">{t.min.toLocaleString()}+ AP</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function RankBadge({ name, n, dimmed }: { name: string; n: number; dimmed: boolean }) {
  const color = RANK_COLOR[name] ?? "#3B7BE0";
  return (
    <div className="relative shrink-0 self-center">
      <Image
        src={`/ranks/${name.toLowerCase()}.png`}
        alt={`${name} insignia`}
        width={720}
        height={1440}
        className="h-20 w-auto object-contain"
        style={{ opacity: dimmed ? 0.4 : 1, filter: dimmed ? "grayscale(0.6)" : `drop-shadow(0 0 12px color-mix(in srgb, ${color} 45%, transparent))` }}
      />
      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white ring-2 ring-ink-900" style={{ background: dimmed ? "var(--color-ink-700)" : color }}>{n}</span>
    </div>
  );
}
