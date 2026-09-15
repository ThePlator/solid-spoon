// Server-side page content extraction, used before summarizing so Gemini sees
// the actual content of a link instead of just its URL/title.
//
// Strategy per URL:
//   - Reddit  → the free `.json` endpoint (real post title + body).
//   - else    → Jina Reader (https://r.jina.ai/<url>), a free reader that
//               returns clean text/markdown of the rendered page.
// Everything is best-effort: any failure returns '' and enrichment falls back
// to title/URL only (no regression).

const ENABLED = process.env.EXTRACT_ENABLED !== 'false';
const MAX_CHARS = 12000;
const TIMEOUT_MS = 8000;

/** fetch with an abort timeout so a slow page can't hang the enrich route. */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Collapse whitespace and cap length. */
function clean(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_CHARS);
}

function isReddit(url: string): boolean {
  try {
    return /(^|\.)reddit\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Reddit's public JSON: append `.json` to any post URL. */
async function extractReddit(url: string): Promise<string> {
  const jsonUrl = url.replace(/\/?$/, '') + '.json';
  const res = await fetchWithTimeout(jsonUrl, {
    headers: { 'User-Agent': 'SuperMind/1.0 (enrichment)' },
  });
  if (!res.ok) return '';
  const data = (await res.json()) as unknown;
  // The post is at data[0].data.children[0].data.
  const post = (data as any)?.[0]?.data?.children?.[0]?.data;
  if (!post) return '';
  const parts = [post.title, post.selftext].filter((s: unknown) => typeof s === 'string' && s);
  return clean(parts.join('\n\n'));
}

/** Jina Reader: clean text of the rendered page. Free; optional key raises limits. */
async function extractJina(url: string): Promise<string> {
  const key = process.env.JINA_API_KEY;
  const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: 'text/plain',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
  });
  if (!res.ok) return '';
  return clean(await res.text());
}

/**
 * Extract readable content for a URL. Returns '' on any failure or when
 * disabled, so callers can always fall back to title/URL.
 */
export async function extractContent(url: string): Promise<string> {
  if (!ENABLED || !url) return '';
  try {
    return isReddit(url) ? await extractReddit(url) : await extractJina(url);
  } catch {
    return '';
  }
}
