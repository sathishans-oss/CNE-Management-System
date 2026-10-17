import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  FileDown,
  Clock,
  X,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { CNERecord, SessionUser } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import {
  formatCneDateTimeDisplay,
  formatResourcePersonsDisplay,
  isUserAssignedResourcePerson,
  parseDurationToSeconds,
  getCneTypeLabel
} from '../utils';
import { SearchInput } from './SearchInput';
import { ConfirmDatePicker } from './cne/ConfirmDatePicker';

export interface MyCNERecordsProps {
  user: SessionUser;
}

const getDurationSeconds = (duration: unknown): number | null => {
  const raw = String(duration ?? '').trim();
  if (!raw) return null;
  return parseDurationToSeconds(raw);
};

const formatDurationForDisplay = (duration: unknown): string => {
  const seconds = getDurationSeconds(duration);
  if (seconds === null) return '—';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  return parts.length > 0 ? parts.join(' ') : '0m';
};

const formatPostTestScore = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  return `${Math.round(Number(value))}%`;
};

const normalizeEmployeeId = (value: unknown): string => String(value ?? '').trim().toUpperCase();

const splitEmployeeIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(normalizeEmployeeId).filter(Boolean);
  }
  return String(value ?? '')
    .split(/[,;\n]+/)
    .map(normalizeEmployeeId)
    .filter(Boolean);
};

const isUserParticipantInRecord = (user: SessionUser, record: CNERecord): boolean => {
  const employeeId = normalizeEmployeeId(user?.employeeId);
  if (!employeeId) return false;

  const participantIds = [
    ...splitEmployeeIds(record?.staffEmpId),
    ...splitEmployeeIds(record?.staffEmpIds)
  ];

  return participantIds.includes(employeeId);
};

const isUserResourcePersonInRecord = (user: SessionUser, record: CNERecord): boolean => {
  const combinedIds = [
    ...splitEmployeeIds(record?.resourcePersonEmpId),
    ...splitEmployeeIds(record?.resourcePersonEmpIds)
  ].join(',');

  return isUserAssignedResourcePerson(user, combinedIds);
};

export const MyCNERecords: React.FC<MyCNERecordsProps> = ({ user }) => {
  // Only a single authorized page is held in browser memory. Hours/total counts
  // arrive separately from the backend and cover ALL matching completed sessions.
  const PAGE_SIZE = 25;
  const [records, setRecords] = useState<CNERecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalParticipantSeconds, setTotalParticipantSeconds] = useState(0);
  const [totalResourceSeconds, setTotalResourceSeconds] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const generatingPdfRef = useRef(false);
  const recordsRequestIdRef = useRef(0);
  const sessionGuardRef = useRef('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({search:'',fromDate:'',toDate:''});
  const [selectedRecord, setSelectedRecord] = useState<CNERecord | null>(null);
  const {success,error} = useToast();
  const identity = `${user.employeeId}:${user.token}`;
  sessionGuardRef.current = identity;
  const previousIdentityRef = useRef(identity);
  useEffect(() => {
    if(previousIdentityRef.current === identity)return;
    previousIdentityRef.current=identity;
    setCurrentPage(1);
    setSearchTerm('');setStartDate('');setEndDate('');
    setAppliedFilters({search:'',fromDate:'',toDate:''});
  },[identity]);

  useEffect(() => {
    const requestId = ++recordsRequestIdRef.current;
    setLoading(true);
    setRecords([]);
    setSelectedRecord(null);
    const load = async () => {
      try {
        const res = await ApiService.getMyCNERecordsPage({
          page:currentPage,pageSize:PAGE_SIZE,
          search:appliedFilters.search,fromDate:appliedFilters.fromDate,toDate:appliedFilters.toDate
        });
        if(requestId!==recordsRequestIdRef.current)return;
        if(res.success && res.data && Array.isArray(res.data.records)){
          const safe=res.data.records.filter(r=>String(r.status||'').toLowerCase()==='completed');
          // If deletions shortened history between requests, return to page one.
          if(currentPage>1 && (currentPage-1)*PAGE_SIZE>=res.data.total){setCurrentPage(1);return;}
          setRecords(safe);
          setTotalRecords(res.data.total);
          setTotalParticipantSeconds(res.data.participantSeconds);
          setTotalResourceSeconds(res.data.resourcePersonSeconds);
        } else {
          setTotalRecords(0);setTotalParticipantSeconds(0);setTotalResourceSeconds(0);
          error(res.message||'Unable to load your CNE records.');
        }
      }catch(e:any){
        if(requestId!==recordsRequestIdRef.current)return;
        setRecords([]);setTotalRecords(0);setTotalParticipantSeconds(0);setTotalResourceSeconds(0);
        error(e?.message||'Error loading your CNE records.');
      }finally{if(requestId===recordsRequestIdRef.current)setLoading(false);}
    };
    void load();
    return ()=>{if(recordsRequestIdRef.current===requestId)recordsRequestIdRef.current++;};
  },[identity,currentPage,appliedFilters.search,appliedFilters.fromDate,appliedFilters.toDate,error]);

  const applyFilters = () => {
    if(startDate && endDate && startDate>endDate){error('From Date must not be after To Date.');return;}
    const next={search:searchTerm.trim(),fromDate:startDate,toDate:endDate};
    setCurrentPage(1);setAppliedFilters(next);
  };
  const clearFilters = () => {
    setSearchTerm('');setStartDate('');setEndDate('');setCurrentPage(1);
    setAppliedFilters({search:'',fromDate:'',toDate:''});
  };
  const filteredRecords=records; // Already filtered and authorized on the server.
  const totalPages=Math.max(1,Math.ceil(totalRecords/PAGE_SIZE));
  const safeCurrentPage=Math.min(Math.max(1,currentPage),totalPages);
  const paginatedRecords=filteredRecords;
  const formatTotalSeconds=(totalSeconds:number):string=>{
    const seconds=Math.max(0,Math.floor(Number(totalSeconds)||0));
    const hrs=Math.floor(seconds/3600),mins=Math.floor((seconds%3600)/60),secs=seconds%60;
    return `${hrs}h${mins?` ${mins}m`:''}${secs?` ${secs}s`:''}`;
  };
  const trainingDurationStats={participant:formatTotalSeconds(totalParticipantSeconds),resourcePerson:formatTotalSeconds(totalResourceSeconds)};

  // Responsive display mode: render only desktop table OR mobile cards, never both
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleGeneratePdf = async () => {
    if(generatingPdfRef.current || isGeneratingPdf || loading)return;
    if(totalRecords===0){error('No CNE records found for the selected filters.');return;}
    generatingPdfRef.current=true;setIsGeneratingPdf(true);
    const sessionAtStart=identity;
    try{
      // Export is deliberately independent from the 25-row UI page. Every batch
      // is authorized by the server and uses the same applied search/date filters.
      const complete:CNERecord[]=[];
      const seen=new Set<string>();
      const exportPageSize=100;
      const pages=Math.ceil(totalRecords/exportPageSize);
      for(let p=1;p<=pages;p++){
        if(sessionGuardRef.current!==sessionAtStart)throw new Error('Session changed during export. Try again.');
        const response=await ApiService.getMyCNERecordsPage({page:p,pageSize:exportPageSize,
          search:appliedFilters.search,fromDate:appliedFilters.fromDate,toDate:appliedFilters.toDate});
        if(!response.success||!response.data)throw new Error(response.message||'Failed to retrieve complete PDF records.');
        if(response.data.total!==totalRecords)throw new Error('CNE records changed during export. Reload and retry.');
        for(const r of response.data.records){
          if(String(r.status||'').toLowerCase()!=='completed')continue;
          const id=String(r.cneId||r.dataId||'').toUpperCase();
          if(!id || seen.has(id))throw new Error('Duplicate or incomplete data received. Please retry.');
          seen.add(id);complete.push(r);
        }
      }
      if(complete.length!==totalRecords)throw new Error('Incomplete export. Reload and try again.');
      if(sessionGuardRef.current!==sessionAtStart)throw new Error('Session changed during export.');
      const {generateCNERecordsPdf}=await import('../services/pdfGenerator');
      generateCNERecordsPdf(user,complete,{
        fromDate:appliedFilters.fromDate||undefined,
        toDate:appliedFilters.toDate||undefined,
        searchTerm:appliedFilters.search||undefined
      });
      success('Complete filtered CNE record PDF downloaded.','PDF Generated');
    }catch(e:any){error(e?.message||'Failed to generate complete PDF document.');}
    finally{generatingPdfRef.current=false;setIsGeneratingPdf(false);}
  };

  const selectedRecordIsParticipant = selectedRecord
    ? isUserParticipantInRecord(user, selectedRecord)
    : false;
  const selectedRecordIsResourcePerson = selectedRecord
    ? isUserResourcePersonInRecord(user, selectedRecord)
    : false;

  return (
    <div className="space-y-6 pb-12">
      {/* Compact Filter / Action Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-[280px] lg:w-[360px]">
            <SearchInput
              id="input-my-cne-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search topic, area, mode..."
            />
          </div>

          <div className="w-full sm:w-[160px]">
            <ConfirmDatePicker
              id="my-cne-from-date"
              value={startDate}
              onChange={setStartDate}
              placeholder="From Date"
              inlineLabel="From:"
              compact
            />
          </div>

          <div className="w-full sm:w-[160px]">
            <ConfirmDatePicker
              id="my-cne-to-date"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate}
              placeholder="To Date"
              inlineLabel="To:"
              compact
            />
          </div>

          <button type="button" onClick={applyFilters}
            className="inline-flex h-9 items-center justify-center gap-1.5 px-3 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 cursor-pointer">
            <Search className="w-3.5 h-3.5" /> Show Results
          </button>

          <div className="whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-slate-600">
            Participant Hours: <strong className="text-emerald-700">{trainingDurationStats.participant}</strong>
          </div>

          <div className="whitespace-nowrap rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-slate-600">
            Resource Person Hours: <strong className="text-purple-700">{trainingDurationStats.resourcePerson}</strong>
          </div>

          {(searchTerm || startDate || endDate) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Clear filters"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          <button
            id="btn-generate-cne-records-pdf"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf || loading}
            className="ml-auto inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Generate PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CNE Records Data Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden xl:overflow-visible">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <span className="text-xs font-medium">Loading data</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No completed CNE sessions found for the selected period.
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Only completed CNEs linked to your Employee ID are shown here. Check your filters or contact the CNE In-charge if a completed session is missing.
            </p>
          </div>
        ) : (
          <>
            {isMobile ? (
              /* Mobile Card List (Rendered only on mobile viewports) */
              <div className="divide-y divide-slate-100">
                {paginatedRecords.map((rec, index) => {
                  const isParticipant = isUserParticipantInRecord(user, rec);
                  const isResourcePerson = isUserResourcePersonInRecord(user, rec);
                  const globalIdx = (safeCurrentPage - 1) * PAGE_SIZE + index;
                  return (
                    <div
                      key={rec.cneId || rec.dataId || `mob-rec-${globalIdx}`}
                      onClick={() => setSelectedRecord(rec)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRecord(rec);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${rec.topic}`}
                      className="p-4 space-y-2 hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-none focus:bg-slate-50 active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-500">
                          #{globalIdx + 1} • {formatCneDateTimeDisplay(rec.fromDate, rec.toDate)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isParticipant
                              ? 'bg-emerald-100 text-emerald-800'
                              : isResourcePerson
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isParticipant ? 'Participant' : isResourcePerson ? 'Resource Person' : 'Linked Record'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {rec.topic}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-0.5">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatDurationForDisplay(rec.duration)}
                        </span>
                        {rec.myPostTestScore !== null &&
                        rec.myPostTestScore !== undefined &&
                        !Number.isNaN(Number(rec.myPostTestScore)) && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              Number(rec.myPostTestScore) >= 60
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            Score: {formatPostTestScore(rec.myPostTestScore)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop Table (Rendered only on desktop viewports) */
              <div className="max-h-[70dvh] overflow-auto overscroll-contain xl:max-h-none xl:overflow-visible" role="region" aria-label="My completed CNE records" tabIndex={0}>
                <table className="w-full min-w-[790px] text-left text-xs border-collapse">
                  <caption className="sr-only">My completed CNE records</caption>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 py-3.5 px-3 w-12 text-center">Sr.</th>
                      <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 py-3.5 px-4 whitespace-nowrap text-left">Date &amp; Time</th>
                      <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 py-3.5 px-4 text-left w-2/5 min-w-[280px]">Topic / Skills</th>
                      <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 py-3.5 px-4 text-left whitespace-nowrap">Role</th>
                      <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 py-3.5 px-4 text-center whitespace-nowrap">Duration</th>
                      <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 py-3.5 px-4 text-center whitespace-nowrap">Post-Test Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((rec, index) => {
                      const isParticipant = isUserParticipantInRecord(user, rec);
                      const isResourcePerson = isUserResourcePersonInRecord(user, rec);
                      const globalIdx = (safeCurrentPage - 1) * PAGE_SIZE + index;
                      return (
                        <tr
                          key={rec.cneId || rec.dataId || `rec-${globalIdx}`}
                          onClick={() => setSelectedRecord(rec)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedRecord(rec);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${rec.topic}`}
                          className="hover:bg-slate-50/90 cursor-pointer transition-colors focus:outline-none focus:bg-slate-100/80"
                        >
                          <td className="py-3 px-3 text-center font-medium text-slate-500">
                            {globalIdx + 1}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 text-left">
                            {formatCneDateTimeDisplay(rec.fromDate, rec.toDate)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 text-left whitespace-normal break-words [overflow-wrap:anywhere]">
                            <div title={rec.topic}>
                              {rec.topic}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-left">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isParticipant
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isResourcePerson
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isParticipant ? 'Participant (You)' : isResourcePerson ? 'Resource Person' : 'Linked Record'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-700 text-center">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDurationForDisplay(rec.duration)}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {rec.myPostTestScore !== null &&
                            rec.myPostTestScore !== undefined &&
                            !Number.isNaN(Number(rec.myPostTestScore)) && (
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  Number(rec.myPostTestScore) >= 60
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {formatPostTestScore(rec.myPostTestScore)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalRecords > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="font-medium">
                  Showing <span className="font-bold text-slate-900">{(safeCurrentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                  <span className="font-bold text-slate-900">{Math.min(safeCurrentPage * PAGE_SIZE, totalRecords)}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalRecords}</span> records
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 mr-2">
                    Page <strong className="text-slate-900">{safeCurrentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">CNE Record</h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono">ID: {selectedRecord.cneId || selectedRecord.dataId}</span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                    {getCneTypeLabel(selectedRecord.cneType)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block text-slate-500 font-semibold uppercase text-[10px]">Topic / Subject</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedRecord.topic}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 font-semibold uppercase text-[10px]">Ward / Area</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{selectedRecord.area}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 font-semibold uppercase text-[10px]">Date & Time / Duration</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {formatCneDateTimeDisplay(selectedRecord.fromDate, selectedRecord.toDate)} ({formatDurationForDisplay(selectedRecord.duration)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 font-semibold uppercase text-[10px]">Mode of Teaching</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{selectedRecord.modeOfTeaching}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 font-semibold uppercase text-[10px]">Resource Person(s)</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {formatResourcePersonsDisplay({
                      resourcePersonEmpId: selectedRecord.resourcePersonEmpId,
                      resourcePersonName: selectedRecord.resourcePersonName,
                      externalResourcePersons: selectedRecord.externalResourcePersons
                    })}
                  </span>
                </div>
              </div>

              {selectedRecord.myPostTestScore !== null &&
              selectedRecord.myPostTestScore !== undefined &&
              !Number.isNaN(Number(selectedRecord.myPostTestScore)) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="block text-slate-500 font-semibold uppercase text-[10px]">Post-Test Score</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      Number(selectedRecord.myPostTestScore) >= 60
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {formatPostTestScore(selectedRecord.myPostTestScore)}
                  </span>
                </div>
              )}

              {selectedRecord.remarks && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 font-semibold uppercase text-[10px]">Remarks / Notes</span>
                  <p className="text-slate-700 mt-0.5">{selectedRecord.remarks}</p>
                </div>
              )}

              {/* Personal record relationship notice */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  {selectedRecordIsParticipant ? (
                    <>
                      <span className="font-semibold">Participation Verified</span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Your attendance is verified in the Nursing Services CNE database and this session is included in your participant training hours.
                      </p>
                    </>
                  ) : selectedRecordIsResourcePerson ? (
                    <>
                      <span className="font-semibold">Resource Person Assignment Verified</span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        You are recorded as an assigned Resource Person for this completed CNE. RP-only session duration is not added to your participant training hours.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">CNE Record Verified</span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        This completed CNE is linked to your personal CNE record.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
