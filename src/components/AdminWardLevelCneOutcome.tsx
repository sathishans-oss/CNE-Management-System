import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { SessionUser, WardLevelCneOutcomeRow } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import { SearchInput } from './SearchInput';
import { ConfirmDatePicker } from './cne/ConfirmDatePicker';
import { formatCneDateDisplay, getIndiaTodayIsoDate, parseToIsoDateString } from '../utils';
import { FilterBarShell } from './common/FilterBarShell';
import { ResponsiveFilterToggle } from './common/ResponsiveFilterToggle';

interface AdminWardLevelCneOutcomeProps {
  user: SessionUser;
}

/** Report periods are calendar dates in Asia/Kolkata, never browser-local dates. */
type OutcomePeriod = { fromDate: string; toDate: string; allDates: boolean };

function getIndiaCurrentMonth(): OutcomePeriod {
  const indiaToday = getIndiaTodayIsoDate();
  const [year, month] = indiaToday.split('-').map(Number);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { fromDate: first, toDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`, allDates: false };
}

export const AdminWardLevelCneOutcome: React.FC<AdminWardLevelCneOutcomeProps> = ({ user }) => {
  const [period, setPeriod] = useState<OutcomePeriod>(getIndiaCurrentMonth);
  const [loading, setLoading] = useState(true);
  const [reportRows, setReportRows] = useState<WardLevelCneOutcomeRow[]>([]);
  const [reportError, setReportError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const invalidPeriod = !period.allDates && Boolean(period.fromDate && period.toDate && period.fromDate > period.toDate);

  // Fetch all historical Ward-Level CNE Outcome rows once per page entry.
  // Month, date and search changes only select from these in-memory rows.
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    let cancelled = false;
    setLoading(true);
    setReportError('');
    setHasLoaded(false);
    setReportRows([]);
    ApiService.getWardLevelCneOutcomeReport({ allDates: true })
      .then(res => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setReportRows(res.data);
          setHasLoaded(true);
        } else {
          setReportError(res.message || 'Unable to load Ward-Level CNE Outcome report.');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setReportError(err instanceof Error ? err.message : 'Network error loading report.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.role, user?.employeeId, user?.token, retryCount]);

  const handleClearDates = () => setPeriod({ fromDate: '', toDate: '', allDates: true });
  const canShowData = hasLoaded && !loading && !reportError && !invalidPeriod;

  const filteredRows = useMemo(() => {
    if (invalidPeriod) return [];
    const from = period.allDates ? '' : period.fromDate;
    const to = period.allDates ? '' : period.toDate;
    // Active wards must remain visible even when none of their CNEs
    // occur in the locally selected month. The backend marks these explicitly.
    const activeAreas = new Map<string, string>();
    const byArea = new Map<string, WardLevelCneOutcomeRow[]>();
    const keyOf = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
    for (const row of reportRows) {
      const key = keyOf(row.area);
      if (row.activeArea || !row.cneId) activeAreas.set(key, row.area);
      if (!row.cneId) continue;
      const date = parseToIsoDateString(row.date);
      if (!date || (from && date < from) || (to && date > to)) {
        if (from || to) continue;
      }
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(row);
    }
    const rows: WardLevelCneOutcomeRow[] = [];
    for (const [key, area] of activeAreas) {
      const matching = byArea.get(key) || [];
      if (matching.length) rows.push(...matching);
      else rows.push({ area, cneId: '', topic: '', status: '', date: '', activeArea: true });
      byArea.delete(key);
    }
    for (const matching of byArea.values()) rows.push(...matching);
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => [r.area, r.topic, r.status, r.createdByName, r.remarks]
      .some(value => String(value || '').toLowerCase().includes(q))) : rows;
  }, [reportRows, period, search, invalidPeriod]);

  const printPeriodText = useMemo(() => {
    if (period.allDates || (!period.fromDate && !period.toDate)) return 'All Available Records';
    const { fromDate, toDate } = period;
    if (fromDate && toDate) return `${formatCneDateDisplay(fromDate)} – ${formatCneDateDisplay(toDate)}`;
    if (fromDate) return `From ${formatCneDateDisplay(fromDate)}`;
    return `Up to ${formatCneDateDisplay(toDate)}`;
  }, [period]);

  const handlePrint = () => { if (canShowData) window.print(); };

  if (user?.role !== 'ADMIN') {
    return <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-sm mt-1">Permission denied. Only Administrators can access Ward-Level CNE Outcome.</p>
      </div>
    </div>;
  }

  // Formatting attendance column
  const formatAttendance = (row: WardLevelCneOutcomeRow) => {
    if (row.status !== 'Completed') return '—';
    if (row.internalAttendanceCount !== null && row.internalAttendanceCount !== undefined) {
      if (row.attendancePercentage !== null && row.attendancePercentage !== undefined) {
        return `${row.internalAttendanceCount} (${row.attendancePercentage.toFixed(1)}%)`;
      }
      return `${row.internalAttendanceCount} (—)`;
    }
    return '—';
  };

  // Formatting outcome column
  const formatOutcome = (row: WardLevelCneOutcomeRow) => {
    if (row.status !== 'Completed') return '—';
    if (row.postTestOutcomePercentage !== null && row.postTestOutcomePercentage !== undefined) {
      return `${row.postTestOutcomePercentage.toFixed(1)}%`;
    }
    return '—';
  };

  // Formatting remarks: ONLY Cancelled sessions show cancellation reason
  const formatRemarks = (row: WardLevelCneOutcomeRow) => {
    if (row.status === 'Canceled' || row.status === 'Cancelled') {
      return row.remarks || '—';
    }
    return '—';
  };

  return (
    <div className="w-full min-w-0 py-2 sm:py-4">
      {/* Print-Only Header (Strict Institutional Requirement) */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 leading-tight">
          ALL INDIA INSTITUTE OF MEDICAL SCIENCES, RISHIKESH
        </h1>
        <h2 className="text-base font-semibold text-slate-800 mt-1">
          Ward-Level CNE Coverage & Outcome Report
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Period: {printPeriodText}
        </p>
      </div>

      {/* Unified CNE Schedule-style filter bar; month/date/search are entirely local. */}
      <div className="print:hidden mb-4">
        <FilterBarShell title="Ward-Level CNE Outcome" subtitle="Filter the loaded report instantly" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-[220px] xl:w-[260px]">
              <SearchInput id="ward-level-outcome-search" placeholder="Search outcome..." value={search} onChange={setSearch} />
            </div>
            <ResponsiveFilterToggle expanded={showAdvancedFilters}
              onToggle={() => setShowAdvancedFilters(v => !v)}
              activeCount={Number(Boolean(period.fromDate)) + Number(Boolean(period.toDate))}
              controlsId="ward-level-outcome-dates" />
            <div id="ward-level-outcome-dates" className={`${showAdvancedFilters ? 'flex' : 'hidden'} w-full flex-col gap-2.5 md:contents`}>
              <div className="w-full sm:w-[150px]">
                <ConfirmDatePicker id="ward-level-outcome-from-date"
                  value={period.fromDate} onChange={fromDate => setPeriod(p => ({...p, fromDate, allDates: false}))}
                  placeholder="From Date..." inlineLabel="From:" compact />
              </div>
              <div className="w-full sm:w-[150px]">
                <ConfirmDatePicker id="ward-level-outcome-to-date"
                  value={period.toDate} onChange={toDate => setPeriod(p => ({...p, toDate, allDates: false}))}
                  minDate={period.fromDate} placeholder="To Date..." inlineLabel="To:" compact />
              </div>
            </div>
            <button type="button" onClick={handleClearDates}
              title="Show all loaded historical outcome records" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <XCircle className="h-3.5 w-3.5" /> All Dates
            </button>
            <button type="button" onClick={handlePrint} disabled={!canShowData}
              className="sm:ml-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white disabled:opacity-50">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </FilterBarShell>
        <p className="mt-2 text-xs text-slate-600" role="status" aria-live="polite">
          {loading ? 'Loading all available Ward-Level CNE outcomes…' : `Report period: ${printPeriodText} · ${filteredRows.length} rows`}
        </p>
        {invalidPeriod && <p role="alert" className="mt-1 text-xs text-rose-700 font-semibold">From Date cannot be later than To Date.</p>}
      </div>

      {/* Report Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden xl:overflow-visible print:border-none print:shadow-none print:overflow-visible">
        <div className="cne-outcome-table-scroll max-h-[70dvh] overflow-auto overscroll-contain xl:max-h-none xl:overflow-visible print:max-h-none print:overflow-visible" role="region" aria-label="Ward-Level CNE outcome results" tabIndex={0}>
          <table className="w-full min-w-[1080px] text-left border-collapse text-xs print:min-w-0">
            <caption className="sr-only">Ward-Level CNE outcome results</caption>
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider print:bg-slate-100">
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 w-12 text-center">S.No</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 min-w-[160px]">Area / Ward</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 min-w-[200px]">CNE Topic</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 w-28 text-center">Status</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 min-w-[140px]">Remarks</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 min-w-[130px]">Created By</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 w-28 text-center">Total Allotted Staff</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 w-32 text-center">Attendance</th>
                <th scope="col" className="sticky top-0 xl:top-[7.25rem] z-10 bg-slate-50 print:bg-slate-100 print:static py-3 px-3 w-24 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <p className="text-xs">Loading complete Ward-Level CNE Outcome report...</p>
                  </td>
                </tr>
              ) : reportError ? (
                <tr><td colSpan={9} className="py-12 text-center text-rose-700">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-xs">{reportError}</p>
                  <button type="button" onClick={() => setRetryCount((n) => n + 1)} className="mt-3 px-4 py-2 bg-rose-50 rounded-lg font-semibold text-xs">Try Again</button>
                </td></tr>
              ) : !canShowData || filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-xs">No records found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isEmptyArea = !row.cneId;
                  const isCompleted = row.status === 'Completed';
                  const isCancelled = row.status === 'Canceled' || row.status === 'Cancelled';
                  const isScheduled = row.status === 'Scheduled';

                  return (
                    <tr
                      key={row.cneId ? `${row.area}-${row.cneId}` : `empty-${row.area}-${idx}`}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isEmptyArea ? 'bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {row.area}
                      </td>

                      <td className="py-2.5 px-3 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {row.topic ? (
                          <div className="font-medium text-slate-900">{row.topic}</div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Completed</span>
                          </span>
                        )}
                        {isScheduled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Scheduled</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>Cancelled</span>
                          </span>
                        )}
                        {isEmptyArea && <span className="text-slate-400">—</span>}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {formatRemarks(row)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {row.createdByName ? (
                          <span className="font-medium text-slate-800">{row.createdByName}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {row.totalAllottedStaff !== null && row.totalAllottedStaff !== undefined ? (
                          <span>{row.totalAllottedStaff}</span>
                        ) : (
                          <span className="text-slate-400 font-sans">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {formatAttendance(row)}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {formatOutcome(row)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 9pt !important;
          }
          nav, header, footer, #cne-top-toolbar, .print\\:hidden {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          .cne-outcome-table-scroll {
            max-height: none !important;
            overflow: visible !important;
          }
          .cne-outcome-table-scroll th {
            position: static !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
          }
        }
      `}</style>
    </div>
  );
};