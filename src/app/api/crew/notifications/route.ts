import { getSession } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ notifications: [], unread: 0 });
  const notifications = await listNotifications(session.pilotId, 30);
  const unread = notifications.filter((n) => !n.read).length;
  return Response.json({ notifications, unread });
}

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  await markNotificationsRead(session.pilotId);
  return Response.json({ ok: true });
}
