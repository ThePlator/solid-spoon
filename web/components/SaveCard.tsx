import Link from 'next/link';
import type { Save } from '@supermind/core';
import { relativeDate } from '@/lib/format';

const TYPE: Record<string, string> = { link: 'LINK', note: 'NOTE', image: 'IMG' };

export function SaveCard({ save }: { save: Save }) {
  return (
    <Link href={`/item/${save.id}`} className="card">
      <div className="card-top">
        <span className="card-type">{TYPE[save.type] ?? '—'}</span>
        <span className="card-date">{relativeDate(save.createdAt)}</span>
      </div>

      {save.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="card-thumb" src={save.thumbnailUrl} alt="" />
      )}

      <h3 className="card-title">{save.title || 'Untitled'}</h3>
      {save.summary ? (
        <p className="card-snippet">{save.summary}</p>
      ) : (
        save.text && save.text !== save.title && <p className="card-snippet">{save.text}</p>
      )}

      <div className="card-foot">
        {save.source && <span className="card-source">{save.source}</span>}
        {save.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        {save.aiTags
          .filter((t) => !save.tags.includes(t))
          .map((t) => <span key={t} className="tag tag-ai">{t}</span>)}
        {save.status === 'pending' && <span className="badge-pending">fetching</span>}
        {save.status === 'error' && <span className="badge-error">no preview</span>}
        {save.enrichStatus === 'pending' && <span className="badge-pending">summarizing</span>}
      </div>
    </Link>
  );
}
