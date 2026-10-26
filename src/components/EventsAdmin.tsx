"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NewsPost } from "@/lib/db";

const CATEGORIES = ["Route of the Week", "Group Flight", "Event", "Announcement", "Update"];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const catColor: Record<string, string> = {
  "Route of the Week": "bg-gold/10 text-gold",
  "Group Flight": "bg-rose/10 text-rose",
  Event: "bg-emerald-500/12 text-emerald-600",
  Announcement: "bg-ink-800 text-cream-dim",
  Update: "bg-ink-800 text-cream-dim",
};

export function EventsAdmin({ posts }: { posts: NewsPost[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Group Flight");
  const [eventAt, setEventAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const needsDate = category === "Group Flight" || category === "Event";

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crew/news", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title, body, category, eventAt }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not publish.");
      else { setTitle(""); setBody(""); setEventAt(""); router.refresh(); }
    } catch { setError("Network error. Try again."); }
    finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!confirm("Delete this item?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/crew/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
      if (res.ok) router.refresh();
    } finally { setDeletingId(null); }
  }

  const input = "w-full rounded-xl border border-obsidian bg-ink-850 px-4 py-3 text-sm text-cream placeholder:text-cream-faint focus:border-gold focus:outline-none";
  const label = "mb-1.5 block text-xs uppercase tracking-wide text-cream-faint";

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={publish} className="rounded-2xl border border-obsidian bg-ink-900 p-6">
        <h3 className="font-display text-xl font-semibold text-cream">Publish an event</h3>
        <p className="mt-1 text-sm text-cream-dim">Group flights, future events and announcements appear on every pilot’s dashboard.</p>
        <div className="mt-5 space-y-4">
          <div><label className={label}>Type</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div><label className={label}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday Group Flight: ZSAM → LEMD" className={input} maxLength={140} /></div>
          {needsDate && (
            <div><label className={label}>When</label>
              <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className={input} /></div>
          )}
          <div><label className={label}>Details</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Briefing, gate, multipliers, server…" rows={6} className={`${input} resize-y`} /></div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={busy} className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">{busy ? "Publishing…" : "Publish"}</button>
        </div>
      </form>

      <div>
        <h3 className="font-display text-xl font-semibold text-cream">Published <span className="ml-2 rounded-full bg-gold/10 px-2.5 py-0.5 text-sm text-gold">{posts.length}</span></h3>
        <div className="mt-4 space-y-3">
          {posts.length === 0 && <div className="rounded-2xl border border-dashed border-obsidian bg-ink-900 p-10 text-center text-sm text-cream-faint">Nothing published yet. ✦</div>}
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-obsidian bg-ink-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${catColor[p.category] ?? "bg-ink-800 text-cream-dim"}`}>{p.category}</span>
                  <h4 className="mt-2 font-display text-lg font-semibold text-cream">{p.title}</h4>
                  <p className="mt-0.5 text-xs text-cream-faint">{p.eventAt ? `📅 ${fmtDateTime(p.eventAt)} · ` : ""}posted {fmt(p.createdAt)} · {p.author}</p>
                </div>
                <button onClick={() => remove(p.id)} disabled={deletingId === p.id} className="shrink-0 rounded-full border border-obsidian px-3 py-1.5 text-xs text-cream-faint hover:border-rose/50 hover:text-rose disabled:opacity-50">{deletingId === p.id ? "…" : "Delete"}</button>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-cream-dim">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
