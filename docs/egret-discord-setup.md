# Egret — Xiamen Air Virtual's Discord bot

Egret runs as a **serverless HTTP-interactions bot** — there is no gateway
process to keep alive. Discord POSTs every slash command to one endpoint on the
Vercel deployment, which verifies the signature and replies. This is why the bot
"just works" once the env vars are set: it's part of the website, not a separate
server you have to host.

**Interactions endpoint:** `https://<your-domain>/api/discord/interactions`

---

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/register callsign ifc` | pilots | Join the roster (links Discord + IFC; staff approve via a DM ping) |
| `/pirep flight from to aircraft hours [minutes] [multiplier] [remarks]` | pilots | **File a PIREP straight from Discord** → lands in the review queue |
| `/balance` | pilots | Strait Points, Logistic Coins, Egret Miles tier, licence & rank |
| `/dispatch [mode]` | pilots | **Egret dispatches** the daily board — Career (AP) or Cargo (LC), with a button to flip between them |
| `/stats [callsign\|pilot]` | anyone | Public stats card for any pilot |
| `/aboutme` | pilots | Your own XAV + Infinite Flight stats (toggle) |
| `/loa days reason` | pilots | Request a Leave of Absence |
| `/rank` | anyone | The rank ladder |
| `/leaderboard` | anyone | Top pilots by approved hours |
| `/review` | **staff** | **Validate PIREPs** — approve/reject buttons on the pending queue |
| `/rotw [flight]` | **staff** | **Set / view the Route of the Week** (1.5× featured sector) |

`/balance` and `/dispatch` read the **same live economy as the web crew centre**
(`getPilotEconomy` → the exact AP/LC/tier maths the dashboard uses), so a pilot's
Discord numbers always match their portal.

---

## One-time setup in the Discord Developer Portal

### 1. Create the application
1. Go to <https://discord.com/developers/applications> → **New Application** → name it **Egret**.
2. On **General Information**, copy the **Application ID** and **Public Key** — you'll need both.

### 2. Add the bot user
1. Left sidebar → **Bot** → the bot is created automatically.
2. **Reset Token** → copy the **Bot Token** (shown once — store it safely).
3. Under **Privileged Gateway Intents** you can leave everything **off** — an HTTP-interactions bot doesn't use gateway intents.
4. Set the bot's avatar to the Xiamen Air Virtual emblem (`public/brand/xav-emblem.png`).

### 3. Point Discord at the endpoint
1. Left sidebar → **General Information** → **Interactions Endpoint URL**:
   ```
   https://<your-domain>/api/discord/interactions
   ```
2. Click **Save**. Discord sends a signed PING; the endpoint verifies it with
   your Public Key and replies PONG. Save only succeeds once
   `DISCORD_PUBLIC_KEY` is set on Vercel (see step 5) and deployed — so **do
   step 5 first**, then come back and save this.

### 4. Invite Egret to the server
1. Left sidebar → **OAuth2** → **URL Generator**.
2. Scopes: **`applications.commands`** and **`bot`**.
3. Bot permissions: **Send Messages**, **Embed Links**, and **Manage Roles**
   (Manage Roles lets Egret sync rank roles on approval — omit it if you don't
   use rank roles).
4. Open the generated URL, pick your server, authorise.
5. **Important:** for Egret to assign rank roles, drag the **Egret role above
   the rank roles** in Server Settings → Roles (a bot can only manage roles
   below its own).

### 5. Set the environment variables (Vercel)
Add these under the XAV project → **Settings → Environment Variables** (Production),
then redeploy. CLI equivalents:

```bash
npx vercel env add DISCORD_PUBLIC_KEY production     # from step 1
npx vercel env add DISCORD_BOT_TOKEN production       # from step 2
npx vercel env add DISCORD_GUILD_ID production        # your server ID (right-click server → Copy Server ID)
npx vercel env add DISCORD_STAFF_ROLE_ID production   # role allowed to use /review and /rotw
npx vercel env add DISCORD_ADMIN_USER_ID production   # your user ID (gets registration/LOA DM pings)
```

Required for the bot: `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`.
Recommended: `DISCORD_GUILD_ID`, `DISCORD_STAFF_ROLE_ID`, `DISCORD_ADMIN_USER_ID`.

Optional extras:
| Var | Purpose |
| --- | --- |
| `DISCORD_RANK_ROLES` | JSON map of rank name → role ID, e.g. `{"Horizon":"123...","Elysian":"456..."}` — Egret assigns these on approval |
| `DISCORD_REGISTER_CHANNEL_ID` | Channel to log new registrations |
| `DISCORD_PIREP_CHANNEL_ID` | Channel to log filed/reviewed PIREPs |
| `DISCORD_REPORT_CHANNEL_ID` | Channel for reports |
| `DISCORD_LOA_WEBHOOK` | Webhook URL to post LOA requests with approve/reject buttons |

> Note: the **Application ID** (step 1) is the same value as `DISCORD_CLIENT_ID`.
> If you also enable **web login** (Discord OAuth for the crew centre) you'll set
> `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` and
> `SESSION_SECRET` as well — that's separate from the bot and not required for
> Egret's slash commands to work.

### 6. Register the slash commands
Run once from the project root (and again any time commands change). Use the
**Application ID** as `DISCORD_APP_ID`:

```bash
DISCORD_APP_ID=<application id> \
DISCORD_BOT_TOKEN=<bot token> \
DISCORD_GUILD_ID=<server id> \
node scripts/register-commands.mjs
```

Guild registration (with `DISCORD_GUILD_ID`) appears **instantly** in that
server. Omit the guild ID to register globally (can take up to ~1 hour). You
should see:

```
✓ Registered 11 commands to guild <id>: /register /pirep /balance /dispatch /stats /aboutme /loa /rank /leaderboard /review /rotw
```

### 7. Test
In your server: `/balance` (as a registered pilot), `/dispatch` (flip Career ↔
Cargo), `/pirep …` to file, then `/review` as staff to approve it. `/rotw` with
no argument shows the current Route of the Week; `/rotw flight:MF8101` sets it.

---

## How the pieces map to the code
- **Endpoint + command handlers:** `src/app/api/discord/interactions/route.ts`
- **Bot helpers (verify, embeds, notifications, rank roles):** `src/lib/discord.ts`
- **Economy read model shared with the web dashboard:** `src/lib/portal.ts` → `getPilotEconomy()`
- **Dispatch + cargo + ROTW generation:** `src/lib/ops.ts`
- **Command registration:** `scripts/register-commands.mjs`
