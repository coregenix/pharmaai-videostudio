export const FORMATS = [
  { v: "shorts", l: "YouTube Shorts (9:16)" }, { v: "landscape", l: "YouTube landscape (16:9)" }, { v: "reels", l: "Instagram Reels (9:16)" },
];
export const DURATIONS = [{ v: 30, l: "30 seconds" }, { v: 60, l: "60 seconds" }, { v: 180, l: "3 minutes" }, { v: 300, l: "5 minutes" }, { v: 600, l: "10 minutes" }];
export const LEVELS = ["Beginner", "D.Pharm", "B.Pharm", "M.Pharm", "GPAT", "Research level"];
export const LANGUAGES = [{ v: "en-IN", l: "Indian English" }, { v: "hi", l: "Hindi" }, { v: "hinglish", l: "Hinglish" }];
export const VOICES = [{ v: "male", l: "Indian male" }, { v: "female", l: "Indian female" }, { v: "narrator", l: "Professional narrator" }];
export const STYLES = [
  { v: "2d", l: "2D animation" }, { v: "3d", l: "3D-style medical illustration" }, { v: "infographic", l: "Scientific infographic" },
  { v: "mechanism", l: "Animated mechanism diagram" }, { v: "mixed", l: "Mixed educational" },
];
export const VISUAL_TYPES = [
  { v: "bullets", l: "Key points" }, { v: "receptor", l: "Drug–receptor interaction" }, { v: "pathway", l: "Pathway / flow" },
  { v: "adme", l: "ADME diagram" }, { v: "classification", l: "Classification tree" },
];
export const SECTIONS = [
  ["introduction", "Introduction"], ["definition", "Definition"], ["classification", "Classification"], ["mechanism", "Mechanism of action"],
  ["effects", "Pharmacological effects"], ["uses", "Therapeutic applications"], ["adverse", "Adverse effects"],
  ["exam", "Important examination points"], ["conclusion", "Conclusion"],
] as const;

export type Settings = {
  format: string; duration: number; level: string; language: string; voice: string; style: string; noVoice: boolean; watermark: string;
};
export type Section = {
  key: string; heading: string; narration: string; subtitle?: string; bullets: string[];
  visual: { type: string; labels: string[] }; flags: { claim: string; note: string }[];
};
export type Script = {
  title: string; sections: Section[]; references: { text: string; status: "unverified" }[];
  youtube: { title: string; description: string; tags: string[] }; reviewed?: boolean; provider?: string;
};
export type Project = {
  id: string; topic: string; settings: Settings; script: Script | null; status: string;
  video_path: string | null; thumb_path: string | null; created_at: string; updated_at: string;
};
export type Job = { id: string; status: string; stage: string; progress: number; resolution: number; warnings: string[]; error: string | null };
