/**
 * Build the `searchTokens` array stored on each save.
 *
 * Firestore has no full-text search, so we precompute lowercased, unique
 * word tokens from the title, text, and tags at write time and query them
 * with `array-contains` / `array-contains-any`. Prefix/exact token match
 * only — real full-text (Algolia/Typesense) is a v2 concern.
 */
export function buildSearchTokens(
  title: string,
  text: string,
  tags: string[] = []
): string[] {
  const raw = `${title} ${text} ${tags.join(' ')}`.toLowerCase();
  const tokens = raw
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 2);

  // Unique, capped at 100 (Firestore array practical limit for indexing).
  return Array.from(new Set(tokens)).slice(0, 100);
}

/**
 * Tokenize a user's search query the same way saves are tokenized, so a
 * query matches what was indexed. Capped at 10 for `array-contains-any`.
 */
export function tokenizeQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((t) => t.length >= 2)
    )
  ).slice(0, 10);
}
