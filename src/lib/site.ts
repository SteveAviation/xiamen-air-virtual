/* ----------------------------------------------------------------
   Xiamen Air Virtual — public marketing site content.
   Independent, fan-made virtual airline inspired by Xiamen Air.
------------------------------------------------------------------- */

export const SITE = {
  network: { airports: 83, routes: 83, hub: "ZSAM" },
  fleetCount: 4,
  longestRangeNm: 7635,
  longestSector: "13h 32m",
  avgSector: "3h 18m",
  mission:
    "An Infinite Flight virtual airline dedicated to simulating the absolute pinnacle of aviation. Join a community of pilots committed to realism, excellence and Fujian hospitality.",
  copyright: "Xiamen Air Virtual is a virtual airline exclusively for the Infinite Flight platform. It has no connection or affiliation with Xiamen Air or any other real-world airline, organisation or subsidiary. All logos and trademarks remain the property of their respective owners.",
  madeBy: "Built for Xiamen Air Virtual.",
} as const;

export const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/fleet", label: "Fleet" },
  { href: "/hubs", label: "Hubs" },
  { href: "/routes", label: "Routes" },
  { href: "/career", label: "Career" },
  { href: "/ranks", label: "Ranks" },
  { href: "/modes", label: "Modes" },
  { href: "/plus", label: "Egret Miles" },
] as const;

export type SiteAircraft = {
  type: string;
  pax: number;
  cruiseAlt: string;
  cruiseSpeed: string;
  rangeNm: number;
  reg: string;
  engines: string;
  acquired: number;
  role: string;
  routesFlown: number;
  family: "Regional" | "Narrowbody" | "Widebody" | "Heritage";
  historic?: boolean; // not flown on scheduled routes — group flights only
  accent?: string; // card illumination colour (used to make a card stand out)
};

export const SITE_FLEET: SiteAircraft[] = [
  { type: "Boeing 737-800", pax: 162, cruiseAlt: "38,000 ft", cruiseSpeed: "Mach 0.785", rangeNm: 2935, reg: "B-5656", engines: "2 × CFM56-7B", acquired: 2016, role: "Short and medium-haul workhorse linking Xiamen with the rest of China", routesFlown: 45, family: "Narrowbody" },
  { type: "Boeing 737 MAX 8", pax: 178, cruiseAlt: "39,000 ft", cruiseSpeed: "Mach 0.79", rangeNm: 3550, reg: "B-20AX", engines: "2 × CFM LEAP-1B", acquired: 2018, role: "Fuel-efficient trunk aircraft for Chinese and Asian city pairs", routesFlown: 30, family: "Narrowbody" },
  { type: "Boeing 787-8", pax: 237, cruiseAlt: "41,000 ft", cruiseSpeed: "Mach 0.85", rangeNm: 7355, reg: "B-2768", engines: "2 × GEnx-1B", acquired: 2014, role: "Medium-long haul to Japan, Southeast Asia and the Middle East", routesFlown: 16, family: "Widebody" },
  { type: "Boeing 787-9", pax: 293, cruiseAlt: "43,000 ft", cruiseSpeed: "Mach 0.85", rangeNm: 7635, reg: "B-1566", engines: "2 × GEnx-1B", acquired: 2018, role: "Flagship long-haul aircraft for Europe and North America", routesFlown: 12, family: "Widebody" },
];

export type SiteHub = {
  name: string;
  icao: string;
  iata: string;
  city: string;
  country: string;
  role: "Main Hub" | "Secondary Hub";
  coords: string;
  careerCount?: number;
  blurb: string;
};

export const SITE_HUBS: SiteHub[] = [
  { name: "Xiamen Gaoqi", icao: "ZSAM", iata: "XMN", city: "Xiamen", country: "China", role: "Main Hub", coords: "24.5440° N · 118.1277° E", careerCount: 220, blurb: "Primary operating base. Every long-haul rotation and most domestic sectors originate or terminate here. Xiamen's position on the Taiwan Strait makes it a natural coastal gateway between China, Southeast Asia and the wider world." },
  { name: "Fuzhou Changle", icao: "ZSFZ", iata: "FOC", city: "Fuzhou", country: "China", role: "Secondary Hub", coords: "25.9351° N · 119.6633° E", blurb: "Our second Fujian base, serving the provincial capital and the Min River delta. Fuzhou feeds domestic connections and seasonal leisure traffic into the Xiamen hub, with quick turnarounds and short sectors across East China." },
];

export const SITE_MODES = [
  {
    name: "Casual Mode",
    unlock: "Horizon · 0h",
    tagline: "Fly the line at your own pace",
    desc: "The default experience for new pilots. File any unlocked route, log the PIREP, and build flight hours toward your rank — no rigid scheduling. (Strait Points are earned in Career mode.)",
    bestFor: "Pilots who fly when they can and want progression without pressure",
    pros: ["No schedule windows", "Any unlocked aircraft / route", "Builds rank hours (no AP)"],
    multiplier: "Hours only",
    scope: "Any unlocked",
  },
  {
    name: "Career Mode",
    unlock: "Elysian · 150h",
    tagline: "A structured, simulated career",
    desc: "Bid for monthly rotations, follow a fixed roster, and operate under realistic airline constraints — fatigue, rest, and reserve duty all apply.",
    bestFor: "Pilots who want a real-world airline rhythm and faster progression",
    pros: ["AP + a flat on-time bonus", "Counts double toward rank", "Eligible for command upgrade pathway"],
    multiplier: "AP + on-time bonus",
    scope: "Rostered",
  },
  {
    name: "Cargo Mode",
    unlock: "Zenith · 600h · staff approval",
    tagline: "Freight, ferry, and charter ops",
    desc: "A separate freight track that runs alongside Casual or Career mode. Move loads out of Xiamen and Fuzhou for Logistic Coins (LC). Unlocking it requires reaching Zenith and a quick staff application to confirm you're ready for the heavier ops.",
    bestFor: "Senior pilots who want long, technical sectors and unusual routings",
    pros: ["Earns Logistic Coins, not AP", "Higher risk bands pay more", "Staff application required to unlock"],
    multiplier: "Logistic Coins (LC)",
    scope: "Freight network",
  },
] as const;

export const PLUS_EARN = [
  { label: "Short-haul", note: "under 2 hours", ap: 100 },
  { label: "Medium-haul", note: "2–6 hours", ap: 300 },
  { label: "Long-haul", note: "over 6 hours", ap: 900 },
] as const;

/* About — leadership & org (no personal profiles) */
export const SITE_LEADERS: {
  role: string;
  name: string;
  ifc?: string;
  pfp?: string;
  title: string;
  message: string;
}[] = [];

export const SITE_ORG = [
  { unit: "Operations", roles: [{ role: "CHRO", who: "Vacant" }, { role: "Codeshare Officer", who: "Vacant" }] },
  { unit: "Marketing", roles: [{ role: "CMO", who: "Vacant" }, { role: "Social Manager", who: "Vacant" }] },
  { unit: "Route Coordinators", roles: [{ role: "Route Manager", who: "Vacant" }, { role: "Event Manager", who: "Vacant" }, { role: "Event Manager", who: "Vacant" }, { role: "Event Manager", who: "Vacant" }] },
  { unit: "Training", roles: [{ role: "Training Manager", who: "Vacant" }, { role: "Flight Instructor", who: "Vacant" }, { role: "Flight Instructor", who: "Vacant" }, { role: "Flight Instructor", who: "Vacant" }, { role: "Flight Instructor", who: "Vacant" }] },
] as const;
