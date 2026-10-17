import React from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { NewsEventItem } from '../../types';

interface NewsCircularsWidgetProps {
  newsEvents: NewsEventItem[];
  onSelectNews: (news: NewsEventItem) => void;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'teal';
  limit?: number;
}

export const NewsCircularsWidget: React.FC<NewsCircularsWidgetProps> = ({
  newsEvents,
  onSelectNews,
  accentColor = 'emerald',
  limit = 5
}) => {
  const iconColor = {
    emerald: 'text-amber-400',
    blue: 'text-amber-400',
    amber: 'text-amber-400',
    teal: 'text-amber-400'
  }[accentColor];

  const titleHoverColor = {
    emerald: 'group-hover:text-emerald-700',
    blue: 'group-hover:text-blue-700',
    amber: 'group-hover:text-amber-700',
    teal: 'group-hover:text-teal-700'
  }[accentColor];

  // Keep news in its published order. Unlike the old one-time 9-second timer,
  // attention is controlled by each published item and remains noticeable when
  // news arrives after an asynchronous homepage bootstrap request.
  const items = newsEvents.slice(0, limit);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className={`w-4 h-4 ${iconColor}`} />
          <h2 className="text-sm font-bold tracking-tight">News & Circulars</h2>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Live
        </span>
      </div>

      <div className="p-3 divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No circulars posted.</div>
        ) : (
          items.map((news) => (
            <button
              key={news.id}
              type="button"
              onClick={() => onSelectNews(news)}
              className={`block w-full text-left py-3 first:pt-1 last:pb-1 space-y-1.5 cursor-pointer group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${news.blinkAttention ? 'border-l-[3px] border-amber-500 bg-amber-50/30 pl-2 pr-1' : ''}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">
                  {news.date}
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  {news.blinkAttention && (
                    <span
                      className="cne-news-attention-badge inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-950"
                      aria-label="Attention: highlighted circular"
                    >
                      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                        <span className="cne-news-attention-halo absolute inset-0 rounded-full bg-amber-500/40" />
                        <AlertCircle className="cne-news-attention-icon relative h-4 w-4 text-amber-700" />
                      </span>
                      <span className="cne-news-attention-text">ATTENTION</span>
                    </span>
                  )}
                </span>
              </span>
              <span className={`block text-xs font-bold text-slate-900 ${titleHoverColor} transition-colors line-clamp-2 leading-snug`}>
                {news.title}
              </span>
              <span className="block text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {news.summary}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
