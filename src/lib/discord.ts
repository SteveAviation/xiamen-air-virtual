import { createPublicKey, verify as edVerify } from "node:crypto";

/* ----------------------------------------------------------------
   Discord HTTP-interactions helpers.

   The bot runs as an "Interactions Endpoint" on this same Vercel
   deployment — Discord POSTs slash-command / button events to
   /api/discord/interactions, we verify the Ed25519 signature with the
   app's public key, then respond inline. No always-on gateway process.

   Env needed (set in Vercel to activate):
     DISCORD_PUBLIC_KEY    — app public key (signature verification)
     DISCORD_STAFF_ROLE_ID — role allowed to use /review
     DATABASE_URL          — shared with the website (Neon)
   Plus, to register commands locally (scripts/register-commands.mjs):
     DISCORD_APP_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
------------------------------------------------------------------- */

export const botConfigured = !!process.env.DISCORD_PUBLIC_KEY;

const DISCORD_API = "https://discord.com/api/v10";

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  UPDATE_MESSAGE: 7,
  MODAL: 9,
} as const;

export const MessageFlags = { EPHEMERAL: 64 } as const;
export const ComponentType = { ACTION_ROW: 1, BUTTON: 2 } as const;
export const ButtonStyle = { PRIMARY: 1, SECONDARY: 2, SUCCESS: 3, DANGER: 4, LINK: 5 } as const;

export const GOLD = 0x98694c;

/* The owner/admin who gets pinged about new registrations. Overridable via
   DISCORD_ADMIN_USER_ID; defaults to the configured owner ID. */
const ADMIN_USER_ID = process.env.DISCORD_ADMIN_USER_ID || "1148955476453761185";

/* Channel where new-registration pings are posted. Overridable via
   DISCORD_REGISTER_CHANNEL_ID. */
const REGISTER_CHANNEL_ID =
  process.env.DISCORD_REGISTER_CHANNEL_ID || "1511683594354167838";

/* Channel where reports are posted. Falls back to the register/staff channel. */
const REPORT_CHANNEL_ID =
  process.env.DISCORD_REPORT_CHANNEL_ID || REGISTER_CHANNEL_ID;

export function isAdmin(userId: string): boolean {
  return !!userId && userId === ADMIN_USER_ID;
}

/* Absolute site origin for link buttons — from SITE_URL, else derived from the
   Discord OAuth redirect URI, else null (button is omitted). */
function siteUrl(): string | null {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const r = process.env.DISCORD_REDIRECT_URI;
  if (r) {
    try {
      return new URL(r).origin;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/* Verify an interaction request signature (Ed25519). Returns false on
   any error so the route can answer 401 — which Discord requires. */
const DER_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([DER_PREFIX, Buffer.from(publicKey, "hex")]),
      format: "der",
      type: "spki",
    });
    return edVerify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

/* ---- typed shapes (loose — Discord payloads are large) ---- */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Interaction = any;

export function getInvoker(interaction: Interaction): {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  roles: string[];
} {
  const user = interaction.member?.user ?? interaction.user ?? {};
  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;
  return {
    id: user.id ?? "",
    username: user.username ?? "pilot",
    displayName: user.global_name || user.username || "pilot",
    avatar,
    roles: interaction.member?.roles ?? [],
  };
}

export function option(interaction: Interaction, name: string): any {
  return interaction.data?.options?.find((o: any) => o.name === name)?.value;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function isStaff(roles: string[]): boolean {
  const staffRole = process.env.DISCORD_STAFF_ROLE_ID;
  return !!staffRole && roles.includes(staffRole);
}

/* ---- response builders ---- */
type Embed = Record<string, unknown>;

export function message(
  content: string,
  opts: { ephemeral?: boolean; embeds?: Embed[]; components?: unknown[] } = {},
) {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content || undefined,
      embeds: opts.embeds,
      components: opts.components,
      flags: opts.ephemeral ? MessageFlags.EPHEMERAL : undefined,
    },
  });
}

/* ---- rank → Discord role sync ----
   On promotion in the Crew Center, swap the pilot's Discord rank role:
   removes every other mapped rank role and adds the new one.

   Needs (in the server env): DISCORD_BOT_TOKEN (bot with Manage Roles, and its
   role positioned ABOVE the rank roles), DISCORD_GUILD_ID, and
   DISCORD_RANK_ROLES = a JSON map of rank name → role ID, e.g.
   {"Horizon":"123...","Polaris":"456...","Egret":"789..."}. */
export type RankSyncResult = { configured: boolean; ok?: boolean; reason?: string };

function rankRoleMap(): Record<string, string> {
  try {
    return JSON.parse(process.env.DISCORD_RANK_ROLES || "{}");
  } catch {
    return {};
  }
}

export async function syncRankRole(
  discordId: string,
  newRankName: string,
): Promise<RankSyncResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  const map = rankRoleMap();

  if (!token || !guild || Object.keys(map).length === 0) {
    return { configured: false };
  }
  // Unlinked imported members have no real Discord account to update.
  if (!discordId || discordId.startsWith("import:")) {
    return { configured: true, ok: false, reason: "Pilot has no linked Discord account." };
  }

  const newRoleId = map[newRankName];
  const auth = { Authorization: `Bot ${token}` };
  const base = `${DISCORD_API}/guilds/${guild}/members/${discordId}/roles`;

  try {
    // Remove every other mapped rank role so only one rank role remains.
    for (const [name, roleId] of Object.entries(map)) {
      if (roleId && roleId !== newRoleId && name !== newRankName) {
        await fetch(`${base}/${roleId}`, { method: "DELETE", headers: auth });
      }
    }
    if (newRoleId) {
      const res = await fetch(`${base}/${newRoleId}`, { method: "PUT", headers: auth });
      if (!res.ok) return { configured: true, ok: false, reason: `Discord ${res.status}` };
    } else {
      return { configured: true, ok: false, reason: `No role mapped for ${newRankName}` };
    }
    return { configured: true, ok: true };
  } catch {
    return { configured: true, ok: false, reason: "Discord request failed" };
  }
}

/* ---- LOA staff ping ----
   Posts a leave-of-absence application / extension request to the staff channel
   with Approve / Reject buttons. Needs DISCORD_BOT_TOKEN. */
export type LoaNotice = {
  loaId: number;
  kind: "apply" | "extend";
  callsign: string;
  username: string;
  days: number;
  reason: string;
};

export async function notifyLoa(n: LoaNotice): Promise<{ ok: boolean }> {
  const isExt = n.kind === "extend";

  // Simple webhook path (no bot token needed) — posts an embed to the LOA
  // channel. Set DISCORD_LOA_WEBHOOK to enable. Approve/Reject still happen in
  // the Crew Center.
  const webhook = process.env.DISCORD_LOA_WEBHOOK;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Xiamen Air Virtual · LOA",
          embeds: [
            {
              title: isExt ? "🌙 LOA · extension request" : "🌙 LOA · application",
              color: GOLD,
              fields: [
                { name: "Pilot", value: `${n.callsign} · ${n.username}`, inline: true },
                { name: isExt ? "Extra days" : "Length", value: `${n.days} day${n.days === 1 ? "" : "s"}`, inline: true },
                { name: "Reason", value: n.reason || "—" },
              ],
              footer: { text: "Xiamen Air Virtual · review in the Crew Center" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !REGISTER_CHANNEL_ID) return { ok: false };
  const headers = { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
  const buttons = [
    {
      type: ComponentType.BUTTON,
      style: ButtonStyle.SUCCESS,
      label: isExt ? "Approve extension" : "Approve",
      custom_id: `loa:${isExt ? "approveExt" : "approve"}:${n.loaId}`,
    },
    {
      type: ComponentType.BUTTON,
      style: ButtonStyle.DANGER,
      label: "Reject",
      custom_id: `loa:${isExt ? "rejectExt" : "reject"}:${n.loaId}`,
    },
  ];
  try {
    const dm = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({ recipient_id: ADMIN_USER_ID }),
    }).catch(() => null);
    void dm;
    const res = await fetch(`${DISCORD_API}/channels/${REGISTER_CHANNEL_ID}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: `<@${ADMIN_USER_ID}> — ${isExt ? "LOA extension request" : "new LOA application"}`,
        embeds: [
          {
            title: isExt ? "LOA · extension request" : "LOA · application",
            color: GOLD,
            fields: [
              { name: "Pilot", value: `${n.callsign} · ${n.username}`, inline: true },
              { name: isExt ? "Extra days" : "Length", value: `${n.days} day${n.days === 1 ? "" : "s"}`, inline: true },
              { name: "Reason", value: n.reason || "—" },
            ],
            footer: { text: "Approve / Reject below, or use the Crew Center." },
          },
        ],
        components: [{ type: ComponentType.ACTION_ROW, components: buttons }],
        allowed_mentions: { parse: ["users"] },
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/* ---- Report staff ping ----
   Posts a bug / player / staff report to the staff channel. Needs DISCORD_BOT_TOKEN. */
export type ReportNotice = {
  reportId: number;
  category: string; // bug | player | staff | other
  target: string | null;
  message: string;
  reporterName: string;
};

export async function notifyReport(n: ReportNotice): Promise<{ ok: boolean }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !REPORT_CHANNEL_ID) return { ok: false };
  const headers = { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
  const labels: Record<string, string> = {
    bug: "🐞 Bug report",
    player: "🚩 Player report",
    staff: "🛡️ Staff report",
    other: "📝 Report",
  };
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Type", value: labels[n.category] ?? labels.other, inline: true },
    { name: "From", value: n.reporterName || "Anonymous", inline: true },
  ];
  if (n.target) fields.push({ name: "Reported", value: n.target, inline: true });
  fields.push({ name: "Details", value: n.message.slice(0, 1000) || "—" });
  try {
    const res = await fetch(`${DISCORD_API}/channels/${REPORT_CHANNEL_ID}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: `<@${ADMIN_USER_ID}> — new report \`#${n.reportId}\``,
        embeds: [
          {
            title: `${labels[n.category] ?? labels.other} · #${n.reportId}`,
            color: GOLD,
            fields,
            footer: { text: "Review it in the Crew Center → Reports." },
          },
        ],
        allowed_mentions: { parse: ["users"] },
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export function updateMessage(content: string, opts: { embeds?: Embed[] } = {}) {
  return Response.json({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { content, embeds: opts.embeds, components: [] },
  });
}

/* Most recent Discord server join (epoch ms), used as the "new applications"
   cutoff. Needs DISCORD_BOT_TOKEN + DISCORD_GUILD_ID and the Server Members
   privileged intent; returns null otherwise (caller falls back). */
export async function getLatestGuildJoin(): Promise<number | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild) return null;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guild}/members?limit=1000`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return null;
    const members = await res.json();
    if (!Array.isArray(members)) return null;
    let max = 0;
    for (const m of members) {
      const t = m?.joined_at ? Date.parse(m.joined_at) : 0;
      if (t > max) max = t;
    }
    return max || null;
  } catch {
    return null;
  }
}

/* ---- PIREP log channel ----
   Every filed PIREP is posted to DISCORD_PIREP_CHANNEL_ID; the message is then
   edited in place when the PIREP is approved/rejected. No pings — info only. */
const PIREP_CHANNEL_ID =
  process.env.DISCORD_PIREP_CHANNEL_ID || "1165390872632901712";

export type PirepLogInfo = {
  username: string;
  callsign: string;
  dep: string;
  arr: string;
  minutes: number;
};

function pirepEmbed(info: PirepLogInfo, status: "pending" | "approved" | "rejected") {
  const h = Math.floor(info.minutes / 60);
  const m = info.minutes % 60;
  const meta =
    status === "approved"
      ? { color: 0x2ecc71, label: "✅ Approved" }
      : status === "rejected"
        ? { color: 0xe74c3c, label: "🚫 Rejected" }
        : { color: GOLD, label: "🕓 Pending review" };
  return {
    title: `✈️ PIREP — ${info.callsign}`,
    color: meta.color,
    fields: [
      { name: "Pilot", value: info.username || "—", inline: true },
      { name: "Callsign", value: info.callsign || "—", inline: true },
      { name: "Route", value: `${info.dep || "—"} → ${info.arr || "—"}`, inline: true },
      { name: "Flight time", value: `${h}h ${m}m`, inline: true },
      { name: "Status", value: meta.label, inline: true },
    ],
  };
}

/* Post a newly-filed PIREP to the log channel. Returns the message id (to edit
   later), or null if not configured. Never pings. */
export async function postPirepLog(info: PirepLogInfo): Promise<string | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !PIREP_CHANNEL_ID) return null;
  try {
    const res = await fetch(`${DISCORD_API}/channels/${PIREP_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [pirepEmbed(info, "pending")],
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) return null;
    const msg = await res.json();
    return msg.id ?? null;
  } catch {
    return null;
  }
}

/* Edit an existing PIREP log message to reflect a new status. */
export async function editPirepLog(
  msgId: string,
  info: PirepLogInfo,
  status: "pending" | "approved" | "rejected",
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !PIREP_CHANNEL_ID) return false;
  try {
    const res = await fetch(
      `${DISCORD_API}/channels/${PIREP_CHANNEL_ID}/messages/${msgId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [pirepEmbed(info, status)],
          allowed_mentions: { parse: [] },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ---- new-registration ping ----
   Posts to the registration channel when a pilot uses /register — pinging the
   admin and showing the full registrant info with Approve / Reject buttons (and
   an Open-Crew-Center link). Needs DISCORD_BOT_TOKEN; stays dormant otherwise. */
export type RegisterNotice = {
  pilotId: number;
  registrantId: string; // the Discord user who registered
  username: string;
  callsign: string;
  ifUsername: string | null;
  ifGrade: number | null;
  ifMinutes: number | null;
  reclaimed: boolean; // matched an existing roster member
  status: string; // pending | active
};

export async function notifyNewRegistration(
  n: RegisterNotice,
): Promise<{ ok: boolean; reason?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, reason: "no bot token" };
  if (!REGISTER_CHANNEL_ID) return { ok: false, reason: "no channel" };
  const headers = { Authorization: `Bot ${token}`, "Content-Type": "application/json" };

  try {
    const ifLine = n.ifUsername
      ? `\`${n.ifUsername}\`` +
        (n.ifGrade ? ` · Grade ${n.ifGrade}` : "") +
        (n.ifMinutes != null ? ` · ${Math.floor(n.ifMinutes / 60)}h ${n.ifMinutes % 60}m` : "")
      : "— (not provided)";

    const actionNote =
      n.status === "active"
        ? n.reclaimed
          ? "Already linked to their existing record (hours restored) and **active**. Reject to suspend."
          : "Already **active**. Reject to suspend."
        : "**Approve** to activate them under this callsign, or **Reject**. Use *Open Crew Center* to link them to a different callsign or edit details.";

    const buttons: Record<string, unknown>[] = [
      { type: ComponentType.BUTTON, style: ButtonStyle.SUCCESS, label: "Approve", custom_id: `reg:approve:${n.pilotId}` },
      { type: ComponentType.BUTTON, style: ButtonStyle.DANGER, label: "Reject", custom_id: `reg:reject:${n.pilotId}` },
    ];
    const origin = siteUrl();
    if (origin) {
      buttons.push({
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        label: "Open Crew Center",
        url: `${origin}/crew/pilots`,
      });
    }

    const body = {
      content: `<@${ADMIN_USER_ID}> — new pilot registration ✦`,
      embeds: [
        {
          title: n.reclaimed ? "Registration · returning member" : "Registration · new pilot",
          color: GOLD,
          fields: [
            { name: "Pilot", value: `<@${n.registrantId}> · ${n.username}\nID: \`${n.registrantId}\``, inline: false },
            { name: "Callsign", value: n.callsign || "—", inline: true },
            { name: "Status", value: n.status === "active" ? "Active" : "Pending", inline: true },
            { name: "Infinite Flight", value: ifLine, inline: false },
            { name: "Action", value: actionNote, inline: false },
          ],
          footer: { text: "Xiamen Air Virtual · registration" },
        },
      ],
      components: [{ type: ComponentType.ACTION_ROW, components: buttons }],
    };

    const msgRes = await fetch(`${DISCORD_API}/channels/${REGISTER_CHANNEL_ID}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!msgRes.ok) return { ok: false, reason: `channel send ${msgRes.status}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "request failed" };
  }
}
