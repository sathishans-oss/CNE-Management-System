import React, { useRef } from 'react';
import { AlertCircle, ListChecks } from 'lucide-react';
import { ProcessingSteps, ProcessingProgress, useProcessingClock, formatProcessingTime } from './ProcessingSteps';

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
  stage:MaterialIndexStage; reviewedCount?:number;totalChunks?:number;error?:string;
  uploadAlreadyDone?:boolean; running?:boolean; detail?:ProcessingProgress|null; startedAt?:number;
}
export const MaterialIndexStages:React.FC<Props> = ({stage,reviewedCount=0,totalChunks=0,error,uploadAlreadyDone,running=false,detail,startedAt})=>{
  const now=useProcessingClock(running);
  const prior=useRef(totalChunks>0?3:1);
  const position=steps.findIndex(s=>s.id===stage)+1;
  if(position>0&&stage!=='done')prior.current=position;
  if(stage==='idle'||stage==='done')return null;
  const failed=stage==='failed';
  const active=failed?Math.max(uploadAlreadyDone?2:1,prior.current):position||3;
  const count=Math.min(Math.max(0,reviewedCount),Math.max(0,totalChunks));
  const percent=totalChunks>0?Math.round(100*count/totalChunks):0;
  return <section aria-label="Material indexing progress" className="rounded-xl border border-teal-200 bg-white p-3 text-xs">
    <div className="flex items-center gap-2">
      {failed?<AlertCircle className="h-5 w-5 shrink-0 text-amber-700"/>:<ListChecks className="h-5 w-5 shrink-0 text-teal-700"/>}
      <div className="flex-1 min-w-0"><p role="status" className="font-semibold">{failed?'Source review needs attention':running?'Preparing source evidence':'Source review pending'}</p>
      {!!totalChunks&&<p className="text-slate-600">{count} of {totalChunks} text chunks reviewed · {percent}%</p>}</div>
      {running&&!!startedAt&&<span className="shrink-0 tabular-nums text-slate-600">Elapsed {formatProcessingTime((now-Math.min(startedAt,detail?.startedAt||startedAt))/1000)}</span>}
    </div>
    {!!totalChunks&&<div role="progressbar" aria-label="Source chunks reviewed" aria-valuenow={count} aria-valuemin={0} aria-valuemax={totalChunks} className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-600" style={{width:`${percent}%`}}/></div>}
    <div className="mt-3"><ProcessingSteps labels={steps.map(s=>s.label)} active={active} running={running&&!failed} failed={failed} now={now} error={error} details={{
      1:{message:active>1?'Learning resource stored in private Drive.':undefined},
      2:{message:active>2&&totalChunks?`${totalChunks} source chunks extracted.`:undefined},
      3:{message:active>3?'Source text review complete.':!running&&!failed?'Resume from Material Indexing Status.':undefined,...(detail||{})},
      4:{message:active>4?'Source coverage and IDs checked; no unresolved AI review flags.':active===4?'Checking current-source readiness.':undefined},
      5:{message:active===5?'Preparing optional teaching images. Text review is already saved.':undefined},
    }}/></div>
    <p className="mt-2 text-[11px] text-slate-500">Gemini evaluates retrieval quality, not clinical correctness. Educator review is required.</p>
  </section>;
};
