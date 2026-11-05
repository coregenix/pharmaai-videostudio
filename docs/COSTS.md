# Costs and limits (estimates, check current provider pricing)

Budget target: ₹0–₹1,000 per month. Free tiers change often, so verify before relying on them.

| Part | Free option | Notes |
|---|---|---|
| Frontend | Vercel Hobby | Non-commercial use only on Hobby. |
| Database, auth, storage | Supabase free tier | Small storage cap; a 720p one-minute video is typically a few MB. Delete old projects to stay under it. |
| Script AI | Gemini or Groq free tier | Rate limited. The app falls back to the next configured provider. |
| Voice | Edge TTS (free, unofficial) | Can break or be rate-limited without notice. The app then renders subtitle-only scenes and says so. |
| Render worker | Free container hosts sleep, have little CPU and may time out | A small paid instance (roughly ₹500–800/month) is the realistic option for 3–10 minute videos. 1080p needs more CPU and RAM. |

Rendering is CPU-bound: expect a minute-long 720p video to take about 1–3 minutes on a small instance.
There is no unlimited generation. `MONTHLY_RENDER_LIMIT` and `MAX_RESOLUTION` cap use per user and are enforced on the server.
