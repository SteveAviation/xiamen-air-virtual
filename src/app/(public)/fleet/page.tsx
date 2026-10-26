import Image from "next/image";
import { SITE_FLEET } from "@/lib/site";

export const metadata = { title: "Fleet" };

/* Map each fleet type to its livery render in /public/fleet. */
const RENDER: Record<string, string> = {
  "Boeing 737-800": "B737800", "Boeing 737 MAX 8": "B737MAX8",
  "Boeing 787-8": "B7878", "Boeing 787-9": "B7879",
};

/* Types without an official Xiamen Air livery in Infinite Flight (flown generic). */
const GENERIC = new Set<string>([]);

/* A representative route each type typically operates. */
const TYPICAL: Record<string, string> = {
  "Boeing 737-800": "Xiamen–Shanghai (ZSAM–ZSPD)",
  "Boeing 737 MAX 8": "Xiamen–Singapore (ZSAM–WSSS)",
  "Boeing 787-8": "Xiamen–Tokyo (ZSAM–RJTT)",
  "Boeing 787-9": "Xiamen–Amsterdam (ZSAM–EHAM)",
};

export default function FleetPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
      <header className="reveal">
        <p className="eyebrow">The fleet</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream lg:text-5xl">Four types. One livery.</h1>
        <p className="lead mt-4 max-w-2xl text-cream-dim">Every aircraft in our fleet earns its place — the 737-800 and 737 MAX 8 feed the trunk network across China and Asia, while the 787-8 and 787-9 push to Japan, Europe and North America. One all-Boeing family, one livery.</p>
      </header>

      <div className="mt-8 flex flex-wrap gap-6 text-sm">
        {[["Aircraft", "4"], ["Destinations", "83"], ["Longest range", "7,635 nm"]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-obsidian bg-ink-900 px-5 py-3 lift">
            <p className="text-xs uppercase tracking-wide text-cream-faint">{k}</p>
            <p className="font-display text-xl font-semibold text-cream">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SITE_FLEET.map((a, i) => (
          <div
            key={a.type}
            className={`rise group flex flex-col overflow-hidden rounded-2xl border bg-ink-900 lift ${a.historic ? "halo border-transparent" : "border-obsidian"}`}
            style={a.historic ? ({ animationDelay: `${i * 60}ms`, "--halo": a.accent } as React.CSSProperties) : { animationDelay: `${i * 60}ms` }}
          >
            {/* Image stage — fixed height, graphic centred & uniformly contained */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-b from-ink-850 to-ink-900" style={a.historic ? { background: `linear-gradient(180deg, color-mix(in srgb, ${a.accent} 18%, transparent), transparent)` } : undefined}>
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <Image src={`/fleet/${RENDER[a.type] ?? "A320"}.webp`} alt={`Xiamen Air ${a.type}`} width={1016} height={706} className="max-h-[90%] w-auto max-w-[96%] object-contain transition-transform duration-700 group-hover:scale-105" />
              </div>
              <span className="absolute left-4 top-3 rounded px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide backdrop-blur" style={a.historic ? { background: `color-mix(in srgb, ${a.accent} 22%, transparent)`, color: a.accent } : undefined}>
                <span className={a.historic ? "" : "text-gold"}>{a.family}</span>
              </span>
              <span className="absolute right-4 top-3 font-mono text-xs text-cream-faint">{a.reg}</span>
            </div>
            <div className="flex flex-1 flex-col px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-cream">{a.type}</h2>
                {GENERIC.has(a.type) && (
                  <span className="rounded bg-rock/25 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-cream-dim" title="No official Xiamen Air livery in Infinite Flight">Generic livery</span>
                )}
                {a.historic && (
                  <span className="rounded px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${a.accent} 18%, transparent)`, color: a.accent }}>Group flights only</span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{a.role}</p>
              {TYPICAL[a.type] && (
                <p className="mt-2 text-xs text-cream-faint"><span className="font-medium text-cream-dim">Typical route:</span> {TYPICAL[a.type]}</p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {[["PAX", a.pax], ["Range", `${a.rangeNm.toLocaleString()} nm`], ["Cruise alt", a.cruiseAlt], ["Cruise", a.cruiseSpeed], ["Engines", a.engines], ["Acquired", a.acquired]].map(([k, v]) => (
                  <div key={k as string} className="border-t border-obsidian/50 pt-2">
                    <dt className="text-[0.7rem] uppercase tracking-wide text-cream-faint">{k}</dt>
                    <dd className="text-cream">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-auto border-t border-obsidian/50 pt-3 text-xs text-cream-faint">{a.historic ? "Reserved for group flights & events" : `Operates on ${a.routesFlown} routes in our network`}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
