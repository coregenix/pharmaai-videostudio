"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Project } from "@/lib/options";

export const STATUS: Record<string, string> = { draft: "Draft", script_ready: "Script ready", rendering: "Rendering", done: "Video ready" };
export function Badge({ s }: { s: string }) {
  const c = s === "done" ? "bg-lab-500/20 text-lab-300" : s === "rendering" ? "bg-warn/20 text-warn" : "bg-ink-700 text-slate-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${c}`}>{STATUS[s] ?? s}</span>;
}
export function useProjects() {
  const [list, setList] = useState<Project[] | null>(null), [err, setErr] = useState("");
  const load = () => api<Project[]>("/api/projects").then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  return { list, err, reload: load };
}
export function ProjectRow({ p, tab }: { p: Project; tab?: string }) {
  return (
    <Link href={`/project/${p.id}${tab ? `?tab=${tab}` : ""}`} className="card flex items-center justify-between gap-3 hover:border-lab-500">
      <div className="min-w-0"><div className="truncate font-medium text-white">{p.topic}</div>
        <div className="text-xs text-slate-500">{p.settings?.level} · {new Date(p.created_at).toLocaleDateString()}</div></div>
      <Badge s={p.status} />
    </Link>
  );
}
export const Empty = ({ children }: { children: React.ReactNode }) => <div className="card text-center text-slate-400">{children}</div>;
