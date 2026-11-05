"""Render a sample video without Supabase: python selftest.py [9:16|16:9] [lang]"""
import json, sys, time
import render
fmt = sys.argv[1] if len(sys.argv) > 1 else "9:16"
t = time.time()
f, th, w = render.render_video(json.load(open("sample_script.json")), "Propranolol",
    {"format": fmt, "resolution": 720, "noVoice": True, "watermark": "COREGENIX", "level": "B.Pharm", "style": "mixed"},
    f"/tmp/selftest_{fmt.replace(':', 'x')}", lambda p, s: print(p, s))
print(f, th, w, round(time.time() - t, 1), "s")
