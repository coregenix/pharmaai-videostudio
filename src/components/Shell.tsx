"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { configured, supabase, useSession } from "@/lib/client";

export const NAV = [
  ["/", "Dashboard"], ["/create", "Create Video"], ["/studio/script", "Script Studio"], ["/studio/visuals", "Visual Studio"],
  ["/studio/voice", "Voice Studio"], ["/videos", "My Videos"], ["/templates", "Templates"], ["/settings", "Settings"],
] as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter(), session = useSession(), [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { if (session === null && path !== "/login" && configured) router.replace("/login"); }, [session, path, router]);

  if (path === "/login") return <>{children}</>;
  if (!configured) return <main className="mx-auto max-w-lg p-6"><div className="card"><h1 className="text-xl">Supabase is not configured</h1><p className="mt-2 text-sm text-slate-400">Copy <code>.env.example</code> to <code>.env.local</code> and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart.</p></div></main>;
  if (!session) return <main className="p-6 text-slate-400">Loading…</main>;

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(([href, label]) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return <Link key={href} href={href} className={`rounded-lg px-3 py-3 text-[15px] ${on ? "bg-lab-500/15 text-lab-300" : "text-slate-300 hover:bg-ink-800"}`} aria-current={on ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-700 bg-ink-950/95 px-4 py-3 md:hidden">
        <span className="font-display text-lg text-white">PharmaAI<span className="text-lab-400">-VideoStudio</span></span>
        <button className="btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">{open ? "Close" : "Menu"}</button>
      </header>
      {open && <div className="border-b border-ink-700 bg-ink-900 p-3 md:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-ink-700 bg-ink-900 p-4 md:flex">
        <div>
          <div className="mb-6 px-2 font-display text-xl text-white">PharmaAI<span className="text-lab-400">-VideoStudio</span></div>
          {nav}
        </div>
        <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </aside>
      <div className="flex min-h-screen flex-col">
        <main className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-8">{children}</main>
        <footer className="border-t border-ink-700 px-4 py-4 text-center text-xs text-slate-500">
          Built for pharmacy education by <a className="text-lab-400" href="https://github.com/coregenix" target="_blank" rel="noreferrer">Sant Kr (COREGENIX)</a>. For education only; verify content against standard references.
          <button className="ml-3 underline md:hidden" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </footer>
      </div>
    </div>
  );
}
