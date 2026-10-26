import { ROUTES } from "@/lib/routes";
import { fileableAircraftFor } from "@/lib/aircraft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return Response.json({ routes: [] });

  const norm = q.replace(/[^a-z0-9]/g, "");
  const matches = ROUTES.filter((r) => {
    const hay = `${r.routeNumber} ${r.dep} ${r.arr} ${r.dep}-${r.arr} ${r.airline}`.toLowerCase();
    return hay.includes(q) || hay.replace(/[^a-z0-9]/g, "").includes(norm);
  })
    // Xiamen Air routes first, then by route number.
    .sort((a, b) => {
      const sa = a.airline === "Xiamen Air Virtual" ? 0 : 1;
      const sb = b.airline === "Xiamen Air Virtual" ? 0 : 1;
      return sa - sb || a.routeNumber.localeCompare(b.routeNumber);
    })
    .slice(0, 8)
    .map((r) => ({
      flightNo: r.routeNumber.split("/")[0], // first leg if it's a pair
      routeNumber: r.routeNumber,
      dep: r.dep,
      arr: r.arr,
      aircraft: r.aircraft,
      fleetType: fileableAircraftFor(r),
      minutes: r.minutes,
      airline: r.airline,
    }));

  return Response.json({ routes: matches });
}
