import {
  ifConfigured,
  getFlightsByCallsignSuffix,
  getLiveryMap,
  getFlightRoute,
  getFlightTrack,
} from "@/lib/infiniteflight";
import { ROUTES } from "@/lib/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Normalise any aircraft string to the Boeing fleet tokens it covers
   (B737-800 / B737 MAX 8 / B787-8 / B787-9). A route may list two types. */
function fleetToks(name: string | null | undefined): string[] {
  const n = (name ?? "").toUpperCase();
  const out: string[] = [];
  if (n.includes("737 MAX")) out.push("B737MAX8");
  if (n.includes("737-800")) out.push("B737800");
  if (n.includes("787-8")) out.push("B7878");
  if (n.includes("787-9")) out.push("B7879");
  return out;
}

/* Xiamen Air route pairs ("DEP|ARR") → the aircraft tokens flown on them. Built
   once from the route database; a live flight must match one to be shown. */
const XMN_ROUTES = (() => {
  const map = new Map<string, Set<string>>();
  for (const r of ROUTES) {
    if (r.airline !== "Xiamen Air Virtual") continue;
    const key = `${r.dep.toUpperCase()}|${r.arr.toUpperCase()}`;
    if (!map.has(key)) map.set(key, new Set());
    for (const tok of fleetToks(r.aircraft)) map.get(key)!.add(tok);
  }
  return map;
})();

// Xiamen Air Virtual flights airborne right now (callsign contains "Xiamen Air Virtual"),
// limited to flights whose route is in our database (Expert server only).
export async function GET() {
  if (!ifConfigured) {
    return Response.json({ configured: false, flights: [] });
  }

  const [flights, liveries] = await Promise.all([
    getFlightsByCallsignSuffix("XIAMEN AIR"),
    getLiveryMap(),
  ]);

  // Per-flight: filed route (origin/dest + planned path) and the real track.
  const details = await Promise.all(
    flights.map(async (f) => {
      const [route, track] = await Promise.all([
        getFlightRoute(f.sessionId, f.flightId).catch(() => null),
        getFlightTrack(f.sessionId, f.flightId).catch(() => []),
      ]);
      return { route, track };
    }),
  );

  const out = flights
    .map((f, i) => {
      const liv = f.liveryId ? liveries.get(f.liveryId) : undefined;
      const { route, track } = details[i];

      // Must fly a route in our database, with an appropriate aircraft.
      const origin = (route?.origin ?? "").toUpperCase();
      const dest = (route?.destination ?? "").toUpperCase();
      if (!origin || !dest) return null;
      const allowed = XMN_ROUTES.get(`${origin}|${dest}`);
      if (!allowed) return null; // route not in our database → skip
      const acToks = fleetToks(liv?.aircraftName);
      if (acToks.length && allowed.size > 0 && !acToks.some((t) => allowed.has(t))) return null; // wrong aircraft

      return {
        id: f.flightId,
        callsign: f.callsign,
        lat: f.latitude,
        lon: f.longitude,
        altitude: Math.round(f.altitude),
        speed: Math.round(f.speed),
        heading: Math.round(f.heading ?? f.track ?? 0),
        server: f.sessionName,
        aircraft: liv?.aircraftName ?? null,
        livery: liv?.liveryName ?? null,
        origin: route?.origin ?? null,
        destination: route?.destination ?? null,
        originLoc: route?.originLoc ?? null,
        destinationLoc: route?.destinationLoc ?? null,
        plannedPath: route?.plannedPath ?? [],
        track, // actual flown path (downsampled lat/lon)
      };
    })
    .filter((f) => f !== null);

  return Response.json({ configured: true, flights: out });
}
