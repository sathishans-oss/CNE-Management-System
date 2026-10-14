import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  Download,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { CNERecord, CneInterestRegistration, CneInterestedParticipantsResponse } from '../../types';
import { ApiService } from '../../services/api';
import { formatCneDateTimeDisplay } from '../../utils';

export interface InterestedParticipantsModalProps {
  cne: CNERecord;
  onClose: () => void;
}

export const InterestedParticipantsModal: React.FC<InterestedParticipantsModalProps> = ({
  cne,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CneInterestedParticipantsResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'INTERESTED' | 'ALL' | 'WITHDRAWN'>('INTERESTED');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.getCneInterestedParticipants(cne.cneId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load interested staff list.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  }, [cne.cneId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rawParticipants = data?.participants || [];

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    rawParticipants.forEach((p) => {
      const d = (p.department || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [rawParticipants]);

  // Active interest count (Only INTERESTED records)
  const activeCount = useMemo(() => {
    return rawParticipants.filter((p) => p.status === 'INTERESTED').length;
  }, [rawParticipants]);

  const withdrawnCount = useMemo(() => {
    return rawParticipants.filter((p) => p.status === 'WITHDRAWN').length;
  }, [rawParticipants]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rawParticipants.filter((p) => {
      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }
      // Department filter
      if (selectedDept !== 'ALL') {
        if ((p.department || '').trim().toLowerCase() !== selectedDept.toLowerCase()) {
          return false;
        }
      }
      // Search term
      if (q) {
        const matchesEmpId = (p.employeeId || '').toLowerCase().includes(q);
        const matchesName = (p.employeeName || '').toLowerCase().includes(q);
        const matchesDesig = (p.designation || '').toLowerCase().includes(q);
        const matchesDept = (p.department || '').toLowerCase().includes(q);
        return matchesEmpId || matchesName || matchesDesig || matchesDept;
      }
      return true;
    });
  }, [rawParticipants, searchTerm, selectedDept, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / pageSize));
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParticipants.slice(start, start + pageSize);
  }, [filteredParticipants, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDept, statusFilter]);

  // CSV Export
  const handleExportCsv = useCallback(() => {
    if (!filteredParticipants || filteredParticipants.length === 0) return;

    const headers = [
      'CNE ID',
      'Employee ID',
      'Employee Name',
      'Designation',
      'Department / Area',
      'Interest Status',
      'Interested At',
      'Updated At'
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredParticipants.map((p) => [
      escapeCsv(p.cneId),
      escapeCsv(p.employeeId),
      escapeCsv(p.employeeName),
      escapeCsv(p.designation),
      escapeCsv(p.department),
      escapeCsv(p.status),
      escapeCsv(p.interestedAt),
      escapeCsv(p.updatedAt)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTopic = (cne.topic || 'CNE').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `${cne.cneId}_Interested_Staff_${safeTopic}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredParticipants, cne]);

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interested-modal-title"
    >
      <div className="bg-white rounded-2xl w-[94vw] max-w-[1100px] max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90">
          <div className="flex flex-col gap-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {cne.cneId}
              </span>
              <h2
                id="interested-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 truncate"
              >
                Interested Staff &amp; Potential Attendees
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeCount} Active Interest</span>
              </span>
              {withdrawnCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {withdrawnCount} Withdrawn
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              <span className="font-medium text-slate-800 truncate max-w-[400px]">
                {cne.topic}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatCneDateTimeDisplay(cne.date)}
              </span>
              {cne.area && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {cne.area}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh list"
              aria-label="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational banner */}
        <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-2 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Note for Organizers:</strong> Expression of interest provides an estimate of potential attendance. It does not confirm participant enrollment, reserve seats, or guarantee attendance.
          </span>
        </div>

        {/* Controls Bar: Search, Department filter, Status filter & CSV Export */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ID, name, designation..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Departments ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="INTERESTED">Active Interest ({activeCount})</option>
              <option value="ALL">All Records ({rawParticipants.length})</option>
              {withdrawnCount > 0 && (
                <option value="WITHDRAWN">Withdrawn Only ({withdrawnCount})</option>
              )}
            </select>
          </div>

          {/* Export CSV */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredParticipants.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              title="Export interested staff to CSV file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export CSV ({filteredParticipants.length})</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs font-medium">Loading interested staff list...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center my-6 max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-rose-900 mb-1">Unable to Load Records</p>
              <p className="text-xs text-rose-700 mb-4">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center my-6 max-w-lg mx-auto">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {rawParticipants.length === 0
                  ? 'No Expression of Interest Recorded'
                  : 'No Matching Staff Found'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {rawParticipants.length === 0
                  ? 'Employees have not yet expressed interest in attending this CNE session.'
                  : 'Try clearing or modifying your search and filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Emp ID</th>
                      <th className="py-2.5 px-3">Staff Name</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Department / Area</th>
                      <th className="py-2.5 px-3">Registration Time</th>
                      <th className="py-2.5 px-3 text-center">Interest Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedParticipants.map((p, idx) => {
                      const rowNum = (currentPage - 1) * pageSize + idx + 1;
                      const isInterested = p.status === 'INTERESTED';
                      return (
                        <tr
                          key={`${p.employeeId}-${idx}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !isInterested ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {rowNum}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {p.employeeId}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {p.employeeName || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {p.designation || 'Nursing Officer'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {p.department ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                                {p.department}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                            {p.interestedAt ? formatCneDateTimeDisplay(p.interestedAt) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isInterested ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Interested</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Withdrawn</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {Math.min(filteredParticipants.length, (currentPage - 1) * pageSize + 1)}–
                  {Math.min(filteredParticipants.length, currentPage * pageSize)} of {filteredParticipants.length} entries
                  {statusFilter === 'INTERESTED' && ` (${activeCount} Active)`}
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-xs font-semibold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Total registrations: {rawParticipants.length} • Active: {activeCount} • Withdrawn: {withdrawnCount}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
