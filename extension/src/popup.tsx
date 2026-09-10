import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signIn, signOut, createSave } from '@supermind/core';
import { ensureFirebase } from './firebase';
import { readActivePage, type PageMeta } from './readPage';

ensureFirebase();

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await signIn(email, password); }
    catch (err) { setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Failed'); }
    finally { setBusy(false); }
  }

  return (
    <form className="login" onSubmit={submit}>
      <p className="hint">Sign in once — you’ll stay logged in.</p>
      <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <div className="error">⚠ {error}</div>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
      <p className="hint sm">No account? Create one in the SuperMind web app first.</p>
    </form>
  );
}

function Capture({ user }: { user: User }) {
  const [page, setPage] = useState<PageMeta | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [state, setState] = useState<'ready' | 'saving' | 'done' | 'error'>('ready');

  useEffect(() => {
    readActivePage().then((p) => {
      setPage(p);
      setTitle(p.title);
      setNote(p.selection);
    });
  }, []);

  async function save() {
    if (!page) return;
    setState('saving');
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await createSave(user.uid, {
        type: 'link',
        url: page.url,
        source: hostOf(page.url),
        title: title.trim() || page.title,
        thumbnailUrl: page.image,
        text: note.trim(),
        tags: tagList,
        status: 'active',
      });
      setState('done');
      setTimeout(() => window.close(), 900);
    } catch {
      setState('error');
    }
  }

  if (!page) return <div className="loading">Reading page…</div>;

  if (state === 'done') {
    return <div className="done"><div className="check">✓</div><div>Saved to SuperMind</div></div>;
  }

  return (
    <div className="capture">
      <div className="preview">
        {page.image
          ? <img className="thumb" src={page.image} alt="" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
          : <div className="thumb ph">◲</div>}
        <div className="src">{hostOf(page.url) || 'this page'}</div>
      </div>

      <label className="label">Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />

      <label className="label">Note {note ? '' : '/ optional'}</label>
      <textarea rows={2} placeholder="Why you kept it…" value={note} onChange={(e) => setNote(e.target.value)} />

      <label className="label">Tags</label>
      <input placeholder="comma, separated" value={tags} onChange={(e) => setTags(e.target.value)} />

      {state === 'error' && <div className="error">⚠ Couldn’t save. Try again.</div>}

      <button className="primary" onClick={save} disabled={state === 'saving'}>
        {state === 'saving' ? 'Filing…' : 'Save to SuperMind →'}
      </button>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthChange((u) => { setUser(u); setReady(true); }), []);

  return (
    <div className="app">
      <header className="bar">
        <span className="logo">MIND<span className="sig">·</span>OS</span>
        {user && <button className="ghost" onClick={() => signOut()}>Sign out</button>}
      </header>
      {!ready ? <div className="loading">…</div> : user ? <Capture user={user} /> : <Login />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
