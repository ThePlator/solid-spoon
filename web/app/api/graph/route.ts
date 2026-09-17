import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { cosine } from '@/lib/embed';

// GET /api/graph  Authorization: Bearer <firebase id token>
//
// Returns the brain-map graph for the caller: every save as a node, plus edges
// to each node's top-K most similar saves (cosine similarity over stored
// embeddings). Similarity is computed in memory — fine for a personal library;
// no Firestore vector index needed (that's only for nearest-to-a-query search).

export const runtime = 'nodejs';
export const maxDuration = 30;

const TOP_K = 4;         // neighbors linked per node
const MIN_SIM = 0.4;     // ignore weak links (Gemini embeddings have a high baseline)

const TYPE_COLORS: Record<string, string> = {
  link: '#ccff00',
  note: '#7dd3fc',
  image: '#f0abfc',
};

export async function GET(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  const db = adminDb();
  const [savesSnap, vecSnap] = await Promise.all([
    db.collection(`users/${uid}/saves`).get(),
    db.collection(`users/${uid}/vectors`).get(),
  ]);

  const vectors = new Map<string, number[]>();
  vecSnap.forEach((d) => {
    const v = d.data().v as number[] | undefined;
    if (Array.isArray(v)) vectors.set(d.id, v);
  });

  const nodes = savesSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      title: (x.title as string) || 'Untitled',
      type: (x.type as string) || 'link',
      color: TYPE_COLORS[x.type as string] ?? '#ccff00',
      tags: (x.aiTags as string[]) ?? [],
      hasVector: vectors.has(d.id),
    };
  });

  // Top-K neighbors per node, deduped into undirected edges.
  const ids = [...vectors.keys()];
  const seen = new Set<string>();
  const edges: { source: string; target: string; weight: number }[] = [];

  for (const a of ids) {
    const va = vectors.get(a)!;
    const sims = ids
      .filter((b) => b !== a)
      .map((b) => ({ b, s: cosine(va, vectors.get(b)!) }))
      .filter((x) => x.s >= MIN_SIM)
      .sort((x, y) => y.s - x.s)
      .slice(0, TOP_K);

    for (const { b, s } of sims) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: a, target: b, weight: Number(s.toFixed(3)) });
    }
  }

  return NextResponse.json({ nodes, edges });
}
