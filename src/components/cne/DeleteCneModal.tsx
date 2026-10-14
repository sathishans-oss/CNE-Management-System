import React from 'react';
import { Trash2, AlertTriangle, X, Loader2, ShieldAlert } from 'lucide-react';
import { CNERecord, SessionUser } from '../../types';
import { getCneTypeLabel } from '../../utils';

export interface DeleteCneModalProps {
  cne: CNERecord | null;
  user: SessionUser | null;
  isOpen: boolean;
  isDeleting: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  confirmId: string;
  onConfirmIdChange: (val: string) => void;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export const DeleteCneModal: React.FC<DeleteCneModalProps> = ({
  cne,
  user,
  isOpen,
  isDeleting,
  reason,
  onReasonChange,
  confirmId,
  onConfirmIdChange,
  onClose,
  onConfirmDelete
}) => {
  if (!isOpen || !cne) return null;

  const isAdmin = user?.role === 'ADMIN';
  const targetId = cne.cneId || cne.classId || '';
  const isReasonValid = Boolean(reason.trim());
  // Exact CNE ID confirmation: no whitespace or case leniency allowed
  const isIdConfirmed = confirmId === targetId && targetId.length > 0;
  const canSubmit = isAdmin && isReasonValid && isIdConfirmed && !isDeleting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirmDelete();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/65 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-red-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-red-100 bg-red-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Delete CNE</h2>
              <p className="text-xs text-red-700 font-medium">Administrator Deletion Confirmation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 disabled:opacity-50 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Warning Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This CNE will be removed from the active CNE Schedule and preserved in the Deleted CNE Archive for audit. This action cannot be undone from the web app.
            </p>
          </div>

          {/* CNE Metadata Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">CNE ID:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{targetId}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-500 font-medium shrink-0">CNE Topic:</span>
              <span className="font-semibold text-slate-900 text-right line-clamp-2">{cne.topic}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">CNE Type:</span>
              <span className="font-medium text-slate-800">{getCneTypeLabel(cne.cneType)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">CNE Status:</span>
              <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-200 text-slate-800">
                {cne.status || 'Scheduled'}
              </span>
            </div>
          </div>

          {/* Mandatory Deletion Reason */}
          <div className="space-y-1.5">
            <label htmlFor="delete-reason" className="block font-bold text-slate-700">
              Deletion Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="delete-reason"
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Enter reason for deleting this CNE..."
              disabled={isDeleting}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 bg-white disabled:bg-slate-50 text-slate-800"
              required
            />
            <p className="text-[11px] text-slate-400">
              Mandatory audit explanation for permanent record archival.
            </p>
          </div>

          {/* Exact CNE ID Confirmation */}
          <div className="space-y-1.5">
            <label htmlFor="delete-confirm-id" className="block font-bold text-slate-700">
              Type <span className="font-mono text-red-600 select-all">{targetId}</span> to Confirm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="delete-confirm-id"
              value={confirmId}
              onChange={(e) => onConfirmIdChange(e.target.value)}
              placeholder={`Type exact CNE ID: ${targetId}`}
              disabled={isDeleting}
              className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 bg-white disabled:bg-slate-50 text-slate-900"
              required
              autoComplete="off"
            />
            {confirmId.length > 0 && !isIdConfirmed && (
              <p className="text-[11px] text-red-500 font-medium">
                Entered ID does not match the exact CNE ID.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting CNE...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete CNE</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
