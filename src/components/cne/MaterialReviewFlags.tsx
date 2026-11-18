import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface MaterialReviewFlag { chunk: number; section: string; reason: string; }

/** Only the server-produced, URI-encoded JSON diagnostic field is parsed.
 * Source text and model messages are displayed as inert React text, never HTML. */
export function parseMaterialReviewFlags(message: string): MaterialReviewFlag[] {
  const match = /(?:^|\s\|\s)GEMINI_FLAGS=([^|\s]*)/.exec(String(message || ''));
  if (!match) return [];
  try {
    const list: unknown = JSON.parse(decodeURIComponent(match[1]));
    if (!Array.isArray(list)) return [];
    return list.slice(0,60).filter((x):x is MaterialReviewFlag =>
      x && typeof x === 'object' && Number.isInteger(x.chunk) && x.chunk > 0 &&
      typeof x.section === 'string' && typeof x.reason === 'string'
    ).map(item => ({chunk:item.chunk,section:item.section.slice(0,65),reason:item.reason.slice(0,175)}));
  } catch { return []; }
}

export const MaterialReviewFlags: React.FC<{message?: string}> = ({message = ''}) => {
  const flags = parseMaterialReviewFlags(message);
  if (!flags.length) return null;
  return <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3" aria-label="Source chunks needing clarification">
    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0"/> {flags.length} source chunk(s) need clarification
    </div>
    <p className="text-[11px] leading-relaxed text-amber-900">Review the indicated sections in the original document. Gemini's observations are not independently verified diagnoses or corrections.</p>
    <ul className="space-y-2">
      {flags.map(item => <li key={item.chunk} className="rounded-md border border-amber-100 bg-white p-2 text-[11px] leading-relaxed text-slate-700">
        <strong className="block break-words text-slate-900">Chunk {item.chunk} · {item.section || 'Source section'}</strong>
        <span className="mt-1 block break-words">{item.reason || 'Ambiguous extraction: inspect source text.'}</span>
      </li>)}
    </ul>
  </section>;
};
