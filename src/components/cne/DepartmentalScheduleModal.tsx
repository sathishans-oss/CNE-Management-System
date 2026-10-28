import React, { useState, useRef, useMemo } from 'react';
import { Plus, Trash2, Loader2, X, PlusCircle } from 'lucide-react';
import { DepartmentalScheduleRow, Employee, SessionUser } from '../../types';
import { ApiService } from '../../services/api';
import { getCachedOfficers, loadOfficersSingleFlight, isOfficersInFlight } from '../../services/officerLoader';
import { useToast } from '../Toast';
import { getUserAssignedAreas, validateCneDuration,
  parseCneStartTimestamp
} from '../../utils';
import { CneDateTimeFields } from './CneDateTimeFields';
import { WardMultiSelect, WardStaffCounts } from './WardMultiSelect';
import { DropdownRetry } from './DropdownRetry';

function parseDateTimeParts(dateTimeStr?: string, defaultTime: string = '09:00') {
  if (!dateTimeStr) return { date: '', time: defaultTime };
  if (dateTimeStr.includes('T')) {
    const [d, t] = dateTimeStr.split('T');
    return { date: d, time: t.substring(0, 5) || defaultTime };
  }
  return { date: dateTimeStr, time: defaultTime };
}

interface DepartmentalScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser | null;
  areasList: string[];
  staffCounts: WardStaffCounts;
  wardLoading: boolean;
  wardError: string;
  onRetryWards: () => void;
  teachingModes: string[];
  officersList: Employee[];
  isOfficersLoading?: boolean;
  onOfficersLoaded?: (officers: Employee[]) => void;
  onSuccess: () => void;
}

const createInitialRow = (userArea: string = '', teachingMode: string = ''): DepartmentalScheduleRow => ({
  id: `dept-row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  topic: '',
  area: userArea,
  date: '',
  toDate: '',
  duration: '00:00:00',
  resourcePersonEmpId: '',
  resourcePersonEmpIds: [],
  resourcePersonName: '',
  externalResourcePersons: [],
  modeOfTeaching: teachingMode,
  description: '',
  adminRemarks: ''
});

/**
 * Keep one client-generated submission identifier for an uncertain publish.
 * sessionStorage survives modal remounts/reloads in this browser tab. The
 * fingerprint binds the identifier to the exact selected scheduling payload;
 * the backend independently binds it to the authenticated creator and SHA-256
 * digest of its authoritative validated inputs.
 */
function newDepartmentalSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function departmentalPayloadFingerprint(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function departmentalSubmissionStorageKey(employeeId: string): string {
  return `cne_pending_departmental_submission_${employeeId.trim().toUpperCase()}`;
}

export const DepartmentalScheduleModal: React.FC<DepartmentalScheduleModalProps> = ({
  isOpen,
  onClose,
  user,
  areasList,
  staffCounts,
  wardLoading,
  wardError,
  onRetryWards,
  teachingModes,
  officersList,
  isOfficersLoading: isOfficersLoadingProp,
  onOfficersLoaded,
  onSuccess
}) => {
  const { success, error } = useToast();
  const isAreaIncharge = user?.role === 'AREA_INCHARGE' || user?.role === 'INCHARGE';
  const assignedAreas = getUserAssignedAreas(user);
  const activeAreaNames = useMemo(
    () => new Set(areasList.map((areaName) => String(areaName || '').trim().toUpperCase()).filter(Boolean)),
    [areasList]
  );
  const selectableAssignedAreas = useMemo(
    () => assignedAreas.filter((name) => activeAreaNames.has(String(name || '').trim().toUpperCase())),
    [assignedAreas, activeAreaNames]
  );
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [primaryWard, setPrimaryWard] = useState('');
  const staffCountError = wardError;
  const eligiblePrimaryWards = isAreaIncharge ? selectableAssignedAreas : areasList;
  const handleWardChange = (next: string[], primary: string) => {
    setSelectedWards(next);
    setPrimaryWard(primary);
    setRows((prev) => prev.map((r) => ({ ...r, area: primary, participatingWards: next })));
  };
  const defaultTeachingMode = useMemo(() => {
    const lecture = teachingModes.find((name) => name.trim().toLowerCase() === 'lecture cum discussion');
    return lecture || teachingModes[0] || '';
  }, [teachingModes]);
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  // Initially show exactly 1 blank CNE schedule row
  const [rows, setRows] = useState<DepartmentalScheduleRow[]>([
    createInitialRow('', defaultTeachingMode)
  ]);
  const [internalOfficers, setInternalOfficers] = useState<Employee[]>(() => {
    if (officersList && officersList.length > 0) return officersList;
    return getCachedOfficers() || [];
  });
  const [resourcePersonsError, setResourcePersonsError] = useState('');
  const [isResourcePersonsLoading, setIsResourcePersonsLoading] = useState<boolean>(() => {
    const cached = getCachedOfficers() || [];
    if ((officersList && officersList.length > 0) || cached.length > 0) return false;
    return isOfficersLoadingProp ?? isOfficersInFlight();
  });
  const onOfficersLoadedRef = useRef(onOfficersLoaded);
  onOfficersLoadedRef.current = onOfficersLoaded;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const pendingSubmissionRef = useRef<{ fingerprint: string; submissionId: string; createdAt?: number } | null>(null);

  const [extRpInputMap, setExtRpInputMap] = useState<Record<string, string>>({});
  const [rpSearchMap, setRpSearchMap] = useState<Record<string, string>>({});

  // Sync internal officers when prop updates
  React.useEffect(() => {
    if (officersList && officersList.length > 0) {
      setInternalOfficers(officersList);
      setResourcePersonsError('');
      setIsResourcePersonsLoading(false);
    }
  }, [officersList]);

  // Sync loading state if passed from parent
  React.useEffect(() => {
    const cached = getCachedOfficers() || [];
    if (isOfficersLoadingProp !== undefined && (!officersList || officersList.length === 0) && cached.length === 0) {
      setIsResourcePersonsLoading(isOfficersLoadingProp);
    }
  }, [isOfficersLoadingProp, officersList]);

  // Load internal officers using shared single-flight loader if not yet available
  React.useEffect(() => {
    if (!isOpen) return;

    const cached = getCachedOfficers();
    if (cached && cached.length > 0) {
      setInternalOfficers(cached);
      setIsResourcePersonsLoading(false);
      return;
    }

    if (officersList && officersList.length > 0) {
      setInternalOfficers(officersList);
      setResourcePersonsError('');
      setIsResourcePersonsLoading(false);
      return;
    }

    let cancelled = false;
    setIsResourcePersonsLoading(true);
    setResourcePersonsError('');
    loadOfficersSingleFlight()
      .then((officers) => {
        if (cancelled) return;
        if (!officers.length) throw new Error('Resource Person roster is empty.');
        setInternalOfficers(officers);
        setResourcePersonsError('');
        onOfficersLoadedRef.current?.(officers);
      })
      .catch((err: any) => {
        if (!cancelled) setResourcePersonsError(err?.message || 'Unable to load Resource Persons.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsResourcePersonsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, officersList]);

  const retryResourcePersons = async () => {
    if (isResourcePersonsLoading) return;
    setIsResourcePersonsLoading(true);
    setResourcePersonsError('');
    try {
      const officers = await loadOfficersSingleFlight(true);
      if (!officers.length) throw new Error('No Resource Persons returned.');
      setInternalOfficers(officers);
      onOfficersLoadedRef.current?.(officers);
    } catch (err: any) {
      setResourcePersonsError(err?.message || 'Unable to load Resource Persons.');
    } finally {
      setIsResourcePersonsLoading(false);
    }
  };

  const effectiveOfficers = (officersList && officersList.length > 0)
    ? officersList
    : (internalOfficers.length > 0 ? internalOfficers : (getCachedOfficers() || []));

  // Reset to exactly 1 blank schedule row whenever modal is opened
  React.useEffect(() => {
    let active = true;
    if (isOpen) {
      setRows([createInitialRow('', defaultTeachingMode)]);
      setSelectedWards([]);
      setPrimaryWard('');
      setExtRpInputMap({});
      setRpSearchMap({});
      pendingSubmissionRef.current = null;
      // A closed/reopened form must not silently forget a previous uncertain
      // request. Its ID remains in sessionStorage and is reused if the same
      // fields are resubmitted. Check status without publishing again.
      try {
        const saved = sessionStorage.getItem(departmentalSubmissionStorageKey(user?.employeeId || ''));
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && typeof parsed.submissionId === 'string' && typeof parsed.fingerprint === 'string') {
          pendingSubmissionRef.current = parsed;
          void ApiService.getDepartmentalScheduleSubmissionStatus(parsed.submissionId).then(status => {
            if (!active) return;
            if (status.success && status.data?.status === 'COMMITTED') {
              try { sessionStorage.removeItem(departmentalSubmissionStorageKey(user?.employeeId || '')); } catch (_) {}
              pendingSubmissionRef.current = null;
              success('Your previous Departmental CNE submission was saved successfully. No duplicate was created.', 'Schedule Recovered');
              onSuccess();
              onClose();
            }
          }).catch(() => {});
        }
      } catch (_) {}
    }
    return () => { active = false; };
  }, [isOpen, defaultTeachingMode, user?.employeeId]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows((prev) => [...prev, { ...createInitialRow(primaryWard, defaultTeachingMode), participatingWards: [...selectedWards] }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      error('At least one schedule row is required.');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRowRpSelection = (rowIndex: number, empId: string) => {
    setRows((prev) => {
      const updated = [...prev];
      const r = updated[rowIndex];
      const currentIds = (r.resourcePersonEmpIds && r.resourcePersonEmpIds.length > 0)
        ? r.resourcePersonEmpIds
        : (r.resourcePersonEmpId ? r.resourcePersonEmpId.split(',').map((s) => s.trim()).filter(Boolean) : []);
      let nextIds: string[];
      if (currentIds.includes(empId)) {
        nextIds = currentIds.filter((id) => id !== empId);
      } else {
        nextIds = [...currentIds, empId];
      }
      const rpNames = nextIds.map((id) => {
        const off = effectiveOfficers.find((o) => o.employeeId === id);
        return off ? off.name : id;
      });
      updated[rowIndex] = {
        ...r,
        resourcePersonEmpIds: nextIds,
        resourcePersonEmpId: nextIds.join(', '),
        resourcePersonName: rpNames.join(', ')
      };
      return updated;
    });
  };

  const handleFieldChange = (index: number, field: keyof DepartmentalScheduleRow, value: any) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddExternalRp = (rowId: string, index: number) => {
    const raw = (extRpInputMap[rowId] || '').trim();
    if (!raw) return;
    const currentList = rows[index].externalResourcePersons || [];
    if (!currentList.includes(raw)) {
      handleFieldChange(index, 'externalResourcePersons', [...currentList, raw]);
    }
    setExtRpInputMap((prev) => ({ ...prev, [rowId]: '' }));
  };

  const handleRemoveExternalRp = (rowIndex: number, rpIndex: number) => {
    const currentList = rows[rowIndex].externalResourcePersons || [];
    handleFieldChange(
      rowIndex,
      'externalResourcePersons',
      currentList.filter((_, i) => i !== rpIndex)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) return;

    if (!selectedWards.length || !primaryWard) {
      error('Select a Primary Ward from your authorized wards, and at least one participating ward.');
      return;
    }
    // Validation. Use the India-local calendar date rather than UTC so the rule is stable before 05:30 IST.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      if (!r.topic.trim()) {
        error(`Row #${rowNum}: Topic is required.`);
        return;
      }
      if (!r.area.trim()) {
        if (isAreaIncharge && selectableAssignedAreas.length === 0 && assignedAreas.length > 0) {
          error('This ward/area is currently inactive. Please select an active ward/area.');
        } else {
          error(`Row #${rowNum}: Area/Department is required.`);
        }
        return;
      }
      if (!activeAreaNames.has(r.area.trim().toUpperCase())) {
        error('This ward/area is currently inactive. Please select an active ward/area.');
        return;
      }
      if (!r.modeOfTeaching.trim() || !teachingModes.some((mode) => mode.toLowerCase() === r.modeOfTeaching.trim().toLowerCase())) {
        error(`Row #${rowNum}: Please select an active Teaching Mode.`);
        return;
      }
      if (isAreaIncharge && !selectableAssignedAreas.some((a) => String(a || '').trim().toLowerCase() === r.area.trim().toLowerCase())) {
        error(`Row #${rowNum}: You are not authorized to schedule for "${r.area}". Authorized areas: ${selectableAssignedAreas.join(', ') || 'None'}`);
        return;
      }
      if (!r.date) {
        error(`Row #${rowNum}: From Date & Time is required.`);
        return;
      }
      if (!r.toDate) {
        error(`Row #${rowNum}: To Date & Time is required.`);
        return;
      }

      const dFrom = parseCneStartTimestamp(r.date);
      const dTo = parseCneStartTimestamp(r.toDate);
      if (!Number.isFinite(dFrom) || !Number.isFinite(dTo)) {
        error(`Row #${rowNum}: Please enter valid From Date & Time and To Date & Time.`);
        return;
      }
      if (dTo < dFrom) {
        error(`Row #${rowNum}: To Date & Time cannot be earlier than From Date & Time.`);
        return;
      }

      const fromDatePart = parseDateTimeParts(r.date).date;
      if (fromDatePart && fromDatePart < todayStr) {
        error(`Row #${rowNum}: Scheduled From Date cannot be in the past.`);
        return;
      }

      const durVal = validateCneDuration(r.duration, r.date, r.toDate);
      if (!durVal.isValid) {
        error(`Row #${rowNum}: ${durVal.message}`);
        return;
      }

      const hasInternalRp = (r.resourcePersonEmpIds && r.resourcePersonEmpIds.length > 0) || !!String(r.resourcePersonEmpId || '').trim();
      const hasExtRp = (r.externalResourcePersons && r.externalResourcePersons.length > 0);
      if (!hasInternalRp && !hasExtRp) {
        error(`Row #${rowNum}: Please assign at least one Resource Person (Internal or External).`);
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = rows.map((r) => {
        const rpIds = (r.resourcePersonEmpIds && r.resourcePersonEmpIds.length > 0)
          ? r.resourcePersonEmpIds
          : String(r.resourcePersonEmpId || '')
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean);
        const rpNames = rpIds.map((id) => {
          const off = effectiveOfficers.find((o) => o.employeeId === id);
          return off ? off.name : id;
        });
        if (r.externalResourcePersons && r.externalResourcePersons.length > 0) {
          rpNames.push(...r.externalResourcePersons.map((n) => `${n} (External)`));
        }

        return {
          topic: r.topic.trim(),
          area: primaryWard,
          participatingWards: [...selectedWards],
          cneType: 'DEPARTMENTAL',
          date: r.date,
          toDate: r.toDate,
          duration: r.duration.trim() || '00:00:00',
          resourcePersonEmpId: rpIds.join(', '),
          resourcePersonEmpIds: rpIds,
          resourcePersonName: rpNames.join(', '),
          externalResourcePersons: r.externalResourcePersons || [],
          modeOfTeaching: r.modeOfTeaching || '',
          description: r.description?.trim() || '',
          proposedByEmpId: user?.employeeId,
          proposedByName: user?.name,
          adminRemarks: r.adminRemarks?.trim() || ''
        };
      });

      const fingerprint = await departmentalPayloadFingerprint(payload);
      const storageKey = departmentalSubmissionStorageKey(user?.employeeId || '');
      let pending = pendingSubmissionRef.current;
      let reusedPending = !!pending && pending.fingerprint === fingerprint;
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.fingerprint === fingerprint && typeof parsed.submissionId === 'string') {
            pending = parsed;
            reusedPending = true;
          }
        }
      } catch (_) { /* in-memory fallback for disabled browser storage */ }
      if (pending && pending.fingerprint !== fingerprint) {
        // Do not turn a refreshed/reopened, still-uncertain submission into a
        // second batch simply because the form fields were re-entered.
        const previous = await ApiService.getDepartmentalScheduleSubmissionStatus(pending.submissionId);
        if (previous.success && previous.data?.status === 'COMMITTED') {
          try { sessionStorage.removeItem(storageKey); } catch (_) {}
          pendingSubmissionRef.current = null;
          success('Your previous Departmental CNE was already scheduled. No duplicate was created.', 'Schedule Recovered');
          onSuccess();
          onClose();
          return;
        }
        const elapsed = Date.now() - (pending.createdAt || Date.now());
        if (!previous.success || previous.data?.status !== 'NOT_FOUND' || elapsed < 8 * 60 * 1000) {
          error('A previous scheduling request is still unconfirmed. Check the CNE Schedule before creating a different batch; your original Submission ID has been preserved.');
          return;
        }
        // Apps Script's maximum run window has elapsed, the server lock is
        // free and no matching receipt exists. A different batch may begin.
        pending = null;
      }
      if (!pending || pending.fingerprint !== fingerprint) {
        pending = { fingerprint, submissionId: newDepartmentalSubmissionId(), createdAt: Date.now() };
      }
      pendingSubmissionRef.current = pending;
      try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch (_) {}

      // On repeat Publish after an uncertain response, read the original result
      // first. This also works if staff-master data later becomes unavailable.
      let recoveredResult = null;
      if (reusedPending) {
        const prior = await ApiService.getDepartmentalScheduleSubmissionStatus(pending.submissionId);
        if (prior.success && prior.data?.status === 'COMMITTED') {
          recoveredResult = { success: true, data: { count: prior.data.count || 0, createdIds: prior.data.createdIds || [], recovered: true } };
        } else if (!prior.success || prior.data?.status === 'IN_PROGRESS') {
          error('The original scheduling submission cannot yet be confirmed. Please check again; do not create a new batch.');
          return;
        }
      }
      let res = recoveredResult || await ApiService.addDepartmentalSchedule(payload, pending.submissionId);
      // The browser timing out does not cancel an Apps Script execution. Check
      // for the original receipt, never create a fresh request ID on retry.
      if (!res.success && ['BACKEND_UNAVAILABLE', 'HTTP_ERROR', 'SUBMISSION_COMMIT_UNCERTAIN', 'SERVER_BUSY'].includes(res.errorCode || '')) {
        const status = await ApiService.getDepartmentalScheduleSubmissionStatus(pending.submissionId);
        if (status.success && status.data?.status === 'COMMITTED') {
          res = { success: true, data: { count: status.data.count || 0, createdIds: status.data.createdIds || [], recovered: true }, message: 'Original CNE scheduling request was recovered.' };
        } else {
          error('Unable to confirm whether the CNE was saved. Reopen or retry this same form to check the original submission; a fresh CNE ID will not be generated for the same request.');
          return;
        }
      }
      if (res.success) {
        try { sessionStorage.removeItem(storageKey); } catch (_) {}
        pendingSubmissionRef.current = null;
        const count = res.data?.count || rows.length;
        success(`Successfully scheduled ${count} departmental CNE workshop${count > 1 ? 's' : ''}.`, 'Batch Scheduled');
        onSuccess();
        onClose();
      } else {
        if (res.errorCode === 'AREA_INACTIVE') {
          error('This ward/area is currently inactive. Please select an active ward/area.');
        } else if (res.errorCode === 'TEACHING_MODE_INACTIVE') {
          error('The selected Teaching Mode is inactive. Please select an active Teaching Mode.');
        } else {
          error(res.message || 'Failed to schedule departmental CNE sessions.');
        }
      }
    } catch (err: any) {
      error(err?.message || 'Error scheduling departmental CNE batch.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
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
                Departmental CNE Schedule
              </h3>
              <p className="text-xs text-slate-500">
                {isAreaIncharge
                  ? `Schedule departmental CNE classes for ${user?.assignedArea || 'your department'}`
                  : 'Schedule departmental clinical nursing education workshops'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-departmental-modal"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
            {rows.map((row, idx) => {
              const fromParts = parseDateTimeParts(row.date, '09:00');
              const toParts = parseDateTimeParts(row.toDate, '10:30');
              const selectedRowRpIds = (row.resourcePersonEmpIds && row.resourcePersonEmpIds.length > 0)
                ? row.resourcePersonEmpIds
                : (row.resourcePersonEmpId ? row.resourcePersonEmpId.split(',').map((s) => s.trim()).filter(Boolean) : []);
              const search = (rpSearchMap[row.id] || '').trim().toLowerCase();
              const filteredOfficers = effectiveOfficers.filter((o) => {
                if (!search) return true;
                const employeeId = String(o?.employeeId || '').toLowerCase();
                const name = String(o?.name || '').toLowerCase();
                const designation = String(o?.designation || '').toLowerCase();
                return employeeId.includes(search) || name.includes(search) || designation.includes(search);
              });

              return (
                <div
                  key={row.id}
                  className={rows.length > 1 ? 'p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3' : 'space-y-3'}
                >
                  {rows.length > 1 && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Departmental Session #{idx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Item</span>
                      </button>
                    </div>
                  )}

                  {/* 3-Column Coordinated Cards: CNE Details | Date & Duration | Resource Persons */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Column 1: CNE Details */}
                    <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-2 flex items-center gap-1.5">
                        <span>1. CNE Details</span>
                      </h4>

                      {/* 1. CNE Topic * */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          CNE Topic <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Infection Control & Hand Hygiene Protocols"
                          value={row.topic}
                          onChange={(e) => handleFieldChange(idx, 'topic', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      {/* 2. Department / Ward * */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Department / Ward <span className="text-rose-500">*</span>
                        </label>
                        {idx === 0 ? (
                        <WardMultiSelect
                          availableWards={areasList}
                          eligiblePrimaryWards={eligiblePrimaryWards}
                          selected={selectedWards}
                          primaryWard={primaryWard}
                          staffCounts={staffCounts}
                          staffCountError={staffCountError}
                          isLoading={wardLoading}
                          loadError={wardError}
                          onRetry={onRetryWards}
                          onChange={handleWardChange}
                          disabled={isSubmitting}
                        />
                        ) : (
                        <WardMultiSelect
                          availableWards={areasList}
                          eligiblePrimaryWards={eligiblePrimaryWards}
                          selected={selectedWards}
                          primaryWard={primaryWard}
                          staffCounts={staffCounts}
                          staffCountError={staffCountError}
                          isLoading={wardLoading}
                          loadError={wardError}
                          onRetry={onRetryWards}
                          onChange={handleWardChange}
                          disabled={isSubmitting}
                        />
                        )}
                      </div>

                      {/* 3. Teaching Mode */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Teaching Mode
                        </label>
                        <select
                          value={row.modeOfTeaching}
                          onChange={(e) => handleFieldChange(idx, 'modeOfTeaching', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {teachingModes.length === 0 ? (
                            <option value="">No active Teaching Modes available</option>
                          ) : (
                            teachingModes.map((mode) => (
                              <option key={`dept-teaching-mode-${mode}`} value={mode}>{mode}</option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* 4. Description / Objectives */}
                      <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Description / Objectives
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Outline clinical objectives, skills covered, or ward preparations..."
                          value={row.description || ''}
                          onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none flex-1 min-h-[72px]"
                        />
                      </div>
                    </div>

                    {/* Column 2: Date & Duration */}
                    <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-100 pb-2 flex items-center gap-1.5">
                        <span>2. Date &amp; Duration</span>
                      </h4>

                      <div className="space-y-3">
                        {/* 1. Date Controls */}
                        <CneDateTimeFields
                          idPrefix={`dept-sched-${idx}`}
                          fromDate={fromParts.date}
                          fromTime={fromParts.time}
                          toDate={toParts.date}
                          toTime={toParts.time}
                          minDate={todayStr}
                          compact={false}
                          accentColor="indigo"
                          onChange={({ fullFrom, fullTo, calculatedDuration }) => {
                            setRows((prev) => {
                              const updated = [...prev];
                              updated[idx] = {
                                ...updated[idx],
                                date: fullFrom,
                                toDate: fullTo,
                                duration: calculatedDuration !== '00:00:00' ? calculatedDuration : updated[idx].duration
                              };
                              return updated;
                            });
                          }}
                        />

                        {/* 2. Duration */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                              Duration (HH:MM:SS) <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-indigo-600 font-semibold">Auto-calculated • Editable</span>
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="00:00:00"
                            value={row.duration}
                            onChange={(e) => handleFieldChange(idx, 'duration', e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Calculated from From/To dates. Max 8 hours per calendar day. Format: HH:MM:SS
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Resource Persons */}
                    <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 border-b border-teal-100 pb-2 flex items-center justify-between">
                        <span>3. Resource Persons</span>
                        <span className="text-[10px] text-slate-500 font-semibold lowercase">
                          {selectedRowRpIds.length + (row.externalResourcePersons?.length || 0)} selected
                        </span>
                      </h4>

                      {/* 1. Internal Resource Persons */}
                      <div className="space-y-2 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <span>Internal Faculty</span>
                            <DropdownRetry error={resourcePersonsError} loading={isResourcePersonsLoading} onRetry={() => { void retryResourcePersons(); }} label="Resource Persons" />
                          </label>
                        </div>

                        {/* Selected RP Tags */}
                        {selectedRowRpIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
                            {selectedRowRpIds.map((empId, rpIdx) => {
                              const officer = effectiveOfficers.find((o) => o.employeeId === empId);
                              return (
                                <span
                                  key={`dept-row-rp-${empId}-${rpIdx}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200"
                                >
                                  <span>{empId} - {officer ? officer.name : empId}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRowRpSelection(idx, empId)}
                                    className="hover:text-rose-600 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Search / Filter input */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={isResourcePersonsLoading ? "Loading Resource Persons..." : "Filter officers by name or ID..."}
                            disabled={isResourcePersonsLoading}
                            value={rpSearchMap[row.id] || ''}
                            onChange={(e) =>
                              setRpSearchMap((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                            className="w-full p-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                          />

                        </div>

                        {/* Officers list dropdown / box */}
                        <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 flex-1">
                          {isResourcePersonsLoading ? (
                            <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                              <span>Loading Resource Persons...</span>
                            </div>
                          ) : resourcePersonsError ? (
                            <span className="p-2 text-xs text-slate-500">Internal faculty unavailable; external entry remains available.</span>
                          ) : filteredOfficers.length === 0 ? (
                            <div className="p-2.5 text-center text-xs text-slate-400">No officers found</div>
                          ) : (
                            filteredOfficers.slice(0, 10).map((officer, oIdx) => {
                              const isSelected = selectedRowRpIds.includes(officer.employeeId);
                              return (
                                <label
                                  key={`dept-officer-${officer.employeeId || oIdx}-${oIdx}`}
                                  className={`flex items-center gap-2 p-1.5 text-xs cursor-pointer transition-colors ${
                                    isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input type="checkbox" checked={isSelected}
                                    onChange={() => toggleRowRpSelection(idx, officer.employeeId)}
                                    className="rounded accent-emerald-600" />
                                  <span className="truncate">{officer.name} ({officer.employeeId})</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* 2. External Resource Person */}
                      <div className="pt-2.5 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            External Resource Person
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Dr. A. Sen (Visiting Faculty)..."
                            value={extRpInputMap[row.id] || ''}
                            onChange={(e) =>
                              setExtRpInputMap((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddExternalRp(row.id, idx);
                              }
                            }}
                            className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddExternalRp(row.id, idx)}
                            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold rounded-lg text-xs cursor-pointer transition-colors shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                        {row.externalResourcePersons && row.externalResourcePersons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                            {row.externalResourcePersons.map((name, rpIdx) => (
                              <span
                                key={`dept-ext-rp-${name}-${rpIdx}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200"
                              >
                                <span>{name} (External)</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExternalRp(idx, rpIdx)}
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
              );
            })}

            {/* Add Row Button */}
            <div className="flex justify-start pt-1">
              <button
                id="btn-add-departmental-row"
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Add Another Schedule</span>
              </button>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end bg-slate-50/70 shrink-0">
            <button
              id="btn-submit-departmental-schedule"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
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
  );
};
