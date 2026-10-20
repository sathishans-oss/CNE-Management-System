import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardCheck, LibraryBig, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type {
  SessionUser, CNENursingReferenceResource, CNENursingReferenceDriveFile,
  CNENursingLibraryHealth, CNENursingLibraryReindexJob
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

/** Administrative maintenance page; every backend indexing action additionally checks fresh admin authorization. */
export const LibraryIndexManagementPage: React.FC<LibraryIndexManagementPageProps> = ({ user }) => {
  const isAdmin = user?.role === 'ADMIN' && Boolean(user?.employeeId);
  const sessionKey = `${user?.employeeId || ''}:${user?.role || ''}:${user?.token || ''}`;
  const sessionKeyRef = useRef(sessionKey);
  sessionKeyRef.current = sessionKey;
  const activeRef = useRef(false);
  const batchBusyRef = useRef(false);
  const { success, error } = useToast();
  const [resources, setResources] = useState<CNENursingReferenceResource[]>([]);
  const [driveFiles, setDriveFiles] = useState<CNENursingReferenceDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceError, setResourceError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [health, setHealth] = useState<CNENursingLibraryHealth | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [reindexJob, setReindexJob] = useState<CNENursingLibraryReindexJob | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [confirmReindex, setConfirmReindex] = useState<LibraryIndexItem | 'ALL' | null>(null);

  useEffect(() => {
    activeRef.current = true;
    batchBusyRef.current = false;
    setReindexJob(null);
    setHealth(null);
    setHealthError('');
    setConfirmReindex(null);
    if (isAdmin) {
      void loadAllResources();
      void ApiService.getNursingReferenceReindexJob().then((res) => {
        if (activeRef.current && sessionKeyRef.current === sessionKey && res.success) {
          setReindexJob(res.data || null);
        }
      }).catch(() => {
        if (activeRef.current && sessionKeyRef.current === sessionKey) {
          setResourceError('Unable to read previous batch status. Refresh before starting a new batch.');
        }
      });
    } else setLoading(false);
    return () => { activeRef.current = false; };
  }, [sessionKey]);

  const loadAllResources = async () => {
    if (!isAdmin) return;
    const requestSession = sessionKeyRef.current;
    setLoading(true);
    setResourceError('');
    try {
      const res = await ApiService.listNursingReferenceResources();
      if (!activeRef.current || sessionKeyRef.current !== requestSession) return;
      if (!res.success || !res.data) {
        setResourceError(res.message || 'Unable to load reference-library resources.');
        return;
      }
      setResources(res.data.resources || []);
      setDriveFiles(res.data.driveFiles || []);
    } catch (e: any) {
      if (activeRef.current && sessionKeyRef.current === requestSession) setResourceError(e?.message || 'Unable to load reference library.');
    } finally {
      if (activeRef.current && sessionKeyRef.current === requestSession) setLoading(false);
    }
  };

  // Include unregistered PDF files so administrators can repair missing indexes.
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
          driveFileId: file.driveFileId,
          title: registered?.resourceTitle || file.resourceTitle || file.fileName,
          fileName: file.fileName,
          authorOrSpeaker: registered?.authorOrganization,
          license: registered?.license, version: registered?.version,
          indexed: file.isIndexed
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
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }, [resources, driveFiles]);
  const visibleItems = libraryItems.filter(item =>
    `${item.title} ${item.fileName}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Read-only server-side health scan. It covers every approved-folder PDF,
  // including pending/unregistered resources missing from the standard listing.
  const checkIndexHealth = async (): Promise<CNENursingLibraryHealth | null> => {
    if (!isAdmin) return null;
    setHealthBusy(true);
    setHealthError('');
    try {
      const result = await ApiService.getNursingReferenceLibraryHealth();
      if (!result.success || !result.data) {
        setHealthError(result.message || 'Unable to check reference library health.');
        return null;
      }
      if (activeRef.current && sessionKeyRef.current === sessionKey) setHealth(result.data);
      return result.data;
    } catch (e: any) {
      setHealthError(e?.message || 'Health check failed.');
      return null;
    } finally {
      setHealthBusy(false);
    }
  };

  const handleReindex = async (item: LibraryIndexItem) => {
    if (!isAdmin || item.sourceType !== 'NURSING_REFERENCE_LIB' || !item.driveFileId || reindexingId || reindexJob?.status === 'RUNNING') return;
    setReindexingId(item.id);
    try {
      const res = await ApiService.indexNursingReferenceResource({
        driveFileId: item.driveFileId,
        resourceTitle: item.title,
        authorOrganization: item.authorOrSpeaker,
        license: item.license,
        version: item.version,
        reindex: true
      });
      if (res.success) {
        success(`Reindexed ${res.data?.chunksCount || 0} chunks for "${item.title}".`);
        await Promise.all([loadAllResources(), checkIndexHealth()]);
      } else {
        error((res.message || 'Reindexing failed.') + ' Any previous valid index is retained if extraction failed.');
        await checkIndexHealth();
      }
    } catch (e: any) {
      error(e?.message || 'Error reindexing resource.');
    } finally {
      setReindexingId(null);
    }
  };

  const resumeBatchJob = async (initial: CNENursingLibraryReindexJob) => {
    if (!isAdmin || batchBusyRef.current || initial.status !== 'RUNNING') return;
    batchBusyRef.current = true;
    setBatchBusy(true);
    let job = initial;
    try {
      while (job.status === 'RUNNING') {
        if (!activeRef.current || sessionKeyRef.current !== sessionKey) return;
        const response = await ApiService.advanceNursingReferenceReindexAll(job.jobId);
        if (!response.success || !response.data) {
          const latest = await ApiService.getNursingReferenceReindexJob();
          if (activeRef.current && latest.success) setReindexJob(latest.data || null);
          error(response.message || 'Reindex progress is uncertain. Use Resume after checking job status.');
          return;
        }
        job = response.data;
        setReindexJob(job);
      }
      success(`Library reindex ${job.status.toLowerCase()}: ${job.succeeded} successful, ${job.failed} failed, ${job.completed}/${job.total} processed.`);
      await Promise.all([loadAllResources(), checkIndexHealth()]);
    } catch (e: any) {
      error(e?.message || 'Connection interrupted. Reindex progress is saved; use Resume to continue.');
      const latest = await ApiService.getNursingReferenceReindexJob();
      if (activeRef.current && latest.success) setReindexJob(latest.data || null);
    } finally {
      batchBusyRef.current = false;
      setBatchBusy(false);
    }
  };

  const startBatchReindex = async () => {
    if (!isAdmin || batchBusyRef.current || reindexingId) return;
    try {
      const started = await ApiService.startNursingReferenceReindexAll();
      if (!started.success || !started.data) { error(started.message || 'Unable to start batch reindex.'); return; }
      setReindexJob(started.data);
      await resumeBatchJob(started.data);
    } catch (e: any) {
      error(e?.message || 'Unable to start batch reindex. Check job status before trying again.');
    }
  };

  const stopBatchReindex = async () => {
    if (!isAdmin || reindexJob?.status !== 'RUNNING') return;
    const result = await ApiService.cancelNursingReferenceReindexAll();
    if (result.success) setReindexJob(result.data || null);
    else error(result.message || 'Could not request cancellation.');
  };


  if (!isAdmin) return (
    <div className="p-8 text-center text-sm font-semibold text-rose-700" role="alert">Administrator access required.</div>
  );

  return (
    <div id="cne-library-index-management-page" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <header className="rounded-2xl bg-white border border-slate-200 p-5">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900"><LibraryBig className="w-5 h-5 text-emerald-700" /> Library Index Management</h1>
        <p className="mt-1 text-sm text-slate-600">Administrative maintenance for Nursing Reference Library PDFs only. Learning Resources remain available in their own page.</p>
      </header>
        <section className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-4 space-y-3" aria-label="Administrator Library Index Management">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Library Index Management <span className="text-[10px] font-semibold text-slate-500">Admin only</span></h2>
              <p className="text-xs text-slate-500 mt-1">Inspect indexing quality before reindexing. CNE-specific learning materials are not affected.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void checkIndexHealth()} disabled={healthBusy || batchBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {healthBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />} Check Index Health
              </button>
              <button type="button" onClick={async () => { const report = await checkIndexHealth(); if (report?.totalResources) setConfirmReindex('ALL'); else if (report) error('No reference PDFs found.'); }}
                disabled={healthBusy || Boolean(reindexingId) || reindexJob?.status === 'RUNNING'}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                <RefreshCw className="w-4 h-4" /> Reindex All
              </button>
            </div>
          </div>
          {healthError && <p role="alert" className="text-xs text-rose-700"><AlertTriangle className="inline-block w-3.5 h-3.5 mr-1" />{healthError}</p>}
          {health && (
            <div className="space-y-2">
              <p className="text-xs text-slate-700"><strong>{health.totalResources}</strong> PDF resources · <strong className="text-emerald-700">{health.healthyResources} healthy</strong> · <strong className="text-amber-700">{health.needsAttention} need attention</strong>
                {health.orphanIndexRows > 0 && <> · <strong className="text-rose-700">{health.orphanIndexRows} orphan index rows (review manually)</strong></>}
              </p>
              <div className="max-h-60 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100" role="region" aria-label="Reference index health results">
                {health.resources.map((record) => (
                  <div key={record.driveFileId} className="px-3 py-2 flex flex-wrap items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 break-words">{record.resourceTitle}</p>
                      <p className="text-slate-500">{record.chunksCount} indexed chunks · {record.indexStatus === 'HEALTHY' ? 'Healthy' : `Needs attention: ${record.issues.join(', ')}`}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 font-bold ${record.indexStatus === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{record.indexStatus === 'HEALTHY' ? 'Healthy' : 'Review'}</span>
                    <button type="button" disabled={Boolean(reindexingId) || reindexJob?.status === 'RUNNING'}
                      onClick={() => setConfirmReindex(libraryItems.find(item => item.driveFileId === record.driveFileId) || {id:`ref_health_${record.driveFileId}`,sourceType:'NURSING_REFERENCE_LIB',driveFileId:record.driveFileId,title:record.resourceTitle,fileName:record.fileName,indexed:false})}
                      className="rounded border border-emerald-300 text-emerald-800 px-2 py-1 font-bold disabled:opacity-50">Reindex</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {reindexJob && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs" aria-live="polite">
              <p className="font-bold text-slate-800">Library reindex: {reindexJob.status} · {reindexJob.completed}/{reindexJob.total} processed</p>
              <p className="text-slate-600">{reindexJob.succeeded} indexed · {reindexJob.failed} failed {reindexJob.processing ? `· Processing ${health?.resources.find((file) => file.driveFileId === reindexJob.currentDriveFileId)?.resourceTitle || 'a PDF'} now` : ''} {reindexJob.cancelRequested ? '· Cancellation requested' : ''}</p>
              {reindexJob.failures.length > 0 && <div className="text-rose-700">{reindexJob.failures.map((failure, idx) => <p key={`${failure.driveFileId}-${idx}`}>{failure.driveFileId}: {failure.errorCode} — {failure.message}</p>)}</div>}
              {reindexJob.status === 'RUNNING' && <div className="flex gap-2">
                <button type="button" disabled={batchBusy || reindexJob.cancelRequested} onClick={() => void resumeBatchJob(reindexJob)} className="rounded bg-emerald-700 text-white px-3 py-1.5 font-bold disabled:opacity-50">{batchBusy ? 'Processing…' : 'Resume Reindex'}</button>
                <button type="button" onClick={() => void stopBatchReindex()} className="rounded border border-rose-300 text-rose-700 px-3 py-1.5 font-bold disabled:opacity-50">Stop after current PDF</button>
              </div>}
            </div>
          )}
        </section>
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3" aria-label="Individual reference PDF reindexing">
        <h2 className="text-sm font-bold text-slate-900">Individual PDF Reindex</h2>
        <p className="text-xs text-slate-500">Choose a specific reference PDF to rebuild its index. Existing valid indexes are protected if extraction fails.</p>
        <label className="flex items-center gap-2 max-w-lg rounded-lg border border-slate-300 px-3 py-2">
          <Search className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <input type="search" aria-label="Search reference PDFs" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 outline-none text-sm" placeholder="Find reference PDF…" />
        </label>
        {resourceError && <p role="alert" className="text-sm text-rose-700">{resourceError}</p>}
        {loading && <p className="text-sm text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin" /> Loading library PDFs…</p>}
        {!loading && !resourceError && libraryItems.length === 0 && <p className="text-sm text-slate-500">No registered reference PDFs found. Check Index Health to inspect the approved Drive folder.</p>}
        {!loading && visibleItems.length > 0 && (
          <div role="region" aria-label="Reference PDF list" className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {visibleItems.map(item => (
              <div key={item.driveFileId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 break-words">{item.title}</p>
                  <p className="text-slate-500 break-words">{item.fileName} · {item.indexed ? 'Indexed' : 'Not indexed'}</p>
                </div>
                <button type="button" disabled={Boolean(reindexingId) || reindexJob?.status === 'RUNNING' || batchBusy}
                  onClick={() => setConfirmReindex(item)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 font-bold text-emerald-800 disabled:opacity-50">
                  {reindexingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Reindex
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {confirmReindex && (
        <div className="fixed inset-0 z-[80] bg-slate-900/75 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="library-reindex-confirm-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 id="library-reindex-confirm-title" className="text-base font-bold text-slate-900">{confirmReindex === 'ALL' ? 'Reindex the entire reference library?' : 'Reindex this reference PDF?'}</h3>
            <p className="text-sm text-slate-600">
              {confirmReindex === 'ALL'
                ? `This will sequentially reindex ${health?.totalResources ?? 0} Nursing Reference Library PDFs. Progress is saved after each PDF so it can be resumed. Existing usable indexes are preserved if extraction fails. Please back up your Google Sheets index first.`
                : `Reindex "${confirmReindex.title}"? A failed extraction will preserve its previous valid index. Please back up the index first.`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmReindex(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
              <button type="button" onClick={() => { const chosen = confirmReindex; setConfirmReindex(null); if (chosen === 'ALL') void startBatchReindex(); else void handleReindex(chosen); }}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Confirm Reindex</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
