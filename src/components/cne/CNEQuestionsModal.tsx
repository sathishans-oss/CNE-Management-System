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
  FileWarning,
  CheckCheck,
  BookOpen,
  History,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { CNERecord, CNEQuestion, CNEAiQuotaInfo } from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';

interface CNEQuestionsModalProps {
  cne: CNERecord;
  isAuthorized: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onNavigateToQR?: () => void;
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
  onNavigateToQR
}) => {
  const cneId = cne.cneId || cne.classId || '';
  const [questions, setQuestions] = useState<CNEQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const generatingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
  const versionSequenceRef = useRef(0);

  // Real-time stage progress state for AI generation
  const [generationStage, setGenerationStage] = useState<{ title: string; subtitle: string } | null>(null);

  // Authoritative AI Quota & Material State
  const [quotaInfo, setQuotaInfo] = useState<CNEAiQuotaInfo | null>(null);
  const [hasMaterial, setHasMaterial] = useState<boolean | null>(null);

  const { success, error, warning } = useToast();

  useEffect(() => {
    // Reset all CNE-specific UI immediately so data from the previous CNE cannot flash or leak.
    questionsRequestRef.current += 1;
    quotaRequestRef.current += 1;
    generationRequestRef.current += 1;
    generatingRef.current = false;
    savingRef.current = false;
    setQuestions([]);
    setQuotaInfo(null);
    setHasMaterial(null);
    setIsLocked(false);
    setEditingIndex(null);
    setShowHistory(false);
    setGenerationStage(null);
    setIsGenerating(false);
    setIsSaving(false);
    persistedQuestionIdsRef.current = new Set();
    draftOriginSnapshotRef.current = new Map();

    const questionRequestId = ++questionsRequestRef.current;
    const quotaRequestId = ++quotaRequestRef.current;
    void loadQuestions(questionRequestId, cneId);
    void loadQuota(quotaRequestId, cneId);

    return () => {
      questionsRequestRef.current += 1;
      quotaRequestRef.current += 1;
      generationRequestRef.current += 1;
    };
  }, [cneId]);

  const loadQuestions = async (requestId = ++questionsRequestRef.current, targetCneId = cneId) => {
    setLoading(true);
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
        draftOriginSnapshotRef.current = new Map();
        setIsLocked(normalized.some((q) => Boolean(q.isLocked)));
      } else {
        setQuestions([]);
        persistedQuestionIdsRef.current = new Set();
        setIsLocked(false);
      }
    } catch (e: any) {
      if (requestId === questionsRequestRef.current && targetCneId === currentCneIdRef.current) {
        console.warn('Failed to load CNE questions:', e);
        setQuestions([]);
        persistedQuestionIdsRef.current = new Set();
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

  // Is the one-time initial AI generation already completed?
  const isAiGenerationUsed = Boolean(
    quotaInfo && (quotaInfo.status === 'USED' || quotaInfo.status === 'GENERATED' || quotaInfo.attemptsUsed >= 1)
  );
  const isAiGenerationUnavailable = Boolean(quotaInfo && !quotaInfo.canGenerate && !isAiGenerationUsed);

  const sessionClosed = isClosedCne(cne);
  const canModify = isAuthorized && !sessionClosed && !isLocked;

  const handleGenerateAi = async () => {
    if (generatingRef.current || isGenerating || !canModify) return;

    // One successful AI generation is allowed per CNE. Failed generation does not consume the allowance.
    if (isAiGenerationUsed) {
      error('AI question generation has already been completed for this CNE.');
      return;
    }

    const requestCneId = cneId;
    const requestId = ++generationRequestRef.current;
    const isCurrent = () => requestId === generationRequestRef.current && requestCneId === currentCneIdRef.current;

    generatingRef.current = true;
    setIsGenerating(true);
    setGenerationStage({
      title: 'Generating MCQs',
      subtitle: 'Analyzing the saved CNE learning material and creating 5 clinical MCQs…'
    });

    try {
      const res = await ApiService.generateCNEQuestions(requestCneId);
      if (!isCurrent()) return;

      if (res && res.success && res.data && Array.isArray(res.data) && res.data.length === 5) {
        const generated = res.data.map((q) => ({
          ...q,
          options: { ...q.options },
          status: normalizeQuestionStatus(q.status) as CNEQuestion['status']
        }));
        setQuestions(generated);
        persistedQuestionIdsRef.current = new Set(generated.map((q) => String(q.id || '')).filter(Boolean));
        draftOriginSnapshotRef.current = new Map();
        setHasMaterial(true);
        setGenerationStage({
          title: 'Questions Saved',
          subtitle: '5 clinical MCQs were generated and saved successfully.'
        });
        success('Successfully generated and saved 5 clinical MCQs. Review them, then use Save & Next to open QR.');
        await loadQuota(++quotaRequestRef.current, requestCneId);
        if (onUpdated) onUpdated();
      } else {
        const errMsg = res?.message || 'AI question generation failed. No AI generation allowance was consumed.';
        if (res?.errorCode === 'MATERIAL_REQUIRED' || res?.errorCode === 'NO_EXTRACTABLE_CONTENT' || res?.errorCode === 'INSUFFICIENT_TOPIC_MATERIAL') {
          setHasMaterial(false);
        }
        error(errMsg);
        await loadQuota(++quotaRequestRef.current, requestCneId);
      }
    } catch (e: any) {
      if (isCurrent()) error(e?.message || 'Error occurred during AI question generation.');
    } finally {
      if (isCurrent()) {
        generatingRef.current = false;
        setIsGenerating(false);
        setGenerationStage(null);
      }
    }
  };

  const handleFinalizeAll = () => {
    if (!canModify) return;
    const active = questions.filter(isActiveQuestion);
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
    if (!canModify) return;
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

  const performSaveQuestions = async () => {
    if (savingRef.current || isSaving || !canModify) return;

    // Purely blank unsaved drafts are UI scratch rows, not question history. Drop them before save.
    const payloadQuestions = questions.filter((q) => {
      const persisted = persistedQuestionIdsRef.current.has(String(q.id || ''));
      return persisted || !isBlankUnsavedQuestion(q);
    });
    const active = payloadQuestions.filter(isActiveQuestion);
    const validFinalized = active.filter((q) => q.isFinalized && isQuestionComplete(q));

    if (validFinalized.length < 5) {
      error(`At least 5 valid finalized questions are required before opening QR. Currently ready: ${validFinalized.length}/5.`);
      return;
    }

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
        draftOriginSnapshotRef.current = new Map();
        setQuestions(payloadQuestions);
        success(`Saved question set (${validFinalized.length} valid finalized questions). Opening QR.`);
        if (onUpdated) onUpdated();
        if (onNavigateToQR) onNavigateToQR();
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
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
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
                  Post-Test Question Bank
                </span>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    <Lock className="w-2.5 h-2.5" />
                    Locked (Submissions Received)
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      validFinalizedCount >= 5
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {validFinalizedCount} of {activeQuestions.length} Valid & Finalized (Min 5)
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 truncate max-w-2xl">
                {cne.topic}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving || isGenerating}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 disabled:opacity-40 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Missing Material Inline Alert */}
        {hasMaterial === false && canModify && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Learning Material Missing or Document Unreadable:</strong> Learning material is required before AI questions can be generated. Please upload CNE learning material or enter content in the Reference Material modal.
              </span>
            </div>
          </div>
        )}

        {/* AI & Manual Action Bar */}
        {canModify && (
          <div className="px-6 py-3 bg-purple-50/60 border-b border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-purple-950 font-bold">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>AI Question Synthesizer</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-900 border border-purple-300">
                  1 AI generation allowed per CNE
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isGenerating
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    : isAiGenerationUsed
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : isAiGenerationUnavailable
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : quotaInfo
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {isGenerating ? 'AI: Generating' : isAiGenerationUsed ? 'AI: Used' : isAiGenerationUnavailable ? 'AI: Unavailable' : quotaInfo ? 'AI: Available' : 'AI: Checking'}
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {isAiGenerationUsed
                  ? 'The single AI generation allowance has already been completed for this CNE. Use manual question tools to adjust questions.'
                  : 'Synthesize exactly 5 clinical MCQs grounded strictly in CNE learning material. Consumes this CNE’s single AI allowance.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeQuestions.length > 0 && validFinalizedCount < completeActiveCount && (
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
                onClick={() => handleGenerateAi()}
                disabled={isGenerating || generatingRef.current || isSaving || !canModify || isAiGenerationUsed || isAiGenerationUnavailable || hasMaterial === false}
                title={
                  isAiGenerationUsed
                    ? 'AI generation already completed for this CNE (Locked)'
                    : isAiGenerationUnavailable
                    ? 'AI generation is currently unavailable for this CNE'
                    : hasMaterial === false
                    ? 'Please enter or upload CNE Class Content first'
                    : 'AI Generate MCQs strictly from saved learning material and CNE Library resources'
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors ${
                  isAiGenerationUsed
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                    : hasMaterial === false
                    ? 'bg-purple-100 text-purple-400 cursor-not-allowed border border-purple-200'
                    : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer disabled:opacity-50'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating MCQs...</span>
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

              {/* Manual Question */}
              <button
                type="button"
                onClick={handleAddManualQuestion}
                disabled={isGenerating || isSaving || !canModify}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                title="Add a custom question manually (free, never consumes AI quota)"
              >
                <Plus className="w-3.5 h-3.5 text-purple-600" />
                <span>Manual Question</span>
              </button>
            </div>
          </div>
        )}

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
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 text-xs flex flex-col">
          {/* Prominent Single-Stage Processing Status in Main Content Area */}
          {isGenerating ? (
            <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  {generationStage?.title || 'Generating MCQs'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  {generationStage?.subtitle || 'Analyzing the learning content and CNE Library resources…'}
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="my-auto py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading questions...</span>
            </div>
          ) : activeQuestions.length === 0 && replacedQuestions.length === 0 ? (
            <div className="my-auto py-16 text-center p-8 bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 max-w-xl mx-auto">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No AI-generated MCQs yet</h4>
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

        {/* Footer: one action only — Save & Next opens QR after 5 valid finalized questions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {sessionClosed ? (
              <span className="text-slate-500 font-semibold">
                This CNE is closed. Question modification and QR activation are disabled.
              </span>
            ) : validFinalizedCount < 5 ? (
              <span className="text-rose-600 font-semibold">
                ⚠ Need 5 valid finalized questions before QR. Ready: {validFinalizedCount}/5
                {incompleteActiveCount > 0 ? ` • Incomplete active: ${incompleteActiveCount}` : ''}
              </span>
            ) : incompleteActiveCount > 0 ? (
              <span className="text-amber-600 font-semibold">
                ⚠ {incompleteActiveCount} incomplete active question(s) must be completed or removed before saving.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                ✓ Ready for QR: <strong>{validFinalizedCount}</strong> valid finalized question{validFinalizedCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {canModify && (
              <button
                type="button"
                onClick={performSaveQuestions}
                disabled={isSaving || isGenerating || validFinalizedCount < 5 || incompleteActiveCount > 0}
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
        </div>
      </div>
    </div>
  );
};
