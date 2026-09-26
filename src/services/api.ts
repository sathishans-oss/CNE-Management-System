import {
  ApiResponse,
  Area,
  CNEApplication,
  CNERecord,
  CNEReportStats,
  ProgramImpactStats,
  ChairpersonMessageData,
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
  CNELearningResourceExtractedContent,
  CNENursingReferenceResource,
  CNENursingReferenceDriveFile,
  CNEAiQuotaInfo,
  CNEParticipantsSummary,
  CNEActivityProgress,
  PostTestSubmissionResult,
  SheetAuditItem,
  CNETopicEvidenceResult,
  Phase4DValidationResult
} from '../types';
import {
  INITIAL_AREAS,
  INITIAL_OFFICERS,
  INITIAL_ROLES,
  INITIAL_CNE_RECORDS,
  INITIAL_UPCOMING_CLASSES,
  INITIAL_GALLERY,
  INITIAL_CHAIRPERSON_MESSAGE,
  INITIAL_NEWS_EVENTS,
  INITIAL_QUICK_LINKS,
  INITIAL_COORDINATOR_DESK,
  INITIAL_PROGRAM_IMPACT
} from './initialData';

let _inMemoryCNERecords: CNERecord[] = [...INITIAL_CNE_RECORDS, ...INITIAL_UPCOMING_CLASSES];
let _inMemoryAreas: Area[] = [...INITIAL_AREAS];
let _inMemoryRoles: RoleMapping[] = [...INITIAL_ROLES];
let _inMemoryCoordinatorDesk: CoordinatorDeskInfo = { ...INITIAL_COORDINATOR_DESK };
let _inMemoryNews: NewsEventItem[] = [...INITIAL_NEWS_EVENTS];
let _inMemoryQuickLinks: QuickLinkItem[] = [...INITIAL_QUICK_LINKS];
let _inMemoryGallery: GalleryItem[] = [...INITIAL_GALLERY];

const STORAGE_KEYS = {
  SESSION: 'cne_session_user'
};

// Actively purge legacy mock credential storage or environment mode flags from browser storage
try {
  localStorage.removeItem('cne_user_creds');
  localStorage.removeItem('CNE_ENVIRONMENT_MODE');
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('CNE_CUSTOM_APPS_SCRIPT')) {
      localStorage.removeItem(k);
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
  // 1. Prefer Google Sheets display value if available and valid duration
  if (displayValue !== null && displayValue !== undefined) {
    const disp = String(displayValue).trim();
    if (disp) {
      const durMatch = disp.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
      if (durMatch) {
        if (durMatch[3] !== undefined) {
          const m1 = durMatch[2].length === 1 ? '0' + durMatch[2] : durMatch[2];
          const s1 = durMatch[3].length === 1 ? '0' + durMatch[3] : durMatch[3];
          return `${durMatch[1]}:${m1}:${s1}`;
        }
        const m = durMatch[2].length === 1 ? '0' + durMatch[2] : durMatch[2];
        return `${durMatch[1]}:${m}:00`;
      }
    }
  }

  // 2. Safe numeric day-fraction conversion (Google Sheets serial value)
  if (typeof rawValue === 'number' && !isNaN(rawValue)) {
    const totalSeconds = Math.round(rawValue * 86400);
    if (totalSeconds >= 0) {
      const nHours = Math.floor(totalSeconds / 3600);
      const nMinutes = Math.floor((totalSeconds % 3600) / 60);
      const nSeconds = totalSeconds % 60;
      return `${nHours}:${nMinutes < 10 ? '0' : ''}${nMinutes}:${nSeconds < 10 ? '0' : ''}${nSeconds}`;
    }
  }

  // If rawValue is a duration string (e.g. "1:30:00" or "25:00:00")
  if (typeof rawValue === 'string') {
    const str = rawValue.trim();
    const durMatchStr = str.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
    if (durMatchStr) {
      if (durMatchStr[3] !== undefined) {
        const m2 = durMatchStr[2].length === 1 ? '0' + durMatchStr[2] : durMatchStr[2];
        const s2 = durMatchStr[3].length === 1 ? '0' + durMatchStr[3] : durMatchStr[3];
        return `${durMatchStr[1]}:${m2}:${s2}`;
      }
      const m3 = durMatchStr[2].length === 1 ? '0' + durMatchStr[2] : durMatchStr[2];
      return `${durMatchStr[1]}:${m3}:00`;
    }
  }

  // If rawValue is an 1899 Date object (Google Sheets returns Date for time-formatted cells under 24 hrs when read without display value)
  if (Object.prototype.toString.call(rawValue) === '[object Date]' || (rawValue instanceof Date)) {
    const d = rawValue as Date;
    if (!isNaN(d.getTime())) {
      const dHours = d.getHours();
      const dMinutes = d.getMinutes();
      const dSeconds = d.getSeconds();
      return `${dHours}:${dMinutes < 10 ? '0' : ''}${dMinutes}:${dSeconds < 10 ? '0' : ''}${dSeconds}`;
    }
  }

  // 3. Safe fallback handling
  return '1:00:00';
}

export class ApiService {
  /**
   * Get configured Google Apps Script Web App URL
   */
  static isLiveBackendConnected(): boolean {
    return !!this.getAppsScriptUrl();
  }

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
    params: Record<string, any> = {},
    session: SessionUser | null
  ): ApiResponse<T> {
    const empId = String(params.employeeId || session?.employeeId || '').trim().toUpperCase();

    switch (action) {
      case 'ping':
        return { success: true, message: 'Local preview active (mock clinical dataset loaded).' } as ApiResponse<T>;

      case 'login': {
        const officer = INITIAL_OFFICERS.find(o => o.employeeId.toUpperCase() === empId);
        const roleEntry = _inMemoryRoles.find(r => r.employeeId.toUpperCase() === empId);
        const userRole = roleEntry?.role || (empId === 'RSNHO000841' || empId === 'FNMDCNO00067' ? 'ADMIN' : 'ADMIN');
        const sessionUser: SessionUser = {
          employeeId: empId || 'RSNHO000841',
          name: officer?.name || roleEntry?.name || 'Dr. Anita Rani Kansal',
          designation: officer?.designation || roleEntry?.designation || 'C.N.O / Admin',
          role: userRole,
          token: 'preview-token-' + Date.now(),
          assignedArea: roleEntry?.area || 'All Department'
        };
        return { success: true, data: sessionUser as any, message: 'Authentication successful (Preview Mode)' };
      }

      case 'getCNERecords':
        return { success: true, data: [..._inMemoryCNERecords] as any };

      case 'getAreas':
        return { success: true, data: [..._inMemoryAreas] as any };

      case 'getOfficersDropdown':
        return { success: true, data: [...INITIAL_OFFICERS] as any };

      case 'getRoles':
        return { success: true, data: [..._inMemoryRoles] as any };

      case 'getChairpersonMessage':
        return { success: true, data: INITIAL_CHAIRPERSON_MESSAGE as any };

      case 'getNewsEvents':
        return { success: true, data: [..._inMemoryNews] as any };

      case 'getQuickLinks':
        return { success: true, data: [..._inMemoryQuickLinks] as any };

      case 'getProgramImpact': {
        const completed = _inMemoryCNERecords.filter(c => c.status === 'Completed');
        const stats: ProgramImpactStats = {
          totalCompletedClasses: completed.length,
          cneDuration: '08:30:00',
          totalDuration: '08:30:00',
          totalDurationSeconds: 30600,
          uniqueStaffTrained: 124,
          uniqueWardsCount: 6,
          attendanceComplianceRate: '94.2%',
          scope: session && session.employeeId ? 'user' : 'institutional'
        };
        return { success: true, data: stats as any };
      }

      case 'getCoordinatorDesk':
        return { success: true, data: _inMemoryCoordinatorDesk as any };

      case 'saveCoordinatorDesk':
        _inMemoryCoordinatorDesk = { ..._inMemoryCoordinatorDesk, ...params };
        return { success: true, message: 'Coordinator desk details updated.' } as ApiResponse<T>;

      case 'getGallery':
        return { success: true, data: [..._inMemoryGallery] as any };

      case 'setupAndVerifyCNESheets':
        return {
          success: true,
          message: 'All CNE Sheets verified successfully in Preview Mode.',
          auditReport: [
            { sheetName: 'Area', status: 'OK', rowCount: _inMemoryAreas.length },
            { sheetName: 'CNE Schedule', status: 'OK', rowCount: _inMemoryCNERecords.length },
            { sheetName: 'Staff Roles', status: 'OK', rowCount: _inMemoryRoles.length },
            { sheetName: 'CNE Officers', status: 'OK', rowCount: INITIAL_OFFICERS.length }
          ]
        } as unknown as ApiResponse<T>;

      case 'addCNE':
      case 'createCNE':
      case 'addUnscheduledCNE': {
        const newId = 'CNE-' + Date.now().toString(36).toUpperCase();
        const newRecord: CNERecord = {
          cneId: newId,
          dataId: newId,
          topic: params.topic || 'Clinical Nursing Education Workshop',
          area: params.area || 'All Department',
          fromDate: params.fromDate || new Date().toISOString().slice(0, 10),
          toDate: params.toDate || params.fromDate || new Date().toISOString().slice(0, 10),
          duration: params.duration || '1:00:00',
          resourcePersonEmpId: params.resourcePersonEmpId || session?.employeeId || '',
          resourcePersonName: params.resourcePersonName || session?.name || 'Resource Person',
          modeOfTeaching: params.modeOfTeaching || 'Lecture Cum Discussion',
          status: (params.status || (action === 'addUnscheduledCNE' ? 'Completed' : 'Scheduled')) as any,
          remarks: params.remarks || '',
          staffEmpIds: params.staffEmpIds || [],
          staffCount: (params.staffEmpIds?.length || 0),
          createdAt: new Date().toISOString()
        };
        _inMemoryCNERecords = [newRecord, ..._inMemoryCNERecords];
        return { success: true, data: newRecord as any, message: 'CNE session created successfully.' };
      }

      case 'updateCNE': {
        const targetId = params.cneId || params.classId || params.dataId;
        _inMemoryCNERecords = _inMemoryCNERecords.map(rec =>
          (rec.cneId === targetId || rec.classId === targetId || rec.dataId === targetId)
            ? { ...rec, ...params }
            : rec
        );
        return { success: true, message: 'CNE session updated successfully.' } as ApiResponse<T>;
      }

      case 'finalizeCNE': {
        const targetId = params.cneId || params.classId || params.dataId;
        _inMemoryCNERecords = _inMemoryCNERecords.map(rec =>
          (rec.cneId === targetId || rec.classId === targetId || rec.dataId === targetId)
            ? { ...rec, status: 'Completed', remarks: params.remarks || rec.remarks }
            : rec
        );
        return { success: true, message: 'CNE session finalized.' } as ApiResponse<T>;
      }

      case 'deleteCNE': {
        const targetId = params.cneId || params.classId || params.dataId;
        _inMemoryCNERecords = _inMemoryCNERecords.filter(rec =>
          !(rec.cneId === targetId || rec.classId === targetId || rec.dataId === targetId)
        );
        return { success: true, message: 'CNE session deleted.' } as ApiResponse<T>;
      }

      case 'addArea': {
        const newArea: Area = {
          id: 'AREA-' + (_inMemoryAreas.length + 1),
          name: params.name || 'New Ward',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
        _inMemoryAreas = [..._inMemoryAreas, newArea];
        return { success: true, data: newArea as any, message: 'Area added successfully.' };
      }

      case 'updateArea': {
        _inMemoryAreas = _inMemoryAreas.map(a =>
          a.id === params.id || a.name === params.oldName ? { ...a, ...params } : a
        );
        return { success: true, message: 'Area updated successfully.' } as ApiResponse<T>;
      }

      case 'addRole': {
        const newRole: RoleMapping = {
          employeeId: params.employeeId,
          name: params.name || params.employeeId,
          designation: params.designation || 'Nursing Officer',
          role: params.role || 'EMPLOYEE',
          area: params.area || 'All Department'
        };
        _inMemoryRoles = [..._inMemoryRoles, newRole];
        return { success: true, data: newRole as any, message: 'Role assigned successfully.' };
      }

      case 'deleteRole': {
        _inMemoryRoles = _inMemoryRoles.filter(r => r.employeeId !== params.employeeId);
        return { success: true, message: 'Role removed successfully.' } as ApiResponse<T>;
      }

      case 'changePassword': {
        const currentUser = this.getSessionUser();
        if (currentUser) {
          const updatedUser: SessionUser = {
            ...currentUser,
            isFirstLogin: false,
            mustChangePassword: false,
            token: currentUser.token || 'mock_token_' + Date.now()
          };
          this.saveSessionUser(updatedUser);
          return {
            success: true,
            message: 'Password updated successfully. You can now use your new password.',
            data: updatedUser
          } as ApiResponse<T>;
        }
        return { success: true, message: 'Password updated successfully.' } as ApiResponse<T>;
      }

      case 'resetPassword':
      case 'adminResetPassword':
        return { success: true, message: 'Password updated successfully.' } as ApiResponse<T>;

      default:
        return { success: true, message: 'Action executed successfully.' } as ApiResponse<T>;
    }
  }

  /**
   * Central Action Executor:
   * Connects to Google Apps Script Web App when configured, or provides seamless
   * in-memory persistence in development and preview mode.
   */
  static async executeAction<T = any>(
    action: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    const apiUrl = this.getAppsScriptUrl();
    const session = this.getSessionUser();

    // If backend URL is not configured, seamlessly execute via local in-memory store
    if (!apiUrl) {
      return this.executeLocalMockAction<T>(action, params, session);
    }

    const payload = {
      action,
      ...params,
      token: session?.token,
      loggedInEmployeeId: session?.employeeId
    };

    try {
      const controller = new AbortController();
      const timeoutMs = action === 'generateCNEQuestions' ? 120000 : 45000; // 120-sec timeout for Gemini generation in GAS, 45-sec for standard requests
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        // Check for session expiry/invalid token
        if (result.errorCode === 'UNAUTHORIZED' && session) {
          this.logout();
        }
        if (result.success && result.data && action.startsWith('get')) {
          try {
            const cacheKey = action === 'getProgramImpact'
              ? (session && session.employeeId ? `cne_cache_getProgramImpact_${session.employeeId.toLowerCase()}` : 'cne_cache_getProgramImpact_institutional')
              : (action === 'getCNERecords' && session && session.employeeId ? `cne_cache_getCNERecords_${session.employeeId.toLowerCase()}` : `cne_cache_${action}`);
            localStorage.setItem(cacheKey, JSON.stringify(result.data));
          } catch (e) {}
        }
        return result as ApiResponse<T>;
      } else {
        // If server returns HTTP error and it's a read query, attempt offline cache fallback
        if (action.startsWith('get')) {
          console.warn(`[CNE Service] HTTP ${response.status} on ${action}. Serving cached dataset.`);
          try {
            const cacheKey = action === 'getProgramImpact'
              ? (session && session.employeeId ? `cne_cache_getProgramImpact_${session.employeeId.toLowerCase()}` : 'cne_cache_getProgramImpact_institutional')
              : (action === 'getCNERecords' && session && session.employeeId ? `cne_cache_getCNERecords_${session.employeeId.toLowerCase()}` : `cne_cache_${action}`);
            const cached = localStorage.getItem(cacheKey);
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
      }
    } catch (err: any) {
      console.warn(`[CNE Service] Network notice executing ${action} against ${apiUrl}:`, err);
      const isTimeout = err?.name === 'AbortError';

      // For read queries, gracefully fall back to cached dataset if present
      if (action.startsWith('get') || action === 'ping') {
        try {
          const cacheKey = action === 'getProgramImpact'
            ? (session && session.employeeId ? `cne_cache_getProgramImpact_${session.employeeId.toLowerCase()}` : 'cne_cache_getProgramImpact_institutional')
            : (action === 'getCNERecords' && session && session.employeeId ? `cne_cache_getCNERecords_${session.employeeId.toLowerCase()}` : `cne_cache_${action}`);
          const cached = localStorage.getItem(cacheKey);
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

  /**
   * Test Connection with Diagnostics
   */
  static async testConnection(url: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return { success: false, message: 'URL is required.' };
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            success: true,
            message: `Connected successfully (${latencyMs}ms). ${data.message || 'Database service active.'}`,
            latencyMs
          };
        } else {
          return {
            success: false,
            message: data.message || 'Apps Script returned an unsuccessful response.'
          };
        }
      } else {
        return {
          success: false,
          message: `HTTP Error ${res.status}: ${res.statusText}. Verify Web App is deployed with Access: Anyone.`
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: e?.name === 'AbortError'
          ? 'Connection timed out. Please check the URL and deployment.'
          : (e?.message || 'Network request failed. Ensure CORS and Web App permissions are set to Anyone.')
      };
    }
  }

  /**
   * Authentication
   */
  static async login(employeeId: string, password: string): Promise<ApiResponse<SessionUser>> {
    const cleanEmpId = (employeeId || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanEmpId || !cleanPass) {
      return { success: false, message: 'Please enter both your Employee ID and Password.' };
    }

    const res = await this.executeAction<SessionUser>('login', {
      employeeId: cleanEmpId,
      password: cleanPass
    });

    if (res.success && res.data) {
      this.saveSessionUser(res.data);
    }
    return res;
  }

  static async changePassword(newPassword: string): Promise<ApiResponse<SessionUser>> {
    const res = await this.executeAction<SessionUser>('changePassword', { newPassword });
    if (res.success && res.data && res.data.token) {
      this.saveSessionUser(res.data);
    }
    return res;
  }

  static async resetPassword(employeeId: string, doj: string, newPassword: string): Promise<ApiResponse> {
    return this.executeAction('resetPassword', { employeeId, dateOfJoining: doj, doj, newPassword });
  }

  static async adminResetPassword(targetEmployeeId: string): Promise<ApiResponse> {
    return this.executeAction('adminResetPassword', { targetEmployeeId });
  }

  static logout() {
    const session = this.getSessionUser();
    if (session && session.employeeId) {
      localStorage.removeItem(`cne_cache_getProgramImpact_${session.employeeId.toLowerCase()}`);
      localStorage.removeItem(`cne_cache_getCNERecords_${session.employeeId.toLowerCase()}`);
    }
    localStorage.removeItem('cne_cache_getProgramImpact');
    localStorage.removeItem('cne_cache_getCNERecords');
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  static getSessionUser(): SessionUser | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse session user', e);
    }
    return null;
  }

  static getCurrentUser(): SessionUser {
    const user = this.getSessionUser();
    if (user) return user;

    // Default guest session for unauthenticated state
    return {
      employeeId: '',
      name: 'Guest User',
      designation: 'Visitor',
      email: '',
      role: 'EMPLOYEE',
      token: ''
    };
  }

  static saveSessionUser(user: SessionUser) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  }

  /**
   * Invalidate cached datasets stored in localStorage
   */
  static invalidateCache(actionOrKey?: string) {
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
      const session = this.getSessionUser();
      if (actionOrKey === 'getCNERecords') {
        localStorage.removeItem('cne_cache_getCNERecords');
        if (session && session.employeeId) {
          localStorage.removeItem(`cne_cache_getCNERecords_${session.employeeId.toLowerCase()}`);
        }
      } else if (actionOrKey === 'getProgramImpact') {
        localStorage.removeItem('cne_cache_getProgramImpact');
        localStorage.removeItem('cne_cache_getProgramImpact_institutional');
        if (session && session.employeeId) {
          localStorage.removeItem(`cne_cache_getProgramImpact_${session.employeeId.toLowerCase()}`);
        }
      } else {
        localStorage.removeItem(`cne_cache_${actionOrKey}`);
      }
    } catch {}
  }

  /**
   * Safe read from local storage cache for instant UI hydration (stale-while-revalidate)
   */
  static getCachedData<T = any>(action: string, specificKey?: string): T | null {
    try {
      const session = this.getSessionUser();
      const cacheKey = specificKey || (
        action === 'getProgramImpact'
          ? (session && session.employeeId ? `cne_cache_getProgramImpact_${session.employeeId.toLowerCase()}` : 'cne_cache_getProgramImpact_institutional')
          : (action === 'getCNERecords' && session && session.employeeId ? `cne_cache_getCNERecords_${session.employeeId.toLowerCase()}` : `cne_cache_${action}`)
      );
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
  static async getOfficersDropdown(): Promise<ApiResponse<Employee[]>> {
    return this.executeAction<Employee[]>('getOfficersDropdown');
  }

  static async getAreas(): Promise<ApiResponse<Area[]>> {
    return this.executeAction<Area[]>('getAreas');
  }

  static async addArea(name: string): Promise<ApiResponse> {
    const res = await this.executeAction('addArea', { name });
    if (res.success) {
      this.invalidateCache('getAreas');
    }
    return res;
  }

  static async updateArea(oldName: string, name: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse> {
    const res = await this.executeAction('updateArea', { oldName, name, status });
    if (res.success) {
      this.invalidateCache('getAreas');
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

  static async deleteCNE(cneId: string): Promise<ApiResponse> {
    const res = await this.executeAction('deleteCNE', { cneId, classId: cneId, dataId: cneId });
    if (res.success) {
      this.invalidateCache('getCNERecords');
      this.invalidateCache('getProgramImpact');
    }
    return res;
  }

  static async reviewCNE(
    cneId: string,
    status: 'Scheduled' | 'Completed' | 'Canceled',
    adminRemarks?: string
  ): Promise<ApiResponse> {
    const res = await this.executeAction('reviewCNE', { cneId, classId: cneId, status, adminRemarks });
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

  static async applyForClass(cneId: string, remarks?: string): Promise<ApiResponse<CNEApplication>> {
    return this.executeAction<CNEApplication>('applyForClass', { cneId, classId: cneId, remarks });
  }

  static async getMyApplications(): Promise<ApiResponse<CNEApplication[]>> {
    return this.executeAction<CNEApplication[]>('getMyApplications');
  }

  static async getAllApplications(): Promise<ApiResponse<CNEApplication[]>> {
    return this.executeAction<CNEApplication[]>('getAllApplications');
  }

  static async updateApplicationStatus(
    applicationId: string,
    status: CNEApplication['status'],
    remarks?: string
  ): Promise<ApiResponse> {
    return this.executeAction('updateApplicationStatus', { applicationId, status, remarks });
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
    return this.executeAction<{ id: string }>('addNewsEvent', item);
  }

  static async updateNewsEvent(id: string, data: Partial<NewsEventItem>): Promise<ApiResponse> {
    return this.executeAction('updateNewsEvent', { id, ...data });
  }

  static async deleteNewsEvent(id: string): Promise<ApiResponse> {
    return this.executeAction('deleteNewsEvent', { id });
  }

  /**
   * Chairperson Message & Institutional Content
   */
  static async getChairpersonMessage(): Promise<ApiResponse<ChairpersonMessageData>> {
    return this.executeAction<ChairpersonMessageData>('getChairpersonMessage');
  }

  static async updateChairpersonMessage(
    data: Partial<ChairpersonMessageData> & { base64Image?: string }
  ): Promise<ApiResponse<{ photoUrl?: string; driveFileId?: string; driveUrl?: string }>> {
    return this.executeAction<{ photoUrl?: string; driveFileId?: string; driveUrl?: string }>('updateChairpersonMessage', data);
  }

  /**
   * CNE Coordinator Desk APIs
   */
  static async getCoordinatorDesk(): Promise<ApiResponse<CoordinatorDeskInfo>> {
    return this.executeAction<CoordinatorDeskInfo>('getCoordinatorDesk');
  }

  static async updateCoordinatorDesk(data: Partial<CoordinatorDeskInfo>): Promise<ApiResponse<CoordinatorDeskInfo>> {
    return this.executeAction<CoordinatorDeskInfo>('updateCoordinatorDesk', data);
  }

  /**
   * Quick Links APIs
   */
  static async getQuickLinks(): Promise<ApiResponse<QuickLinkItem[]>> {
    return this.executeAction<QuickLinkItem[]>('getQuickLinks');
  }

  static async addQuickLink(item: Partial<QuickLinkItem>): Promise<ApiResponse<{ id: string }>> {
    return this.executeAction<{ id: string }>('addQuickLink', item);
  }

  static async updateQuickLink(id: string, data: Partial<QuickLinkItem>): Promise<ApiResponse> {
    return this.executeAction('updateQuickLink', { id, ...data });
  }

  static async deleteQuickLink(id: string): Promise<ApiResponse> {
    return this.executeAction('deleteQuickLink', { id });
  }

  /**
   * CNE Program Impact (Adaptive: Institutional when unauthenticated, Personal when logged in)
   */
  static async getProgramImpact(): Promise<ApiResponse<ProgramImpactStats>> {
    return this.executeAction<ProgramImpactStats>('getProgramImpact');
  }

  /**
   * Dashboard & Analytics
   */
  static async getDashboardStats(): Promise<ApiResponse<CNEReportStats>> {
    return this.executeAction<CNEReportStats>('getDashboardStats');
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
    resourcePersonName?: string;
    unifiedContent?: string;
    referenceText?: string;
    visibleToUsers?: boolean;
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
   * Phase 2: Authoritatively extract textual content from CNE learning resource in Drive
   */
  static async extractLearningResourceContent(cneId: string): Promise<ApiResponse<CNELearningResourceExtractedContent>> {
    return this.executeAction<CNELearningResourceExtractedContent>('extractLearningResourceContent', { cneId });
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
    visibleToUsers?: boolean;
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
   * Phase 4B: Upload an Open RN reference resource into the approved Drive folder and index it.
   * Strictly Admin-only.
   */
  static async uploadNursingReferenceResource(params: {
    fileName: string;
    base64Data: string;
    resourceTitle: string;
    authorOrganization?: string;
    license?: string;
    version?: string;
    visibleToUsers?: boolean;
  }): Promise<ApiResponse<{
    resourceId: string;
    chunksCount: number;
    message?: string;
  }>> {
    return this.executeAction<{
      resourceId: string;
      chunksCount: number;
      message?: string;
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
   * Toggle or set the visibility of a CNE Learning Material or Nursing Reference Library resource for users.
   * Strictly Admin-only.
   */
  static async setResourceVisibility(params: {
    resourceType: 'CNE_LEARNING_MATERIAL' | 'NURSING_REFERENCE_LIB';
    id: string;
    visibleToUsers: boolean;
  }): Promise<ApiResponse<{
    id: string;
    resourceType: string;
    visibleToUsers: boolean;
  }>> {
    return this.executeAction<{
      id: string;
      resourceType: string;
      visibleToUsers: boolean;
    }>('setResourceVisibility', params);
  }

  /**
   * Phase 4C: Local Topic-Relevance Retrieval
   * Retrieves deterministic ranked evidence chunks from CNE_Reference_Index.
   * Priority 1: UPLOADED_CNE chunks for the given CNE ID.
   * Priority 2: LOCAL_REFERENCE_LIB chunks from active Open RN reference resources.
   */
  static async retrieveCNETopicEvidence(params: {
    cneId: string;
    topic?: string;
  }): Promise<ApiResponse<CNETopicEvidenceResult>> {
    return this.executeAction<CNETopicEvidenceResult>('retrieveCNETopicEvidence', params);
  }

  /**
   * Phase 4D: Local Retrieval Validation Diagnostic (Admin-only)
   * Runs retrieveCNETopicEvidence() across 10 representative topics and returns a structured validation report.
   */
  static async runLocalRetrievalValidation(params?: {
    cneId?: string;
  }): Promise<ApiResponse<Phase4DValidationResult>> {
    return this.executeAction<Phase4DValidationResult>('runLocalRetrievalValidation', params || {});
  }

  /**
   * CNE Activity Progress (Real data check across Material, Questions, QR, Participants, Post-Test, Finalization)
   */
  static async getCNEActivityProgress(cneId: string): Promise<ApiResponse<CNEActivityProgress>> {
    return this.executeAction<CNEActivityProgress>('getCNEActivityProgress', { cneId });
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

  static async resolveQRToken(token: string): Promise<ApiResponse<any>> {
    return this.executeAction('resolveQRToken', { qrToken: token });
  }

  /**
   * Participant Post-Test APIs
   */
  static async getPostTestQuestions(params: {
    cneId?: string;
    qrToken?: string;
    employeeId?: string;
  }): Promise<ApiResponse<{
    alreadySubmitted: boolean;
    submission?: any;
    cneId: string;
    topic: string;
    area: string;
    questions?: CNEQuestion[];
  }>> {
    return this.executeAction('getPostTestQuestions', params);
  }

  static async submitPostTest(params: {
    cneId?: string;
    qrToken?: string;
    token?: string;
    employeeId: string;
    answers: Record<string, string>;
  }): Promise<ApiResponse<PostTestSubmissionResult>> {
    return this.executeAction<PostTestSubmissionResult>('submitPostTest', params);
  }

  /**
   * Participant Management APIs
   */
  static async addManualParticipant(params: {
    cneId: string;
    employeeId?: string;
    name?: string;
    designation?: string;
    department?: string;
    remarks?: string;
  }): Promise<ApiResponse> {
    return this.executeAction('addManualParticipant', params);
  }

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
    return this.executeAction<{ count?: number; addedCount?: number }>('addManualParticipant', params);
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
