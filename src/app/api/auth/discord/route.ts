import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authConfigured, authorizeUrl } from "@/lib/auth";

export async function GET(request: Request) {
  // Demo mode: nothing to authorize against — just head to the dashboard.
  if (!authConfigured) {
    return NextResponse.redirect(new URL("/pirep", request.url));
  }

  const state = randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("sjx_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
