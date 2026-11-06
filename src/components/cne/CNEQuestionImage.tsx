import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  const [imageRendered, setImageRendered] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    setExpanded(false);
    setImageRendered(false);
    setLoading(false);
    setSrc('');
    setError('');
    if (localPreview) { setSrc(localPreview); onAvailabilityChange?.(false); return () => { active = false; }; }
    if (!imageFileId || (!questionId && !sourceQuestionId)) { setError('Image is not yet linked.'); onAvailabilityChange?.(false); return () => { active = false; }; }
    setLoading(true);
    onAvailabilityChange?.(false);
    void ApiService.getCNEQuestionImage({ cneId, questionId, sourceQuestionId, qrToken, participantVerificationToken })
      .then(res => {
        if (!active) return;
        if (res.success && res.data?.mimeType && res.data.base64Data) {
          setSrc(`data:${res.data.mimeType};base64,${res.data.base64Data}`);
          // A successful response is not enough: confirm that the browser renders the image.
        } else {
          setError(res.message || 'Image could not be loaded.');
          onAvailabilityChange?.(false);
        }
      })
      .catch(() => { if (active) { setError('Image could not be loaded.'); onAvailabilityChange?.(false); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cneId, questionId, sourceQuestionId, imageFileId, localPreview, qrToken, participantVerificationToken, retry]);
  if (error) return <div role="alert" className="my-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
    {error} <button type="button" onClick={() => setRetry(v => v + 1)} className="ml-2 underline font-semibold">Retry Image</button>
  </div>;
  if (!src && !loading) return null;
  return <>
    {(loading || (src && !imageRendered)) && <div role="status" aria-live="polite" className="my-3 flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
      <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-teal-700" />
      <span className="font-semibold">Loading clinical image…</span>
      <span className="text-center text-[11px]">Retrieving the image securely. Question text is ready.</span>
    </div>}
    {src && <button type="button" onClick={() => setExpanded(true)} className={`my-2 max-w-full rounded-xl border border-slate-200 bg-white p-2 text-left ${imageRendered ? 'inline-block' : 'hidden'}`} aria-label="Enlarge clinical question image">
      <img src={src} alt="Clinical image for this MCQ" onLoad={() => {setImageRendered(true);onAvailabilityChange?.(true);}} onError={() => {setError('Clinical image could not be displayed.');setImageRendered(false);onAvailabilityChange?.(false);}} className={`${compact ? 'max-h-24 max-w-40' : 'max-h-72 max-w-full'} w-auto object-contain rounded-md`} />
      <span className="block pt-1 text-[11px] font-medium text-indigo-700">Tap to enlarge image</span>
    </button>}
    {expanded && imageRendered && <div role="dialog" aria-modal="true" aria-label="Enlarged clinical image" className="fixed inset-0 z-[120] bg-slate-950/90 flex flex-col items-center justify-center p-4" onClick={() => setExpanded(false)}>
      <button type="button" className="absolute right-5 top-5 text-white rounded border border-white/50 px-3 py-2" onClick={() => setExpanded(false)}>Close ✕</button>
      <img src={src} alt={'Enlarged clinical question image'} className="max-h-[85vh] max-w-[95vw] object-contain" onClick={e => e.stopPropagation()} />
    </div>}
  </>;
};
