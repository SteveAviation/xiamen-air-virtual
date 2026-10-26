/* ----------------------------------------------------------------
   Xiamen Air Virtual — persistent operations store.

   Staff-editable operational data that must survive serverless cold
   starts: codeshare routes, the Route of the Day selection, the legacy
   Route of the Week, and the event-multiplier table. Stored in Neon
   (`ops_config` table, one JSONB row) with an in-memory demo fallback —
   the same pattern as siteConfig.ts.

   Previously this lived only in `globalThis` inside ops.ts, so anything
   staff added (codeshares especially) vanished on the next request. This
   module is the durable backing store.
------------------------------------------------------------------- */

import { neon } from "@neondatabase/serverless";
import { ROUTES, type Route } from "./routes";
import { MULTIPLIERS, type Multiplier } from "./data";

const XMN_ROUTE_NUMBERS = new Set(
  ROUTES.filter((r) => r.airline === "Xiamen Air Virtual").map((r) => r.routeNumber),
);

/* A staff-created codeshare network pilots can unlock. */
export type CodeshareNetwork = {
  name: string;
  price: number;
  currency: "AP" | "LC";
  type: "career" | "cargo";
};

export type OpsConfig = {
  codeshares: Route[]; // staff-added partner routes
  networks: CodeshareNetwork[]; // staff-created unlockable networks
  discontinued: string[]; // Xiamen Air route numbers hidden from the network
  renames: Record<string, string>; // routeNumber → new routeNumber (flight-no edits)
  rotwNo: string; // legacy Route of the Week (single Xiamen Air route number)
  rotdNos: string[] | null; // Route of the Day — exactly 6 flight numbers, or null = auto
  spotlightNos: string[] | null; // staff-chosen 3 spotlight routes (×2), or null = auto
  multipliers: Multiplier[]; // event multiplier table
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_OPS: OpsConfig = {
  codeshares: [],
  networks: [],
  discontinued: [],
  renames: {},
  rotwNo: "AY73/AY74",
  rotdNos: null,
  spotlightNos: null,
  multipliers: MULTIPLIERS,
};

const dbConfigured = !!process.env.DATABASE_URL;
const sql = dbConfigured ? neon(process.env.DATABASE_URL!) : null;

const g = globalThis as unknown as { __fnrOpsCfg?: Partial<OpsConfig> };

function merge(saved: Partial<OpsConfig> | null | undefined): OpsConfig {
  const s = saved ?? {};
  return {
    codeshares: Array.isArray(s.codeshares) ? s.codeshares : DEFAULT_OPS.codeshares,
    networks: Array.isArray(s.networks) ? s.networks : DEFAULT_OPS.networks,
    discontinued: Array.isArray(s.discontinued) ? s.discontinued : DEFAULT_OPS.discontinued,
    renames: s.renames && typeof s.renames === "object" ? s.renames : DEFAULT_OPS.renames,
    rotwNo: s.rotwNo ?? DEFAULT_OPS.rotwNo,
    rotdNos: s.rotdNos === undefined ? DEFAULT_OPS.rotdNos : s.rotdNos,
    spotlightNos: s.spotlightNos === undefined ? DEFAULT_OPS.spotlightNos : s.spotlightNos,
    multipliers: Array.isArray(s.multipliers) && s.multipliers.length ? s.multipliers : DEFAULT_OPS.multipliers,
    updatedAt: s.updatedAt,
    updatedBy: s.updatedBy,
  };
}

let ensured = false;
async function ensure() {
  if (!sql || ensured) return;
  await sql`CREATE TABLE IF NOT EXISTS ops_config (id INT PRIMARY KEY DEFAULT 1, doc JSONB NOT NULL DEFAULT '{}'::jsonb)`;
  ensured = true;
}

export async function getOpsConfig(): Promise<OpsConfig> {
  if (!sql) return merge(g.__fnrOpsCfg);
  try {
    await ensure();
    const rows = (await sql`SELECT doc FROM ops_config WHERE id = 1`) as { doc: Partial<OpsConfig> }[];
    return merge(rows[0]?.doc);
  } catch {
    return merge(g.__fnrOpsCfg);
  }
}

async function writeOpsConfig(next: OpsConfig): Promise<OpsConfig> {
  if (!sql) {
    g.__fnrOpsCfg = next;
    return next;
  }
  await ensure();
  await sql`INSERT INTO ops_config (id, doc) VALUES (1, ${JSON.stringify(next)}::jsonb)
            ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`;
  return next;
}

/* Apply a partial patch (whole-field replace for arrays) and persist. */
export async function setOpsConfig(patch: Partial<OpsConfig>, by = "staff"): Promise<OpsConfig> {
  const current = await getOpsConfig();
  const next: OpsConfig = merge({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  });
  return writeOpsConfig(next);
}

/* ---- codeshares ---- */
export async function addCodeshare(input: {
  routeNumber: string;
  dep: string;
  arr: string;
  aircraft: string;
  minutes: number;
  airline: string;
}): Promise<{ ok: boolean; error?: string }> {
  const routeNumber = input.routeNumber.trim().toUpperCase();
  const dep = input.dep.trim().toUpperCase();
  const arr = input.arr.trim().toUpperCase();
  const airline = input.airline.trim();
  const minutes = Math.round(Number(input.minutes));
  if (!routeNumber || dep.length < 3 || arr.length < 3) return { ok: false, error: "Flight number and valid ICAO airports are required." };
  if (!airline) return { ok: false, error: "Airline is required." };
  if (!Number.isFinite(minutes) || minutes <= 0) return { ok: false, error: "Block time must be greater than zero." };

  const cfg = await getOpsConfig();
  if (XMN_ROUTE_NUMBERS.has(routeNumber) || cfg.codeshares.some((r) => r.routeNumber === routeNumber)) {
    return { ok: false, error: "That flight number already exists." };
  }
  const codeshares = [
    ...cfg.codeshares,
    { routeNumber, dep, arr, aircraft: input.aircraft.trim() || `${airline} aircraft`, minutes, airline },
  ];
  await setOpsConfig({ codeshares });
  return { ok: true };
}

/* Bulk add — parse "flightNo, DEP, ARR, minutes, airline[, aircraft]" rows.
   Returns per-row results so the UI can report what landed and what didn't. */
export async function bulkAddCodeshares(
  rows: Array<{ routeNumber: string; dep: string; arr: string; minutes: number; airline: string; aircraft?: string }>,
): Promise<{ added: number; errors: { routeNumber: string; error: string }[] }> {
  const cfg = await getOpsConfig();
  const seen = new Set<string>(cfg.codeshares.map((r) => r.routeNumber));
  const toAdd: Route[] = [];
  const errors: { routeNumber: string; error: string }[] = [];

  for (const r of rows) {
    const routeNumber = String(r.routeNumber ?? "").trim().toUpperCase();
    const dep = String(r.dep ?? "").trim().toUpperCase();
    const arr = String(r.arr ?? "").trim().toUpperCase();
    const airline = String(r.airline ?? "").trim();
    const minutes = Math.round(Number(r.minutes));
    if (!routeNumber) { errors.push({ routeNumber: "(blank)", error: "Missing flight number" }); continue; }
    if (dep.length < 3 || arr.length < 3) { errors.push({ routeNumber, error: "Bad ICAO" }); continue; }
    if (!airline) { errors.push({ routeNumber, error: "Missing airline" }); continue; }
    if (!Number.isFinite(minutes) || minutes <= 0) { errors.push({ routeNumber, error: "Bad block time" }); continue; }
    if (XMN_ROUTE_NUMBERS.has(routeNumber) || seen.has(routeNumber)) { errors.push({ routeNumber, error: "Duplicate" }); continue; }
    seen.add(routeNumber);
    toAdd.push({ routeNumber, dep, arr, aircraft: (r.aircraft ?? "").trim() || `${airline} aircraft`, minutes, airline });
  }

  if (toAdd.length) await setOpsConfig({ codeshares: [...cfg.codeshares, ...toAdd] });
  return { added: toAdd.length, errors };
}

/* ---- event multipliers ---- */
export async function setMultipliers(multipliers: Multiplier[], by = "staff"): Promise<OpsConfig> {
  const seen = new Set<string>();
  const clean = (multipliers ?? [])
    .map((m) => ({ code: String(m.code ?? "").trim().toUpperCase(), value: Number(m.value), label: String(m.label ?? "").trim() }))
    .filter((m) => {
      if (!m.code || !m.label || !Number.isFinite(m.value) || m.value <= 0) return false;
      if (seen.has(m.code)) return false;
      seen.add(m.code);
      return true;
    });
  return setOpsConfig({ multipliers: clean }, by);
}

/* ---- Xiamen Air route edits (discontinue / rename flight number) ---- */
export async function discontinueRoute(routeNumber: string, on: boolean): Promise<void> {
  const rn = routeNumber.trim().toUpperCase();
  const cfg = await getOpsConfig();
  const set = new Set(cfg.discontinued);
  if (on) set.add(rn);
  else set.delete(rn);
  await setOpsConfig({ discontinued: [...set] });
}

export async function renameRoute(routeNumber: string, newNumber: string): Promise<void> {
  const rn = routeNumber.trim().toUpperCase();
  const nn = newNumber.trim().toUpperCase();
  const cfg = await getOpsConfig();
  const renames = { ...cfg.renames };
  if (!nn || nn === rn) delete renames[rn];
  else renames[rn] = nn;
  await setOpsConfig({ renames });
}

/* ---- codeshare networks (staff-created, unlockable) ---- */
export async function addNetwork(input: {
  name: string;
  price: number;
  currency: "AP" | "LC";
  type: "career" | "cargo";
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  const price = Math.round(Number(input.price));
  const currency = input.currency === "LC" ? "LC" : "AP";
  const type = input.type === "cargo" ? "cargo" : "career";
  if (!name) return { ok: false, error: "Network name is required." };
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Unlock price must be 0 or more." };
  const cfg = await getOpsConfig();
  if (cfg.networks.some((n) => n.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "That network already exists." };
  }
  await setOpsConfig({ networks: [...cfg.networks, { name, price, currency, type }] });
  return { ok: true };
}

export async function removeNetwork(name: string): Promise<boolean> {
  const cfg = await getOpsConfig();
  const networks = cfg.networks.filter((n) => n.name.toLowerCase() !== name.trim().toLowerCase());
  if (networks.length === cfg.networks.length) return false;
  await setOpsConfig({ networks });
  return true;
}

/* ---- spotlight routes ---- */
export async function setSpotlightNos(nos: string[] | null, by = "staff"): Promise<OpsConfig> {
  const clean = Array.isArray(nos)
    ? [...new Set(nos.map((n) => String(n).trim().toUpperCase()).filter(Boolean))].slice(0, 3)
    : null;
  return setOpsConfig({ spotlightNos: clean && clean.length ? clean : null }, by);
}

/* Resolve an event code to its multiplier value from the live (editable) table.
   Returns 1 for an unknown/empty code. */
export async function multiplierValue(code: string | null | undefined): Promise<number> {
  if (!code) return 1;
  const cfg = await getOpsConfig();
  const m = cfg.multipliers.find((x) => x.code === code.trim().toUpperCase());
  return m ? m.value : 1;
}

/* ---- codeshares (remove) ---- */
export async function removeCodeshare(routeNumber: string): Promise<boolean> {
  const cfg = await getOpsConfig();
  const rn = routeNumber.trim().toUpperCase();
  const codeshares = cfg.codeshares.filter((r) => r.routeNumber !== rn);
  if (codeshares.length === cfg.codeshares.length) return false;
  await setOpsConfig({ codeshares });
  return true;
}
