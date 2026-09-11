'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSave, updateSave, deleteSave, type Save } from '@supermind/core';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = { link: 'Link', note: 'Thought', image: 'Image' };

export default function ItemPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [save, setSave] = useState<Save | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getSave(user.uid, id).then((s) => {
      if (!s) { setNotFound(true); return; }
      setSave(s);
      setTitle(s.title);
      setText(s.text);
      setTags(s.tags.join(', '));
    });
  }, [user, id]);

  async function persist() {
    if (!user || !save) return;
    setBusy(true);
    setSaved(false);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await updateSave(user.uid, save.id, { title, text, tags: tagList }, save);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !save) return;
    if (!confirm('Remove this entry from your book? This cannot be undone.')) return;
    await deleteSave(user.uid, save.id);
    router.replace('/library');
  }

  if (loading || !user) return null;

  if (notFound) {
    return (
      <div className="shell detail">
        <Link href="/library" className="back">← back to library</Link>
        <div className="empty"><div className="glyph">∅</div><div className="mark">Entry not found</div><p>The entry you’re after doesn’t exist.</p></div>
      </div>
    );
  }

  if (!save) return <div className="shell detail"><p className="eyebrow" style={{ marginTop: 40 }}>Retrieving…</p></div>;

  return (
    <div className="shell detail">
      <Link href="/library" className="back">← back to library</Link>

      <div className="detail-head">
        <span className="detail-type">{TYPE_LABEL[save.type]}</span>
        <div className="detail-dates">
          <span className="eyebrow">Filed {formatDate(save.createdAt)}</span>
          {save.updatedAt && save.createdAt && String(save.updatedAt) !== String(save.createdAt) && (
            <><br /><span className="eyebrow">Revised {formatDate(save.updatedAt)}</span></>
          )}
        </div>
      </div>

      {save.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="detail-img" src={save.thumbnailUrl} alt="" />
      )}

      <div className="stack">
        <div>
          <label className="label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {save.url && (
          <div>
            <label className="label">Source</label>
            <div style={{ paddingTop: 4 }}>
              <a href={save.url} target="_blank" rel="noreferrer noopener">{save.source || save.url} ↗</a>
            </div>
          </div>
        )}

        <div>
          <label className="label">{save.type === 'note' ? 'The thought' : 'Why you kept it'}</label>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Add a note to your future self…" />
        </div>

        <div>
          <label className="label">Tags</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" />
        </div>
      </div>

      <div className="detail-actions">
        <button className="primary" onClick={persist} disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="saved-note">✓ kept</span>}
        <button className="danger" style={{ marginLeft: 'auto' }} onClick={remove}>Remove entry</button>
      </div>
    </div>
  );
}
