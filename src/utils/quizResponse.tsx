import type { QuizQuestion } from '../types';
export type ResponseFormat = 'SINGLE_SELECT'|'MULTI_SELECT'|'ORDERED_RESPONSE';
export const QUIZ_LETTERS = ['A','B','C','D','E','F'] as const;
export const responseFormat = (question:QuizQuestion): ResponseFormat => question.responseFormat || 'SINGLE_SELECT';
export const populatedOptions = (question:QuizQuestion) => QUIZ_LETTERS.filter(key=>Boolean(String(question.options[key]||'').trim()));
// An ordered response may intentionally use a subset of the populated A–F options.
// The backend provides orderedItems even when the answer key is hidden in Scored Quiz.
export const orderedItems = (question:QuizQuestion) => {
  const populated=populatedOptions(question);
  const configured=(question.orderedItems||[]).map(value=>String(value||'').toUpperCase().trim());
  if(configured.length>=2 && new Set(configured).size===configured.length && configured.every(value=>populated.some(letter=>letter===value)))return configured;
  return populated;
};
export const normalizeResponse = (question:QuizQuestion,input:string):string => {
  const raw=String(input||'').toUpperCase().replace(/\s+/g,'');
  if(responseFormat(question)==='SINGLE_SELECT')return /^[A-F]$/.test(raw)?raw:'';
  if(!/^[A-F](?:,[A-F])*$/.test(raw))return '';
  const items=raw.split(',');if(new Set(items).size!==items.length)return '';
  return (responseFormat(question)==='MULTI_SELECT'?[...items].sort():items).join(',');
};
export const isValidResponse = (q:QuizQuestion,input:string) => {
  const normalized=normalizeResponse(q,input);if(!normalized)return false;
  const options=populatedOptions(q),keys=normalized.split(',');
  if(keys.some(key=>!options.some(option=>option===key)))return false;
  if(responseFormat(q)==='SINGLE_SELECT')return keys.length===1;
  if(responseFormat(q)==='MULTI_SELECT')return keys.length>=1&&keys.length<=options.length;
  const required=orderedItems(q);
  return keys.length===required.length && required.every(letter=>keys.includes(letter));
};
export const isCorrectResponse = (q:QuizQuestion,submitted:string) => Boolean(q.correctOption)&&normalizeResponse(q,submitted)===normalizeResponse(q,q.correctOption||'');
export const orderedInitial = (q:QuizQuestion,seed:string) => {
  const options=[...orderedItems(q)];let state=2166136261;
  for(const char of q.questionId+':'+seed){state=Math.imul(state^char.charCodeAt(0),16777619)>>>0;}
  for(let i=options.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[options[i],options[j]]=[options[j],options[i]];}
  if(options.join(',')===q.correctOption&&options.length>1)[options[0],options[1]]=[options[1],options[0]];
  return options;
};
export const orderedSequence = (q:QuizQuestion,input:string,seed:string)=>{
  const normalized=normalizeResponse(q,input);
  return normalized&&isValidResponse(q,normalized)?normalized.split(','):orderedInitial(q,seed);
};
