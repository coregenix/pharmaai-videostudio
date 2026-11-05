# Deployment guide

## 1. GitHub
```
cd pharmaai-videostudio
git init && git add . && git commit -m "PharmaAI-VideoStudio v0.1"
git branch -M main
git remote add origin https://github.com/coregenix/pharmaai-videostudio.git
git push -u origin main
```
Create the empty repo on GitHub first. Never commit `.env` (already git-ignored).

## 2. Database, auth, storage (Supabase)
1. supabase.com → New project. Copy **Project URL**, **anon key** and **service_role key** (Settings → API).
2. SQL editor → paste `supabase/schema.sql` → Run. This creates tables, RLS policies and the private `videos` bucket.
3. Authentication → Providers → Email enabled. Add your site URL under URL Configuration after step 4.

## 3. Render worker (Render, Railway or Fly.io)
1. New web service from your GitHub repo, root directory `worker`, runtime Docker (uses `worker/Dockerfile`).
2. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_SECRET` (long random string), `STORAGE_BUCKET=videos`, `TTS_PROVIDER=edge`.
3. After deploy, open `https://YOUR-WORKER/health` — expect `"ffmpeg": true, "supabase": true`.
4. Use an instance with at least 1 GB RAM. Free instances sleep; the first render after sleep may fail, retry once it is awake.
5. Interrupted jobs: on restart the worker re-queues jobs still marked queued/rendering.

## 4. Web app (Vercel)
1. vercel.com → Add New Project → import the repo (root directory `/`, framework Next.js).
2. Environment variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `WORKER_URL` (https URL of the worker), `WORKER_SECRET` (same value as the worker)
   - `GEMINI_API_KEY` and/or `GROQ_API_KEY`; optionally `LLM_PROVIDERS`, models, `OLLAMA_URL`
   - `MONTHLY_RENDER_LIMIT`, `MAX_RESOLUTION`
3. Deploy, open the URL in Chrome, create an account.

## 5. API configuration
Keys live only in the hosting dashboards above. The in-app **Settings** page shows which providers are configured and whether the worker is reachable; it never shows key values. After changing a variable on Vercel, redeploy.
Free keys: Google AI Studio (Gemini) and console.groq.com (Groq).

## 6. Custom domain
Vercel → Project → Settings → Domains → add your domain and set the DNS records Vercel shows. Then add the domain to Supabase Authentication → URL Configuration (Site URL and redirect URLs).

## 7. Background music
Add licensed `.mp3`/`.wav` files to `worker/assets/music/`, commit and redeploy the worker. Keep each track's licence text with it.

## Troubleshooting
- "Render worker unreachable": check `WORKER_URL`, that the worker is awake, and that both `WORKER_SECRET` values match.
- "No LLM provider configured": set an API key on Vercel and redeploy.
- Hindi text shows as boxes in video: the worker image needs `fonts-noto-core` (included in the Dockerfile); set `FONT_DEV` if you run it elsewhere.
- Narration missing and a warning appears: the free voice service failed for that scene; re-render later or use no-voice mode.
