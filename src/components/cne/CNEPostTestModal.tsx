import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  UserRound,
  X,
  XCircle
} from 'lucide-react';
import { SessionUser, CNEQuestion, PostTestSubmissionResult } from '../../types';
import {
  ApiService,
  PostTestParticipantVerificationData
} from '../../services/api';
import { useToast } from '../Toast';

interface CNEPostTestModalProps {
  cneId?: string;
  qrToken?: string;
  user: SessionUser | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

type ParticipantType = 'INTERNAL' | 'EXTERNAL';

// Public QR participants now use email OTP verification. Internal participants provide
// Employee ID only; the registered email is resolved from Officers data. External
// participants provide Name + Email and are registered only after OTP verification.

const normalizeEmployeeId = (value: string) => value.trim().toUpperCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const CNEPostTestModal: React.FC<CNEPostTestModalProps> = ({
  cneId,
  qrToken,
  user,
  onClose,
  onSubmitted
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [flowError, setFlowError] = useState('');
  const [participantType, setParticipantType] = useState<ParticipantType>('INTERNAL');

  const [internalEmployeeId, setInternalEmployeeId] = useState(user?.employeeId || '');
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(0);
  const [resendRemaining, setResendRemaining] = useState(0);

  const [verifiedParticipant, setVerifiedParticipant] = useState<PostTestParticipantVerificationData | null>(null);
  const [participantVerificationToken, setParticipantVerificationToken] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [priorSubmission, setPriorSubmission] = useState<any>(null);
  const [resolvedCneId, setResolvedCneId] = useState(cneId || '');
  const [questions, setQuestions] = useState<CNEQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<PostTestSubmissionResult | null>(null);

  const submittingRef = useRef(false);
  const flowRequestRef = useRef(0);
  const flowKeyRef = useRef('');
  const contentRef = useRef<HTMLDivElement | null>(null);

  const { success, error, warning } = useToast();

  const isPublicQrFlow = Boolean(qrToken);
  const isDirectAuthenticatedFlow = Boolean(!qrToken && cneId && user?.employeeId);
  const flowKey = `${cneId || ''}|${qrToken || ''}|${user?.employeeId || ''}|${user?.token || ''}`;
  flowKeyRef.current = flowKey;

  const scrollContentToTop = () => {
    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const resetQuestionState = () => {
    setQuestions([]);
    setAnswers({});
    setAlreadySubmitted(false);
    setPriorSubmission(null);
    setSubmissionResult(null);
  };

  const resetOtpChallenge = () => {
    setOtpChallengeId('');
    setOtpCode('');
    setMaskedEmail('');
    setOtpExpiresInSeconds(0);
    setResendRemaining(0);
  };

  useEffect(() => {
    if (resendRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setResendRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendRemaining]);

  const handleLoadFailure = (res: { errorCode?: string; message?: string }) => {
    const message = res.message || 'Failed to load post-test evaluation.';
    if (res.errorCode === 'PARTICIPANT_VERIFICATION_REQUIRED') {
      setParticipantVerificationToken('');
      setVerifiedParticipant(null);
      resetOtpChallenge();
      resetQuestionState();
      setVerificationError('Participant verification has expired. Please request and verify a new email code.');
      error('Participant verification has expired. Please verify again.', 'Verification Required');
      return;
    }
    if (res.errorCode === 'CNE_CLOSED') {
      resetQuestionState();
      setFlowError(message);
      return;
    }
    setFlowError(message);
    error(message);
  };

  const loadTest = async (params: {
    requestId: number;
    requestFlowKey: string;
    employeeId?: string;
    verificationToken?: string;
    participant?: PostTestParticipantVerificationData | null;
  }) => {
    const { requestId, requestFlowKey, employeeId, verificationToken, participant } = params;
    const isCurrent = () => requestId === flowRequestRef.current && requestFlowKey === flowKeyRef.current;

    setLoading(true);
    setFlowError('');
    try {
      const res = await ApiService.getPostTestQuestions({
        cneId: isPublicQrFlow ? undefined : (cneId || resolvedCneId),
        qrToken,
        employeeId: employeeId || undefined,
        participantVerificationToken: verificationToken || undefined
      });

      if (!isCurrent()) return;

      if (res.success && res.data) {
        setResolvedCneId(res.data.cneId);
        setAlreadySubmitted(Boolean(res.data.alreadySubmitted));
        setPriorSubmission(res.data.submission || null);
        setQuestions(res.data.alreadySubmitted ? [] : (res.data.questions || []));
        setAnswers({});

        if (participant) {
          setVerifiedParticipant(participant);
        } else if (isDirectAuthenticatedFlow && user?.employeeId) {
          setVerifiedParticipant({
            cneId: res.data.cneId,
            participantType: 'INTERNAL',
            participantId: normalizeEmployeeId(user.employeeId),
            employeeId: normalizeEmployeeId(user.employeeId),
            participantName: res.data.participantName || user.name || user.employeeId,
            designation: user.designation || '',
            verificationToken: ''
          });
        }
      } else {
        handleLoadFailure(res || {});
      }
    } catch (e: any) {
      if (!isCurrent()) return;
      const message = e?.message || 'Error occurred while loading test questions.';
      setFlowError(message);
      error(message);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = ++flowRequestRef.current;
    const requestFlowKey = flowKey;

    setLoading(false);
    setVerificationLoading(false);
    setVerificationError('');
    setFlowError('');
    setParticipantType('INTERNAL');
    setInternalEmployeeId(user?.employeeId || '');
    setExternalName('');
    setExternalEmail('');
    resetOtpChallenge();
    setVerifiedParticipant(null);
    setParticipantVerificationToken('');
    setResolvedCneId(cneId || '');
    resetQuestionState();

    if (isDirectAuthenticatedFlow && user?.employeeId) {
      loadTest({
        requestId,
        requestFlowKey,
        employeeId: normalizeEmployeeId(user.employeeId)
      });
    } else if (!isPublicQrFlow) {
      setFlowError('A valid Post-Test QR token or authenticated CNE session is required.');
    }

    return () => {
      flowRequestRef.current += 1;
    };
    // flowKey intentionally captures CNE / QR / signed-in-account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowKey]);

  const handleParticipantTypeChange = (nextType: ParticipantType) => {
    if (verificationLoading || loading || isSubmitting) return;
    flowRequestRef.current += 1;
    setParticipantType(nextType);
    setVerificationError('');
    setFlowError('');
    setVerifiedParticipant(null);
    setParticipantVerificationToken('');
    resetOtpChallenge();
    resetQuestionState();
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qrToken || verificationLoading || loading || resendRemaining > 0) return;

    const employeeId = normalizeEmployeeId(internalEmployeeId);
    const name = externalName.trim();
    const emailAddress = normalizeEmail(externalEmail);

    if (participantType === 'INTERNAL' && !employeeId) {
      setVerificationError('Please enter your Employee ID.');
      return;
    }
    if (participantType === 'EXTERNAL' && (name.length < 2 || !emailAddress)) {
      setVerificationError('Please enter your name and a valid email address.');
      return;
    }

    const requestId = ++flowRequestRef.current;
    const requestFlowKey = flowKeyRef.current;
    const isCurrent = () => requestId === flowRequestRef.current && requestFlowKey === flowKeyRef.current;

    setVerificationError('');
    setFlowError('');
    setVerificationLoading(true);
    setOtpCode('');
    resetQuestionState();

    try {
      const res = participantType === 'INTERNAL'
        ? await ApiService.requestPostTestOtp({
            qrToken,
            participantType: 'INTERNAL',
            employeeId
          })
        : await ApiService.requestPostTestOtp({
            qrToken,
            participantType: 'EXTERNAL',
            name,
            email: emailAddress
          });

      if (!isCurrent()) return;

      if (!res.success || !res.data) {
        const message = res.message || 'Unable to send the verification code.';
        if (res.errorCode === 'CNE_CLOSED') setFlowError(message);
        else setVerificationError(message);
        error(message, 'OTP Not Sent');
        return;
      }

      setOtpChallengeId(res.data.challengeId);
      setMaskedEmail(res.data.maskedEmail || '');
      setOtpExpiresInSeconds(Number(res.data.expiresInSeconds || 0));
      setResendRemaining(Number(res.data.resendAfterSeconds || 60));
      success(`Verification code sent to ${res.data.maskedEmail}.`, 'OTP Sent');
    } catch (err: any) {
      if (!isCurrent()) return;
      const message = err?.message || 'Connection error. Please try again.';
      setVerificationError(message);
      error(message, 'Connection Error');
    } finally {
      if (isCurrent()) setVerificationLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken || verificationLoading || loading || !otpChallengeId) return;

    const employeeId = normalizeEmployeeId(internalEmployeeId);
    const name = externalName.trim();
    const emailAddress = normalizeEmail(externalEmail);
    const otp = otpCode.replace(/\D/g, '').slice(0, 6);

    if (!/^\d{6}$/.test(otp)) {
      setVerificationError('Please enter the complete 6-digit verification code.');
      return;
    }

    const requestId = ++flowRequestRef.current;
    const requestFlowKey = flowKeyRef.current;
    const isCurrent = () => requestId === flowRequestRef.current && requestFlowKey === flowKeyRef.current;

    setVerificationError('');
    setFlowError('');
    setVerificationLoading(true);
    resetQuestionState();

    try {
      const res = participantType === 'INTERNAL'
        ? await ApiService.verifyPostTestOtp({
            qrToken,
            participantType: 'INTERNAL',
            employeeId,
            challengeId: otpChallengeId,
            otp
          })
        : await ApiService.verifyPostTestOtp({
            qrToken,
            participantType: 'EXTERNAL',
            name,
            email: emailAddress,
            challengeId: otpChallengeId,
            otp
          });

      if (!isCurrent()) return;

      if (!res.success || !res.data) {
        const message = res.message || 'Email verification failed.';
        if (res.errorCode === 'CNE_CLOSED') {
          setFlowError(message);
        } else {
          setVerificationError(message);
          if (res.errorCode === 'OTP_EXPIRED' || res.errorCode === 'OTP_LOCKED' || res.errorCode === 'OTP_INVALID') {
            resetOtpChallenge();
          }
        }
        error(message, 'Verification Failed');
        return;
      }

      const verified = res.data;
      setVerifiedParticipant(verified);
      setParticipantVerificationToken(verified.verificationToken);
      setResolvedCneId(verified.cneId);
      resetOtpChallenge();

      if (verified.participantType === 'INTERNAL') {
        setInternalEmployeeId(verified.employeeId || verified.participantId);
        success(`Verified: ${verified.participantName}`, 'Employee Verified');
      } else {
        setExternalName(verified.participantName);
        if (verified.email) setExternalEmail(verified.email);
        success('Email verified and external participant registered.', 'Verification Complete');
      }

      await loadTest({
        requestId,
        requestFlowKey,
        employeeId: verified.participantType === 'INTERNAL' ? (verified.employeeId || verified.participantId) : undefined,
        verificationToken: verified.verificationToken,
        participant: verified
      });
    } catch (err: any) {
      if (!isCurrent()) return;
      const message = err?.message || 'Connection error. Please try again.';
      setVerificationError(message);
      error(message, 'Connection Error');
    } finally {
      if (isCurrent()) setVerificationLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionKey: string) => {
    if (submittingRef.current || isSubmitting || submissionResult) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting || submissionResult) return;

    const directEmployeeId = isDirectAuthenticatedFlow ? normalizeEmployeeId(user?.employeeId || '') : '';
    const verifiedInternalEmployeeId = verifiedParticipant?.participantType === 'INTERNAL'
      ? normalizeEmployeeId(verifiedParticipant.employeeId || verifiedParticipant.participantId)
      : '';
    const targetEmployeeId = directEmployeeId || verifiedInternalEmployeeId;

    if (isPublicQrFlow && (!verifiedParticipant || !participantVerificationToken)) {
      warning('Please verify the participant before submitting the post-test.');
      return;
    }
    if (!isPublicQrFlow && !targetEmployeeId) {
      warning('Authenticated participant identity is required before submitting.');
      return;
    }
    if (questions.length === 0) {
      error('No questions available for this test.');
      return;
    }

    const unansweredCount = questions.filter((q) => !answers[q.id]).length;
    if (unansweredCount > 0) {
      if (!window.confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFlowError('');
    try {
      const res = await ApiService.submitPostTest({
        cneId: isPublicQrFlow ? undefined : resolvedCneId,
        qrToken,
        employeeId: targetEmployeeId || undefined,
        participantVerificationToken: isPublicQrFlow ? participantVerificationToken : undefined,
        answers
      });

      if (res.success && res.data) {
        setSubmissionResult(res.data);
        success(`Post-test submitted! Your score: ${res.data.score}/${res.data.totalQuestions} (${res.data.percentage}%)`);
        scrollContentToTop();
        if (onSubmitted) onSubmitted();
      } else if (res.errorCode === 'PARTICIPANT_VERIFICATION_REQUIRED') {
        setParticipantVerificationToken('');
        setVerifiedParticipant(null);
        resetQuestionState();
        setVerificationError('Participant verification expired. Please verify again before reopening the post-test.');
        error('Participant verification expired. Please verify again.', 'Verification Required');
        scrollContentToTop();
      } else if (res.errorCode === 'CNE_CLOSED') {
        resetQuestionState();
        setFlowError(res.message || 'This CNE has been finalized or canceled. The post-test is closed.');
        scrollContentToTop();
      } else {
        error(res.message || 'Failed to submit post-test.');
      }
    } catch (e: any) {
      error(e?.message || 'Error occurred while submitting evaluation.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const verifiedLabel = verifiedParticipant?.participantType === 'EXTERNAL'
    ? `${verifiedParticipant.participantName}${verifiedParticipant.email ? ` • ${verifiedParticipant.email}` : ''}`
    : `${verifiedParticipant?.participantName || user?.name || ''}${(verifiedParticipant?.employeeId || user?.employeeId) ? ` (${verifiedParticipant?.employeeId || user?.employeeId})` : ''}`;

  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-none sm:backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-[92vw] max-w-[1440px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">CNE Post-Test Evaluation</h3>
              {resolvedCneId && <p className="text-[11px] text-slate-500 mt-0.5">CNE ID: {resolvedCneId}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer disabled:opacity-40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div ref={contentRef} className="p-6 overflow-y-auto flex-1 bg-slate-50/40 text-xs">
          {flowError ? (
            <div className="py-14 max-w-lg mx-auto text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Post-Test Unavailable</h4>
                <p className="text-xs text-rose-700 mt-2 leading-relaxed bg-rose-50 border border-rose-200 rounded-xl p-3">{flowError}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                Close Window
              </button>
            </div>
          ) : isPublicQrFlow && !verifiedParticipant && !loading ? (
            /* Public QR participant email-OTP verification */
            <div className="py-8 max-w-xl mx-auto space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto border border-teal-200 shadow-xs">
                  <Mail className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Email Verification</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Verify your email before opening the Post-Test. Internal employees receive the code at the email registered in Officers data.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleParticipantTypeChange('INTERNAL')}
                  disabled={verificationLoading}
                  className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    participantType === 'INTERNAL'
                      ? 'bg-white text-teal-800 shadow-xs border border-teal-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Internal Employee
                </button>
                <button
                  type="button"
                  onClick={() => handleParticipantTypeChange('EXTERNAL')}
                  disabled={verificationLoading}
                  className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    participantType === 'EXTERNAL'
                      ? 'bg-white text-indigo-800 shadow-xs border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  External Participant
                </button>
              </div>

              {!otpChallengeId ? (
                <form onSubmit={handleRequestOtp} className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  {verificationError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{verificationError}</div>
                    </div>
                  )}

                  {participantType === 'INTERNAL' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Employee ID *</label>
                        <div className="relative">
                          <UserRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            autoComplete="off"
                            placeholder="e.g. RSNHO000001"
                            value={internalEmployeeId}
                            onChange={(e) => setInternalEmployeeId(e.target.value.toUpperCase())}
                            disabled={verificationLoading}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-700 shadow-xs disabled:bg-slate-50"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          The verification code will be sent to the registered EmailID in Officers data. You do not need to enter your email.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={verificationLoading || !internalEmployeeId.trim()}
                        className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending Code...</span></>
                        ) : (
                          <><Mail className="w-4 h-4" /><span>Send Verification Code</span></>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Participant Name *</label>
                        <div className="relative">
                          <UserRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            minLength={2}
                            autoComplete="name"
                            placeholder="Enter your full name"
                            value={externalName}
                            onChange={(e) => setExternalName(e.target.value)}
                            disabled={verificationLoading}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 shadow-xs disabled:bg-slate-50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Email *</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="name@example.com"
                            value={externalEmail}
                            onChange={(e) => setExternalEmail(e.target.value)}
                            disabled={verificationLoading}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 shadow-xs disabled:bg-slate-50"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Registration is saved only after this email address is successfully verified.</p>
                      </div>

                      <button
                        type="submit"
                        disabled={verificationLoading || externalName.trim().length < 2 || !externalEmail.trim()}
                        className="w-full py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending Code...</span></>
                        ) : (
                          <><Mail className="w-4 h-4" /><span>Send Verification Code</span></>
                        )}
                      </button>
                    </>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                    <div className="font-bold">Verification code sent</div>
                    <div className="mt-1">Enter the 6-digit code sent to <strong>{maskedEmail || 'your email'}</strong>.</div>
                    {otpExpiresInSeconds > 0 && (
                      <div className="text-[11px] text-indigo-700 mt-1">Code validity: approximately {Math.max(1, Math.ceil(otpExpiresInSeconds / 60))} minutes.</div>
                    )}
                  </div>

                  {verificationError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{verificationError}</div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">6-digit verification code *</label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={verificationLoading}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-center text-xl tracking-[0.35em] font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 shadow-xs disabled:bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verificationLoading || otpCode.length !== 6}
                    className={`w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${participantType === 'INTERNAL' ? 'bg-teal-800 hover:bg-teal-900' : 'bg-indigo-700 hover:bg-indigo-800'}`}
                  >
                    {verificationLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying Code...</span></>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /><span>Verify &amp; Open Post-Test</span></>
                    )}
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        flowRequestRef.current += 1;
                        setVerificationError('');
                        resetOtpChallenge();
                      }}
                      disabled={verificationLoading}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                    >
                      Change details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      disabled={verificationLoading || resendRemaining > 0}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {resendRemaining > 0 ? `Resend in ${resendRemaining}s` : 'Resend verification code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span>Loading post-test evaluation...</span>
            </div>
          ) : alreadySubmitted ? (
            /* Already Submitted View */
            <div className="py-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">Post-Test Already Completed</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  This participant has already completed the post-test. Repeated attempts are restricted to preserve evaluation integrity.
                </p>
              </div>

              {verifiedLabel && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {verifiedLabel}
                </div>
              )}

              {priorSubmission && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-left shadow-xs">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-500">Participant:</span>
                    <span className="font-bold text-slate-800 text-right">{priorSubmission.name || priorSubmission.employeeId || verifiedParticipant?.participantName || 'Verified Participant'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Score:</span>
                    <span className="font-bold text-slate-900 font-mono">{priorSubmission.score} / {priorSubmission.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Percentage:</span>
                    <span className="font-bold text-emerald-700">{priorSubmission.percentage}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Result:</span>
                    <span className="font-bold text-emerald-700">{priorSubmission.status || 'COMPLETED'}</span>
                  </div>
                  {priorSubmission.submittedAt && (
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                      <span>Completed:</span>
                      <span>{priorSubmission.submittedAt}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                Close Window
              </button>
            </div>
          ) : submissionResult ? (
            /* Post-Submission Results & Review View */
            <div className="space-y-6">
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-emerald-950">Evaluation Complete!</h4>
                {verifiedLabel && <p className="text-xs font-semibold text-emerald-900">{verifiedLabel}</p>}
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs pt-1">
                  <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-slate-500">Score: </span>
                    <strong className="font-mono text-emerald-800">{submissionResult.score} / {submissionResult.totalQuestions}</strong>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-slate-500">Percentage: </span>
                    <strong className="text-emerald-800">{submissionResult.percentage}%</strong>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-slate-500">Status: </span>
                    <strong className={submissionResult.passed ? 'text-emerald-700' : 'text-rose-700'}>{submissionResult.status}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Detailed Answer Review &amp; Clinical Rationales</h5>
                <div className="grid grid-cols-1 gap-4 items-start">
                  {submissionResult.review.map((item, idx) => (
                    <div
                      key={item.questionId || idx}
                      className={`p-4 rounded-xl border text-xs bg-white shadow-xs ${item.isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Q{idx + 1}.</span>
                          <span className="font-semibold text-slate-900">{item.question}</span>
                        </div>
                        {item.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500">Your Answer: </span>
                          <strong className={item.isCorrect ? 'text-emerald-800' : 'text-rose-800'}>Option {item.userAnswer || 'None'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Correct Answer: </span>
                          <strong className="text-emerald-800">Option {item.correctAnswer}</strong>
                        </div>
                      </div>

                      {item.explanation && (
                        <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                          <strong>Rationale:</strong> {item.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-20 text-center p-8 bg-white rounded-2xl border border-slate-200 space-y-2 max-w-md mx-auto my-8">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Post-Test Questions Pending</h4>
              <p className="text-xs text-slate-500 leading-relaxed">The coordinators have not finalized at least five questions for this CNE yet. Please check back shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="text-teal-900 font-medium">
                  <div className="font-bold text-teal-950">{verifiedParticipant?.participantName || user?.name || 'Verified Participant'}</div>
                  <div className="text-[11px] mt-0.5">
                    {verifiedParticipant?.participantType === 'EXTERNAL'
                      ? `External Participant${verifiedParticipant.email ? ` • ${verifiedParticipant.email}` : ''}`
                      : `Employee ID: ${verifiedParticipant?.employeeId || user?.employeeId || ''}${verifiedParticipant?.designation ? ` • ${verifiedParticipant.designation}` : ''}`}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" /> Verified
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 items-start">
                {questions.map((q, idx) => {
                  const selectedOption = answers[q.id];
                  return (
                    <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="font-semibold text-slate-900 text-xs leading-relaxed">{q.question}</p>
                      </div>

                      <div className="space-y-2 pl-8">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                          const isSelected = selectedOption === optKey;
                          return (
                            <label
                              key={optKey}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-medium'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={isSelected}
                                onChange={() => handleSelectOption(q.id, optKey)}
                                disabled={isSubmitting}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-bold w-4">{optKey}.</span>
                              <span className="flex-1">{q.options[optKey]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">Answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions</span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Grading &amp; Recording Submission...</span></>
                  ) : (
                    <><Send className="w-4 h-4" /><span>Submit Post-Test Evaluation</span></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
