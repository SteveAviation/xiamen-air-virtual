/* ----------------------------------------------------------------
   Xiamen Air Virtual — operations: Route of the Week, Spotlight routes
   (2× AP), and Career-mode auto-dispatch.

   ROTW is staff-settable (in-memory demo store). Spotlights and dispatch
   assignments are generated deterministically from the day so they stay
   stable across refreshes and only roll over on a new day/week.
------------------------------------------------------------------- */

import { ROUTES, type Route } from "./routes";
import { AIRPORT_COORDS } from "./airports";
import { getOpsConfig } from "./opsStore";
import {
  computeAp,
  categoryForMinutes,
  punctualityForMinutes,
  computeLc,
  cargoCertForHours,
  CARGO_HUBS,
  type FlightCategory,
  type CargoRisk,
} from "./career";

/* ---- deterministic RNG (so dispatch/spotlight are stable per period) ---- */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function dayIndex(d = new Date()): number {
  return Math.floor(d.getTime() / 86_400_000);
}
function weekIndex(d = new Date()): number {
  return Math.floor(dayIndex(d) / 7);
}

export function firstFlightNo(r: Route): string {
  return r.routeNumber.split("/")[0];
}

/* ---- Ops store (demo): Route of the Day + staff-added codeshare routes ---- */
const g = globalThis as unknown as { __fnrOps?: { rotwNo: string; rotdNos?: string[]; spotlightNos?: string[]; extra: Route[]; discontinued?: string[]; renames?: Record<string, string> } };
const store = (g.__fnrOps ??= {
  // default ROTW: the polar flagship to Tokyo (legacy; ROTD is the live feature)
  rotwNo: "AY73/AY74",
  rotdNos: undefined, // staff-set list of exactly 6 flight numbers (2 short/2 med/2 long)
  extra: [], // codeshare routes added by staff in the Crew Center
});
store.extra ??= [];

const xiamenairRoutes = ROUTES.filter((r) => r.airline === "Xiamen Air Virtual");

/* Load the persistent ops config (codeshares, ROTD, ROTW) from Neon into the
   in-memory cache. Call this at the top of any server component that reads
   routes/ROTD so serverless cold starts don't show an empty/stale store.
   Sync readers (allRoutes, getRotw, getDispatches…) use the cache it fills. */
export async function hydrateOps(): Promise<void> {
  try {
    const cfg = await getOpsConfig();
    store.extra = Array.isArray(cfg.codeshares) ? cfg.codeshares : [];
    store.rotwNo = cfg.rotwNo || store.rotwNo;
    store.rotdNos = cfg.rotdNos ?? undefined;
    store.spotlightNos = cfg.spotlightNos ?? undefined;
    store.discontinued = Array.isArray(cfg.discontinued) ? cfg.discontinued : [];
    store.renames = cfg.renames ?? {};
  } catch {
    /* keep whatever the cache already holds */
  }
}

/* All routes = the static network + staff-added codeshares, de-duplicated by
   flight number so a route can never render more than once (guards against a
   codeshare that collides with an existing sector). */
export function allRoutes(): Route[] {
  const discontinued = new Set(store.discontinued ?? []);
  const renames = store.renames ?? {};
  const seen = new Set<string>();
  const out: Route[] = [];
  for (const r of [...ROUTES, ...store.extra]) {
    if (discontinued.has(r.routeNumber)) continue; // retired by staff
    const routeNumber = renames[r.routeNumber] ?? r.routeNumber; // flight-no edit
    if (seen.has(routeNumber)) continue;
    seen.add(routeNumber);
    out.push(routeNumber === r.routeNumber ? r : { ...r, routeNumber });
  }
  return out;
}
export function getExtraRoutes(): Route[] {
  return [...store.extra];
}
export function allAirlines(): string[] {
  return [...new Set(allRoutes().map((r) => r.airline))];
}

/* Staff: add a codeshare route to the database. */
export function addCodeshareRoute(input: {
  routeNumber: string;
  dep: string;
  arr: string;
  aircraft: string;
  minutes: number;
  airline: string;
}): { ok: boolean; error?: string } {
  const routeNumber = input.routeNumber.trim().toUpperCase();
  const dep = input.dep.trim().toUpperCase();
  const arr = input.arr.trim().toUpperCase();
  const airline = input.airline.trim();
  const minutes = Math.round(Number(input.minutes));
  if (!routeNumber || dep.length < 3 || arr.length < 3) return { ok: false, error: "Flight number and valid ICAO airports are required." };
  if (!airline) return { ok: false, error: "Airline is required." };
  if (!Number.isFinite(minutes) || minutes <= 0) return { ok: false, error: "Block time must be greater than zero." };
  if (allRoutes().some((r) => r.routeNumber === routeNumber)) return { ok: false, error: "That flight number already exists." };
  store.extra.push({ routeNumber, dep, arr, aircraft: input.aircraft.trim() || `${airline} aircraft`, minutes, airline });
  return { ok: true };
}
export function removeCodeshareRoute(routeNumber: string): boolean {
  const before = store.extra.length;
  store.extra = store.extra.filter((r) => r.routeNumber !== routeNumber);
  return store.extra.length < before;
}

export function getRotw(): Route {
  return (
    xiamenairRoutes.find((r) => r.routeNumber === store.rotwNo) ??
    xiamenairRoutes[0]
  );
}
export function setRotw(routeNumber: string): boolean {
  const ok = xiamenairRoutes.some((r) => r.routeNumber === routeNumber);
  if (ok) store.rotwNo = routeNumber;
  return ok;
}
export function rotwOptions(): Route[] {
  return xiamenairRoutes;
}

/* ---- Route of the Day (ROTD) ----
   Six staff-set routes — two short-haul, two medium, two long — that every
   pilot can fly for a flat 2× flight-time multiplier. ROTD carries NO AP/LC of
   its own; those only accrue if the same sector is also a Career/Cargo dispatch
   that day. Spotlight routes are deliberately excluded (shown separately).
   Defaults are picked deterministically per day so they're stable on refresh. */
export type RotdHaul = "Short" | "Medium" | "Long";
export type RotdLeg = { route: Route; haul: RotdHaul };
export const ROTD_MULTIPLIER = 2;

function haulOf(min: number): RotdHaul {
  return min < 120 ? "Short" : min <= 360 ? "Medium" : "Long";
}

export function getRotd(d = new Date()): RotdLeg[] {
  // Staff-set list of exactly six valid flight numbers takes priority.
  if (store.rotdNos && store.rotdNos.length === 6) {
    const legs = store.rotdNos
      .map((no) => xiamenairRoutes.find((r) => r.routeNumber === no))
      .filter((r): r is Route => !!r);
    if (legs.length === 6) return legs.map((r) => ({ route: r, haul: haulOf(r.minutes) }));
  }
  // Deterministic auto-pick: 2 short, 2 medium, 2 long, excluding spotlights.
  const r = rng(dayIndex(d) * 2246822519 + 31);
  const spot = new Set(getSpotlightRoutes(d).map((x) => x.routeNumber));
  const eligible = xiamenairRoutes.filter((rt) => !spot.has(rt.routeNumber));
  const pick = (pool: Route[], n: number) => {
    const p = [...pool];
    const out: Route[] = [];
    for (let i = 0; i < n && p.length; i++) out.push(p.splice(Math.floor(r() * p.length), 1)[0]);
    return out;
  };
  const short = pick(eligible.filter((x) => x.minutes < 120), 2);
  const medium = pick(eligible.filter((x) => x.minutes >= 120 && x.minutes <= 360), 2);
  const long = pick(eligible.filter((x) => x.minutes > 360), 2);
  return [...short, ...medium, ...long].map((rt) => ({ route: rt, haul: haulOf(rt.minutes) }));
}

export function setRotd(flightNumbers: string[]): boolean {
  const valid = flightNumbers.filter((no) => xiamenairRoutes.some((r) => r.routeNumber === no));
  if (valid.length !== 6) return false;
  store.rotdNos = valid;
  return true;
}
export function rotdOptions(): Route[] {
  return xiamenairRoutes;
}

/* ---- Spotlight routes (2× AP), 1–3 per week ---- */
export function getSpotlightRoutes(d = new Date()): Route[] {
  // Staff-chosen 3 spotlight routes (persisted) take priority; ×2 AP (career)
  // and ×2 LC (cargo) when they surface on dispatch. Falls back to a
  // deterministic weekly auto-pick if staff haven't set any.
  if (store.spotlightNos?.length) {
    const all = allRoutes();
    const picks = store.spotlightNos
      .map((no) => all.find((rt) => rt.routeNumber === no || firstFlightNo(rt) === no))
      .filter((rt): rt is Route => !!rt);
    if (picks.length) return picks;
  }
  const r = rng(weekIndex(d) * 2246822519 + 13);
  const count = 1 + Math.floor(r() * 3); // 1–3
  const pool = [...xiamenairRoutes];
  const picks: Route[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    picks.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  return picks;
}

/* Routes eligible to be chosen as spotlight (mainline + codeshares). */
export function spotlightOptions(): Route[] {
  return allRoutes();
}
export function isSpotlight(routeNumber: string, d = new Date()): boolean {
  return getSpotlightRoutes(d).some((r) => r.routeNumber === routeNumber);
}

/* ---- Career-mode auto-dispatch ----
   Each pilot gets a small board of assigned flights with a deadline and an AP
   reward. Completing within the window earns the 1.25× punctuality premium;
   spotlight sectors carry 2×. Deterministic per pilot per day. */
export type DispatchHaul = "Short" | "Medium" | "Long" | "Ultra";
export type Dispatch = {
  id: string;
  flightNo: string;
  dep: string;
  arr: string;
  aircraft: string;
  airline: string;
  minutes: number;
  category: FlightCategory;
  haul: DispatchHaul;
  baseAp: number; // band payout (the headline max)
  potentialAp: number; // base, or ×2 when a spotlight sector
  punctualBonus: number; // flat on-time licence bonus added on top
  spotlight: boolean;
  windowMinutes: number; // completion window = flight time + 2h
  priority: "standard" | "priority";
};

/* A pilot's daily roster is built so the combined block time of all flights
   fits inside ~22h — leaving room to complete and file all of them within the
   24h window. An ultra-long-haul (15h+) is issued as the ONLY flight that day. */
const ROSTER_MAX_MINUTES = 22 * 60; // 1,320 min
const WINDOW_GRACE_MINUTES = 120; // +2h on top of flight time to complete & file

export function getDispatches(
  pilotId: number,
  opts: { authorizedFleet?: string[]; rankMultiplier?: number; punctualBonus?: number; codeshareAirlines?: string[]; allowedHauls?: DispatchHaul[] } = {},
  d = new Date(),
): Dispatch[] {
  const r = rng((pilotId + 1) * 2654435761 + dayIndex(d) * 2246822519);
  const spotlights = new Set(getSpotlightRoutes(d).map((x) => x.routeNumber));
  // Career-dispatch hauls the pilot's licences permit. Default = all (callers
  // that don't gate). No permitted hauls → no dispatches (buy a licence first).
  const allowed = new Set<DispatchHaul>(opts.allowedHauls ?? ["Short", "Medium", "Long", "Ultra"]);
  if (allowed.size === 0) return [];

  // Eligible routes: Xiamen Air mainline plus any unlocked codeshare networks.
  let pool = xiamenairRoutes.slice();
  if (opts.codeshareAirlines?.length) {
    pool = pool.concat(allRoutes().filter((rt) => opts.codeshareAirlines!.includes(rt.airline)));
  }
  if (opts.authorizedFleet?.length) {
    const ok = pool.filter((rt) =>
      opts.authorizedFleet!.some((f) =>
        rt.aircraft.toLowerCase().includes(f.toLowerCase().replace("-", " ").slice(0, 4)),
      ),
    );
    if (ok.length >= 4) pool = ok;
  }

  const shorts = pool.filter((rt) => rt.minutes < 120);
  const mediums = pool.filter((rt) => rt.minutes >= 120 && rt.minutes <= 360);
  const longs = pool.filter((rt) => rt.minutes > 360 && rt.minutes <= 900); // 6–15h
  const ultras = pool.filter((rt) => rt.minutes > 900); // 15h+

  const pickOne = (arr: Route[]): Route | null => (arr.length ? arr[Math.floor(r() * arr.length)] : null);
  const mk = (rt: Route, haul: DispatchHaul): Dispatch => {
    const spotlight = spotlights.has(rt.routeNumber);
    const base = computeAp(rt.minutes).base; // band payout = headline max
    return {
      id: `${rt.routeNumber}-${dayIndex(d)}`,
      flightNo: firstFlightNo(rt),
      dep: rt.dep,
      arr: rt.arr,
      aircraft: rt.aircraft,
      airline: rt.airline,
      minutes: rt.minutes,
      category: categoryForMinutes(rt.minutes),
      haul,
      baseAp: base,
      potentialAp: spotlight ? base * 2 : base,
      punctualBonus: punctualityForMinutes(rt.minutes),
      spotlight,
      windowMinutes: rt.minutes + WINDOW_GRACE_MINUTES,
      priority: spotlight ? "priority" : "standard",
    };
  };

  // ~1-in-4 days is an ultra-long day → a single, sole flight (Command only).
  if (allowed.has("Ultra") && ultras.length && r() < 0.25) {
    return [mk(pickOne(ultras)!, "Ultra")];
  }

  // Otherwise one short + one medium + one long — each only if the pilot's
  // licence permits that haul — summing under the 22h cap.
  const board: Dispatch[] = [];
  if (allowed.has("Short")) {
    const s = pickOne(shorts);
    if (s) board.push(mk(s, "Short"));
  }
  if (allowed.has("Medium")) {
    const m = pickOne(mediums);
    if (m) board.push(mk(m, "Medium"));
  }
  if (allowed.has("Long")) {
    let used = board.reduce((sum, b) => sum + b.minutes, 0);
    const fittingLongs = longs.filter((l) => used + l.minutes <= ROSTER_MAX_MINUTES);
    const l = pickOne(fittingLongs);
    if (l && used + l.minutes <= ROSTER_MAX_MINUTES) board.push(mk(l, "Long"));
  }

  return board;
}

/* ---- Cargo (Logistics Command) — contract generation ---- */
export type CargoContract = {
  id: string;
  flightNo: string;
  dep: string;
  arr: string;
  aircraft: string;
  minutes: number;
  risk: CargoRisk;
  riskLabel: string;
  scenario: string;
  lc: number;
  lcMin: number; // floor after a possible high-risk deduction
  cert: string;
};

const CARGO_TYPES = ["B737-800BCF", "B777-F", "B747-8F"];
const CARGO_DESTS = ["ZSAM", "ZSFZ", "ZSPD", "ZBAA", "ZGGG", "ZUUU", "ZLXY", "RJTT", "RKSI", "WSSS", "VTBS", "WMKK", "RPLL", "VHHH", "RCTP", "EHAM", "KJFK", "KLAX", "YSSY", "OMDB"];
const SCENARIOS: Record<CargoRisk, string[]> = {
  low: ["General consignment", "Automotive parts", "Industrial machinery", "Consumer electronics", "Apparel & textiles"],
  medium: ["Fresh produce", "Cut flowers", "Chilled seafood", "Dairy shipment", "Live tropical fish"],
  high: ["Pharmaceuticals, temp-controlled", "Medical instruments", "Aircraft engine (oversize)", "Hazardous materials", "Time-critical sports equipment"],
};

function blockMinutes(a: string, b: string): number {
  const p = AIRPORT_COORDS[a], q = AIRPORT_COORDS[b];
  if (!p || !q) return 120;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(q[0] - p[0]), dLon = toRad(q[1] - p[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p[0])) * Math.cos(toRad(q[0])) * Math.sin(dLon / 2) ** 2;
  const nm = 3440 * 2 * Math.asin(Math.sqrt(h));
  return Math.max(75, Math.round((nm / 460) * 60) + 25); // ~460kt + taxi/climb
}

/* Risk plan by certification:
   - Entry          → 2× Standard (low) only
   - Load Master    → a mix of Standard & Perishable (low/medium)
   - Freight Architect → adds a Specialized (high) high-risk/reward contract */
function certRiskPlan(certName: string): CargoRisk[] {
  if (certName === "Entry") return ["low", "low"];
  if (certName === "Load Master") return ["low", "medium", "low"];
  return ["high", "medium", "low"]; // Freight Architect
}

export function getCargoContracts(pilotId: number, cargoHours = 0, cargoLc = 0, d = new Date()): CargoContract[] {
  const r = rng((pilotId + 7) * 40503 + dayIndex(d) * 2246822519);
  const cert = cargoCertForHours(cargoHours, cargoLc);
  const limit = cert.dailyLimit; // 2 at Entry (1 per hub), 3 at Load Master+
  const plan = certRiskPlan(cert.name);
  const out: CargoContract[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < limit && guard++ < 200) {
    const dep = CARGO_HUBS[out.length % CARGO_HUBS.length]; // alternate Xiamen / Fuzhou
    const arr = CARGO_DESTS[Math.floor(r() * CARGO_DESTS.length)];
    const key = `${dep}-${arr}`;
    if (arr === dep || used.has(key)) continue;
    used.add(key);
    const minutes = blockMinutes(dep, arr);
    const risk = plan[out.length] ?? "low";
    const ac = CARGO_TYPES[Math.min(CARGO_TYPES.length - 1, Math.floor((minutes / 600) * CARGO_TYPES.length))];
    const lc = computeLc(risk);
    out.push({
      id: `C-${dep}-${arr}-${dayIndex(d)}`,
      flightNo: "FX" + (100 + Math.floor(r() * 800)),
      dep, arr, aircraft: ac, minutes, risk,
      riskLabel: risk === "low" ? "Standard" : risk === "medium" ? "Perishable" : "Specialized",
      scenario: SCENARIOS[risk][Math.floor(r() * SCENARIOS[risk].length)],
      lc: lc.net,
      lcMin: lc.min,
      cert: cert.name,
    });
  }
  return out.sort((a, b) => b.lc - a.lc);
}
