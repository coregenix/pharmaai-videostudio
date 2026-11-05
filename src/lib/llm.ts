import { SECTIONS, type Script, type Settings } from "./options";

const WORDS_PER_SEC = 2.3;
type Provider = { name: string; enabled: () => boolean; call: (system: string, user: string) => Promise<string> };

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

export const providers: Record<string, Provider> = {
  gemini: {
    name: "gemini", enabled: () => !!process.env.GEMINI_API_KEY,
    call: async (system, user) => {
      const m = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const j = await post(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      });
      return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    },
  },
  groq: {
    name: "groq", enabled: () => !!process.env.GROQ_API_KEY,
    call: async (system, user) => {
      const j = await post("https://api.groq.com/openai/v1/chat/completions", {
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", temperature: 0.3, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }, { Authorization: `Bearer ${process.env.GROQ_API_KEY}` });
      return j.choices?.[0]?.message?.content ?? "";
    },
  },
  ollama: {
    name: "ollama", enabled: () => !!process.env.OLLAMA_URL,
    call: async (system, user) => {
      const j = await post(`${process.env.OLLAMA_URL!.replace(/\/$/, "")}/api/chat`, {
        model: process.env.OLLAMA_MODEL || "llama3.1", stream: false, format: "json",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      return j.message?.content ?? "";
    },
  },
};

export function configuredProviders() {
  return (process.env.LLM_PROVIDERS || "gemini,groq,ollama").split(",").map((s) => s.trim()).filter((n) => providers[n]).map((n) => ({ name: n, enabled: providers[n].enabled() }));
}

const SYSTEM = `You are a pharmacology educator writing scripts for short educational videos for pharmacy students.
Rules you must follow:
- Educational content only. Never give individualized treatment advice.
- Do not state drug doses unless they are standard textbook values; if you include any number, add a flag for the user to verify it against a standard reference.
- Do not invent mechanisms, trials or statistics. If unsure, say so in a flag. Distinguish established clinical evidence from hypotheses.
- References: only name standard textbooks or guidelines you are confident exist (e.g. "Goodman & Gilman's The Pharmacological Basis of Therapeutics", "Katzung Basic & Clinical Pharmacology", "Rang & Dale's Pharmacology", "KD Tripathi Essentials of Medical Pharmacology"). No URLs, no DOIs, no page numbers, no invented papers.
- Respond with JSON only.`;

export async function generateScript(topic: string, s: Settings): Promise<Script> {
  const total = Math.round(s.duration * WORDS_PER_SEC), per = Math.max(12, Math.round(total / SECTIONS.length));
  const langNote = s.language === "hi" ? "Write narration in Hindi (Devanagari). Keep drug names in English." : s.language === "hinglish" ? "Write narration in Hinglish: Hindi in Latin script mixed with English terms." : "Write narration in clear Indian English.";
  const user = `Topic: ${topic}
Audience level: ${s.level}. ${langNote}
Create exactly ${SECTIONS.length} sections with these keys in order: ${SECTIONS.map(([k]) => k).join(", ")}.
Each section's narration should be about ${per} words (whole video about ${total} words).
JSON shape:
{"title":string,
 "sections":[{"key":string,"heading":string,"narration":string,"bullets":[2-4 short strings],
   "visual":{"type":"bullets|receptor|pathway|adme|classification","labels":[short strings, max 5 words each]},
   "flags":[{"claim":string,"note":"why it needs checking"}]}],
 "references":[{"text":string}],
 "youtube":{"title":string,"description":string,"tags":[string]}}
Visual guidance: mechanism -> "receptor" with labels [drug, receptor, response]; classification -> "classification" with labels [root, ...subclasses]; pharmacokinetics content -> "adme"; stepwise pathways -> "pathway".`;
  const order = configuredProviders().filter((p) => p.enabled);
  if (!order.length) throw new Error("No LLM provider configured. Set GEMINI_API_KEY or GROQ_API_KEY (or OLLAMA_URL) on the server.");
  const errors: string[] = [];
  for (const p of order) {
    try {
      const raw = (await providers[p.name].call(SYSTEM, user)).replace(/```json|```/g, "").trim();
      return normalize(JSON.parse(raw), topic, p.name);
    } catch (e) { errors.push(`${p.name}: ${(e as Error).message}`); }
  }
  throw new Error(`All LLM providers failed. ${errors.join(" | ")}`);
}

function normalize(j: any, topic: string, provider: string): Script {
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  const sections = arr(j.sections).map((s: any, i: number) => ({
    key: String(s.key ?? SECTIONS[i]?.[0] ?? `s${i}`), heading: String(s.heading ?? SECTIONS[i]?.[1] ?? "Section"),
    narration: String(s.narration ?? ""), bullets: arr(s.bullets).map(String).slice(0, 5),
    visual: { type: ["bullets", "receptor", "pathway", "adme", "classification"].includes(s.visual?.type) ? s.visual.type : "bullets", labels: arr(s.visual?.labels).map(String).slice(0, 6) },
    flags: arr(s.flags).map((f: any) => ({ claim: String(f.claim ?? ""), note: String(f.note ?? "") })),
  }));
  if (!sections.length) throw new Error("Model returned no sections");
  return {
    title: String(j.title ?? topic), sections,
    // Anything the model lists is a suggestion, never a verified citation.
    references: arr(j.references).map((r: any) => ({ text: String(r.text ?? r), status: "unverified" as const })),
    youtube: { title: String(j.youtube?.title ?? topic), description: String(j.youtube?.description ?? ""), tags: arr(j.youtube?.tags).map(String) },
    reviewed: false, provider,
  };
}
