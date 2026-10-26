"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CrewLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/crew/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Couldn't sign in.");
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <p className="eyebrow">Staff Centre</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-cream">
        Staff sign-in
      </h1>
      <p className="mt-3 text-sm text-cream-dim">
        Enter the staff password to access the Staff Centre.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Crew password"
          className="w-full rounded-xl border border-obsidian/60 bg-ink-850 px-4 py-3 text-sm text-cream placeholder:text-cream-faint outline-none transition-colors focus:border-gold-soft focus:ring-1 focus:ring-gold-soft/40"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-gold px-7 py-3.5 text-sm font-normal text-cream transition-colors hover:bg-gold-soft disabled:opacity-60"
        >
          {busy ? "Checking…" : "Enter Staff Centre"}
        </button>
      </form>
      <p className="mt-6 text-xs text-cream-faint">
        A Discord-based staff login replaces this once configured.
      </p>
    </section>
  );
}
