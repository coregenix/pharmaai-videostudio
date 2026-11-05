import os, shutil, tempfile
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import jobs, tts

app = FastAPI(title="PharmaAI-VideoStudio render worker")
SECRET = os.getenv("WORKER_SECRET", "")

def auth(x_worker_secret: str | None):
    if not SECRET or x_worker_secret != SECRET:
        raise HTTPException(401, "Invalid worker secret")

@app.on_event("startup")
def startup():
    jobs.start()

@app.get("/health")
def health():
    return {"ok": True, "ffmpeg": bool(shutil.which("ffmpeg")), "supabase": jobs.configured(), "tts": tts.provider(), "queued": jobs.q.qsize()}

class JobIn(BaseModel):
    job_id: str

@app.post("/jobs")
def create_job(body: JobIn, x_worker_secret: str | None = Header(None)):
    auth(x_worker_secret)
    if not jobs.configured():
        raise HTTPException(503, "Worker is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    jobs.q.put(body.job_id)
    return {"queued": True}

class PreviewIn(BaseModel):
    text: str
    language: str = "en-IN"
    voice: str = "female"

@app.post("/tts/preview")
def preview(body: PreviewIn, x_worker_secret: str | None = Header(None)):
    auth(x_worker_secret)
    out = os.path.join(tempfile.mkdtemp(), "p.mp3")
    try:
        tts.synth(body.text[:300], body.language, body.voice, out)
    except Exception as e:
        raise HTTPException(503, f"Voice provider unavailable: {str(e)[:120]}")
    return FileResponse(out, media_type="audio/mpeg")
