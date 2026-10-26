import { hasCrewAccess } from "@/lib/auth";
import { addCodeshare, removeCodeshare, bulkAddCodeshares, addNetwork, removeNetwork, discontinueRoute, renameRoute } from "@/lib/opsStore";

export const dynamic = "force-dynamic";

/* Parse a pasted bulk block. One route per line, comma OR tab separated:
     flightNo, DEP, ARR, minutes, airline[, aircraft]
   e.g.  BA811, ZSAM, EGLL, 175, British Airways, Airbus A320  */
function parseBulk(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const p = line.split(/[,\t]/).map((s) => s.trim());
      return {
        routeNumber: p[0] ?? "",
        dep: p[1] ?? "",
        arr: p[2] ?? "",
        minutes: Number(p[3] ?? 0),
        airline: p[4] ?? "",
        aircraft: p[5] ?? "",
      };
    });
}

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
  const action = String(body.action ?? "add");

  if (action === "addNetwork") {
    const res = await addNetwork({
      name: String(body.name ?? ""),
      price: Number(body.price),
      currency: body.currency === "LC" ? "LC" : "AP",
      type: body.type === "cargo" ? "cargo" : "career",
    });
    if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
    return Response.json({ ok: true });
  }

  if (action === "delNetwork") {
    const ok = await removeNetwork(String(body.name ?? ""));
    return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found." }, { status: 400 });
  }

  // Xiamen Air route edits — discontinue/restore or change a flight number.
  if (action === "discontinueRoute") {
    await discontinueRoute(String(body.routeNumber ?? ""), body.on !== false);
    return Response.json({ ok: true });
  }
  if (action === "renameRoute") {
    await renameRoute(String(body.routeNumber ?? ""), String(body.newNumber ?? ""));
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    const ok = await removeCodeshare(String(body.routeNumber ?? ""));
    return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found." }, { status: 400 });
  }

  if (action === "bulk") {
    const rows = typeof body.text === "string" ? parseBulk(body.text) : [];
    if (rows.length === 0) return Response.json({ error: "Nothing to add — paste at least one route." }, { status: 400 });
    if (rows.length > 500) return Response.json({ error: "Too many rows (max 500)." }, { status: 400 });
    const result = await bulkAddCodeshares(rows);
    return Response.json({ ok: true, ...result });
  }

  const res = await addCodeshare({
    routeNumber: String(body.routeNumber ?? ""),
    dep: String(body.dep ?? ""),
    arr: String(body.arr ?? ""),
    aircraft: String(body.aircraft ?? ""),
    minutes: Number(body.minutes),
    airline: String(body.airline ?? ""),
  });
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
  return Response.json({ ok: true });
}
