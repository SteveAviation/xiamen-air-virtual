/* ----------------------------------------------------------------
   Network geometry shared by every map surface (home-page globe, the
   Crew Centre live globe, the flat region map).

   The hub is read from SITE.network.hub and looked up in AIRPORT_COORDS —
   never hardcoded. A clone that forgets to update a literal here used to
   radiate every route arc from the previous airline's hub.
------------------------------------------------------------------- */

import { ROUTES, ROUTE_AIRLINES } from "./routes";
import { AIRPORT_COORDS, AIRPORTS } from "./airports";
import { regionForIcao } from "./regions";
import { SITE } from "./site";

/* The airline(s) this VA actually operates. Single-carrier clones list one
   name; AAVG lists all seven Group certificates. Anything else on the network
   is a codeshare partner added by staff. */
const OWN_AIRLINES: ReadonlySet<string> = new Set(ROUTE_AIRLINES as readonly string[]);
const isOwnAirline = (airline: string): boolean => OWN_AIRLINES.has(airline);

export type NetworkLeg = {
  to: [number, number];
  code: string;
  city: string;
  region: string;
  color: string;
};

export const HUB_ICAO: string = SITE.network.hub;

export const HUB_COORDS: [number, number] =
  AIRPORT_COORDS[HUB_ICAO] ?? [0, 0];

export function hubCity(): string {
  return AIRPORTS[HUB_ICAO]?.city ?? HUB_ICAO;
}

/* One leg per distinct destination in the network, hub-anchored.
   `codeshare: true` returns partner sectors instead of the Group's own. */
export function networkLegs(opts: { codeshare?: boolean } = {}): NetworkLeg[] {
  const wantCodeshare = !!opts.codeshare;
  const seen = new Set<string>();
  const out: NetworkLeg[] = [];
  for (const r of ROUTES) {
    if (isOwnAirline(r.airline) === wantCodeshare) continue;
    for (const code of [r.dep, r.arr]) {
      if (code === HUB_ICAO || seen.has(code)) continue;
      const coords = AIRPORT_COORDS[code];
      if (!coords) continue;
      const region = regionForIcao(code);
      if (!region) continue;
      seen.add(code);
      out.push({
        to: coords,
        code,
        city: AIRPORTS[code]?.city ?? code,
        region: region.name,
        color: region.color,
      });
    }
  }
  return out;
}
