"""Supabase I/O + job execution. Uses PostgREST/Storage over HTTP with the service-role key (worker only)."""
import os, queue, shutil, threading, traceback
import httpx
import render

URL = os.getenv("SUPABASE_URL", "").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = os.getenv("STORAGE_BUCKET", "videos")
JOBS_DIR = os.getenv("JOBS_DIR", "/tmp/jobs")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
q: "queue.Queue[str]" = queue.Queue()

def configured() -> bool:
    return bool(URL and KEY)

def rest(method, path, **kw):
    r = httpx.request(method, f"{URL}/rest/v1/{path}", headers={**H, "Content-Type": "application/json", "Prefer": "return=representation"}, timeout=30, **kw)
    r.raise_for_status()
    return r.json() if r.text else None

def upload(path, file, content_type):
    with open(file, "rb") as f:
        r = httpx.post(f"{URL}/storage/v1/object/{BUCKET}/{path}", headers={**H, "Content-Type": content_type, "x-upsert": "true"}, content=f.read(), timeout=300)
    r.raise_for_status()

def patch_job(job_id, **fields):
    rest("PATCH", f"render_jobs?id=eq.{job_id}", json={**fields, "updated_at": "now()"})

def run_job(job_id: str):
    try:
        job = rest("GET", f"render_jobs?id=eq.{job_id}&select=*,projects(*)")[0]
        if job["status"] in ("done", "failed"):
            return
        p = job["projects"]; settings = {**p["settings"], "resolution": job["resolution"]}
        patch_job(job_id, status="rendering", stage="Starting", progress=2)
        rest("PATCH", f"projects?id=eq.{p['id']}", json={"status": "rendering"})
        work = os.path.join(JOBS_DIR, job_id)  # kept between attempts so finished scenes are reused after a restart
        last = {"p": -1}
        def progress(pct, stage):
            if pct != last["p"]:
                last["p"] = pct; patch_job(job_id, progress=pct, stage=stage)
        final, thumb, warnings = render.render_video(p["script"], p["topic"], settings, work, progress)
        progress(96, "Uploading")
        base = f"{p['user_id']}/{p['id']}"
        upload(f"{base}/final.mp4", final, "video/mp4"); upload(f"{base}/thumb.jpg", thumb, "image/jpeg")
        rest("PATCH", f"projects?id=eq.{p['id']}", json={"status": "done", "video_path": f"{base}/final.mp4", "thumb_path": f"{base}/thumb.jpg", "updated_at": "now()"})
        patch_job(job_id, status="done", stage="Done", progress=100, warnings=warnings)
        shutil.rmtree(work, ignore_errors=True)
    except Exception as e:
        traceback.print_exc()
        try:
            patch_job(job_id, status="failed", stage="Failed", error=str(e)[:500])
        except Exception:
            pass

def worker_loop():
    while True:
        run_job(q.get()); q.task_done()

def start():
    threading.Thread(target=worker_loop, daemon=True).start()
    if configured():  # resume interrupted jobs after a restart
        try:
            for j in rest("GET", "render_jobs?status=in.(queued,rendering)&select=id&order=created_at"):
                q.put(j["id"])
        except Exception:
            traceback.print_exc()
