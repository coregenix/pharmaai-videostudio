"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, supabase } from "@/lib/client";
import { DURATIONS, FORMATS, LANGUAGES, LEVELS, STYLES, VOICES, type Settings } from "@/lib/options";

function Sel({ id, label, value, onChange, opts }: { id: string; label: string; value: string | number; onChange: (v: string) => void; opts: { v: string | number; l: string }[] }) {
  return <div><label className="label" htmlFor={id}>{label}</label><select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>;
}

function Form() {
  const router = useRouter(), q = useSearchParams();
  const [topic, setTopic] = useState(q.get("topic") ?? "");
  const [s, setS] = useState<Settings>({ format: "shorts", duration: 60, level: q.get("level") ?? "B.Pharm", language: "en-IN", voice: "female", style: "mixed", noVoice: false, watermark: "COREGENIX" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { const w = data.user?.user_metadata?.watermark; if (w !== undefined) setS((x) => ({ ...x, watermark: w })); }); }, []);
  const set = (k: keyof Settings) => (v: string) => setS((x) => ({ ...x, [k]: k === "duration" ? Number(v) : v }));
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const p = await api("/api/projects", { method: "POST", json: { topic, settings: s } });
      await api(`/api/projects/${p.id}/script`, { method: "POST" }).catch((e) => { router.push(`/project/${p.id}?tab=script&err=${encodeURIComponent(e.message)}`); throw null; });
      router.push(`/project/${p.id}?tab=script`);
    } catch (e: any) { if (e) setErr(e.message); setBusy(false); }
  }
  return (
    <form onSubmit={go} className="space-y-5">
      <h1 className="text-3xl">Create video</h1>
      <div><label className="label" htmlFor="topic">Pharmacology topic</label>
        <input id="topic" className="input" required maxLength={200} placeholder="e.g. Mechanism of action of propranolol" value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Sel id="lv" label="Educational level" value={s.level} onChange={set("level")} opts={LEVELS.map((l) => ({ v: l, l }))} />
        <Sel id="fm" label="Video format" value={s.format} onChange={set("format")} opts={FORMATS} />
        <Sel id="du" label="Target duration" value={s.duration} onChange={set("duration")} opts={DURATIONS} />
        <Sel id="st" label="Visual style" value={s.style} onChange={set("style")} opts={STYLES} />
        <Sel id="la" label="Narration language" value={s.language} onChange={set("language")} opts={LANGUAGES} />
        <Sel id="vo" label="Voice" value={s.voice} onChange={set("voice")} opts={VOICES} />
      </div>
      <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-teal-400" checked={s.noVoice} onChange={(e) => setS({ ...s, noVoice: e.target.checked })} />No-voice mode (subtitles only)</label>
      <p className="text-xs text-slate-500">Durations are targets for script length. The final length follows the narration.</p>
      {err && <p role="alert" className="rounded-lg border border-warn/50 p-3 text-sm text-warn">{err}</p>}
      <button className="btn w-full sm:w-auto" disabled={busy}>{busy ? "Writing your script…" : "Generate script"}</button>
    </form>
  );
}
export default function Create() { return <Suspense fallback={null}><Form /></Suspense>; }
