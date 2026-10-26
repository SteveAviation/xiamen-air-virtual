import { hasCrewAccess } from "@/lib/auth";
import { setSpotlightNos } from "@/lib/opsStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasCrewAccess())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const nos = Array.isArray(body.spotlightNos)
    ? (body.spotlightNos as unknown[]).map((n) => String(n))
    : null;
  const next = await setSpotlightNos(nos);
  return Response.json({ ok: true, spotlightNos: next.spotlightNos });
}
