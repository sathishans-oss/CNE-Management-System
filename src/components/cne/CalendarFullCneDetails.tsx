import React, { useCallback, useEffect, useState } from 'react';
import { CNEActivityProgress, CNERecord, SessionUser, Employee } from '../../types';
import { ApiService } from '../../services/api';
import { CneDetailsModal } from './CneDetailsModal';

interface Props {
  initialCne: CNERecord;
  user: SessionUser;
  onClose: () => void;
  onManageInSchedule: () => void;
}

/**
 * Reuses the authoritative full-details UI in Calendar, without mounting
 * CNESchedule or downloading its table. Management actions still route to
 * Schedule, which retains all mutation controls/permissions.
 */
export const CalendarFullCneDetails: React.FC<Props> = ({ initialCne, user, onClose, onManageInSchedule }) => {
  const [cne, setCne] = useState(initialCne);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CNEActivityProgress | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadProgress = useCallback(async () => {
    setLoading(true); setProgressError(null);
    try {
      const response = await ApiService.getCNEActivityProgress(initialCne.cneId, true);
      if (response.success && response.data) setProgress(response.data);
      else setProgressError(response.message || 'Unable to load CNE progress.');
    } catch { setProgressError('Unable to load CNE progress.'); }
    finally { setLoading(false); }
  }, [initialCne.cneId]);

  useEffect(() => {
    let active = true;
    // Revalidate the selected event by ID; a cached monthly record must not
    // grant permission to see a changed/deleted CNE.
    ApiService.getCNEScheduleById(initialCne.cneId).then((response) => {
      if (!active) return;
      if (response.success && response.data) setCne(response.data);
      else setDetailsError(response.message || 'CNE no longer available.');
    }).catch(() => { if (active) setDetailsError('Could not verify CNE details.'); });
    return () => { active = false; };
  }, [initialCne.cneId, user.employeeId]);

  useEffect(() => { void reloadProgress(); }, [reloadProgress]);

  if (detailsError) return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <section role="alert" className="bg-white p-6 rounded-xl max-w-md space-y-3">
        <h2 className="font-bold">CNE details unavailable</h2><p>{detailsError}</p>
        <button className="bg-teal-700 text-white rounded-lg px-4 py-2" onClick={onClose}>Back to Calendar</button>
      </section>
    </div>
  );
  const gotoManagement = () => onManageInSchedule();
  return <CneDetailsModal
    cne={cne} user={user} officerByEmployeeId={new Map<string, Employee>()}
    activityProgress={progress} isActivityLoading={loading} activityError={progressError}
    isDownloadingReport={false} canOperate={false} canLifecycle={false}
    canManagePostTest={false} canDeleteCne={false} disabled
    onClose={onClose} onDownloadSessionReport={gotoManagement}
    onEdit={gotoManagement} onCancel={gotoManagement} onDelete={gotoManagement}
    onRetryProgress={() => { void reloadProgress(); }}
    onOpenMaterial={gotoManagement} onOpenQuestions={gotoManagement}
    onOpenQR={gotoManagement} onOpenPostTest={gotoManagement}
    onOpenParticipants={gotoManagement} onOpenFinalize={gotoManagement}
  />;
};
