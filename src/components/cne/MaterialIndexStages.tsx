import React, { useState } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export type MaterialIndexStage = 'idle' | 'upload' | 'extract' | 'ai' | 'verify' | 'images' | 'done' | 'failed';
const steps = [
  { id: 'upload', label: 'Upload original learning material to private Drive' },
  { id: 'extract', label: 'Extract teaching text, tables and source sections' },
  { id: 'ai', label: 'Review extracted text for NCLEX V2.1 CNE Post-Test evidence' },
  { id: 'verify', label: 'Validate source IDs, index coverage and quality' },
  { id: 'images', label: 'Extract relevant learning-material images' },
  { id: 'done', label: 'Text evidence ready to draft five A–D Post-Test questions' },
] as const;

interface Props {
  stage: MaterialIndexStage;
  reviewedCount?: number;
  totalChunks?: number;
  error?: string;
  uploadAlreadyDone?: boolean;
}

/** Compact mobile-first status. It displays actual saved batch progress, never
 * estimates timing or claims that Gemini has clinically approved the source. */
export const MaterialIndexStages: React.FC<Props> = ({ stage, reviewedCount = 0, totalChunks = 0, error, uploadAlreadyDone }) => {
  const [expanded, setExpanded] = useState(false);
  if (stage === 'idle') return null;
  const stalled = stage === 'failed';
  const active = stalled ? 2 : steps.findIndex(s => s.id === stage);
  const complete = stage === 'done';
  const count = Math.min(Math.max(0, reviewedCount), Math.max(0, totalChunks));
  const percentage = totalChunks > 0 ? Math.round(100 * count / totalChunks) : 0;
  const label = complete ? 'Review complete — source index ready' : stalled ? 'Source review needs attention'
    : stage === 'ai' ? `Reviewing source text${totalChunks ? ` · ${count}/${totalChunks}` : ''}`
    : stage === 'verify' ? 'Checking source references and evidence quality'
    : stage === 'images' ? 'Preparing optional teaching images'
    : stage === 'extract' ? 'Extracting source text and sections' : 'Uploading learning material';
  return (
    <section aria-label="Material indexing progress" className="rounded-xl border border-teal-200 bg-white p-3 text-xs shadow-sm">
      <div className="flex items-center gap-2.5">
        {complete ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700"/>
          : stalled ? <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700"/>
          : <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-teal-700"/>}
        <div className="min-w-0 flex-1">
          <p role="status" aria-live="polite" className="font-semibold text-slate-900">{label}</p>
          {totalChunks > 0 && <p className="mt-0.5 text-[11px] text-slate-600">{count} of {totalChunks} text chunks reviewed · {percentage}%</p>}
        </div>
        <button type="button" aria-expanded={expanded} aria-controls="cne-index-step-details"
          onClick={() => setExpanded(value => !value)} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-teal-800 hover:bg-teal-50">
          {expanded ? 'Hide steps' : '6 steps'} {expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
        </button>
      </div>
      {totalChunks > 0 && <div role="progressbar" aria-label="Source chunks reviewed" aria-valuenow={count} aria-valuemin={0} aria-valuemax={totalChunks}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600 transition-[width]" style={{width:`${percentage}%`}} />
      </div>}
      {error && <p role="alert" className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900 break-words">{error}</p>}
      {expanded && <ol id="cne-index-step-details" className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        {steps.map((step,i) => {
          const finished = complete || (active >= 0 && i < active) || (uploadAlreadyDone && i === 0);
          const running = !stalled && !complete && i === active;
          const attention = stalled && i === 2;
          return <li key={step.id} className="flex items-start gap-2">
            {finished ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"/> :
              running ? <Loader2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-teal-700"/> :
              attention ? <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"/> :
              <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"/>}
            <span className={running ? 'font-semibold text-teal-900' : attention ? 'font-semibold text-amber-900' : 'text-slate-700'}>{i+1}. {step.label}</span>
          </li>;
        })}
      </ol>}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Gemini evaluates extracted text for retrieval quality, not clinical correctness. Only source-grounded questions can proceed to educator review.</p>
    </section>
  );
};
