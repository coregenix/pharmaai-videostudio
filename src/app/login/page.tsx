"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { configured, supabase } from "@/lib/client";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in"), [email, setEmail] = useState(""), [pw, setPw] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const { data, error } = mode === "in" ? await supabase.auth.signInWithPassword({ email, password: pw }) : await supabase.auth.signUp({ email, password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (data.session) router.replace("/"); else setMsg("Check your email to confirm your account, then sign in.");
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl">PharmaAI<span className="text-lab-400">-VideoStudio</span></h1>
      <p className="mb-6 mt-2 text-slate-400">Turn a pharmacology topic into a reviewed, narrated explainer video.</p>
      {!configured && <p className="mb-4 rounded-lg border border-warn/50 p-3 text-sm text-warn">Supabase env variables are missing. See the README.</p>}
      <form onSubmit={submit} className="card space-y-4">
        <div><label className="label" htmlFor="e">Email</label><input id="e" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="p">Password</label><input id="p" className="input" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        {msg && <p role="alert" className="text-sm text-warn">{msg}</p>}
        <button className="btn w-full" disabled={busy || !configured}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="w-full text-sm text-lab-300 underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}</button>
      </form>
      <p className="mt-8 text-center text-xs text-slate-500">By Sant Kr (COREGENIX)</p>
    </main>
  );
}
