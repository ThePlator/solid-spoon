import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// App update detection for an off-store (sideloaded) build.
//
// Two paths, because a sideloaded APK never auto-updates:
//   1. EAS Update (OTA)  — JS/asset changes; downloaded silently, applied on
//      reload. No new APK needed.
//   2. GitHub release     — native changes need a new APK; we detect a newer
//      published release and point the user at the download.

const REPO = 'ThePlator/solid-spoon';

export const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

/** Numeric version parts from a tag like "v0.2.0" / "0.2.0". */
function parseVer(tag: string): number[] {
  return tag.replace(/^[^0-9]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
}

/** True if `a` is a strictly newer semver-ish version than `b`. */
function isNewer(a: string, b: string): boolean {
  const pa = parseVer(a);
  const pb = parseVer(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export interface AppUpdate {
  version: string;
  /** Release page URL (fallback). */
  url: string;
  /** Direct APK asset URL, if the release attaches one. */
  apkUrl?: string;
}

interface GhAsset { name?: string; browser_download_url?: string }
interface GhRelease {
  tag_name: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GhAsset[];
}

/**
 * Check GitHub for a newer APP release than what's installed. Ignores the
 * browser-extension releases (tags starting with "ext") and drafts/prereleases.
 * Returns null if up to date or on any error (best-effort).
 */
export async function checkGithubUpdate(): Promise<AppUpdate | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as GhRelease[];

    const appReleases = releases
      .filter((r) => !r.draft && !r.prerelease && !/^ext/i.test(r.tag_name))
      .sort((a, b) => (isNewer(a.tag_name, b.tag_name) ? -1 : 1));

    const latest = appReleases[0];
    if (!latest || !isNewer(latest.tag_name, currentVersion)) return null;

    const apk = latest.assets?.find((a) => a.name?.toLowerCase().endsWith('.apk'));
    return { version: latest.tag_name, url: latest.html_url, apkUrl: apk?.browser_download_url };
  } catch {
    return null;
  }
}

/**
 * Check for and download an OTA (JS) update. Returns true if one was fetched
 * and is ready to apply via `applyEasUpdate()`. No-op in dev / Expo Go.
 */
export async function checkEasUpdate(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    return true;
  } catch {
    return false;
  }
}

/** Reload the app to apply a downloaded OTA update. */
export async function applyEasUpdate(): Promise<void> {
  try { await Updates.reloadAsync(); } catch {}
}
