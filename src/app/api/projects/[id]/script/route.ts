import { authed, fail, unauthorized } from "@/lib/supabase-server";
import { generateScript } from "@/lib/llm";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authed(req); if (!a) return unauthorized();
  const { data: p, error } = await a.sb.from("projects").select("*").eq("id", params.id).single();
  if (error || !p) return fail("Project not found.", 404);
  try {
    const script = await generateScript(p.topic, p.settings);
    const { data, error: e2 } = await a.sb.from("projects").update({ script, status: "script_ready", updated_at: new Date().toISOString() }).eq("id", p.id).select().single();
    return e2 ? fail(e2.message, 500) : Response.json(data);
  } catch (e) { return fail((e as Error).message, 502); }
}
