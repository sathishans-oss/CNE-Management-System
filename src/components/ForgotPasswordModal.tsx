import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { ApiService } from '../services/api';
import { useToast } from './Toast';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin?: () => void;
}

type PasswordFlowStep = 'EMPLOYEE' | 'OTP' | 'PASSWORD' | 'SUCCESS';

const PASSWORD_MIN_LENGTH = 8;

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin
}) => {
  const [step, setStep] = useState<PasswordFlowStep>('EMPLOYEE');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const loadingRef = useRef(false);

  const { success, error } = useToast();

  const resetFlow = () => {
    setStep('EMPLOYEE');
    setEmployeeId('');
    setEmployeeName('');
    setMaskedEmail('');
    setChallengeId('');
    setOtp('');
    setVerificationToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResendSeconds(0);
    setLoading(false);
    setErrorMsg('');
    loadingRef.current = false;
  };

  useEffect(() => {
    if (isOpen) resetFlow();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, resendSeconds]);

  if (!isOpen) return null;

  const cleanEmployeeId = employeeId.trim().toUpperCase();

  const setRequestError = (message: string, title = 'Unable to Continue') => {
    setErrorMsg(message);
    error(message, title);
  };

  const beginLoading = () => {
    if (loadingRef.current || loading) return false;
    loadingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    return true;
  };

  const endLoading = () => {
    loadingRef.current = false;
    setLoading(false);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cleanEmployeeId) {
      setErrorMsg('Employee ID is required.');
      return;
    }
    if (!beginLoading()) return;

    try {
      const response = await ApiService.requestPasswordOtp(cleanEmployeeId);
      if (!response.success || !response.data) {
        setRequestError(response.message || 'Unable to send verification code.');
        return;
      }

      setEmployeeId(cleanEmployeeId);
      setChallengeId(response.data.challengeId);
      setMaskedEmail(response.data.maskedEmail || 'your registered email');
      setEmployeeName(response.data.employeeName || '');
      setOtp('');
      setVerificationToken('');
      setResendSeconds(Math.max(0, Number(response.data.resendAfterSeconds) || 60));
      setStep('OTP');
      success('A 6-digit verification code has been sent to your registered email.', 'Verification Code Sent');
    } catch (err: any) {
      setRequestError(err?.message || 'Unable to send verification code.');
    } finally {
      endLoading();
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || loading) return;
    await handleSendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Enter the 6-digit verification code sent to your registered email.');
      return;
    }
    if (!challengeId) {
      setErrorMsg('Verification session is missing. Please request a new code.');
      return;
    }
    if (!beginLoading()) return;

    try {
      const response = await ApiService.verifyPasswordOtp(cleanEmployeeId, challengeId, cleanOtp);
      if (!response.success || !response.data?.verificationToken) {
        setRequestError(response.message || 'Verification code could not be verified.', 'Verification Failed');
        return;
      }

      setVerificationToken(response.data.verificationToken);
      setOtp('');
      setErrorMsg('');
      setStep('PASSWORD');
      success('Registered email verified successfully.', 'Email Verified');
    } catch (err: any) {
      setRequestError(err?.message || 'Verification code could not be verified.', 'Verification Failed');
    } finally {
      endLoading();
    }
  };

  const validatePassword = () => {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return 'Password must contain at least one letter and one number.';
    }
    if (newPassword !== confirmPassword) {
      return 'New password and confirmation password do not match.';
    }
    return '';
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePassword();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    if (!verificationToken) {
      setErrorMsg('Email verification has expired. Please request a new verification code.');
      return;
    }
    if (!beginLoading()) return;

    try {
      const response = await ApiService.setPasswordWithOtp(cleanEmployeeId, verificationToken, newPassword);
      if (!response.success) {
        if (response.errorCode === 'VERIFICATION_EXPIRED' || response.errorCode === 'VERIFICATION_ALREADY_USED') {
          setVerificationToken('');
          setChallengeId('');
          setOtp('');
          setStep('EMPLOYEE');
        }
        setRequestError(response.message || 'Unable to create or reset your password.', 'Password Update Failed');
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setVerificationToken('');
      setStep('SUCCESS');
      success(response.message || 'Password created successfully. You can now log in.', 'Password Ready');
    } catch (err: any) {
      setRequestError(err?.message || 'Unable to create or reset your password.', 'Password Update Failed');
    } finally {
      endLoading();
    }
  };

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  const handleReturnToLogin = () => {
    resetFlow();
    (onBackToLogin || onClose)();
  };

  const handleChangeEmployee = () => {
    setStep('EMPLOYEE');
    setEmployeeName('');
    setMaskedEmail('');
    setChallengeId('');
    setOtp('');
    setVerificationToken('');
    setResendSeconds(0);
    setErrorMsg('');
  };

  const stepLabel = step === 'EMPLOYEE' ? '1 of 3' : step === 'OTP' ? '2 of 3' : step === 'PASSWORD' ? '3 of 3' : 'Complete';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 relative overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <button
            id="btn-close-forgot-pass"
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-50 cursor-pointer"
            aria-label="Close Create or Reset Password"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Create / Reset Password</h2>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                  {stepLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Verification uses the registered email in Officers data.</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 'SUCCESS' ? (
            <div className="text-center py-3 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Password Ready</h3>
                <p className="text-sm text-slate-700 mt-1">Your password has been created or reset successfully.</p>
                <p className="text-xs text-slate-500 mt-2">Use Employee ID <span className="font-semibold text-slate-700">{cleanEmployeeId}</span> and your new password to log in.</p>
              </div>
              <button
                id="btn-forgot-pass-return-login"
                type="button"
                onClick={handleReturnToLogin}
                className="w-full py-2.5 px-4 bg-teal-800 text-white rounded-lg text-sm font-semibold hover:bg-teal-900 cursor-pointer"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {step === 'EMPLOYEE' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="rounded-xl bg-teal-50/60 border border-teal-200 p-3 text-xs text-teal-900">
                    Enter your Employee ID. A verification code will be sent only to the email registered against your Employee ID in <strong>Officers data</strong>.
                  </div>

                  <div>
                    <label htmlFor="password-reset-employee-id" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Employee ID No.
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="password-reset-employee-id"
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="Example ID: RSNHO000001"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                        disabled={loading}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-700 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-send-password-otp"
                    type="submit"
                    disabled={loading || !cleanEmployeeId}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-800 text-white rounded-lg text-sm font-semibold hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>{loading ? 'Sending verification code...' : 'Send Verification Code'}</span>
                  </button>
                </form>
              )}

              {step === 'OTP' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {employeeName ? `${employeeName} • ` : ''}{cleanEmployeeId}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">Code sent to <span className="font-semibold">{maskedEmail}</span></p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password-reset-otp" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="password-reset-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={loading}
                      placeholder="000000"
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-lg text-center text-xl font-bold tracking-[0.35em] focus:outline-hidden focus:ring-2 focus:ring-teal-700 disabled:opacity-60"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">The code expires after 10 minutes and can be used only once.</p>
                  </div>

                  <button
                    id="btn-verify-password-otp"
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-800 text-white rounded-lg text-sm font-semibold hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
                  </button>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleChangeEmployee}
                      disabled={loading}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Employee ID
                    </button>
                    <button
                      id="btn-resend-password-otp"
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || resendSeconds > 0}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}

              {step === 'PASSWORD' && (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">Registered email verified</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">Create a personal password for {cleanEmployeeId}. This same flow is used for future password resets.</p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password-reset-new-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password-reset-new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={loading}
                        placeholder="Minimum 8 characters"
                        className="w-full px-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-700 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">Use at least 8 characters with at least one letter and one number.</p>
                  </div>

                  <div>
                    <label htmlFor="password-reset-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password-reset-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        placeholder="Re-enter new password"
                        className="w-full px-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-700 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-700 cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn-set-password-with-otp"
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-800 text-white rounded-lg text-sm font-semibold hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>{loading ? 'Saving password...' : 'Create / Reset Password'}</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
