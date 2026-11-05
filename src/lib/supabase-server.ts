import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function bearer(req: Request) {
  return req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
}
/** Supabase client acting as the signed-in user, so Row Level Security applies. */
export async function authed(req: Request) {
  const token = bearer(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return null;
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { sb, user: data.user };
}
export const unauthorized = () => Response.json({ error: "Please sign in." }, { status: 401 });
export const fail = (msg: string, status = 400) => Response.json({ error: msg }, { status });

export function limits() {
  return { monthly: Number(process.env.MONTHLY_RENDER_LIMIT ?? 10), maxRes: Number(process.env.MAX_RESOLUTION ?? 720) };
}
export async function usedThisMonth(sb: SupabaseClient<any>) {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const { count } = await sb.from("render_jobs").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).neq("status", "failed");
  return count ?? 0;
}
export async function callWorker(path: string, body: unknown) {
  const url = process.env.WORKER_URL, secret = process.env.WORKER_SECRET;
  if (!url || !secret) throw new Error("Render worker is not configured. Set WORKER_URL and WORKER_SECRET.");
  return fetch(`${url.replace(/\/$/, "")}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-worker-secret": secret }, body: JSON.stringify(body) });
}
