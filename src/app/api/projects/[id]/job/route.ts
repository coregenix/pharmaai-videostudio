import { authed, fail, unauthorized } from "@/lib/supabase-server";
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = await authed(req); if (!a) return unauthorized();
  const { data, error } = await a.sb.from("render_jobs").select("*").eq("project_id", params.id).order("created_at", { ascending: false }).limit(1);
  return error ? fail(error.message, 500) : Response.json(data?.[0] ?? null);
}
