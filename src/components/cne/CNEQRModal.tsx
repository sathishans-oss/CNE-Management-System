import React, { useEffect, useRef, useState } from 'react';
import { QrCode, X, Copy, Check, Loader2, AlertCircle, PlayCircle, Lock } from 'lucide-react';
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

const getCneStatus = (cne: CNERecord) => String(cne.status || '').trim().toLowerCase();
const isCneClosed = (cne: CNERecord) => {
  const status = getCneStatus(cne);
  return status === 'completed' || status === 'canceled' || status === 'cancelled';
};

export const CNEQRModal: React.FC<CNEQRModalProps> = ({
  cne,
  isAuthorized = true,
  onClose,
  onOpenPostTest
}) => {
  const cneId = cne.cneId || cne.classId || '';
  const closed = isCneClosed(cne);
  const canManageQr = Boolean(isAuthorized && !closed && cneId);

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasQR, setHasQR] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [postTestUrl, setPostTestUrl] = useState('');
  const [finalizedCount, setFinalizedCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState('');

  const requestRef = useRef(0);
  const generationAttemptRef = useRef('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { success, error } = useToast();

  const renderQr = async (token: string, requestId: number) => {
    const url = `${window.location.origin}/?postTest=${encodeURIComponent(token)}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    });

    if (requestId !== requestRef.current) return;
    setQrToken(token);
    setPostTestUrl(url);
    setQrDataUrl(dataUrl);
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

    if (!cneId) {
      setLoading(false);
      setStatusMessage('CNE ID is unavailable. QR code cannot be loaded.');
      return () => {
        requestRef.current += 1;
      };
    }

    const loadQrState = async () => {
      try {
        // Step 1: Check only. This never creates a second token.
        const checkRes = await ApiService.getQRToken(cneId, { checkOnly: true });
        if (requestId !== requestRef.current) return;

        if (!checkRes.success || !checkRes.data) {
          setStatusMessage(checkRes.message || 'Unable to check QR status for this CNE.');
          return;
        }

        const currentFinalizedCount = Number(checkRes.data.finalizedCount || 0);
        setFinalizedCount(currentFinalizedCount);

        if (checkRes.data.hasQR && checkRes.data.qrToken) {
          await renderQr(checkRes.data.qrToken, requestId);
          return;
        }

        if (closed) {
          setStatusMessage('QR generation is disabled because this CNE is closed.');
          return;
        }

        if (!isAuthorized) {
          setStatusMessage('QR generation is restricted to authorized CNE operators.');
          return;
        }

        if (currentFinalizedCount < 5) {
          setStatusMessage(`At least 5 valid finalized questions are required. Currently finalized: ${currentFinalizedCount}/5.`);
          return;
        }

        // Step 2: Auto-create exactly once after the 5-question gate is satisfied.
        if (generationAttemptRef.current === cneId) return;
        generationAttemptRef.current = cneId;
        setIsGenerating(true);

        const createRes = await ApiService.getQRToken(cneId, { checkOnly: false });
        if (requestId !== requestRef.current) return;

        if (!createRes.success || !createRes.data?.qrToken) {
          setStatusMessage(createRes.message || 'Unable to generate QR code for this CNE.');
          return;
        }

        setFinalizedCount(Number(createRes.data.finalizedCount || currentFinalizedCount));
        await renderQr(createRes.data.qrToken, requestId);
        if (requestId === requestRef.current) {
          success('Evaluation QR code generated and activated.');
        }
      } catch (e: any) {
        if (requestId !== requestRef.current) return;
        console.warn('Error loading/generating QR token:', e);
        setStatusMessage(e?.message || 'Unable to load QR code for this CNE.');
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setIsGenerating(false);
        }
      }
    };

    loadQrState();

    return () => {
      requestRef.current += 1;
    };
  }, [cneId, closed, isAuthorized, success]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!postTestUrl || closed) return;
    try {
      await navigator.clipboard.writeText(postTestUrl);
      setCopied(true);
      success('Post-test link copied to clipboard.');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch (e: any) {
      error(e?.message || 'Unable to copy the post-test link.');
    }
  };

  const handleOpenPostTest = () => {
    if (!canManageQr || !hasQR || !qrToken || !onOpenPostTest) return;
    onOpenPostTest(qrToken);
  };

  const readyForQr = finalizedCount >= 5;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-[90vw] max-w-[1050px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evaluation QR Code</h3>
              <p className="text-[10px] text-slate-500">Generated once after 5 valid finalized questions are available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs">{isGenerating ? 'Generating evaluation QR code...' : 'Checking QR status for CNE session...'}</span>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/40 items-center">
            {/* Left Column: QR Code Display or Status */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-slate-200 shadow-xs text-center min-h-[280px]">
              {hasQR && qrDataUrl && !closed ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                    <img
                      src={qrDataUrl}
                      alt={`Post-Test QR for ${cne.topic || cneId}`}
                      className="w-52 h-52 mx-auto rounded-xl shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3 font-medium">
                    Scan with any mobile camera or scanner
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${closed ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-indigo-50 border-indigo-100 text-indigo-500'}`}>
                    {closed ? <Lock className="w-9 h-9 stroke-[1.5]" /> : <QrCode className="w-10 h-10 stroke-[1.5]" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {closed ? 'QR / Post-Test Disabled' : readyForQr && isAuthorized ? 'QR Generation Unavailable' : 'QR Code Not Yet Available'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      {statusMessage || (readyForQr ? 'QR code will be generated automatically when this workflow is opened by an authorized user.' : 'Finalize at least 5 valid questions before creating the QR code.')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Information, Status, and Link */}
            <div className="md:col-span-7 space-y-4">
              {closed ? (
                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5">Session Closed</strong>
                    <span>QR and post-test access are disabled after CNE finalization/completion or cancellation.</span>
                  </div>
                </div>
              ) : finalizedCount < 5 ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5">Question Bank Pending</strong>
                    <span>At least 5 valid finalized questions are required before QR code activation. Currently finalized: {finalizedCount}/5.</span>
                  </div>
                </div>
              ) : hasQR ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span><strong>{finalizedCount} questions</strong> are active. This QR token is already generated and is being reused.</span>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing the evaluation QR code...</span>
                </div>
              )}

              {/* Meta details */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 shrink-0">Topic:</span>
                  <span className="font-bold text-slate-800 text-right break-words">{cne.topic || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 shrink-0">Area/Ward:</span>
                  <span className="font-semibold text-slate-700 text-right break-words">{cne.area || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 shrink-0">Date &amp; Time:</span>
                  <span className="font-semibold text-slate-700 text-right break-words">{formatCneDateTimeDisplay(cne.date, cne.toDate)}</span>
                </div>
              </div>

              {/* Direct Link - only while session is open */}
              {hasQR && postTestUrl && !closed && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Direct Participant Evaluation URL
                  </label>
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-300 shadow-xs">
                    <input
                      type="text"
                      readOnly
                      value={postTestUrl}
                      className="flex-1 bg-transparent text-xs text-slate-700 px-2 truncate outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No separate Save button: QR creation is automatic after the 5-question gate. */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {!isAuthorized
              ? 'View-only mode.'
              : closed
              ? 'QR and post-test are locked for this closed CNE.'
              : hasQR
              ? 'QR code is active and will not be regenerated.'
              : finalizedCount < 5
              ? `${finalizedCount}/5 valid finalized questions available.`
              : 'QR generation is automatic.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
            {hasQR && canManageQr && onOpenPostTest && (
              <button
                type="button"
                onClick={handleOpenPostTest}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Open Post-Test</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
