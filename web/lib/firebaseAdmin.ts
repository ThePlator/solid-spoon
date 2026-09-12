import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Server-only Firebase Admin. Used by the enrichment routes to verify user ID
// tokens and to write summaries/tags back to Firestore, bypassing security
// rules with a service account. NEVER import this into client code.
//
// Credentials come from FIREBASE_SERVICE_ACCOUNT — the full service-account
// JSON as a single-line string, stored as a Vercel env var. It must never be
// committed (see .claude/RULES.md).

let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. Add the service-account JSON as an env var.'
    );
  }

  const svc = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  app = initializeApp({
    credential: cert({
      projectId: svc.project_id,
      clientEmail: svc.client_email,
      // Vercel stores newlines as literal "\n"; restore them.
      privateKey: svc.private_key.replace(/\\n/g, '\n'),
    }),
  });
  return app;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function adminDb() {
  return getFirestore(adminApp());
}
