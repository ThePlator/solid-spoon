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

function hostOf(url: string | null): string {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as any).roundRect === 'function') { (ctx as any).roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}

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
  const iconCache = useRef<Map<string, HTMLImageElement>>(new Map());

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

  // Preload site favicons so nodes render as recognizable site icons, not dots.
  useEffect(() => {
    if (!graph) return;
    for (const n of graph.nodes) {
      const host = n.source || hostOf(n.url);
      if (!host || iconCache.current.has(host)) continue;
      const img = new Image(); // no crossOrigin: we only draw, never read pixels
      img.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
      img.onload = () => fgRef.current?.refresh?.();
      iconCache.current.set(host, img);
    }
  }, [graph]);

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
              return on ? `rgba(204,255,0,${0.18 + 0.42 * (l.weight ?? 0.4)})` : 'rgba(120,120,130,0.04)';
            }
            return `rgba(150,150,160,${0.05 + 0.16 * (l.weight ?? 0.4)})`;
          }}
          linkWidth={(l: any) => 0.3 + 1.4 * (l.weight ?? 0.4)}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const r = 7 + Math.min(7, (node.degree ?? 0) * 0.9);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const dim = neighborIds ? !neighborIds.has(node.id) : false;
            const selected = node.id === sel?.id;
            const r = 7 + Math.min(7, (node.degree ?? 0) * 0.9);
            ctx.globalAlpha = dim ? 0.22 : 1;

            // base disc with a soft (not neon) drop shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.55)';
            ctx.shadowBlur = dim ? 0 : 7;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = '#17171a';
            ctx.fill();
            ctx.restore();

            const host = node.source || hostOf(node.url);
            const img = host ? iconCache.current.get(host) : null;
            if (img && img.complete && img.naturalWidth) {
              // clip the favicon into the disc
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, r - 1.6, 0, 2 * Math.PI);
              ctx.clip();
              const d = (r - 1.6) * 2;
              ctx.drawImage(img, node.x - (r - 1.6), node.y - (r - 1.6), d, d);
              ctx.restore();
            } else {
              // fallback: cluster-colored disc with the title's initial
              ctx.beginPath();
              ctx.arc(node.x, node.y, r - 1.6, 0, 2 * Math.PI);
              ctx.fillStyle = node.color || '#ccff00';
              ctx.fill();
              ctx.fillStyle = '#0a0a0b';
              ctx.font = `700 ${r * 0.95}px ui-sans-serif, system-ui`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText((String(node.title)[0] || '•').toUpperCase(), node.x, node.y + 0.5);
              ctx.textBaseline = 'alphabetic';
            }

            // thin cluster-color ring (white when selected)
            ctx.lineWidth = selected ? 2.2 : 1.4;
            ctx.strokeStyle = selected ? '#f4f4f2' : node.color || '#ccff00';
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.stroke();

            // label chip for hubs / selected / zoomed-in
            if ((selected || (node.degree ?? 0) >= 4 || globalScale > 1.7) && !dim) {
              const label = String(node.title).slice(0, 26);
              const fs = 11 / globalScale;
              ctx.font = `500 ${fs}px ui-sans-serif, system-ui`;
              const tw = ctx.measureText(label).width;
              const padX = 5 / globalScale;
              const ly = node.y + r + 10 / globalScale;
              ctx.fillStyle = 'rgba(10,10,11,0.78)';
              ctx.beginPath();
              roundRect(ctx, node.x - tw / 2 - padX, ly - fs * 0.75, tw + padX * 2, fs * 1.6, 3 / globalScale);
              ctx.fill();
              ctx.fillStyle = 'rgba(244,244,242,0.92)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, node.x, ly + fs * 0.05);
              ctx.textBaseline = 'alphabetic';
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
