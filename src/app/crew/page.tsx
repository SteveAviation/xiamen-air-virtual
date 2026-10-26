import Link from "next/link";
import { getPilotDashboard, fmtHours, fmtDate, timeAgo } from "@/lib/portal";
import { punctualityBonus } from "@/lib/career";
import { getRotd, ROTD_MULTIPLIER, getSpotlightRoutes, getDispatches, getCargoContracts, firstFlightNo } from "@/lib/ops";
import { listNews } from "@/lib/db";
import { airportCity } from "@/lib/airports";
import { fleetSummary } from "@/lib/fleet";
import { CountUp } from "@/components/portal/CountUp";
import { DispatchSwitcher, type DispatchLite, type CargoLite } from "@/components/portal/DispatchSwitcher";
import { PilotLogin } from "@/components/portal/PilotLogin";

export const dynamic = "force-dynamic";

const HAUL_COLOR: Record<string, string> = { Short: "#12B5A8", Medium: "#3B6FE0", Long: "#A855C7" };

export default async function Dashboard() {
  const d = await getPilotDashboard();
  // The crew layout already gates unauthenticated/demo visitors to the pilot
  // sign-in screen; this is a defensive fallback if the session lapses.
  if (!d || d.session.demo) return <PilotLogin />;

  const { rank, tier, license } = d;
  const rotd = getRotd();
  const spotlights = getSpotlightRoutes();
  const fleet = fleetSummary();
  const firstName = d.session.displayName.split(" ")[0];
  const events = (await listNews(4)).filter((e) => e.category !== "Route of the Week").slice(0, 2);

  // Career dispatch → serialisable, ICAO-coded, "potential" AP (band max).
  const career: DispatchLite[] = (d.gates.career
    ? getDispatches(d.session.pilotId, { authorizedFleet: d.fleet, punctualBonus: punctualityBonus(d.license.current.short), allowedHauls: d.allowedHauls })
    : []
  ).map((dp) => ({
    id: dp.id, dep: dp.dep, arr: dp.arr, depCity: airportCity(dp.dep), arrCity: airportCity(dp.arr),
    flightNo: dp.flightNo, timeLabel: fmtHours(dp.minutes), spotlight: dp.spotlight, potentialAp: dp.potentialAp,
  }));

  // Cargo dispatch → serialisable, ICAO-coded, "potential" LC.
  const cargo: CargoLite[] = (d.gates.cargo
    ? getCargoContracts(d.session.pilotId, d.cargoHours, d.lcBalance)
    : []
  ).map((c) => ({
    id: c.id, dep: c.dep, arr: c.arr, depCity: airportCity(c.dep), arrCity: airportCity(c.arr),
    flightNo: c.flightNo, timeLabel: fmtHours(c.minutes), riskLabel: c.riskLabel, potentialLc: c.lc,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      {/* ============ HERO ============ */}
      <section className="rise overflow-hidden rounded-3xl border border-obsidian">
        <div className="brand-wash relative px-6 py-8 lg:px-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #3b6fe0, transparent 70%)" }} />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-white/55">Welcome back, captain</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white lg:text-5xl">{firstName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-sm font-medium text-white">
                  <span className="h-2 w-2 rounded-full" style={{ background: tier.current.accent }} />
                  Rank {rank.current.n} · {rank.current.name}
                </span>
                <span className="rounded-full border border-white/25 px-3 py-1 text-sm text-white/80">{license.current.short} licence</span>
              </div>
            </div>
            {/* Balances — AP headline, LC comparatively smaller */}
            <div className="shrink-0 rounded-2xl bg-white/8 px-6 py-5 ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Strait Points · {tier.current.name}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl text-rose-soft">✦</span>
                <CountUp value={d.apBalance} className="tnum font-display text-4xl font-semibold text-white lg:text-5xl" />
              </p>
              <div className="mt-2.5 flex items-center gap-2 border-t border-white/15 pt-2.5">
                <span className="text-sm text-white/70">◈</span>
                <span className="tnum font-display text-lg font-semibold text-white/90">{d.lcBalance.toLocaleString()}</span>
                <span className="text-xs text-white/55">Logistic Coins</span>
              </div>
              <p className="mt-1 text-xs text-white/55">{tier.next ? `${tier.apToNext!.toLocaleString()} AP to ${tier.next.name}` : "Top tier achieved ✦"}</p>
            </div>
          </div>
          {/* rank progress */}
          <div className="relative mt-7">
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
              <span>{rank.current.name}</span>
              <span>{rank.next ? <>{Math.round(rank.hoursToNext!).toLocaleString()}h to <span className="font-semibold text-white">{rank.next.name}</span></> : "Highest rank attained"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
              <div className="bar-fill h-full rounded-full" style={{ ["--to" as string]: `${rank.pct}%`, background: "linear-gradient(90deg,#7aa0ff,#3b6fe0)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ KPI + LIVE FLEET ============ */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Flight time", value: fmtHours(d.totalMinutes) },
          { label: "PIREPs filed", value: d.totalPireps.toLocaleString() },
          { label: "Last PIREP", value: timeAgo(d.lastPirepAt), sub: fmtDate(d.lastPirepAt) },
          { label: "Next rank", value: rank.next ? rank.next.name : "Maxed", sub: rank.next ? `${Math.round(rank.hoursToNext!)}h to go` : "Luminary" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-obsidian bg-ink-900 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-cream-faint">{c.label}</p>
            <p className="mt-1.5 font-display text-xl font-semibold text-cream">{c.value}</p>
            {c.sub && <p className="text-xs text-cream-faint">{c.sub}</p>}
          </div>
        ))}
      </section>

      {/* Live Fleet strip */}
      <Link href="/crew/fleet" className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-obsidian bg-ink-900 px-5 py-3.5 lift">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">✈</span>
          <div>
            <p className="text-sm font-semibold text-cream">Live Fleet</p>
            <p className="text-xs text-cream-faint">{fleet.total} aircraft · {fleet.idle} idle · {fleet.ferryAvailable} ferry flights available</p>
          </div>
        </div>
        <span className="text-sm text-gold">Open →</span>
      </Link>

      {/* ============ SPOTLIGHT (separate, highlighted) ============ */}
      {spotlights.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-gold/40 bg-gold/[0.05]">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">★ Spotlight routes · 2× Strait Points</p>
            <span className="text-xs text-cream-faint">Limited-time bonus sectors</span>
          </div>
          <ul className="divide-y divide-gold/15">
            {spotlights.map((s) => (
              <li key={s.routeNumber} className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="min-w-0 truncate text-sm font-medium text-cream">
                  {airportCity(s.dep)} <span className="text-cream-faint">({s.dep})</span> → {airportCity(s.arr)} <span className="text-cream-faint">({s.arr})</span>
                </p>
                <span className="shrink-0 text-xs text-cream-faint">{firstFlightNo(s)} · {fmtHours(s.minutes)}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-gold/15 px-5 py-2.5 text-xs text-cream-faint">
            The 2× bonus only applies when a spotlight sector appears on your <span className="text-cream-dim">Career or Cargo dispatch</span> — flying it casually earns the standard reward.
          </p>
        </section>
      )}

      {/* ============ ROUTE OF THE DAY + DISPATCH ============ */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Route of the Day — 6 staff-set routes, flat 2× flight-time multiplier */}
        <div className="rise overflow-hidden rounded-2xl border border-obsidian bg-ink-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-obsidian/70 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">✦ Route of the Day</p>
            <span className="text-xs text-cream-faint">{ROTD_MULTIPLIER}× flight-time multiplier</span>
          </div>
          <div className="grid gap-px bg-obsidian/40 sm:grid-cols-2">
            {rotd.map(({ route: r, haul }) => (
              <div key={r.routeNumber} className="bg-ink-900 px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white" style={{ background: HAUL_COLOR[haul] }}>{haul} haul</span>
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[0.6rem] font-semibold text-gold">{ROTD_MULTIPLIER}× time</span>
                </div>
                <p className="mt-2 text-sm font-medium text-cream">
                  {airportCity(r.dep)} <span className="text-cream-faint">({r.dep})</span> <span className="text-gold">→</span> {airportCity(r.arr)} <span className="text-cream-faint">({r.arr})</span>
                </p>
                <p className="mt-0.5 text-xs text-cream-faint">{firstFlightNo(r)} · {r.aircraft.replace(/^Xiamen Air |^Coastal Regional /, "")} · {fmtHours(r.minutes)}</p>
              </div>
            ))}
          </div>
          <Link href="/crew/file" className="block border-t border-obsidian/60 px-6 py-3 text-center text-sm text-gold hover:underline">File a Route of the Day PIREP →</Link>
        </div>

        {/* Today's dispatch — Career / Cargo toggle */}
        <DispatchSwitcher career={career} cargo={cargo} careerOpen={d.gates.career} cargoOpen={d.gates.cargo} />
      </section>

      {/* ============ EVENTS (thin) ============ */}
      {events.length > 0 && (
        <section className="mt-4 rounded-2xl border border-obsidian bg-ink-900 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-cream">Events & group flights</p>
            <Link href="/crew/routes" className="text-xs text-cream-faint hover:text-cream">View all</Link>
          </div>
          <ul className="mt-2.5 space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${e.category === "Group Flight" ? "bg-rose/10 text-rose" : "bg-ink-800 text-cream-faint"}`}>{e.category}</span>
                <span className="truncate text-cream-dim">{e.title}</span>
                {e.eventAt && <span className="ml-auto shrink-0 text-xs text-cream-faint">{new Date(e.eventAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ EXPLORE (slim pills) ============ */}
      <section className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Pill href="/crew/routes" label="Route database" />
          <Pill href="/crew/map" label="Live map" />
          <Pill href="/crew/logbook" label="Logbook" />
          <Pill href="/crew/cargo" label="Cargo" locked={!d.gates.cargo} />
          <Pill href="/crew/fleet" label="Live Fleet" />
          <Pill href="/crew/discover" label="SkyTeam Discover" locked={!d.gates.discover} />
        </div>
      </section>
    </div>
  );
}

function Pill({ href, label, locked }: { href: string; label: string; locked?: boolean }) {
  return (
    <Link href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors lift ${
        locked ? "border-dashed border-obsidian bg-ink-900/60 text-cream-faint" : "border-obsidian bg-ink-900 text-cream-dim hover:text-cream"
      }`}>
      {label}
      {locked ? <span className="text-xs">🔒</span> : <span className="text-cream-faint">→</span>}
    </Link>
  );
}
