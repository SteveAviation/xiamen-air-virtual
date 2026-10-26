/* Egret knowledge base — verified facts rendered from our own data, each
   tagged with an internal [#id] the model grounds on (never shown to pilots). */

import { RANKS, AP_TABLE, TIERS, LICENSES, CARGO_CERTS, CARGO_TABLE, CAREER_CODESHARES, CARGO_CODESHARES, CODESHARE_UNLOCK_AP } from "./career";
import { SITE, SITE_FLEET, SITE_HUBS, SITE_MODES } from "./site";
import { REGIONS } from "./regions";
import { ROUTES } from "./routes";

export function renderEgretKnowledge(): string {
  const L: string[] = [];
  const add = (id: string, text: string) => L.push(`[#${id}] ${text}`);

  add("airline.overview", `Xiamen Air Virtual (XMV) is an independent Infinite Flight virtual airline inspired by Xiamen Air, based at Xiamen Gaoqi (ZSAM). Tagline: "The Egret Way to Fly". It is not affiliated with the real Xiamen Air, Finavia, or the SkyTeam alliance.`);
  add("network.stats", `The network has ${SITE.network.airports} destinations across roughly ${SITE.network.routes} scheduled sectors from the Xiamen (ZSAM) hub. ${ROUTES.length} routes are published. Regions served: ${REGIONS.map((r) => r.name).join(", ")}.`);

  // Ranks
  for (const r of RANKS) {
    add(`rank.${r.name.toLowerCase()}`, `Rank ${r.n}: ${r.name} — unlocks at ${r.hours.toLocaleString()} flight hours. ${r.blurb}${r.perks?.length ? " Perks: " + r.perks.join("; ") + "." : ""}${r.apMultiplier ? ` Has a ${r.apMultiplier}× Strait Points multiplier.` : ""}`);
  }
  add("ranks.summary", `There are 9 ranks: Horizon (0h), Polaris (25h), Elysian (75h), Solstice (150h), Zenith (300h), Astralis (600h), Celestia (1200h), Sovereign (2500h), Luminary (5000h). The final three (Celestia, Sovereign, Luminary) are exclusive ranks.`);

  // Strait Points / career payouts
  add("ap.overview", `Strait Points (AP) are the Career-mode currency, earned per approved flight by aircraft class and duration. AP is strictly for passenger/career operations.`);
  add("ap.payouts", `Net AP per flight: ${AP_TABLE.regional.label} = ${AP_TABLE.regional.net} AP; ${AP_TABLE.continental.label} = ${AP_TABLE.continental.net} AP; ${AP_TABLE.longhaul.label} = ${AP_TABLE.longhaul.net.toLocaleString()} AP. Multipliers stack: punctual filing ×1.25, spotlight routes ×2.`);

  // Licences
  for (const l of LICENSES) {
    add(`licence.${l.short.toLowerCase()}`, `${l.name} (${l.short}): ${l.apCost === 0 ? "free" : l.apCost.toLocaleString() + " AP to unlock"}, max flight duration ${l.maxHours}h, fleet: ${l.fleet.join(", ")}.`);
  }

  // Tiers
  add("tiers.overview", `Egret Miles is a cosmetic loyalty tier system based on lifetime Strait Points balance.`);
  for (const t of TIERS) add(`tier.${t.name.toLowerCase()}`, `${t.name} tier: ${t.min.toLocaleString()}+ AP. ${t.blurb}`);

  // Codeshares
  add("codeshare.career", `Career codeshare partner networks unlock with AP (after reaching ${CODESHARE_UNLOCK_AP.toLocaleString()} AP): ${CAREER_CODESHARES.map((c) => `${c.name} (${c.free ? "free" : c.cost.toLocaleString() + " AP"})`).join(", ")}. Initial-tier routes are exclusive to Xiamen Air Virtual until a codeshare is unlocked.`);
  add("codeshare.cargo", `Cargo codeshares unlock with Logistic Coins at Freight Architect: ${CARGO_CODESHARES.map((c) => `${c.name} (${c.cost.toLocaleString()} LC)`).join(", ")}.`);

  // Modes
  for (const m of SITE_MODES) add(`mode.${m.name.split(" ")[0].toLowerCase()}`, `${m.name} — unlocks: ${m.unlock}. ${m.desc} Best for: ${m.bestFor}`);

  // Cargo
  add("cargo.overview", `Cargo Mode (Logistics Command) uses Logistic Coins (LC), a separate currency from AP. Cargo hubs are Xiamen (ZSAM) and Fuzhou (ZSFZ). Daily flight limits: Entry tier 2/day (one from each hub), Load Master and above 3/day.`);
  for (const c of CARGO_CERTS) add(`cargo.${c.name.toLowerCase().replace(/\s/g, "")}`, `Cargo cert ${c.name}: requires ${c.hours}h cargo hours${c.lcReq ? ` plus ${c.lcReq.toLocaleString()} LC` : ""}, unlocks ${c.fleet.join(", ")}, ${c.dailyLimit} contracts/day.`);
  add("cargo.risk", `Cargo contract payouts by risk: Low ${CARGO_TABLE.low.net.toLocaleString()} LC (×${CARGO_TABLE.low.multiplier}), Medium ${CARGO_TABLE.medium.net.toLocaleString()} LC (×${CARGO_TABLE.medium.multiplier}), High ${CARGO_TABLE.high.net.toLocaleString()} LC (×${CARGO_TABLE.high.multiplier}, subject to a 20% deduction).`);

  // Fleet
  for (const a of SITE_FLEET) add(`fleet.${a.type.toLowerCase().replace(/[^a-z0-9]/g, "")}`, `${a.type} (${a.reg}): ${a.pax} passengers, range ${a.rangeNm.toLocaleString()} nm, cruise ${a.cruiseSpeed} at ${a.cruiseAlt}. ${a.role}`);
  add("fleet.summary", `The mainline fleet is all-Boeing: ${SITE_FLEET.map((a) => a.type).join(", ")}.`);

  // Hubs
  for (const h of SITE_HUBS) add(`hub.${h.icao.toLowerCase()}`, `${h.name} (${h.icao}/${h.iata}) in ${h.city}, ${h.country} — role: ${h.role}. ${h.blurb}`);

  // Apply
  add("apply.how", `To join, use the Apply page on the website — choose Pilot or Staff and fill in the in-site form. Staff review applications and reach out via the Infinite Flight Community (IFC) to begin onboarding on Discord.`);
  add("apply.pilot", `Pilot requirements include an Infinite Flight Pro subscription, at least Grade 3, an active IFC account in good standing, Discord access, age 13+, not on the IXMVRB blacklist/watchlist, and filing at least one PIREP every 2 weeks.`);

  return L.join("\n");
}
