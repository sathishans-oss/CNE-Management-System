import React from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

/** Only hides secondary filters on narrow screens. Applied filter state remains active. */
export const ResponsiveFilterToggle: React.FC<{
  expanded: boolean;
  onToggle: () => void;
  activeCount?: number;
  controlsId: string;
}> = ({ expanded, onToggle, activeCount = 0, controlsId }) => (
  <button type="button" aria-expanded={expanded} aria-controls={controlsId}
    onClick={onToggle}
    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:hidden">
    <SlidersHorizontal className="h-4 w-4 text-teal-700" aria-hidden="true" />
    {expanded ? 'Hide filters' : 'More filters'}
    {activeCount > 0 && <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[11px] text-teal-900" aria-label={`${activeCount} active filters`}>{activeCount}</span>}
    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
  </button>
);
