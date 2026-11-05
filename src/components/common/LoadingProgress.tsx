import React from 'react';

/**
 * Honest loading feedback: known record counts show real progress; unknown
 * work remains indeterminate. No elapsed-time or invented percentage values.
 */
export const LoadingProgress: React.FC<{
  label: string;
  loaded?: number;
  total?: number;
  className?: string;
}> = ({ label, loaded, total, className = '' }) => {
  const measured = typeof loaded === 'number' && Number.isFinite(loaded) &&
    typeof total === 'number' && Number.isFinite(total) && total > 0;
  const percent = measured ? Math.min(100, Math.max(0, Math.round((loaded / total) * 100))) : undefined;
  return (
    <div className={`w-full max-w-sm space-y-1.5 ${className}`} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-600">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{measured ? `${percent}%` : 'Loading…'}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={measured ? 0 : undefined}
        aria-valuemax={measured ? 100 : undefined}
        aria-valuenow={percent}
        aria-valuetext={measured ? `${loaded} of ${total} records received` : 'Processing, progress not available'}
        className="relative h-1.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div className={measured ? 'h-full rounded-full bg-teal-600 transition-[width] duration-300' : 'cne-loading-indeterminate h-full w-[32%] rounded-full bg-teal-600'}
          style={measured ? { width: `${percent}%` } : undefined}/>
      </div>
    </div>
  );
};
