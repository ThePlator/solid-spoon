// Batch-enrich every save still stuck at enrichStatus: "pending".
//
// A local stand-in for the Vercel cron sweep — useful before the app is
// deployed, or to backfill after downtime. Runs entirely from the server-side
// env in web/.env.local (service account + Gemini key).
//
//   node --env-file=.env.local scripts/enrich-pending.mjs
//   npm run enrich:pending
//
// Unlike the deployed sweep it queries per-user (no collection-group index
// required), so it works even before `firebase deploy --only firestore:indexes`.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';

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
const MODEL = process.env.ENRICH_MODEL ?? 'gemini-2.5-flash';

const buildSearchTokens = (title, text, tags = []) =>
  Array.from(
    new Set(
      `${title} ${text} ${tags.join(' ')}`
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((t) => t.length >= 2)
    )
  ).slice(0, 100);

const SCHEMA = {
  type: Type.OBJECT,
  properties: { summary: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } },
  required: ['summary', 'tags'],
};

async function main() {
  const users = await db.collection('users').listDocuments();
  const pending = [];
  for (const u of users) {
    const s = await u.collection('saves').where('enrichStatus', '==', 'pending').get();
    s.docs.forEach((d) => pending.push(d));
  }
  console.log(`Pending saves: ${pending.length}`);

  for (const d of pending) {
    const x = d.data();
    const parts = [];
    if (x.title) parts.push(`Title: ${x.title}`);
    if (x.url) parts.push(`URL: ${x.url}`);
    if (x.type) parts.push(`Type: ${x.type}`);
    if (x.text) parts.push(`Content:\n${x.text.slice(0, 12000)}`);
    const prompt = parts.join('\n');

    if (!prompt.trim()) {
      await d.ref.update({ enrichStatus: 'skipped', enrichedAt: FieldValue.serverTimestamp() });
      console.log(`- skipped (empty): ${d.id}`);
      continue;
    }

    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You organize a personal second brain. Return a 1-3 sentence summary and 2-6 short lowercase tags.',
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      });
      const cleaned = res.text.replace(/```json\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
      const tags = (parsed.tags ?? []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 6);
      const allTags = [...(x.tags ?? []), ...tags];
      await d.ref.update({
        summary: parsed.summary || null,
        aiTags: tags,
        searchTokens: buildSearchTokens(x.title ?? '', x.text ?? '', allTags),
        enrichStatus: parsed.summary || tags.length ? 'done' : 'skipped',
        enrichedAt: FieldValue.serverTimestamp(),
      });
      console.log(`- done: ${(x.title ?? '').slice(0, 50)}`);
    } catch (err) {
      await d.ref.update({ enrichStatus: 'error', enrichedAt: FieldValue.serverTimestamp() });
      console.log(`- ERROR: ${d.id} — ${err.message?.slice(0, 100)}`);
    }
  }
  console.log('Done.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
