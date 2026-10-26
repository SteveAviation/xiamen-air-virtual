import { getSession } from "@/lib/auth";
import { createReport, type ReportCategory } from "@/lib/db";
import { notifyReport } from "@/lib/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const category = String(body.category ?? "other") as ReportCategory;
  const message = String(body.message ?? "");
  const target = body.target ? String(body.target) : null;

  // Attach the signed-in pilot if there is one (reports can also be anonymous).
  const session = await getSession();
  const reporterPilotId = session?.pilotId ?? null;
  const reporterName =
    session?.callsign ?? (body.reporterName ? String(body.reporterName) : null);

  const res = await createReport({
    category,
    target,
    message,
    reporterPilotId,
    reporterName,
  });
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });

  await notifyReport({
    reportId: res.report!.id,
    category: res.report!.category,
    target: res.report!.target,
    message: res.report!.message,
    reporterName: res.report!.reporterName ?? "Anonymous",
  }).catch(() => undefined);

  return Response.json({ ok: true });
}
