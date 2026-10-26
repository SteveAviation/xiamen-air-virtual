/* ----------------------------------------------------------------
   Xiamen Air Virtual — pilot portal aggregation.
   Builds the dashboard model for the signed-in pilot: hours, PIREPs,
   rank + licence progression, Strait-Points balance, Egret Miles tier
   and the feature gates (Career / Cargo / Special Ops / SkyTeam Discover).
------------------------------------------------------------------- */

import { getSession, type Session } from "./auth";
import {
  getPilotById,
  approvedMinutesForPilot,
  listPirepsByPilot,
  listPurchases,
  type Pilot,
  type Pirep,
} from "./db";
import {
  rankForHours,
  licenseFromOwned,
  fleetFromOwned,
  allowedHaulsFromOwned,
  estimateApFromHours,
  computeAp,
  cargoEarningsForMinutes,
  tierForAp,
  hasRankAtLeast,
  cargoCertForHours,
  GATES,
  type RankProgress,
  type CargoCert,
  type CareerHaul,
} from "./career";

export type Gates = {
  career: boolean;
  cargo: boolean;
  specialOps: boolean;
  discover: boolean;
};

export type PilotDashboard = {
  session: Session;
  pilot: Pilot | null;
  totalMinutes: number;
  totalHours: number;
  totalPireps: number;
  filedPireps: Pirep[]; // newest first
  lastPirepAt: string | null;
  rank: RankProgress;
  rankMultiplier: number;
  license: ReturnType<typeof licenseFromOwned>;
  fleet: string[];
  ownedLicenses: string[];
  allowedHauls: CareerHaul[];
  unlockedCodeshares: string[];
  apBalance: number;
  apEarned: number; // lifetime AP earned (before spend) — drives tier/status
  apSpent: number;
  lcBalance: number;
  lcSpent: number;
  cargoHours: number;
  cargoCert: CargoCert;
  tier: ReturnType<typeof tierForAp>;
  gates: Gates;
};

export async function getPilotDashboard(): Promise<PilotDashboard | null> {
  const session = await getSession();
  if (!session) return null;

  const pilot = await getPilotById(session.pilotId).catch(() => null);
  // approvedMinutesForPilot already includes the pilot's historical baseMinutes.
  const totalMinutes = await approvedMinutesForPilot(session.pilotId).catch(() => 0);
  const baseMin = pilot?.baseMinutes ?? 0;
  const totalHours = totalMinutes / 60;

  const filed = (await listPirepsByPilot(session.pilotId).catch(() => [])).sort(
    (a, b) => +new Date(b.filedAt) - +new Date(a.filedAt),
  );
  const totalPireps = (pilot?.basePireps ?? 0) + filed.length;
  const lastPirepAt = filed[0]?.filedAt ?? null;

  const rank = rankForHours(totalHours);
  const rankMultiplier = rank.current.apMultiplier ?? 1;

  // Purchases (licences + codeshare unlocks) debit the wallet.
  const purchases = await listPurchases(session.pilotId).catch(() => []);
  const apSpent = purchases.filter((p) => p.currency === "AP").reduce((s, p) => s + p.cost, 0);
  const lcSpent = purchases.filter((p) => p.currency === "LC").reduce((s, p) => s + p.cost, 0);
  const ownedLicenses = purchases.filter((p) => p.kind === "license").map((p) => p.item);
  const unlockedCodeshares = purchases.filter((p) => p.kind === "codeshare").map((p) => p.item);

  // AP is earned in CAREER mode only. Casual flights build hours/rank but pay
  // no Strait Points; Cargo flights pay Logistic Coins instead. AP = estimate
  // from historical hours + AP from approved CAREER flights.
  const earned = filed
    .filter((p) => p.status === "approved" && p.server === "Career")
    .reduce((sum, p) => sum + computeAp(p.minutes, { rankMultiplier }).net, 0);
  const apEarned = estimateApFromHours(baseMin / 60) + earned; // lifetime earned
  const apBalance = apEarned - apSpent; // spendable
  const tier = tierForAp(apEarned); // Egret Miles status = lifetime, never drops on spend

  // Licences & fleet are OWNED (purchased), not derived from current AP.
  const license = licenseFromOwned(ownedLicenses);
  const fleet = fleetFromOwned(ownedLicenses);
  const allowedHauls = allowedHaulsFromOwned(ownedLicenses);

  // Cargo economy (Logistic Coins) — earned in CARGO mode only. LC is summed
  // from approved Cargo PIREPs (never estimated from total hours), so Casual
  // and Career flying never earns LC.
  const cargoOpen = hasRankAtLeast(totalHours, GATES.cargoMode);
  const cargoPireps = filed.filter((p) => p.status === "approved" && p.server === "Cargo");
  const cargoHours = cargoPireps.reduce((sum, p) => sum + p.minutes, 0) / 60;
  const lcEarned = cargoPireps.reduce((sum, p) => sum + cargoEarningsForMinutes(p.minutes), 0);
  const lcBalance = lcEarned - lcSpent;
  const cargoCert = cargoCertForHours(cargoHours, lcEarned);

  const gates: Gates = {
    career: hasRankAtLeast(totalHours, GATES.careerMode),
    cargo: hasRankAtLeast(totalHours, GATES.cargoMode),
    specialOps: hasRankAtLeast(totalHours, GATES.specialOps),
    discover: hasRankAtLeast(totalHours, GATES.SkyTeamDiscover),
  };

  return {
    session,
    pilot,
    totalMinutes,
    totalHours,
    totalPireps,
    filedPireps: filed,
    lastPirepAt,
    rank,
    rankMultiplier,
    license,
    fleet,
    ownedLicenses,
    allowedHauls,
    unlockedCodeshares,
    apBalance,
    apEarned,
    apSpent,
    lcBalance,
    lcSpent,
    cargoHours,
    cargoCert,
    tier,
    gates,
  };
}

/* Economy snapshot for a pilot by id (used by the Discord bot, which has a
   pilotId rather than a web session). Mirrors the dashboard's economy maths. */
export async function getPilotEconomy(pilotId: number) {
  const pilot = await getPilotById(pilotId).catch(() => null);
  const totalMinutes = await approvedMinutesForPilot(pilotId).catch(() => 0);
  const baseMin = pilot?.baseMinutes ?? 0;
  const totalHours = totalMinutes / 60;
  const filed = await listPirepsByPilot(pilotId).catch(() => []);
  const rank = rankForHours(totalHours);
  const purchases = await listPurchases(pilotId).catch(() => []);
  const apSpent = purchases.filter((p) => p.currency === "AP").reduce((s, p) => s + p.cost, 0);
  const lcSpent = purchases.filter((p) => p.currency === "LC").reduce((s, p) => s + p.cost, 0);
  const ownedLicenses = purchases.filter((p) => p.kind === "license").map((p) => p.item);
  // AP from CAREER-mode approved flights only (Casual earns hours, not AP).
  const earned = filed
    .filter((p) => p.status === "approved" && p.server === "Career")
    .reduce((sum, p) => sum + computeAp(p.minutes).net, 0);
  const apEarned = estimateApFromHours(baseMin / 60) + earned;
  const apBalance = apEarned - apSpent;
  const tier = tierForAp(apEarned);
  const license = licenseFromOwned(ownedLicenses);
  const fleet = fleetFromOwned(ownedLicenses);
  // LC from CARGO-mode approved flights only.
  const cargoOpen = hasRankAtLeast(totalHours, GATES.cargoMode);
  const cargoPireps = filed.filter((p) => p.status === "approved" && p.server === "Cargo");
  const cargoHours = cargoPireps.reduce((sum, p) => sum + p.minutes, 0) / 60;
  const lcEarned = cargoPireps.reduce((sum, p) => sum + cargoEarningsForMinutes(p.minutes), 0);
  const lcBalance = lcEarned - lcSpent;
  const cargoCert = cargoCertForHours(cargoHours, lcEarned);
  const gates = {
    career: hasRankAtLeast(totalHours, GATES.careerMode),
    cargo: cargoOpen,
  };
  return { pilot, totalMinutes, totalHours, apBalance, lcBalance, tier, rank, license, fleet, cargoHours, cargoCert, gates };
}

/* ---- formatting helpers ---- */
export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toLocaleString()}h ${m.toString().padStart(2, "0")}m`;
}
export function fmtAp(ap: number): string {
  return ap.toLocaleString("en-US");
}
export function fmtApCompact(ap: number): string {
  if (ap >= 1_000_000) return (ap / 1_000_000).toFixed(ap % 1_000_000 === 0 ? 0 : 1) + "M";
  if (ap >= 1_000) return (ap / 1_000).toFixed(ap % 1_000 === 0 ? 0 : 1) + "K";
  return String(ap);
}
export function fmtLc(lc: number): string {
  return lc.toLocaleString("en-US");
}
export const fmtLcCompact = fmtApCompact;
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
/* Submission time in Zulu (UTC), e.g. "14:30Z" — important for ROTD tracking. */
export function fmtZulu(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}Z`;
}
/* Date + Zulu time, e.g. "12 Jul 2026 · 14:30Z". */
export function fmtDateZulu(iso: string | null): string {
  if (!iso) return "—";
  return `${fmtDate(iso)} · ${fmtZulu(iso)}`;
}
export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
