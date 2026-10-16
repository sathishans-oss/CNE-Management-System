import React, { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  PlusCircle,
  X,
  Search,
  Loader2,
  Lock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Edit3,
  RefreshCw,
  AlertCircle,
  Building2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { SessionUser, CNERecord, CNEActivityProgress, Employee, TeachingMode, CNEType } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';
import { ScheduleRow } from './cne/ScheduleRow';
import { ScheduleMobileCard } from './cne/ScheduleMobileCard';
import { CneDetailsModal } from './cne/CneDetailsModal';
import {
  formatResourcePersonsDisplay,
  isCneAuthorized,
  isUserAssignedResourcePerson,
  getUserAssignedAreas,
  formatCneDateTimeDisplay,
  calculateCneDuration,
  validateCneDuration,
  toDateTimeLocalString,
  parseToIsoDateString,
  getCneTypeLabel,
  parseCneStartTimestamp
} from '../utils';
import { ConfirmDatePicker } from './cne/ConfirmDatePicker';
import { CneDateTimeFields } from './cne/CneDateTimeFields';
import { SearchInput } from './SearchInput';
import { loadOfficersSingleFlight, getCachedOfficers } from '../services/officerLoader';

const CNEReferenceModal = lazy(() => import('./cne/CNEReferenceModal').then((m) => ({ default: m.CNEReferenceModal })));
const CNEQuestionsModal = lazy(() => import('./cne/CNEQuestionsModal').then((m) => ({ default: m.CNEQuestionsModal })));
const CNEQRModal = lazy(() => import('./cne/CNEQRModal').then((m) => ({ default: m.CNEQRModal })));
const CNEParticipantsModal = lazy(() => import('./cne/CNEParticipantsModal').then((m) => ({ default: m.CNEParticipantsModal })));
const CNEFinalizeModal = lazy(() => import('./cne/CNEFinalizeModal').then((m) => ({ default: m.CNEFinalizeModal })));
const CNEPostTestModal = lazy(() => import('./cne/CNEPostTestModal').then((m) => ({ default: m.CNEPostTestModal })));
const DepartmentalScheduleModal = lazy(() => import('./cne/DepartmentalScheduleModal').then((m) => ({ default: m.DepartmentalScheduleModal })));
const AddUnscheduledCneModal = lazy(() => import('./cne/AddUnscheduledCneModal').then((m) => ({ default: m.AddUnscheduledCneModal })));
const DeleteCneModal = lazy(() => import('./cne/DeleteCneModal').then((m) => ({ default: m.DeleteCneModal })));

interface CNEScheduleProps {
  user: SessionUser | null;
  initialCneId?: string | null;
  onBackToCalendar?: () => void;
}

const getCneStatus = (cne?: CNERecord | null) =>
  String(cne?.status || 'Scheduled').trim().toLowerCase();

const isCneCompleted = (cne?: CNERecord | null) => getCneStatus(cne) === 'completed';

const isCneCanceled = (cne?: CNERecord | null) => {
  const status = getCneStatus(cne);
  return status === 'canceled' || status === 'cancelled';
};

const isCneClosed = (cne?: CNERecord | null) => isCneCompleted(cne) || isCneCanceled(cne);

export const CNESchedule: React.FC<CNEScheduleProps> = ({
  user,
  initialCneId,
  onBackToCalendar
}) => {
  const [classes, setClasses] = useState<CNERecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'Scheduled' | 'Completed' | 'Canceled' | 'ALL'>('Scheduled');
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // Schedule Class Modal State
  const [isScheduleChoiceOpen, setIsScheduleChoiceOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isDeptScheduleOpen, setIsDeptScheduleOpen] = useState(false);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newToDate, setNewToDate] = useState('');
  const [scheduleFromDate, setScheduleFromDate] = useState('');
  const [scheduleFromTime, setScheduleFromTime] = useState('09:00');
  const [scheduleToDate, setScheduleToDate] = useState('');
  const [scheduleToTime, setScheduleToTime] = useState('10:30');
  const [newDuration, setNewDuration] = useState('00:00:00');
  const [selectedRpEmpIds, setSelectedRpEmpIds] = useState<string[]>([]);
  const [rpSearchQuery, setRpSearchQuery] = useState('');
  const [newExternalRpList, setNewExternalRpList] = useState<string[]>([]);
  const [newExternalRpInput, setNewExternalRpInput] = useState('');
  const [newMode, setNewMode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMaxParticipants, setNewMaxParticipants] = useState(40);
  const [areasList, setAreasList] = useState<string[]>([]);
  const [teachingModes, setTeachingModes] = useState<TeachingMode[]>([]);
  const [officersList, setOfficersList] = useState<any[]>(() => getCachedOfficers() || []);
  const [isResourcePersonsLoading, setIsResourcePersonsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Part 2 Active Modals
  const [selectedDetailCne, setSelectedDetailCne] = useState<CNERecord | null>(null);
  const calendarRequestHandledRef = useRef<string | null>(null);
  const [activeReferenceCne, setActiveReferenceCne] = useState<CNERecord | null>(null);
  const [activeQuestionsCne, setActiveQuestionsCne] = useState<CNERecord | null>(null);
  const [activeQRCne, setActiveQRCne] = useState<CNERecord | null>(null);
  const [activeParticipantsCne, setActiveParticipantsCne] = useState<CNERecord | null>(null);
  const [activeFinalizeCne, setActiveFinalizeCne] = useState<CNERecord | null>(null);
  const [cancelTargetCne, setCancelTargetCne] = useState<CNERecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancellingCne, setIsCancellingCne] = useState(false);
  const [deleteTargetCne, setDeleteTargetCne] = useState<CNERecord | null>(null);
  const [deleteReason, setDeleteReason] = useState('Schedule created by mistake');
  const [deleteConfirmId, setDeleteConfirmId] = useState('');
  const [isDeletingCne, setIsDeletingCne] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [activePostTest, setActivePostTest] = useState<{ cneId?: string; qrToken?: string } | null>(null);

  // CNE Activity Progress State
  const [activityProgress, setActivityProgress] = useState<CNEActivityProgress | null>(null);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

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

  // Edit CNE Modal State
  const [editingCne, setEditingCne] = useState<CNERecord | null>(null);
  const [editCneType, setEditCneType] = useState<CNEType>('CENTRAL');
  const [editTopic, setEditTopic] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editToDate, setEditToDate] = useState('');
  const [editDuration, setEditDuration] = useState('01:30:00');
  const [editSelectedRpEmpIds, setEditSelectedRpEmpIds] = useState<string[]>([]);
  const [editRpSearchQuery, setEditRpSearchQuery] = useState('');
  const [editExternalRpList, setEditExternalRpList] = useState<string[]>([]);
  const [editExternalRpInput, setEditExternalRpInput] = useState('');
  const [editMode, setEditMode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxParticipants, setEditMaxParticipants] = useState(40);
  const [editAdminRemarks, setEditAdminRemarks] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const editSubmittingRef = useRef(false);

  const { success, error } = useToast();
  const dataRequestRef = useRef(0);
  const historyPageRef = useRef(1);
  const historyMoreRequestRef = useRef(false);
  const activityRequestRef = useRef(0);
  const selectedCneIdRef = useRef('');
  selectedCneIdRef.current = selectedDetailCne?.cneId || selectedDetailCne?.classId || '';
  const sessionKey = `${user?.employeeId || ''}:${user?.role || ''}:${user?.token || ''}`;
  const sessionKeyRef = useRef(sessionKey);
  sessionKeyRef.current = sessionKey;

  const isAdmin = user?.role === 'ADMIN';
  const isAreaIncharge = user?.role === 'AREA_INCHARGE' || user?.role === 'INCHARGE';
  const canScheduleCne = isAdmin || isAreaIncharge;
  const activeTeachingModeNames = useMemo(() =>
    teachingModes
      .filter((mode) => mode.status === 'ACTIVE')
      .map((mode) => mode.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [teachingModes]
  );
  const preferredTeachingMode = useMemo(() => {
    const lecture = activeTeachingModeNames.find((name) => name.toLowerCase() === 'lecture cum discussion');
    return lecture || activeTeachingModeNames[0] || '';
  }, [activeTeachingModeNames]);
  const editTeachingModeOptions = useMemo(() => {
    const current = String(editingCne?.modeOfTeaching || editMode || '').trim();
    const active = [...activeTeachingModeNames];
    const currentIsActive = active.some((name) => name.toLowerCase() === current.toLowerCase());
    if (current && !currentIsActive) {
      return [{ name: current, inactiveCurrent: true }, ...active.map((name) => ({ name, inactiveCurrent: false }))];
    }
    return active.map((name) => ({ name, inactiveCurrent: false }));
  }, [activeTeachingModeNames, editingCne?.modeOfTeaching, editMode]);
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const isFromComplete = Boolean(scheduleFromDate && scheduleFromTime);

  const isConcernedAreaIncharge = useCallback((cne: CNERecord) => {
    if (!user || !(user.role === 'AREA_INCHARGE' || (user.role as string) === 'INCHARGE')) return false;
    const targetArea = (cne.area || '').trim().toLowerCase();
    if (!targetArea) return false;
    return getUserAssignedAreas(user).some((area) => area.trim().toLowerCase() === targetArea);
  }, [user]);

  // Operational Progress permissions: Admin + concerned Area/Ward Incharge (internal CNEs only) + assigned RP.
  // Applies to both Central and Departmental CNEs. External CNEs (EXTERNAL_OFFSITE, EXTERNAL_ONSITE)
  // are never operationally managed by Area Incharge.
  const canOperateCne = useCallback((cne: CNERecord) => {
    if (!user || !cne) return false;
    if (user.role === 'ADMIN') return true;
    const isInternalOperationalType =
      cne.cneType === 'CENTRAL' ||
      cne.cneType === 'DEPARTMENTAL';
    if (isInternalOperationalType && isConcernedAreaIncharge(cne)) return true;
    return isUserAssignedResourcePerson(user, [cne.resourcePersonEmpId, ...(cne.resourcePersonEmpIds || [])].filter(Boolean).join(','));
  }, [user, isConcernedAreaIncharge]);


  // Backward-compatible Post Test permission helper retained for the project's
  // security verification. This is OPERATIONAL authority only; lifecycle
  // actions (Edit / Cancel / Finalize) continue to use canManageLifecycle.
  // Closed CNEs are always blocked here.
  const canManageCneActions = useCallback((_sessionUser: SessionUser | null, cne: CNERecord) => {
    if (!_sessionUser || !cne) return false;
    return canOperateCne(cne) && !isCneClosed(cne);
  }, [canOperateCne]);

  // Edit / Cancel / Finalize lifecycle authority:
  // - Central CNE: Admin only.
  // - Departmental CNE: Admin + concerned Area/Ward Incharge.
  // - Assigned Resource Persons never receive lifecycle authority.
  const canManageLifecycle = useCallback((cne: CNERecord) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if ((cne.cneType || 'CENTRAL').trim().toUpperCase() !== 'DEPARTMENTAL') return false;
    return isConcernedAreaIncharge(cne);
  }, [user, isConcernedAreaIncharge]);

  // Scheduled CNEs are visible to every authenticated user. Historical records are restricted.
  const canViewScheduleRecord = useCallback((cne: CNERecord) => {
    if (!user?.employeeId) return false;
    const status = getCneStatus(cne);
    const isHistorical = status === 'completed' || status === 'canceled' || status === 'cancelled';
    if (!isHistorical) return true;
    if (user.role === 'ADMIN') return true;
    const isInternalType = cne.cneType === 'CENTRAL' || cne.cneType === 'DEPARTMENTAL';
    if (isInternalType && isConcernedAreaIncharge(cne)) return true;
    return isUserAssignedResourcePerson(user, [cne.resourcePersonEmpId, ...(cne.resourcePersonEmpIds || [])].filter(Boolean).join(','));
  }, [user, isConcernedAreaIncharge]);

  useEffect(() => {
    calendarRequestHandledRef.current = null;
    setClasses([]);
    setStatusFilter('Scheduled');
    setHistoryTotal(0);
    setHistoryHasMore(false);
    setAreasList([]);
    setTeachingModes([]);
    setOfficersList(getCachedOfficers() || []);
    setSelectedDetailCne(null);
    setActiveReferenceCne(null);
    setActiveQuestionsCne(null);
    setActiveQRCne(null);
    setActiveParticipantsCne(null);
    setActiveFinalizeCne(null);
    setActivePostTest(null);
    setEditingCne(null);
    setCancelTargetCne(null);
    setIsAddClassOpen(false);
    setIsDeptScheduleOpen(false);
    setIsUnscheduledOpen(false);
    setIsScheduleChoiceOpen(false);
    if (!user?.employeeId) setLoading(false);
    return () => {
      dataRequestRef.current += 1;
      activityRequestRef.current += 1;
    };
  }, [sessionKey]);

  const fetchActivityProgress = useCallback((cneId: string, forceFresh = false) => {
    const requestId = ++activityRequestRef.current;
    const requestSession = sessionKeyRef.current;
    const isCurrent = () => requestId === activityRequestRef.current && requestSession === sessionKeyRef.current && cneId === selectedCneIdRef.current;
    setIsActivityLoading(true);
    setActivityError(null);
    setActivityProgress(null);

    ApiService.getCNEActivityProgress(cneId, forceFresh)
      .then((res) => {
        if (!isCurrent()) return;
        if (res && res.success && res.data) {
          setActivityProgress(res.data);
          setActivityError(null);
        } else {
          setActivityProgress(null);
          setActivityError(res?.message || 'Unable to load CNE progress');
        }
      })
      .catch((err: any) => {
        if (!isCurrent()) return;
        setActivityProgress(null);
        setActivityError(err?.message || 'Unable to load CNE progress');
      })
      .finally(() => {
        if (isCurrent()) setIsActivityLoading(false);
      });
  }, []);

  // Calendar deep links must work even when the target CNE is Completed/Canceled
  // or outside the selected history page. The backend checks authorization.
  useEffect(() => {
    const wantedId = String(initialCneId || '').trim();
    if (!wantedId || !user?.employeeId || calendarRequestHandledRef.current === wantedId) return;
    calendarRequestHandledRef.current = wantedId;
    const requestSession = sessionKey;
    let active = true;
    void ApiService.getCNEScheduleById(wantedId).then((result) => {
      if (!active || requestSession !== sessionKeyRef.current) return;
      if (!result.success || !result.data || !canViewScheduleRecord(result.data)) {
        error(result.message || 'This CNE is unavailable or you do not have permission to view it.');
      } else {
        setSelectedDetailCne(result.data);
      }
    }).catch(() => {
      if (active && requestSession === sessionKeyRef.current) error('Unable to open this CNE. Please try again.');
    });
    return () => { active = false; };
  }, [initialCneId, sessionKey, user?.employeeId, canViewScheduleRecord, error]);

  // Fetch real-time CNE Activity Progress whenever a CNE details modal is opened
  useEffect(() => {
    const selectedId = selectedDetailCne?.cneId || selectedDetailCne?.classId;
    if (!selectedId) {
      setActivityProgress(null);
      setIsActivityLoading(false);
      setActivityError(null);
      return;
    }

    fetchActivityProgress(selectedId);
    return () => { activityRequestRef.current += 1; };
  }, [selectedDetailCne?.cneId, selectedDetailCne?.classId, fetchActivityProgress]);

  const loadData = async (): Promise<CNERecord[] | undefined> => {
    const requestId = ++dataRequestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === dataRequestRef.current && requestSession === sessionKeyRef.current;
    setLoading(true);
    setLoadingMore(false);
    historyMoreRequestRef.current = false;
    historyPageRef.current = 1;
    setLoadError('');

    // Staff viewing the Schedule do not require CNE-creation master lists.
    if (canScheduleCne) {
      void ApiService.getAreas().then((res) => {
        if (!isCurrent()) return;
        if (res.success && Array.isArray(res.data)) {
          setAreasList(Array.from(new Set(res.data.filter((a) => a.status === 'ACTIVE').map((a) => a.name).filter(Boolean))));
        }
      }).catch((err) => { if (isCurrent()) console.warn('CNE Areas unavailable:', err); });
      void ApiService.getTeachingModes().then((res) => {
        if (!isCurrent()) return;
        if (res.success && Array.isArray(res.data)) {
          setTeachingModes([...res.data].sort((a,b) => a.name.localeCompare(b.name,undefined,{sensitivity:'base'})));
        }
      }).catch((err) => { if (isCurrent()) console.warn('CNE Teaching Modes unavailable:', err); });
    }

    try {
      const result = await ApiService.getCNESchedulePage({
        status: statusFilter,
        page: 1,
        pageSize: 50,
        search: debouncedSearch,
        fromDate: fromDateFilter,
        toDate: toDateFilter
      });
      if (!isCurrent()) return;
      if (!result.success || !result.data || !Array.isArray(result.data.records)) {
        throw new Error(result.message || 'Failed to load CNE schedule.');
      }
      setClasses(result.data.records);
      setHistoryTotal(result.data.total);
      setHistoryHasMore(Boolean(result.data.hasMore));
      return result.data.records;
    } catch (e: any) {
      if (isCurrent()) {
        setClasses([]);
        setHistoryTotal(0);
        setHistoryHasMore(false);
        setLoadError(e?.message || 'Failed to load CNE schedule.');
        error(e?.message || 'Failed to load CNE schedule.');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  // Requests only the next authorized historical page. No eager background
  // downloads of Completed/Canceled history are performed.
  const loadNextHistoryPage = async () => {
    if (loading || loadingMore || historyMoreRequestRef.current || !historyHasMore || statusFilter === 'Scheduled') return;
    const requestId = dataRequestRef.current;
    const requestSession = sessionKey;
    const nextPage = historyPageRef.current + 1;
    historyMoreRequestRef.current = true;
    setLoadingMore(true);
    try {
      const result = await ApiService.getCNESchedulePage({
        status: statusFilter,
        page: nextPage,
        pageSize: 50,
        search: debouncedSearch,
        fromDate: fromDateFilter,
        toDate: toDateFilter
      });
      if (requestId !== dataRequestRef.current || requestSession !== sessionKeyRef.current) return;
      if (!result.success || !result.data || !Array.isArray(result.data.records)) throw new Error(result.message || 'Unable to load more CNEs.');
      historyPageRef.current = nextPage;
      setClasses((current) => {
        const ids = new Set(current.map((c) => c.cneId || c.classId));
        return [...current, ...result.data.records.filter((c) => !ids.has(c.cneId || c.classId))];
      });
      setHistoryTotal(result.data.total);
      setHistoryHasMore(Boolean(result.data.hasMore));
    } catch(e: any) {
      if (requestId === dataRequestRef.current && requestSession === sessionKeyRef.current) error(e?.message || 'Unable to load more CNEs.');
    } finally {
      if (requestId === dataRequestRef.current) { historyMoreRequestRef.current = false; setLoadingMore(false); }
    }
  };

  // Debounce server-side searching to avoid one Apps Script request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchTerm]);

  // A change of status/search/dates requests fresh data from the server.
  useEffect(() => {
    if (!user?.employeeId) return;
    setClasses([]);
    setCurrentPage(1);
    void loadData();
    return () => { dataRequestRef.current += 1; };
  }, [sessionKey, statusFilter, debouncedSearch, fromDateFilter, toDateFilter]);

  useEffect(() => {
    if (!activeTeachingModeNames.length) {
      if (newMode) setNewMode('');
      return;
    }
    const currentIsActive = activeTeachingModeNames.some((name) => name.toLowerCase() === newMode.toLowerCase());
    if (!currentIsActive) setNewMode(preferredTeachingMode);
  }, [activeTeachingModeNames, preferredTeachingMode, newMode]);

  // On-demand fetch of officers when Central CNE Add or Edit modal opens for authorized roles if not yet loaded
  useEffect(() => {
    if (canScheduleCne && (isAddClassOpen || Boolean(editingCne)) && officersList.length === 0) {
      let cancelled = false;
      setIsResourcePersonsLoading(true);
      loadOfficersSingleFlight()
        .then((officers) => {
          if (!cancelled && officers && officers.length > 0) {
            setOfficersList(officers);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) {
            setIsResourcePersonsLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [canScheduleCne, isAddClassOpen, editingCne, officersList.length, sessionKey]);

  const handleChildModalUpdated = async (targetCneId?: string) => {
    const cneId = targetCneId || selectedDetailCne?.cneId || selectedDetailCne?.classId;
    if (cneId && selectedCneIdRef.current === cneId) {
      // Immediately refresh activity progress so checks, readiness counter & progress bar update
      fetchActivityProgress(cneId, true);
    }
    try {
      const freshClasses = await loadData();
      if (cneId) {
        const fresh = freshClasses?.find((c) => (c.cneId || c.classId) === cneId) ||
          (await ApiService.getCNEScheduleById(cneId)).data;
        if (fresh) {
          setSelectedDetailCne((current) => current && (current.cneId || current.classId) === cneId ? fresh : current);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh CNE modal after child update:', err);
    }
  };

  const handleAddExternalRp = () => {
    const val = newExternalRpInput.trim();
    if (!val) return;
    if (!newExternalRpList.includes(val)) {
      setNewExternalRpList((prev) => [...prev, val]);
    }
    setNewExternalRpInput('');
  };

  const handleRemoveExternalRp = (idx: number) => {
    setNewExternalRpList((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleRpSelection = (empId: string) => {
    setSelectedRpEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const filteredRpOfficers = officersList.filter((o) => {
    if (!rpSearchQuery.trim()) return true;
    const q = rpSearchQuery.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.employeeId.toLowerCase().includes(q) ||
      (o.designation || '').toLowerCase().includes(q)
    );
  });

  const syncNewDatesAndDuration = (fromDate: string, fromTime: string, toDate: string, toTime: string) => {
    const fullFrom = fromDate && fromTime ? `${fromDate}T${fromTime}` : '';
    const fullTo = toDate && toTime ? `${toDate}T${toTime}` : '';
    setNewDate(fullFrom);
    setNewToDate(fullTo);
    if (fullFrom && fullTo) {
      const dFrom = parseCneStartTimestamp(fullFrom);
      const dTo = parseCneStartTimestamp(fullTo);
      if (Number.isFinite(dFrom) && Number.isFinite(dTo) && dTo >= dFrom) {
        const autoDur = calculateCneDuration(fullFrom, fullTo);
        if (autoDur) setNewDuration(autoDur);
      }
    }
  };

  const handleConfirmFromDate = (val: string) => {
    setScheduleFromDate(val);
    let updatedToDate = scheduleToDate;
    let updatedToTime = scheduleToTime;

    // If To Date was already selected but is earlier than the new From Date, bump or sync to new From Date
    if (updatedToDate && updatedToDate < val) {
      updatedToDate = val;
      setScheduleToDate(val);
      if (updatedToTime < scheduleFromTime) {
        updatedToTime = scheduleFromTime;
        setScheduleToTime(scheduleFromTime);
      }
    } else if (updatedToDate === val && updatedToTime < scheduleFromTime) {
      updatedToTime = scheduleFromTime;
      setScheduleToTime(scheduleFromTime);
    }

    syncNewDatesAndDuration(val, scheduleFromTime, updatedToDate, updatedToTime);
  };

  const handleFromTimeChange = (val: string) => {
    setScheduleFromTime(val);
    let updatedToTime = scheduleToTime;

    // If scheduled on same day, To Time must not be earlier than From Time
    if (scheduleToDate === scheduleFromDate && updatedToTime && updatedToTime < val) {
      updatedToTime = val;
      setScheduleToTime(val);
    }

    syncNewDatesAndDuration(scheduleFromDate, val, scheduleToDate, updatedToTime);
  };

  const handleConfirmToDate = (val: string) => {
    setScheduleToDate(val);
    let updatedToTime = scheduleToTime;

    // If To Date equals From Date, ensure To Time is not earlier than From Time
    if (val === scheduleFromDate && updatedToTime && updatedToTime < scheduleFromTime) {
      updatedToTime = scheduleFromTime;
      setScheduleToTime(scheduleFromTime);
    }

    syncNewDatesAndDuration(scheduleFromDate, scheduleFromTime, val, updatedToTime);
  };

  const handleToTimeChange = (val: string) => {
    // If To Date equals From Date, prevent To Time earlier than From Time
    if (scheduleToDate === scheduleFromDate && scheduleFromTime && val && val < scheduleFromTime) {
      error(`To Time cannot be earlier than From Time (${scheduleFromTime}).`);
      setScheduleToTime(scheduleFromTime);
      syncNewDatesAndDuration(scheduleFromDate, scheduleFromTime, scheduleToDate, scheduleFromTime);
      return;
    }

    setScheduleToTime(val);
    syncNewDatesAndDuration(scheduleFromDate, scheduleFromTime, scheduleToDate, val);
  };

  const userAssignedAreas = getUserAssignedAreas(user);
  const activeAreaNames = useMemo(
    () => new Set(areasList.map((areaName) => String(areaName || '').trim().toUpperCase()).filter(Boolean)),
    [areasList]
  );
  const selectableAssignedAreas = useMemo(
    () => userAssignedAreas.filter((name) => activeAreaNames.has(String(name || '').trim().toUpperCase())),
    [userAssignedAreas, activeAreaNames]
  );

  const handleCreateCNE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) return;

    if (!newTopic.trim() || !newArea.trim() || !newDate.trim()) {
      error('Please fill in all required fields (Topic, Area, From Date & Time).');
      return;
    }

    if (!activeAreaNames.has(newArea.trim().toUpperCase())) {
      error('This ward/area is currently inactive. Please select an active ward/area.');
      return;
    }

    if (!newMode.trim() || !activeTeachingModeNames.some((mode) => mode.toLowerCase() === newMode.trim().toLowerCase())) {
      error('Please select an active Teaching Mode.');
      return;
    }

    if (!newToDate.trim()) {
      error('To Date & Time is required.');
      return;
    }

    const dFrom = parseCneStartTimestamp(newDate);
    const dTo = parseCneStartTimestamp(newToDate);
    if (!Number.isFinite(dFrom) || !Number.isFinite(dTo)) {
      error('Please enter valid From Date & Time and To Date & Time.');
      return;
    }

    if (dTo < dFrom) {
      error('To Date & Time cannot be earlier than From Date & Time.');
      return;
    }

    if (newDate.slice(0, 10) < todayStr) {
      error('Scheduled From Date cannot be in the past. Please select today or a future date.');
      return;
    }

    const durVal = validateCneDuration(newDuration, newDate, newToDate);
    if (!durVal.isValid) {
      error(durVal.message);
      return;
    }

    if (selectedRpEmpIds.length === 0 && newExternalRpList.length === 0) {
      error('Please select at least one Resource Person (Internal or External).');
      return;
    }

    const rpNames = selectedRpEmpIds.map((id) => {
      const off = officerByEmployeeId.get(String(id || '').trim().toUpperCase());
      return off ? off.name : id;
    });
    if (newExternalRpList.length > 0) {
      rpNames.push(...newExternalRpList.map((n) => `${n} (External)`));
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // The Schedule New CNE workflow MUST ALWAYS submit cneType: 'CENTRAL'
      const res = await ApiService.createCNE({
        topic: newTopic.trim(),
        area: newArea,
        cneType: 'CENTRAL',
        date: newDate,
        toDate: newToDate,
        duration: newDuration.trim(),
        resourcePersonEmpId: selectedRpEmpIds.join(', '),
        resourcePersonEmpIds: selectedRpEmpIds,
        resourcePersonName: rpNames.join(', '),
        externalResourcePersons: newExternalRpList,
        modeOfTeaching: newMode,
        description: newDescription.trim(),
        maxParticipants: newMaxParticipants,
        proposedByEmpId: user?.employeeId,
        proposedByName: user?.name,
        status: 'Scheduled'
      } as any);

      if (res.success) {
        success('Upcoming Central CNE workshop created and published successfully.', 'CNE Scheduled');
        setIsAddClassOpen(false);
        // Reset form
        setNewTopic('');
        setNewDescription('');
        setScheduleFromDate('');
        setScheduleFromTime('09:00');
        setScheduleToDate('');
        setScheduleToTime('10:30');
        setNewDate('');
        setNewToDate('');
        setNewDuration('00:00:00');
        setSelectedRpEmpIds([]);
        setRpSearchQuery('');
        setNewExternalRpList([]);
        setNewExternalRpInput('');
        setNewMode(preferredTeachingMode);
        loadData();
      } else {
        if (res.errorCode === 'AREA_INACTIVE') {
          error('This ward/area is currently inactive. Please select an active ward/area.');
        } else if (res.errorCode === 'TEACHING_MODE_INACTIVE') {
          error('The selected Teaching Mode is inactive. Please select an active Teaching Mode.');
        } else {
          error(res.message || 'Failed to schedule CNE.');
        }
      }
    } catch (err: any) {
      error(err?.message || 'Error creating CNE.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleEditFromDateChange = (val: string) => {
    setEditDate(val);
    if (val && editToDate) {
      const dFrom = parseCneStartTimestamp(val);
      const dTo = parseCneStartTimestamp(editToDate);
      if (Number.isFinite(dFrom) && Number.isFinite(dTo) && dTo >= dFrom) {
        const autoDur = calculateCneDuration(val, editToDate);
        if (autoDur) setEditDuration(autoDur);
      }
    }
  };

  const handleEditToDateChange = (val: string) => {
    setEditToDate(val);
    if (editDate && val) {
      const dFrom = parseCneStartTimestamp(editDate);
      const dTo = parseCneStartTimestamp(val);
      if (Number.isFinite(dFrom) && Number.isFinite(dTo) && dTo >= dFrom) {
        const autoDur = calculateCneDuration(editDate, val);
        if (autoDur) setEditDuration(autoDur);
      }
    }
  };

  const handleOpenEditModal = (cls: CNERecord) => {
    if (!canManageLifecycle(cls) || isCneClosed(cls)) { error('This CNE cannot be edited.'); return; }
    setEditingCne(cls);
    setEditTopic(cls.topic || '');
    setEditArea(cls.area || '');
    setEditCneType((cls.cneType || 'CENTRAL') as CNEType);
    setEditDate(toDateTimeLocalString(cls.date));
    setEditToDate(toDateTimeLocalString(cls.toDate || cls.date));
    setEditDuration(cls.duration || '01:30:00');

    const parsedRpIds = (cls.resourcePersonEmpId || '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setEditSelectedRpEmpIds(parsedRpIds);
    setEditRpSearchQuery('');
    setEditExternalRpList(cls.externalResourcePersons ? [...cls.externalResourcePersons] : []);
    setEditExternalRpInput('');
    setEditMode(cls.modeOfTeaching || preferredTeachingMode);
    setEditDescription(cls.description || '');
    setEditMaxParticipants(cls.maxParticipants || 40);
    setEditAdminRemarks(cls.adminRemarks || '');
  };

  const handleAddEditExternalRp = () => {
    const val = editExternalRpInput.trim();
    if (!val) return;
    if (!editExternalRpList.includes(val)) {
      setEditExternalRpList((prev) => [...prev, val]);
    }
    setEditExternalRpInput('');
  };

  const handleRemoveEditExternalRp = (idx: number) => {
    setEditExternalRpList((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleEditRpSelection = (empId: string) => {
    setEditSelectedRpEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const filteredEditRpOfficers = officersList.filter((o) => {
    if (!editRpSearchQuery.trim()) return true;
    const q = editRpSearchQuery.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.employeeId.toLowerCase().includes(q) ||
      (o.designation || '').toLowerCase().includes(q)
    );
  });

  const handleUpdateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCne || editSubmittingRef.current || isEditSubmitting) return;
    if (!canManageLifecycle(editingCne) || isCneClosed(editingCne)) { error('This CNE cannot be edited.'); return; }

    if (!editTopic.trim() || !editArea.trim() || !editDate.trim()) {
      error('Please fill in all required fields (Topic, Area, From Date & Time).');
      return;
    }
    const storedEditArea = String(editingCne.area || '').trim();
    const isEditAreaChanged = editArea.trim().toUpperCase() !== storedEditArea.toUpperCase();
    if (isEditAreaChanged && !activeAreaNames.has(editArea.trim().toUpperCase())) {
      error('This ward/area is currently inactive. Please select an active ward/area.');
      return;
    }
    if (!editToDate.trim()) {
      error('To Date & Time is required.');
      return;
    }

    const dFrom = parseCneStartTimestamp(editDate);
    const dTo = parseCneStartTimestamp(editToDate);
    if (!Number.isFinite(dFrom) || !Number.isFinite(dTo)) {
      error('Please enter valid From Date & Time and To Date & Time.');
      return;
    }
    if (dTo < dFrom) {
      error('To Date & Time cannot be earlier than From Date & Time.');
      return;
    }

    const durVal = validateCneDuration(editDuration, editDate, editToDate);
    if (!durVal.isValid) {
      error(durVal.message);
      return;
    }

    const originalTeachingMode = String(editingCne.modeOfTeaching || '').trim();
    const teachingModeChanged = editMode.trim().toLowerCase() !== originalTeachingMode.toLowerCase();
    if (teachingModeChanged && !activeTeachingModeNames.some((mode) => mode.toLowerCase() === editMode.trim().toLowerCase())) {
      error('The selected Teaching Mode is inactive. Please select an active Teaching Mode.');
      return;
    }

    if (editSelectedRpEmpIds.length === 0 && editExternalRpList.length === 0) {
      error('Please select at least one Resource Person (Internal or External).');
      return;
    }

    const rpNames = editSelectedRpEmpIds.map((id) => {
      const off = officerByEmployeeId.get(String(id || '').trim().toUpperCase());
      return off ? off.name : id;
    });
    if (editExternalRpList.length > 0) {
      rpNames.push(...editExternalRpList.map((n) => `${n} (External)`));
    }

    editSubmittingRef.current = true;
    setIsEditSubmitting(true);
    try {
      // NOTE: CNE ID is permanently immutable and cannot be changed or overwritten.
      const targetCneId = editingCne.cneId || editingCne.classId || '';
      const res = await ApiService.updateCNE(targetCneId, {
        topic: editTopic.trim(),
        area: editArea,
        cneType: editCneType,
        date: editDate,
        toDate: editToDate,
        duration: editDuration.trim(),
        resourcePersonEmpId: editSelectedRpEmpIds.join(', '),
        resourcePersonEmpIds: editSelectedRpEmpIds,
        resourcePersonName: rpNames.join(', '),
        externalResourcePersons: editExternalRpList,
        modeOfTeaching: editMode,
        description: editDescription.trim(),
        maxParticipants: editMaxParticipants,
        adminRemarks: editAdminRemarks.trim()
      } as any);

      if (res.success) {
        success('Upcoming CNE workshop updated successfully.', 'CNE Updated');
        const updatedRecord: CNERecord = {
          ...editingCne,
          cneId: targetCneId,
          topic: editTopic.trim(),
          area: editArea,
          cneType: editCneType,
          date: editDate,
          toDate: editToDate,
          duration: editDuration.trim(),
          resourcePersonEmpId: editSelectedRpEmpIds.join(', '),
          resourcePersonName: rpNames.join(', '),
          externalResourcePersons: editExternalRpList,
          modeOfTeaching: editMode,
          description: editDescription.trim(),
          maxParticipants: editMaxParticipants,
          adminRemarks: editAdminRemarks.trim()
        };
        setClasses((prev) =>
          prev.map((c) => (c.cneId === targetCneId ? updatedRecord : c))
        );
        if (selectedDetailCne?.cneId === targetCneId) {
          setSelectedDetailCne(updatedRecord);
        }
        setEditingCne(null);
      } else {
        if (res.errorCode === 'AREA_INACTIVE') {
          error('This ward/area is currently inactive. Please select an active ward/area.');
        } else if (res.errorCode === 'TEACHING_MODE_INACTIVE') {
          error('The selected Teaching Mode is inactive. Please select an active Teaching Mode.');
        } else {
          error(res.message || 'Failed to update CNE workshop.');
        }
      }
    } catch (err: any) {
      error(err?.message || 'Error updating CNE.');
    } finally {
      editSubmittingRef.current = false;
      setIsEditSubmitting(false);
    }
  };

  const officerByEmployeeId = useMemo(() => {
    const map = new Map<string, Employee>();
    officersList.forEach((officer) => {
      const id = String(officer.employeeId || '').trim().toUpperCase();
      if (id) {
        map.set(id, officer);
      }
    });
    return map;
  }, [officersList]);

  const getResourcePersonsDisplay = useCallback((cls: CNERecord) => {
    const internalNames = (cls.resourcePersonEmpId || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => {
        const off = officerByEmployeeId.get(id.toUpperCase());
        return off ? `${off.name} (${id})` : id;
      });
    const externalNames = (cls.externalResourcePersons || []).map((p) => `${p} (Ext)`);
    const all = [...internalNames, ...externalNames];
    return all.length > 0 ? all.join(', ') : cls.resourcePersonName || 'TBD';
  }, [officerByEmployeeId]);

  const hasActiveFilters = Boolean(searchTerm.trim() || fromDateFilter || toDateFilter);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFromDateFilter('');
    setToDateFilter('');
  };

  const handleCancelCne = async () => {
    if (!cancelTargetCne || isCancellingCne) return;
    if (!canManageLifecycle(cancelTargetCne) || isCneClosed(cancelTargetCne)) {
      error('You are not authorized to cancel this CNE.');
      return;
    }
    if (!cancelReason.trim()) {
      error('Please provide a reason for cancellation.');
      return;
    }

    setIsCancellingCne(true);
    try {
      const targetId = cancelTargetCne.cneId || cancelTargetCne.classId || '';
      const res = await ApiService.cancelCNE(targetId, cancelReason.trim());
      if (!res.success) {
        error(res.message || 'Failed to cancel CNE.');
        return;
      }
      success('CNE session marked as Canceled.');
      setCancelTargetCne(null);
      setCancelReason('');
      setSelectedDetailCne(null);
      await loadData();
    } catch (e: any) {
      error(e?.message || 'Failed to cancel CNE.');
    } finally {
      setIsCancellingCne(false);
    }
  };

  const canDeleteCne = user?.role === 'ADMIN';

  const handleDeleteCne = async () => {
    if (!canDeleteCne) {
      error('Only administrators are authorized to delete CNEs.');
      return;
    }
    if (!deleteTargetCne || isDeletingCne) return;
    const targetId = deleteTargetCne.cneId || deleteTargetCne.classId || '';
    if (deleteConfirmId !== targetId) {
      error('Confirmation CNE ID does not match.');
      return;
    }
    if (!deleteReason.trim()) {
      error('Please provide a deletion reason.');
      return;
    }

    setIsDeletingCne(true);
    try {
      const res = await ApiService.deleteCNE(targetId, deleteReason.trim(), deleteConfirmId);
      if (!res.success) {
        error(res.message || 'Failed to delete CNE.');
        return;
      }
      success('CNE deleted from active schedule and archived successfully.');
      setDeleteTargetCne(null);
      setDeleteReason('Schedule created by mistake');
      setDeleteConfirmId('');
      setSelectedDetailCne(null);
      await loadData();
    } catch (e: any) {
      error(e?.message || 'Failed to delete CNE.');
    } finally {
      setIsDeletingCne(false);
    }
  };

  const handleDownloadSessionReport = async (cne: CNERecord) => {
    if (isDownloadingReport || !isCneCompleted(cne) || !canOperateCne(cne)) return;
    setIsDownloadingReport(true);
    try {
      const cneId = cne.cneId || cne.classId || '';
      const res = await ApiService.getCNEParticipants(cneId);
      if (!res.success || !res.data) {
        error(res.message || 'Unable to load participant data for the session report.');
        return;
      }
      const { generateCNESessionPdf } = await import('../services/pdfGenerator');
      generateCNESessionPdf(cne, res.data.participants || [], res.data.averageScore ?? null);
      success('CNE session report PDF generated successfully.');
    } catch (e: any) {
      error(e?.message || 'Failed to generate CNE session report.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // All status/search/date filtering is enforced on the server BEFORE paging.
  // Do not re-filter partial history in the browser, which can create false
  // 'no records' messages for records not yet downloaded.
  const availableClasses = useMemo(() => classes.filter(canViewScheduleRecord), [classes, canViewScheduleRecord]);

  // Schedule Table Pagination: default 25 records per page, configurable
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever search or date filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch, fromDateFilter, toDateFilter]);

  const totalPages = Math.max(1, Math.ceil(availableClasses.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedClasses = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return availableClasses.slice(start, start + pageSize);
  }, [availableClasses, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-4 pb-12">
      {onBackToCalendar && (
        <button type="button" onClick={onBackToCalendar}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50">
          <ArrowLeft className="w-4 h-4" /> Back to Calendar
        </button>
      )}
      {/* Scheduled is the only default request; historical data loads on demand. */}
      {/* Compact CNE Schedule toolbar: Search | From Date | To Date | Clear | Schedule CNE */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Status and search/date filters share one responsive panel. */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 mb-3">
        <div className="hidden sm:flex flex-wrap gap-1" role="group" aria-label="CNE schedule status">
          {(['Scheduled','Completed','Canceled','ALL'] as const).map((status) => (
            <button type="button" key={status} onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${statusFilter === status ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
        <div className="sm:hidden">
          <label htmlFor="schedule-status-select" className="block mb-1 text-xs font-bold text-slate-600">CNE Status</label>
          <select id="schedule-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold">
            <option value="Scheduled">Scheduled</option><option value="Completed">Completed</option>
            <option value="Canceled">Canceled</option><option value="ALL">All</option>
          </select>
        </div>
        <p className="px-2 pt-2 text-xs text-slate-500">
          {statusFilter === 'Scheduled' ? 'All Scheduled CNEs are loaded together. Historical records are not fetched.' :
            `${historyTotal} authorized ${statusFilter === 'ALL' ? 'CNEs' : statusFilter.toLowerCase() + ' CNEs'} match; ${classes.length} loaded. Older records load on request.`}
        </p>
      </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-[300px] sm:min-w-[220px] min-w-0">
            <SearchInput
              id="filter-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <ConfirmDatePicker
              id="filter-from-date"
              value={fromDateFilter}
              onChange={setFromDateFilter}
              placeholder="From Date..."
              inlineLabel="From:"
              compact
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <ConfirmDatePicker
              id="filter-to-date"
              value={toDateFilter}
              onChange={setToDateFilter}
              minDate={fromDateFilter}
              placeholder="To Date..."
              inlineLabel="To:"
              compact
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              id="btn-clear-filters"
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Clear
            </button>
          )}

          {canScheduleCne && (
            <button
              id="btn-schedule-cne"
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setIsScheduleChoiceOpen(true);
                } else {
                  setIsDeptScheduleOpen(true);
                }
              }}
              className="sm:ml-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-teal-200" />
              <span>Schedule CNE</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <span className="text-xs font-medium">Loading {statusFilter === 'ALL' ? 'CNE history' : statusFilter + ' CNEs'}...</span>
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <p className="text-sm font-bold text-red-700">{loadError}</p>
            <button type="button" onClick={() => void loadData()} className="rounded-lg bg-red-700 px-4 py-2 text-white text-xs font-bold">Try Again</button>
          </div>
        ) : availableClasses.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
            <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              {hasActiveFilters ? 'No CNE records match the selected filters.' : `No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}CNEs available`}
            </h3>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try adjusting or clearing your search term or date range.'
                : statusFilter === 'Scheduled' ? 'Check back soon for the upcoming CNE training schedule.' : 'Select another status to see other CNE records.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isMobile ? (
              /* Mobile CNE Cards Layout */
              <div className="p-3.5 space-y-3 bg-slate-50/50">
                {paginatedClasses.map((cls, idx) => {
                  const rpDisplay = formatResourcePersonsDisplay({
                    resourcePersonEmpId: cls.resourcePersonEmpId,
                    resourcePersonName: cls.resourcePersonName,
                    externalResourcePersons: cls.externalResourcePersons,
                    officers: officerByEmployeeId
                  });

                  return (
                    <ScheduleMobileCard
                      key={cls.cneId ? `mobile-${cls.cneId}-${idx}` : `mobile-cne-${idx}`}
                      cne={cls}
                      user={user}
                      isAreaIncharge={isAreaIncharge}
                      rpDisplay={rpDisplay}
                      onOpenDetails={setSelectedDetailCne}
                    />
                  );
                })}
              </div>
            ) : (
              /* Desktop Schedule Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 whitespace-nowrap">Type of CNE</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Topic</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Area/Ward</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Date &amp; Time</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Resource Person</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {paginatedClasses.map((cls, idx) => {
                      const rpDisplay = formatResourcePersonsDisplay({
                        resourcePersonEmpId: cls.resourcePersonEmpId,
                        resourcePersonName: cls.resourcePersonName,
                        externalResourcePersons: cls.externalResourcePersons,
                        officers: officerByEmployeeId
                      });

                      return (
                        <ScheduleRow
                          key={cls.cneId ? `${cls.cneId}-${idx}` : `cne-class-${idx}`}
                          cls={cls}
                          idx={idx}
                          user={user}
                          isAreaIncharge={isAreaIncharge}
                          rpDisplay={rpDisplay}
                          onSelect={setSelectedDetailCne}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Schedule Table Pagination Controls */}
            {availableClasses.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="font-medium">
                    Showing <span className="font-bold text-slate-900">{(safeCurrentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-bold text-slate-900">{Math.min(safeCurrentPage * pageSize, availableClasses.length)}</span> of{' '}
                    <span className="font-bold text-slate-900">{availableClasses.length}</span> sessions
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>•</span>
                    <label htmlFor="schedule-page-size" className="text-slate-600 font-medium">Per page:</label>
                    <select
                      id="schedule-page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
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
            {historyHasMore && statusFilter !== 'Scheduled' && (
              <div className="border-t border-slate-200 bg-white px-4 py-3 text-center">
                <button type="button" onClick={() => void loadNextHistoryPage()} disabled={loadingMore}
                  className="rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                  {loadingMore ? 'Loading next 50...' : `Load next 50 (${Math.max(0, historyTotal - classes.length)} remaining)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Admin Schedule Class */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl w-[92vw] max-w-[1440px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Schedule Central CNE
                  </h3>
                  <p className="text-xs text-slate-500">
                    Publish training session to the institutional CNE Schedule
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddClassOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCNE} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Column 1: Classification & Topic */}
                  <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-2 flex items-center gap-1.5">
                      <span>1. Category & Curriculum</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Topic / Skills Training Subject *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pediatric Advanced Life Support & Defibrillator Handling"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Clinical Ward / Area *
                      </label>
                      <select
                        required
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">Select Area...</option>
                        {areasList.map((a, idx) => (
                          <option key={`area-opt-${a}-${idx}`} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Mode of Teaching
                      </label>
                      <select
                        value={newMode}
                        onChange={(e) => setNewMode(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        {activeTeachingModeNames.length === 0 ? (
                          <option value="">No active Teaching Modes available</option>
                        ) : (
                          activeTeachingModeNames.map((mode) => (
                            <option key={`central-teaching-mode-${mode}`} value={mode}>{mode}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Description / Prerequisites
                      </label>
                      <textarea
                        rows={3}
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Outline syllabus, target audience, or lab preparations..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Column 2: Date, Time & Logistics */}
                  <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-100 pb-2 flex items-center gap-1.5">
                      <span>2. Date & Schedule</span>
                    </h4>

                    <CneDateTimeFields
                      idPrefix="central-cne"
                      fromDate={scheduleFromDate}
                      fromTime={scheduleFromTime}
                      toDate={scheduleToDate}
                      toTime={scheduleToTime}
                      minDate={todayStr}
                onChange={({  fromDate,  fromTime,  toDate,  toTime,  fullFrom,  fullTo,  calculatedDuration}) => {
                  setScheduleFromDate(fromDate);
                  setScheduleFromTime(fromTime);
                  setScheduleToDate(toDate);
                  setScheduleToTime(toTime);

                // Keep submission values synchronized with visible date/time fields.
                setNewDate(fullFrom);
                setNewToDate(fullTo);

                setNewDuration(calculatedDuration || '00:00:00');
              }}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Duration (HH:MM:SS) *
                        </label>
                        <span className="text-[10px] text-indigo-600 font-semibold">Auto-calculated • Editable</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        placeholder="00:00:00"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Calculated from From/To dates. Max 8 hours per calendar day. Format: HH:MM:SS
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Max Participant Seats
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={200}
                        value={newMaxParticipants}
                        onChange={(e) => setNewMaxParticipants(parseInt(e.target.value, 10))}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Column 3: Resource Persons Multi-Select */}
                  <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 border-b border-teal-100 pb-2 flex items-center justify-between">
                      <span>3. Resource Persons</span>
                      <span className="text-[10px] text-slate-500 font-semibold lowercase">
                        {selectedRpEmpIds.length} selected
                      </span>
                    </h4>

                    {/* Internal Resource Persons Multi-Select */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <span>Internal Faculty</span>
                          {isResourcePersonsLoading && (
                            <Loader2 className="w-3 h-3 text-teal-600 animate-spin" />
                          )}
                        </label>
                      </div>

                      {/* Selected RP Tags */}
                      {selectedRpEmpIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                          {selectedRpEmpIds.map((empId, idx) => {
                            const officer = officerByEmployeeId.get(String(empId || '').trim().toUpperCase());
                            return (
                              <span
                                key={`sel-rp-${empId}-${idx}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200"
                              >
                                <span>{empId} - {officer ? officer.name : ''}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleRpSelection(empId)}
                                  className="hover:text-rose-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Search input for officers */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={isResourcePersonsLoading ? "Loading Resource Persons..." : "Filter officers by name or ID..."}
                          disabled={isResourcePersonsLoading}
                          value={rpSearchQuery}
                          onChange={(e) => setRpSearchQuery(e.target.value)}
                          className="w-full p-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        {isResourcePersonsLoading && (
                          <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin absolute right-2.5 top-2.5" />
                        )}
                      </div>

                      {/* Officers Dropdown / Selection List */}
                      <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 flex-1">
                        {isResourcePersonsLoading ? (
                          <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                            <span>Loading Resource Persons...</span>
                          </div>
                        ) : filteredRpOfficers.length === 0 ? (
                          <div className="p-2 text-center text-xs text-slate-400">No officers found</div>
                        ) : (
                          filteredRpOfficers.slice(0, 10).map((officer, idx) => {
                            const isSelected = selectedRpEmpIds.includes(officer.employeeId);
                            return (
                              <div
                                key={`rp-off-${officer.employeeId || idx}-${idx}`}
                                onClick={() => toggleRpSelection(officer.employeeId)}
                                className={`flex items-center justify-between p-1.5 text-xs cursor-pointer transition-colors ${
                                  isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  
                                  <span className="truncate">
                                    {officer.name} ({officer.employeeId})
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-teal-700 shrink-0" aria-hidden="true">{isSelected ? "✓" : "+"}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* External Resource Persons */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          External Resource Persons
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Dr. A. Sen (Visiting Faculty)..."
                          value={newExternalRpInput}
                          onChange={(e) => setNewExternalRpInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddExternalRp();
                            }
                          }}
                          className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddExternalRp}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold rounded-lg text-xs cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                      {newExternalRpList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {newExternalRpList.map((rp, idx) => (
                            <span
                              key={`new-ext-rp-${rp}-${idx}`}
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200"
                            >
                              <span>{rp} (External)</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExternalRp(idx)}
                                className="hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end bg-slate-50/70 shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Publishing Schedule...</span>
                    </>
                  ) : (
                    <span>Publish Schedule</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Part 2 Modals */}
      {/* Modal: CNE Details & Actions (Extracted to CneDetailsModal & ProgressPanel) */}
      {selectedDetailCne && (
        <CneDetailsModal
          cne={selectedDetailCne}
          user={user}
          officerByEmployeeId={officerByEmployeeId}
          activityProgress={activityProgress}
          isActivityLoading={isActivityLoading}
          activityError={activityError}
          isDownloadingReport={isDownloadingReport}
          canOperate={canOperateCne(selectedDetailCne)}
          canLifecycle={canManageLifecycle(selectedDetailCne)}
          canManagePostTest={canManageCneActions(user, selectedDetailCne)}
          canDeleteCne={canDeleteCne}
          disabled={!canManageCneActions(user, selectedDetailCne)}
          onClose={() => setSelectedDetailCne(null)}
          onBackToCalendar={onBackToCalendar}
          onDownloadSessionReport={handleDownloadSessionReport}
          onEdit={handleOpenEditModal}
          onCancel={(cne) => {
            setCancelTargetCne(cne);
            setCancelReason('');
          }}
          onDelete={(cne) => {
            setDeleteTargetCne(cne);
            setDeleteReason('Schedule created by mistake');
            setDeleteConfirmId('');
          }}
          onRetryProgress={() => {
            if (selectedDetailCne?.cneId) {
              fetchActivityProgress(selectedDetailCne.cneId);
            }
          }}
          onOpenMaterial={(cne) => setActiveReferenceCne(cne)}
          onOpenQuestions={(cne) => setActiveQuestionsCne(cne)}
          onOpenQR={(cne) => setActiveQRCne(cne)}
          onOpenPostTest={(cne) => setActivePostTest({ cneId: cne.cneId })}
          onOpenParticipants={(cne) => setActiveParticipantsCne(cne)}
          onOpenFinalize={(cne) => setActiveFinalizeCne(cne)}
        />
      )}

      {/* Modal: Edit CNE (Wide Horizontal Layout) */}
      {editingCne && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl w-[92vw] max-w-[1440px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Edit CNE Workshop
                    </h3>
                    <span className="font-mono text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>CNE ID: {editingCne.cneId} (Immutable)</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Update workshop curriculum and resource persons. The CNE ID is permanently immutable.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingCne(null)}
                disabled={isEditSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClassSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Column 1: Classification & Topic */}
                  <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-100 pb-2 flex items-center gap-1.5">
                      <span>1. Topic & Department</span>
                    </h4>

                    {/* CNE Category / Type (Read-only during edit) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        CNE Category / Type
                      </label>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {getCneTypeLabel(editCneType)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {editCneType === 'CENTRAL' ? 'Hospital-wide clinical seminar' : editCneType === 'DEPARTMENTAL' ? 'Ward / ICU / Unit-specific' : 'External CNE Program'}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded border border-slate-300">
                          Read-only
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Topic Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        placeholder="e.g., Advanced Ventilator Nursing Protocols"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Target Area / Department *
                        </label>
                        {editingCne?.area && !activeAreaNames.has(editingCne.area.trim().toUpperCase()) && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Current Area: {editingCne.area.trim()} (Inactive)
                          </span>
                        )}
                      </div>
                      <select
                        required
                        value={editArea}
                        onChange={(e) => setEditArea(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                      >
                        <option value="">Select Area / Unit</option>
                        {editingCne?.area &&
                          !activeAreaNames.has(editingCne.area.trim().toUpperCase()) && (
                            <option value={editingCne.area}>
                              {editingCne.area.trim()} (Inactive) — current
                            </option>
                          )}
                        {(isAdmin ? areasList : selectableAssignedAreas).map((a, idx) => (
                          <option key={`edit-area-opt-${a}-${idx}`} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Session Description / Objectives
                      </label>
                      <textarea
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Clinical objectives, scope, target audience..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Column 2: Date, Time & Logistics */}
                  <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-100 pb-2 flex items-center gap-1.5">
                      <span>2. Scheduling & Logistics</span>
                    </h4>

                    <CneDateTimeFields
                      idPrefix="edit-cne"
                      fromDate={editDate ? editDate.split('T')[0] : ''}
                      fromTime={editDate && editDate.includes('T') ? editDate.split('T')[1].substring(0, 5) : '09:00'}
                      toDate={editToDate ? editToDate.split('T')[0] : (editDate ? editDate.split('T')[0] : '')}
                      toTime={editToDate && editToDate.includes('T') ? editToDate.split('T')[1].substring(0, 5) : '10:30'}
                      onChange={({ fullFrom, fullTo, calculatedDuration }) => {
                        setEditDate(fullFrom);
                        setEditToDate(fullTo);
                        if (calculatedDuration && calculatedDuration !== '00:00:00') {
                          setEditDuration(calculatedDuration);
                        }
                      }}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Duration (HH:MM:SS) *
                        </label>
                        <span className="text-[10px] text-amber-700 font-semibold">Auto-calculated • Editable</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        placeholder="01:30:00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Calculated from From/To dates. Max 8 hours per calendar day. Format: HH:MM:SS
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Mode of Teaching
                      </label>
                      <select
                        required
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                      >
                        {editTeachingModeOptions.length === 0 ? (
                          <option value="">No active Teaching Modes available</option>
                        ) : (
                          editTeachingModeOptions.map((option) => (
                            <option key={`edit-teaching-mode-${option.name}`} value={option.name}>
                              {option.inactiveCurrent ? `${option.name} (Current — Inactive)` : option.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Max Capacity: ONLY for Central CNE */}
                    {editCneType === 'CENTRAL' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Max Capacity
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={editMaxParticipants}
                            onChange={(e) => setEditMaxParticipants(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Admin Remarks
                          </label>
                          <input
                            type="text"
                            value={editAdminRemarks}
                            onChange={(e) => setEditAdminRemarks(e.target.value)}
                            placeholder="Internal notes..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Admin Remarks
                        </label>
                        <input
                          type="text"
                          value={editAdminRemarks}
                          onChange={(e) => setEditAdminRemarks(e.target.value)}
                          placeholder="Internal notes..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Column 3: Resource Persons Selection */}
                  <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 border-b border-teal-100 pb-2 flex items-center justify-between">
                      <span>3. Resource Persons</span>
                      <span className="text-[10px] text-slate-500 font-semibold lowercase">
                        {editSelectedRpEmpIds.length} internal selected
                      </span>
                    </h4>

                    <div className="space-y-2 flex-1 flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                        <span>Internal Faculty:</span>
                        {isResourcePersonsLoading && (
                          <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                        )}
                      </span>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={isResourcePersonsLoading ? "Loading Resource Persons..." : "Search officer by name or ID..."}
                          disabled={isResourcePersonsLoading}
                          value={editRpSearchQuery}
                          onChange={(e) => setEditRpSearchQuery(e.target.value)}
                          className="w-full px-2.5 py-1.5 pr-8 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        {isResourcePersonsLoading && (
                          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin absolute right-2.5 top-2" />
                        )}
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2 flex-1">
                        {isResourcePersonsLoading ? (
                          <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            <span>Loading Resource Persons...</span>
                          </div>
                        ) : filteredEditRpOfficers.length === 0 ? (
                          <div className="p-2 text-center text-xs text-slate-400">No officers found</div>
                        ) : (
                          filteredEditRpOfficers.slice(0, 40).map((o, idx) => {
                            const isSelected = editSelectedRpEmpIds.includes(o.employeeId);
                            return (
                              <div
                                key={`edit-rp-off-${o.employeeId || idx}-${idx}`}
                                onClick={() => toggleEditRpSelection(o.employeeId)}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                                  isSelected ? 'bg-amber-50 text-amber-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="truncate">
                                  {o.name} ({o.employeeId})
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="rounded text-amber-600 pointer-events-none"
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        External Resource Persons:
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Enter external faculty name"
                          value={editExternalRpInput}
                          onChange={(e) => setEditExternalRpInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEditExternalRp();
                            }
                          }}
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddEditExternalRp}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      {editExternalRpList.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {editExternalRpList.map((p, idx) => (
                            <span
                              key={`edit-ext-rp-${p}-${idx}`}
                              className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md"
                            >
                              {p} (Ext)
                              <button
                                type="button"
                                onClick={() => handleRemoveEditExternalRp(idx)}
                                className="text-slate-500 hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end bg-slate-50/70 shrink-0">
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Suspense fallback={null}>
      {activeReferenceCne && (
        <CNEReferenceModal
          cne={activeReferenceCne}
          isAuthorized={canOperateCne(activeReferenceCne) && !isCneClosed(activeReferenceCne)}
          onClose={() => setActiveReferenceCne(null)}
          onUpdated={() => handleChildModalUpdated(activeReferenceCne.cneId || activeReferenceCne.classId)}
          onNavigateToQuestions={() => {
            const currentCne = activeReferenceCne;
            setActiveReferenceCne(null);
            setActiveQuestionsCne(currentCne);
          }}
        />
      )}

      {activeQuestionsCne && (
        <CNEQuestionsModal
          cne={activeQuestionsCne}
          isAuthorized={canOperateCne(activeQuestionsCne) && !isCneClosed(activeQuestionsCne)}
          onClose={() => {
            setActiveQuestionsCne(null);
          }}
          onUpdated={() => handleChildModalUpdated(activeQuestionsCne.cneId || activeQuestionsCne.classId)}
          onNavigateToQR={() => {
            const currentCne = activeQuestionsCne;
            setActiveQuestionsCne(null);
            if (canOperateCne(currentCne) && !isCneClosed(currentCne)) setActiveQRCne(currentCne);
          }}
        />
      )}

      {activeQRCne && (
        <CNEQRModal
          cne={activeQRCne}
          isAuthorized={canOperateCne(activeQRCne) && !isCneClosed(activeQRCne)}
          onClose={() => {
            const targetId = activeQRCne.cneId || activeQRCne.classId;
            setActiveQRCne(null);
            handleChildModalUpdated(targetId);
          }}
          onSaveSuccess={(savedCneId) => {
            setActiveQRCne(null);
            handleChildModalUpdated(savedCneId);
          }}
          onOpenPostTest={(tok) => {
            if (!canOperateCne(activeQRCne) || isCneClosed(activeQRCne)) return;
            const targetId = activeQRCne.cneId || activeQRCne.classId;
            setActiveQRCne(null);
            setActivePostTest({ cneId: targetId, qrToken: tok });
          }}
        />
      )}

      {activeParticipantsCne && (
        <CNEParticipantsModal
          cne={activeParticipantsCne}
          isAuthorized={canOperateCne(activeParticipantsCne) && !isCneClosed(activeParticipantsCne)}
          officersList={officersList}
          onClose={() => setActiveParticipantsCne(null)}
          onUpdated={() => handleChildModalUpdated(activeParticipantsCne.cneId || activeParticipantsCne.classId)}
        />
      )}

      {activeFinalizeCne && (
        <CNEFinalizeModal
          cne={activeFinalizeCne}
          isAuthorized={canManageLifecycle(activeFinalizeCne) && !isCneClosed(activeFinalizeCne)}
          onClose={() => setActiveFinalizeCne(null)}
          onCompleted={() => {
            const targetId = activeFinalizeCne.cneId || activeFinalizeCne.classId;
            setActiveFinalizeCne(null);
            handleChildModalUpdated(targetId);
          }}
        />
      )}

      {activePostTest && (
        <CNEPostTestModal
          cneId={activePostTest.cneId}
          qrToken={activePostTest.qrToken}
          user={user}
          onClose={() => setActivePostTest(null)}
          onSubmitted={() => handleChildModalUpdated(activePostTest.cneId)}
        />
      )}

      {cancelTargetCne && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/65 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] min-h-0 flex flex-col bg-white rounded-2xl border border-rose-200 shadow-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 shrink-0 border-b border-slate-200 bg-rose-50/70 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Cancel CNE</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{cancelTargetCne.topic}</div>
              </div>
              <button
                type="button"
                onClick={() => { setCancelTargetCne(null); setCancelReason(''); }}
                disabled={isCancellingCne}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-contain">
              <p className="text-xs text-slate-600 leading-relaxed">
                This will mark the programme as <strong>Canceled</strong>. The record will remain available only to authorized users for audit and reporting.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cancellation Reason *</label>
                <textarea
                  rows={4}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter the reason for cancellation..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                />
              </div>
            </div>
            <div className="shrink-0 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setCancelTargetCne(null); setCancelReason(''); }}
                  disabled={isCancellingCne}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCancelCne}
                  disabled={isCancellingCne || !cancelReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCancellingCne ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{isCancellingCne ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
          </div>
        </div>
      )}

      {deleteTargetCne && (
        <DeleteCneModal
          cne={deleteTargetCne}
          user={user}
          isOpen={Boolean(deleteTargetCne)}
          isDeleting={isDeletingCne}
          reason={deleteReason}
          onReasonChange={setDeleteReason}
          confirmId={deleteConfirmId}
          onConfirmIdChange={setDeleteConfirmId}
          onClose={() => {
            if (!isDeletingCne) {
              setDeleteTargetCne(null);
              setDeleteReason('Schedule created by mistake');
              setDeleteConfirmId('');
            }
          }}
          onConfirmDelete={handleDeleteCne}
        />
      )}

      {isDeptScheduleOpen && (
        <DepartmentalScheduleModal
          isOpen={isDeptScheduleOpen}
          onClose={() => setIsDeptScheduleOpen(false)}
          user={user}
          areasList={areasList}
          teachingModes={activeTeachingModeNames}
          officersList={officersList}
          isOfficersLoading={isResourcePersonsLoading}
          onOfficersLoaded={(fresh) => setOfficersList(fresh)}
          onSuccess={loadData}
        />
      )}

      {isUnscheduledOpen && (
        <AddUnscheduledCneModal
          isOpen={isUnscheduledOpen}
          onClose={() => setIsUnscheduledOpen(false)}
          onSuccess={() => loadData()}
          areasList={areasList}
          teachingModes={activeTeachingModeNames}
          officersList={officersList}
          user={user}
        />
      )}
      </Suspense>

      {/* Schedule CNE Choice Modal (Admin Only) */}
      {isAdmin && isScheduleChoiceOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Schedule CNE</h3>
                  <p className="text-xs text-slate-500">Select CNE program classification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleChoiceOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Departmental CNE Option */}
              <button
                type="button"
                id="btn-choice-departmental-cne"
                onClick={() => {
                  setIsScheduleChoiceOpen(false);
                  setIsDeptScheduleOpen(true);
                }}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="p-2.5 rounded-lg bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-slate-900 group-hover:text-teal-900 flex items-center justify-between">
                    <span>Departmental CNE</span>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">Unit / Ward</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Schedule department-level clinical education sessions for specialized hospital units and clinical wards.
                  </p>
                </div>
              </button>

              {/* Central CNE Option */}
              <button
                type="button"
                id="btn-choice-central-cne"
                onClick={() => {
                  setIsScheduleChoiceOpen(false);
                  setNewDuration('00:00:00');
                  setIsAddClassOpen(true);
                }}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-slate-900 group-hover:text-purple-900 flex items-center justify-between">
                    <span>Central CNE</span>
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">Institutional</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Schedule hospital-wide institutional workshops, nursing masterclasses, and auditorium seminars.
                  </p>
                </div>
              </button>

              {/* Unscheduled CNE Option */}
              <button
                type="button"
                id="btn-choice-unscheduled-cne"
                onClick={() => {
                  setIsScheduleChoiceOpen(false);
                  setIsUnscheduledOpen(true);
                }}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900 flex items-center justify-between">
                    <span>Unscheduled CNE Data</span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">Ad-Hoc / Past</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Record completed ad-hoc bedside training, simulation drills, or retrospective CNE sessions with staff rosters.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
