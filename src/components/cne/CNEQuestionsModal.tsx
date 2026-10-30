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
  ArrowRight
} from 'lucide-react';
import { CNERecord, CNEQuestion, CNEAiQuotaInfo, CNEReferenceBankItem, CNEClinicalBankSearchInfo } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';

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
    String(q.authoritativeSource || '').trim().length >= 3
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
    !String(q.authoritativeSource || '').trim();
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
  const cneId = cne.cneId || cne.classId || '';
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
  const [bankMatches, setBankMatches] = useState<CNEReferenceBankItem[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearched, setBankSearched] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankClinicalSearch, setBankClinicalSearch] = useState<CNEClinicalBankSearchInfo | null>(null);
  const [bankSearchOverride, setBankSearchOverride] = useState('');
  const [editingBankConcept, setEditingBankConcept] = useState(false);
  const [importingBankId, setImportingBankId] = useState<string | null>(null);
  const bankRequestRef = useRef(0);
  const [partialAiCount, setPartialAiCount] = useState(0);

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
  const [generationStage, setGenerationStage] = useState<{ title: string; subtitle: string } | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [materialChoice, setMaterialChoice] = useState<'confirm' | 'missing' | null>(null);
  const [checkingMaterial, setCheckingMaterial] = useState(false);
  const materialRequestRef = useRef(0);
  const materialCheckRef = useRef(false);
  const initialMaterialPresenceRef = useRef<boolean | null>(null);
  const [failureDialog, setFailureDialog] = useState<{
    title: string; message: string; type: 'material' | 'validation' | 'technical'; retrySafe: boolean; retryAction?: 'material-check' | 'generation';
  } | null>(null);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationSteps = [
    'Verifying CNE and permissions',
    'Reading uploaded material / searching library',
    'Checking topic-relevant evidence',
    'Generating five clinical MCQs',
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
    initialMaterialPresenceRef.current = null;
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
    setGenerationStage(null);
    setGenerationStep(0);
    setMaterialChoice(null);
    setCheckingMaterial(false);
    setGenerationElapsedSeconds(0);
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
    // Lightweight presence check once when the AI page opens (no evidence extraction).
    // The Generate action uses this result; a failed check is retryable.
    void loadMaterialStatus(++materialRequestRef.current, cneId);
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
    status: normalizeQuestionStatus(q.status), isFinalized: Boolean(q.isFinalized)
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
  // The backend remains authoritative for permission, evidence and library consent.
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
      initialMaterialPresenceRef.current = Boolean(status.data.hasOwnMaterial);
      return initialMaterialPresenceRef.current;
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
    // Search only on first entry, or after a failure; the user can also refresh manually.
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
      else {setBankMatches(res.data || []);setBankClinicalSearch(res.clinicalSearch || null);setBankSearched(true);setEditingBankConcept(false);}
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
    // Reuse the lightweight initial presence check; retry only if it failed.
    // The backend revalidates permissions, sources and library consent during generation.
    setFailureDialog(null);
    // Question Bank discovery is a separate user-selected view, not part of AI startup.
    const own = initialMaterialPresenceRef.current !== null
      ? initialMaterialPresenceRef.current
      : await loadMaterialStatus(++materialRequestRef.current, cneId);
    if (own === null || currentCneIdRef.current !== cneId) return;
    if (!own) { setMaterialChoice('confirm'); return; }
    await handleGenerateAi(false);
  };

  const handleGenerateAi = async (allowLibraryOnly = false, resumePlanned = false) => {
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
    setMaterialChoice(null);
    setIsGenerating(true);
    setGenerationStep(1);
    const startedAt = Date.now();
    setGenerationElapsedSeconds(0);
    stopProgressPolling();
    // Every stage comes from the authorized backend progress endpoint, never a fake timer.
    progressPollRef.current = setInterval(() => {
      if (isCurrent()) setGenerationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      void ApiService.getCNEAiGenerationProgress(requestCneId).then((progress) => {
        if (isCurrent() && progress.success && progress.data && progress.data.stage >= 1 && progress.data.stage <= 7 &&
            Number(progress.data.updatedAt || 0) >= startedAt) {
          setGenerationStep((prev) => Math.max(prev, progress.data!.stage));
          setGenerationStage({title: generationSteps[progress.data.stage - 1], subtitle: progress.data.message});
        }
      }).catch(() => { /* polling is advisory; server execution is authoritative */ });
    }, 2200);
    setGenerationStage({
      title: 'Generating MCQs',
      subtitle: 'Analyzing the saved CNE learning material and creating 5 clinical MCQs…'
    });

    try {
      let res;
      if (!resumePlanned) {
        const planned = await ApiService.planCNEAiGeneration(requestCneId, allowLibraryOnly);
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
        setGenerationStage({title:partial?'Partial AI Questions Saved':'Questions Saved',subtitle:partial?'Verified Drafts saved; upload more CNE material and resume only missing objectives.':'Five Draft questions saved for educator review.'});
        success(partial ? `Saved ${res.data.length} verified AI Draft question(s). Quota not deducted; resume missing objectives.` : 'Five AI Draft questions saved. Review before finalizing.');
        await loadQuota(++quotaRequestRef.current,requestCneId);
        if(onUpdated)onUpdated();
      } else {
        const code = res?.errorCode || 'UNKNOWN_GENERATION_FAILURE';
        const msg = res?.message || 'AI question generation could not be completed.';
        const missing = ['NO_RELEVANT_LIBRARY_CONTENT', 'INSUFFICIENT_TOPIC_MATERIAL', 'NO_EXTRACTABLE_CONTENT'].includes(code);
        const validationCodes = [
          'OFF_TOPIC_QUESTION', 'UNSUPPORTED_SOURCE_EVIDENCE', 'DUPLICATE_QUESTION',
          'INVALID_QUESTION_TEXT', 'INSUFFICIENT_QUESTIONS', 'INVALID_CORRECT_OPTION',
          'MISSING_SOURCE', 'UNVERIFIED_SOURCE', 'INFORMAL_SOURCE_PROHIBITED',
          'MISSING_EXPLANATION', 'AI_BLUEPRINT_FAILED', 'BLUEPRINT_MISMATCH',
          'MISSING_OPTIONS', 'DUPLICATE_OPTIONS'
        ];
        const validationFailure = validationCodes.includes(code);
        if (code === 'LIBRARY_CONSENT_REQUIRED') {
          setMaterialChoice('confirm');
        } else if (missing) {
          setFailureDialog({title: 'Learning Material Required', message: msg, type: 'material', retrySafe: false});
        } else if (validationFailure) {
          // Keep the exact server diagnostic; avoid duplicating the 'no questions saved' text.
          // Only suggest more material for insufficient evidence, not formatting failures.
          const materialAdvice = code === 'UNSUPPORTED_SOURCE_EVIDENCE'
            ? 'If the source passage is insufficient, you may upload additional relevant material.'
            : 'The library does not need reindexing solely because a generated answer failed formatting or quality validation.';
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
        if (missing || code === 'LIBRARY_CONSENT_REQUIRED' || validationFailure) {
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
        setGenerationStage(null);
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
      status: 'ACTIVE',
      isFinalized: false
    };
    setQuestions((prev) => [...prev, newQ]);
    setEditingIndex(questions.length);
  };

  const handleReplaceQuestion = (idx: number) => {
    if (!canModify) return;
    const targetQ = questions[idx];
    if (!targetQ || !isActiveQuestion(targetQ)) return;

    const replacementId = nextVersionId(targetQ.id);
    const replacementQ: CNEQuestion = {
      id: replacementId,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctOption: 'A',
      explanation: '',
      authoritativeSource: targetQ.authoritativeSource || '',
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

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-[94vw] max-w-[1440px] max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                  Post-Test Questions
                </span>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    <Lock className="w-2.5 h-2.5" />
                    Locked (Submissions Received)
                  </span>
                ) : null}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    validFinalizedCount >= 5
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {validFinalizedCount} of {activeQuestions.length} Valid & Finalized (Min 5)
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 truncate max-w-2xl">
                {cne.topic}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving || isGenerating || !!importingBankId}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 disabled:opacity-40 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permanent full-width tabs; Question Bank never shares body space with My Questions. */}
        <div role="tablist" aria-label="Post-Test question views" className="px-6 pt-2 bg-white border-b border-slate-200 flex gap-2 shrink-0">
          <button type="button" role="tab" id="cne-my-questions-tab" aria-controls="cne-my-questions-panel"
            aria-selected={activeView === 'questions'}
            onClick={() => setActiveView('questions')}
            onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); openQuestionBank(); } }}
            disabled={isGenerating || isSaving || !!importingBankId}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors disabled:opacity-50 ${activeView === 'questions' ? 'border-purple-700 bg-purple-50 text-purple-800' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
            My Questions ({activeQuestions.length})
          </button>
          <button type="button" role="tab" id="cne-question-bank-tab" aria-controls="cne-question-bank-panel"
            aria-selected={activeView === 'bank'}
            onClick={openQuestionBank}
            onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); setActiveView('questions'); } }}
            disabled={!canModify || !isPageReady || isGenerating || isSaving || !!importingBankId}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors disabled:opacity-50 ${activeView === 'bank' ? 'border-indigo-700 bg-indigo-50 text-indigo-900' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
            <BookOpen className="w-3.5 h-3.5"/> Question Bank {bankSearched ? `(${bankMatches.length})` : ''}
          </button>
        </div>

        {/* My Questions-only AI and finalization actions. */}
        {canModify && activeView === 'questions' && (
          <div className="px-6 py-3 bg-purple-50/60 border-b border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-purple-950 font-bold">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>AI Question Synthesizer</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeQuestions.length > 0 && validFinalizedCount < completeActiveCount && !activeQuestions.some((q) => String(q.id || '').startsWith('q_ai_') && !q.isFinalized) && (
                <button
                  type="button"
                  onClick={handleFinalizeAll}
                  disabled={isGenerating || isSaving || !canModify}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  title="Include all draft questions in post-test"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Finalize All ({completeActiveCount - validFinalizedCount} Drafts)</span>
                </button>
              )}

              {/* AI Generate MCQs */}
              <button
                type="button"
                onClick={() => { void requestAiGeneration(); }}
                disabled={
                  !isPageReady ||
                  isGenerating ||
                  checkingMaterial ||
                  materialCheckRef.current ||
                  generatingRef.current ||
                  isSaving ||
                  !canModify ||
                  isAiGenerationUsed ||
                  isAiGenerationUnavailable ||
                  pendingGenerationJob
                }
                title={
                  !isPageReady
                    ? 'Please wait while the question page finishes loading'
                    : isAiGenerationUsed
                    ? 'AI generation already completed for this CNE (Locked)'
                    : isAiGenerationUnavailable
                    ? 'AI generation is currently unavailable for this CNE'

                    : 'AI Generate MCQs strictly from saved learning material and CNE Library resources'
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors ${
                  isAiGenerationUsed
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'

                    : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isGenerating || checkingMaterial ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{checkingMaterial ? 'Checking material...' : 'Generating MCQs...'}</span>
                  </>
                ) : isAiGenerationUsed ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>AI Generate MCQs (Used)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Generate MCQs</span>
                  </>
                )}
              </button>

              {pendingGenerationJob && !isAiGenerationUsed && (
                <button
                  type="button"
                  onClick={() => { setFailureDialog(null); void handleGenerateAi(false, true); }}
                  disabled={!isPageReady || !canModify || isGenerating || generatingRef.current || isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Resume AI Generation
                </button>
              )}


            </div>
          </div>
        )}

        {activeView === 'bank' ? (
          <div role="tabpanel" id="cne-question-bank-panel" aria-labelledby="cne-question-bank-tab"
            className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 bg-indigo-50/40 text-xs space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-bold text-indigo-950">Institutional Question Bank</h4>
                <p className="text-slate-600 mt-1">Review the question, correct answer and rationale before importing as a Draft.</p>
              </div>
              <button type="button" onClick={() => void searchBank()} disabled={bankLoading || !!importingBankId || !canModify}
                className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-white font-bold text-indigo-800 disabled:opacity-50">
                {bankLoading ? 'Searching…' : 'Refresh Results'}
              </button>
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
            {bankError && <div role="alert" className="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{bankError} Use Refresh Results to try again.</div>}
            {!bankLoading && !bankError && bankSearched && !bankMatches.length && <div role="status" className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
              <div className="font-bold text-slate-800">{bankClinicalSearch?.requiresClarification ? 'Clarify the clinical topic to search' : 'No clinically relevant Question Bank questions found'}</div>
              <p className="text-slate-600">{bankClinicalSearch?.requiresClarification ? 'Use Edit concept to enter a specific disease, procedure, nursing practice or an expanded abbreviation.' : 'No indexed textbook MCQs matched the clinical concept. Unrelated care/patient questions have been excluded. You can use AI Question Generation or Add Manual Question under My Questions.'}</p>
            </div>}
            {bankMatches.map(q => {
              const sourceId = 'q_bank_' + q.questionId.replace(/[^a-zA-Z0-9_-]/g, '_');
              const alreadyImported = questions.some(item => item.id === sourceId || String(item.id || '').startsWith(sourceId + '__v'));
              return <div key={q.questionId} className="border border-indigo-100 bg-white rounded-xl p-4 space-y-3 shadow-xs">
                <div className="font-semibold text-slate-900 text-sm">{q.question}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{(['A','B','C','D'] as const).map(key => <div key={key}>{key}. {q.options[key]}</div>)}</div>
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
                {!q.canImport && <span className="ml-2 text-amber-700">Not available for import. Contact the Question Bank administrator for review.</span>}
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
        <div role="tabpanel" id="cne-my-questions-panel" aria-labelledby="cne-my-questions-tab"
          className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 bg-slate-50/40 text-xs flex flex-col">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4 shrink-0">
            <div>
              <h4 className="text-sm font-bold text-slate-900">My Questions ({activeQuestions.length})</h4>
              <p className="text-slate-500 mt-1">Review, edit and finalize AI, Question Bank and manual Drafts.</p>
            </div>
            {canModify && <button type="button" onClick={handleAddManualQuestion}
              disabled={!canInteractWithQuestionTools || !!importingBankId}
              title="Add a manual Draft; this does not consume AI quota"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-300 bg-white text-purple-800 font-bold hover:bg-purple-50 disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> Add Manual Question
            </button>}
          </div>
          {/* Prominent Single-Stage Processing Status in Main Content Area */}
          {isGenerating ? (
            <div role="status" aria-live="polite" className="mx-auto my-auto max-w-lg w-full rounded-2xl border border-purple-200 bg-purple-50 p-5 space-y-4">
              <div className="flex items-center gap-3"><Loader2 className="w-6 h-6 animate-spin text-purple-700" />
                <div><h3 className="text-sm font-bold text-purple-950">Generating 5 Topic-Specific Questions</h3>
                  <p className="text-xs text-purple-700">{generationStage?.subtitle || 'The server is processing your CNE topic. This may take some time.'}</p>
                </div>
              </div>
              <ol className="space-y-2">{generationSteps.map((name, index) => (
                <li key={name} className={`flex items-start gap-2 text-xs ${generationStep > index + 1 ? 'text-emerald-700' : generationStep === index + 1 ? 'font-semibold text-purple-950' : 'text-slate-500'}`}>
                  {generationStep > index + 1 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : generationStep === index + 1 ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <span className="w-4 h-4 shrink-0 text-center">○</span>}
                  {name}
                </li>
              ))}</ol>
              <p className="text-xs text-slate-500">Elapsed: {generationElapsedSeconds}s. Stages reflect server updates; no estimated percentage.</p>
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
            <div className="my-auto py-16 text-center p-8 bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 max-w-xl mx-auto">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Questions Created Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                AI analyzes the learning material along with relevant CNE Library resources to generate meaningful, content-based MCQs for review.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Questions Container (1 Question per row across all screen sizes) */}
              <div className="grid grid-cols-1 gap-4 items-start">
                {questions.map((q, idx) => {
                  if (q.status === 'INACTIVE' || q.status === 'REPLACED') return null;
                  const isEditing = editingIndex === idx;
                  const activeOrdinal = questions.slice(0, idx + 1).filter(isActiveQuestion).length;

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        q.isFinalized
                          ? 'border-purple-200 bg-white shadow-xs'
                          : 'border-amber-200 bg-amber-50/30 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
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

                        {canModify && (
                          <div className="flex items-center gap-1">
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

                      {/* Question Text & Options */}
                      {isEditing && canModify ? (
                        <div className="space-y-3 mt-3">
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
                          <p className="font-semibold text-slate-900 leading-relaxed mb-2.5">
                            {q.question}
                          </p>

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

        {failureDialog && (
          <div className="fixed inset-0 z-[95] bg-slate-950/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={failureDialog.title}>
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">{failureDialog.title}</h3>
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
                {pendingGenerationJob && !isGenerating && <button type="button" onClick={() => { setFailureDialog(null); void handleGenerateAi(false, true); }} className="px-3 py-2 rounded-lg bg-indigo-700 text-white font-semibold text-xs">Resume Generation</button>}
                {failureDialog.type === 'technical' && !failureDialog.retrySafe && <button type="button" onClick={() => { setFailureDialog(null); void loadQuestions(); void loadQuota(); }} className="px-3 py-2 rounded-lg bg-purple-700 text-white font-semibold text-xs">Refresh Questions & Quota</button>}
                <button type="button" onClick={() => setFailureDialog(null)} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs">Close</button>
              </div>
            </div>
          </div>
        )}

        {materialChoice && (
          <div className="fixed inset-0 z-[90] bg-slate-950/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={materialChoice === 'confirm' ? 'No CNE material uploaded' : 'No relevant learning material found'}>
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">{materialChoice === 'confirm' ? 'CNE Learning Material Not Uploaded' : 'No Relevant Learning Material Found'}</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {materialChoice === 'confirm'
                  ? 'No learning material is uploaded for this CNE. AI can search the CNE Reference Library for relevant content, but this may take additional time. Questions will be generated only if suitable topic evidence is available. Would you like to proceed?'
                  : 'No sufficiently relevant learning material was found for this CNE topic. Question generation has stopped. No questions were saved and your successful-generation allowance remains available. Please upload the correct topic material.'}
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                {materialChoice === 'confirm' && <button type="button" onClick={() => { void handleGenerateAi(true); }} className="px-3 py-2 rounded-lg bg-purple-700 text-white font-semibold text-xs">Proceed to Questions</button>}
                <button type="button" onClick={() => { setMaterialChoice(null); if (onNavigateToMaterial) onNavigateToMaterial(); else error('Please open Material from the CNE Progress panel.'); }} className="px-3 py-2 rounded-lg border border-purple-400 text-purple-700 font-semibold text-xs">Upload Material</button>
                <button type="button" onClick={() => setMaterialChoice(null)} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Save/finalization belong only to My Questions, never the Question Bank view. */}
        {activeView === 'questions' && <div className="px-3 sm:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {canModify && <button type="button" onClick={() => void performSaveQuestions(false)} disabled={isSaving||isGenerating||incompleteActiveCount>0||activeQuestions.length===0}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-bold text-xs disabled:opacity-40">Save Drafts</button>}
            {canModify && (
              <button
                type="button"
                onClick={() => void performSaveQuestions(true)}
                disabled={isSaving || isGenerating || validFinalizedCount < 5 || validFinalizedCount > 10 || incompleteActiveCount > 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Save the valid question set and open QR"
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
            )}
          </div>
        </div>}
      </div>
    </div>
  );
};
