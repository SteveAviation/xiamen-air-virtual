/* ----------------------------------------------------------------
   Xiamen Air Virtual — Live Fleet (demo).
   A demonstration model of the airline's physical fleet and where each
   tail currently sits. "Live Mode" is an addition to Career/Cargo: pilots
   claim an idle aircraft and fly its dispatch from/to a hub. Aircraft away
   from a hub generate a 1.5× spotlight ferry flight back home.

   This is a DEMO — it will be staff-only at launch until Infinite Flight
   exposes a public live-tracking feature. Real positions/assignments will
   be wired to live data later. */

import { airportCity } from "./airports";

export const FLEET_HUBS = ["ZSAM", "ZSFZ"] as const;

export type FleetAircraft = {
  reg: string;
  type: string;
  family: "Narrowbody" | "Widebody";
  location: string; // ICAO
  assignedPilot: string | null;
};

/* Demo composition: 4× B737-800, 2× B737 MAX 8, 2× B787-8, 2× B787-9. */
export const LIVE_FLEET: FleetAircraft[] = [
  { reg: "B-5656", type: "Boeing 737-800", family: "Narrowbody", location: "ZSAM", assignedPilot: null },
  { reg: "B-5657", type: "Boeing 737-800", family: "Narrowbody", location: "ZSFZ", assignedPilot: null },
  { reg: "B-5658", type: "Boeing 737-800", family: "Narrowbody", location: "ZBAA", assignedPilot: null },
  { reg: "B-5659", type: "Boeing 737-800", family: "Narrowbody", location: "ZSPD", assignedPilot: null },
  { reg: "B-20AX", type: "Boeing 737 MAX 8", family: "Narrowbody", location: "ZSAM", assignedPilot: null },
  { reg: "B-20AY", type: "Boeing 737 MAX 8", family: "Narrowbody", location: "ZGGG", assignedPilot: null },
  { reg: "B-2768", type: "Boeing 787-8", family: "Widebody", location: "ZSAM", assignedPilot: null },
  { reg: "B-2769", type: "Boeing 787-8", family: "Widebody", location: "RJTT", assignedPilot: null },
  { reg: "B-1566", type: "Boeing 787-9", family: "Widebody", location: "ZSAM", assignedPilot: null },
  { reg: "B-1567", type: "Boeing 787-9", family: "Widebody", location: "EHAM", assignedPilot: null },
];

export function isAtHub(icao: string): boolean {
  return (FLEET_HUBS as readonly string[]).includes(icao);
}

export function fleetLocationLabel(icao: string): string {
  return `${airportCity(icao)} (${icao})`;
}

/* Summary for the dashboard header strip. */
export function fleetSummary() {
  const total = LIVE_FLEET.length;
  const atHub = LIVE_FLEET.filter((a) => isAtHub(a.location)).length;
  const idle = LIVE_FLEET.filter((a) => !a.assignedPilot).length;
  const ferryAvailable = LIVE_FLEET.filter((a) => !isAtHub(a.location)).length;
  return { total, atHub, away: total - atHub, idle, ferryAvailable };
}

/* Group the fleet by type for display. */
export function fleetByType(): { type: string; tails: FleetAircraft[] }[] {
  const order: string[] = [];
  const map = new Map<string, FleetAircraft[]>();
  for (const a of LIVE_FLEET) {
    if (!map.has(a.type)) { map.set(a.type, []); order.push(a.type); }
    map.get(a.type)!.push(a);
  }
  return order.map((type) => ({ type, tails: map.get(type)! }));
}
