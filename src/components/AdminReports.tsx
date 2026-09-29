import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { CNERecord, Employee, SessionUser } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import { parseDurationToSeconds, parseToIsoDateString, resolveEmployeeName } from '../utils';
import { getCachedOfficers, loadOfficersSingleFlight } from '../services/officerLoader';

interface AdminReportsProps {
  user: SessionUser;
}

interface AdminReportAnalytics {
  totalActivities: number;
  totalTouchpoints: number;
  totalTrainingHours: number;
  areaCounts: Record<string, number>;
  modeCounts: Record<string, number>;
  instructorCounts: Record<string, number>;
}

const getIndiaYear = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric'
  }).format(new Date());

const isCompletedCne = (record: CNERecord) =>
  String(record.status || '').trim().toLowerCase() === 'completed';

export const AdminReports: React.FC<AdminReportsProps> = ({ user }) => {
  const [records, setRecords] = useState<CNERecord[]>([]);
  const [officers, setOfficers] = useState<Employee[]>(() => getCachedOfficers() || []);
  const [selectedYear, setSelectedYear] = useState(getIndiaYear());
  const [loading, setLoading] = useState(true);

  const { error } = useToast();
  const requestRef = useRef(0);
  const sessionKey = `${user?.employeeId || ''}:${user?.role || ''}:${user?.token || ''}`;
  const sessionKeyRef = useRef(sessionKey);
  sessionKeyRef.current = sessionKey;

  useEffect(() => {
    const requestId = ++requestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () =>
      requestId === requestRef.current && requestSession === sessionKeyRef.current;

    setRecords([]);
    setOfficers(getCachedOfficers() || []);

    if (!user?.employeeId || user.role !== 'ADMIN') {
      setLoading(false);
      return () => {
        requestRef.current += 1;
      };
    }

    setLoading(true);

    loadOfficersSingleFlight()
      .then((offData) => {
        if (isCurrent() && offData && offData.length > 0) {
          setOfficers(offData);
        }
      })
      .catch(() => {});

    ApiService.getCNERecords()
      .then((res) => {
        if (!isCurrent()) return;
        if (res.success && res.data) {
          setRecords(res.data);
        } else {
          setRecords([]);
          error(res.message || 'Failed to load records for report.');
        }
      })
      .catch((err: any) => {
        if (!isCurrent()) return;
        setRecords([]);
        error(err?.message || 'Failed to load records for report.');
      })
      .finally(() => {
        if (isCurrent()) setLoading(false);
      });

    return () => {
      requestRef.current += 1;
    };
  }, [sessionKey]);

  // Institutional analytics represent delivered education, so Scheduled and Canceled
  // sessions are excluded from attendance/training-hour statistics.
  const completedRecords = useMemo(
    () => records.filter(isCompletedCne),
    [records]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>([getIndiaYear()]);
    completedRecords.forEach((record) => {
      const isoDate = parseToIsoDateString(record.fromDate || record.date);
      if (isoDate) years.add(isoDate.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [completedRecords]);

  const filtered = useMemo(() => {
    if (selectedYear === 'ALL') return completedRecords;
    return completedRecords.filter((record) => {
      const isoDate = parseToIsoDateString(record.fromDate || record.date);
      return Boolean(isoDate && isoDate.startsWith(selectedYear));
    });
  }, [completedRecords, selectedYear]);

  // Analytics computations
  const analytics: AdminReportAnalytics = useMemo(() => {
    let totalTouchpoints = 0;
    let totalDurationSeconds = 0;
    const areaCounts: Record<string, number> = {};
    const modeCounts: Record<string, number> = {};
    const instructorCounts: Record<string, number> = {};

    filtered.forEach((record) => {
      // Participants: prefer the finalized participant count when available.
      const internalCount = Array.isArray(record.staffEmpIds) ? record.staffEmpIds.length : 0;
      const externalCount = Array.isArray(record.externalStaffParticipants)
        ? record.externalStaffParticipants.length
        : 0;
      const recordedCount = Number.isFinite(Number(record.staffCount))
        ? Math.max(0, Number(record.staffCount))
        : 0;
      totalTouchpoints += recordedCount > 0 ? recordedCount : internalCount + externalCount;

      // Duration: missing/invalid duration contributes zero; decimal hours such as 1.5
      // are parsed by the shared duration helper as 1 hour 30 minutes.
      totalDurationSeconds += parseDurationToSeconds(record.duration || '') || 0;

      const area = String(record.area || '').trim() || 'Unspecified';
      areaCounts[area] = (areaCounts[area] || 0) + 1;

      const mode = String(record.modeOfTeaching || '').trim() || 'Unspecified';
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;

      const fallbackName = resolveEmployeeName(
        record.resourcePersonEmpId,
        officers,
        'Resource Person'
      );
      const resourcePersons = String(record.resourcePersonName || fallbackName || 'Resource Person')
        .split(/[,;\n]+/)
        .map((name) => name.trim())
        .filter(Boolean);

      // Count a Resource Person once per CNE even if their name is duplicated in the source.
      new Set(resourcePersons).forEach((name) => {
        instructorCounts[name] = (instructorCounts[name] || 0) + 1;
      });
    });

    return {
      totalActivities: filtered.length,
      totalTouchpoints,
      totalTrainingHours: Math.round((totalDurationSeconds / 3600) * 10) / 10,
      areaCounts,
      modeCounts,
      instructorCounts
    };
  }, [filtered, officers]) as AdminReportAnalytics;

  const uniqueAreas = Object.keys(analytics.areaCounts).length;

  const topAreas = Object.entries(analytics.areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topInstructors = Object.entries(analytics.instructorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topModes = Object.entries(analytics.modeCounts)
    .sort((a, b) => b[1] - a[1]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Institutional CNE Analytics & Reports</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800">
              Annual Assessment
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Nursing Services • Completed clinical education statistics, teaching mode breakdowns, and participation trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>Year {year}</option>
            ))}
            <option value="ALL">All Recorded Years</option>
          </select>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
          Loading completed CNE analytics...
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed Sessions
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{analytics.totalActivities}</div>
              <div className="text-[11px] text-slate-500 mt-1">Finalized CNE workshops</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Training Hours
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">{analytics.totalTrainingHours} hrs</div>
              <div className="text-[11px] text-slate-500 mt-1">Completed education delivery</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Staff Touchpoints
              </span>
              <div className="text-3xl font-extrabold text-sky-600 mt-1">{analytics.totalTouchpoints}</div>
              <div className="text-[11px] text-slate-500 mt-1">Recorded participant attendances</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Departments
              </span>
              <div className="text-3xl font-extrabold text-purple-600 mt-1">{uniqueAreas}</div>
              <div className="text-[11px] text-slate-500 mt-1">Wards & specialty units</div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Active Areas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Top Wards & Departments</h3>
                <span className="text-xs text-slate-500">Completed sessions</span>
              </div>

              <div className="space-y-3">
                {topAreas.length === 0 ? (
                  <div className="text-xs text-slate-400">No completed CNE data for this period.</div>
                ) : topAreas.map(([name, count]) => {
                  const pct = analytics.totalActivities > 0
                    ? Math.round((count / analytics.totalActivities) * 100)
                    : 0;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{name}</span>
                        <span className="font-bold text-slate-900">{count} sessions</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teaching Modes Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Teaching Methodologies</h3>
                <span className="text-xs text-slate-500">Distribution</span>
              </div>

              <div className="space-y-3">
                {topModes.length === 0 ? (
                  <div className="text-xs text-slate-400">No completed CNE data for this period.</div>
                ) : topModes.map(([mode, count]) => {
                  const pct = analytics.totalActivities > 0
                    ? Math.round((count / analytics.totalActivities) * 100)
                    : 0;
                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{mode}</span>
                        <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Resource Persons */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Top Resource Persons</h3>
                <span className="text-xs text-slate-500">Completed sessions</span>
              </div>

              <div className="space-y-3">
                {topInstructors.length === 0 ? (
                  <div className="text-xs text-slate-400">No completed CNE data for this period.</div>
                ) : topInstructors.map(([name, count]) => {
                  const pct = analytics.totalActivities > 0
                    ? Math.round((count / analytics.totalActivities) * 100)
                    : 0;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{name}</span>
                        <span className="font-bold text-slate-900">{count} led</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
