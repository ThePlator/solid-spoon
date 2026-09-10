'use client';

import { useState } from 'react';
import { createSave, type SaveType } from '@supermind/core';

function hostOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function AddSave({ userId, onAdded }: { userId: string; onAdded?: () => void }) {
  const [type, setType] = useState<SaveType>('link');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  const isNote = type === 'note';
  const canSave = isNote ? text.trim().length > 0 : url.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const cleanUrl = url.trim();
      await createSave(userId, {
        type,
        url: isNote ? null : (cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`),
        source: isNote ? '' : hostOf(cleanUrl),
        title: title.trim() || (isNote ? text.trim().slice(0, 80) : hostOf(cleanUrl) || cleanUrl),
        text: text.trim(),
        tags: tagList,
        status: 'active',
      });
      setUrl(''); setTitle(''); setText(''); setTags('');
      onAdded?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="console" onSubmit={submit}>
      <div className="console-head">
        <span className="eyebrow">Capture</span>
        <div className="seg">
          <button type="button" data-active={type === 'link'} onClick={() => setType('link')}>Link</button>
          <button type="button" data-active={type === 'note'} onClick={() => setType('note')}>Thought</button>
        </div>
      </div>

      {isNote ? (
        <div className="field">
          <textarea placeholder="Type a thought and press file — no fields required." value={text} rows={2}
            onChange={(e) => setText(e.target.value)} autoFocus />
        </div>
      ) : (
        <>
          <div className="field">
            <input placeholder="Paste a URL — https://…" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
          </div>
          <div className="console-grid">
            <div className="field">
              <label className="label">Title <span className="opt">/ optional</span></label>
              <input placeholder="Name it" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Note <span className="opt">/ optional</span></label>
              <input placeholder="Why you kept it" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          </div>
        </>
      )}

      <div className="field" style={{ marginTop: 14 }}>
        <label className="label">Tags</label>
        <input placeholder="comma, separated, keywords" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      <div className="console-actions">
        <span className="hint">{isNote ? 'saved instantly to your library' : 'preview metadata fills in automatically'}</span>
        <button className="primary" type="submit" disabled={busy || !canSave}>
          {busy ? 'Filing…' : 'File it →'}
        </button>
      </div>
    </form>
  );
}
