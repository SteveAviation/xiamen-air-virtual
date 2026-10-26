/* Egret chat endpoint → Anthropic Messages API.
   Set ANTHROPIC_API_KEY to enable Egret. The big system prompt (persona +
   knowledge base) is sent with prompt caching, so repeat turns are cheap. */

import { buildEgretSystem, EGRET_MODEL, EGRET_MAX_TOKENS, HANDOFF_LINE } from "@/lib/egret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMsg = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 12; // keep history bounded
const MAX_CHARS = 1500; // per message

export async function POST(request: Request) {
  let body: { messages?: ChatMsg[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "A user message is required." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful fallback so the widget still works before the key is configured.
    return Response.json({
      reply: `Egret isn't connected just yet — our team is still setting things up. ${HANDOFF_LINE}`,
      configured: false,
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: EGRET_MODEL,
        max_tokens: EGRET_MAX_TOKENS,
        system: [
          {
            type: "text",
            text: buildEgretSystem(),
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Egret upstream error", res.status, detail.slice(0, 500));
      return Response.json(
        { reply: `Sorry — I hit a snag answering that. ${HANDOFF_LINE}`, configured: true },
        { status: 200 },
      );
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const reply = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();

    return Response.json({ reply: reply || HANDOFF_LINE, configured: true });
  } catch (err) {
    console.error("Egret request failed", err);
    return Response.json(
      { reply: `Sorry — I couldn't reach my brain just now. ${HANDOFF_LINE}`, configured: true },
      { status: 200 },
    );
  }
}
