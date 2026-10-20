import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck,
  FileWarning, LibraryBig, Loader2, RefreshCw, Search, ShieldCheck, XCircle
} from 'lucide-react';
import type {
  SessionUser, CNENursingReferenceResource, CNENursingReferenceDriveFile,
  CNENursingLibraryHealth, CNENursingLibraryHealthResource, CNENursingLibraryReindexJob
} from '../../types';
import { ApiService } from '../../services/api';
import { useToast } from '../Toast';

interface LibraryIndexManagementPageProps { user: SessionUser; }

interface LibraryIndexItem {
  id: string;
  sourceType: 'NURSING_REFERENCE_LIB';
  driveFileId: string;
  title: string;
  fileName: string;
  authorOrSpeaker?: string;
  license?: string;
  version?: string;
  indexed: boolean;
}

type Operation = 'idle' | 'checking' | 'single' | 'starting' | 'batch' | 'verifying';

const readableIssue: Record<string, string> = {
  NOT_INDEXED: 'No indexed passages found',
  UNREADABLE_CHUNKS: 'Unreadable or damaged extracted text',
  DUPLICATE_CHUNKS: 'Duplicate passage numbers',
  NOT_REGISTERED: 'PDF is not registered in the reference library',
  DUPLICATE_REGISTRY: 'Multiple library registration rows',
  INACTIVE: 'Resource is inactive',
  EXTRACTION_FAILED: 'PDF extraction failed',
  MIXED_INDEX_STATUS: 'Mixed successful and failed extraction passages',
  MISSING_INDEX_ROWS: 'Missing index rows for this registered PDF',
  SOURCE_CHANGED_AFTER_INDEX: 'PDF was modified after the last index',
  FAILED_CHUNKS: 'Failed extraction passages'
};

const batchProgress = (job: CNENursingLibraryReindexJob) =>
  job.total > 0 ? Math.min(100, Math.max(0, Math.round(job.completed * 100 / job.total))) : 0;

/** UI-only redesign. The Apps Script backend remains the authority for permissions, indexing and job state. */
export const LibraryIndexManagementPage: React.FC<LibraryIndexManagementPageProps> = ({ user }) => {
  const isAdmin = user?.role === 'ADMIN' && Boolean(user?.employeeId);
  const sessionKey = `${user?.employeeId || ''}:${user?.role || ''}:${user?.token || ''}`;
  const sessionKeyRef = useRef(sessionKey);
  sessionKeyRef.current = sessionKey;
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const batchBusyRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const stopRequestBusyRef = useRef(false);
  const statusPollBusyRef = useRef(false);
  const { success, error } = useToast();

  const [resources, setResources] = useState<CNENursingReferenceResource[]>([]);
  const [driveFiles, setDriveFiles] = useState<CNENursingReferenceDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceError, setResourceError] = useState('');
  const [jobError, setJobError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [health, setHealth] = useState<CNENursingLibraryHealth | null>(null);
  const [healthError, setHealthError] = useState('');
  const [operation, setOperation] = useState<Operation>('idle');
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [reindexingTitle, setReindexingTitle] = useState('');
  const [lastFailures, setLastFailures] = useState<Record<string, string>>({});
  const [reindexJob, setReindexJob] = useState<CNENursingLibraryReindexJob | null>(null);
  const [confirmReindex, setConfirmReindex] = useState<LibraryIndexItem | 'ALL' | null>(null);
  const [stopPending, setStopPending] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const current = () => activeRef.current && sessionKeyRef.current === sessionKey;

  const loadAllResources = async (): Promise<void> => {
    if (!isAdmin) return;
    const requestSession = sessionKeyRef.current;
    setResourceError('');
    try {
      const response = await ApiService.listNursingReferenceResources();
      if (!activeRef.current || sessionKeyRef.current !== requestSession) return;
      if (!response.success || !response.data) {
        setResourceError(response.message || 'Unable to load Nursing Reference Library PDFs.');
        return;
      }
      setResources(response.data.resources || []);
      setDriveFiles(response.data.driveFiles || []);
    } catch (e: any) {
      if (activeRef.current && sessionKeyRef.current === requestSession)
        setResourceError(e?.message || 'Unable to load Nursing Reference Library PDFs.');
    }
  };

  const loadJob = async (): Promise<CNENursingLibraryReindexJob | null> => {
    const requestSession = sessionKeyRef.current;
    try {
      const response = await ApiService.getNursingReferenceReindexJob();
      if (!response.success) throw new Error(response.message || 'Unable to load the previous reindex job.');
      if (activeRef.current && sessionKeyRef.current === requestSession) {
        setReindexJob(response.data || null);
        setJobError('');
      }
      return response.data || null;
    } catch (e: any) {
      if (activeRef.current && sessionKeyRef.current === requestSession)
        setJobError(e?.message || 'Could not read the previous reindex job. Refresh before starting another.');
      return null;
    }
  };

  useEffect(() => {
    activeRef.current = true;
    busyRef.current = false;
    batchBusyRef.current = false;
    stopRequestedRef.current = false;
    stopRequestBusyRef.current = false;
    statusPollBusyRef.current = false;
    setLoading(true);
    setHealth(null);
    setHealthError('');
    setJobError('');
    setReindexJob(null);
    setLastFailures({});
    setConfirmReindex(null);
    if (isAdmin) {
      void Promise.all([loadAllResources(), loadJob()]).finally(() => {
        if (activeRef.current && sessionKeyRef.current === sessionKey) setLoading(false);
      });
    } else setLoading(false);
    return () => { activeRef.current = false; };
  }, [sessionKey]);

  // A different tab may be working on the current PDF. Read saved job status,
  // rather than assuming that the local browser owns the backend claim.
  useEffect(() => {
    if (!isAdmin || !reindexJob || reindexJob.status !== 'RUNNING' || !reindexJob.processing || batchBusyRef.current) return;
    const interval = window.setInterval(() => {
      setClock(Date.now());
      if (batchBusyRef.current || statusPollBusyRef.current) return;
      statusPollBusyRef.current = true;
      void loadJob().then(async latest => {
        if (!current() || !latest || latest.status === 'RUNNING') return;
        // A batch completed in another browser/tab. Refresh this same table.
        setHealth(null);
        await Promise.all([loadAllResources(), refreshHealth()]);
      }).finally(() => { statusPollBusyRef.current = false; });
    }, 8000);
    return () => window.clearInterval(interval);
  }, [isAdmin, reindexJob?.jobId, reindexJob?.status, reindexJob?.processing, sessionKey]);

  const libraryItems = useMemo<LibraryIndexItem[]>(() => {
    const registryByFile = new Map<string, CNENursingReferenceResource>(resources.map(r => [r.driveFileId, r]));
    const recorded = new Set<string>();
    const items: LibraryIndexItem[] = driveFiles
      .filter(file => file.driveFileId && (file.fileType || file.fileName || '').toLowerCase().includes('pdf'))
      .map(file => {
        recorded.add(file.driveFileId);
        const registered = registryByFile.get(file.driveFileId);
        return {
          id: `ref_${file.driveFileId}`, sourceType: 'NURSING_REFERENCE_LIB' as const,
          driveFileId: file.driveFileId, title: registered?.resourceTitle || file.resourceTitle || file.fileName,
          fileName: file.fileName, authorOrSpeaker: registered?.authorOrganization,
          license: registered?.license, version: registered?.version, indexed: file.isIndexed
        };
      });
    resources.filter(resource => resource.driveFileId && !recorded.has(resource.driveFileId)).forEach(resource => {
      items.push({
        id: `ref_${resource.driveFileId}`, sourceType: 'NURSING_REFERENCE_LIB',
        driveFileId: resource.driveFileId, title: resource.resourceTitle,
        fileName: resource.resourceTitle, authorOrSpeaker: resource.authorOrganization,
        license: resource.license, version: resource.version, indexed: true
      });
    });
    return items;
  }, [resources, driveFiles]);

  // ONE unified table: combine the library list and all health-only Drive PDFs.
  // Never drop a pending/unregistered PDF merely because the normal registry omits it.
  const rows = useMemo(() => {
    const byId = new Map<string, LibraryIndexItem>();
    libraryItems.forEach(item => byId.set(item.driveFileId, item));
    health?.resources.forEach(record => {
      if (!record.driveFileId || byId.has(record.driveFileId)) return;
      byId.set(record.driveFileId, {
        id: `ref_health_${record.driveFileId}`, sourceType: 'NURSING_REFERENCE_LIB',
        driveFileId: record.driveFileId, title: record.resourceTitle || record.fileName,
        fileName: record.fileName, indexed: record.chunksCount > 0
      });
    });
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [libraryItems, health]);
  const healthByFile = useMemo(() => new Map<string, CNENursingLibraryHealthResource>(
    (health?.resources || []).map(record => [record.driveFileId, record])
  ), [health]);
  const visibleItems = rows.filter(item =>
    `${item.title} ${item.fileName}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const refreshHealth = async (): Promise<CNENursingLibraryHealth | null> => {
    const requestSession = sessionKeyRef.current;
    if (activeRef.current) setHealthError('');
    try {
      const result = await ApiService.getNursingReferenceLibraryHealth();
      if (!result.success || !result.data) throw new Error(result.message || 'Unable to inspect the library index.');
      if (activeRef.current && sessionKeyRef.current === requestSession) setHealth(result.data);
      return result.data;
    } catch (e: any) {
      if (activeRef.current && sessionKeyRef.current === requestSession)
        setHealthError(e?.message || 'Index health check failed.');
      return null;
    }
  };

  const checkIndexHealth = async (): Promise<CNENursingLibraryHealth | null> => {
    if (!isAdmin || loading || jobError || busyRef.current || reindexJob?.status === 'RUNNING') return null;
    busyRef.current = true;
    setOperation('checking');
    try { return await refreshHealth(); }
    finally { busyRef.current = false; if (current()) setOperation('idle'); }
  };

  const handleReindex = async (item: LibraryIndexItem) => {
    if (!isAdmin || item.sourceType !== 'NURSING_REFERENCE_LIB' || !item.driveFileId ||
        loading || jobError || busyRef.current || reindexJob?.status === 'RUNNING') return;
    busyRef.current = true;
    setOperation('single');
    setReindexingId(item.id);
    setReindexingTitle(item.title);
    try {
      const response = await ApiService.indexNursingReferenceResource({
        driveFileId: item.driveFileId, resourceTitle: item.title,
        authorOrganization: item.authorOrSpeaker, license: item.license,
        version: item.version, reindex: true
      });
      if (response.success) {
        if (current()) {
          setLastFailures(prev => { const next = { ...prev }; delete next[item.driveFileId]; return next; });
          setHealth(null); // Until freshly verified, do not show a stale Healthy status.
          setOperation('verifying');
        }
        await Promise.all([loadAllResources(), refreshHealth()]);
        success(`Reindex completed: ${response.data?.chunksCount || 0} chunks for "${item.title}". Review the refreshed health status.`);
      } else {
        const message = response.message || 'Reindexing failed.';
        if (current()) setLastFailures(prev => ({ ...prev, [item.driveFileId]: message }));
        error(message + ' The previous usable index is preserved if extraction fails.');
        if (current()) setOperation('verifying');
        await refreshHealth();
      }
    } catch (e: any) {
      if (current()) setLastFailures(prev => ({ ...prev, [item.driveFileId]: e?.message || 'Connection interrupted.' }));
      error(e?.message || 'The reindex request failed. Check index health before retrying.');
      if (current()) setOperation('verifying');
      await refreshHealth();
    } finally {
      busyRef.current = false;
      if (current()) { setOperation('idle'); setReindexingId(null); setReindexingTitle(''); }
    }
  };

  const resumeBatchJob = async (initial: CNENursingLibraryReindexJob) => {
    if (!isAdmin || batchBusyRef.current || initial.status !== 'RUNNING') return;
    batchBusyRef.current = true;
    busyRef.current = true;
    stopRequestedRef.current = false;
    setOperation('batch');
    let job = initial;
    try {
      while (job.status === 'RUNNING' && !stopRequestedRef.current) {
        if (!current()) return;
        const response = await ApiService.advanceNursingReferenceReindexAll(job.jobId);
        if (!current()) return;
        if (!response.success || !response.data) {
          await loadJob();
          error(response.message || 'Progress is uncertain. Check the saved job and use Resume when safe.');
          return;
        }
        job = response.data;
        setReindexJob(job);
      }
      if (stopRequestedRef.current) {
        // The final PDF may have finished after Stop was pressed; always recheck
        // the table after that request, not only after a normal completion.
        setOperation('verifying');
        setHealth(null);
        await Promise.all([loadJob(), loadAllResources(), refreshHealth()]);
      } else if (job.status !== 'RUNNING') {
        setOperation('verifying');
        setHealth(null);
        await Promise.all([loadAllResources(), refreshHealth()]);
        success(`Library reindex ${job.status.toLowerCase()}: ${job.succeeded} successful, ${job.failed} failed, ${job.completed}/${job.total} processed.`);
      }
    } catch (e: any) {
      error(e?.message || 'Connection interrupted. Saved progress can be resumed safely.');
      await loadJob();
    } finally {
      batchBusyRef.current = false;
      busyRef.current = false;
      if (current()) setOperation('idle');
    }
  };

  const startBatchReindex = async () => {
    if (!isAdmin || loading || jobError || busyRef.current || reindexJob?.status === 'RUNNING') return;
    busyRef.current = true;
    setOperation('starting');
    try {
      const result = await ApiService.startNursingReferenceReindexAll();
      if (!current()) return;
      if (!result.success || !result.data) {
        error(result.message || 'Unable to start library reindex.');
        await loadJob();
        return;
      }
      setReindexJob(result.data);
      if (result.data.status === 'RUNNING') await resumeBatchJob(result.data);
    } catch (e: any) {
      error(e?.message || 'Cannot confirm whether a job started. Inspect saved job status before retrying.');
      await loadJob();
    } finally {
      busyRef.current = false;
      if (current() && !batchBusyRef.current) setOperation('idle');
    }
  };

  const stopBatchReindex = async () => {
    if (!isAdmin || reindexJob?.status !== 'RUNNING' || stopRequestBusyRef.current || reindexJob.cancelRequested) return;
    stopRequestBusyRef.current = true;
    stopRequestedRef.current = true; // Prevent this tab from dispatching another PDF immediately.
    setStopPending(true);
    try {
      const result = await ApiService.cancelNursingReferenceReindexAll();
      if (!current()) return;
      if (!result.success) throw new Error(result.message || 'Unable to request cancellation.');
      setReindexJob(result.data || null);
      if (result.data?.status === 'CANCELLED' && !batchBusyRef.current) {
        setOperation('verifying');
        setHealth(null);
        await Promise.all([loadAllResources(), refreshHealth()]);
        if (current()) setOperation('idle');
      }
    } catch (e: any) {
      error(e?.message || 'Stop request was not confirmed. Refresh the saved job status.');
      await loadJob();
    } finally {
      stopRequestBusyRef.current = false;
      if (current()) setStopPending(false);
    }
  };

  // Remote PDF claims normally finish within one Apps Script execution.
  // After the backend's 12-minute stale-claim threshold, allow a deliberate recovery.
  const remoteClaimActive = reindexJob?.status === 'RUNNING' && reindexJob.processing &&
    !(reindexJob.updatedAt && clock - new Date(reindexJob.updatedAt).getTime() >= 13 * 60 * 1000);
  const batchRunning = reindexJob?.status === 'RUNNING';
  const showOverlay = operation !== 'idle' || Boolean(remoteClaimActive);
  const actionLocked = loading || Boolean(jobError) || showOverlay || batchRunning;
  const canResume = batchRunning && !showOverlay && !batchBusyRef.current && !reindexJob?.cancelRequested;
  const reindexBatchTitle = operation === 'starting' ? 'Starting library reindex…' :
    operation === 'verifying' ? 'Verifying updated indexes…' : 'Reindex All in Progress';

  if (!isAdmin) return (
    <div className="p-8 text-center text-sm font-semibold text-rose-700" role="alert">Administrator access required.</div>
  );

  return (
    <div id="cne-library-index-management-page" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div inert={showOverlay} aria-busy={showOverlay} className="space-y-5">
        <header className="rounded-2xl bg-white border border-slate-200 p-5">
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <LibraryBig className="w-5 h-5 text-emerald-700" /> Library Index Management
            <span className="text-[10px] font-semibold text-emerald-700">Admin only</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">Review and maintain Nursing Reference Library PDF indexes. CNE-specific materials are not affected.</p>
        </header>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4" aria-label="Administrator Library Index Management">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Index health and maintenance
              </h2>
              <p className="text-xs text-slate-500 mt-1">One table shows each PDF's current index health and its Reindex action.</p>
            </div>
            {!actionLocked && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void checkIndexHealth()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <ClipboardCheck className="w-4 h-4" /> Check Index Health
                </button>
                <button type="button" onClick={async () => {
                    const result = await checkIndexHealth();
                    if (result?.totalResources && current()) setConfirmReindex('ALL');
                    else if (result && current()) error('No reference PDFs found.');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">
                  <RefreshCw className="w-4 h-4" /> Reindex All
                </button>
              </div>
            )}
          </div>

          {health && <div className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label="Index health totals">
            {[
              { label: 'Total PDFs', value: health.totalResources, color: 'text-slate-900' },
              { label: 'Healthy', value: health.healthyResources, color: 'text-emerald-700' },
              { label: 'Needs attention', value: health.needsAttention, color: 'text-amber-700' },
              { label: 'Orphan index rows', value: health.orphanIndexRows, color: 'text-rose-700' }
            ].map(metric => <div key={metric.label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">{metric.label}</p>
              <p className={`text-xl font-bold tabular-nums ${metric.color}`}>{metric.value}</p>
            </div>)}
          </div>}

          {healthError && <p role="alert" className="text-xs text-rose-700"><AlertTriangle className="inline w-4 h-4 mr-1" />{healthError} The displayed health status may be outdated.</p>}
          {resourceError && <p role="alert" className="text-xs text-rose-700">{resourceError} Run Check Index Health to inspect all approved-folder PDFs.</p>}
          {jobError && <p role="alert" className="text-xs text-rose-700">{jobError} Reload this page before starting a new operation.</p>}
          {health?.orphanIndexRows ? <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">
            <AlertTriangle className="w-4 h-4 inline mr-1" />{health.orphanIndexRows} orphan index rows require separate administrator review; they cannot be corrected by selecting a non-existent PDF.
          </p> : null}

          {reindexJob && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2" aria-live="polite">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <p className="font-bold text-sm text-slate-800">Library batch: {reindexJob.status === 'RUNNING' ? 'In progress' : reindexJob.status === 'COMPLETED' ? 'Completed' : 'Stopped'}</p>
              <p className="font-semibold text-sm tabular-nums">{reindexJob.completed} / {reindexJob.total} PDFs · {batchProgress(reindexJob)}%</p>
            </div>
            <div role="progressbar" aria-label="PDFs processed in library reindex" aria-valuenow={reindexJob.completed} aria-valuemin={0} aria-valuemax={Math.max(reindexJob.total, 1)}
              className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${batchProgress(reindexJob)}%` }} />
            </div>
            <p className="text-xs text-slate-600">{reindexJob.succeeded} succeeded · {reindexJob.failed} failed · {reindexJob.skipped} skipped</p>
            {reindexJob.cancelRequested && <p className="text-xs font-semibold text-amber-800">Stop requested. The current PDF is allowed to finish.</p>}
            {reindexJob.failures.length > 0 && <div className="text-xs text-rose-700 space-y-1" aria-label="Batch reindex failures">
              {reindexJob.failures.map((failure, i) => <p key={`${failure.driveFileId}-${i}`} className="break-words">{failure.driveFileId}: {failure.errorCode} — {failure.message}</p>)}
            </div>}
            {canResume && <button type="button" onClick={() => void resumeBatchJob(reindexJob)}
              className="rounded-lg bg-emerald-700 text-white px-3 py-2 text-xs font-bold">
              <RefreshCw className="inline w-4 h-4 mr-1" /> Resume Reindex
            </button>}
            {!showOverlay && batchRunning && !reindexJob.cancelRequested && <button type="button"
              onClick={() => void stopBatchReindex()} disabled={stopPending}
              className="ml-2 rounded-lg border border-rose-300 text-rose-700 px-3 py-2 text-xs font-bold disabled:opacity-60">
              {stopPending ? 'Requesting stop…' : 'Stop after current PDF'}
            </button>}
            {!showOverlay && batchRunning && reindexJob.cancelRequested && <button type="button" onClick={() => void loadJob()}
              className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-xs font-bold">Refresh saved job status</button>}
          </div>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 w-full sm:max-w-md rounded-lg border border-slate-300 px-3 py-2">
              <Search className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <input type="search" aria-label="Search reference PDFs" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                disabled={actionLocked} className="min-w-0 flex-1 outline-none text-sm disabled:opacity-60" placeholder="Find reference PDF…" />
            </label>
            <span className="text-xs text-slate-500">{health ? 'Statuses from latest health check' : 'Run Check Index Health to verify index statuses'}</span>
          </div>

          {loading ? <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="w-4 h-4 animate-spin" /> Loading reference PDFs and saved job status…</p> :
            <div role="region" aria-label="Reference library index status table" className="rounded-lg border border-slate-200 overflow-x-auto">
              <table className="w-full min-w-[610px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-700"><tr>
                  <th scope="col" className="p-3 font-bold">Reference PDF</th>
                  <th scope="col" className="p-3 font-bold">Index health</th>
                  <th scope="col" className="p-3 font-bold">Indexed chunks / details</th>
                  <th scope="col" className="p-3 text-right font-bold">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map(item => {
                    const record = healthByFile.get(item.driveFileId);
                    const isSingle = reindexingId === item.id;
                    const isBatchRecord = Boolean(remoteClaimActive && reindexJob?.currentDriveFileId === item.driveFileId);
                    const isReindexing = isSingle || isBatchRecord;
                    const isExpanded = expandedFileId === item.driveFileId;
                    const failure = lastFailures[item.driveFileId];
                    const isHealthy = record?.indexStatus === 'HEALTHY';
                    const isNotIndexed = Boolean(record?.issues?.includes('NOT_INDEXED'));
                    return <React.Fragment key={item.driveFileId}>
                      <tr className={isReindexing ? 'bg-emerald-50' : 'hover:bg-slate-50/70'}>
                        <td className="p-3 align-top">
                          <p className="font-semibold text-slate-900 break-words">{item.title}</p>
                          <p className="text-[11px] text-slate-500 break-words">{item.fileName}</p>
                        </td>
                        <td className="p-3 align-top">
                          {isReindexing ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Loader2 className="w-4 h-4 animate-spin" /> Reindexing…</span> :
                          operation === 'checking' ? <span className="inline-flex items-center gap-1 text-slate-600"><Loader2 className="w-4 h-4 animate-spin" /> Checking…</span> :
                          !record ? <span className="text-slate-500">Not checked</span> :
                          isHealthy ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Healthy</span> :
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><FileWarning className="w-4 h-4" /> {isNotIndexed ? 'Not indexed' : 'Needs attention'}</span>}
                          {failure && <p className="text-rose-700 text-[11px] mt-1"><XCircle className="inline w-3 h-3 mr-1" />Last reindex attempt failed</p>}
                        </td>
                        <td className="p-3 align-top text-slate-600">
                          {record ? <>
                            <p>{record.chunksCount} chunks{record.indexedAt ? ` · ${record.indexedAt}` : ''}</p>
                            {record.issues.length > 0 && <p className="text-amber-700 mt-1">{record.issues.length} issue(s)</p>}
                          </> : <p>Run a health check for verified counts.</p>}
                        </td>
                        <td className="p-3 align-top text-right">
                          {!actionLocked && <div className="flex justify-end items-center gap-2">
                            {record && (record.issues.length > 0 || failure) && <button type="button"
                              onClick={() => setExpandedFileId(isExpanded ? null : item.driveFileId)}
                              aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Hide' : 'Show'} index issues for ${item.title}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 font-semibold text-slate-700">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Issues
                            </button>}
                            <button type="button" onClick={() => setConfirmReindex(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 font-bold text-emerald-800 hover:bg-emerald-50">
                              <RefreshCw className="w-4 h-4" /> Reindex
                            </button>
                          </div>}
                        </td>
                      </tr>
                      {isExpanded && !actionLocked && <tr className="bg-slate-50"><td colSpan={4} className="px-4 py-3 text-xs text-slate-700">
                        <strong>Index issues:</strong> {record?.issues?.length ? record.issues.map(issue => readableIssue[issue] || issue).join(' · ') : 'None reported'}
                        {failure && <p className="mt-1 text-rose-700"><strong>Last failed attempt:</strong> {failure}</p>}
                        {record?.fileUpdatedAt && <p className="mt-1 text-slate-500">PDF last updated: {record.fileUpdatedAt}</p>}
                      </td></tr>}
                    </React.Fragment>;
                  })}
                  {visibleItems.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-slate-500">
                    {searchQuery ? 'No PDFs match your search.' : resourceError ? 'Resource listing unavailable. Try Check Index Health.' : 'No reference PDFs found.'}
                  </td></tr>}
                </tbody>
              </table>
            </div>}
          <p className="text-[11px] text-slate-500">A successful reindex is not marked Healthy until a fresh backend health check confirms it. Failed extraction does not intentionally discard a previous usable index.</p>
        </section>
      </div>

      {confirmReindex && !showOverlay && (
        <div className="fixed inset-0 z-[80] bg-slate-900/75 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="library-reindex-confirm-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 id="library-reindex-confirm-title" className="text-base font-bold text-slate-900">
              {confirmReindex === 'ALL' ? 'Reindex the entire reference library?' : 'Reindex this reference PDF?'}
            </h3>
            <p className="text-sm text-slate-600">
              {confirmReindex === 'ALL'
                ? `Sequentially reindex ${health?.totalResources ?? 0} Nursing Reference Library PDFs. Saved progress can be resumed, and Stop After Current PDF remains available. Back up the Sheets index before proceeding.`
                : `Reindex "${confirmReindex.title}"? A failed extraction retains the previous valid index if available. Back up the Sheets index first.`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmReindex(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
              <button type="button" onClick={() => {
                  const chosen = confirmReindex;
                  setConfirmReindex(null);
                  if (chosen === 'ALL') void startBatchReindex(); else void handleReindex(chosen);
                }} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Confirm Reindex</button>
            </div>
          </div>
        </div>
      )}

      {showOverlay && <div className="fixed inset-0 z-[90] bg-slate-900/75 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="library-index-progress-title" aria-describedby="library-index-progress-desc">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-4" role="status" aria-live="polite">
          <div className="flex gap-3 items-start">
            <Loader2 className="w-7 h-7 text-emerald-700 animate-spin shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="library-index-progress-title" className="font-bold text-base text-slate-900">
                {operation === 'checking' ? 'Checking Library Index Health…' :
                  operation === 'single' ? 'Reindexing Reference PDF…' :
                  operation === 'verifying' ? 'Verifying Updated Index Health…' :
                  reindexBatchTitle}
              </h2>
              <p id="library-index-progress-desc" className="text-sm text-slate-600 mt-1">
                {operation === 'checking' ? 'Scanning index records without modifying library data.' :
                  operation === 'single' || (operation === 'verifying' && reindexingTitle) ? reindexingTitle :
                  'Processing one PDF per backend request. Progress is saved after each completed PDF.'}
              </p>
            </div>
          </div>
          {reindexJob?.status === 'RUNNING' && operation !== 'single' && <div className="space-y-2 bg-slate-50 rounded-lg p-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold text-slate-800">{reindexJob.completed} of {reindexJob.total} PDFs processed</span>
              <span className="font-semibold tabular-nums text-emerald-700">{batchProgress(reindexJob)}%</span>
            </div>
            <div role="progressbar" aria-label="PDFs completed" aria-valuenow={reindexJob.completed} aria-valuemin={0} aria-valuemax={Math.max(reindexJob.total, 1)}
              className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${batchProgress(reindexJob)}%` }} />
            </div>
            <p className="text-xs text-slate-600">{reindexJob.succeeded} successful · {reindexJob.failed} failed</p>
            {reindexJob.currentDriveFileId && <p className="text-xs text-slate-600 break-words">Current PDF: {rows.find(r => r.driveFileId === reindexJob.currentDriveFileId)?.title || reindexJob.currentDriveFileId}</p>}
            {reindexJob.cancelRequested && <p className="text-xs font-semibold text-amber-800">Cancellation requested. Waiting for current PDF to finish.</p>}
          </div>}
          <p className="text-xs text-slate-600">Other index-management actions are temporarily locked. Do not refresh the page during an individual PDF request.</p>
          {reindexJob?.status === 'RUNNING' && (operation === 'batch' || operation === 'starting' || remoteClaimActive) && (
            <div className="flex justify-end">
              {!reindexJob.cancelRequested && <button type="button" onClick={() => void stopBatchReindex()} disabled={stopPending}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700 disabled:opacity-60">
                {stopPending ? 'Requesting stop…' : 'Stop after current PDF'}
              </button>}
            </div>
          )}
        </div>
      </div>}
    </div>
  );
};
