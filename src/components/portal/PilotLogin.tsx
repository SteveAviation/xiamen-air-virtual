"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* Per-pilot Crew Centre sign-in — Infinite Flight Community username + a
   personal passcode. Works against the live roster (Neon DB) with no Discord
   app required. On a pilot's FIRST sign-in, the passcode they enter becomes
   their passcode. */
export function PilotLogin() {
  const router = useRouter();
  const [ifUsername, setIfUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/ifc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ifUsername, passcode }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Couldn't sign in.");
        setBusy(false);
      }
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-obsidian/60 bg-ink-850 px-4 py-3 text-sm text-cream placeholder:text-cream-faint outline-none transition-colors focus:border-gold-soft focus:ring-1 focus:ring-gold-soft/40";

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <p className="eyebrow">Crew Centre</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-cream">
        Pilot sign-in
      </h1>
      <p className="mt-3 text-sm text-cream-dim">
        Sign in with your Infinite Flight Community username (or your callsign) to
        reach your flight deck.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-3">
        <input
          autoFocus
          autoComplete="username"
          value={ifUsername}
          onChange={(e) => setIfUsername(e.target.value)}
          placeholder="IFC username or callsign"
          className={input}
        />
        <input
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className={input}
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-gold px-7 py-3.5 text-sm font-normal text-cream transition-colors hover:bg-gold-soft disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-xs text-cream-faint">
        First time? Enter any passcode of your choice — it becomes yours. Not on
        the roster yet? Use <span className="text-cream-dim">/register</span> in
        Discord or ask staff to add you.
      </p>
    </section>
  );
}
