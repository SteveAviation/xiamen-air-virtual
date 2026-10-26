/* ----------------------------------------------------------------
   Fileable aircraft — our own Xiamen Air Virtual fleet PLUS every aircraft
   flown across the route network (derived from the route database). Used
   by the PIREP form, the filing API and the Discord bot.
------------------------------------------------------------------- */

import { ROUTES } from "./routes";
import { FLEET } from "./data";

const MODEL: Record<string, string> = {
  B737800: "Boeing 737-800",
  "B737-800": "Boeing 737-800",
  B737MAX8: "Boeing 737 MAX 8",
  "B737 MAX 8": "Boeing 737 MAX 8",
  B7878: "Boeing 787-8",
  "B787-8": "Boeing 787-8",
  B7879: "Boeing 787-9",
  "B787-9": "Boeing 787-9",
  "B737 MAX 9": "Boeing 737 MAX 9",
  A320: "Airbus A320",
  A321: "Airbus A321",
  A330: "Airbus A330-300",
  A350: "Airbus A350-900",
  E190: "Embraer E190",
};

/* Reduce a route's aircraft string to a clean model name
   ("B737-800 / B737 MAX 8" -> "Boeing 737-800"). */
export function aircraftModel(aircraft: string): string {
  const first = (aircraft || "").split("/")[0].trim();
  if (MODEL[first]) return MODEL[first];
  const m = first.match(/(Airbus|Boeing|Bombardier|Embraer|Cessna|ATR).*/);
  return (m ? m[0] : first).trim();
}

/* Our own fleet, by Infinite Flight type name. */
export const XMN_AIRCRAFT: string[] = FLEET.map((a) => a.type);

/* Distinct codeshare-partner aircraft models across the route network. */
export const CODESHARE_AIRCRAFT: string[] = (() => {
  const set = new Set<string>();
  for (const r of ROUTES) {
    if (r.airline === "Xiamen Air Virtual") continue;
    set.add(aircraftModel(r.aircraft));
  }
  return [...set].sort();
})();

/* The full Infinite Flight civil fleet, so pilots can file any type they
   actually flew (codeshares included). Shown below the Xiamen Air fleet in the
   PIREP aircraft dropdown. */
export const IF_FLEET: string[] = [
  "Airbus A318", "Airbus A319", "Airbus A320", "Airbus A321",
  "Airbus A330-200", "Airbus A330-300", "Airbus A330-900neo",
  "Airbus A350-1000", "Airbus A380-800",
  "Boeing 707", "Boeing 717", "Boeing 737-700", "Boeing 737-800", "Boeing 737-900",
  "Boeing 737 MAX 8", "Boeing 737 MAX 9",
  "Boeing 747-200", "Boeing 747-400", "Boeing 747-8", "Boeing 747-8F",
  "Boeing 757-200", "Boeing 767-300",
  "Boeing 777-200ER", "Boeing 777-200F", "Boeing 777-300ER",
  "Boeing 787-8", "Boeing 787-9", "Boeing 787-10",
  "Bombardier CRJ-200", "Bombardier CRJ-700", "Bombardier CRJ-900", "Bombardier CRJ-1000",
  "Bombardier Dash 8 Q400", "Bombardier Challenger 350",
  "Embraer E175", "Embraer E190",
  "McDonnell Douglas MD-11",
  "Cessna 172", "Cessna 208 Caravan", "Cessna Citation X",
];

/* Grouped options for an aircraft <select>: Xiamen Air fleet first, then any
   codeshare-partner types on the network, then the full IF fleet. */
export const AIRCRAFT_GROUPS: { group: string; items: string[] }[] = [
  { group: "Xiamen Air fleet", items: XMN_AIRCRAFT },
  ...(CODESHARE_AIRCRAFT.length ? [{ group: "Codeshare partners", items: CODESHARE_AIRCRAFT }] : []),
  { group: "All Infinite Flight aircraft", items: IF_FLEET },
];

/* Every value that may be filed on a PIREP (validation). */
export const VALID_AIRCRAFT = new Set<string>([
  ...XMN_AIRCRAFT,
  ...CODESHARE_AIRCRAFT,
  ...IF_FLEET,
]);

/* Best aircraft value to prefill when a route is chosen: the specific
   Xiamen Air fleet type for our own routes, the clean model for codeshares. */
export function fileableAircraftFor(route: { aircraft: string; airline: string }): string {
  return aircraftModel(route.aircraft);
}
