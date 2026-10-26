/* ----------------------------------------------------------------
   Registers Xiamen Air Virtual's Discord slash commands for "Egret".

   Run ONCE (and again whenever commands change) from the project root:

     DISCORD_APP_ID=...        \
     DISCORD_BOT_TOKEN=...      \
     DISCORD_GUILD_ID=...       \
     node scripts/register-commands.mjs

   Guild commands register instantly. Omit DISCORD_GUILD_ID to register
   them globally instead (can take up to ~1 hour to appear).
------------------------------------------------------------------- */

const APP_ID = process.env.DISCORD_APP_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID || !TOKEN) {
  console.error("Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN env vars.");
  process.exit(1);
}

// Option types: 3 = STRING, 4 = INTEGER, 6 = USER
const commands = [
  {
    name: "register",
    description: "Register yourself as a Xiamen Air Virtual pilot",
    options: [
      {
        name: "callsign",
        description: "Your Xiamen Air callsign, e.g. Xiamen Air 042",
        type: 3,
        required: true,
      },
      {
        name: "ifc",
        description: "Your Infinite Flight Community username",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "pirep",
    description: "File a pilot report for a completed flight",
    options: [
      { name: "flight", description: "Flight number, e.g. AY1331", type: 3, required: true },
      { name: "from", description: "Departure ICAO, e.g. ZSAM", type: 3, required: true },
      { name: "to", description: "Arrival ICAO, e.g. RJTT", type: 3, required: true },
      {
        name: "aircraft",
        description: "Aircraft type (Xiamen Air fleet — file codeshares on the web crew centre)",
        type: 3,
        required: true,
        // Xiamen Air fileable fleet (kept in sync with src/lib/aircraft.ts →
        // XIAMEN AIR_AIRCRAFT). Codeshare-partner types are added at runtime and
        // are filed via the web crew centre's PIREP form.
        choices: [
          { name: "Airbus A350-900", value: "A350-900" },
          { name: "Airbus A330-300", value: "A330-300" },
          { name: "Airbus A321", value: "A321" },
          { name: "Airbus A320", value: "A320" },
          { name: "Embraer 190", value: "Embraer 190" },
        ],
      },
      { name: "hours", description: "Flight time — hours", type: 4, required: true, min_value: 0, max_value: 20 },
      { name: "minutes", description: "Flight time — minutes", type: 4, required: false, min_value: 0, max_value: 59 },
      {
        name: "multiplier",
        description: "Event multiplier code (optional)",
        type: 3,
        required: false,
        // Kept in sync with src/lib/data.ts → MULTIPLIERS. Max 25 choices.
        choices: [
          { name: "Vega Program — 1.3x", value: "VEGA" },
          { name: "ROTW — 1.5x", value: "ROTW" },
          { name: "IF48 — 1.5x", value: "IF48" },
          { name: "Lyra Program — 1.6x", value: "LYRA" },
          { name: "XMNEVENT2X — 2x", value: "XMNEVENT2X" },
          { name: "GTR 1st Place — 2x", value: "GTR1ST" },
          { name: "POTM 3rd — 2.5x", value: "POTM3RD" },
          { name: "XMNEVENT3X — 3x", value: "XMNEVENT3X" },
          { name: "POTM 2nd — 3x", value: "POTM2ND" },
          { name: "NEW YEAR 2026 — 3x", value: "NEWYEAR2026" },
          { name: "POTM 1st — 4x", value: "POTM1ST" },
          { name: "XMNEVENT5X — 5x", value: "XMNEVENT5X" },
          { name: "Event — 5x", value: "EVENT" },
        ],
      },
      { name: "remarks", description: "Optional remarks", type: 3, required: false },
    ],
  },
  {
    name: "balance",
    description: "Show your Egret Miles wallet — Aurora Points, Logistic Coins, tier & rank",
  },
  {
    name: "dispatch",
    description: "Egret dispatches your daily flights — Career (AP) or Cargo (LC)",
    options: [
      {
        name: "mode",
        description: "Which board to open first (default: Career)",
        type: 3,
        required: false,
        choices: [
          { name: "Career — Aurora Points", value: "career" },
          { name: "Cargo — Logistic Coins", value: "cargo" },
        ],
      },
    ],
  },
  {
    name: "stats",
    description: "View any pilot's Xiamen Air Virtual stats (shown publicly)",
    options: [
      { name: "callsign", description: "Pilot callsign, e.g. Xiamen Air 042", type: 3, required: false },
      { name: "pilot", description: "Or pick a Discord-linked pilot", type: 6, required: false },
    ],
  },
  {
    name: "aboutme",
    description: "View your own Xiamen Air Virtual + Infinite Flight stats",
  },
  {
    name: "loa",
    description: "Apply for a Leave of Absence (max 1 month)",
    options: [
      { name: "days", description: "Length in days (1–31)", type: 4, required: true, min_value: 1, max_value: 31 },
      { name: "reason", description: "Why you need the leave", type: 3, required: true },
    ],
  },
  { name: "rank", description: "View the Xiamen Air Virtual rank ladder" },
  { name: "leaderboard", description: "Top pilots by approved hours" },
  { name: "review", description: "Staff: review pending PIREPs" },
  {
    name: "rotw",
    description: "Staff: set (or view) the Route of the Week",
    options: [
      { name: "flight", description: "Xiamen Air flight number to feature, e.g. AY1331 (omit to view current)", type: 3, required: false },
    ],
  },
];

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (res.ok) {
  const data = await res.json();
  console.log(
    `✓ Registered ${data.length} commands ${GUILD_ID ? `to guild ${GUILD_ID}` : "globally"}:`,
    data.map((c) => `/${c.name}`).join(" "),
  );
} else {
  console.error(`✗ Failed (${res.status}):`, await res.text());
  process.exit(1);
}
