import { getSession } from "@/lib/auth";
import { setPilotIfIdentity } from "@/lib/db";
import { ifConfigured, lookupUserByIfc } from "@/lib/infiniteflight";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ifUsername = typeof body.ifUsername === "string" ? body.ifUsername.trim() : "";

  // Look up the IF user ID from the IFC username when the API is connected.
  let ifUserId: string | null = null;
  if (ifUsername && ifConfigured) {
    const user = await lookupUserByIfc(ifUsername);
    if (!user) {
      return Response.json(
        { error: "That IFC username wasn't found on Infinite Flight." },
        { status: 422 },
      );
    }
    ifUserId = user.userId;
  }

  await setPilotIfIdentity(session.pilotId, ifUsername || null, ifUserId);
  return Response.json({ ok: true, ifUsername: ifUsername || null });
}
