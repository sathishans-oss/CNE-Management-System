import {
  ApiResponse,
  Area,
  TeachingMode,
  CNERecord,
  ProgramImpactStats,
  HomeDashboardData,
  Employee,
  GalleryItem,
  NewsEventItem,
  QuickLinkItem,
  RoleMapping,
  SessionUser,
  UserRole,
  CoordinatorDeskInfo,
  CNEQuestion,
  CNEReferenceMaterial,
  CNELearningResourceMetadata,
  CNENursingReferenceResource,
  CNENursingReferenceDriveFile,
  CNENursingReferenceIndexStatus,
  CNEAiQuotaInfo,
  CNEParticipantsSummary,
  CNEActivityProgress,
  PostTestSubmissionResult,
  SheetAuditItem
} from '../types';
import {
  INITIAL_AREAS,
  INITIAL_CNE_RECORDS,
  INITIAL_UPCOMING_CLASSES,
  INITIAL_GALLERY,
  INITIAL_NEWS_EVENTS,
  INITIAL_QUICK_LINKS,
  INITIAL_COORDINATOR_DESK,
  INITIAL_PROGRAM_IMPACT
} from './initialData';

let _inMemoryCNERecords: CNERecord[] = [...INITIAL_CNE_RECORDS, ...INITIAL_UPCOMING_CLASSES];
let _inMemoryAreas: Area[] = [...INITIAL_AREAS];
let _inMemoryCoordinatorDesk: CoordinatorDeskInfo = { ...INITIAL_COORDINATOR_DESK };
let _inMemoryNews: NewsEventItem[] = [...INITIAL_NEWS_EVENTS];
let _inMemoryQuickLinks: QuickLinkItem[] = [...INITIAL_QUICK_LINKS];
let _inMemoryGallery: GalleryItem[] = [...INITIAL_GALLERY];

const STORAGE_KEYS = {
  SESSION: 'cne_session_user'
};

/**
 * Public QR Post-Test identity flow.
 *
 * INTERNAL participants identify themselves with Employee ID only. The backend
 * resolves the registered EmailID from Officers data and sends the OTP there.
 * EXTERNAL participants supply Name + Email and prove ownership of that email.
 */
export type PostTestOtpRequest =
  | {
      qrToken: string;
      participantType: 'INTERNAL';
      employeeId: string;
    }
  | {
      qrToken: string;
      participantType: 'EXTERNAL';
      name: string;
      email: string;
    };

export type PostTestOtpVerificationRequest =
  | {
      qrToken: string;
      participantType: 'INTERNAL';
      employeeId: string;
      challengeId: string;
      otp: string;
    }
  | {
      qrToken: string;
      participantType: 'EXTERNAL';
      name: string;
      email: string;
      challengeId: string;
      otp: string;
    };

export interface PostTestOtpRequestData {
  challengeId: string;
  participantType: 'INTERNAL' | 'EXTERNAL';
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface PostTestParticipantVerificationData {
  cneId: string;
  participantType: 'INTERNAL' | 'EXTERNAL';
  participantId: string;
  participantName: string;
  employeeId?: string;
  designation?: string;
  email?: string;
  maskedEmail?: string;
  verificationToken: string;
}

export interface PasswordOtpRequestData {
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  employeeName?: string;
}

export interface PasswordOtpVerificationData {
  verificationToken: string;
  expiresInSeconds: number;
}

export interface PasswordSetupResult {
  passwordVersion: number;
}

/**
 * Explicit allowlist of genuinely public, non-sensitive CMS/display actions
 * permitted to persist in browser localStorage for UI hydration and offline fallback.
 */
const PUBLIC_CACHEABLE_ACTIONS: ReadonlySet<string> = new Set([
  'getCoordinatorDesk',
  'getNewsEvents',
  'getQuickLinks',
  'getGallery'
]);

/**
 * Truly public endpoints should not carry a logged-in user's session token.
 * This avoids unnecessary verifySession / credential-state work on public CMS reads.
 * Actions whose response changes by identity (for example getCNERecords and
 * getProgramImpact) are intentionally excluded.
 */
const PUBLIC_UNAUTHENTICATED_ACTIONS: ReadonlySet<string> = new Set([
  'login',
  'requestPasswordOtp',
  'verifyPasswordOtp',
  'setPasswordWithOtp',
  'requestPostTestOtp',
  'verifyPostTestOtp',
  'getAreas',
  'getTeachingModes',
  'getCoordinatorDesk',
  'getNewsEvents',
  'getQuickLinks',
  'getChairpersonPhoto'
]);

const MASTER_MEMORY_TTL_MS = 30000;
let _cachedAreasMem: { data: Area[]; expiresAt: number } | null = null;
let _inFlightAreasPromise: Promise<ApiResponse<Area[]>> | null = null;
let _cachedTeachingModesMem: { data: TeachingMode[]; expiresAt: number } | null = null;
let _inFlightTeachingModesPromise: Promise<ApiResponse<TeachingMode[]>> | null = null;

function clearMasterMemoryCache(actionOrKey?: string): void {
  if (!actionOrKey || actionOrKey === 'getAreas') {
    _cachedAreasMem = null;
    _inFlightAreasPromise = null;
  }
  if (!actionOrKey || actionOrKey === 'getTeachingModes') {
    _cachedTeachingModesMem = null;
    _inFlightTeachingModesPromise = null;
  }
}

/**
 * Explicit denylist of protected, user-specific, management, participant,
 * question/answer-key, token, and quota read actions that must NEVER be
 * written to or served from browser localStorage.
 */
const NEVER_CACHEABLE_PROTECTED_ACTIONS: ReadonlySet<string> = new Set([
  'getCNEQuestions',
  'getPostTestQuestions',
  'requestPostTestOtp',
  'verifyPostTestOtp',
  'requestPasswordOtp',
  'verifyPasswordOtp',
  'setPasswordWithOtp',
  'getCNEParticipants',
  'getRoles',
  'getQRToken',
  'getAiQuota',
  'getCNEActivityProgress',
  'getLearningResource',
  'getReferenceMaterial',
  'getCNERecords',
  'getProgramImpact',
  'getAreas',
  'getTeachingModes',
  'getOfficersDropdown',
  'listLearningResources',
  'downloadLearningResource',
  'listNursingReferenceResources',
  'downloadNursingReferenceResource'
]);

export function isPublicCacheableAction(action: string): boolean {
  if (!action || typeof action !== 'string') return false;
  const normalized = action.trim();
  if (!normalized || NEVER_CACHEABLE_PROTECTED_ACTIONS.has(normalized)) {
    return false;
  }
  return PUBLIC_CACHEABLE_ACTIONS.has(normalized);
}

function purgeNonPublicCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cne_cache_')) {
        const actionName = k.slice('cne_cache_'.length);
        if (!isPublicCacheableAction(actionName)) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

const RECOGNIZED_USER_ROLES: ReadonlySet<string> = new Set([
  'ADMIN',
  'AREA_INCHARGE',
  'INCHARGE',
  'RESOURCE_PERSON',
  'EMPLOYEE'
]);

function isMockOrInvalidToken(token: unknown): boolean {
  if (typeof token !== 'string') return true;
  const trimmed = token.trim();
  if (!trimmed) return true;
  const prefixPreview = 'preview' + '-token-';
  const prefixMock = 'mock' + '_token_';
  return trimmed.startsWith(prefixPreview) || trimmed.startsWith(prefixMock);
}

function isValidAuthenticatedSessionUser(user: any): user is SessionUser {
  if (!user || typeof user !== 'object') return false;
  const empId = typeof user.employeeId === 'string' ? user.employeeId.trim() : '';
  const role = typeof user.role === 'string' ? user.role.trim().toUpperCase() : '';
  if (!empId) return false;
  if (!RECOGNIZED_USER_ROLES.has(role)) return false;
  if (isMockOrInvalidToken(user.token)) return false;
  return true;
}

// Actively purge legacy mock credential storage, fake preview/mock sessions, non-public caches, or environment mode flags from browser storage
try {
  localStorage.removeItem('cne_user_creds');
  localStorage.removeItem('CNE_ENVIRONMENT_MODE');
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('CNE_CUSTOM_APPS_SCRIPT')) {
      localStorage.removeItem(k);
    }
  }
  purgeNonPublicCaches();
  const rawStoredSession = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (rawStoredSession) {
    try {
      const parsedSession = JSON.parse(rawStoredSession);
      const storedToken = String(parsedSession?.token || '').trim();
      if (
        storedToken.startsWith('preview-token-') ||
        storedToken.startsWith('mock_token_') ||
        !isValidAuthenticatedSessionUser(parsedSession)
      ) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }
} catch (e) {}

/**
 * Safely normalize Duration to standard HH:MM:SS duration string.
 * Duration in Google Sheets can be returned as:
 * 1. Formatted display string from getDisplayValues() (e.g. "1:00:00", "1:30:00", "0:30:00", "15:00:00")
 * 2. Date object from getValues() (e.g. Sat Dec 30 1899 01:30:00 GMT+...)
 * 3. Numeric serial fraction of a day (e.g. 1/24 = 0.041666... for 1 hr, 1.5/24 = 0.0625 for 1.5 hrs)
 * 4. Existing string representation or ISO/Date string
 * Note: Duration can exceed 24 hours (e.g. 25:00:00, 120:00:00). It must NEVER be converted to a JavaScript Date object.
 */
export function formatDurationValue(rawValue: any, displayValue?: any): string {
  const secondsToDuration = (totalSeconds: number): string => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '';
    const rounded = Math.round(totalSeconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;
    const hh = hours < 10 ? `0${hours}` : String(hours);
    const mm = minutes < 10 ? `0${minutes}` : String(minutes);
    const ss = seconds < 10 ? `0${seconds}` : String(seconds);
    return `${hh}:${mm}:${ss}`;
  };

  const parseColonDuration = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (!str) return '';
    const match = str.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
    if (!match) return '';
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = match[3] === undefined ? 0 : Number(match[3]);
    if (!Number.isFinite(hours) || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return '';
    return secondsToDuration((hours * 3600) + (minutes * 60) + seconds);
  };

  // 1. Prefer a valid Google Sheets display value when it is already a duration string.
  // Plain decimal display values are intentionally not used here because raw numeric Sheet
  // values are day fractions (for example, 0.0625 = 1.5 hours).
  const displayDuration = parseColonDuration(displayValue);
  if (displayDuration) return displayDuration;

  // 2. Google Sheets stores time/duration-formatted numeric cells as day fractions.
  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue >= 0) {
    return secondsToDuration(rawValue * 86400);
  }

  // 3. Strings may be HH:MM[:SS] or decimal hours (for example, "1.5" = 01:30:00).
  if (typeof rawValue === 'string') {
    const str = rawValue.trim();
    if (!str) return '';

    const stringDuration = parseColonDuration(str);
    if (stringDuration) return stringDuration;

    const decimalHoursMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)?$/i);
    if (decimalHoursMatch) {
      const decimalHours = Number(decimalHoursMatch[1]);
      if (Number.isFinite(decimalHours) && decimalHours >= 0) {
        return secondsToDuration(decimalHours * 3600);
      }
    }

    // Google Sheets/Apps Script can sometimes serialize time cells as 1899/GMT date strings.
    if (str.includes('1899') || str.includes('GMT')) {
      const parsedDate = new Date(str);
      if (!Number.isNaN(parsedDate.getTime())) {
        return secondsToDuration(
          (parsedDate.getHours() * 3600) +
          (parsedDate.getMinutes() * 60) +
          parsedDate.getSeconds()
        );
      }
    }
  }

  // 4. Google Sheets can also return an actual Date object for time-formatted cells under 24 hours.
  if (Object.prototype.toString.call(rawValue) === '[object Date]' || rawValue instanceof Date) {
    const d = rawValue as Date;
    if (!Number.isNaN(d.getTime())) {
      return secondsToDuration(
        (d.getHours() * 3600) +
        (d.getMinutes() * 60) +
        d.getSeconds()
      );
    }
  }

  // Missing or invalid duration must never fabricate training time.
  return '';
}


export class ApiService {
  /**
   * Get configured Google Apps Script Web App URL
   */
  static getAppsScriptUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      const trimmed = envUrl.trim();
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          return trimmed;
        }
      } catch {
        return '';
      }
    }
    return '';
  }

  private static executeLocalMockAction<T = any>(
    action: string,
    _params: Record<string, any> = {},
    session: SessionUser | null
  ): ApiResponse<T> {
    switch (action) {
      case 'login':
      case 'changePassword':
      case 'requestPasswordOtp':
      case 'verifyPasswordOtp':
      case 'setPasswordWithOtp':
      case 'adminResetPassword':
        return {
          success: false,
          errorCode: 'BACKEND_NOT_CONFIGURED',
          message: 'CNE authentication service is not configured. Please contact the system administrator.'
        };

      // Protected / Security-Sensitive & Mutation Actions — Fail Closed without Google Apps Script
      case 'getOfficersDropdown':
      case 'getRoles':
      case 'updateRole':
      case 'addArea':
      case 'updateArea':
      case 'createCNE':
      case 'addUnscheduledCNE':
      case 'addDepartmentalSchedule':
      case 'updateCNE':
      case 'finalizeCNE':
      case 'cancelCNE':
      case 'setupAndVerifyCNESheets':
      case 'addManualParticipants':
      case 'getCNEParticipants':
      case 'submitPostTest':
      case 'getPostTestQuestions':
      case 'requestPostTestOtp':
      case 'verifyPostTestOtp':
      case 'getQRToken':
      case 'saveCNEQuestions':
      case 'getCNEQuestions':
      case 'generateCNEQuestions':
      case 'getAiQuota':
      case 'saveReferenceMaterial':
      case 'uploadLearningResource':
      case 'deleteLearningResource':
      case 'indexNursingReferenceResource':
      case 'getNursingReferenceIndexStatus':
      case 'uploadNursingReferenceResource':
      case 'deleteNursingReferenceResource':
      case 'updateCoordinatorDesk':
      case 'uploadImage':
      case 'updateGalleryItem':
      case 'deleteGalleryItem':
      case 'addNewsEvent':
      case 'updateNewsEvent':
      case 'deleteNewsEvent':
      case 'addQuickLink':
      case 'updateQuickLink':
      case 'deleteQuickLink':
        return {
          success: false,
          errorCode: 'BACKEND_NOT_CONFIGURED',
          message: 'CNE backend service is not configured. Please contact the system administrator.'
        };

      // Read-only public preview content
      case 'getCNERecords':
        return { success: true, data: [..._inMemoryCNERecords] as any };

      case 'getAreas':
        return { success: true, data: [..._inMemoryAreas] as any };

      case 'getTeachingModes':
        return {
          success: true,
          data: [
            { name: 'Case Study Presentation', status: 'ACTIVE' },
            { name: 'Demonstration', status: 'ACTIVE' },
            { name: 'Hands-on Training', status: 'ACTIVE' },
            { name: 'Lecture Cum Discussion', status: 'ACTIVE' },
            { name: 'Simulation', status: 'ACTIVE' },
            { name: 'Workshop', status: 'ACTIVE' }
          ] as any
        };

      case 'getNewsEvents':
        return { success: true, data: [..._inMemoryNews] as any };

      case 'getQuickLinks':
        return { success: true, data: [..._inMemoryQuickLinks] as any };

      case 'getProgramImpact': {
        const stats: ProgramImpactStats = {
          ...INITIAL_PROGRAM_IMPACT,
          scope: session && session.employeeId ? 'user' : 'institutional'
        };
        return { success: true, data: stats as any };
      }

      case 'getHomeDashboard': {
        const stats: ProgramImpactStats = {
          ...INITIAL_PROGRAM_IMPACT,
          scope: session && session.employeeId ? 'user' : 'institutional'
        };
        const dashboard: HomeDashboardData = {
          upcomingClasses: [..._inMemoryCNERecords].filter((c) => String(c.status || '').toLowerCase() === 'scheduled'),
          newsEvents: [..._inMemoryNews],
          quickLinks: [..._inMemoryQuickLinks],
          coordinatorDesk: { ..._inMemoryCoordinatorDesk },
          impactStats: stats,
          chairpersonPhotoUrl: ''
        };
        return { success: true, data: dashboard as any };
      }

      case 'getChairpersonPhoto':
        return { success: true, data: { photoUrl: '' } as any };

      case 'getCoordinatorDesk':
        return { success: true, data: _inMemoryCoordinatorDesk as any };

      case 'getGallery':
        return { success: true, data: [..._inMemoryGallery] as any };

      default:
        return {
          success: false,
          errorCode: 'BACKEND_NOT_CONFIGURED',
          message: 'CNE backend service is not configured. Please contact the system administrator.'
        };
    }
  }

  /**
   * Central Action Executor:
   * Connects to Google Apps Script Web App when configured, or fails closed for
   * authentication and mutations when unconfigured.
   */
  static async executeAction<T = any>(
    action: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    const apiUrl = this.getAppsScriptUrl();
    const session = this.getSessionUser();

    // If backend URL is not configured, fail closed for authentication & mutations
    if (!apiUrl) {
      return this.executeLocalMockAction<T>(action, params, session);
    }

    const shouldSendSession = !PUBLIC_UNAUTHENTICATED_ACTIONS.has(action);
    const payload = {
      action,
      ...params,
      ...(shouldSendSession && session?.token
        ? { token: session.token, loggedInEmployeeId: session.employeeId }
        : {})
    };

    // Explicit SERVER_BUSY means the Apps Script mutation lock was NOT acquired,
    // so no protected mutation was committed. A small jittered retry is therefore
    // safe and prevents brief lock contention from surfacing to users. We do NOT
    // retry network/timeout failures because their server-side outcome is ambiguous.
    const maxServerBusyRetries = 2;

    for (let busyAttempt = 0; busyAttempt <= maxServerBusyRetries; busyAttempt += 1) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        const controller = new AbortController();
        const timeoutMs = (
          action === 'generateCNEQuestions' ||
          action === 'uploadLearningResource' ||
          action === 'uploadNursingReferenceResource' ||
          action === 'indexNursingReferenceResource'
        ) ? 120000 : 45000;
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = undefined;

        if (response.ok) {
          const result = await response.json();

          if (result?.errorCode === 'SERVER_BUSY' && busyAttempt < maxServerBusyRetries) {
            const baseDelayMs = 180 * Math.pow(2, busyAttempt);
            const jitterMs = Math.floor(Math.random() * 180);
            await new Promise(resolve => setTimeout(resolve, baseDelayMs + jitterMs));
            continue;
          }

          // Check for session expiry/invalid token
          if (result.errorCode === 'UNAUTHORIZED' && session) {
            this.logout();
          }
          if (result.success && result.data && isPublicCacheableAction(action)) {
            try {
              localStorage.setItem(`cne_cache_${action}`, JSON.stringify(result.data));
            } catch (e) {}
          }
          return result as ApiResponse<T>;
        }

        // Only explicitly allowlisted public CMS actions may fall back to cached browser data
        if (isPublicCacheableAction(action)) {
          console.warn(`[CNE Service] HTTP ${response.status} on ${action}. Serving cached public dataset.`);
          try {
            const cached = localStorage.getItem(`cne_cache_${action}`);
            if (cached) {
              return { success: true, data: JSON.parse(cached), message: 'Loaded from local cache' } as ApiResponse<T>;
            }
          } catch (e) {}
        }

        return {
          success: false,
          errorCode: 'HTTP_ERROR',
          message: `Server returned HTTP error status ${response.status}. Please check Google Apps Script deployment.`
        };
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn(`[CNE Service] Network notice executing ${action} against ${apiUrl}:`, err);
        const isTimeout = err?.name === 'AbortError';

        // Only explicitly allowlisted public CMS actions may fall back to cached browser data
        if (isPublicCacheableAction(action)) {
          try {
            const cached = localStorage.getItem(`cne_cache_${action}`);
            if (cached) {
              return { success: true, data: JSON.parse(cached), message: 'Loaded from local cache' } as ApiResponse<T>;
            }
          } catch (e) {}
        }

        return {
          success: false,
          errorCode: 'BACKEND_UNAVAILABLE',
          message: isTimeout
            ? 'Backend connection timed out. Please check your internet connection or Google Apps Script performance.'
            : 'Backend connection is unavailable. Please check your network and Google Apps Script configuration.'
        };
      }
    }

    return {
      success: false,
      errorCode: 'SERVER_BUSY',
      message: 'Server is temporarily busy. Please try again.'
    };
  }

  /**
   * Authentication (Strictly Authoritative Google Apps Script Only)
   */
  static async login(employeeId: string, password: string): Promise<ApiResponse<SessionUser>> {
    const cleanEmpId = (employeeId || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanEmpId || !cleanPass) {
      return { success: false, message: 'Please enter both your Employee ID and Password.' };
    }

    if (!this.getAppsScriptUrl()) {
      return {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'CNE authentication service is not configured. Please contact the system administrator.'
      };
    }

    const previousSession = this.getSessionUser();
    const res = await this.executeAction<SessionUser>('login', {
      employeeId: cleanEmpId,
      password: cleanPass
    });

    if (res.success && isValidAuthenticatedSessionUser(res.data)) {
      const prevEmpId = previousSession?.employeeId ? previousSession.employeeId.trim().toUpperCase() : '';
      const nextEmpId = res.data.employeeId.trim().toUpperCase();
      if (!prevEmpId || prevEmpId !== nextEmpId) {
        purgeNonPublicCaches();
      }
      this.saveSessionUser(res.data);
      return res;
    }

    if (res.success && !isValidAuthenticatedSessionUser(res.data)) {
      return {
        success: false,
        errorCode: 'INVALID_SESSION_RESPONSE',
        message: 'Authentication failed: invalid session response from server.'
      };
    }

    return res;
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<SessionUser>> {
    if (!this.getAppsScriptUrl()) {
      return {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'CNE authentication service is not configured. Please contact the system administrator.'
      };
    }

    const res = await this.executeAction<SessionUser>('changePassword', {
      currentPassword,
      newPassword
    });
    if (res.success && isValidAuthenticatedSessionUser(res.data)) {
      this.saveSessionUser(res.data);
    }
    return res;
  }

  /**
   * Begin Create / Reset Password flow.
   * Employee enters only Employee ID; backend resolves the registered email from Officers data.
   */
  static async requestPasswordOtp(employeeId: string): Promise<ApiResponse<PasswordOtpRequestData>> {
    const cleanEmpId = String(employeeId || '').trim().toUpperCase();
    if (!cleanEmpId) {
      return { success: false, message: 'Employee ID is required.' };
    }
    if (!this.getAppsScriptUrl()) {
      return {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'CNE authentication service is not configured. Please contact the system administrator.'
      };
    }
    return this.executeAction<PasswordOtpRequestData>('requestPasswordOtp', {
      employeeId: cleanEmpId
    });
  }

  /**
   * Verify the 6-digit password-setup OTP returned for a specific challenge.
   * The resulting short-lived verification token is required to create/reset the password.
   */
  static async verifyPasswordOtp(
    employeeId: string,
    challengeId: string,
    otp: string
  ): Promise<ApiResponse<PasswordOtpVerificationData>> {
    const cleanEmpId = String(employeeId || '').trim().toUpperCase();
    const cleanChallengeId = String(challengeId || '').trim();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmpId || !cleanChallengeId || !/^\d{6}$/.test(cleanOtp)) {
      return {
        success: false,
        message: 'Employee ID, OTP challenge, and a valid 6-digit verification code are required.'
      };
    }
    if (!this.getAppsScriptUrl()) {
      return {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'CNE authentication service is not configured. Please contact the system administrator.'
      };
    }
    return this.executeAction<PasswordOtpVerificationData>('verifyPasswordOtp', {
      employeeId: cleanEmpId,
      challengeId: cleanChallengeId,
      otp: cleanOtp
    });
  }

  /**
   * Create or reset the employee password after registered-email OTP verification.
   */
  static async setPasswordWithOtp(
    employeeId: string,
    verificationToken: string,
    newPassword: string
  ): Promise<ApiResponse<PasswordSetupResult>> {
    const cleanEmpId = String(employeeId || '').trim().toUpperCase();
    const cleanVerificationToken = String(verificationToken || '').trim();
    const password = String(newPassword || '');

    if (!cleanEmpId || !cleanVerificationToken || !password) {
      return {
        success: false,
        message: 'Employee ID, verified OTP session, and new password are required.'
      };
    }
    if (!this.getAppsScriptUrl()) {
      return {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'CNE authentication service is not configured. Please contact the system administrator.'
      };
    }
    return this.executeAction<PasswordSetupResult>('setPasswordWithOtp', {
      employeeId: cleanEmpId,
      verificationToken: cleanVerificationToken,
      newPassword: password
    });
  }


  static async adminResetPassword(targetEmployeeId: string): Promise<ApiResponse> {
    if (!this.getAppsScriptUrl()) {
      return {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'CNE authentication service is not configured. Please contact the system administrator.'
      };
    }
    return this.executeAction('adminResetPassword', { targetEmployeeId });
  }

  static logout() {
    clearMasterMemoryCache();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cne_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  static getSessionUser(): SessionUser | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidAuthenticatedSessionUser(parsed)) {
          return parsed;
        }
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch (e) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      console.error('Failed to parse session user', e);
    }
    return null;
  }


  static saveSessionUser(user: SessionUser) {
    if (!isValidAuthenticatedSessionUser(user)) {
      return;
    }
    const previousSession = this.getSessionUser();
    const prevEmpId = previousSession?.employeeId ? previousSession.employeeId.trim().toUpperCase() : '';
    const nextEmpId = user.employeeId.trim().toUpperCase();
    if (!prevEmpId || prevEmpId !== nextEmpId) {
      purgeNonPublicCaches();
    }
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  }

  /**
   * Invalidate cached datasets stored in localStorage
   */
  static invalidateCache(actionOrKey?: string) {
    clearMasterMemoryCache(actionOrKey);
    try {
      if (!actionOrKey) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('cne_cache_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        return;
      }
      localStorage.removeItem(`cne_cache_${actionOrKey}`);
    } catch {}
  }

  /**
   * Safe read from local storage cache for instant UI hydration (strictly public allowlisted CMS actions only)
   */
  static getCachedData<T = any>(action: string, _specificKey?: string): T | null {
    if (!isPublicCacheableAction(action)) {
      return null;
    }
    try {
      const cacheKey = `cne_cache_${action.trim()}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Ignore cache retrieval errors
    }
    return null;
  }

  /**
   * Master Data APIs
   */
  static async getOfficersDropdown(params?: { cneId?: string }): Promise<ApiResponse<Employee[]>> {
    return this.executeAction<Employee[]>('getOfficersDropdown', params);
  }

  static async getAreas(): Promise<ApiResponse<Area[]>> {
    const now = Date.now();
    if (_cachedAreasMem && _cachedAreasMem.expiresAt > now) {
      return { success: true, data: _cachedAreasMem.data.map((a) => ({ ...a })) };
    }
    if (_inFlightAreasPromise) {
      return _inFlightAreasPromise;
    }
    _inFlightAreasPromise = this.executeAction<Area[]>('getAreas')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          _cachedAreasMem = {
            data: res.data.map((a) => ({ ...a })),
            expiresAt: Date.now() + MASTER_MEMORY_TTL_MS
          };
        }
        return res;
      })
      .finally(() => {
        _inFlightAreasPromise = null;
      });
    return _inFlightAreasPromise;
  }

  static async addArea(name: string): Promise<ApiResponse> {
    const res = await this.executeAction('addArea', { name });
    if (res.success) {
      this.invalidateCache('getAreas');
      if (Array.isArray(res.data)) {
        _cachedAreasMem = {
          data: res.data.map((a: Area) => ({ ...a })),
          expiresAt: Date.now() + MASTER_MEMORY_TTL_MS
        };
      }
    }
    return res;
  }

  static async updateArea(oldName: string, name: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse> {
    const res = await this.executeAction('updateArea', { oldName, name, status });
    if (res.success) {
      this.invalidateCache('getAreas');
      if (Array.isArray(res.data)) {
        _cachedAreasMem = {
          data: res.data.map((a: Area) => ({ ...a })),
          expiresAt: Date.now() + MASTER_MEMORY_TTL_MS
        };
      }
    }
    return res;
  }

  static async getTeachingModes(): Promise<ApiResponse<TeachingMode[]>> {
    const now = Date.now();
    if (_cachedTeachingModesMem && _cachedTeachingModesMem.expiresAt > now) {
      return { success: true, data: _cachedTeachingModesMem.data.map((m) => ({ ...m })) };
    }
    if (_inFlightTeachingModesPromise) {
      return _inFlightTeachingModesPromise;
    }
    _inFlightTeachingModesPromise = this.executeAction<TeachingMode[]>('getTeachingModes')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          _cachedTeachingModesMem = {
            data: res.data.map((m) => ({ ...m })),
            expiresAt: Date.now() + MASTER_MEMORY_TTL_MS
          };
        }
        return res;
      })
      .finally(() => {
        _inFlightTeachingModesPromise = null;
      });
    return _inFlightTeachingModesPromise;
  }

  static async addTeachingMode(name: string): Promise<ApiResponse> {
    const res = await this.executeAction('addTeachingMode', { name });
    if (res.success) {
      this.invalidateCache('getTeachingModes');
      if (Array.isArray(res.data)) {
        _cachedTeachingModesMem = {
          data: res.data.map((m: TeachingMode) => ({ ...m })),
          expiresAt: Date.now() + MASTER_MEMORY_TTL_MS
        };
      }
    }
    return res;
  }

  static async updateTeachingMode(oldName: string, name: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse> {
    const res = await this.executeAction('updateTeachingMode', { oldName, name, status });
    if (res.success) {
      this.invalidateCache('getTeachingModes');
      this.invalidateCache('getCNERecords');
      if (Array.isArray(res.data)) {
        _cachedTeachingModesMem = {
          data: res.data.map((m: TeachingMode) => ({ ...m })),
          expiresAt: Date.now() + MASTER_MEMORY_TTL_MS
        };
      }
    }
    return res;
  }

  static async getRoles(): Promise<ApiResponse<RoleMapping[]>> {
    const res = await this.executeAction<RoleMapping[]>('getRoles');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map((r: any) => {
        let assignedAreas: string[] = [];
        if (Array.isArray(r.assignedAreas) && r.assignedAreas.length > 0) {
          assignedAreas = r.assignedAreas.map((a: any) => String(a).trim()).filter(Boolean);
        } else {
          const raw = r.area || r.departmentarea || r.department || r.ward || '';
          if (typeof raw === 'string' && raw.trim()) {
            assignedAreas = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
          }
        }
        const cleanAreas = Array.from(new Set(assignedAreas));
        const rawRole = (r.role || 'EMPLOYEE') as UserRole;
        const effectiveRole: UserRole = rawRole !== 'ADMIN' && cleanAreas.length > 0 ? 'AREA_INCHARGE' : rawRole;
        return {
          ...r,
          employeeId: String(r.employeeId || '').trim(),
          role: effectiveRole,
          assignedAreas: cleanAreas,
          area: cleanAreas.join(', ') || r.area || ''
        };
      });
    }
    return res;
  }

  static async updateRole(
    employeeId: string,
    role: UserRole,
    assignedAreasOrArea?: string[] | string,
    name?: string,
    designation?: string
  ): Promise<ApiResponse> {
    const rawAreas: string[] = Array.isArray(assignedAreasOrArea)
      ? assignedAreasOrArea.map((s) => String(s).trim()).filter(Boolean)
      : (typeof assignedAreasOrArea === 'string' && assignedAreasOrArea.trim()
          ? assignedAreasOrArea.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
          : []);

    // For ADMIN, assignedAreas should be empty; for non-admin, keep assigned areas
    const assignedAreas = role === 'ADMIN' ? [] : rawAreas;
    const effectiveRole: UserRole = role !== 'ADMIN' && assignedAreas.length > 0 ? 'AREA_INCHARGE' : role;
    const areaString = assignedAreas.join(', ');

    const res = await this.executeAction('updateRole', {
      employeeId,
      role: effectiveRole,
      assignedAreas,
      area: areaString,
      department: areaString,
      name,
      designation
    });

    if (res.success) {
      try {
        localStorage.removeItem('cne_cache_getRoles');
      } catch {}
    }

    return res;
  }

  /**
   * Unified Authoritative CNE APIs (Operating on 'CNE Schedule')
   */
  static async getCNERecords(params?: { status?: string; cneType?: string; area?: string; myRecordsOnly?: boolean; scope?: string }): Promise<ApiResponse<CNERecord[]>> {
    return this.executeAction<CNERecord[]>('getCNERecords', params);
  }

  static async createCNE(cneData: Partial<CNERecord>): Promise<ApiResponse<{ cneId: string }>> {
    const res = await this.executeAction<{ cneId: string }>('createCNE', cneData);
    if (res.success) {
      this.invalidateCache('getCNERecords');
      this.invalidateCache('getProgramImpact');
    }
    return res;
  }

  static async addUnscheduledCNE(cneData: Partial<CNERecord>): Promise<ApiResponse<{ cneId: string }>> {
    return this.createCNE({ ...cneData, isUnscheduled: true, status: 'Completed' });
  }

  static async updateCNE(cneId: string, cneData: Partial<CNERecord>): Promise<ApiResponse> {
    const res = await this.executeAction('updateCNE', { cneId, classId: cneId, dataId: cneId, ...cneData });
    if (res.success) {
      this.invalidateCache('getCNERecords');
      this.invalidateCache('getProgramImpact');
    }
    return res;
  }



  static async addDepartmentalSchedule(
    schedules: any[]
  ): Promise<ApiResponse<{ count: number; createdIds: string[] }>> {
    const res = await this.executeAction<{ count: number; createdIds: string[] }>('addDepartmentalSchedule', {
      schedules
    });
    if (res.success) {
      this.invalidateCache('getCNERecords');
      this.invalidateCache('getProgramImpact');
    }
    return res;
  }

  static async setupAndVerifyCNESheets(): Promise<ApiResponse<{ results?: Record<string, string>; auditReport?: SheetAuditItem[] }> & { auditReport?: SheetAuditItem[] }> {
    return this.executeAction('setupAndVerifyCNESheets');
  }

  /**
   * Gallery & Drive Images
   */
  static async getGallery(): Promise<ApiResponse<GalleryItem[]>> {
    return this.executeAction<GalleryItem[]>('getGallery');
  }

  static async uploadImage(
    base64Image: string,
    title: string,
    description?: string,
    date?: string
  ): Promise<ApiResponse<{ id: string; imageUrl: string; fileId?: string }>> {
    return this.executeAction('uploadImage', { base64Image, title, description, date });
  }

  static async updateGalleryItem(id: string, data: Partial<GalleryItem>): Promise<ApiResponse> {
    return this.executeAction('updateGalleryItem', { id, ...data });
  }

  static async deleteGalleryItem(id: string): Promise<ApiResponse> {
    return this.executeAction('deleteGalleryItem', { id });
  }

  /**
   * News & Events APIs
   */
  static async getNewsEvents(): Promise<ApiResponse<NewsEventItem[]>> {
    return this.executeAction<NewsEventItem[]>('getNewsEvents');
  }

  static async addNewsEvent(item: Partial<NewsEventItem>): Promise<ApiResponse<{ id: string }>> {
    const res = await this.executeAction<{ id: string }>('addNewsEvent', item);
    if (res.success) this.invalidateCache('getNewsEvents');
    return res;
  }

  static async updateNewsEvent(id: string, data: Partial<NewsEventItem>): Promise<ApiResponse> {
    const res = await this.executeAction('updateNewsEvent', { id, ...data });
    if (res.success) this.invalidateCache('getNewsEvents');
    return res;
  }

  static async deleteNewsEvent(id: string): Promise<ApiResponse> {
    const res = await this.executeAction('deleteNewsEvent', { id });
    if (res.success) this.invalidateCache('getNewsEvents');
    return res;
  }

  /**
   * Chairperson photo (public read-only; source is CHAIRPERSON_PHOTO Script Property)
   */
  static async getChairpersonPhoto(): Promise<ApiResponse<{ photoUrl: string }>> {
    return this.executeAction<{ photoUrl: string }>('getChairpersonPhoto');
  }

  /**
   * CNE Coordinator Desk APIs
   */
  static async getCoordinatorDesk(): Promise<ApiResponse<CoordinatorDeskInfo>> {
    return this.executeAction<CoordinatorDeskInfo>('getCoordinatorDesk');
  }

  static async updateCoordinatorDesk(data: Partial<CoordinatorDeskInfo>): Promise<ApiResponse<CoordinatorDeskInfo>> {
    const res = await this.executeAction<CoordinatorDeskInfo>('updateCoordinatorDesk', data);
    if (res.success) this.invalidateCache('getCoordinatorDesk');
    return res;
  }

  /**
   * Quick Links APIs
   */
  static async getQuickLinks(): Promise<ApiResponse<QuickLinkItem[]>> {
    return this.executeAction<QuickLinkItem[]>('getQuickLinks');
  }

  static async addQuickLink(item: Partial<QuickLinkItem>): Promise<ApiResponse<{ id: string }>> {
    const res = await this.executeAction<{ id: string }>('addQuickLink', item);
    if (res.success) this.invalidateCache('getQuickLinks');
    return res;
  }

  static async updateQuickLink(id: string, data: Partial<QuickLinkItem>): Promise<ApiResponse> {
    const res = await this.executeAction('updateQuickLink', { id, ...data });
    if (res.success) this.invalidateCache('getQuickLinks');
    return res;
  }

  static async deleteQuickLink(id: string): Promise<ApiResponse> {
    const res = await this.executeAction('deleteQuickLink', { id });
    if (res.success) this.invalidateCache('getQuickLinks');
    return res;
  }

  /**
   * Optimized home bootstrap: one Apps Script request returns all homepage datasets.
   * This avoids multiple network round-trips / Apps Script executions on first render.
   */
  static async getHomeDashboard(): Promise<ApiResponse<HomeDashboardData>> {
    const res = await this.executeAction<HomeDashboardData>('getHomeDashboard');
    if (res.success && res.data) {
      try {
        localStorage.setItem('cne_cache_getNewsEvents', JSON.stringify(res.data.newsEvents || []));
        localStorage.setItem('cne_cache_getQuickLinks', JSON.stringify(res.data.quickLinks || []));
        localStorage.setItem('cne_cache_getCoordinatorDesk', JSON.stringify(res.data.coordinatorDesk || INITIAL_COORDINATOR_DESK));
      } catch {}
    }
    return res;
  }

  /**
   * CNE Program Impact (Adaptive: Institutional when unauthenticated, Personal when logged in)
   */
  static async getProgramImpact(): Promise<ApiResponse<ProgramImpactStats>> {
    return this.executeAction<ProgramImpactStats>('getProgramImpact');
  }



  /**
   * Part 1C: Authoritative Google Apps Script Gemini MCQ Generation
   * Invokes Gemini directly inside Google Apps Script using UrlFetchApp.
   * Atomically checks quota, retrieves evidence, generates 5 MCQs, persists them, and commits quota.
   */
  static async generateCNEQuestions(cneId: string): Promise<ApiResponse<CNEQuestion[]>> {
    return this.executeAction<CNEQuestion[]>('generateCNEQuestions', { cneId });
  }

  /**
   * AI Quota Lifecycle & Concurrency APIs (Authoritative Google Apps Script)
   */
  static async getAiQuota(cneId: string): Promise<ApiResponse<CNEAiQuotaInfo>> {
    return this.executeAction<CNEAiQuotaInfo>('getAiQuota', { cneId });
  }

  /**
   * Topic Reference Material APIs
   */
  static async saveReferenceMaterial(params: {
    cneId: string;
    unifiedContent?: string;
    referenceText?: string;
    linkUrl?: string;
    syllabus?: string;
  }): Promise<ApiResponse> {
    return this.executeAction('saveReferenceMaterial', params);
  }

  static async getReferenceMaterial(cneId: string): Promise<ApiResponse<CNEReferenceMaterial>> {
    return this.executeAction<CNEReferenceMaterial>('getReferenceMaterial', { cneId });
  }

  /**
   * Upload CNE Learning Resource File (PDF only, maximum 3 MB)
   */
  static async uploadLearningResource(params: {
    cneId: string;
    base64Data: string;
    fileName: string;
    fileType?: string;
    extension?: string;
    unifiedContent?: string;
    referenceText?: string;
  }): Promise<ApiResponse<CNELearningResourceMetadata>> {
    return this.executeAction<CNELearningResourceMetadata>('uploadLearningResource', params);
  }

  /**
   * Retrieve metadata for uploaded CNE learning resource
   */
  static async getLearningResource(cneId: string): Promise<ApiResponse<CNELearningResourceMetadata>> {
    return this.executeAction<CNELearningResourceMetadata>('getLearningResource', { cneId });
  }

  /**
   * Authoritatively and securely delete uploaded Learning Resource file and metadata
   */
  static async deleteLearningResource(cneId: string): Promise<ApiResponse<{
    cneId: string;
    deletedFileId: string;
    deletedFileName: string;
    updatedAt: string;
    updatedBy: string;
  }>> {
    return this.executeAction<{
      cneId: string;
      deletedFileId: string;
      deletedFileName: string;
      updatedAt: string;
      updatedBy: string;
    }>('deleteLearningResource', { cneId });
  }



  /**
   * Phase 3: List all CNE Learning Resources available to authenticated user
   */
  static async listLearningResources(): Promise<ApiResponse<CNELearningResourceMetadata[]>> {
    return this.executeAction<CNELearningResourceMetadata[]>('listLearningResources');
  }

  /**
   * Phase 3: Authoritatively download / stream Learning Resource file
   */
  static async downloadLearningResource(cneId: string): Promise<ApiResponse<{
    cneId: string;
    fileName: string;
    fileType: string;
    mimeType: string;
    fileBase64: string;
  }>> {
    return this.executeAction<{
      cneId: string;
      fileName: string;
      fileType: string;
      mimeType: string;
      fileBase64: string;
    }>('downloadLearningResource', { cneId });
  }

  /**
   * Phase 4B: List all registered nursing reference library resources (Open RN)
   * and available Drive files in the approved Open RN reference folder.
   */
  static async listNursingReferenceResources(): Promise<ApiResponse<{
    resources: CNENursingReferenceResource[];
    driveFiles: CNENursingReferenceDriveFile[];
  }>> {
    return this.executeAction<{
      resources: CNENursingReferenceResource[];
      driveFiles: CNENursingReferenceDriveFile[];
    }>('listNursingReferenceResources');
  }

  /**
   * Phase 4B: Index an approved Open RN nursing reference resource by Drive File ID.
   * Strictly Admin-only.
   */
  static async indexNursingReferenceResource(params: {
    driveFileId: string;
    resourceTitle?: string;
    authorOrganization?: string;
    license?: string;
    version?: string;
    reindex?: boolean;
  }): Promise<ApiResponse<{
    resourceId: string;
    chunksCount: number;
    alreadyIndexed?: boolean;
    message?: string;
  }>> {
    return this.executeAction<{
      resourceId: string;
      chunksCount: number;
      alreadyIndexed?: boolean;
      message?: string;
    }>('indexNursingReferenceResource', params);
  }

  /**
   * Read the persisted indexing status for one uploaded Nursing Reference Library file.
   * Strictly Admin-only.
   */
  static async getNursingReferenceIndexStatus(
    driveFileId: string
  ): Promise<ApiResponse<CNENursingReferenceIndexStatus>> {
    return this.executeAction<CNENursingReferenceIndexStatus>(
      'getNursingReferenceIndexStatus',
      { driveFileId }
    );
  }

  /**
   * Phase 4B: Upload an Open RN reference resource into the approved Drive folder.
   * Indexing is intentionally a separate second request.
   * Strictly Admin-only.
   */
  static async uploadNursingReferenceResource(params: {
    fileName: string;
    base64Data: string;
    resourceTitle: string;
    authorOrganization?: string;
    license?: string;
    version?: string;
  }): Promise<ApiResponse<{
    driveFileId: string;
    fileName: string;
    resourceId: string;
    uploadStatus: 'UPLOADED';
    indexStatus: 'PENDING';
    registryWarning?: string;
  }>> {
    return this.executeAction<{
      driveFileId: string;
      fileName: string;
      resourceId: string;
      uploadStatus: 'UPLOADED';
      indexStatus: 'PENDING';
      registryWarning?: string;
    }>('uploadNursingReferenceResource', params);
  }

  /**
   * Phase 4B: Surgically remove and unindex a nursing reference library resource.
   * Strictly Admin-only.
   */
  static async deleteNursingReferenceResource(params: {
    driveFileId: string;
  }): Promise<ApiResponse<{
    deletedChunksCount: number;
    message?: string;
  }>> {
    return this.executeAction<{
      deletedChunksCount: number;
      message?: string;
    }>('deleteNursingReferenceResource', params);
  }

  /**
   * Securely download or stream a Nursing Reference Library file.
   */
  static async downloadNursingReferenceResource(params: {
    driveFileId?: string;
    resourceId?: string;
  }): Promise<ApiResponse<{
    resourceId?: string;
    resourceTitle: string;
    authorOrganization?: string;
    fileName: string;
    fileType: string;
    mimeType: string;
    fileBase64: string;
  }>> {
    return this.executeAction<{
      resourceId?: string;
      resourceTitle: string;
      authorOrganization?: string;
      fileName: string;
      fileType: string;
      mimeType: string;
      fileBase64: string;
    }>('downloadNursingReferenceResource', params);
  }

  /**
   * CNE Activity Progress (Real data check across Material, Questions, QR, Participants, Post-Test, Finalization)
   */
  static async getCNEActivityProgress(cneId: string, forceFresh = false): Promise<ApiResponse<CNEActivityProgress>> {
    return this.executeAction<CNEActivityProgress>('getCNEActivityProgress', { cneId, forceFresh });
  }

  /**
   * Question Set Management & Locking APIs
   */
  static async saveCNEQuestions(params: {
    cneId: string;
    questions: CNEQuestion[];
  }): Promise<ApiResponse<{ totalQuestions: number; finalizedCount: number; readyForPostTest: boolean }>> {
    return this.executeAction('saveCNEQuestions', params);
  }

  static async getCNEQuestions(cneId: string): Promise<ApiResponse<CNEQuestion[]>> {
    return this.executeAction<CNEQuestion[]>('getCNEQuestions', { cneId });
  }

  /**
   * QR Code Generation & Resolution APIs
   */
  static async getQRToken(cneId: string, options?: { checkOnly?: boolean }): Promise<ApiResponse<{ hasQR?: boolean; qrToken: string; cneId: string; topic: string; finalizedCount: number }>> {
    return this.executeAction<{ hasQR?: boolean; qrToken: string; cneId: string; topic: string; finalizedCount: number }>('getQRToken', {
      cneId,
      checkOnly: options?.checkOnly ?? false
    });
  }



  /**
   * Participant Post-Test APIs
   *
   * Public QR participants use a two-step email OTP flow:
   * 1) requestPostTestOtp()
   *    - INTERNAL: Employee ID -> registered Officers data EmailID
   *    - EXTERNAL: Name + Email
   * 2) verifyPostTestOtp()
   *    -> returns a short-lived CNE-bound participant verification token.
   *
   * That token must then be supplied to getPostTestQuestions() and
   * submitPostTest(). The server remains authoritative for identity, CNE status,
   * OTP validity, and duplicate-submission protection.
   */
  static async requestPostTestOtp(
    params: PostTestOtpRequest
  ): Promise<ApiResponse<PostTestOtpRequestData>> {
    return this.executeAction<PostTestOtpRequestData>('requestPostTestOtp', params);
  }

  static async verifyPostTestOtp(
    params: PostTestOtpVerificationRequest
  ): Promise<ApiResponse<PostTestParticipantVerificationData>> {
    return this.executeAction<PostTestParticipantVerificationData>('verifyPostTestOtp', params);
  }


  static async getPostTestQuestions(params: {
    cneId?: string;
    qrToken?: string;
    employeeId?: string;
    participantVerificationToken?: string;
  }): Promise<ApiResponse<{
    alreadySubmitted: boolean;
    submission?: any;
    cneId: string;
    topic: string;
    area: string;
    participantType?: 'INTERNAL' | 'EXTERNAL';
    participantName?: string;
    questions?: CNEQuestion[];
  }>> {
    return this.executeAction('getPostTestQuestions', params);
  }

  static async submitPostTest(params: {
    cneId?: string;
    qrToken?: string;
    employeeId?: string;
    participantVerificationToken?: string;
    answers: Record<string, string>;
  }): Promise<ApiResponse<PostTestSubmissionResult>> {
    return this.executeAction<PostTestSubmissionResult>('submitPostTest', params);
  }

  /**
   * Participant Management APIs
   */
  static async addManualParticipants(params: {
    cneId: string;
    participants: Array<{
      employeeId?: string;
      name?: string;
      designation?: string;
      department?: string;
      remarks?: string;
    }>;
  }): Promise<ApiResponse<{ count?: number; addedCount?: number }>> {
    return this.executeAction<{ count?: number; addedCount?: number }>('addManualParticipants', params);
  }

  static async getCNEParticipants(cneId: string): Promise<ApiResponse<CNEParticipantsSummary>> {
    return this.executeAction<CNEParticipantsSummary>('getCNEParticipants', { cneId });
  }

  /**
   * CNE Lifecycle Completion & Cancellation APIs
   */
  static async finalizeCNE(cneId: string, remarks?: string): Promise<ApiResponse<{ dataId: string }>> {
    const res = await this.executeAction<{ dataId: string }>('finalizeCNE', { cneId, remarks });
    if (res.success) {
      this.invalidateCache('getCNERecords');
      this.invalidateCache('getProgramImpact');
    }
    return res;
  }

  static async cancelCNE(cneId: string, remarks?: string): Promise<ApiResponse> {
    const res = await this.executeAction('cancelCNE', { cneId, remarks });
    if (res.success) {
      this.invalidateCache('getCNERecords');
      this.invalidateCache('getProgramImpact');
    }
    return res;
  }

}
