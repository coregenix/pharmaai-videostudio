"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { Badge, Empty, useProjects } from "@/components/ui";

export default function Videos() {
  const { list, err, reload } = useProjects(); const [msg, setMsg] = useState("");
  async function dl(id: string) { try { const r = await api(`/api/projects/${id}/download`); window.location.href = r.download; } catch (e: any) { setMsg(e.message); } }
  async function del(id: string, t: string) { if (!confirm(`Delete "${t}" and its video?`)) return; try { await api(`/api/projects/${id}`, { method: "DELETE" }); reload(); } catch (e: any) { setMsg(e.message); } }
  return (<div className="space-y-4"><h1 className="text-3xl">My videos</h1>
    {(err || msg) && <p role="alert" className="text-warn">{err || msg}</p>}
    {list?.length === 0 && <Empty>No projects yet. <Link className="text-lab-300 underline" href="/create">Create a video</Link>.</Empty>}
    <div className="space-y-3">{list?.map((p) => (
      <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><div className="truncate font-medium text-white">{p.topic}</div><div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Badge s={p.status} />{new Date(p.created_at).toLocaleDateString()}</div></div>
        <div className="flex gap-2"><Link className="btn-ghost" href={`/project/${p.id}`}>Open</Link>
          {p.video_path && <button className="btn" onClick={() => dl(p.id)}>Download</button>}
          <button className="btn-danger" onClick={() => del(p.id, p.topic)}>Delete</button></div>
      </div>))}</div></div>);
}
