'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function NotFound() {
  const { user, loading } = useAuth();
  const primaryHref = !loading && user ? '/library' : '/login';
  const primaryLabel = !loading && user ? 'Open library' : 'Log in';

  return (
    <main className="nf-shell">
      <section className="nf-card">
        <span className="nf-kicker">404 · route not found</span>
        <div className="nf-code">404</div>
        <h1 className="nf-title">That page wandered off.</h1>
        <p className="nf-copy">
          The link you followed does not exist here anymore, or the app sent you to a path this
          build does not know about.
        </p>
        <p className="nf-copy nf-copy-soft">
          If you opened the brain map from mobile, go back to the app and try again after updating.
        </p>
        <div className="nf-actions">
          <Link href="/" className="nf-btn nf-btn-primary">Go home</Link>
          <Link href={primaryHref} className="nf-btn">{primaryLabel}</Link>
        </div>
      </section>
    </main>
  );
}