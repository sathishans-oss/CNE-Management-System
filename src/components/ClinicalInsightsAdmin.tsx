import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  Edit2,
  ShieldCheck,
  FileText,
  Ban,
  Eye
} from 'lucide-react';
import { ClinicalInsight } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';

export const ClinicalInsightsAdmin: React.FC = () => {
  const [insights, setInsights] = useState<ClinicalInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'>('ALL');

  // Review modal state
  const [reviewingInsight, setReviewingInsight] = useState<ClinicalInsight | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | 'WITHDRAWN' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Edit / Create draft modal
  const [editingInsight, setEditingInsight] = useState<Partial<ClinicalInsight> | null>(null);
  const [editPointsText, setEditPointsText] = useState('');
  const [saveSubmitting, setSaveSubmitting] = useState(false);

  // AI Generator / Source search modal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [searchingSources, setSearchingSources] = useState(false);
  const [sourceResults, setSourceResults] = useState<
    Array<{ indexId: string; title: string; topic: string; section: string; preview: string }>
  >([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<{
    title: string;
    section: string;
    passage: string;
  } | null>(null);
  const [generatorTopic, setGeneratorTopic] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // View Source Passage Modal
  const [viewingSourceDetail, setViewingSourceDetail] = useState<{
    title: string;
    section: string;
    passage: string;
  } | null>(null);
  const [viewingSourceLoading, setViewingSourceLoading] = useState(false);

  const { success, error } = useToast();

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getClinicalInsightsAdmin();
      if (res.success && res.data) {
        setInsights(res.data.insights || []);
      } else {
        error(res.message || 'Failed to load clinical insights.');
      }
    } catch (e: any) {
      error(e?.message || 'Error loading clinical insights.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  // Source Search
  const handleSearchSources = async () => {
    if (!sourceSearch.trim()) return;
    setSearchingSources(true);
    try {
      const res = await ApiService.getClinicalInsightSources(sourceSearch.trim());
      if (res.success && res.data) {
        setSourceResults(res.data.sources || []);
      } else {
        setSourceResults([]);
        error(res.message || 'No reference library sources found.');
      }
    } catch (e: any) {
      error(e?.message || 'Failed to search reference sources.');
    } finally {
      setSearchingSources(false);
    }
  };

  const handleSelectSource = async (indexId: string) => {
    setSelectedSourceId(indexId);
    setSelectedSourceDetail(null);
    try {
      const res = await ApiService.getClinicalInsightSourceDetail(indexId);
      if (res.success && res.data) {
        setSelectedSourceDetail(res.data);
        if (!generatorTopic && res.data.title) {
          setGeneratorTopic(res.data.title);
        }
      }
    } catch {
      // Ignored
    }
  };

  const handleViewSourcePassage = async (sourceIndexId: string) => {
    if (!sourceIndexId) return;
    setViewingSourceLoading(true);
    try {
      const res = await ApiService.getClinicalInsightSourceDetail(sourceIndexId);
      if (res.success && res.data) {
        setViewingSourceDetail(res.data);
      } else {
        error(res.message || 'Could not load original source passage.');
      }
    } catch (e: any) {
      error(e?.message || 'Failed to load original source passage.');
    } finally {
      setViewingSourceLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedSourceId || !generatorTopic.trim()) {
      error('Please select a reference source and specify a clinical topic.');
      return;
    }
    setGeneratingDraft(true);
    try {
      const res = await ApiService.generateClinicalInsightDraft(generatorTopic.trim(), selectedSourceId);
      if (res.success) {
        success('Clinical insight draft generated successfully.', 'Draft Created');
        setIsGeneratorOpen(false);
        setSelectedSourceId('');
        setSelectedSourceDetail(null);
        setGeneratorTopic('');
        await loadInsights();
      } else {
        error(res.message || 'Draft generation failed.');
      }
    } catch (e: any) {
      error(e?.message || 'Failed to generate clinical insight draft.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Save / Edit Insight
  const handleOpenEdit = (insight: ClinicalInsight) => {
    setEditingInsight({ ...insight });
    setEditPointsText((insight.points || []).join('\n'));
  };

  const handleOpenCreateNew = () => {
    setEditingInsight({
      topic: '',
      title: '',
      summary: '',
      points: [],
      nursingRelevance: '',
      referenceTitle: '',
      referenceSection: '',
      status: 'DRAFT'
    });
    setEditPointsText('');
  };

  const handleSaveInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsight?.title || !editingInsight?.topic) {
      error('Topic and Title are required.');
      return;
    }
    setSaveSubmitting(true);
    try {
      const points = editPointsText
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      const payload: Partial<ClinicalInsight> = {
        ...editingInsight,
        points
      };

      const res = await ApiService.saveClinicalInsightDraft(payload);
      if (res.success) {
        success('Clinical insight draft saved.', 'Saved');
        setEditingInsight(null);
        await loadInsights();
      } else {
        error(res.message || 'Failed to save insight draft.');
      }
    } catch (e: any) {
      error(e?.message || 'Error saving insight draft.');
    } finally {
      setSaveSubmitting(false);
    }
  };

  // Review (Approve / Reject / Withdraw)
  const handleConfirmReview = async () => {
    if (!reviewingInsight || !reviewAction) return;
    if (reviewAction === 'APPROVED' && !reviewConfirmed) {
      error('Please confirm you have reviewed the complete clinical content.');
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await ApiService.reviewClinicalInsight(
        reviewingInsight.insightId,
        reviewAction,
        reviewNotes.trim()
      );
      if (res.success) {
        success(`Clinical insight marked as ${reviewAction}.`, 'Status Updated');
        setReviewingInsight(null);
        setReviewAction(null);
        setReviewNotes('');
        setReviewConfirmed(false);
        await loadInsights();
      } else {
        error(res.message || 'Failed to submit review.');
      }
    } catch (e: any) {
      error(e?.message || 'Error submitting review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const filteredInsights = insights.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    if (!matchesStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.topic?.toLowerCase().includes(q) ||
      item.summary?.toLowerCase().includes(q) ||
      item.referenceTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Clinical Insights Management</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-teal-100 text-teal-800">
              Evidence-Based Learning
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ground daily clinical takeaways in the Open RN Nursing Reference Library. Only approved insights appear in the staff Quiz portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadInsights}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGeneratorOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Draft from Library</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Manual Draft</span>
          </button>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search insights by title, topic, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-teal-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold w-full sm:w-auto">
          {(['ALL', 'APPROVED', 'DRAFT', 'REJECTED', 'WITHDRAWN'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === st ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Insights List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-medium text-slate-500">Loading clinical insights...</p>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Clinical Insights Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'No clinical insights match your search filters.'
              : 'Generate an insight draft from the Open RN library or write one manually.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInsights.map((insight) => {
            const isApproved = insight.status === 'APPROVED';
            const isDraft = insight.status === 'DRAFT';
            const isRejected = insight.status === 'REJECTED';

            return (
              <div
                key={insight.insightId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {insight.topic || 'General Practice'}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isDraft
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {insight.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{insight.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {insight.sourceIndexId && (
                      <button
                        type="button"
                        onClick={() => void handleViewSourcePassage(insight.sourceIndexId)}
                        disabled={viewingSourceLoading}
                        className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-50 border border-purple-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        title="View original source passage"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View original source passage</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(insight)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      title="Edit draft content"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingInsight(insight);
                          setReviewAction('APPROVED');
                          setReviewNotes('');
                          setReviewConfirmed(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer border border-emerald-200"
                        title="Approve for daily rotation"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve for daily rotation</span>
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingInsight(insight);
                          setReviewAction('REJECTED');
                          setReviewNotes('');
                          setReviewConfirmed(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer border border-rose-200"
                        title="Reject draft"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {isApproved && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingInsight(insight);
                          setReviewAction('WITHDRAWN');
                          setReviewNotes('');
                          setReviewConfirmed(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200"
                        title="Withdraw published insight"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Withdraw published insight</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{insight.summary}</p>

                {Array.isArray(insight.points) && insight.points.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Key Points:</p>
                    <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                      {insight.points.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {insight.nursingRelevance && (
                  <div className="bg-teal-50/70 rounded-xl p-3 border border-teal-100">
                    <p className="text-[11px] font-bold text-teal-900 uppercase tracking-wide mb-1">
                      Nursing Practice Relevance:
                    </p>
                    <p className="text-xs text-teal-800 leading-relaxed">{insight.nursingRelevance}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong>Reference:</strong> {insight.referenceTitle || 'Nursing Reference Library'}
                      {insight.referenceSection ? ` • ${insight.referenceSection}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {insight.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(insight.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                    {insight.reviewedBy && (
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        Reviewer: {insight.reviewedBy}
                      </span>
                    )}
                  </div>
                </div>

                {insight.reviewNotes && (
                  <div className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                    Reviewer Notes: {insight.reviewNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal (Approve / Reject / Withdraw) */}
      {reviewingInsight && reviewAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  reviewAction === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : reviewAction === 'REJECTED'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {reviewAction === 'APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : reviewAction === 'REJECTED' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Ban className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {reviewAction === 'APPROVED'
                    ? 'Approve for daily rotation'
                    : reviewAction === 'REJECTED'
                    ? 'Reject Clinical Insight'
                    : 'Withdraw published insight'}
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{reviewingInsight.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {reviewAction === 'APPROVED'
                ? 'Approving this insight will make it eligible for publication as the Daily Clinical Insight on the staff Quiz page.'
                : reviewAction === 'REJECTED'
                ? 'Rejecting this draft moves it to rejected status with your review notes.'
                : 'Withdrawing this insight removes it from active display on the staff Quiz page.'}
            </p>

            {reviewAction === 'APPROVED' && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                />
                <span>I have reviewed the complete clinical content</span>
              </label>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Review Notes / Clinical Rationale
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter feedback, verification remarks, or instructions..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setReviewingInsight(null);
                  setReviewAction(null);
                  setReviewNotes('');
                  setReviewConfirmed(false);
                }}
                disabled={reviewSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={reviewSubmitting || (reviewAction === 'APPROVED' && !reviewConfirmed)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer disabled:opacity-50 ${
                  reviewAction === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : reviewAction === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {reviewSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : reviewAction === 'APPROVED' ? (
                  <span>Approve for daily rotation</span>
                ) : reviewAction === 'REJECTED' ? (
                  <span>Confirm Rejection</span>
                ) : (
                  <span>Withdraw published insight</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Source Passage Modal */}
      {viewingSourceDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-bold text-slate-900">Original Reference Passage</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSourceDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                <p className="font-bold text-slate-900">{viewingSourceDetail.title}</p>
                <p className="text-slate-600 text-[11px]">{viewingSourceDetail.section}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 max-h-64 overflow-y-auto font-serif text-slate-800 leading-relaxed text-xs">
                {viewingSourceDetail.passage}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingSourceDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Manual Draft Modal */}
      {editingInsight && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingInsight.insightId ? 'Edit Clinical Insight Draft' : 'Create Clinical Insight Draft'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInsight(null)}
                disabled={saveSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInsight} className="space-y-3.5 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Clinical Topic *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sepsis Management, IV Therapy"
                    value={editingInsight.topic || ''}
                    onChange={(e) => setEditingInsight({ ...editingInsight, topic: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Insight Headline / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hour-1 Bundle for Septic Shock"
                    value={editingInsight.title || ''}
                    onChange={(e) => setEditingInsight({ ...editingInsight, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Clinical Summary *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Concise overview of the evidence-based recommendation..."
                  value={editingInsight.summary || ''}
                  onChange={(e) => setEditingInsight({ ...editingInsight, summary: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Key Takeaway Points (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Measure lactate level within 1 hour&#10;Obtain blood cultures prior to antibiotics&#10;Administer broad-spectrum antibiotics"
                  value={editPointsText}
                  onChange={(e) => setEditPointsText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nursing Practice Relevance
                </label>
                <textarea
                  rows={2}
                  placeholder="Practical bedside action for staff nurses..."
                  value={editingInsight.nursingRelevance || ''}
                  onChange={(e) => setEditingInsight({ ...editingInsight, nursingRelevance: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Reference Book / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Open RN Nursing Pharmacology"
                    value={editingInsight.referenceTitle || ''}
                    onChange={(e) => setEditingInsight({ ...editingInsight, referenceTitle: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Reference Section / Chapter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chapter 3: Antimicrobial Therapy"
                    value={editingInsight.referenceSection || ''}
                    onChange={(e) => setEditingInsight({ ...editingInsight, referenceSection: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInsight(null)}
                  disabled={saveSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saveSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Draft</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Draft Generator from Reference Library Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Generate Draft from Nursing Reference Library
                  </h3>
                  <p className="text-xs text-slate-500">
                    Retrieves evidence directly from indexed textbook resources to draft an insight.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGeneratorOpen(false);
                  setSelectedSourceId('');
                  setSelectedSourceDetail(null);
                }}
                disabled={generatingDraft}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1: Search reference library */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  1. Search Nursing Library Sources
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. insulin administration, wound care, sepsis, ventilation..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSearchSources();
                      }
                    }}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSearchSources()}
                    disabled={searchingSources || !sourceSearch.trim()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {searchingSources ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Source list results */}
              {sourceResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Select Source Passage ({sourceResults.length} found):
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {sourceResults.map((src) => {
                      const isSelected = selectedSourceId === src.indexId;
                      return (
                        <div
                          key={src.indexId}
                          onClick={() => void handleSelectSource(src.indexId)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-50 border-purple-400 text-purple-950 font-medium'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-900">{src.title}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{src.section}</span>
                          </div>
                          {src.preview && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{src.preview}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected passage detail preview */}
              {selectedSourceDetail && (
                <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-200 space-y-1">
                  <p className="text-[11px] font-bold text-purple-900 uppercase">Selected Source Passage:</p>
                  <p className="text-xs text-slate-700 max-h-24 overflow-y-auto italic">
                    "{selectedSourceDetail.passage}"
                  </p>
                  <p className="text-[10px] text-purple-700">
                    {selectedSourceDetail.title} • {selectedSourceDetail.section}
                  </p>
                </div>
              )}

              {/* Step 2: Target Topic */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  2. Clinical Objective / Target Focus *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peripheral IV infiltration assessment criteria"
                  value={generatorTopic}
                  onChange={(e) => setGeneratorTopic(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGeneratorOpen(false)}
                  disabled={generatingDraft}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateDraft()}
                  disabled={generatingDraft || !selectedSourceId || !generatorTopic.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {generatingDraft ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Draft...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Insight Draft</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
