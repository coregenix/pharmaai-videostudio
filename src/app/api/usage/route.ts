import { authed, limits, unauthorized, usedThisMonth } from "@/lib/supabase-server";
export async function GET(req: Request) {
  const a = await authed(req); if (!a) return unauthorized();
  return Response.json({ used: await usedThisMonth(a.sb), ...limits() });
}
