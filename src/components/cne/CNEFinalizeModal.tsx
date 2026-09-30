import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { CNEParticipantsSummary, CNERecord } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { formatCneDateTimeDisplay } from '../../utils';

interface CNEFinalizeModalProps {
  cne: CNERecord;
  isAuthorized: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

const normalizeStatus = (value?: string | null) => String(value || '').trim().toLowerCase();

export const CNEFinalizeModal: React.FC<CNEFinalizeModalProps> = ({
  cne,
  isAuthorized,
  onClose,
  onCompleted
}) => {
  const cneId = cne.cneId || cne.classId || '';
  const status = normalizeStatus(cne.status);
  const isClosed = status === 'completed' || status === 'canceled' || status === 'cancelled';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CNEParticipantsSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittingRef = useRef(false);
  const summaryRequestRef = useRef(0);
  const activeCneIdRef = useRef(cneId);
  activeCneIdRef.current = cneId;

  const { success, error } = useToast();

  useEffect(() => {
    const requestId = ++summaryRequestRef.current;
    const requestedCneId = cneId;
    let disposed = false;

    setSummary(null);
    setLoadError(null);
    setRemarks('');
    setLoading(true);

    if (!requestedCneId) {
      setLoadError('CNE ID is missing. Finalization cannot continue.');
      setLoading(false);
      return () => {
        disposed = true;
        summaryRequestRef.current += 1;
      };
    }

    ApiService.getCNEParticipants(requestedCneId)
      .then((res) => {
        const isCurrent = !disposed
          && requestId === summaryRequestRef.current
          && requestedCneId === activeCneIdRef.current;
        if (!isCurrent) return;

        if (res.success && res.data) {
          setSummary(res.data);
          setLoadError(null);
        } else {
          setSummary(null);
          setLoadError(res.message || 'Unable to load attendance details for this CNE.');
        }
      })
      .catch((e: any) => {
        const isCurrent = !disposed
          && requestId === summaryRequestRef.current
          && requestedCneId === activeCneIdRef.current;
        if (!isCurrent) return;
        setSummary(null);
        setLoadError(e?.message || 'Unable to load attendance details for this CNE.');
      })
      .finally(() => {
        const isCurrent = !disposed
          && requestId === summaryRequestRef.current
          && requestedCneId === activeCneIdRef.current;
        if (isCurrent) setLoading(false);
      });

    return () => {
      disposed = true;
      summaryRequestRef.current += 1;
    };
  }, [cneId]);

  const totalParticipants = summary?.totalParticipants || 0;
  const postTestCount = summary?.postTestCount || 0;
  const hasAverageScore = summary?.averageScore !== null && summary?.averageScore !== undefined;
  const canFinalize = Boolean(
    isAuthorized
    && !isClosed
    && !loading
    && !loadError
    && totalParticipants > 0
  );

  const handleFinalize = async () => {
    if (submittingRef.current || isSubmitting) return;

    if (!isAuthorized) {
      error('You are not authorized to finalize this CNE.');
      return;
    }
    if (isClosed) {
      error('This CNE is already completed or cancelled and cannot be finalized again.');
      return;
    }
    if (!cneId) {
      error('CNE ID is missing. Finalization cannot continue.');
      return;
    }
    if (loadError || !summary) {
      error('Attendance details must be loaded successfully before finalization.');
      return;
    }
    if (totalParticipants <= 0) {
      error('Cannot finalize CNE: At least one participant must be recorded before finalization.');
      return;
    }

    const submittingCneId = cneId;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await ApiService.finalizeCNE(submittingCneId, remarks.trim());
      if (submittingCneId !== activeCneIdRef.current) return;

      if (res.success) {
        success('CNE session completed and permanently recorded in CNE Schedule!');
        onCompleted();
        onClose();
      } else {
        error(res.message || 'Failed to finalize CNE.');
      }
    } catch (e: any) {
      if (submittingCneId === activeCneIdRef.current) {
        error(e?.message || 'Error occurred while finalizing CNE.');
      }
    } finally {
      submittingRef.current = false;
      if (submittingCneId === activeCneIdRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-[90vw] max-w-[1050px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 relative text-xs overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Attendance &amp; Completion</h3>
              <p className="text-[11px] text-slate-500 truncate">
                Finalize CNE record <span className="font-mono">{cneId || 'Unknown CNE'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 disabled:opacity-40 cursor-pointer transition-colors"
            aria-label="Close finalization"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading attendance &amp; completion details...</span>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/40">
            <div className="md:col-span-6 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-900 leading-snug break-words">
                      {cne.topic || 'Untitled CNE'}
                    </h4>
                    <p className="text-slate-500 text-xs mt-1">
                      {cne.area || 'Area not specified'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {(cne.cneType || 'CENTRAL').toUpperCase()}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date &amp; Time</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5 break-words">
                    {formatCneDateTimeDisplay(cne.date, cne.toDate)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-950 uppercase tracking-wider text-[10px]">
                  Attendance &amp; Evaluation Summary
                </span>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-slate-500">Participants</div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{totalParticipants}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-slate-500">Post-Test</div>
                    <div className="text-lg font-bold text-indigo-700 mt-0.5">{postTestCount}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                    <div className="text-[10px] text-slate-500">Avg Score</div>
                    <div className="text-lg font-bold text-emerald-700 mt-0.5">
                      {hasAverageScore ? `${summary?.averageScore}%` : '—'}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Post-test participation is reported separately from total attendance. Manual attendees are not assigned a zero score.
                </p>
              </div>

              {loadError && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loadError}</span>
                </div>
              )}

              {!loadError && totalParticipants <= 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>At least one participant must be recorded before finalization.</span>
                </div>
              )}

              {isClosed && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>This CNE is already completed or cancelled. Finalization is locked.</span>
                </div>
              )}

              {!isAuthorized && !isClosed && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>You may review attendance, but you are not authorized to finalize this CNE.</span>
                </div>
              )}
            </div>

            <div className="md:col-span-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-slate-700 text-xs leading-relaxed">
                  <strong>Finalize CNE Record:</strong> Finalizing updates the session status to <strong className="text-emerald-700">COMPLETED</strong>, stores the final participant list in the authoritative CNE Schedule record, locks further QR/Post-Test/material/question/attendance changes, and preserves the record for reporting.
                </div>

                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-900 text-xs leading-relaxed">
                  Cancellation is handled separately from CNE Details using the <strong>Cancel</strong> action beside <strong>Edit</strong>. This window is intentionally finalization-only.
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Final Remarks / Clinical Observations
                  </label>
                  <textarea
                    rows={5}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isSubmitting || isClosed || !isAuthorized}
                    placeholder="Optional notes on participant engagement, clinical outcomes, or follow-up training recommendations..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isSubmitting || !canFinalize}
                  title={
                    isClosed
                      ? 'This CNE is already closed.'
                      : !isAuthorized
                      ? 'You are not authorized to finalize this CNE.'
                      : loadError
                      ? 'Attendance details could not be loaded.'
                      : totalParticipants <= 0
                      ? 'At least one participant must be recorded before finalization.'
                      : 'Finalize and complete this CNE'
                  }
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Finalizing CNE...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Finalize &amp; Complete CNE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
