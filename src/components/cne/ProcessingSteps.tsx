import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react';

export interface ProcessingDetail {
  message?:string; substeps?:string[]; currentModel?:string; geminiStage?:string; status?:string;
  attempt?:number; maxAttempts?:number; requestStartedAt?:number; retryReason?:string;
  completedModels?:Record<string,string>; chunkNumbers?:number[]; questionStates?:Record<string,string>;validatedCount?:number;
}
export interface ProcessingProgress extends ProcessingDetail {
  stage:number; updatedAt?:number; startedAt?:number; fileId?:string; indexedAt?:string;
  reviewedCount?:number; totalChunks?:number; steps?:Record<string,ProcessingDetail>;
}
export function useProcessingClock(running:boolean) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{setNow(Date.now());if(!running)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[running]);
  return now;
}
export function formatProcessingTime(seconds:number){const n=Math.max(0,Math.floor(seconds));return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;}
const labels:Record<string,string>={BLUEPRINT:'Clinical blueprint',MCQ_GENERATION:'MCQ generation',QUESTION_REPAIR:'Question repair',ANSWER_KEY_REPAIR:'Answer-key repair',MATERIAL_REVIEW:'Source text review'};
const reasons:Record<string,string>={AI_REQUEST_TIMEOUT:'Request timed out',AI_MODEL_NOT_FOUND:'Model unavailable',AI_TEMPORARILY_UNAVAILABLE:'Gemini temporarily unavailable',AI_NETWORK_ERROR:'Server network error',AI_RATE_LIMITED:'Rate limit',AI_QUOTA_LIMITED:'Model quota limit',AI_INVALID_RESPONSE:'Invalid structured response',AI_GENERATION_DEADLINE:'Execution deadline'};
export const ProcessingSteps:React.FC<{labels:readonly string[];active:number;running:boolean;failed?:boolean;details?:Record<string,ProcessingDetail>;now:number;error?:string}> = ({labels:steps,active,running,failed,details={},now,error}) => (
  <ol className="space-y-3 border-t border-slate-100 pt-3">
    {steps.map((label,i)=>{
      const n=i+1, done=n<active, current=n===active, bad=current&&failed, detail=details[String(n)];
      return <li key={label} className="flex items-start gap-2 text-xs">
        {done?<CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"/>:bad?<AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"/>:current&&running?<Loader2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-teal-700"/>:<Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"/>}
        <div className="min-w-0 flex-1 space-y-1 break-words">
          <p className={current?'font-semibold text-slate-900':done?'text-slate-700':'text-slate-500'}>{n}. {label}</p>
          {(done||current)&&detail&&<div className="space-y-1 pl-1 text-[11px] leading-relaxed text-slate-600">
            {detail.substeps?.filter(m=>m!==detail.message).map(m=><p key={m}>{m}</p>)}
            {detail.message&&<p>{detail.message}</p>}
            {Object.entries(detail.questionStates||{}).map(([q,state])=><p key={q}>Question {q}: {state}</p>)}
            {Object.entries(detail.completedModels||{}).map(([stage,model])=><p key={stage}><span className="font-medium">{labels[stage]||stage}:</span> {model}</p>)}
            {current&&detail.currentModel&&detail.status!=='COMPLETE'&&detail.status!=='BATCH_SAVED'&&<div className="rounded-lg bg-slate-50 p-2 space-y-1">
              <p>{labels[detail.geminiStage||'']||'Gemini'} · <strong>{detail.currentModel}</strong></p>
              {!!detail.maxAttempts&&<p>Model attempt {detail.attempt}/{detail.maxAttempts}</p>}
              {detail.chunkNumbers?.length&&<p>Source chunks: {detail.chunkNumbers.join(', ')}</p>}
              {running&&detail.status==='RUNNING'&&!!detail.requestStartedAt&&<p>Request elapsed: {formatProcessingTime((now-detail.requestStartedAt)/1000)}</p>}
              {detail.retryReason&&<p className="text-amber-800">{reasons[detail.retryReason]||detail.retryReason}{detail.status==='RETRY_WAIT'?' · switching model':''}</p>}
            </div>}
          </div>}
          {bad&&error&&<p role="alert" className="rounded-lg bg-amber-50 p-2 text-amber-900">{error}</p>}
        </div>
      </li>;
    })}
  </ol>
);
