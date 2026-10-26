import { hasCrewAccess } from "@/lib/auth";
import { setRotw } from "@/lib/ops";

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
  const routeNumber = String(body.routeNumber ?? "");
  if (!setRotw(routeNumber)) {
    return Response.json({ error: "Unknown route." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
