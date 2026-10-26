import { NextResponse } from "next/server";
import { verifyCrewPassword, makeCrewCookie } from "@/lib/auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyCrewPassword(password)) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  const c = makeCrewCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
