import React from 'react';
import { RefreshCw } from 'lucide-react';

/** Shared failure-only dropdown recovery control for ward and faculty selectors. */
export const DropdownRetry: React.FC<{
  error: string;
  loading: boolean;
  onRetry?: () => void;
  label: string;
}> = ({ error, loading, onRetry, label }) => {
  if (!error || loading || !onRetry) return null;
  return (
    <span role="alert" title={error} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
      <span>Unable to load. Click refresh to retry.</span>
      <button
        type="button"
        onClick={onRetry}
        title={`Retry loading ${label}`}
        aria-label={`Retry loading ${label}`}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
};
