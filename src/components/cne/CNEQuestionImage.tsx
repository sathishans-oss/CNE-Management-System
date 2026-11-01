import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';

/** Image bytes are retrieved only after backend authorization, never by a public Drive URL. */
export const CNEQuestionImage: React.FC<{
  cneId: string;
  questionId?: string;
  sourceQuestionId?: string;
  imageFileId?: string;
  qrToken?: string;
  participantVerificationToken?: string;
  localPreview?: string;
  compact?: boolean;
  onAvailabilityChange?: (available: boolean) => void;
}> = ({ cneId, questionId, sourceQuestionId, imageFileId, qrToken, participantVerificationToken, localPreview, compact = false, onAvailabilityChange }) => {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    setExpanded(false);
    setSrc('');
    setError('');
    if (localPreview) { setSrc(localPreview); onAvailabilityChange?.(true); return () => { active = false; }; }
    if (!imageFileId || (!questionId && !sourceQuestionId)) { setError('Image is not yet linked.'); onAvailabilityChange?.(false); return () => { active = false; }; }
    setLoading(true);
    onAvailabilityChange?.(false);
    void ApiService.getCNEQuestionImage({ cneId, questionId, sourceQuestionId, qrToken, participantVerificationToken })
      .then(res => {
        if (!active) return;
        if (res.success && res.data?.mimeType && res.data.base64Data) {
          setSrc(`data:${res.data.mimeType};base64,${res.data.base64Data}`);
          onAvailabilityChange?.(true);
        } else {
          setError(res.message || 'Image could not be loaded.');
          onAvailabilityChange?.(false);
        }
      })
      .catch(() => { if (active) { setError('Image could not be loaded.'); onAvailabilityChange?.(false); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cneId, questionId, sourceQuestionId, imageFileId, localPreview, qrToken, participantVerificationToken, retry]);
  if (loading) return <div role="status" className="my-3 rounded-lg bg-slate-100 p-4 text-xs text-slate-600">Loading clinical image…</div>;
  if (error) return <div role="alert" className="my-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error} <button type="button" onClick={() => setRetry(v => v + 1)} className="ml-2 underline font-semibold">Retry</button></div>;
  if (!src) return null;
  return <>
    <button type="button" onClick={() => setExpanded(true)} className={`my-2 block max-w-full rounded-xl border border-slate-200 bg-white p-2 text-left ${compact ? 'inline-block' : ''}`} aria-label="Enlarge clinical question image">
      <img src={src} alt={'Clinical image for this MCQ'} className={`${compact ? 'max-h-24 max-w-40' : 'max-h-72 max-w-full'} w-auto object-contain rounded-md`} />
      <span className="block pt-1 text-[11px] font-medium text-indigo-700">Tap to enlarge image</span>
    </button>
    {expanded && <div role="dialog" aria-modal="true" aria-label="Enlarged clinical image" className="fixed inset-0 z-[120] bg-slate-950/90 flex flex-col items-center justify-center p-4" onClick={() => setExpanded(false)}>
      <button type="button" className="absolute right-5 top-5 text-white rounded border border-white/50 px-3 py-2" onClick={() => setExpanded(false)}>Close ✕</button>
      <img src={src} alt={'Enlarged clinical question image'} className="max-h-[85vh] max-w-[95vw] object-contain" onClick={e => e.stopPropagation()} />
    </div>}
  </>;
};
