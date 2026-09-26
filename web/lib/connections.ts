import { GoogleGenAI, Type } from '@google/genai';
import type { SaveConnection } from '@supermind/core';
import { adminDb } from './firebaseAdmin';
import { cosine } from './embed';

// Feature B — connection write-back.
//
// At enrich time, once a save has an embedding, find the saves it's most
// similar to (the same top-K cosine search the brain map uses) and write a
// short list of connections back onto the save — each labeled with *how* the
// two relate ("extends", "same topic", …). The label comes from one Gemini
// call over the summaries; if that call fails, we still write the cosine-only
// connections with a generic "related" label, so the feature degrades to
// B-lite instead of failing the enrich.
//
// One-directional by design (approach A): only the *new* save gets connections
// written. The brain map still computes edges fresh both ways, and the future
// Lint sweep refreshes older saves' lists.

const MODEL = process.env.ENRICH_MODEL ?? 'gemini-2.5-flash';
const TOP_K = 4; // matches web/app/api/graph/route.ts
const MIN_SIM = 0.4; // matches web/app/api/graph/route.ts

const RELATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    relations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER },
          relation: { type: Type.STRING },
        },
        required: ['index', 'relation'],
      },
    },
  },
  required: ['relations'],
} as const;

const SYSTEM_INSTRUCTION = `You describe how one saved item in a personal knowledge base relates to other saved items it resembles.
You are given a NEW item and a numbered list of RELATED items.
For each related item, return a very short phrase (2-4 words) describing how the NEW item relates to it, from the new item's perspective.
Good phrases: "extends", "same topic", "practical example of", "background for", "similar approach", "counterpoint to", "part of".
Do not invent facts beyond the summaries. If the relationship is unclear, use "related to".`;

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

/** Ask the model for a short relation label per neighbor. Best-effort. */
async function labelRelations(
  self: { title: string; summary: string },
  neighbors: Neighbor[]
): Promise<string[]> {
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
      responseSchema: RELATION_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  });

  const text = res.text ?? '';
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(json) as { relations?: { index: number; relation: string }[] };

  const labels = neighbors.map(() => 'related to');
  for (const r of parsed.relations ?? []) {
    const i = Math.round(r.index) - 1; // 1-based → 0-based
    if (i >= 0 && i < labels.length && typeof r.relation === 'string') {
      labels[i] = r.relation.toLowerCase().trim().replace(/\.$/, '').slice(0, 40) || 'related to';
    }
  }
  return labels;
}

/**
 * Compute connections for a freshly-embedded save. Never throws — returns [] on
 * any failure so the caller can write it without a try/catch of its own.
 */
export async function computeConnections(
  userId: string,
  saveId: string,
  vec: number[],
  self: { title: string; summary: string }
): Promise<SaveConnection[]> {
  try {
    // 1. rank every other vector by cosine similarity.
    const vecSnap = await adminDb().collection(`users/${userId}/vectors`).get();
    const ranked = vecSnap.docs
      .filter((d) => d.id !== saveId && Array.isArray(d.data().v))
      .map((d) => ({ id: d.id, score: cosine(vec, d.data().v as number[]) }))
      .filter((n) => n.score >= MIN_SIM)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);
    if (!ranked.length) return [];

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
    if (!neighbors.length) return [];

    // 3. label the relationships (best-effort — fall back to a generic label).
    let labels: string[];
    try {
      labels = await labelRelations(self, neighbors);
    } catch {
      labels = neighbors.map(() => 'related to');
    }

    return neighbors.map((n, i) => ({
      id: n.id,
      title: n.title,
      score: Number(n.score.toFixed(3)),
      relation: labels[i] ?? 'related to',
    }));
  } catch {
    return [];
  }
}
