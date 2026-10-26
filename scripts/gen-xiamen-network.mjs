/* Generates src/lib/routes.ts, src/lib/airports.ts and src/lib/regions.ts
   for Xiamen Air Virtual's network from Xiamen Gaoqi (ZSAM).
   Run: node scripts/gen-xiamen-network.mjs */

import { writeFileSync } from "node:fs";

// icao: [city, country, iata, lat, lon, region]
const AP = {
  ZSAM: ["Xiamen", "China", "XMN", 24.544, 118.128, "Fujian"],
  ZSFZ: ["Fuzhou", "China", "FOC", 25.935, 119.663, "Fujian"],
  ZSQZ: ["Quanzhou", "China", "JJN", 24.796, 118.59, "Fujian"],

  ZSPD: ["Shanghai Pudong", "China", "PVG", 31.144, 121.808, "East China"],
  ZSSS: ["Shanghai Hongqiao", "China", "SHA", 31.198, 121.336, "East China"],
  ZSHC: ["Hangzhou", "China", "HGH", 30.229, 120.434, "East China"],
  ZSNJ: ["Nanjing", "China", "NKG", 31.742, 118.862, "East China"],
  ZSNB: ["Ningbo", "China", "NGB", 29.827, 121.462, "East China"],
  ZSWZ: ["Wenzhou", "China", "WNZ", 27.912, 120.852, "East China"],
  ZSWX: ["Wuxi", "China", "WUX", 31.494, 120.429, "East China"],
  ZSYW: ["Yiwu", "China", "YIW", 29.345, 120.032, "East China"],
  ZSOF: ["Hefei", "China", "HFE", 31.78, 117.298, "East China"],
  ZSJN: ["Jinan", "China", "TNA", 36.857, 117.216, "East China"],
  ZSYT: ["Yantai", "China", "YNT", 37.659, 120.978, "East China"],
  ZSQD: ["Qingdao", "China", "TAO", 36.361, 120.088, "East China"],
  ZSCN: ["Nanchang", "China", "KHN", 28.865, 115.9, "East China"],

  ZBAA: ["Beijing Capital", "China", "PEK", 40.08, 116.585, "North China"],
  ZBAD: ["Beijing Daxing", "China", "PKX", 39.51, 116.411, "North China"],
  ZBTJ: ["Tianjin", "China", "TSN", 39.124, 117.346, "North China"],
  ZBSJ: ["Shijiazhuang", "China", "SJW", 38.281, 114.696, "North China"],
  ZBYN: ["Taiyuan", "China", "TYN", 37.747, 112.628, "North China"],
  ZBHH: ["Hohhot", "China", "HET", 40.851, 111.824, "North China"],

  ZGGG: ["Guangzhou", "China", "CAN", 23.392, 113.299, "South China"],
  ZGSZ: ["Shenzhen", "China", "SZX", 22.639, 113.811, "South China"],
  ZGSD: ["Zhuhai", "China", "ZUH", 22.006, 113.376, "South China"],
  ZGNN: ["Nanning", "China", "NNG", 22.608, 108.172, "South China"],
  ZJHK: ["Haikou", "China", "HAK", 19.935, 110.459, "South China"],
  ZJSY: ["Sanya", "China", "SYX", 18.303, 109.412, "South China"],
  ZGKL: ["Guilin", "China", "KWL", 25.218, 110.039, "South China"],

  ZHHH: ["Wuhan", "China", "WUH", 30.784, 114.208, "Central China"],
  ZGHA: ["Changsha", "China", "CSX", 28.189, 113.22, "Central China"],
  ZHCC: ["Zhengzhou", "China", "CGO", 34.52, 113.841, "Central China"],

  ZUUU: ["Chengdu Shuangliu", "China", "CTU", 30.578, 103.947, "Southwest China"],
  ZUTF: ["Chengdu Tianfu", "China", "TFU", 30.319, 104.445, "Southwest China"],
  ZUCK: ["Chongqing", "China", "CKG", 29.719, 106.642, "Southwest China"],
  ZUGY: ["Guiyang", "China", "KWE", 26.539, 106.801, "Southwest China"],
  ZPPP: ["Kunming", "China", "KMG", 25.102, 102.929, "Southwest China"],

  ZLXY: ["Xi'an", "China", "XIY", 34.447, 108.752, "Northwest China"],
  ZLLL: ["Lanzhou", "China", "LHW", 36.517, 103.621, "Northwest China"],
  ZWWW: ["Urumqi", "China", "URC", 43.907, 87.474, "Northwest China"],
  ZLIC: ["Yinchuan", "China", "INC", 38.322, 106.393, "Northwest China"],

  ZYHB: ["Harbin", "China", "HRB", 45.623, 126.25, "Northeast China"],
  ZYCC: ["Changchun", "China", "CGQ", 43.996, 125.685, "Northeast China"],
  ZYTX: ["Shenyang", "China", "SHE", 41.64, 123.483, "Northeast China"],
  ZYTL: ["Dalian", "China", "DLC", 38.966, 121.539, "Northeast China"],

  VHHH: ["Hong Kong", "Hong Kong", "HKG", 22.308, 113.918, "Taiwan, HK & Macau"],
  VMMC: ["Macau", "Macau", "MFM", 22.15, 113.592, "Taiwan, HK & Macau"],
  RCTP: ["Taipei Taoyuan", "Taiwan, China", "TPE", 25.078, 121.233, "Taiwan, HK & Macau"],
  RCKH: ["Kaohsiung", "Taiwan, China", "KHH", 22.577, 120.35, "Taiwan, HK & Macau"],
  RCMQ: ["Taichung", "Taiwan, China", "RMQ", 24.265, 120.621, "Taiwan, HK & Macau"],

  RJAA: ["Tokyo Narita", "Japan", "NRT", 35.765, 140.386, "Japan & Korea"],
  RJTT: ["Tokyo Haneda", "Japan", "HND", 35.553, 139.781, "Japan & Korea"],
  RJBB: ["Osaka Kansai", "Japan", "KIX", 34.435, 135.244, "Japan & Korea"],
  RJGG: ["Nagoya", "Japan", "NGO", 34.858, 136.805, "Japan & Korea"],
  RJFF: ["Fukuoka", "Japan", "FUK", 33.586, 130.451, "Japan & Korea"],
  ROAH: ["Okinawa", "Japan", "OKA", 26.196, 127.646, "Japan & Korea"],
  RJCC: ["Sapporo", "Japan", "CTS", 42.775, 141.692, "Japan & Korea"],
  RKSI: ["Seoul Incheon", "South Korea", "ICN", 37.46, 126.441, "Japan & Korea"],
  RKPC: ["Jeju", "South Korea", "CJU", 33.51, 126.493, "Japan & Korea"],
  RKPK: ["Busan", "South Korea", "PUS", 35.18, 128.938, "Japan & Korea"],

  WSSS: ["Singapore", "Singapore", "SIN", 1.364, 103.992, "Southeast Asia"],
  VTBS: ["Bangkok", "Thailand", "BKK", 13.69, 100.75, "Southeast Asia"],
  VTSP: ["Phuket", "Thailand", "HKT", 8.113, 98.317, "Southeast Asia"],
  WIII: ["Jakarta", "Indonesia", "CGK", -6.126, 106.656, "Southeast Asia"],
  RPLL: ["Manila", "Philippines", "MNL", 14.509, 121.02, "Southeast Asia"],
  VVNB: ["Hanoi", "Vietnam", "HAN", 21.221, 105.807, "Southeast Asia"],
  VVTS: ["Ho Chi Minh City", "Vietnam", "SGN", 10.819, 106.652, "Southeast Asia"],
  VDPP: ["Phnom Penh", "Cambodia", "PNH", 11.547, 104.844, "Southeast Asia"],
  VDSR: ["Siem Reap", "Cambodia", "REP", 13.411, 103.813, "Southeast Asia"],
  WMKK: ["Kuala Lumpur", "Malaysia", "KUL", 2.746, 101.71, "Southeast Asia"],
  WADD: ["Bali", "Indonesia", "DPS", -8.748, 115.167, "Southeast Asia"],
  VYYY: ["Yangon", "Myanmar", "RGN", 16.907, 96.133, "Southeast Asia"],

  VIDP: ["Delhi", "India", "DEL", 28.556, 77.1, "South Asia"],
  VABB: ["Mumbai", "India", "BOM", 19.089, 72.868, "South Asia"],
  VCBI: ["Colombo", "Sri Lanka", "CMB", 7.181, 79.884, "South Asia"],
  VNKT: ["Kathmandu", "Nepal", "KTM", 27.697, 85.359, "South Asia"],

  YSSY: ["Sydney", "Australia", "SYD", -33.94, 151.175, "Oceania"],
  YMML: ["Melbourne", "Australia", "MEL", -37.669, 144.841, "Oceania"],
  YBBN: ["Brisbane", "Australia", "BNE", -27.384, 153.118, "Oceania"],

  KLAX: ["Los Angeles", "United States", "LAX", 33.942, -118.409, "North America"],
  KJFK: ["New York", "United States", "JFK", 40.641, -73.778, "North America"],
  CYVR: ["Vancouver", "Canada", "YVR", 49.197, -123.182, "North America"],

  EHAM: ["Amsterdam", "Netherlands", "AMS", 52.311, 4.768, "Europe"],
  LFPG: ["Paris", "France", "CDG", 49.01, 2.548, "Europe"],
};

// Destinations served nonstop from Xiamen (ZSAM).
const DEST = [
  // Fujian & East China
  "ZSFZ", "ZSQZ", "ZSPD", "ZSSS", "ZSHC", "ZSNJ", "ZSNB", "ZSWZ", "ZSWX",
  "ZSYW", "ZSOF", "ZSJN", "ZSYT", "ZSQD", "ZSCN",
  // North China
  "ZBAA", "ZBAD", "ZBTJ", "ZBSJ", "ZBYN", "ZBHH",
  // South China
  "ZGGG", "ZGSZ", "ZGSD", "ZGNN", "ZJHK", "ZJSY", "ZGKL",
  // Central China
  "ZHHH", "ZGHA", "ZHCC",
  // Southwest China
  "ZUUU", "ZUTF", "ZUCK", "ZUGY", "ZPPP",
  // Northwest China
  "ZLXY", "ZLLL", "ZWWW", "ZLIC",
  // Northeast China
  "ZYHB", "ZYCC", "ZYTX", "ZYTL",
  // Taiwan, HK & Macau
  "VHHH", "VMMC", "RCTP", "RCKH", "RCMQ",
  // Japan & Korea
  "RJAA", "RJTT", "RJBB", "RJGG", "RJFF", "ROAH", "RJCC", "RKSI", "RKPC", "RKPK",
  // Southeast Asia
  "WSSS", "VTBS", "VTSP", "WIII", "RPLL", "VVNB", "VVTS", "VDPP", "VDSR", "WMKK", "WADD", "VYYY",
  // South Asia
  "VIDP", "VABB", "VCBI", "VNKT",
  // Oceania
  "YSSY", "YMML", "YBBN",
  // North America
  "KLAX", "KJFK", "CYVR",
  // Europe
  "EHAM", "LFPG",
];

const REGION_ORDER = [
  "Fujian", "East China", "North China", "South China", "Central China",
  "Southwest China", "Northwest China", "Northeast China",
  "Taiwan, HK & Macau", "Japan & Korea", "Southeast Asia", "South Asia",
  "Oceania", "North America", "Europe",
];

const REGION_COLOR = {
  "Fujian": "#0C0243",
  "East China": "#3B6FE0",
  "North China": "#12B5A8",
  "South China": "#2BA84A",
  "Central China": "#8E5BFF",
  "Southwest China": "#E2456A",
  "Northwest China": "#F2A33A",
  "Northeast China": "#00A0B0",
  "Taiwan, HK & Macau": "#E0529C",
  "Japan & Korea": "#C77D2E",
  "Southeast Asia": "#D9A441",
  "South Asia": "#5B6CFF",
  "Oceania": "#7B6CF0",
  "North America": "#3E8E7E",
  "Europe": "#A855C7",
};

const rad = (x) => (x * Math.PI) / 180;
function distanceNm(a, b) {
  const [, , , lat1, lon1] = AP[a], [, , , lat2, lon2] = AP[b];
  const R = 3440.065; // nautical miles
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fleetFor(nm) {
  if (nm < 500) return "B737-800 / B737 MAX 8";
  if (nm < 1500) return "B737-800 / B737 MAX 8";
  if (nm < 3000) return "B737 MAX 8 / B787-8";
  if (nm < 4800) return "B787-8 / B787-9";
  return "B787-9";
}

function minutesFor(nm) {
  const speed = nm < 500 ? 390 : nm < 1500 ? 435 : nm < 3000 ? 455 : 480;
  return Math.max(35, Math.round((nm / speed) * 60 + 25));
}

const routes = [];
let flight = 8001;
for (const dest of DEST) {
  const nm = distanceNm("ZSAM", dest);
  routes.push({
    routeNumber: `MF${flight}/MF${flight + 1}`,
    dep: "ZSAM",
    arr: dest,
    aircraft: fleetFor(nm),
    minutes: minutesFor(nm),
    airline: "Xiamen Air Virtual",
  });
  flight += 2;
}

const sorted = [...DEST].sort((a, b) => AP[a][5].localeCompare(AP[b][5]) || AP[a][0].localeCompare(AP[b][0]));

const airports = ["  ZSAM: { city: \"Xiamen\", country: \"China\", iata: \"XMN\" },"]
  .concat(sorted.map((k) => `  ${k}: { city: ${JSON.stringify(AP[k][0])}, country: ${JSON.stringify(AP[k][1])}, iata: ${JSON.stringify(AP[k][2])} },`))
  .join("\n");

const coords = ["  ZSAM: [24.544, 118.128],"]
  .concat(sorted.map((k) => `  ${k}: [${AP[k][3]}, ${AP[k][4]}],`))
  .join("\n");

const regions = REGION_ORDER.map((name) => {
  const icaos = sorted.filter((k) => AP[k][5] === name);
  return `  { name: ${JSON.stringify(name)}, color: ${JSON.stringify(REGION_COLOR[name])}, icaos: [${icaos.map((i) => JSON.stringify(i)).join(",")}] },`;
}).join("\n");

const routesOut = `/* AUTO-GENERATED by scripts/gen-xiamen-network.mjs — Xiamen Air Virtual route database.
   ${DEST.length} destinations from Xiamen Gaoqi (ZSAM). */

export type Route = { routeNumber: string; dep: string; arr: string; aircraft: string; minutes: number; airline: string };

export const ROUTES: Route[] = [
${routes.map((r) => `  {
    "routeNumber": ${JSON.stringify(r.routeNumber)},
    "dep": ${JSON.stringify(r.dep)},
    "arr": ${JSON.stringify(r.arr)},
    "aircraft": ${JSON.stringify(r.aircraft)},
    "minutes": ${r.minutes},
    "airline": ${JSON.stringify(r.airline)}
  },`).join("\n")}
];

export const ROUTE_AIRLINES = ["Xiamen Air Virtual"] as const;
`;

const airportsOut = `/* AUTO-GENERATED by scripts/gen-xiamen-network.mjs — network airports. */
export const AIRPORTS: Record<string, { city: string; country: string; iata: string }> = {
${airports}
};

export function airportCity(icao: string): string {
  return AIRPORTS[icao]?.city ?? icao;
}
export function airportLabel(icao: string): string {
  const a = AIRPORTS[icao];
  return a ? \`\${a.city} (\${a.iata})\` : icao;
}

/* [lat, lon] for each network airport — for the maps. */
export const AIRPORT_COORDS: Record<string, [number, number]> = {
${coords}
};
`;

const regionsOut = `/* AUTO-GENERATED by scripts/gen-xiamen-network.mjs — network regions. */
export type Region = { name: string; color: string; icaos: string[] };

export const REGIONS: Region[] = [
${regions}
];

const ICAO_REGION = new Map<string, Region>();
for (const r of REGIONS) for (const i of r.icaos) ICAO_REGION.set(i, r);

export function regionForIcao(icao: string): Region | null { return ICAO_REGION.get(icao) ?? null; }
export function regionName(icao: string): string { return ICAO_REGION.get(icao)?.name ?? "—"; }
export function regionColor(icao: string): string { return ICAO_REGION.get(icao)?.color ?? "#0C0243"; }
`;

writeFileSync("src/lib/routes.ts", routesOut);
writeFileSync("src/lib/airports.ts", airportsOut);
writeFileSync("src/lib/regions.ts", regionsOut);
console.log(`generated ${routes.length} routes / ${sorted.length + 1} airports / ${REGION_ORDER.length} regions`);
