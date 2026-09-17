// Backfill embeddings for the brain map. Embeds every save that doesn't yet
// have a vector in users/{uid}/vectors/{saveId}, using its title + summary +
// AI tags. Safe to re-run — skips saves already embedded.
//
//   node --env-file=.env.local scripts/embed-backfill.mjs
//   npm run embed:backfill

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

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
const MODEL = process.env.EMBED_MODEL ?? 'gemini-embedding-001';
const DIMS = 768;

async function embed(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const r = await ai.models.embedContent({
    model: MODEL,
    contents: t.slice(0, 8000),
    config: { outputDimensionality: DIMS, taskType: 'SEMANTIC_SIMILARITY' },
  });
  return r.embeddings?.[0]?.values ?? null;
}

async function main() {
  const users = await db.collection('users').listDocuments();
  let embedded = 0;
  let skipped = 0;
  for (const u of users) {
    const saves = await u.collection('saves').get();
    for (const doc of saves.docs) {
      const vref = u.collection('vectors').doc(doc.id);
      if ((await vref.get()).exists) { skipped++; continue; }
      const x = doc.data();
      const text = [x.title, x.summary, (x.aiTags || []).join(' ')].filter(Boolean).join('\n');
      const vec = await embed(text);
      if (!vec) { console.log('- no text, skipped:', doc.id); continue; }
      await vref.set({ v: vec, model: MODEL, dims: vec.length, at: FieldValue.serverTimestamp() });
      console.log('- embedded:', (x.title || '').slice(0, 45));
      embedded++;
    }
  }
  console.log(`\nDone. Embedded: ${embedded}, already had vectors: ${skipped}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
