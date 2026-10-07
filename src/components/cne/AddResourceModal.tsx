import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  BookOpen,
  Library,
  FileText,
  Loader2,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock3
} from 'lucide-react';
import {
  CNERecord,
  CNENursingReferenceDriveFile
} from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { formatCneDateTimeDisplay } from '../../utils';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: 'CNE_LEARNING_MATERIAL' | 'NURSING_REFERENCE_LIB';
}

type ReferenceWorkflowStage =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'indexing'
  | 'checking'
  | 'ready'
  | 'pending'
  | 'failed';

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'CNE_LEARNING_MATERIAL'
}) => {
  const [resourceType, setResourceType] = useState<'CNE_LEARNING_MATERIAL' | 'NURSING_REFERENCE_LIB'>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CNE Learning Material State ---
  const [upcomingClasses, setUpcomingClasses] = useState<CNERecord[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedCneId, setSelectedCneId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // --- Nursing Reference Library State ---
  const [refMode, setRefMode] = useState<'upload' | 'drive'>('upload');
  const [driveFiles, setDriveFiles] = useState<CNENursingReferenceDriveFile[]>([]);
  const [selectedDriveFileId, setSelectedDriveFileId] = useState<string>('');
  const [resourceTitle, setResourceTitle] = useState<string>('');
  const [authorOrg, setAuthorOrg] = useState<string>('Open RN Project / Chippewa Valley Technical College');
  const [license, setLicense] = useState<string>('CC BY 4.0');
  const [version, setVersion] = useState<string>('2nd Edition');
  const [referenceStage, setReferenceStage] = useState<ReferenceWorkflowStage>('idle');
  const [referenceStatusMessage, setReferenceStatusMessage] = useState<string>('');
  const [uploadedReferenceFileId, setUploadedReferenceFileId] = useState<string>('');
  const [referenceChunksCount, setReferenceChunksCount] = useState<number>(0);

  // --- File Selection State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cneLoadRequestRef = useRef(0);
  const driveLoadRequestRef = useRef(0);
  const submitRef = useRef(false);

  const { success, error, warning } = useToast();

  const resetFormState = () => {
    setSelectedFile(null);
    setDragActive(false);
    setSelectedCneId('');
    setNotes('');
    setSelectedDriveFileId('');
    setResourceTitle('');
    setRefMode('upload');
    setReferenceStage('idle');
    setReferenceStatusMessage('');
    setUploadedReferenceFileId('');
    setReferenceChunksCount(0);
  };

  useEffect(() => {
    if (!isOpen) {
      cneLoadRequestRef.current += 1;
      driveLoadRequestRef.current += 1;
      return;
    }

    resetFormState();
    setResourceType(initialType);
    loadCneClasses();
    loadDriveFiles();

    return () => {
      cneLoadRequestRef.current += 1;
      driveLoadRequestRef.current += 1;
    };
  }, [isOpen, initialType]);

  const loadCneClasses = async () => {
    const requestId = ++cneLoadRequestRef.current;
    setLoadingClasses(true);
    try {
      const res = await ApiService.getCNERecords();
      if (requestId !== cneLoadRequestRef.current) return;
      if (res.success && Array.isArray(res.data)) {
        const openClasses = res.data.filter((c) => {
          const status = String(c.status || 'Scheduled').trim().toLowerCase();
          return status !== 'completed' && status !== 'finalized' && status !== 'canceled' && status !== 'cancelled';
        });
        setUpcomingClasses(openClasses);
      } else {
        setUpcomingClasses([]);
      }
    } catch {
      if (requestId === cneLoadRequestRef.current) setUpcomingClasses([]);
      // Non-critical background fetch
    } finally {
      if (requestId === cneLoadRequestRef.current) setLoadingClasses(false);
    }
  };

  const loadDriveFiles = async () => {
    const requestId = ++driveLoadRequestRef.current;
    try {
      const res = await ApiService.listNursingReferenceResources();
      if (requestId !== driveLoadRequestRef.current) return;
      if (res.success && res.data?.driveFiles) {
        setDriveFiles(res.data.driveFiles);
      } else {
        setDriveFiles([]);
      }
    } catch {
      if (requestId === driveLoadRequestRef.current) setDriveFiles([]);
      // Non-critical
    }
  };

  const handleSelectCneClass = (cneId: string) => {
    setSelectedCneId(cneId);
  };

  // Resource Person is authoritative metadata from the selected CNE.
  // It is intentionally derived instead of editable so the uploader cannot
  // change the assigned Resource Person from this screen.
  const selectedCneForResource = upcomingClasses.find(
    (c) => (c.cneId || c.classId) === selectedCneId
  );
  const resourcePerson = selectedCneForResource
    ? String(selectedCneForResource.resourcePersonName || selectedCneForResource.instructor || '').trim()
    : '';

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (ext !== 'pdf') {
      error('Invalid file format. Only PDF (.pdf) documents are supported.');
      return;
    }

    if (resourceType === 'CNE_LEARNING_MATERIAL') {
      const MAX_CNE_LEARNING_MATERIAL_BYTES = 3 * 1024 * 1024; // 3MB authoritative limit
      if (file.size > MAX_CNE_LEARNING_MATERIAL_BYTES) {
        error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 3 MB.`);
        return;
      }
    }

    if (resourceType === 'NURSING_REFERENCE_LIB' && (!resourceTitle || resourceTitle.trim() === '')) {
      setResourceTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const reconcileReferenceIndexStatus = async (
    driveFileId: string,
    fallbackMessage?: string
  ): Promise<void> => {
    setReferenceStage('checking');
    setReferenceStatusMessage('Checking the saved indexing status…');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const statusRes = await ApiService.getNursingReferenceIndexStatus(driveFileId);

      if (statusRes.success && statusRes.data) {
        const status = statusRes.data.indexStatus;

        if (status === 'INDEXED') {
          setReferenceChunksCount(statusRes.data.chunksCount || 0);
          setReferenceStage('ready');
          setReferenceStatusMessage(
            `Reference resource is ready. ${statusRes.data.chunksCount || 0} AI chunks indexed successfully.`
          );
          success(`Reference resource indexed successfully: ${statusRes.data.chunksCount || 0} AI chunks created.`);
          onSuccess();
          return;
        }

        if (status === 'FAILED') {
          setReferenceStage('failed');
          setReferenceStatusMessage(
            statusRes.data.message ||
            fallbackMessage ||
            'The PDF was uploaded successfully, but indexing failed.'
          );
          warning(
            statusRes.data.message ||
            'The PDF remains safely uploaded in Drive, but indexing could not be completed.'
          );
          onSuccess();
          return;
        }
      }

      if (attempt < 2) {
        await wait(2500);
      }
    }

    setReferenceStage('pending');
    setReferenceStatusMessage(
      'The PDF is uploaded safely in Drive. Indexing is still pending or may still be finishing on Google Apps Script. Do not upload the PDF again. You can close this window and check the Library later.'
    );
    warning('File uploaded successfully. Indexing is still pending; do not upload the same PDF again.');
    onSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitRef.current || isSubmitting) return;

    if (resourceType === 'CNE_LEARNING_MATERIAL') {
      if (!selectedCneId) {
        error('Please select a CNE session or topic.');
        return;
      }
      if (!selectedFile) {
        error('Please select a document file to upload for this CNE session.');
        return;
      }
      const selectedCne = upcomingClasses.find((c) => (c.cneId || c.classId) === selectedCneId);
      if (!selectedCne) {
        error('The selected CNE is no longer available for material upload. Please choose an open CNE again.');
        return;
      }

      submitRef.current = true;
      setIsSubmitting(true);
      try {
        const base64 = await fileToBase64(selectedFile);
        const res = await ApiService.uploadLearningResource({
          cneId: selectedCneId,
          base64Data: base64,
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          unifiedContent: notes.trim() || undefined
        });

        if (res.success) {
          success(`CNE Material uploaded successfully: ${selectedFile.name}`);
          if (res.data?.indexingStatus === 'FAILED') {
            warning(res.data?.indexingMessage || 'The file was uploaded, but text indexing could not be completed.');
          }
          onSuccess();
          onClose();
        } else {
          error(res.message || 'Failed to upload CNE learning material.');
        }
      } catch (err: any) {
        error(err?.message || 'Error occurred while uploading learning material.');
      } finally {
        submitRef.current = false;
        setIsSubmitting(false);
      }
    } else {
      // Nursing Reference Library — two-stage workflow:
      // 1) Upload the PDF and get a Drive File ID.
      // 2) Index that existing Drive file in a separate request.
      // A slow indexing request can therefore never cause a duplicate PDF upload.
      if (refMode === 'upload') {
        if (!selectedFile) {
          error('Please select a reference textbook or document file to upload.');
          return;
        }
        if (!resourceTitle.trim()) {
          error('Please enter a Resource Title.');
          return;
        }

        submitRef.current = true;
        setIsSubmitting(true);
        setReferenceStage('uploading');
        setReferenceStatusMessage('Uploading PDF securely to the Open RN Drive folder…');
        setReferenceChunksCount(0);
        let uploadedDriveFileIdForThisAttempt = '';

        try {
          const base64 = await fileToBase64(selectedFile);
          const uploadRes = await ApiService.uploadNursingReferenceResource({
            fileName: selectedFile.name,
            base64Data: base64,
            resourceTitle: resourceTitle.trim(),
            authorOrganization: authorOrg.trim() || undefined,
            license: license.trim() || undefined,
            version: version.trim() || undefined
          });

          if (!uploadRes.success || !uploadRes.data?.driveFileId) {
            setReferenceStage('idle');
            setReferenceStatusMessage('');
            error(uploadRes.message || 'Failed to upload reference library resource.');
            return;
          }

          const driveFileId = uploadRes.data.driveFileId;
          uploadedDriveFileIdForThisAttempt = driveFileId;
          setUploadedReferenceFileId(driveFileId);
          setReferenceStage('uploaded');
          setReferenceStatusMessage(
            uploadRes.data.registryWarning
              ? `PDF uploaded successfully. ${uploadRes.data.registryWarning}`
              : 'PDF uploaded successfully. Starting reference indexing…'
          );
          success(`PDF uploaded successfully: ${uploadRes.data.fileName || selectedFile.name}`);

          // Stage 2: index the file that already exists in Drive.
          setReferenceStage('indexing');
          setReferenceStatusMessage('PDF uploaded ✓  Indexing reference content for AI grounding…');

          const indexRes = await ApiService.indexNursingReferenceResource({
            driveFileId,
            resourceTitle: resourceTitle.trim(),
            authorOrganization: authorOrg.trim() || undefined,
            license: license.trim() || undefined,
            version: version.trim() || undefined,
            reindex: false
          });

          if (indexRes.success) {
            const chunks = indexRes.data?.chunksCount || 0;
            setReferenceChunksCount(chunks);
            setReferenceStage('ready');
            setReferenceStatusMessage(
              `PDF uploaded ✓  Indexing completed ✓  ${chunks} AI chunks are ready.`
            );
            success(`Reference resource indexed successfully: ${chunks} AI chunks created.`);
            onSuccess();
          } else {
            // A timeout/network failure is outcome-ambiguous: Apps Script may still finish.
            // Check the persisted status before telling the admin indexing failed.
            await reconcileReferenceIndexStatus(driveFileId, indexRes.message);
          }
        } catch (err: any) {
          if (uploadedDriveFileIdForThisAttempt) {
            await reconcileReferenceIndexStatus(
              uploadedDriveFileIdForThisAttempt,
              err?.message || 'Indexing response could not be confirmed.'
            );
          } else {
            setReferenceStage('idle');
            setReferenceStatusMessage('');
            error(err?.message || 'Error occurred while uploading reference resource.');
          }
        } finally {
          submitRef.current = false;
          setIsSubmitting(false);
        }
      } else {
        // Index a PDF that is already present in the approved Open RN Drive folder.
        if (!selectedDriveFileId) {
          error('Please select an unindexed file from the Open RN Drive folder.');
          return;
        }

        submitRef.current = true;
        setIsSubmitting(true);
        setUploadedReferenceFileId(selectedDriveFileId);
        setReferenceStage('indexing');
        setReferenceStatusMessage('Indexing the selected Drive PDF for AI grounding…');
        setReferenceChunksCount(0);

        try {
          const res = await ApiService.indexNursingReferenceResource({
            driveFileId: selectedDriveFileId,
            resourceTitle: resourceTitle.trim() || undefined,
            authorOrganization: authorOrg.trim() || undefined,
            license: license.trim() || undefined,
            version: version.trim() || undefined,
            reindex: false
          });

          if (res.success) {
            const chunks = res.data?.chunksCount || 0;
            setReferenceChunksCount(chunks);
            setReferenceStage('ready');
            setReferenceStatusMessage(`Indexing completed ✓  ${chunks} AI chunks are ready.`);
            success(`Drive resource indexed: ${chunks} chunks added to local index.`);
            onSuccess();
          } else {
            await reconcileReferenceIndexStatus(selectedDriveFileId, res.message);
          }
        } catch (err: any) {
          await reconcileReferenceIndexStatus(
            selectedDriveFileId,
            err?.message || 'Indexing response could not be confirmed.'
          );
        } finally {
          submitRef.current = false;
          setIsSubmitting(false);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Add Learning Resource
              </h2>
              <p className="text-[11px] text-slate-400">
                Upload CNE session material or clinical reference library textbooks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Resource Type Selection Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Resource Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setResourceType('CNE_LEARNING_MATERIAL');
                  setSelectedFile(null);
                  setSelectedDriveFileId('');
                  setResourceTitle('');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  resourceType === 'CNE_LEARNING_MATERIAL'
                    ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    resourceType === 'CNE_LEARNING_MATERIAL'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Learning Materials
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Attach slides, guidelines, or handouts to a scheduled CNE topic
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResourceType('NURSING_REFERENCE_LIB');
                  setSelectedFile(null);
                  setSelectedCneId('');
                                setNotes('');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  resourceType === 'NURSING_REFERENCE_LIB'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    resourceType === 'NURSING_REFERENCE_LIB'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Library className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Library
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Open RN textbook or standard clinical reference for AI grounding
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Content: CNE Material */}
          {resourceType === 'CNE_LEARNING_MATERIAL' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select CNE Session / Topic <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCneId}
                  onChange={(e) => handleSelectCneClass(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Choose scheduled CNE session --</option>
                  {upcomingClasses.map((c) => {
                    const id = c.cneId || c.classId || '';
                    const when = formatCneDateTimeDisplay(c.date, c.toDate);
                    return (
                      <option key={id} value={id}>
                        {c.topic} {when ? `(${when})` : ''} - {c.area || 'All Hospital'}
                      </option>
                    );
                  })}
                </select>
                {loadingClasses ? (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading available CNE sessions...
                  </p>
                ) : upcomingClasses.length === 0 ? (
                  <p className="text-[10px] text-amber-600 mt-1">
                    No open CNE session is currently available for material upload.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resource Person / Instructor Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={resourcePerson}
                    readOnly
                    aria-readonly="true"
                    placeholder="Select a CNE session to view the assigned Resource Person"
                    title="Resource Person is automatically taken from the selected CNE and cannot be edited here."
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Auto-filled from the selected CNE session. Resource Person cannot be changed from Learning Resources.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes & Reference Syllabus (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key clinical objectives, procedural highlights, or syllabus points..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Form Content: Nursing Reference Library */}
          {resourceType === 'NURSING_REFERENCE_LIB' && (
            <div className="space-y-4 pt-1">
              {/* Mode switch */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setRefMode('upload');
                    setReferenceStage('idle');
                    setReferenceStatusMessage('');
                    setUploadedReferenceFileId('');
                    setReferenceChunksCount(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    refMode === 'upload'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upload New Reference File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefMode('drive');
                    setReferenceStage('idle');
                    setReferenceStatusMessage('');
                    setUploadedReferenceFileId('');
                    setReferenceChunksCount(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    refMode === 'drive'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Select from Drive Folder ({driveFiles.filter((f) => !f.isIndexed).length} Unindexed)
                </button>
              </div>

              {refMode === 'drive' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unindexed Drive File <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedDriveFileId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedDriveFileId(id);
                      const f = driveFiles.find((df) => df.driveFileId === id);
                      if (f) {
                        setResourceTitle(f.fileName.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  >
                    <option value="">-- Choose unindexed file in Open RN folder --</option>
                    {driveFiles
                      .filter((f) => !f.isIndexed)
                      .map((f) => (
                        <option key={f.driveFileId} value={f.driveFileId}>
                          {f.fileName} ({(f.fileSize / (1024 * 1024)).toFixed(1)} MB)
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resource / Textbook Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    required
                    placeholder="e.g., Nursing Fundamentals - Open RN"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Author / Organization
                  </label>
                  <input
                    type="text"
                    value={authorOrg}
                    onChange={(e) => setAuthorOrg(e.target.value)}
                    placeholder="e.g., Open RN / CVTC"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    License & Version
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      placeholder="CC BY 4.0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="2nd Edition"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {resourceType === 'NURSING_REFERENCE_LIB' && referenceStage !== 'idle' && (
            <div
              className={`rounded-xl border p-3.5 ${
                referenceStage === 'ready'
                  ? 'border-emerald-200 bg-emerald-50'
                  : referenceStage === 'failed'
                    ? 'border-rose-200 bg-rose-50'
                    : referenceStage === 'pending'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-sky-200 bg-sky-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {referenceStage === 'ready' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : referenceStage === 'failed' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : referenceStage === 'pending' ? (
                    <Clock3 className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">
                    {referenceStage === 'uploading' && 'Uploading PDF…'}
                    {referenceStage === 'uploaded' && 'PDF uploaded'}
                    {referenceStage === 'indexing' && 'Indexing reference content…'}
                    {referenceStage === 'checking' && 'Confirming indexing status…'}
                    {referenceStage === 'ready' && 'Reference resource ready'}
                    {referenceStage === 'pending' && 'PDF uploaded — indexing pending'}
                    {referenceStage === 'failed' && 'PDF uploaded — indexing failed'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {referenceStatusMessage}
                  </p>
                  {referenceStage === 'ready' && (
                    <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                      {referenceChunksCount} indexed chunks available for CNE question grounding.
                    </p>
                  )}
                  {(referenceStage === 'pending' || referenceStage === 'failed') && uploadedReferenceFileId && (
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">
                      The Drive file is already saved. Do not upload the same PDF again.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File Upload Dropzone (for CNE or Ref Library Upload mode) */}
          {(resourceType === 'CNE_LEARNING_MATERIAL' || (resourceType === 'NURSING_REFERENCE_LIB' && refMode === 'upload')) && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Upload File <span className="text-rose-500">*</span>
              </label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-sm">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="ml-auto text-xs text-rose-600 hover:underline p-1 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">
                      Drag & drop your PDF file here, or{' '}
                      <span className="text-teal-600 hover:underline">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {resourceType === 'CNE_LEARNING_MATERIAL' ? (
                        <>PDF only &bull; Maximum 3 MB</>
                      ) : (
                        <>PDF only &bull; Large PDFs may take longer to process and index.</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type={
                resourceType === 'NURSING_REFERENCE_LIB' &&
                (referenceStage === 'ready' || referenceStage === 'pending' || referenceStage === 'failed')
                  ? 'button'
                  : 'submit'
              }
              onClick={
                resourceType === 'NURSING_REFERENCE_LIB' &&
                (referenceStage === 'ready' || referenceStage === 'pending' || referenceStage === 'failed')
                  ? onClose
                  : undefined
              }
              disabled={isSubmitting || (resourceType === 'CNE_LEARNING_MATERIAL' && upcomingClasses.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {resourceType === 'NURSING_REFERENCE_LIB'
                      ? referenceStage === 'uploading'
                        ? 'Uploading PDF...'
                        : referenceStage === 'checking'
                          ? 'Checking Status...'
                          : 'Indexing PDF...'
                      : 'Processing & Indexing...'}
                  </span>
                </>
              ) : resourceType === 'NURSING_REFERENCE_LIB' &&
                (referenceStage === 'ready' || referenceStage === 'pending' || referenceStage === 'failed') ? (
                <>
                  {referenceStage === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock3 className="w-4 h-4" />
                  )}
                  <span>{referenceStage === 'ready' ? 'Done' : 'Close'}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    {resourceType === 'CNE_LEARNING_MATERIAL'
                      ? 'Upload CNE Material'
                      : refMode === 'upload'
                        ? 'Upload & Index Reference Book'
                        : 'Index Selected Drive File'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
