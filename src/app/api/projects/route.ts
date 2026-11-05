import { authed, fail, unauthorized } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const a = await authed(req); if (!a) return unauthorized();
  const { data, error } = await a.sb.from("projects").select("*").order("created_at", { ascending: false });
  return error ? fail(error.message, 500) : Response.json(data);
}
export async function POST(req: Request) {
  const a = await authed(req); if (!a) return unauthorized();
  const { topic, settings } = await req.json();
  if (!topic?.trim() || topic.length > 200) return fail("Enter a topic (up to 200 characters).");
  const { data, error } = await a.sb.from("projects").insert({ user_id: a.user.id, topic: topic.trim(), settings }).select().single();
  return error ? fail(error.message, 500) : Response.json(data);
}
