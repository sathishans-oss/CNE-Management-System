import { STANDARDIZED_CNE_MASTER_SUGGESTIONS, CLINICAL_ABBREVIATIONS, ClinicalAbbreviation } from './cneMasterTerminology';

export interface TopicSuggestion {
  text: string;
}
export interface SpellingCorrection {
  value: string;
  correction: string;
}
export interface CneTopicInterpretation {
  original: string;
  principalConcepts: string[];
  practicalSkills: string[];
  secondaryContext: string[];
  category: 'clinical' | 'professional' | 'education';
  reviewAdvisory: string | null;
}

/** Candidate terminology only. No abbreviation is deemed institutionally approved. */
export const SMART_TOPIC_DICTIONARY_STATS = {
  abbreviations: CLINICAL_ABBREVIATIONS.length,
  preferredTopics: STANDARDIZED_CNE_MASTER_SUGGESTIONS.length,
  // Retained for compatibility with older diagnostic callers only.
  previousTopics: 0,
  correctedHistoricalTopics: 0,
  commonTerms: 0,
  additionalTopics: 0
};

// Deliberately small high-confidence typo map; never use fuzzy replacement for a drug or diagnosis.
const CLINICAL_SPELLING_CORRECTIONS: Record<string, string> = {
  gastritits: 'gastritis',
  folys: "Foley's", foleys: "Foley's",
  hygine: 'hygiene', handhygine: 'hand hygiene',
  infetion: 'infection', doucumentation: 'documentation',
  managment: 'management', managemt: 'management', managemnet: 'management',
  defebrilator: 'defibrillator', difibrilator: 'defibrillator',
  transfussion: 'transfusion', syndome: 'syndrome', circute: 'circuit',
  rhtym: 'rhythm', preganancy: 'pregnancy',
  administation: 'administration', adminstration: 'administration',
  sensitiblity: 'sensitivity', antiepleptic: 'antiepileptic',
  augmention: 'augmentation', hygenic: 'hygienic',
  heamorrhage: 'hemorrhage', chemotharepy: 'chemotherapy',
  resusitation: 'resuscitation', resusit: 'resuscitate',
  pacreas: 'pancreas', valular: 'valvular',
  umbillical: 'umbilical', detaction: 'detection',
  approch: 'approach', tuberculosos: 'tuberculosis',
  entroscopy: 'enteroscopy', cafre: 'care',
  strecher: 'stretcher',
  intracrebral: 'intracerebral',
  neontal: 'neonatal', hyperbilirubinemai: 'hyperbilirubinemia',
  colestasis: 'cholestasis', pnuemonia: 'pneumonia',
  pneumona: 'pneumonia', cholecystits: 'cholecystitis',
  catheterisaton: 'catheterisation', prones: 'prone'
};

const abbrMap = new Map<string, ClinicalAbbreviation[]>();
for (const abbr of CLINICAL_ABBREVIATIONS) {
  const key = abbr.short.toUpperCase();
  const entries = abbrMap.get(key) || [];
  entries.push(abbr);
  abbrMap.set(key, entries);
}

// Lowercase/common English words should never trigger medical interpretation merely
// because their letters happen to equal an abbreviation. "Ms" is a person's title.
const STRICT_UPPERCASE_ONLY = new Set([
  'ALL', 'MS', 'IT', 'IN', 'AT', 'OR', 'IS', 'AM', 'AS', 'BE', 'DO',
  'GO', 'IF', 'ME', 'MY', 'NO', 'OF', 'ON', 'SO', 'TO', 'UP', 'US', 'HE', 'BY'
]);
const CLASSIFICATION_RE = /\bICD[\s\-–]*(?:10|11)\b/gi;

export function correctCompletedClinicalWord(text: string): SpellingCorrection | null {
  if (!text || !text.endsWith(' ')) return null;
  const match = text.match(/(^|[\s,;:.])([a-zA-Z0-9'’-]+)(\s+)$/);
  if (!match) return null;
  const prefix = text.slice(0, match.index! + match[1].length);
  // 'Causality' is valid in research methodology. Correct it only in the
  // unmistakable phrase 'mass causality', never throughout the dictionary.
  if (match[2].toLowerCase() === 'causality' && /\bmass\s+$/i.test(prefix)) {
    return { value: prefix + 'casualty' + match[3], correction: `${match[2]} → casualty` };
  }
  const word = match[2];
  const target = CLINICAL_SPELLING_CORRECTIONS[word.toLowerCase()];
  if (!target) return null;
  const corrected = /^[A-Z]/.test(word) ? target[0].toUpperCase() + target.slice(1) : target;
  return {
    value: prefix + corrected + match[3],
    correction: `${word} → ${corrected}`
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Expand only complete tokens, regardless of typed case. Never expand ICD inside ICD-11. */
export function expandTopicAbbreviation(text: string, short: string, replacement: string): string {
  if (!text || !short || !replacement) return text;
  if (/^ICD-(10|11)$/i.test(short)) {
    const code = short.match(/(10|11)$/)![1];
    return text.replace(new RegExp(`(^|[^A-Za-z0-9])ICD[\\s\\-–]*${code}(?=$|[^A-Za-z0-9])`, 'gi'),
      (_all, prefix: string) => prefix + replacement);
  }
  const escaped = escapeRegExp(short);
  const suffix = short.toUpperCase() === 'ICD' ? '(?![\\s\\-–]*(?:10|11)\\b)' : '';
  const regex = new RegExp(`(^|[^A-Za-z0-9])${escaped}${suffix}(?=$|[^A-Za-z0-9])`, 'gi');
  return text.replace(regex, (_all, prefix: string) => prefix + replacement);
}

/** A standalone classification code takes precedence over the ambiguous ICD acronym. */
export function identifyTopicAbbreviations(text: string): ClinicalAbbreviation[] {
  if (!text) return [];
  const found: ClinicalAbbreviation[] = [];
  const seen = new Set<string>();
  const excludedRanges: Array<{start:number;end:number}> = [];
  for (const match of text.matchAll(CLASSIFICATION_RE)) {
    const code = match[0].match(/(10|11)$/)?.[1];
    const entries = code ? abbrMap.get(`ICD-${code}`) : undefined;
    if (!entries) continue;
    excludedRanges.push({start: match.index!, end: match.index! + match[0].length});
    for (const entry of entries) if (!seen.has(entry.short)) { seen.add(entry.short); found.push(entry); }
  }
  const tokenRe = /[A-Za-z][A-Za-z0-9]*/g;
  for (const match of text.matchAll(tokenRe)) {
    const token = match[0];
    if (token.length < 2) continue;
    if (excludedRanges.some(r => match.index! >= r.start && match.index! < r.end)) continue;
    const upper = token.toUpperCase();
    if (STRICT_UPPERCASE_ONLY.has(upper) && token !== upper) continue;
    // "ALL ASPECTS" is ordinary English, including in uppercase CNE titles.
    if (upper === 'ALL' && /^\s+aspects\b/i.test(text.slice(match.index! + token.length))) continue;
    const entries = abbrMap.get(upper);
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.short.length <= 2 && token !== upper) continue;
      if (!seen.has(entry.short)) { seen.add(entry.short); found.push(entry); }
    }
  }
  return found;
}

function clearlyExpandedInTitle(text:string,entry:ClinicalAbbreviation):boolean {
  // "Guillain–Barré Syndrome (GBS)" is NOT an unresolved "GBS".
  // Require a complete parenthesized abbreviation and a documented full form,
  // or the exact educator-selected preferred term. Other ambiguous mentions
  // still require manual clarification.
  if(!new RegExp(`\\(\\s*${escapeRegExp(entry.short)}\\s*\\)`,'i').test(text))return false;
  const typed=normalizeClinicalQuery(text);
  if(STANDARDIZED_CNE_MASTER_SUGGESTIONS.some(s=>normalizeClinicalQuery(s.title)===typed))return true;
  const before=text.slice(0,text.search(new RegExp(`\\(\\s*${escapeRegExp(entry.short)}\\s*\\)`,'i')));
  const normalizedBefore=normalizeClinicalQuery(before);
  return entry.meanings.some(meaning=>{
    const full=normalizeClinicalQuery(meaning);
    return full.length>=5 && normalizedBefore.includes(full);
  });
}
export function needsTopicClarification(text: string): ClinicalAbbreviation[] {
  return identifyTopicAbbreviations(text).filter(entry => entry.status==='unsafe' ||
    (entry.status==='ambiguous'&&!clearlyExpandedInTitle(text,entry)));
}

function tidy(text: string): string {
  return text.replace(/^[\s:()–-]+|[\s:()–-]+$/g, '').replace(/\s+/g, ' ').trim();
}

function extractCoreTopic(raw: string): string {
  let topic = tidy(raw.replace(/^(?:topic\s*:|cne\s+open\s+forum\s*[:\-]|procedure\s+series\s*[:\-])/i, ''));
  // Remove description phrases only when followed by a substantive clinical concept.
  topic = topic.replace(/^(?:nursing\s+(?:care|management)|care|management)\s+(?:(?:and\s+management)\s+)?(?:of\s+)?(?:(?:the\s+)?patients?\s+(?:with|on|undergoing)\s+)?/i, '');
  topic = topic.replace(/^patients?\s+(?:with|undergoing)\s+/i, '');
  topic = topic.replace(/\s+patients?\s*$/i, '');
  return tidy(topic) || tidy(raw);
}

function splitConcepts(text: string): string[] {
  const topic = tidy(text);
  if (!topic) return [];
  // Shared qualifiers: "acute and chronic liver failure" is two conditions.
  const shared = topic.match(/^(acute|chronic)\s+and\s+(acute|chronic)\s+(.+)$/i);
  if (shared) return [`${shared[1]} ${shared[3]}`, `${shared[2]} ${shared[3]}`];
  // Split only substantive compounds. Do not split "patient and family education",
  // "pre and post-operative" or entire programme names.
  const parts = topic.split(/\s*(?:\/|\s+and\s+|\s+&\s+)\s*/i).map(tidy);
  if (parts.length === 1) return [topic];
  if (parts.some(part => part.length < 3 || /^(its|their|the|post|pre|family|management|care)$/i.test(part))) return [topic];
  if (/\b(?:pre\s*(?:&|and)\s*post|patient\s*(?:&|and)\s*family)\b/i.test(topic)) return [topic];
  return [...new Set(parts)];
}

/**
 * Transparent, lexical topic/skill extraction. This is NOT a diagnosis engine or
 * determination of whether two medical subjects are clinically connected.
 * Educators retain control of the original saved wording.
 */
export function interpretCneTopic(text: string): CneTopicInterpretation {
  const original = text || '';
  const stripped = tidy(original);
  if (!stripped) return {original,principalConcepts:[],practicalSkills:[],secondaryContext:[],category:'clinical',reviewAdvisory:null};
  const skillLabel = /\bskills?\s*:\s*/i.exec(stripped);
  const main = skillLabel ? tidy(stripped.slice(0,skillLabel.index).replace(/\(\s*$/, '')) : stripped;
  const skillPart = skillLabel ? tidy(stripped.slice(skillLabel.index+skillLabel[0].length).replace(/\)+\s*$/, '')) : '';
  const category: CneTopicInterpretation['category'] = /\b(?:soft skills|conflict to collaboration|patient communication|transfusion safety)\b/i.test(main) && /soft skills|conflict to collaboration/i.test(main)
    ? 'professional'
    : /\b(?:workshop|training|orientation|induction|research methodology|library resources|next\s*gen|ICD[\s-]*11)\b/i.test(main)
      ? 'education' : 'clinical';
  const description = main.replace(/^(?:topic\s*:|cne\s+open\s+forum\s*[:\-]|procedure\s+series\s*[:\-])/i,'');
  const mainConcept = extractCoreTopic(description);
  let primaryConcepts = splitConcepts(mainConcept);
  if (/\bICD[\s-]*11\b/i.test(main)) primaryConcepts = ['ICD-11'];
  else if (/\bICD[\s-]*10\b/i.test(main)) primaryConcepts = ['ICD-10'];
  const practicalSkills = splitConcepts(extractCoreTopic(skillPart)).map(skill => {
    const photo = skill.match(/^neonates?\s+on\s+phototherapy$/i);
    return photo ? 'Phototherapy care for neonates' : skill;
  });
  const secondaryContext: string[] = [];
  if (/\bnursing\s+(?:care|management)\b/i.test(main)) secondaryContext.push('Nursing management');
  if (/\b(?:neonatal|neonates|newborn)\b/i.test(main)) secondaryContext.push('Neonatal');
  if (/\b(?:pediatric|paediatric|children)\b/i.test(main)) secondaryContext.push('Pediatric');
  if (/\b(?:prevention|preventing)\b/i.test(main)) secondaryContext.push('Prevention');
  const reviewAdvisory = /\b(?:chronic kidney disease|\bCKD\b)\b/i.test(main) && /\b(?:TURB|TURBT)\b/i.test(skillPart)
    ? 'Please confirm that the bladder procedure skill is intended for this kidney disease session.'
    : null;
  return {original,principalConcepts:primaryConcepts,practicalSkills,secondaryContext,category,reviewAdvisory};
}

/**
 * Word-by-word, abbreviation-safe local search.
 * A full clinical title is a suggestion; aliases are matching metadata only.
 * General linking words may be omitted from matching, never from saved titles.
 */
const GENERIC_QUERY_WORDS = new Set([
  'patient','patients','of','the','a','an','and','with','for','on','in','to','is',
  'its','about','regarding','topic','cne','care','case','nursing','management',
  'plan','presentation','clinical','education','about','treatment','diagnosis','ncp'
]);
const SEARCH_TYPO_ALIASES: Record<string,string> = {
  miocardial:'myocardial', mycardial:'myocardial',
  pneumona:'pneumonia',neontal:'neonatal',gastritits:'gastritis',
  hygine:'hygiene',managemnet:'management',managment:'management',
  transfussion:'transfusion',resusitation:'resuscitation'
};

function normalizeClinicalQuery(value:string):string {
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\bicd[\s\-–]*(10|11)\b/g,'icd$1')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function wordsOf(value:string):string[] {
  return normalizeClinicalQuery(value).split(' ').filter(Boolean);
}
function significantWords(value:string):string[] {
  const words=wordsOf(value).map(word=>SEARCH_TYPO_ALIASES[word]||word);
  return words.filter(word=>!GENERIC_QUERY_WORDS.has(word));
}
const SEARCH_ENTRIES = (()=>{
  const map=new Map<string,{title:string;texts:string[];tokens:string[][];kind:string;nursingContext?:'condition'}>();
  function add(title:string,aliases:readonly string[],kind:string,nursingContext?:'condition'){
    const text=title.trim().replace(/\s+/g,' '),key=normalizeClinicalQuery(title);
    if (!key) return;
    const existing=map.get(key);
    if(existing){
      for(const alias of aliases)if(alias && !existing.texts.includes(alias))existing.texts.push(alias);
      if(nursingContext)existing.nursingContext=nursingContext;
      return;
    }
    map.set(key,{title:text,texts:[text,...aliases],tokens:[],kind,nursingContext});
  }
  for(const term of STANDARDIZED_CNE_MASTER_SUGGESTIONS)
    add(term.title,term.aliases,term.kind,term.nursingContext);
  // Recognized, single-meaning abbreviations may offer a preferred expansion
  // only if that spelling is not already in the master library. No ambiguous
  // abbreviation is expanded without educator selection.
  for(const abbr of CLINICAL_ABBREVIATIONS){
    if(abbr.status!=='recognized'||abbr.meanings.length!==1)continue;
    if(STANDARDIZED_CNE_MASTER_SUGGESTIONS.some(s=>
      s.aliases.some(alias=>alias.toUpperCase()===abbr.short.toUpperCase()) ||
      s.title.toUpperCase().includes(`(${abbr.short.toUpperCase()})`)))continue;
    const meaning=abbr.meanings[0].trim();
    if(!meaning||meaning.length<4||/^(?:unknown|not applicable)/i.test(meaning))continue;
    const title=meaning.replace(/\b[a-z]/g,c=>c.toUpperCase())+` (${abbr.short})`;
    add(title,[abbr.short,meaning],'term');
  }
  return [...map.values()].map(e=>({...e,tokens:e.texts.map(wordsOf)}));
})();

/** Topic-style preferences are separate from clinical diagnosis/abbreviation parsing. */
function topicIntent(raw:string):'nursing-care'|'care-plan'|'case'|'education'|'general'{
  if(/\b(?:ncp|care\s+plan|plan\s+of\s+care)\b/i.test(raw))return 'care-plan';
  if(/\b(?:case(?:\s+(?:study|presentation|report))?|present\s+a\s+case)\b/i.test(raw))return 'case';
  if(/\b(?:nursing\s+(?:care|management)|care\s+of|patient\s+care|management\s+of|care\s+for)\b/i.test(raw))return 'nursing-care';
  if(/\b(?:patient\s+education|health\s+education|counselling)\b/i.test(raw))return 'education';
  return 'general';
}
function suggestedNursingTitles(diagnosis:string):{title:string;purpose:string}[]{
  return [
    {title:`Nursing Care of Patients with ${diagnosis}`,purpose:'nursing-care'},
    {title:`Nursing Care Plan for Patients with ${diagnosis}`,purpose:'care-plan'},
    {title:`Case Presentation: ${diagnosis}`,purpose:'case'},
    {title:`${diagnosis}: Clinical Management and Patient Education`,purpose:'education'}
  ];
}
function scoreSuggestion(entry: typeof SEARCH_ENTRIES[number],raw:string,queryWords:string[]):number {
  const exact=normalizeClinicalQuery(raw),title=normalizeClinicalQuery(entry.title);
  if (title===exact)return 3000;
  const results=entry.texts.map((text,i)=>{
    const form=normalizeClinicalQuery(text);
    if(form===exact)return 2600-(i===0?0:100);
    if(form.startsWith(exact)&&exact.length>=3)return 1900-(i===0?0:80);
    const tokens=entry.tokens[i];
    if(!queryWords.every(q=>tokens.some(t=>t===q || (q.length>=3&&t.startsWith(q)))))return -1;
    const exactMatches=queryWords.filter(q=>tokens.includes(q)).length;
    const nameBonus=i===0?90:15;
    const kindBonus=entry.kind==='cne-topic'?18:0;
    return 700 + exactMatches*80 + nameBonus + kindBonus - Math.min(tokens.length,40);
  });
  return Math.max(-1,...results);
}

/**
 * Five locally generated, clinically coherent candidates. The medical master
 * contains the *conditions*; the engine adds nursing education title templates
 * only to editor-curated conditions, not to drugs, procedures, or policies.
 * Aliases are search-only; nothing overwrites the educator's typed text.
 */
export function suggestCneTopics(rawQuery: string, limit=5): TopicSuggestion[] {
  const raw=(rawQuery||'').trim();
  if(raw.length<2||limit<=0)return [];
  if(/^Ms\.?($|\s)/.test(raw))return [];
  const queryWords=significantWords(raw);
  if(!queryWords.length || queryWords.some(word=>word.length<2))return [];
  const intent=topicIntent(raw);
  const coreQuery=queryWords.join(' ');
  const pool=new Map<string,{text:string;score:number}>();
  const offer=(text:string,score:number)=>{
    const key=normalizeClinicalQuery(text);
    const existing=pool.get(key);
    if(!existing || existing.score<score)pool.set(key,{text,score});
  };
  for(const entry of SEARCH_ENTRIES){
    const relevance=scoreSuggestion(entry,coreQuery,queryWords);
    if(relevance<0)continue;
    // Keep an exact diagnosis first for unqualified queries. For queries with
    // 'care of' or 'case presentation', rank matching nursing intent first.
    const preferredTitleScore= intent==='general' ? relevance : relevance-450;
    offer(entry.title,preferredTitleScore);
    // An unresolved acronym with multiple meanings should list distinct
    // diagnoses without auto-building a care plan around a guessed meaning.
    if(entry.nursingContext!=='condition' || needsTopicClarification(raw).some(a=>a.status==='ambiguous' && a.short.toUpperCase()===raw.toUpperCase()))continue;
    const highlyRelevant=Math.min(relevance,3000);
    for(const [i,variant] of suggestedNursingTitles(entry.title).entries()){
      const preferred=intent!=='general' && variant.purpose===intent;
      const boost=intent==='general' ?  -400-i*110 :
        preferred ? 1250 : (intent==='nursing-care'&&variant.purpose==='care-plan') ? 950 :
          (intent==='care-plan'&&variant.purpose==='nursing-care') ? 780 : -500-i*90;
      const score=highlyRelevant+boost;
      offer(variant.title,score);
    }
  }
  return [...pool.values()].sort((a,b)=>b.score-a.score||a.text.length-b.text.length||a.text.localeCompare(b.text))
    .slice(0,Math.floor(limit)).map(({text})=>({text}));
}
