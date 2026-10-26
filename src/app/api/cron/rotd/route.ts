import { hasCrewAccess } from "@/lib/auth";
import { hydrateOps, getRotd, firstFlightNo, ROTD_MULTIPLIER } from "@/lib/ops";
import { createNews } from "@/lib/db";
import { airportCity } from "@/lib/airports";
import { fmtHours } from "@/lib/portal";

export const dynamic = "force-dynamic";

/* Posts the day's Route of the Day to the Discord webhook (route-of-the-day
   channel) and publishes it to the site news feed. Triggered by the Vercel
   cron at 0000Z, by a matching CRON_SECRET, or manually by staff. */
async function postRotd() {
  await hydrateOps();
  const legs = getRotd();
  const lines = legs.map(
    (l) => `**${firstFlightNo(l.route)}** · ${airportCity(l.route.dep)} → ${airportCity(l.route.arr)} · ${l.haul}-haul · ${fmtHours(l.route.minutes)} · ${l.route.aircraft}`,
  );
  const body = lines.join("\n");

  const webhook = process.env.DISCORD_ROTD_WEBHOOK;
  let posted = false;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🗺️ Route of the Day",
              description: body,
              color: 0x0b1560,
              footer: { text: `${ROTD_MULTIPLIER}× flight-time multiplier · resets 0000Z` },
            },
          ],
        }),
      });
      posted = res.ok;
    } catch {
      posted = false;
    }
  }

  // Publish to the on-site news feed under the Route of the Day category.
  await createNews({
    title: "Route of the Day",
    body,
    category: "Route of the Day",
    imageUrl: null,
    author: "Operations",
  }).catch(() => {});

  return { posted, legs: legs.length, webhookConfigured: !!webhook };
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") != null;
  const secretOk = !!secret && auth === `Bearer ${secret}`;
  const staff = await hasCrewAccess().catch(() => false);
  if (!isVercelCron && !secretOk && !staff) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await postRotd();
  return Response.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
