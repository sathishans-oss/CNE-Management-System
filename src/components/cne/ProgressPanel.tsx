import React from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Lock,
  BookOpen,
  HelpCircle,
  QrCode,
  ClipboardCheck,
  Users,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { CNERecord, CNEActivityProgress, SessionUser } from '../../types';

export interface ProgressPanelProps {
  cne: CNERecord;
  user?: SessionUser | null;
  activityProgress: CNEActivityProgress | null;
  isActivityLoading: boolean;
  activityError: string | null;
  canOperate: boolean;
  canLifecycle: boolean;
  canManagePostTest: boolean;
  disabled?: boolean;
  onRetryProgress: () => void;
  onOpenMaterial: (cne: CNERecord) => void;
  onOpenQuestions: (cne: CNERecord) => void;
  onOpenQR: (cne: CNERecord) => void;
  onOpenPostTest: (cne: CNERecord) => void;
  onOpenParticipants: (cne: CNERecord) => void;
  onOpenFinalize: (cne: CNERecord) => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  cne,
  activityProgress,
  isActivityLoading,
  activityError,
  canOperate,
  canLifecycle,
  canManagePostTest,
  onRetryProgress,
  onOpenMaterial,
  onOpenQuestions,
  onOpenQR,
  onOpenPostTest,
  onOpenParticipants,
  onOpenFinalize
}) => {
  const isMaterialReady = activityProgress?.materialStatus === 'Added';
  const validQuestionsCount = activityProgress?.finalizedQuestionsCount ?? (activityProgress?.questionsStatus === 'Generated' ? 5 : 0);
  const requiredQuestionsCount = activityProgress?.requiredQuestionsCount ?? 5;
  const isQuestionsReady = validQuestionsCount >= requiredQuestionsCount;
  const questionsNeeded = Math.max(0, requiredQuestionsCount - validQuestionsCount);
  const isQrReady = activityProgress?.qrStatus === 'Generated';
  const isParticipantsReady = (activityProgress?.participantsCount || 0) > 0;
  const isPostTestReady = activityProgress?.postTestStatus === 'Available' || activityProgress?.postTestStatus === 'Completed';
  const isFinalizationReady = activityProgress?.finalizationStatus === 'Finalized';

  const statusStr = String(cne.status || 'Scheduled').trim().toLowerCase();
  const isCancelled = statusStr === 'canceled' || statusStr === 'cancelled';
  const isCompleted = statusStr === 'completed';
  // Cancellation and finalization are intentionally separate states. A cancelled CNE must never render as Finalized.
  const isFinalized = !isCancelled && (isCompleted || isFinalizationReady);
  const isClosed = isCancelled || isFinalized;
  const isAttendanceReady = isParticipantsReady;

  const canManageMaterial = canOperate && !isClosed;
  const canManageQuestions = canOperate && !isClosed;
  const canManageQR = canOperate && !isClosed;
  const canManagePT = canManagePostTest && !isClosed;
  const canManageAttendance = (canOperate || canLifecycle) && !isClosed;

  const readyCount = activityProgress
    ? (isMaterialReady ? 1 : 0) +
      (isQuestionsReady ? 1 : 0) +
      (isQrReady ? 1 : 0) +
      (isPostTestReady ? 1 : 0) +
      (isAttendanceReady ? 1 : 0) +
      (isFinalized ? 1 : 0)
    : 0;

  const readyPercentage = Math.round((readyCount / 6) * 100);

  return (
    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 h-full flex flex-col">
      {/* Header with Title and Dynamic "X of 6 Ready" */}
      <div className="border-b border-slate-200 pb-2.5 mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              CNE Progress
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live status" />
          </div>
          <span className="text-[10px] text-slate-500">Live readiness status</span>
        </div>

        {activityProgress && !isActivityLoading && (
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
              readyCount === 6
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : readyCount >= 4
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : readyCount >= 2
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {readyCount === 6 ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            ) : readyCount === 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
            <span className="whitespace-nowrap">{readyCount} of 6 Ready</span>
          </div>
        )}
      </div>

      {isActivityLoading ? (
        <div className="flex-1 flex flex-col justify-between gap-3" role="status" aria-label="Loading six CNE progress cards">
          <div className="space-y-2">
            {[
              ['Material', 'Questions', 'QR Code'],
              ['Post-Test', 'Attendance', 'Finalize CNE']
            ].map((stage, stageIndex) => (
              <React.Fragment key={stageIndex}>
                {stageIndex === 1 && (
                  <div className="relative flex items-center justify-center py-1" aria-hidden="true">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-slate-300" />
                    </div>
                    <div className="relative bg-white px-2.5 py-0.5 rounded-full text-[9px] font-bold text-slate-500 border border-slate-200">
                      Proposal ➔ Completion
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {stage.map((name) => (
                    <div key={name} className="min-h-[74px] p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-700 text-center">{name}</span>
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" aria-hidden="true" />
                      <span className="text-[10px] text-slate-500">Loading…</span>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-200/90 mt-auto space-y-1.5" aria-hidden="true">
            <div className="h-4" />
            <div className="w-full bg-slate-200 h-2 rounded-full" />
          </div>
        </div>
      ) : activityProgress ? (
        <div className="flex-1 flex flex-col justify-between space-y-3">
          {/* 2-Row Diagrammatic Stage Tracker */}
          <div className="space-y-2">
            {/* Stage 1: Proposal (Material, Questions, QR Code) */}
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Material */}
              <button
                type="button"
                onClick={() => onOpenMaterial(cne)}
                title={
                  canManageMaterial
                    ? isMaterialReady
                      ? "Manage learning material • Ready"
                      : "Manage learning material • Action required"
                    : "Learning material • View only"
                }
                aria-label={
                  canManageMaterial
                    ? isMaterialReady
                      ? "Manage learning material, ready"
                      : "Manage learning material, action required"
                    : "Learning material, view only"
                }
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] ${
                  isMaterialReady
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Material</span>
                  </span>
                  {!canManageMaterial && (
                    <span className="inline-flex items-center text-slate-400" title="View only" aria-label="View only">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-end">
                  {isMaterialReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-label="Attention required" />
                  )}
                </div>
              </button>

              {/* 2. Questions */}
              <button
                type="button"
                onClick={() => onOpenQuestions(cne)}
                title={
                  canManageQuestions
                    ? isQuestionsReady
                      ? `Manage questions • ${validQuestionsCount} / ${requiredQuestionsCount} valid questions`
                      : `Manage questions • ${validQuestionsCount} / ${requiredQuestionsCount} valid questions • Needs ${questionsNeeded} more`
                    : `Questions • ${validQuestionsCount} / ${requiredQuestionsCount} valid questions • View only`
                }
                aria-label={
                  canManageQuestions
                    ? `Manage questions, ${validQuestionsCount} of ${requiredQuestionsCount} valid`
                    : `Questions, ${validQuestionsCount} of ${requiredQuestionsCount} valid, view only`
                }
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] ${
                  isQuestionsReady
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Questions</span>
                  </span>
                  {!canManageQuestions && (
                    <span className="inline-flex items-center text-slate-400" title="View only" aria-label="View only">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>
                <div className="mt-auto">
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">
                    {validQuestionsCount} / {requiredQuestionsCount} valid questions
                  </div>
                  <div className="flex items-center justify-between mt-0.5 min-h-[16px]">
                    {!isQuestionsReady && questionsNeeded > 0 ? (
                      <span className="text-[10px] font-semibold text-amber-700">
                        Needs {questionsNeeded} more
                      </span>
                    ) : (
                      <span />
                    )}
                    {isQuestionsReady ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-label="Attention required" />
                    )}
                  </div>
                </div>
              </button>

              {/* 3. QR Code */}
              <button
                type="button"
                onClick={() => {
                  if (!canManageQR) return;
                  onOpenQR(cne);
                }}
                disabled={!canManageQR}
                title={
                  isCancelled
                    ? 'QR Code is disabled because this CNE was canceled'
                    : isFinalized
                    ? 'QR Code is disabled after CNE finalization'
                    : !canManageQR
                    ? 'QR Code • View only'
                    : isQrReady
                    ? 'Manage QR code • Ready'
                    : 'Manage QR code • Action required'
                }
                aria-label={
                  isClosed
                    ? 'QR Code disabled for closed CNE'
                    : canManageQR
                    ? 'Manage QR code'
                    : 'QR Code, view only'
                }
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left ${
                  !canManageQR
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                    : isQrReady
                    ? 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>QR Code</span>
                  </span>
                  {!canManageQR && (
                    <span className="inline-flex items-center text-slate-400" title="View only" aria-label="View only">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-end">
                  {isQrReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" aria-label="Attention required" />
                  )}
                </div>
              </button>
            </div>

            {/* Subtle Connecting Track / Stage Bridge */}
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-slate-300" />
              </div>
              <div className="relative bg-white px-2.5 py-0.5 rounded-full text-[9px] font-bold text-slate-500 border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span>Proposal ➔ Completion</span>
              </div>
            </div>

            {/* Stage 2: Post Test, Attendance and independent Finalization */}
            <div className="grid grid-cols-3 gap-2">
              {/* 4. Post Test */}
              <button
                type="button"
                onClick={() => {
                  if (!canManagePT) return;
                  onOpenPostTest(cne);
                }}
                disabled={!canManagePT}
                title={
                  isCancelled
                    ? "Post Test is disabled because this CNE was canceled"
                    : isFinalized
                    ? "Post Test is disabled after CNE finalization"
                    : !canManagePT
                    ? "Post Test • View only"
                    : isPostTestReady
                    ? "Manage post test • Ready"
                    : "Manage post test • Action required"
                }
                aria-label={
                  canManagePT
                    ? isPostTestReady
                      ? "Manage post test, ready"
                      : "Manage post test, action required"
                    : "Post test, view only"
                }
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left ${
                  !canManagePT
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                    : isPostTestReady
                    ? 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Post Test</span>
                  </span>
                  {!canManagePT && (
                    <span className="inline-flex items-center text-slate-400" title="View only" aria-label="View only">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-end">
                  {isPostTestReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" aria-label="Attention required" />
                  )}
                </div>
              </button>

              {/* 5. Attendance (deduplicated participant roster) */}
              <button
                type="button"
                onClick={() => onOpenParticipants(cne)}
                title={
                  isCancelled
                    ? `${activityProgress.participantsCount || 0} attendee(s) • CNE canceled • View attendance record`
                    : isFinalized
                    ? `Attendance recorded • ${activityProgress.participantsCount || 0} attendee(s)`
                    : canManageAttendance
                    ? `Manage attendance • ${activityProgress.participantsCount || 0} attendee(s)`
                    : `Attendance • ${activityProgress.participantsCount || 0} attendee(s) • View only`
                }
                aria-label={
                  canManageAttendance
                    ? `Manage attendance, ${activityProgress.participantsCount || 0} attendees`
                    : `Attendance, ${activityProgress.participantsCount || 0} attendees, view only`
                }
                className={`w-full p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98] ${
                  isCancelled
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs'
                    : isAttendanceReady
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Attendance</span>
                    </span>
                    {!canManageAttendance && (
                      <span className="inline-flex items-center text-slate-400" title="View only" aria-label="View only">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-900 leading-tight">
                      {activityProgress.participantsCount || 0} attendee{(activityProgress.participantsCount || 0) === 1 ? '' : 's'}
                    </span>
                    <div>
                      {isCancelled ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" aria-label="Canceled" />
                      ) : isAttendanceReady ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" aria-label="Attention required" />
                      )}
                    </div>
                  </div>
              </button>

              {/* 6. Finalize CNE: independent lifecycle stage */}
              <button
                type="button"
                onClick={() => onOpenFinalize(cne)}
                disabled={!canLifecycle || isClosed || !isParticipantsReady}
                title={isCancelled
                  ? 'Canceled CNE cannot be finalized'
                  : isFinalized
                  ? 'CNE already finalized'
                  : !canLifecycle
                  ? 'Finalization is restricted to authorized users'
                  : !isParticipantsReady
                  ? 'Record at least one participant before finalization'
                  : 'Finalize and complete this CNE'}
                aria-label="Finalize CNE"
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left ${
                  isFinalized
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : isCancelled
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                    : canLifecycle && isParticipantsReady
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950 cursor-pointer hover:shadow-md active:scale-[0.98]'
                    : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Finalize CNE</span>
                  </span>
                  {!canLifecycle && <Lock className="w-3 h-3 shrink-0" aria-label="Restricted" />}
                </div>
                <div className="mt-auto flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold">{isCancelled ? 'Canceled' : isFinalized ? 'Finalized' : isParticipantsReady ? 'Ready to finalize' : 'Requires attendance'}</span>
                  {isFinalized ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> :
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>
              </button>
            </div>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="pt-3 border-t border-slate-200/90 mt-auto space-y-1.5">
            <div className="flex items-center justify-end text-xs">
              <span
                className={`font-extrabold text-xs ${
                  readyPercentage >= 80
                    ? 'text-emerald-700'
                    : readyPercentage >= 40
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {readyPercentage}% READY
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  readyPercentage >= 80
                    ? 'bg-emerald-500'
                    : readyPercentage >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${readyPercentage}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-2 text-slate-400">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <p className="text-xs text-slate-600 font-medium">
            {activityError || 'Unable to load CNE progress'}
          </p>
          {cne?.cneId && (
            <button
              type="button"
              onClick={onRetryProgress}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
