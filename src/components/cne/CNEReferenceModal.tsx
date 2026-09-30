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
  const cneId = cne.cneId || cne.classId || '';
  const normalizedStatus = String(cne.status || '').trim().toLowerCase();
  const isClosed = normalizedStatus === 'completed' || normalizedStatus === 'finalized' || normalizedStatus === 'finalised' || normalizedStatus === 'canceled' || normalizedStatus === 'cancelled';
  const canModify = isAuthorized && !isClosed;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Learning material content
  const [unifiedContent, setUnifiedContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const loadRequestRef = useRef(0);
  const [indexingInfo, setIndexingInfo] = useState<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN';
    message?: string;
    errorCode?: string;
    chunksCount?: number;
  } | null>(null);

  // Existing Uploaded File Metadata
  const [existingResource, setExistingResource] = useState<CNELearningResourceMetadata | null>(null);

  // Newly Selected File for Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    setIndexingInfo(null);
    setShowDeleteConfirm(false);
    loadAllReferenceData();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [cneId]);

  const loadAllReferenceData = async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
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
            message: 'Indexing metadata was not returned for this previously uploaded PDF.'
          });
        }
      } else {
        setExistingResource(null);
        setIndexingInfo(null);
      }
    } catch (e: any) {
      if (requestId !== loadRequestRef.current) return;
      console.warn('Failed to load reference material or learning resource:', e);
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

    const validExtensions = ['.pdf'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt) {
      error('Invalid file format. Only PDF (.pdf) documents are supported.');
      return;
    }

    const MAX_CNE_LEARNING_MATERIAL_BYTES = 3 * 1024 * 1024; // 3MB authoritative limit
    if (file.size > MAX_CNE_LEARNING_MATERIAL_BYTES) {
      error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 3 MB.`);
      return;
    }

    setSelectedFile(file);
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
    if (savingRef.current || isSaving || !canModify) return false;

    const hasAnyFile = selectedFile !== null || (existingResource && existingResource.hasFile);
    const hasAnyText = unifiedContent.trim().length > 0;

    if (!hasAnyFile && !hasAnyText) {
      error('Please upload a CNE learning resource file (PDF) or enter educational notes.');
      return false;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      // 1. Upload newly selected file if provided
      if (selectedFile) {
        const base64Data = await fileToBase64(selectedFile);
        const uploadRes = await ApiService.uploadLearningResource({
          cneId: cneId,
          base64Data: base64Data,
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          unifiedContent: unifiedContent.trim() || undefined
        });

        if (!uploadRes.success) {
          error(uploadRes.message || 'Failed to upload learning resource file to Drive.');
          return false;
        }

        setExistingResource(uploadRes.data || null);
        setSelectedFile(null);
        if (uploadRes.data) {
          setIndexingInfo({
            status: uploadRes.data.indexingStatus || 'UNKNOWN',
            message: uploadRes.data.indexingMessage,
            errorCode: uploadRes.data.indexingErrorCode,
            chunksCount: uploadRes.data.chunksCount
          });
        }

        if (uploadRes.data?.indexingStatus === 'FAILED') {
          warning(uploadRes.data?.indexingMessage || 'Unable to extract readable text from the uploaded material. The file has been saved, but its content could not be indexed.');
        }
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
    const successResult = await performSave();
    if (successResult) {
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


  const indexingLabel = indexingInfo?.status === 'SUCCESS'
    ? 'Indexed'
    : indexingInfo?.status === 'FAILED'
    ? 'Indexing failed'
    : indexingInfo?.status === 'PENDING'
    ? 'Indexing pending'
    : indexingInfo?.status === 'UNKNOWN'
    ? 'Index status not reported'
    : '';

  const indexingBadgeClass = indexingInfo?.status === 'SUCCESS'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : indexingInfo?.status === 'FAILED'
    ? 'bg-rose-100 text-rose-800 border-rose-200'
    : indexingInfo?.status === 'PENDING'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div id="cne-material-modal" className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-[94vw] max-w-[1280px] max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
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

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
            <span className="text-xs font-medium">Loading CNE learning resource...</span>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Guidance Banner */}
            <div className="px-6 py-2.5 bg-teal-50/70 border-b border-teal-100/80 flex items-start gap-2.5 text-xs text-teal-900 shrink-0">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Upload the authoritative presentation slides or guideline document (PDF up to 3MB).
                The AI Question Synthesizer reads the uploaded document as primary grounding to generate 5 standardized clinical MCQs.
              </div>
            </div>

            {isClosed && (
              <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-700 shrink-0">
                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Learning material is locked because this CNE is completed/finalized or canceled. Existing material remains viewable.</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 bg-slate-50/40">
              {/* Upload Learning Resource File Section */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-teal-600" />
                    Upload Learning Resource File (PDF only &bull; Maximum 3 MB)
                  </label>
                  <span className="text-[11px] text-slate-400">PDF only &bull; Maximum 3 MB</span>
                </div>

                {/* Existing Stored Resource Card */}
                {existingResource && existingResource.hasFile && (
                  <div className="p-3.5 bg-teal-50/50 border border-teal-200 rounded-xl flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          {(existingResource.fileType || 'FILE').toUpperCase().slice(0, 4)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate" title={existingResource.fileName}>
                            {existingResource.fileName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Size: <strong>{formatFileSize(existingResource.fileSize)}</strong></span>
                            {existingResource.updatedAt && (
                              <>
                                <span>&bull;</span>
                                <span>Updated: <strong>{new Date(existingResource.updatedAt).toLocaleString()}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                      <div className="font-bold text-slate-700">PDF Indexing Status</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${indexingBadgeClass}`}>
                        {indexingInfo.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {indexingLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>Indexed chunks: <strong className="text-slate-800">{typeof indexingInfo.chunksCount === 'number' ? indexingInfo.chunksCount : '—'}</strong></div>
                      {indexingInfo.errorCode && <div>Error code: <strong className="text-rose-700">{indexingInfo.errorCode}</strong></div>}
                    </div>
                    {indexingInfo.message && (
                      <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                        {indexingInfo.message}
                      </div>
                    )}
                  </div>
                )}

                {/* Dropzone / File Picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
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
                        Drag and drop your PDF here, or <span className="text-teal-600 underline">browse</span>
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF only &bull; Maximum 3 MB
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

              {/* Text Notes / Guidelines Section */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
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
                    Last updated: <strong className="text-slate-700">{new Date(updatedAt).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Save and Save & Next */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
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
                <div className="flex items-center gap-2.5">
                  {/* Button 1: Save (stays on Material) */}
                  <button
                    type="button"
                    onClick={handleSaveOnly}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
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
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
};
