import { getSession, hasCrewAccess } from "@/lib/auth";
import { updatePirepStatus, createNotification } from "@/lib/db";
import { announceReviewedPirep } from "@/lib/pireplog";

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
  const action = body.action;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!Number.isInteger(id) || (action !== "approve" && action !== "reject")) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const approved = action === "approve";
  const info = await updatePirepStatus(id, approved ? "approved" : "rejected", reviewer, note || null);
  await announceReviewedPirep(id);

  // Notify the pilot in their Crew Centre — includes the staff note + handler.
  if (info) {
    await createNotification({
      pilotId: info.pilotId,
      kind: "pirep",
      title: approved
        ? `PIREP ${info.flightNo} approved ✓`
        : `PIREP ${info.flightNo} rejected`,
      body:
        `${info.dep} → ${info.arr}` +
        (note ? ` · “${note}”` : "") +
        ` · reviewed by ${reviewer}`,
    }).catch(() => {});
  }

  return Response.json({ ok: true });
}
