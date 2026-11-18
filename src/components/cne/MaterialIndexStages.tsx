import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

export type MaterialIndexStage = 'idle' | 'upload' | 'extract' | 'ai' | 'verify' | 'images' | 'done' | 'failed';
const steps = [
  { id: 'upload', label: 'Upload original learning material to private Drive' },
  { id: 'extract', label: 'Extract teaching text, tables and source sections' },
  { id: 'ai', label: 'Gemini review of all eligible extracted text' },
  { id: 'verify', label: 'Validate source IDs, index coverage and quality' },
  { id: 'images', label: 'Extract relevant learning-material images' },
  { id: 'done', label: 'Material ready for source-grounded questions' },
] as const;

interface Props {
  stage: MaterialIndexStage;
  reviewedCount?: number;
  totalChunks?: number;
  error?: string;
  uploadAlreadyDone?: boolean;
}

/** Pure progress presentation. Stages reflect completed API calls, not predicted timings. */
export const MaterialIndexStages: React.FC<Props> = ({ stage, reviewedCount, totalChunks, error, uploadAlreadyDone }) => {
  if (stage === 'idle') return null;
  const active = stage === 'failed' ? -1 : steps.findIndex(s => s.id === stage);
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-teal-100 bg-white p-3 text-xs space-y-2">
      <div className="font-bold text-slate-800">CNE material processing steps</div>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const finished = stage === 'done' || (active >= 0 && i < active) || (uploadAlreadyDone && i === 0);
          const running = i === active && stage !== 'done';
          const failed = stage === 'failed' && i === 2;
          return <li key={step.id} className="flex items-start gap-2">
            {finished ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"/> :
              running ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-teal-700"/> :
              failed ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"/> :
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"/>}
            <div className="min-w-0">
              <div className={finished ? 'text-slate-700' : running ? 'font-semibold text-teal-800' : 'text-slate-500'}>{i + 1}. {step.label}</div>
              {step.id === 'ai' && typeof totalChunks === 'number' && totalChunks > 0 &&
                <div className="mt-1 text-[11px] text-slate-600">Reviewed {Math.min(reviewedCount || 0, totalChunks)} of {totalChunks} indexed chunks</div>}
            </div>
          </li>;
        })}
      </ol>
      {error && <p role="alert" className="rounded bg-rose-50 p-2 text-rose-700">{error}</p>}
      <p className="text-[11px] text-slate-500">Gemini provides an additional AI-assisted review, not independent clinical approval. Original files are never sent to Gemini.</p>
    </div>
  );
};
