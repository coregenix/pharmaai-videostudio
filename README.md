# PharmaAI-VideoStudio

Browser-based studio that turns a pharmacology topic into a reviewed, subtitled (and optionally narrated) educational MP4.
Open it in Chrome on phone, tablet or computer. Nothing to install for end users.

**Created by Sant Kr (COREGENIX)** · M.Pharm Pharmacology · [github.com/coregenix](https://github.com/coregenix) · MIT licence

## What works in this version (v0.1)

| Area | Status |
|---|---|
| Sign-up / sign-in, per-user data (Supabase Auth + Row Level Security) | Implemented |
| Create video: topic, level, format, duration, style, language, voice, no-voice | Implemented |
| AI script (9 sections, fact-check flags, unverified reference suggestions, YouTube metadata) via Gemini / Groq / Ollama with automatic fallback | Implemented, needs an API key |
| Script, visual-diagram and subtitle editing; voice preview | Implemented |
| Manual-review gate before rendering | Implemented |
| Server-side MP4 rendering (Pillow frames + FFmpeg): intro/outro, fade transitions, subtitles, watermark, optional music, 720p/1080p, progress, resume after restart | Implemented, tested locally with sample script (9:16 and 16:9) |
| Narration: Edge TTS (en-IN, Hindi, Hinglish) with per-scene fallback to silent | Implemented |
| Library: preview, download MP4/thumbnail, delete, regenerate script, re-render | Implemented |
| Monthly render quota and max resolution (server-side) | Implemented |

Not included yet: Piper/offline TTS, exact word-level subtitle alignment (captions are timed in proportion to word count within each scene's audio), animated (non-static) diagrams, anatomical organ illustrations. Visuals are simple labelled schematics: receptor binding, pathway, ADME, classification tree and key points. No bundled music; add licensed files to `worker/assets/music/`.

The web app typechecks and builds; the render pipeline was run end to end on a sample script. It has **not** been run against a live Supabase project or a real LLM key, so expect to fix small configuration issues on first deploy.

## Architecture

```
Browser (Next.js on Vercel) ──API routes──► Supabase (Auth, Postgres, Storage)
        │                                         ▲
        └── /api/.../render ──► Worker (FastAPI + FFmpeg, Docker) ──┘ uploads MP4, updates job progress
Script AI: Gemini → Groq → Ollama (first configured, falls back on error)
Voice: Edge TTS (swap in worker/tts.py)
```
Secrets (LLM keys, worker secret, service-role key) exist only as server environment variables.

## Run locally

1. Create a free Supabase project and run `supabase/schema.sql` in its SQL editor.
2. `cp .env.example .env.local`, fill the Supabase values and at least one LLM key (free Gemini or Groq keys work).
3. `npm install && npm run dev` → http://localhost:3000
4. Worker (needs Docker): `docker compose up --build`, then set `WORKER_URL=http://localhost:8000` and a matching `WORKER_SECRET` in both places. Without Docker: install FFmpeg, `cd worker && pip install -r requirements.txt && uvicorn main:app`.
5. Test rendering without any cloud: `cd worker && python selftest.py 9:16`.

Deployment: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Costs and limits: see [docs/COSTS.md](docs/COSTS.md).

## Medical accuracy and safety

- Scripts are AI drafts, not verified facts. The app shows fact-check flags and blocks rendering until you confirm a manual review.
- References are suggestions limited to standard textbooks; each is labelled **unverified**. No independent verification is performed.
- The prompt forbids invented doses, mechanisms and individualised treatment advice, but a language model can still be wrong. You are responsible for what you publish.

## Licence
MIT © 2026 Sant Kr (COREGENIX).
