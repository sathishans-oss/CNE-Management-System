import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  RotateCcw,
  RefreshCw,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { SessionUser, DepartmentalCneOutcomeRow } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import { SearchInput } from './SearchInput';
import { ConfirmDatePicker } from './cne/ConfirmDatePicker';
import { formatCneDateDisplay, getIndiaTodayIsoDate } from '../utils';

interface AdminDepartmentalCneOutcomeProps {
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

function periodKey(period: OutcomePeriod): string {
  return period.allDates ? 'ALL' : `${period.fromDate}|${period.toDate}`;
}

export const AdminDepartmentalCneOutcome: React.FC<AdminDepartmentalCneOutcomeProps> = ({ user }) => {
  const { showToast } = useToast();
  const [initialPeriod] = useState(getIndiaCurrentMonth);
  const [draftPeriod, setDraftPeriod] = useState<OutcomePeriod>(initialPeriod);
  const [appliedPeriod, setAppliedPeriod] = useState<OutcomePeriod>(initialPeriod);
  const [loading, setLoading] = useState(true);
  const [reportRows, setReportRows] = useState<DepartmentalCneOutcomeRow[]>([]);
  const [loadedPeriodKey, setLoadedPeriodKey] = useState('');
  const [reportError, setReportError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const currentPeriodKey = periodKey(appliedPeriod);
  const canShowData = !loading && !reportError && loadedPeriodKey === currentPeriodKey;
  const isFilterChanged = periodKey(draftPeriod) !== currentPeriodKey;

  // Each effect owns its response. Unmounted or superseded requests cannot overwrite newer results.
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    let cancelled = false;
    setLoading(true);
    setReportError('');
    setReportRows([]);
    setLoadedPeriodKey('');

    ApiService.getDepartmentalCneOutcomeReport(appliedPeriod.allDates
      ? { allDates: true }
      : { fromDate: appliedPeriod.fromDate || undefined, toDate: appliedPeriod.toDate || undefined })
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setReportRows(res.data);
          setLoadedPeriodKey(currentPeriodKey);
        } else {
          setReportError(res.message || 'Unable to load Departmental CNE Outcome report.');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setReportError(err instanceof Error ? err.message : 'Network error loading report.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.role, user?.employeeId, appliedPeriod, currentPeriodKey, retryCount]);

  const handleApplyFilters = () => {
    // Two blank dates should mean Current Month, never an ambiguous unbounded report.
    const nextPeriod = !draftPeriod.allDates && !draftPeriod.fromDate && !draftPeriod.toDate
      ? getIndiaCurrentMonth()
      : draftPeriod;
    if (!nextPeriod.allDates && nextPeriod.fromDate && nextPeriod.toDate && nextPeriod.fromDate > nextPeriod.toDate) {
      showToast('From Date cannot be later than To Date.', 'error');
      return;
    }
    // Explicit Apply: don't issue an API call on each intermediate date-picker change.
    setDraftPeriod(nextPeriod);
    if (periodKey(nextPeriod) === currentPeriodKey) {
      setRetryCount((n) => n + 1);
      return;
    }
    setAppliedPeriod({ ...nextPeriod });
  };

  const handleCurrentMonth = () => {
    const month = getIndiaCurrentMonth();
    setDraftPeriod(month);
    setSearch('');
    if (periodKey(month) === currentPeriodKey) {
      setRetryCount((n) => n + 1);
    } else {
      setAppliedPeriod(month);
    }
  };

  const handleAllDates = () => {
    // Deliberate action. Never fetch all historical records on initial page load.
    const all: OutcomePeriod = { fromDate: '', toDate: '', allDates: true };
    setDraftPeriod(all);
    if (periodKey(all) === currentPeriodKey) {
      setRetryCount((n) => n + 1);
    } else {
      setAppliedPeriod(all);
    }
  };

  // Client-side filtering across report fields while preserving empty active area rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reportRows;

    return reportRows.filter((r) => {
      const areaMatch = r.area.toLowerCase().includes(q);
      const topicMatch = (r.topic || '').toLowerCase().includes(q);
      const statusMatch = (r.status || '').toLowerCase().includes(q);
      const createdByMatch = (r.createdByName || '').toLowerCase().includes(q);
      const remarksMatch = (r.remarks || '').toLowerCase().includes(q);
      return areaMatch || topicMatch || statusMatch || createdByMatch || remarksMatch;
    });
  }, [reportRows, search]);

  // Print only the applied period, never dates still being edited in the picker.
  const printPeriodText = useMemo(() => {
    if (appliedPeriod.allDates) return 'All Available Records';
    const { fromDate, toDate } = appliedPeriod;
    if (fromDate && toDate) return `${formatCneDateDisplay(fromDate)} – ${formatCneDateDisplay(toDate)}`;
    if (fromDate) return `From ${formatCneDateDisplay(fromDate)}`;
    if (toDate) return `Up to ${formatCneDateDisplay(toDate)}`;
    return 'All Available Records';
  }, [appliedPeriod]);

  const handlePrint = () => {
    if (canShowData && !isFilterChanged) window.print();
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h2 className="text-lg font-bold">Access Denied</h2>
          <p className="text-sm mt-1">Permission denied. Only Administrators can access Departmental CNE Outcome.</p>
        </div>
      </div>
    );
  }

  // Formatting attendance column
  const formatAttendance = (row: DepartmentalCneOutcomeRow) => {
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
  const formatOutcome = (row: DepartmentalCneOutcomeRow) => {
    if (row.status !== 'Completed') return '—';
    if (row.postTestOutcomePercentage !== null && row.postTestOutcomePercentage !== undefined) {
      return `${row.postTestOutcomePercentage.toFixed(1)}%`;
    }
    return '—';
  };

  // Formatting remarks: ONLY Cancelled sessions show cancellation reason
  const formatRemarks = (row: DepartmentalCneOutcomeRow) => {
    if (row.status === 'Canceled' || row.status === 'Cancelled') {
      return row.remarks || '—';
    }
    return '—';
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
      {/* Print-Only Header (Strict Institutional Requirement) */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 leading-tight">
          ALL INDIA INSTITUTE OF MEDICAL SCIENCES, RISHIKESH
        </h1>
        <h2 className="text-base font-semibold text-slate-800 mt-1">
          Departmental CNE Coverage & Outcome Report
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Period: {printPeriodText}
        </p>
      </div>

      {/* Filter Panel — same compact pattern used by CNE Schedule */}
      <div className="print:hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-[300px] sm:min-w-[220px] min-w-0">
            <SearchInput
              id="departmental-outcome-search"
              placeholder="Search..."
              value={search}
              onChange={setSearch}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <label htmlFor="departmental-outcome-from-date" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              From Date
            </label>
            <ConfirmDatePicker
              id="departmental-outcome-from-date"
              value={draftPeriod.fromDate}
              onChange={(fromDate) => setDraftPeriod((prev) => ({ ...prev, fromDate, allDates: false }))}
              placeholder="From Date..."
              compact
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <label htmlFor="departmental-outcome-to-date" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              To Date
            </label>
            <ConfirmDatePicker
              id="departmental-outcome-to-date"
              value={draftPeriod.toDate}
              onChange={(toDate) => setDraftPeriod((prev) => ({ ...prev, toDate, allDates: false }))}
              minDate={draftPeriod.fromDate}
              placeholder="To Date..."
              compact
            />
          </div>

          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={loading || (!isFilterChanged && !reportError)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>

          <button
            type="button"
            onClick={handleCurrentMonth}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 inline-block mr-1.5" />
            Current Month
          </button>

          <button
            type="button"
            onClick={handleAllDates}
            title="Load all historical records (may be slower)"
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            All Dates
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Print current filtered report (A4 landscape)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="print:hidden text-xs text-slate-600 mb-3" aria-live="polite">
        {loading ? 'Loading selected reporting period…' : `Report period: ${printPeriodText}`}
        {isFilterChanged && !loading && <span className="ml-2 font-semibold text-amber-700">Date changes not applied — click Apply Filter.</span>}
      </div>

      {/* Report Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider print:bg-slate-100">
                <th className="py-3 px-3 w-12 text-center">S.No</th>
                <th className="py-3 px-3 min-w-[160px]">Area / Ward</th>
                <th className="py-3 px-3 min-w-[200px]">CNE Topic</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3 min-w-[140px]">Remarks</th>
                <th className="py-3 px-3 min-w-[130px]">Created By</th>
                <th className="py-3 px-3 w-28 text-center">Total Allotted Staff</th>
                <th className="py-3 px-3 w-32 text-center">Attendance</th>
                <th className="py-3 px-3 w-24 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <p className="text-xs">Loading Departmental CNE Outcome report...</p>
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

                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.area}
                      </td>

                      <td className="py-2.5 px-3">
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

                      <td className="py-2.5 px-3 text-slate-600">
                        {formatRemarks(row)}
                      </td>

                      <td className="py-2.5 px-3">
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
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
          }
        }
      `}</style>
    </div>
  );
};
