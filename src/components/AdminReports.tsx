import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, Download, Printer, RefreshCcw, Search } from 'lucide-react';
import type { CNEAnalytics, SessionUser } from '../types';
import { ApiService } from '../services/api';
import { getIndiaTodayIsoDate } from '../utils';

type View = 'overview' | 'participation' | 'training' | 'planning';
interface Period { fromDate: string; toDate: string; search: string }
const currentYear = (): Period => {
  const year = getIndiaTodayIsoDate().slice(0, 4);
  return { fromDate: `${year}-01-01`, toDate: `${year}-12-31`, search: '' };
};
const num = (n: number | null | undefined, decimals = 0) => n === null || n === undefined ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
const colors: Record<string, string> = { Scheduled: '#0ea5e9', Completed: '#059669', Canceled: '#f97316' };

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0 break-inside-avoid">
    <header><h2 className="font-bold text-sm sm:text-base text-slate-900">{title}</h2>{note && <p className="text-xs text-slate-500 mt-1">{note}</p>}</header>{children}
  </section>;
}
function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-0">
    <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{label}</p>
    <p className="text-2xl font-extrabold text-slate-900 mt-1">{value}</p>
    {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>;
}
function BarRows({ rows, label, unit = '', maxItems = 10 }: { rows: Array<{name:string;value:number}>;label:string;unit?:string;maxItems?:number }) {
  const data = rows.slice(0, maxItems);
  const max = Math.max(1, ...data.map(r => r.value));
  if (!data.length) return <p className="text-sm text-slate-500">No matching records for this period.</p>;
  return <div className="space-y-3" role="img" aria-label={label}>
    {data.map((item, i) => <div key={`${item.name}-${i}`} className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-xs"><span className="font-medium text-slate-800 break-words min-w-0">{item.name}</span><span className="font-bold text-slate-900 whitespace-nowrap">{num(item.value,1)}{unit}</span></div>
      <div className="rounded-full h-2.5 bg-slate-100 overflow-hidden"><div className="h-full bg-sky-600 rounded-full" style={{width:`${(item.value/max)*100}%`}} /></div>
    </div>)}
  </div>;
}
function Donut({ counts }: { counts:CNEAnalytics['status'] }) {
  const total = counts.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;
  return <div className="flex flex-col sm:flex-row items-center gap-6">
    <svg viewBox="0 0 160 160" className="h-44 w-44 shrink-0" role="img" aria-label={`CNE status distribution: ${counts.map(s=>`${s.name} ${s.value}`).join(', ')}`}>
      <circle cx="80" cy="80" r="58" fill="none" stroke="#e2e8f0" strokeWidth="23" />
      {total > 0 && counts.map(s => {
        const len = s.value / total * 364.424;
        const start = offset; offset += len;
        return <circle key={s.name} cx="80" cy="80" r="58" fill="none" stroke={colors[s.name] || '#64748b'} strokeWidth="23" strokeDasharray={`${len} ${364.424-len}`} strokeDashoffset={-start} transform="rotate(-90 80 80)" />;
      })}
      <text x="80" y="78" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#0f172a">{total}</text>
      <text x="80" y="94" textAnchor="middle" fontSize="10" fill="#64748b">CNEs</text>
    </svg>
    <div className="w-full space-y-2">{counts.map(s => <div key={s.name} className="flex items-center justify-between text-sm gap-3"><span className="flex items-center gap-2"><i className="block h-3 w-3 rounded" style={{background:colors[s.name] || '#64748b'}}/>{s.name}</span><strong>{s.value} <span className="text-slate-500 font-normal">({total ? Math.round(s.value*100/total) : 0}%)</span></strong></div>)}</div>
  </div>;
}
function MonthlyStack({ rows }: { rows:CNEAnalytics['months'] }) {
  if(!rows.length) return <p className="text-sm text-slate-500">No matching CNEs.</p>;
  const max = Math.max(1,...rows.map(m=>m.Scheduled + m.Completed + m.Canceled));
  return <div className="overflow-x-auto pb-2" tabIndex={0} aria-label="Monthly CNE activity chart">
    <div className="flex h-48 gap-3 items-end min-w-[380px]" role="img" aria-label="Monthly stacked bars by CNE status">
      {rows.map(m => <div key={m.month} className="h-full flex-1 min-w-[34px] flex flex-col justify-end items-center gap-1">
        <div className="w-full max-w-[48px] flex flex-col-reverse rounded-t-md overflow-hidden" style={{height:`${Math.max(1,(m.Scheduled+m.Completed+m.Canceled)/max*155)}px`}} title={`${m.month}: ${m.Completed} completed, ${m.Scheduled} scheduled, ${m.Canceled} canceled`}>
          {(['Completed','Scheduled','Canceled'] as const).map(k => <div key={k} style={{height:`${m[k]/Math.max(1,m.Scheduled+m.Completed+m.Canceled)*100}%`,background:colors[k]}} />)}
        </div><span className="text-[10px] text-slate-500">{m.month.slice(5)}</span>
      </div>)}
    </div>
    <div className="text-xs text-slate-500 mt-1">Months shown from the selected reporting period (MM). Hover over bars for counts.</div>
  </div>;
}
function Table({heads,rows}:{heads:string[];rows:React.ReactNode[][]}){
  return <div className="overflow-auto max-h-[460px] border border-slate-200 rounded-xl" tabIndex={0} role="region" aria-label={`${heads[0]} table`}>
    <table className="w-full min-w-[650px] text-xs text-left border-collapse">
      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700"><tr>{heads.map(h=><th key={h} scope="col" className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={i} className="border-b border-slate-100 hover:bg-slate-50">{r.map((v,j)=><td key={j} className="px-3 py-2 align-top break-words">{v}</td>)}</tr>)}</tbody>
    </table>
    {!rows.length && <p className="text-sm p-4 text-slate-500">No records in the selected period.</p>}
  </div>;
}
export const AdminReports:React.FC<{user:SessionUser}> = ({user}) => {
  const [draft,setDraft] = useState<Period>(currentYear);
  const [applied,setApplied] = useState<Period>(currentYear);
  const [reload,setReload] = useState(0);
  const [active,setActive] = useState<View>('overview');
  const [data,setData] = useState<CNEAnalytics|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [employeeBusy,setEmployeeBusy] = useState(false);
  const [employeeError,setEmployeeError] = useState('');
  const requestId = useRef(0);
  const employeeRequestId = useRef(0);
  const sessionKey = `${user?.employeeId||''}:${user?.token||''}:${user?.role||''}`;
  const sessionRef = useRef(sessionKey);sessionRef.current = sessionKey;
  const appliedKey = `${applied.fromDate}|${applied.toDate}|${applied.search}`;
  useEffect(() => {
    const id = ++requestId.current; const originSession = sessionKey;
    ++employeeRequestId.current;
    setData(null);setEmployeeError('');setError('');
    if(!user?.employeeId || user.role!=='ADMIN'){setBusy(false);setError('Administrator access is required.');return;}
    setBusy(true);
    ApiService.getCNEAnalytics({...applied,includeEmployees:false}).then(res=>{
      if(id!==requestId.current || originSession!==sessionRef.current)return;
      if(res.success&&res.data)setData(res.data);
      else setError(res.message||'Unable to generate report.');
    }).catch((e:any)=>{if(id===requestId.current&&originSession===sessionRef.current)setError(e?.message||'Unable to generate report.');})
      .finally(()=>{if(id===requestId.current&&originSession===sessionRef.current)setBusy(false);});
    return ()=>{requestId.current++;employeeRequestId.current++;};
  },[appliedKey,reload,sessionKey]);
  useEffect(()=>{
    if(active!=='training'||!data||data.employeeRows.length||data.employeeTotal===0||employeeBusy)return;
    const id=++employeeRequestId.current;const sessionAtStart=sessionKey;
    setEmployeeBusy(true);setEmployeeError('');
    ApiService.getCNEAnalytics({...applied,includeEmployees:true}).then(res=>{
      if(id!==employeeRequestId.current||sessionAtStart!==sessionRef.current)return;
      if(res.success&&res.data)setData(res.data);
      else setEmployeeError(res.message||'Cannot retrieve employee training register.');
    }).catch((e:any)=>{if(id===employeeRequestId.current&&sessionAtStart===sessionRef.current)setEmployeeError(e?.message||'Cannot retrieve employee register.');})
      .finally(()=>{if(id===employeeRequestId.current&&sessionAtStart===sessionRef.current)setEmployeeBusy(false);});
    return ()=>{employeeRequestId.current++;};
  },[active,appliedKey,sessionKey,data?.employeeTotal]);
  const validateAndApply = () => {
    if(!draft.fromDate||!draft.toDate||draft.fromDate>draft.toDate){setError('Select a valid From and To date.');return;}
    setError('');const next={...draft,search:draft.search.trim()};
    if(JSON.stringify(next)===JSON.stringify(applied))setReload(v=>v+1);else setApplied(next);
  };
  const reset = ()=>{const p=currentYear();setDraft(p);setApplied(p);setReload(v=>v+1);};
  const k=data?.kpis;
  const [rankSearch,setRankSearch] = useState('');
  const filteredEmployees=useMemo(()=>data?.employeeRows.filter(e=>`${e.employeeId} ${e.name} ${e.department}`.toLowerCase().includes(rankSearch.toLowerCase()))||[],[data?.employeeRows,rankSearch]);
  const exportEmployees=()=>{
    if(!filteredEmployees.length)return;
    const esc=(v:any)=>{const s=String(v??'');const safe=/^[=+@\-\t\r]/.test(s)?`'${s}`:s;return `"${safe.replace(/"/g,'""')}"`;};
    const csv=[['Employee ID','Name','Department','Participant Hours','CNEs Attended','Post Tests','Average Score %'],...filteredEmployees.map(e=>[e.employeeId,e.name,e.department,e.participantHours,e.cnesAttended,e.postTestCount,e.averageScore??''])].map(row=>row.map(esc).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`CNE_Training_Register_${applied.fromDate}_${applied.toDate}.csv`;link.click();URL.revokeObjectURL(url);
  };
  return <div className="space-y-5 pb-12">
    <header className="bg-white rounded-2xl border border-slate-200 p-5">
      <h1 className="font-extrabold text-xl text-slate-900">CNE Reports & Statistics</h1>
      <p className="text-xs text-slate-500 mt-1">Nursing Services · Admin-only planning, participation and post-test analytics</p>
      <div className="flex flex-wrap gap-2 items-center mt-4 print:hidden">
        <label className="sr-only" htmlFor="cne-report-from">From Date</label>
        <input id="cne-report-from" aria-label="From Date" type="date" value={draft.fromDate} onChange={e=>setDraft(p=>({...p,fromDate:e.target.value}))} className="border border-slate-300 rounded-lg px-2 py-2 text-sm w-[150px]" />
        <label className="sr-only" htmlFor="cne-report-to">To Date</label>
        <input id="cne-report-to" aria-label="To Date" type="date" value={draft.toDate} onChange={e=>setDraft(p=>({...p,toDate:e.target.value}))} className="border border-slate-300 rounded-lg px-2 py-2 text-sm w-[150px]" />
        <div className="border border-slate-300 rounded-lg flex items-center gap-1 px-2 w-full sm:w-[220px] bg-white"><Search size={15} className="text-slate-500 shrink-0"/><input aria-label="Search CNE topic, ID or area" placeholder="Search CNE, topic, area..." value={draft.search} onChange={e=>setDraft(p=>({...p,search:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')validateAndApply();}} className="w-full min-w-0 outline-none text-sm py-2"/></div>
        <button onClick={validateAndApply} disabled={busy} className="px-3 py-2 text-xs rounded-lg bg-emerald-700 text-white font-bold flex items-center gap-1 disabled:opacity-50"><BarChart3 size={15}/> Generate Report</button>
        <button onClick={reset} disabled={busy} className="px-3 py-2 border rounded-lg text-xs flex items-center gap-1"><RefreshCcw size={15}/> Current Year</button>
        <button onClick={()=>window.print()} disabled={busy||!data} className="ml-auto px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Printer size={15}/> Print</button>
      </div>
      <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1"><CalendarDays size={12}/> Report period: {applied.fromDate} to {applied.toDate}{applied.search?` · Search: ${applied.search}`:''}. Dates use India calendar day.</p>
    </header>
    {error && <div role="alert" className="border border-red-200 bg-red-50 text-red-800 rounded-xl p-4 text-sm">{error} <button className="underline ml-2" onClick={()=>setReload(v=>v+1)}>Retry</button></div>}
    {busy && <div className="bg-white border rounded-xl p-9 text-center" role="status"><span className="inline-block animate-spin h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent mr-2 align-middle"/> Generating CNE analytics for the selected period...</div>}
    {data && !busy && <>
      <nav className="flex gap-2 flex-wrap print:hidden" aria-label="Report sections">
        {([['overview','Overview'],['participation','Participation & Outcomes'],['training','Training Hours'],['planning','Planning Insights']] as const).map(([key,name])=><button key={key} onClick={()=>setActive(key)} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${active===key?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200'}`}>{name}</button>)}
      </nav>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Completed CNEs" value={k?.completed||0}/><Metric label="Scheduled" value={k?.scheduled||0}/><Metric label="Canceled" value={k?.canceled||0}/><Metric label="Verified attendance visits" value={k?.attendanceVisits||0} hint="Unique per CNE; not unique employees"/>
      </div>
      {(active==='overview') && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Delivered session hours" value={`${num(k?.deliveredHours,1)} hrs`}/><Metric label="Participant-hours" value={`${num(k?.participantHours,1)} hrs`} hint="Internal verified attendance × duration"/><Metric label="Post-Test submissions" value={k?.postTestCount||0}/><Metric label="Average score" value={k?.averagePostTestPercent==null?'—':`${num(k.averagePostTestPercent,1)}%`}/></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="CNE Status Distribution" note="Each CNE ID counted once, including Scheduled and Canceled"><Donut counts={data.status}/></Panel><Panel title="Monthly CNE Activity" note="Completed, Scheduled, and Canceled by scheduled start month"><MonthlyStack rows={data.months}/></Panel></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="Department CNE Activity"><BarRows label="Completed CNEs by department" rows={[...data.areas].sort((a,b)=>b.completed-a.completed).map(a=>({name:a.name,value:a.completed}))}/></Panel><Panel title="Teaching Mode Distribution"><BarRows label="Completed CNEs by teaching mode" rows={[...data.modes].sort((a,b)=>b.completed-a.completed).map(m=>({name:m.name,value:m.completed}))}/></Panel></div>
      </>}
      {active==='participation' && <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="Topic-wise Verified Attendance" note="Counts deduplicated per CNE and participant"><BarRows label="Most attended topics" rows={data.topics.map(t=>({name:t.name,value:t.attendance}))} maxItems={15}/></Panel><Panel title="Post-Test Participation by Topic" note="Post-Test responses, deduplicated per CNE and participant"><BarRows label="Post-Test counts by topic" rows={data.postTestTopics.map(t=>({name:t.name,value:t.postTestCount}))} maxItems={15}/></Panel></div>
        <Panel title="Department Coverage and Attendance" note="Area staffing is a reference snapshot, NOT CNE invitations. Repeated session attendances are counted individually.">
          <Table heads={['Department','Completed CNEs','Area Staff Reference','Attendance Visits','Post-Test Submissions','Average Post-Test %']} rows={data.areas.map(a=>[a.name,a.completed,num(a.staffAllotted),a.attendance,a.postTestCount,num(a.avgPostTestPercent,1)])}/>
        </Panel>
        <Panel title="Topic Capacity and Actual Attendance" note="Capacity sums recorded session capacity. It is not the number of invited employees."><Table heads={['Topic','Completed CNEs','Session Capacity','Verified Attendance','Post-Test Submissions','Average Score %']} rows={data.topics.map(t=>[t.name,t.completed,t.capacity,t.attendance,t.postTestCount,num(t.avgPostTestPercent,1)])}/></Panel>
        <Panel title="Post-Test Outcomes by Topic" note="Average of individual percentage scores (not a sum of different quizzes)"><BarRows label="Average post-test percentage by topic" rows={[...data.postTestTopics].filter(t=>t.avgPostTestPercent!==null).sort((a,b)=>(a.avgPostTestPercent||0)-(b.avgPostTestPercent||0)).map(t=>({name:t.name,value:t.avgPostTestPercent||0}))} unit="%" maxItems={15}/></Panel>
      </>}
      {active==='training' && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Distinct trained employees" value={k?.uniqueParticipants||0}/><Metric label="Cumulative participant-hours" value={`${num(k?.participantHours,1)} hrs`}/><Metric label="Teaching hours" value={`${num(k?.resourceHours,1)} hrs`}/><Metric label="Weighted Post-Test Score" value={k?.weightedPostTestPercent==null?'—':`${num(k.weightedPostTestPercent,1)}%`}/></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="Lowest 20 Participant-hours" note="Ascending: recorded internal participants only (not all employees)"><BarRows label="Participants ascending hours" rows={data.participantHours.map(r=>({name:`${r.name} (${r.employeeId})`,value:r.participantHours}))} unit=" hrs" maxItems={20}/></Panel><Panel title="Resource Person Teaching Hours" note="Highest 20 delivery-hour contributions"><BarRows label="Resource persons by teaching hours" rows={data.resourceHours.map(r=>({name:`${r.name} (${r.employeeId})`,value:r.resourceHours}))} unit=" hrs" maxItems={20}/></Panel></div>
        <Panel title="Employee Training Register" note="Records of verified attendees only. Employees without any recorded CNE attendance are not included.">
          <div className="flex flex-wrap items-center gap-2 print:hidden"><input aria-label="Search employee training register" placeholder="Search name, ID, department" className="px-3 py-2 border rounded-lg text-xs flex-1 min-w-[180px]" value={rankSearch} onChange={e=>setRankSearch(e.target.value)}/><button onClick={exportEmployees} disabled={!filteredEmployees.length} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-2 disabled:opacity-40"><Download size={14}/> Export CSV</button></div>
          {employeeBusy && <p role="status" className="text-xs text-slate-600">Loading employee-level training register...</p>}
          {employeeError && <p role="alert" className="text-xs text-red-700">{employeeError} <button onClick={()=>{setActive('overview');setTimeout(()=>setActive('training'),0);}} className="underline">Retry</button></p>}
          <Table heads={['Employee ID','Name','Department','Participant Hours ↑','CNEs Attended','Post-Test Count','Average Score %']} rows={filteredEmployees.map(r=>[r.employeeId,r.name,r.department,num(r.participantHours,1),r.cnesAttended,r.postTestCount,num(r.averageScore,1)])}/>
        </Panel>
      </>}
      {active==='planning' && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric label="Overdue Scheduled CNEs" value={k?.overdueScheduled||0} hint="Start date passed; status still Scheduled"/><Metric label="Departments with completed CNEs" value={k?.activeAreas||0}/><Metric label="Unique participants" value={k?.uniqueParticipants||0}/><Metric label="Canceled CNEs" value={k?.canceled||0}/></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel title="Departments with Fewest Completed CNEs" note="Only departments represented in the selected schedule records"><BarRows label="Completed CNEs ascending by department" rows={[...data.areas].sort((a,b)=>a.completed-b.completed).map(a=>({name:a.name,value:a.completed}))} maxItems={15}/></Panel><Panel title="Topics with Lowest Verified Attendance" note="Low attendance needs review; not automatically an indicator of poor teaching"><BarRows label="Topics ascending by attendance" rows={[...data.topics].filter(t=>t.completed>0).sort((a,b)=>a.attendance-b.attendance).map(t=>({name:t.name,value:t.attendance}))} maxItems={15}/></Panel></div>
        <Panel title="Suggested Planning Review" note="These are descriptive indicators, not automatic conclusions"><ul className="space-y-2 text-sm text-slate-700 list-disc pl-5"><li>Review overdue Scheduled CNEs and update or finalize their status as appropriate.</li><li>Compare low-attendance topics with session timing, capacity and nursing duty coverage.</li><li>Consider additional opportunities in departments with few completed programmes.</li><li>Review low Post-Test scores along with participation and question difficulty before planning refresher sessions.</li><li>Training-hour rankings cover only recorded attendees; use the complete staff directory separately to identify staff with zero CNE attendance.</li></ul></Panel>
      </>}
      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">Data definitions: schedule status includes all filtered CNEs; attendance, scores and training hours include only Completed CNEs with verified response-sheet entries. A session's duration is counted once as delivered hours, per-person for participant-hours, and per assigned Resource Person for teaching hours. Search applies to CNE ID, topic, area, teaching mode and Resource Person IDs.</p>
    </>}
  </div>;
};
