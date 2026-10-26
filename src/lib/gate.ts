/* ----------------------------------------------------------------
   Crew Centre preview gate.
   A lightweight username/password lock in front of /crew while the site
   is under IXMVRB review, so outsiders can't preview the work in progress.

   Credentials live ONLY in env (the GitHub repo is public):
     CREW_GATE_USER, CREW_GATE_PASS
   The cookie stores a salted SHA-256 of the password — never the password
   itself. Fails CLOSED: if no password is configured, nobody gets in.
------------------------------------------------------------------- */

import { cookies } from "next/headers";
import { createHash } from "crypto";

export const GATE_COOKIE = "fnva_gate";
const SALT = "fnva-crew-gate::v1";

export function gateConfigured(): boolean {
  return !!process.env.CREW_GATE_PASS;
}

function tokenFor(pass: string): string {
  return createHash("sha256").update(`${SALT}::${pass}`).digest("hex");
}

export function expectedToken(): string {
  return tokenFor(process.env.CREW_GATE_PASS ?? "");
}

export function validateCreds(username: string, password: string): boolean {
  const user = process.env.CREW_GATE_USER ?? "";
  const pass = process.env.CREW_GATE_PASS ?? "";
  if (!pass) return false; // not configured → deny
  return username.trim() === user && password === pass;
}

/* True when the visitor holds a valid gate cookie. */
export async function isUnlocked(): Promise<boolean> {
  if (!gateConfigured()) return false; // fail closed
  const c = (await cookies()).get(GATE_COOKIE)?.value;
  return !!c && c === expectedToken();
}
