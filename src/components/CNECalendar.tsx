import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { CNERecord, SessionUser } from '../types';
import { ApiService } from '../services/api';
import { formatCneDateTimeDisplay, parseToIsoDateString, getCneTypeLabel, getCneParticipatingWards } from '../utils';
import { LoadingProgress } from './common/LoadingProgress';
import { useAccessibleDialog } from './common/useAccessibleDialog';

type CalendarViewMode = 'month';
export interface CalendarViewState {
  year: number;
  month: number; // 0-based month (same as JavaScript Date)
  viewMode: CalendarViewMode;
}

interface CNECalendarProps {
  user: SessionUser;
  initialViewState?: CalendarViewState | null;
  onViewFullCneDetails: (cneId: string, viewState: CalendarViewState) => void;
}

const CalendarFullCneDetails = lazy(() => import('./cne/CalendarFullCneDetails')
  .then((m) => ({ default: m.CalendarFullCneDetails })));

const CalendarInterestControls = lazy(() => import('./cne/CalendarInterestControls')
  .then((m) => ({ default: m.CalendarInterestControls })));

type CalendarEventType = 'UPCOMING' | 'COMPLETED' | 'CANCELED';

/** Each mounted Calendar holds a display snapshot. ApiService shares a short-lived,
 * user-scoped browser-memory Schedule cache across Schedule and Calendar; it never
 * persists protected CNE records in localStorage. */
const getIndiaCalendarDate = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? month : new Date().getMonth() + 1,
    day: Number.isFinite(day) ? day : new Date().getDate()
  };
};

const getCalendarEventType = (status?: string | null): CalendarEventType => {
  const normalized = String(status || 'Scheduled').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'finalized') return 'COMPLETED';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'CANCELED';
  return 'UPCOMING';
};

export const CNECalendar: React.FC<CNECalendarProps> = ({ user, initialViewState, onViewFullCneDetails }) => {
  const indiaToday = getIndiaCalendarDate();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(initialViewState?.year ?? indiaToday.year, initialViewState?.month ?? (indiaToday.month - 1), 1));
  // Month is the only calendar view. Full history remains on the CNE Schedule page.
  const viewMode: CalendarViewMode = 'month';
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const [cneRecords, setCneRecords] = useState<CNERecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showAllPreviewWards, setShowAllPreviewWards] = useState(false);
  const calendarPreviewWards = selectedEvent ? getCneParticipatingWards(selectedEvent.raw || { area: selectedEvent.area }) : [];
  const [fullDetailsCne, setFullDetailsCne] = useState<CNERecord | null>(null);
  const requestGeneration = useRef(0);
  const eventDialogRef = useAccessibleDialog({ isOpen: Boolean(selectedEvent),
    onRequestClose: () => setSelectedEvent(null),
    initialFocus: '[aria-label="Close selected CNE event"]' });

  // One full authorized data request when Calendar mounts. Month changes only
  // change currentDate; they never call Apps Script again.
  const loadEvents = useCallback(async (forceFresh = false) => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await ApiService.getCNEScheduleAll(forceFresh);
      if (generation !== requestGeneration.current) return;
      if (!response.success || !response.data || !Array.isArray(response.data.records)) {
        setLoadError(response.message || 'Unable to load CNE Calendar. Please try again.');
        return;
      }
      setCneRecords(response.data.records);
      setHasLoaded(true); // An empty authorized dataset is a successful load.
    } catch (err) {
      if (generation !== requestGeneration.current) return;
      console.error('[CNE Calendar] Complete dataset load failed:', err);
      setLoadError('Unable to load CNE Calendar. Please try again.');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setHasLoaded(false);
    setCneRecords([]);
    void loadEvents();
    return () => { requestGeneration.current += 1; };
  }, [user.employeeId, user.token, loadEvents]);

  useEffect(() => {
    setSelectedEvent(null);
    setSelectedDay(null);
  }, [year, month]);

  // Unified calendar events from single authoritative CNE Schedule
  const allEvents = useMemo(() => {
    return cneRecords.map((r) => ({
      id: `cne-${r.cneId}`,
      title: r.topic,
      area: r.area,
      date: r.fromDate || r.date,
      toDate: r.toDate,
      duration: r.duration,
      instructor: r.resourcePersonName || 'Resource Person',
      mode: r.modeOfTeaching,
      type: getCalendarEventType(r.status),
      status: r.status,
      cneType: r.cneType || 'CENTRAL',
      raw: r
    }));
  }, [cneRecords]);

  useEffect(() => { setShowAllPreviewWards(false); }, [selectedEvent?.id]);

  const handleViewFullDetails = () => {
    if (!selectedEvent?.raw?.cneId) return;
    // Leaving the main month view disposes of the complete Calendar dataset.
    // Details keep only their currently selected record for authorization recheck.
    requestGeneration.current += 1;
    setCneRecords([]);
    setHasLoaded(false);
    setFullDetailsCne(selectedEvent.raw as CNERecord);
    setSelectedEvent(null);
  };

  // Month navigation is fully local, even across years.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group events by day of current month
  const eventsByDay = useMemo(() => {
    const map: { [day: number]: any[] } = {};
    allEvents.forEach((ev) => {
      const start = parseToIsoDateString(ev.date);
      if (!start) return;
      const end = parseToIsoDateString(ev.toDate) || start;
      const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      if (start > last || end < first) return;
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (iso >= start && iso <= end) (map[day] ||= []).push(ev);
      }
    });
    return map;
  }, [allEvents, year, month, daysInMonth]);

  // Full CNE Details is a separate view within Calendar; the full month dataset
  // is gone until the user returns, when it is fetched from Google Sheets again.
  if (fullDetailsCne) {
    return (
      <Suspense fallback={<div role="status" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center text-white">Loading CNE details…</div>}>
        <CalendarFullCneDetails
          initialCne={fullDetailsCne}
          user={user}
          onClose={() => { setFullDetailsCne(null); void loadEvents(); }}
          onManageInSchedule={() => onViewFullCneDetails(fullDetailsCne.cneId, { year, month, viewMode })}
          onCneUpdated={() => { /* Fetch once when returning to the month view. */ }}
        />
      </Suspense>
    );
  }

  // Header and legend render immediately, independently of the initial data request.
  const calendarHeader = (
      <div className="relative rounded-2xl border border-teal-100 bg-gradient-to-r from-white via-cyan-50 to-teal-100 p-2.5 sm:p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
<h1 className="inline-flex items-center gap-2 text-lg font-bold text-teal-900"><CalendarIcon className="w-4 h-4" aria-hidden="true" /> CNE Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive schedule for clinical workshops, nursing classes, and department training sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-2 py-1">
            <button
              id="btn-calendar-prev-month"
              onClick={prevMonth}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              id="btn-calendar-next-month"
              onClick={nextMonth}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              id="btn-calendar-refresh"
              onClick={() => void loadEvents(true)}
              disabled={loading}
              title="Refresh calendar data"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'text-teal-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
  );
  const calendarLegend = (
      <div role="group" aria-label="CNE Calendar legend" className="flex items-center gap-3 overflow-x-auto whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 sm:gap-5">
        <span className="font-semibold text-slate-700">Legend:</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Completed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" aria-hidden="true" />Upcoming</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Canceled</span>
      </div>
  );

  if (!hasLoaded) {
    return (
      <div className="space-y-4 pb-12">
        {calendarHeader}
        {calendarLegend}
        <section className="min-h-[240px] rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-center items-center gap-3 text-center"
          role={loading ? 'status' : 'alert'} aria-live="polite" aria-busy={loading}>
          {loading ? <LoadingProgress label="Fetching CNE Calendar programmes" /> : <>
            <CalendarIcon className="w-9 h-9 text-slate-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">Unable to load CNE Calendar</h2>
            <p className="text-sm text-slate-600">{loadError ?? 'CNE programmes are currently unavailable.'}</p>
            <button type="button" onClick={() => { void loadEvents(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </>}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {calendarHeader}
      {/* Keep the previous successful calendar visible during refresh.
          If refresh fails, report the issue instead of silently hiding data. */}
      {loadError && !loading && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-900">Could not refresh Calendar data. Showing the last successfully loaded records.</p>
          <button
            type="button"
            onClick={() => { void loadEvents(true); }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-amber-300 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {loading && <LoadingProgress label="Refreshing scheduled CNE programmes" className="mx-auto" />}

      {calendarLegend}

      {/* Monthly Grid View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[65px] bg-slate-50/50 sm:min-h-[100px] sm:p-2" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayEvents = eventsByDay[dayNum] || [];
              const isToday =
                indiaToday.year === year &&
                indiaToday.month === month + 1 &&
                indiaToday.day === dayNum;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-w-0 min-h-[65px] p-0.5 transition-colors sm:min-h-[110px] sm:p-2 ${
                    selectedDay === dayNum ? 'bg-teal-50 ring-1 ring-inset ring-teal-300' : isToday ? 'bg-emerald-50/30' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-0.5 mb-0.5 sm:mb-1.5">
                    <button type="button" onClick={() => setSelectedDay(dayNum)}
                      aria-label={`${dayNum} ${monthNames[month]} ${year}, ${dayEvents.length} CNE events`}
                      aria-pressed={selectedDay === dayNum}
                      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                        isToday ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-teal-100'
                      }`}
                    >
                      {dayNum}
                    </button>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events */}
                  <div className="hidden space-y-1 sm:block">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left p-1 rounded text-[10px] font-semibold truncate block transition-all ${
                          ev.type === 'UPCOMING'
                            ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border-l-2 border-purple-600'
                            : ev.type === 'CANCELED'
                            ? 'bg-rose-100 text-rose-900 hover:bg-rose-200 border-l-2 border-rose-600'
                            : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-l-2 border-emerald-600'
                        }`}
                      >
                        {ev.title}
                      </button>
                    ))}

                    {dayEvents.length > 2 && (
                      <button
                        onClick={() => setSelectedDay(dayNum)}
                        className="text-[10px] font-bold text-slate-500 hover:underline block text-center"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                  {dayEvents.length > 0 && (
                    <span className="mt-0.5 block h-1.5 w-full rounded-full bg-teal-600 sm:hidden" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* Calendar-day details: shows only selected date, not a duplicate agenda. */}
      {selectedDay !== null && (eventsByDay[selectedDay] || []).length > 0 && (
        <section aria-label="CNE sessions on selected date" className="rounded-2xl border border-teal-100 bg-white p-3 shadow-xs sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              {selectedDay} {monthNames[month]} {year} · {(eventsByDay[selectedDay] || []).length} CNE programme(s)
            </h2>
            <button type="button" onClick={() => setSelectedDay(null)} aria-label="Close selected day" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {(eventsByDay[selectedDay] || []).map((ev) => (
              <button key={ev.id} type="button" onClick={() => setSelectedEvent(ev)}
                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50">
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900">{ev.title}</span>
                  <span className="mt-1 block text-[11px] text-slate-600">{ev.area} · {ev.instructor}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div ref={eventDialogRef} role="dialog" aria-modal="true" aria-labelledby="calendar-event-dialog-title" tabIndex={-1} className="bg-white rounded-2xl w-full sm:w-[90vw] max-w-[950px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[85dvh] min-h-0 flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden text-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedEvent.type === 'UPCOMING'
                      ? 'bg-purple-100 text-purple-700'
                      : selectedEvent.type === 'CANCELED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      selectedEvent.type === 'UPCOMING'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : selectedEvent.type === 'CANCELED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {selectedEvent.type === 'UPCOMING'
                      ? 'Upcoming Class'
                      : selectedEvent.type === 'CANCELED'
                      ? 'Canceled CNE Session'
                      : 'Completed CNE Session'}
                  </span>
                  <h3 id="calendar-event-dialog-title" className="text-base font-bold text-slate-900 mt-1">
                    {selectedEvent.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                type="button" aria-label="Close selected CNE event"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto min-h-0 flex-1 bg-slate-50/40 cne-scroll-panel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-slate-500 font-semibold">Date &amp; Time</span>
                  <span className="font-bold text-slate-900">
                    {formatCneDateTimeDisplay(selectedEvent.date, selectedEvent.toDate)}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-slate-500 font-semibold">CNE Type</span>
                  <span className="font-bold text-slate-900">{getCneTypeLabel(selectedEvent.cneType)}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold">Primary Area / Ward</span>
                    <span className="font-bold text-slate-900">{selectedEvent.area || '—'}</span>
                  </div>
                  {calendarPreviewWards.length > 1 && (
                    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                      <div className={`flex flex-wrap gap-1.5 ${showAllPreviewWards ? 'max-h-32 overflow-y-auto' : ''}`}>
                        {(showAllPreviewWards ? calendarPreviewWards : calendarPreviewWards.slice(0, 4)).map((ward: string, index: number) => (
                          <span key={`${ward}-${index}`} className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-800">{ward}</span>
                        ))}
                      </div>
                      {calendarPreviewWards.length > 4 && (
                        <button type="button" aria-expanded={showAllPreviewWards}
                          onClick={() => setShowAllPreviewWards(value => !value)}
                          className="text-xs font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900">
                          {showAllPreviewWards ? 'Show fewer wards' : `View all ${calendarPreviewWards.length} wards (+${calendarPreviewWards.length - 4} more)`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-slate-500 font-semibold">Resource Person / Instructor</span>
                  <span className="font-bold text-slate-900">{selectedEvent.instructor}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-slate-500 font-semibold">Mode of Teaching</span>
                  <span className="font-bold text-slate-900">{selectedEvent.mode}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs md:col-span-2">
                  <span className="text-slate-500 font-semibold">Session Duration</span>
                  <span className="font-bold text-slate-900">{selectedEvent.duration || '—'}</span>
                </div>
              </div>
              {selectedEvent.raw && (
                <Suspense fallback={<div className="pt-4 text-xs text-slate-500">Loading interest options…</div>}>
                  <CalendarInterestControls key={`${user.employeeId}:${selectedEvent.raw.cneId}`}
                    cne={selectedEvent.raw} user={user} />
                </Suspense>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-wrap justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleViewFullDetails}
                disabled={!selectedEvent.raw?.cneId}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" /> View Full CNE Details
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
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