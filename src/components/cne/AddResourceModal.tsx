import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, Loader2, Upload, User, X } from 'lucide-react';
import { CNERecord } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { formatCneDateTimeDisplay } from '../../utils';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Kept for existing callers; only CNE material upload is supported now.
  initialType?: 'CNE_LEARNING_MATERIAL' | 'NURSING_REFERENCE_LIB';
}

/**
 * CNE material upload is the ONLY new-resource indexing workflow.
 * Existing Nursing Reference Library PDFs remain readable in Learning Resources,
 * but they are not indexed for Gemini questions and cannot be uploaded here.
 */
export const AddResourceModal: React.FC<AddResourceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [classes, setClasses] = useState<CNERecord[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedCneId, setSelectedCneId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle'|'upload'|'index'|'done'|'failed'>('idle');
  const [stageError, setStageError] = useState('');
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef(0);
  const submitRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error, success, warning } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const request = ++requestRef.current;
    setSelectedCneId(''); setFile(null); setNotes(''); setLoadError('');
    setLoadingClasses(true);
    void ApiService.getCNERecords().then(response => {
      if (request !== requestRef.current) return;
      if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || 'Could not load CNE sessions.');
      setClasses(response.data.filter(record =>
        !['completed', 'finalized', 'canceled', 'cancelled'].includes(String(record.status || 'Scheduled').trim().toLowerCase())));
    }).catch(err => {
      if (request === requestRef.current) setLoadError(err?.message || 'Unable to load CNE sessions.');
    }).finally(() => { if (request === requestRef.current) setLoadingClasses(false); });
    return () => { requestRef.current++; };
  }, [isOpen]);

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (!/\.pdf$/i.test(candidate.name)) { error('Only PDF learning material is supported.'); return; }
    if (candidate.size > 3 * 1024 * 1024) { error('CNE learning material must not exceed 3 MB.'); return; }
    setFile(candidate);
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitRef.current) return;
    if (!selectedCneId || !file) { error('Choose a CNE session and a PDF learning material file.'); return; }
    const selected = classes.find(record => record.cneId === selectedCneId);
    if (!selected) { error('The selected CNE is no longer available. Refresh the page.'); return; }
    submitRef.current = true; setSubmitting(true);setUploadStage('upload');setStageError('');
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected PDF.'));
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.readAsDataURL(file);
      });
      const result = await ApiService.uploadLearningResource({
        cneId: selectedCneId, base64Data, fileName: file.name,
        fileType: file.type || 'application/pdf', unifiedContent: notes.trim() || undefined, deferIndexing:true
      });
      if (!result.success) throw new Error(result.message || 'Could not upload CNE material.');
      setUploadStage('index');
      const indexed=await ApiService.reindexLearningResource(selectedCneId);
      if(!indexed.success){setUploadStage('failed');setStageError(indexed.message||'PDF indexing failed.');warning('PDF saved, but indexing failed: '+(indexed.message||'Retry from the CNE Material page.'));onSuccess();return;}
      setUploadStage('done');success('CNE PDF uploaded and indexed. '+Number(indexed.data?.chunksCount ?? (indexed as any).chunksCount ?? 0)+' valid chunks are ready.');
      onSuccess();onClose();
    } catch (err: any) {
      setUploadStage('failed');setStageError(err?.message || 'Could not upload CNE learning material.');error(err?.message || 'Could not upload CNE learning material.');
    } finally { submitRef.current = false; setSubmitting(false); }
  };

  if (!isOpen) return null;
  const selected = classes.find(record => record.cneId === selectedCneId);
  return (
    <div role="dialog" aria-modal="true" aria-label="Upload CNE learning material" className="fixed inset-0 z-50 bg-slate-900/80 flex items-stretch sm:items-center justify-center p-0 sm:p-5">
      <div className="w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[92dvh] bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 bg-slate-900 text-white px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5"/><h2 className="font-bold">Upload CNE Learning Material</h2></div>
          <button type="button" disabled={submitting} aria-label="Close" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-700"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={upload} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-4 sm:px-6 py-5 text-xs">
            <p className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-teal-900">Only material uploaded for this specific CNE will be indexed and used for Gemini question generation. Existing Library PDFs remain available for reading, not AI indexing.</p>
            <label className="block font-bold text-slate-700">CNE Topic / Session <span className="text-rose-600">*</span>
              <select required value={selectedCneId} onChange={e => setSelectedCneId(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-xs font-normal text-slate-900">
                <option value="">Select a scheduled CNE</option>
                {classes.map(record => {
                  const id = record.cneId || '';
                  return <option key={id} value={id}>{record.topic} — {formatCneDateTimeDisplay(record.date, record.toDate)} — {record.area}</option>;
                })}
              </select>
            </label>
            {loadingClasses && <p role="status" className="flex items-center gap-2 text-teal-700"><Loader2 className="w-4 h-4 animate-spin"/>Loading scheduled CNE topics…</p>}
            {loadError && <p role="alert" className="text-rose-700">{loadError}</p>}
            {selected && <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3"><User className="w-4 h-4"/>Resource Person: {selected.resourcePersonName || selected.instructor || 'As per CNE Schedule'}</div>}
            <div>
              <label className="mb-1.5 block font-bold text-slate-700">Learning material PDF (maximum 3 MB) <span className="text-rose-600">*</span></label>
              <div onDragEnter={e => {e.preventDefault();setDragActive(true);}} onDragLeave={e => {e.preventDefault();setDragActive(false);}}
                onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault();setDragActive(false);chooseFile(e.dataTransfer.files[0]);}}
                className={`rounded-xl border-2 border-dashed p-5 text-center ${dragActive?'border-teal-600 bg-teal-50':'border-slate-300'}`}>
                <input ref={fileInputRef} id="cne-material-file" type="file" accept=".pdf,application/pdf" className="sr-only" onChange={e => chooseFile(e.target.files?.[0])}/>
                <label htmlFor="cne-material-file" className="inline-flex cursor-pointer items-center gap-2 text-teal-700 font-bold"><Upload className="h-4 w-4"/> {file?'Change PDF':'Browse or drop PDF here'}</label>
                {file && <div className="mt-2 flex items-center justify-center gap-2 text-slate-700"><FileText className="h-4 w-4"/>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</div>}
              </div>
            </div>
            <label className="block font-bold text-slate-700">Notes (optional)
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-xs font-normal"/>
            </label>
          </div>
          {uploadStage!=='idle' && <div role="status" className="shrink-0 px-4 py-2 border-t text-xs text-slate-700 space-y-1.5">
            <p className="flex items-center gap-2">{['index','done'].includes(uploadStage)?<span className="text-emerald-600">✓</span>:uploadStage==='upload'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<span>○</span>} 1. Uploading CNE PDF</p>
            <p className="flex items-center gap-2">{uploadStage==='done'?<span className="text-emerald-600">✓</span>:uploadStage==='index'?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<span>○</span>} 2. Indexing PDF content for AI generation</p>
            {stageError && <p className="text-rose-700">{stageError}</p>}
          </div>}
          <div className="shrink-0 flex justify-end gap-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancel</button>
            <button type="submit" disabled={submitting || loadingClasses || !file || !selectedCneId} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>} {submitting?'Uploading & indexing…':'Upload CNE Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
