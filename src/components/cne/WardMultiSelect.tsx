import React, { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export type WardStaffCounts = Record<string, number | null>;

/** Only the canonical primary ward is used for ownership and reporting. */
export function choosePrimaryWard(current: string, selected: string[], eligible: string[]): string {
  const eligibleKeys = new Set(eligible.map((x) => x.trim().toUpperCase()));
  const active = selected.filter((x) => eligibleKeys.has(x.trim().toUpperCase()));
  return active.some((x) => x.trim().toUpperCase() === current.trim().toUpperCase())
    ? active.find((x) => x.trim().toUpperCase() === current.trim().toUpperCase()) || ''
    : active[0] || '';
}

interface Props {
  availableWards: string[];
  eligiblePrimaryWards: string[];
  selected: string[];
  primaryWard: string;
  staffCounts: WardStaffCounts;
  onChange: (selected: string[], primary: string) => void;
  disabled?: boolean;
}

export const WardMultiSelect: React.FC<Props> = ({
  availableWards, eligiblePrimaryWards, selected, primaryWard, staffCounts, onChange, disabled
}) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const displayed = useMemo(() => availableWards.filter((name) => name.toLowerCase().includes(query.toLowerCase().trim())), [availableWards, query]);
  const selectedTotal = selected.reduce((sum: number, name) => {
    const value = staffCounts[name.trim().toUpperCase()];
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
  const countsComplete = selected.every((name) => {
    const value = staffCounts[name.trim().toUpperCase()];
    return typeof value === 'number' && Number.isFinite(value);
  });
  const eligible = new Set(eligiblePrimaryWards.map((x) => x.trim().toUpperCase()));

  const toggleWard = (name: string) => {
    if (disabled) return;
    const next = selected.some((x) => x.toUpperCase() === name.toUpperCase())
      ? selected.filter((x) => x.toUpperCase() !== name.toUpperCase())
      : [...selected, name];
    onChange(next, choosePrimaryWard(primaryWard, next, eligiblePrimaryWards));
  };

  return (
    <div className="relative">
      <button type="button" disabled={disabled} aria-expanded={expanded}
        onClick={() => setExpanded((old) => !old)}
        className="w-full flex justify-between items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-left text-xs focus:ring-2 focus:ring-purple-500 disabled:opacity-60">
        <span className="font-semibold text-purple-900">{selected.length ? `${selected.length} ward${selected.length > 1 ? 's' : ''} selected` : 'Select Department / Ward...'}</span>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>
      {expanded && (
        <div className="mt-1 rounded-lg border border-slate-300 bg-white shadow-lg p-2 max-h-64 overflow-auto">
          <label className="flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1 mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search wards" className="text-xs w-full outline-none" />
          </label>
          {displayed.map((name) => {
            const active = selected.some((x) => x.trim().toUpperCase() === name.trim().toUpperCase());
            const count = staffCounts[name.trim().toUpperCase()];
            const isPrimary = primaryWard.trim().toUpperCase() === name.trim().toUpperCase();
            return (
              <label key={name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" checked={active} disabled={disabled} onChange={() => toggleWard(name)} className="accent-purple-700" />
                <span className="flex-1 text-xs text-slate-800">{name} ({typeof count === 'number' ? `${count} staff` : 'Count unavailable'})</span>
                {isPrimary && <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-1 rounded">Primary</span>}
                {!eligible.has(name.trim().toUpperCase()) && <span className="text-[9px] text-slate-500">Participating only</span>}
              </label>
            );
          })}
          {!displayed.length && <p className="text-xs text-slate-500 px-2 py-1">No matching wards</p>}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-1.5 text-[11px] text-slate-600 space-y-1">
          <p className="break-words">{selected.join(', ')}</p>
          <p>{selected.length} ward(s) · Total Allotted Staff: <strong>{countsComplete ? selectedTotal : 'Count unavailable'}</strong></p>
          {!primaryWard && <p className="text-rose-600">Select at least one ward within your authorized responsibility.</p>}
          {!countsComplete && <p className="text-amber-700">Missing master staffing count. Ask Admin to update the CNE staff count sheet.</p>}
        </div>
      )}
    </div>
  );
};
