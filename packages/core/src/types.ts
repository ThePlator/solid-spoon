import type { Timestamp } from 'firebase/firestore';

/** The kind of thing that was saved. Extensible — add without breaking v1. */
export type SaveType = 'link' | 'note' | 'image';

/**
 * `pending` — written optimistically while metadata is still being fetched.
 * `active`  — fully enriched and normal.
 * `error`   — metadata fetch failed, but the save is kept and editable.
 */
export type SaveStatus = 'active' | 'pending' | 'error';

/**
 * AI enrichment lifecycle (v2). Decoupled from `SaveStatus` so a save can be
 * fully usable while its summary/tags are still being generated.
 * `pending` — created, awaiting enrichment.
 * `done`    — summary + aiTags written.
 * `error`   — enrichment failed; the save is untouched and still usable.
 * `skipped` — nothing worth enriching (e.g. an empty note).
 */
export type EnrichStatus = 'pending' | 'done' | 'error' | 'skipped';

/** A single saved item. Firestore path: users/{userId}/saves/{id}. */
export interface Save {
  id: string;
  userId: string;
  type: SaveType;
  title: string;
  url: string | null;
  source: string;
  thumbnailUrl: string | null;
  text: string;
  tags: string[];
  /** Derived, lowercased tokens for keyword search via array-contains. */
  searchTokens: string[];
  status: SaveStatus;
  /** AI-generated one-to-three line summary (v2). Null until enriched. */
  summary: string | null;
  /** AI-suggested tags, kept separate from user-authored `tags` (v2). */
  aiTags: string[];
  /** Enrichment lifecycle state (v2). */
  enrichStatus: EnrichStatus;
  /** When enrichment last completed (v2). */
  enrichedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Fields a client supplies when creating a save. The rest are derived. */
export interface NewSaveInput {
  type: SaveType;
  title?: string;
  url?: string | null;
  source?: string;
  thumbnailUrl?: string | null;
  text?: string;
  tags?: string[];
  status?: SaveStatus;
}

/** Fields that may be patched on an existing save. */
export interface SaveUpdate {
  title?: string;
  url?: string | null;
  source?: string;
  thumbnailUrl?: string | null;
  text?: string;
  tags?: string[];
  status?: SaveStatus;
}
