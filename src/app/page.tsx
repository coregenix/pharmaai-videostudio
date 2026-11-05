"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Empty, ProjectRow, useProjects } from "@/components/ui";
import type { Job } from "@/lib/options";

export default function Dashboard() {
  const { list, err } = useProjects();
  const [usage, setUsage] = useState<{ used: number; monthly: number; maxRes: number } | null>(null);
  const [jobs, setJobs] = useState<(Job & { topic: string; pid: string })[]>([]);
  useEffect(() => { api("/api/usage").then(setUsage).catch(() => {}); }, []);
  useEffect(() => {
    const active = (list ?? []).filter((p) => p.status === "rendering");
    Promise.all(active.map((p) => api<Job | null>(`/api/projects/${p.id}/job`).then((j) => j && { ...j, topic: p.topic, pid: p.id }))).then((r) => setJobs(r.filter(Boolean) as any));
  }, [list]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl">Welcome back</h1><p className="mt-1 text-slate-400">Pick a topic, review the script, then render your video.</p></div>
        <Link href="/create" className="btn">New video</Link>
      </div>
      {err && <p role="alert" className="text-warn">{err}</p>}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card"><h2 className="text-lg">Render status</h2>
          {jobs.length === 0 ? <p className="mt-2 text-sm text-slate-400">No renders running.</p> : jobs.map((j) => (
            <Link key={j.id} href={`/project/${j.pid}?tab=render`} className="mt-3 block"><div className="flex justify-between text-sm"><span className="truncate">{j.topic}</span><span>{j.progress}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-ink-700"><div className="running h-full bg-lab-500" style={{ width: `${j.progress}%` }} /></div><div className="mt-1 text-xs text-slate-500">{j.stage}</div></Link>))}
        </div>
        <div className="card"><h2 className="text-lg">This month</h2>
          {usage ? <><p className="mt-2 text-2xl text-white">{usage.used} <span className="text-base text-slate-400">of {usage.monthly} renders used</span></p>
            <div className="mt-2 h-2 rounded bg-ink-700"><div className="h-2 rounded bg-lab-500" style={{ width: `${Math.min(100, (usage.used / usage.monthly) * 100)}%` }} /></div>
            <p className="mt-2 text-xs text-slate-500">Maximum export: {usage.maxRes}p. Limits are set by the site owner to stay within hosting budgets.</p></> : <p className="mt-2 text-sm text-slate-400">Loading…</p>}
        </div>
      </section>
      <section><h2 className="mb-3 text-xl">Recent projects</h2>
        {list === null ? <p className="text-slate-400">Loading…</p> : list.length === 0 ? <Empty>No projects yet. <Link className="text-lab-300 underline" href="/create">Create your first video</Link> or start from a <Link className="text-lab-300 underline" href="/templates">template</Link>.</Empty>
          : <div className="space-y-2">{list.slice(0, 5).map((p) => <ProjectRow key={p.id} p={p} />)}</div>}
      </section>
    </div>
  );
}
