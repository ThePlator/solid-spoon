// @supermind/core — AI enrichment trigger (v2).
//
// There is no server between the clients and Firestore, and we deliberately
// avoid Firebase Cloud Functions (which require the paid Blaze plan). Instead
// enrichment is fired from here: every client creates saves through the shared
// `createSave`, so wiring the trigger once means web, extension, and mobile all
// get automatic enrichment for free.
//
// The call is fire-and-forget — it never blocks or fails `createSave`. Anything
// the client-side fire misses (offline at save time, tab closed) is picked up
// later by the server-side cron sweep. The endpoint itself is idempotent.

import { getServices } from './firebase';

let enrichEndpoint: string | null = null;
let enabled = true;

/**
 * Toggle AI enrichment on/off at runtime (e.g. from an app setting). When
 * off, `triggerEnrich` is a no-op — saves stay unenriched until re-enabled
 * (and can be backfilled by the server sweep). Defaults to on.
 */
export function setEnrichEnabled(on: boolean): void {
  enabled = on;
}

/**
 * Point the client at the enrichment endpoint (the Vercel route handler).
 * Call once at startup, after `initFirebase`. If never called, enrichment is a
 * no-op and saves simply stay `enrichStatus: 'pending'` until the cron sweep
 * (or a later configured client) processes them.
 *
 * Web can pass a relative path ('/api/enrich'); extension and mobile must pass
 * the absolute URL of the deployed site.
 */
export function configureEnrich(endpoint: string): void {
  enrichEndpoint = endpoint;
}

/**
 * Ask the server to enrich a save. Best-effort: never throws, never awaited by
 * callers. Uses the current user's ID token so the server can authorize the
 * read/write against that user's subtree.
 */
export function triggerEnrich(saveId: string): void {
  if (!enrichEndpoint || !enabled) return;

  const run = async () => {
    try {
      const { auth } = getServices();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(enrichEndpoint as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ saveId }),
        // Let the request outlive a closing tab where supported.
        keepalive: true,
      });
    } catch {
      // Enrichment is best-effort; the cron sweep is the backstop.
    }
  };

  void run();
}
