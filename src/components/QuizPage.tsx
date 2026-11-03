import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Award, BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Image as ImageIcon, Loader2, RefreshCw, Trophy, XCircle, HeartPulse, Hourglass, Lightbulb, Target, ShieldCheck, Medal, CalendarDays, History } from 'lucide-react';
import { ApiService } from '../services/api';
import type { QuizAttempt, QuizHomeData, QuizQuestion, QuizResult, QuizHistoryItem, SessionUser } from '../types';

type Page = 'home' | 'scored-setup' | 'practice-setup' | 'scored' | 'practice' | 'result';
const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A','B','C','D'];
const SCORED_BATCH_SIZE = 10;
const batchMessages = ['Great progress — giving your neurons a moment to recharge!', 'Your answers are being saved securely. Stay sharp!', 'Clinical knowledge grows one question at a time.', 'Mental stretch! Your next set of questions is almost ready.'];

const QuizImage: React.FC<{ question: QuizQuestion; attemptId?: string; getImage: (q: QuizQuestion, attemptId?: string) => Promise<string> }> = ({ question, attemptId, getImage }) => {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (question.questionType !== 'IMAGE') return;
    let active = true;
    setSource(''); setError('');
    void getImage(question, attemptId).then(src => { if (active) setSource(src); }).catch(e => {if(active)setError(e instanceof Error ? e.message : 'Image unavailable');});
    return () => { active = false; };
  }, [question.questionId, question.imageFileId, question.questionType, attemptId, getImage]);
  if (question.questionType !== 'IMAGE') return null;
  if(error) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Image cannot be loaded: {error}</div>;
  if(!source) return <div className="rounded-lg bg-slate-100 p-4 text-sm text-slate-500" role="status">Loading clinical image…</div>;
  return <>
    <button type="button" className="my-3 max-w-full rounded-xl border border-slate-200 bg-white p-2 text-left" onClick={() => setExpanded(true)}>
      <img src={source} alt="Clinical question illustration" className="max-h-64 max-w-full object-contain rounded" />
      <span className="block pt-1 text-xs text-teal-700">Tap image to enlarge</span>
    </button>
    {expanded && <div role="dialog" aria-modal="true" aria-label="Enlarged clinical question image" className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 p-5" onClick={()=>setExpanded(false)}>
      <button type="button" className="absolute top-5 right-5 rounded bg-white px-3 py-2 text-sm" onClick={()=>setExpanded(false)}>Close ✕</button>
      <img src={source} alt="Enlarged clinical question illustration" className="max-h-[85vh] max-w-[95vw] object-contain" onClick={e=>e.stopPropagation()}/>
    </div>}
  </>;
};

export const QuizPage: React.FC<{user: SessionUser}> = ({user}) => {
  const [page,setPage] = useState<Page>('home');
  const [home,setHome] = useState<QuizHomeData | null>(null);
  const [homeLoading,setHomeLoading] = useState(true);
  const [selectedUnits,setSelectedUnits] = useState<string[]>([]);
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
  const [practiceNext,setPracticeNext] = useState<QuizQuestion | null>(null);
  const [practiceNextMessage,setPracticeNextMessage] = useState('');
  const [results,setResults] = useState<QuizResult | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [cancelTarget,setCancelTarget] = useState<string | null>(null);
  const [cancelError,setCancelError] = useState('');
  const [showHistory,setShowHistory] = useState(false);
  const [history,setHistory] = useState<QuizHistoryItem[]>([]);
  const [historyMore,setHistoryMore] = useState(false);
  const [historyBusy,setHistoryBusy] = useState(false);
  const [insightImage,setInsightImage] = useState('');
  const [insightImageError,setInsightImageError] = useState('');
  const [insightImageExpanded,setInsightImageExpanded] = useState(false);

  const practiceUnitCounts = useRef<Record<string,number>>({});
  const imageCache = useRef<Map<string,Promise<string>>>(new Map());
  const mounted = useRef(true);
  const practiceEpoch = useRef(0);
  const practicePrefetchSerial = useRef(0);

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

  const getImage = useCallback(async (q: QuizQuestion, id?: string): Promise<string> => {
    const key = `${user.employeeId}|${id || 'practice'}|${q.questionId}`;
    const cache = imageCache.current;
    if(!cache.has(key)) {
      const promise = ApiService.getQuizImage(q.questionId,id).then(res => {
        if(!res.success || !res.data?.base64Data || !res.data?.mimeType)throw new Error(res.message || 'Image unavailable');
        return `data:${res.data.mimeType};base64,${res.data.base64Data}`;
      }).catch(e => {cache.delete(key);throw e;});
      cache.set(key,promise);
    }
    return cache.get(key)!;
  }, [user.employeeId]);

  const refreshHome = useCallback(async () => {
    if(mounted.current) setHomeLoading(true);
    try {
      const res = await ApiService.getQuizHome();
      if (!res.success || !res.data) throw new Error(res.message || 'Quiz data could not be loaded.');
      if(mounted.current) setHome(res.data);
      return res.data;
    } finally {
      if(mounted.current) setHomeLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current=true;
    void refreshHome().catch(e => {if(mounted.current)setError(String(e.message || e));});
    return () => { mounted.current=false;practiceEpoch.current+=1;imageCache.current.clear(); };
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
          questions.forEach(q=>{const answer=data.answers[q.questionId];if(typeof answer==='string'&&letters.includes(answer as 'A'|'B'|'C'|'D'))draft[q.questionId]=answer;});
        }}
      }catch(_ignored){/* storage unavailable */}
      setAttempt(a);setScoredBatch(questions);setBatchAnswers(draft);
      setIndex(start);setQuestion(questions[0]);setSelected(draft[questions[0].questionId]||'');setPage('scored');setBatchMessage('');
      if(start+questions.length<a.questionCount){void fetchBatch(a,start+questions.length).catch(()=>{});}
    }catch(e){setError(String((e as Error).message||e));setQuestion(null);setScoredBatch([]);setPage('scored');}
    finally{setBusy(false);}
  },[fetchBatch,refreshHome,user.employeeId]);

  useEffect(()=>{
    if(page!=='scored'||!attempt||!scoredBatch.length)return;
    try{window.sessionStorage.setItem(draftKey(attempt),JSON.stringify({start:attempt.committedCount,answers:batchAnswers}));}
    catch(_ignored){/* session storage can be disabled; backend commits remain safe */}
  },[page,attempt,scoredBatch,batchAnswers,user.employeeId]);

  const beginScored = async() => {
    setBusy(true);setError('');
    try{
      const res=await ApiService.startQuizScored(selectedUnits,count);
      if(!res.success||!res.data)throw new Error(res.message || 'Could not start quiz.');
      prefetchedBatches.current={};
      await loadScoredBatch(res.data);
    }catch(e){setError(String((e as Error).message||e));}
    finally{setBusy(false);}
  };
  const resume = async(a:QuizAttempt) => {
    prefetchedBatches.current={};
    await loadScoredBatch(a);
  };
  const cancelScored = async(id:string) => {
    if(busy)return;
    setBusy(true);setError('');setCancelError('');
    try{
      const res=await ApiService.cancelQuizScored(id);
      if(!res.success)throw new Error(res.message||'Could not cancel the quiz.');
      clearDraft({attemptId:id} as QuizAttempt);
      setAttempt(null);setQuestion(null);setScoredBatch([]);setBatchAnswers({});prefetchedBatches.current={};
      setPage('home');setCancelTarget(null);setHome(prev=>prev?{...prev,activeAttempt:null}:prev);
      setNotice('Scored quiz cancelled. It will not appear in the leaderboard.');
      try{await refreshHome();}catch(e){setError('Quiz cancelled, but the dashboard could not refresh. Reopen Quiz to reload your data.');}
    }catch(e){setCancelError((e as Error).message||'Cancellation failed.');}
    finally{setBusy(false);}
  };
  const chooseScored = (choice:string) => {
    if(!question||busy)return;
    setSelected(choice);
    setBatchAnswers(prev=>({...prev,[question.questionId]:choice}));
  };
  const changeScoredQuestion = (position:number) => {
    if(!attempt||busy)return;
    const relative=position-attempt.committedCount;
    if(relative<0||relative>=scoredBatch.length)return;
    const q=scoredBatch[relative];setQuestion(q);setIndex(position);setSelected(batchAnswers[q.questionId]||'');
    setError('');
  };
  const submitScoredBatch = async() => {
    if(!attempt||busy||scoredBatch.length===0)return;
    const answers=scoredBatch.map(q=>batchAnswers[q.questionId]||'');
    if(answers.some(x=>!letters.includes(x as 'A'|'B'|'C'|'D'))){
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
  const loadPractice = useCallback(async(exclude:string[],answeredCount:number,imageAt:number,epoch:number,unitCounts:Record<string,number>) => {
    const res=await ApiService.getQuizPracticeQuestion(selectedUnits,exclude,answeredCount,imageAt,unitCounts);
    if(!res.success||!res.data)throw new Error(res.message||'No questions available.');
    if(practiceEpoch.current!==epoch)throw new Error('Practice session changed.');
    return res.data;
  },[selectedUnits]);
  const prefetchPractice = useCallback((exclude:string[],answeredCount:number,imageAt:number,epoch:number,unitCounts:Record<string,number>) => {
    const serial=++practicePrefetchSerial.current;
    setPracticeNext(null);setPracticeNextMessage('');
    void loadPractice(exclude,answeredCount,imageAt,epoch,unitCounts).then(q=>{
      if(practiceEpoch.current!==epoch || practicePrefetchSerial.current!==serial)return;
      setPracticeNext(q);
      if(q.questionType==='IMAGE')void getImage(q).catch(()=>{});
    }).catch(e=>{if(practiceEpoch.current===epoch && practicePrefetchSerial.current===serial)setPracticeNextMessage((e as Error).message||'No more questions.');});
  },[getImage,loadPractice]);
  const beginPractice=async() => {
    const epoch=++practiceEpoch.current;
    setBusy(true);setError('');
    try{
      practiceUnitCounts.current={};
      const q=await loadPractice([],0,0,epoch,{});
      practiceUnitCounts.current[q.unit||'Unspecified Unit']=1;
      setQuestion(q);setPracticeSeen([q.questionId]);setLastPracticeImageAt(q.questionType==='IMAGE'?1:0);
      setPracticeCorrect(0);setPracticeWrong(0);setPracticeSubmitted(false);setSelected('');setPage('practice');
      prefetchPractice([q.questionId],1,q.questionType==='IMAGE'?1:0,epoch,{...practiceUnitCounts.current});
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  };
  const submitPractice=() => {
    if(!question||!selected||practiceSubmitted)return;
    const correct=selected===question.correctOption;
    if(correct)setPracticeCorrect(n=>n+1);else setPracticeWrong(n=>n+1);
    setPracticeSubmitted(true);
  };
  const advancePractice=async() => {
    if(!question||!practiceSubmitted)return;
    const epoch=practiceEpoch.current,answered=practiceCorrect+practiceWrong;
    const newImageAt=question.questionType==='IMAGE'?answered:lastPracticeImageAt;
    const next=practiceNext;
    if(!next){
      practicePrefetchSerial.current+=1;
      setBusy(true);
      try{
        const q=await loadPractice(practiceSeen,answered,newImageAt,epoch,{...practiceUnitCounts.current});
        practiceUnitCounts.current[q.unit||'Unspecified Unit']=(practiceUnitCounts.current[q.unit||'Unspecified Unit']||0)+1;
        setPracticeSeen(previous=>[...previous,q.questionId]);
        setLastPracticeImageAt(newImageAt);
        setQuestion(q);setSelected('');setPracticeSubmitted(false);
        prefetchPractice([...practiceSeen,q.questionId],answered+1,q.questionType==='IMAGE'?answered+1:newImageAt,epoch,{...practiceUnitCounts.current});
        setPracticeNextMessage('');
      }catch(e){setPracticeNextMessage((e as Error).message);}
      finally{setBusy(false);}
      return;
    }
    practiceUnitCounts.current[next.unit||'Unspecified Unit']=(practiceUnitCounts.current[next.unit||'Unspecified Unit']||0)+1;
    setLastPracticeImageAt(next.questionType==='IMAGE'?answered+1:newImageAt);setPracticeSeen(s=>[...s,next.questionId]);
    setQuestion(next);setSelected('');setPracticeSubmitted(false);
    prefetchPractice([...practiceSeen,next.questionId],answered+1,next.questionType==='IMAGE'?answered+1:newImageAt,epoch,{...practiceUnitCounts.current});
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
  const resetHome=() => {practiceEpoch.current++;setPage('home');setQuestion(null);setError('');setNotice('');void refreshHome().catch(e=>setError((e as Error).message));};
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-slate-900">{page==='home'?'Quiz & Clinical Learning':'Quiz'}</h1><p className="text-sm text-slate-500">CNE Cell • Clinical learning and self-assessment</p></div>
      {page!=='home'&&<button type="button" onClick={resetHome} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700">Back to Quiz</button>}
    </div>
    {error&&home&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {notice&&<div className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{notice}</div>}
    {!home&&<div className="flex min-h-[180px] flex-col items-center justify-center gap-3 py-10 text-center" role={homeLoading?'status':'alert'} aria-live="polite">
      {homeLoading ? <>
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-500">Loading Quiz...</span>
      </> : <>
        <XCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />
        <p className="max-w-lg text-sm font-medium text-slate-700">{error && error !== 'Quiz data could not be loaded.' ? error : 'Unable to load Quiz questions.'}</p>
        <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={()=>{setError('');void refreshHome().catch(e=>{if(mounted.current)setError((e as Error).message||'Unable to load Quiz questions.');});}}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
        </button>
      </>}
    </div>}
    {page==='home'&&home&&<>
      <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-white via-cyan-50 to-teal-100 px-5 py-5 shadow-sm sm:px-7">
        <div className="absolute -right-4 -top-10 h-44 w-44 rounded-full border-[24px] border-white/30" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div><div className="mb-2 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800"><ShieldCheck className="h-3.5 w-3.5"/> Clinical Education</div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Explore. Practise. Strengthen clinical skills.</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">Focused assessments, your learning progress and one approved clinical insight each day.</p>
          </div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-teal-700 shadow-sm"><HeartPulse className="h-7 w-7"/></div>
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="group rounded-2xl border border-teal-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-500 hover:shadow-md" onClick={()=>{setSelectedUnits([]);setCount(10);setPage('scored-setup');}}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ClipboardCheck className="h-5 w-5"/></div>
              <h2 className="font-bold text-slate-900">Scored Quiz</h2><p className="mt-1 min-h-9 text-xs leading-relaxed text-slate-500">1–50 approved questions · marks and explanations.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">Start Scored Quiz <ChevronRight className="h-3.5 w-3.5"/></span>
            </button>
            <button type="button" className="group rounded-2xl border border-violet-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60" disabled={!!home.activeAttempt} onClick={()=>{setSelectedUnits([]);setPage('practice-setup');}}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BookOpenCheck className="h-5 w-5"/></div>
              <h2 className="font-bold text-slate-900">Practice Quiz</h2><p className="mt-1 min-h-9 text-xs leading-relaxed text-slate-500">Instant feedback · no scores or answers stored.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-lg border border-violet-500 px-3 py-2 text-xs font-bold text-violet-700">Start Practice <ChevronRight className="h-3.5 w-3.5"/></span>
            </button>
          </div>
          {home.activeAttempt&&<div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Hourglass className="h-5 w-5"/></div>
              <div><h3 className="font-bold text-slate-900">Resume Unfinished Quiz</h3><p className="text-xs text-slate-600">{home.activeAttempt.answeredCount} of {home.activeAttempt.questionCount} answers saved</p></div></div>
              <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>void resume(home.activeAttempt!)}>Resume Quiz</button>
              <button type="button" disabled={busy} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50" onClick={()=>{setCancelError('');setCancelTarget(home.activeAttempt!.attemptId);}}>Cancel Quiz</button></div></div>
          </div>}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Activity className="h-5 w-5 text-teal-700"/> My Progress</h2><span className="text-[11px] text-slate-500">Scored quizzes only</span></div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {([{label:'Completed Tests',value:home.myProgress?.completedTests??0,Icon:Award},{label:'Questions Answered',value:home.myProgress?.questionsAnswered??0,Icon:ClipboardCheck},{label:'Overall Accuracy',value:`${(home.myProgress?.accuracy??0).toFixed(1)}%`,Icon:Target}]).map(stat=><div className="min-w-0 rounded-xl bg-slate-50 p-3" key={stat.label}><stat.Icon className="mb-2 h-4 w-4 text-teal-700"/><p className="text-lg font-extrabold text-slate-900 sm:text-2xl">{stat.value}</p><p className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">{stat.label}</p></div>)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-700">Recent completed tests</h3><button type="button" className="text-xs font-bold text-teal-700 hover:underline" disabled={historyBusy||!(home.myProgress?.completedTests)} onClick={()=>showHistory?setShowHistory(false):void fetchHistory(0)}>{showHistory?'Hide history':'View history'}</button></div>
            <div className="mt-2 space-y-2">{(showHistory?history:home.myProgress?.recent||[]).length?(showHistory?history:home.myProgress!.recent).map(r=><button type="button" key={r.attemptId} disabled={busy} onClick={()=>void openCompletedResult(r.attemptId)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left text-xs hover:bg-slate-50 disabled:opacity-50"><span className="flex min-w-0 items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-slate-400"/><span className="truncate">{r.completedAt?new Date(r.completedAt).toLocaleDateString('en-IN'): 'Completed test'} · {r.correct}/{r.total} correct</span></span><strong className="shrink-0 text-teal-800">{r.percentage.toFixed(1)}%</strong></button>):<p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Your completed scored quizzes will appear here.</p>}
              {showHistory&&historyMore&&<button type="button" disabled={historyBusy} className="text-xs font-semibold text-teal-700" onClick={()=>void fetchHistory(history.length)}>{historyBusy?'Loading…':'Load more results'}</button>}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
            <div className="border-b border-teal-100 bg-teal-50/60 px-4 py-3 sm:px-5"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Lightbulb className="h-5 w-5 text-teal-700"/>Today's Clinical Insight</h2></div>
            {home.clinicalInsight ? <div className="p-3 sm:p-4">
              {insightImage ? <button type="button" className="block w-full overflow-hidden rounded-xl border border-teal-100 bg-slate-50" aria-label="Enlarge today's clinical insight poster" onClick={()=>setInsightImageExpanded(true)}><img src={insightImage} alt="Today's clinical nursing educational poster with embedded explanation" className="mx-auto max-h-[510px] w-full object-contain"/></button>
                : insightImageError ? <div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{insightImageError}</div>
                  : <div role="status" className="flex flex-col items-center gap-2 py-16 text-slate-500"><Loader2 className="h-7 w-7 animate-spin text-teal-600"/><span className="text-xs">Loading today's insight…</span></div>}
            </div> : <p className="p-5 text-sm text-slate-500">Today's image will appear after the admin activates an insight in the image library.</p>}
          </div>
          {insightImageExpanded&&insightImage&&<div role="dialog" aria-modal="true" aria-label="Enlarged daily clinical insight" className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/90 p-4" onClick={()=>setInsightImageExpanded(false)}><button type="button" onClick={()=>setInsightImageExpanded(false)} className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 text-sm font-bold">Close ✕</button><img src={insightImage} alt="Enlarged clinical nursing infographic" className="max-h-[90vh] max-w-[97vw] object-contain" onClick={e=>e.stopPropagation()}/></div>}
        </div>
        <aside className="min-w-0 space-y-4 xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Trophy className="h-5 w-5 text-amber-500"/> Top 5 Leaderboard</h2><span className="text-[10px] text-slate-500">Last 30 days</span></div>
            {home.leaderboard.length?<ol className="space-y-2">{home.leaderboard.map(p=><li key={`${p.rank}-${p.name}`} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.rank===1?'bg-amber-100 text-amber-800':p.rank===2?'bg-slate-200 text-slate-700':p.rank===3?'bg-orange-100 text-orange-800':'bg-white text-slate-600'}`}>#{p.rank}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{p.name}</span><span className="block text-[10px] text-slate-500">{p.answered} unique answered</span></span><span className="shrink-0 text-xs font-bold text-teal-800">{p.accuracy.toFixed(1)}%</span></li>)}</ol>:<div className="flex flex-col items-center gap-2 py-8 text-center"><Medal className="h-9 w-9 text-slate-300"/><p className="text-sm font-semibold text-slate-700">Leaderboard awaits its first achievers</p><p className="max-w-48 text-xs text-slate-500">Completed scored quizzes will appear here.</p></div>}
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">Ranked by unique questions answered, then accuracy. Practice attempts never count.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-3 text-sm font-bold text-slate-900">Approved Question Bank</h2><div className="grid grid-cols-3 gap-2">{[{value:home.total,label:'MCQs'},{value:home.units.length,label:'Units'},{value:home.imageCount,label:'Images'}].map(s=><div key={s.label} className="rounded-lg bg-slate-50 px-2 py-3 text-center"><p className="text-lg font-extrabold text-teal-800">{s.value}</p><p className="text-[10px] text-slate-500">{s.label}</p></div>)}</div><p className="mt-3 text-[11px] text-slate-500">Only clinically approved questions are available. Drafts are excluded.</p></div>
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2 text-sm"><span className="font-bold text-slate-800">Your assessment</span><span className="font-bold text-teal-700">{page==='scored-setup'?`${count} questions`:'Practice mode'}</span></div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{available} clinically approved questions available. {page==='practice-setup'?'Answers and scores are not stored.':'Answer locally, then permanently submit each batch of up to 10 questions. Submitted answers cannot be changed.'}</p>
          <p className="mt-2 text-xs text-slate-500">Units are balanced with shortage redistribution. Image MCQs are spaced when available.</p>
        </div>
        {home.activeAttempt&&<p role="alert" className="text-sm text-amber-700">Resume or cancel your unfinished Scored Quiz on the dashboard first.</p>}
        <button type="button" disabled={busy||!available||!!home.activeAttempt||(page==='scored-setup'&&available<count)} onClick={()=>void(page==='scored-setup'?beginScored():beginPractice())} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-40">{busy?'Opening…':page==='scored-setup'?'Start Scored Quiz':'Start Practice'} <ChevronRight className="h-4 w-4"/></button>
      </div>
    </div>}
    {page==='scored'&&attempt&&!question&&<div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <Loader2 className={`mx-auto h-8 w-8 text-teal-600 ${busy?'animate-spin':''}`}/>
      <h2 className="text-base font-bold text-slate-900">{busy?'Loading your quiz…':'Your submitted answers are safe'}</h2>
      <p className="text-sm text-slate-600">{busy?'Preparing your next group of questions.':'The last saved batch remains locked. Retry to open the next batch or finish your quiz.'}</p>
      {!busy&&<button type="button" onClick={()=>void loadScoredBatch(attempt)} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white">Retry loading quiz</button>}
    </div>}
    {(page==='scored'||page==='practice')&&question&&<div className="rounded-2xl border bg-white p-5 sm:p-7 space-y-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-bold text-slate-800">{page==='scored'?`Question ${index+1} of ${attempt?.questionCount}`:`Question ${practiceCorrect+practiceWrong+1}`}</span><span className="text-slate-500">{question.unit} · {question.questionType}</span></div>
      {page==='scored'&&attempt&&<div className="space-y-3"><div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{width:`${Math.round((attempt.committedCount+Object.keys(batchAnswers).length)/attempt.questionCount*100)}%`}}/></div><div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{attempt.committedCount} of {attempt.questionCount} permanently saved</span><span>{Object.keys(batchAnswers).length} of {scoredBatch.length} answered in current batch</span></div>
        <div className="flex flex-wrap gap-1.5" aria-label="Questions in current batch">{scoredBatch.map((q,n)=><button type="button" key={q.questionId} disabled={busy} onClick={()=>changeScoredQuestion(attempt.committedCount+n)} aria-label={`Question ${attempt.committedCount+n+1}`} aria-current={question.questionId===q.questionId?'step':undefined} className={`h-9 min-w-9 rounded-lg border text-xs font-bold ${question.questionId===q.questionId?'border-teal-700 bg-teal-700 text-white':batchAnswers[q.questionId]?'border-teal-300 bg-teal-50 text-teal-800':'border-slate-200 bg-white text-slate-500'}`}>{attempt.committedCount+n+1}</button>)}</div>
        <p className="text-xs text-amber-800">Batch {Math.floor(attempt.committedCount/SCORED_BATCH_SIZE)+1} of {Math.ceil(attempt.questionCount/SCORED_BATCH_SIZE)} · You may edit answers within this batch. Submitted batches are permanently locked.</p>
      </div>}
      {page==='practice'&&<div className="flex gap-3 text-xs font-semibold"><span>Answered: {practiceCorrect+practiceWrong}</span><span className="text-emerald-700">Correct: {practiceCorrect}</span><span className="text-rose-700">Wrong: {practiceWrong}</span></div>}
      <h3 className="whitespace-pre-wrap text-base font-bold text-slate-900">{question.question}</h3>
      <QuizImage question={question} attemptId={page==='scored'?attempt?.attemptId:undefined} getImage={getImage}/>
      <fieldset className="space-y-2"><legend className="sr-only">Select the correct answer</legend>{letters.map(letter=>{const checked=selected===letter;const reveal=page==='practice'&&practiceSubmitted;const isCorrect=question.correctOption===letter;return <label key={letter} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${reveal&&isCorrect?'border-emerald-500 bg-emerald-50':reveal&&checked&&!isCorrect?'border-rose-500 bg-rose-50':checked?'border-teal-600 bg-teal-50':'border-slate-200'}`}>
        <input type="radio" name={`quiz-${question.questionId}`} value={letter} checked={checked} disabled={reveal||busy} onChange={()=>page==='scored'?chooseScored(letter):setSelected(letter)} className="mt-1"/><span><strong>{letter}.</strong> {question.options[letter]}</span></label>;})}</fieldset>
      {page==='practice'&&practiceSubmitted&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h4 className="mb-1 font-bold text-slate-900">{selected===question.correctOption?'Correct!':'Review the correct answer'} — {question.correctOption}</h4><p className="text-sm text-slate-700">{question.explanation}</p></div>}
      {page==='scored'?<div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy||!attempt||index<=attempt.committedCount} onClick={()=>changeScoredQuestion(index-1)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="w-4"/>Previous</button><button type="button" disabled={busy||!attempt||index>=attempt.committedCount+scoredBatch.length-1} onClick={()=>changeScoredQuestion(index+1)} className="flex items-center gap-1 rounded-lg border border-teal-200 px-4 py-2.5 text-sm font-bold text-teal-700 disabled:opacity-40">Next Question <ChevronRight className="w-4"/></button><button type="button" disabled={busy} onClick={()=>{if(attempt){setCancelError('');setCancelTarget(attempt.attemptId);}}} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40">Cancel Quiz</button></div>
        <button type="button" disabled={busy||scoredBatch.length===0||scoredBatch.some(q=>!batchAnswers[q.questionId])} onClick={()=>void submitScoredBatch()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy?'Saving answers securely…':attempt&&attempt.committedCount+scoredBatch.length>=attempt.questionCount?'Save & Finish':'Save & Next Batch'} <ChevronRight className="h-4 w-4"/></button>
        {busy&&batchMessage&&<div role="status" className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-center text-sm font-medium text-teal-800"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>{batchMessage}</div>}
        <p className="text-xs text-slate-500">All {scoredBatch.length} answers are required before saving. Once submitted, this batch cannot be changed. Your unsent answers are kept temporarily in this browser tab.</p>
      </div>:
        <div className="flex flex-wrap gap-2">{!practiceSubmitted?<button type="button" disabled={!selected} onClick={submitPractice} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Submit Answer</button>:<button type="button" disabled={busy||(!practiceNext&&!!practiceNextMessage)} onClick={()=>void advancePractice()} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?'Loading…':'Next Question'} <ChevronRight className="inline w-4"/></button>}{practiceSubmitted&&<span className="self-center text-xs text-slate-500">{practiceNext?'Next question ready':practiceNextMessage||'Preparing next question…'}</span>}</div>}
      <p className="text-xs text-slate-500">{page==='scored'?'Answers and explanations appear only after completing the quiz. Submitted batches are recoverable.':'Practice answers and scores exist only in this page session.'}</p>
    </div>}
    {page==='result'&&results&&<div className="space-y-5"><div className="rounded-2xl border bg-white p-6"><h2 className="flex items-center gap-2 text-xl font-bold"><Award className="text-amber-500"/> Scored Quiz Results</h2><p className="mt-3 text-lg font-bold">{results.correct} / {results.total} marks · {results.percentage.toFixed(1)}%</p><p className="text-sm text-slate-600">Correct: {results.correct} | Wrong: {results.wrong}</p></div>
      {results.unitScores?.length>0&&<div className="rounded-2xl border bg-white p-5"><h3 className="mb-3 font-bold text-slate-900">Unit-wise performance</h3><div className="grid gap-2 sm:grid-cols-2">{results.unitScores.map(u=><div key={u.unit} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-medium">{u.unit}</span><span className="shrink-0 font-bold text-teal-800">{u.correct}/{u.total}</span></div>)}</div></div>}
      <h3 className="font-bold">Question review and explanations</h3>
      {results.review.map((r,i)=><div className="rounded-xl border bg-white p-5 space-y-3" key={`${r.question.questionId}-${i}`}>
        <div className="text-xs text-slate-500">Question {i+1} • {r.question.unit}</div><h4 className="font-bold whitespace-pre-wrap">{r.question.question}</h4>
        <QuizImage question={r.question} attemptId={results.attemptId} getImage={getImage}/>
        <p className="text-sm">Your answer: <strong>{r.selectedOption}</strong> — {r.question.options[r.selectedOption as 'A'|'B'|'C'|'D']||'Not answered'}</p>
        <p className="text-sm text-emerald-800">Correct answer: <strong>{r.question.correctOption}</strong> — {r.question.options[r.question.correctOption!]}</p>
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Explanation:</strong> {r.question.explanation}</div>
      </div>)}
    </div>}
    {cancelTarget&&<div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Cancel unfinished quiz" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setCancelTarget(null);}}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-3 flex items-center gap-2"><XCircle className="h-6 w-6 text-rose-600"/><h2 className="text-lg font-bold text-slate-900">Cancel unfinished quiz?</h2></div>
        <p className="text-sm leading-relaxed text-slate-600">This scored attempt will be cancelled. Its answers will not count toward My Progress or the leaderboard. You cannot undo this action.</p>
        {cancelError&&<div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{cancelError}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={()=>{setCancelTarget(null);setCancelError('');}} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Keep Quiz</button>
          <button type="button" disabled={busy} onClick={()=>void cancelScored(cancelTarget)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?'Cancelling…':'Cancel Quiz'}</button></div>
      </div>
    </div>}
  </section>;
};
