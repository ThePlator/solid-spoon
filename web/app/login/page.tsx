'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@supermind/core';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/library');
  }, [user, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email, password);
      else await signIn(email, password);
      router.replace('/library');
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">MIND<span className="sig">·</span>OS</span>
        </div>
        <div className="auth-tag">Your external brain. Capture anything, find it later.</div>

        <div className="auth-tabs">
          <button data-active={mode === 'signin'} onClick={() => setMode('signin')}>Log in</button>
          <button data-active={mode === 'signup'} onClick={() => setMode('signup')}>Create account</button>
        </div>

        <form className="stack" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="min. 6 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="error">⚠ {error}</div>}
          <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Connecting…' : mode === 'signup' ? 'Boot my mind →' : 'Enter →'}
          </button>
        </form>
      </div>
    </div>
  );
}
