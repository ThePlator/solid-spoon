import { GoogleGenAI, Type } from '@google/genai';
import { FieldValue } from 'firebase-admin/firestore';
import { buildSearchTokens } from '@supermind/core';
import { adminDb } from './firebaseAdmin';
import { extractContent } from './extract';

// Core enrichment step, reused by /api/enrich (per-save) and /api/enrich-sweep
// (batch backstop). Reads a save, asks Gemini for a summary + tags, and writes
// the result back. Idempotent: a save already `done` is left untouched.

const MODEL = process.env.ENRICH_MODEL ?? 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You organize a personal "second brain" of saved links, articles, and notes.
For each item you are given, produce:
- summary: 1-3 concise sentences capturing what it is and why someone would keep it. Plain text, no markdown, no preamble.
- tags: 2-6 short lowercase topical tags (single or hyphenated words, no "#"). Prefer broad, reusable categories over hyper-specific ones.
If the content is too thin to summarize meaningfully, return an empty summary and empty tags.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'tags'],
} as const;

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  client = new GoogleGenAI({ apiKey });
  return client;
}

interface SaveDoc {
  title?: string;
  text?: string;
  url?: string | null;
  type?: string;
  tags?: string[];
  enrichStatus?: string;
}

/** Build the model input from a save's fields plus any extracted page content. */
function buildPrompt(d: SaveDoc, extracted: string): string {
  const parts: string[] = [];
  if (d.title) parts.push(`Title: ${d.title}`);
  if (d.url) parts.push(`URL: ${d.url}`);
  if (d.type) parts.push(`Type: ${d.type}`);
  if (d.text) parts.push(`Note: ${d.text.slice(0, 2000)}`);
  if (extracted) parts.push(`Page content:\n${extracted}`);
  return parts.join('\n');
}

interface Enrichment {
  summary: string;
  tags: string[];
}

/** Retry the model call on transient errors (503 overloaded / 429 rate limit). */
async function generateWithRetry(prompt: string, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini().models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      });
    } catch (err) {
      const e = err as { status?: number; message?: string };
      const transient =
        e.status === 503 || e.status === 429 ||
        /unavailable|overloaded|high demand|rate limit/i.test(e.message ?? '');
      if (!transient || attempt >= retries - 1) throw err;
      // Exponential-ish backoff: 0.6s, 1.2s, 1.8s.
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

async function callGemini(prompt: string): Promise<Enrichment> {
  const res = await generateWithRetry(prompt);

  const text = res.text;
  if (!text) return { summary: '', tags: [] };

  // Most models honor responseMimeType and return bare JSON, but some (e.g.
  // gemini-3.x) wrap it in a ```json fence or add prose. Extract the object.
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

  const parsed = JSON.parse(json) as Enrichment;
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((t) => String(t).toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  return { summary, tags };
}

/**
 * Enrich one save. Returns the outcome so callers can log/skip.
 * `already` — was already enriched; nothing to do.
 */
export async function enrichSave(
  userId: string,
  saveId: string
): Promise<'done' | 'skipped' | 'already' | 'missing'> {
  const ref = adminDb().doc(`users/${userId}/saves/${saveId}`);
  const snap = await ref.get();
  if (!snap.exists) return 'missing';

  const d = snap.data() as SaveDoc;
  if (d.enrichStatus === 'done') return 'already';

  // Fetch the real page content for links so the summary reflects what's on the
  // page, not just the URL. Best-effort: returns '' on failure.
  const extracted = d.type === 'link' && d.url ? await extractContent(d.url) : '';
  const prompt = buildPrompt(d, extracted);
  if (!prompt.trim()) {
    await ref.update({ enrichStatus: 'skipped', enrichedAt: FieldValue.serverTimestamp() });
    return 'skipped';
  }

  try {
    const { summary, tags } = await callGemini(prompt);
    // Fold the AI tags into searchTokens so the save is findable by them —
    // searchTokens now covers title, text, user tags, AND AI tags.
    const allTags = [...(d.tags ?? []), ...tags];
    const searchTokens = buildSearchTokens(d.title ?? '', d.text ?? '', allTags);
    await ref.update({
      summary: summary || null,
      aiTags: tags,
      searchTokens,
      enrichStatus: summary || tags.length ? 'done' : 'skipped',
      enrichedAt: FieldValue.serverTimestamp(),
    });
    return summary || tags.length ? 'done' : 'skipped';
  } catch (err) {
    await ref.update({ enrichStatus: 'error', enrichedAt: FieldValue.serverTimestamp() });
    throw err;
  }
}
