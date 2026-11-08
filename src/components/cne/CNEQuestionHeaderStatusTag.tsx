import React from 'react';
/** Read-only status badge shared by CNE Question Manager header indicators. */
export const CNEQuestionHeaderStatusTag: React.FC<{
  tone: 'ready' | 'pending' | 'locked';
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <span className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
    tone === 'ready' ? 'bg-emerald-100 text-emerald-800' :
    tone === 'locked' ? 'border border-rose-200 bg-rose-100 text-rose-800' :
    'bg-amber-100 text-amber-800'
  }`}>{children}</span>
);
