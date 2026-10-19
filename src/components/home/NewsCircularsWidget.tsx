import React from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { NewsEventItem } from '../../types';
import { newestNewsFirst } from '../../utils';

interface NewsCircularsWidgetProps {
  newsEvents: NewsEventItem[];
  onSelectNews: (news: NewsEventItem) => void;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'teal';
  limit?: number;
}

export const NewsCircularsWidget: React.FC<NewsCircularsWidgetProps> = ({
  newsEvents,
  onSelectNews,
  accentColor = 'teal',
  limit = 5
}) => {
  const titleHoverColor = {
    emerald: 'group-hover:text-emerald-700',
    blue: 'group-hover:text-blue-700',
    amber: 'group-hover:text-amber-700',
    teal: 'group-hover:text-teal-700'
  }[accentColor];
  const items = newestNewsFirst(newsEvents).slice(0, limit);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs" aria-labelledby="cne-news-title">
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-3.5 text-white">
        <Bell className="h-4 w-4 text-rose-400" aria-hidden="true" />
        <h2 id="cne-news-title" className="text-sm font-bold tracking-tight">News &amp; Circulars</h2>
      </div>

      <div className="divide-y divide-slate-100 px-3">
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">No news or circulars posted.</div>
        ) : items.map((news) => (
          <button
            key={news.id}
            type="button"
            onClick={() => onSelectNews(news)}
            className={`group block w-full cursor-pointer rounded-lg py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 ${news.blinkAttention ? 'cne-news-new-row my-1 border-l-[3px] border-rose-600 bg-rose-50/60 pl-3 pr-2' : 'px-2'}`}
          >
            <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{news.date}</span>
              {news.blinkAttention && (
                <span className="cne-news-new-badge inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-700 bg-rose-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white" aria-label="New highlighted circular">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>NEW</span>
                </span>
              )}
            </span>
            <span className={`block line-clamp-2 text-xs font-bold leading-snug text-slate-900 transition-colors ${titleHoverColor}`}>
              {news.title}
            </span>
            <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-slate-600">{news.summary}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
