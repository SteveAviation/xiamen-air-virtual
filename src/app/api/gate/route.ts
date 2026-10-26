/* Crew Centre preview gate — validate credentials and set the unlock cookie. */
import { cookies } from "next/headers";
import { GATE_COOKIE, validateCreds, expectedToken, gateConfigured } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!gateConfigured()) {
    return Response.json({ error: "Access is temporarily unavailable." }, { status: 503 });
  }

  if (!validateCreds(String(body.username ?? ""), String(body.password ?? ""))) {
    return Response.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  (await cookies()).set(GATE_COOKIE, expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return Response.json({ ok: true });
}
