"use client";
import { useEffect, useState } from "react";
import { api, supabase } from "@/lib/client";

export default function Settings() {
  const [cfg, setCfg] = useState<any>(null), [wm, setWm] = useState(""), [msg, setMsg] = useState(""), [email, setEmail] = useState("");
  useEffect(() => {
    api("/api/config").then(setCfg).catch((e) => setMsg(e.message));
    supabase.auth.getUser().then(({ data }) => { setEmail(data.user?.email ?? ""); setWm(data.user?.user_metadata?.watermark ?? "COREGENIX"); });
  }, []);
  async function save() { const { error } = await supabase.auth.updateUser({ data: { watermark: wm } }); setMsg(error ? error.message : "Saved. New projects will use this watermark."); }
  const ok = (b: boolean) => <span className={b ? "text-lab-300" : "text-warn"}>{b ? "configured" : "not configured"}</span>;
  return (<div className="space-y-6"><h1 className="text-3xl">Settings</h1>
    <section className="card space-y-3"><h2 className="text-lg">Channel watermark</h2><p className="text-sm text-slate-400">Shown in the corner of every video. Signed in as {email}.</p>
      <input className="input" maxLength={40} value={wm} onChange={(e) => setWm(e.target.value)} aria-label="Watermark text" /><button className="btn" onClick={save}>Save watermark</button></section>
    <section className="card space-y-2"><h2 className="text-lg">Provider status</h2>
      <p className="text-sm text-slate-400">API keys are server environment variables and are never shown here. Edit them in your hosting dashboard (see docs/DEPLOYMENT.md).</p>
      {cfg && <ul className="space-y-1 text-sm">
        {cfg.llm.map((p: any) => <li key={p.name}>Script AI: {p.name} — {ok(p.enabled)}</li>)}
        <li>Render worker URL — {ok(!!cfg.worker.configured)}{cfg.worker.configured && (cfg.worker.ok ? <span className="text-lab-300"> · reachable, ffmpeg {cfg.worker.ffmpeg ? "found" : "missing"}, voice: {cfg.worker.tts}, database {cfg.worker.supabase ? "linked" : "not linked"}</span> : <span className="text-warn"> · not reachable</span>)}</li>
        <li>Worker secret — {ok(cfg.workerSecretSet)}</li></ul>}
      {msg && <p role="status" className="text-sm text-warn">{msg}</p>}</section>
    <section className="card space-y-1 text-sm text-slate-400"><h2 className="text-lg text-white">About</h2>
      <p>PharmaAI-VideoStudio v0.1.0 — educational video studio for pharmacy education.</p>
      <p>Created by <a className="text-lab-300" href="https://github.com/coregenix" target="_blank" rel="noreferrer">Sant Kr (COREGENIX)</a>, M.Pharm Pharmacology, New Delhi, India.</p>
      <p>Scripts are AI-generated drafts. Always check them against standard textbooks before publishing.</p></section></div>);
}
