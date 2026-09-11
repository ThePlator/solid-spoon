'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@supermind/core';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Link href="/login" className="auth-back">← Back to login</Link>
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">MIND<span className="sig">·</span>OS</span>
        </div>
        <div className="auth-tag">Reset your password.</div>

        {sent ? (
          <div className="stack">
            <div className="auth-success">
              ✓ If an account exists for <strong>{email}</strong>, a reset link is on its way.
              Check your inbox and spam folder.
            </div>
            <Link href="/login" className="lp-btn" style={{ width: '100%' }}>Return to login</Link>
          </div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <p className="auth-help">
              Enter your account email and we&apos;ll send you a link to set a new password.
            </p>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            {error && <div className="error">⚠ {error}</div>}
            <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Sending…' : 'Send reset link →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
