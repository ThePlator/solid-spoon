'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  subscribeFeed, searchSaves, filterByTag, signOut, type Save,
} from '@supermind/core';
import { useAuth } from '@/components/AuthProvider';
import { AddSave } from '@/components/AddSave';
import { SaveCard } from '@/components/SaveCard';

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [feed, setFeed] = useState<Save[]>([]);
  const [feedReady, setFeedReady] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [results, setResults] = useState<Save[] | null>(null);
  // Bumped on every search/tag action; async responses only apply if still current.
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeFeed(user.uid, (saves) => {
      setFeed(saves);
      setFeedReady(true);
    });
    return unsub;
  }, [user]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    feed.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [feed]);

  const linkCount = useMemo(() => feed.filter((s) => s.type === 'link').length, [feed]);

  async function runSearch(q: string) {
    setQuery(q);
    setActiveTag(null);
    const seq = ++searchSeq.current;
    if (!user || q.trim().length < 2) { setResults(null); return; }
    const r = await searchSaves(user.uid, q);
    if (seq === searchSeq.current) setResults(r); // drop stale responses
  }

  async function toggleTag(tag: string) {
    setQuery('');
    const seq = ++searchSeq.current;
    if (!user) return;
    if (activeTag === tag) { setActiveTag(null); setResults(null); return; }
    setActiveTag(tag);
    const r = await filterByTag(user.uid, tag);
    if (seq === searchSeq.current) setResults(r);
  }

  if (loading || !user) return null;

  const list = results ?? feed;
  const filtering = results !== null;
  const sectionLabel = filtering
    ? (activeTag ? `#${activeTag}` : `“${query}”`)
    : 'All entries';

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">MIND<span className="sig">·</span>OS</span>
          <span className="ver">v0.1</span>
        </div>
        <div className="topbar-right">
          <Link href="/map" className="ghost" style={{ textDecoration: 'none' }}>◍ Map</Link>
          <span className="who">{user.email}</span>
          <button className="ghost" onClick={() => signOut()}>Log out</button>
        </div>
      </header>

      <AddSave userId={user.uid} />

      <div className="readout">
        <div className="stat"><div className="n">{feedReady ? feed.length : '—'}</div><div className="k">Entries</div></div>
        <div className="stat"><div className="n">{feedReady ? linkCount : '—'}</div><div className="k">Links</div></div>
        <div className="stat"><div className="n">{feedReady ? feed.length - linkCount : '—'}</div><div className="k">Thoughts</div></div>
        <div className="stat"><div className="n">{feedReady ? allTags.length : '—'}</div><div className="k">Tags</div></div>
      </div>

      <div className="toolbar">
        <div className="search">
          <input placeholder="search your mind" value={query} onChange={(e) => runSearch(e.target.value)} />
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="tagrail">
          <span className="label">Tags</span>
          {allTags.map((t) => (
            <button key={t} className="chip" data-active={activeTag === t} onClick={() => toggleTag(t)}>{t}</button>
          ))}
        </div>
      )}

      <div className="section-line">
        <span className="eyebrow">{feedReady ? sectionLabel : 'loading'}</span>
        <hr />
        <span className="eyebrow">{list.length}</span>
      </div>

      <div className="feed">
        {!feedReady ? (
          <div className="empty"><div className="glyph">◴</div><div className="mark">Booting…</div></div>
        ) : list.length === 0 ? (
          filtering ? (
            <div className="empty">
              <div className="glyph">∅</div>
              <div className="mark">No results</div>
              <p>Nothing matches that {activeTag ? 'tag' : 'query'}. Try another.</p>
            </div>
          ) : (
            <div className="empty">
              <div className="glyph">+</div>
              <div className="mark">Your mind is empty</div>
              <p>Capture a link or a thought above. Everything you keep is stored here and stays searchable.</p>
              <button className="primary" onClick={() => {
                const el = document.querySelector<HTMLInputElement>('.console input, .console textarea');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.focus();
              }}>Capture your first entry →</button>
            </div>
          )
        ) : (
          list.map((s) => <SaveCard key={s.id} save={s} />)
        )}
      </div>
    </div>
  );
}
