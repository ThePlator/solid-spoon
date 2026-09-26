import { GoogleGenAI, Type } from '@google/genai';
import type { SaveConnection, SaveContradiction } from '@supermind/core';
import { adminDb } from './firebaseAdmin';
import { cosine } from './embed';

// Feature B — connection write-back — and Feature B2 — contradiction flagging.
//
// At enrich time, once a save has an embedding, find the saves it's most
// similar to (the same top-K cosine search the brain map uses) and, in ONE
// Gemini call over the summaries, both:
//   B  — label how the new save relates to each ("extends", "same topic", …).
//   B2 — flag any neighbor whose claims *directly contradict* the new save.
// If that call fails, we still write cosine-only connections (generic label)
// and no contradictions, so the feature degrades gracefully instead of
// failing the enrich.
//
// One-directional by design (approach A): only the *new* save gets connections
// and contradictions written. The brain map computes edges fresh both ways, and
// the future Lint sweep refreshes older saves' lists.

const MODEL = process.env.ENRICH_MODEL ?? 'gemini-2.5-flash';
const TOP_K = 4; // matches web/app/api/graph/route.ts
const MIN_SIM = 0.4; // connection floor — matches web/app/api/graph/route.ts
const CONTRA_MIN_SIM = 0.55; // contradiction floor — items must really be about the same thing

const REL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    relations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER },
          relation: { type: Type.STRING },
          // B2: one-sentence description of a direct disagreement, or "" if none.
          contradiction: { type: Type.STRING },
        },
        required: ['index', 'relation'],
      },
    },
  },
  required: ['relations'],
} as const;

const SYSTEM_INSTRUCTION = `You analyze how one saved item in a personal knowledge base relates to other saved items it resembles.
You are given a NEW item and a numbered list of RELATED items.
For each related item, return:
- relation: a very short phrase (2-4 words) describing how the NEW item relates to it, from the new item's perspective. Good phrases: "extends", "same topic", "practical example of", "background for", "similar approach", "counterpoint to", "part of". If unclear, use "related to".
- contradiction: if the NEW item makes a claim that DIRECTLY CONTRADICTS a claim in the related item, a one-sentence description of the specific disagreement. Otherwise the empty string "".
Be conservative about contradictions: most items do NOT contradict. A different topic, scope, focus, or emphasis is NOT a contradiction. Only flag a genuine opposing claim, and only when you can name what disagrees. Do not invent facts beyond the summaries.`;

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  client = new GoogleGenAI({ apiKey });
  return client;
}

interface Neighbor {
  id: string;
  score: number;
  title: string;
  summary: string;
}

interface Analysis {
  relation: string;
  contradiction: string; // "" when none
}

/** One Gemini call → per-neighbor relation label + optional contradiction. */
async function analyzeNeighbors(
  self: { title: string; summary: string },
  neighbors: Neighbor[]
): Promise<Analysis[]> {
  const list = neighbors
    .map((n, i) => `${i + 1}. ${n.title}${n.summary ? ` — ${n.summary}` : ''}`)
    .join('\n');
  const prompt =
    `NEW item: ${self.title}${self.summary ? ` — ${self.summary}` : ''}\n\n` +
    `RELATED items:\n${list}`;

  const res = await gemini().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: REL_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  });

  const text = res.text ?? '';
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(json) as {
    relations?: { index: number; relation: string; contradiction?: string }[];
  };

  const out: Analysis[] = neighbors.map(() => ({ relation: 'related to', contradiction: '' }));
  for (const r of parsed.relations ?? []) {
    const i = Math.round(r.index) - 1; // 1-based → 0-based
    if (i < 0 || i >= out.length) continue;
    if (typeof r.relation === 'string') {
      out[i].relation = r.relation.toLowerCase().trim().replace(/\.$/, '').slice(0, 40) || 'related to';
    }
    if (typeof r.contradiction === 'string') {
      out[i].contradiction = r.contradiction.trim().slice(0, 240);
    }
  }
  return out;
}

export interface EnrichLinks {
  connections: SaveConnection[];
  contradictions: SaveContradiction[];
}

/**
 * Compute connections + contradictions for a freshly-embedded save. Never
 * throws — returns empty arrays on any failure so the caller can write them
 * without a try/catch of its own.
 */
export async function computeConnections(
  userId: string,
  saveId: string,
  vec: number[],
  self: { title: string; summary: string }
): Promise<EnrichLinks> {
  const empty: EnrichLinks = { connections: [], contradictions: [] };
  try {
    // 1. rank every other vector by cosine similarity.
    const vecSnap = await adminDb().collection(`users/${userId}/vectors`).get();
    const ranked = vecSnap.docs
      .filter((d) => d.id !== saveId && Array.isArray(d.data().v))
      .map((d) => ({ id: d.id, score: cosine(vec, d.data().v as number[]) }))
      .filter((n) => n.score >= MIN_SIM)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);
    if (!ranked.length) return empty;

    // 2. fetch neighbor titles + summaries (≤ TOP_K reads).
    const refs = ranked.map((n) => adminDb().doc(`users/${userId}/saves/${n.id}`));
    const docs = await adminDb().getAll(...refs);
    const neighbors: Neighbor[] = [];
    ranked.forEach((n, i) => {
      const doc = docs[i];
      if (!doc?.exists) return; // skip deleted saves
      const dd = doc.data() ?? {};
      neighbors.push({
        id: n.id,
        score: n.score,
        title: (dd.title as string) || 'Untitled',
        summary: (dd.summary as string) || '',
      });
    });
    if (!neighbors.length) return empty;

    // 3. one call → relation labels + contradictions (best-effort).
    let analysis: Analysis[];
    try {
      analysis = await analyzeNeighbors(self, neighbors);
    } catch {
      analysis = neighbors.map(() => ({ relation: 'related to', contradiction: '' }));
    }

    const connections: SaveConnection[] = neighbors.map((n, i) => ({
      id: n.id,
      title: n.title,
      score: Number(n.score.toFixed(3)),
      relation: analysis[i]?.relation ?? 'related to',
    }));

    // Contradictions only count when the two items are genuinely about the same
    // thing (high similarity) AND the model named a specific disagreement.
    const contradictions: SaveContradiction[] = neighbors
      .map((n, i) => ({ n, note: analysis[i]?.contradiction ?? '' }))
      .filter(({ n, note }) => note && n.score >= CONTRA_MIN_SIM)
      .map(({ n, note }) => ({ id: n.id, title: n.title, note }));

    return { connections, contradictions };
  } catch {
    return empty;
  }
}
