/* ----------------------------------------------------------------
   Portable database backup — no pg_dump / psql required.

   Dumps every public table to a single JSON file you can archive or
   hand off. Run from the project root with the Neon connection string
   (get it from the Vercel dashboard → Settings → Environment Variables
   → DATABASE_URL, or from the Neon console):

     DATABASE_URL="postgres://…" node scripts/dump-db.mjs

   ⚠️  The output contains pilot personal data (names, IFC/Discord ids,
   PIREPs). Treat it like the database itself — share only with people
   you'd give database access to.
------------------------------------------------------------------- */

import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL first, e.g.  DATABASE_URL="postgres://…" node scripts/dump-db.mjs');
  process.exit(1);
}

const sql = neon(url);

const tables = (
  await sql.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  )
).map((r) => r.table_name);

const dump = { exportedAt: new Date().toISOString(), tables: {} };
for (const t of tables) {
  const rows = await sql.query(`SELECT * FROM "${t}"`);
  dump.tables[t] = rows;
  console.log(`  ${t}: ${rows.length} rows`);
}

const out = `xiamenair-dump-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(out, JSON.stringify(dump, null, 2));
console.log(`\n✓ Wrote ${out} — ${tables.length} tables.`);
