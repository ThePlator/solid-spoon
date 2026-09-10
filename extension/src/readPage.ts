export interface PageMeta {
  title: string;
  url: string;
  image: string | null;
  selection: string;
}

/**
 * Runs in the *page* context (injected via chrome.scripting). Must be a pure,
 * self-contained function — no imports, no outer-scope references.
 */
function extract(): PageMeta {
  const pick = (sel: string, attr: string): string | null => {
    const el = document.querySelector(sel);
    return el ? el.getAttribute(attr) : null;
  };
  const canonical = pick('link[rel="canonical"]', 'href') || location.href;
  const ogTitle = pick('meta[property="og:title"]', 'content');
  const image =
    pick('meta[property="og:image"]', 'content') ||
    pick('meta[name="twitter:image"]', 'content') ||
    null;
  return {
    title: ogTitle || document.title || location.hostname,
    url: canonical,
    image,
    selection: (window.getSelection?.()?.toString() || '').trim().slice(0, 2000),
  };
}

/** Read metadata from the current active tab using activeTab + scripting. */
export async function readActivePage(): Promise<PageMeta> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const fallback: PageMeta = {
    title: tab?.title || '',
    url: tab?.url || '',
    image: tab?.favIconUrl || null,
    selection: '',
  };
  if (!tab?.id || !/^https?:/.test(tab.url || '')) return fallback;

  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extract,
    });
    return (res?.result as PageMeta) ?? fallback;
  } catch {
    // Restricted page (chrome://, web store, PDF viewer…) — use tab info.
    return fallback;
  }
}
