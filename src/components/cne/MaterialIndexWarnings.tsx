import React from 'react';

export interface MaterialIndexWarning {
  key: string;
  section: string;
  descriptions: string[];
}

/**
 * Render source-derived extraction warnings, never interpret them as a verified
 * clinical finding. Material_List.Indexing_Message and the authorized AI status
 * currently expose a bounded textual summary rather than a warning-row table.
 */
export function parseMaterialIndexWarnings(raw: string): MaterialIndexWarning[] {
  const beforeReview = String(raw || '').split(/ \| GEMINI_REVIEW=/)[0];
  const value = beforeReview.split(/FIDELITY_WARNINGS=\d+;\s*EXCLUDED_CHUNKS=\d+;\s*/).pop() || '';
  const clean = value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || !/\b(?:Chunk|Slide|Page)\s+\d+\b/i.test(clean)) return [];
  const marker = /\b(Chunk|Slide|Page)\s+(\d+)(?:\s*\(([^)]{1,100})\))?\s*:/gi;
  const positions = Array.from(clean.matchAll(marker));
  const grouped = new Map<string, MaterialIndexWarning>();
  positions.forEach((match, i) => {
    const start = (match.index || 0) + match[0].length;
    const end = i + 1 < positions.length ? positions[i + 1].index || clean.length : clean.length;
    const detail = clean.slice(start, end).replace(/^[\s;,|]+|[\s;,|]+$/g, '');
    const prefix = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const section = `${prefix} ${match[2]}${match[3] ? ` — ${match[3].trim()}` : ''}`;
    const key = `${prefix}-${match[2]}`;
    const entries = detail.split(/;\s*/).map(v => v.trim()).filter(v => v && !/^and \d+ additional warnings/i.test(v));
    if (!entries.length) return;
    const existing = grouped.get(key);
    if (existing) existing.descriptions.push(...entries.filter(v => !existing.descriptions.includes(v)));
    else grouped.set(key, {key, section, descriptions: entries});
  });
  return Array.from(grouped.values());
}

interface Props {
  warningText?: string;
  warningCount?: number;
  excludedCount?: number;
  compact?: boolean;
  /** The parent controls overall disclosure; rows themselves are always separate. */
}

export const MaterialIndexWarnings: React.FC<Props> = ({warningText = '', warningCount = 0, excludedCount = 0, compact = false}) => {
  const rows = parseMaterialIndexWarnings(warningText);
  const hiddenCount = Math.max(0, warningCount - rows.reduce((sum, row) => sum + row.descriptions.length, 0));
  return (
    <div className="space-y-2 text-xs">
      <p className="text-amber-900">{warningCount} extraction warning(s); {excludedCount} passage(s) excluded from AI evidence.</p>
      {rows.map(row => (
        <div key={row.key} className={`rounded-lg border border-amber-200 bg-white ${compact ? 'p-2' : 'p-3'}`}>
          <div className="flex items-center justify-between gap-2">
            <strong className="break-words text-slate-900">{row.section}</strong>
            <span className="shrink-0 text-[10px] font-semibold text-amber-800">Excluded</span>
          </div>
          <ul className="mt-1 space-y-1 text-slate-700">
            {row.descriptions.map((description, index) => <li key={`${row.key}-${index}`}>• {description}</li>)}
          </ul>
        </div>
      ))}
      {rows.length === 0 && warningText && <p className="rounded-md border border-amber-200 bg-white p-2 break-words">{warningText}</p>}
      {hiddenCount > 0 && <p className="text-amber-800">{hiddenCount} additional warning(s) are summarized in the source indexing message. Reupload an editable original when important details are missing.</p>}
    </div>
  );
};
