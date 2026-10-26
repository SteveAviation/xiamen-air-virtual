"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Manually post the current Route of the Day to Discord + the news feed
   (the Vercel cron also does this automatically at 0000Z). */
export function PostRotdButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function post() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/cron/rotd", { method: "POST" });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(j.webhookConfigured ? (j.posted ? "Posted to Discord ✓" : "Published — Discord webhook not set") : "Published to news · set DISCORD_ROTD_WEBHOOK for Discord");
      router.refresh();
    } else {
      setMsg(j.error || "Failed to post.");
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button onClick={post} disabled={busy} className="rounded-full border border-obsidian px-4 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream disabled:opacity-50">
        {busy ? "Posting…" : "Post ROTD now"}
      </button>
      {msg && <span className="text-xs text-cream-faint">{msg}</span>}
    </span>
  );
}
