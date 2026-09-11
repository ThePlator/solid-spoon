import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getServices } from './firebase';

/** Create a new account with email + password. */
export function signUp(email: string, password: string): Promise<User> {
  const { auth } = getServices();
  return createUserWithEmailAndPassword(auth, email, password).then(
    (cred) => cred.user
  );
}

/** Sign in an existing user. */
export function signIn(email: string, password: string): Promise<User> {
  const { auth } = getServices();
  return signInWithEmailAndPassword(auth, email, password).then(
    (cred) => cred.user
  );
}

/** Sign the current user out. */
export function signOut(): Promise<void> {
  const { auth } = getServices();
  return fbSignOut(auth);
}

/** Send a password-reset email to the given address. */
export function resetPassword(email: string): Promise<void> {
  const { auth } = getServices();
  return sendPasswordResetEmail(auth, email);
}

/** The currently signed-in user, or null. */
export function currentUser(): User | null {
  return getServices().auth.currentUser;
}

/**
 * Subscribe to auth state. Fires immediately with the current user (or null)
 * and again on every sign-in/sign-out. Returns an unsubscribe function.
 */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const { auth } = getServices();
  return onAuthStateChanged(auth, cb);
}
