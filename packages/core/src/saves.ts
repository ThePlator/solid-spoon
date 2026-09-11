import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  getDoc,
  getDocs,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { getServices } from './firebase';
import { buildSearchTokens, tokenizeQuery } from './tokens';
import type { Save, NewSaveInput, SaveUpdate } from './types';

/** Firestore collection ref for a given user's saves: users/{uid}/saves. */
function savesCol(userId: string) {
  const { db } = getServices();
  return collection(db, 'users', userId, 'saves');
}

/** Map a Firestore snapshot to a typed Save. */
function toSave(
  snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): Save {
  // Callers (getSave) guard on exists() first; the ?? {} satisfies the
  // DocumentSnapshot type where data() may be undefined.
  const d = (snap.data() ?? {}) as DocumentData;
  return {
    id: snap.id,
    userId: d.userId,
    type: d.type,
    title: d.title ?? '',
    url: d.url ?? null,
    source: d.source ?? '',
    thumbnailUrl: d.thumbnailUrl ?? null,
    text: d.text ?? '',
    tags: d.tags ?? [],
    searchTokens: d.searchTokens ?? [],
    status: d.status ?? 'active',
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
  };
}

/** Fetch a single save by id, or null if it doesn't exist. */
export async function getSave(userId: string, saveId: string): Promise<Save | null> {
  const { db } = getServices();
  const snap = await getDoc(doc(db, 'users', userId, 'saves', saveId));
  return snap.exists() ? toSave(snap) : null;
}

/** Create a new save. Derives searchTokens and timestamps automatically. */
export async function createSave(
  userId: string,
  input: NewSaveInput
): Promise<string> {
  const title = input.title ?? '';
  const text = input.text ?? '';
  const tags = (input.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);

  const ref = await addDoc(savesCol(userId), {
    userId,
    type: input.type,
    title,
    url: input.url ?? null,
    source: input.source ?? '',
    thumbnailUrl: input.thumbnailUrl ?? null,
    text,
    tags,
    searchTokens: buildSearchTokens(title, text, tags),
    status: input.status ?? 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Patch an existing save. Recomputes searchTokens when text-ish fields change. */
export async function updateSave(
  userId: string,
  saveId: string,
  patch: SaveUpdate,
  current?: Pick<Save, 'title' | 'text' | 'tags'>
): Promise<void> {
  const { db } = getServices();
  const ref = doc(db, 'users', userId, 'saves', saveId);

  const next: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };

  if (patch.tags) {
    next.tags = patch.tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
  }

  const touchesSearch =
    patch.title !== undefined || patch.text !== undefined || patch.tags !== undefined;
  if (touchesSearch) {
    const title = patch.title ?? current?.title ?? '';
    const text = patch.text ?? current?.text ?? '';
    const tags = (next.tags as string[] | undefined) ?? current?.tags ?? [];
    next.searchTokens = buildSearchTokens(title, text, tags);
  }

  await updateDoc(ref, next);
}

/** Permanently delete a save. */
export async function deleteSave(userId: string, saveId: string): Promise<void> {
  const { db } = getServices();
  await deleteDoc(doc(db, 'users', userId, 'saves', saveId));
}

/**
 * Subscribe to the live, reverse-chronological feed. Returns an unsubscribe
 * function. This is the primary read path — keep `max` bounded to control cost.
 */
export function subscribeFeed(
  userId: string,
  onData: (saves: Save[]) => void,
  max = 30
): () => void {
  const q = query(savesCol(userId), orderBy('createdAt', 'desc'), fbLimit(max));
  return onSnapshot(q, (snap) => onData(snap.docs.map(toSave)));
}

/** One page of the feed for infinite scroll. Pass the last doc to paginate. */
export async function fetchFeedPage(
  userId: string,
  max = 30,
  after?: QueryDocumentSnapshot<DocumentData>
): Promise<{ saves: Save[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), fbLimit(max)];
  if (after) constraints.push(startAfter(after));
  const snap = await getDocs(query(savesCol(userId), ...constraints));
  return {
    saves: snap.docs.map(toSave),
    lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
  };
}

/** Filter the feed by a single tag. */
export async function filterByTag(
  userId: string,
  tag: string,
  max = 50
): Promise<Save[]> {
  const q = query(
    savesCol(userId),
    where('tags', 'array-contains', tag.toLowerCase()),
    orderBy('createdAt', 'desc'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(toSave);
}

/**
 * Keyword search. Tokenizes the query, matches any token via
 * `array-contains-any`, then ranks client-side by how many tokens matched.
 * A v1 compromise vs. true full-text search.
 */
export async function searchSaves(
  userId: string,
  queryText: string,
  max = 50
): Promise<Save[]> {
  const tokens = tokenizeQuery(queryText);
  if (tokens.length === 0) return [];

  const q = query(
    savesCol(userId),
    where('searchTokens', 'array-contains-any', tokens),
    orderBy('createdAt', 'desc'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(toSave);

  // Rank by number of query tokens present, newest first as tiebreak.
  return results.sort((a, b) => {
    const score = (s: Save) => tokens.filter((t) => s.searchTokens.includes(t)).length;
    return score(b) - score(a);
  });
}
