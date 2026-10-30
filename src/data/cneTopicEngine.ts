import { CLINICAL_ABBREVIATIONS, HISTORICAL_CNE_TITLES, ClinicalAbbreviation } from './cneClinicalTerminology';
import { COMMON_CLINICAL_TERMS, ADDITIONAL_CNE_TOPIC_SUGGESTIONS } from './commonClinicalTopics';
import { CLEANED_HISTORICAL_CNE_TOPICS } from './historicalCneTopics2026';

export interface TopicSuggestion {
  text: string;
  source: string;
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
  previousTopics: HISTORICAL_CNE_TITLES.length,
  correctedHistoricalTopics: CLEANED_HISTORICAL_CNE_TOPICS.length,
  commonTerms: COMMON_CLINICAL_TERMS.length,
  additionalTopics: ADDITIONAL_CNE_TOPIC_SUGGESTIONS.length
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

export function needsTopicClarification(text: string): ClinicalAbbreviation[] {
  return identifyTopicAbbreviations(text).filter(entry => entry.status === 'ambiguous' || entry.status === 'unsafe');
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

export function suggestCneTopics(rawQuery: string, limit = 5): TopicSuggestion[] {
  if (!rawQuery || rawQuery.trim().length < 2 || limit <= 0) return [];
  // Honorifics are not topic abbreviations; do not suggest multiple sclerosis
  // when a title such as 'Ms' is being typed.
  if (/^Ms\.?($|\s)/.test(rawQuery.trim())) return [];
  const q = rawQuery.trim().toLowerCase();
  const results: Array<{text:string;source:string;score:number}> = [];
  const seen = new Set<string>();
  const add = (text: string, source: string, score: number) => {
    const cleaned = tidy(text);
    if (!cleaned || seen.has(cleaned.toLowerCase())) return;
    seen.add(cleaned.toLowerCase()); results.push({text:cleaned,source,score});
  };
  const lastSpaceIdx=rawQuery.lastIndexOf(' ');
  if (lastSpaceIdx>0) {
    const prefix=rawQuery.slice(0,lastSpaceIdx+1);
    const lastWord=rawQuery.slice(lastSpaceIdx+1).trim().toLowerCase();
    if (lastWord.length>=3) for(const term of COMMON_CLINICAL_TERMS) {
      const lower=term.toLowerCase();
      if(lower.startsWith(lastWord)) add(`${prefix}${term.toLowerCase()}`,'Clinical Term',98);
    }
  }
  for (const term of COMMON_CLINICAL_TERMS) {
    const lower=term.toLowerCase();
    if(lower.startsWith(q)) add(term,'Clinical Term',100);
    else if(lower.includes(' '+q)) add(term,'Clinical Term',85);
    else if(lower.includes(q)) add(term,'Clinical Term',65);
  }
  // Prefer reviewed, de-identified historical titles over older raw suggestions.
  // The legacy candidate sources remain available for uncommon and future topics.
  for (const title of CLEANED_HISTORICAL_CNE_TOPICS) {
    const lower=title.toLowerCase();
    if (lower.startsWith(q)) add(title,'Corrected Previous CNE',125);
    else if (lower.includes(' '+q)) add(title,'Corrected Previous CNE',90);
    else if (lower.includes(q)) add(title,'Corrected Previous CNE',68);
  }
  for(const title of ADDITIONAL_CNE_TOPIC_SUGGESTIONS) {
    const lower=title.toLowerCase();
    if(lower.startsWith(q)) add(title,'CNE Topic Example',115);
    else if(lower.includes(' '+q)) add(title,'CNE Topic Example',77);
  }
  for (const title of HISTORICAL_CNE_TITLES) {
    const lower=title.toLowerCase();
    if(lower.startsWith(q)) add(title,'Previous CNE',105);
    else if(lower.includes(' '+q)) add(title,'Previous CNE',80);
    else if(lower.includes(q)) add(title,'Previous CNE',60);
  }
  for (const abbr of CLINICAL_ABBREVIATIONS) {
    if(abbr.short.toLowerCase().startsWith(q)) {
      const full=abbr.meanings[0];
      add(full ? `${abbr.short} (${full})` : abbr.short,'Clinical Term',88);
    }
  }
  results.sort((a,b)=>b.score-a.score||a.text.length-b.text.length||a.text.localeCompare(b.text));
  return results.slice(0,limit).map(({text,source})=>({text,source}));
}
