"use client";

import { useEffect, useRef, useState } from "react";

type Notif = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const ICON: Record<string, string> = {
  pirep: "📋",
  unlock: "🔓",
  rankup: "⭐",
  event: "📣",
  groupflight: "✈️",
  system: "🔔",
};

/* Notification bell for the Crew Centre — polls for the pilot's notifications,
   shows an unread badge, and marks all read when opened. */
export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/crew/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      setItems(j.notifications ?? []);
      setUnread(j.unread ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((xs) => xs.map((x) => ({ ...x, read: true })));
      await fetch("/api/crew/notifications", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-obsidian bg-ink-900 text-cream-dim transition-colors hover:text-cream"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[0.6rem] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-obsidian bg-ink-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
          <div className="border-b border-obsidian/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream-faint">
            Notifications
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-cream-faint">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-obsidian/50">
                {items.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3">
                    <span className="mt-0.5 text-base">{ICON[n.kind] ?? "🔔"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-cream">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-cream-dim">{n.body}</p>}
                      <p className="mt-1 text-[0.65rem] text-cream-faint">{ago(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
