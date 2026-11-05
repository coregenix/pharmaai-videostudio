import { authed, fail, unauthorized } from "@/lib/supabase-server";
type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const a = await authed(req); if (!a) return unauthorized();
  const { data, error } = await a.sb.from("projects").select("*").eq("id", params.id).single();
  return error ? fail("Project not found.", 404) : Response.json(data);
}
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await authed(req); if (!a) return unauthorized();
  const body = await req.json(); const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["topic", "settings", "script"]) if (k in body) patch[k] = body[k];
  const { data, error } = await a.sb.from("projects").update(patch).eq("id", params.id).select().single();
  return error ? fail(error.message, 500) : Response.json(data);
}
export async function DELETE(req: Request, { params }: Ctx) {
  const a = await authed(req); if (!a) return unauthorized();
  const base = `${a.user.id}/${params.id}`;
  await a.sb.storage.from("videos").remove([`${base}/final.mp4`, `${base}/thumb.jpg`]);
  const { error } = await a.sb.from("projects").delete().eq("id", params.id);
  return error ? fail(error.message, 500) : Response.json({ ok: true });
}
