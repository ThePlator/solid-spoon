'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const GITHUB_URL = 'https://github.com/ThePlator/supermind';

const SURFACES = [
  { tag: 'Web', title: 'Library', body: 'Browse, search, and organize everything you have saved in one reverse-chronological feed.' },
  { tag: 'Extension', title: 'One-click save', body: 'Save the current page — title, link, preview image, and selection — from Chrome in a single click.' },
  { tag: 'Mobile', title: 'Capture anywhere', body: 'Jot ideas on the go and save shared content straight from the Android share sheet.' },
];

const FEATURES = [
  { title: 'One-click save', body: 'Capture the current page or shared content in a single action.' },
  { title: 'Quick text capture', body: 'Write down a raw idea instantly, with no required fields.' },
  { title: 'Unified library', body: 'Every save from every device in one place, newest first.' },
  { title: 'Keyword search', body: 'Find anything across titles, notes, and tags.' },
  { title: 'Tags & filtering', body: 'Organize with tags and filter the feed to what matters.' },
  { title: 'Real-time sync', body: 'Save on one device and see it on another instantly.' },
  { title: 'Private by default', body: 'Email sign-in with strict per-user data isolation.' },
  { title: 'Self-hosted', body: 'Runs on your own Firebase project. Your data stays yours.' },
];

const ROADMAP = [
  { title: 'AI summaries', body: 'Condense long articles and threads into a few lines so you remember why you saved them.' },
  { title: 'Automatic tagging', body: 'Categorize every save on ingest, removing manual organizing.' },
  { title: 'Ask your brain', body: 'Natural-language search that retrieves by meaning, not just keywords.' },
  { title: 'Connections', body: 'Related saves surface each other, turning a flat list into a web.' },
  { title: 'Resurfacing', body: 'Older saves return at the right moment, so nothing is forgotten.' },
  { title: 'Voice & OCR', body: 'Speak an idea to capture it, and make text inside images searchable.' },
];

const STEPS = [
  { n: '01', title: 'Capture', body: 'Save a link or a thought from any device in under two seconds.' },
  { n: '02', title: 'Store', body: 'Everything syncs to one private, unified library in real time.' },
  { n: '03', title: 'Retrieve', body: 'Search and filter to surface the right item the moment you need it.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const authed = !loading && !!user;
  const primaryHref = authed ? '/library' : '/login';
  const primaryLabel = authed ? 'Open library' : 'Log in';

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <span className="logo">MIND<span className="sig">·</span>OS</span>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#roadmap">Roadmap</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">GitHub</a>
            <Link href={primaryHref} className="lp-btn sm">{primaryLabel}</Link>
          </div>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-eyebrow">Open-source second brain</div>
        <h1 className="lp-h1">Save anything.<br />Actually find it again.</h1>
        <p className="lp-lead">
          SuperMind is a personal second brain for the things you want to keep — links, articles,
          and ideas — captured from any device and kept reliably retrievable, so your library never
          becomes a graveyard.
        </p>
        <div className="lp-cta">
          <Link href={primaryHref} className="lp-btn primary">{authed ? 'Open your library →' : 'Get started →'}</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" className="lp-btn">View source</a>
        </div>
        <div className="lp-hero-note">Runs on your own Firebase · MIT licensed · no lock-in</div>
      </header>

      <section className="lp-section">
        <div className="lp-section-head">
          <span className="lp-kicker">Three ways in</span>
          <h2 className="lp-h2">One brain, everywhere you are</h2>
        </div>
        <div className="lp-grid-3">
          {SURFACES.map((s) => (
            <div key={s.tag} className="lp-card">
              <span className="lp-card-tag">{s.tag}</span>
              <h3 className="lp-card-title">{s.title}</h3>
              <p className="lp-card-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section-head">
          <span className="lp-kicker">Available now — v1</span>
          <h2 className="lp-h2">Everything you need to capture and retrieve</h2>
        </div>
        <div className="lp-grid-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature">
              <span className="lp-check">✓</span>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="how">
        <div className="lp-section-head">
          <span className="lp-kicker">How it works</span>
          <h2 className="lp-h2">Capture, store, retrieve</h2>
        </div>
        <div className="lp-grid-3">
          {STEPS.map((s) => (
            <div key={s.n} className="lp-step">
              <span className="lp-step-n">{s.n}</span>
              <h3 className="lp-card-title">{s.title}</h3>
              <p className="lp-card-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="roadmap">
        <div className="lp-section-head">
          <span className="lp-kicker lp-kicker-soon">Coming in v2</span>
          <h2 className="lp-h2">An intelligence layer for your library</h2>
          <p className="lp-section-sub">
            The next release turns a well-kept archive into a true second brain — one that
            summarizes, connects, and resurfaces what you save.
          </p>
        </div>
        <div className="lp-grid-3">
          {ROADMAP.map((r) => (
            <div key={r.title} className="lp-card lp-card-soon">
              <span className="lp-soon-badge">Planned</span>
              <h3 className="lp-card-title">{r.title}</h3>
              <p className="lp-card-body">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-openbox">
          <div>
            <span className="lp-kicker">Open source</span>
            <h2 className="lp-h2">Your second brain, on your terms</h2>
            <p className="lp-section-sub">
              SuperMind is built on a single managed Firebase project and released under the MIT
              license. Clone it, run your own instance, and keep full ownership of your data.
            </p>
          </div>
          <div className="lp-openbox-cta">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" className="lp-btn primary">Clone on GitHub →</a>
            <Link href={primaryHref} className="lp-btn">{primaryLabel}</Link>
          </div>
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-final-h">Start your second brain today.</h2>
        <Link href={primaryHref} className="lp-btn primary lg">{authed ? 'Open your library →' : 'Get started →'}</Link>
      </section>

      <footer className="lp-footer">
        <span className="logo">MIND<span className="sig">·</span>OS</span>
        <div className="lp-footer-links">
          <a href="#features">Features</a>
          <a href="#roadmap">Roadmap</a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">GitHub</a>
          <Link href={primaryHref}>{primaryLabel}</Link>
        </div>
        <span className="lp-footer-meta">SuperMind · v0.1 · MIT License</span>
      </footer>
    </div>
  );
}
