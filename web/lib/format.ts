import type { Save } from '@supermind/core';

/** Format a Firestore timestamp as an editorial date, e.g. "10 Sep 2026". */
export function formatDate(ts: Save['createdAt']): string {
  if (!ts) return '—';
  const d = typeof (ts as { toDate?: () => Date }).toDate === 'function'
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as unknown as string);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Short relative-ish label for cards, e.g. "today", "3d ago", "10 Sep". */
export function relativeDate(ts: Save['createdAt']): string {
  if (!ts) return '';
  const d = typeof (ts as { toDate?: () => Date }).toDate === 'function'
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as unknown as string);
  const diff = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diff < day && d.getDate() === new Date().getDate()) return 'today';
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
