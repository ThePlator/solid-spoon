// Backfill connections (Feature B) and contradictions (Feature B2) for existing
// saves. For every save that has an embedding, finds its top-K most similar
// saves and writes a labeled `connections` array plus any `contradictions` back
// onto it. New saves get this automatically at enrich time; this backfills the
// library that was saved before the features shipped.
//
//   node --env-file=.env.local scripts/connections-backfill.mjs [--force] [--limit N]
//   npm run connections:backfill
//
// Idempotent: skips saves that already have connections unless --force.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';

const FORCE = process.argv.includes('--force');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const TOP_K = 4;
const MIN_SIM = 0.4;
const CONTRA_MIN_SIM = 0.55;
const MODEL = process.env.ENRICH_MODEL ?? 'gemini-2.5-flash';

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert({
    projectId: svc.project_id,
    clientEmail: svc.client_email,
    privateKey: svc.private_key.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You analyze how one saved item in a personal knowledge base relates to other saved items it resembles.
You are given a NEW item and a numbered list of RELATED items.
For each related item, return:
- relation: a very short phrase (2-4 words) describing how the NEW item relates to it, from the new item's perspective. Good phrases: "extends", "same topic", "practical example of", "background for", "similar approach", "counterpoint to", "part of". If unclear, use "related to".
- contradiction: if the NEW item makes a claim that DIRECTLY CONTRADICTS a claim in the related item, a one-sentence description of the specific disagreement. Otherwise the empty string "".
Be conservative about contradictions: most items do NOT contradict. A different topic, scope, focus, or emphasis is NOT a contradiction. Only flag a genuine opposing claim, and only when you can name what disagrees. Do not invent facts beyond the summaries.`;

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
          contradiction: { type: Type.STRING },
        },
        required: ['index', 'relation'],
      },
    },
  },
  required: ['relations'],
};

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

async function analyzeNeighbors(self, neighbors) {
  const list = neighbors
    .map((n, i) => `${i + 1}. ${n.title}${n.summary ? ` — ${n.summary}` : ''}`)
    .join('\n');
  const prompt =
    `NEW item: ${self.title}${self.summary ? ` — ${self.summary}` : ''}\n\nRELATED items:\n${list}`;
  const fallback = neighbors.map(() => ({ relation: 'related to', contradiction: '' }));
  try {
    const res = await ai.models.generateContent({
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
    const cleaned = (res.text ?? '').replace(/```json\s*|\s*```/g, '').trim();
    const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
    const parsed = JSON.parse(s !== -1 && e !== -1 ? cleaned.slice(s, e + 1) : cleaned);
    const out = neighbors.map(() => ({ relation: 'related to', contradiction: '' }));
    for (const r of parsed.relations ?? []) {
      const i = Math.round(r.index) - 1;
      if (i < 0 || i >= out.length) continue;
      if (typeof r.relation === 'string') {
        out[i].relation = r.relation.toLowerCase().trim().replace(/\.$/, '').slice(0, 40) || 'related to';
      }
      if (typeof r.contradiction === 'string') out[i].contradiction = r.contradiction.trim().slice(0, 240);
    }
    return out;
  } catch {
    return fallback;
  }
}

async function main() {
  const users = await db.collection('users').listDocuments();
  let written = 0, skipped = 0, empty = 0, flagged = 0;

  for (const u of users) {
    const uid = u.id;
    const [savesSnap, vecSnap] = await Promise.all([
      db.collection(`users/${uid}/saves`).get(),
      db.collection(`users/${uid}/vectors`).get(),
    ]);
    const saves = new Map(savesSnap.docs.map((d) => [d.id, d.data()]));
    const vectors = new Map();
    vecSnap.forEach((d) => { const v = d.data().v; if (Array.isArray(v)) vectors.set(d.id, v); });

    for (const [id, data] of saves) {
      if (written + skipped + empty >= LIMIT) break;
      const vec = vectors.get(id);
      if (!vec) continue;
      if (!FORCE && Array.isArray(data.connections) && data.connections.length) { skipped++; continue; }

      const ranked = [...vectors.entries()]
        .filter(([nid]) => nid !== id)
        .map(([nid, nv]) => ({ id: nid, score: cosine(vec, nv) }))
        .filter((n) => n.score >= MIN_SIM)
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K);

      const neighbors = ranked
        .map((n) => ({ id: n.id, score: n.score, data: saves.get(n.id) }))
        .filter((n) => n.data)
        .map((n) => ({ id: n.id, score: n.score, title: n.data.title || 'Untitled', summary: n.data.summary || '' }));

      if (!neighbors.length) {
        await db.doc(`users/${uid}/saves/${id}`).update({ connections: [], contradictions: [] });
        empty++;
        continue;
      }

      const analysis = await analyzeNeighbors({ title: data.title || '', summary: data.summary || '' }, neighbors);
      const connections = neighbors.map((n, i) => ({
        id: n.id, title: n.title, score: Number(n.score.toFixed(3)), relation: analysis[i]?.relation ?? 'related to',
      }));
      const contradictions = neighbors
        .map((n, i) => ({ n, note: analysis[i]?.contradiction ?? '' }))
        .filter(({ n, note }) => note && n.score >= CONTRA_MIN_SIM)
        .map(({ n, note }) => ({ id: n.id, title: n.title, note }));

      await db.doc(`users/${uid}/saves/${id}`).update({ connections, contradictions });
      written++;
      if (contradictions.length) flagged++;
      const preview = connections.map((c) => `${c.relation} → "${c.title}" (${Math.round(c.score * 100)}%)`).join('; ');
      console.log(`✓ ${(data.title || id).slice(0, 48)}\n    ${preview}`);
      for (const c of contradictions) console.log(`    ⚠ contradicts "${c.title}": ${c.note}`);
    }
  }

  console.log(`\nDone. ${written} save(s) updated (${flagged} with contradictions), ${empty} had no neighbors, ${skipped} already done.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
