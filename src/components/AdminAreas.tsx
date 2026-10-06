import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Search,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Area, SessionUser } from '../types';
import { ApiService } from '../services/api';
import { useToast } from './Toast';

interface AdminAreasProps {
  user: SessionUser;
}

export const AdminAreas: React.FC<AdminAreasProps> = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add Area Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Edit Area Inline (Directly on Ward / Area Name)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const savingEditRef = useRef<string | null>(null);

  // Status toggle & confirmation
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const [deactivatingArea, setDeactivatingArea] = useState<Area | null>(null);

  const { success, error } = useToast();

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getAreas();
      if (res.success && res.data) {
        setAreas(res.data);
      }
    } catch (e: any) {
      error('Failed to load areas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim() || submittingRef.current || isSubmitting) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await ApiService.addArea(newAreaName.trim());
      if (res.success) {
        success(`Area "${newAreaName.trim()}" added successfully.`, 'Area Added');
        setIsAddOpen(false);
        setNewAreaName('');
        await loadAreas();
      } else {
        error(res.message || 'Failed to add area.');
      }
    } catch (err: any) {
      error(err?.message || 'Error adding area.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleStatusClick = (area: Area) => {
    if (savingEditId || togglingId || togglingRef.current) return;
    if (area.status === 'ACTIVE') {
      setDeactivatingArea(area);
    } else {
      handleToggleStatus(area);
    }
  };

  const handleToggleStatus = async (area: Area) => {
    if (togglingRef.current || togglingId || savingEditId) return;
    togglingRef.current = area.id;
    const newStatus = area.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingId(area.id);
    try {
      const res = await ApiService.updateArea(area.name, area.name, newStatus);
      if (res.success) {
        success(`Area "${area.name}" marked as ${newStatus}.`, 'Status Updated');
        await loadAreas();
      } else {
        error(res.message || 'Failed to update area status.');
      }
    } catch (err: any) {
      error(err?.message || 'Error updating area status.');
    } finally {
      togglingRef.current = null;
      setTogglingId(null);
    }
  };

  const handleSaveEdit = async (area: Area) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      error('Area name cannot be blank.');
      return;
    }
    if (trimmed.toLowerCase() === area.name.trim().toLowerCase()) {
      setEditingId(null);
      setEditName('');
      return;
    }
    if (savingEditRef.current || savingEditId || togglingId) return;
    savingEditRef.current = area.id;
    setSavingEditId(area.id);
    try {
      const res = await ApiService.updateArea(area.name, trimmed, area.status);
      if (res.success) {
        success(`Area renamed to "${trimmed}" successfully.`, 'Area Updated');
        setEditingId(null);
        setEditName('');
        await loadAreas();
      } else {
        error(res.message || 'Failed to update area name.');
      }
    } catch (err: any) {
      error(err?.message || 'Error updating area name.');
    } finally {
      savingEditRef.current = null;
      setSavingEditId(null);
    }
  };

  const filteredAreas = areas.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchTerm.trim() && !(a.name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Ward List</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800">
              Total Areas: {areas.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage hospital departments, wards, OT complexes, ICUs, and outpatient training areas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAreas}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh areas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            id="btn-admin-add-area"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Ward/Area</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search ward or clinical area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 w-full sm:w-auto">
          <span>Filter Status:</span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Areas Table - Redesigned to contain only Ward / Area Name and Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <span className="text-xs font-medium">Loading data</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4 w-14 text-center">Sr.</th>
                  <th className="py-3 px-4">Ward / Area Name</th>
                  <th className="py-3 px-4 w-36 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAreas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400">
                      No wards or clinical areas found.
                    </td>
                  </tr>
                ) : (
                  filteredAreas.map((area, index) => {
                    const isEditing = editingId === area.id;

                    return (
                      <tr key={area.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                          {index + 1}
                        </td>

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
                                    handleSaveEdit(area);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingId(null);
                                    setEditName('');
                                  }
                                }}
                                disabled={savingEditId === area.id}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs w-full focus:outline-hidden focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                placeholder="Ward / Area name"
                                autoFocus
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(area)}
                                  disabled={savingEditId === area.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-2xs transition-colors"
                                  title="Save changes"
                                >
                                  {savingEditId === area.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditName('');
                                  }}
                                  disabled={savingEditId === area.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors"
                                  title="Cancel edit"
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
                                setEditingId(area.id);
                                setEditName(area.name);
                              }}
                              disabled={Boolean(savingEditId || togglingId)}
                              aria-label={`Rename ${area.name}`}
                              title="Click to rename ward/area"
                              className="group inline-flex items-center gap-2 text-left font-semibold text-slate-900 hover:text-teal-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="break-words">{area.name}</span>
                              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-teal-600 transition-colors opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleStatusClick(area)}
                            disabled={Boolean(savingEditId || togglingId)}
                            title={
                              area.status === 'ACTIVE'
                                ? 'Click to deactivate this ward/area'
                                : 'Click to activate this ward/area'
                            }
                            aria-label={
                              area.status === 'ACTIVE'
                                ? `Deactivate ${area.name}`
                                : `Activate ${area.name}`
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                              area.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {togglingId === area.id && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            <span className="text-[9px]">{area.status === 'ACTIVE' ? '🟢' : '⚪'}</span>
                            <span>{area.status}</span>
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

      {/* Deactivation Confirmation Modal */}
      {deactivatingArea && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setDeactivatingArea(null)}
              disabled={Boolean(togglingId)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 disabled:opacity-40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              Deactivate {deactivatingArea.name}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              <strong className="font-semibold text-slate-900">{deactivatingArea.name}</strong> will no longer be available for new CNEs or new Area Incharge assignments.
              <br />
              Existing and historical CNE records will remain available.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivatingArea(null)}
                disabled={Boolean(togglingId)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deactivatingArea;
                  setDeactivatingArea(null);
                  await handleToggleStatus(target);
                }}
                disabled={Boolean(togglingId)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {togglingId === deactivatingArea.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Deactivate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
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
                <h3 className="text-base font-bold text-slate-900">Add Clinical Area</h3>
                <p className="text-xs text-slate-500">Adds area to master dropdown choices</p>
              </div>
            </div>

            <form onSubmit={handleAddArea} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Area / Ward Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 248A(IPD)-(Vascular Surgery)"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Adding Area...</span>
                    </>
                  ) : (
                    <span>Save Area</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
