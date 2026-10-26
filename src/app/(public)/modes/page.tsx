import { SITE_MODES } from "@/lib/site";

export const metadata = { title: "Modes" };

/* Theme-safe accents — the old Career navy (#0c0243) was invisible on the dark
   surface, so each mode now uses a colour legible in both light and dark. */
const ACCENTS = ["#12B5A8", "#3B6FE0", "#A855C7"]; // Casual · Career · Cargo

/* Mode glyphs. Drop-in square logos can replace these later. */
const GLYPHS = [
  // Casual — paper plane
  <path key="c" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  // Career — briefcase
  <g key="career"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></g>,
  // Cargo — box
  <g key="cargo"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></g>,
];

export default function ModesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
      <header className="reveal">
        <p className="eyebrow">How you fly</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream lg:text-5xl">How you fly matters.</h1>
        <p className="lead mt-4 max-w-2xl text-cream-dim">Three modes. One career. Pick the mode that fits how you fly, and switch between them as your rank and availability change — your hours and AP carry across.</p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {SITE_MODES.map((m, i) => {
          const accent = ACCENTS[i];
          return (
            <div key={m.name} className="rise flex flex-col rounded-xl border border-obsidian bg-ink-900 p-6 lift" style={{ animationDelay: `${i * 70}ms`, borderTop: `3px solid ${accent}` }}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: accent }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{GLYPHS[i]}</svg>
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-cream">{m.name}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{m.unlock}</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-cream-dim">{m.tagline}</p>
              <p className="mt-2 text-sm leading-relaxed text-cream-dim">{m.desc}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-cream-faint">Best for</p>
              <p className="text-sm text-cream-dim">{m.bestFor}</p>
              <ul className="mt-4 space-y-1.5 border-t border-obsidian/60 pt-4 text-sm">
                {m.pros.map((p) => <li key={p} className="flex items-start gap-2 text-cream-dim"><span style={{ color: accent }}>✓</span>{p}</li>)}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-cream">At a glance</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-obsidian bg-ink-900">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-obsidian/60 text-xs uppercase tracking-wide text-cream-faint">
                <th className="px-5 py-3 font-normal">Mode</th><th className="px-5 py-3 font-normal">Unlock</th><th className="px-5 py-3 font-normal">Schedule</th><th className="px-5 py-3 font-normal">Reward</th><th className="px-5 py-3 font-normal">Aircraft scope</th>
              </tr>
            </thead>
            <tbody>
              {SITE_MODES.map((m) => (
                <tr key={m.name} className="border-t border-obsidian/40">
                  <td className="px-5 py-3 font-medium text-cream">{m.name}</td>
                  <td className="px-5 py-3 text-cream-dim">{m.unlock}</td>
                  <td className="px-5 py-3 text-cream-dim">{m.name === "Casual Mode" ? "Flexible" : m.name === "Career Mode" ? "Rostered" : "Contract"}</td>
                  <td className="px-5 py-3 text-cream-dim">{m.multiplier}</td>
                  <td className="px-5 py-3 text-cream-dim">{m.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
