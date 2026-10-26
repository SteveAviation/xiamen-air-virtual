import { hasCrewAccess } from "@/lib/auth";
import { searchPilots, searchPireps } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasCrewAccess())) {
    return Response.json({ error: "Staff access required." }, { status: 403 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return Response.json({ pilots: [], pireps: [] });
  }

  const [pilots, pireps] = await Promise.all([searchPilots(q), searchPireps(q)]);

  return Response.json({
    pilots: pilots.map((p) => ({
      id: p.id,
      callsign: p.callsign,
      displayName: p.displayName,
      rank: p.rankLabel,
      status: p.status,
      ifUsername: p.ifUsername,
      linked: p.linked,
      warnings: p.warnings?.length ?? 0,
    })),
    pireps: pireps.map(({ pirep, callsign }) => ({
      id: pirep.id,
      callsign,
      flightNo: pirep.flightNo,
      dep: pirep.dep,
      arr: pirep.arr,
      aircraft: pirep.aircraft,
      minutes: pirep.minutes,
      status: pirep.status,
    })),
  });
}
