"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Badge } from "@/components/ui";
import { LANGUAGES, STYLES, VISUAL_TYPES, VOICES, type Job, type Project, type Script, type Section } from "@/lib/options";

const TABS = [["script", "Script"], ["visuals", "Visuals"], ["voice", "Voice"], ["render", "Render"]] as const;

function Editor({ id }: { id: string }) {
  const q = useSearchParams(), router = useRouter();
  const [tab, setTab] = useState(q.get("tab") ?? "script");
  const [p, setP] = useState<Project | null>(null), [script, setScript] = useState<Script | null>(null);
  const [msg, setMsg] = useState(q.get("err") ?? ""), [busy, setBusy] = useState(""), [dirty, setDirty] = useState(false);
  const [job, setJob] = useState<Job | null>(null), [urls, setUrls] = useState<{ view?: string; download?: string; thumb?: string } | null>(null);
  const [res, setRes] = useState(720);
  const audio = useRef<HTMLAudioElement>(null);

  const load = useCallback(async () => {
    const d = await api<Project>(`/api/projects/${id}`); setP(d); setScript(d.script); setDirty(false);
    return d;
  }, [id]);
  const loadJob = useCallback(async () => {
    const j = await api<Job | null>(`/api/projects/${id}/job`); setJob(j); return j;
  }, [id]);
  useEffect(() => { load().then(() => loadJob()).catch((e) => setMsg(e.message)); }, [load, loadJob]);
  useEffect(() => {  // poll only while a job is genuinely active
    if (!job || !["queued", "rendering"].includes(job.status)) return;
    const t = setInterval(async () => { const j = await loadJob().catch(() => null); if (j && j.status === "done") load(); }, 3000);
    return () => clearInterval(t);
  }, [job, loadJob, load]);
  useEffect(() => {
    if (p?.video_path && tab === "render") api(`/api/projects/${id}/download`).then((r) => setUrls((u) => ({ ...u, ...r }))).catch(() => {});
  }, [p?.video_path, tab, id]);

  const edit = (fn: (s: Script) => void) => { if (!script) return; const c = structuredClone(script); fn(c); c.reviewed = false; setScript(c); setDirty(true); };
  const sec = (i: number, fn: (s: Section) => void) => edit((s) => fn(s.sections[i]));
  async function save() {
    setBusy("save"); setMsg("");
    try { const d = await api<Project>(`/api/projects/${id}`, { method: "PATCH", json: { script } }); setP(d); setDirty(false); setMsg("Saved."); } catch (e: any) { setMsg(e.message); }
    setBusy("");
  }
  async function regen() {
    if (script && !confirm("Replace the current script with a new one? Your edits will be lost.")) return;
    setBusy("regen"); setMsg("");
    try { const d = await api<Project>(`/api/projects/${id}/script`, { method: "POST" }); setP(d); setScript(d.script); setDirty(false); } catch (e: any) { setMsg(e.message); }
    setBusy("");
  }
  async function review(v: boolean) {
    if (!script) return; const next = { ...script, reviewed: v }; setScript(next);
    try { await api(`/api/projects/${id}`, { method: "PATCH", json: { script: next } }); setDirty(false); } catch (e: any) { setMsg(e.message); }
  }
  async function updateSettings(patch: Record<string, unknown>) {
    if (!p) return; const settings = { ...p.settings, ...patch };
    try { setP(await api<Project>(`/api/projects/${id}`, { method: "PATCH", json: { settings } })); } catch (e: any) { setMsg(e.message); }
  }
  async function render() {
    if (dirty) return setMsg("Save your script changes before rendering.");
    setBusy("render"); setMsg("");
    try { await api(`/api/projects/${id}/render`, { method: "POST", json: { resolution: res } }); await loadJob(); setTab("render"); } catch (e: any) { setMsg(e.message); await loadJob().catch(() => {}); }
    setBusy("");
  }
  async function preview(text: string) {
    setBusy("voice"); setMsg("");
    try {
      const r: Response = await api("/api/voice/preview", { method: "POST", json: { text, language: p?.settings.language, voice: p?.settings.voice } });
      const url = URL.createObjectURL(await r.blob()); if (audio.current) { audio.current.src = url; audio.current.play(); }
    } catch (e: any) { setMsg(e.message); }
    setBusy("");
  }
  async function del() { if (!confirm("Delete this project and its video?")) return; try { await api(`/api/projects/${id}`, { method: "DELETE" }); router.replace("/videos"); } catch (e: any) { setMsg(e.message); } }
  async function dl(kind: "video" | "thumb") { try { const r = await api(`/api/projects/${id}/download?kind=${kind}`); window.location.href = r.download; } catch (e: any) { setMsg(e.message); } }

  if (!p) return <p className="text-slate-400">{msg || "Loading…"}</p>;
  const running = !!job && ["queued", "rendering"].includes(job.status);
  const words = script?.sections.reduce((n, s) => n + s.narration.split(/\s+/).filter(Boolean).length, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl">{p.topic}</h1><Badge s={p.status} /></div>
        <p className="text-sm text-slate-500">{p.settings.level} · target {p.settings.duration}s{script ? ` · about ${words} words (~${Math.round(words / 2.3)}s spoken)` : ""}</p></div>
      <div className="flex gap-1 overflow-x-auto border-b border-ink-700" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`whitespace-nowrap px-4 py-3 ${tab === k ? "border-b-2 border-lab-400 text-lab-300" : "text-slate-400"}`}>{l}</button>)}
      </div>
      {msg && <p role="status" className="rounded-lg border border-warn/40 p-3 text-sm text-warn">{msg}</p>}

      {!script ? (
        <div className="card space-y-3"><p>No script yet.</p><button className="btn" onClick={regen} disabled={!!busy}>{busy ? "Writing…" : "Generate script"}</button></div>
      ) : tab === "script" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-warn/40 bg-warn/5 p-3 text-sm text-slate-300">AI-written draft. It has <b>not</b> been fact-checked. Check every mechanism, number and claim against a standard textbook, then tick the review box below.</div>
          {script.sections.map((s, i) => (
            <div key={s.key + i} className="card space-y-3">
              <input className="input font-display text-lg" aria-label="Heading" value={s.heading} onChange={(e) => sec(i, (x) => (x.heading = e.target.value))} />
              <label className="label" htmlFor={`n${i}`}>Narration</label>
              <textarea id={`n${i}`} className="input min-h-28 py-2" value={s.narration} onChange={(e) => sec(i, (x) => (x.narration = e.target.value))} />
              <label className="label" htmlFor={`b${i}`}>On-screen points (one per line)</label>
              <textarea id={`b${i}`} className="input min-h-20 py-2" value={s.bullets.join("\n")} onChange={(e) => sec(i, (x) => (x.bullets = e.target.value.split("\n").filter(Boolean)))} />
              {s.flags.filter((f) => f.claim).map((f, k) => <p key={k} className="rounded border border-warn/40 p-2 text-sm text-warn">Check: {f.claim} — {f.note}</p>)}
            </div>))}
          <div className="card"><h2 className="text-lg">Suggested references</h2><p className="mb-2 text-xs text-warn">Suggested by the AI and not verified. Confirm each exists and supports the content before citing it.</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">{script.references.map((r, i) => <li key={i}>{r.text}</li>)}</ul></div>
          <div className="card space-y-2"><h2 className="text-lg">YouTube metadata (editable)</h2>
            <input className="input" aria-label="YouTube title" value={script.youtube.title} onChange={(e) => edit((s) => (s.youtube.title = e.target.value))} />
            <textarea className="input min-h-24 py-2" aria-label="Description" value={script.youtube.description} onChange={(e) => edit((s) => (s.youtube.description = e.target.value))} />
            <input className="input" aria-label="Tags" value={script.youtube.tags.join(", ")} onChange={(e) => edit((s) => (s.youtube.tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean)))} />
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(`${script.youtube.title}\n\n${script.youtube.description}\n\n${script.youtube.tags.map((t) => "#" + t.replace(/\s+/g, "")).join(" ")}`).then(() => setMsg("Copied."))}>Copy metadata</button></div>
          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 bg-ink-950/95 py-3">
            <button className="btn" onClick={save} disabled={!dirty || !!busy}>{dirty ? "Save changes" : "Saved"}</button>
            <button className="btn-ghost" onClick={regen} disabled={!!busy}>{busy === "regen" ? "Writing…" : "Regenerate script"}</button>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-teal-400" disabled={dirty} checked={!!script.reviewed} onChange={(e) => review(e.target.checked)} />I reviewed this script for accuracy</label>
          </div>
        </div>
      ) : tab === "visuals" ? (
        <div className="space-y-4">
          <div className="card"><label className="label" htmlFor="sty">Visual style (colour theme)</label>
            <select id="sty" className="input" value={p.settings.style} onChange={(e) => updateSettings({ style: e.target.value })}>{STYLES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
            <p className="mt-2 text-xs text-slate-500">Visuals are generated as labelled schematic diagrams. They are simplified teaching sketches, not anatomical illustrations.</p></div>
          {script.sections.map((s, i) => (
            <div key={s.key + i} className="card space-y-2"><h2 className="text-lg">{s.heading}</h2>
              <select className="input" aria-label="Diagram type" value={s.visual.type} onChange={(e) => sec(i, (x) => (x.visual.type = e.target.value))}>{VISUAL_TYPES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
              {["receptor", "pathway", "classification"].includes(s.visual.type) && <>
                <label className="label" htmlFor={`l${i}`}>{s.visual.type === "receptor" ? "Labels: drug, receptor, response" : s.visual.type === "classification" ? "Labels: top class first, then subclasses" : "Labels: steps in order"} (one per line)</label>
                <textarea id={`l${i}`} className="input min-h-24 py-2" value={s.visual.labels.join("\n")} onChange={(e) => sec(i, (x) => (x.visual.labels = e.target.value.split("\n").filter(Boolean)))} /></>}
            </div>))}
          <button className="btn" onClick={save} disabled={!dirty || !!busy}>{dirty ? "Save changes" : "Saved"}</button>
          {dirty && <p className="text-xs text-slate-500">Saving clears the review tick. Tick it again on the Script tab.</p>}
        </div>
      ) : tab === "voice" ? (
        <div className="space-y-4"><audio ref={audio} className="hidden" />
          <div className="card grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="lang">Language</label><select id="lang" className="input" value={p.settings.language} onChange={(e) => updateSettings({ language: e.target.value })}>{LANGUAGES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
            <div><label className="label" htmlFor="vc">Voice</label><select id="vc" className="input" value={p.settings.voice} onChange={(e) => updateSettings({ voice: e.target.value })}>{VOICES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
            <label className="flex items-center gap-3 sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-teal-400" checked={p.settings.noVoice} onChange={(e) => updateSettings({ noVoice: e.target.checked })} />No-voice mode (subtitles only)</label>
            <p className="text-xs text-slate-500 sm:col-span-2">Narration language must match the script language. To change the script language, regenerate the script from a new project.</p></div>
          {script.sections.map((s, i) => (
            <div key={s.key + i} className="card space-y-2"><h2 className="text-lg">{s.heading}</h2>
              <label className="label" htmlFor={`sub${i}`}>Subtitles (leave as narration or edit)</label>
              <textarea id={`sub${i}`} className="input min-h-20 py-2" value={s.subtitle ?? s.narration} onChange={(e) => sec(i, (x) => (x.subtitle = e.target.value))} />
              <button className="btn-ghost" disabled={!!busy || p.settings.noVoice} onClick={() => preview(s.narration)}>{busy === "voice" ? "Loading…" : "Preview voice"}</button></div>))}
          <button className="btn" onClick={save} disabled={!dirty || !!busy}>{dirty ? "Save changes" : "Saved"}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-3"><h2 className="text-lg">Render video</h2>
            <div className="flex flex-wrap items-center gap-3"><label className="text-sm" htmlFor="res">Quality</label>
              <select id="res" className="input w-auto" value={res} onChange={(e) => setRes(Number(e.target.value))}><option value={720}>720p</option><option value={1080}>1080p (if the server allows)</option></select>
              <button className="btn" onClick={render} disabled={running || !!busy || !script.reviewed}>{running ? "Rendering…" : p.video_path ? "Render again" : "Start render"}</button></div>
            {!script.reviewed && <p className="text-sm text-warn">Tick “I reviewed this script for accuracy” on the Script tab to enable rendering.</p>}
            {job && <div><div className="flex justify-between text-sm"><span>{job.stage}</span><span>{job.progress}%</span></div>
              <div className="mt-1 h-3 overflow-hidden rounded bg-ink-700"><div className={`h-full ${job.status === "failed" ? "bg-red-500" : "bg-lab-500"} ${running ? "running" : ""}`} style={{ width: `${job.progress}%` }} /></div>
              {job.error && <p role="alert" className="mt-2 text-sm text-red-300">Render failed: {job.error}</p>}
              {job.warnings?.map((w, i) => <p key={i} className="mt-1 text-xs text-warn">{w}</p>)}</div>}
          </div>
          {urls?.view && p.video_path && <div className="card space-y-3"><video controls playsInline className="mx-auto max-h-[70vh] w-full rounded-lg bg-black" src={urls.view} />
            <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => dl("video")}>Download MP4</button><button className="btn-ghost" onClick={() => dl("thumb")}>Download thumbnail</button></div>
            <p className="text-xs text-slate-500">Review the video fully before publishing. You are responsible for the accuracy of anything you publish.</p></div>}
        </div>
      )}
      <div className="pt-4"><button className="btn-danger" onClick={del}>Delete project</button></div>
    </div>
  );
}
export default function Page({ params }: { params: { id: string } }) { return <Suspense fallback={null}><Editor id={params.id} /></Suspense>; }
