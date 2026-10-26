/* ----------------------------------------------------------------
   Xiamen Air Virtual — shared content/data (single source of truth)
   An independent, fan-made virtual airline inspired by Xiamen Air.
   Items marked TODO need real values (Discord invite, application URLs).
------------------------------------------------------------------- */

export const BRAND = {
  name: "Xiamen Air Virtual",
  group: "Xiamen Air Virtual",
  tagline: "The Egret Way to Fly",
  welcome: "Your Coastal Journey Starts Here.",
  intro:
    "Welcome to Xiamen Air Virtual — a virtual airline for aviation enthusiasts built on Fujian hospitality, calm coastal design and smooth travel, where realism meets a welcoming community.",
  disclaimer:
    "Xiamen Air Virtual is an independent virtual organisation for flight simulation. It is not affiliated with, endorsed by, or connected to Xiamen Air, the SkyTeam alliance, or Infinite Flight.",
  // The Discord invite is shared privately with applicants once accepted —
  // it is intentionally NOT published anywhere on the public site.
} as const;

// External integrations (application forms / route database).
export const LINKS = {
  pilotApplication: "#", // TODO: pilot application form
  staffApplication: "#", // TODO: staff application form
  routeDatabase: "#", // TODO: published route database
  credits: "#", // TODO: credits page
  // Application review (form editors / responses) — set when configured.
  pilotApplicationReview: "#",
  staffApplicationReview: "#",
  pilotResponsesSheetId: "",
  staffResponsesSheetId: "",
} as const;

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/ranks", label: "Ranks" },
  { href: "/fleet", label: "Fleet" },
  { href: "/routes", label: "Routes" },
  { href: "/career", label: "Career" },
  { href: "/join", label: "Join" },
] as const;

export const STATS = [
  { value: 4, suffix: "", label: "Aircraft types", note: "Boeing 737 + 787 family" },
  { value: 83, suffix: "", label: "Routes", note: "nonstop from Xiamen" },
  { value: 83, suffix: "", label: "Destinations", note: "across China, Asia & beyond" },
] as const;

export const PILLARS = [
  {
    title: "Fujian Hospitality",
    body: "A warm, coastal welcome carried into every detail — from your first application to your final touchdown.",
  },
  {
    title: "Coastal Precision",
    body: "Calm, uncluttered operations and a clear path from first solo to widebody command.",
  },
  {
    title: "Comfort & Simplicity",
    body: "A clean pilot portal, straightforward dispatch and a route network that is easy to fly.",
  },
  {
    title: "Inclusion",
    body: "A welcoming community where every pilot — from first solo to captain — belongs and grows.",
  },
] as const;

export type Aircraft = {
  type: string;
  variant: string;
  reg: string;
  tagline: string;
  slogan: string;
  family: string;
  seats: number;
  range_nm: number;
  role: string;
  note?: string;
  engines: string; // e.g. "2 × GEnx-1B"
  thrust: string; // e.g. "76,000 lbf each"
  mtow: string; // max take-off weight, e.g. "254 t"
  cruise: string; // typical cruise, e.g. "Mach 0.85"
  recommended: { route: string; flightNo: string }[]; // 1–2 signature routes
};

export const FLEET: Aircraft[] = [
  {
    type: "B787-9",
    variant: "Boeing 787-9 Dreamliner",
    reg: "B-1566",
    tagline: "The Flagship",
    slogan: "Across the Pacific",
    family: "Widebody",
    seats: 293,
    range_nm: 7635,
    role: "Long-haul flagship — the backbone of our Europe and North America network.",
    engines: "2 × General Electric GEnx-1B",
    thrust: "76,000 lbf each",
    mtow: "254 t",
    cruise: "Mach 0.85 · FL410",
    recommended: [
      { route: "ZSAM → EHAM", flightNo: "MF8163" },
      { route: "ZSAM → KLAX", flightNo: "MF8157" },
    ],
  },
  {
    type: "B787-8",
    variant: "Boeing 787-8 Dreamliner",
    reg: "B-2768",
    tagline: "The Long-Hauler",
    slogan: "Reliable Range",
    family: "Widebody",
    seats: 237,
    range_nm: 7355,
    role: "Widebody for high-demand long-haul and seasonal leisure routes.",
    engines: "2 × General Electric GEnx-1B",
    thrust: "64,000 lbf each",
    mtow: "228 t",
    cruise: "Mach 0.85 · FL400",
    recommended: [
      { route: "ZSAM → RJAA", flightNo: "MF8161" },
      { route: "ZSAM → WSSS", flightNo: "MF8125" },
    ],
  },
  {
    type: "B737 MAX 8",
    variant: "Boeing 737 MAX 8",
    reg: "B-20AX",
    tagline: "The Next-Generation Workhorse",
    slogan: "Quiet Efficiency",
    family: "Narrowbody",
    seats: 178,
    range_nm: 3550,
    role: "Fuel-efficient narrowbody on trunk routes across China and Asia.",
    engines: "2 × CFM LEAP-1B",
    thrust: "29,300 lbf each",
    mtow: "82 t",
    cruise: "Mach 0.79 · FL390",
    recommended: [
      { route: "ZSAM → ZBAA", flightNo: "MF8031" },
      { route: "ZSAM → ZSPD", flightNo: "MF8005" },
    ],
  },
  {
    type: "B737-800",
    variant: "Boeing 737-800",
    reg: "B-5656",
    tagline: "The All-Rounder",
    slogan: "Fujian Connections",
    family: "Narrowbody",
    seats: 162,
    range_nm: 2935,
    role: "Short and medium-haul workhorse linking Xiamen with the rest of China.",
    engines: "2 × CFM56-7B",
    thrust: "27,300 lbf each",
    mtow: "79 t",
    cruise: "Mach 0.785 · FL380",
    recommended: [
      { route: "ZSAM → ZGGG", flightNo: "MF8055" },
      { route: "ZSAM → ZSFZ", flightNo: "MF8001" },
    ],
  },
];

/* Engine/thrust specs for codeshare aircraft, looked up by model keyword.
   Keeps the codeshare detail view informative without a full per-type table. */
export const AIRCRAFT_SPECS: { match: string; engines: string; thrust: string }[] = [
  { match: "A350", engines: "2 × Rolls-Royce Trent XWB", thrust: "~84,000 lbf" },
  { match: "A330", engines: "2 × Trent 700 / GE CF6 / PW4000", thrust: "~70,000 lbf" },
  { match: "A321", engines: "2 × CFM LEAP-1A / PW1100G", thrust: "~32,000 lbf" },
  { match: "A320", engines: "2 × CFM56 / LEAP-1A", thrust: "~27,000 lbf" },
  { match: "A319", engines: "2 × CFM56 / IAE V2500", thrust: "~23,000 lbf" },
  { match: "A318", engines: "2 × CFM56 / PW6000", thrust: "~23,000 lbf" },
  { match: "A220", engines: "2 × Pratt & Whitney PW1500G", thrust: "~23,300 lbf" },
  { match: "A380", engines: "4 × Trent 900 / GP7200", thrust: "~70,000 lbf" },
  { match: "747", engines: "4 × GE CF6 / PW4000 / RB211", thrust: "~62,000 lbf" },
  { match: "777", engines: "2 × GE90 / PW4000 / Trent 800", thrust: "~110,000 lbf" },
  { match: "787", engines: "2 × GEnx / Trent 1000", thrust: "~74,000 lbf" },
  { match: "767", engines: "2 × GE CF6 / PW4000", thrust: "~60,000 lbf" },
  { match: "757", engines: "2 × RB211 / PW2000", thrust: "~40,000 lbf" },
  { match: "737", engines: "2 × CFM56 / LEAP-1B", thrust: "~27,000 lbf" },
  { match: "E19", engines: "2 × GE CF34", thrust: "~18,500 lbf" },
  { match: "E17", engines: "2 × GE CF34", thrust: "~14,200 lbf" },
  { match: "ATR", engines: "2 × Pratt & Whitney PW127", thrust: "Turboprop" },
];

export function specFor(model: string): { engines: string; thrust: string } | null {
  const m = model.toUpperCase();
  return AIRCRAFT_SPECS.find((s) => m.includes(s.match)) ?? null;
}

export type Hub = {
  city: string;
  iata: string;
  icao: string;
  primary?: boolean;
  region: string;
  /* normalized 0–100 coords on an equirectangular world map */
  x: number;
  y: number;
  blurb?: string;
  departuresPerDay?: number;
  destinations?: number;
  facts?: string[];
};

/* General Xiamen Air fun facts, mixed into each hub's fact pool. */
export const XMN_FACTS: string[] = [
  "Xiamen Air was founded in 1984 and is headquartered in Xiamen, Fujian.",
  "Its emblem is the egret — the city bird of Xiamen — set against a coastal blue roundel.",
  "Xiamen Air operates an all-Boeing fleet built around the 737 family and the 787 Dreamliner.",
  "The airline joined the SkyTeam alliance in 2012.",
  "Xiamen Gaoqi International Airport (XMN/ZSAM) is the airline's principal hub.",
  "Its route network links Fujian with major Chinese cities, Southeast Asia, Japan, Korea, Europe and North America.",
  "Xiamen Air has built a reputation for warm, understated southern Chinese service.",
];

// Xiamen Air Virtual's Fujian hubs.
export const HUBS: Hub[] = [
  {
    city: "Xiamen Gaoqi",
    iata: "XMN",
    icao: "ZSAM",
    primary: true,
    region: "Fujian",
    x: 82.81,
    y: 36.36,
    blurb: "Our headquarters and the coastal gateway between China, Asia and the world.",
    departuresPerDay: 120,
    destinations: 83,
    facts: [
      "Xiamen Gaoqi (ZSAM) is Xiamen's principal airport and the airline's home base.",
      "Xiamen is a coastal city in Fujian province, facing the Taiwan Strait.",
      "The airport sits on the northern shore of Xiamen Island.",
      "Gaoqi is known for its compact layout and quick connections across southern China.",
    ],
  },
  {
    city: "Fuzhou Changle",
    iata: "FOC",
    icao: "ZSFZ",
    region: "Fujian",
    x: 83.24,
    y: 35.59,
    blurb: "Our second Fujian base, serving the provincial capital and the Min River delta.",
    departuresPerDay: 45,
    destinations: 24,
    facts: [
      "Fuzhou Changle (ZSFZ) serves Fuzhou, the capital of Fujian province.",
      "The airport opened in 1997 on the coast east of the city.",
      "Fuzhou is known for its Min culture, tea gardens and coastal cuisine.",
      "The route from Xiamen to Fuzhou is one of the shortest in our network.",
    ],
  },
];

// The 9-rank career ladder (Horizon → Luminary) lives in lib/career.ts — the
// single source of truth for the AP economy, licenses and tiers. Re-exported
// here so existing imports (rank.ts, Crew Center) keep working.
export { RANKS, type Rank } from "./career";
import { RANKS as RANK_LIST } from "./career";

// A manual trainee tag staff can assign below the entry rank (not hours-based).
export const ACRUX_RANK = {
  name: "Cadet",
  hours: 0,
  note: "Trainee — assigned manually by staff before first solo.",
  manual: true,
} as const;

// The full ladder as displayed (Cadet sits below the entry rank Horizon).
export const RANK_LADDER = [ACRUX_RANK, ...RANK_LIST];

// Every rank label staff can assign in the Crew Center (career ranks + Cadet).
export const RANK_NAMES: readonly string[] = [
  ...RANK_LIST.map((r) => r.name),
  ACRUX_RANK.name,
];

export type StaffMember = {
  role: string;
  name?: string;
  handle?: string;
  bio?: string;
  vacant?: boolean;
  note?: string;
};

export type StaffGroup = {
  group: string;
  members: StaffMember[];
};

/* Staff roles are listed as open positions only — no member names or bios. */
export const STAFF_GROUPS: StaffGroup[] = [
  {
    group: "Executive Governing Body",
    members: [
      { role: "Chairman", vacant: true },
      { role: "President", vacant: true },
      { role: "Executive Director", vacant: true },
    ],
  },
  {
    group: "Board of Directors",
    members: [
      { role: "Director of Marketing", vacant: true },
      { role: "Director of HR", vacant: true },
      { role: "Director of Operations", vacant: true },
    ],
  },
  {
    group: "Marketing",
    members: [
      { role: "Graphic Designer", vacant: true },
      { role: "Social Media Manager", vacant: true },
      { role: "Event Manager", vacant: true },
    ],
  },
  {
    group: "Operations",
    members: [
      { role: "Document Manager", vacant: true },
      { role: "Route Manager", vacant: true },
      { role: "PIREP Manager", vacant: true },
    ],
  },
  {
    group: "Human Resources",
    members: [
      { role: "Chief Recruiter", vacant: true },
      { role: "Recruiter", vacant: true },
      { role: "Chief Pilot", vacant: true },
    ],
  },
];

export type Partner = {
  name: string;
  kind: string;
};

/* SkyTeam and bilateral partners (virtual codeshare network). */
export const PARTNERS: Partner[] = [
  { name: "China Southern Virtual", kind: "China" },
  { name: "China Eastern Virtual", kind: "China" },
  { name: "Delta Virtual", kind: "United States" },
  { name: "KLM Virtual", kind: "Netherlands" },
  { name: "Air France Virtual", kind: "France" },
  { name: "Korean Air Virtual", kind: "South Korea" },
  { name: "Vietnam Airlines Virtual", kind: "Vietnam" },
  { name: "Garuda Indonesia Virtual", kind: "Indonesia" },
  { name: "Saudia Virtual", kind: "Saudi Arabia" },
  { name: "Aerolineas Argentinas Virtual", kind: "Argentina" },
];

export type Requirement = string;

export const APPLY = {
  pilot: {
    title: "Pilot Application",
    minAge: 13,
    requirements: [
      "Infinite Flight Pro subscription",
      "At least Grade 3",
      "Active IFC account in good standing",
      "Discord access",
      "At least 13 years old",
      "Not on the IFVARB Blacklist or Watchlist",
      "File at least one PIREP every 2 weeks",
      "Constant Discord usage",
    ] as Requirement[],
  },
  staff: {
    title: "Staff Application",
    minAge: 16,
    requirements: [
      "Infinite Flight Pro subscription",
      "At least Grade 3",
      "Active IFC account in good standing",
      "Discord access",
      "At least 16 years old",
      "Not on the IFVARB Blacklist or Watchlist",
      "Able to work on a weekly basis",
      "Constant Discord usage",
    ] as Requirement[],
  },
} as const;

/* ---- PIREP multipliers ----
   A multiplier code multiplies the pilot's raw flight time when filing.
   Add/adjust codes here (e.g. for events). */
export type Multiplier = { code: string; value: number; label: string };

export const MULTIPLIERS: Multiplier[] = [
  // Ordered by value.
  { code: "VEGA", value: 1.3, label: "Vega Program — 1.3×" },
  { code: "ROTW", value: 1.5, label: "ROTW — 1.5×" },
  { code: "IF48", value: 1.5, label: "IF48 — 1.5×" },
  { code: "LYRA", value: 1.6, label: "Lyra Program — 1.6×" },
  { code: "XMNEVENT2X", value: 2, label: "XMNEVENT2X — 2×" },
  { code: "GTR1ST", value: 2, label: "GTR 1st Place — 2×" },
  { code: "POTM3RD", value: 2.5, label: "POTM 3rd — 2.5×" },
  { code: "XMNEVENT3X", value: 3, label: "XMNEVENT3X — 3×" },
  { code: "POTM2ND", value: 3, label: "POTM 2nd — 3×" },
  { code: "NEWYEAR2026", value: 3, label: "NEW YEAR 2026 — 3×" },
  { code: "POTM1ST", value: 4, label: "POTM 1st — 4×" },
  { code: "XMNEVENT5X", value: 5, label: "XMNEVENT5X — 5×" },
  { code: "EVENT", value: 5, label: "Event — 5×" },
];

/* Resolve a code to its multiplier value (1 if blank/unknown). */
export function multiplierFor(code: string | null | undefined): number {
  if (!code) return 1;
  const m = MULTIPLIERS.find(
    (x) => x.code.toUpperCase() === code.trim().toUpperCase(),
  );
  return m ? m.value : 1;
}
