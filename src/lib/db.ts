import { neon } from "@neondatabase/serverless";
import { SEED_PILOTS, SEED_PIREPS } from "./seed";

/* ----------------------------------------------------------------
   Data layer for pilots + PIREPs.

   Uses Neon Postgres when DATABASE_URL is set. Otherwise falls back
   to an in-memory demo store (seeded below) so the entire pilot/PIREP
   experience works out-of-the-box — exactly like the AG Holding site,
   it stays "dormant until configured" and goes live the moment you
   add DATABASE_URL.
------------------------------------------------------------------- */

export const dbConfigured = !!process.env.DATABASE_URL;

export type PirepStatus = "pending" | "approved" | "rejected";
export type PilotStatus = "pending" | "active" | "suspended";

export type Pilot = {
  id: number;
  discordId: string;
  callsign: string;
  displayName: string;
  avatar: string | null;
  createdAt: string;
  status: PilotStatus;
  ifUsername: string | null;
  ifUserId: string | null;
  acceptedAt: string | null;
  notes: string | null;
  /* Explicit rank from the legacy roster import; when set it overrides the
     hours-derived rank (their VA assigns ranks manually too). */
  rankLabel: string | null;
  /* True when discord_id is a real Discord account (vs an unlinked import). */
  linked: boolean;
  /* Historical totals carried over from the previous crew center. Live totals =
     these + activity filed after the import. */
  baseMinutes: number;
  basePireps: number;
  /* Disciplinary strikes/warnings shown against the pilot's name. */
  warnings?: PilotWarning[];
  /* App-managed admin/staff access (independent of any Discord role). */
  isStaff?: boolean;
  /* Whether the pilot has set an IFC-login passcode (the hash is never exposed). */
  hasPasscode?: boolean;
};

export type PilotWarning = { reason: string; at: string };

export type Pirep = {
  id: number;
  pilotId: number;
  flightNo: string;
  dep: string;
  arr: string;
  aircraft: string;
  minutes: number; // credited (multiplied) flight time — counts toward stats
  rawMinutes: number; // flight time as flown, before the multiplier
  multiplier: number; // e.g. 1, 1.5, 2, 3, 5
  multiplierCode: string | null;
  fuelKg: number | null;
  landingRate: number | null;
  server: string | null;
  remarks: string | null;
  status: PirepStatus;
  filedAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
  reviewNote?: string | null; // staff note shown to the pilot on accept/reject
  /* Discord message id of this PIREP's post in the log channel (for edits). */
  discordMsgId: string | null;
};

export type NewPirep = Omit<
  Pirep,
  "id" | "status" | "filedAt" | "reviewedAt" | "reviewer" | "discordMsgId"
>;

export type NewsPost = {
  id: number;
  title: string;
  body: string;
  category: string; // Route of the Week · Group Flight · Event · Announcement …
  imageUrl: string | null; // optional banner image URL
  author: string;
  createdAt: string;
  eventAt: string | null; // optional scheduled date/time for events & group flights
};

export type NewNews = {
  title: string;
  body: string;
  category: string;
  imageUrl: string | null;
  author: string;
  eventAt?: string | null;
};

/* ---- Leave of Absence ---- */
export type LoaStatus = "pending" | "active" | "rejected" | "ended";
export type LoaExtStatus = "none" | "pending" | "approved" | "rejected";
export const LOA_MAX_DAYS = 31; // max one month
export const LOA_MAX_EXT_DAYS = 14; // max two-week extension
export const LOA_EXT_WINDOW_DAYS = 7; // can request in the last week

export type Loa = {
  id: number;
  pilotId: number;
  reason: string;
  days: number;
  status: LoaStatus;
  startAt: string | null;
  endAt: string | null;
  extDays: number;
  extStatus: LoaExtStatus;
  extReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
};

/* ---- Reports (bugs / players / staff) ---- */
export type ReportCategory = "bug" | "player" | "staff" | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";

export type Report = {
  id: number;
  category: ReportCategory;
  target: string | null; // who/what is being reported (player or staff name)
  message: string;
  reporterPilotId: number | null;
  reporterName: string | null; // callsign, free-text name, or "Anonymous"
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolver: string | null;
};

/* ============================ Neon ============================ */

const sql = dbConfigured ? neon(process.env.DATABASE_URL!) : null;
let schemaReady = false;

async function ensureSchema() {
  if (!sql || schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS pilots (
      id SERIAL PRIMARY KEY,
      discord_id TEXT UNIQUE NOT NULL,
      callsign TEXT,
      display_name TEXT,
      avatar TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;
  // Crew Center columns (added incrementally so existing DBs migrate cleanly).
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS if_username TEXT`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS if_user_id TEXT`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS notes TEXT`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS rank_label TEXT`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS linked BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS base_minutes INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS base_pireps INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS passcode TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS pireps (
      id SERIAL PRIMARY KEY,
      pilot_id INTEGER REFERENCES pilots(id) ON DELETE CASCADE,
      flight_no TEXT,
      dep TEXT,
      arr TEXT,
      aircraft TEXT,
      minutes INTEGER NOT NULL,
      fuel_kg INTEGER,
      landing_rate INTEGER,
      server TEXT,
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      filed_at TIMESTAMPTZ DEFAULT now(),
      reviewed_at TIMESTAMPTZ,
      reviewer TEXT
    )`;
  await sql`ALTER TABLE pireps ADD COLUMN IF NOT EXISTS raw_minutes INTEGER`;
  await sql`ALTER TABLE pireps ADD COLUMN IF NOT EXISTS multiplier REAL NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE pireps ADD COLUMN IF NOT EXISTS multiplier_code TEXT`;
  await sql`ALTER TABLE pireps ADD COLUMN IF NOT EXISTS discord_msg_id TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Announcement',
      image_url TEXT,
      author TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;
  await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS event_at TIMESTAMPTZ`;
  await sql`
    CREATE TABLE IF NOT EXISTS loas (
      id SERIAL PRIMARY KEY,
      pilot_id INTEGER REFERENCES pilots(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      start_at TIMESTAMPTZ,
      end_at TIMESTAMPTZ,
      ext_days INTEGER NOT NULL DEFAULT 0,
      ext_status TEXT NOT NULL DEFAULT 'none',
      ext_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      reviewed_at TIMESTAMPTZ,
      reviewer TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'other',
      target TEXT,
      message TEXT NOT NULL,
      reporter_pilot_id INTEGER REFERENCES pilots(id) ON DELETE SET NULL,
      reporter_name TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      resolver TEXT
    )`;
  // Staff review note attached to a PIREP (shown to the pilot on accept/reject).
  await sql`ALTER TABLE pireps ADD COLUMN IF NOT EXISTS review_note TEXT`;
  // Wallet spend ledger — licenses + codeshare unlocks debit AP/LC here.
  await sql`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      pilot_id INTEGER REFERENCES pilots(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      item TEXT NOT NULL,
      cost INTEGER NOT NULL,
      currency TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (pilot_id, kind, item)
    )`;
  // Pilot notifications (event / group flight / rank-up / PIREP decisions).
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      pilot_id INTEGER REFERENCES pilots(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;
  await seedRoster();
  schemaReady = true;
}

/* One-time roster seed: if the imported members aren't in the database yet,
   insert them (with their historical hours/PIREPs/ranks) so a freshly-connected
   DB shows the real roster without a separate import step. Idempotent. */
async function seedRoster() {
  // Disabled: the fictional placeholder roster (SEED_PILOTS) must NOT be
  // inserted into a live database — real VAs manage their own pilots. Use
  // purgeSeedPilots() to remove any that a previous version already seeded.
  return;
}

/* Discord ids of the fictional seed pilots, for one-click cleanup. */
const SEED_DISCORD_IDS = SEED_PILOTS.map((p) => p.discordId);

/* Remove the fictional placeholder pilots that an earlier build seeded into
   the live DB (matched by their exact seed discord_id, so real pilots are
   untouched). Returns how many were deleted. */
export async function purgeSeedPilots(): Promise<number> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`DELETE FROM pilots WHERE discord_id = ANY(${SEED_DISCORD_IDS}) RETURNING id`;
    return rows.length;
  }
  const before = mem.pilots.length;
  const ids = new Set(SEED_DISCORD_IDS);
  mem.pilots = mem.pilots.filter((p) => !ids.has(p.discordId));
  return before - mem.pilots.length;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToPilot(r: any): Pilot {
  return {
    id: r.id,
    discordId: r.discord_id,
    callsign: r.callsign ?? "",
    displayName: r.display_name ?? "",
    avatar: r.avatar ?? null,
    createdAt: new Date(r.created_at).toISOString(),
    status: (r.status ?? "pending") as PilotStatus,
    ifUsername: r.if_username ?? null,
    ifUserId: r.if_user_id ?? null,
    acceptedAt: r.accepted_at ? new Date(r.accepted_at).toISOString() : null,
    notes: r.notes ?? null,
    rankLabel: r.rank_label ?? null,
    linked: r.linked ?? true,
    baseMinutes: Number(r.base_minutes ?? 0),
    basePireps: Number(r.base_pireps ?? 0),
    warnings: Array.isArray(r.warnings)
      ? r.warnings
      : typeof r.warnings === "string"
        ? JSON.parse(r.warnings || "[]")
        : [],
    isStaff: r.is_staff ?? false,
    hasPasscode: !!r.passcode,
  };
}

function rowToPirep(r: any): Pirep {
  return {
    id: r.id,
    pilotId: r.pilot_id,
    flightNo: r.flight_no ?? "",
    dep: r.dep ?? "",
    arr: r.arr ?? "",
    aircraft: r.aircraft ?? "",
    minutes: r.minutes ?? 0,
    rawMinutes: r.raw_minutes ?? r.minutes ?? 0,
    multiplier: r.multiplier != null ? Number(r.multiplier) : 1,
    multiplierCode: r.multiplier_code ?? null,
    fuelKg: r.fuel_kg ?? null,
    landingRate: r.landing_rate ?? null,
    server: r.server ?? null,
    remarks: r.remarks ?? null,
    status: (r.status ?? "pending") as PirepStatus,
    filedAt: new Date(r.filed_at).toISOString(),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
    reviewer: r.reviewer ?? null,
    reviewNote: r.review_note ?? null,
    discordMsgId: r.discord_msg_id ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ====================== In-memory demo store ====================== */

export type Purchase = {
  id: number;
  pilotId: number;
  kind: "license" | "codeshare";
  item: string;
  cost: number;
  currency: "AP" | "LC";
  createdAt: string;
};

export type Notification = {
  id: number;
  pilotId: number;
  kind: string; // pirep | rankup | event | groupflight | system
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

type MemStore = {
  pilots: Pilot[];
  pireps: Pirep[];
  news: NewsPost[];
  loas: Loa[];
  reports: Report[];
  purchases: Purchase[];
  notifications: Notification[];
  passcodes: Record<number, string>; // pilotId → passcode hash (demo store)
  nextPilotId: number;
  nextPirepId: number;
  nextNewsId: number;
  nextLoaId: number;
  nextReportId: number;
  nextPurchaseId: number;
  nextNotifId: number;
};

/* Stored on globalThis so the RSC bundle and the Route Handler bundle —
   which Next.js compiles separately, each otherwise getting its own
   module-level copy — share ONE in-memory instance during dev. (Only the
   demo fallback uses this; with DATABASE_URL set, Postgres is the store.) */
const g = globalThis as unknown as { __sjxMem?: MemStore };
const mem: MemStore = (g.__sjxMem ??= {
  // Real roster seeded from the previous crew center (historical totals live in
  // each pilot's baseMinutes/basePireps). No individual historical PIREPs —
  // new ones filed via the site/bot accumulate on top.
  pilots: [...SEED_PILOTS],
  pireps: [...SEED_PIREPS],
  passcodes: {},
  news: [
    {
      id: 1,
      title: "Welcome to the new Xiamen Air Virtual",
      body: "We've rebuilt the website from the ground up — a live flight map, a full PIREP system, the leaderboard, and this news feed. Thanks for flying with us. The Egret Way to Fly. ✦",
      category: "Announcement",
      imageUrl: null,
      author: "Xiamen Air Virtual",
      createdAt: "2026-06-01T12:00:00Z",
      eventAt: null,
    },
  ],
  loas: [],
  reports: [],
  purchases: [],
  notifications: [],
  nextPilotId: SEED_PILOTS.length + 1,
  nextPirepId: SEED_PIREPS.length + 1,
  nextNewsId: 2,
  nextLoaId: 1,
  nextReportId: 1,
  nextPurchaseId: 1,
  nextNotifId: 1,
});

// Ensure fields added in later versions exist even if a prior in-memory store
// (persisted on globalThis across dev hot-reloads) predates them.
mem.passcodes ??= {};
mem.loas ??= [];
mem.nextLoaId ??= 1;
mem.reports ??= [];
mem.nextReportId ??= 1;

/* ========================== API ========================== */

export async function upsertPilot(input: {
  discordId: string;
  callsign: string;
  displayName: string;
  avatar: string | null;
}): Promise<Pilot> {
  if (sql) {
    await ensureSchema();
    // A real Discord account (the snowflake from OAuth / the bot) — always
    // stored as linked = true. Imported placeholders use `import:<callsign>`
    // discord_ids, so they never collide with these.
    const rows = await sql`
      INSERT INTO pilots (discord_id, callsign, display_name, avatar, linked)
      VALUES (${input.discordId}, ${input.callsign}, ${input.displayName}, ${input.avatar}, true)
      ON CONFLICT (discord_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            avatar = EXCLUDED.avatar,
            linked = true
      RETURNING *`;
    return rowToPilot(rows[0]);
  }
  let p = mem.pilots.find((x) => x.discordId === input.discordId);
  if (p) {
    p.displayName = input.displayName;
    p.avatar = input.avatar;
    p.linked = true;
  } else {
    p = {
      id: mem.nextPilotId++,
      discordId: input.discordId,
      callsign: input.callsign,
      displayName: input.displayName,
      avatar: input.avatar,
      createdAt: "2026-06-01T00:00:00Z",
      status: "pending",
      ifUsername: null,
      ifUserId: null,
      acceptedAt: null,
      notes: null,
      rankLabel: null,
      linked: true,
      baseMinutes: 0,
      basePireps: 0,
    };
    mem.pilots.push(p);
  }
  return p;
}

/* Add (or update) a roster member by hand from the Crew Center — an active,
   unlinked pilot keyed on callsign (discord_id = `import:<callsign>`), so the
   same call also updates an existing member with that callsign. Used by the
   "Add member" form and by bulk roster loads. */
export async function upsertManualPilot(input: {
  callsign: string;
  displayName?: string | null;
  ifUsername?: string | null;
  ifUserId?: string | null;
  rankLabel?: string | null;
  baseMinutes?: number;
  basePireps?: number;
}): Promise<Pilot> {
  const callsign = input.callsign.trim();
  const discordId = `import:${callsign}`;
  const displayName = input.displayName?.trim() || callsign;
  const ifUsername = input.ifUsername?.trim() || null;
  const ifUserId = input.ifUserId ?? null;
  const rankLabel = input.rankLabel?.trim() || null;
  const baseMinutes = Math.max(0, Math.round(input.baseMinutes ?? 0));
  const basePireps = Math.max(0, Math.round(input.basePireps ?? 0));

  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO pilots
        (discord_id, callsign, display_name, status, if_username, if_user_id,
         rank_label, linked, base_minutes, base_pireps, accepted_at)
      VALUES
        (${discordId}, ${callsign}, ${displayName}, 'active', ${ifUsername}, ${ifUserId},
         ${rankLabel}, false, ${baseMinutes}, ${basePireps}, now())
      ON CONFLICT (discord_id) DO UPDATE SET
        callsign = EXCLUDED.callsign,
        display_name = EXCLUDED.display_name,
        if_username = COALESCE(EXCLUDED.if_username, pilots.if_username),
        if_user_id = COALESCE(EXCLUDED.if_user_id, pilots.if_user_id),
        rank_label = COALESCE(EXCLUDED.rank_label, pilots.rank_label),
        base_minutes = GREATEST(EXCLUDED.base_minutes, pilots.base_minutes),
        base_pireps = GREATEST(EXCLUDED.base_pireps, pilots.base_pireps)
      RETURNING *`;
    return rowToPilot(rows[0]);
  }

  const existing = mem.pilots.find((p) => p.discordId === discordId);
  if (existing) {
    existing.callsign = callsign;
    existing.displayName = displayName;
    if (ifUsername) existing.ifUsername = ifUsername;
    if (ifUserId) existing.ifUserId = ifUserId;
    if (rankLabel) existing.rankLabel = rankLabel;
    existing.baseMinutes = Math.max(existing.baseMinutes, baseMinutes);
    existing.basePireps = Math.max(existing.basePireps, basePireps);
    return existing;
  }
  const p: Pilot = {
    id: mem.nextPilotId++,
    discordId,
    callsign,
    displayName,
    avatar: null,
    createdAt: new Date().toISOString(),
    status: "active",
    ifUsername,
    ifUserId,
    acceptedAt: new Date().toISOString(),
    notes: null,
    rankLabel,
    linked: false,
    baseMinutes,
    basePireps,
  };
  mem.pilots.push(p);
  return p;
}

export async function getPilotById(id: number): Promise<Pilot | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM pilots WHERE id = ${id}`;
    return rows[0] ? rowToPilot(rows[0]) : null;
  }
  return mem.pilots.find((p) => p.id === id) ?? null;
}

export async function getPilotByDiscordId(
  discordId: string,
): Promise<Pilot | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM pilots WHERE discord_id = ${discordId}`;
    return rows[0] ? rowToPilot(rows[0]) : null;
  }
  return mem.pilots.find((p) => p.discordId === discordId) ?? null;
}

/* Find a roster member by callsign (case-insensitive). Used by the bot's
   /register flow to reclaim an imported member or detect a taken callsign. */
export async function getPilotByCallsign(callsign: string): Promise<Pilot | null> {
  const cs = callsign.trim();
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM pilots WHERE LOWER(callsign) = LOWER(${cs}) LIMIT 1`;
    return rows[0] ? rowToPilot(rows[0]) : null;
  }
  return mem.pilots.find((p) => p.callsign.toLowerCase() === cs.toLowerCase()) ?? null;
}

export async function setPilotCallsign(
  pilotId: number,
  callsign: string,
): Promise<void> {
  const cs = callsign.trim();
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pilots SET callsign = ${cs} WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) p.callsign = cs;
}

/* Find a pilot by their Infinite Flight Community username (case-insensitive)
   — used by IFC-passcode login. */
export async function getPilotByIfUsername(ifUsername: string): Promise<Pilot | null> {
  const u = ifUsername.trim();
  if (!u) return null;
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM pilots WHERE LOWER(if_username) = LOWER(${u}) LIMIT 1`;
    return rows[0] ? rowToPilot(rows[0]) : null;
  }
  return (
    mem.pilots.find((p) => (p.ifUsername ?? "").toLowerCase() === u.toLowerCase()) ?? null
  );
}

/* Store (or clear with null) a pilot's IFC-login passcode hash. */
export async function setPilotPasscodeHash(
  pilotId: number,
  hash: string | null,
): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pilots SET passcode = ${hash} WHERE id = ${pilotId}`;
    return;
  }
  if (hash) mem.passcodes[pilotId] = hash;
  else delete mem.passcodes[pilotId];
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) p.hasPasscode = !!hash;
}

/* Read a pilot's passcode hash (server-only; never exposed to the client). */
export async function getPilotPasscodeHash(pilotId: number): Promise<string | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT passcode FROM pilots WHERE id = ${pilotId}`;
    return rows[0]?.passcode ?? null;
  }
  return mem.passcodes[pilotId] ?? null;
}

export async function createPirep(input: NewPirep): Promise<Pirep> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO pireps
        (pilot_id, flight_no, dep, arr, aircraft, minutes, raw_minutes, multiplier, multiplier_code,
         fuel_kg, landing_rate, server, remarks)
      VALUES
        (${input.pilotId}, ${input.flightNo}, ${input.dep}, ${input.arr}, ${input.aircraft},
         ${input.minutes}, ${input.rawMinutes}, ${input.multiplier}, ${input.multiplierCode},
         ${input.fuelKg}, ${input.landingRate}, ${input.server}, ${input.remarks})
      RETURNING *`;
    return rowToPirep(rows[0]);
  }
  const p: Pirep = {
    ...input,
    id: mem.nextPirepId++,
    status: "pending",
    filedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewer: null,
    reviewNote: null,
    discordMsgId: null,
  };
  mem.pireps.unshift(p);
  return p;
}

/* Most recent acceptance time (epoch ms) — the last pilot to join. Fallback
   cutoff for "new applications" when the Discord member list isn't available. */
export async function latestAcceptedAt(): Promise<number | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT MAX(accepted_at) AS m FROM pilots WHERE accepted_at IS NOT NULL`;
    return rows[0]?.m ? Date.parse(rows[0].m) : null;
  }
  const ts = mem.pilots
    .map((p) => (p.acceptedAt ? Date.parse(p.acceptedAt) : 0))
    .filter((n) => n > 0);
  return ts.length ? Math.max(...ts) : null;
}

export async function getPirepById(id: number): Promise<Pirep | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM pireps WHERE id = ${id}`;
    return rows[0] ? rowToPirep(rows[0]) : null;
  }
  return mem.pireps.find((p) => p.id === id) ?? null;
}

export async function setPirepDiscordMsg(id: number, msgId: string): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pireps SET discord_msg_id = ${msgId} WHERE id = ${id}`;
    return;
  }
  const p = mem.pireps.find((x) => x.id === id);
  if (p) p.discordMsgId = msgId;
}

export async function listPirepsByPilot(pilotId: number): Promise<Pirep[]> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT * FROM pireps WHERE pilot_id = ${pilotId} ORDER BY filed_at DESC`;
    return rows.map(rowToPirep);
  }
  return mem.pireps
    .filter((p) => p.pilotId === pilotId)
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt));
}

export async function listPireps(status?: PirepStatus): Promise<Pirep[]> {
  if (sql) {
    await ensureSchema();
    const rows = status
      ? await sql`SELECT * FROM pireps WHERE status = ${status} ORDER BY filed_at DESC`
      : await sql`SELECT * FROM pireps ORDER BY filed_at DESC`;
    return rows.map(rowToPirep);
  }
  const list = status ? mem.pireps.filter((p) => p.status === status) : mem.pireps;
  return [...list].sort((a, b) => b.filedAt.localeCompare(a.filedAt));
}

export async function updatePirepStatus(
  id: number,
  status: PirepStatus,
  reviewer: string,
  note: string | null = null,
): Promise<{ pilotId: number; flightNo: string; dep: string; arr: string } | null> {
  if (sql) {
    await ensureSchema();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const rows = await sql`
      UPDATE pireps
      SET status = ${status}, reviewed_at = now(), reviewer = ${reviewer}, review_note = ${note}
      WHERE id = ${id}
      RETURNING pilot_id, flight_no, dep, arr`;
    const r: any = rows[0];
    return r ? { pilotId: r.pilot_id, flightNo: r.flight_no ?? "", dep: r.dep ?? "", arr: r.arr ?? "" } : null;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
  const p = mem.pireps.find((x) => x.id === id);
  if (!p) return null;
  p.status = status;
  p.reviewedAt = new Date().toISOString();
  p.reviewer = reviewer;
  p.reviewNote = note;
  return { pilotId: p.pilotId, flightNo: p.flightNo, dep: p.dep, arr: p.arr };
}

export async function approvedMinutesForPilot(pilotId: number): Promise<number> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT COALESCE((SELECT base_minutes FROM pilots WHERE id = ${pilotId}), 0)
           + COALESCE(SUM(minutes) FILTER (WHERE status = 'approved'), 0) AS total
      FROM pireps WHERE pilot_id = ${pilotId}`;
    return Number(rows[0]?.total ?? 0);
  }
  const base = mem.pilots.find((p) => p.id === pilotId)?.baseMinutes ?? 0;
  return (
    base +
    mem.pireps
      .filter((p) => p.pilotId === pilotId && p.status === "approved")
      .reduce((n, p) => n + p.minutes, 0)
  );
}

export type LeaderRow = {
  pilot: Pilot;
  minutes: number;
  flights: number;
};

export async function leaderboard(): Promise<LeaderRow[]> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT p.*,
             p.base_minutes + COALESCE(SUM(r.minutes) FILTER (WHERE r.status='approved'), 0) AS minutes,
             p.base_pireps + COUNT(r.id) FILTER (WHERE r.status='approved') AS flights
      FROM pilots p
      LEFT JOIN pireps r ON r.pilot_id = p.id
      GROUP BY p.id
      ORDER BY minutes DESC`;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return rows.map((r: any) => ({
      pilot: rowToPilot(r),
      minutes: Number(r.minutes),
      flights: Number(r.flights),
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
  return mem.pilots
    .map((pilot) => {
      const approved = mem.pireps.filter(
        (p) => p.pilotId === pilot.id && p.status === "approved",
      );
      return {
        pilot,
        minutes: pilot.baseMinutes + approved.reduce((n, p) => n + p.minutes, 0),
        flights: pilot.basePireps + approved.length,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/* ====================== Windowed stats ====================== */

export type StatRange = "week" | "month" | "all";
export type StatMetric = "credited" | "raw";
export type StatRow = {
  pilot: Pilot;
  minutes: number; // total for the window, in the chosen metric
  flights: number; // approved flights in the window
  alltimeMinutes: number; // for deriving the pilot's current rank
};

/* Start of the current calendar week (Mon) / month, in UTC. null = all-time. */
function rangeCutoff(range: StatRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun … 6=Sat
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1)); // back to Monday
  return d;
}

/* Leaderboard scoped to a time window and a metric (credited vs raw hours).
   Base/historical totals only count toward all-time. */
export async function windowedLeaderboard(
  range: StatRange,
  metric: StatMetric,
): Promise<StatRow[]> {
  const cutoff = rangeCutoff(range);
  const iso = cutoff ? cutoff.toISOString() : null;
  const useRaw = metric === "raw";

  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT p.*,
        (CASE WHEN ${iso}::timestamptz IS NULL THEN p.base_minutes ELSE 0 END)
          + COALESCE(SUM(
              CASE WHEN r.status = 'approved'
                    AND (${iso}::timestamptz IS NULL OR r.filed_at >= ${iso}::timestamptz)
                   THEN (CASE WHEN ${useRaw} THEN COALESCE(r.raw_minutes, r.minutes) ELSE r.minutes END)
                   ELSE 0 END), 0) AS minutes,
        (CASE WHEN ${iso}::timestamptz IS NULL THEN p.base_pireps ELSE 0 END)
          + COUNT(r.id) FILTER (
              WHERE r.status = 'approved'
                AND (${iso}::timestamptz IS NULL OR r.filed_at >= ${iso}::timestamptz)) AS flights,
        p.base_minutes + COALESCE(SUM(r.minutes) FILTER (WHERE r.status = 'approved'), 0) AS alltime_minutes
      FROM pilots p
      LEFT JOIN pireps r ON r.pilot_id = p.id
      GROUP BY p.id
      ORDER BY minutes DESC`;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return rows.map((r: any) => ({
      pilot: rowToPilot(r),
      minutes: Number(r.minutes),
      flights: Number(r.flights),
      alltimeMinutes: Number(r.alltime_minutes),
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  return mem.pilots
    .map((pilot) => {
      const approved = mem.pireps.filter(
        (p) => p.pilotId === pilot.id && p.status === "approved",
      );
      const inWindow = approved.filter(
        (p) => !cutoff || new Date(p.filedAt) >= cutoff,
      );
      const windowMins = inWindow.reduce(
        (n, p) => n + (useRaw ? p.rawMinutes ?? p.minutes : p.minutes),
        0,
      );
      const base = cutoff ? 0 : pilot.baseMinutes;
      const baseP = cutoff ? 0 : pilot.basePireps;
      return {
        pilot,
        minutes: base + windowMins,
        flights: baseP + inWindow.length,
        alltimeMinutes:
          pilot.baseMinutes + approved.reduce((n, p) => n + p.minutes, 0),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/* ====================== Crew Center ====================== */

export type RosterRow = {
  pilot: Pilot;
  minutes: number;
  approved: number;
  pending: number;
};

export async function listRoster(status?: PilotStatus): Promise<RosterRow[]> {
  if (sql) {
    await ensureSchema();
    const rows = status
      ? await sql`
          SELECT p.*,
                 p.base_minutes + COALESCE(SUM(r.minutes) FILTER (WHERE r.status='approved'),0) AS minutes,
                 p.base_pireps + COUNT(r.id) FILTER (WHERE r.status='approved') AS approved,
                 COUNT(r.id) FILTER (WHERE r.status='pending') AS pending
          FROM pilots p LEFT JOIN pireps r ON r.pilot_id = p.id
          WHERE p.status = ${status}
          GROUP BY p.id ORDER BY minutes DESC`
      : await sql`
          SELECT p.*,
                 p.base_minutes + COALESCE(SUM(r.minutes) FILTER (WHERE r.status='approved'),0) AS minutes,
                 p.base_pireps + COUNT(r.id) FILTER (WHERE r.status='approved') AS approved,
                 COUNT(r.id) FILTER (WHERE r.status='pending') AS pending
          FROM pilots p LEFT JOIN pireps r ON r.pilot_id = p.id
          GROUP BY p.id ORDER BY minutes DESC`;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return rows.map((r: any) => ({
      pilot: rowToPilot(r),
      minutes: Number(r.minutes),
      approved: Number(r.approved),
      pending: Number(r.pending),
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
  return mem.pilots
    .filter((p) => !status || p.status === status)
    .map((pilot) => {
      const flights = mem.pireps.filter((p) => p.pilotId === pilot.id);
      const approvedFlights = flights.filter((p) => p.status === "approved");
      return {
        pilot,
        minutes: pilot.baseMinutes + approvedFlights.reduce((n, p) => n + p.minutes, 0),
        approved: pilot.basePireps + approvedFlights.length,
        pending: flights.filter((p) => p.status === "pending").length,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/* Active pilots who haven't filed a PIREP in `days`+ days (or never filed),
   for staff activity tracking. Returns each pilot with their last filing date
   (null = never), oldest/never first. */
export async function listInactivePilots(
  days = 31,
): Promise<{ pilot: Pilot; lastPirepAt: string | null; daysSince: number | null }[]> {
  const cutoffMs = Date.now() - days * 86_400_000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const withMeta = (pilot: Pilot, last: string | null) => ({
    pilot,
    lastPirepAt: last,
    daysSince: last ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000) : null,
  });
  if (sql) {
    await ensureSchema();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const rows = await sql`
      SELECT p.*, MAX(r.filed_at) AS last_pirep
      FROM pilots p LEFT JOIN pireps r ON r.pilot_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id
      HAVING MAX(r.filed_at) IS NULL OR MAX(r.filed_at) < ${cutoffIso}::timestamptz
      ORDER BY MAX(r.filed_at) ASC NULLS FIRST`;
    return rows.map((r: any) => withMeta(rowToPilot(r), r.last_pirep ? new Date(r.last_pirep).toISOString() : null));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
  return mem.pilots
    .filter((p) => p.status === "active")
    .map((pilot) => {
      const filed = mem.pireps
        .filter((x) => x.pilotId === pilot.id)
        .map((x) => x.filedAt)
        .sort();
      return { pilot, last: filed.length ? filed[filed.length - 1] : null };
    })
    .filter(({ last }) => !last || new Date(last).getTime() < cutoffMs)
    .sort((a, b) => (a.last ?? "").localeCompare(b.last ?? ""))
    .map(({ pilot, last }) => withMeta(pilot, last));
}

export async function updatePilotStatus(
  pilotId: number,
  status: PilotStatus,
): Promise<void> {
  if (sql) {
    await ensureSchema();
    if (status === "active") {
      await sql`UPDATE pilots SET status='active', accepted_at=COALESCE(accepted_at, now()) WHERE id=${pilotId}`;
    } else {
      await sql`UPDATE pilots SET status=${status} WHERE id=${pilotId}`;
    }
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) {
    p.status = status;
    if (status === "active" && !p.acceptedAt) p.acceptedAt = "2026-06-01T00:00:00Z";
  }
}

/* Link an imported/unlinked member to a real Discord account so they can
   sign in. The Discord ID must be the numeric account ID (snowflake) that
   OAuth returns, so the login flow matches this record. */
export async function setPilotDiscord(
  pilotId: number,
  discordId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (sql) {
    await ensureSchema();
    const existing = await sql`SELECT id FROM pilots WHERE discord_id = ${discordId} AND id <> ${pilotId}`;
    if (existing.length > 0) {
      return { ok: false, error: "That Discord account is already linked to another pilot." };
    }
    await sql`UPDATE pilots SET discord_id = ${discordId}, linked = true WHERE id = ${pilotId}`;
    return { ok: true };
  }
  if (mem.pilots.some((p) => p.discordId === discordId && p.id !== pilotId)) {
    return { ok: false, error: "That Discord account is already linked to another pilot." };
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) {
    p.discordId = discordId;
    p.linked = true;
  }
  return { ok: true };
}

/* Set (or clear, with null) a pilot's explicit rank. null reverts to the
   hours-derived rank. */
export async function setPilotRankLabel(
  pilotId: number,
  rankLabel: string | null,
): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pilots SET rank_label = ${rankLabel} WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) p.rankLabel = rankLabel;
}

/* Edit a pilot's core profile from the Crew Center (callsign, display name,
   carried-over hours/PIREPs). Only provided fields change. */
export async function updatePilotProfile(
  pilotId: number,
  input: {
    callsign?: string;
    displayName?: string;
    baseMinutes?: number;
    basePireps?: number;
  },
): Promise<void> {
  const callsign = input.callsign?.trim();
  const displayName = input.displayName?.trim();
  const baseMinutes =
    input.baseMinutes != null ? Math.max(0, Math.round(input.baseMinutes)) : undefined;
  const basePireps =
    input.basePireps != null ? Math.max(0, Math.round(input.basePireps)) : undefined;

  if (sql) {
    await ensureSchema();
    await sql`
      UPDATE pilots SET
        callsign = COALESCE(${callsign ?? null}, callsign),
        display_name = COALESCE(${displayName ?? null}, display_name),
        base_minutes = COALESCE(${baseMinutes ?? null}, base_minutes),
        base_pireps = COALESCE(${basePireps ?? null}, base_pireps)
      WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) {
    if (callsign) p.callsign = callsign;
    if (displayName) p.displayName = displayName;
    if (baseMinutes != null) p.baseMinutes = baseMinutes;
    if (basePireps != null) p.basePireps = basePireps;
  }
}

/* Detach a pilot's Discord account: revert to an unlinked roster member
   (reclaimable later via /register by callsign). Keeps their hours/rank. */
export async function unlinkPilotDiscord(pilotId: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`
      UPDATE pilots
      SET discord_id = 'import:unlinked-' || id, linked = false
      WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) {
    p.discordId = `import:unlinked-${p.id}`;
    p.linked = false;
  }
}

/* Permanently remove a pilot (and their PIREPs) from the Crew Center. */
export async function deletePilot(pilotId: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`DELETE FROM pilots WHERE id = ${pilotId}`;
    return;
  }
  mem.pilots = mem.pilots.filter((p) => p.id !== pilotId);
  mem.pireps = mem.pireps.filter((p) => p.pilotId !== pilotId);
}

/* Delete every filed PIREP for a pilot (used by the staff "reset flights"
   action). Combined with zeroing the carried-over totals, this fully resets a
   pilot's hours/PIREP count. Returns how many were deleted. */
export async function deletePilotPireps(pilotId: number): Promise<number> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`DELETE FROM pireps WHERE pilot_id = ${pilotId} RETURNING id`;
    return rows.length;
  }
  const before = mem.pireps.length;
  mem.pireps = mem.pireps.filter((p) => p.pilotId !== pilotId);
  return before - mem.pireps.length;
}

/* Delete a single filed PIREP by id. */
export async function deletePirep(id: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`DELETE FROM pireps WHERE id = ${id}`;
    return;
  }
  mem.pireps = mem.pireps.filter((p) => p.id !== id);
}

/* Add a disciplinary warning/strike. `at` is set server-side. */
export async function addPilotWarning(
  pilotId: number,
  reason: string,
  at: string,
): Promise<void> {
  const entry = { reason: reason.trim(), at };
  if (sql) {
    await ensureSchema();
    await sql`
      UPDATE pilots
      SET warnings = COALESCE(warnings, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb
      WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) p.warnings = [...(p.warnings ?? []), entry];
}

export async function clearPilotWarnings(pilotId: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pilots SET warnings = '[]'::jsonb WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) p.warnings = [];
}

/* Grant or revoke app-managed admin/staff access for a pilot. */
export async function setPilotStaff(pilotId: number, isStaff: boolean): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pilots SET is_staff = ${isStaff} WHERE id = ${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) p.isStaff = isStaff;
}

/* Is this pilot an app-managed admin? (independent of Discord roles) */
export async function isPilotStaff(pilotId: number): Promise<boolean> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT is_staff FROM pilots WHERE id = ${pilotId}`;
    return rows[0]?.is_staff === true;
  }
  return mem.pilots.find((p) => p.id === pilotId)?.isStaff === true;
}

export async function setPilotIfIdentity(
  pilotId: number,
  ifUsername: string | null,
  ifUserId: string | null,
): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE pilots SET if_username=${ifUsername}, if_user_id=${ifUserId} WHERE id=${pilotId}`;
    return;
  }
  const p = mem.pilots.find((x) => x.id === pilotId);
  if (p) {
    p.ifUsername = ifUsername;
    p.ifUserId = ifUserId;
  }
}

export type PublicStats = {
  totalMinutes: number;
  pirepCount: number;
  members: number;
};

/* Community-wide stats for the public home page. */
export async function publicStats(): Promise<PublicStats> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT
        (SELECT COALESCE(SUM(base_minutes),0) FROM pilots)
          + COALESCE(SUM(minutes) FILTER (WHERE status='approved'), 0) AS minutes,
        (SELECT COALESCE(SUM(base_pireps),0) FROM pilots) + COUNT(*) AS pireps,
        (SELECT COUNT(*) FROM pilots WHERE status <> 'pending') AS members
      FROM pireps`;
    const r = rows[0];
    return {
      totalMinutes: Number(r.minutes),
      pirepCount: Number(r.pireps),
      members: Number(r.members),
    };
  }
  const approved = mem.pireps.filter((p) => p.status === "approved");
  const baseMin = mem.pilots.reduce((n, p) => n + p.baseMinutes, 0);
  const basePir = mem.pilots.reduce((n, p) => n + p.basePireps, 0);
  return {
    totalMinutes: baseMin + approved.reduce((n, p) => n + p.minutes, 0),
    pirepCount: basePir + mem.pireps.length,
    members: mem.pilots.filter((p) => p.status !== "pending").length,
  };
}

export type CrewStats = {
  activePilots: number;
  pendingPilots: number;
  pendingPireps: number;
  totalMinutes: number;
};

export async function crewStats(): Promise<CrewStats> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT
        (SELECT COUNT(*) FROM pilots WHERE status='active') AS active_pilots,
        (SELECT COUNT(*) FROM pilots WHERE status='pending') AS pending_pilots,
        (SELECT COUNT(*) FROM pireps WHERE status='pending') AS pending_pireps,
        (SELECT COALESCE(SUM(minutes),0) FROM pireps WHERE status='approved') AS total_minutes`;
    const r = rows[0];
    return {
      activePilots: Number(r.active_pilots),
      pendingPilots: Number(r.pending_pilots),
      pendingPireps: Number(r.pending_pireps),
      totalMinutes: Number(r.total_minutes),
    };
  }
  return {
    activePilots: mem.pilots.filter((p) => p.status === "active").length,
    pendingPilots: mem.pilots.filter((p) => p.status === "pending").length,
    pendingPireps: mem.pireps.filter((p) => p.status === "pending").length,
    totalMinutes: mem.pireps
      .filter((p) => p.status === "approved")
      .reduce((n, p) => n + p.minutes, 0),
  };
}

/* ====================== Staff search ====================== */

export async function searchPilots(q: string, limit = 8): Promise<Pilot[]> {
  const term = `%${q.trim()}%`;
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT * FROM pilots
      WHERE callsign ILIKE ${term}
         OR display_name ILIKE ${term}
         OR if_username ILIKE ${term}
         OR discord_id ILIKE ${term}
      ORDER BY callsign
      LIMIT ${limit}`;
    return rows.map(rowToPilot);
  }
  const t = q.trim().toLowerCase();
  return mem.pilots
    .filter(
      (p) =>
        p.callsign.toLowerCase().includes(t) ||
        p.displayName.toLowerCase().includes(t) ||
        (p.ifUsername ?? "").toLowerCase().includes(t) ||
        p.discordId.toLowerCase().includes(t),
    )
    .slice(0, limit);
}

export type PirepSearchRow = { pirep: Pirep; callsign: string };

export async function searchPireps(q: string, limit = 8): Promise<PirepSearchRow[]> {
  const term = `%${q.trim()}%`;
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT r.*, p.callsign AS pilot_callsign
      FROM pireps r
      JOIN pilots p ON p.id = r.pilot_id
      WHERE r.flight_no ILIKE ${term}
         OR r.dep ILIKE ${term}
         OR r.arr ILIKE ${term}
         OR r.aircraft ILIKE ${term}
         OR p.callsign ILIKE ${term}
      ORDER BY r.filed_at DESC
      LIMIT ${limit}`;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return rows.map((r: any) => ({ pirep: rowToPirep(r), callsign: r.pilot_callsign ?? "" }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
  const t = q.trim().toLowerCase();
  const byId = new Map(mem.pilots.map((p) => [p.id, p.callsign]));
  return mem.pireps
    .filter((r) => {
      const cs = (byId.get(r.pilotId) ?? "").toLowerCase();
      return (
        r.flightNo.toLowerCase().includes(t) ||
        r.dep.toLowerCase().includes(t) ||
        r.arr.toLowerCase().includes(t) ||
        r.aircraft.toLowerCase().includes(t) ||
        cs.includes(t)
      );
    })
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt))
    .slice(0, limit)
    .map((pirep) => ({ pirep, callsign: byId.get(pirep.pilotId) ?? "" }));
}

/* ========================== News ========================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToNews(r: any): NewsPost {
  return {
    id: r.id,
    title: r.title ?? "",
    body: r.body ?? "",
    category: r.category ?? "Announcement",
    imageUrl: r.image_url ?? null,
    author: r.author ?? "",
    createdAt: new Date(r.created_at).toISOString(),
    eventAt: r.event_at ? new Date(r.event_at).toISOString() : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listNews(limit?: number): Promise<NewsPost[]> {
  if (sql) {
    await ensureSchema();
    const rows = limit
      ? await sql`SELECT * FROM news ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM news ORDER BY created_at DESC`;
    return rows.map(rowToNews);
  }
  const list = [...mem.news].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit ? list.slice(0, limit) : list;
}

export async function getNewsPost(id: number): Promise<NewsPost | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM news WHERE id = ${id}`;
    return rows[0] ? rowToNews(rows[0]) : null;
  }
  return mem.news.find((n) => n.id === id) ?? null;
}

export async function createNews(input: NewNews): Promise<NewsPost> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO news (title, body, category, image_url, author, event_at)
      VALUES (${input.title}, ${input.body}, ${input.category}, ${input.imageUrl}, ${input.author}, ${input.eventAt ?? null})
      RETURNING *`;
    return rowToNews(rows[0]);
  }
  const post: NewsPost = {
    id: mem.nextNewsId++,
    title: input.title,
    body: input.body,
    category: input.category,
    imageUrl: input.imageUrl,
    author: input.author,
    createdAt: new Date().toISOString(),
    eventAt: input.eventAt ?? null,
  };
  mem.news.unshift(post);
  return post;
}

export async function deleteNews(id: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`DELETE FROM news WHERE id = ${id}`;
    return;
  }
  mem.news = mem.news.filter((n) => n.id !== id);
}

/* ====================== Leave of Absence ====================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToLoa(r: any): Loa {
  return {
    id: r.id,
    pilotId: r.pilot_id,
    reason: r.reason ?? "",
    days: Number(r.days ?? 0),
    status: (r.status ?? "pending") as LoaStatus,
    startAt: r.start_at ? new Date(r.start_at).toISOString() : null,
    endAt: r.end_at ? new Date(r.end_at).toISOString() : null,
    extDays: Number(r.ext_days ?? 0),
    extStatus: (r.ext_status ?? "none") as LoaExtStatus,
    extReason: r.ext_reason ?? null,
    createdAt: new Date(r.created_at).toISOString(),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
    reviewer: r.reviewer ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function addDaysISO(fromISO: string, days: number): string {
  return new Date(new Date(fromISO).getTime() + days * 86400000).toISOString();
}

/* The pilot's current LOA (pending or active), if any. */
export async function getCurrentLoa(pilotId: number): Promise<Loa | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      SELECT * FROM loas WHERE pilot_id = ${pilotId}
        AND status IN ('pending','active')
      ORDER BY created_at DESC LIMIT 1`;
    return rows[0] ? rowToLoa(rows[0]) : null;
  }
  return (
    mem.loas
      .filter((l) => l.pilotId === pilotId && (l.status === "pending" || l.status === "active"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export async function getLoaById(id: number): Promise<Loa | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM loas WHERE id = ${id}`;
    return rows[0] ? rowToLoa(rows[0]) : null;
  }
  return mem.loas.find((l) => l.id === id) ?? null;
}

/* Apply for a LOA (pending). Fails if the pilot already has one open. */
export async function createLoa(
  pilotId: number,
  reason: string,
  days: number,
): Promise<{ ok: boolean; error?: string; loa?: Loa }> {
  const d = Math.max(1, Math.min(LOA_MAX_DAYS, Math.round(days)));
  if (reason.trim().length < 3) return { ok: false, error: "Please give a reason." };
  const existing = await getCurrentLoa(pilotId);
  if (existing) {
    return {
      ok: false,
      error:
        existing.status === "pending"
          ? "You already have a LOA awaiting review."
          : "You're already on an active LOA.",
    };
  }
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO loas (pilot_id, reason, days)
      VALUES (${pilotId}, ${reason.trim()}, ${d})
      RETURNING *`;
    return { ok: true, loa: rowToLoa(rows[0]) };
  }
  const loa: Loa = {
    id: mem.nextLoaId++,
    pilotId,
    reason: reason.trim(),
    days: d,
    status: "pending",
    startAt: null,
    endAt: null,
    extDays: 0,
    extStatus: "none",
    extReason: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewer: null,
  };
  mem.loas.unshift(loa);
  return { ok: true, loa };
}

export async function listLoas(status?: LoaStatus): Promise<Loa[]> {
  if (sql) {
    await ensureSchema();
    const rows = status
      ? await sql`SELECT * FROM loas WHERE status = ${status} ORDER BY created_at DESC`
      : await sql`SELECT * FROM loas ORDER BY created_at DESC`;
    return rows.map(rowToLoa);
  }
  const list = status ? mem.loas.filter((l) => l.status === status) : mem.loas;
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* Staff: accept a pending LOA → active, starting now. */
export async function acceptLoa(id: number, reviewer: string): Promise<void> {
  const now = new Date().toISOString();
  if (sql) {
    await ensureSchema();
    await sql`
      UPDATE loas
      SET status='active', start_at=now(), end_at=now() + (days || ' days')::interval,
          reviewed_at=now(), reviewer=${reviewer}
      WHERE id=${id} AND status='pending'`;
    return;
  }
  const l = mem.loas.find((x) => x.id === id && x.status === "pending");
  if (l) {
    l.status = "active";
    l.startAt = now;
    l.endAt = addDaysISO(now, l.days);
    l.reviewedAt = now;
    l.reviewer = reviewer;
  }
}

export async function rejectLoa(id: number, reviewer: string): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE loas SET status='rejected', reviewed_at=now(), reviewer=${reviewer} WHERE id=${id} AND status='pending'`;
    return;
  }
  const l = mem.loas.find((x) => x.id === id && x.status === "pending");
  if (l) {
    l.status = "rejected";
    l.reviewedAt = new Date().toISOString();
    l.reviewer = reviewer;
  }
}

/* End a LOA early (staff or auto). */
export async function endLoa(id: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE loas SET status='ended' WHERE id=${id} AND status='active'`;
    return;
  }
  const l = mem.loas.find((x) => x.id === id && x.status === "active");
  if (l) l.status = "ended";
}

/* Pilot: request an extension — only on an active LOA in its final week. */
export async function requestLoaExtension(
  id: number,
  pilotId: number,
  extDays: number,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const d = Math.max(1, Math.min(LOA_MAX_EXT_DAYS, Math.round(extDays)));
  const loa = await getLoaById(id);
  if (!loa || loa.pilotId !== pilotId) return { ok: false, error: "LOA not found." };
  if (loa.status !== "active" || !loa.endAt) return { ok: false, error: "LOA isn't active." };
  if (loa.extStatus === "pending") return { ok: false, error: "An extension is already pending." };
  const msToEnd = new Date(loa.endAt).getTime() - Date.now();
  if (msToEnd > LOA_EXT_WINDOW_DAYS * 86400000) {
    return { ok: false, error: "Extensions can only be requested in the last week." };
  }
  if (sql) {
    await ensureSchema();
    await sql`UPDATE loas SET ext_days=${d}, ext_status='pending', ext_reason=${reason.trim() || null} WHERE id=${id}`;
    return { ok: true };
  }
  const l = mem.loas.find((x) => x.id === id)!;
  l.extDays = d;
  l.extStatus = "pending";
  l.extReason = reason.trim() || null;
  return { ok: true };
}

/* Staff: approve an extension (adds to end_at). `manualDays` lets staff grant
   one directly without a pilot request. */
export async function approveLoaExtension(
  id: number,
  reviewer: string,
  manualDays?: number,
): Promise<{ ok: boolean; error?: string }> {
  const loa = await getLoaById(id);
  if (!loa || loa.status !== "active" || !loa.endAt) {
    return { ok: false, error: "LOA isn't active." };
  }
  const days =
    manualDays != null
      ? Math.max(1, Math.min(LOA_MAX_EXT_DAYS, Math.round(manualDays)))
      : loa.extDays;
  if (!days) return { ok: false, error: "No extension to approve." };
  const newEnd = addDaysISO(loa.endAt, days);
  if (sql) {
    await ensureSchema();
    await sql`UPDATE loas SET end_at=${newEnd}, ext_status='approved', ext_days=${days}, reviewed_at=now(), reviewer=${reviewer} WHERE id=${id}`;
    return { ok: true };
  }
  const l = mem.loas.find((x) => x.id === id)!;
  l.endAt = newEnd;
  l.extStatus = "approved";
  l.extDays = days;
  l.reviewedAt = new Date().toISOString();
  l.reviewer = reviewer;
  return { ok: true };
}

export async function rejectLoaExtension(id: number, reviewer: string): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE loas SET ext_status='rejected', reviewed_at=now(), reviewer=${reviewer} WHERE id=${id}`;
    return;
  }
  const l = mem.loas.find((x) => x.id === id);
  if (l) {
    l.extStatus = "rejected";
    l.reviewer = reviewer;
  }
}

/* ============================ Reports ============================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToReport(r: any): Report {
  return {
    id: r.id,
    category: (r.category ?? "other") as ReportCategory,
    target: r.target ?? null,
    message: r.message ?? "",
    reporterPilotId: r.reporter_pilot_id ?? null,
    reporterName: r.reporter_name ?? null,
    status: (r.status ?? "open") as ReportStatus,
    createdAt: new Date(r.created_at).toISOString(),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
    resolver: r.resolver ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function createReport(input: {
  category: ReportCategory;
  target?: string | null;
  message: string;
  reporterPilotId?: number | null;
  reporterName?: string | null;
}): Promise<{ ok: boolean; error?: string; report?: Report }> {
  const message = input.message.trim();
  if (message.length < 5) {
    return { ok: false, error: "Please describe the issue (at least a few words)." };
  }
  const allowed: ReportCategory[] = ["bug", "player", "staff", "other"];
  const category = allowed.includes(input.category) ? input.category : "other";
  const target = input.target?.trim() || null;
  const reporterName = input.reporterName?.trim() || null;
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO reports (category, target, message, reporter_pilot_id, reporter_name)
      VALUES (${category}, ${target}, ${message}, ${input.reporterPilotId ?? null}, ${reporterName})
      RETURNING *`;
    return { ok: true, report: rowToReport(rows[0]) };
  }
  const report: Report = {
    id: mem.nextReportId++,
    category,
    target,
    message,
    reporterPilotId: input.reporterPilotId ?? null,
    reporterName,
    status: "open",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolver: null,
  };
  mem.reports.unshift(report);
  return { ok: true, report };
}

export async function listReports(status?: ReportStatus): Promise<Report[]> {
  if (sql) {
    await ensureSchema();
    const rows = status
      ? await sql`SELECT * FROM reports WHERE status = ${status} ORDER BY created_at DESC`
      : await sql`SELECT * FROM reports ORDER BY created_at DESC`;
    return rows.map(rowToReport);
  }
  const list = status ? mem.reports.filter((r) => r.status === status) : mem.reports;
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReportById(id: number): Promise<Report | null> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM reports WHERE id = ${id}`;
    return rows[0] ? rowToReport(rows[0]) : null;
  }
  return mem.reports.find((r) => r.id === id) ?? null;
}

export async function updateReportStatus(
  id: number,
  status: ReportStatus,
  resolver: string,
): Promise<void> {
  const resolving = status !== "open";
  if (sql) {
    await ensureSchema();
    if (resolving) {
      await sql`UPDATE reports SET status=${status}, resolved_at=now(), resolver=${resolver} WHERE id=${id}`;
    } else {
      await sql`UPDATE reports SET status=${status}, resolved_at=NULL, resolver=NULL WHERE id=${id}`;
    }
    return;
  }
  const r = mem.reports.find((x) => x.id === id);
  if (r) {
    r.status = status;
    r.resolvedAt = resolving ? new Date().toISOString() : null;
    r.resolver = resolving ? resolver : null;
  }
}

/* ====================== Purchases (wallet spend ledger) ====================== */
/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToPurchase(r: any): Purchase {
  return {
    id: r.id,
    pilotId: r.pilot_id,
    kind: r.kind,
    item: r.item,
    cost: Number(r.cost),
    currency: r.currency,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listPurchases(pilotId: number): Promise<Purchase[]> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM purchases WHERE pilot_id=${pilotId} ORDER BY created_at`;
    return rows.map(rowToPurchase);
  }
  return mem.purchases.filter((p) => p.pilotId === pilotId);
}

/* Record a purchase (license or codeshare unlock). Idempotent per
   (pilot, kind, item) — a second buy is rejected as already-owned. Balance is
   validated by the caller before this is invoked. */
export async function recordPurchase(input: {
  pilotId: number;
  kind: "license" | "codeshare";
  item: string;
  cost: number;
  currency: "AP" | "LC";
}): Promise<{ ok: boolean; error?: string }> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO purchases (pilot_id, kind, item, cost, currency)
      VALUES (${input.pilotId}, ${input.kind}, ${input.item}, ${input.cost}, ${input.currency})
      ON CONFLICT (pilot_id, kind, item) DO NOTHING
      RETURNING id`;
    return rows.length ? { ok: true } : { ok: false, error: "Already owned." };
  }
  if (mem.purchases.some((p) => p.pilotId === input.pilotId && p.kind === input.kind && p.item === input.item)) {
    return { ok: false, error: "Already owned." };
  }
  mem.purchases.push({ id: mem.nextPurchaseId++, ...input, createdAt: new Date().toISOString() });
  return { ok: true };
}

/* ====================== Notifications ====================== */
/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToNotification(r: any): Notification {
  return {
    id: r.id,
    pilotId: r.pilot_id,
    kind: r.kind,
    title: r.title,
    body: r.body ?? null,
    read: !!r.read,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function createNotification(input: {
  pilotId: number;
  kind: string;
  title: string;
  body?: string | null;
}): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`INSERT INTO notifications (pilot_id, kind, title, body)
              VALUES (${input.pilotId}, ${input.kind}, ${input.title}, ${input.body ?? null})`;
    return;
  }
  mem.notifications.push({
    id: mem.nextNotifId++,
    pilotId: input.pilotId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function listNotifications(pilotId: number, limit = 30): Promise<Notification[]> {
  if (sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM notifications WHERE pilot_id=${pilotId} ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToNotification);
  }
  return mem.notifications
    .filter((n) => n.pilotId === pilotId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

export async function markNotificationsRead(pilotId: number): Promise<void> {
  if (sql) {
    await ensureSchema();
    await sql`UPDATE notifications SET read=true WHERE pilot_id=${pilotId} AND read=false`;
    return;
  }
  mem.notifications.forEach((n) => { if (n.pilotId === pilotId) n.read = true; });
}
