import { authed, unauthorized } from "@/lib/supabase-server";
import { configuredProviders } from "@/lib/llm";
// Reports which server settings exist. Never returns secret values.
export async function GET(req: Request) {
  const a = await authed(req); if (!a) return unauthorized();
  let worker: unknown = { configured: false };
  if (process.env.WORKER_URL) {
    try { worker = { configured: true, ...(await (await fetch(`${process.env.WORKER_URL.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(8000) })).json()) }; }
    catch { worker = { configured: true, reachable: false }; }
  }
  return Response.json({ llm: configuredProviders(), worker, workerSecretSet: !!process.env.WORKER_SECRET });
}
