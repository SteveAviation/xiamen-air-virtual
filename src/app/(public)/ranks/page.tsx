import Image from "next/image";
import { RANKS } from "@/lib/career";

export const metadata = { title: "Ranks" };

/* A signature colour per rank, matched to its insignia, legible in both themes. */
const RANK_COLOR: Record<string, string> = {
  Horizon: "#14A88F",
  Polaris: "#3B7BE0",
  Elysian: "#7A5CF0",
  Solstice: "#D98A1F",
  Zenith: "#D63A5E",
  Astralis: "#4A5BF0",
  Celestia: "#B645C8",
  Sovereign: "#C99A2E",
  Luminary: "#8AA0C8",
};

const maxHours = RANKS[RANKS.length - 1].hours;

export default function RanksPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-20">
      <header className="reveal">
        <p className="eyebrow">Pilot career progression</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream lg:text-5xl">Nine ranks. One ascent.</h1>
        <p className="lead mt-4 max-w-2xl text-cream-dim">Each rank earns its own insignia. Climb from Horizon to Luminary as you accumulate flight hours, unlocking new aircraft, routes and privileges — the final three are exclusive ranks with special perks and privileges.</p>
      </header>

      <div className="mt-10 space-y-4">
        {RANKS.map((r, idx) => {
          const color = RANK_COLOR[r.name] ?? "#3B7BE0";
          const start = idx === 0;
          const summit = idx === RANKS.length - 1;
          const pct = Math.max(Math.round((r.hours / maxHours) * 100), 5);
          return (
            <div
              key={r.name}
              className="rise group relative overflow-hidden rounded-2xl border p-5 transition-colors sm:p-6"
              style={{ animationDelay: `${idx * 55}ms`, borderColor: `color-mix(in srgb, ${color} 38%, transparent)`, background: `linear-gradient(180deg, color-mix(in srgb, ${color} 6%, var(--color-ink-900)), var(--color-ink-900))` }}
            >
              {/* Progress fill — how far this rank sits up the 5,000h ladder */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 opacity-[0.10] transition-opacity duration-500 group-hover:opacity-[0.18]"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, transparent)` }}
              />

              <div className="relative flex items-center gap-4 sm:gap-6">
                {/* Insignia */}
                <div className="relative shrink-0">
                  <Image
                    src={`/ranks/${r.name.toLowerCase()}.png`}
                    alt={`${r.name} rank insignia`}
                    width={720}
                    height={1440}
                    className="h-24 w-auto object-contain drop-shadow-lg sm:h-28"
                    style={{ filter: `drop-shadow(0 0 14px color-mix(in srgb, ${color} 45%, transparent))` }}
                  />
                  <span className="absolute -right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white ring-2 ring-ink-900" style={{ background: color }}>{r.n}</span>
                </div>

                {/* Detail */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold sm:text-2xl" style={{ color }}>{r.name}</h2>
                    {start && <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white" style={{ background: color }}>Start here</span>}
                    {summit && <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white" style={{ background: color }}>Summit</span>}
                    {r.group === "exclusive" && <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-rose">Exclusive</span>}
                    {r.apMultiplier && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[0.65rem] text-gold">{r.apMultiplier}× AP</span>}
                  </div>
                  <p className="mt-1 text-sm text-cream-dim">{r.blurb}</p>
                  {r.perks && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream-faint">
                      {r.perks.map((p) => <li key={p} className="flex items-center gap-1.5"><span style={{ color }}>•</span>{p}</li>)}
                    </ul>
                  )}
                </div>

                {/* Hours */}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-display text-3xl font-semibold" style={{ color }}>{r.hours.toLocaleString()}</p>
                  <p className="text-[0.65rem] uppercase tracking-widest text-cream-faint">hours</p>
                </div>
              </div>

              {/* Hours — mobile inline */}
              <p className="relative mt-3 text-sm text-cream-faint sm:hidden">{r.hours === 0 ? "Entry rank — every pilot starts here" : `${r.hours.toLocaleString()} flight hours`}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center font-display text-lg text-cream-dim">Nine ranks. Five thousand hours.</p>
    </div>
  );
}
