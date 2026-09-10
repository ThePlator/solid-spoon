import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from 'firebase/storage';

/** The public web config from the Firebase console. Safe to ship in clients. */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface InitOptions {
  /** Point auth/firestore/storage at the local Emulator Suite. */
  useEmulator?: boolean;
  /** Emulator host (default "localhost"). */
  emulatorHost?: string;
}

export interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let services: Services | null = null;

/**
 * Initialize Firebase once per client. Each surface (web, extension, mobile)
 * calls this with its own config object at startup, then the rest of
 * `@supermind/core` uses the shared handles via `getServices()`.
 */
export function initFirebase(
  config: FirebaseConfig,
  options: InitOptions = {}
): Services {
  if (services) return services;

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  if (options.useEmulator) {
    const host = options.emulatorHost ?? 'localhost';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
  }

  services = { app, auth, db, storage };
  return services;
}

/** Access the initialized services. Throws if `initFirebase` wasn't called. */
export function getServices(): Services {
  if (!services) {
    throw new Error(
      '[@supermind/core] Firebase not initialized. Call initFirebase(config) first.'
    );
  }
  return services;
}
