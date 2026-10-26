import { getSession, hasCrewAccess } from "@/lib/auth";
import { updateReportStatus, type ReportStatus } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasCrewAccess())) {
    return Response.json({ error: "Staff access required." }, { status: 403 });
  }
  const session = await getSession();
  const resolver = session?.callsign ?? "Admin";

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  const status = String(body.status ?? "") as ReportStatus;
  if (!Number.isInteger(id) || !["open", "resolved", "dismissed"].includes(status)) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  await updateReportStatus(id, status, resolver);
  return Response.json({ ok: true });
}
