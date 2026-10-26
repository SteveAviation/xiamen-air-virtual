import { hasCrewAccess, getSession } from "@/lib/auth";
import { createNews, deleteNews } from "@/lib/db";

export const runtime = "nodejs";

const CATEGORIES = ["Route of the Week", "Group Flight", "Event", "Announcement", "Update"];

export async function POST(request: Request) {
  if (!(await hasCrewAccess())) {
    return Response.json({ error: "Staff access required." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "create");

  if (action === "delete") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) {
      return Response.json({ error: "Bad request." }, { status: 400 });
    }
    await deleteNews(id);
    return Response.json({ ok: true });
  }

  // create
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const categoryIn = String(body.category ?? "Announcement").trim();
  const imageUrl = String(body.imageUrl ?? "").trim();

  if (title.length < 3) {
    return Response.json({ error: "Give the post a title." }, { status: 400 });
  }
  if (text.length < 3) {
    return Response.json({ error: "Write something for the post body." }, { status: 400 });
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    return Response.json(
      { error: "Image URL must start with http(s):// or be left blank." },
      { status: 400 },
    );
  }

  const category = CATEGORIES.includes(categoryIn) ? categoryIn : "Announcement";
  const eventAtIn = String(body.eventAt ?? "").trim();
  const eventAt = eventAtIn && !Number.isNaN(Date.parse(eventAtIn)) ? new Date(eventAtIn).toISOString() : null;
  const session = await getSession();
  const author = session?.callsign ?? "Xiamen Air Staff";

  const post = await createNews({
    title,
    body: text,
    category,
    imageUrl: imageUrl || null,
    author,
    eventAt,
  });
  return Response.json({ ok: true, post });
}
