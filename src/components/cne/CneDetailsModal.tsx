import React from 'react';
import {
  X,
  Lock,
  Edit3,
  AlertTriangle,
  FileDown,
  Loader2,
  Calendar,
  MapPin,
  FileText,
  User,
  Users
} from 'lucide-react';
import { CNERecord, SessionUser, Employee, CNEActivityProgress } from '../../types';
import { formatCneDateTimeDisplay, formatResourcePersonsDisplay } from '../../utils';
import { ProgressPanel } from './ProgressPanel';

export interface CneDetailsModalProps {
  cne: CNERecord;
  user: SessionUser | null;
  officerByEmployeeId: Map<string, Employee>;
  activityProgress: CNEActivityProgress | null;
  isActivityLoading: boolean;
  activityError: string | null;
  isDownloadingReport: boolean;
  canOperate: boolean;
  canLifecycle: boolean;
  canManagePostTest: boolean;
  disabled?: boolean;
  onClose: () => void;
  onDownloadSessionReport: (cne: CNERecord) => void;
  onEdit: (cne: CNERecord) => void;
  onCancel: (cne: CNERecord) => void;
  onRetryProgress: () => void;
  onOpenMaterial: (cne: CNERecord) => void;
  onOpenQuestions: (cne: CNERecord) => void;
  onOpenQR: (cne: CNERecord) => void;
  onOpenPostTest: (cne: CNERecord) => void;
  onOpenParticipants: (cne: CNERecord) => void;
  onOpenFinalize: (cne: CNERecord) => void;
}

export const CneDetailsModal: React.FC<CneDetailsModalProps> = ({
  cne,
  user,
  officerByEmployeeId,
  activityProgress,
  isActivityLoading,
  activityError,
  isDownloadingReport,
  canOperate,
  canLifecycle,
  canManagePostTest,
  disabled,
  onClose,
  onDownloadSessionReport,
  onEdit,
  onCancel,
  onRetryProgress,
  onOpenMaterial,
  onOpenQuestions,
  onOpenQR,
  onOpenPostTest,
  onOpenParticipants,
  onOpenFinalize
}) => {
  const statusStr = String(cne.status || 'Scheduled').trim().toLowerCase();
  const isCompleted = statusStr === 'completed';
  const isCanceled = statusStr === 'canceled' || statusStr === 'cancelled';
  const canEditOrCancel = canLifecycle && !isCompleted && !isCanceled;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-[92vw] max-w-[1280px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Compact Header: CNE ID • CNE TYPE • STATUS */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
            <span className="font-mono text-slate-800">{cne.cneId}</span>
            <span className="text-slate-400 font-sans">•</span>
            <span className="text-slate-700 uppercase">
              {(cne.cneType || 'CENTRAL').toUpperCase() === 'CENTRAL' ? 'CENTRAL CNE' : 'DEPARTMENTAL CNE'}
            </span>
            <span className="text-slate-400 font-sans">•</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isCanceled
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCanceled ? 'Canceled' : cne.status || 'Scheduled'}
            </span>
            {cne.isLocked && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> Questions Locked
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canOperate && (
              <button
                type="button"
                onClick={() => onDownloadSessionReport(cne)}
                disabled={isDownloadingReport || !isCompleted}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                title={isCompleted ? "Download finalized CNE session report" : "Available after finalization"}
              >
                {isDownloadingReport ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Download Session Report</span>
              </button>
            )}

            {canEditOrCancel && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(cne)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  title="Edit CNE workshop details"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Edit CNE</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCancel(cne)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  title="Cancel CNE programme"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer transition-colors rounded-lg hover:bg-slate-100"
              title="Close popup"
              aria-label="Close popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body (Wide Horizontal Landscape Layout) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Schedule Date & Time Display (Duration is strictly omitted) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Schedule:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-800">
              <span>{formatCneDateTimeDisplay(cne.date)}</span>
              {cne.toDate && cne.toDate !== cne.date && (
                <>
                  <span className="text-slate-400">to</span>
                  <span>{formatCneDateTimeDisplay(cne.toDate)}</span>
                </>
              )}
            </div>
          </div>

          {/* 2-Column Landscape Split: Left = Topic & Faculty, Right = CNE Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column (7 cols): CNE Details */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                  Topic &amp; Clinical Scope
                </span>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {cne.topic}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white text-teal-800 border border-teal-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    <span>{cne.area}</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>{cne.modeOfTeaching || 'Lecture Cum Discussion'}</span>
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                  Resource Persons &amp; Faculty
                </span>

                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-800 leading-relaxed flex items-start gap-2">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    {formatResourcePersonsDisplay({
                      resourcePersonEmpId: cne.resourcePersonEmpId,
                      resourcePersonName: cne.resourcePersonName,
                      externalResourcePersons: cne.externalResourcePersons,
                      officers: officerByEmployeeId
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Max Capacity: ONLY for Central CNE */}
                  {(cne.cneType || 'CENTRAL').toUpperCase() === 'CENTRAL' && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Max Capacity</span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{cne.maxParticipants || 40} Seats</span>
                      </div>
                    </div>
                  )}

                  <div className={`bg-white p-2.5 rounded-lg border border-slate-200 ${(cne.cneType || 'CENTRAL').toUpperCase() !== 'CENTRAL' ? 'sm:col-span-2' : ''}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                    <div className="text-slate-800 text-xs mt-0.5 leading-relaxed break-words" title={cne.description || 'No description provided'}>
                      {cne.description || 'No description provided'}
                    </div>
                  </div>
                </div>

                {cne.adminRemarks && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Admin Remarks</span>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 italic">
                      {cne.adminRemarks}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (5 cols): CNE Progress (Live Visual Status Tracker) */}
            <div className="lg:col-span-5 flex flex-col">
              <ProgressPanel
                cne={cne}
                user={user}
                activityProgress={activityProgress}
                isActivityLoading={isActivityLoading}
                activityError={activityError}
                canOperate={canOperate}
                canLifecycle={canLifecycle}
                canManagePostTest={canManagePostTest}
                disabled={disabled}
                onRetryProgress={onRetryProgress}
                onOpenMaterial={onOpenMaterial}
                onOpenQuestions={onOpenQuestions}
                onOpenQR={onOpenQR}
                onOpenPostTest={onOpenPostTest}
                onOpenParticipants={onOpenParticipants}
                onOpenFinalize={onOpenFinalize}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
