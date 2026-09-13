import { initFirebase, configureEnrich, type FirebaseConfig } from '@supermind/core';

const config: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let ready = false;
export function ensureFirebase(): void {
  if (ready) return;
  initFirebase(config);
  // Absolute URL — the extension isn't served from the site's origin.
  const enrich = import.meta.env.VITE_ENRICH_ENDPOINT;
  if (enrich) configureEnrich(enrich);
  ready = true;
}
