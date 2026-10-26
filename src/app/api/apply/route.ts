/* Pilot / Staff application intake → Discord webhooks.
   Applications are routed to separate Discord channels by type:
     • DISCORD_PILOT_WEBHOOK  → #pilot-applications
     • DISCORD_STAFF_WEBHOOK  → #staff-applications
   DISCORD_APPLY_WEBHOOK is used as a fallback for either type if a
   type-specific webhook isn't set. Without any webhook the form still
   accepts submissions (delivered: false). */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Field = { label: string; value: string };

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type === "staff" ? "staff" : "pilot";
  const fields = Array.isArray(body.fields) ? (body.fields as Field[]) : [];

  // Basic validation: require IFC + Discord + a reason.
  const get = (label: string) =>
    (fields.find((f) => f.label.toLowerCase().includes(label))?.value ?? "").trim();
  if (!get("ifc")) return Response.json({ error: "Your IFC username is required." }, { status: 400 });
  if (!get("discord")) return Response.json({ error: "Your Discord username is required." }, { status: 400 });
  if (get("why").length < 10) return Response.json({ error: "Please tell us a little more about why you'd like to join." }, { status: 400 });

  // Route to the channel-specific webhook, falling back to the shared one.
  const fallback = process.env.DISCORD_APPLY_WEBHOOK;
  const webhook =
    (type === "staff" ? process.env.DISCORD_STAFF_WEBHOOK : process.env.DISCORD_PILOT_WEBHOOK) || fallback;
  let delivered = false;
  if (webhook) {
    const embed = {
      title: type === "staff" ? "🛠️ New Staff Application" : "✈️ New Pilot Application",
      color: type === "staff" ? 0x7c1791 : 0x0c0243,
      fields: fields
        .filter((f) => f.value && f.value.trim())
        .slice(0, 25)
        .map((f) => ({ name: f.label, value: f.value.slice(0, 1024), inline: f.value.length < 40 })),
      footer: { text: "Xiamen Air Virtual · applications" },
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Xiamen Air Virtual Recruitment", embeds: [embed] }),
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
  }

  return Response.json({ ok: true, delivered });
}
