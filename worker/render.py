"""Diagram-based video renderer: Pillow draws every frame, FFmpeg encodes. No paid AI video service needed."""
import glob, json, os, subprocess
from PIL import Image, ImageDraw, ImageFont
import tts

AUTHOR = "Sant Kr · COREGENIX"
THEMES = {  # (top, bottom, accent)
    "2d": ((8, 20, 38), (12, 62, 74), (45, 212, 191)),
    "3d": ((14, 16, 44), (40, 30, 90), (125, 211, 252)),
    "infographic": ((10, 24, 40), (18, 48, 70), (245, 181, 68)),
    "mechanism": ((6, 16, 30), (8, 40, 56), (94, 234, 212)),
    "mixed": ((9, 22, 42), (22, 40, 82), (45, 212, 191)),
}
DIMS = {("9:16", 720): (720, 1280), ("9:16", 1080): (1080, 1920), ("16:9", 720): (1280, 720), ("16:9", 1080): (1920, 1080)}
_fonts = {}

def _find(cands):
    for p in cands:
        if p and os.path.exists(p):
            return p
    return None

def font(size, text="", bold=False):
    dev = any("\u0900" <= c <= "\u097f" for c in text)
    key = (int(size), dev, bold)
    if key not in _fonts:
        if dev:
            path = _find([os.getenv("FONT_DEV"), "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf" if bold else None,
                          "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"])
        else:
            path = _find([os.getenv("FONT_LATIN"), "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf" if bold else None,
                          "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                          "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"])
        _fonts[key] = ImageFont.truetype(path, int(size)) if path else ImageFont.load_default()
    return _fonts[key]

def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def text_block(d, text, x, y, maxw, size, fill, bold=False, center=False, gap=1.25):
    f = font(size, text, bold)
    for line in wrap(d, text, f, maxw):
        w = d.textlength(line, font=f)
        d.text((x + (maxw - w) / 2 if center else x, y), line, font=f, fill=fill)
        y += size * gap
    return y

def background(W, H, theme):
    top, bot, _ = THEMES.get(theme, THEMES["mixed"])
    g = Image.linear_gradient("L").resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), bot), Image.new("RGB", (W, H), top), g)

def box(d, xy, text, u, accent, fill=(16, 38, 65)):
    d.rounded_rectangle(xy, radius=14 * u, fill=fill, outline=accent, width=max(2, int(3 * u)))
    x0, y0, x1, y1 = xy
    size = 28 * u
    f = font(size, text, True)
    lines = wrap(d, text, f, x1 - x0 - 20 * u)
    y = y0 + (y1 - y0 - len(lines) * size * 1.25) / 2
    for line in lines:
        d.text((x0 + (x1 - x0 - d.textlength(line, font=f)) / 2, y), line, font=f, fill=(235, 245, 250)); y += size * 1.25

def arrow(d, a, b, accent, u):
    d.line([a, b], fill=accent, width=max(3, int(5 * u)))
    import math
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); s = 16 * u
    d.polygon([b, (b[0] - s * math.cos(ang - .45), b[1] - s * math.sin(ang - .45)), (b[0] - s * math.cos(ang + .45), b[1] - s * math.sin(ang + .45))], fill=accent)

def d_chain(d, area, labels, u, accent, portrait):
    x0, y0, x1, y1 = area; n = max(1, len(labels))
    if portrait:
        h = min(110 * u, (y1 - y0) / (n * 1.6)); gap = ((y1 - y0) - n * h) / max(1, n - 1) if n > 1 else 0
        for i, t in enumerate(labels):
            top = y0 + i * (h + gap); box(d, (x0, top, x1, top + h), t, u, accent)
            if i < n - 1: arrow(d, ((x0 + x1) / 2, top + h + 4), ((x0 + x1) / 2, top + h + gap - 4), accent, u)
    else:
        w = (x1 - x0) / (n * 1.4 - .4); gap = w * .4; h = min(150 * u, y1 - y0); top = y0 + ((y1 - y0) - h) / 2
        for i, t in enumerate(labels):
            left = x0 + i * (w + gap); box(d, (left, top, left + w, top + h), t, u, accent)
            if i < n - 1: arrow(d, (left + w + 4, top + h / 2), (left + w + gap - 4, top + h / 2), accent, u)

def d_receptor(d, area, labels, u, accent, portrait):
    x0, y0, x1, y1 = area; L = (labels + ["Drug", "Receptor", "Response"])[:3] if len(labels) < 3 else labels[:3]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; r = min(x1 - x0, y1 - y0) * .13
    if portrait:
        dp, rp = (cx, y0 + r * 1.3), (cx, cy); ep = (cx, y1 - r * .8)
        d.ellipse((dp[0] - r, dp[1] - r, dp[0] + r, dp[1] + r), fill=accent)
        arrow(d, (cx, dp[1] + r + 8), (cx, rp[1] - r * 1.1), accent, u)
        d.rounded_rectangle((rp[0] - r * 1.6, rp[1] - r, rp[0] + r * 1.6, rp[1] + r), 20 * u, fill=(40, 70, 110), outline=accent, width=int(4 * u))
        d.ellipse((cx - r * .6, rp[1] - r * 1.15, cx + r * .6, rp[1] - r * .1), fill=(10, 26, 47))
        arrow(d, (cx, rp[1] + r + 8), (cx, ep[1] - r * .9), accent, u)
        text_block(d, L[0], dp[0] + r * 1.2, dp[1] - 16 * u, (x1 - x0) / 2 - r, 28 * u, (235, 245, 250), True)
        text_block(d, L[1], rp[0] + r * 1.8, rp[1] - 16 * u, (x1 - x0) / 2 - r * 1.6, 28 * u, (235, 245, 250), True)
        box(d, (x0 + 20 * u, ep[1] - r * .8, x1 - 20 * u, ep[1] + r * .8), L[2], u, accent)
    else:
        dp, rp, ep = (x0 + r * 1.5, cy), (cx, cy), (x1 - r * 3, cy)
        d.ellipse((dp[0] - r, dp[1] - r, dp[0] + r, dp[1] + r), fill=accent)
        arrow(d, (dp[0] + r + 8, cy), (rp[0] - r * 1.8, cy), accent, u)
        d.rounded_rectangle((rp[0] - r * 1.6, rp[1] - r * 1.2, rp[0] + r * 1.6, rp[1] + r * 1.2), 20 * u, fill=(40, 70, 110), outline=accent, width=int(4 * u))
        d.ellipse((rp[0] - r * 2.1, cy - r * .55, rp[0] - r * .9, cy + r * .55), fill=(10, 26, 47))
        arrow(d, (rp[0] + r * 1.8, cy), (ep[0] - 8, cy), accent, u)
        box(d, (ep[0], cy - r, x1, cy + r), L[2], u, accent)
        text_block(d, L[0], dp[0] - r * 1.4, cy + r * 1.2, r * 2.8, 26 * u, (235, 245, 250), True, True)
        text_block(d, L[1], rp[0] - r * 2, cy + r * 1.5, r * 4, 26 * u, (235, 245, 250), True, True)

def d_tree(d, area, labels, u, accent, portrait):
    x0, y0, x1, y1 = area; root = labels[0] if labels else "Class"; kids = labels[1:] or ["Subclass A", "Subclass B"]
    kids = kids[:6]; n = len(kids)
    if portrait:
        rh = 90 * u; box(d, (x0 + 40 * u, y0, x1 - 40 * u, y0 + rh), root, u, accent)
        avail = y1 - (y0 + rh + 40 * u); h = min(90 * u, avail / (n * 1.3)); gap = (avail - n * h) / max(1, n)
        sx = x0 + 20 * u
        d.line([(sx, y0 + rh), (sx, y1)], fill=accent, width=int(4 * u))
        for i, t in enumerate(kids):
            top = y0 + rh + 40 * u + i * (h + gap); d.line([(sx, top + h / 2), (sx + 40 * u, top + h / 2)], fill=accent, width=int(4 * u))
            box(d, (sx + 40 * u, top, x1, top + h), t, u, accent)
    else:
        rw = (x1 - x0) * .4; box(d, ((x0 + x1) / 2 - rw / 2, y0, (x0 + x1) / 2 + rw / 2, y0 + 90 * u), root, u, accent)
        w = (x1 - x0) / (n * 1.15); gap = w * .15; top = y0 + 190 * u
        d.line([(x0 + w / 2, top - 50 * u), (x1 - w / 2, top - 50 * u)], fill=accent, width=int(4 * u))
        d.line([((x0 + x1) / 2, y0 + 90 * u), ((x0 + x1) / 2, top - 50 * u)], fill=accent, width=int(4 * u))
        for i, t in enumerate(kids):
            left = x0 + i * (w + gap); d.line([(left + w / 2, top - 50 * u), (left + w / 2, top)], fill=accent, width=int(4 * u))
            box(d, (left, top, left + w, top + 120 * u), t, u, accent)

def d_bullets(d, area, bullets, u, accent):
    x0, y0, x1, y1 = area; y = y0
    for b in bullets[:6]:
        d.ellipse((x0, y + 12 * u, x0 + 16 * u, y + 28 * u), fill=accent)
        y = text_block(d, b, x0 + 34 * u, y, x1 - x0 - 34 * u, 34 * u, (235, 245, 250)) + 14 * u
        if y > y1: break

def frame(W, H, theme, heading, visual, bullets, caption, watermark, kind="scene"):
    u = min(W, H) / 720; accent = THEMES.get(theme, THEMES["mixed"])[2]; portrait = H > W
    img = background(W, H, theme); d = ImageDraw.Draw(img); m = 48 * u
    if kind in ("intro", "outro"):
        y = H * .3
        text_block(d, heading, m, y, W - 2 * m, 64 * u, (240, 250, 252), True, True)
        for line in bullets:
            y = H * .55 if line is bullets[0] else y
            y = text_block(d, line, m, y, W - 2 * m, 30 * u, accent if line is bullets[0] else (190, 210, 225), False, True) + 8 * u
    else:
        text_block(d, heading, m, m * 1.1, W - 2 * m, 44 * u, (240, 250, 252), True)
        area = (m, H * .2, W - m, H * (.66 if portrait else .68))
        vt = (visual or {}).get("type", "bullets"); labels = (visual or {}).get("labels") or []
        if vt == "receptor": d_receptor(d, area, labels, u, accent, portrait)
        elif vt == "pathway": d_chain(d, area, labels or bullets[:4], u, accent, portrait)
        elif vt == "adme": d_chain(d, area, ["Absorption", "Distribution", "Metabolism", "Excretion"], u, accent, portrait)
        elif vt == "classification": d_tree(d, area, labels or bullets, u, accent, portrait)
        else: d_bullets(d, area, bullets, u, accent)
        if caption:
            by = H * (.72 if portrait else .76)
            d.rounded_rectangle((m * .6, by - 14 * u, W - m * .6, by + 3 * 34 * u * 1.25 + 4 * u), radius=18 * u, fill=(5, 12, 24))
            text_block(d, caption, m, by, W - 2 * m, 34 * u, (255, 255, 255), True, True)
    if watermark:
        f = font(22 * u, watermark, True)
        d.text((W - m - d.textlength(watermark, font=f), H - 52 * u), watermark, font=f, fill=(*accent,))
    return img

def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"{cmd[0]} failed: {p.stderr[-400:]}")
    return p.stdout

def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())

def chunks(text, n):
    words = text.split()
    return [" ".join(words[i:i + n]) for i in range(0, len(words), n)] or [""]

def build_scenes(script, topic, settings):
    wm = settings.get("watermark") or ""
    scenes = [dict(kind="intro", heading=topic, bullets=["Pharmacology explained", f"Level: {settings.get('level', '')}".strip()], narration="", dur=3.0)]
    for s in script.get("sections", []):
        scenes.append(dict(kind="scene", heading=s.get("heading", ""), visual=s.get("visual"), bullets=s.get("bullets", []),
                           narration=s.get("narration", ""), subtitle=s.get("subtitle") or s.get("narration", "")))
    scenes.append(dict(kind="outro", heading="Thank you for watching",
                       bullets=["For education only. Verify with standard references.", f"Made with PharmaAI-VideoStudio by {AUTHOR}"], narration="", dur=4.0))
    return scenes, wm

def render_scene(i, sc, W, H, theme, wm, work, lang, voice, no_voice, warnings):
    out = os.path.join(work, f"scene_{i:02d}.mp4")
    if os.path.exists(out) and os.path.getsize(out) > 1000:  # resume support
        return out
    audio, dur = None, sc.get("dur")
    caption_text = sc.get("subtitle", "")
    if sc["kind"] == "scene":
        if not no_voice and sc["narration"].strip():
            try:
                audio = os.path.join(work, f"voice_{i:02d}.mp3"); tts.synth(sc["narration"], lang, voice, audio); dur = duration(audio) + .6
            except Exception as e:  # graceful fallback: silent scene with subtitles
                warnings.append(f"Scene {i}: narration unavailable ({str(e)[:80]}); rendered silent."); audio = None
        if dur is None:
            dur = max(4.0, len((caption_text or "x").split()) / 2.6 + 1)
    n = 7 if H > W else 12
    parts = chunks(caption_text, n) if sc["kind"] == "scene" else [""]
    total_w = sum(max(1, len(p.split())) for p in parts); lines = []
    for k, p in enumerate(parts):
        png = os.path.join(work, f"f_{i:02d}_{k:02d}.png")
        frame(W, H, theme, sc["heading"], sc.get("visual"), sc.get("bullets", []), p, wm, sc["kind"]).save(png)
        lines += [f"file '{png}'", f"duration {dur * max(1, len(p.split())) / total_w:.3f}"]
    lines.append(lines[-2]); lst = os.path.join(work, f"list_{i:02d}.txt"); open(lst, "w").write("\n".join(lines))
    ain = ["-i", audio] if audio else ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"]
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, *ain,
         "-vf", f"fps=25,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st={max(0, dur - .35):.2f}:d=0.35",
         "-af", "aresample=44100,apad", "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
         "-c:a", "aac", "-ar", "44100", "-ac", "1", out])
    return out

def render_video(script, topic, settings, work, progress=lambda p, s: None):
    """Returns (final_mp4, thumb_jpg, warnings). Raises on failure."""
    os.makedirs(work, exist_ok=True); warnings = []
    fmt = "16:9" if settings.get("format") in ("landscape", "16:9") else "9:16"; res = int(settings.get("resolution", 720))
    W, H = DIMS.get((fmt, res), DIMS[("9:16", 720)])
    scenes, wm = build_scenes(script, topic, settings); files = []
    for i, sc in enumerate(scenes):
        progress(5 + int(80 * i / len(scenes)), f"Rendering scene {i + 1} of {len(scenes)}")
        files.append(render_scene(i, sc, W, H, settings.get("style", "mixed"), wm, work, settings.get("language", "en-IN"),
                                  settings.get("voice", "female"), bool(settings.get("noVoice")), warnings))
    progress(88, "Joining scenes")
    lst = os.path.join(work, "all.txt"); open(lst, "w").write("\n".join(f"file '{f}'" for f in files))
    joined = os.path.join(work, "joined.mp4"); run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    final = os.path.join(work, "final.mp4")
    music = sorted(glob.glob(os.path.join(os.path.dirname(__file__), "assets", "music", "*.mp3")) + glob.glob(os.path.join(os.path.dirname(__file__), "assets", "music", "*.wav")))
    if music:
        progress(93, "Mixing background music")
        run(["ffmpeg", "-y", "-i", joined, "-stream_loop", "-1", "-i", music[0], "-filter_complex",
             "[1:a]volume=0.10[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]", "-map", "0:v", "-map", "[a]",
             "-c:v", "copy", "-c:a", "aac", "-shortest", final])
    else:
        os.replace(joined, final)
    thumb = os.path.join(work, "thumb.jpg")
    frame(W, H, settings.get("style", "mixed"), topic, None, ["Pharmacology explained", AUTHOR], "", wm, "intro").convert("RGB").save(thumb, quality=88)
    return final, thumb, warnings
