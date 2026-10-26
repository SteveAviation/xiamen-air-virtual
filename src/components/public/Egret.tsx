"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi, I'm **Egret** — your Xiamen Air Virtual co-pilot. Ask me about ranks, Strait Points, the fleet, our route network, or how to join. How can I help?";

const HANDOFF =
  "No problem — our staff are happy to help directly. Reach out to us on the Infinite Flight Community and we'll get back to you.\n\nOr [apply to join](/join) and we'll DM you on the IFC.";

/* Render a tiny subset of markdown: **bold** and [label](url), line by line
   with simple "- " bullets. Enough for Egret's short, structured replies. */
function inline(text: string, keyBase: string) {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-cream">{m[1]}</strong>);
    } else {
      const href = m[3];
      const external = /^https?:/.test(href);
      nodes.push(
        <a key={`${keyBase}-a${i}`} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="font-medium text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold">
          {m[2]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Rendered({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        if (/^[-•]\s+/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-soft" />
              <span>{inline(line.replace(/^[-•]\s+/, ""), `l${i}`)}</span>
            </div>
          );
        }
        return <p key={i}>{inline(line, `l${i}`)}</p>;
      })}
    </div>
  );
}

export function Egret() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/egret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.content !== GREETING && m.content !== HANDOFF) }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: `Sorry — I couldn't reach the network just now. ${HANDOFF}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Egret assistant" : "Open Egret assistant"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gold shadow-lg shadow-fin-blue/20 ring-1 ring-white/20 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <Image src="/brand/egret-avatar.png" alt="Egret" width={56} height={56} className="h-full w-full rounded-full object-cover" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] max-h-[calc(100vh-7rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-obsidian bg-ink-950 shadow-2xl shadow-fin-blue/20">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-obsidian bg-ink-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Image src="/brand/egret-avatar.png" alt="" width={40} height={40} className="h-9 w-9 rounded-full object-cover ring-1 ring-gold/40" />
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold text-cream">Egret</p>
                <p className="text-[0.7rem] text-cream-faint">Xiamen Air Virtual assistant</p>
              </div>
            </div>
            <button
              onClick={() => setMsgs((m) => [...m, { role: "assistant", content: HANDOFF }])}
              className="rounded-full border border-obsidian px-2.5 py-1 text-[0.7rem] font-medium text-cream-dim transition-colors hover:border-gold-soft hover:text-cream"
            >
              Talk to a human
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-gold px-3.5 py-2 text-white"
                      : "max-w-[88%] rounded-2xl rounded-bl-sm bg-ink-900 px-3.5 py-2 text-cream-dim"
                  }
                >
                  <Rendered content={m.content} />
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-ink-900 px-3.5 py-3">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-cream-faint" style={{ animationDelay: `${d * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-obsidian bg-ink-900 px-3 py-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask Egret anything…"
                className="min-w-0 flex-1 rounded-full border border-obsidian bg-ink-950 px-4 py-2.5 text-sm text-cream placeholder:text-cream-faint focus:border-gold-soft focus:outline-none"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[0.65rem] text-cream-faint">Egret can make mistakes — verify important details with staff.</p>
          </div>
        </div>
      )}
    </>
  );
}
