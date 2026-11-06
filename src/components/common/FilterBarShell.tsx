import React from 'react';

/**
 * Shared Quiz-inspired filter header. This is a presentation-only wrapper;
 * each page retains its own filters, permissions, caching and actions.
 */
export const FilterBarShell: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
  <section aria-label={`${title} filters`} className="relative isolate min-w-0 overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-white via-cyan-50 to-teal-100 px-3 py-3 shadow-sm sm:px-5 sm:py-4">
    <div className="pointer-events-none absolute -right-4 -top-12 h-40 w-40 rounded-full border-[24px] border-white/30" aria-hidden="true" />
    <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-2">
      <h2 className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">
        {icon}
        <span>{title}</span>
      </h2>
      {subtitle && <span className="text-[11px] font-medium text-teal-900/70">{subtitle}</span>}
    </div>
    <div className="relative mt-3 min-w-0 rounded-xl border border-white/80 bg-white/65 p-2.5 sm:p-3">
      {children}
    </div>
  </section>
);
