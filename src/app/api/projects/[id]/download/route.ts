import { authed, fail, unauthorized } from "@/lib/supabase-server";
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = await authed(req); if (!a) return unauthorized();
  const kind = new URL(req.url).searchParams.get("kind") === "thumb" ? "thumb_path" : "video_path";
  const { data: p } = await a.sb.from("projects").select("video_path,thumb_path,topic").eq("id", params.id).single();
  const path = p?.[kind as "video_path"]; if (!path) return fail("File not ready.", 404);
  const name = `${(p!.topic as string).replace(/[^\w]+/g, "-").slice(0, 40)}${kind === "video_path" ? ".mp4" : ".jpg"}`;
  const { data, error } = await a.sb.storage.from("videos").createSignedUrl(path, 3600, { download: name });
  const { data: view } = await a.sb.storage.from("videos").createSignedUrl(path, 3600);
  return error ? fail(error.message, 500) : Response.json({ download: data!.signedUrl, view: view?.signedUrl });
}
