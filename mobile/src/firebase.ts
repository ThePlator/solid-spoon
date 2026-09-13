import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fbAuth from 'firebase/auth';
import { initFirebase, configureEnrich, setEnrichEnabled, type FirebaseConfig } from '@supermind/core';

/** AsyncStorage key for the auto-summarize app setting. */
export const AUTO_SUMMARIZE_KEY = 'supermind.autoSummarize';

// `getReactNativePersistence` ships only in Firebase's React Native build,
// which Metro resolves at runtime; the default (web) type entry omits it.
const getReactNativePersistence = (
  fbAuth as unknown as {
    getReactNativePersistence: (s: unknown) => import('firebase/auth').Persistence;
  }
).getReactNativePersistence;

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

const config: FirebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
};

let ready = false;

/** Initialize Firebase for React Native with persistent auth + long-polling. */
export function ensureFirebase(): void {
  if (ready) return;
  initFirebase(config, {
    authPersistence: getReactNativePersistence(AsyncStorage),
    firestoreLongPolling: true,
  });
  // Absolute URL — the app isn't served from the site's origin.
  if (extra.enrichEndpoint) configureEnrich(extra.enrichEndpoint);
  // Apply the persisted auto-summarize preference (defaults to on if unset).
  AsyncStorage.getItem(AUTO_SUMMARIZE_KEY)
    .then((v) => setEnrichEnabled(v !== 'false'))
    .catch(() => {});
  ready = true;
}
