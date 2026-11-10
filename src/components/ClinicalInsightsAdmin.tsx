import React, { useCallback, useEffect, useState } from 'react';
import { BookImage, CloudUpload, FolderSync, Image as ImageIcon, Loader2, Save, ShieldCheck } from 'lucide-react';
import { ApiService } from '../services/api';
import type { ClinicalInsight } from '../types';

/** Admin-only image library. No Gemini calls, clinical text editing or approval queues. */
export const ClinicalInsightsAdmin: React.FC = () => {
  const [items,setItems] = useState<ClinicalInsight[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [selectedFile,setSelectedFile] = useState<File | null>(null);
  const [imageId,setImageId] = useState('');
  const [order,setOrder] = useState(1);
  const [mode,setMode] = useState<'ROTATION'|'TODAY'>('ROTATION');
  const [preview,setPreview] = useState('');

  const reload=useCallback(async()=>{
    setLoading(true);
    try { const r=await ApiService.getClinicalInsightsAdmin();
      if(!r.success)throw new Error(r.message||'Unable to load Clinical Insights.');
      setItems(r.data?.insights||[]);
    } catch(e) {setError(e instanceof Error?e.message:'Unable to load Clinical Insights.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);

  const readImage=async(file:File):Promise<string>=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Invalid file.'));
    reader.onerror=()=>reject(new Error('Unable to read the image.'));
    reader.readAsDataURL(file);
  });
  const submit=async()=>{
    setError('');setNotice('');
    if(!selectedFile&&!imageId.trim())return setError('Choose an image or enter a Drive File ID.');
    setBusy(true);
    try{
      let id=imageId.trim();
      if(selectedFile){
        if(!['image/png','image/jpeg','image/webp'].includes(selectedFile.type))throw new Error('Use PNG, JPG or WebP.');
        if(selectedFile.size>3*1024*1024)throw new Error('Image exceeds 3 MB.');
        const raw=await readImage(selectedFile);
        const up=await ApiService.uploadClinicalInsightImage(raw,selectedFile.type);
        if(!up.success||!up.data?.imageFileId)throw new Error(up.message||'Upload failed.');
        id=up.data.imageFileId;
      }
      const result=await ApiService.saveClinicalInsight({imageFileId:id,displayOrder:order,active:true,mode});
      if(!result.success)throw new Error(result.message||'Unable to save insight.');
      setNotice(mode==='TODAY'?"Today's manual insight has been scheduled.":'Image added to daily rotation.');
      setImageId('');setSelectedFile(null);setOrder(v=>v+1);
      const input=document.getElementById('cne-insight-upload') as HTMLInputElement|null;if(input)input.value='';
      await reload();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save image.');}finally{setBusy(false);}
  };
  const sync=async()=>{
    setError('');setNotice('');setBusy(true);
    try{
      const res=await ApiService.syncClinicalInsightFolder();
      if(!res.success)throw new Error(res.message||'Sync failed.');
      setNotice(`Added ${res.data?.added||0} numbered images from Drive. New imports are INACTIVE until reviewed and activated.`);
      await reload();
    }catch(e){setError(e instanceof Error?e.message:'Sync failed.');}finally{setBusy(false);}
  };
  const toggle=async(item:ClinicalInsight)=>{
    setBusy(true);setError('');setNotice('');
    try{
      const res=await ApiService.saveClinicalInsight({insightId:item.insightId,imageFileId:item.imageFileId,displayOrder:item.displayOrder,active:!item.active,overrideDate:item.overrideDate});
      if(!res.success)throw new Error(res.message||'Unable to update.');
      setNotice(`Image ${item.displayOrder} ${item.active?'deactivated':'activated'} successfully.`);await reload();
    }catch(e){setError(e instanceof Error?e.message:'Update failed.');}finally{setBusy(false);}
  };
  const showPreview=async(item:ClinicalInsight)=>{
    setBusy(true);setError('');
    try{const r=await ApiService.getClinicalInsightImage(item.insightId);
      if(!r.success||!r.data?.base64Data)throw new Error(r.message||'Image not available.');
      setPreview(`data:${r.data.mimeType};base64,${r.data.base64Data}`);
    }catch(e){setError(e instanceof Error?e.message:'Preview failed.');}finally{setBusy(false);}
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-teal-700 p-2 text-white"><BookImage className="h-5 w-5"/></div><div><h2 className="text-base font-extrabold text-slate-900">Daily Clinical Insight Images</h2><p className="text-sm text-slate-600">One complete poster with embedded explanation per day. No Gemini or text fields.</p></div></div>
    </div>
    {error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {notice&&<div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</div>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><CloudUpload className="h-5 w-5 text-teal-700"/> Add a manual image</h3>
        <p className="mb-4 text-xs text-slate-600">Upload a completed clinical poster (PNG/JPG/WebP, up to 3 MB), or paste the Drive File ID of an existing poster in the dedicated folder.</p>
        <label htmlFor="cne-insight-upload" className="mb-1 block text-xs font-semibold text-slate-700">Image file</label>
        <input id="cne-insight-upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>setSelectedFile(e.target.files?.[0]||null)} className="mb-3 block w-full rounded-lg border border-slate-200 p-2 text-xs"/>
        <label htmlFor="cne-insight-id" className="mb-1 block text-xs font-semibold text-slate-700">Or existing Drive File ID</label>
        <input id="cne-insight-id" value={imageId} disabled={busy} onChange={e=>setImageId(e.target.value)} placeholder="Drive File ID" className="mb-3 w-full rounded-lg border border-slate-200 p-2.5 text-sm"/>
        <div className="mb-3 grid grid-cols-2 gap-3"><div><label htmlFor="cne-insight-order" className="mb-1 block text-xs font-semibold">Display order</label><input id="cne-insight-order" type="number" min={1} value={order} onChange={e=>setOrder(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></div><div><label htmlFor="cne-insight-mode" className="mb-1 block text-xs font-semibold">Display mode</label><select id="cne-insight-mode" value={mode} onChange={e=>setMode(e.target.value as 'ROTATION'|'TODAY')} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"><option value="ROTATION">Regular rotation</option><option value="TODAY">Show today only</option></select></div></div>
        <button type="button" disabled={busy} onClick={()=>void submit()} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>} Save Insight</button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><FolderSync className="h-5 w-5 text-teal-700"/> Import numbered Drive images</h3>
        <p className="mb-3 text-sm text-slate-600">Upload <strong>CI_001.png</strong>, <strong>CI_002.png</strong> ... into the private <strong>Clinical Insight Images</strong> Drive folder first.</p>
        <p className="mb-4 text-xs text-slate-500">Sync automatically detects file IDs and display order. Newly imported images start INACTIVE so you can review them before publishing. There are no public Drive links.</p>
        <button type="button" disabled={busy} onClick={()=>void sync()} className="inline-flex items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 disabled:opacity-50"><FolderSync className="h-4 w-4"/> Sync Drive Folder</button>
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-teal-700"/> Image library <span className="ml-auto text-xs font-medium text-slate-500">{items.filter(x=>x.active).length} active / {items.length} total</span></h3>
      {loading?<div role="status" className="flex justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-teal-600"/></div>:items.length===0?<p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No insight images yet. Upload a poster or sync a Drive folder.</p>:<div className="max-h-[480px] space-y-2 overflow-y-auto">{items.map(item=><div key={item.insightId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"><div className="min-w-0"><p className="text-sm font-bold text-slate-900">Image {item.displayOrder}{item.overrideDate?` · Override ${item.overrideDate}`:''}</p><p className="max-w-[370px] truncate text-[11px] text-slate-500">{item.imageFileId}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.active?'bg-teal-100 text-teal-800':'bg-slate-200 text-slate-700'}`}>{item.active?'ACTIVE':'INACTIVE'}</span><button type="button" disabled={busy} onClick={()=>void showPreview(item)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"><ImageIcon className="mr-1 inline h-3 w-3"/>View</button><button type="button" disabled={busy} onClick={()=>void toggle(item)} className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800">{item.active?'Deactivate':'Activate'}</button></div></div>)}</div>}
    </div>
    {preview&&<div role="dialog" aria-modal="true" aria-label="Clinical insight poster preview" className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/90 p-4" onClick={()=>setPreview('')}><button type="button" className="absolute right-5 top-5 rounded bg-white px-3 py-2 text-sm font-semibold" onClick={()=>setPreview('')}>Close ✕</button><img src={preview} alt="Clinical nursing educational poster" className="max-h-[90vh] max-w-[95vw] object-contain" onClick={e=>e.stopPropagation()}/></div>}
  </div>;
};
