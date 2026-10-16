import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Lock, UserCheck } from 'lucide-react';
import type { CNERecord, SessionUser, CneInterestStatus } from '../../types';
import { parseCneStartTimestamp } from '../../utils';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';

interface CalendarInterestControlsProps {
  cne: CNERecord;
  user: SessionUser;
}

/** Calendar uses the SAME authenticated interest APIs and sheet as CNE Schedule. */
export const CalendarInterestControls: React.FC<CalendarInterestControlsProps> = ({ cne, user }) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<CneInterestStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const cneId = String(cne.cneId || cne.classId || '').trim();
  const startMs = useMemo(() => parseCneStartTimestamp(
    cne.date || cne.fromDate,
    (cne as any).fromTime || (cne as any).startTime || (cne as any).time
  ), [cne.date, cne.fromDate, (cne as any).fromTime, (cne as any).startTime, (cne as any).time]);
  const isOpen = Boolean(cneId) && String(cne.status || '').trim().toLowerCase() === 'scheduled'
    && Number.isFinite(startMs) && clock < startMs;

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    setStatus(null);
    setStatusError(null);
    if (!user.employeeId || !cneId) {
      setChecking(false);
      return () => { active = false; };
    }
    setChecking(true);
    ApiService.getMyCneInterestStatus(cneId)
      .then((response) => {
        if (!active) return;
        if (response.success && response.data) setStatus(response.data.status);
        else setStatusError(response.message || 'Unable to check interest status.');
      })
      .catch((err) => {
        if (active) setStatusError(err?.message || 'Unable to check interest status.');
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [cneId, user.employeeId, showToast]);

  const changeInterest = async (withdraw: boolean) => {
    if (submitting || checking || statusError || !isOpen || !user.employeeId || !cneId) return;
    setSubmitting(true);
    try {
      const response = withdraw
        ? await ApiService.withdrawCneInterest(cneId)
        : await ApiService.registerCneInterest(cneId);
      if (!response.success) {
        showToast(response.message || 'Unable to update your interest.', 'error');
        return;
      }
      setStatus(withdraw ? 'WITHDRAWN' : 'INTERESTED');
      showToast(withdraw
        ? 'You have withdrawn your interest in this CNE.'
        : 'Your interest in this CNE has been recorded successfully.', withdraw ? 'info' : 'success');
    } catch (err: any) {
      showToast(err?.message || 'Unable to update your interest.', 'error');
    } finally {
      setSubmitting(false);
      setClock(Date.now());
    }
  };

  return (
    <section className="mt-4 bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-3" aria-label="Expression of Interest">
      <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wide">Expression of Interest</h4>
      <p className="text-xs text-slate-600">Expressing interest does not confirm enrollment or record attendance.</p>
      {checking ? (
        <div className="flex items-center gap-2 text-xs text-slate-600" role="status">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking your interest status…
        </div>
      ) : statusError ? (
        <p role="alert" className="text-xs font-medium text-rose-700">
          {statusError} Please reopen this CNE to retry.
        </p>
      ) : !isOpen ? (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Lock className="w-4 h-4" /> Interest registration is closed for this CNE.
          {status === 'INTERESTED' && <span className="text-emerald-700">(Previously interested)</span>}
        </div>
      ) : status === 'INTERESTED' ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
            <Check className="w-4 h-4" /> Interested
          </span>
          <button type="button" disabled={submitting} onClick={() => changeInterest(true)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline disabled:opacity-50">
            {submitting ? 'Withdrawing…' : 'Withdraw Interest'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={submitting} onClick={() => changeInterest(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            {submitting ? 'Saving…' : "I'm Interested"}
          </button>
          {status === 'WITHDRAWN' && <span className="text-xs text-slate-500">Previously withdrawn</span>}
        </div>
      )}
    </section>
  );
};
