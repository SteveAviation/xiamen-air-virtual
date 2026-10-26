import { getSession } from "@/lib/auth";
import { createLoa, requestLoaExtension, getCurrentLoa } from "@/lib/db";
import { notifyLoa } from "@/lib/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "apply");

  if (action === "apply") {
    const reason = String(body.reason ?? "");
    const days = Number(body.days);
    const res = await createLoa(session.pilotId, reason, days);
    if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
    await notifyLoa({
      loaId: res.loa!.id,
      kind: "apply",
      callsign: session.callsign,
      username: session.displayName,
      days: res.loa!.days,
      reason: res.loa!.reason,
    }).catch(() => undefined);
    return Response.json({ ok: true });
  }

  if (action === "extend") {
    const loa = await getCurrentLoa(session.pilotId);
    if (!loa) return Response.json({ error: "No active LOA." }, { status: 400 });
    const days = Number(body.days);
    const reason = String(body.reason ?? "");
    const res = await requestLoaExtension(loa.id, session.pilotId, days, reason);
    if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
    await notifyLoa({
      loaId: loa.id,
      kind: "extend",
      callsign: session.callsign,
      username: session.displayName,
      days: Math.round(days),
      reason,
    }).catch(() => undefined);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Bad request." }, { status: 400 });
}
