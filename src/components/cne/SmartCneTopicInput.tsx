import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, RotateCcw, Search, ShieldAlert } from 'lucide-react';
import { correctCompletedClinicalWord, expandTopicAbbreviation, interpretCneTopic, needsTopicClarification, suggestCneTopics } from '../../data/cneTopicEngine';

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Local-only CNE topic suggestions: no browser search queries, external requests,
 * or transfer of patient identifiers. Clinical terms are candidates, not approved
 * terminology; the educator always controls the saved topic.
 */
export const SmartCneTopicInput: React.FC<Props> = ({ value, onChange, id, placeholder, required=true, disabled=false, className='' }) => {
  const generatedId=useId();
  const inputId=id || `cne-topic-${generatedId}`;
  const listId=`${inputId}-suggestions`;
  const fieldRef=useRef<HTMLInputElement>(null);
  const [focused,setFocused]=useState(false);
  const [suppressSuggestions,setSuppressSuggestions]=useState(false);
  const [activeIndex,setActiveIndex]=useState(-1);
  const [undo,setUndo]=useState<{before:string;after:string;label:string}|null>(null);
  const matches=useMemo(()=>suggestCneTopics(value,5),[value]);
  const clarify=useMemo(()=>needsTopicClarification(value),[value]);
  const interpretation=useMemo(()=>interpretCneTopic(value),[value]);
  useEffect(()=>{
    if (!fieldRef.current)return;
    fieldRef.current.setCustomValidity(clarify.length ? `Clarify ${clarify.map(t=>t.short).join(', ')} using its full clinical term before saving.` : '');
  },[clarify]);
  const update=(next:string)=>{
    setSuppressSuggestions(false);
    const correction=correctCompletedClinicalWord(next);
    if(correction){onChange(correction.value);setUndo({before:next,after:correction.value,label:correction.correction});}
    else{onChange(next);setUndo(null);}
    setActiveIndex(-1);
  };
  const accept=(next:string)=>{onChange(next);setUndo(null);setSuppressSuggestions(true);setActiveIndex(-1);fieldRef.current?.focus();};
  const showList=focused && !suppressSuggestions && matches.length>0 && !disabled;
  return <div className="relative min-w-0">
    <div className="relative">
      <input
        ref={fieldRef} id={inputId} name="cneTopic" type="text" value={value}
        required={required} disabled={disabled} placeholder={placeholder || 'Enter CNE clinical topic…'}
        onChange={e=>update(e.target.value)} onFocus={()=>{setFocused(true);setSuppressSuggestions(false);}} onClick={()=>{setFocused(true);setSuppressSuggestions(false);}}
        onBlur={()=>setFocused(false)}
        onKeyDown={e=>{
          if(e.key==='Escape'){setSuppressSuggestions(true);setActiveIndex(-1);return;}
          if(e.key==='ArrowDown' && showList){e.preventDefault();setActiveIndex(i=>(i+1)%matches.length);return;}
          if(e.key==='ArrowUp' && showList){e.preventDefault();setActiveIndex(i=>(i<1?matches.length-1:i-1));return;}
          if(e.key==='Enter' && showList && activeIndex>=0){e.preventDefault();accept(matches[activeIndex].text);}
        }}
        autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={showList}
        aria-controls={listId} aria-activedescendant={showList&&activeIndex>=0?`${listId}-${activeIndex}`:undefined}
        aria-invalid={clarify.length>0} aria-describedby={clarify.length?`${inputId}-clarify`:undefined}
        className={`${className || 'w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'} pr-8`}
      />
      <Search size={14} aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
    {showList&&<div id={listId} role="listbox" aria-label="Suggested CNE topics" className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-56 overflow-y-auto">
      {matches.map((item,index)=><button key={item.text} id={`${listId}-${index}`} role="option" aria-selected={index===activeIndex} type="button"
        onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>accept(item.text)}
        className={`block w-full text-left px-3 py-2 text-xs border-b last:border-b-0 border-slate-100 hover:bg-indigo-50 ${index===activeIndex?'bg-indigo-50':''}`}>
        <span className="block text-slate-800 break-words">{item.text}</span>
      </button>)}
    </div>}
    {undo && value===undo.after && <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-emerald-700">
      <span><Check size={12} className="inline mr-1"/>Corrected: {undo.label}</span>
      <button type="button" className="flex items-center gap-1 underline" onClick={()=>{onChange(undo.before);setUndo(null);fieldRef.current?.focus();}}><RotateCcw size={11}/> Undo</button>
    </div>}
    {clarify.length>0 && <div id={`${inputId}-clarify`} className="mt-1.5 space-y-1.5" aria-live="polite">
      {clarify.map(term=><div key={term.short} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
        <div className="flex gap-1 items-center font-semibold">{term.status==='unsafe'?<ShieldAlert size={13}/>:<AlertTriangle size={13}/>} {term.short}: {term.status==='unsafe'?'Error-prone abbreviation':'Choose intended clinical meaning'}</div>
        {term.safetyNote&&<p className="mt-1">{term.safetyNote}</p>}
        <div className="mt-1 flex flex-wrap gap-1">
          {term.meanings.filter(m=>!m.toLowerCase().startsWith('all (ordinary')).map((full,i)=><button key={i} type="button" className="border border-amber-300 rounded bg-white px-2 py-1 hover:bg-amber-100 text-left"
            onClick={()=>accept(expandTopicAbbreviation(value,term.short,full))}>{full}</button>)}
        </div>
      </div>)}
    </div>}
    {interpretation.practicalSkills.length>0 && <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600" aria-live="polite">
      <div><strong>Topic:</strong> {interpretation.principalConcepts.join(' · ')}</div>
      <div><strong>Practical skill:</strong> {interpretation.practicalSkills.join(' · ')}</div>
      <div className="text-[10px]">Suggested interpretation only; your complete topic is saved as entered.</div>
    </div>}
    {interpretation.reviewAdvisory && <p className="mt-1 text-[11px] text-amber-700" role="status">{interpretation.reviewAdvisory} You may keep the title unchanged.</p>}
  </div>;
};
