/* ----------------------------------------------------------------
   Xiamen Air Virtual — editable site configuration (the CMS data layer).

   A single JSON document of content that staff (and the Aileron control
   plane) can edit without a redeploy: brand copy, headline stats, a
   site-wide announcement banner, and feature flags. Stored in Neon
   (`site_config` table, one row) with an in-memory demo fallback.

   Read it with getSiteConfig() — it merges the saved overrides on top of
   the hardcoded DEFAULT_CONFIG, so anything not edited keeps its built-in
   value and the site always has sane defaults.
------------------------------------------------------------------- */

import { neon } from "@neondatabase/serverless";
import { SITE } from "./site";

export type SiteConfig = {
  brand: {
    mission: string;
    copyright: string;
    tagline: string;
  };
  stats: {
    airports: number;
    routes: number;
    fleetCount: number;
    ranks: number;
    hubs: number;
    longestSector: string;
  };
  announcement: {
    enabled: boolean;
    text: string;
    tone: "info" | "warn";
  };
  flags: {
    finnixEnabled: boolean;
    applicationsOpen: boolean;
    maintenance: boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_CONFIG: SiteConfig = {
  brand: {
    mission: SITE.mission,
    copyright: SITE.copyright,
    tagline: "The Egret Way to Fly",
  },
  stats: {
    airports: SITE.network.airports,
    routes: SITE.network.routes,
    fleetCount: SITE.fleetCount,
    ranks: 9,
    hubs: 2,
    longestSector: SITE.longestSector,
  },
  announcement: { enabled: false, text: "", tone: "info" },
  flags: { finnixEnabled: true, applicationsOpen: true, maintenance: false },
};

const dbConfigured = !!process.env.DATABASE_URL;
const sql = dbConfigured ? neon(process.env.DATABASE_URL!) : null;

const g = globalThis as unknown as { __fnrConfig?: Partial<SiteConfig> };

/* Deep-merge a saved partial over the defaults (one level into each section). */
function merge(saved: Partial<SiteConfig> | null | undefined): SiteConfig {
  const s = saved ?? {};
  return {
    brand: { ...DEFAULT_CONFIG.brand, ...(s.brand ?? {}) },
    stats: { ...DEFAULT_CONFIG.stats, ...(s.stats ?? {}) },
    announcement: { ...DEFAULT_CONFIG.announcement, ...(s.announcement ?? {}) },
    flags: { ...DEFAULT_CONFIG.flags, ...(s.flags ?? {}) },
    updatedAt: s.updatedAt,
    updatedBy: s.updatedBy,
  };
}

let ensured = false;
async function ensure() {
  if (!sql || ensured) return;
  await sql`CREATE TABLE IF NOT EXISTS site_config (id INT PRIMARY KEY DEFAULT 1, doc JSONB NOT NULL DEFAULT '{}'::jsonb)`;
  ensured = true;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  if (!sql) return merge(g.__fnrConfig);
  try {
    await ensure();
    const rows = (await sql`SELECT doc FROM site_config WHERE id = 1`) as { doc: Partial<SiteConfig> }[];
    return merge(rows[0]?.doc);
  } catch {
    return merge(g.__fnrConfig);
  }
}

/* Apply a partial patch and persist. Returns the new merged config. */
export async function setSiteConfig(patch: Partial<SiteConfig>, by: string): Promise<SiteConfig> {
  const current = await getSiteConfig();
  const next: SiteConfig = merge({
    brand: { ...current.brand, ...(patch.brand ?? {}) },
    stats: { ...current.stats, ...(patch.stats ?? {}) },
    announcement: { ...current.announcement, ...(patch.announcement ?? {}) },
    flags: { ...current.flags, ...(patch.flags ?? {}) },
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  });
  if (!sql) {
    g.__fnrConfig = next;
    return next;
  }
  await ensure();
  await sql`INSERT INTO site_config (id, doc) VALUES (1, ${JSON.stringify(next)}::jsonb)
            ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`;
  return next;
}
