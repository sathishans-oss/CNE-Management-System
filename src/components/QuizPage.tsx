import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Award, BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Image as ImageIcon, Loader2, RefreshCw, Trophy, XCircle, HeartPulse, Hourglass, Lightbulb, Target, ShieldCheck, Medal, CalendarDays, History, ListOrdered, ListChecks, CircleDot } from 'lucide-react';
import { ApiService } from '../services/api';
import { LoadingProgress } from './common/LoadingProgress';
import type { QuizAttempt, QuizHomeData, QuizQuestion, QuizResult, QuizHistoryItem, SessionUser } from '../types';
import {normalizeResponse, isValidResponse, isCorrectResponse, responseFormat} from '../utils/quizResponse';
import { QuizResponseInput } from './QuizResponseInput';

type Page = 'home' | 'scored-setup' | 'practice-setup' | 'scored' | 'practice' | 'result';
const SCORED_BATCH_SIZE = 10;
// Limit secure Drive image fetches, including preloads, to two simultaneous requests.
const MAX_PARALLEL_QUIZ_IMAGES = 2;
// Bound retained Base64 images so a long scored Quiz does not exhaust phone memory.
const MAX_CACHED_QUIZ_IMAGES = 12;
type PracticeGroup = {questions:QuizQuestion[];exhausted:boolean;lastImageAt:number;unitCounts:Record<string,number>;formatCounts:Record<string,number>};
const batchMessages = ['Great progress — giving your neurons a moment to recharge!', 'Your answers are being saved securely. Stay sharp!', 'Clinical knowledge grows one question at a time.', 'Mental stretch! Your next set of questions is almost ready.'];

const QuizImage: React.FC<{
  question: QuizQuestion;
  attemptId?: string;
  getImage: (q: QuizQuestion, attemptId?: string, background?: boolean) => Promise<string>;
  onAvailabilityChange?: (questionId: string, available: boolean) => void;
  invalidateImage?: (q: QuizQuestion, attemptId?: string) => void;
}> = ({ question, attemptId, getImage, onAvailabilityChange, invalidateImage }) => {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (question.questionType !== 'IMAGE') return;
    let active = true;
    setSource(''); setError(''); setRendered(false); setExpanded(false);
    onAvailabilityChange?.(question.questionId, false);
    void getImage(question, attemptId).then(src => {
      if (active) setSource(src);
    }).catch(e => {
      if (active) { setError(e instanceof Error ? e.message : 'Image unavailable'); onAvailabilityChange?.(question.questionId, false); }
    });
    return () => { active = false; };
    // Availability callback is stable; it intentionally does not trigger another download.
  }, [question.questionId, question.imageFileId, question.questionType, attemptId, getImage, retry]);
  if (question.questionType !== 'IMAGE') return null;
  if (error) return <div role="alert" className="my-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <p>Clinical image could not be loaded: {error}</p>
    <button type="button" onClick={() => {invalidateImage?.(question,attemptId);setRetry(n => n + 1);}} className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-800">Retry Image</button>
  </div>;
  return <>
    {(!source || !rendered) && <div role="status" aria-live="polite" className="my-3 flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-teal-700" />
      <span className="font-semibold">Loading clinical image…</span>
      <span className="text-center text-xs">Please wait before answering this image question.</span>
    </div>}
    {source && <button type="button" className={`my-3 max-w-full rounded-xl border border-slate-200 bg-white p-2 text-left ${rendered ? 'block' : 'hidden'}`} onClick={() => setExpanded(true)}>
      <img src={source} alt="Clinical question illustration" onLoad={() => { setRendered(true); onAvailabilityChange?.(question.questionId, true); }} onError={() => { setError('The browser could not display the image.'); setRendered(false); onAvailabilityChange?.(question.questionId, false); }} className="max-h-64 max-w-full rounded object-contain" />
      <span className="block pt-1 text-xs text-teal-700">Tap image to enlarge</span>
    </button>}
    {expanded && rendered && <div role="dialog" aria-modal="true" aria-label="Enlarged clinical question image" className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 p-5" onClick={()=>setExpanded(false)}>
      <button type="button" className="absolute top-5 right-5 rounded bg-white px-3 py-2 text-sm" onClick={()=>setExpanded(false)}>Close ✕</button>
      <img src={source} alt="Enlarged clinical question illustration" className="max-h-[85vh] max-w-[95vw] object-contain" onClick={e=>e.stopPropagation()}/>
    </div>}
  </>;
};

// Keep response-format guidance consistent across Practice, Scored Quiz, and completed reviews.
const QuizFormatBadge: React.FC<{question:QuizQuestion}> = ({question}) => {
  const format=responseFormat(question);
  const {label,Icon}=format==='MULTI_SELECT'
    ? {label:'Select all that apply',Icon:ListChecks}
    : format==='ORDERED_RESPONSE'
      ? {label:'Ordered response',Icon:ListOrdered}
      : {label:'Single select',Icon:CircleDot};
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-900" aria-label={`Response format: ${label}`}>
    <Icon className="h-3.5 w-3.5" aria-hidden="true"/>{label}
  </span>;
};

// Keep response validation explicit at every submission boundary; the backend is authoritative.
const validQuizResponse = (q: QuizQuestion, value: string) => isValidResponse(q, value);
const quizAnswerText = (q: QuizQuestion, value: string): string => {
  const tokens=String(value||'').split(',').filter(Boolean);
  if(!tokens.length)return 'Not answered';
  const choices=tokens.map(letter => `${letter}. ${q.options[letter as keyof QuizQuestion['options']] || letter}`);
  return choices.join(responseFormat(q)==='ORDERED_RESPONSE'?' → ':'; ');
};

export const QuizPage: React.FC<{user: SessionUser}> = ({user}) => {
  const [page,setPage] = useState<Page>('home');
  // Render the static clinical dashboard on the first React paint.
  // A separate lightweight request identifies any unfinished scored attempt;
  // analytics, approved units and clinical insight arrive later.
  const [home,setHome] = useState<QuizHomeData>({units:[],total:0,imageCount:0,leaderboard:[],
    activeAttempt:null,myProgress:{completedTests:0,questionsAnswered:0,accuracy:0,recent:[]},clinicalInsight:null});
  const [coreReady,setCoreReady] = useState(false);
  const [dashboardLoading,setDashboardLoading] = useState(true);
  const [dashboardError,setDashboardError] = useState('');
  const [homeLoading,setHomeLoading] = useState(true);
  const [selectedUnits,setSelectedUnits] = useState<string[]>([]);
  const [selectedFormat,setSelectedFormat] = useState('ALL');
  const [count,setCount] = useState(10);
  const [attempt,setAttempt] = useState<QuizAttempt | null>(null);
  const [question,setQuestion] = useState<QuizQuestion | null>(null);
  const [index,setIndex] = useState(0);
  const [selected,setSelected] = useState('');
  const [scoredBatch,setScoredBatch] = useState<QuizQuestion[]>([]);
  const [batchAnswers,setBatchAnswers] = useState<Record<string,string>>({});
  const [batchMessage,setBatchMessage] = useState('');
  const prefetchedBatches = useRef<Record<string,Promise<QuizQuestion[]>>>({});
  const [practiceCorrect,setPracticeCorrect] = useState(0);
  const [practiceWrong,setPracticeWrong] = useState(0);
  const [practiceSubmitted,setPracticeSubmitted] = useState(false);
  const [practiceSeen,setPracticeSeen] = useState<string[]>([]);
  const [lastPracticeImageAt,setLastPracticeImageAt] = useState(0);
  const [practiceBatch,setPracticeBatch] = useState<QuizQuestion[]>([]);
  const [practiceBatchIndex,setPracticeBatchIndex] = useState(0);
  const [practiceExhausted,setPracticeExhausted] = useState(false);
  const [practiceNextMessage,setPracticeNextMessage] = useState('');
  const [results,setResults] = useState<QuizResult | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [cancelTarget,setCancelTarget] = useState<string | null>(null);
  const [cancelError,setCancelError] = useState('');
  const [cancellingId,setCancellingId] = useState<string | null>(null);
  const [resumingId,setResumingId] = useState<string | null>(null);
  const [confirmBack,setConfirmBack] = useState(false);
  const [showHistory,setShowHistory] = useState(false);
  const [history,setHistory] = useState<QuizHistoryItem[]>([]);
  const [historyMore,setHistoryMore] = useState(false);
  const [historyBusy,setHistoryBusy] = useState(false);
  const [insightImage,setInsightImage] = useState('');
  const [insightImageError,setInsightImageError] = useState('');
  const [insightImageExpanded,setInsightImageExpanded] = useState(false);

  // Transient success feedback belongs in a bottom toast, not in the page layout.
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const practiceUnitCounts = useRef<Record<string,number>>({});
  const practiceFormatCounts = useRef<Record<string,number>>({});
  const imageCache = useRef<Map<string,Promise<string>>>(new Map());
  const imageDownloadQueue = useRef<Array<{run: () => void; background: boolean}>>([]);
  const imageDownloadsRunning = useRef(0);
  const [imageReady, setImageReady] = useState<Record<string, boolean>>({});
  const handleImageAvailability = useCallback((id: string, ready: boolean) => {
    setImageReady(previous => previous[id] === ready ? previous : {...previous, [id]: ready});
  }, []);
  const isCurrentImageReady = !question || question.questionType !== 'IMAGE' || imageReady[question.questionId] === true;
  const mounted = useRef(true);
  const practiceEpoch = useRef(0);
  const preparedPractice = useRef<{epoch:number;promise:Promise<PracticeGroup>} | null>(null);

  useEffect(() => {
    const insightId=home?.clinicalInsight?.insightId;
    let valid=true;
    setInsightImage('');setInsightImageError('');
    if(insightId) void ApiService.getClinicalInsightImage(insightId).then(res=>{
      if(!valid)return;
      if(res.success&&res.data?.base64Data&&res.data?.mimeType) setInsightImage(`data:${res.data.mimeType};base64,${res.data.base64Data}`);
      else setInsightImageError(res.message||'Unable to load clinical insight image.');
    }).catch(e=>{if(valid)setInsightImageError(e instanceof Error?e.message:'Unable to load clinical insight image.');});
    return ()=>{valid=false;};
  }, [home?.clinicalInsight?.insightId]);

  const drainImageDownloads = useCallback(() => {
    while (imageDownloadsRunning.current < MAX_PARALLEL_QUIZ_IMAGES && imageDownloadQueue.current.length) {
      const item = imageDownloadQueue.current.shift();
      if (!item) break;
      imageDownloadsRunning.current += 1;
      item.run();
    }
  }, []);

  // Cache the pending Promise as well as completed images to deduplicate calls.
  // Foreground images enter ahead of queued preloads; every network request goes
  // through one two-slot queue (not just the prefetch requests).
  const invalidateImage = useCallback((q: QuizQuestion, id?: string) => {
    imageCache.current.delete(`${user.employeeId}|${id || 'practice'}|${q.questionId}`);
  }, [user.employeeId]);

  const getImage = useCallback((q: QuizQuestion, id?: string, background = false): Promise<string> => {
    const key = `${user.employeeId}|${id || 'practice'}|${q.questionId}`;
    const cache = imageCache.current;
    const cached = cache.get(key);
    if (cached) return cached;
    const promise = new Promise<string>((resolve, reject) => {
      const run = () => {
        void ApiService.getQuizImage(q.questionId, id).then(res => {
          if (!res.success || !res.data?.base64Data || !res.data?.mimeType) throw new Error(res.message || 'Image unavailable');
          return `data:${res.data.mimeType};base64,${res.data.base64Data}`;
        }).then(resolve, reject).finally(() => {
          imageDownloadsRunning.current = Math.max(0, imageDownloadsRunning.current - 1);
          drainImageDownloads();
        });
      };
      const work = {run, background};
      if (background) imageDownloadQueue.current.push(work);
      else {
        const nextBackground = imageDownloadQueue.current.findIndex(item => item.background);
        if (nextBackground < 0) imageDownloadQueue.current.push(work);
        else imageDownloadQueue.current.splice(nextBackground, 0, work);
      }
      drainImageDownloads();
    }).catch(e => { if (cache.get(key) === promise) cache.delete(key); throw e; });
    cache.set(key, promise);
    while (cache.size > MAX_CACHED_QUIZ_IMAGES) {
      const oldest = cache.keys().next().value;
      if (!oldest) break;
      cache.delete(oldest);
    }
    return promise;
  }, [user.employeeId, drainImageDownloads]);

  // Prefetch at most the next two IMAGE questions, never the whole question bank.
  const prefetchUpcomingImages = useCallback((questions: QuizQuestion[], currentIndex: number, id?: string) => {
    const upcoming = questions.slice(currentIndex + 1).filter(q => q.questionType === 'IMAGE').slice(0, 2);
    upcoming.forEach(q => { void getImage(q, id, true).catch(() => {}); });
  }, [getImage]);

  const refreshHome = useCallback(async () => {
    if (mounted.current) { setHomeLoading(true); setDashboardLoading(true); setDashboardError(''); setCoreReady(false); }
    // Do not wait for the expensive Question Bank/leaderboard calculations to
    // resolve before exposing the page and Resume Unfinished Quiz control.
    const corePromise = ApiService.getQuizHomeCore().then(res => {
      if (!res.success || !res.data) throw new Error(res.message || 'Unable to check unfinished Quiz.');
      if (mounted.current) {
        setHome(prev => ({...prev, activeAttempt:res.data!.activeAttempt}));
        setCoreReady(true);
        setHomeLoading(false);
      }
      return res.data;
    }).catch(err => {
      if (mounted.current) { setCoreReady(false); setHomeLoading(false); setError(err?.message || 'Unable to check unfinished Quiz.'); }
      throw err;
    });
    const dashboardPromise = ApiService.getQuizHomeDashboard().then(res => {
      if (!res.success || !res.data) throw new Error(res.message || 'Quiz dashboard is unavailable.');
      if (mounted.current) setHome(prev => ({...prev, ...res.data}));
      return res.data;
    }).catch(err => {
      if (mounted.current) setDashboardError(err?.message || 'Unable to load Quiz summary.');
      throw err;
    }).finally(() => { if (mounted.current) setDashboardLoading(false); });
    // Keep prior refresh callers awaiting both parts, but settle both even if
    // one fails. Every section can show its own retry without blanking the page.
    const [core,dashboard] = await Promise.allSettled([corePromise,dashboardPromise]);
    if (core.status==='rejected') throw core.reason;
    if (dashboard.status==='rejected') return {...home, activeAttempt:core.value.activeAttempt};
    return {...dashboard.value,activeAttempt:core.value.activeAttempt};
  }, []);
  useEffect(() => {
    mounted.current=true;
    void refreshHome().catch(e => {if(mounted.current)setError(String(e.message || e));});
    return () => { mounted.current=false;practiceEpoch.current+=1;imageDownloadQueue.current=[];imageCache.current.clear(); };
  },[refreshHome]);

  const draftKey = (a:QuizAttempt) => `cne.quiz.batch.v1:${user.employeeId}:${a.attemptId}`;
  const clearDraft = (a:QuizAttempt) => {try{window.sessionStorage.removeItem(draftKey(a));}catch(_ignored){/* private-mode storage */}};

  const fetchBatch = useCallback((a:QuizAttempt,start:number):Promise<QuizQuestion[]> => {
    const key=`${a.attemptId}:${start}`;
    if(!prefetchedBatches.current[key]){
      prefetchedBatches.current[key]=ApiService.getQuizScoredBatch(a.attemptId,start).then(res=>{
        if(!res.success||!res.data||res.data.start!==start||res.data.questions.length!==Math.min(SCORED_BATCH_SIZE,a.questionCount-start))
          throw new Error(res.message||'Could not load scored questions.');
        return res.data.questions;
      }).catch(e=>{delete prefetchedBatches.current[key];throw e;});
    }
    return prefetchedBatches.current[key];
  },[]);

  const loadScoredBatch = useCallback(async(a:QuizAttempt) => {
    const start=a.committedCount;
    setAttempt(a);
    setBusy(true);setError('');
    try{
      if(start>=a.questionCount){
        const completed=await ApiService.completeQuizScored(a.attemptId);
        if(!completed.success||!completed.data)throw new Error(completed.message||'Could not finish the saved quiz.');
        setResults(completed.data);setAttempt(null);setScoredBatch([]);setQuestion(null);setPage('result');
        clearDraft(a);void refreshHome().catch(()=>{});return;
      }
      const questions=await fetchBatch(a,start);
      const draft:Record<string,string>={};
      try{
        const raw=window.sessionStorage.getItem(draftKey(a));
        if(raw){const data=JSON.parse(raw);if(data.start===start && data.answers && typeof data.answers==='object'){
          questions.forEach(q=>{const answer=data.answers[q.questionId];if(typeof answer==='string'&&isValidResponse(q,answer))draft[q.questionId]=normalizeResponse(q,answer);});
        }}
      }catch(_ignored){/* storage unavailable */}
      setAttempt(a);setScoredBatch(questions);setBatchAnswers(draft);
      setIndex(start);setQuestion(questions[0]);setSelected(draft[questions[0].questionId]||'');setPage('scored');setBatchMessage('');
      if(questions[0].questionType === 'IMAGE') void getImage(questions[0], a.attemptId).catch(() => {});
      prefetchUpcomingImages(questions, 0, a.attemptId);
      if(start+questions.length<a.questionCount){void fetchBatch(a,start+questions.length).catch(()=>{});}
    }catch(e){setError(String((e as Error).message||e));setQuestion(null);setScoredBatch([]);setPage('scored');}
    finally{setBusy(false);}
  },[fetchBatch,refreshHome,user.employeeId,getImage,prefetchUpcomingImages]);

  useEffect(()=>{
    if(page!=='scored'||!attempt||!scoredBatch.length)return;
    try{window.sessionStorage.setItem(draftKey(attempt),JSON.stringify({start:attempt.committedCount,answers:batchAnswers}));}
    catch(_ignored){/* session storage can be disabled; backend commits remain safe */}
  },[page,attempt,scoredBatch,batchAnswers,user.employeeId]);

  const beginScored = async() => {
    setBusy(true);setError('');setImageReady({});
    try{
      const res=await ApiService.startQuizScored(selectedUnits,count,selectedFormat);
      if(!res.success||!res.data)throw new Error(res.message || 'Could not start quiz.');
      prefetchedBatches.current={};
      await loadScoredBatch(res.data);
    }catch(e){setError(String((e as Error).message||e));}
    finally{setBusy(false);}
  };
  const resume = async(a:QuizAttempt) => {
    if(busy||resumingId)return;
    setResumingId(a.attemptId);
    setImageReady({});
    prefetchedBatches.current={};
    try { await loadScoredBatch(a); }
    finally { setResumingId(null); }
  };
  const cancelScored = async(id:string) => {
    if(busy)return;
    setBusy(true);setCancellingId(id);setError('');setCancelError('');
    try{
      const res=await ApiService.cancelQuizScored(id);
      if(!res.success)throw new Error(res.message||'Could not cancel the quiz.');
      clearDraft({attemptId:id} as QuizAttempt);
      setAttempt(null);setQuestion(null);setScoredBatch([]);setBatchAnswers({});prefetchedBatches.current={};
      setPage('home');setCancelTarget(null);setHome(prev=>prev?{...prev,activeAttempt:null}:prev);
      setNotice('Scored quiz cancelled. It will not appear in the leaderboard.');
      try{await refreshHome();}catch(e){setError('Quiz cancelled, but the dashboard could not refresh. Reopen Quiz to reload your data.');}
    }catch(e){setCancelError((e as Error).message||'Cancellation failed.');}
    finally{setBusy(false);setCancellingId(null);}
  };
  const chooseScored = (choice:string) => {
    if(!question||busy||!isCurrentImageReady)return;
    const answer=normalizeResponse(question,choice);
    setSelected(answer);
    setBatchAnswers(prev=>({...prev,[question.questionId]:answer}));
  };
  const chooseAnswer = (answer:string) => {
    if(!question || busy || !isCurrentImageReady || (page==='practice'&&practiceSubmitted))return;
    if(page==='scored')chooseScored(answer);else setSelected(normalizeResponse(question,answer));
  };
  const changeScoredQuestion = (position:number) => {
    if(!attempt||busy)return;
    const relative=position-attempt.committedCount;
    if(relative<0||relative>=scoredBatch.length)return;
    const q=scoredBatch[relative];
    setImageReady(previous=>({...previous,[q.questionId]:false}));
    setQuestion(q);setIndex(position);setSelected(batchAnswers[q.questionId]||'');
    if(q.questionType === 'IMAGE') void getImage(q,attempt.attemptId).catch(()=>{});
    prefetchUpcomingImages(scoredBatch,relative,attempt.attemptId);
    setError('');
  };
  const submitScoredBatch = async() => {
    if(!attempt||busy||scoredBatch.length===0)return;
    const answers=scoredBatch.map(q=>batchAnswers[q.questionId]||'');
    if(!isCurrentImageReady){setError('Please wait for the clinical image to load before submitting.');return;}
    if(answers.some((x,i)=>!validQuizResponse(scoredBatch[i],x))){
      setError('Answer all questions in this batch before submitting.');return;
    }
    setBusy(true);setError('');
    setBatchMessage(batchMessages[Math.floor(attempt.committedCount/SCORED_BATCH_SIZE)%batchMessages.length]);
    try{
      const res=await ApiService.saveQuizScoredBatch(attempt.attemptId,attempt.committedCount,answers);
      if(!res.success||!res.data)throw new Error(res.message||'Your answers could not be saved. Retry without changing pages.');
      const committed=res.data.committedCount;
      const updated={...attempt,committedCount:committed,answeredCount:committed,
        answers:{...attempt.answers,...Object.fromEntries(scoredBatch.map((q,i)=>[q.questionId,answers[i]]))}};
      clearDraft(attempt);setAttempt(updated);setBatchAnswers({});
      await loadScoredBatch(updated);
    }catch(e){setError(String((e as Error).message||e));setBatchMessage('');}
    finally{setBusy(false);}
  };
  const loadPracticeGroup = useCallback(async(exclude:string[],loadedCount:number,imageAt:number,epoch:number,unitCounts:Record<string,number>):Promise<PracticeGroup> => {
    const res=await ApiService.getQuizPracticeBatch(selectedUnits,exclude.slice(-400),loadedCount,imageAt,unitCounts,selectedFormat,practiceFormatCounts.current);
    if(!res.success||!res.data)throw new Error(res.message||'Unable to load practice questions.');
    if(practiceEpoch.current!==epoch)throw new Error('Practice session changed.');
    return res.data;
  },[selectedUnits,selectedFormat]);
  const prefetchPracticeGroup = useCallback((exclude:string[],loadedCount:number,imageAt:number,epoch:number,unitCounts:Record<string,number>) => {
    const promise=loadPracticeGroup(exclude,loadedCount,imageAt,epoch,unitCounts);
    preparedPractice.current={epoch,promise};
    setPracticeNextMessage('Preparing the next group…');
    void promise.then(group=>{
      if(practiceEpoch.current!==epoch||preparedPractice.current?.promise!==promise)return;
      if(!group.questions.length)setPracticeExhausted(true);
      setPracticeNextMessage(group.questions.length?'Next group ready':'No additional questions after this group.');
      const first=group.questions[0];if(first?.questionType==='IMAGE')void getImage(first,undefined,true).catch(()=>{});
      prefetchUpcomingImages(group.questions,0);
    }).catch(e=>{
      if(practiceEpoch.current===epoch&&preparedPractice.current?.promise===promise){
        preparedPractice.current=null;
        setPracticeNextMessage((e as Error).message||'Could not prepare the next group. Retry.');
      }
    });
  },[getImage,loadPracticeGroup,prefetchUpcomingImages]);
  const beginPractice=async() => {
    if(busy)return;
    const epoch=++practiceEpoch.current;
    practiceFormatCounts.current={};
    setImageReady({});
    preparedPractice.current=null;
    setBusy(true);setError('');setPracticeNextMessage('');
    try{
      const group=await loadPracticeGroup([],0,0,epoch,{});
      if(!group.questions.length)throw new Error('No approved questions are available in the selected units.');
      const first=group.questions[0],ids=group.questions.map(q=>q.questionId);
      practiceUnitCounts.current=group.unitCounts;practiceFormatCounts.current=group.formatCounts||{};
      setPracticeBatch(group.questions);setPracticeBatchIndex(0);setPracticeExhausted(group.exhausted);
      setQuestion(first);setPracticeSeen(ids);setLastPracticeImageAt(group.lastImageAt);
      if(first.questionType==='IMAGE') void getImage(first).catch(()=>{});
      prefetchUpcomingImages(group.questions,0);
      setPracticeCorrect(0);setPracticeWrong(0);setPracticeSubmitted(false);setSelected('');setPage('practice');
      if(!group.exhausted)prefetchPracticeGroup(ids,ids.length,group.lastImageAt,epoch,{...group.unitCounts});
      else setPracticeNextMessage('All available questions loaded.');
    }catch(e){if(practiceEpoch.current===epoch)setError((e as Error).message);}
    finally{if(practiceEpoch.current===epoch)setBusy(false);}
  };
  const submitPractice=() => {
    if(!question||!validQuizResponse(question,selected)||practiceSubmitted||!isCurrentImageReady)return;
    const correct=isCorrectResponse(question,selected);
    if(correct)setPracticeCorrect(n=>n+1);else setPracticeWrong(n=>n+1);
    setPracticeSubmitted(true);
  };
  const finishPractice=() => {
    practiceEpoch.current+=1;preparedPractice.current=null;
    setPracticeBatch([]);setPracticeBatchIndex(0);setPracticeExhausted(false);setPracticeSeen([]);
    setQuestion(null);setSelected('');setPracticeSubmitted(false);
    setPracticeNextMessage('');setBusy(false);setError('');setPage('home');
    setNotice('Practice finished. No practice answers or scores were saved.');
  };
  const advancePractice=async() => {
    if(!question||!practiceSubmitted||busy)return;
    const nextIndex=practiceBatchIndex+1;
    // Local movement: zero Google Apps Script requests between prefetched questions.
    if(nextIndex<practiceBatch.length){
      setImageReady(previous=>({...previous,[practiceBatch[nextIndex].questionId]:false}));
      setPracticeBatchIndex(nextIndex);setQuestion(practiceBatch[nextIndex]);
      const upcoming=practiceBatch[nextIndex];
      if(upcoming.questionType==='IMAGE')void getImage(upcoming).catch(()=>{});
      prefetchUpcomingImages(practiceBatch,nextIndex);
      setSelected('');setPracticeSubmitted(false);
      return;
    }
    const epoch=practiceEpoch.current;
    setBusy(true);
    try{
      const pending=preparedPractice.current?.epoch===epoch?preparedPractice.current.promise:null;
      const group=pending?await pending:await loadPracticeGroup(practiceSeen,practiceSeen.length,lastPracticeImageAt,epoch,{...practiceUnitCounts.current});
      if(practiceEpoch.current!==epoch)return;
      if(!group.questions.length){setPracticeExhausted(true);setPracticeNextMessage('You have reached the end of the available questions.');return;}
      const ids=[...practiceSeen,...group.questions.map(q=>q.questionId)];
      practiceUnitCounts.current=group.unitCounts;practiceFormatCounts.current=group.formatCounts||{};
      setPracticeBatch(group.questions);setPracticeBatchIndex(0);setPracticeExhausted(group.exhausted);
      setImageReady(previous=>({...previous,[group.questions[0].questionId]:false}));
      setQuestion(group.questions[0]);setSelected('');setPracticeSubmitted(false);
      if(group.questions[0].questionType==='IMAGE')void getImage(group.questions[0]).catch(()=>{});
      prefetchUpcomingImages(group.questions,0);
      setPracticeSeen(ids);setLastPracticeImageAt(group.lastImageAt);
      preparedPractice.current=null;
      if(!group.exhausted)prefetchPracticeGroup(ids,ids.length,group.lastImageAt,epoch,{...group.unitCounts});
      else setPracticeNextMessage('All available questions loaded.');
    }catch(e){
      if(practiceEpoch.current===epoch){
        preparedPractice.current=null;
        setPracticeNextMessage((e as Error).message||'Could not load the next group. Retry.');
      }
    }finally{if(practiceEpoch.current===epoch)setBusy(false);}
  };

  const fetchHistory = async (offset: number) => {
    if(historyBusy) return;
    setHistoryBusy(true);
    try {
      const response = await ApiService.getQuizMyHistory(offset);
      if(!response.success || !response.data)throw new Error(response.message || 'Could not load scored-quiz history.');
      setHistory(old => offset===0?response.data!.items:[...old,...response.data!.items]);
      setHistoryMore(response.data.hasMore);
      setShowHistory(true);
    } catch(e) {setError((e as Error).message || 'Could not load quiz history.');}
    finally {setHistoryBusy(false);}
  };
  const openCompletedResult = async (id:string) => {
    setBusy(true);setError('');
    try {
      const res = await ApiService.getQuizScoredResult(id);
      if(!res.success || !res.data)throw new Error(res.message || 'Result unavailable.');
      setResults(res.data);setPage('result');
    }catch(e){setError((e as Error).message||'Result unavailable.');}
    finally{setBusy(false);}
  };
  const goHome=() => {practiceEpoch.current++;preparedPractice.current=null;setPage('home');setQuestion(null);setError('');setNotice('');setConfirmBack(false);void refreshHome().catch(e=>setError((e as Error).message));};
  const resetHome=() => {
    if(busy)return;
    if(page==='scored' && Object.keys(batchAnswers).length>0){setConfirmBack(true);return;}
    goHome();
  };
  const allUnitNames=home?.units.map(u=>u.name)||[];
  const available=home?.units.reduce((n,u)=>n+(!selectedUnits.length||selectedUnits.includes(u.name)?u.available:0),0)||0;
  const quizMaxWidth =
    page === 'home'
      ? 'max-w-[1440px]'
      : page === 'scored-setup' || page === 'practice-setup'
      ? 'max-w-[1200px]'
      : page === 'scored' || page === 'practice'
      ? 'max-w-[1100px]'
      : 'max-w-[1300px]';

  return <section className={`mx-auto w-full min-w-0 ${quizMaxWidth} space-y-5 pb-12`} aria-label="Quiz">
    <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-white via-cyan-50 to-teal-100 px-5 py-3 shadow-sm sm:px-7">
      <div className="pointer-events-none absolute -right-4 -top-12 h-40 w-40 rounded-full border-[24px] border-white/30" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800"><ShieldCheck className="h-3.5 w-3.5"/> Quiz & Clinical Learning</h1>
        {page!=='home'&&page!=='practice'?<button type="button" onClick={resetHome} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white/90 px-3.5 py-2.5 text-xs font-bold text-teal-800 shadow-sm transition hover:border-teal-400 hover:bg-white hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-50"><ChevronLeft className="h-4 w-4"/> Back to Quiz</button>
          :<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-teal-700 shadow-sm"><HeartPulse className="h-5 w-5"/></div>}
      </div>
    </div>
    {error&&home&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {notice&&<div role="status" aria-live="polite" className="fixed bottom-5 right-4 z-[140] flex max-w-[min(23rem,calc(100vw-2rem))] items-start gap-2 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-xl sm:bottom-6 sm:right-6">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true"/>
      <span className="flex-1">{notice}</span>
      <button type="button" aria-label="Dismiss notification" onClick={()=>setNotice('')} className="rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><XCircle className="h-4 w-4"/></button>
    </div>}
    {page === 'home' && (homeLoading || dashboardLoading || dashboardError || !coreReady) &&
      <div className="mb-3 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-2 text-xs text-teal-800" role="status">
        {homeLoading ? 'Checking unfinished Quiz… ' : ''}
        {dashboardLoading ? 'Loading approved Units, My Progress, leaderboard and clinical insight in the background…' : ''}
        {dashboardError && <span role="alert">{dashboardError} <button type="button" className="underline font-semibold" onClick={() => void refreshHome().catch(() => {})}>Retry</button></span>}
        {!coreReady && !homeLoading && !dashboardError && 'Unable to verify active Quiz. Retry before starting a new test.'}
        {(homeLoading || dashboardLoading) && <LoadingProgress className="mt-2" label={homeLoading ? 'Checking unfinished Quiz' : 'Loading Quiz dashboard'} />}
      </div>}
    {page==='home'&&<>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="group rounded-2xl border border-teal-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55" disabled={!coreReady || dashboardLoading || !!home.activeAttempt || busy} onClick={()=>{setSelectedUnits([]);setCount(10);setPage('scored-setup');}}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ClipboardCheck className="h-5 w-5"/></div>
              <h2 className="font-bold text-slate-900">Scored Quiz</h2><p className="mt-1 min-h-9 text-xs leading-relaxed text-slate-500">1–50 approved questions · marks and explanations.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">Start Scored Quiz <ChevronRight className="h-3.5 w-3.5"/></span>
            </button>
            <button type="button" className="group rounded-2xl border border-violet-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60" disabled={!coreReady || dashboardLoading || !!home.activeAttempt || busy} onClick={()=>{setSelectedUnits([]);setPage('practice-setup');}}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BookOpenCheck className="h-5 w-5"/></div>
              <h2 className="font-bold text-slate-900">Practice Quiz</h2><p className="mt-1 min-h-9 text-xs leading-relaxed text-slate-500">Instant feedback · no scores or answers stored.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-lg border border-violet-500 px-3 py-2 text-xs font-bold text-violet-700">Start Practice <ChevronRight className="h-3.5 w-3.5"/></span>
            </button>
          </div>
          {home.activeAttempt&&<div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Hourglass className="h-5 w-5"/></div>
              <div><h3 className="font-bold text-slate-900">Resume Unfinished Quiz</h3><p className="text-xs text-slate-600">{home.activeAttempt.answeredCount} of {home.activeAttempt.questionCount} answers saved</p></div></div>
              <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>void resume(home.activeAttempt!)}>{resumingId===home.activeAttempt.attemptId?<><Loader2 className="h-3.5 w-3.5 animate-spin"/> Resuming Quiz…</>:"Resume Quiz"}</button>
              <button type="button" disabled={busy} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50" onClick={()=>{setCancelError('');setCancelTarget(home.activeAttempt!.attemptId);}}>Cancel Quiz</button></div></div>
          </div>}
          <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
            <div className="border-b border-teal-100 bg-teal-50/60 px-4 py-3 sm:px-5"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Lightbulb className="h-5 w-5 text-teal-700"/>Today's Clinical Insight</h2></div>
            {dashboardLoading ? <div role="status" className="p-5 text-xs text-slate-500"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading insight…</div> : home.clinicalInsight ? <div className="p-3 sm:p-4">
              {insightImage ? <button type="button" className="block w-full overflow-hidden rounded-xl border border-teal-100 bg-slate-50" aria-label="Enlarge today's clinical insight poster" onClick={()=>setInsightImageExpanded(true)}><img src={insightImage} alt="Today's clinical nursing educational poster with embedded explanation" className="mx-auto max-h-[510px] w-full object-contain"/></button>
                : insightImageError ? <div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{insightImageError}</div>
                  : <div role="status" className="flex flex-col items-center gap-2 py-16 text-slate-500"><Loader2 className="h-7 w-7 animate-spin text-teal-600"/><span className="text-xs">Loading today's insight…</span></div>}
            </div> : <p className="p-5 text-sm text-slate-500">Today's image will appear after the admin activates an insight in the image library.</p>}
          </div>
          {insightImageExpanded&&insightImage&&<div role="dialog" aria-modal="true" aria-label="Enlarged daily clinical insight" className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/90 p-4" onClick={()=>setInsightImageExpanded(false)}><button type="button" onClick={()=>setInsightImageExpanded(false)} className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 text-sm font-bold">Close ✕</button><img src={insightImage} alt="Enlarged clinical nursing infographic" className="max-h-[90vh] max-w-[97vw] object-contain" onClick={e=>e.stopPropagation()}/></div>}
        </div>
        <aside className="min-w-0 space-y-4 xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Trophy className="h-5 w-5 text-amber-500"/> Top 5 Leaderboard</h2><span className="text-[10px] text-slate-500">Last 30 days</span></div>
            {dashboardLoading ? <p role="status" className="text-xs text-slate-500">Loading leaderboard…</p> : home.leaderboard.length?<ol className="space-y-2">{home.leaderboard.map(p=><li key={`${p.rank}-${p.name}`} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.rank===1?'bg-amber-100 text-amber-800':p.rank===2?'bg-slate-200 text-slate-700':p.rank===3?'bg-orange-100 text-orange-800':'bg-white text-slate-600'}`}>#{p.rank}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{p.name}</span><span className="block text-[10px] text-slate-500">{p.answered} unique answered</span></span><span className="shrink-0 text-xs font-bold text-teal-800">{p.accuracy.toFixed(1)}%</span></li>)}</ol>:<div className="flex flex-col items-center gap-2 py-8 text-center"><Medal className="h-9 w-9 text-slate-300"/><p className="text-sm font-semibold text-slate-700">Leaderboard awaits its first achievers</p><p className="max-w-48 text-xs text-slate-500">Completed scored quizzes will appear here.</p></div>}
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">Ranked by unique questions answered, then accuracy. Practice attempts never count.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Activity className="h-5 w-5 text-teal-700"/> My Progress</h2><span className="text-[11px] text-slate-500">Scored quizzes only</span></div>
            {dashboardLoading && <p role="status" className="mb-2 text-xs text-slate-500">Loading My Progress…</p>}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {([{label:'Completed Tests',value:home.myProgress?.completedTests??0,Icon:Award},{label:'Questions Answered',value:home.myProgress?.questionsAnswered??0,Icon:ClipboardCheck},{label:'Overall Accuracy',value:`${(home.myProgress?.accuracy??0).toFixed(1)}%`,Icon:Target}]).map(stat=><div className="min-w-0 rounded-xl bg-slate-50 p-3" key={stat.label}><stat.Icon className="mb-2 h-4 w-4 text-teal-700"/><p className="text-lg font-extrabold text-slate-900 sm:text-2xl">{stat.value}</p><p className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">{stat.label}</p></div>)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-700">Recent completed tests</h3><button type="button" className="text-xs font-bold text-teal-700 hover:underline" disabled={historyBusy||!(home.myProgress?.completedTests)} onClick={()=>showHistory?setShowHistory(false):void fetchHistory(0)}>{showHistory?'Hide history':'View history'}</button></div>
            <div className="mt-2 space-y-2">{(showHistory?history:home.myProgress?.recent||[]).length?(showHistory?history:home.myProgress!.recent).map(r=><button type="button" key={r.attemptId} disabled={busy} onClick={()=>void openCompletedResult(r.attemptId)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left text-xs hover:bg-slate-50 disabled:opacity-50"><span className="flex min-w-0 items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-slate-400"/><span className="truncate">{r.completedAt?new Date(r.completedAt).toLocaleDateString('en-IN'): 'Completed test'} · {r.correct}/{r.total} correct</span></span><strong className="shrink-0 text-teal-800">{r.percentage.toFixed(1)}%</strong></button>):<p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Your completed scored quizzes will appear here.</p>}
              {showHistory&&historyMore&&<button type="button" disabled={historyBusy} className="text-xs font-semibold text-teal-700" onClick={()=>void fetchHistory(history.length)}>{historyBusy?'Loading…':'Load more results'}</button>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-3 text-sm font-bold text-slate-900">Approved Question Bank</h2>{dashboardLoading && <p role="status" className="mb-2 text-xs text-slate-500">Loading approved question summary…</p>}
            <div className="grid grid-cols-3 gap-2">{[{value:home.total,label:'MCQs'},{value:home.units.length,label:'Units'},{value:home.imageCount,label:'Images'}].map(s=><div key={s.label} className="rounded-lg bg-slate-50 px-2 py-3 text-center"><p className="text-lg font-extrabold text-teal-800">{s.value}</p><p className="text-[10px] text-slate-500">{s.label}</p></div>)}</div><p className="mt-3 text-[11px] text-slate-500">Only clinically approved questions are available. Drafts are excluded.</p></div>
        </aside>
      </div>
    </>}
    {(page==='scored-setup'||page==='practice-setup')&&home&&<div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-teal-700 p-2.5 text-white">{page==='scored-setup'?<ClipboardCheck className="h-5 w-5"/>:<BookOpenCheck className="h-5 w-5"/>}</span><div><h2 className="text-lg font-extrabold text-slate-900">{page==='scored-setup'?'Scored Quiz':'Practice Quiz'} Setup</h2><p className="text-sm text-slate-600">Choose your preferred clinical learning units.</p></div></div>
      </div>
      <div className="space-y-5 px-5 py-6 sm:px-7">
        {page==='scored-setup'&&<section className="space-y-3" aria-label="Step 1 - Number of questions">
          <h3 className="text-sm font-bold text-slate-900"><span className="mr-2 rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-700">1</span>Number of Questions</h3>
          <div className="grid grid-cols-5 gap-2">{[10,20,30,40,50].map(n=><button type="button" key={n} onClick={()=>setCount(n)} aria-pressed={count===n} className={`rounded-xl border py-3 text-sm font-bold transition ${count===n?'border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-600':'border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300'}`}>{n}</button>)}</div>
          <label className="flex items-center gap-3 text-xs font-medium text-slate-600">Custom (1–50)<input className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900" type="number" min={1} max={50} value={count} onChange={e=>setCount(Math.max(1,Math.min(50,Number(e.target.value)||1)))}/></label>
        </section>}
        <fieldset className="space-y-3"><legend className="mb-2 text-sm font-bold text-slate-900">{page==='scored-setup'&&<span className="mr-2 rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-700">2</span>}Select Units</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-slate-800"><input type="checkbox" className="accent-teal-700" checked={!selectedUnits.length} onChange={()=>setSelectedUnits([])}/> All Units <span className="ml-auto text-xs font-normal text-teal-700">Default</span></label>
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{home.units.map(u=><label key={u.name} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-white p-3 text-sm hover:bg-slate-50"><input type="checkbox" className="accent-teal-700" checked={selectedUnits.includes(u.name)} onChange={e=>setSelectedUnits(prev=>e.target.checked?(prev.length===allUnitNames.length-1?[]:[...prev,u.name]):prev.length===0?allUnitNames.filter(x=>x!==u.name):prev.filter(x=>x!==u.name))}/><span className="min-w-0 flex-1 text-slate-700">{u.name}</span><span className="text-xs text-slate-500">{u.available}</span></label>)}</div>
        </fieldset>
        <fieldset className="space-y-2"><legend className="text-sm font-bold text-slate-800">Response Format</legend>
          <div className="grid gap-2 sm:grid-cols-2">{[['ALL','All Response Formats (Mixed)'],['SINGLE_SELECT','Single Select'],['MULTI_SELECT','Multiple Select'],['ORDERED_RESPONSE','Ordered Response']].map(([key,label])=><label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"><input type="radio" name="quiz-response-format" checked={selectedFormat===key} onChange={()=>setSelectedFormat(key)} className="accent-teal-700"/>{label}</label>)}</div>
        </fieldset>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2 text-sm"><span className="font-bold text-slate-800">Your assessment</span><span className="font-bold text-teal-700">{page==='scored-setup'?`${count} questions`:'Practice mode'}</span></div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{available} clinically approved questions available. {page==='practice-setup'?'Answers and scores are not stored.':'Answer locally, then permanently submit each batch of up to 10 questions. Submitted answers cannot be changed.'}</p>
          <p className="mt-2 text-xs text-slate-500">Units are balanced with shortage redistribution. Image MCQs are spaced when available.</p>
        </div>
        {home.activeAttempt&&<p role="alert" className="text-sm text-amber-700">Resume or cancel your unfinished Scored Quiz on the dashboard first.</p>}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="button" disabled={busy||!available||!!home.activeAttempt||(page==='scored-setup'&&available<count)} onClick={()=>void(page==='scored-setup'?beginScored():beginPractice())} className="inline-flex min-w-[175px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-40" aria-busy={busy}>
            {busy?<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>{page==='scored-setup'?'Preparing Quiz…':'Loading Questions…'}</>:<>{page==='scored-setup'?'Start Scored Quiz':'Start Practice'}<ChevronRight className="h-4 w-4" aria-hidden="true"/></>}
          </button>
        </div>
      </div>
    </div>}
    {page==='scored'&&attempt&&!question&&<div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <Loader2 className={`mx-auto h-8 w-8 text-teal-600 ${busy?'animate-spin':''}`}/>
      <h2 className="text-base font-bold text-slate-900">{busy?'Loading your quiz…':'Your submitted answers are safe'}</h2>
      <p className="text-sm text-slate-600">{busy?'Preparing your next group of questions.':'The last saved batch remains locked. Retry to open the next batch or finish your quiz.'}</p>
      {!busy&&<button type="button" onClick={()=>void loadScoredBatch(attempt)} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white">Retry loading quiz</button>}
    </div>}
    {(page==='scored'||page==='practice')&&question&&<div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-slate-800">{page==='scored'?`Question ${index+1} of ${attempt?.questionCount}`:`Question ${practiceCorrect+practiceWrong+1}`}</span>
        <div className="flex flex-wrap items-center gap-2"><QuizFormatBadge question={question}/><span className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">{question.unit}</span></div>
      </div>
      {page==='scored'&&attempt&&<div className="space-y-3"><div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{width:`${Math.round((attempt.committedCount+Object.keys(batchAnswers).length)/attempt.questionCount*100)}%`}}/></div><div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{attempt.committedCount} of {attempt.questionCount} permanently saved</span><span>{Object.keys(batchAnswers).length} of {scoredBatch.length} answered in current batch</span></div>
        <div className="flex flex-wrap items-center justify-between gap-2.5"><div className="flex flex-wrap gap-1.5" aria-label="Questions in current batch">{scoredBatch.map((q,n)=><button type="button" key={q.questionId} disabled={busy} onClick={()=>changeScoredQuestion(attempt.committedCount+n)} aria-label={`Question ${attempt.committedCount+n+1}`} aria-current={question.questionId===q.questionId?'step':undefined} className={`h-9 min-w-9 rounded-lg border text-xs font-bold ${question.questionId===q.questionId?'border-teal-700 bg-teal-700 text-white':batchAnswers[q.questionId]?'border-teal-300 bg-teal-50 text-teal-800':'border-slate-200 bg-white text-slate-500'}`}>{attempt.committedCount+n+1}</button>)}</div>
          <span className="max-w-md text-[11px] font-medium leading-4 text-amber-800">Batch {Math.floor(attempt.committedCount/SCORED_BATCH_SIZE)+1}/{Math.ceil(attempt.questionCount/SCORED_BATCH_SIZE)} · Edit before saving · Submitted batches locked</span>
        </div>
      </div>}
      {page==='practice'&&<div className="flex gap-3 text-xs font-semibold"><span>Answered: {practiceCorrect+practiceWrong}</span><span className="text-emerald-700">Correct: {practiceCorrect}</span><span className="text-rose-700">Wrong: {practiceWrong}</span></div>}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5"><h3 className="whitespace-pre-wrap text-base font-bold leading-relaxed text-slate-900">{question.question}</h3></div>
      <QuizImage question={question} attemptId={page==='scored'?attempt?.attemptId:undefined} getImage={getImage} invalidateImage={invalidateImage} onAvailabilityChange={handleImageAvailability}/>
      {!isCurrentImageReady && <p role="status" className="text-xs font-medium text-teal-800">Image question: answer options will unlock after the clinical image loads.</p>}
      <QuizResponseInput key={`${question.questionId}-${page}`} question={question} value={selected}
        onChange={chooseAnswer} seed={page==='scored'?attempt?.attemptId||'scored':'practice'}
        disabled={busy||!isCurrentImageReady||Boolean(page==='practice'&&practiceSubmitted)}
        review={page==='practice'&&practiceSubmitted}/>
      {page==='practice'&&practiceSubmitted&&<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="font-bold text-slate-900">{isCorrectResponse(question,selected)?'Correct!':'Review the correct answer'}{responseFormat(question)!=='ORDERED_RESPONSE'?` — ${question.correctOption}`:''}</h4>
        <p className="text-xs font-medium text-slate-600">Your answer: {quizAnswerText(question,selected)}</p>
        <p className="text-xs font-medium text-emerald-800">Correct answer: {quizAnswerText(question,question.correctOption||'')}</p>
        <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3"><h5 className="mb-1 text-xs font-bold text-teal-900">Clinical explanation</h5><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{question.explanation||'Explanation unavailable.'}</p></div>
      </div>}
      {page==='scored'?<div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy||!attempt||index<=attempt.committedCount} onClick={()=>changeScoredQuestion(index-1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/> Previous</button>
            <button type="button" disabled={busy||!attempt||index>=attempt.committedCount+scoredBatch.length-1} onClick={()=>changeScoredQuestion(index+1)} className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-50 disabled:opacity-40">Next <ChevronRight className="h-4 w-4"/></button></div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={busy} onClick={()=>{if(attempt){setCancelError('');setCancelTarget(attempt.attemptId);}}} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"><XCircle className="h-4 w-4"/> Cancel Quiz</button>
            <button type="button" disabled={busy||!isCurrentImageReady||scoredBatch.length===0||scoredBatch.some(q=>!batchAnswers[q.questionId])} onClick={()=>void submitScoredBatch()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-40">{busy?<><Loader2 className="h-4 w-4 animate-spin"/> Saving…</>:<>{attempt&&attempt.committedCount+scoredBatch.length>=attempt.questionCount?'Save & Finish':'Save & Next Batch'} <ChevronRight className="h-4 w-4"/></>}</button>
          </div>
        </div>
        {busy&&batchMessage&&<div role="status" className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-center text-sm font-medium text-teal-800"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>{batchMessage}</div>}
        <p className="text-xs text-slate-500">All {scoredBatch.length} answers are required before saving. Once submitted, this batch cannot be changed. Your unsent answers are kept temporarily in this browser tab.</p>
      </div>:
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">{!practiceSubmitted?<button type="button" disabled={!question||!validQuizResponse(question,selected)||busy||!isCurrentImageReady} onClick={submitPractice} className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50">Submit Answer</button>:(practiceBatchIndex===practiceBatch.length-1&&practiceExhausted?null:<button type="button" disabled={busy} onClick={()=>void advancePractice()} className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50">{busy?<><Loader2 className="h-4 w-4 animate-spin"/> Loading…</>:<>Next Question <ChevronRight className="h-4 w-4"/></>}</button>)}
            {practiceSubmitted&&<span role="status" className="text-[11px] text-slate-500">{practiceBatchIndex<practiceBatch.length-1?'Next question ready':practiceNextMessage||'Next group preloading…'}</span>}</div>
          <button type="button" disabled={busy} onClick={finishPractice} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/> Finish Practice</button>
        </div>}
      <p className="text-xs text-slate-500">{page==='scored'?'Answers and explanations appear only after completing the quiz. Submitted batches are recoverable.':'Practice answers and scores exist only in this page session.'}</p>
    </div>}
    {page==='result'&&results&&<div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-5 py-4 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white"><Award className="h-6 w-6" aria-hidden="true"/></span>
          <div><h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Scored Quiz Results</h2><p className="text-xs text-slate-600">Clinical knowledge assessment summary</p></div>
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="min-w-0 rounded-xl border border-teal-100 bg-teal-50/70 px-2 py-4 text-center sm:p-4">
              <div className="text-xl font-extrabold text-teal-800 sm:text-3xl">{results.percentage.toFixed(1)}%</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-600 sm:text-xs">Overall Score</div>
            </div>
            <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/70 px-2 py-4 text-center sm:p-4">
              <div className="text-xl font-extrabold text-emerald-700 sm:text-3xl">{results.correct}</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-600 sm:text-xs">Correct</div>
            </div>
            <div className="min-w-0 rounded-xl border border-rose-100 bg-rose-50/70 px-2 py-4 text-center sm:p-4">
              <div className="text-xl font-extrabold text-rose-700 sm:text-3xl">{results.wrong}</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-600 sm:text-xs">Incorrect</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-bold text-slate-700">Overall Accuracy</span><span className="font-bold text-teal-800">{results.correct} / {results.total} correct · {results.percentage.toFixed(1)}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Overall Quiz accuracy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,results.percentage))}>
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{width:`${Math.max(0,Math.min(100,results.percentage))}%`}}/>
            </div>
          </div>
        </div>
      </div>
      {!!results.unitScores?.length&&<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Activity className="h-4 w-4 text-teal-700" aria-hidden="true"/> Unit-wise Performance</h3></div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">{results.unitScores.map(u=><div key={u.unit} className="min-w-0 space-y-2 rounded-xl border border-slate-100 bg-white p-3.5">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold leading-relaxed text-slate-800">{u.unit}</span><span className="shrink-0 text-xs font-bold text-teal-800">{u.correct}/{u.total}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${u.unit} accuracy`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={u.total?Math.round(u.correct/u.total*100):0}>
            <div className="h-full rounded-full bg-teal-600" style={{width:`${u.total?Math.max(0,Math.min(100,u.correct/u.total*100)):0}%`}}/>
          </div>
        </div>)}</div>
      </div>}
      {results.formatScores&&<div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-3 font-bold text-slate-800">Response Format Performance</h3><div className="grid gap-2 sm:grid-cols-3">{results.formatScores.map(f=><div key={f.format} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{f.format.replace('_',' ')}</strong><p>{f.correct}/{f.total} correct</p></div>)}</div></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base"><BookOpenCheck className="h-5 w-5 text-teal-700" aria-hidden="true"/> Question Review & Explanations</h3><span className="text-xs font-semibold text-slate-500">{results.review.length} questions</span></div>
      {results.review.map((r,i)=>{
        const correctOption=r.question.correctOption;
        const wasCorrect=isCorrectResponse(r.question,r.selectedOption);
        return <article key={`${r.question.questionId}-${i}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">Question {i+1}</span><QuizFormatBadge question={r.question}/><span className="text-xs font-medium text-slate-500">{r.question.unit}</span></div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${wasCorrect?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800'}`}>
              {wasCorrect?<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true"/>:<XCircle className="h-3.5 w-3.5" aria-hidden="true"/>}{wasCorrect?'Correct':'Incorrect'}
            </span>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <h4 className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-slate-900 sm:text-base">{r.question.question}</h4>
            <QuizImage question={r.question} attemptId={results.attemptId} getImage={getImage} invalidateImage={invalidateImage}/>
            <QuizResponseInput key={`review-${r.question.questionId}`} question={r.question} value={r.selectedOption} review/>
            <div className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
              <p><strong>Your answer:</strong> {quizAnswerText(r.question,r.selectedOption)}</p>
              <p><strong>Correct answer:</strong> {quizAnswerText(r.question,correctOption||'')}</p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5 sm:p-4"><h5 className="mb-1.5 flex items-center gap-2 text-xs font-bold text-teal-900"><BookOpenCheck className="h-4 w-4" aria-hidden="true"/> Clinical Explanation</h5><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.question.explanation||'Explanation unavailable.'}</p></div>
          </div>
        </article>;
      })}
    </div>}
    {confirmBack&&<div className="fixed inset-0 z-[155] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Leave unfinished scored quiz">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold text-slate-900">Return to the Quiz dashboard?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">This batch has unsent answers. They are saved temporarily in this browser session, but only submitted batches are permanently stored. Resume from the same browser to restore them.</p>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setConfirmBack(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Stay Here</button><button type="button" onClick={goHome} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">Leave Quiz</button></div>
      </div>
    </div>}
    {cancelTarget&&<div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Cancel unfinished quiz" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setCancelTarget(null);}}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-3 flex items-center gap-2"><XCircle className="h-6 w-6 text-rose-600"/><h2 className="text-lg font-bold text-slate-900">Cancel unfinished quiz?</h2></div>
        <p className="text-sm leading-relaxed text-slate-600">This scored attempt will be cancelled. Its answers will not count toward My Progress or the leaderboard. You cannot undo this action.</p>
        {cancelError&&<div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{cancelError}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={()=>{setCancelTarget(null);setCancelError('');}} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Keep Quiz</button>
          <button type="button" disabled={busy} onClick={()=>void cancelScored(cancelTarget)} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{cancellingId===cancelTarget?<><Loader2 className="h-4 w-4 animate-spin"/> Cancelling Quiz…</>:"Confirm Cancel"}</button></div>
      </div>
    </div>}
  </section>;
};
