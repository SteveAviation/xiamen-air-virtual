import {
  InteractionType,
  InteractionResponseType,
  ComponentType,
  ButtonStyle,
  GOLD,
  verifyDiscordRequest,
  getInvoker,
  option,
  isStaff,
  isAdmin,
  message,
  updateMessage,
  syncRankRole,
  notifyNewRegistration,
  notifyLoa,
  type Interaction,
} from "@/lib/discord";
import {
  upsertPilot,
  getPilotByDiscordId,
  getPilotByCallsign,
  getPilotById,
  setPilotDiscord,
  setPilotCallsign,
  setPilotIfIdentity,
  createPirep,
  listPirepsByPilot,
  listPireps,
  updatePirepStatus,
  updatePilotStatus,
  approvedMinutesForPilot,
  leaderboard,
  createLoa,
  acceptLoa,
  rejectLoa,
  approveLoaExtension,
  rejectLoaExtension,
} from "@/lib/db";
import { ifConfigured, lookupUserByIfc, getUserStats } from "@/lib/infiniteflight";
import { announceFiledPirep, announceReviewedPirep } from "@/lib/pireplog";
import { rankFromMinutes, formatDuration } from "@/lib/rank";
import { RANKS, ACRUX_RANK, multiplierFor } from "@/lib/data";
import { VALID_AIRCRAFT } from "@/lib/aircraft";
import { getPilotEconomy, fmtAp, fmtLc } from "@/lib/portal";
import { punctualityBonus } from "@/lib/career";
import {
  getDispatches,
  getCargoContracts,
  getRotw,
  setRotw,
  rotwOptions,
  firstFlightNo,
} from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(request: Request) {
  const raw = await request.text();
  const valid = verifyDiscordRequest(
    raw,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
  );
  // Discord requires a 401 for bad signatures (also used during URL setup).
  if (!valid) return new Response("invalid request signature", { status: 401 });

  const interaction: Interaction = JSON.parse(raw);

  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    switch (interaction.data.name) {
      case "register":
        return handleRegister(interaction);
      case "pirep":
        return handlePirep(interaction);
      case "stats":
        return handleStats(interaction);
      case "aboutme":
        return handleAboutMe(interaction);
      case "loa":
        return handleLoa(interaction);
      case "rank":
        return handleRank();
      case "leaderboard":
        return handleLeaderboard();
      case "review":
        return handleReview(interaction);
      case "balance":
        return handleBalance(interaction);
      case "dispatch":
        return handleDispatch(interaction);
      case "rotw":
        return handleRotw(interaction);
      default:
        return message("Unknown command.", { ephemeral: true });
    }
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const cid = String(interaction.data.custom_id ?? "");
    if (cid.startsWith("reg:")) return handleRegisterButton(interaction);
    if (cid.startsWith("about:")) return handleAboutButton(interaction);
    if (cid.startsWith("loa:")) return handleLoaButton(interaction);
    if (cid.startsWith("disp:")) return handleDispatchButton(interaction);
    return handleReviewButton(interaction);
  }

  return message("Unsupported interaction.", { ephemeral: true });
}

/* ---------------------------- /register --------------------------- */
async function handleRegister(interaction: Interaction) {
  const user = getInvoker(interaction);
  const callsign = String(option(interaction, "callsign") ?? "").trim();
  const ifc = option(interaction, "ifc") ? String(option(interaction, "ifc")).trim() : "";

  if (callsign.length < 2) {
    return message("Please provide your Xiamen Air callsign, e.g. `Xiamen Air 042`.", {
      ephemeral: true,
    });
  }
  if (ifc.length < 2) {
    return message("Please provide your Infinite Flight Community username.", {
      ephemeral: true,
    });
  }

  // Resolve the IFC username → IF user (id + grade + hours) when connected.
  let ifUserId: string | null = null;
  let ifGrade: number | null = null;
  let ifMinutes: number | null = null;
  if (ifc && ifConfigured) {
    const u = await lookupUserByIfc(ifc);
    if (!u) {
      return message(
        `That Infinite Flight Community username (\`${ifc}\`) wasn't found. Check the spelling and try again.`,
        { ephemeral: true },
      );
    }
    ifUserId = u.userId;
    ifGrade = u.grade ?? null;
    ifMinutes = u.flightTime ?? null;
  }

  // Ping the admin with the registrant info + Approve/Reject buttons.
  const ping = (pilotId: number, status: string, reclaimed: boolean) =>
    notifyNewRegistration({
      pilotId,
      registrantId: user.id,
      username: user.username,
      callsign,
      ifUsername: ifc || null,
      ifGrade,
      ifMinutes,
      reclaimed,
      status,
    }).catch(() => undefined);

  const byCallsign = await getPilotByCallsign(callsign);

  // Callsign already belongs to a different, linked pilot.
  if (byCallsign && byCallsign.linked && byCallsign.discordId !== user.id) {
    return message(
      `\`${callsign}\` is already registered to another pilot. If that's you, ask staff to relink it.`,
      { ephemeral: true },
    );
  }

  // Reclaim an imported/unlinked roster record → link to this Discord account.
  if (byCallsign && !byCallsign.linked) {
    const linkRes = await setPilotDiscord(byCallsign.id, user.id);
    if (!linkRes.ok) {
      return message(linkRes.error ?? "Couldn't link your account — contact staff.", {
        ephemeral: true,
      });
    }
    if (ifc) await setPilotIfIdentity(byCallsign.id, ifc, ifUserId);
    await ping(byCallsign.id, byCallsign.status, true);
    return registeredEmbed(callsign, ifc, byCallsign.status, true);
  }

  // It's already their own record — just update the IF username.
  if (byCallsign && byCallsign.discordId === user.id) {
    if (ifc) await setPilotIfIdentity(byCallsign.id, ifc, ifUserId);
    return registeredEmbed(callsign, ifc, byCallsign.status, false, true);
  }

  // They already have a record under a different callsign (e.g. from /pirep).
  const mine = await getPilotByDiscordId(user.id);
  if (mine) {
    await setPilotCallsign(mine.id, callsign);
    if (ifc) await setPilotIfIdentity(mine.id, ifc, ifUserId);
    await ping(mine.id, mine.status, false);
    return registeredEmbed(callsign, ifc, mine.status, false, true);
  }

  // Brand-new pilot → create as pending for staff approval. Their Discord
  // account is stored and flagged linked = true (see upsertPilot).
  const pilot = await upsertPilot({
    discordId: user.id,
    callsign,
    displayName: user.displayName,
    avatar: user.avatar,
  });
  if (ifc) await setPilotIfIdentity(pilot.id, ifc, ifUserId);
  await ping(pilot.id, pilot.status, false);
  return registeredEmbed(callsign, ifc, pilot.status, false);
}

/* Approve / reject a registration straight from the admin's DM ping. */
async function handleRegisterButton(interaction: Interaction) {
  const { id: clickerId, roles, username } = getInvoker(interaction);
  if (!isAdmin(clickerId) && !isStaff(roles)) {
    return message("⛔ Only staff can action registrations.", { ephemeral: true });
  }

  const [, action, idStr] = String(interaction.data.custom_id).split(":");
  const pilotId = Number(idStr);
  if (!Number.isInteger(pilotId) || (action !== "approve" && action !== "reject")) {
    return message("Bad action.", { ephemeral: true });
  }

  const pilot = await getPilotById(pilotId);
  if (!pilot) {
    return updateMessage("⚠️ That pilot record no longer exists.");
  }

  if (action === "reject") {
    await updatePilotStatus(pilotId, "suspended");
    return updateMessage(
      `🚫 **${pilot.callsign}** rejected by ${username}. They've been marked suspended.`,
    );
  }

  // approve → activate, then sync their Discord rank role to the effective rank
  await updatePilotStatus(pilotId, "active");
  let rank = pilot.rankLabel;
  if (!rank) {
    const mins = await approvedMinutesForPilot(pilotId);
    rank = rankFromMinutes(mins).current.name;
  }
  await syncRankRole(pilot.discordId, rank);
  return updateMessage(
    `✅ **${pilot.callsign}** approved by ${username} — now active${
      pilot.ifUsername ? ` · IF \`${pilot.ifUsername}\`` : ""
    }.`,
  );
}

function registeredEmbed(
  callsign: string,
  ifc: string,
  status: string,
  reclaimed: boolean,
  updated = false,
) {
  const title = reclaimed
    ? "✦ Welcome back — account linked"
    : updated
      ? "✦ Registration updated"
      : "✦ Registration received";
  const statusLine =
    status === "active"
      ? "**Active** — you're all set. Use `/pirep` to file flights and `/stats` to track your rank."
      : "**Pending** — a staff member will review and accept you shortly. You'll get your hub access once approved.";
  return message("", {
    ephemeral: true,
    embeds: [
      {
        title,
        color: GOLD,
        fields: [
          { name: "Callsign", value: callsign, inline: true },
          { name: "IF username", value: ifc || "—", inline: true },
          { name: "Status", value: statusLine },
        ],
        footer: {
          text: reclaimed
            ? "Your historical hours and rank have been restored."
            : "Welcome to Xiamen Air Virtual — The Egret Way to Fly.",
        },
      },
    ],
  });
}

/* ----------------------------- /pirep ----------------------------- */
async function handlePirep(interaction: Interaction) {
  const user = getInvoker(interaction);
  const flightNo = String(option(interaction, "flight") ?? "").toUpperCase().trim();
  const dep = String(option(interaction, "from") ?? "").toUpperCase().trim();
  const arr = String(option(interaction, "to") ?? "").toUpperCase().trim();
  const aircraft = String(option(interaction, "aircraft") ?? "");
  const hours = Number(option(interaction, "hours") ?? 0);
  const minutes = Number(option(interaction, "minutes") ?? 0);
  const remarks = option(interaction, "remarks")
    ? String(option(interaction, "remarks"))
    : null;

  const total = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);

  if (!flightNo || dep.length < 3 || arr.length < 3) {
    return message("Please provide a flight number and valid ICAO airports.", { ephemeral: true });
  }
  if (!VALID_AIRCRAFT.has(aircraft)) {
    return message(`Unknown aircraft. Choose one of: ${[...VALID_AIRCRAFT].join(", ")}.`, { ephemeral: true });
  }
  if (total <= 0) {
    return message("Flight time must be greater than zero.", { ephemeral: true });
  }

  const multiplierCode = option(interaction, "multiplier")
    ? String(option(interaction, "multiplier")).toUpperCase()
    : null;
  const multiplier = multiplierFor(multiplierCode);
  const credited = Math.round(total * multiplier);

  const pilot = await upsertPilot({
    discordId: user.id,
    callsign: user.username,
    displayName: user.displayName,
    avatar: null,
  });

  const filed = await createPirep({
    pilotId: pilot.id,
    flightNo,
    dep,
    arr,
    aircraft,
    minutes: credited,
    rawMinutes: total,
    multiplier,
    multiplierCode,
    fuelKg: null,
    landingRate: null,
    server: null,
    remarks,
  });

  await announceFiledPirep(filed.id);

  return message("", {
    embeds: [
      {
        title: "✈️ PIREP filed — pending review",
        color: GOLD,
        fields: [
          { name: "Flight", value: flightNo, inline: true },
          { name: "Route", value: `${dep} → ${arr}`, inline: true },
          { name: "Aircraft", value: aircraft, inline: true },
          { name: "Raw time", value: formatDuration(total), inline: true },
          {
            name: "Multiplier",
            value: multiplierCode ? `${multiplierCode} (${multiplier}×)` : "1× (none)",
            inline: true,
          },
          { name: "Credited", value: formatDuration(credited), inline: true },
        ],
        footer: { text: "Approved hours will credit toward your rank." },
      },
    ],
    ephemeral: true,
  });
}

/* ----------------------------- /stats ----------------------------- */
async function handleStats(interaction: Interaction) {
  const userId = option(interaction, "pilot"); // optional USER id (Discord-linked)
  const callsignOpt = option(interaction, "callsign")
    ? String(option(interaction, "callsign")).trim()
    : "";

  let pilot = null;
  if (userId) pilot = await getPilotByDiscordId(String(userId));
  else if (callsignOpt) pilot = await getPilotByCallsign(callsignOpt);
  else pilot = await getPilotByDiscordId(getInvoker(interaction).id);

  if (!pilot) {
    return message(
      userId || callsignOpt
        ? "No pilot found — check the callsign (e.g. `Xiamen Air 042`)."
        : "You're not on the roster yet — use `/register` to join.",
      { ephemeral: true },
    );
  }

  // Public Xiamen Air Virtual stats card (visible to everyone in the channel).
  return message("", { embeds: [await aboutSvEmbed(pilot)] });
}

/* ---------------------------- /aboutme ---------------------------- */
function aboutProgressBar(pct: number): string {
  const f = Math.max(0, Math.min(10, Math.round((pct / 100) * 10)));
  return "▰".repeat(f) + "▱".repeat(10 - f);
}

function aboutComponents(pilotId: number, view: "sv" | "if") {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: view === "sv" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
          label: "Xiamen Air Virtual",
          custom_id: `about:sv:${pilotId}`,
        },
        {
          type: ComponentType.BUTTON,
          style: view === "if" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
          label: "Infinite Flight",
          custom_id: `about:if:${pilotId}`,
        },
      ],
    },
  ];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function aboutSvEmbed(pilot: any) {
  const minutes = await approvedMinutesForPilot(pilot.id);
  const pireps = await listPirepsByPilot(pilot.id);
  const approved = pilot.basePireps + pireps.filter((p) => p.status === "approved").length;
  const pending = pireps.filter((p) => p.status === "pending").length;
  const rp = rankFromMinutes(minutes);
  const fields: any[] = [
    { name: "Rank", value: pilot.rankLabel || rp.current.name, inline: true },
    { name: "Logged hours", value: formatDuration(minutes), inline: true },
    { name: "Approved flights", value: String(approved), inline: true },
  ];
  if (pending > 0) fields.push({ name: "Pending review", value: String(pending), inline: true });
  fields.push({
    name: rp.next ? `Progress to ${rp.next.name}` : "Status",
    value: rp.next
      ? `${aboutProgressBar(rp.pct)}  **${rp.pct}%** · ${rp.hoursToNext!.toFixed(1)} h to go`
      : "Top rank achieved ✦",
  });
  return {
    title: `${pilot.callsign} — Xiamen Air Virtual`,
    color: GOLD,
    fields,
    footer: { text: pilot.displayName },
  };
}

async function aboutIfEmbed(pilot: any) {
  const base = { title: `${pilot.callsign} — Infinite Flight`, color: GOLD };
  if (!pilot.ifUserId || !ifConfigured) {
    return {
      ...base,
      description:
        "No linked Infinite Flight account yet. Use `/register` with an IFC username to connect it.",
    };
  }
  const s = await getUserStats(pilot.ifUserId);
  if (!s) {
    return { ...base, description: "Couldn't load Infinite Flight stats right now — try again shortly." };
  }
  const fields: any[] = [{ name: "IFC", value: pilot.ifUsername ?? "—", inline: true }];
  if (s.grade != null) fields.push({ name: "Grade", value: String(s.grade), inline: true });
  if (s.flightTime != null)
    fields.push({ name: "Flight time", value: formatDuration(Math.round(s.flightTime)), inline: true });
  if (s.onlineFlights != null)
    fields.push({ name: "Online flights", value: s.onlineFlights.toLocaleString(), inline: true });
  if (s.landingCount != null)
    fields.push({ name: "Landings", value: s.landingCount.toLocaleString(), inline: true });
  if (s.violations != null) fields.push({ name: "Violations", value: String(s.violations), inline: true });
  if (s.virtualOrganization) fields.push({ name: "Org", value: s.virtualOrganization, inline: true });
  return { ...base, fields, footer: { text: pilot.displayName } };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function handleAboutMe(interaction: Interaction) {
  const pilot = await getPilotByDiscordId(getInvoker(interaction).id);
  if (!pilot) {
    return message("You're not registered yet — use `/register`.", { ephemeral: true });
  }
  const embed = await aboutSvEmbed(pilot);
  return message("", {
    embeds: [embed],
    components: aboutComponents(pilot.id, "sv"),
    ephemeral: true,
  });
}

/* Toggle the /aboutme card between Xiamen Air Virtual and Infinite Flight stats. */
async function handleAboutButton(interaction: Interaction) {
  const [, view, idStr] = String(interaction.data.custom_id).split(":");
  const pilot = await getPilotById(Number(idStr));
  if (!pilot) return message("That pilot record no longer exists.", { ephemeral: true });
  const v = view === "if" ? "if" : "sv";
  const embed = v === "if" ? await aboutIfEmbed(pilot) : await aboutSvEmbed(pilot);
  return Response.json({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { embeds: [embed], components: aboutComponents(pilot.id, v) },
  });
}

/* ----------------------------- /loa ------------------------------- */
async function handleLoa(interaction: Interaction) {
  const user = getInvoker(interaction);
  const pilot = await getPilotByDiscordId(user.id);
  if (!pilot) {
    return message("You're not registered yet — use `/register` first.", { ephemeral: true });
  }
  const days = Number(option(interaction, "days") ?? 0);
  const reason = String(option(interaction, "reason") ?? "").trim();

  const res = await createLoa(pilot.id, reason, days);
  if (!res.ok) return message(`⚠️ ${res.error}`, { ephemeral: true });

  await notifyLoa({
    loaId: res.loa!.id,
    kind: "apply",
    callsign: pilot.callsign,
    username: pilot.displayName,
    days: res.loa!.days,
    reason: res.loa!.reason,
  }).catch(() => undefined);

  return message("", {
    ephemeral: true,
    embeds: [
      {
        title: "🌙 LOA request submitted — pending review",
        color: GOLD,
        fields: [
          { name: "Length", value: `${res.loa!.days} day${res.loa!.days === 1 ? "" : "s"}`, inline: true },
          { name: "Reason", value: res.loa!.reason },
        ],
        footer: { text: "Staff will review it shortly. Max 1 month." },
      },
    ],
  });
}

async function handleLoaButton(interaction: Interaction) {
  const { id: clickerId, roles, username } = getInvoker(interaction);
  if (!isAdmin(clickerId) && !isStaff(roles)) {
    return message("⛔ Only staff can action LOAs.", { ephemeral: true });
  }
  const [, action, idStr] = String(interaction.data.custom_id).split(":");
  const id = Number(idStr);
  if (!Number.isInteger(id)) return message("Bad action.", { ephemeral: true });

  if (action === "approve") {
    await acceptLoa(id, username);
    return updateMessage(`✅ LOA \`#${id}\` approved by ${username} — now active.`);
  }
  if (action === "reject") {
    await rejectLoa(id, username);
    return updateMessage(`🚫 LOA \`#${id}\` rejected by ${username}.`);
  }
  if (action === "approveExt") {
    const r = await approveLoaExtension(id, username);
    return updateMessage(
      r.ok
        ? `✅ Extension on LOA \`#${id}\` approved by ${username}.`
        : `⚠️ ${r.error}`,
    );
  }
  if (action === "rejectExt") {
    await rejectLoaExtension(id, username);
    return updateMessage(`🚫 Extension on LOA \`#${id}\` rejected by ${username}.`);
  }
  return message("Bad action.", { ephemeral: true });
}

/* ----------------------------- /rank ------------------------------ */
function handleRank() {
  return message("", {
    embeds: [
      {
        title: "Xiamen Air Virtual — Ranks",
        color: GOLD,
        description:
          RANKS.map(
            (r, i) => `**${i + 1}. ${r.name}** — ${r.hours.toLocaleString()} h`,
          ).join("\n") +
          `\n\n**${ACRUX_RANK.name}** — ${ACRUX_RANK.note}`,
      },
    ],
  });
}

/* -------------------------- /leaderboard -------------------------- */
async function handleLeaderboard() {
  const rows = (await leaderboard()).filter((r) => r.flights > 0).slice(0, 10);
  if (rows.length === 0) {
    return message("No approved flights yet — be the first on the board!");
  }
  const medals = ["🥇", "🥈", "🥉"];
  return message("", {
    embeds: [
      {
        title: "🏆 Leaderboard — by approved hours",
        color: GOLD,
        description: rows
          .map(
            (r, i) =>
              `${medals[i] ?? `**${i + 1}.**`} **${r.pilot.callsign}** — ${formatDuration(r.minutes)} · ${r.flights} flights`,
          )
          .join("\n"),
      },
    ],
  });
}

/* ----------------------------- /review ---------------------------- */
async function handleReview(interaction: Interaction) {
  const { roles } = getInvoker(interaction);
  if (!isStaff(roles)) {
    return message("⛔ This command is for staff with the review role.", { ephemeral: true });
  }

  const pending = (await listPireps("pending")).slice(0, 5);
  if (pending.length === 0) {
    return message("✅ Nothing pending — the queue is clear.", { ephemeral: true });
  }

  const names: Record<number, string> = {};
  for (const p of pending) {
    if (!(p.pilotId in names)) {
      const pilot = await getPilotById(p.pilotId);
      names[p.pilotId] = pilot?.callsign ?? `#${p.pilotId}`;
    }
  }

  const content =
    "**Pending PIREPs**\n" +
    pending
      .map(
        (p) =>
          `\`#${p.id}\` ${names[p.pilotId]} · **${p.flightNo}** ${p.dep}→${p.arr} · ${p.aircraft} · ${formatDuration(p.minutes)}`,
      )
      .join("\n");

  const components = pending.map((p) => ({
    type: ComponentType.ACTION_ROW,
    components: [
      { type: ComponentType.BUTTON, style: ButtonStyle.SUCCESS, label: `Approve #${p.id}`, custom_id: `rv:approve:${p.id}` },
      { type: ComponentType.BUTTON, style: ButtonStyle.DANGER, label: `Reject #${p.id}`, custom_id: `rv:reject:${p.id}` },
    ],
  }));

  return message(content, { ephemeral: true, components });
}

async function handleReviewButton(interaction: Interaction) {
  const { roles, username } = getInvoker(interaction);
  if (!isStaff(roles)) {
    return message("⛔ Staff only.", { ephemeral: true });
  }
  const [, action, idStr] = String(interaction.data.custom_id).split(":");
  const id = Number(idStr);
  if (!Number.isInteger(id) || (action !== "approve" && action !== "reject")) {
    return message("Bad action.", { ephemeral: true });
  }
  await updatePirepStatus(id, action === "approve" ? "approved" : "rejected", username);
  await announceReviewedPirep(id);
  return message(
    `${action === "approve" ? "✅ Approved" : "🚫 Rejected"} PIREP \`#${id}\`. Run \`/review\` again to refresh the queue.`,
    { ephemeral: true },
  );
}

/* ---------------------------- /balance ---------------------------- */
/* A pilot's Egret Miles wallet — Strait Points, Logistic Coins, tier,
   licence and rank — pulled straight from the live crew-centre economy. */
async function handleBalance(interaction: Interaction) {
  const pilot = await getPilotByDiscordId(getInvoker(interaction).id);
  if (!pilot) {
    return message("You're not on the roster yet — use `/register` to join.", { ephemeral: true });
  }
  const e = await getPilotEconomy(pilot.id);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fields: any[] = [
    { name: "Strait Points", value: `◆ ${fmtAp(e.apBalance)}`, inline: true },
    { name: "Egret Miles tier", value: e.tier.current.name, inline: true },
    { name: "Licence", value: e.license.current.short, inline: true },
    { name: "Rank", value: e.rank.current.name, inline: true },
    { name: "Logged hours", value: formatDuration(e.totalMinutes), inline: true },
  ];
  if (e.tier.next) {
    fields.push({
      name: `To ${e.tier.next.name}`,
      value: `${fmtAp(e.tier.apToNext!)} AP`,
      inline: true,
    });
  }
  if (e.gates.cargo) {
    fields.push({ name: "Logistic Coins", value: `◈ ${fmtLc(e.lcBalance)}`, inline: true });
    fields.push({ name: "Cargo certification", value: e.cargoCert.name, inline: true });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return message("", {
    ephemeral: true,
    embeds: [
      {
        title: `${pilot.callsign} — Egret Miles wallet`,
        color: GOLD,
        fields,
        footer: {
          text: e.gates.cargo
            ? "Strait Points earned in Career mode · Logistic Coins in Cargo mode."
            : "Strait Points are earned in Career mode. Cargo unlocks at Zenith (300h).",
        },
      },
    ],
  });
}

/* --------------------------- /dispatch ---------------------------- */
/* Egret dispatches the pilot's daily board — Career rotations (AP) or
   Cargo contracts (LC) — with a button to flip between the two. */
type DispatchView = "career" | "cargo";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function dispatchEmbed(pilot: any, view: DispatchView) {
  const e = await getPilotEconomy(pilot.id);

  if (view === "cargo") {
    if (!e.gates.cargo) {
      return {
        embed: {
          title: `${pilot.callsign} — Cargo dispatch`,
          color: GOLD,
          description:
            "🔒 Cargo (Logistics Command) unlocks at **Zenith — 300h** plus a quick staff application. Keep building hours!",
        },
        available: false as const,
      };
    }
    const contracts = getCargoContracts(pilot.id, e.cargoHours, e.lcBalance);
    if (contracts.length === 0) {
      return {
        embed: { title: `${pilot.callsign} — Cargo dispatch`, color: GOLD, description: "No contracts on the board right now — check back tomorrow." },
        available: true as const,
      };
    }
    const cargoBonus = punctualityBonus(e.license.current.short);
    const lines = contracts.map((c) => {
      const late = `min ◈ ${fmtLc(c.lcMin)}`;
      return (
        `**${c.flightNo}** · ${c.dep} → ${c.arr} · ${c.aircraft}\n` +
        `${c.riskLabel} — ${c.scenario}\n` +
        `◈ **${fmtLc(c.lc)} LC** _(+${cargoBonus} on-time · ${late})_ · window ${formatDuration(c.minutes + 120)}`
      );
    });
    return {
      embed: {
        title: `${pilot.callsign} — Cargo dispatch · ${e.cargoCert.name}`,
        color: GOLD,
        description: lines.join("\n\n"),
        footer: { text: "File each flight with /pirep within its window to claim the LC." },
      },
      available: true as const,
    };
  }

  // Career view
  if (!e.gates.career) {
    return {
      embed: {
        title: `${pilot.callsign} — Career dispatch`,
        color: GOLD,
        description:
          "🔒 Career mode unlocks at **Elysian — 75h**. Fly Casual routes and file with `/pirep` to get there.",
      },
      available: false as const,
    };
  }
  const bonus = punctualityBonus(e.license.current.short);
  const board = getDispatches(pilot.id, { authorizedFleet: e.fleet, punctualBonus: bonus });
  if (board.length === 0) {
    return {
      embed: { title: `${pilot.callsign} — Career dispatch`, color: GOLD, description: "No rotations on the board right now — check back tomorrow." },
      available: true as const,
    };
  }
  const lines = board.map((d) => {
    const spot = d.spotlight ? " ✦ spotlight ×2" : "";
    return (
      `**${d.flightNo}** · ${d.dep} → ${d.arr} · ${d.aircraft}\n` +
      `${d.haul}-haul · ${formatDuration(d.minutes)}${spot}\n` +
      `◆ **${fmtAp(d.potentialAp)} AP** _(+${d.punctualBonus} on-time)_ · window ${formatDuration(d.windowMinutes)}`
    );
  });
  return {
    embed: {
      title: `${pilot.callsign} — Career dispatch · ${e.license.current.short} licence`,
      color: GOLD,
      description: lines.join("\n\n"),
      footer: { text: "Filing on time adds the flat on-time bonus. File with /pirep inside each window." },
    },
    available: true as const,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function dispatchComponents(pilotId: number, view: DispatchView) {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: view === "career" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
          label: "Career (AP)",
          custom_id: `disp:career:${pilotId}`,
        },
        {
          type: ComponentType.BUTTON,
          style: view === "cargo" ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
          label: "Cargo (LC)",
          custom_id: `disp:cargo:${pilotId}`,
        },
      ],
    },
  ];
}

async function handleDispatch(interaction: Interaction) {
  const pilot = await getPilotByDiscordId(getInvoker(interaction).id);
  if (!pilot) {
    return message("You're not on the roster yet — use `/register` to join.", { ephemeral: true });
  }
  const modeOpt = option(interaction, "mode") ? String(option(interaction, "mode")) : "career";
  const view: DispatchView = modeOpt === "cargo" ? "cargo" : "career";
  const { embed } = await dispatchEmbed(pilot, view);
  return message("", {
    ephemeral: true,
    embeds: [embed],
    components: dispatchComponents(pilot.id, view),
  });
}

/* Toggle the dispatch board between Career and Cargo in place. */
async function handleDispatchButton(interaction: Interaction) {
  const [, viewRaw, idStr] = String(interaction.data.custom_id).split(":");
  const pilot = await getPilotById(Number(idStr));
  if (!pilot) return message("That pilot record no longer exists.", { ephemeral: true });
  // Only the owner of the ephemeral card can flip it (it's already ephemeral,
  // but this keeps a shared card sane too).
  const view: DispatchView = viewRaw === "cargo" ? "cargo" : "career";
  const { embed } = await dispatchEmbed(pilot, view);
  return Response.json({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { embeds: [embed], components: dispatchComponents(pilot.id, view) },
  });
}

/* ----------------------------- /rotw ------------------------------ */
/* Staff set the Route of the Week (a 1.5× featured sector). Matches the
   given flight number against the mainline network. */
async function handleRotw(interaction: Interaction) {
  const { id: clickerId, roles, username } = getInvoker(interaction);
  if (!isAdmin(clickerId) && !isStaff(roles)) {
    return message("⛔ Only staff can set the Route of the Week.", { ephemeral: true });
  }

  const query = option(interaction, "flight")
    ? String(option(interaction, "flight")).toUpperCase().trim()
    : "";

  // No flight given → show the current ROTW.
  if (!query) {
    const cur = getRotw();
    return message("", {
      ephemeral: true,
      embeds: [
        {
          title: "🌟 Current Route of the Week",
          color: GOLD,
          description: `**${firstFlightNo(cur)}** · ${cur.dep} → ${cur.arr}\n${cur.aircraft} · ${formatDuration(cur.minutes)}`,
          footer: { text: "Run /rotw flight:<number> to change it." },
        },
      ],
    });
  }

  // Match against the outbound flight number or the route pair number.
  const match = rotwOptions().find(
    (r) =>
      firstFlightNo(r).toUpperCase() === query ||
      r.routeNumber.toUpperCase() === query ||
      r.routeNumber.toUpperCase().split("/").includes(query),
  );
  if (!match) {
    return message(
      `Couldn't find a mainline route for \`${query}\`. Use a Xiamen Air flight number, e.g. \`AY1331\`.`,
      { ephemeral: true },
    );
  }

  const ok = setRotw(match.routeNumber);
  if (!ok) {
    return message("Couldn't set that route — try another flight number.", { ephemeral: true });
  }

  return message("", {
    embeds: [
      {
        title: "🌟 Route of the Week updated",
        color: GOLD,
        description: `**${firstFlightNo(match)}** · ${match.dep} → ${match.arr}\n${match.aircraft} · ${formatDuration(match.minutes)}`,
        footer: { text: `Set by ${username} · earns a 1.5× multiplier this week.` },
      },
    ],
  });
}
