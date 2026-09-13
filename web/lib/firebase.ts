import { initFirebase, configureEnrich, type FirebaseConfig } from '@supermind/core';

const config: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let ready = false;

/** Idempotently initialize Firebase for the browser. */
export function ensureFirebase(): void {
  if (ready) return;
  initFirebase(config, {
    useEmulator: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true',
  });
  // Fire AI enrichment on save. Same-origin, so a relative path is fine here.
  configureEnrich(process.env.NEXT_PUBLIC_ENRICH_ENDPOINT ?? '/api/enrich');
  ready = true;
}
