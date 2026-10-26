"use client";

import { useEffect } from "react";

/* Watches the pilot's session while they're in the Crew Centre. If an admin
   suspends or deletes them, getSession() starts returning null — this poll
   catches that within ~15s and signs them out automatically (clears the
   cookie and bounces home). Admins are the ultimate authority. */
export function SessionGuard() {
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (alive && !j.session) {
          window.location.href = "/api/auth/logout";
        }
      } catch {
        /* ignore transient errors */
      }
    };
    const id = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return null;
}
