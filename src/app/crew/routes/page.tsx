import { computeAp, categoryForMinutes, CAREER_CODESHARES, CARGO_CODESHARES } from "@/lib/career";
import { getRotw, getSpotlightRoutes, firstFlightNo, allRoutes, allAirlines, hydrateOps } from "@/lib/ops";
import { getPilotDashboard } from "@/lib/portal";
import { airportCity } from "@/lib/airports";
import { simbriefUrl } from "@/lib/simbrief";
import { RouteFinder, type EnrichedRoute } from "@/components/portal/RouteFinder";

export const metadata = { title: "Route Database" };
export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  await hydrateOps(); // load persisted codeshares/ROTD/ROTW before reading routes
  const d = await getPilotDashboard();
  const rankMult = d?.rankMultiplier ?? 1;
  const rotwNo = getRotw().routeNumber;
  const spotlightNos = new Set(getSpotlightRoutes().map((r) => r.routeNumber));

  // A codeshare partner's routes only appear once its network is unlocked
  // (Jet Airways is free; passenger partners cost AP, cargo partners cost LC).
  const pax = new Map(CAREER_CODESHARES.map((c) => [c.name, c]));
  const frt = new Map(CARGO_CODESHARES.map((c) => [c.name, c]));
  const ownedCs = new Set(d?.unlockedCodeshares ?? []);
  const unlocked = (airline: string) => {
    if (airline === "Xiamen Air Virtual") return true;
    if (ownedCs.has(airline)) return true; // purchased via the ledger
    const p = pax.get(airline);
    if (p?.free) return true;
    const f = frt.get(airline);
    if (f?.free) return true;
    return false;
  };

  const ALL = allRoutes().filter((r) => unlocked(r.airline));
  const routes: EnrichedRoute[] = ALL.map((r) => {
    const spotlight = spotlightNos.has(r.routeNumber);
    const ap = computeAp(r.minutes, { spotlight, rankMultiplier: rankMult }).net;
    return {
      routeNumber: r.routeNumber,
      flightNo: firstFlightNo(r),
      dep: r.dep,
      arr: r.arr,
      depCity: airportCity(r.dep),
      arrCity: airportCity(r.arr),
      aircraft: r.aircraft.replace(/^Xiamen Air |^Coastal Regional /, ""),
      minutes: r.minutes,
      airline: r.airline,
      category: categoryForMinutes(r.minutes),
      ap,
      spotlight,
      rotw: r.routeNumber === rotwNo,
      simbrief: simbriefUrl({ airlineIcao: r.airline === "Xiamen Air Virtual" ? "CXA" : "", flightNo: firstFlightNo(r), dep: r.dep, arr: r.arr, aircraft: r.aircraft }),
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="rise mb-6">
        <p className="eyebrow">Network</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Route database</h1>
        <p className="mt-3 max-w-2xl text-cream-dim">
          {ALL.length} routes across the Xiamen Air Virtual network and SkyTeam codeshares. Search by flight number, city or ICAO —
          each card shows the Strait Points you’d earn{rankMult > 1 ? ` at your ${d?.rank.current.name} rank` : ""}.
        </p>
      </header>

      <RouteFinder routes={routes} airlines={["All", ...allAirlines()]} />
    </div>
  );
}
