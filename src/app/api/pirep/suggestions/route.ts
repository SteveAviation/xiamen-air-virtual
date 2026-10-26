import { getSession } from "@/lib/auth";
import { getPilotById, listPirepsByPilot } from "@/lib/db";
import { ifConfigured, getRecentXiamenFlights } from "@/lib/infiniteflight";
import { FLEET } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLEET_TYPES = FLEET.map((a) => a.type); // Boeing 737-800, 737 MAX 8, 787-8, 787-9

/* Map an IF aircraft name to one of our fleet types, else "". */
function toFleetType(ifName: string | null): string {
  if (!ifName) return "";
  const n = ifName.toUpperCase();
  if (n.includes("737 MAX")) return FLEET_TYPES.find((t) => t.includes("737 MAX")) ?? "";
  if (n.includes("737-800")) return FLEET_TYPES.find((t) => t.includes("737-800")) ?? "";
  if (n.includes("787-8")) return FLEET_TYPES.find((t) => t.includes("787-8")) ?? "";
  if (n.includes("787-9")) return FLEET_TYPES.find((t) => t.includes("787-9")) ?? "";
  return "";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ configured: false, reason: "auth", flights: [] }, { status: 401 });
  }
  if (!ifConfigured) {
    return Response.json({ configured: false, reason: "no-api", flights: [] });
  }

  const pilot = await getPilotById(session.pilotId);
  if (!pilot?.ifUserId) {
    return Response.json({ configured: false, reason: "no-if", flights: [] });
  }

  const [recent, myPireps] = await Promise.all([
    getRecentXiamenFlights(pilot.ifUserId, 8),
    listPirepsByPilot(session.pilotId),
  ]);

  const flights = recent.slice(0, 5).map((f) => {
    // Already filed if a PIREP matches the same route and ~duration.
    const alreadyFiled = myPireps.some(
      (p) =>
        (p.dep ?? "").toUpperCase() === (f.origin ?? "").toUpperCase() &&
        (p.arr ?? "").toUpperCase() === (f.destination ?? "").toUpperCase() &&
        Math.abs((p.rawMinutes ?? p.minutes) - f.minutes) <= 3,
    );
    return {
      flightNo: f.callsign ?? "",
      dep: f.origin ?? "",
      arr: f.destination ?? "",
      aircraft: toFleetType(f.aircraftName),
      aircraftName: f.aircraftName,
      hours: Math.floor(f.minutes / 60),
      minutes: f.minutes % 60,
      totalMinutes: f.minutes,
      server: f.server,
      created: f.created,
      landingCount: f.landingCount,
      fuelKg: f.fuelKg,
      alreadyFiled,
    };
  });

  return Response.json({ configured: true, flights });
}
