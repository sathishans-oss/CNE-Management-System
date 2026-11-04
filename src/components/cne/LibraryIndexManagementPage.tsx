import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Library,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Loader2,
  RotateCw,
  ShieldAlert
} from 'lucide-react';
import {
  SessionUser,
  CNENursingReferenceResource,
  CNENursingReferenceDriveFile,
  CNENursingLibraryHealth,
  CNENursingLibraryReindexJob
} from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';

interface LibraryIndexManagementPageProps {
  user: SessionUser | null;
}

export interface LibraryResourceItem {
  id: string;
  sourceType: 'NURSING_REFERENCE_LIB';
  title: string;
  fileName: string;
  driveFileId: string;
  isIndexed: boolean;
  authorOrganization?: string;
  license?: string;
  version?: string;
  updatedAt?: string;
}

type Operation = 'idle' | 'checking' | 'single' | 'starting' | 'batch' | 'verifying';

export const LibraryIndexManagementPage: React.FC<LibraryIndexManagementPageProps> = ({ user }) => {
  const { success, error, info } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<Operation>('idle');
  const [resources, setResources] = useState<LibraryResourceItem[]>([]);
  const [health, setHealth] = useState<CNENursingLibraryHealth | null>(null);
  const [reindexJob, setReindexJob] = useState<CNENursingLibraryReindexJob | null>(null);
  const [confirmReindex, setConfirmReindex] = useState<LibraryResourceItem | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [lastFailures, setLastFailures] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [jobError, setJobError] = useState<string | null>(null);

  const activeRef = useRef(true);
  const busyRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const sessionKeyRef = useRef(`idx_session_${Date.now()}`);

  const batchRunning = operation === 'batch' || operation === 'starting';
  const showOverlay = batchRunning;
  const actionLocked = loading || Boolean(jobError) || showOverlay || batchRunning;

  const loadAllResources = useCallback(async () => {
    try {
      const res = await ApiService.listNursingReferenceResources();
      if (!activeRef.current) return;
      if (res.success && res.data) {
        const { resources: registeredList = [], driveFiles = [] } = res.data;
        const regMap = new Map<string, CNENursingReferenceResource>();
        registeredList.forEach(r => regMap.set(r.driveFileId, r));

        const unified: LibraryResourceItem[] = driveFiles.map((df: CNENursingReferenceDriveFile) => {
          const reg = regMap.get(df.driveFileId);
          return {
            id: reg?.resourceId || df.driveFileId,
            sourceType: 'NURSING_REFERENCE_LIB',
            title: df.resourceTitle || reg?.resourceTitle || df.fileName,
            fileName: df.fileName,
            driveFileId: df.driveFileId,
            isIndexed: df.isIndexed || Boolean(reg?.active),
            authorOrganization: reg?.authorOrganization || 'Open RN Project',
            license: reg?.license || 'CC BY 4.0',
            version: reg?.version || '1.0',
            updatedAt: df.lastUpdated || reg?.updatedAt
          };
        });
        setResources(unified);
      }
    } catch (e: any) {
      if (activeRef.current) error(e?.message || 'Failed to load reference library files');
    }
  }, [error]);

  const refreshHealth = useCallback(async () => {
    try {
      setOperation('checking');
      const res = await ApiService.getNursingReferenceLibraryHealth();
      if (!activeRef.current) return;
      if (res.success && res.data) {
        setHealth(res.data);
      } else {
        error(res.message || 'Could not evaluate library index health');
      }
    } catch (e: any) {
      if (activeRef.current) error(e?.message || 'Error checking index health');
    } finally {
      if (activeRef.current) setOperation('idle');
    }
  }, [error]);

  const loadJob = useCallback(async () => {
    try {
      const response = await ApiService.getNursingReferenceReindexJob();
      if (!activeRef.current) return;
      if (response.success && response.data) {
        setReindexJob(response.data || null);
        const job = response.data;
        if (job.status === 'RUNNING') {
          if (Date.now() - new Date(job.updatedAt || job.startedAt).getTime() > 13 * 60 * 1000) {
            setJobError('Previous batch job appears stale (no activity for 13+ minutes).');
          }
        }
      }
    } catch {
      // Background poll
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    if (!isAdmin) return;

    (async () => {
      setLoading(true);
      await Promise.all([loadAllResources(), refreshHealth(), loadJob()]);
      if (activeRef.current) setLoading(false);
    })();

    return () => {
      activeRef.current = false;
    };
  }, [isAdmin, loadAllResources, refreshHealth, loadJob]);

  // Single PDF Reindex
  const handleReindex = async (item: LibraryResourceItem) => {
    if (!isAdmin || item.sourceType !== 'NURSING_REFERENCE_LIB') return;
    if (busyRef.current || actionLocked) return;

    busyRef.current = true;
    setReindexingId(item.id);
    setOperation('single');
    setHealth(null); // Until freshly verified

    try {
      const res = await ApiService.indexNursingReferenceResource({
        driveFileId: item.driveFileId,
        resourceTitle: item.title,
        authorOrganization: item.authorOrganization,
        license: item.license,
        version: item.version,
        reindex: true
      });

      if (!activeRef.current) return;
      if (res.success) {
        success(`Reindexed ${item.fileName} successfully`);
        setOperation('verifying');
        await Promise.all([loadAllResources(), refreshHealth()]);
      } else {
        const message = res.message || 'Single reindex failed';
        error(message);
        setLastFailures(prev => ({ ...prev, [item.driveFileId]: message }));
      }
    } catch (e: any) {
      const message = e?.message || 'Error during reindex';
      if (activeRef.current) {
        error(message);
        setLastFailures(prev => ({ ...prev, [item.driveFileId]: message }));
      }
    } finally {
      busyRef.current = false;
      if (activeRef.current) {
        setReindexingId(null);
        setOperation('idle');
        setConfirmReindex(null);
      }
    }
  };

  // Batch Reindex loop
  const runBatchLoop = async (jobId: string) => {
    stopRequestedRef.current = false;
    while (activeRef.current && !stopRequestedRef.current) {
      const adv = await ApiService.advanceNursingReferenceReindexAll({ jobId });
      if (!activeRef.current) break;
      if (!adv.success || !adv.data) {
        error(adv.message || 'Batch step failed');
        break;
      }

      const job = adv.data;
      setReindexJob(job);

      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        if (job.status === 'COMPLETED') {
          success(`Batch indexing complete: ${job.succeeded} succeeded, ${job.failed} failed`);
        } else {
          info('Batch indexing was stopped');
        }
        break;
      }
    }

    if (activeRef.current) {
      setOperation('verifying');
      await Promise.all([loadJob(), loadAllResources(), refreshHealth()]);
      setOperation('idle');
    }
  };

  const startBatchReindex = async () => {
    if (!isAdmin || busyRef.current || actionLocked) return;
    busyRef.current = true;
    setOperation('starting');

    try {
      const startRes = await ApiService.startNursingReferenceReindexAll({});
      if (!activeRef.current) return;
      if (startRes.success && startRes.data) {
        setReindexJob(startRes.data);
        setOperation('batch');
        busyRef.current = false;
        await runBatchLoop(startRes.data.jobId);
      } else {
        error(startRes.message || 'Failed to start batch indexing');
        setOperation('idle');
        busyRef.current = false;
      }
    } catch (e: any) {
      if (activeRef.current) {
        error(e?.message || 'Could not start batch indexing');
        setOperation('idle');
      }
      busyRef.current = false;
    }
  };

  const resumeBatchReindex = async () => {
    if (!isAdmin || !reindexJob || busyRef.current || actionLocked) return;
    setOperation('batch');
    await runBatchLoop(reindexJob.jobId);
  };

  const stopBatchReindex = async () => {
    stopRequestedRef.current = true;
    if (reindexJob?.jobId) {
      try {
        await ApiService.cancelNursingReferenceReindexAll({ jobId: reindexJob.jobId });
      } catch {
        // Safe local cancel
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Admin Access Required</h2>
        <p className="text-slate-600 mt-2">Only administrators can manage the nursing reference library index.</p>
      </div>
    );
  }

  // Health lookup map
  const healthByFile = new Map<string, string>();
  if (health?.resources) {
    const byId = new Map<string, any>();
    health?.resources.forEach(record => {
      byId.set(record.driveFileId, record);
      if (record.indexStatus === 'HEALTHY') {
        healthByFile.set(record.driveFileId, 'Healthy');
      } else if (record.issues?.length) {
        healthByFile.set(record.driveFileId, 'Needs attention');
      }
    });
  }

  const filteredResources = resources.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.fileName.toLowerCase().includes(q) ||
      (item.authorOrganization && item.authorOrganization.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" inert={showOverlay ? true : undefined}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Library className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Library Index Management</h1>
              <p className="text-sm text-slate-500 mt-0.5">Authoritative indexing and health control for open clinical reference resources</p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!actionLocked && (
            <button
              type="button"
              onClick={refreshHealth}
              disabled={actionLocked}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${operation === 'checking' ? 'animate-spin' : ''}`} />
              Check Index Health
            </button>
          )}

          {!actionLocked && (
            <button
              type="button"
              onClick={startBatchReindex}
              disabled={actionLocked}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4" />
              Reindex All
            </button>
          )}

          {reindexJob?.status === 'RUNNING' && !batchRunning && (
            <button
              type="button"
              onClick={resumeBatchReindex}
              disabled={actionLocked}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-xs"
            >
              <RotateCw className="w-4 h-4" />
              Resume Reindex
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Resources</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{health.totalResources}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Healthy</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{health.healthyResources}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Needs Attention</span>
            <p className="text-2xl font-bold text-amber-700 mt-1">{health.needsAttention}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Orphan Rows</span>
            <p className="text-2xl font-bold text-slate-700 mt-1">{health.orphanIndexRows}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter resources by title, file name, or author..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Unified Resource Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Resource</th>
                <th className="px-6 py-3.5">Author / License</th>
                <th className="px-6 py-3.5">Health State</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading reference resources...
                  </td>
                </tr>
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No resources match your filter.
                  </td>
                </tr>
              ) : (
                filteredResources.map(item => {
                  const stateString =
                    reindexingId === item.id
                      ? 'Reindexing…'
                      : operation === 'checking'
                      ? 'Checking…'
                      : !item.isIndexed
                      ? 'Not indexed'
                      : healthByFile.get(item.driveFileId) || 'Not checked';

                  const failure = lastFailures[item.driveFileId];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900 block">{item.title}</span>
                            <span className="text-xs text-slate-400 font-mono">{item.fileName}</span>
                            {failure && (
                              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {failure}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-slate-800">{item.authorOrganization || 'Open RN'}</span>
                        <span className="text-xs text-slate-400">{item.license || 'CC BY 4.0'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            stateString === 'Healthy'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : stateString === 'Needs attention'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : stateString === 'Reindexing…'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : stateString === 'Checking…'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : stateString === 'Not indexed'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {stateString === 'Healthy' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {stateString === 'Needs attention' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {stateString === 'Reindexing…' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {stateString}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmReindex(item)}
                          disabled={actionLocked || reindexingId === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50"
                        >
                          {reindexingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                          )}
                          Reindex
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Reindex Confirmation Modal */}
      {confirmReindex && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Confirm Reindex</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to reindex <span className="font-semibold">{confirmReindex.fileName}</span>? This will replace old extracted chunk passages.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmReindex(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReindex(confirmReindex)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
              >
                Confirm Reindex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Processing Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Batch Indexing in Progress</h3>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${reindexJob ? (reindexJob.total > 0 ? Math.min(100, Math.max(0, Math.round(reindexJob.completed * 100 / reindexJob.total))) : 0) : 0}%` }}
                role="progressbar"
                aria-valuenow={reindexJob?.completed || 0}
                aria-valuemin={0}
                aria-valuemax={reindexJob?.total || 100}
              />
            </div>
            <p className="text-sm text-slate-600">
              Processing files... {reindexJob ? `${reindexJob.completed} / ${reindexJob.total}` : ''}
            </p>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Succeeded: {reindexJob?.succeeded || 0}</span>
              <span>Failed: {reindexJob?.failed || 0}</span>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => stopBatchReindex()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Stop after current PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryIndexManagementPage;
