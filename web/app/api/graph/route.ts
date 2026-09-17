import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { cosine } from '@/lib/embed';

// GET /api/graph  Authorization: Bearer <firebase id token>
//
// Returns the brain-map graph: every save as a node (with the details the map's
// info panel needs), plus edges to each node's top-K most similar saves. Nodes
// are grouped into clusters via label propagation over the similarity graph, so
// the map can color-code "regions" of the library. Similarity is computed in
// memory — fine for a personal library, no vector index needed.

export const runtime = 'nodejs';
export const maxDuration = 30;

const TOP_K = 4;
const MIN_SIM = 0.4;

// Distinct-but-harmonious palette for clusters on the near-black canvas.
const PALETTE = ['#ccff00', '#7dd3fc', '#f0abfc', '#fca5a5', '#fcd34d', '#86efac', '#c4b5fd', '#fdba74'];

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

  interface Node {
    id: string; title: string; type: string; source: string; url: string | null;
    thumbnailUrl: string | null; summary: string | null; tags: string[];
    hasVector: boolean; degree: number; cluster: number; color: string;
  }

  const nodes: Node[] = savesSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      title: (x.title as string) || 'Untitled',
      type: (x.type as string) || 'link',
      source: (x.source as string) || '',
      url: (x.url as string) ?? null,
      thumbnailUrl: (x.thumbnailUrl as string) ?? null,
      summary: ((x.summary as string) ?? '').slice(0, 300) || null,
      tags: [...((x.tags as string[]) ?? []), ...((x.aiTags as string[]) ?? [])].slice(0, 8),
      hasVector: vectors.has(d.id),
      degree: 0,
      cluster: 0,
      color: PALETTE[0],
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Top-K neighbors per node → undirected edges + adjacency for clustering.
  const ids = [...vectors.keys()];
  const seen = new Set<string>();
  const edges: { source: string; target: string; weight: number }[] = [];
  const adj = new Map<string, { b: string; w: number }[]>(ids.map((id) => [id, []]));

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
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: a, target: b, weight: Number(s.toFixed(3)) });
      }
      adj.get(a)!.push({ b, w: s });
    }
  }

  // Degree per node (from undirected edges).
  for (const e of edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (s) s.degree++;
    if (t) t.degree++;
  }

  // Label-propagation clustering over the weighted similarity graph.
  const label = new Map<string, string>(ids.map((id) => [id, id]));
  for (let iter = 0; iter < 6; iter++) {
    for (const id of ids) {
      const tally = new Map<string, number>();
      for (const { b, w } of adj.get(id)!) {
        const l = label.get(b)!;
        tally.set(l, (tally.get(l) ?? 0) + w);
      }
      let best = label.get(id)!;
      let bestW = -1;
      for (const [l, w] of tally) if (w > bestW) { bestW = w; best = l; }
      label.set(id, best);
    }
  }
  // Map distinct labels → cluster index → color.
  const clusterIndex = new Map<string, number>();
  for (const id of ids) {
    const l = label.get(id)!;
    if (!clusterIndex.has(l)) clusterIndex.set(l, clusterIndex.size);
    const ci = clusterIndex.get(l)!;
    const n = byId.get(id);
    if (n) { n.cluster = ci; n.color = PALETTE[ci % PALETTE.length]; }
  }

  return NextResponse.json(
    { nodes, edges, clusters: clusterIndex.size },
    { headers: { 'Cache-Control': 'private, max-age=60' } }
  );
}
