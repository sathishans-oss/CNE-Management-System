import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { SessionUser, DepartmentalCneOutcomeRow } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import { SearchInput } from './SearchInput';
import { ConfirmDatePicker } from './cne/ConfirmDatePicker';
import { formatCneDateDisplay } from '../utils';

interface AdminDepartmentalCneOutcomeProps {
  user: SessionUser;
}

export const AdminDepartmentalCneOutcome: React.FC<AdminDepartmentalCneOutcomeProps> = ({ user }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportRows, setReportRows] = useState<DepartmentalCneOutcomeRow[]>([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Load report data from backend
  const fetchReport = useCallback(async (isRefresh = false) => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    try {
      const res = await ApiService.getDepartmentalCneOutcomeReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      });
      if (res.success && res.data) {
        setReportRows(res.data);
        if (isRefresh) {
          showToast('Departmental CNE Outcome report refreshed', 'success');
        }
      } else {
        showToast(res.message || 'Failed to load Departmental CNE Outcome report', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error loading report', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, fromDate, toDate, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleClearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
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

  // Compute print period text
  const printPeriodText = useMemo(() => {
    if (fromDate && toDate) {
      return `${formatCneDateDisplay(fromDate)} – ${formatCneDateDisplay(toDate)}`;
    }
    if (fromDate) {
      return `From ${formatCneDateDisplay(fromDate)}`;
    }
    if (toDate) {
      return `Up to ${formatCneDateDisplay(toDate)}`;
    }
    return 'All Available Records';
  }, [fromDate, toDate]);

  const handlePrint = () => {
    window.print();
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

      {/* Screen Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Departmental CNE Outcome</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative staff-coverage snapshots and final post-test outcome metrics for scheduled Departmental CNEs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchReport(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Panel — same compact pattern used by CNE Schedule */}
      <div className="print:hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto mb-6">
        <div className="flex items-center gap-3 min-w-max">
          <div className="w-[300px] min-w-[220px]">
            <SearchInput
              id="departmental-outcome-search"
              placeholder="Search..."
              value={search}
              onChange={setSearch}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="departmental-outcome-from-date" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              From Date
            </label>
            <ConfirmDatePicker
              id="departmental-outcome-from-date"
              value={fromDate}
              onChange={setFromDate}
              placeholder="From Date..."
              compact
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="departmental-outcome-to-date" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              To Date
            </label>
            <ConfirmDatePicker
              id="departmental-outcome-to-date"
              value={toDate}
              onChange={setToDate}
              minDate={fromDate}
              placeholder="To Date..."
              compact
            />
          </div>

          {(search.trim() || fromDate || toDate) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 inline-block mr-1.5" />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Print current filtered report (A4 landscape)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
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
              ) : filteredRows.length === 0 ? (
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
