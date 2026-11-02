import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Image as ImageIcon, Loader2, RefreshCw, Trophy, XCircle } from 'lucide-react';
import { ApiService } from '../services/api';
import type { QuizAttempt, QuizHomeData, QuizQuestion, QuizResult, SessionUser } from '../types';

type Page = 'home' | 'scored-setup' | 'practice-setup' | 'scored' | 'practice' | 'result';
const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A','B','C','D'];

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
  const scoredQuestionCache = useRef<Record<string,QuizQuestion>>({});
  const practiceUnitCounts = useRef<Record<string,number>>({});
  const imageCache = useRef<Map<string,Promise<string>>>(new Map());
  const mounted = useRef(true);
  const practiceEpoch = useRef(0);
  const practicePrefetchSerial = useRef(0);

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

  const setNextScoredPreview = useCallback((a:QuizAttempt, nextIndex:number) => {
    if(nextIndex>=a.questionCount)return;
    const key=`${a.attemptId}:${nextIndex}`;
    if(scoredQuestionCache.current[key])return;
    void ApiService.getQuizScoredQuestion(a.attemptId,nextIndex).then(res=>{
      if(res.success && res.data && mounted.current){
        scoredQuestionCache.current[key]=res.data.question;
        if(res.data.question.questionType==='IMAGE')void getImage(res.data.question,a.attemptId).catch(()=>{});
      }
    });
  },[getImage]);

  const loadScored = useCallback(async(a:QuizAttempt,position:number) => {
    setBusy(true);setError('');
    try {
      const key=`${a.attemptId}:${position}`;
      const q=scoredQuestionCache.current[key] || (await ApiService.getQuizScoredQuestion(a.attemptId,position)).data?.question;
      if(!q)throw new Error('Could not load scored question.');
      scoredQuestionCache.current[key]=q;
      setAttempt(a);setQuestion(q);setIndex(position);setSelected(a.answers[q.questionId]||'');setPage('scored');
      setNextScoredPreview(a,position+1);
    }catch(e){setError(String((e as Error).message||e));}
    finally{setBusy(false);}
  },[setNextScoredPreview]);

  const beginScored = async() => {
    setBusy(true);setError('');
    try {
      const res=await ApiService.startQuizScored(selectedUnits,count);
      if(!res.success||!res.data)throw new Error(res.message || 'Could not start quiz.');
      scoredQuestionCache.current={};
      await loadScored(res.data,0);
    }catch(e){setError(String((e as Error).message||e));}
    finally{setBusy(false);}
  };
  const resume = async(a:QuizAttempt) => {
    const firstUnanswered=a.questionIds.findIndex(id=>!a.answers[id]);
    scoredQuestionCache.current={};
    await loadScored(a,firstUnanswered>=0?firstUnanswered:Math.max(0,a.questionCount-1));
  };
  const cancelScored = async(id:string) => {
    if(busy || !window.confirm('Cancel this scored quiz? It will not count toward your marks or leaderboard. This cannot be undone.'))return;
    setBusy(true);setError('');
    try{
      const res=await ApiService.cancelQuizScored(id);
      if(!res.success)throw new Error(res.message||'Could not cancel the quiz.');
      setAttempt(null);setQuestion(null);scoredQuestionCache.current={};
      setPage('home');setNotice('Scored quiz cancelled. It will not appear in the leaderboard.');
      await refreshHome();
    }catch(e){setError((e as Error).message||'Cancellation failed.');}
    finally{setBusy(false);}
  };
  const previousScored = async() => {
    if(!attempt||!question||index<=0||busy)return;
    setBusy(true);setError('');
    try{
      let updated=attempt;
      if(selected && attempt.answers[question.questionId]!==selected){
        const saved=await ApiService.saveQuizScoredAnswer(attempt.attemptId,question.questionId,selected);
        if(!saved.success)throw new Error(saved.message||'Could not save the answer.');
        updated={...attempt,answers:{...attempt.answers,[question.questionId]:selected}};
        setAttempt(updated);
      }
      await loadScored(updated,index-1);
    }catch(e){setError((e as Error).message||'Previous question unavailable.');}
    finally{setBusy(false);}
  };
  const advanceScored = async() => {
    if(!attempt||!question||!selected||busy)return;
    setBusy(true);setError('');
    try{
      const save=await ApiService.saveQuizScoredAnswer(attempt.attemptId,question.questionId,selected);
      if(!save.success)throw new Error(save.message||'Answer could not be saved.');
      const updated={...attempt,answers:{...attempt.answers,[question.questionId]:selected}};
      setAttempt(updated);
      if(index+1<attempt.questionCount){await loadScored(updated,index+1);}
      else {
        const missing=updated.questionIds.findIndex(id=>!updated.answers[id]);
        if(missing>=0){
          setNotice('Your last answer was saved. Please answer the remaining questions before completing.');
          await loadScored(updated,missing);
          return;
        }
        if(!window.confirm('Submit all '+attempt.questionCount+' answers and finish your Scored Quiz? You cannot change answers after completion.')){
          setNotice('All answers are saved. Finish the quiz when you are ready.');
          return;
        }
        const completed=await ApiService.completeQuizScored(attempt.attemptId);
        if(!completed.success||!completed.data)throw new Error(completed.message||'Quiz could not be completed.');
        setResults(completed.data);setPage('result');setQuestion(null);setNotice('');
        void refreshHome().catch(()=>{});
      }
    }catch(e){setError(String((e as Error).message||e));}
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
      <div><h1 className="text-2xl font-extrabold text-slate-900">Quiz</h1><p className="text-sm text-slate-500">CNE Cell • Clinical learning and self-assessment</p></div>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" className="rounded-2xl border border-teal-200 bg-white p-5 text-left shadow-sm hover:border-teal-500" onClick={()=>{setSelectedUnits([]);setCount(10);setPage('scored-setup');}}>
          <ClipboardCheck className="mb-3 text-teal-700"/><h2 className="text-lg font-bold">Scored Quiz</h2><p className="mt-1 text-sm text-slate-600">1–50 questions. Marks, review and explanations after completion.</p>
        </button>
        <button type="button" className="rounded-2xl border border-indigo-200 bg-white p-5 text-left shadow-sm hover:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={!!home.activeAttempt} onClick={()=>{setSelectedUnits([]);setPage('practice-setup');}}>
          <BookOpenCheck className="mb-3 text-indigo-700"/><h2 className="text-lg font-bold">Practice Quiz</h2><p className="mt-1 text-sm text-slate-600">One question at a time. Instant feedback. No scores saved.</p>
        </button>
      </div>
      {home.activeAttempt&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-bold text-amber-900">Unfinished scored quiz</h3><p className="text-sm text-amber-800">{home.activeAttempt.answeredCount} of {home.activeAttempt.questionCount} questions saved. Resume where you left off.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={()=>void resume(home.activeAttempt!)}>Resume Scored Quiz</button><button type="button" disabled={busy} className="rounded-lg border border-amber-600 px-4 py-2 font-semibold text-amber-900 disabled:opacity-40" onClick={()=>void cancelScored(home.activeAttempt!.attemptId)}>Cancel Quiz</button></div></div>}
      <div className="rounded-2xl border bg-white p-5"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Trophy className="w-5 text-amber-500"/>Top 5 Leaderboard</h2><span className="text-xs text-slate-500">Last 30 days • completed scored quizzes only</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="pb-2">Rank</th><th>Employee</th><th className="text-right">Unique answered</th><th className="text-right">Accuracy</th></tr></thead><tbody>{home.leaderboard.length?home.leaderboard.map(p=><tr className="border-b last:border-0" key={`${p.rank}-${p.name}`}><td className="py-3 font-bold">#{p.rank}</td><td>{p.name}</td><td className="text-right">{p.answered}</td><td className="text-right">{p.accuracy.toFixed(1)}%</td></tr>):<tr><td colSpan={4} className="py-5 text-center text-slate-500">No completed scored quizzes in the last 30 days.</td></tr>}</tbody></table></div>
        <p className="mt-3 text-xs text-slate-500">Ranked by unique answered questions, then accuracy. Practice and email questions never count.</p>
      </div>
      <p className="text-xs text-slate-500">{home.total} clinically approved MCQs available across {home.units.length} units ({home.imageCount} image questions). Draft questions are excluded.</p>
    </>}
    {(page==='scored-setup'||page==='practice-setup')&&home&&<div className="rounded-2xl border bg-white p-5 space-y-5">
      <div><h2 className="text-lg font-bold">{page==='scored-setup'?'Scored Quiz':'Practice Quiz'} setup</h2><p className="text-sm text-slate-500">All Units is selected by default.</p></div>
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold text-sm">Select units</legend>
        <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 font-semibold text-sm"><input type="checkbox" checked={!selectedUnits.length} onChange={()=>setSelectedUnits([])} /> All Units</label>
        <div className="grid gap-1 sm:grid-cols-2">{home.units.map(u=><label key={u.name} className="flex items-center gap-2 rounded p-2 text-sm"><input type="checkbox" checked={selectedUnits.includes(u.name)} onChange={e=>setSelectedUnits(prev=>e.target.checked?(prev.length===allUnitNames.length-1?[]:[...prev,u.name]):prev.length===0?allUnitNames.filter(x=>x!==u.name):prev.filter(x=>x!==u.name))}/><span className="flex-1">{u.name}</span><span className="text-xs text-slate-400">{u.available}</span></label>)}</div>
      </fieldset>
      {page==='scored-setup'&&<label className="block text-sm font-semibold">Number of questions (1–50)
        <input className="ml-3 w-20 rounded-lg border px-2 py-1" type="number" min={1} max={50} value={count} onChange={e=>setCount(Math.max(1,Math.min(50,Number(e.target.value)||1)))}/><input className="mt-3 block w-full accent-teal-700" type="range" min={1} max={50} value={count} onChange={e=>setCount(Number(e.target.value))}/>
      </label>}
      <p className="text-xs text-slate-500">{available} approved questions available for the selected units. {page==='practice-setup'?'No Practice answers or results are stored.':'Scored answers are saved and unfinished attempts may be resumed.'}</p>
      <p className="text-xs text-teal-800">Questions rotate evenly across the selected units, with random questions inside each unit. Where a unit has too few approved MCQs, other units share the remainder. Image questions are spaced when available.</p>
      <button type="button" disabled={busy||!available||!!home.activeAttempt||(page==='scored-setup'&&available<count)} onClick={()=>void(page==='scored-setup'?beginScored():beginPractice())} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy?'Opening…':page==='scored-setup'?'Start Scored Quiz':'Start Practice'}</button>
      {home.activeAttempt&&<p className="text-sm text-amber-700">Resume or cancel your unfinished scored quiz on the Quiz home page before starting a new session.</p>}
    </div>}
    {(page==='scored'||page==='practice')&&question&&<div className="rounded-2xl border bg-white p-5 sm:p-7 space-y-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-bold text-slate-800">{page==='scored'?`Question ${index+1} of ${attempt?.questionCount}`:`Question ${practiceCorrect+practiceWrong+1}`}</span><span className="text-slate-500">{question.unit} · {question.questionType}</span></div>
      {page==='scored'&&attempt&&<div className="space-y-2"><div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{width:`${Math.round(Object.keys(attempt.answers).length/attempt.questionCount*100)}%`}}/></div><div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{Object.keys(attempt.answers).length} of {attempt.questionCount} answers saved</span><span>{attempt.answers[question.questionId]===selected&&selected?'✓ Answer saved':selected?'Not yet saved':'Choose an answer'}</span></div></div>}
      {page==='practice'&&<div className="flex gap-3 text-xs font-semibold"><span>Answered: {practiceCorrect+practiceWrong}</span><span className="text-emerald-700">Correct: {practiceCorrect}</span><span className="text-rose-700">Wrong: {practiceWrong}</span></div>}
      <h3 className="whitespace-pre-wrap text-base font-bold text-slate-900">{question.question}</h3>
      <QuizImage question={question} attemptId={page==='scored'?attempt?.attemptId:undefined} getImage={getImage}/>
      <fieldset className="space-y-2"><legend className="sr-only">Select the correct answer</legend>{letters.map(letter=>{const checked=selected===letter;const reveal=page==='practice'&&practiceSubmitted;const isCorrect=question.correctOption===letter;return <label key={letter} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${reveal&&isCorrect?'border-emerald-500 bg-emerald-50':reveal&&checked&&!isCorrect?'border-rose-500 bg-rose-50':checked?'border-teal-600 bg-teal-50':'border-slate-200'}`}>
        <input type="radio" name={`quiz-${question.questionId}`} value={letter} checked={checked} disabled={reveal||busy} onChange={()=>setSelected(letter)} className="mt-1"/><span><strong>{letter}.</strong> {question.options[letter]}</span></label>;})}</fieldset>
      {page==='practice'&&practiceSubmitted&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h4 className="mb-1 font-bold text-slate-900">{selected===question.correctOption?'Correct!':'Review the correct answer'} — {question.correctOption}</h4><p className="text-sm text-slate-700">{question.explanation}</p></div>}
      {page==='scored'?<div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy||index===0} onClick={()=>void previousScored()} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="w-4"/>Previous</button><button type="button" disabled={!selected||busy} onClick={()=>void advanceScored()} className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?'Saving…':index+1===attempt?.questionCount?'Save & Finish':'Save & Next'}<ChevronRight className="w-4"/></button><button type="button" disabled={busy} onClick={()=>attempt&&void cancelScored(attempt.attemptId)} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40">Cancel Quiz</button></div>:
        <div className="flex flex-wrap gap-2">{!practiceSubmitted?<button type="button" disabled={!selected} onClick={submitPractice} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Submit Answer</button>:<button type="button" disabled={busy||(!practiceNext&&!!practiceNextMessage)} onClick={()=>void advancePractice()} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?'Loading…':'Next Question'} <ChevronRight className="inline w-4"/></button>}{practiceSubmitted&&<span className="self-center text-xs text-slate-500">{practiceNext?'Next question ready':practiceNextMessage||'Preparing next question…'}</span>}</div>}
      <p className="text-xs text-slate-500">{page==='scored'?'Answers and explanations appear after completing the quiz. Your saved answers are recoverable.':'Practice answers and scores exist only in this page session.'}</p>
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
  </section>;
};
