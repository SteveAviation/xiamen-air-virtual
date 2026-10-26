import { NextResponse } from "next/server";
import {
  exchangeCode,
  fetchIdentity,
  makeSessionCookie,
  type Session,
} from "@/lib/auth";
import { upsertPilot } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.headers
    .get("cookie")
    ?.match(/sjx_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== expectedState) {
    console.error(
      `[auth] callback bad state — code:${!!code} state:${!!state} match:${state === expectedState} cookie:${!!expectedState}`,
    );
    return NextResponse.redirect(new URL("/pirep?error=state", request.url));
  }

  try {
    const token = await exchangeCode(code);
    const identity = await fetchIdentity(token);
    const pilot = await upsertPilot({
      discordId: identity.id,
      callsign: identity.username,
      displayName: identity.displayName,
      avatar: identity.avatar,
    });

    const session: Session = {
      pilotId: pilot.id,
      discordId: pilot.discordId,
      callsign: pilot.callsign,
      displayName: pilot.displayName,
      avatar: pilot.avatar,
      isStaff: identity.isStaff || pilot.isStaff === true,
    };

    console.log(`[auth] login OK — #${pilot.id} ${pilot.callsign} staff:${session.isStaff}`);

    const res = NextResponse.redirect(new URL("/pirep", request.url));
    const cookie = makeSessionCookie(session);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    res.cookies.delete("sjx_oauth_state");
    return res;
  } catch (err) {
    console.error("[auth] callback failed:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/pirep?error=auth", request.url));
  }
}
