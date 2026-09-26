import React, { useState, useRef, useEffect } from 'react';
import { X, KeyRound, AlertCircle, ShieldAlert } from 'lucide-react';
import { ApiService } from '../services/api';
import { SessionUser } from '../types';
import { useToast } from './Toast';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: SessionUser | null;
  forced?: boolean;
  onPasswordChanged?: (updatedUser?: SessionUser) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  forced = false,
  onPasswordChanged
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { success, error } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !forced && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, forced, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingRef.current || loading) return;

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await ApiService.changePassword(newPassword.trim());
      if (response.success) {
        success('Your password has been changed successfully.', 'Password Updated');
        if (onPasswordChanged) {
          onPasswordChanged(response.data);
        }
        onClose();
      } else {
        setErrorMsg(response.message || 'Failed to change password.');
        error(response.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Server error.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        // Prevent dismissal on click outside if forced
        if (!forced && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-8">
        {!forced && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            forced ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-800 border-slate-300'
          }`}>
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {forced ? 'Set Your Personal Password' : 'Change Password'}
            </h2>
            <p className="text-xs text-slate-500">
              {forced ? 'Mandatory account security update' : 'Update your CNE account access security'}
            </p>
          </div>
        </div>

        {forced && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Security Setup Required</p>
              <p className="text-amber-800 mt-0.5">
                You must set your personal password before continuing to the CNE Portal.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-800"
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-lg disabled:opacity-50 cursor-pointer shadow-xs transition-colors ${
                forced ? 'bg-teal-800 hover:bg-teal-900 w-full' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {loading ? 'Saving Security Credentials...' : forced ? 'Save Password & Continue to Portal' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
