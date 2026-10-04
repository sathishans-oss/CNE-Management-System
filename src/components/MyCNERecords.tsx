import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  FileDown,
  Clock,
  X,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CNERecord, SessionUser } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import {
  formatCneDateTimeDisplay,
  formatResourcePersonsDisplay,
  isUserAssignedResourcePerson,
  parseDurationToSeconds,
  parseToIsoDateString
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
  const [records, setRecords] = useState<CNERecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const generatingPdfRef = useRef(false);
  const recordsRequestIdRef = useRef(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CNERecord | null>(null);

  const { success, error } = useToast();

  useEffect(() => {
    // Every account/session change starts a fresh request and invalidates any older response.
    // This prevents records from a previous user or a slower request from overwriting newer state.
    const requestId = ++recordsRequestIdRef.current;
    setLoading(true);
    setRecords([]);
    setSelectedRecord(null);

    const loadMyRecords = async () => {
      try {
        const res = await ApiService.getCNERecords({
          myRecordsOnly: true,
          scope: 'my-cne-records',
          status: 'Completed'
        });

        if (requestId !== recordsRequestIdRef.current) return;

        if (res.success && Array.isArray(res.data)) {
          // Defensive client-side enforcement: My CNE Records is a completed-history view only.
          // Scheduled, Draft, Pending and Cancelled/Canceled CNEs must never be shown here.
          const completedRecords = res.data.filter(
            (record) => String(record?.status ?? '').trim().toLowerCase() === 'completed'
          );
          setRecords(completedRecords);
        } else {
          setRecords([]);
          error(res.message || 'Failed to load CNE records.');
        }
      } catch (e: any) {
        if (requestId !== recordsRequestIdRef.current) return;
        setRecords([]);
        error(e?.message || 'Error loading records.');
      } finally {
        if (requestId === recordsRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    void loadMyRecords();

    return () => {
      // Invalidate this request on unmount or before the next user/session effect runs.
      if (recordsRequestIdRef.current === requestId) {
        recordsRequestIdRef.current += 1;
      }
    };
  }, [user.employeeId, user.token, error]);

  // Filter logic: Search + Date Range (From Date / To Date)
  const filteredRecords = useMemo(() => {
    return records
      .filter((rec) => {
        // My CNE Records must remain completed-only even if a stale/cache response contains another status.
        if (String(rec.status || '').trim().toLowerCase() !== 'completed') return false;

        // Date Range filter using canonical date parsing so date-time values compare correctly.
        const recDate = parseToIsoDateString(rec.fromDate);
        if (startDate && (!recDate || recDate < startDate)) return false;
        if (endDate && (!recDate || recDate > endDate)) return false;

        // Global Search: normalize once, then use null-safe string conversion for incomplete API data.
        const q = searchTerm.trim().toLowerCase();
        if (q) {
          const searchable = (value: unknown) => String(value ?? '').toLowerCase();
          const matchTopic = searchable(rec?.topic).includes(q);
          const matchArea = searchable(rec?.area).includes(q);
          const matchMode = searchable(rec?.modeOfTeaching).includes(q);
          const matchRpName = searchable(rec?.resourcePersonName).includes(q);
          const matchRpId = searchable(rec?.resourcePersonEmpId).includes(q);
          const matchExtRp = Array.isArray(rec?.externalResourcePersons)
            ? rec.externalResourcePersons.some((p) => searchable(p).includes(q))
            : false;
          if (!matchTopic && !matchArea && !matchMode && !matchRpName && !matchRpId && !matchExtRp) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aFromDate = parseToIsoDateString(a.fromDate) || '';
        const bFromDate = parseToIsoDateString(b.fromDate) || '';
        return bFromDate.localeCompare(aFromDate);
      });
  }, [records, startDate, endDate, searchTerm]);

  // Compute earned training duration and resource person hours independently.
  // If the same employee was both Participant and Resource Person for the same CNE, count that CNE duration in both totals.
  // Missing/invalid duration contributes zero; decimal-hour values such as 1.5 are parsed as 1 hour 30 minutes.
  const formatTotalSeconds = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts = [`${hrs}h`];
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0) parts.push(`${secs}s`);
    return parts.join(' ');
  };

  const trainingDurationStats = useMemo(() => {
    let participantSeconds = 0;
    let resourcePersonSeconds = 0;

    filteredRecords.forEach((rec) => {
      const seconds = getDurationSeconds(rec?.duration) ?? 0;

      if (isUserParticipantInRecord(user, rec)) {
        participantSeconds += seconds;
      }

      if (isUserResourcePersonInRecord(user, rec)) {
        resourcePersonSeconds += seconds;
      }
    });

    return {
      participant: formatTotalSeconds(participantSeconds),
      resourcePerson: formatTotalSeconds(resourcePersonSeconds)
    };
  }, [filteredRecords, user.employeeId]);

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

  // Pagination for large personal histories: 25 records per page
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, safeCurrentPage]);

  const handleGeneratePdf = async () => {
    if (generatingPdfRef.current || isGeneratingPdf) return;

    if (filteredRecords.length === 0) {
      error('No CNE records found for the selected filters.');
      return;
    }

    generatingPdfRef.current = true;
    setIsGeneratingPdf(true);
    try {
      const { generateCNERecordsPdf } = await import('../services/pdfGenerator');
      generateCNERecordsPdf(user, filteredRecords, {
        fromDate: startDate || undefined,
        toDate: endDate || undefined,
        searchTerm: searchTerm.trim() || undefined
      });
      success('CNE Record PDF downloaded successfully.', 'PDF Generated');
    } catch (e: any) {
      error('Failed to generate PDF document.');
    } finally {
      generatingPdfRef.current = false;
      setIsGeneratingPdf(false);
    }
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
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex flex-nowrap items-center gap-3 min-w-max">
          <div className="w-[280px] lg:w-[360px]">
            <SearchInput
              id="input-my-cne-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search topic, area, mode..."
            />
          </div>

          <div className="w-[160px]">
            <ConfirmDatePicker
              id="my-cne-from-date"
              value={startDate}
              onChange={setStartDate}
              placeholder="From Date"
              compact
            />
          </div>

          <div className="w-[160px]">
            <ConfirmDatePicker
              id="my-cne-to-date"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate}
              placeholder="To Date"
              compact
            />
          </div>

          <div className="whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-slate-600">
            Participant Hours: <strong className="text-emerald-700">{trainingDurationStats.participant}</strong>
          </div>

          <div className="whitespace-nowrap rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-slate-600">
            Resource Person Hours: <strong className="text-purple-700">{trainingDurationStats.resourcePerson}</strong>
          </div>

          {(searchTerm || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
              }}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-3 w-12 text-center">Sr.</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-left">Date &amp; Time</th>
                      <th className="py-3.5 px-4 text-left w-2/5 min-w-[280px]">Topic / Skills</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap">Role</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Duration</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Post-Test Score</th>
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
                          <td className="py-3 px-4 font-semibold text-slate-900 text-left">
                            <div className="line-clamp-2" title={rec.topic}>
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
            {filteredRecords.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="font-medium">
                  Showing <span className="font-bold text-slate-900">{(safeCurrentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                  <span className="font-bold text-slate-900">{Math.min(safeCurrentPage * PAGE_SIZE, filteredRecords.length)}</span> of{' '}
                  <span className="font-bold text-slate-900">{filteredRecords.length}</span> records
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
