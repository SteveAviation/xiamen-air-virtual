import { getSession } from "@/lib/auth";
import { createPirep } from "@/lib/db";
import { announceFiledPirep } from "@/lib/pireplog";
import { multiplierValue } from "@/lib/opsStore";
import { VALID_AIRCRAFT } from "@/lib/aircraft";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const num = (k: string) => {
    const n = Number(body[k]);
    return Number.isFinite(n) ? n : 0;
  };

  const flightNo = str("flightNo").toUpperCase();
  const dep = str("dep").toUpperCase();
  const arr = str("arr").toUpperCase();
  const aircraft = str("aircraft");
  const rawMinutes = num("hours") * 60 + num("minutes");
  const multiplierCode = str("multiplier").toUpperCase() || null;
  const multiplier = await multiplierValue(multiplierCode);
  const minutes = Math.round(rawMinutes * multiplier);
  // We accept flights flown on any server; instead of the server we record the
  // flight TYPE (Casual / Career / Cargo) in the existing `server` column.
  const flightType = ["Casual", "Career", "Cargo"].includes(str("flightType")) ? str("flightType") : "Casual";
  const remarks = str("remarks") || null;
  const fuelKg = body.fuelKg != null && body.fuelKg !== "" ? num("fuelKg") : null;
  const landingRate = null;

  if (!flightNo || dep.length < 3 || arr.length < 3) {
    return Response.json(
      { error: "Flight number and valid ICAO airports are required." },
      { status: 400 },
    );
  }
  if (!VALID_AIRCRAFT.has(aircraft)) {
    return Response.json({ error: "Unknown aircraft." }, { status: 400 });
  }
  if (rawMinutes <= 0) {
    return Response.json({ error: "Flight time must be greater than zero." }, { status: 400 });
  }

  const pirep = await createPirep({
    pilotId: session.pilotId,
    flightNo,
    dep,
    arr,
    aircraft,
    minutes,
    rawMinutes,
    multiplier,
    multiplierCode,
    fuelKg,
    landingRate,
    server: flightType,
    remarks,
  });

  await announceFiledPirep(pirep.id);

  return Response.json({ ok: true, pirep });
}
