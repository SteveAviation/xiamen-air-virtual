import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";

/* ----------------------------------------------------------------
   Discord OAuth + signed session cookie.

   Dormant until configured: with no DISCORD_CLIENT_ID, the site runs
   in DEMO mode — getSession() returns a demo pilot (with staff access)
   so the full PIREP + staff experience is explorable without secrets.
   Set the env vars below to switch on real Discord login.

   Required env to go live:
     DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI,
     DISCORD_GUILD_ID, DISCORD_STAFF_ROLE_ID, SESSION_SECRET
------------------------------------------------------------------- */

export const authConfigured = !!process.env.DISCORD_CLIENT_ID;
const dbConfigured = !!process.env.DATABASE_URL;
const CREW_COOKIE = "fnr_crew";

const SESSION_COOKIE = "fnr_session";
const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret";
const SCOPES = "identify guilds.members.read";
const DISCORD_API = "https://discord.com/api";

export type Session = {
  pilotId: number;
  discordId: string;
  callsign: string;
  displayName: string;
  avatar: string | null;
  isStaff: boolean;
  demo?: boolean;
};

const DEMO_SESSION: Session = {
  pilotId: 1,
  discordId: "demo-1",
  callsign: "Xiamen Air 001",
  displayName: "XMV Crew",
  avatar: null,
  isStaff: true,
  demo: true,
};

/* ---- signing ---- */

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: object): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${mac}`;
}

function verify(token: string): Session | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = b64url(createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
  } catch {
    return null;
  }
}

/* ---- session access ---- */

export function makeSessionCookie(session: Session) {
  return {
    name: SESSION_COOKIE,
    value: sign(session),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/* Read the current pilot session.
   Demo staff session is ONLY used for pure local dev (no DB and no Discord) —
   never when a real database is connected, so production isn't wide open. */
export async function getSession(): Promise<Session | null> {
  // Honor a valid session cookie from any login method (IFC passcode or Discord).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    const session = verify(token);
    if (session) {
      if (session.demo) return session; // demo has no DB record
      // Live status check — a suspended or deleted pilot loses Crew Centre
      // access immediately, even with a still-valid signed cookie. Admins are
      // the ultimate authority. On a DB error we fail OPEN (don't mass-lockout).
      try {
        const { getPilotById } = await import("@/lib/db");
        const pilot = await getPilotById(session.pilotId);
        if (!pilot || pilot.status === "suspended") return null;
      } catch {
        /* transient DB issue — allow the session through */
      }
      return session;
    }
  }
  // No valid session. Demo mode only in a bare local dev setup — no Discord AND
  // no database. The moment a real database is connected, the Crew Centre asks
  // pilots to sign in for real (IFC passcode, or Discord once configured), so a
  // live deployment is never wide open on a shared demo pilot.
  if (!authConfigured && !dbConfigured) return DEMO_SESSION;
  return null;
}

/* ---- interim Crew Center password gate ----
   Until Discord login is configured, the Crew Center is locked behind
   CREW_PASSWORD. A correct password sets a signed cookie. */
function crewSignature(): string {
  return b64url(createHmac("sha256", SECRET).update("crew-access").digest());
}

export function verifyCrewPassword(password: string): boolean {
  const expected = process.env.CREW_PASSWORD;
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function makeCrewCookie() {
  return {
    name: CREW_COOKIE,
    value: crewSignature(),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}

async function hasCrewCookie(): Promise<boolean> {
  const v = (await cookies()).get(CREW_COOKIE)?.value;
  if (!v) return false;
  const expected = crewSignature();
  const a = Buffer.from(v);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* Crew Center / staff-action access = a staff Discord session, an app-granted
   admin (checked live so granting takes effect without re-login), OR the
   interim crew password cookie. */
export async function hasCrewAccess(): Promise<boolean> {
  const session = await getSession();
  if (session?.isStaff) return true;
  if (session?.pilotId) {
    const { isPilotStaff } = await import("@/lib/db");
    if (await isPilotStaff(session.pilotId)) return true;
  }
  return hasCrewCookie();
}

/* ---- IFC-login passcode hashing (scrypt, salted) ---- */
export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(passcode, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPasscode(passcode: string, stored: string | null): boolean {
  if (!stored || !passcode) return false;
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const expected = Buffer.from(derivedHex, "hex");
  const actual = scryptSync(passcode, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ---- Discord OAuth helpers ---- */

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES,
    state,
    prompt: "consent",
  });
  return `${DISCORD_API}/oauth2/authorize?${params}`;
}

type TokenResponse = { access_token: string };

export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[auth] token exchange failed: ${res.status}`,
      body.slice(0, 300),
      `| client_id set: ${!!process.env.DISCORD_CLIENT_ID}`,
      `| secret set: ${!!process.env.DISCORD_CLIENT_SECRET}`,
      `| redirect_uri: ${process.env.DISCORD_REDIRECT_URI}`,
    );
    throw new Error(`Discord token exchange failed: ${res.status}`);
  }
  const json = (await res.json()) as TokenResponse;
  return json.access_token;
}

export type DiscordIdentity = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isStaff: boolean;
};

export async function fetchIdentity(accessToken: string): Promise<DiscordIdentity> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const userRes = await fetch(`${DISCORD_API}/users/@me`, { headers });
  if (!userRes.ok) {
    console.error(`[auth] /users/@me failed: ${userRes.status}`);
    throw new Error(`Discord user fetch failed: ${userRes.status}`);
  }
  const user = await userRes.json();

  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  // Read the member's roles in the configured guild to gate staff access.
  let isStaff = false;
  const guildId = process.env.DISCORD_GUILD_ID;
  const staffRole = process.env.DISCORD_STAFF_ROLE_ID;
  if (guildId && staffRole) {
    const memberRes = await fetch(
      `${DISCORD_API}/users/@me/guilds/${guildId}/member`,
      { headers },
    );
    if (memberRes.ok) {
      const member = await memberRes.json();
      isStaff = Array.isArray(member.roles) && member.roles.includes(staffRole);
    }
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.global_name || user.username,
    avatar,
    isStaff,
  };
}
