"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/* Preview lock for the Crew Centre while the site is under IXMVRB review. */
export function LockScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not sign in.");
        setBusy(false);
      }
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-white/40";

  return (
    <div className="brand-wash relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16">
      <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle,#3b6fe0,transparent 70%)" }} />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <Image src="/brand/xav-logo-dark.png" alt="Xiamen Air Virtual" width={1985} height={528} className="h-9 w-auto" priority />
          <p className="mt-5 text-xs uppercase tracking-[0.3em] text-white/55">Crew Centre</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Members only</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            The Xiamen Air Virtual Crew Centre is a private preview while we&apos;re under review. Sign in to continue.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55">Username</label>
            <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Username" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55">Password</label>
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Password" />
          </div>
          {error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-fin-blue transition-transform hover:scale-[1.02] disabled:opacity-60">
            {busy ? "Signing in…" : "Enter Crew Centre"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/45">
          Not a member? <Link href="/" className="text-white/70 underline-offset-2 hover:underline">Back to xiamenairvirtual.com</Link>
        </p>
      </div>
    </div>
  );
}
