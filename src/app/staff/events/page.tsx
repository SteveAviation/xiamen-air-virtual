import { listNews } from "@/lib/db";
import { getSpotlightRoutes, spotlightOptions, firstFlightNo, hydrateOps } from "@/lib/ops";
import { getOpsConfig } from "@/lib/opsStore";
import { airportCity } from "@/lib/airports";
import { fmtHours } from "@/lib/portal";
import { MultiplierManager } from "@/components/MultiplierManager";
import { SpotlightManager } from "@/components/SpotlightManager";
import { PostRotdButton } from "@/components/PostRotdButton";
import { EventsAdmin } from "@/components/EventsAdmin";

export const dynamic = "force-dynamic";

export default async function CrewEventsPage() {
  await hydrateOps();
  const [posts, opsCfg] = await Promise.all([listNews(), getOpsConfig()]);
  const spotlights = getSpotlightRoutes();
  const options = spotlightOptions().map((r) => ({
    routeNumber: r.routeNumber,
    label: `${firstFlightNo(r)} · ${airportCity(r.dep)} → ${airportCity(r.arr)} (${fmtHours(r.minutes)})`,
  }));

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-cream">Spotlight &amp; Events Planner</h2>
          <p className="mt-1 text-sm text-cream-dim">Choose spotlight routes, tune multipliers, and publish events — all surfaced on the pilot dashboard.</p>
        </div>
        <PostRotdButton />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose">Spotlight route planner</p>
          <p className="mt-2 text-sm text-cream-dim">Pick up to 3 routes. They surface on pilot dispatch and pay <span className="text-cream">×2 AP</span> (career) or <span className="text-cream">×2 LC</span> (cargo) when they appear. Leave blank to auto-rotate.</p>
          <div className="mt-4">
            <SpotlightManager
              options={options}
              current={opsCfg.spotlightNos ?? []}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose">Currently live · ×2</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {spotlights.map((s) => (
              <li key={s.routeNumber} className="rounded-full bg-rose/10 px-3 py-1 text-sm text-rose">
                {firstFlightNo(s)} · {airportCity(s.dep)} → {airportCity(s.arr)}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-faint">
            {opsCfg.spotlightNos?.length ? "Staff-selected spotlight routes." : "Auto-rotated weekly (no staff selection set)."} Double rewards on these sectors.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-obsidian/60 pt-8">
        <MultiplierManager initial={opsCfg.multipliers} />
      </div>

      <div className="mt-8 border-t border-obsidian/60 pt-8">
        <EventsAdmin posts={posts} />
      </div>
    </section>
  );
}
