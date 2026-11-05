import { authed, callWorker, fail, limits, unauthorized, usedThisMonth } from "@/lib/supabase-server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authed(req); if (!a) return unauthorized();
  const { resolution } = await req.json().catch(() => ({ resolution: 720 }));
  const { monthly, maxRes } = limits();
  const res = Number(resolution) === 1080 && maxRes >= 1080 ? 1080 : 720;
  const { data: p } = await a.sb.from("projects").select("*").eq("id", params.id).single();
  if (!p?.script) return fail("Generate a script first.");
  if (!p.script.reviewed) return fail("Confirm that you reviewed the script for accuracy before rendering.");
  const { data: active } = await a.sb.from("render_jobs").select("id").eq("project_id", p.id).in("status", ["queued", "rendering"]).gte("updated_at", new Date(Date.now() - 15 * 60_000).toISOString());
  if (active?.length) return fail("A render for this project is already running.", 409);
  const used = await usedThisMonth(a.sb);
  if (used >= monthly) return fail(`Monthly render limit reached (${used}/${monthly}).`, 429);
  const { data: job, error } = await a.sb.from("render_jobs").insert({ project_id: p.id, user_id: a.user.id, resolution: res }).select().single();
  if (error || !job) return fail(error?.message ?? "Could not create job", 500);
  try {
    const r = await callWorker("/jobs", { job_id: job.id });
    if (!r.ok) throw new Error(`Worker responded ${r.status}`);
  } catch (e) {
    // Job rows are server-owned (RLS is read-only for users), so mark failure via the worker-less path: delete is not allowed either.
    return fail(`Render worker unreachable: ${(e as Error).message}. The job stays queued and will start when the worker restarts.`, 503);
  }
  return Response.json(job);
}
