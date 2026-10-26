import { hasCrewAccess, hashPasscode } from "@/lib/auth";
import {
  updatePilotStatus,
  setPilotDiscord,
  setPilotRankLabel,
  setPilotIfIdentity,
  updatePilotProfile,
  unlinkPilotDiscord,
  deletePilot,
  addPilotWarning,
  clearPilotWarnings,
  setPilotStaff,
  setPilotPasscodeHash,
  upsertManualPilot,
  getPilotById,
  approvedMinutesForPilot,
  purgeSeedPilots,
  deletePilotPireps,
  type PilotStatus,
} from "@/lib/db";
import { syncRankRole } from "@/lib/discord";
import { ifConfigured, lookupUserByIfc } from "@/lib/infiniteflight";
import { rankFromMinutes } from "@/lib/rank";
import { RANK_NAMES } from "@/lib/data";

/* Resolve an IFC username → IF user ID when the API is connected.
   Returns { ifUserId } on success, or { error } if the name isn't found. */
async function resolveIf(
  ifUsername: string,
): Promise<{ ifUserId: string | null } | { error: string }> {
  if (!ifUsername || !ifConfigured) return { ifUserId: null };
  const user = await lookupUserByIfc(ifUsername);
  if (!user) {
    return { error: "That IFC username wasn't found on Infinite Flight." };
  }
  return { ifUserId: user.userId };
}

const ACTION_TO_STATUS: Record<string, PilotStatus> = {
  accept: "active",
  reactivate: "active",
  reject: "suspended",
  suspend: "suspended",
};

export async function POST(request: Request) {
  if (!(await hasCrewAccess())) {
    return Response.json({ error: "Staff access required." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");

  // Remove the fictional seed roster (placeholder pilots from the clone).
  if (action === "purgeSeed") {
    const removed = await purgeSeedPilots();
    return Response.json({ ok: true, removed });
  }

  // Add a new roster member by hand (callsign + optional IF username, name,
  // rank, carried-over hours/PIREPs). Upserts by callsign.
  if (action === "create") {
    const callsign = String(body.callsign ?? "").trim();
    if (callsign.length < 2) {
      return Response.json({ error: "Enter a callsign." }, { status: 400 });
    }
    const ifUsername = String(body.ifUsername ?? "").trim();
    const resolved = await resolveIf(ifUsername);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: 422 });
    }
    const rankName = String(body.rankName ?? "").trim();
    if (rankName && !RANK_NAMES.includes(rankName)) {
      return Response.json({ error: "Unknown rank." }, { status: 400 });
    }
    const pilot = await upsertManualPilot({
      callsign,
      displayName: String(body.displayName ?? "").trim() || null,
      ifUsername: ifUsername || null,
      ifUserId: resolved.ifUserId,
      rankLabel: rankName || null,
      baseMinutes: Number(body.baseMinutes) || 0,
      basePireps: Number(body.basePireps) || 0,
    });
    return Response.json({ ok: true, pilot });
  }

  // Bulk add: paste a list of members. Each row = { callsign, ifUsername? }.
  // Upserts by callsign; resolves IF usernames where the API is connected.
  if (action === "bulkCreate") {
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return Response.json({ error: "No members to add." }, { status: 400 });
    }
    if (rows.length > 500) {
      return Response.json({ error: "Too many rows (max 500)." }, { status: 400 });
    }
    let added = 0;
    const errors: { callsign: string; error: string }[] = [];
    for (const r of rows as Array<Record<string, unknown>>) {
      const callsign = String(r.callsign ?? "").trim();
      if (callsign.length < 2) {
        errors.push({ callsign: callsign || "(blank)", error: "Missing callsign" });
        continue;
      }
      const ifUsername = String(r.ifUsername ?? "").trim();
      const resolved = await resolveIf(ifUsername);
      if ("error" in resolved) {
        errors.push({ callsign, error: `IF username "${ifUsername}" not found` });
        continue;
      }
      try {
        await upsertManualPilot({
          callsign,
          ifUsername: ifUsername || null,
          ifUserId: resolved.ifUserId,
        });
        added++;
      } catch {
        errors.push({ callsign, error: "Could not save" });
      }
    }
    return Response.json({ ok: true, added, errors });
  }

  const pilotId = Number(body.pilotId);
  if (!Number.isInteger(pilotId)) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  // Edit core profile: callsign, display name, carried-over hours/PIREPs.
  if (action === "update") {
    const callsign = body.callsign != null ? String(body.callsign).trim() : undefined;
    if (callsign !== undefined && callsign.length < 2) {
      return Response.json({ error: "Callsign is too short." }, { status: 400 });
    }
    await updatePilotProfile(pilotId, {
      callsign,
      displayName: body.displayName != null ? String(body.displayName) : undefined,
      baseMinutes: body.baseMinutes != null ? Number(body.baseMinutes) : undefined,
      basePireps: body.basePireps != null ? Number(body.basePireps) : undefined,
    });
    return Response.json({ ok: true });
  }

  // Detach the pilot's Discord account (reverts to an unlinked roster member).
  if (action === "unlink") {
    await unlinkPilotDiscord(pilotId);
    return Response.json({ ok: true });
  }

  // Permanently remove the pilot from the Crew Center.
  if (action === "delete") {
    await deletePilot(pilotId);
    return Response.json({ ok: true });
  }

  // Delete all of a pilot's filed PIREPs (full flight-hours reset).
  if (action === "resetPireps") {
    const removed = await deletePilotPireps(pilotId);
    return Response.json({ ok: true, removed });
  }

  // Add a disciplinary warning / strike.
  if (action === "warn") {
    const reason = String(body.reason ?? "").trim();
    if (reason.length < 2) {
      return Response.json({ error: "Enter a reason for the warning." }, { status: 400 });
    }
    await addPilotWarning(pilotId, reason, new Date().toISOString());
    return Response.json({ ok: true });
  }

  // Clear all of a pilot's warnings.
  if (action === "clearWarnings") {
    await clearPilotWarnings(pilotId);
    return Response.json({ ok: true });
  }

  // Set or clear a pilot's IFC-login passcode (staff issue/reset).
  if (action === "setpasscode") {
    const passcode = String(body.passcode ?? "");
    if (passcode && passcode.length < 4) {
      return Response.json({ error: "Passcode must be at least 4 characters." }, { status: 400 });
    }
    await setPilotPasscodeHash(pilotId, passcode ? hashPasscode(passcode) : null);
    return Response.json({ ok: true });
  }

  // Grant / revoke admin (staff) access. They sign in via IFC passcode (or
  // Discord) — make sure they have an IF username and a passcode set.
  if (action === "staff") {
    const makeStaff = body.isStaff === true || body.isStaff === "true";
    await setPilotStaff(pilotId, makeStaff);
    return Response.json({ ok: true, isStaff: makeStaff });
  }

  // Set/update an existing member's IF username (staff), resolving the IF ID.
  if (action === "ifusername") {
    const ifUsername = String(body.ifUsername ?? "").trim();
    const resolved = await resolveIf(ifUsername);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: 422 });
    }
    await setPilotIfIdentity(pilotId, ifUsername || null, resolved.ifUserId);
    return Response.json({ ok: true, ifUsername: ifUsername || null });
  }

  // Link a member to a real Discord account so they can sign in.
  if (action === "link") {
    const discordId = String(body.discordId ?? "").trim();
    if (!/^\d{5,25}$/.test(discordId)) {
      return Response.json(
        { error: "Enter a valid numeric Discord user ID." },
        { status: 400 },
      );
    }
    const result = await setPilotDiscord(pilotId, discordId);
    if (!result.ok) return Response.json({ error: result.error }, { status: 409 });
    return Response.json({ ok: true });
  }

  // Set/change a pilot's rank, then sync their Discord rank role.
  if (action === "rank") {
    const rankName = String(body.rankName ?? "");
    if (rankName !== "" && !RANK_NAMES.includes(rankName)) {
      return Response.json({ error: "Unknown rank." }, { status: 400 });
    }
    const pilot = await getPilotById(pilotId);
    if (!pilot) return Response.json({ error: "Pilot not found." }, { status: 404 });

    await setPilotRankLabel(pilotId, rankName || null);

    // Effective rank for Discord = explicit label, else hours-derived.
    let effective = rankName;
    if (!effective) {
      const mins = await approvedMinutesForPilot(pilotId);
      effective = rankFromMinutes(mins).current.name;
    }
    const discordSync = await syncRankRole(pilot.discordId, effective);
    return Response.json({ ok: true, discordSync });
  }

  const status = ACTION_TO_STATUS[action];
  if (!status) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  await updatePilotStatus(pilotId, status);
  return Response.json({ ok: true });
}
