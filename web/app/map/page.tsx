'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const BrainGraph = dynamic(() => import('@/components/BrainGraph'), { ssr: false });

interface GNode {
  id: string; title: string; type: string; source: string; url: string | null;
  thumbnailUrl: string | null; summary: string | null; tags: string[];
  degree: number; cluster: number; color: string;
}
interface GEdge { source: string; target: string; weight: number }
interface Graph { nodes: GNode[]; edges: GEdge[]; clusters: number }

const CACHE_TTL = 60 * 60 * 1000; // 1h

function MapView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const urlToken = params.get('token');
  const embedded = params.get('embed') === '1' || !!urlToken;

  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [sel, setSel] = useState<GNode | null>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight - (embedded ? 0 : 56) });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [embedded]);

  useEffect(() => {
    if (!urlToken && !loading && !user) router.replace('/login');
  }, [urlToken, user, loading, router]);

  const cacheKey = useMemo(() => `supermind.graph.${user?.uid ?? 'webview'}`, [user?.uid]);

  const fetchGraph = useCallback(async (force: boolean) => {
    try {
      const token = urlToken ?? (user ? await user.getIdToken() : null);
      if (!token) return;
      // Serve from cache unless forced or stale.
      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const { at, data } = JSON.parse(raw);
            if (Date.now() - at < CACHE_TTL) { setGraph(data); return; }
          }
        } catch { /* ignore cache read errors */ }
      }
      if (force) setRebuilding(true);
      const res = await fetch('/api/graph', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`graph ${res.status}`);
      const data = (await res.json()) as Graph;
      setGraph(data);
      try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data })); } catch { /* quota */ }
    } catch {
      setError('Could not load your map.');
    } finally {
      setRebuilding(false);
    }
  }, [urlToken, user, cacheKey]);

  useEffect(() => { if (urlToken || user) fetchGraph(false); }, [urlToken, user, fetchGraph]);

  const data = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    return { nodes: graph.nodes.map((n) => ({ ...n })), links: graph.edges.map((e) => ({ ...e })) };
  }, [graph]);

  // Neighbor set for focus-mode dimming.
  const neighborIds = useMemo(() => {
    if (!sel || !graph) return null;
    const set = new Set<string>([sel.id]);
    graph.edges.forEach((e) => {
      if (e.source === sel.id) set.add(e.target);
      if (e.target === sel.id) set.add(e.source);
    });
    return set;
  }, [sel, graph]);

  const related = useMemo(() => {
    if (!sel || !graph) return [];
    return graph.edges
      .filter((e) => e.source === sel.id || e.target === sel.id)
      .map((e) => ({ id: e.source === sel.id ? e.target : e.source, weight: e.weight }))
      .sort((a, b) => b.weight - a.weight)
      .map((r) => ({ ...r, node: graph.nodes.find((n) => n.id === r.id) }))
      .filter((r) => r.node);
  }, [sel, graph]);

  function openSave(id: string) {
    const rnw = (window as any).ReactNativeWebView;
    if (rnw) rnw.postMessage(JSON.stringify({ type: 'openSave', id }));
    else router.push(`/item/${id}`);
  }

  if (!urlToken && (loading || !user)) return null;

  return (
    <div className="map-wrap">
      {!embedded && (
        <div className="map-bar">
          <Link href="/library" className="back">← library</Link>
          <span className="map-title">Brain map</span>
          <span className="map-meta">{graph ? `${graph.nodes.length} nodes · ${graph.clusters} clusters` : ''}</span>
        </div>
      )}

      {/* floating controls */}
      {graph && (
        <div className="map-ctrl">
          <button onClick={() => fgRef.current?.zoomToFit?.(500, 60)} title="Fit">⤢</button>
          <button onClick={() => fetchGraph(true)} disabled={rebuilding} title="Rebuild">{rebuilding ? '…' : '↻'}</button>
        </div>
      )}

      {error ? (
        <div className="map-empty">{error}</div>
      ) : !graph ? (
        <div className="map-empty">Mapping your mind…</div>
      ) : graph.nodes.length === 0 ? (
        <div className="map-empty">Nothing to map yet — save a few things first.</div>
      ) : (
        <BrainGraph
          innerRef={fgRef}
          width={size.w}
          height={size.h}
          graphData={data}
          backgroundColor="#0a0a0b"
          onBackgroundClick={() => setSel(null)}
          onNodeClick={(n: any) => setSel(n as GNode)}
          cooldownTicks={120}
          onEngineStop={() => fgRef.current?.zoomToFit?.(500, 60)}
          linkColor={(l: any) => {
            if (neighborIds) {
              const on = neighborIds.has(l.source.id ?? l.source) && neighborIds.has(l.target.id ?? l.target);
              return on ? `rgba(204,255,0,${0.2 + 0.5 * (l.weight ?? 0.4)})` : 'rgba(120,120,130,0.05)';
            }
            return `rgba(160,160,170,${0.06 + 0.2 * (l.weight ?? 0.4)})`;
          }}
          linkWidth={(l: any) => 0.4 + 1.8 * (l.weight ?? 0.4)}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const dim = neighborIds ? !neighborIds.has(node.id) : false;
            const r = 3 + Math.min(6, (node.degree ?? 0) * 1.1);
            ctx.globalAlpha = dim ? 0.18 : 1;
            // glow
            ctx.shadowColor = node.color || '#ccff00';
            ctx.shadowBlur = dim ? 0 : 12;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = node.color || '#ccff00';
            ctx.fill();
            ctx.shadowBlur = 0;
            if (node.id === sel?.id) {
              ctx.lineWidth = 1.5 / globalScale;
              ctx.strokeStyle = '#f4f4f2';
              ctx.stroke();
            }
            if ((globalScale > 1.3 || (node.degree ?? 0) >= 4) && !dim) {
              const label = String(node.title).slice(0, 26);
              ctx.font = `${11 / globalScale}px ui-sans-serif, system-ui`;
              ctx.fillStyle = 'rgba(244,244,242,0.8)';
              ctx.textAlign = 'center';
              ctx.fillText(label, node.x, node.y + r + 9 / globalScale);
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}

      {/* info panel */}
      {sel && (
        <div className="map-panel">
          <button className="map-panel-x" onClick={() => setSel(null)}>✕</button>
          <span className="map-panel-type" style={{ color: sel.color }}>{sel.type.toUpperCase()}</span>
          <h3 className="map-panel-title">{sel.title}</h3>
          {sel.source && <div className="map-panel-src">{sel.source}</div>}
          {sel.summary && <p className="map-panel-summary">{sel.summary}</p>}
          {sel.tags.length > 0 && (
            <div className="map-panel-tags">{sel.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          )}
          {related.length > 0 && (
            <div className="map-panel-related">
              <span className="label">Related</span>
              {related.slice(0, 5).map((r) => (
                <button key={r.id} className="map-related-row" onClick={() => setSel(r.node as GNode)}>
                  <span className="map-related-title">{r.node!.title}</span>
                  <span className="map-related-score">{Math.round(r.weight * 100)}%</span>
                </button>
              ))}
            </div>
          )}
          <button className="primary map-panel-open" onClick={() => openSave(sel.id)}>Open →</button>
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="map-empty">Loading…</div>}>
      <MapView />
    </Suspense>
  );
}
