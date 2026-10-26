import { windowedLeaderboard, type StatRange, type StatMetric } from "@/lib/db";
import { rankFromMinutes } from "@/lib/rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: StatRange[] = ["week", "month", "all"];
const METRICS: StatMetric[] = ["credited", "raw"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = (url.searchParams.get("range") ?? "all") as StatRange;
  const metric = (url.searchParams.get("metric") ?? "credited") as StatMetric;
  if (!RANGES.includes(range) || !METRICS.includes(metric)) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
  }

  const rows = (await windowedLeaderboard(range, metric))
    .filter((r) => r.flights > 0)
    .map((r) => ({
      id: r.pilot.id,
      callsign: r.pilot.callsign,
      displayName: r.pilot.displayName,
      rank: r.pilot.rankLabel || rankFromMinutes(r.alltimeMinutes).current.name,
      minutes: r.minutes,
      flights: r.flights,
    }));

  return Response.json({ range, metric, rows });
}
