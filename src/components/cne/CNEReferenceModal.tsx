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
  Lock
} from 'lucide-react';
import { CNERecord, CNELearningResourceMetadata } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { formatCneDateTimeDisplay } from '../../utils';
import { MaterialIndexWarnings } from './MaterialIndexWarnings';
import { MaterialIndexStages, MaterialIndexStage } from './MaterialIndexStages';
import { MaterialReviewFlags } from './MaterialReviewFlags';

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
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
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
    setResponsibilityAccepted(false);
    setIndexingInfo(null);
    setShowDeleteConfirm(false);
    setLoadError(null);
    setUploadStep('idle');setMaterialStage('idle');setReviewProgress({done:0,total:0});
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
    if (!canModify) {
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
    setResponsibilityAccepted(false);
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
    setIsSaving(true);
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
          setUploadStep('failed');
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
        const reviewed=await ApiService.completeCNEMaterialTextReview(cneId,(done,total)=>setReviewProgress({done,total}));
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

        if (!textRes.success && !selectedFile) {
          error(textRes.message || 'Failed to save reference material notes.');
          return false;
        }
      }

      if (onUpdated) onUpdated();
      return true;
    } catch (e: any) {
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

  return (
    <div id="cne-material-modal" className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-5">
      <div className="bg-white rounded-none sm:rounded-2xl w-full sm:w-[94vw] max-w-[1280px] h-[100dvh] sm:h-auto sm:max-h-[90dvh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-1 truncate">
              {cne.topic}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 disabled:opacity-40 cursor-pointer transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {loading && <div role="status" aria-live="polite" className="flex items-center gap-2.5 border-b border-teal-100 bg-teal-50 px-4 py-2.5 sm:px-6">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-teal-900">Checking existing CNE material…</p>
              <p className="text-[11px] text-teal-800">Retrieving uploaded material and indexing status</p>
            </div>
          </div>}
          {loadError && <div role="alert" className="px-4 py-2 text-xs text-rose-700 bg-rose-50 border-b border-rose-200">{loadError} <button type="button" onClick={() => void loadAllReferenceData()} className="ml-2 underline font-bold">Retry</button></div>}
            {isClosed && (
              <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-700 shrink-0">
                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Learning material is locked because this CNE is completed/finalized or canceled. Existing material remains viewable.</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 flex flex-col gap-4 bg-slate-50/40">
              <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5 text-xs leading-relaxed text-teal-950">
                <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700"/>
                  <p><strong>5 source-grounded CNE Post-Test questions.</strong> Upload a PDF, Word or PowerPoint (up to 5 MB). The index prepares evidence for NCLEX V2.1-style A–D single-best-answer questions; educator review is still required.</p>
                </div>
                <details className="mt-1.5 pl-6"><summary className="cursor-pointer text-[11px] font-semibold text-teal-800">How source indexing works</summary>
                  <p className="mt-1 text-[11px]">Only approved extracted text, not the original document, is sent to Gemini. Ambiguous text is held, and the current file must pass all evidence-readiness checks before AI question generation.</p>
                </details>
              </div>
              {(uploadStep !== 'idle' || indexingInfo) && <MaterialIndexStages
                stage={uploadStep !== 'idle' ? materialStage :
                  indexingInfo?.status==='SUCCESS' && /GEMINI_REVIEW=COMPLETE/.test(indexingInfo.message||'') ? 'done' :
                  indexingInfo?.status==='PENDING' && /GEMINI_REVIEW=(?:PENDING|IN_PROGRESS)/.test(indexingInfo.message||'') ? 'ai' :
                  indexingInfo?.status==='SUCCESS' ? 'extract' : 'failed'}
                reviewedCount={uploadStep !== 'idle' ? reviewProgress.done : Number((/REVIEWED=(\d+)/.exec(indexingInfo?.message||'')||[])[1]||0)}
                totalChunks={uploadStep !== 'idle' ? (reviewProgress.total||indexingInfo?.chunksCount||0) : Number((/TOTAL=(\d+)/.exec(indexingInfo?.message||'')||[])[1]||indexingInfo?.chunksCount||0)}
                error={uploadStep !== 'idle' ? uploadStepError : ''}
                uploadAlreadyDone={!!existingResource?.hasFile}/>}
              {/* Upload Learning Resource File Section */}
              <div className="min-w-0 bg-white p-3 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-teal-600" />
                    Learning resource file
                  </label>
                  <span className="text-[11px] text-slate-500">PDF, DOC, DOCX, PPT, PPTX · maximum 5 MB</span>
                </div>

                {/* Existing Stored Resource Card */}
                {existingResource && existingResource.hasFile && (
                  <div className="p-3.5 bg-teal-50/50 border border-teal-200 rounded-xl flex flex-col gap-2.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 w-full">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          {(existingResource.fileType || 'FILE').toUpperCase().slice(0, 4)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 break-words [overflow-wrap:anywhere]" title={existingResource.fileName}>
                            {existingResource.fileName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <span>Size: <strong>{formatFileSize(existingResource.fileSize)}</strong></span>
                            {existingResource.updatedAt && (
                              <>
                                <span>&bull;</span>
                                <span>Updated: <strong>{formatCneDateTimeDisplay(existingResource.updatedAt)}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Attached
                        </span>
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting || isSaving}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                            title="Delete this uploaded file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete Confirmation Box */}
                    {showDeleteConfirm && (
                      <div className="mt-1 p-3 bg-rose-50 border border-rose-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 text-rose-800 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Are you sure you want to delete this resource file? This will remove the file from Google Drive.</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteResource}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3" />
                                <span>Confirm Delete</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {existingResource?.hasFile && indexingInfo && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-700">Material Indexing Status</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${indexingBadgeClass}`}>
                        {indexingInfo.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {indexingLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>Indexed chunks: <strong className="text-slate-800">{typeof indexingInfo.chunksCount === 'number' ? indexingInfo.chunksCount : '—'}</strong></div>
                      {indexingInfo.errorCode && <div>Error code: <strong className="text-rose-700">{indexingInfo.errorCode}</strong></div>}
                    </div>
                    {canModify && (['FAILED','PENDING','UNKNOWN','NEEDS_REVIEW'].includes(indexingInfo.status) || needsQualityReindex || hasFidelityWarnings) && !isSaving && !loading && <button type="button" onClick={async () => {
                      const resume=indexingInfo?.status==='PENDING' && /GEMINI_REVIEW=(?:PENDING|IN_PROGRESS)/.test(indexingInfo.message||'');
                      if(!resume&&!responsibilityAccepted){warning('Confirm uploader responsibility using the checkbox before re-extracting.');return;}
                      setIsSaving(true);setUploadStep('indexing');setUploadStepError('');setMaterialStage(resume?'ai':'extract');
                      try {
                        let count=Number(indexingInfo?.chunksCount||0);
                        if(!resume){
                          const res=await ApiService.reindexLearningResource(cneId, responsibilityAccepted);
                          if(!res.success){
                            setUploadStep('failed');setMaterialStage('failed');setUploadStepError(res.message||'Indexing failed.');
                            setIndexingInfo({status:'FAILED',message:res.message,errorCode:res.errorCode});
                            warning(res.message||'Indexing failed.');return;
                          }
                          count=Number(res.data?.chunksCount ?? (res as any).chunksCount ?? 0);
                        }
                        setMaterialStage('ai');
                        setIndexingInfo({status:'PENDING',message:'Gemini is reviewing extracted text chunks.',chunksCount:count});
                        const reviewed=await ApiService.completeCNEMaterialTextReview(cneId,(done,total)=>setReviewProgress({done,total}));
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
                      finally{setIsSaving(false);}
                    }} className="text-teal-700 font-semibold underline text-xs">{indexingInfo.status==='PENDING' && /GEMINI_REVIEW=(?:PENDING|IN_PROGRESS)/.test(indexingInfo.message||'')?'Resume Gemini Review':'Re-extract Current File'}</button>}
                    {needsQualityReindex && (
                      <div className="text-[11px] text-amber-800 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2" role="status">
                        This material was indexed with an older clinical-text algorithm. Use Retry Indexing to build a section-aware V3 index before Gemini generates questions. The original file will not be replaced.
                      </div>
                    )}
                    {indexingInfo.status === 'NEEDS_REVIEW' && <p className="text-xs font-medium text-amber-800">This material needs a clearer extract or educator clarification. Review the flagged sections, replace the file if needed, then re-extract with uploader responsibility confirmation.</p>}
                    {hasFidelityWarnings && (
                      <details className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <summary className="cursor-pointer text-[11px] font-semibold text-amber-900">View per-chunk indexing warnings ({Number((/FIDELITY_WARNINGS=(\d+)/.exec(indexingInfo.message||'')||[])[1]||0)})</summary>
                        <div className="mt-2">
                          <MaterialIndexWarnings warningText={indexingInfo.message||''}
                            warningCount={Number((/FIDELITY_WARNINGS=(\d+)/.exec(indexingInfo.message||'')||[])[1]||0)}
                            excludedCount={Number((/EXCLUDED_CHUNKS=(\d+)/.exec(indexingInfo.message||'')||[])[1]||0)}/>
                          <p className="mt-2 text-[11px] text-amber-800">Flagged passages are excluded from AI evidence. Upload a clearer editable source if needed; no administrator review is required.</p>
                        </div>
                      </details>
                    )}
                    <MaterialReviewFlags message={indexingInfo.message}/>
                    {indexingInfo.message && indexingInfo.status !== 'SUCCESS' && !hasFidelityWarnings && (
                      <p className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600">
                        {indexingInfo.errorCode === 'AI_TEMPORARILY_UNAVAILABLE' ? 'Gemini was temporarily unavailable. Your file and completed reviews remain saved. Use Resume Gemini Review.' :
                          indexingInfo.status === 'NEEDS_REVIEW' ? 'Some extracted sections need clarification before this source can be used for the five-question AI Post-Test. See the flagged chunks above.' :
                          indexingInfo.status === 'PENDING' ? 'Review is unfinished. You can resume without uploading the document again.' : 'Check the source file and retry indexing.'}
                      </p>
                    )}
                    <details className="text-[11px] text-slate-600"><summary className="cursor-pointer font-semibold text-slate-700">Technical indexing details</summary>
                      {indexingInfo.errorCode && <p className="mt-1 break-words">Error: {indexingInfo.errorCode}</p>}
                      <p className="mt-1 break-words">{(indexingInfo.message||'').replace(/\s\|\sGEMINI_FLAGS=[^|]*/g,'').slice(0,1500)}</p>
                    </details>
                  </div>
                )}

                {/* Dropzone / File Picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  disabled={!canModify}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => { if (canModify) fileInputRef.current?.click(); }}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors flex flex-col items-center justify-center gap-1.5 ${
                    !canModify
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                      : dragActive
                      ? 'border-teal-500 bg-teal-50/50 cursor-pointer'
                      : 'border-slate-300 hover:border-teal-400 bg-slate-50/60 cursor-pointer'
                  }`}
                >
                  <Upload className="w-6 h-6 text-teal-600 mb-0.5" />
                  <p className="text-xs font-semibold text-slate-800">
                    {!canModify ? (
                      <span>File changes are locked for this closed CNE.</span>
                    ) : selectedFile ? (
                      <span className="text-teal-700 font-bold">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </span>
                    ) : (
                      <span>
                        Drag and drop your learning material here, or <span className="text-teal-600 underline">browse</span>
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF, DOC, DOCX, PPT, PPTX &bull; Maximum 5 MB
                  </p>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-600">
                    <span>Ready for upload on Save</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      disabled={!canModify}
                      className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {canModify && (selectedFile || existingResource?.hasFile) && (
                <label className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs leading-relaxed text-teal-900">
                  <input type="checkbox" className="mt-0.5 shrink-0" checked={responsibilityAccepted} onChange={e => setResponsibilityAccepted(e.target.checked)} />
                  <span><strong>Uploader responsibility:</strong> I accept responsibility for the clinical accuracy, drug and treatment details, tables, references and permissions in this material. This confirmation is required when uploading or reindexing. I confirm Gemini may review eligible extracted teaching text under institutional policy, and that no identifiable patient information is present. AI review is not clinical approval.</span>
                </label>
              )}

              {/* Text Notes / Guidelines Section */}
              <details className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">Supplementary clinical notes (optional; not used for material indexing)</summary>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Educational Notes / Clinical Guidelines (Optional / Supplementary)
                  </label>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Words: <strong>{wordCount}</strong></span>
                    <span>Characters: <strong>{charCount}</strong></span>
                  </div>
                </div>

                <textarea
                  value={unifiedContent}
                  onChange={(e) => setUnifiedContent(e.target.value)}
                  disabled={!canModify || isSaving}
                  placeholder={`Optional supplementary notes, key takeaways, or clinical references:
• Learning Objectives & Core Competencies
• Procedural Steps & Nursing Escalations
• References and Hospital Guidelines`}
                  className="w-full min-h-[140px] p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-60 resize-y"
                />

                {updatedAt && (
                  <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] text-slate-500">
                    Last updated: <strong className="text-slate-700">{formatCneDateTimeDisplay(updatedAt)}</strong>
                  </div>
                )}
              </details>
            </div>

            {/* Modal Footer with Save and Save & Next */}
            <div className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
              <div className="hidden sm:block min-w-0 max-w-[55%] truncate text-xs text-slate-500">
                {isClosed ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                    <Lock className="w-3.5 h-3.5" /> Material modifications are locked
                  </span>
                ) : selectedFile ? (
                  <span className="text-teal-700 font-medium">
                    1 new file ready to be saved
                  </span>
                ) : existingResource?.hasFile ? (
                  <span className="text-slate-600">
                    Current file: <strong>{existingResource.fileName}</strong>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Attach a document or notes to proceed
                  </span>
                )}
              </div>

              {canModify && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
                  {/* Button 1: Save (stays on Material) */}
                  <button
                    type="button"
                    onClick={handleSaveOnly}
                    disabled={isSaving || loading}
                    className="flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-slate-600" />
                        <span>Save</span>
                      </>
                    )}
                  </button>

                  {/* Button 2: Save & Next (moves to Questions only after save) */}
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    disabled={isSaving || loading}
                    className="flex min-h-11 items-center justify-center gap-1.5 px-3 sm:px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving &amp; Moving...</span>
                      </>
                    ) : (
                      <>
                        <span>Save &amp; Next</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
