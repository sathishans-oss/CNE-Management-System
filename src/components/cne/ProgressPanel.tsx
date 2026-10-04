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
  const isAttendanceCompletionReady = isParticipantsReady && isFinalized;

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
      (isAttendanceCompletionReady ? 1 : 0)
    : 0;

  const readyPercentage = Math.round((readyCount / 5) * 100);

  return (
    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 h-full flex flex-col justify-between">
      {/* Header with Title and Dynamic "X of 5 Ready" */}
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
              readyCount === 5
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : readyCount >= 4
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : readyCount >= 2
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {readyCount === 5 ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            ) : readyCount === 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
            <span className="whitespace-nowrap">{readyCount} of 5 Ready</span>
          </div>
        )}
      </div>

      {isActivityLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
          <div className="text-xs font-medium text-slate-500">
            Loading CNE progress...
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
                      ? "Material ready • Click to view or edit material"
                      : "Material attention required • Click to upload material"
                    : "Material • View only"
                }
                aria-label={isMaterialReady ? "Material completed. Click to view material" : "Material attention required. Click to view or upload material"}
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
                  {canManageMaterial ? (
                    <span className="text-[9px] font-bold text-teal-700 uppercase">Manage</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> View only
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${isMaterialReady ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isMaterialReady ? 'Added' : 'Not Added'}
                  </span>
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
                      ? `${validQuestionsCount} / ${requiredQuestionsCount} valid questions • Click to view or edit`
                      : `${validQuestionsCount} / ${requiredQuestionsCount} valid questions • Needs ${questionsNeeded} more • Click to generate`
                    : `${validQuestionsCount} / ${requiredQuestionsCount} valid questions • View only`
                }
                aria-label={`${validQuestionsCount} of ${requiredQuestionsCount} valid questions. ${isQuestionsReady ? 'Ready' : `Needs ${questionsNeeded} more`}`}
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
                  {canManageQuestions ? (
                    <span className="text-[9px] font-bold text-teal-700 uppercase">Manage</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> View only
                    </span>
                  )}
                </div>
                <div className="mt-auto">
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">
                    {validQuestionsCount} / {requiredQuestionsCount} valid
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-[10px] font-semibold ${isQuestionsReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isQuestionsReady ? 'Ready' : `Needs ${questionsNeeded} more`}
                    </span>
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
                    ? 'QR Code management restricted • View only'
                    : isQrReady
                    ? 'QR Code ready • Click to view or print QR code'
                    : 'QR Code attention required • Click to generate QR code'
                }
                aria-label={isClosed ? 'QR Code disabled for closed CNE' : isQrReady ? 'QR Code completed. Click to view or print QR code' : 'QR Code attention required. Click to generate QR code'}
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
                  {canManageQR ? (
                    <span className="text-[9px] font-bold text-teal-700 uppercase">Manage</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> View only
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${isQrReady ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {isQrReady ? 'Active' : 'Pending'}
                  </span>
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

            {/* Stage 2: Completion (Post Test + Attendance & Completion) */}
            <div className="grid grid-cols-2 gap-2">
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
                    ? "Post Test management restricted • View only"
                    : isPostTestReady
                    ? "Post Test ready • Click to view or take evaluation test"
                    : "Post Test attention required • Click to configure post test"
                }
                aria-label={isPostTestReady ? "Post Test ready. Click to view or take test" : "Post Test attention required. Click to configure"}
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
                  {canManagePT ? (
                    <span className="text-[9px] font-bold text-teal-700 uppercase">Manage</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> View only
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${isPostTestReady ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {isPostTestReady ? 'Available' : 'Pending'}
                  </span>
                  {isPostTestReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" aria-label="Attention required" />
                  )}
                </div>
              </button>

              {/* 5. Attendance & Completion (Deduplicated Roster + Finalization) */}
              <div
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[74px] text-left ${
                  isCancelled
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs'
                    : isAttendanceCompletionReady
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenParticipants(cne)}
                  title={
                    isCancelled
                      ? `${activityProgress.participantsCount || 0} deduplicated participant(s) • CNE canceled • View attendance record`
                      : isFinalized
                      ? `Attendance & Completion finalized • ${activityProgress.participantsCount || 0} deduplicated participant(s)`
                      : canManageAttendance
                      ? `${activityProgress.participantsCount || 0} deduplicated participant(s) • Open attendance and completion`
                      : `${activityProgress.participantsCount || 0} deduplicated participant(s) • View attendance record (View only)`
                  }
                  aria-label="Open Attendance and Completion"
                  className="w-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Attendance &amp; Completion</span>
                    </span>
                    {canManageAttendance ? (
                      <span className="text-[9px] font-bold text-teal-700 uppercase">Manage</span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500">
                        <Lock className="w-2.5 h-2.5 text-slate-400" /> View only
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isCancelled ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" aria-label="Canceled" />
                      ) : isAttendanceCompletionReady ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Completed" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" aria-label="Attention required" />
                      )}
                      <span className="font-mono text-xs font-bold text-slate-800">
                        ({activityProgress.participantsCount || 0})
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide ${
                        isCancelled
                          ? 'text-rose-700'
                          : isFinalized
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {isCancelled ? 'Canceled' : isFinalized ? 'Finalized' : canLifecycle ? 'Finalize Pending' : 'In Progress'}
                    </span>
                  </div>
                </button>

                {canLifecycle && !isClosed && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenFinalize(cne);
                    }}
                    disabled={!isParticipantsReady}
                    title={
                      !isParticipantsReady
                        ? 'Record at least one participant before finalization'
                        : 'Finalize and complete this CNE'
                    }
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Finalize CNE</span>
                  </button>
                )}
              </div>
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
