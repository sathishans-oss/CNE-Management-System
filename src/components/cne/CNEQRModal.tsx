import React, { useEffect, useRef, useState } from 'react';
import {
  QrCode, X, Copy, Check, Loader2, AlertCircle, PlayCircle, Lock,
  Download, Maximize2, ArrowRight, BookOpen, CalendarDays, MapPin, RefreshCw, Link2
} from 'lucide-react';
import QRCode from 'qrcode';
import { CNERecord } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { formatCneDateTimeDisplay } from '../../utils';

interface CNEQRModalProps {
  cne: CNERecord;
  isAuthorized?: boolean;
  onClose: () => void;
  onSaveSuccess?: (cneId: string) => void;
  onOpenPostTest?: (token: string) => void;
}

const isCneClosed = (cne: CNERecord) => {
  const status = String(cne.status || '').trim().toLowerCase();
  return ['completed', 'finalized', 'finalised', 'canceled', 'cancelled'].includes(status);
};

/**
 * Presentation-ready post-test QR. Uses the EXISTING authorized getQRToken
 * endpoints, never requests a second token if one already exists, and never
 * exposes a closed CNE's active participant link.
 */
export const CNEQRModal: React.FC<CNEQRModalProps> = ({
  cne,
  isAuthorized = true,
  onClose,
  onOpenPostTest
}) => {
  const cneId = cne.cneId || '';
  const closed = isCneClosed(cne);
  const canManageQr = Boolean(isAuthorized && !closed && cneId);

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasQR, setHasQR] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [postTestUrl, setPostTestUrl] = useState('');
  const [finalizedCount, setFinalizedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [retryNumber, setRetryNumber] = useState(0);

  const requestRef = useRef(0);
  const generationAttemptRef = useRef('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { success, error } = useToast();

  const renderQr = async (token: string, requestId: number) => {
    const url = `${window.location.origin}/?postTest=${encodeURIComponent(token)}`;
    // Generate a high-resolution PNG once, then reuse for inline, presentation and download.
    const png = await QRCode.toDataURL(url, {
      width: 1024,
      margin: 3,
      color: { dark: '#25105e', light: '#ffffff' }
    });
    if (requestId !== requestRef.current) return;
    setQrToken(token);
    setQrDataUrl(png);
    setPostTestUrl(url);
    setHasQR(true);
  };

  useEffect(() => {
    const requestId = ++requestRef.current;
    generationAttemptRef.current = '';
    setLoading(true);
    setIsGenerating(false);
    setHasQR(false);
    setQrToken('');
    setQrDataUrl('');
    setPostTestUrl('');
    setFinalizedCount(0);
    setStatusMessage('');
    setPresentationOpen(false);
    setCopied(false);

    if (!cneId) {
      setLoading(false);
      setStatusMessage('CNE ID is missing. The evaluation QR cannot be loaded.');
      return () => { requestRef.current += 1; };
    }

    const loadQr = async () => {
      try {
        // Query first: this avoids generating extra tokens when a QR already exists.
        const checked = await ApiService.getQRToken(cneId, { checkOnly: true });
        if (requestId !== requestRef.current) return;
        if (!checked.success || !checked.data) {
          setStatusMessage(checked.message || 'QR status is unavailable.');
          return;
        }

        const count = Number(checked.data.finalizedCount || 0);
        setFinalizedCount(count);

        // A QR may already exist for a closed session; we do NOT display its link.
        if (closed) {
          setStatusMessage('Post-Test access is closed for this CNE.');
          return;
        }
        if (checked.data.hasQR && checked.data.qrToken) {
          await renderQr(checked.data.qrToken, requestId);
          return;
        }
        if (!isAuthorized) {
          setStatusMessage('Only authorized CNE operators can activate the evaluation QR.');
          return;
        }
        if (count < 5) {
          setStatusMessage(`Finalize at least five valid questions. Current count: ${count}/5.`);
          return;
        }

        if (generationAttemptRef.current === cneId) return;
        generationAttemptRef.current = cneId;
        setIsGenerating(true);
        const created = await ApiService.getQRToken(cneId, { checkOnly: false });
        if (requestId !== requestRef.current) return;
        if (!created.success || !created.data?.qrToken) {
          setStatusMessage(created.message || 'QR creation did not complete.');
          return;
        }
        setFinalizedCount(Number(created.data.finalizedCount || count));
        await renderQr(created.data.qrToken, requestId);
        if (requestId === requestRef.current) success('Evaluation QR code is ready.');
      } catch (e: any) {
        if (requestId === requestRef.current) setStatusMessage(e?.message || 'QR status could not be checked.');
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setIsGenerating(false);
        }
      }
    };
    void loadQr();
    return () => { requestRef.current += 1; };
  }, [cneId, closed, isAuthorized, retryNumber, success]);

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!presentationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresentationOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [presentationOpen]);

  const handleCopy = async () => {
    if (!postTestUrl || closed) return;
    try {
      await navigator.clipboard.writeText(postTestUrl);
      setCopied(true);
      success('Participant Post-Test link copied.');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch (e: any) {
      error(e?.message || 'Unable to copy link.');
    }
  };

  const handleDownload = () => {
    if (!hasQR || !qrDataUrl || closed) return;
    try {
      const anchor = document.createElement('a');
      anchor.href = qrDataUrl;
      anchor.download = `CNE_PostTest_QR_${cneId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0,60)}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (e: any) {
      error(e?.message || 'Unable to download QR image.');
    }
  };

  const handleOpenPostTest = () => {
    if (canManageQr && hasQR && qrToken && onOpenPostTest) onOpenPostTest(qrToken);
  };

  const showQR = hasQR && Boolean(qrDataUrl) && !closed;
  const notReady = finalizedCount < 5;
  const canRetry = !loading && !showQR && canManageQr && !notReady;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-slate-900/60 p-0 sm:items-center sm:p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="cne-qr-title" className="flex h-[100dvh] min-h-0 w-full max-w-[1080px] flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-violet-900 to-purple-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><QrCode className="h-5 w-5" /></div>
            <div className="min-w-0"><h2 id="cne-qr-title" className="text-sm font-bold sm:text-lg">Evaluation QR Code</h2><p className="text-[11px] text-purple-100">Participant Post-Test Access</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/10" aria-label="Close QR modal"><X className="h-5 w-5"/></button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5">
          {loading ? <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 text-xs text-slate-600"><Loader2 className="h-8 w-8 animate-spin text-purple-700"/>{isGenerating ? 'Generating evaluation QR code…' : 'Checking current QR and finalized questions…'}</div> : <div className="mx-auto max-w-4xl space-y-4">
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-purple-100 bg-purple-50/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div className="min-w-0"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><BookOpen className="h-5 w-5"/></div><div className="min-w-0"><h3 className="break-words text-base font-bold text-slate-900 sm:text-lg">{cne.topic || 'CNE Session'}</h3><div className="mt-1.5 space-y-1 text-xs text-slate-600"><p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-purple-700"/>{cne.area || 'Area not specified'}</p><p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-purple-700"/>{formatCneDateTimeDisplay(cne.date, cne.toDate)}</p></div></div></div></div>
              <div className={`flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-bold sm:self-center ${closed?'border-slate-300 bg-slate-100 text-slate-700':showQR?'border-emerald-200 bg-emerald-100 text-emerald-800':'border-amber-200 bg-amber-50 text-amber-900'}`}>
                {showQR?<Check className="h-4 w-4"/>:closed?<Lock className="h-4 w-4"/>:<AlertCircle className="h-4 w-4"/>}
                {closed?'Post-Test Closed':showQR?`${finalizedCount} Finalized · QR Active`:`${finalizedCount}/5 Finalized · QR Pending`}
              </div>
            </div>

            {showQR ? <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.9fr)] sm:items-center">
                <div className="order-2 space-y-3 sm:order-1">
                  <p className="text-sm font-bold text-slate-900">Participant Post-Test Link</p>
                  <div className="flex min-w-0 items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 p-2"><Link2 className="h-4 w-4 shrink-0 text-purple-700"/><input aria-label="Participant Post-Test link" readOnly value={postTestUrl} className="min-w-0 flex-1 truncate bg-transparent text-[11px] text-purple-950 outline-none"/><button type="button" onClick={() => void handleCopy()} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-purple-700 px-3 text-[11px] font-bold text-white">{copied?<Check className="h-3.5 w-3.5"/>:<Copy className="h-3.5 w-3.5"/>}{copied?'Copied':'Copy Link'}</button></div>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setPresentationOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-3 text-xs font-bold text-white"><Maximize2 className="h-4 w-4"/>Full Screen</button><button type="button" onClick={handleDownload} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-3 text-xs font-bold text-purple-800"><Download className="h-4 w-4"/>Download QR</button></div>
                  <p className="text-xs leading-relaxed text-slate-600">Present the QR on a large screen so participants can scan with their phones. The same authorized token is reused.</p>
                </div>
                <div className="order-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-purple-100 bg-purple-50/60 p-4 sm:order-2">
                  <img src={qrDataUrl} alt={`Participant post-test QR for ${cne.topic || 'CNE'}`} className="aspect-square w-full max-w-[310px] rounded-xl border-8 border-white bg-white object-contain shadow-sm"/>
                  <p className="text-[11px] font-semibold text-purple-800">Scan to open the Post-Test</p>
                </div>
              </div>
            </> : <div role="status" className={`rounded-2xl border p-5 text-center ${closed?'border-slate-200 bg-slate-50':'border-amber-200 bg-amber-50'}`}>
              {closed?<Lock className="mx-auto h-10 w-10 text-slate-500"/>:<QrCode className="mx-auto h-10 w-10 text-amber-700"/>}
              <h3 className="mt-3 text-sm font-bold text-slate-900">{closed?'Post-Test Access Closed':notReady?'QR Not Ready':'QR Code Unavailable'}</h3>
              <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-700">{statusMessage || (notReady?'Finalize at least five valid Post-Test questions first.':'Check QR status or retry.')}</p>
              {!closed && notReady && <div role="progressbar" aria-label="Finalized questions" aria-valuenow={Math.min(5, finalizedCount)} aria-valuemin={0} aria-valuemax={5} className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-purple-700" style={{width:`${Math.min(100,finalizedCount*20)}%`}}/></div>}
              {canRetry && <button type="button" onClick={() => setRetryNumber(n=>n+1)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-4 w-4"/>Retry QR Status</button>}
            </div>}

            <details className="rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3 text-xs">
              <summary className="cursor-pointer font-bold text-purple-900">CNE Session Details</summary>
              <dl className="mt-3 grid gap-2 text-slate-700 sm:grid-cols-2"><div><dt className="text-slate-500">Topic</dt><dd className="font-semibold">{cne.topic || '—'}</dd></div><div><dt className="text-slate-500">Area/Ward</dt><dd className="font-semibold">{cne.area || '—'}</dd></div><div><dt className="text-slate-500">Date and time</dt><dd className="font-semibold">{formatCneDateTimeDisplay(cne.date, cne.toDate)}</dd></div><div><dt className="text-slate-500">Finalized Post-Test questions</dt><dd className="font-semibold">{finalizedCount}</dd></div></dl>
            </details>
          </div>}
        </main>

        <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700">Close</button>
          <button type="button" onClick={handleOpenPostTest} disabled={!showQR || !canManageQr || !onOpenPostTest} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><PlayCircle className="h-4 w-4"/>Open Post-Test <ArrowRight className="h-4 w-4"/></button>
        </footer>
      </div>

      {presentationOpen && showQR && <div role="dialog" aria-modal="true" aria-label="Post-Test QR presentation" className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-y-auto bg-white p-4 text-center sm:p-8">
        <button type="button" onClick={() => setPresentationOpen(false)} aria-label="Exit full-screen QR presentation" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm"><X className="h-6 w-6"/></button>
        <h2 className="mt-8 max-w-3xl text-lg font-extrabold text-purple-950 sm:text-3xl">{cne.topic}</h2>
        <p className="mt-1 text-sm font-semibold text-purple-800">Scan to open the CNE Post-Test</p>
        <img src={qrDataUrl} alt="Full-screen participant Post-Test QR code" className="my-4 aspect-square w-full max-w-[min(72vh,680px)] rounded-2xl border-[12px] border-white bg-white object-contain shadow-xl"/>
        <p className="max-w-3xl break-all text-xs text-slate-500 sm:text-sm">{postTestUrl}</p>
        <button type="button" onClick={() => setPresentationOpen(false)} className="mt-4 min-h-11 rounded-lg bg-purple-700 px-6 text-sm font-bold text-white">Exit Presentation</button>
      </div>}
    </div>
  );
};
