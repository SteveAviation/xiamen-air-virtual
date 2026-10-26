import { hasCrewAccess } from "@/lib/auth";
import { setMultipliers } from "@/lib/opsStore";

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
  if (!Array.isArray(body.multipliers)) {
    return Response.json({ error: "multipliers[] required." }, { status: 400 });
  }
  const next = await setMultipliers(body.multipliers as { code: string; value: number; label: string }[], "staff");
  return Response.json({ ok: true, multipliers: next.multipliers });
}
