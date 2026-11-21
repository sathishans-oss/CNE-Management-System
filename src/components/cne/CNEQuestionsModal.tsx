import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  Loader2,
  HelpCircle,
  AlertTriangle,
  Edit3,
  CheckCheck,
  BookOpen,
  History,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ImageUp,
  Search,
  Eye,
  FileCheck2
} from 'lucide-react';
import { CNERecord, CNEQuestion, CNEAiQuotaInfo, CNEReferenceBankItem, CNEClinicalBankSearchInfo } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';
import { CNEQuestionImage } from './CNEQuestionImage';
import { useAccessibleDialog } from '../common/useAccessibleDialog';
import { CNEQuestionHeaderStatusTag } from './CNEQuestionHeaderStatusTag';
import { MaterialIndexWarnings } from './MaterialIndexWarnings';
import { MaterialReviewFlags } from './MaterialReviewFlags';
import { ProcessingSteps, ProcessingProgress, useProcessingClock, formatProcessingTime } from './ProcessingSteps';

interface CNEQuestionsModalProps {
  cne: CNERecord;
  isAuthorized: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onNavigateToQR?: () => void;
  onNavigateToMaterial?: () => void;
}


const normalizeQuestionStatus = (status?: string) => {
  const normalized = String(status || 'ACTIVE').trim().toUpperCase();
  return normalized === 'INACTIVE' || normalized === 'REPLACED' ? normalized : 'ACTIVE';
};

const isActiveQuestion = (q: CNEQuestion) => normalizeQuestionStatus(q.status) === 'ACTIVE';

const isQuestionComplete = (q: CNEQuestion) => {
  const options = q.options || ({} as CNEQuestion['options']);
  return Boolean(
    String(q.question || '').trim().length >= 8 &&
    String(options.A || '').trim() &&
    String(options.B || '').trim() &&
    String(options.C || '').trim() &&
    String(options.D || '').trim() &&
    ['A', 'B', 'C', 'D'].includes(String(q.correctOption || '').trim().toUpperCase()) &&
    String(q.explanation || '').trim().length >= 5 &&
    String(q.authoritativeSource || '').trim().length >= 3 &&
    (q.questionType === 'TEXT' || (q.questionType === 'IMAGE' && Boolean(q.imageFileId)))
  );
};

const isBlankUnsavedQuestion = (q: CNEQuestion) => {
  const options = q.options || ({} as CNEQuestion['options']);
  return !String(q.question || '').trim() &&
    !String(options.A || '').trim() &&
    !String(options.B || '').trim() &&
    !String(options.C || '').trim() &&
    !String(options.D || '').trim() &&
    !String(q.explanation || '').trim() &&
    !String(q.authoritativeSource || '').trim() && !q.imageFileId;
};

const isClosedCne = (cne: CNERecord) => {
  const status = String(cne.status || '').trim().toLowerCase();
  return status === 'completed' || status === 'canceled' || status === 'cancelled';
};

export const CNEQuestionsModal: React.FC<CNEQuestionsModalProps> = ({
  cne,
  isAuthorized,
  onClose,
  onUpdated,
  onNavigateToQR,
  onNavigateToMaterial
}) => {
  const cneId = cne.cneId || '';
  const [questions, setQuestions] = useState<CNEQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingGenerationJob, setPendingGenerationJob] = useState(false);
  const generatingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Two exclusive full-width views; local question edits remain mounted in state across tabs.
  const [activeView, setActiveView] = useState<'questions' | 'bank'>('questions');
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'draft' | 'finalized'>('all');
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (editingIndex === null || activeView !== 'questions') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`cne-posttest-question-${editingIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingIndex, activeView, questions.length]);
  const [bankMatches, setBankMatches] = useState<CNEReferenceBankItem[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearched, setBankSearched] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankClinicalSearch, setBankClinicalSearch] = useState<CNEClinicalBankSearchInfo | null>(null);
  const [bankSearchOverride, setBankSearchOverride] = useState('');
  const [editingBankConcept, setEditingBankConcept] = useState(false);
  const [importingBankId, setImportingBankId] = useState<string | null>(null);
  const [bankImagePreviewIds,setBankImagePreviewIds] = useState<Set<string>>(new Set());
  const bankRequestRef = useRef(0);
  const [partialAiCount, setPartialAiCount] = useState(0);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [localImagePreviews, setLocalImagePreviews] = useState<Record<string, string>>({});

  // Request guards prevent an older CNE response from overwriting the currently open CNE.
  const questionsRequestRef = useRef(0);
  const quotaRequestRef = useRef(0);
  const generationRequestRef = useRef(0);
  const currentCneIdRef = useRef(cneId);
  currentCneIdRef.current = cneId;

  // Persisted IDs let us distinguish a saved question from a temporary draft.
  // Saved-question edits create a new version ID and preserve the prior row as REPLACED.
  const persistedQuestionIdsRef = useRef<Set<string>>(new Set());
  const draftOriginSnapshotRef = useRef<Map<string, CNEQuestion>>(new Map());
  // Source snapshots guard against import-refresh discarding edits to an existing saved row.
  const persistedQuestionSnapshotRef = useRef<Map<string, string>>(new Map());
  const versionSequenceRef = useRef(0);

  // Real-time stage progress state for AI generation
  const [generationProgress, setGenerationProgress] = useState<ProcessingProgress|null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [materialStatusCode, setMaterialStatusCode] = useState('NOT_UPLOADED');
  const [materialStatusMessage, setMaterialStatusMessage] = useState('Upload CNE learning material to enable AI question generation.');
  const [materialWarningCount,setMaterialWarningCount] = useState(0);
  const [materialExcludedCount,setMaterialExcludedCount] = useState(0);
  const [materialWarningText,setMaterialWarningText] = useState('');
  const [materialFlagMessage,setMaterialFlagMessage] = useState('');
  const [materialImages,setMaterialImages] = useState<{imageFileId:string;sourcePage:number;imageKind:string;caption:string;mimeType:string;size:number}[]>([]);
  const [chosenMaterialImageIds,setChosenMaterialImageIds] = useState<string[]>([]);
  const [showAiSetup,setShowAiSetup] = useState(false);
  const [aiWarningExpanded,setAiWarningExpanded] = useState(false);
  const [materialImagePreview,setMaterialImagePreview] = useState<Record<string,string>>({});
  const [visualLoading,setVisualLoading] = useState(false);
  const [reindexingMaterial, setReindexingMaterial] = useState(false);
  const [checkingMaterial, setCheckingMaterial] = useState(false);
  const materialRequestRef = useRef(0);
  const materialCheckRef = useRef(false);
  const [failureDialog, setFailureDialog] = useState<{
    title: string; message: string; type: 'material' | 'validation' | 'technical'; retrySafe: boolean; retryAction?: 'material-check' | 'generation';
  } | null>(null);
  const [generationStartedAt,setGenerationStartedAt]=useState(0);
  const generationNow=useProcessingClock(isGenerating);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationSteps = [
    'Verifying CNE and permissions',
    'Reading indexed CNE learning material',
    'Checking topic-relevant evidence',
    'Planning and generating five clinical MCQs',
    'Validating questions and sources',
    'Saving five unique Draft questions',
    'Questions ready for educator review'
  ];
  const stopProgressPolling = () => { if (progressPollRef.current) clearInterval(progressPollRef.current); progressPollRef.current = null; };

  // Authoritative AI generation quota; lightweight material presence is checked on first opening.
  const [quotaInfo, setQuotaInfo] = useState<CNEAiQuotaInfo | null>(null);

  const { success, error, warning } = useToast();

  useEffect(() => {
    // Reset all CNE-specific UI immediately so data from the previous CNE cannot flash or leak.
    questionsRequestRef.current += 1;
    quotaRequestRef.current += 1;
    materialRequestRef.current += 1;
    bankRequestRef.current += 1;
    setBankMatches([]);setBankSearched(false);setActiveView('questions');setBankError(null);setBankLoading(false);
    setBankClinicalSearch(null);setBankSearchOverride('');setEditingBankConcept(false);setPartialAiCount(0);
    materialCheckRef.current = false;
    generationRequestRef.current += 1;
    stopProgressPolling();
    generatingRef.current = false;
    savingRef.current = false;
    setQuestions([]);
    setQuotaInfo(null);
    setQuestionLoadError(null);
    setFailureDialog(null);
    setIsLocked(false);
    setEditingIndex(null);
    setShowHistory(false);
    setGenerationProgress(null);
    setGenerationStep(0);
    setMaterialStatusCode('NOT_UPLOADED');
    setMaterialStatusMessage('Upload CNE learning material to enable AI question generation.');
    setMaterialWarningCount(0);setMaterialExcludedCount(0);setMaterialWarningText('');setMaterialFlagMessage('');
    setMaterialImages([]);setChosenMaterialImageIds([]);setShowAiSetup(false);setAiWarningExpanded(false);setMaterialImagePreview({});
    setReindexingMaterial(false);
    setCheckingMaterial(false);
    setGenerationStartedAt(0);
    setIsGenerating(false);
    setPendingGenerationJob(false);
    setIsSaving(false);
    persistedQuestionIdsRef.current = new Set();
    draftOriginSnapshotRef.current = new Map();
    persistedQuestionSnapshotRef.current = new Map();

    const questionRequestId = ++questionsRequestRef.current;
    const quotaRequestId = ++quotaRequestRef.current;
    void loadQuestions(questionRequestId, cneId);
    void loadQuota(quotaRequestId, cneId);
    // Bank discovery is nonblocking: show the modal immediately, then fetch at most 20
    // ranked matches for this CNE. No material-status API call occurs at popup open.
    if (isAuthorized && !isClosedCne(cne)) {
      const searchId = ++bankRequestRef.current;
      void ApiService.searchCNEReferenceQuestions(cneId, '').then(result => {
        if (searchId !== bankRequestRef.current || cneId !== currentCneIdRef.current) return;
        if (result.success) {
          setBankMatches((result.data || []).slice(0, 20));
          setBankClinicalSearch(result.clinicalSearch || null);
          setBankSearched(true);
        } else {
          setBankError(result.message || 'Question Bank search unavailable.');
        }
      }).catch(err => {
        if (searchId === bankRequestRef.current) setBankError(err?.message || 'Question Bank search failed.');
      }).finally(() => {
        if (searchId === bankRequestRef.current) setBankLoading(false);
      });
      setBankLoading(true);
    }
    // A blueprint may have been completed after an earlier browser timeout.
    // Offer an explicit Resume action; do not re-reserve quota or auto-generate.
    void ApiService.getCNEAiJobStatus(cneId).then(job => {
      if (cneId === currentCneIdRef.current && job.success) {
        setPendingGenerationJob(job.data?.state === 'PLANNED' || job.data?.state === 'PARTIAL_SUCCESS');
      }
    }).catch(() => {});

    return () => {
      questionsRequestRef.current += 1;
      quotaRequestRef.current += 1;
      materialRequestRef.current += 1;
      bankRequestRef.current += 1;
      generationRequestRef.current += 1;
      stopProgressPolling();
    };
  }, [cneId]);

  const editableQuestionFingerprint = (q: CNEQuestion): string => JSON.stringify({
    question: q.question, options: q.options, correctOption: q.correctOption,
    explanation: q.explanation, authoritativeSource: q.authoritativeSource,
    status: normalizeQuestionStatus(q.status), isFinalized: Boolean(q.isFinalized),
    questionType:q.questionType||'',imageFileId:q.imageFileId||''
  });

  const hasUnsavedQuestionEdits = (): boolean => questions.some((q) => {
    const id = String(q.id || '');
    if (!persistedQuestionIdsRef.current.has(id)) return true;
    return persistedQuestionSnapshotRef.current.get(id) !== editableQuestionFingerprint(q);
  });

  const loadQuestions = async (requestId = ++questionsRequestRef.current, targetCneId = cneId) => {
    setLoading(true);
    setQuestionLoadError(null);
    try {
      const res = await ApiService.getCNEQuestions(targetCneId);
      const isCurrent = requestId === questionsRequestRef.current && targetCneId === currentCneIdRef.current;
      if (!isCurrent) return;

      if (res.success && res.data) {
        const normalized = res.data.map((q) => ({
          ...q,
          options: { ...q.options },
          status: normalizeQuestionStatus(q.status) as CNEQuestion['status']
        }));
        setQuestions(normalized);
        persistedQuestionIdsRef.current = new Set(normalized.map((q) => String(q.id || '')).filter(Boolean));
        persistedQuestionSnapshotRef.current = new Map(normalized.map(q => [String(q.id || ''), editableQuestionFingerprint(q)]));
        draftOriginSnapshotRef.current = new Map();
        setIsLocked(normalized.some((q) => Boolean(q.isLocked)));
        setQuestionLoadError(null);
      } else {
        setQuestionLoadError(res.message || 'Question list could not be loaded.');
      }
    } catch (e: any) {
      if (requestId === questionsRequestRef.current && targetCneId === currentCneIdRef.current) {
        console.warn('Failed to load CNE questions:', e);
        setQuestionLoadError(e?.message || 'Question list could not be loaded.');
      }
    } finally {
      if (requestId === questionsRequestRef.current && targetCneId === currentCneIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadQuota = async (requestId = ++quotaRequestRef.current, targetCneId = cneId) => {
    try {
      const quotaRes = await ApiService.getAiQuota(targetCneId);
      const isCurrent = requestId === quotaRequestRef.current && targetCneId === currentCneIdRef.current;
      if (!isCurrent) return;
      setQuotaInfo(quotaRes.success && quotaRes.data ? quotaRes.data : null);
    } catch (e) {
      if (requestId === quotaRequestRef.current && targetCneId === currentCneIdRef.current) {
        console.warn('Failed to load AI quota:', e);
        setQuotaInfo(null);
      }
    }
  };

  // Lightweight material presence check at page opening; detailed extraction is deferred.
  // The backend verifies that the current CNE material was indexed successfully.
  const loadMaterialStatus = async (requestId = ++materialRequestRef.current, targetCneId = cneId): Promise<boolean | null> => {
    materialCheckRef.current = true;
    setCheckingMaterial(true);
    try {
      const status = await ApiService.getCNEAiMaterialStatus(targetCneId);
      if (requestId !== materialRequestRef.current || targetCneId !== currentCneIdRef.current) return null;
      if (!status.success || !status.data) {
        setFailureDialog({
          title: 'Unable to Check Learning Material',
          message: status.message || 'The CNE material status is unavailable. Please try again.',
          type: 'technical',
          retrySafe: true,
          retryAction: 'material-check'
        });
        return null;
      }
      setMaterialStatusCode(status.data.status || 'NOT_UPLOADED');
      setMaterialStatusMessage(status.data.message || 'Material indexing is required.');
      setMaterialWarningCount(Number(status.data.warningCount||0));
      setMaterialExcludedCount(Number(status.data.excludedCount||0));
      setMaterialWarningText(String(status.data.fidelityWarnings||''));
      setMaterialFlagMessage(String(status.data.reviewFlagDetails||''));
      return Boolean(status.data.hasOwnMaterial);
    } catch (e: any) {
      if (requestId === materialRequestRef.current && targetCneId === currentCneIdRef.current) {
        setFailureDialog({
          title: 'Unable to Check Learning Material',
          message: e?.message || 'The material check could not be completed. Please try again.',
          type: 'technical',
          retrySafe: true,
          retryAction: 'material-check'
        });
      }
      return null;
    } finally {
      if (requestId === materialRequestRef.current && targetCneId === currentCneIdRef.current) {
        setCheckingMaterial(false);
        materialCheckRef.current = false;
      }
    }
  };

  // Material and images are fetched only when the AI setup dialog is opened.
  // Manual questions and the Question Bank should never display extraction alerts.
  const openAiGenerationSetup = async () => {
    setShowAiSetup(true);
    setAiWarningExpanded(false);
    setChosenMaterialImageIds([]);
    setMaterialImages([]);
    setMaterialStatusCode('CHECKING');
    setMaterialStatusMessage('Checking indexed CNE learning material…');
    const requestId = ++materialRequestRef.current;
    const targetCneId = cneId;
    void loadMaterialStatus(requestId,targetCneId);
    try {
      const images = await ApiService.getCNEAiMaterialImages(targetCneId);
      if (requestId === materialRequestRef.current && targetCneId === currentCneIdRef.current && images.success && images.data) {
        setMaterialImages(images.data.images || []);
      }
    } catch { /* Image previews are optional; text-only generation remains available. */ }
  };

  const previewMaterialImage = async (id:string) => {
    if(materialImagePreview[id])return;
    setVisualLoading(true);
    try {const res=await ApiService.getCNEAiMaterialImage(cneId,id);
      if(res.success&&res.data)setMaterialImagePreview(x=>({...x,[id]:`data:${res.data!.mimeType};base64,${res.data!.base64Data}`}));
      else warning(res.message||'Image preview is not available.');
    }catch(e:any){warning(e?.message||'Unable to load image preview.');}
    finally{setVisualLoading(false);}
  };

  // A lost response is not proof of failure: look for a committed batch and quota.
  // Do not claim success unless both authoritative readings are consistent.
  const reconcileUncertainGeneration = async (targetCneId: string, isCurrent: () => boolean) => {
    const [storedResult, quotaResult, jobResult] = await Promise.allSettled([
      ApiService.getCNEQuestions(targetCneId), ApiService.getAiQuota(targetCneId),
      ApiService.getCNEAiJobStatus(targetCneId)
    ]);
    if (!isCurrent()) return { completed: false, safeToRetry: false };
    const stored = storedResult.status === 'fulfilled' ? storedResult.value : null;
    const freshQuota = quotaResult.status === 'fulfilled' ? quotaResult.value : null;
    const liveJob = jobResult.status === 'fulfilled' && jobResult.value.success ? jobResult.value.data : null;
    setPendingGenerationJob(liveJob?.state === 'PLANNED' || liveJob?.state === 'PARTIAL_SUCCESS');
    if (freshQuota?.success && freshQuota.data) setQuotaInfo(freshQuota.data);
    const used = Boolean(freshQuota?.success && freshQuota.data &&
      (freshQuota.data.status === 'USED' || freshQuota.data.status === 'GENERATED' || freshQuota.data.attemptsUsed >= 1));
    if (used && stored?.success && Array.isArray(stored.data) && stored.data.filter(q => String(q.id || '').startsWith('q_ai_')).length >= 5) {
      const fresh = stored.data.map(q => ({ ...q, options: { ...q.options }, status: normalizeQuestionStatus(q.status) as CNEQuestion['status'] }));
      setQuestions(fresh);
      persistedQuestionIdsRef.current = new Set(fresh.map(q => String(q.id || '')).filter(Boolean));
      persistedQuestionSnapshotRef.current = new Map(fresh.map(q => [String(q.id || ''), editableQuestionFingerprint(q)]));
      setQuestionLoadError(null);
      if (onUpdated) onUpdated();
      return { completed: true, safeToRetry: false };
    }
    // Only offer another attempt after both fresh reads confirm no committed AI batch.
    return {
      completed: false,
      safeToRetry: Boolean(liveJob && ['NONE','FAILED'].includes(liveJob.state) &&
        freshQuota?.success && freshQuota.data?.canGenerate && stored?.success &&
        Array.isArray(stored.data) && !stored.data.some(q => String(q.id || '').startsWith('q_ai_')))
    };
  };

  // Is the one-time initial AI generation already completed?
  const isAiGenerationUsed = Boolean(
    quotaInfo && (quotaInfo.status === 'USED' || quotaInfo.status === 'GENERATED' || quotaInfo.attemptsUsed >= 1)
  );
  const isAiGenerationUnavailable = Boolean(quotaInfo && !quotaInfo.canGenerate && !isAiGenerationUsed);

  const sessionClosed = isClosedCne(cne);
  const canModify = isAuthorized && !sessionClosed && !isLocked;

  // Keep AI and Manual question actions disabled until the initial question list
  // and authoritative AI quota have both finished loading for the currently open CNE.
  // quotaInfo remains null while the quota request is still pending or if it fails,
  // so the question tools fail closed rather than becoming clickable prematurely.
  const isPageReady = !loading && !questionLoadError && quotaInfo !== null;
  const canInteractWithQuestionTools = canModify && isPageReady && !checkingMaterial && !materialCheckRef.current && !isGenerating && !generatingRef.current && !isSaving;

  const openQuestionBank = () => {
    if (!canModify || !isPageReady || isGenerating || isSaving || importingBankId) return;
    setActiveView('bank');
    // Background discovery already started when the popup opened. Retry only on error.
    if (!bankSearched && !bankLoading) void searchBank();
  };

  const searchBank = async (searchOverride?: string) => {
    if (!canModify || isGenerating || isSaving) return;
    const id = ++bankRequestRef.current;
    const target = cneId;
    setBankLoading(true);setBankError(null);
    try {
      const res=await ApiService.searchCNEReferenceQuestions(target, searchOverride !== undefined ? searchOverride : bankSearchOverride);
      if(id!==bankRequestRef.current || target!==currentCneIdRef.current)return;
      if(!res.success){setBankError(res.message || 'Question Bank search unavailable.');setBankMatches([]);setBankClinicalSearch(null);}
      else {setBankMatches((res.data || []).slice(0, 20));setBankClinicalSearch(res.clinicalSearch || null);setBankSearched(true);setEditingBankConcept(false);}
    }catch(e:any){if(id===bankRequestRef.current)setBankError(e?.message || 'Question Bank search failed.');}
    finally{if(id===bankRequestRef.current)setBankLoading(false);}
  };

  const importBankQuestion = async (q:CNEReferenceBankItem) => {
    if(!canModify || importingBankId || isGenerating || isSaving || !q.canImport)return;
    if(questions.some(item=>item.id==='q_bank_'+q.questionId.replace(/[^a-zA-Z0-9_-]/g,'_'))){warning('This Question Bank item is already present.');return;}
    // Import reloads the authoritative question list: never silently discard *any*
    // unsaved change (including finalized flags, saved-row edits, and blank manual rows).
    if (hasUnsavedQuestionEdits()) {
      error('Save or discard edits in My Questions before importing. Your changes were not lost.');
      return;
    }
    if(!window.confirm(`Review the answer and rationale? Import as an unfinalized Draft for educator clinical review?`))return;
    setImportingBankId(q.questionId);
    try{
      const result=await ApiService.importCNEReferenceQuestion(cneId,q.questionId);
      if(!result.success){error(result.message || 'Question Bank import failed.');return;}
      await loadQuestions(++questionsRequestRef.current,cneId);
      success('Imported as Draft. Open My Questions to review, edit and finalize it.');
      if(onUpdated)onUpdated();
    }catch(e:any){error(e?.message || 'Question Bank import failed.');}
    finally{setImportingBankId(null);}
  };

  const requestAiGeneration = async () => {
    if (!canInteractWithQuestionTools || materialCheckRef.current || isAiGenerationUsed || isAiGenerationUnavailable) return;
    // Open on-demand source evidence setup. The PLAN endpoint still revalidates
    // material, authorization, quota and image provenance before Gemini.
    setFailureDialog(null);
    void openAiGenerationSetup();
  };

  const handleGenerateAi = async (resumePlanned = false) => {
    if (
      generatingRef.current ||
      isGenerating ||
      !canModify ||
      !isPageReady
    ) {
      return;
    }

    // One successful AI generation is allowed per CNE. Failed generation does not consume the allowance.
    if (isAiGenerationUsed) {
      error('AI question generation has already been completed for this CNE.');
      return;
    }

    const requestCneId = cneId;
    const requestId = ++generationRequestRef.current;
    const isCurrent = () => requestId === generationRequestRef.current && requestCneId === currentCneIdRef.current;

    generatingRef.current = true;
    setFailureDialog(null);
    setIsGenerating(true);
    setGenerationStep(1);
    const startedAt = Date.now();
    setGenerationStartedAt(startedAt);setGenerationProgress(null);
    stopProgressPolling();
    // Every stage comes from the authorized backend progress endpoint, never a fake timer.
    let newest=0,polling=false;
    progressPollRef.current = setInterval(() => {
      if(!isCurrent()||!generatingRef.current||polling)return;polling=true;
      void ApiService.getCNEAiGenerationProgress(requestCneId).then((progress) => {
        if (isCurrent() && progress.success && progress.data && progress.data.stage >= 1 && progress.data.stage <= 7 &&
            Number(progress.data.updatedAt || 0) >= startedAt && Number(progress.data.updatedAt||0)>=newest && generatingRef.current) {
          newest=Number(progress.data.updatedAt||0);
          setGenerationStep(progress.data.stage);
          setGenerationProgress(progress.data);
        }
      }).catch(() => { /* polling is advisory; server execution is authoritative */ }).finally(()=>{polling=false;});
    }, 4500);
    setGenerationProgress({stage:1,message:'Checking the current CNE generation request.',steps:{'1':{message:'Checking the current CNE generation request.'}}});

    try {
      let res;
      if (!resumePlanned) {
        const planned = await ApiService.planCNEAiGeneration(requestCneId,chosenMaterialImageIds);
        if (!isCurrent()) return;
        if (!planned.success) {
          res = planned;
        } else {
          setPendingGenerationJob(true);
          res = await ApiService.finishCNEAiGeneration(requestCneId);
        }
      } else {
        res = await ApiService.finishCNEAiGeneration(requestCneId);
      }
      if (!isCurrent()) return;

      if (res && res.success && res.data && Array.isArray(res.data) && res.data.length >= 1) {
        const status = await ApiService.getCNEAiJobStatus(requestCneId);
        const partial = res.partial === true || (status.success && status.data?.state === 'PARTIAL_SUCCESS');
        setPendingGenerationJob(partial);
        await loadQuestions(++questionsRequestRef.current, requestCneId);
        setPartialAiCount(partial ? Number(res.savedCount || res.data.length) : 0);
        setGenerationStep(7);
        setGenerationProgress(null);
        success(partial ? `Saved ${res.data.length} verified AI Draft question(s). Quota not deducted; resume missing objectives.` : 'Five AI Draft questions saved. Review before finalizing.');
        await loadQuota(++quotaRequestRef.current,requestCneId);
        if(onUpdated)onUpdated();
      } else {
        const code = res?.errorCode || 'UNKNOWN_GENERATION_FAILURE';
        const msg = res?.message || 'AI question generation could not be completed.';
        const missing = ['MATERIAL_NOT_INDEXED', 'MATERIAL_CHANGED', 'INDEX_QUALITY_FAILED', 'OCR_UNAVAILABLE', 'OCR_INSUFFICIENT', 'INSUFFICIENT_READABLE_MATERIAL', 'UNREADABLE_PDF_TEXT', 'INSUFFICIENT_TOPIC_MATERIAL', 'NO_EXTRACTABLE_CONTENT'].includes(code);
        const validationCodes = [
          'OFF_TOPIC_QUESTION', 'UNSUPPORTED_SOURCE_EVIDENCE', 'DUPLICATE_QUESTION',
          'INVALID_QUESTION_TEXT', 'INSUFFICIENT_QUESTIONS', 'INVALID_CORRECT_OPTION',
          'MISSING_SOURCE', 'UNVERIFIED_SOURCE', 'INFORMAL_SOURCE_PROHIBITED',
          'MISSING_EXPLANATION', 'AI_BLUEPRINT_FAILED', 'BLUEPRINT_MISMATCH',
          'MISSING_OPTIONS', 'DUPLICATE_OPTIONS'
        ];
        const validationFailure = validationCodes.includes(code);
        if (code === 'MATERIAL_NOT_INDEXED' || code === 'MATERIAL_CHANGED') {
          setFailureDialog({title:'CNE Learning Material Not Ready',message:msg,type:'material',retrySafe:false});
        } else if (missing) {
          setFailureDialog({title: 'Learning Material Required', message: msg, type: 'material', retrySafe: false});
        } else if (validationFailure) {
          // Keep the exact server diagnostic; avoid duplicating the 'no questions saved' text.
          // Only suggest more material for insufficient evidence, not formatting failures.
          const materialAdvice = code === 'UNSUPPORTED_SOURCE_EVIDENCE'
            ? 'If the source passage is insufficient, you may upload additional relevant material.'
            : 'Review the uploaded CNE material and retry if question validation fails.';
          setFailureDialog({title: 'AI Questions Did Not Pass Validation', message: `${msg} [${code}] ${materialAdvice}`, type: 'validation', retrySafe: true});
        } else {
          const recovered = await reconcileUncertainGeneration(requestCneId, isCurrent);
          if (!isCurrent()) return;
          if (recovered.completed) {
            success('The server saved five Draft questions. They have been recovered for review.');
          } else {
            const overloaded = ['AI_TEMPORARILY_UNAVAILABLE', 'AI_RATE_LIMITED'].includes(code);
            const apiQuota = code === 'AI_QUOTA_LIMITED';
            const configurationError = ['AI_CONFIGURATION_ERROR', 'AI_MODEL_NOT_FOUND', 'AI_REQUEST_REJECTED'].includes(code);
            const retrySafe = recovered.safeToRetry && !apiQuota && !configurationError;
            const title = apiQuota ? 'Gemini API Quota Limit Reached'
              : configurationError ? 'Gemini Configuration Needs Attention'
              : overloaded ? 'Gemini Is Temporarily Busy'
              : code === 'AI_INVALID_RESPONSE' ? 'Gemini Returned an Invalid Response'
              : 'AI Generation Could Not Be Confirmed';
            const advice = apiQuota ? 'Ask the administrator to check Gemini API quota and usage limits.'
              : configurationError ? 'Ask the administrator to review the Gemini API configuration.'
              : retrySafe ? 'The system found no completed AI batch and the application quota is available. You can retry later.'
              : 'A safe retry cannot yet be confirmed. Refresh the question bank and quota before another attempt.';
            setFailureDialog({title, message: `${msg} ${advice}`, type: 'technical', retrySafe});
          }
        }
        if (missing || code === 'MATERIAL_NOT_INDEXED' || validationFailure) {
          await loadQuota(++quotaRequestRef.current, requestCneId);
        }
      }
    } catch (e: any) {
      if (isCurrent()) {
        const recovered = await reconcileUncertainGeneration(requestCneId, isCurrent);
        if (!isCurrent()) return;
        if (recovered.completed) {
          success('The server saved five Draft questions. They have been recovered for review.');
        } else {
          setFailureDialog({title: 'Unable to Confirm AI Generation', message: `${e?.message || 'Network or server communication failed.'} ${recovered.safeToRetry ? 'No saved AI batch was found and quota remains available.' : 'The outcome cannot yet be confirmed. Refresh the question bank before retrying.'}`, type: 'technical', retrySafe: recovered.safeToRetry});
        }
      }
    } finally {
      if (isCurrent()) {
        stopProgressPolling();
        generatingRef.current = false;
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    }
  };

  const handleFinalizeAll = () => {
    if (!canModify) return;
    const active = questions.filter(isActiveQuestion);
    if (active.some((q) => String(q.id || '').startsWith('q_ai_') && !q.isFinalized)) {
      error('AI questions must be reviewed and marked Finalized individually.');
      return;
    }
    if(active.length>10){error('Finalize All would exceed the 10-question Post-Test maximum. Select up to 10 questions individually.');return;}
    const incomplete = active.filter((q) => !isQuestionComplete(q));
    if (incomplete.length > 0) {
      error(`Complete all active questions before Finalize All. Incomplete: ${incomplete.length}`);
      return;
    }
    setQuestions((prev) =>
      prev.map((q) => (isActiveQuestion(q) ? { ...q, isFinalized: true } : q))
    );
    success('All valid active questions marked as Finalized.');
  };

  const nextVersionId = (baseId?: string) => {
    versionSequenceRef.current += 1;
    const safeBase = String(baseId || 'question').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    return `${safeBase}__v${Date.now()}_${versionSequenceRef.current}`;
  };

  const cloneQuestion = (q: CNEQuestion): CNEQuestion => ({
    ...q,
    options: { ...q.options },
    status: normalizeQuestionStatus(q.status) as CNEQuestion['status']
  });

  /**
   * Apply a content edit without overwriting a persisted question.
   * The first edit to a saved question preserves the old row as REPLACED and creates a new version ID.
   */
  const updateQuestionWithVersioning = (idx: number, updated: Partial<CNEQuestion>) => {
    if (!canModify) return;
    const target = questions[idx];
    if (!target || !isActiveQuestion(target)) return;

    const persisted = persistedQuestionIdsRef.current.has(String(target.id || ''));
    if (!persisted) {
      setQuestions((prev) => {
        const copy = [...prev];
        if (!copy[idx]) return prev;
        copy[idx] = { ...copy[idx], ...updated };
        return copy;
      });
      return;
    }

    const originalSnapshot = cloneQuestion(target);
    const versionId = nextVersionId(target.id);
    const newVersion: CNEQuestion = {
      ...cloneQuestion(target),
      ...updated,
      id: versionId,
      status: 'ACTIVE',
      isFinalized: false
    };

    draftOriginSnapshotRef.current.set(versionId, originalSnapshot);
    setQuestions((prev) => {
      const currentIndex = prev.findIndex((q) => q.id === target.id && isActiveQuestion(q));
      if (currentIndex < 0) return prev;
      const copy = [...prev];
      copy[currentIndex] = { ...cloneQuestion(copy[currentIndex]), status: 'REPLACED', isFinalized: false };
      copy.splice(currentIndex + 1, 0, newVersion);
      return copy;
    });
    setEditingIndex(idx + 1);
  };

  const handleAddManualQuestion = () => {
    if (!canInteractWithQuestionTools || materialCheckRef.current || generatingRef.current) return;
    const newQ: CNEQuestion = {
      id: `q_manual_${Date.now()}_${versionSequenceRef.current++}`,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctOption: 'A',
      explanation: '',
      authoritativeSource: '',
      questionType: undefined,imageFileId:'',
      status: 'ACTIVE',
      isFinalized: false
    };
    setQuestionSearch('');
    setQuestionFilter('all');
    setQuestions((prev) => [...prev, newQ]);
    setEditingIndex(questions.length);
  };

  const handleReplaceQuestion = (idx: number) => {
    if (!canModify) return;
    const targetQ = questions[idx];
    if (!targetQ || !isActiveQuestion(targetQ)) return;

    const replacementId = String(targetQ.id).startsWith('q_bank_') ? `q_manual_${Date.now()}_${versionSequenceRef.current++}` : nextVersionId(targetQ.id);
    const replacementQ: CNEQuestion = {
      id: replacementId,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctOption: 'A',
      explanation: '',
      authoritativeSource: targetQ.authoritativeSource || '',
      questionType:undefined,imageFileId:'',
      status: 'ACTIVE',
      isFinalized: false
    };

    const isPersisted = persistedQuestionIdsRef.current.has(String(targetQ.id || ''));
    if (!isPersisted) {
      // Unsaved drafts have no historical value yet; replace them in place instead of creating fake history.
      setQuestions((prev) => {
        const copy = [...prev];
        copy[idx] = replacementQ;
        return copy;
      });
      setEditingIndex(idx);
      return;
    }

    draftOriginSnapshotRef.current.set(replacementId, cloneQuestion(targetQ));
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...cloneQuestion(copy[idx]), status: 'REPLACED', isFinalized: false };
      copy.splice(idx + 1, 0, replacementQ);
      return copy;
    });
    setEditingIndex(idx + 1);
    success('Previous saved question preserved in history. Complete the new version.');
  };

  const handleUpdateQuestion = (idx: number, updated: Partial<CNEQuestion>) => {
    updateQuestionWithVersioning(idx, updated);
  };

  const handleSelectManualQuestionType = (idx: number, next: 'TEXT' | 'IMAGE') => {
    const target = questions[idx];
    if (!target || !canModify || !String(target.id || '').startsWith('q_manual_')) return;
    if (target.questionType === next) return;
    if (next === 'TEXT' && target.imageFileId) {
      if (!window.confirm('Switch to TEXT? The current image will be unlinked from this question. The Drive file will not be deleted.')) return;
      handleUpdateQuestion(idx, {questionType:'TEXT', imageFileId:''});
      return;
    }
    handleUpdateQuestion(idx, {questionType:next});
  };

  const handleUploadQuestionImage = async (idx: number, file: File) => {
    const target=questions[idx];
    if (!target || !canModify || !String(target.id).startsWith('q_manual_')) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3*1024*1024 || file.size < 1) {
      error('Select a JPG, PNG or WebP image (maximum 3 MB).');return;
    }
    setUploadingImageId(target.id);
    try {
      const dataUrl = await new Promise<string>((resolve,reject) => {
        const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Unable to read image'));reader.readAsDataURL(file);
      });
      const res=await ApiService.uploadCNEQuestionImage({cneId,mimeType:file.type,base64Data:dataUrl.split(',')[1]||''});
      if(!res.success||!res.data?.imageFileId)throw new Error(res.message||'Image upload failed.');
      setLocalImagePreviews(prev=>({...prev,[res.data!.imageFileId]:dataUrl}));
      updateQuestionWithVersioning(idx,{questionType:'IMAGE',imageFileId:res.data.imageFileId});
      success('Image uploaded privately. Save the question to keep its reference.');
    }catch(e:any){error(e?.message||'Image upload failed.');}
    finally{setUploadingImageId(null);}
  };

  const handleOptionChange = (idx: number, optKey: 'A' | 'B' | 'C' | 'D', value: string) => {
    if (!canModify) return;
    const target = questions[idx];
    if (!target) return;
    updateQuestionWithVersioning(idx, {
      options: { ...target.options, [optKey]: value }
    });
  };

  const handleDeleteQuestion = (idx: number) => {
    if (!canModify) return;
    const target = questions[idx];
    if (!target) return;

    const targetId = String(target.id || '');
    const isPersisted = persistedQuestionIdsRef.current.has(targetId);
    if (!isPersisted) {
      const originalSnapshot = draftOriginSnapshotRef.current.get(targetId);
      setQuestions((prev) => {
        const copy = prev.filter((_, i) => i !== idx);
        if (originalSnapshot) {
          const originIndex = copy.findIndex((q) => q.id === originalSnapshot.id);
          if (originIndex >= 0) copy[originIndex] = cloneQuestion(originalSnapshot);
        }
        return copy;
      });
      draftOriginSnapshotRef.current.delete(targetId);
      setEditingIndex(null);
      warning(originalSnapshot ? 'Unsaved replacement discarded; previous saved version restored.' : 'Unsaved manual question removed.');
      return;
    }

    // Persisted questions are never hard-deleted; preserve them as historical REPLACED rows.
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], status: 'REPLACED', isFinalized: false };
      return copy;
    });
    if (editingIndex === idx) setEditingIndex(null);
    warning('Saved question moved to Replaced Questions History.');
  };

  const handleToggleFinalized = (idx: number) => {
    if (!canModify) return;
    const target = questions[idx];
    if (!target || !isActiveQuestion(target)) return;
    if(!target.isFinalized && questions.filter(q=>isActiveQuestion(q)&&q.isFinalized).length>=10){error('A Post-Test can contain at most 10 finalized questions.');return;}
    if (!target.isFinalized && !isQuestionComplete(target)) {
      error('Complete the question, all four options, rationale, and authoritative source before marking it Finalized.');
      return;
    }
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], isFinalized: !copy[idx].isFinalized };
      return copy;
    });
  };

  const performSaveQuestions = async (openQR = false) => {
    if (savingRef.current || isSaving || !canModify) return;

    // Purely blank unsaved drafts are UI scratch rows, not question history. Drop them before save.
    const payloadQuestions = questions.filter((q) => {
      const persisted = persistedQuestionIdsRef.current.has(String(q.id || ''));
      return persisted || !isBlankUnsavedQuestion(q);
    });
    const active = payloadQuestions.filter(isActiveQuestion);
    const validFinalized = active.filter((q) => q.isFinalized && isQuestionComplete(q));

    if (openQR && validFinalized.length < 5) {
      error(`At least 5 valid finalized questions are required before opening QR. Currently ready: ${validFinalized.length}/5.`);
      return;
    }

    if(validFinalized.length>10){error('A maximum of 10 questions can be finalized for the Post-Test.');return;}
    const incompleteActive = active.filter((q) => !isQuestionComplete(q));
    if (incompleteActive.length > 0) {
      error(`Complete or remove the remaining ${incompleteActive.length} incomplete active question(s) before saving.`);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const res = await ApiService.saveCNEQuestions({
        cneId,
        questions: payloadQuestions
      });

      if (res.success) {
        persistedQuestionIdsRef.current = new Set(payloadQuestions.map((q) => String(q.id || '')).filter(Boolean));
        persistedQuestionSnapshotRef.current = new Map(payloadQuestions.map(q => [String(q.id || ''), editableQuestionFingerprint(q)]));
        draftOriginSnapshotRef.current = new Map();
        setQuestions(payloadQuestions);
        success(openQR ? `Saved ${validFinalized.length} finalized questions. Opening QR.` : 'Draft question set saved. Post-Test needs 5–10 finalized questions.');
        if (onUpdated) onUpdated();
        if (openQR && onNavigateToQR) onNavigateToQR();
      } else {
        error(res.message || 'Failed to save question bank.');
      }
    } catch (e: any) {
      error(e?.message || 'Error occurred while saving questions.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const activeQuestions = questions.filter(isActiveQuestion);
  const replacedQuestions = questions.filter((q) => !isActiveQuestion(q));
  const completeActiveCount = activeQuestions.filter(isQuestionComplete).length;
  const validFinalizedCount = activeQuestions.filter((q) => q.isFinalized && isQuestionComplete(q)).length;
  const incompleteActiveCount = activeQuestions.length - completeActiveCount;
  // The top-level editing dialog deliberately requires its explicit Close button:
  // Escape must not discard draft questions or interrupt image imports.
  const dialogRef = useAccessibleDialog({ isOpen: true, canClose: false });
  const failureDialogRef = useAccessibleDialog({
    isOpen: Boolean(failureDialog), onRequestClose: () => setFailureDialog(null),
    initialFocus: '[data-failure-heading]'
  });

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-5">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cne-questions-dialog-title" tabIndex={-1} className="bg-white rounded-none sm:rounded-2xl w-full sm:w-[92vw] md:w-[86vw] lg:w-[82vw] max-w-[1050px] h-[100dvh] sm:h-auto sm:max-h-[88dvh] min-h-0 flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Compact title-only header. Finalization progress sits beside footer actions. */}
        <header className="z-10 shrink-0 border-b border-slate-200 bg-white px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700"><Sparkles className="h-4.5 w-4.5" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-purple-800">Post-Test Questions</p>
                <h3 id="cne-questions-dialog-title" className="break-words text-sm font-bold leading-snug text-slate-950 sm:text-base">{cne.topic}</h3>
              </div>
              {isLocked && <CNEQuestionHeaderStatusTag tone="locked"><Lock className="h-3 w-3"/> Locked</CNEQuestionHeaderStatusTag>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close CNE Questions" disabled={isSaving || isGenerating || !!importingBankId} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X className="h-5 w-5" /></button>
          </div>
        </header>

        {activeView === 'bank' ? (
          <div role="region" id="cne-question-bank-panel" aria-label="Question Bank search and import"
            className="min-w-0 min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-indigo-50/40 p-3 text-xs sm:p-4">
            <button type="button" onClick={()=>setActiveView('questions')} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50"><ArrowRight className="h-3.5 w-3.5 rotate-180"/> Back to My Questions ({activeQuestions.length})</button>
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-bold text-indigo-950">Institutional Question Bank</h4>
                <p className="text-slate-600 mt-1">Up to 20 clinically relevant matches. Review and choose which questions to import as Drafts; manual and AI creation remain optional.</p>
              </div>

            </div>
            {bankClinicalSearch && <div className="bg-white border border-indigo-200 rounded-lg p-3 space-y-2" aria-label="Recognized clinical search concept">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-indigo-800">Recognized clinical concept{bankClinicalSearch.concepts.length === 1 ? '' : 's'}</div>
                  <div className="font-semibold text-slate-900">{bankClinicalSearch.concepts.join(' · ') || 'Needs clarification'}</div>
                  {bankClinicalSearch.context.length > 0 && <div className="text-slate-500">Context: {bankClinicalSearch.context.join(', ')}</div>}
                </div>
                <button type="button" disabled={bankLoading || !!importingBankId} onClick={() => setEditingBankConcept(v => !v)}
                  className="px-2 py-1 border border-indigo-200 rounded-md text-indigo-800 font-semibold disabled:opacity-40">
                  <Edit3 className="w-3 h-3 inline-block mr-1" /> Edit concept
                </button>
              </div>
              {bankClinicalSearch.notice && <div role="status" className="text-amber-800">{bankClinicalSearch.notice}</div>}
            </div>}
            {editingBankConcept && <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => {e.preventDefault();void searchBank();}}>
              <label className="flex-1 font-semibold text-slate-700">Clinical topic for Question Bank search
                <input value={bankSearchOverride} maxLength={120} onChange={e => setBankSearchOverride(e.target.value)}
                  placeholder="e.g. Guillain Barre syndrome, gastritis, wound care" disabled={bankLoading}
                  className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 font-normal" />
              </label>
              <button type="submit" disabled={bankLoading || !!importingBankId || !canModify} className="self-end px-3 py-2 bg-indigo-700 text-white rounded-md font-semibold disabled:opacity-40">Search concept</button>
              {bankSearchOverride && <button type="button" onClick={() => {setBankSearchOverride('');setBankClinicalSearch(null);setBankSearched(false);setBankMatches([]);void searchBank('');}} disabled={bankLoading} className="self-end px-2 py-2 underline text-indigo-800">Use CNE topic</button>}
            </form>}
            {bankLoading && <div role="status" className="flex items-center gap-2 text-indigo-800"><Loader2 className="w-4 h-4 animate-spin" /> Searching clinically relevant Question Bank entries…</div>}
            {bankError && <div role="alert" className="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{bankError} Reopen Question Bank to retry the search.</div>}
            {!bankLoading && !bankError && bankSearched && !bankMatches.length && <div role="status" className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
              <div className="font-bold text-slate-800">{bankClinicalSearch?.requiresClarification ? 'Clarify the clinical topic to search' : 'No clinically relevant Question Bank questions found'}</div>
              <p className="text-slate-600">{bankClinicalSearch?.requiresClarification ? 'Use Edit concept to enter a specific disease, procedure, nursing practice or an expanded abbreviation.' : 'No indexed textbook MCQs matched the clinical concept. Unrelated care/patient questions have been excluded. You can use AI Question Generation or Add Manual Question under My Questions.'}</p>
            </div>}
            {bankMatches.map(q => {
              const sourceId = 'q_bank_' + q.questionId.replace(/[^a-zA-Z0-9_-]/g, '_');
              const alreadyImported = questions.some(item => item.id === sourceId || String(item.id || '').startsWith(sourceId + '__v'));
              return <div key={q.questionId} className="border border-indigo-100 bg-white rounded-xl p-4 space-y-3 shadow-xs">
                <div className="font-semibold text-slate-900 text-sm">{q.question}</div>
                <span className="text-[10px] font-bold uppercase rounded bg-indigo-50 px-2 py-1">{q.questionType} · {q.responseFormat||'SINGLE_SELECT'}</span>
                {q.questionType==='IMAGE' && <div className="space-y-1">
                  <button type="button" className="text-indigo-700 font-semibold underline" onClick={()=>setBankImagePreviewIds(prev=>{const next=new Set(prev);next.has(q.questionId)?next.delete(q.questionId):next.add(q.questionId);return next;})}>{bankImagePreviewIds.has(q.questionId)?'Hide image':'Preview clinical image'}</button>
                  {bankImagePreviewIds.has(q.questionId)&& <CNEQuestionImage cneId={cneId} sourceQuestionId={q.questionId} imageFileId={q.imageFileId} />}
                </div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{(['A','B','C','D','E','F'] as const).filter(key=>Boolean(q.options[key])).map(key => <div key={key}>{key}. {q.options[key]}</div>)}</div>
                <div><strong>Original answer:</strong> {q.correctOption} · <strong>Rationale:</strong> {q.explanation}</div>
                {alreadyImported ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 className="w-4 h-4"/> Imported · Review under My Questions</span>
                ) : (
                  <button type="button" disabled={!q.canImport || !!importingBankId || isGenerating || isSaving || !canModify}
                    onClick={() => void importBankQuestion(q)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-700 text-white font-semibold disabled:opacity-40">
                    {importingBankId === q.questionId ? 'Importing…' : 'Import as Draft'}
                  </button>
                )}
                {!q.canImport && <span className="ml-2 text-amber-700">{q.responseFormat&&q.responseFormat!=='SINGLE_SELECT'?'This format is supported in standalone Quiz only; CNE-class post-test import currently requires single-select.':'Not available for CNE-class import. Review question validity and format.'}</span>}
              </div>;
            })}
          </div>
        ) : (
          <>
        {pendingGenerationJob && !isGenerating && <div className="px-6 py-2 bg-amber-50 text-amber-950 text-xs border-b border-amber-200 flex items-center justify-between gap-3">
          <span>AI generation can be resumed. {partialAiCount ? `${partialAiCount}/5 AI Drafts validated. ` : ''}Existing verified Drafts remain saved; only missing objectives will be generated.</span>
          <button type="button" className="border border-amber-500 rounded px-2 py-1" onClick={() => {if(onNavigateToMaterial)onNavigateToMaterial();}}>Upload additional material</button>
        </div>}
        {sessionClosed && (
          <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-700 shrink-0">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span><strong>CNE Closed:</strong> Questions are view-only after completion/finalization or cancellation.</span>
          </div>
        )}

        {isLocked && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-900 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Question Bank is Locked:</strong> Participants have already submitted post-test responses. Questions, options, and answer keys are permanently immutable to preserve evaluation integrity.
            </span>
          </div>
        )}

        {/* Question List Content - 2-Column Wide Grid on Desktop */}
        <div role="region" id="cne-my-questions-panel" aria-label="My Post-Test Questions"
          className="min-w-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/40 p-3 text-xs flex flex-col sm:p-4">
          {!isGenerating && !loading && !questionLoadError && <section aria-label="Add post-test questions" className="mx-auto mb-3 w-full max-w-[720px] space-y-1.5">
            <h4 className="text-center text-xs font-bold text-slate-900 sm:text-sm">Add Questions</h4>
            <div className="mx-auto grid w-full max-w-[684px] grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => void requestAiGeneration()} disabled={!canInteractWithQuestionTools || isAiGenerationUsed || isAiGenerationUnavailable || pendingGenerationJob}
                className="flex min-h-[54px] items-center gap-2 rounded-lg border border-purple-200 bg-purple-700 px-2.5 py-2 text-left text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[58px]">
                {isAiGenerationUsed?<Lock className="h-4 w-4 shrink-0"/>:<Sparkles className="h-4 w-4 shrink-0"/>}
                <span className="min-w-0"><strong className="block text-xs font-semibold">{isAiGenerationUsed?'AI Already Used':checkingMaterial?'Checking Material…':'Generate 5 MCQs with AI'}</strong><span className="mt-0.5 block text-[10px] leading-snug text-purple-100">{isAiGenerationUsed?'One-time generation completed':'Create drafts from indexed learning material'}</span></span>
              </button>
              <button type="button" onClick={openQuestionBank} disabled={!canInteractWithQuestionTools || !!importingBankId}
                className="flex min-h-[54px] items-center gap-2 rounded-lg border border-purple-200 bg-white px-2.5 py-2 text-left text-purple-800 shadow-sm hover:bg-purple-50 disabled:opacity-50 sm:min-h-[58px]">
                <BookOpen className="h-4 w-4 shrink-0"/><span className="min-w-0"><strong className="block text-xs font-semibold">Question Bank</strong><span className="mt-0.5 block text-[10px] leading-snug text-slate-600">Search and import as drafts</span></span>
              </button>
              <button type="button" onClick={handleAddManualQuestion} disabled={!canInteractWithQuestionTools || !!importingBankId}
                className="flex min-h-[54px] items-center gap-2 rounded-lg border border-purple-200 bg-white px-2.5 py-2 text-left text-purple-800 shadow-sm hover:bg-purple-50 disabled:opacity-50 sm:min-h-[58px]">
                <Edit3 className="h-5 w-5 shrink-0"/><span className="min-w-0"><strong className="block text-xs font-semibold">Manual Question</strong><span className="mt-0.5 block text-[10px] leading-snug text-slate-600">Write a question and rationale</span></span>
              </button>
            </div>
            {pendingGenerationJob && !isAiGenerationUsed && <button type="button" onClick={()=>{setFailureDialog(null);void handleGenerateAi(true);}} disabled={!canModify || isSaving} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">Resume interrupted AI generation{partialAiCount?` (${partialAiCount}/5 drafted)`:''}</button>}
          </section>}
          {/* Prominent Single-Stage Processing Status in Main Content Area */}
          {isGenerating ? (
            <div role="status" aria-live="polite" className="mx-auto my-auto max-w-lg w-full rounded-2xl border border-purple-200 bg-purple-50 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-purple-950">Generating 5 Topic-Specific Questions</h3>
                <span className="text-xs tabular-nums text-purple-700">{formatProcessingTime(generationStartedAt?(generationNow-generationStartedAt)/1000:0)}</span>
              </div>
              <ProcessingSteps labels={generationSteps} active={generationStep||1} running now={generationNow} details={generationProgress?.steps}/>
              <p className="text-[11px] text-slate-500">Stages reflect server updates; no estimated percentage. AI drafts require educator review.</p>
            </div>
          ) : loading ? (
            <div className="my-auto py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading questions...</span>
            </div>
          ) : questionLoadError ? (
            <div role="alert" className="my-auto py-12 text-center space-y-3 bg-white border border-rose-200 rounded-xl">
              <AlertTriangle className="w-9 h-9 mx-auto text-rose-600" />
              <h4 className="text-sm font-bold text-rose-900">Unable to Load Questions</h4>
              <p className="text-xs text-slate-600">{questionLoadError}</p>
              <button type="button" onClick={() => { void loadQuestions(); }} className="px-3 py-2 rounded-lg bg-purple-700 text-white text-xs font-bold">Retry Loading</button>
            </div>
          ) : activeQuestions.length === 0 && replacedQuestions.length === 0 ? (
            <div className="mx-auto w-full max-w-[560px] rounded-xl border border-dashed border-purple-200 bg-white px-4 py-5 text-center space-y-1.5">
              <HelpCircle className="mx-auto h-8 w-8 text-slate-300 sm:h-10 sm:w-10" />
              <h4 className="text-sm font-bold text-slate-800">No Questions Added Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Choose AI Generate, Question Bank, or Manual Question above to build this post-test.
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[840px] space-y-3">
              <div className="rounded-lg border border-purple-100 bg-white p-2.5 shadow-sm sm:p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileCheck2 className="h-4 w-4 text-purple-700"/> My Questions ({activeQuestions.length})</h4>
                  <span className="text-[11px] text-slate-500">{validFinalizedCount} finalized · {activeQuestions.length-validFinalizedCount} drafts</span>
                </div>
                <div className="mt-2 grid max-w-[720px] gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <label className="relative"><Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><span className="sr-only">Search my questions</span><input type="search" value={questionSearch} onChange={e=>setQuestionSearch(e.target.value)} placeholder="Search questions…" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs focus:border-purple-500 focus:outline-none"/></label>
                  <label><span className="sr-only">Filter question status</span><select value={questionFilter} onChange={e=>setQuestionFilter(e.target.value as typeof questionFilter)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs"><option value="all">All Statuses</option><option value="draft">Drafts</option><option value="finalized">Finalized</option></select></label>
                </div>
                {canModify && completeActiveCount>validFinalizedCount && !activeQuestions.some(q=>String(q.id||'').startsWith('q_ai_')&&!q.isFinalized) && <button type="button" onClick={handleFinalizeAll} disabled={isGenerating || isSaving} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-40"><CheckCheck className="h-4 w-4"/> Finalize all complete drafts</button>}
              </div>
              {activeQuestions.filter(q=>(questionFilter==='all'||(questionFilter==='finalized'?Boolean(q.isFinalized):!q.isFinalized))&&(!questionSearch.trim()||String(q.question||'').toLowerCase().includes(questionSearch.trim().toLowerCase()))).length===0 && <div role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-center text-xs text-slate-600">No questions match the current search or status filter.</div>}
              {/* Active Questions Container (1 Question per row across all screen sizes) */}
              <div className="grid w-full grid-cols-1 gap-2.5 items-start">
                {questions.map((q, idx) => {
                  if (q.status === 'INACTIVE' || q.status === 'REPLACED') return null;
                  if (questionFilter==='finalized' && !q.isFinalized || questionFilter==='draft' && q.isFinalized) return null;
                  if (questionSearch.trim() && !String(q.question||'').toLowerCase().includes(questionSearch.trim().toLowerCase())) return null;
                  const isEditing = editingIndex === idx;
                  const activeOrdinal = questions.slice(0, idx + 1).filter(isActiveQuestion).length;

                  return (
                    <div
                      key={q.id || idx}
                      id={`cne-posttest-question-${idx}`}
                      className={`p-3 rounded-lg border transition-all ${
                        q.isFinalized
                          ? 'border-purple-200 bg-white shadow-xs'
                          : 'border-amber-200 bg-amber-50/30 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                            {activeOrdinal}
                          </span>
                          {q.isFinalized ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Active in Post-Test
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Draft (Review Required)
                            </span>
                          )}

                          <span className="min-w-0 flex-1 basis-full break-words text-xs font-semibold text-slate-900 sm:basis-auto sm:text-sm">{q.question || 'Untitled question — complete draft'}</span>
                          {String(q.id || '').startsWith('q_bank_') && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <BookOpen className="w-2.5 h-2.5" /> Imported from Question Bank
                            </span>
                          )}
                          {q.authoritativeSource && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 max-w-[240px] truncate" title={`Source: ${q.authoritativeSource}`}>
                              <BookOpen className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                              <span className="truncate">{q.authoritativeSource}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <button type="button" aria-expanded={isEditing || expandedQuestionIds.has(String(q.id || idx))} aria-label={isEditing || expandedQuestionIds.has(String(q.id || idx))?'Hide question details':'View question details'}
                            onClick={()=>setExpandedQuestionIds(prev=>{const next=new Set(prev);const key=String(q.id||idx);next.has(key)?next.delete(key):next.add(key);return next;})}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:text-purple-700"><Eye className="h-4 w-4"/></button>
                        {canModify && (
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleFinalized(idx)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                                q.isFinalized
                                  ? 'text-slate-600 hover:bg-slate-100'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {q.isFinalized ? 'Revert to Draft' : 'Mark Finalized'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReplaceQuestion(idx)}
                              className="px-2 py-0.5 text-[11px] font-medium text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-md cursor-pointer"
                              title="Replace this question manually"
                            >
                              Replace
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-md cursor-pointer"
                              title="Edit Question"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                              title="Mark as Replaced"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        </div>
                      </div>

                      {(isEditing || expandedQuestionIds.has(String(q.id || idx))) && <div className="mt-2 border-t border-slate-100 pt-2">
                          {/* Compact one-row manual type selector + upload */}
                          {isEditing && canModify && String(q.id || '').startsWith('q_manual_') && (
                            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-2">
                              <span className="text-[11px] font-semibold text-slate-700">Question Type:</span>
                              {(['TEXT','IMAGE'] as const).map(type => (
                                <button key={type} type="button"
                                  aria-pressed={q.questionType === type}
                                  onClick={() => handleSelectManualQuestionType(idx,type)}
                                  disabled={!!uploadingImageId}
                                  className={`min-h-8 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${q.questionType===type ? 'border-indigo-600 bg-indigo-100 text-indigo-900 ring-1 ring-indigo-500' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{type}</button>
                              ))}
                              {q.questionType === 'IMAGE' && (
                                <div className="ml-auto flex flex-wrap items-center gap-2">
                                  <label className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-800 ${uploadingImageId?'opacity-50 pointer-events-none':''}`}>
                                    <ImageUp className="h-3.5 w-3.5" />
                                    {uploadingImageId===q.id?'Uploading…':q.imageFileId?'Replace Image':'Upload Image'}
                                    <span className="text-[10px] font-normal text-slate-500">Max 3 MB</span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!uploadingImageId}
                                      onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void handleUploadQuestionImage(idx,f);}} />
                                  </label>
                                  {q.imageFileId && <button type="button" className="text-[11px] font-semibold text-rose-700 underline" onClick={()=>handleUpdateQuestion(idx,{imageFileId:''})}>Remove</button>}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Question Text & Options */}
                      {isEditing && canModify ? (
                        <div className="max-w-[880px] space-y-2 mt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Question Stem:
                            </label>
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => handleUpdateQuestion(idx, { question: e.target.value })}
                              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          {q.questionType==='IMAGE' && q.imageFileId && <CNEQuestionImage cneId={cneId} questionId={persistedQuestionIdsRef.current.has(q.id)?q.id:undefined} imageFileId={q.imageFileId} localPreview={localImagePreviews[q.imageFileId]} compact />}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                              <div key={optKey} className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 w-4">{optKey}:</span>
                                <input
                                  type="text"
                                  value={q.options[optKey]}
                                  onChange={(e) => handleOptionChange(idx, optKey, e.target.value)}
                                  className="flex-1 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <label className="text-[11px] font-bold text-slate-700">Correct Option:</label>
                            <div className="flex gap-2">
                              {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                                <label key={optKey} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`correct_${idx}`}
                                    checked={q.correctOption === optKey}
                                    onChange={() => handleUpdateQuestion(idx, { correctOption: optKey })}
                                    className="text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="font-bold">{optKey}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                               Authoritative Clinical Source:
                            </label>
                            <input
                              type="text"
                              value={q.authoritativeSource || ''}
                              onChange={(e) => handleUpdateQuestion(idx, { authoritativeSource: e.target.value })}
                              placeholder="e.g. Learning Materials / Library"
                              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Clinical Explanation / Rationale:
                            </label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleUpdateQuestion(idx, { explanation: e.target.value })}
                              placeholder="Evidence-based reasoning shown to participants in review..."
                              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1 bg-purple-600 text-white rounded-md text-xs font-bold"
                            >
                              Done Editing
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-900 leading-relaxed mb-2.5">{q.question}</p>
                          {q.questionType==='IMAGE' && q.imageFileId && <CNEQuestionImage cneId={cneId} questionId={persistedQuestionIdsRef.current.has(q.id)?q.id:undefined} imageFileId={q.imageFileId} localPreview={localImagePreviews[q.imageFileId]} />}
                          

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                              const isCorrect = q.correctOption === optKey;
                              return (
                                <div
                                  key={optKey}
                                  className={`p-2 rounded-lg border flex items-start gap-2 ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                                      : 'bg-slate-50/80 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span className={`font-bold shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                                    {optKey}.
                                  </span>
                                  <span className="flex-1 leading-snug">{q.options[optKey]}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase shrink-0">
                                      ✓ Key
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">
                              <strong>Rationale:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                      </div>}
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Replaced Questions History */}
              {replacedQuestions.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-xl bg-slate-100/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-500" />
                      <span>Replaced Questions History ({replacedQuestions.length})</span>
                    </div>
                    {showHistory ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {showHistory && (
                    <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
                      {replacedQuestions.map((rq, rIdx) => (
                        <div
                          key={rq.id || rIdx}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 opacity-75"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              {rq.status || 'REPLACED'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{rq.id}</span>
                          </div>
                          <p className="text-xs line-through text-slate-500 mb-1">{rq.question}</p>
                          {rq.authoritativeSource && (
                            <p className="text-[10px] text-slate-400">Source: {rq.authoritativeSource}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
          </>
        )}

        {showAiSetup && !isGenerating && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="cne-ai-setup-heading" className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <h3 id="cne-ai-setup-heading" className="flex items-center gap-2 text-base font-bold text-slate-900"><Sparkles className="h-5 w-5 text-purple-700"/> AI Generate MCQs</h3>
                <button type="button" aria-label="Close AI setup" onClick={()=>setShowAiSetup(false)} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5"/></button>
              </header>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-xs">
                <section className="space-y-2 rounded-xl border border-slate-200 p-3" aria-label="AI learning material status">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">Learning material evidence</p>
                    <span className={`rounded-full px-2 py-1 font-semibold ${materialStatusCode==='READY'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-900'}`}>{checkingMaterial || materialStatusCode==='CHECKING'?'Checking…':materialStatusCode==='READY'?'Ready':materialStatusCode==='INDEXING'?'Review pending':materialStatusCode==='NEEDS_REVIEW'?'Source needs clarification':materialStatusCode.replace(/_/g,' ')}</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">{materialStatusMessage}</p>
                  <MaterialReviewFlags message={materialFlagMessage}/>
                  {materialWarningCount>0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                    <button type="button" aria-expanded={aiWarningExpanded} onClick={()=>setAiWarningExpanded(v=>!v)} className="flex w-full items-center justify-between gap-2 text-left font-semibold text-amber-900">
                      <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>{materialWarningCount} warning(s) · {materialExcludedCount} excluded passage(s)</span>
                      {aiWarningExpanded?<ChevronUp className="h-4 w-4 shrink-0"/>:<ChevronDown className="h-4 w-4 shrink-0"/>}
                    </button>
                    {aiWarningExpanded && <div className="mt-2"><MaterialIndexWarnings compact warningText={materialWarningText} warningCount={materialWarningCount} excludedCount={materialExcludedCount}/></div>}
                  </div>}
                </section>
                <section className="space-y-2" aria-label="Optional visual evidence">
                  <p className="font-semibold text-slate-900">Source images ({materialImages.length} available; select up to 3)</p>
                  <p className="text-slate-600">Optional: choose only images appropriate for educational use. No images are selected by default.</p>
                  {materialImages.length===0 ? <p className="rounded-lg bg-slate-50 p-3 text-slate-600">No extracted images available. Text-only generation is supported.</p> :
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{materialImages.map(img=><div key={img.imageFileId} className="min-w-0 rounded-lg border border-slate-200 p-2">
                      <label className="flex items-start gap-1.5">
                        <input type="checkbox" checked={chosenMaterialImageIds.includes(img.imageFileId)} disabled={!!pendingGenerationJob || (!chosenMaterialImageIds.includes(img.imageFileId)&&chosenMaterialImageIds.length>=3)} onChange={e=>setChosenMaterialImageIds(ids=>e.target.checked?[...ids,img.imageFileId]:ids.filter(id=>id!==img.imageFileId))}/>
                        <span className="break-words">{img.imageKind} · {img.sourcePage}</span>
                      </label>
                      {materialImagePreview[img.imageFileId] ? <img src={materialImagePreview[img.imageFileId]} alt="Selected source image preview" className="mt-2 max-h-32 w-full object-contain"/> :
                        <button type="button" disabled={visualLoading} onClick={()=>void previewMaterialImage(img.imageFileId)} className="mt-2 rounded border border-purple-300 px-2 py-1 text-purple-800">Preview</button>}
                    </div>)}</div>}
                </section>
              </div>
              <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
                <button type="button" onClick={()=>setShowAiSetup(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Cancel</button>
                <button type="button" disabled={checkingMaterial || materialStatusCode!=='READY' || isGenerating || !canModify} onClick={()=>{setShowAiSetup(false);void handleGenerateAi();}} className="rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Generate 5 Questions</button>
              </footer>
            </div>
          </div>
        )}

        {failureDialog && (
          <div ref={failureDialogRef} tabIndex={-1} className="fixed inset-0 z-[95] bg-slate-950/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cne-questions-failure-title">
            <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 id="cne-questions-failure-title" data-failure-heading tabIndex={-1} className="text-base font-bold text-slate-900">{failureDialog.title}</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{failureDialog.message}</p>
              <div className="flex gap-2 justify-end flex-wrap">
                {failureDialog.type === 'material' || failureDialog.type === 'validation' ? (
                  <button type="button" onClick={() => { setFailureDialog(null); if (onNavigateToMaterial) onNavigateToMaterial(); else error('Please open Material from the CNE Progress panel.'); }} className="px-3 py-2 rounded-lg border border-purple-400 text-purple-700 font-semibold text-xs">Upload Material</button>
                ) : null}
                {failureDialog.retrySafe && <button type="button" onClick={() => {
                  const materialOnly = failureDialog.retryAction === 'material-check';
                  setFailureDialog(null);
                  if (materialOnly) void loadMaterialStatus();
                  else void requestAiGeneration();
                }} className="px-3 py-2 rounded-lg bg-purple-700 text-white font-semibold text-xs">
                  {failureDialog.retryAction === 'material-check' ? 'Retry Material Check' : 'Retry AI Generation'}
                </button>}
                {pendingGenerationJob && !isGenerating && <button type="button" onClick={() => { setFailureDialog(null); void handleGenerateAi(true); }} className="px-3 py-2 rounded-lg bg-indigo-700 text-white font-semibold text-xs">Resume Generation</button>}
                {failureDialog.type === 'technical' && !failureDialog.retrySafe && <button type="button" onClick={() => { setFailureDialog(null); void loadQuestions(); void loadQuota(); }} className="px-3 py-2 rounded-lg bg-purple-700 text-white font-semibold text-xs">Recheck Saved Questions & Quota</button>}
                <button type="button" onClick={() => setFailureDialog(null)} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs">Close</button>
              </div>
            </div>
          </div>
        )}


        {/* Single compact footer row: progress + Save actions. Keep the five-question rule in the existing Save & Next disabled state. */}
        {activeView === 'questions' && <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5" title="Minimum five finalized questions required to activate the evaluation QR">
                <span className="text-sm font-extrabold tabular-nums text-purple-800">{validFinalizedCount}/5</span>
                <span className="text-[11px] font-semibold text-purple-800">Finalized</span>
                <div role="progressbar" aria-label="Minimum finalized post-test questions" aria-valuenow={Math.min(5,validFinalizedCount)} aria-valuemin={0} aria-valuemax={5} className="h-1.5 w-12 overflow-hidden rounded-full bg-purple-200">
                  <div className="h-full rounded-full bg-purple-700 transition-all" style={{width:`${Math.min(100,validFinalizedCount*20)}%`}} />
                </div>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">{activeQuestions.length - validFinalizedCount} Drafts</span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              {canModify && <button type="button" onClick={() => void performSaveQuestions(false)} disabled={isSaving || isGenerating || incompleteActiveCount > 0 || activeQuestions.length === 0}
                className="min-w-[96px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-40 sm:px-4">Save Drafts</button>}
              {canModify && <button type="button" onClick={() => void performSaveQuestions(true)}
                disabled={isSaving || isGenerating || validFinalizedCount < 5 || validFinalizedCount > 10 || incompleteActiveCount > 0}
                className="flex min-w-[112px] items-center justify-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                title="Save at least 5 valid finalized questions and open QR">
                {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/><span>Saving...</span></> : <><span>Save &amp; Next</span><ArrowRight className="h-3.5 w-3.5"/></>}
              </button>}
            </div>
          </div>
          {incompleteActiveCount > 0 && <p role="status" className="mt-1.5 text-[10px] text-amber-800">Complete {incompleteActiveCount} incomplete active question(s) before saving.</p>}
        </div>}

      </div>
    </div>
  );
};
