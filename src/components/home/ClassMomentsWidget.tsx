import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Images, Maximize2, X } from 'lucide-react';
import { GalleryItem } from '../../types';
import { parseToIsoDateString } from '../../utils';

interface ClassMomentsWidgetProps {
  items: GalleryItem[];
  loading: boolean;
  loadFailed?: boolean;
  onViewAll?: () => void;
}

/** Most recent class dates first; newest uploaded row wins ties. */
export function latestClassMoments(items: GalleryItem[], maxItems = 4): GalleryItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.isActive !== false && Boolean(item.imageUrl?.trim()))
    .sort((a, b) => {
      const dateA = parseToIsoDateString(a.item.date) || '';
      const dateB = parseToIsoDateString(b.item.date) || '';
      return dateB.localeCompare(dateA) || b.index - a.index;
    })
    .slice(0, maxItems)
    .map(({ item }) => item);
}

export const ClassMomentsWidget: React.FC<ClassMomentsWidgetProps> = ({
  items,
  loading,
  loadFailed = false,
  onViewAll
}) => {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const latest = useMemo(() => latestClassMoments(items), [items]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="cne-moments-title">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/15 bg-white/10 p-2.5" aria-hidden="true">
            <Images className="h-5 w-5 text-teal-200" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-200">Learning in action</p>
            <h2 id="cne-moments-title" className="mt-0.5 text-base font-bold tracking-tight sm:text-lg">Class Photos &amp; Moments</h2>
          </div>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            View full gallery <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {loading && latest.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-2" role="status" aria-label="Loading class photos">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100 sm:h-40" />)}
        </div>
      ) : latest.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-600">
          <Images className="h-6 w-6 shrink-0 text-teal-600" aria-hidden="true" />
          <p>{loadFailed
            ? 'Class photos could not be loaded. Please try opening the gallery again later.'
            : 'Class photos will appear here after an administrator publishes training moments in Admin Content.'}</p>
        </div>
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 sm:grid sm:grid-cols-2 sm:overflow-visible" aria-label="Recent class photos">
          {latest.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelected(item)}
              aria-label={`Enlarge photo: ${item.title}`}
              className="group relative w-[73%] max-w-[270px] shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:w-auto sm:max-w-none"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
                <span className="absolute right-2 top-2 rounded-lg bg-slate-950/75 p-1.5 text-white opacity-80" aria-hidden="true">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-3 py-2.5">
                <span className="block truncate text-xs font-bold text-slate-900">{item.title}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{item.date}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Photo: ${selected.title}`}
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close photo"
              className="absolute right-3 top-3 z-10 cursor-pointer rounded-lg bg-slate-950/75 p-2 text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex max-h-[75dvh] items-center justify-center bg-black">
              <img src={selected.imageUrl} alt={selected.title} referrerPolicy="no-referrer" className="max-h-[75dvh] max-w-full object-contain" />
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-bold">{selected.title}</p>
              <p className="mt-1 text-xs text-slate-300">{selected.date}{selected.description ? ` · ${selected.description}` : ''}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
