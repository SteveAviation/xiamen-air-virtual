import { getSession, hasCrewAccess } from "@/lib/auth";
import {
  acceptLoa,
  rejectLoa,
  endLoa,
  approveLoaExtension,
  rejectLoaExtension,
} from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasCrewAccess())) {
    return Response.json({ error: "Staff access required." }, { status: 403 });
  }
  const session = await getSession();
  const reviewer = session?.callsign ?? "Admin";

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  const action = String(body.action ?? "");
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  switch (action) {
    case "accept":
      await acceptLoa(id, reviewer);
      return Response.json({ ok: true });
    case "reject":
      await rejectLoa(id, reviewer);
      return Response.json({ ok: true });
    case "end":
      await endLoa(id);
      return Response.json({ ok: true });
    case "approveExt": {
      const res = await approveLoaExtension(id, reviewer);
      if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
      return Response.json({ ok: true });
    }
    case "rejectExt":
      await rejectLoaExtension(id, reviewer);
      return Response.json({ ok: true });
    case "manualExt": {
      const days = Number(body.days);
      const res = await approveLoaExtension(id, reviewer, days);
      if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
      return Response.json({ ok: true });
    }
    default:
      return Response.json({ error: "Unknown action." }, { status: 400 });
  }
}
