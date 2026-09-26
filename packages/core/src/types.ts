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

/**
 * A related save discovered at enrich time (v2 — Feature B, "connection
 * write-back"). Computed from embedding similarity, then labeled by the model.
 */
export interface SaveConnection {
  /** The related save's id (path: users/{userId}/saves/{id}). */
  id: string;
  /** Denormalized title so the UI needn't fetch the related save. */
  title: string;
  /** Cosine similarity, 0–1. */
  score: number;
  /** Short model label for how this save relates to it, e.g. "extends". */
  relation: string;
}

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
  /** Related saves + how they relate, written at enrich time (v2 — Feature B). */
  connections: SaveConnection[];
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
