import {
  hashPasscode,
  verifyPasscode,
  makeSessionCookie,
  type Session,
} from "@/lib/auth";
import {
  getPilotByIfUsername,
  getPilotByCallsign,
  getPilotPasscodeHash,
  setPilotPasscodeHash,
  setPilotStaff,
  upsertManualPilot,
} from "@/lib/db";

/* Owner/admin IFC usernames that are auto-granted admin on login (comma-sep
   ADMIN_IFC_USERNAMES). Lets the owner bootstrap admin without needing crew
   access first. */
function isBootstrapAdmin(ifUsername: string): boolean {
  return (process.env.ADMIN_IFC_USERNAMES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(ifUsername.trim().toLowerCase());
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const ifUsername = String(body.ifUsername ?? "").trim();
  const passcode = String(body.passcode ?? "");

  if (!ifUsername) {
    return Response.json({ error: "Enter your Infinite Flight Community username." }, { status: 400 });
  }
  if (passcode.length < 4) {
    return Response.json({ error: "Passcode must be at least 4 characters." }, { status: 400 });
  }

  // Match by IFC username first, then fall back to callsign — so a pilot who
  // was added to the roster without an IFC username can still sign in with the
  // callsign staff gave them.
  let pilot = await getPilotByIfUsername(ifUsername);
  if (!pilot) pilot = await getPilotByCallsign(ifUsername);
  // Bootstrap: a configured owner can sign in even on an empty roster (before
  // any pilots exist / before the Discord bot is live). Their pilot record is
  // created on the spot and granted staff, so they're never locked out.
  if (!pilot && isBootstrapAdmin(ifUsername)) {
    pilot = await upsertManualPilot({ callsign: ifUsername, displayName: ifUsername, ifUsername });
    await setPilotStaff(pilot.id, true);
    pilot = { ...pilot, isStaff: true };
  }
  if (!pilot) {
    return Response.json(
      { error: "No pilot found with that IFC username or callsign. Ask staff to add you, or use /register in Discord." },
      { status: 404 },
    );
  }
  if (pilot.status === "suspended") {
    return Response.json({ error: "This account is suspended. Contact staff." }, { status: 403 });
  }

  const stored = await getPilotPasscodeHash(pilot.id);
  let firstTime = false;
  if (!stored) {
    // First login: the passcode they enter becomes their passcode.
    await setPilotPasscodeHash(pilot.id, hashPasscode(passcode));
    firstTime = true;
  } else if (!verifyPasscode(passcode, stored)) {
    return Response.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  // Auto-grant (and persist) admin for configured owner IFC usernames.
  const bootstrap = isBootstrapAdmin(ifUsername);
  if (bootstrap && pilot.isStaff !== true) {
    await setPilotStaff(pilot.id, true);
  }

  const session: Session = {
    pilotId: pilot.id,
    discordId: pilot.discordId,
    callsign: pilot.callsign,
    displayName: pilot.displayName,
    avatar: pilot.avatar,
    isStaff: pilot.isStaff === true || bootstrap,
  };

  const cookie = makeSessionCookie(session);
  const res = Response.json({ ok: true, firstTime, callsign: pilot.callsign });
  res.headers.append(
    "Set-Cookie",
    `${cookie.name}=${cookie.value}; Path=${cookie.options.path}; Max-Age=${cookie.options.maxAge}; HttpOnly; SameSite=Lax${
      cookie.options.secure ? "; Secure" : ""
    }`,
  );
  return res;
}
