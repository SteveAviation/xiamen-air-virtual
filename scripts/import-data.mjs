/* ----------------------------------------------------------------
   One-time import of the legacy roster + PIREP history into Postgres.

   Reads data/members.csv and data/pireps.csv and loads them into the
   same Neon database the site + bot use. Run ONCE after DATABASE_URL is
   set (re-running is safe — members upsert by callsign; pireps are only
   inserted if the table is empty to avoid duplicates):

     DATABASE_URL=postgres://... \
     node scripts/import-data.mjs

   Imported members are created UNLINKED (a placeholder discord_id) with
   their real rank — link them to a Discord account in the Crew Center so
   they can sign in.
------------------------------------------------------------------- */

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to run the import.");
  process.exit(1);
}
const sql = neon(url);

function parseCSV(text) {
  const rows = []; let row = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function read(name) {
  const rows = parseCSV(fs.readFileSync(path.join("data", name), "utf8")).filter((r) => r.length > 1);
  const header = rows.shift().map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function hmToMinutes(s) {
  const m = /(\d+)h\s*(\d+)m/.exec(s || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}
function cleanRank(s) {
  return (s || "").replace(/\s*Rank$/i, "").trim() || null;
}
function intOrNull(s) {
  const n = parseInt(String(s).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
function dateOrNull(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function ensureSchema() {
  await sql`CREATE TABLE IF NOT EXISTS pilots (
    id SERIAL PRIMARY KEY, discord_id TEXT UNIQUE NOT NULL, callsign TEXT,
    display_name TEXT, avatar TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  for (const col of [
    "status TEXT NOT NULL DEFAULT 'pending'", "if_username TEXT", "if_user_id TEXT",
    "accepted_at TIMESTAMPTZ", "notes TEXT", "rank_label TEXT",
    "linked BOOLEAN NOT NULL DEFAULT true",
    "base_minutes INTEGER NOT NULL DEFAULT 0", "base_pireps INTEGER NOT NULL DEFAULT 0",
  ]) {
    await sql(`ALTER TABLE pilots ADD COLUMN IF NOT EXISTS ${col}`);
  }
  await sql`CREATE TABLE IF NOT EXISTS pireps (
    id SERIAL PRIMARY KEY, pilot_id INTEGER REFERENCES pilots(id) ON DELETE CASCADE,
    flight_no TEXT, dep TEXT, arr TEXT, aircraft TEXT, minutes INTEGER NOT NULL,
    fuel_kg INTEGER, landing_rate INTEGER, server TEXT, remarks TEXT,
    status TEXT NOT NULL DEFAULT 'pending', filed_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ, reviewer TEXT)`;
}

async function importMembers() {
  const members = read("members.csv").filter((m) => m.callsign);
  const byCallsign = new Map();
  for (const m of members) {
    const discordId = `import:${m.callsign}`;
    const rows = await sql`
      INSERT INTO pilots
        (discord_id, callsign, display_name, status, rank_label, linked, accepted_at, base_minutes, base_pireps)
      VALUES
        (${discordId}, ${m.callsign}, ${m.callsign}, 'active', ${cleanRank(m.pilotRank)}, false,
         ${dateOrNull(m.joinDate)}, ${hmToMinutes(m.flightTime)}, ${intOrNull(m.pirepCount) ?? 0})
      ON CONFLICT (discord_id) DO UPDATE SET
        rank_label = EXCLUDED.rank_label,
        base_minutes = EXCLUDED.base_minutes,
        base_pireps = EXCLUDED.base_pireps
      RETURNING id`;
    byCallsign.set(m.callsign, rows[0].id);
  }
  console.log(`✓ Members: ${byCallsign.size}`);
  return byCallsign;
}

async function importPireps(byCallsign) {
  const existing = await sql`SELECT COUNT(*)::int AS n FROM pireps`;
  if (existing[0].n > 0) {
    console.log(`• PIREPs table already has ${existing[0].n} rows — skipping import.`);
    return;
  }
  const pireps = read("pireps.csv").filter(
    (p) => p.pilot && p.pilot !== "Callsign Missing" && p.flightNumber !== "TEST",
  );
  let n = 0;
  for (const p of pireps) {
    const pilotId = byCallsign.get(p.pilot);
    if (!pilotId) continue; // pilot not in roster
    const status = (p.state || "").toLowerCase() === "approved" ? "approved" : "pending";
    await sql`
      INSERT INTO pireps (pilot_id, flight_no, dep, arr, aircraft, minutes, fuel_kg, server, remarks, status, filed_at, reviewed_at, reviewer)
      VALUES (${pilotId}, ${p.flightNumber}, ${p.departureICAO}, ${p.arrivalICAO}, ${p.aircraft},
              ${intOrNull(p.flightTime) ?? 0}, ${intOrNull(p.fuelUsage)}, ${p.operator || null},
              ${p.comments || null}, ${status}, ${dateOrNull(p.flightDate)}, ${dateOrNull(p.reportDate)}, 'import')`;
    n++;
    if (n % 100 === 0) console.log(`  …${n} pireps`);
  }
  console.log(`✓ PIREPs: ${n}`);
}

await ensureSchema();
await importMembers();
// Historical totals live in each pilot's base_minutes / base_pireps (set above),
// so individual legacy PIREPs are NOT imported (that would double-count). New
// PIREPs filed via the site/bot accumulate on top of these totals.
console.log("Done. Link members to Discord accounts in the Crew Center to enable their logins.");
