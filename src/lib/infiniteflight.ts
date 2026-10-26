/* ----------------------------------------------------------------
   Infinite Flight Live API v2 client.

   Dormant until IF_API_KEY is set. Endpoints follow the documented
   IF Live API v2 — VERIFY shapes against a real key when wiring up
   (the API key is free from the IF Connect program).

   Base: https://api.infiniteflight.com/public/v2
   Auth: Authorization: Bearer <IF_API_KEY>
------------------------------------------------------------------- */

const BASE = "https://api.infiniteflight.com/public/v2";

export const ifConfigured = !!process.env.IF_API_KEY;

async function ifFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const key = process.env.IF_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      // IF data changes constantly; never cache.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    // IF wraps payloads as { errorCode, result }.
    return (json?.result ?? json) as T;
  } catch {
    return null;
  }
}

export type IfUser = {
  userId: string;
  discourseUsername: string | null;
  grade: number | null;
  flightTime: number | null; // minutes
  onlineFlights: number | null;
  landingCount: number | null;
  violations: number | null;
  virtualOrganization: string | null;
};

/* Resolve an IFC (community) username → IF user record (incl. userId). */
export async function lookupUserByIfc(ifcUsername: string): Promise<IfUser | null> {
  const result = await ifFetch<IfUser[]>("/users", {
    method: "POST",
    body: JSON.stringify({ discourseNames: [ifcUsername] }),
  });
  return result?.[0] ?? null;
}

export async function getUserStats(userId: string): Promise<IfUser | null> {
  const result = await ifFetch<IfUser[]>("/users", {
    method: "POST",
    body: JSON.stringify({ userIds: [userId] }),
  });
  return result?.[0] ?? null;
}

export type IfFlight = {
  id: string;
  created: string;
  callsign: string | null;
  server: string | null;
  totalTime: number | null; // minutes
  landingCount: number | null;
  originAirport: string | null;
  destinationAirport: string | null;
  aircraftId: string | null;
  liveryId: string | null;
  fuelUsedKg: number | null;
};

/* A user's flight logbook (most recent first). */
export async function getUserFlights(
  userId: string,
  page = 1,
): Promise<IfFlight[]> {
  const result = await ifFetch<{ data: IfFlight[] }>(
    `/users/${userId}/flights?page=${page}`,
  );
  return result?.data ?? [];
}

export type IfSession = {
  id: string;
  name: string;
  userCount: number;
  type: number;
};

export async function getSessions(): Promise<IfSession[]> {
  return (await ifFetch<IfSession[]>("/sessions")) ?? [];
}

export type IfLiveFlight = {
  flightId: string;
  userId: string;
  username: string | null;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  track: number;
  aircraftId: string | null;
  liveryId: string | null;
  virtualOrganization: string | null;
};

export async function getSessionFlights(
  sessionId: string,
): Promise<IfLiveFlight[]> {
  return (await ifFetch<IfLiveFlight[]>(`/sessions/${sessionId}/flights`)) ?? [];
}

/* Active flights across all sessions whose userId is in `userIds`
   (i.e. our pilots who are airborne right now). */
export async function getLiveFlightsForUsers(
  userIds: Set<string>,
): Promise<(IfLiveFlight & { sessionName: string })[]> {
  if (userIds.size === 0) return [];
  const sessions = await getSessions();
  const out: (IfLiveFlight & { sessionName: string })[] = [];
  for (const s of sessions) {
    const flights = await getSessionFlights(s.id);
    for (const f of flights) {
      if (userIds.has(f.userId)) out.push({ ...f, sessionName: s.name });
    }
  }
  return out;
}

export type LiveFlight = IfLiveFlight & {
  sessionName: string;
  sessionId: string;
};

/* Active flights on the Expert Server whose callsign contains `match`
   (e.g. "XIAMEN AIR" → Xiamen Air Virtual flights). Expert-only by design. */
export async function getFlightsByCallsignSuffix(
  match: string,
): Promise<LiveFlight[]> {
  const s = match.toUpperCase();
  const sessions = (await getSessions()).filter((sess) =>
    (sess.name ?? "").toLowerCase().includes("expert"),
  );
  const out: LiveFlight[] = [];
  for (const sess of sessions) {
    const flights = await getSessionFlights(sess.id);
    for (const f of flights) {
      if ((f.callsign ?? "").toUpperCase().trim().includes(s)) {
        out.push({ ...f, sessionName: sess.name, sessionId: sess.id });
      }
    }
  }
  return out;
}

/* ---- Aircraft / livery names ----
   The live-flight payload only carries opaque aircraftId / liveryId GUIDs.
   /aircraft/liveries maps them to human names. The catalogue rarely changes,
   so cache it in-process for the lifetime of the server instance. */
export type IfLivery = {
  id: string; // liveryId
  aircraftID: string;
  aircraftName: string;
  liveryName: string;
};

let liveryCache: Map<string, IfLivery> | null = null;

export async function getLiveryMap(): Promise<Map<string, IfLivery>> {
  if (liveryCache) return liveryCache;
  const list = (await ifFetch<IfLivery[]>("/aircraft/liveries")) ?? [];
  const map = new Map<string, IfLivery>();
  for (const l of list) map.set(l.id, l);
  if (list.length) liveryCache = map; // only cache a successful fetch
  return map;
}

/* ---- Flight route ----
   A live flight's filed route lives in its flight plan; origin = first
   navpoint, destination = last (when the pilot filed ICAOs). Returns the
   endpoints plus their coordinates so we can draw the route on the map. */
export type LatLon = { lat: number; lon: number };

export type FlightRoute = {
  origin: string | null;
  destination: string | null;
  originLoc: LatLon | null;
  destinationLoc: LatLon | null;
  plannedPath: LatLon[]; // full filed route, navpoint by navpoint
};

type FplItem = {
  name: string | null;
  identifier: string | null;
  type: number;
  location: { latitude: number; longitude: number } | null;
};

function isAirport(id: string | null): boolean {
  // ICAO airport identifiers are 3–4 letters (KSEA, ZSAM, EGLL, OMDB…).
  return !!id && /^[A-Z]{3,4}$/.test(id.trim().toUpperCase());
}

export async function getFlightRoute(
  sessionId: string,
  flightId: string,
): Promise<FlightRoute | null> {
  const fp = await ifFetch<{ flightPlanItems: FplItem[] }>(
    `/sessions/${sessionId}/flights/${flightId}/flightplan`,
  );
  const items = fp?.flightPlanItems ?? [];
  if (items.length === 0) return null;

  const pick = (it: FplItem | undefined) =>
    it ? (it.identifier ?? it.name ?? null) : null;
  const loc = (it: FplItem | undefined) =>
    it?.location
      ? { lat: it.location.latitude, lon: it.location.longitude }
      : null;

  // Prefer airport-shaped endpoints; fall back to raw first/last navpoint.
  const firstAirport = items.find((i) => isAirport(pick(i)));
  const lastAirport = [...items].reverse().find((i) => isAirport(pick(i)));
  const first = firstAirport ?? items[0];
  const last = lastAirport ?? items[items.length - 1];

  const plannedPath = items
    .map(loc)
    .filter((p): p is LatLon => p !== null);

  return {
    origin: pick(first),
    destination: pick(last),
    originLoc: loc(first),
    destinationLoc: loc(last),
    plannedPath,
  };
}

/* ---- Actual flown track ----
   /sessions/{id}/flights/{id}/route returns the flight's position-report
   history — the REAL path flown, not the planned straight line. Can be
   1000+ points, so downsample (keeping the most recent point) before
   shipping it to the browser. */
type RoutePoint = { latitude: number; longitude: number };

export async function getFlightTrack(
  sessionId: string,
  flightId: string,
  maxPoints = 140,
): Promise<LatLon[]> {
  const pts =
    (await ifFetch<RoutePoint[]>(
      `/sessions/${sessionId}/flights/${flightId}/route`,
    )) ?? [];
  if (pts.length === 0) return [];

  const step = Math.max(1, Math.ceil(pts.length / maxPoints));
  const out: LatLon[] = [];
  for (let i = 0; i < pts.length; i += step) {
    out.push({ lat: pts[i].latitude, lon: pts[i].longitude });
  }
  // Always keep the latest reported position so the line meets the aircraft.
  const lastPt = pts[pts.length - 1];
  const lastOut = out[out.length - 1];
  if (lastOut.lat !== lastPt.latitude || lastOut.lon !== lastPt.longitude) {
    out.push({ lat: lastPt.latitude, lon: lastPt.longitude });
  }
  return out;
}

/* Recent Xiamen Air flights from a pilot's IF logbook, newest first —
   the basis for one-click PIREP autofill suggestions. */
export type EligibleFlight = {
  origin: string | null;
  destination: string | null;
  minutes: number;
  aircraftName: string | null; // IF aircraft name (e.g. "Airbus A350-900")
  callsign: string | null;
  server: string | null;
  created: string;
  landingCount: number;
  fuelKg: number;
};

export async function getRecentXiamenFlights(
  userId: string,
  limit = 8,
): Promise<EligibleFlight[]> {
  const [flights, liveries] = await Promise.all([
    getUserFlights(userId),
    getLiveryMap(),
  ]);
  return flights
    .filter((f) => (f.callsign ?? "").toUpperCase().trim().includes("XIAMEN AIR"))
    .slice(0, limit)
    .map((f) => {
      const liv = f.liveryId ? liveries.get(f.liveryId) : undefined;
      return {
        origin: f.originAirport,
        destination: f.destinationAirport,
        minutes: Math.round(f.totalTime ?? 0),
        aircraftName: liv?.aircraftName ?? null,
        callsign: f.callsign,
        server: f.server,
        created: f.created,
        landingCount: f.landingCount ?? 0,
        fuelKg: Math.round(f.fuelUsedKg ?? 0),
      };
    });
}

export type LogbookMatch = {
  origin: string | null;
  destination: string | null;
  totalMinutes: number;
  landingCount: number;
  fuelUsedKg: number;
  server: string | null;
  created: string;
};

/* Most recent flight in a pilot's IF logbook matching dep→arr (for PIREP
   validation). null if no match / IF not configured / no IF identity. */
export async function findLogbookFlight(
  userId: string,
  dep: string,
  arr: string,
): Promise<LogbookMatch | null> {
  const flights = await getUserFlights(userId);
  const D = dep.toUpperCase();
  const A = arr.toUpperCase();
  const m = flights.find(
    (f) =>
      (f.originAirport ?? "").toUpperCase() === D &&
      (f.destinationAirport ?? "").toUpperCase() === A,
  );
  if (!m) return null;
  return {
    origin: m.originAirport,
    destination: m.destinationAirport,
    totalMinutes: Math.round(m.totalTime ?? 0),
    landingCount: m.landingCount ?? 0,
    fuelUsedKg: Math.round(m.fuelUsedKg ?? 0),
    server: m.server,
    created: m.created,
  };
}
