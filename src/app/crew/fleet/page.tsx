import Link from "next/link";
import { getPilotDashboard } from "@/lib/portal";
import { fleetByType, fleetSummary } from "@/lib/fleet";
import { FleetBoard } from "@/components/portal/FleetBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Fleet" };

export default async function LiveFleetPage() {
  const d = await getPilotDashboard();
  const pilotName = d ? d.session.displayName.split(" ").slice(0, 2).join(" ") : "You";
  const groups = fleetByType();
  const s = fleetSummary();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      {/* Header */}
      <header className="rise overflow-hidden rounded-3xl border border-obsidian">
        <div className="brand-wash relative px-6 py-8 lg:px-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #3b6fe0, transparent 70%)" }} />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.3em] text-white/55">Live Operations</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white lg:text-5xl">Live Fleet</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Every tail in the Xiamen Air Virtual fleet, where it sits right now, and who&apos;s flying it. Live Mode runs <span className="font-medium text-white">on top of Career and Cargo</span> — claim an idle jet and fly its dispatch from one of our hubs.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["Aircraft", s.total],
                ["At a hub", s.atHub],
                ["Away", s.away],
                ["Idle", s.idle],
                ["Ferry flights", s.ferryAvailable],
              ].map(([k, v]) => (
                <span key={k as string} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                  <span className="font-semibold">{v}</span> <span className="text-white/60">{k}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Staff-only-at-launch notice */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/[0.05] px-5 py-4 text-sm">
        <span aria-hidden className="mt-0.5 text-gold">🔒</span>
        <p className="text-cream-dim">
          <span className="font-semibold text-cream">Demo preview.</span> Live Fleet is staff-only at launch and will open to all pilots once Infinite Flight exposes a public live-tracking feature. Assignments below are for demonstration only.
        </p>
      </div>

      {/* How Live Mode works */}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { t: "Claim an idle jet", b: "If a fleet aircraft is unoccupied, assign yourself to fly its Career or Cargo dispatch — via staff, or through Egret later." },
          { t: "Hub-to-hub only", b: "Every fleet flight departs or arrives at Xiamen or Fuzhou. One fleet flight per pilot per day." },
          { t: "Spotlight ferry · 1.5×", b: "An aircraft stranded away from a hub triggers a ferry flight home — claim it for 1.5× Strait Points or Logistic Coins, your choice." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-obsidian bg-ink-900 p-5">
            <h3 className="font-display text-base font-semibold text-cream">{c.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{c.b}</p>
          </div>
        ))}
      </section>

      {/* Spotlight ferry explainer */}
      {s.ferryAvailable > 0 && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/[0.04] px-5 py-4">
          <p className="text-sm font-semibold text-gold">✦ {s.ferryAvailable} spotlight ferry flights available</p>
          <p className="mt-1 text-sm text-cream-dim">
            These tails are sitting away from base. A limited-time spotlight flight is offered to random pilots to bring each one home — fail to claim it and staff will ferry it back. Reward: <span className="font-medium text-cream">1.5× AP or LC</span>.
          </p>
        </div>
      )}

      {/* The fleet */}
      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-cream">The fleet</h2>
        <p className="mt-1 text-sm text-cream-faint">Aircraft away from a hub are highlighted — those are your ferry opportunities.</p>
        <div className="mt-5">
          <FleetBoard groups={groups} pilotName={pilotName} />
        </div>
      </section>

      {/* Events note */}
      <section className="mt-6 rounded-2xl border border-obsidian bg-ink-900 px-5 py-4">
        <h2 className="font-display text-base font-semibold text-cream">Events</h2>
        <p className="mt-1 text-sm leading-relaxed text-cream-dim">
          Staff flying an event are guaranteed a fleet aircraft, assigned 12 hours before the event begins. Any aircraft left unclaimed is opened to pilots on a first-come, first-served basis.
        </p>
        <Link href="/crew/routes" className="mt-3 inline-flex text-sm text-gold hover:underline">See upcoming events →</Link>
      </section>
    </div>
  );
}
