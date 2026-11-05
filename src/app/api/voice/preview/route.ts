import { authed, callWorker, fail, unauthorized } from "@/lib/supabase-server";
export async function POST(req: Request) {
  const a = await authed(req); if (!a) return unauthorized();
  const { text, language, voice } = await req.json();
  try {
    const r = await callWorker("/tts/preview", { text: String(text ?? "").slice(0, 300), language, voice });
    if (!r.ok) return fail((await r.json().catch(() => ({}))).detail ?? "Voice preview unavailable.", 503);
    return new Response(await r.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg" } });
  } catch (e) { return fail((e as Error).message, 503); }
}
