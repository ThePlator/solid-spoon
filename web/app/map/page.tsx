'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

// react-force-graph touches window/canvas — client-only, no SSR. The wrapper
// forwards our ref (via innerRef) so we can zoom-to-fit once the layout settles.
const BrainGraph = dynamic(() => import('@/components/BrainGraph'), { ssr: false });

interface GNode { id: string; title: string; type: string; color: string }
interface GEdge { source: string; target: string; weight: number }
interface Graph { nodes: GNode[]; edges: GEdge[] }

function MapView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  // Mobile WebView passes a token in the URL; web uses the logged-in session.
  const urlToken = params.get('token');
  const embedded = params.get('embed') === '1' || !!urlToken;

  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const fgRef = useRef<any>(null);

  // Track viewport size for the canvas.
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight - (embedded ? 0 : 56) });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [embedded]);

  // Redirect to login only for the web (session) path — not the WebView.
  useEffect(() => {
    if (!urlToken && !loading && !user) router.replace('/login');
  }, [urlToken, user, loading, router]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const token = urlToken ?? (user ? await user.getIdToken() : null);
        if (!token) return;
        const res = await fetch('/api/graph', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`graph ${res.status}`);
        const data = (await res.json()) as Graph;
        if (alive) setGraph(data);
      } catch (e) {
        if (alive) setError('Could not load your map.');
      }
    }
    if (urlToken || user) load();
    return () => { alive = false; };
  }, [urlToken, user]);

  const data = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    return {
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.edges.map((e) => ({ ...e })),
    };
  }, [graph]);

  function openNode(node: any) {
    const id = node?.id as string;
    if (!id) return;
    // In the mobile WebView, hand the tap back to the app; on web, navigate.
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
          <span className="map-meta">{graph ? `${graph.nodes.length} nodes · ${graph.edges.length} links` : ''}</span>
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
          nodeRelSize={5}
          nodeVal={() => 3}
          linkColor={(l: any) => `rgba(204,255,0,${0.08 + 0.25 * (l.weight ?? 0.4)})`}
          linkWidth={(l: any) => 0.4 + 1.6 * (l.weight ?? 0.4)}
          onNodeClick={openNode}
          cooldownTicks={120}
          onEngineStop={() => fgRef.current?.zoomToFit?.(500, 60)}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const r = 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = node.color || '#ccff00';
            ctx.fill();
            // Show labels once zoomed in enough to stay readable.
            if (globalScale > 1.2) {
              const label = String(node.title).slice(0, 28);
              ctx.font = `${11 / globalScale}px ui-sans-serif, system-ui`;
              ctx.fillStyle = 'rgba(244,244,242,0.75)';
              ctx.textAlign = 'center';
              ctx.fillText(label, node.x, node.y + r + 8 / globalScale);
            }
          }}
        />
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
