"use client";
import Link from "next/link";
import { Empty, ProjectRow, useProjects } from "@/components/ui";
const COPY: Record<string, [string, string]> = {
  script: ["Script Studio", "Open a project to edit its script, check fact-check flags and confirm your review."],
  visuals: ["Visual Studio", "Open a project to choose the diagram for each scene and edit its labels."],
  voice: ["Voice Studio", "Open a project to pick language and voice, preview narration and edit subtitles."],
};
export default function Studio({ params }: { params: { tab: string } }) {
  const { list, err } = useProjects(); const c = COPY[params.tab] ?? COPY.script;
  return (<div className="space-y-4"><h1 className="text-3xl">{c[0]}</h1><p className="text-slate-400">{c[1]}</p>
    {err && <p role="alert" className="text-warn">{err}</p>}
    {list && list.length === 0 && <Empty>Nothing to edit yet. <Link className="text-lab-300 underline" href="/create">Create a video</Link> first.</Empty>}
    <div className="space-y-2">{list?.map((p) => <ProjectRow key={p.id} p={p} tab={params.tab} />)}</div></div>);
}
