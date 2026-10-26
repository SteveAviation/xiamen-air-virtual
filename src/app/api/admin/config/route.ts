/* Super-admin CMS config API.
   GET  → current merged site config
   POST → apply a partial patch (one or more sections)

   Auth: either a signed-in staff member (hasCrewAccess cookie) OR a caller
   presenting the shared admin token in `x-admin-token` (used by the Aileron
   control plane to drive this site remotely). Set ADMIN_API_TOKEN to enable
   the remote path. */

import { hasCrewAccess, getSession } from "@/lib/auth";
import { getSiteConfig, setSiteConfig, type SiteConfig } from "@/lib/siteConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenOk(request: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const presented = request.headers.get("x-admin-token");
  return !!presented && presented === token;
}

async function authorize(request: Request): Promise<{ ok: boolean; who: string }> {
  if (tokenOk(request)) return { ok: true, who: "Aileron control plane" };
  if (await hasCrewAccess()) {
    const s = await getSession();
    return { ok: true, who: s?.callsign ?? s?.displayName ?? "Staff" };
  }
  return { ok: false, who: "" };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return Response.json({ error: "Not authorised" }, { status: 401 });
  const config = await getSiteConfig();
  return Response.json({ ok: true, config });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return Response.json({ error: "Not authorised" }, { status: 401 });

  let patch: Partial<SiteConfig>;
  try {
    patch = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Only accept known sections.
  const clean: Partial<SiteConfig> = {};
  if (patch.brand) clean.brand = patch.brand;
  if (patch.stats) clean.stats = patch.stats;
  if (patch.announcement) clean.announcement = patch.announcement;
  if (patch.flags) clean.flags = patch.flags;

  const by = typeof patch.updatedBy === "string" && patch.updatedBy ? patch.updatedBy : auth.who;
  const config = await setSiteConfig(clean, by);
  return Response.json({ ok: true, config });
}
