import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PlusCircle,
  Search,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { SessionUser, TeachingMode } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';

interface AdminTeachingModesProps {
  user: SessionUser;
}

export const AdminTeachingModes: React.FC<AdminTeachingModesProps> = () => {
  const [modes, setModes] = useState<TeachingMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newModeName, setNewModeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState<string | null>(null);
  const savingRef = useRef<string | null>(null);

  const [togglingName, setTogglingName] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const [deactivatingMode, setDeactivatingMode] = useState<TeachingMode | null>(null);

  const { success, error } = useToast();

  const loadModes = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getTeachingModes();
      if (res.success && Array.isArray(res.data)) {
        setModes(res.data);
      } else {
        error(res.message || 'Failed to load Teaching Modes.');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to load Teaching Modes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModes();
  }, []);

  const handleAddMode = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newModeName.trim();
    if (!name || submittingRef.current || isSubmitting) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await ApiService.addTeachingMode(name);
      if (res.success) {
        success(`Teaching Mode "${name}" added successfully.`, 'Teaching Mode Added');
        setIsAddOpen(false);
        setNewModeName('');
        await loadModes();
      } else {
        error(res.message || 'Failed to add Teaching Mode.');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to add Teaching Mode.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (mode: TeachingMode) => {
    const name = editName.trim();
    if (!name) {
      error('Teaching Mode name cannot be blank.');
      return;
    }
    if (name.toLowerCase() === mode.name.trim().toLowerCase()) {
      setEditingName(null);
      setEditName('');
      return;
    }
    if (savingRef.current || savingName || togglingName) return;

    savingRef.current = mode.name;
    setSavingName(mode.name);
    try {
      const res = await ApiService.updateTeachingMode(mode.name, name, mode.status);
      if (res.success) {
        success(`Teaching Mode renamed to "${name}".`, 'Teaching Mode Updated');
        setEditingName(null);
        setEditName('');
        await loadModes();
      } else {
        error(res.message || 'Failed to rename Teaching Mode.');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to rename Teaching Mode.');
    } finally {
      savingRef.current = null;
      setSavingName(null);
    }
  };

  const handleToggleStatus = async (mode: TeachingMode) => {
    if (togglingRef.current || togglingName || savingName) return;
    togglingRef.current = mode.name;
    setTogglingName(mode.name);
    const newStatus: TeachingMode['status'] = mode.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await ApiService.updateTeachingMode(mode.name, mode.name, newStatus);
      if (res.success) {
        success(`Teaching Mode "${mode.name}" marked as ${newStatus}.`, 'Status Updated');
        await loadModes();
      } else {
        error(res.message || 'Failed to update Teaching Mode status.');
      }
    } catch (err: any) {
      error(err?.message || 'Failed to update Teaching Mode status.');
    } finally {
      togglingRef.current = null;
      setTogglingName(null);
    }
  };

  const handleStatusClick = (mode: TeachingMode) => {
    if (savingName || togglingName || togglingRef.current) return;
    if (mode.status === 'ACTIVE') {
      setDeactivatingMode(mode);
    } else {
      handleToggleStatus(mode);
    }
  };

  const filteredModes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...modes]
      .filter((mode) => {
        if (statusFilter !== 'ALL' && mode.status !== statusFilter) return false;
        if (query && !mode.name.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [modes, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">Teaching Modes</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800">
                  Total: {modes.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage the Teaching Mode choices available for new CNE programmes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadModes}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Teaching Modes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            id="btn-admin-add-teaching-mode"
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Teaching Mode</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Teaching Mode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 w-full sm:w-auto">
          <span>Filter Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            Active Only
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            Inactive
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <span className="text-xs font-medium">Loading Teaching Modes</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4 w-14 text-center">Sr.</th>
                  <th className="py-3 px-4">Teaching Mode</th>
                  <th className="py-3 px-4 w-36 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400">
                      No Teaching Modes found.
                    </td>
                  </tr>
                ) : (
                  filteredModes.map((mode, index) => {
                    const isEditing = editingName === mode.name;
                    return (
                      <tr key={mode.name} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-lg">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEdit(mode);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingName(null);
                                    setEditName('');
                                  }
                                }}
                                disabled={savingName === mode.name}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs w-full focus:outline-hidden focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                placeholder="Teaching Mode name"
                                autoFocus
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(mode)}
                                  disabled={savingName === mode.name}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                                >
                                  {savingName === mode.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingName(null);
                                    setEditName('');
                                  }}
                                  disabled={savingName === mode.name}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingName(mode.name);
                                setEditName(mode.name);
                              }}
                              disabled={Boolean(savingName || togglingName)}
                              aria-label={`Rename ${mode.name}`}
                              title="Click to rename Teaching Mode"
                              className="group inline-flex items-center gap-2 text-left font-semibold text-slate-900 hover:text-teal-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="break-words">{mode.name}</span>
                              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-teal-600 transition-colors opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleStatusClick(mode)}
                            disabled={Boolean(savingName || togglingName)}
                            title={mode.status === 'ACTIVE' ? 'Click to deactivate this Teaching Mode' : 'Click to activate this Teaching Mode'}
                            aria-label={mode.status === 'ACTIVE' ? `Deactivate ${mode.name}` : `Activate ${mode.name}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${mode.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                          >
                            {togglingName === mode.name && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span className="text-[9px]">{mode.status === 'ACTIVE' ? '🟢' : '⚪'}</span>
                            <span>{mode.status}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deactivatingMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setDeactivatingMode(null)}
              disabled={Boolean(togglingName)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 disabled:opacity-40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-2">Deactivate {deactivatingMode.name}?</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              <strong className="font-semibold text-slate-900">{deactivatingMode.name}</strong> will no longer be available for new CNEs.
              <br />
              Existing and historical CNE records using this Teaching Mode will remain available.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivatingMode(null)}
                disabled={Boolean(togglingName)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deactivatingMode;
                  setDeactivatingMode(null);
                  await handleToggleStatus(target);
                }}
                disabled={Boolean(togglingName)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <span>Deactivate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 disabled:opacity-40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Teaching Mode</h3>
                <p className="text-xs text-slate-500">Adds a new ACTIVE option to CNE dropdowns</p>
              </div>
            </div>
            <form onSubmit={handleAddMode} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Teaching Mode Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bedside Teaching"
                  value={newModeName}
                  onChange={(e) => setNewModeName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newModeName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : null}
                  <span>{isSubmitting ? 'Adding...' : 'Save Teaching Mode'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
