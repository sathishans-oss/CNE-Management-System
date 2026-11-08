import React from 'react';
import { BookOpenCheck, CheckCircle2 } from 'lucide-react';
import type { QuizQuestion } from '../types';
import { responseFormat } from '../utils/quizResponse';

export interface ExplanationSection {
  label: string;
  text: string;
}
export interface ParsedClinicalExplanation {
  intro: string;
  sections: ExplanationSection[];
}

/**
 * Presentation only: do not rewrite, summarize, or save question rationales.
 * Distinguish explicit A–F explanation markers from letters in clinical prose.
 * Require at least two different option markers before making option rows.
 * If a rationale is unstructured, render it verbatim as a normal paragraph.
 */
export function splitQuizClinicalExplanation(raw: string, format: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'ORDERED_RESPONSE'): ParsedClinicalExplanation {
  const source = String(raw || '').trim();
  if (!source) return { intro: '', sections: [] };

  if (format === 'ORDERED_RESPONSE') {
    // Ordered response: respect explicitly numbered step explanations. Do not
    // invent steps or force A–F option rationales into a sequence.
    const numbered = /(?:Step\s+)?(\d{1,2})[.):]\s+/gim;
    const markers: Array<{start:number;end:number;label:string}> = [];
    let match: RegExpExecArray | null;
    while ((match = numbered.exec(source)) !== null) {
      if (match.index !== 0 && !/(?:\n\s*|[.!?]\s+)$/.test(source.slice(0, match.index))) continue;
      markers.push({start: match.index, end: numbered.lastIndex, label: match[1]});
    }
    // Step numbers must genuinely be 1, 2, 3...; clinical doses such as
    // "15." and "30." must never be mistaken for ordered nursing actions.
    if (markers.length < 2 || markers.some((m,i)=>Number(m.label)!==i+1)) return { intro: source, sections: [] };
    const sections = markers.map((marker,i)=>({ label:marker.label, text:source.slice(marker.end, markers[i+1]?.start ?? source.length).trim() })).filter(s=>s.text);
    return sections.length >= 2 ? {intro:source.slice(0,markers[0].start).trim(),sections} : {intro:source,sections:[]};
  }

  // Captures "Correct: A.", "Option B:", "C is incorrect", "D delays..."
  // only at the beginning of a rationale or immediately following a sentence/newline.
  const labeled = /(?:(?:Correct(?:\s+answer)?|Incorrect)\s*:\s*)?(?:Option\s+)?([A-F])(?:[.):]\s+|[—–-]\s+|\s+(?=(?:is|was|would|can|could|should|may|might|delays|increases|decreases|provides|prevents|worsens|requires|allows|causes|does|fails|offers|helps|treats|gives|administers|addresses|means)\b))/gi;
  const markers: Array<{start:number;end:number;label:string}> = [];
  let match: RegExpExecArray | null;
  while ((match = labeled.exec(source)) !== null) {
    if (match.index !== 0 && !/(?:[.!?]\s+|\n\s*)$/.test(source.slice(0,match.index))) continue;
    markers.push({start:match.index,end:labeled.lastIndex,label:match[1].toUpperCase()});
  }
  if (markers.length < 2 || new Set(markers.map(m=>m.label)).size < 2) return {intro:source,sections:[]};
  const sections = markers.map((marker,i)=>({label:marker.label,text:source.slice(marker.end,markers[i+1]?.start ?? source.length).trim()})).filter(s=>s.text);
  if (sections.length < 2) return {intro:source,sections:[]};
  return {intro:source.slice(0,markers[0].start).trim(),sections};
}

export const QuizClinicalExplanation: React.FC<{question:QuizQuestion;className?:string}> = ({question,className=''}) => {
  const format=responseFormat(question);
  const parsed=splitQuizClinicalExplanation(question.explanation||'',format);
  const correct=new Set((question.correctOption||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean));
  const ordered=format==='ORDERED_RESPONSE';
  return <section className={`min-w-0 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-3 sm:px-4 sm:py-4 ${className}`} aria-label="Clinical Explanation">
    <h5 className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-900"><BookOpenCheck className="h-4 w-4 shrink-0" aria-hidden="true"/>Clinical Explanation</h5>
    {!parsed.sections.length ? <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.6] text-slate-700 sm:text-base">{parsed.intro||'Explanation unavailable.'}</p> : <div className="space-y-3">
      {parsed.intro&&<p className="whitespace-pre-wrap break-words text-[15px] leading-[1.6] text-slate-700 sm:text-base">{parsed.intro}</p>}
      <div className="space-y-0 divide-y divide-teal-100/90">
        {parsed.sections.map((section,i)=>{
          const right=!ordered&&correct.has(section.label);
          return <div key={`${section.label}-${i}`} className={`flex min-w-0 items-start gap-2.5 py-3 first:pt-1 last:pb-0 ${right?'text-emerald-950':'text-slate-700'}`}>
            <span className={`inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-extrabold ${right?'bg-emerald-200 text-emerald-900':'bg-white text-slate-700 ring-1 ring-slate-200'}`}>{section.label}</span>
            <div className="min-w-0 flex-1">
              {right&&<span className="mb-1 flex items-center gap-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true"/> Correct option</span>}
              <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.6] sm:text-base">{section.text}</p>
            </div>
          </div>;
        })}
      </div>
    </div>}
  </section>;
};

export default QuizClinicalExplanation;
