"""Pluggable text-to-speech. 'edge' uses the unofficial Edge read-aloud service via edge-tts (free, may change
or be rate-limited without notice). 'none' disables narration. Add a provider by extending synth()."""
import asyncio, os

VOICES = {
    ("en-IN", "male"): "en-IN-PrabhatNeural", ("en-IN", "female"): "en-IN-NeerjaNeural", ("en-IN", "narrator"): "en-US-GuyNeural",
    ("hi", "male"): "hi-IN-MadhurNeural", ("hi", "female"): "hi-IN-SwaraNeural", ("hi", "narrator"): "hi-IN-MadhurNeural",
    # Hinglish is Hindi written in Latin script; Indian-English voices read it most naturally.
    ("hinglish", "male"): "en-IN-PrabhatNeural", ("hinglish", "female"): "en-IN-NeerjaNeural", ("hinglish", "narrator"): "en-US-GuyNeural",
}

def provider() -> str:
    return os.getenv("TTS_PROVIDER", "edge")

def synth(text: str, lang: str, voice: str, out_path: str) -> None:
    if provider() == "none":
        raise RuntimeError("TTS_PROVIDER=none")
    import edge_tts
    name = VOICES.get((lang, voice), VOICES[("en-IN", "female")])
    asyncio.run(edge_tts.Communicate(text, name).save(out_path))
