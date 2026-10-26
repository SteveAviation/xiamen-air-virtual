/* Demo seed for the in-memory store used when DATABASE_URL is not set.
   No real people: a single neutral demo pilot keeps the Crew Centre usable
   for local preview. This data is never inserted into a live database. */
import type { Pilot, Pirep } from "./db";

/* Recent flights for the demo pilot (id 1) so the logbook, dashboard and
   Strait-Points feed feel alive in demo mode. */
export const SEED_PIREPS: Pirep[] = [
  {
    id: 1, pilotId: 1, flightNo: "MF8101", dep: "ZSAM", arr: "ZBAA",
    aircraft: "Boeing 787-9", minutes: 175, rawMinutes: 175, multiplier: 1,
    multiplierCode: null, fuelKg: 18400, landingRate: -126, server: "Expert",
    remarks: "Smooth ride up the coast.", status: "pending",
    filedAt: "2026-06-09T18:42:00Z", reviewedAt: null, reviewer: null, discordMsgId: null,
  },
  {
    id: 2, pilotId: 1, flightNo: "MF8151", dep: "ZSAM", arr: "RJTT",
    aircraft: "Boeing 787-8", minutes: 195, rawMinutes: 195, multiplier: 1,
    multiplierCode: null, fuelKg: 21200, landingRate: -98, server: "Expert",
    remarks: "Evening approach into Haneda.", status: "approved",
    filedAt: "2026-06-08T07:15:00Z", reviewedAt: "2026-06-08T09:00:00Z", reviewer: null, discordMsgId: null,
  },
  {
    id: 3, pilotId: 1, flightNo: "MF8061", dep: "ZSAM", arr: "ZSPD",
    aircraft: "Boeing 737-800", minutes: 95, rawMinutes: 95, multiplier: 1,
    multiplierCode: null, fuelKg: 7400, landingRate: -142, server: "Expert",
    remarks: null, status: "approved",
    filedAt: "2026-06-05T13:05:00Z", reviewedAt: "2026-06-05T15:20:00Z", reviewer: null, discordMsgId: null,
  },
  {
    id: 4, pilotId: 1, flightNo: "MF8163", dep: "ZSAM", arr: "EHAM",
    aircraft: "Boeing 787-9", minutes: 654, rawMinutes: 654, multiplier: 2,
    multiplierCode: "XMNEVENT2X", fuelKg: 86500, landingRate: -154, server: "Expert",
    remarks: "Spotlight route — double AP.", status: "approved",
    filedAt: "2026-06-03T16:40:00Z", reviewedAt: "2026-06-03T17:10:00Z", reviewer: null, discordMsgId: null,
  },
  {
    id: 5, pilotId: 1, flightNo: "MF8051", dep: "ZSAM", arr: "ZGGG",
    aircraft: "Boeing 737 MAX 8", minutes: 85, rawMinutes: 85, multiplier: 1,
    multiplierCode: null, fuelKg: 6200, landingRate: -110, server: "Expert",
    remarks: null, status: "approved",
    filedAt: "2026-06-01T08:25:00Z", reviewedAt: "2026-06-01T09:00:00Z", reviewer: null, discordMsgId: null,
  },
  {
    id: 6, pilotId: 1, flightNo: "MF8301", dep: "ZSAM", arr: "WSSS",
    aircraft: "Boeing 737 MAX 8", minutes: 240, rawMinutes: 240, multiplier: 1,
    multiplierCode: null, fuelKg: 19800, landingRate: -88, server: "Expert",
    remarks: "Night departure to Singapore.", status: "approved",
    filedAt: "2026-05-29T21:10:00Z", reviewedAt: "2026-05-30T06:00:00Z", reviewer: null, discordMsgId: null,
  },
];

export const SEED_PILOTS: Pilot[] = [
  {
    "id": 1,
    "discordId": "demo-1",
    "callsign": "XMV 001",
    "displayName": "Demo Pilot",
    "avatar": null,
    "createdAt": "2025-09-08T12:14:37.000Z",
    "status": "active",
    "ifUsername": null,
    "ifUserId": null,
    "acceptedAt": "2025-09-08T12:14:37.000Z",
    "notes": null,
    "rankLabel": null,
    "linked": false,
    "baseMinutes": 0,
    "basePireps": 0
  }
];
