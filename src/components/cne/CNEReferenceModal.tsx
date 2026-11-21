import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  X,
  FileText,
  CheckCircle2,
  Loader2,
  Save,
  Info,
  Upload,
  ArrowRight,
  AlertCircle,
  Trash2,
  Lock,
  ChevronDown,
  Eye,
  RefreshCw,
  ShieldCheck,
  Files,
  PencilLine
} from 'lucide-react';
import { CNERecord, CNELearningResourceMetadata } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { formatCneDateTimeDisplay } from '../../utils';
import { MaterialIndexWarnings } from './MaterialIndexWarnings';
import { MaterialIndexStages, MaterialIndexStage } from './MaterialIndexStages';
import type { ProcessingProgress } from './ProcessingSteps';
import { MaterialReviewFlags, parseMaterialReviewFlags } from './MaterialReviewFlags';

interface CNEReferenceModalProps {
  cne: CNERecord;
  isAuthorized: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onNavigateToQuestions?: () => void;
}

export const CNEReferenceModal: React.FC<CNEReferenceModalProps> = ({
  cne,
  isAuthorized,
  onClose,
  onUpdated,
  onNavigateToQuestions
}) => {
  const cneId = cne.cneId || '';
  const normalizedStatus = String(cne.status || '').trim().toLowerCase();
  const isClosed = normalizedStatus === 'completed' || normalizedStatus === 'finalized' || normalizedStatus === 'finalised' || normalizedStatus === 'canceled' || normalizedStatus === 'cancelled';
  const canModify = isAuthorized && !isClosed;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'idle'|'uploading'|'uploaded'|'indexing'|'done'|'failed'>('idle');
  const [uploadStepError, setUploadStepError] = useState('');
  const [materialStage,setMaterialStage]=useState<MaterialIndexStage>('idle');
  const [reviewProgress,setReviewProgress]=useState({done:0,total:0});
  const [reviewDetail,setReviewDetail]=useState<ProcessingProgress|null>(null);
  const [indexStartedAt,setIndexStartedAt]=useState(0);
  const savingRef = useRef(false);

  // Learning material content
  const [unifiedContent, setUnifiedContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const loadRequestRef = useRef(0);
  const [indexingInfo, setIndexingInfo] = useState<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'NEEDS_REVIEW' | 'UNKNOWN';
    message?: string;
    errorCode?: string;
    chunksCount?: number;
  } | null>(null);

  // Existing Uploaded File Metadata
  const [existingResource, setExistingResource] = useState<CNELearningResourceMetadata | null>(null);

  // Newly Selected File for Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'notes'>('files');
  const [declarationExpanded, setDeclarationExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Secure Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { success, error, warning } = useToast();

  useEffect(() => {
    setUnifiedContent('');
    setUpdatedAt(undefined);
    setExistingResource(null);
    setSelectedFile(null);
    setActiveTab('files');
    setResponsibilityAccepted(true);
    setIndexingInfo(null);
    setShowDeleteConfirm(false);
    setLoadError(null);
    setUploadStep('idle');setMaterialStage('idle');setReviewProgress({done:0,total:0});setReviewDetail(null);setIndexStartedAt(0);
    setUploadStepError('');
    loadAllReferenceData();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [cneId]);

  const loadAllReferenceData = async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [refRes, resourceRes] = await Promise.all([
        ApiService.getReferenceMaterial(cneId),
        ApiService.getLearningResource(cneId)
      ]);

      if (requestId !== loadRequestRef.current) return;

      if (refRes.success && refRes.data) {
        let content = refRes.data.unifiedContent || refRes.data.referenceText || '';
        if (!content && cne.description) {
          content = cne.description;
        }
        setUnifiedContent(content);
        setUpdatedAt(refRes.data.updatedAt);
      } else if (cne.description) {
        setUnifiedContent(cne.description);
      }

      if (resourceRes.success && resourceRes.data && (resourceRes.data.hasFile || resourceRes.data.driveFileId)) {
        const resource = resourceRes.data;
        setExistingResource(resource);
        if (resource.indexingStatus) {
          setIndexingInfo({
            status: resource.indexingStatus,
            message: resource.indexingMessage,
            errorCode: resource.indexingErrorCode,
            chunksCount: resource.chunksCount
          });
        } else {
          setIndexingInfo({
            status: 'UNKNOWN',
            message: 'Indexing metadata was not returned for this previously uploaded material.'
          });
        }
      } else {
        setExistingResource(null);
        setIndexingInfo(null);
      }
    } catch (e: any) {
      if (requestId !== loadRequestRef.current) return;
      console.warn('Failed to load reference material or learning resource:', e);
      setLoadError(e?.message || 'Unable to load existing CNE material metadata.');
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  };

  const handleDeleteResource = async () => {
    if (isDeleting || isSaving || !canModify) return;
    setIsDeleting(true);
    try {
      const res = await ApiService.deleteLearningResource(cneId);
      if (res.success) {
        success('Learning resource deleted successfully.');
        setShowDeleteConfirm(false);
        setExistingResource(null);
        setSelectedFile(null);
        setIndexingInfo(null);
        if (onUpdated) onUpdated();
        await loadAllReferenceData();
      } else {
        error(res.message || 'Failed to delete learning resource.');
      }
    } catch (e: any) {
      error(e?.message || 'Error occurred while deleting learning resource.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!canModify || isSaving) {
      warning('Learning materials are locked after CNE completion/finalization or cancellation.');
      return;
    }

    const validExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt) {
      error('Invalid file format. Only PDF, DOC, DOCX, PPT and PPTX are supported.');
      return;
    }

    const MAX_CNE_LEARNING_MATERIAL_BYTES = 5 * 1024 * 1024; // 5MB authoritative limit
    if (file.size > MAX_CNE_LEARNING_MATERIAL_BYTES) {
      error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 5 MB.`);
      return;
    }

    setSelectedFile(file);
    // Keep a deliberate opt-out until the user changes the checkbox again.
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canModify) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canModify) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Core persistence handler
   * returns true on success, false on failure
   */
  const performSave = async (): Promise<boolean> => {
    if (savingRef.current || isSaving || loading || !canModify) return false;

    const hasAnyFile = selectedFile !== null || (existingResource && existingResource.hasFile);
    const hasAnyText = unifiedContent.trim().length > 0;

    if (!hasAnyFile && !hasAnyText) {
      error('Please upload a supported CNE learning material or enter educational notes.');
      return false;
    }
    if (selectedFile && !responsibilityAccepted) {
      error('Confirm your responsibility for the accuracy of the uploaded clinical material.');
      return false;
    }

    savingRef.current = true;
    setIsSaving(true);setIndexStartedAt(Date.now());setReviewDetail(null);setReviewProgress({done:0,total:0});
    setUploadStepError('');
    setUploadStep(selectedFile ? 'uploading' : 'idle');setMaterialStage(selectedFile?'upload':'idle');

    try {
      // 1. Upload newly selected file if provided
      if (selectedFile) {
        const base64Data = await fileToBase64(selectedFile);
        const uploadRes = await ApiService.uploadLearningResource({
          cneId: cneId,
          base64Data: base64Data,
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          unifiedContent: unifiedContent.trim() || undefined,
          deferIndexing: true,
          uploaderDeclaration: 'I_ACCEPT_RESPONSIBILITY'
        });

        if (!uploadRes.success) {
          setMaterialStage('failed');setUploadStep('failed');
          setUploadStepError(uploadRes.message || 'Learning material upload failed.');
          error(uploadRes.message || 'Failed to upload learning resource file to Drive.');
          return false;
        }

        setExistingResource(uploadRes.data || null);
        setSelectedFile(null);
        setUploadStep('uploaded');
        setIndexingInfo({status:'PENDING', message:'Learning material uploaded. Beginning text indexing.', chunksCount:0});
        // Stage 2: separate authenticated Apps Script execution. The file stays
        // saved if indexing fails, so the educator can retry without re-uploading.
        setUploadStep('indexing');setMaterialStage('extract');
        const indexRes = await ApiService.reindexLearningResource(cneId, responsibilityAccepted);
        if (!indexRes.success) {
          setUploadStep('failed');setMaterialStage('failed');
          const detail = indexRes.message || 'No readable CNE content could be indexed.';
          setUploadStepError(detail);
          setIndexingInfo({status:'FAILED', message:detail, errorCode:indexRes.errorCode, chunksCount:0});
          warning('Learning material uploaded, but indexing failed: ' + detail);
          if (onUpdated) onUpdated();
          return false;
        }
        const chunkCount = Number(indexRes.data?.chunksCount ?? (indexRes as any).chunksCount ?? 0);
        const warnings = Number(indexRes.data?.warningCount ?? (indexRes as any).warningCount ?? 0);
        const excluded = Number(indexRes.data?.excludedCount ?? (indexRes as any).excludedCount ?? 0);
        setMaterialStage('ai');
        setIndexingInfo({status:'PENDING',message:'Gemini is reviewing the extracted source text.',chunksCount:chunkCount});
        const reviewed=await ApiService.completeCNEMaterialTextReview(cneId,(done,total)=>setReviewProgress({done,total}),setReviewDetail,indexRes.data);
        if(!reviewed.success){
          setUploadStep('failed');setMaterialStage('failed');
          const detail=reviewed.message||'Gemini text review was interrupted; resume from Material Indexing Status.';
          setUploadStepError(detail);
          // The final batch may have persisted NEEDS_REVIEW with detailed flagged
          // chunks. Do not mislabel it PENDING based only on the wrapper failure.
          const fresh=await ApiService.getLearningResource(cneId);
          if(fresh.success&&fresh.data){
            setExistingResource(fresh.data);
            setIndexingInfo({status:fresh.data.indexingStatus||'PENDING',message:fresh.data.indexingMessage||detail,
              errorCode:fresh.data.indexingErrorCode||reviewed.errorCode,chunksCount:fresh.data.chunksCount??chunkCount});
          }else setIndexingInfo({status:reviewed.data?.status==='NEEDS_REVIEW'?'NEEDS_REVIEW':'PENDING',
            message:detail,errorCode:reviewed.errorCode,chunksCount:chunkCount});
          warning('Material saved; Gemini review not complete: '+detail);
          if(onUpdated)onUpdated();
          return false;
        }
        setMaterialStage('verify');
        setIndexingInfo({status:'SUCCESS',message:reviewed.message||'All indexed source chunks reviewed by Gemini; educator review remains necessary.',chunksCount:chunkCount});
        if(warnings) warning('Indexed '+chunkCount+' eligible chunks with '+warnings+' extraction warnings and '+excluded+' excluded ambiguous chunks.');
        else success('All '+chunkCount+' eligible material chunks received Gemini review. This is not clinical approval.');
        setMaterialStage('images');
        try {const images=await ApiService.extractCNEMaterialImages(cneId);
          if(images.success && images.data){
            if(images.data.imageCount) success(images.data.imageCount+' teaching image(s) stored privately for AI generation.');
            if(images.data.warnings?.length)warning(images.data.warnings.join(' '));
          } else warning(images.message||'Image extraction unavailable; verified text index remains saved.');
        }catch(e:any){warning(e?.message||'Image extraction could not complete; verified text index remains saved.');}
        setMaterialStage('done');setUploadStep('done');
      }

      // 2. Save unified textual content if entered
      if (hasAnyText) {
        const textRes = await ApiService.saveReferenceMaterial({
          cneId: cneId,
          unifiedContent: unifiedContent.trim(),
          referenceText: unifiedContent.trim()
        });

        if (!textRes.success) {
          error(textRes.message || 'Failed to save reference material notes.');
          return false;
        }
      }

      if (onUpdated) onUpdated();
      return true;
    } catch (e: any) {
      if(selectedFile){setMaterialStage('failed');setUploadStep('failed');setUploadStepError(e?.message||'Material processing failed.');}
      error(e?.message || 'Error occurred while saving learning resource.');
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  /**
   * Bottom button: Save
   * Stays on Material page. Does NOT move forward.
   */
  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    const onlyNotes = !selectedFile;
    const successResult = await performSave();
    if (successResult && onlyNotes) {
      success('Learning resource saved successfully.');
    }
  };

  /**
   * Bottom button: Save & Next
   * Moves forward to Questions only after successful backend persistence.
   */
  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const successResult = await performSave();
    if (successResult) {
      success('Learning resource saved. Advancing to Questions stage.');
      if (onNavigateToQuestions) {
        onNavigateToQuestions();
      }
    }
  };

  const charCount = unifiedContent.length;
  const wordCount = unifiedContent.trim() ? unifiedContent.trim().split(/\s+/).length : 0;


  const needsQualityReindex = uploadStep !== 'done' && indexingInfo?.status === 'SUCCESS' &&
    !(indexingInfo.message || '').startsWith('V3 AUTO_INDEXED | FILE=');
  const hasFidelityWarnings = !!indexingInfo &&
    (/FIDELITY_WARNINGS=[1-9][0-9]*/.test(indexingInfo.message || '') || (indexingInfo.message || '').includes('WARNING:'));
  const indexingLabel = indexingInfo?.status === 'NEEDS_REVIEW' ? 'Source clarification required' : hasFidelityWarnings && !needsQualityReindex ? 'Indexed with extraction warnings' : needsQualityReindex
    ? 'Quality reindex required'
    : indexingInfo?.status === 'SUCCESS'
    ? 'AI-ready text index'
    : indexingInfo?.status === 'NEEDS_REVIEW'
    ? 'Source clarification required'
    : indexingInfo?.status === 'FAILED'
    ? 'Indexing failed'
    : indexingInfo?.status === 'PENDING'
    ? 'Indexing pending'
    : indexingInfo?.status === 'UNKNOWN'
    ? 'Index status not reported'
    : '';

  const indexingBadgeClass = hasFidelityWarnings || needsQualityReindex
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : indexingInfo?.status === 'SUCCESS'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : indexingInfo?.status === 'NEEDS_REVIEW'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : indexingInfo?.status === 'FAILED'
    ? 'bg-rose-100 text-rose-800 border-rose-200'
    : indexingInfo?.status === 'PENDING'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';


  const openCurrentFile = async () => {
    if (!existingResource?.hasFile || isDownloading) return;
    // Open a blank preview tab synchronously, before the async download, to
    // avoid pop-up blockers on mobile browsers. Office files download normally.
    const isPdf = String(existingResource.fileName || '').toLowerCase().endsWith('.pdf');
    const preview = isPdf ? window.open('', '_blank') : null;
    setIsDownloading(true);
    try {
      const result = await ApiService.downloadLearningResource(cneId);
      if (!result.success || !result.data?.fileBase64) {
        preview?.close();
        error(result.message || 'Unable to retrieve the learning-material file.');
        return;
      }
      const mime = result.data.mimeType || (isPdf ? 'application/pdf' : 'application/octet-stream');
      const raw = atob(result.data.fileBase64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      if (isPdf && preview) {
        preview.location.href = objectUrl;
      } else {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = result.data.fileName || existingResource.fileName || 'CNE_learning_material';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (e: any) {
      preview?.close();
      error(e?.message || 'Could not download the selected material.');
    } finally {
      setIsDownloading(false);
    }
  };

  const flagsCount = parseMaterialReviewFlags(indexingInfo?.message || '').length;
  const extractionWarningsCount = Number((/FIDELITY_WARNINGS=(\d+)/.exec(indexingInfo?.message || '') || [])[1] || 0);
  const needsClarification = Boolean(existingResource?.hasFile && (indexingInfo?.status === 'NEEDS_REVIEW' || flagsCount > 0 || extractionWarningsCount > 0));
  const uploadInProgress = isSaving && uploadStep !== 'idle' && uploadStep !== 'done';
  const statusRequiresAction = Boolean(existingResource?.hasFile && (indexingInfo?.status === 'FAILED' || indexingInfo?.status === 'PENDING' || indexingInfo?.status === 'UNKNOWN' || needsQualityReindex || needsClarification));
  const statusColor = needsClarification ? 'border-amber-200 bg-amber-50 text-amber-900'
    : indexingInfo?.status === 'SUCCESS' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : indexingInfo?.status === 'FAILED' ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-slate-200 bg-slate-50 text-slate-700';
  const statusText = needsClarification ? 'Needs clarification'
    : indexingInfo?.status === 'SUCCESS' ? 'Indexed · educator review required'
    : indexingInfo?.status === 'FAILED' ? 'Processing interrupted'
    : indexingInfo?.status === 'PENDING' ? 'Indexing pending'
    : indexingInfo?.status === 'UNKNOWN' ? 'Status unavailable'
    : 'Not uploaded';
  return (
    <div id="cne-material-modal" className="fixed inset-0 z-[60] flex items-stretch justify-center bg-slate-900/60 p-0 sm:items-center sm:p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="cne-material-title" className="flex h-[100dvh] min-h-0 w-full max-w-[1180px] flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800"><BookOpen className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">Learning Material</p>
                <h2 id="cne-material-title" className="break-words text-sm font-bold leading-snug text-slate-950 sm:text-lg">{cne.topic}</h2>
              </div>
            </div>
            <button type="button" aria-label="Close learning material" onClick={onClose} disabled={isSaving || isDeleting} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
          <nav role="tablist" aria-label="Learning material sections" className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
            {([
              {id:'overview' as const,label:'Overview',Icon:Info},
              {id:'files' as const,label:'Files',Icon:Files},
              {id:'notes' as const,label:'Notes',Icon:PencilLine}
            ]).map(({id,label,Icon}) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} aria-controls={activeTab===id ? `cne-material-${id}-panel` : undefined}
              onClick={() => setActiveTab(id)} disabled={isSaving}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-colors sm:text-sm ${activeTab===id?'border-teal-700 bg-teal-700 text-white shadow-sm':'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50'} disabled:opacity-50`}>
              <Icon className="h-4 w-4" /> {label}
            </button>)}
          </nav>
        </header>

        {loading && <div role="status" className="flex items-center gap-2 border-b border-teal-100 bg-teal-50 px-4 py-2 text-xs text-teal-900 sm:px-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading learning material…</div>}
        {loadError && <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800 sm:px-6">{loadError} <button type="button" className="ml-2 font-bold underline" onClick={() => void loadAllReferenceData()}>Retry</button></div>}
        {isClosed && <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-700 sm:px-6"><Lock className="h-4 w-4" /> CNE is closed; material remains view-only.</div>}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/40 p-4 sm:p-6">
          {activeTab === 'overview' && <section id="cne-material-overview-panel" role="tabpanel" aria-label="Overview" className="mx-auto max-w-4xl space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">Material Overview</h3><span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusColor}`}>{statusText}</span></div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">Upload a PDF, Word or PowerPoint file (maximum 5 MB). Text extraction and automated source review prepare evidence for five CNE Post-Test questions; educator review remains required.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Attached file</p><p className="mt-1 text-sm font-bold text-slate-900">{existingResource?.hasFile?'1 file':'No file'}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Indexed chunks</p><p className="mt-1 text-sm font-bold text-slate-900">{indexingInfo?.chunksCount ?? 0}</p></div>
                <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1"><p className="text-[11px] text-slate-500">Clarifications</p><p className="mt-1 text-sm font-bold text-slate-900">{flagsCount} flagged chunk(s)</p></div>
              </div>
              <button type="button" onClick={() => setActiveTab('files')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800">{existingResource?.hasFile?'Manage uploaded file':'Upload learning material'} <ArrowRight className="h-4 w-4"/></button>
            </div>
            {existingResource?.hasFile && statusRequiresAction && <div role="status" className={`rounded-xl border p-4 text-xs ${statusColor}`}><div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 shrink-0"/><p>{needsClarification ? `${flagsCount} source chunk(s) need clarification; ${extractionWarningsCount} extraction warning(s). Review the Files tab for details.` : 'Source processing is unfinished. Open Files to resume or retry without uploading again.'}</p></div></div>}
            <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-xs leading-relaxed text-teal-950"><Info className="mr-2 inline h-4 w-4"/>Automated source checks are not clinical approval. Review all clinical statements, permissions and patient-data exclusions before proceeding.</div>
          </section>}

          {activeTab === 'files' && <section id="cne-material-files-panel" role="tabpanel" aria-label="Files" className="mx-auto max-w-5xl space-y-4">
            {canModify && <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2.5">
              <div className="flex items-center gap-2"><input id="cne-uploader-responsibility" type="checkbox" checked={responsibilityAccepted} onChange={e=>setResponsibilityAccepted(e.target.checked)} className="h-4 w-4 shrink-0 accent-teal-700" />
                <label htmlFor="cne-uploader-responsibility" className="min-w-0 flex-1 cursor-pointer truncate text-xs font-semibold text-teal-950">Uploader responsibility · clinical accuracy and permissions confirmed</label>
                <button type="button" aria-expanded={declarationExpanded} aria-controls="cne-uploader-declaration-details" onClick={()=>setDeclarationExpanded(v=>!v)} className="shrink-0 rounded-md p-1 text-teal-800" aria-label={declarationExpanded?'Hide full declaration':'Read full declaration'}><ChevronDown className={`h-4 w-4 transition-transform ${declarationExpanded?'rotate-180':''}`}/></button>
              </div>
              {declarationExpanded && <p id="cne-uploader-declaration-details" className="mt-2 border-t border-teal-100 pt-2 text-xs leading-relaxed text-teal-950">I accept responsibility for the clinical accuracy, drug and treatment details, tables, references and permissions in this material. This confirmation is required when uploading or reindexing. I confirm Gemini may review eligible extracted teaching text under institutional policy, and that no identifiable patient information is present. AI review is not clinical approval.</p>}
              {!responsibilityAccepted && <p role="alert" className="mt-2 text-xs font-medium text-amber-800">Check this box to upload or reindex material.</p>}
            </div>}

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-teal-700"/> Uploaded Material</h3>
              {existingResource?.hasFile ? <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-xs font-black text-teal-800">FILE</div>
                    <div className="min-w-0"><p className="break-all text-xs font-bold text-slate-900 sm:text-sm">{existingResource.fileName}</p><p className="mt-1 text-[11px] text-slate-600">{formatFileSize(existingResource.fileSize)} {existingResource.updatedAt && <>· {formatCneDateTimeDisplay(existingResource.updatedAt)}</>}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusColor}`}>{statusText}</span>
                    <button type="button" onClick={() => void openCurrentFile()} disabled={isDownloading} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"><Eye className="h-3.5 w-3.5"/>{isDownloading?'Opening…':'View / Download'}</button>
                    {canModify && <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting || isSaving} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5"/>Delete</button>}
                  </div>
                </div>
                {showDeleteConfirm && <div role="alertdialog" aria-label="Confirm learning-material deletion" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"><p className="font-semibold">Delete the current file from Drive? This can affect AI-generated Post-Test evidence.</p>
                  <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="rounded-lg border border-slate-200 bg-white px-3 py-2">Cancel</button><button type="button" onClick={() => void handleDeleteResource()} disabled={isDeleting} className="rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white">{isDeleting?'Deleting…':'Confirm Delete'}</button></div>
                </div>}
              </div> : <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">No learning material attached yet.</div>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
              <h3 className="text-sm font-bold text-slate-900">{existingResource?.hasFile?'Replace Learning Material':'Upload Learning Material'}</h3>
              <p className="mt-1 text-[11px] text-slate-500">PDF, DOC, DOCX, PPT, PPTX · Maximum 5 MB</p>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" disabled={!canModify || isSaving} className="sr-only" onChange={e => {if(e.target.files?.[0]) handleFileSelect(e.target.files[0]);e.currentTarget.value='';}} />
              <div role="button" tabIndex={canModify && !isSaving ? 0 : -1} aria-disabled={!canModify || isSaving}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => {if(canModify && !isSaving)fileInputRef.current?.click();}}
                onKeyDown={e => {if((e.key==='Enter'||e.key===' ')&&canModify&&!isSaving){e.preventDefault();fileInputRef.current?.click();}}}
                className={`mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-4 text-center ${dragActive?'border-teal-500 bg-teal-50':'border-slate-300 bg-slate-50/60 hover:border-teal-400'} ${!canModify||isSaving?'pointer-events-none opacity-50':''}`}>
                <Upload className="h-6 w-6 text-teal-700"/><p className="break-all text-xs font-bold text-slate-900">{selectedFile ? selectedFile.name : 'Choose a file or drag it here'}</p><p className="text-[11px] text-slate-500">{selectedFile ? formatFileSize(selectedFile.size) : 'Use the file picker to upload or replace material'}</p>
              </div>
              {selectedFile && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50 p-3 text-xs"><span className="font-medium text-teal-900">Ready to upload{existingResource?.hasFile?' · will replace current file':''}</span><div className="flex gap-2"><button type="button" onClick={() => setSelectedFile(null)} className="font-semibold text-slate-600 underline">Remove selection</button><button type="button" onClick={() => void performSave()} disabled={!responsibilityAccepted || isSaving || loading} className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-40">Upload &amp; Index</button></div></div>}
            </div>



            {uploadInProgress && <MaterialIndexStages stage={materialStage} reviewedCount={reviewProgress.done} totalChunks={reviewProgress.total || indexingInfo?.chunksCount || 0} error={uploadStepError} uploadAlreadyDone={!!existingResource?.hasFile} running={isSaving} detail={reviewDetail} startedAt={indexStartedAt} />}
            {uploadStep === 'done' && !isSaving && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="h-4 w-4"/> File processing completed. Review the source results below.</div>}

            {existingResource?.hasFile && indexingInfo && !uploadInProgress && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-teal-700"/> Source Review Result</h3><span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusColor}`}>{statusText}</span></div>
              <p className="mt-2 text-xs text-slate-600">{indexingInfo.chunksCount ?? 0} indexed chunks{flagsCount>0?` · ${flagsCount} source chunk(s) need clarification`:''}{extractionWarningsCount>0?` · ${extractionWarningsCount} extraction warning(s)`:''}</p>
              {needsClarification && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle className="mr-1 inline h-4 w-4"/> Review unclear sections in the original source. Automated comments are not verified clinical corrections.</div>}
              {indexingInfo.status === 'PENDING' && <p className="mt-2 text-xs text-amber-800">Review is unfinished; resume processing without uploading again.</p>}
              {indexingInfo.status === 'FAILED' && <p role="alert" className="mt-2 text-xs text-rose-800">{uploadStepError || indexingInfo.message || 'Processing was interrupted; retry indexing.'}</p>}
              {needsQualityReindex && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">This source uses an older indexing algorithm. Re-extract it to prepare the current evidence index.</p>}
              {canModify && statusRequiresAction && !isSaving && !loading && <div className="mt-3">{canModify && (['FAILED','PENDING','UNKNOWN','NEEDS_REVIEW'].includes(indexingInfo.status) || needsQualityReindex || hasFidelityWarnings || needsClarification) && !isSaving && !loading && <button type="button" onClick={async () => {
                      const resume=indexingInfo?.status==='PENDING' && /GEMINI_REVIEW=(?:PENDING|IN_PROGRESS)/.test(indexingInfo.message||'');
                      if(!resume&&!responsibilityAccepted){warning('Confirm uploader responsibility using the checkbox before re-extracting.');return;}
                      if(savingRef.current)return;savingRef.current=true;setIsSaving(true);setIndexStartedAt(Date.now());setReviewDetail(null);setReviewProgress({done:Number((/REVIEWED=(\d+)/.exec(indexingInfo.message||'')||[])[1]||0),total:Number(indexingInfo.chunksCount||0)});setUploadStep('indexing');setUploadStepError('');setMaterialStage(resume?'ai':'extract');
                      try {
                        let count=Number(indexingInfo?.chunksCount||0);
                        let source:{fileId?:string;indexedAt?:string}|undefined={fileId:existingResource?.driveFileId};
                        if(!resume){
                          const res=await ApiService.reindexLearningResource(cneId, responsibilityAccepted);
                          if(!res.success){
                            setUploadStep('failed');setMaterialStage('failed');setUploadStepError(res.message||'Indexing failed.');
                            setIndexingInfo({status:'FAILED',message:res.message,errorCode:res.errorCode});
                            warning(res.message||'Indexing failed.');return;
                          }
                          count=Number(res.data?.chunksCount ?? (res as any).chunksCount ?? 0);source=res.data;
                        }
                        setMaterialStage('ai');
                        setIndexingInfo({status:'PENDING',message:'Gemini is reviewing extracted text chunks.',chunksCount:count});
                        const reviewed=await ApiService.completeCNEMaterialTextReview(cneId,(done,total)=>setReviewProgress({done,total}),setReviewDetail,source);
                        if(!reviewed.success){
                          setUploadStep('failed');setMaterialStage('failed');setUploadStepError(reviewed.message||'Gemini review interrupted.');
                          const fresh=await ApiService.getLearningResource(cneId);
                          if(fresh.success&&fresh.data){
                            setExistingResource(fresh.data);
                            setIndexingInfo({status:fresh.data.indexingStatus||'PENDING',message:fresh.data.indexingMessage||reviewed.message,
                              errorCode:fresh.data.indexingErrorCode||reviewed.errorCode,chunksCount:fresh.data.chunksCount??count});
                          }else setIndexingInfo({status:reviewed.data?.status==='NEEDS_REVIEW'?'NEEDS_REVIEW':'PENDING',
                            message:reviewed.message,errorCode:reviewed.errorCode,chunksCount:count});
                          warning(reviewed.message||'Gemini review interrupted. Retry from this screen.');return;
                        }
                        setMaterialStage('verify');setIndexingInfo({status:'SUCCESS',message:reviewed.message,chunksCount:count});
                        setMaterialStage('images');
                        try {const visuals=await ApiService.extractCNEMaterialImages(cneId);
                          if(visuals.success&&visuals.data){if(visuals.data.imageCount)success(visuals.data.imageCount+' teaching image(s) extracted.');
                            if(visuals.data.warnings?.length)warning(visuals.data.warnings.join(' '));}
                          else warning(visuals.message||'Image extraction unavailable.');}
                        catch(e:any){warning(e?.message||'Image extraction unavailable.');}
                        setUploadStep('done');setMaterialStage('done');
                        success('All '+count+' indexed source chunks received Gemini review.');
                        if(onUpdated)onUpdated();
                        await loadAllReferenceData();
                      }catch(err:any){setUploadStep('failed');setMaterialStage('failed');setUploadStepError(err?.message||'Indexing error.');error(err?.message||'Indexing error.');}
                      finally{savingRef.current=false;setIsSaving(false);}
                    }} className="text-teal-700 font-semibold underline text-xs">{indexingInfo.status==='PENDING' && /GEMINI_REVIEW=(?:PENDING|IN_PROGRESS)/.test(indexingInfo.message||'')?'Resume Gemini Review':'Re-extract Current File'}</button>}</div>}
              {flagsCount>0 && <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer text-xs font-bold text-amber-900">View flagged source chunks ({flagsCount})</summary><div className="mt-3"><MaterialReviewFlags message={indexingInfo.message}/></div></details>}
              {hasFidelityWarnings && <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-amber-900">Extraction warnings ({extractionWarningsCount})</summary><MaterialIndexWarnings warningText={indexingInfo.message || ''} warningCount={extractionWarningsCount} excludedCount={Number((/EXCLUDED_CHUNKS=(\d+)/.exec(indexingInfo.message||'')||[])[1]||0)}/></details>}
              <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Technical details</summary>{indexingInfo.errorCode && <p className="mt-1 text-rose-700">Error: {indexingInfo.errorCode}</p>}<p className="mt-1 break-words">{(indexingInfo.message || '').replace(/\s\|\sGEMINI_FLAGS=[^|]*/g,'').slice(0,1500)}</p></details>
            </div>}
          </section>}

          {activeTab === 'notes' && <section id="cne-material-notes-panel" role="tabpanel" aria-label="Notes" className="mx-auto max-w-4xl space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><PencilLine className="h-4 w-4 text-teal-700"/> Supplementary Clinical Notes <span className="text-xs font-normal text-slate-500">(Optional)</span></h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Record learning objectives, nursing guidelines, key takeaways or clinical references. These notes are not used to index the uploaded learning material.</p>
              <textarea value={unifiedContent} onChange={e=>setUnifiedContent(e.target.value)} disabled={!canModify || isSaving} rows={9} placeholder="Add supplementary educational notes or clinical guidelines…" className="mt-4 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"/>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{updatedAt?`Last saved: ${formatCneDateTimeDisplay(updatedAt)}`:'Optional · not indexed'}</span><span>{wordCount} words · {charCount} characters</span></div>
              {canModify && <button type="button" onClick={handleSaveOnly} disabled={isSaving || loading} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/> Save Notes</button>}
            </div>
          </section>}
        </main>

        <footer className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button type="button" onClick={onClose} disabled={isSaving || isDeleting} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 disabled:opacity-50">Close</button>
          {canModify && <button type="button" onClick={handleSaveOnly} disabled={isSaving || loading || !!selectedFile} title={selectedFile?'Upload & Index the selected file first':'Save existing material and notes'} className="ml-auto min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 disabled:opacity-50 sm:px-5"><Save className="mr-1 inline h-4 w-4"/> Save</button>}
          {canModify && <button type="button" onClick={handleSaveAndNext} disabled={isSaving || loading || !!selectedFile} title={selectedFile?'Upload & Index the selected file before moving to Post-Test Questions':'Save notes and proceed to Post-Test Questions'} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 text-xs font-bold text-white disabled:opacity-40 sm:px-5">Next: Post-Test Questions <ArrowRight className="h-4 w-4 shrink-0"/></button>}
        </footer>
      </div>
    </div>
  );
};
