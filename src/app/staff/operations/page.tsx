import { AP_TABLE, CARGO_TABLE, LICENSES, CARGO_CERTS } from "@/lib/career";

export const dynamic = "force-dynamic";

const PLANNED = [
  { title: "Tune AP & LC payouts", body: "Adjust the net Strait-Points / Logistics-Credits per flight category and risk band without a redeploy." },
  { title: "Override the daily dispatch", body: "Pin or swap any of a pilot's 3 daily assignments, or push a network-wide bonus contract." },
  { title: "Delivery ferries", body: "Schedule the periodic high-yield aircraft-delivery missions (1–3 days/week) into the cargo board." },
  { title: "Cargo route base", body: "Drop in the dedicated freighter destinations you're finalising — Cargo dispatch will draw from them instead of passenger routes." },
];

export default function CrewOperationsPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-semibold text-cream">Career &amp; Cargo control</h2>
        <span className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-600">In development</span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-cream-dim">
        The economy is already live and driving the pilot portal. This panel is where staff will tune and override it.
        Every pilot currently receives <span className="font-semibold text-cream">3 auto-dispatched flights per day</span> in both
        Career and Cargo, generated from a daily seed and refreshed at midnight.
      </p>

      {/* live config (read-only for now) */}
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h3 className="font-display text-base font-semibold text-cream">Career · Strait Points (live)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(["regional", "continental", "longhaul"] as const).map((c) => (
              <li key={c} className="flex items-center justify-between border-t border-obsidian/60 pt-2"><span className="text-cream-dim">{AP_TABLE[c].label}</span><span className="font-semibold text-cream">✦ {AP_TABLE[c].net.toLocaleString()}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-faint">Licences: {LICENSES.map((l) => `${l.short} (${l.apCost === 0 ? "free" : l.apCost.toLocaleString() + " AP"})`).join(" · ")}</p>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h3 className="font-display text-base font-semibold text-cream">Cargo · Logistics Credits (live)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(["low", "medium", "high"] as const).map((r) => (
              <li key={r} className="flex items-center justify-between border-t border-obsidian/60 pt-2"><span className="text-cream-dim">{CARGO_TABLE[r].label}</span><span className="font-semibold text-cream">◆ {CARGO_TABLE[r].net.toLocaleString()} · ×{CARGO_TABLE[r].multiplier}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-faint">Certs: {CARGO_CERTS.map((c) => `${c.name} (${c.hours}h)`).join(" · ")}</p>
        </div>
      </div>

      {/* planned controls */}
      <h3 className="mt-9 font-display text-lg font-semibold text-cream">Planned controls</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {PLANNED.map((p) => (
          <div key={p.title} className="rounded-2xl border border-dashed border-obsidian bg-ink-900/60 p-5">
            <p className="flex items-center gap-2 font-medium text-cream"><span className="text-amber-600">⚙</span> {p.title}</p>
            <p className="mt-1 text-sm text-cream-dim">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
