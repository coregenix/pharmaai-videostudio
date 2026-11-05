"use client";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing");
export const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(path, {
    ...init, body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    headers: { ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...init.headers },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Request failed (${r.status})`);
  return r.headers.get("content-type")?.includes("json") ? r.json() : (r as any);
}

/** Returns the session, null when signed out, undefined while loading. */
export function useSession() {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setS(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => setS(sess));
    return () => data.subscription.unsubscribe();
  }, []);
  return s;
}
