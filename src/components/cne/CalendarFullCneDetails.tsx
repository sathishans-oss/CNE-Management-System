import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CNEActivityProgress, CNERecord, SessionUser, Employee } from '../../types';
import { ApiService } from '../../services/api';
import { canManageCneActions, getUserAssignedAreas } from '../../utils';
import { getCachedOfficers } from '../../services/officerLoader';
import { CneDetailsModal } from './CneDetailsModal';

// These are the SAME management popups used by CNE Schedule. Code splitting avoids
// loading their bundles until the specific activity is opened from Calendar.
const CNEReferenceModal = lazy(() => import('./CNEReferenceModal').then(m => ({ default: m.CNEReferenceModal })));
const CNEQuestionsModal = lazy(() => import('./CNEQuestionsModal').then(m => ({ default: m.CNEQuestionsModal })));
const CNEQRModal = lazy(() => import('./CNEQRModal').then(m => ({ default: m.CNEQRModal })));
const CNEParticipantsModal = lazy(() => import('./CNEParticipantsModal').then(m => ({ default: m.CNEParticipantsModal })));
const CNEFinalizeModal = lazy(() => import('./CNEFinalizeModal').then(m => ({ default: m.CNEFinalizeModal })));
const CNEPostTestModal = lazy(() => import('./CNEPostTestModal').then(m => ({ default: m.CNEPostTestModal })));

type Activity = 'material' | 'questions' | 'qr' | 'participants' | 'finalize' | 'postTest';

interface Props {
  initialCne: CNERecord;
  user: SessionUser;
  onClose: () => void;
  // Edit/Cancel and finalized session-report downloads remain in Schedule. All
  // six Progress card actions now work directly inside Calendar.
  onManageInSchedule: () => void;
  onCneUpdated?: () => void;
}

const getStatus = (cne: CNERecord) => String(cne.status || 'Scheduled').trim().toLowerCase();
const isClosed = (cne: CNERecord) => ['completed', 'canceled', 'cancelled'].includes(getStatus(cne));
const getId = (cne: CNERecord) => cne.cneId || cne.classId || '';

/** Same lifecycle authority as CNESchedule: Admin, or the concerned Area
 * Incharge for DEPARTMENTAL CNEs only. Assigned RPs do not gain lifecycle rights.
 * These UI checks are supplementary; every protected mutation is validated by
 * the existing Apps Script backend on each request.
 */
function canManageLifecycle(user: SessionUser, cne: CNERecord): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'AREA_INCHARGE' && user.role !== 'INCHARGE') return false;
  if (String(cne.cneType || 'CENTRAL').trim().toUpperCase() !== 'DEPARTMENTAL') return false;
  const targetArea = String(cne.area || '').trim().toLowerCase();
  return Boolean(targetArea) && getUserAssignedAreas(user).some(area => area.trim().toLowerCase() === targetArea);
}

export const CalendarFullCneDetails: React.FC<Props> = ({ initialCne, user, onClose, onManageInSchedule, onCneUpdated }) => {
  const cneId = getId(initialCne);
  const [cne, setCne] = useState<CNERecord>(initialCne);
  const [verified, setVerified] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CNEActivityProgress | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [qrPostTestToken, setQrPostTestToken] = useState<string | undefined>();
  const detailsGeneration = useRef(0);
  const progressGeneration = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      detailsGeneration.current++;
      progressGeneration.current++;
    };
  }, []);

  const reloadDetails = useCallback(async (): Promise<void> => {
    const request = ++detailsGeneration.current;
    try {
      const response = await ApiService.getCNEScheduleById(cneId);
      if (!mounted.current || request !== detailsGeneration.current) return;
      if (response.success && response.data && getId(response.data) === cneId) {
        setCne(response.data);
        setDetailsError(null);
        setVerified(true);
      } else {
        setVerified(false);
        setDetailsError(response.message || 'CNE details are unavailable or you no longer have permission to view them.');
      }
    } catch {
      if (mounted.current && request === detailsGeneration.current) {
        setVerified(false);
        setDetailsError('Unable to verify this CNE. Please reopen the details and try again.');
      }
    }
  }, [cneId]);

  const reloadProgress = useCallback(async (): Promise<void> => {
    const request = ++progressGeneration.current;
    setProgressLoading(true);
    setProgressError(null);
    try {
      const response = await ApiService.getCNEActivityProgress(cneId, true);
      if (!mounted.current || request !== progressGeneration.current) return;
      if (response.success && response.data) setProgress(response.data);
      else {
        setProgress(null);
        setProgressError(response.message || 'Unable to load CNE progress.');
      }
    } catch {
      if (mounted.current && request === progressGeneration.current) {
        setProgress(null);
        setProgressError('Unable to load CNE progress.');
      }
    } finally {
      if (mounted.current && request === progressGeneration.current) setProgressLoading(false);
    }
  }, [cneId]);

  useEffect(() => {
    // Run two independent read-only requests concurrently. Never show data or
    // enable actions from the monthly snapshot until the per-CNE lookup verifies
    // current access and status. A failed lookup must fail closed.
    setVerified(false);
    setDetailsError(null);
    setProgress(null);
    setActiveActivity(null);
    void reloadDetails();
    void reloadProgress();
  }, [reloadDetails, reloadProgress, user.employeeId, user.token]);

  const canOperate = useMemo(() => verified && canManageCneActions(user, cne), [verified, user, cne]);
  const canLifecycle = useMemo(() => verified && canManageLifecycle(user, cne), [verified, user, cne]);
  const canOperateNow = canOperate && !isClosed(cne);
  const canLifecycleNow = canLifecycle && !isClosed(cne);

  const openActivity = useCallback((kind: Activity) => {
    if (!verified || !cneId || !mounted.current) return;
    // As in Schedule, these three panels also support read-only access.
    // Mutations inside them are individually disabled for unauthorized/closed CNEs.
    const viewOnlyAllowed = kind === 'material' || kind === 'questions' || kind === 'participants';
    if (!viewOnlyAllowed && (isClosed(cne) || (kind === 'finalize' ? !canLifecycleNow : !canOperateNow))) return;
    setQrPostTestToken(undefined);
    setActiveActivity(kind);
  }, [verified, cneId, cne, canLifecycleNow, canOperateNow]);

  const refreshCurrentCne = useCallback((statusChanged = false) => {
    // Refresh ONLY this CNE and its Progress after Material/Question/QR/
    // Attendance changes. Re-fetch the month only after lifecycle changes.
    void reloadProgress();
    void reloadDetails();
    if (statusChanged) onCneUpdated?.();
  }, [reloadDetails, reloadProgress, onCneUpdated]);

  const launchNext = (kind: Activity, token?: string) => {
    setActiveActivity(null);
    setQrPostTestToken(token);
    setActiveActivity(kind);
  };

  if (!verified) return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role={detailsError ? 'alert' : 'status'}>
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="font-bold text-slate-900">{detailsError ? 'CNE details unavailable' : 'Opening CNE details…'}</h2>
        <p className="text-sm text-slate-600">{detailsError || 'Verifying the selected CNE and your access permissions.'}</p>
        <div className="flex flex-wrap gap-2">
          {detailsError && <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setDetailsError(null); void reloadDetails(); }}>Retry</button>}
          <button type="button" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white" onClick={onClose}>Back to Calendar</button>
        </div>
      </section>
    </div>
  );

  return <>
    <CneDetailsModal
      cne={cne} user={user} officerByEmployeeId={new Map<string, Employee>()}
      activityProgress={progress} isActivityLoading={progressLoading} activityError={progressError}
      isDownloadingReport={false}
      canOperate={canOperate} canLifecycle={canLifecycle}
      canManagePostTest={canOperateNow} canDeleteCne={false}
      disabled={!canOperateNow}
      onClose={onClose}
      onDownloadSessionReport={onManageInSchedule}
      onEdit={onManageInSchedule} onCancel={onManageInSchedule} onDelete={onManageInSchedule}
      onRetryProgress={() => { void reloadProgress(); }}
      onOpenMaterial={() => openActivity('material')}
      onOpenQuestions={() => openActivity('questions')}
      onOpenQR={() => openActivity('qr')}
      onOpenPostTest={() => openActivity('postTest')}
      onOpenParticipants={() => openActivity('participants')}
      onOpenFinalize={() => openActivity('finalize')}
    />
    <Suspense fallback={<div role="status" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 text-white">Opening CNE activity…</div>}>
      {activeActivity === 'material' && <CNEReferenceModal
        cne={cne} isAuthorized={canOperateNow}
        onClose={() => setActiveActivity(null)} onUpdated={refreshCurrentCne}
        onNavigateToQuestions={() => launchNext('questions')}
      />}
      {activeActivity === 'questions' && <CNEQuestionsModal
        cne={cne} isAuthorized={canOperateNow}
        onClose={() => setActiveActivity(null)} onUpdated={refreshCurrentCne}
        onNavigateToQR={() => { if (canOperateNow) launchNext('qr'); }}
      />}
      {activeActivity === 'qr' && <CNEQRModal
        cne={cne} isAuthorized={canOperateNow}
        onClose={() => { setActiveActivity(null); refreshCurrentCne(); }}
        onSaveSuccess={() => { setActiveActivity(null); refreshCurrentCne(); }}
        onOpenPostTest={(token) => {
          if (!canOperateNow) return;
          launchNext('postTest', token);
        }}
      />}
      {activeActivity === 'participants' && <CNEParticipantsModal
        cne={cne} isAuthorized={canOperateNow}
        officersList={getCachedOfficers() || []}
        onClose={() => setActiveActivity(null)} onUpdated={refreshCurrentCne}
      />}
      {activeActivity === 'finalize' && <CNEFinalizeModal
        cne={cne} isAuthorized={canLifecycleNow}
        onClose={() => setActiveActivity(null)}
        onCompleted={() => { setActiveActivity(null); refreshCurrentCne(true); }}
      />}
      {activeActivity === 'postTest' && <CNEPostTestModal
        cneId={cneId} qrToken={qrPostTestToken} user={user}
        onClose={() => setActiveActivity(null)} onSubmitted={refreshCurrentCne}
      />}
    </Suspense>
  </>;
};
