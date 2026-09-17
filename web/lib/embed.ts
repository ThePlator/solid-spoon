import { GoogleGenAI } from '@google/genai';

// Text embeddings for the brain map (and later, semantic search). Uses Gemini's
// Matryoshka embedding model truncated to 768 dims — small enough to store and
// compare in memory, big enough for good similarity ranking. Vectors are kept
// in a separate `users/{uid}/vectors/{saveId}` subcollection so they never
// bloat the hot feed reads.

const EMBED_MODEL = process.env.EMBED_MODEL ?? 'gemini-embedding-001';
export const EMBEDDING_DIMS = 768;

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  client = new GoogleGenAI({ apiKey });
  return client;
}

export { EMBED_MODEL };

/** Embed text for similarity. Returns null on empty input or any failure. */
export async function embedText(text: string): Promise<number[] | null> {
  const t = text.trim();
  if (!t) return null;
  try {
    const res = await gemini().models.embedContent({
      model: EMBED_MODEL,
      contents: t.slice(0, 8000),
      config: { outputDimensionality: EMBEDDING_DIMS, taskType: 'SEMANTIC_SIMILARITY' },
    });
    const vec = res.embeddings?.[0]?.values;
    return vec && vec.length ? vec : null;
  } catch {
    return null;
  }
}

/** Cosine similarity between two equal-length vectors. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
