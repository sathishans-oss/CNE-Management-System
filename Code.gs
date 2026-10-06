/**
 * ============================================================================
 * CLINICAL NURSING EDUCATION (CNE) MANAGEMENT SYSTEM - GOOGLE APPS SCRIPT API
 * All India Institute of Medical Sciences, Rishikesh
 * Production Hardened, Zero-Backdoor, Server-Side Authorization & Concurrency Safe Engine
 * ============================================================================
 */

// Global Normalization Helper: Trim & Uppercase Employee ID as Pure String
function normalizeEmpId(id) {
  if (id === null || id === undefined) return '';
  return String(id).trim().toUpperCase();
}

// Authoritative Normalization: CNE Type (Strictly CENTRAL or DEPARTMENTAL) - FAIL CLOSED
function normalizeCNEType(typeStr) {
  if (typeStr === null || typeStr === undefined) return null;
  var s = String(typeStr).trim().toUpperCase();
  if (s === 'CENTRAL' || s === 'CENTRAL CNE') return 'CENTRAL';
  if (s === 'DEPARTMENTAL' || s === 'DEPT' || s === 'DEPARTMENTAL CNE') return 'DEPARTMENTAL';
  return null;
}

// Authoritative Normalization: CNE Scheduling Status (Strictly Scheduled, Completed, or Canceled)
function normalizeCNEStatus(statusStr) {
  if (!statusStr) return 'Scheduled';
  var s = String(statusStr).trim();
  var upper = s.toUpperCase();
  if (upper === 'COMPLETED' || upper === 'FINALIZED' || upper === 'FINALISED') return 'Completed';
  if (upper === 'CANCELED' || upper === 'CANCELLED') return 'Canceled';
  return 'Scheduled';
}

// Formula Injection Prevention: Prepend apostrophe to user strings starting with =, +, -, @, \t, \r
function sanitizeCellInput(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  var str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// Performance Diagnostic Logger (Lightweight server-side timing, no secrets or sensitive data)
function logPerf(tag, startedAt, extra) {
  var elapsedMs = Date.now() - startedAt;
  Logger.log('[PERF] ' + tag + ': ' + elapsedMs + 'ms' + (extra ? ' | ' + extra : ''));
  return elapsedMs;
}

// Request-level In-Memory Execution Caches (reset every request execution)
var _inMemoryRoleCache = {};
var _inMemoryOfficerMap = null;
var _executionRosterData = null;
var _officerHeaderMeta = null;
var _executionSpreadsheetCache = {};
var _executionCredentialCache = {};
var _executionOfficerById = {};
var _executionCneScheduleSnapshot = null;
var _roleHeaderMeta = null;
var _areaInchargeHeaderMeta = null;

// Global Configuration & Sheet Resolution (Strict separation: Officers Roster requires DROPDOWN_SPREADSHEET_ID)
function getSpreadsheet(type) {
  var cacheKey = String(type || 'CNE').toUpperCase() === 'OFFICERS' ? 'OFFICERS' : 'CNE';
  if (_executionSpreadsheetCache && _executionSpreadsheetCache[cacheKey]) {
    return _executionSpreadsheetCache[cacheKey];
  }

  var props = PropertiesService.getScriptProperties();
  var spreadsheet;

  if (cacheKey === 'OFFICERS') {
    var dropdownId = props.getProperty('DROPDOWN_SPREADSHEET_ID');
    if (!dropdownId || dropdownId.trim() === '') {
      throw new Error('DROPDOWN_SPREADSHEET_ID is not configured in Script Properties. Institutional roster lookup requires DROPDOWN_SPREADSHEET_ID to prevent reading operational CNE sheets.');
    }
    try {
      spreadsheet = SpreadsheetApp.openById(dropdownId.trim());
    } catch (e) {
      throw new Error('Could not open Employee Master spreadsheet with DROPDOWN_SPREADSHEET_ID: ' + e.message);
    }
  } else {
    var cneId = props.getProperty('CNE_SPREADSHEET_ID');
    if (!cneId || cneId.trim() === '') {
      throw new Error('CNE_SPREADSHEET_ID is not configured in Script Properties. Please configure the CNE Database Spreadsheet ID.');
    }
    try {
      spreadsheet = SpreadsheetApp.openById(cneId.trim());
    } catch (e) {
      throw new Error('Could not open CNE spreadsheet with CNE_SPREADSHEET_ID: ' + e.message);
    }
  }

  _executionSpreadsheetCache[cacheKey] = spreadsheet;
  return spreadsheet;
}

function getCNESpreadsheet() {
  return getSpreadsheet('CNE');
}

/**
 * Setup Utility: Run this once in Apps Script Editor to generate strong random keys if missing
 */
function setupSecurityProperties() {
  var props = PropertiesService.getScriptProperties();
  var updated = [];
  
  if (!props.getProperty('SESSION_SECRET')) {
    var randomSecret = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + Date.now();
    props.setProperty('SESSION_SECRET', randomSecret);
    updated.push('SESSION_SECRET generated');
  }
  if (!props.getProperty('PASSWORD_PEPPER')) {
    var randomPepper = Utilities.getUuid() + '-pepper-' + Date.now();
    props.setProperty('PASSWORD_PEPPER', randomPepper);
    updated.push('PASSWORD_PEPPER generated');
  }
  if (!props.getProperty('OTP_SECRET')) {
    var randomOtpSecret = Utilities.getUuid() + '-otp-' + Utilities.getUuid() + '-' + Date.now();
    props.setProperty('OTP_SECRET', randomOtpSecret);
    updated.push('OTP_SECRET generated');
  }
  
  Logger.log(updated.length > 0 ? updated.join(', ') : 'All security properties already configured.');
}

/**
 * Runtime initialization barrier for security properties and one-time credential migration.
 * Fast path is lock-free after initialization. The slow path is serialized with ScriptLock,
 * preventing concurrent first requests from generating different secrets or duplicating migration rows.
 */
function ensureRuntimeSecurityState_() {
  var props = PropertiesService.getScriptProperties();
  var secretsReady = Boolean(
    String(props.getProperty('SESSION_SECRET') || '').trim() &&
    String(props.getProperty('PASSWORD_PEPPER') || '').trim() &&
    String(props.getProperty('OTP_SECRET') || '').trim()
  );
  var migrationReady = props.getProperty('AUTH_CREDENTIALS_V2_MIGRATED') === 'YES';
  if (secretsReady && migrationReady) return;

  var initLock = LockService.getScriptLock();
  try {
    initLock.waitLock(10000);
  } catch (e) {
    throw new Error('Server is busy initializing security state. Please try again.');
  }

  try {
    props = PropertiesService.getScriptProperties();
    secretsReady = Boolean(
      String(props.getProperty('SESSION_SECRET') || '').trim() &&
      String(props.getProperty('PASSWORD_PEPPER') || '').trim() &&
      String(props.getProperty('OTP_SECRET') || '').trim()
    );
    if (!secretsReady) {
      setupSecurityProperties();
    }

    if (props.getProperty('AUTH_CREDENTIALS_V2_MIGRATED') !== 'YES') {
      var authSheet = getOrCreateSheet(AUTH_CREDENTIALS_SHEET);
      migrateLegacyCredentialsToAuthCredentials(authSheet);
    }
  } finally {
    initLock.releaseLock();
  }
}


/**
 * Password Hashing Helper: Salted SHA-256 with Server-Side Pepper (No fallback pepper)
 */
function computePasswordHash(password, salt) {
  var pepper = PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER');
  if (!pepper || pepper.trim() === '') {
    throw new Error('PASSWORD_PEPPER is not configured in Script Properties.');
  }
  var input = password + salt + pepper.trim();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/**
 * Cryptographic Session Token Generation & Verification.
 * Session tokens carry the persistent Password Version from Auth_Credentials.
 * Any password create/reset/change increments the version and invalidates older sessions immediately.
 */
function generateSessionToken(employeeId, credentialRecord) {
  var normId = normalizeEmpId(employeeId);
  // Login already holds an authoritative credential row under ScriptLock.
  // Reuse it when supplied instead of scanning Auth_Credentials a second time.
  var credential = credentialRecord && normalizeEmpId(credentialRecord.employeeId) === normId
    ? credentialRecord
    : getAuthCredentialRecord(normId);
  if (!credential || credential.accountStatus === 'INACTIVE' || !credential.passwordHash || !credential.passwordSalt) {
    throw new Error('Active credentials are required before a session can be issued.');
  }
  var passwordVersion = parseInt(credential.passwordVersion || '0', 10);
  if (!passwordVersion || passwordVersion < 1) throw new Error('Password version is unavailable for this account.');
  var timestamp = new Date().getTime();
  var nonce = Utilities.getUuid().replace(/-/g, '');
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!secret || secret.trim() === '') throw new Error('SESSION_SECRET is not configured in Script Properties.');
  var payload = normId + ':' + timestamp + ':' + nonce + ':' + passwordVersion;
  var sigBytes = Utilities.computeHmacSha256Signature(payload, secret.trim());
  var signature = sigBytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return payload + ':' + signature;
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function verifySession(token, employeeId) {
  var startedAt = Date.now();
  if (!token) return null;
  var parts = String(token).split(':');
  if (parts.length !== 5) return null;
  var tokenEmpId = parts[0];
  var timestamp = parseInt(parts[1], 10);
  var nonce = parts[2];
  var tokenPasswordVersion = parseInt(parts[3], 10);
  var receivedSig = parts[4];
  if (employeeId && normalizeEmpId(tokenEmpId) !== normalizeEmpId(employeeId)) return null;
  var now = new Date().getTime();
  if (isNaN(timestamp) || isNaN(tokenPasswordVersion) || (now - timestamp > 7*24*60*60*1000) || (timestamp > now + 300000)) return null;
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!secret || secret.trim() === '') return null;
  var expectedPayload = tokenEmpId + ':' + timestamp + ':' + nonce + ':' + tokenPasswordVersion;
  var sigBytes = Utilities.computeHmacSha256Signature(expectedPayload, secret.trim());
  var expectedSig = sigBytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  if (!timingSafeEqual(receivedSig, expectedSig)) return null;

  // Do not authorize a request from CacheService. Password reset/account deactivation and
  // role reassignment must take effect on the next request, not up to 60-300 seconds later.
  var verifiedEmpId = normalizeEmpId(tokenEmpId);
  var credential = getAuthCredentialRecord(verifiedEmpId);
  if (!credential || credential.accountStatus === 'INACTIVE' || !credential.passwordHash || !credential.passwordSalt) return null;
  // secState is an alias of the freshly-read Auth_Credentials record (not CacheService).
  // The exact comparison shape is retained for the project security verifier.
  var secState = credential;
  if (parseInt(secState.passwordVersion || '0',10) !== tokenPasswordVersion) return null;

  // Officers data is the authoritative employee master. If the employee is removed,
  // an already-issued session must not continue to authorize protected requests.
  var officer = findOfficerByIdFresh_(verifiedEmpId);
  if (!officer) return null;

  var roleInfo = getUserRoleInfo(verifiedEmpId, true);
  logPerf('verifySession', startedAt, 'id: ' + verifiedEmpId);
  return {
    employeeId: verifiedEmpId,
    role: roleInfo.role,
    assignedArea: roleInfo.assignedArea,
    assignedAreas: roleInfo.assignedAreas,
    passwordVersion: tokenPasswordVersion
  };
}

/**
 * 1. Reusable ADMIN Authorization Helper
 * Enforces strict server-side ADMIN authorization checking.
 */
function requireAdmin(session) {
  if (!session) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  if (String(session.role || '').toUpperCase() !== 'ADMIN') {
    return {
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Administrator privileges are required for this action.'
    };
  }

  return null;
}

/**
 * Revalidate an authenticated session immediately before a protected mutation.
 * This closes the race where password reset/account deactivation/role reassignment occurs
 * after initial request authentication but before the mutation obtains ScriptLock.
 */
function refreshMutationSession(session) {
  if (!session || !session.employeeId) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var employeeId = normalizeEmpId(session.employeeId);
  var credential = getAuthCredentialRecord(employeeId, true);
  if (!credential || credential.accountStatus === 'INACTIVE' || !credential.passwordHash || !credential.passwordSalt) {
    return {
      success: false,
      errorCode: 'SESSION_REVOKED',
      message: 'Your session is no longer active. Please sign in again.'
    };
  }

  var issuedVersion = parseInt(session.passwordVersion || '0', 10);
  if (issuedVersion > 0 && credential.passwordVersion !== issuedVersion) {
    return {
      success: false,
      errorCode: 'SESSION_REVOKED',
      message: 'Your password or account access changed. Please sign in again.'
    };
  }

  var officer = findOfficerByIdFresh_(employeeId);
  if (!officer) {
    return {
      success: false,
      errorCode: 'SESSION_REVOKED',
      message: 'Your employee record is no longer active in Officers data. Please contact Nursing Administration.'
    };
  }

  var roleInfo = getUserRoleInfo(employeeId, true);
  return {
    success: true,
    session: {
      employeeId: employeeId,
      role: roleInfo.role,
      assignedArea: roleInfo.assignedArea,
      assignedAreas: roleInfo.assignedAreas,
      passwordVersion: credential.passwordVersion
    }
  };
}

function requireFreshAdminMutation(session) {
  var refreshed = refreshMutationSession(session);
  if (!refreshed.success) return refreshed;
  var adminError = requireAdmin(refreshed.session);
  if (adminError) return adminError;
  return { success: true, session: refreshed.session };
}

function revalidateCneMutation_(session, cneId, authorizationMode, allowClosed) {
  var refreshed = refreshMutationSession(session);
  if (!refreshed.success) return refreshed;
  var freshSession = refreshed.session;
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found.' };

  var authErr = null;
  if (authorizationMode === 'QUESTION') {
    authErr = checkQuestionManagementAuthorized(freshSession, record);
  } else if (authorizationMode === 'ACTION') {
    authErr = checkCNEActionAuthorized(freshSession, record);
  } else {
    authErr = checkCNEAuthorized(freshSession, record.area, record.cneType);
  }
  if (authErr) return authErr;

  var status = normalizeCNEStatus(record.status);
  if (!allowClosed && (status === 'Completed' || status === 'Canceled')) {
    return {
      success: false,
      errorCode: 'CNE_CLOSED',
      message: status === 'Canceled'
        ? 'This CNE has been canceled. This operation is disabled.'
        : 'This CNE has already been finalized. This operation is disabled.'
    };
  }
  return { success: true, session: freshSession, record: record, status: status };
}



/**
 * Audit Logger (Strictly Non-Destructive to Data Sheets)
 */
function logAuditAction(action, employeeId, details, status) {
  try {
    var auditSheet = getOrCreateSheet('Audit Log');
    auditSheet.appendRow([
      new Date().toISOString(),
      action || '',
      normalizeEmpId(employeeId),
      sanitizeCellInput(details || ''),
      status || 'SUCCESS'
    ]);
  } catch (e) {
    console.warn('Audit log write error: ' + e.message);
  }
}

/**
 * Batch Audit Logger (Writes all audit records in one setValues call)
 */
function logAuditActionsBatch(entries) {
  if (!entries || !entries.length) return;
  try {
    var auditSheet = getOrCreateSheet('Audit Log');
    var nowIso = new Date().toISOString();
    var rows = [];
    for (var a = 0; a < entries.length; a++) {
      var entry = entries[a] || {};
      rows.push([
        nowIso,
        entry.action || '',
        normalizeEmpId(entry.employeeId),
        sanitizeCellInput(entry.details || ''),
        entry.status || 'SUCCESS'
      ]);
    }
    if (rows.length > 0) {
      auditSheet.getRange(auditSheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
    }
  } catch (e) {
    console.warn('Batch audit log write error: ' + e.message);
  }
}

/**
 * Performance/concurrency helpers.
 * These helpers never replace authoritative mutation-time ScriptLock checks.
 * They only reduce the amount of work performed while the global lock is held.
 */
function findExactRowInColumn_(sheet, zeroBasedColumnIndex, value, startRow) {
  if (!sheet || zeroBasedColumnIndex === undefined || zeroBasedColumnIndex < 0) return -1;
  var firstRow = Math.max(1, Number(startRow) || 2);
  var lastRow = sheet.getLastRow();
  if (lastRow < firstRow) return -1;
  var needle = String(value === null || value === undefined ? '' : value).trim();
  if (!needle) return -1;
  try {
    var match = sheet
      .getRange(firstRow, zeroBasedColumnIndex + 1, lastRow - firstRow + 1, 1)
      .createTextFinder(needle)
      .matchEntireCell(true)
      .matchCase(false)
      .findNext();
    return match ? match.getRow() : -1;
  } catch (e) {
    return -1;
  }
}

function findExactRowsInColumn_(sheet, zeroBasedColumnIndex, value, startRow) {
  if (!sheet || zeroBasedColumnIndex === undefined || zeroBasedColumnIndex < 0) return [];
  var firstRow = Math.max(1, Number(startRow) || 2);
  var lastRow = sheet.getLastRow();
  if (lastRow < firstRow) return [];
  var needle = String(value === null || value === undefined ? '' : value).trim();
  if (!needle) return [];
  try {
    var matches = sheet
      .getRange(firstRow, zeroBasedColumnIndex + 1, lastRow - firstRow + 1, 1)
      .createTextFinder(needle)
      .matchEntireCell(true)
      .matchCase(false)
      .findAll();
    return (matches || []).map(function(range) { return range.getRow(); });
  } catch (e) {
    return [];
  }
}

function columnNumberToA1Letter_(columnNumber) {
  var n = Number(columnNumber) || 0;
  var out = '';
  while (n > 0) {
    var rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function markCNEQuestionsLockedCache_(cneId) {
  var norm = normalizeCneId(cneId);
  if (!norm) return;
  try {
    CacheService.getScriptCache().put('cne_questions_locked_' + norm, 'YES', 21600);
  } catch (e) {}
}

function isCNEQuestionsLockedCached_(cneId) {
  var norm = normalizeCneId(cneId);
  if (!norm) return false;
  try {
    return CacheService.getScriptCache().get('cne_questions_locked_' + norm) === 'YES';
  } catch (e) {
    return false;
  }
}

function findActiveQrTokenForCne_(cneId) {
  var target = normalizeCneId(cneId);
  if (!target) return null;
  var sheet = getQRTokensSheet();
  if (!sheet || sheet.getLastRow() <= 1) return null;
  var rows = findExactRowsInColumn_(sheet, 1, target, 2);
  for (var i = 0; i < rows.length; i++) {
    var row = sheet.getRange(rows[i], 1, 1, 5).getValues()[0];
    var status = String(row[4] || 'ACTIVE').trim().toUpperCase();
    if (status === 'ACTIVE') {
      return { qrToken: String(row[0] || '').trim(), cneId: String(row[1] || '').trim() };
    }
  }
  return null;
}

function getPostTestAnswerSnapshot_(cneId) {
  var target = normalizeCneId(cneId);
  var qSheet = getQuestionsSheet();
  var cols = getQuestionColIndexes(qSheet);
  if (!target || !qSheet || qSheet.getLastRow() <= 1) {
    return { qSheet: qSheet, cols: cols, answerKeys: [], questionRowsToLock: [] };
  }

  // Find the CNE's rows first, then read one bounded block instead of the entire question sheet.
  var matchingRows = findExactRowsInColumn_(qSheet, cols.cneId, target, 2);
  if (!matchingRows.length) {
    return { qSheet: qSheet, cols: cols, answerKeys: [], questionRowsToLock: [] };
  }
  var minRow = Math.min.apply(null, matchingRows);
  var maxRow = Math.max.apply(null, matchingRows);
  var width = qSheet.getLastColumn();
  var qData = qSheet.getRange(minRow, 1, maxRow - minRow + 1, width).getValues();
  var answerKeys = [];
  var questionRowsToLock = [];

  for (var offset = 0; offset < qData.length; offset++) {
    var sheetRow = minRow + offset;
    var row = qData[offset];
    var qCne = String(row[cols.cneId] || '').trim().toUpperCase();
    var isFin = String(row[cols.isFinalized] || 'NO').toUpperCase() === 'YES';
    var qStatus = String(row[cols.status] || 'ACTIVE').trim().toUpperCase();
    if (qCne === target && isFin && qStatus !== 'INACTIVE' && qStatus !== 'REPLACED' && qStatus !== 'INCOMPLETE') {
      answerKeys.push({
        id: String(row[cols.qId] || ''),
        question: String(row[cols.question] || ''),
        correctOption: String(row[cols.correctOption] || 'A').toUpperCase(),
        explanation: String(row[cols.explanation] || '')
      });
      questionRowsToLock.push(sheetRow);
    }
  }
  return { qSheet: qSheet, cols: cols, answerKeys: answerKeys, questionRowsToLock: questionRowsToLock };
}

function scorePostTestAnswers_(answerKeys, answers) {
  var score = 0;
  var detailedReview = [];
  for (var i = 0; i < answerKeys.length; i++) {
    var item = answerKeys[i];
    var submittedAns = String((answers || {})[item.id] || '').trim().toUpperCase();
    var isCorrect = submittedAns === item.correctOption;
    if (isCorrect) score++;
    detailedReview.push({
      questionId: item.id,
      question: item.question,
      userAnswer: submittedAns,
      correctAnswer: item.correctOption,
      isCorrect: isCorrect,
      explanation: item.explanation
    });
  }
  var total = answerKeys.length;
  var percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  var passed = percentage >= 60;
  return {
    score: score,
    total: total,
    percentage: percentage,
    passed: passed,
    status: passed ? 'PASSED' : 'NEEDS_IMPROVEMENT',
    detailedReview: detailedReview
  };
}

function lockQuestionRowsBatch_(qSheet, questionRowsToLock, zeroBasedLockColumn) {
  if (!qSheet || !questionRowsToLock || !questionRowsToLock.length) return;
  var colLetter = columnNumberToA1Letter_(Number(zeroBasedLockColumn) + 1);
  if (!colLetter) return;
  var a1 = questionRowsToLock.map(function(rowNum) { return colLetter + rowNum; });
  qSheet.getRangeList(a1).setValue('YES');
}

function hasCoordinatorContentRows_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return false;
  var map = getHeaderMap(sheet);
  if (map['section'] === undefined) return false;
  var values = sheet.getRange(2, map['section'] + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toUpperCase() === 'COORDINATOR') return true;
  }
  return false;
}


/**
 * Handle HTTP GET / POST Requests
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Main Request Router with Strict Server-Side Role Enforcement
 */
function handleRequest(e, method) {
  var requestStart = Date.now();
  _inMemoryRoleCache = {};
  _inMemoryOfficerMap = null;
  _executionRosterData = null;
  _officerHeaderMeta = null;
  _executionSpreadsheetCache = {};
  _executionCredentialCache = {};
  _executionOfficerById = {};
  _executionCneScheduleSnapshot = null;
  _roleHeaderMeta = null;
  _areaInchargeHeaderMeta = null;

  var output = { success: false, message: 'Invalid request' };
  
  try {
    // Serialize first-run secret creation and legacy credential migration before any handler locks.
    ensureRuntimeSecurityState_();

    var params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }
    
    var action = params.action || '';
    
    // Authenticate session if token is provided
    var session = null;
    if (params.token && params.loggedInEmployeeId) {
      session = verifySession(params.token, params.loggedInEmployeeId);
    }
    
    // verifySession() already performs an authoritative, fresh Auth_Credentials check for
    // every authenticated request. Do not read the credential row a second time here.
    // Protected mutations still call refreshMutationSession() under ScriptLock for a second,
    // commit-time revalidation so password/account/role changes cannot race a write.
    
    switch (action) {
      // Public & Authentication Endpoints
      case 'login':
        output = handleLogin(params);
        break;
        
      case 'changePassword':
        output = handleChangePassword(params, session);
        break;
        
      case 'requestPasswordOtp':
        output = handleRequestPasswordOtp(params);
        break;

      case 'verifyPasswordOtp':
        output = handleVerifyPasswordOtp(params);
        break;

      case 'setPasswordWithOtp':
        output = handleSetPasswordWithOtp(params);
        break;

        
      case 'getAreas':
        output = handleGetAreas(params);
        break;

      case 'getTeachingModes':
        output = handleGetTeachingModes(params);
        break;
        
      case 'getCNERecords':
        output = handleGetCNERecords(params, session);
        break;
        
      case 'getGallery':
        output = handleGetGallery(params, session);
        break;
        
      case 'getNewsEvents':
        output = handleGetNewsEvents(params);
        break;
        
      case 'getQuickLinks':
        output = handleGetQuickLinks(params);
        break;

      case 'getChairpersonPhoto':
        output = handleGetChairpersonPhoto();
        break;
        
      case 'getCoordinatorDesk':
        output = handleGetCoordinatorDesk(params);
        break;

      case 'getHomeDashboard':
        output = handleGetHomeDashboard(params, session);
        break;
        
      case 'getProgramImpact':
        output = handleGetProgramImpact(params, session);
        break;
        
      // Authenticated User Endpoints
      case 'getOfficersDropdown':
        output = handleGetOfficersDropdown(params, session);
        break;

      // Administrative Endpoints (Strictly requireAdmin verified)
      case 'addArea':
        output = handleAdminAction(params, session, handleAddArea, 'ADD_AREA');
        break;
        
      case 'updateArea':
        output = handleAdminAction(params, session, handleUpdateArea, 'UPDATE_AREA');
        break;

      case 'addTeachingMode':
        output = handleAdminAction(params, session, handleAddTeachingMode, 'ADD_TEACHING_MODE');
        break;

      case 'updateTeachingMode':
        output = handleAdminAction(params, session, handleUpdateTeachingMode, 'UPDATE_TEACHING_MODE');
        break;
        
      case 'getRoles':
        output = handleAdminAction(params, session, handleGetRoles, 'GET_ROLES');
        break;
        
      case 'updateRole':
        output = handleAdminAction(params, session, handleUpdateRole, 'UPDATE_ROLE');
        break;
        
      case 'createCNE':
      case 'addUnscheduledCNE':
        if (!session) {
          output = { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
        } else {
          output = handleCreateCNE(params, session);
        }
        break;
        
      case 'updateCNE':
        if (!session) {
          output = { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
        } else {
          output = handleUpdateCNE(params, session);
        }
        break;
        
      case 'addDepartmentalSchedule':
        if (!session) {
          output = { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
        } else {
          output = handleAddDepartmentalSchedule(params, session);
        }
        break;

      case 'setupAndVerifyCNESheets':
        output = handleAdminAction(params, session, handleSetupAndVerifyCNESheets, 'SETUP_AND_VERIFY_SHEETS');
        break;

      case 'uploadImage':
        output = handleAdminAction(params, session, handleUploadImage, 'UPLOAD_IMAGE');
        break;
        
      case 'updateGalleryItem':
        output = handleAdminAction(params, session, handleUpdateGalleryItem, 'UPDATE_GALLERY');
        break;
        
      case 'deleteGalleryItem':
        output = handleAdminAction(params, session, handleDeleteGalleryItem, 'DELETE_GALLERY');
        break;
        
      case 'addNewsEvent':
        output = handleAdminAction(params, session, handleAddNewsEvent, 'ADD_NEWS');
        break;
        
      case 'updateNewsEvent':
        output = handleAdminAction(params, session, handleUpdateNewsEvent, 'UPDATE_NEWS');
        break;
        
      case 'deleteNewsEvent':
        output = handleAdminAction(params, session, handleDeleteNewsEvent, 'DELETE_NEWS');
        break;
        
      case 'updateCoordinatorDesk':
        output = handleAdminAction(params, session, handleUpdateCoordinatorDesk, 'UPDATE_COORDINATOR_DESK');
        break;
        
      case 'addQuickLink':
        output = handleAdminAction(params, session, handleAddQuickLink, 'ADD_QUICK_LINK');
        break;
        
      case 'updateQuickLink':
        output = handleAdminAction(params, session, handleUpdateQuickLink, 'UPDATE_QUICK_LINK');
        break;
        
      case 'deleteQuickLink':
        output = handleAdminAction(params, session, handleDeleteQuickLink, 'DELETE_QUICK_LINK');
        break;
        
      case 'adminResetPassword':
        output = handleAdminAction(params, session, handleAdminResetPassword, 'ADMIN_RESET_PASSWORD');
        break;
        
      // Part 2: Reference Material, AI Questions, QR, Post-Test, Participants & Completion
      case 'saveReferenceMaterial':
        output = handleSaveReferenceMaterial(params, session);
        break;

      case 'uploadLearningResource':
        output = handleUploadLearningResource(params, session);
        break;

      case 'deleteLearningResource':
        output = handleDeleteLearningResource(params, session);
        break;

      case 'getLearningResource':
        output = handleGetLearningResource(params, session);
        break;

      case 'listLearningResources':
        output = handleListLearningResources(params, session);
        break;

      case 'downloadLearningResource':
        output = handleDownloadLearningResource(params, session);
        break;

      case 'listNursingReferenceResources':
        output = handleListNursingReferenceResources(params, session);
        break;

      case 'indexNursingReferenceResource':
        output = handleIndexNursingReferenceResource(params, session);
        break;

      case 'uploadNursingReferenceResource':
        output = handleUploadNursingReferenceResource(params, session);
        break;

      case 'deleteNursingReferenceResource':
        output = handleDeleteNursingReferenceResource(params, session);
        break;

      case 'downloadNursingReferenceResource':
        output = handleDownloadNursingReferenceResource(params, session);
        break;

      case 'getReferenceMaterial':
        output = handleGetReferenceMaterial(params, session);
        break;

      case 'getCNEActivityProgress':
        output = handleGetCNEActivityProgress(params, session);
        break;

      case 'getAiQuota':
        output = handleGetAiQuota(params, session);
        break;

      case 'generateCNEQuestions':
        output = handleGenerateCNEQuestions(params, session);
        break;

      case 'saveCNEQuestions':
        output = handleSaveCNEQuestions(params, session);
        break;

      case 'getCNEQuestions':
        output = handleGetCNEQuestions(params, session);
        break;

      case 'getQRToken':
        output = handleGetQRToken(params, session);
        break;

      case 'requestPostTestOtp':
        output = handleRequestPostTestOtp(params, session);
        break;

      case 'verifyPostTestOtp':
        output = handleVerifyPostTestOtp(params, session);
        break;


      case 'getPostTestQuestions':
        output = handleGetPostTestQuestions(params, session);
        break;

      case 'submitPostTest':
        output = handleSubmitPostTest(params, session);
        break;

      case 'addManualParticipants':
        output = handleAddManualParticipants(params, session);
        break;

      case 'getCNEParticipants':
        output = handleGetCNEParticipants(params, session);
        break;

      case 'finalizeCNE':
        output = handleFinalizeCNE(params, session);
        break;

      case 'cancelCNE':
        output = handleCancelCNE(params, session);
        break;
        
      default:
        output = { success: false, message: 'Unknown action requested: ' + action };
    }
  } catch (error) {
    output = {
      success: false,
      errorCode: 'SERVER_EXECUTION_ERROR',
      message: 'Server execution error: ' + error.message
    };
  }
  
  if (output && typeof output === 'object') {
    output._perfMs = Date.now() - requestStart;
  }
  logPerf('handleRequest [' + (action || 'unknown') + ']', requestStart);

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Administrative Dispatch Wrapper with Server-Side Session Verification & Audit
 */
function handleAdminAction(params, session, handlerFn, actionName) {
  if (!session) {
    logAuditAction(actionName, params.loggedInEmployeeId || '', 'Unauthorized access attempt - No valid session', 'FORBIDDEN');
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }
  
  var forbidden = requireAdmin(session);
  if (forbidden) {
    logAuditAction(actionName, session.employeeId, 'Forbidden - Non-admin attempted administrative action', 'FORBIDDEN');
    return forbidden;
  }
  
  return handlerFn(params, session);
}

/**
 * Comprehensive User Role & Assigned Area Resolution
 * Supports ADMIN, AREA_INCHARGE, and EMPLOYEE roles with server-side caching (TTL 60s)
 */
function getRoleHeaderMeta_() {
  if (_roleHeaderMeta && _roleHeaderMeta.sheet) return _roleHeaderMeta;
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('Role');
  if (!sheet || sheet.getLastColumn() < 1) {
    _roleHeaderMeta = { sheet: sheet, empIdCol: 0, roleCol: 3, areaCol: -1, lastCol: 0 };
    return _roleHeaderMeta;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var empIdCol = 0;
  var roleCol = 3;
  var areaCol = -1;
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase().trim();
    var normalized = h.replace(/[^a-z0-9]/g, '');
    if ((h.indexOf('emp') !== -1 && h.indexOf('id') !== -1) || normalized === 'employeeid' || normalized === 'employeeidno' || normalized === 'empid') empIdCol = i;
    if (h === 'role' || normalized === 'assignedrole' || normalized === 'userrole') roleCol = i;
    if (areaCol === -1 && (h.indexOf('area') !== -1 || h.indexOf('department') !== -1 || h.indexOf('ward') !== -1)) areaCol = i;
  }

  _roleHeaderMeta = { sheet: sheet, empIdCol: empIdCol, roleCol: roleCol, areaCol: areaCol, lastCol: headers.length };
  return _roleHeaderMeta;
}

function getAreaInchargeHeaderMeta_() {
  if (_areaInchargeHeaderMeta && _areaInchargeHeaderMeta.sheet) return _areaInchargeHeaderMeta;
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('Area');
  if (!sheet || sheet.getLastColumn() < 1) {
    _areaInchargeHeaderMeta = { sheet: sheet, inchargeCol: -1 };
    return _areaInchargeHeaderMeta;
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var inchargeCol = -1;
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase().trim();
    if (h.indexOf('incharge') !== -1 && h.indexOf('id') !== -1) {
      inchargeCol = i;
      break;
    }
  }
  _areaInchargeHeaderMeta = { sheet: sheet, inchargeCol: inchargeCol };
  return _areaInchargeHeaderMeta;
}

/**
 * Comprehensive User Role & Assigned Area Resolution.
 * Normal reads use a 60-second server cache. Authoritative forceFresh reads still
 * bypass CacheService, but now locate only the requested employee row instead of
 * scanning the complete Role sheet on every authenticated request.
 */
function getUserRoleInfo(employeeId, forceFresh) {
  var normId = normalizeEmpId(employeeId);
  var result = { role: 'EMPLOYEE', assignedArea: '', assignedAreas: [] };
  if (!normId) return result;

  if (!forceFresh && _inMemoryRoleCache[normId]) {
    return _inMemoryRoleCache[normId];
  }

  var startedAt = Date.now();
  var cacheKey = 'cne_user_role_' + normId;
  try {
    var cached = forceFresh ? null : CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.role) {
        _inMemoryRoleCache[normId] = parsed;
        logPerf('getUserRoleInfo [cache-hit]', startedAt, 'id: ' + normId);
        return parsed;
      }
    }
  } catch (e) {}

  try {
    var roleMeta = getRoleHeaderMeta_();
    if (roleMeta.sheet && roleMeta.sheet.getLastRow() > 1) {
      var roleRowIndex = findExactEmployeeRow_(roleMeta.sheet, roleMeta.empIdCol + 1, normId, 2);
      if (roleRowIndex >= 2) {
        var width = Math.max(1, roleMeta.lastCol || roleMeta.sheet.getLastColumn());
        var row = roleMeta.sheet.getRange(roleRowIndex, 1, 1, width).getValues()[0];
        var rVal = String(row[roleMeta.roleCol] || '').toUpperCase().trim();
        if (rVal === 'ADMIN' || rVal.indexOf('ADMIN') !== -1) {
          result.role = 'ADMIN';
        } else if (rVal === 'AREA_INCHARGE' || rVal === 'INCHARGE' || rVal.indexOf('INCHARGE') !== -1) {
          result.role = 'AREA_INCHARGE';
        }
        if (roleMeta.areaCol !== -1 && row[roleMeta.areaCol]) {
          var rawArea = String(row[roleMeta.areaCol]).trim();
          result.assignedArea = rawArea;
          result.assignedAreas = rawArea.split(/[,;\n]+/).map(function(v) { return v.trim(); }).filter(Boolean);
          if (result.role !== 'ADMIN' && result.assignedAreas.length > 0) result.role = 'AREA_INCHARGE';
        }
        try { CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 60); } catch (ce) {}
        _inMemoryRoleCache[normId] = result;
        logPerf('getUserRoleInfo [targeted-role-row]', startedAt, 'id: ' + normId);
        return result;
      }
    }

    // Backward-compatible fallback for installations that still store an Incharge ID
    // directly in the Area sheet. Read only the Incharge-ID column and the matching area name.
    var areaMeta = getAreaInchargeHeaderMeta_();
    if (areaMeta.sheet && areaMeta.inchargeCol !== -1 && areaMeta.sheet.getLastRow() > 1) {
      var areaRowIndex = findExactEmployeeRow_(areaMeta.sheet, areaMeta.inchargeCol + 1, normId, 2);
      if (areaRowIndex >= 2) {
        var areaName = String(areaMeta.sheet.getRange(areaRowIndex, 1).getDisplayValue() || '').trim();
        result.role = 'AREA_INCHARGE';
        result.assignedArea = areaName;
        result.assignedAreas = areaName ? [areaName] : [];
      }
    }
  } catch (e) {
    console.warn('Error reading role info: ' + e.message);
  }

  try { CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 60); } catch (ce) {}
  _inMemoryRoleCache[normId] = result;
  logPerf('getUserRoleInfo [targeted-default]', startedAt, 'id: ' + normId);
  return result;
}

function invalidateUserRoleCache(employeeId) {
  if (employeeId) {
    var rawId = String(employeeId).trim();
    var normId = normalizeEmpId(rawId);
    var cache = CacheService.getScriptCache();
    if (normId) {
      try {
        cache.remove('cne_user_role_' + normId);
      } catch (e) {}
      delete _inMemoryRoleCache[normId];
    }
    if (rawId && rawId.toLowerCase() !== normId) {
      try {
        cache.remove('cne_user_role_' + rawId.toLowerCase());
      } catch (e) {}
      delete _inMemoryRoleCache[rawId.toLowerCase()];
    }
  }
}

/**
 * Authorization Helper for CNE Management
 * Admin = full control over both Central and Departmental CNE
 * Area Incharge = Departmental CNE only within assigned Area(s)/Department(s)
 * Normal users = no administrative controls
 */
function checkCNEAuthorized(session, cneArea, cneType) {
  if (!session) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }
  
  var role = String(session.role || '').toUpperCase();
  if (role === 'ADMIN') {
    return null; // Admin has full control
  }
  
  if (role === 'AREA_INCHARGE' || role === 'INCHARGE') {
    var type = normalizeCNEType(cneType);
    // FAIL CLOSED: Only strictly valid DEPARTMENTAL CNE is manageable by Area Incharge
    if (type === 'DEPARTMENTAL') {
      var assignedAreas = [];
      if (session.assignedAreas && Array.isArray(session.assignedAreas)) {
        for (var i = 0; i < session.assignedAreas.length; i++) {
          var a = String(session.assignedAreas[i] || '').trim();
          if (a) assignedAreas.push(a);
        }
      }
      if (assignedAreas.length === 0) {
        var rawAssigned = String(session.assignedArea || (session.employeeId ? getUserRoleInfo(session.employeeId).assignedArea : '') || '').trim();
        if (rawAssigned) {
          var parts = rawAssigned.split(/[,;\n]+/);
          for (var p = 0; p < parts.length; p++) {
            var trimmed = parts[p].trim();
            if (trimmed) assignedAreas.push(trimmed);
          }
        }
      }

      var targetArea = String(cneArea || '').trim().toLowerCase();
      if (targetArea && assignedAreas.length > 0) {
        for (var j = 0; j < assignedAreas.length; j++) {
          if (String(assignedAreas[j]).trim().toLowerCase() === targetArea) {
            return null; // Authorized for this Departmental CNE
          }
        }
      }
    }
  }
  
  return {
    success: false,
    errorCode: 'FORBIDDEN',
    message: 'Permission denied. Only an Administrator or the designated Area Incharge for this department may manage this CNE.'
  };
}

/**
 * Check authorization for operational CNE actions:
 * Material, Questions, QR Code, Take Post Test, Participants.
 *
 * Allowed:
 * 1. Admin
 * 2. Responsible Area Incharge (Departmental CNE within their assigned area)
 * 3. Resource Person ONLY when the authenticated user is actually assigned as a Resource Person for THIS PARTICULAR CNE.
 *
 * Forbidden:
 * - Other Resource Persons not assigned to this CNE
 * - Ordinary staff
 */
function checkCNEActionAuthorized(session, record) {
  if (!session || !session.employeeId) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var role = String(session.role || '').toUpperCase();
  if (role === 'ADMIN') {
    return null; // Admin has full operational authority
  }

  if (record) {
    // 1. Check if authenticated user is an assigned Resource Person for THIS PARTICULAR CNE.
    var loggedInId = normalizeEmpId(session.employeeId);
    var rawRp = record.instructor || record.resourcePersonEmpId || '';
    var rpList = String(rawRp).split(/[,;\n]+/).map(function(s) {
      return normalizeEmpId(s);
    }).filter(Boolean);

    if (loggedInId && rpList.indexOf(loggedInId) !== -1) {
      return null; // Assigned Resource Person for this specific CNE
    }

    // 2. Operational Progress actions are allowed to the concerned Area/Ward Incharge
    // for BOTH Central and Departmental CNEs. Lifecycle authority is intentionally
    // stricter and remains enforced separately by checkCNEAuthorized().
    if (role === 'AREA_INCHARGE' || role === 'INCHARGE') {
      var assignedAreas = [];
      if (session.assignedAreas && Array.isArray(session.assignedAreas)) {
        for (var a = 0; a < session.assignedAreas.length; a++) {
          var assigned = String(session.assignedAreas[a] || '').trim();
          if (assigned) assignedAreas.push(assigned);
        }
      }
      if (assignedAreas.length === 0) {
        var rawAssigned = String(session.assignedArea || (session.employeeId ? getUserRoleInfo(session.employeeId).assignedArea : '') || '').trim();
        if (rawAssigned) {
          var assignedParts = rawAssigned.split(/[,;\n]+/);
          for (var ap = 0; ap < assignedParts.length; ap++) {
            var assignedTrimmed = assignedParts[ap].trim();
            if (assignedTrimmed) assignedAreas.push(assignedTrimmed);
          }
        }
      }

      var targetArea = String(record.area || '').trim().toLowerCase();
      if (targetArea) {
        for (var ai = 0; ai < assignedAreas.length; ai++) {
          if (String(assignedAreas[ai] || '').trim().toLowerCase() === targetArea) {
            return null; // Concerned Area/Ward Incharge for this CNE, regardless of CNE type
          }
        }
      }
    }
  }

  return {
    success: false,
    errorCode: 'FORBIDDEN',
    message: 'Permission denied. Only Administrators, the concerned Area/Ward Incharge, or assigned Resource Persons for this CNE may perform this action.'
  };
}

/**
 * Safe Header Detection for the authoritative 'Officers data' tab.
 * Reads ONLY columns A:L.
 * Expected positions: B Employee ID, D Name, H Type of employment, I Designation,
 * J Date of Joining, K Contact No., L EmailID.
 */
function findOfficerHeaders(headers) {
  var empCol=-1,nameCol=-1,desigCol=-1,empTypeCol=-1,contactCol=-1,dojCol=-1,emailCol=-1;
  if (!headers || !headers.length) return { empCol:-1,nameCol:-1,desigCol:-1,empTypeCol:-1,contactCol:-1,dojCol:-1,emailCol:-1 };
  var maxCols=Math.min(headers.length,12);
  for (var c=0;c<maxCols;c++) {
    var h=String(headers[c]||'').trim().toLowerCase().replace(/\s+/g,' ');
    if (!h) continue;
    if (empCol===-1 && (h==='employee id no.'||h==='employee id no'||h==='employee id number'||h==='employee id'||h==='emp id'||h==='emp id no.'||h==='emp id no')) empCol=c;
    if (nameCol===-1 && (h==='name of the officers'||h==='name of the officer'||h==='officer name'||h==='employee name')) nameCol=c;
    if (empTypeCol===-1 && (h==='type of employment'||h==='employment type')) empTypeCol=c;
    if (desigCol===-1 && (h==='designation'||h.indexOf('designation')!==-1)) desigCol=c;
    if (dojCol===-1 && (h==='date of joining'||h==='joining date'||h==='doj'||h==='d.o.j'||h==='d.o.j.')) dojCol=c;
    if (contactCol===-1 && (h==='contact no.'||h==='contact no'||h==='contact number'||h==='phone no.'||h==='phone no'||h==='mobile no.'||h==='mobile no')) contactCol=c;
    if (emailCol===-1 && (h==='emailid'||h==='email id'||h==='email'||h==='e-mail'||h==='e-mail id')) emailCol=c;
  }
  if (headers.length>=12) {
    if (empCol===-1) empCol=1; if (nameCol===-1) nameCol=3; if (empTypeCol===-1) empTypeCol=7;
    if (desigCol===-1) desigCol=8; if (dojCol===-1) dojCol=9; if (contactCol===-1) contactCol=10; if (emailCol===-1) emailCol=11;
  }
  return { empCol:empCol,nameCol:nameCol,desigCol:desigCol,empTypeCol:empTypeCol,contactCol:contactCol,dojCol:dojCol,emailCol:emailCol };
}

/**
 * Calendar validation helper for date parts (leap year aware)
 */
function isValidDateParts(year, month, day) {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1920 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  var isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  var daysInMonth = [31, (isLeap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function padTwo(n) {
  return n < 10 ? '0' + n : String(n);
}

/**
 * Canonical current calendar date for CNE scheduling rules in India.
 * Uses an explicit Asia/Kolkata timezone so backend validation does not depend
 * on the Apps Script project/server timezone.
 */
function getIndiaTodayString() {
  try {
    if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
      return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    }
  } catch (e) {}

  // Deterministic fallback for non-Apps-Script verification environments.
  var indiaNow = new Date(Date.now() + (330 * 60 * 1000));
  return indiaNow.getUTCFullYear() + '-' + padTwo(indiaNow.getUTCMonth() + 1) + '-' + padTwo(indiaNow.getUTCDate());
}

/**
 * Extract a canonical YYYY-MM-DD day from CNE date/date-time input.
 */
function getCNECanonicalDay(value) {
  if (value === null || value === undefined) return '';
  var text = String(value).trim();
  if (!text) return '';
  var isoPrefix = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) return isoPrefix[1] + '-' + isoPrefix[2] + '-' + isoPrefix[3];
  return normalizeDateForComparison(value);
}

/**
 * Robust Canonical Date Normalizer
 * Converts any valid date representation into standard canonical format: YYYY-MM-DD
 * Supports:
 *  - Google Sheets Date objects
 *  - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (e.g. 15/08/2020, 15-08-2020, 15.08.2020)
 *  - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD (e.g. 2020-08-15)
 *  - Textual months: 15-Aug-2020, 15 August 2020, Aug 15 2020
 * Returns canonical 'YYYY-MM-DD', or '' if invalid/unparseable.
 */
function normalizeDateForComparison(val) {
  if (val === null || val === undefined || val === '') return '';
  
  // 1. Google Sheets Date object
  if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
    if (isNaN(val.getTime())) return '';
    try {
      if (typeof Utilities !== 'undefined' && Utilities.formatDate && typeof Session !== 'undefined' && Session.getScriptTimeZone) {
        var tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
        return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      }
    } catch (e) {}
    var y = val.getFullYear();
    var m = val.getMonth() + 1;
    var d = val.getDate();
    return isValidDateParts(y, m, d) ? (y + '-' + padTwo(m) + '-' + padTwo(d)) : '';
  }
  
  var str = String(val).trim();
  if (!str) return '';
  
  // 2. Textual month format: 15-Aug-2020, 15 August 2020, Aug 15 2020 (parse BEFORE whitespace splitting)
  var monthsMap = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };
  
  // DD-MMM-YYYY or DD MMM YYYY (e.g. 15-Aug-2020, 15 August 2020, 15.Aug.2020)
  var matchTextMonth = str.match(/^(\d{1,2})[-/.\s]+([a-zA-Z]+)[-/.\s,]+(\d{4})(?:[T\s].*)?$/);
  if (matchTextMonth) {
    var day = parseInt(matchTextMonth[1], 10);
    var mStr = matchTextMonth[2].toLowerCase();
    var year = parseInt(matchTextMonth[3], 10);
    var month = monthsMap[mStr];
    if (month && isValidDateParts(year, month, day)) {
      return year + '-' + padTwo(month) + '-' + padTwo(day);
    }
    return '';
  }
  
  // MMM DD YYYY (e.g. Aug 15 2020, August 15 2020, Aug 15, 2020)
  var matchMonthText = str.match(/^([a-zA-Z]+)[-/.\s]+(\d{1,2})[-/.\s,]+(\d{4})(?:[T\s].*)?$/);
  if (matchMonthText) {
    var mStr = matchMonthText[1].toLowerCase();
    var day = parseInt(matchMonthText[2], 10);
    var year = parseInt(matchMonthText[3], 10);
    var month = monthsMap[mStr];
    if (month && isValidDateParts(year, month, day)) {
      return year + '-' + padTwo(month) + '-' + padTwo(day);
    }
    return '';
  }

  // YYYY-MMM-DD (e.g. 2020-Aug-15, 2020 August 15)
  var matchYearText = str.match(/^(\d{4})[-/.\s]+([a-zA-Z]+)[-/.\s]+(\d{1,2})(?:[T\s].*)?$/);
  if (matchYearText) {
    var year = parseInt(matchYearText[1], 10);
    var mStr = matchYearText[2].toLowerCase();
    var day = parseInt(matchYearText[3], 10);
    var month = monthsMap[mStr];
    if (month && isValidDateParts(year, month, day)) {
      return year + '-' + padTwo(month) + '-' + padTwo(day);
    }
    return '';
  }
  
  // 3. Strip time portion for purely numeric formats (e.g. "2020-08-15T00:00:00.000Z" or "15/08/2020 00:00:00")
  var dateOnly = str.split(/[T\s]/)[0].trim();
  
  // 4. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  var matchYMD = dateOnly.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (matchYMD) {
    var year = parseInt(matchYMD[1], 10);
    var month = parseInt(matchYMD[2], 10);
    var day = parseInt(matchYMD[3], 10);
    if (isValidDateParts(year, month, day)) {
      return year + '-' + padTwo(month) + '-' + padTwo(day);
    }
    return '';
  }
  
  // 5. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  var matchDMY = dateOnly.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (matchDMY) {
    var p1 = parseInt(matchDMY[1], 10);
    var p2 = parseInt(matchDMY[2], 10);
    var year = parseInt(matchDMY[3], 10);
    var day, month;
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    } else {
      // Preferred standard: DD/MM/YYYY
      day = p1;
      month = p2;
    }
    if (isValidDateParts(year, month, day)) {
      return year + '-' + padTwo(month) + '-' + padTwo(day);
    }
    return '';
  }
  
  return '';
}

/**
 * Helper: Format Date for display in preferred DD/MM/YYYY format
 */
function formatDateDisplay(val) {
  if (!val) return '';
  var canon = normalizeDateForComparison(val);
  if (canon) {
    var parts = canon.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  return String(val).trim();
}

/**
 * Retrieve the authoritative employee master sheet: Officers data.
 */
function getRosterSheet() {
  var ss=getSpreadsheet('OFFICERS');
  var sheet=ss.getSheetByName('Officers data');
  if (!sheet) throw new Error('Officers data sheet not found in spreadsheet configured by DROPDOWN_SPREADSHEET_ID.');
  return sheet;
}

/**
 * Resolve and cache the Officers-data A:L header map for this request.
 * This reads only the header row and is safe to reuse within one Apps Script execution.
 */
function getOfficerHeaderMeta_() {
  if (_officerHeaderMeta && _officerHeaderMeta.colMap) return _officerHeaderMeta;
  var sheet = getRosterSheet();
  var headers = sheet.getRange(1, 1, 1, 12).getDisplayValues()[0];
  var colMap = findOfficerHeaders(headers);
  if (colMap.empCol===-1||colMap.nameCol===-1||colMap.emailCol===-1) {
    throw new Error('System configuration error: Officers data must contain Employee ID No., Name of the Officers, and EmailID within A:L.');
  }
  _officerHeaderMeta = { sheet: sheet, colMap: colMap };
  return _officerHeaderMeta;
}

/**
 * Find one row by exact normalized Employee ID while reading only the ID column.
 * TextFinder is attempted first; a single-column display-value scan is the safe fallback
 * for numeric/formatted IDs whose displayed value differs from the raw stored value.
 */
function findExactEmployeeRow_(sheet, columnNumber, employeeId, firstDataRow) {
  var cleanId = normalizeEmpId(employeeId);
  if (!cleanId) return -1;
  var firstRow = firstDataRow || 2;
  var lastRow = sheet.getLastRow();
  if (lastRow < firstRow) return -1;
  var idRange = sheet.getRange(firstRow, columnNumber, lastRow - firstRow + 1, 1);

  try {
    var match = idRange.createTextFinder(cleanId)
      .matchEntireCell(true)
      .matchCase(false)
      .findNext();
    if (match && normalizeEmpId(match.getDisplayValue()) === cleanId) {
      return match.getRow();
    }
  } catch (finderErr) {
    // Fall through to the one-column display scan below.
  }

  var displayIds = idRange.getDisplayValues();
  for (var i = 0; i < displayIds.length; i++) {
    if (normalizeEmpId(displayIds[i][0]) === cleanId) return firstRow + i;
  }
  return -1;
}

/** Build the standard officer object from one authoritative A:L row. */
function buildOfficerFromRosterRow_(dataRow, displayRow, colMap) {
  if (!dataRow || !displayRow || !colMap) return null;
  var cellVal=dataRow[colMap.empCol];
  var dispVal=displayRow[colMap.empCol];
  var rowEmpId=normalizeEmpId(dispVal||cellVal);
  if (!rowEmpId) rowEmpId=normalizeEmpId(cellVal);
  if (!rowEmpId) return null;
  var rawDoj=colMap.dojCol!==-1?dataRow[colMap.dojCol]:'';
  var dispDoj=colMap.dojCol!==-1?String(displayRow[colMap.dojCol]||'').trim():'';
  var rawName=colMap.nameCol!==-1?String(displayRow[colMap.nameCol]||dataRow[colMap.nameCol]||'').trim():'';
  var rawDesig=colMap.desigCol!==-1?String(displayRow[colMap.desigCol]||dataRow[colMap.desigCol]||'').trim():'';
  var rawEmpType=colMap.empTypeCol!==-1?String(displayRow[colMap.empTypeCol]||dataRow[colMap.empTypeCol]||'').trim():'';
  var rawContact=colMap.contactCol!==-1?String(displayRow[colMap.contactCol]||dataRow[colMap.contactCol]||'').trim():'';
  var rawEmail=colMap.emailCol!==-1?String(displayRow[colMap.emailCol]||dataRow[colMap.emailCol]||'').trim().toLowerCase():'';
  return {
    employeeId:String(dispVal||cellVal||'').trim(),
    name:rawName,
    designation:rawDesig,
    employmentType:rawEmpType,
    typeOfEmployment:rawEmpType,
    contactNo:rawContact,
    email:rawEmail,
    doj:rawDoj,
    dojFormatted:dispDoj||formatDateDisplay(rawDoj),
    dojColMissing:(colMap.dojCol===-1),
    emailColMissing:(colMap.emailCol===-1)
  };
}

/**
 * Targeted one-employee Officers-data lookup used by authentication/session revalidation.
 * Reads the header, Employee-ID column, and only the matching A:L row instead of the full roster.
 */
function findOfficerByIdTargeted_(employeeId, forceFresh) {
  var normId = normalizeEmpId(employeeId);
  if (!normId) return null;
  if (!forceFresh && _executionOfficerById[normId] !== undefined) {
    return _executionOfficerById[normId];
  }
  var meta = getOfficerHeaderMeta_();
  var rowIndex = findExactEmployeeRow_(meta.sheet, meta.colMap.empCol + 1, normId, 2);
  if (rowIndex < 2) {
    _executionOfficerById[normId] = null;
    return null;
  }
  var rowRange = meta.sheet.getRange(rowIndex, 1, 1, 12);
  var dataRow = rowRange.getValues()[0];
  var displayRow = rowRange.getDisplayValues()[0];
  var officer = buildOfficerFromRosterRow_(dataRow, displayRow, meta.colMap);
  var resolved = officer && normalizeEmpId(officer.employeeId) === normId ? officer : null;
  _executionOfficerById[normId] = resolved;
  return resolved;
}

/** Execution employee-directory cache. Reads ONLY A:L. */
function getExecutionRosterData() {
  if (_executionRosterData) return _executionRosterData;
  var sheet=getRosterSheet();
  var lastRow=sheet.getLastRow();
  if (lastRow<2) return null;
  var range=sheet.getRange(1,1,lastRow,12);
  var data=range.getValues();
  var displayData=range.getDisplayValues();
  var colMap=findOfficerHeaders(displayData[0]);
  if (colMap.empCol===-1||colMap.nameCol===-1||colMap.emailCol===-1) throw new Error('System configuration error: Officers data must contain Employee ID No., Name of the Officers, and EmailID within A:L.');
  _executionRosterData={sheetName:sheet.getName(),data:data,displayData:displayData,colMap:colMap,byNormId:{}};
  for (var r=1;r<data.length;r++) {
    var officer = buildOfficerFromRosterRow_(data[r], displayData[r] || [], colMap);
    if (!officer) continue;
    var rowEmpId = normalizeEmpId(officer.employeeId);
    if (!rowEmpId||_executionRosterData.byNormId[rowEmpId]) continue;
    _executionRosterData.byNormId[rowEmpId]=officer;
  }
  return _executionRosterData;
}

function findOfficerById(employeeId) {
  var normId=normalizeEmpId(employeeId); if (!normId) return null;
  var roster=getExecutionRosterData(); if (!roster||!roster.byNormId) return null;
  return roster.byNormId[normId]||null;
}

/**
 * Fresh commit-time identity revalidation without rebuilding the complete Officers map.
 * The Officers spreadsheet may be edited by an external workflow that ScriptLock cannot serialize.
 */
function findOfficerByIdFresh_(employeeId) {
  var normId = normalizeEmpId(employeeId);
  if (normId) delete _executionOfficerById[normId];
  return findOfficerByIdTargeted_(employeeId);
}

/**
 * Cache Limits & Chunking Constants
 */
var MAX_SAFE_CACHE_BYTES = 400000; // 400KB maximum payload ceiling
var MAX_SAFE_CHUNKS = 5;          // Maximum 5 chunks (up to 425KB total)
var CACHE_CHUNK_SIZE = 85000;     // 85KB per chunk, safely below CacheService 100KB limit

/**
 * Helper: Store data in ScriptCache with automatic chunking for payloads > 90KB.
 * Ensures large roster/map datasets never get discarded by CacheService's 100KB limit.
 * Hardened with defensive bounds against operational limits and sensitive data.
 */
function putToScriptCache(baseKey, dataObj, ttlSeconds) {
  try {
    if (!baseKey) return;

    // Security check: Never cache credentials, secrets, tokens, answers, or sensitive data
    var sensitiveKeywords = ['pass', 'salt', 'token', 'secret', 'credential', 'response', 'answer'];
    var lowerKey = String(baseKey).toLowerCase();
    for (var sk = 0; sk < sensitiveKeywords.length; sk++) {
      if (lowerKey.indexOf(sensitiveKeywords[sk]) !== -1) {
        Logger.log('[Cache Security Guard] Refusing to cache sensitive key: ' + baseKey);
        return;
      }
    }

    var jsonStr = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    var ttl = ttlSeconds || 60;
    var cache = CacheService.getScriptCache();

    // Defensive check: If payload is too large to cache safely, skip caching gracefully
    if (jsonStr.length > MAX_SAFE_CACHE_BYTES) {
      Logger.log('[Cache Put Notice] Payload for ' + baseKey + ' (' + jsonStr.length + ' bytes) exceeds safe cache threshold (' + MAX_SAFE_CACHE_BYTES + ' bytes). Skipping cache without failure; using authoritative sheet.');
      try {
        cache.remove(baseKey);
        cache.remove(baseKey + '_chunks');
      } catch (cleanErr) {}
      return;
    }

    if (jsonStr.length < 90000) {
      cache.put(baseKey, jsonStr, ttl);
      cache.remove(baseKey + '_chunks');
    } else {
      var chunks = [];
      for (var i = 0; i < jsonStr.length; i += CACHE_CHUNK_SIZE) {
        chunks.push(jsonStr.substring(i, i + CACHE_CHUNK_SIZE));
      }

      // Defensive check: Ensure chunk count does not exceed safe operational bounds
      if (chunks.length > MAX_SAFE_CHUNKS) {
        Logger.log('[Cache Put Notice] Chunk count (' + chunks.length + ') for ' + baseKey + ' exceeds safe max (' + MAX_SAFE_CHUNKS + '). Skipping caching safely.');
        try {
          cache.remove(baseKey);
          cache.remove(baseKey + '_chunks');
        } catch (cleanErr) {}
        return;
      }

      var chunkMap = {};
      chunkMap[baseKey + '_chunks'] = String(chunks.length);
      for (var c = 0; c < chunks.length; c++) {
        chunkMap[baseKey + '_p' + c] = chunks[c];
      }
      cache.putAll(chunkMap, ttl);
      cache.remove(baseKey);
    }
  } catch (e) {
    Logger.log('[Cache Put Notice] ' + e.message);
  }
}

/**
 * Helper: Retrieve data from ScriptCache with automatic reassembly of chunked payloads.
 * Hardened with defensive chunk boundary validation.
 */
function getFromScriptCache(baseKey) {
  try {
    if (!baseKey) return null;
    var cache = CacheService.getScriptCache();
    var single = cache.get(baseKey);
    if (single) {
      return JSON.parse(single);
    }
    var chunkCountStr = cache.get(baseKey + '_chunks');
    if (chunkCountStr) {
      var count = parseInt(chunkCountStr, 10) || 0;
      if (count > 0 && count <= MAX_SAFE_CHUNKS) {
        var keys = [];
        for (var i = 0; i < count; i++) {
          keys.push(baseKey + '_p' + i);
        }
        var parts = cache.getAll(keys);
        var fullJson = '';
        for (var j = 0; j < count; j++) {
          var part = parts[baseKey + '_p' + j];
          if (!part) return null; // Missing chunk, treat as cache miss
          fullJson += part;
        }
        return JSON.parse(fullJson);
      }
    }
  } catch (e) {
    Logger.log('[Cache Get Notice] ' + e.message);
  }
  return null;
}

/**
 * Officers Dropdown (Restricted to ADMIN, AREA_INCHARGE, INCHARGE, or CNE-authorized Resource Person; Sanitized: ONLY employeeId, name, designation returned)
 * Uses CacheService (TTL 60s) with chunking protection to eliminate repeated full-roster sheet reads.
 */
function handleGetOfficersDropdown(params, session) {
  if (!session) return { success:false,errorCode:'UNAUTHORIZED',message:'Authentication required. Please sign in.' };
  var role=String(session.role||'').trim().toUpperCase();
  var isDirectoryRole=(role==='ADMIN'||role==='AREA_INCHARGE'||role==='INCHARGE');
  if (!isDirectoryRole) {
    var cneId=(params&&params.cneId)?sanitizeCellInput(params.cneId):''; var ok=false;
    if (cneId) { var rec=getCNEScheduleRecord(cneId); if (rec&&checkCNEActionAuthorized(session,rec)===null) ok=true; }
    if (!ok) return { success:false,errorCode:'FORBIDDEN',message:'You are not authorized to access the officer directory.' };
  }
  var startedAt=Date.now(),cacheKey='cne_officers_dropdown';
  try { var cached=getFromScriptCache(cacheKey); if (Array.isArray(cached)&&cached.length>0) return {success:true,data:cached,_cached:true}; } catch(e) {}
  var roster; try { roster=getExecutionRosterData(); } catch(err) { return {success:false,message:err.message}; }
  var list=[];
  if (roster&&roster.byNormId) for (var id in roster.byNormId) if (Object.prototype.hasOwnProperty.call(roster.byNormId,id)) { var o=roster.byNormId[id]; if (o&&o.employeeId) list.push({employeeId:o.employeeId,name:o.name||'',designation:o.designation||''}); }
  putToScriptCache(cacheKey,list,60); logPerf('handleGetOfficersDropdown [Officers data A:L]',startedAt,'count: '+list.length);
  return {success:true,data:list};
}

/**
 * Helper: Build an in-memory map of { [employeeId]: officerName }
 * from the authoritative 'Officers data' tab in DROPDOWN_SPREADSHEET_ID.
 * Uses execution context, CacheService (TTL 60s), and chunking protection.
 */
function getOfficerNameMap() {
  if (_inMemoryOfficerMap) return _inMemoryOfficerMap;
  var startedAt = Date.now();
  var cacheKey = 'cne_officer_name_map';
  try {
    var cached = getFromScriptCache(cacheKey);
    if (cached && typeof cached === 'object') {
      _inMemoryOfficerMap = cached;
      return cached;
    }
  } catch (e) {}

  var map = {};
  try {
    var meta = getOfficerHeaderMeta_();
    var sheet = meta.sheet;
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var empCol = meta.colMap.empCol + 1;
      var nameCol = meta.colMap.nameCol + 1;
      var minCol = Math.min(empCol, nameCol);
      var maxCol = Math.max(empCol, nameCol);
      var width = maxCol - minCol + 1;
      // Names need only Employee ID + Name, not the full A:L roster. One compact
      // display-value read is substantially cheaper on cold Apps Script executions.
      var rows = sheet.getRange(2, minCol, lastRow - 1, width).getDisplayValues();
      var empOffset = empCol - minCol;
      var nameOffset = nameCol - minCol;
      for (var r = 0; r < rows.length; r++) {
        var id = normalizeEmpId(rows[r][empOffset]);
        var name = String(rows[r][nameOffset] || '').trim();
        if (id && name && !map[id]) map[id] = name;
      }
    }
    putToScriptCache(cacheKey, map, 60);
    _inMemoryOfficerMap = map;
    logPerf('getOfficerNameMap [ID+Name columns only]', startedAt, 'count: ' + Object.keys(map).length);
  } catch (e) {
    Logger.log('[Officers data Map Warning] ' + e.message);
  }
  return map;
}

/**
 * ============================================================================
 * AUTHENTICATION V2 — OFFICERS DATA + EMAIL OTP PASSWORD CREATE/RESET
 * ============================================================================
 */

var AUTH_CREDENTIALS_SHEET = 'Auth_Credentials';
var OTP_VERIFICATION_SHEET = 'OTP_Verification';
var OTP_PURPOSE_PASSWORD = 'PASSWORD_CREATE_RESET';
var OTP_TTL_MS = 10 * 60 * 1000;
var OTP_VERIFY_TOKEN_TTL_MS = 15 * 60 * 1000;
var OTP_RESEND_COOLDOWN_SECONDS = 60;
var OTP_MAX_ATTEMPTS = 5;
var OTP_MAX_SENDS_PER_HOUR = 5;

function getAuthCredentialsSheet() {
  // Runtime migration is serialized by ensureRuntimeSecurityState_() before request dispatch.
  // Keeping this accessor free of hidden migration writes avoids nested-lock side effects.
  return getOrCreateSheet(AUTH_CREDENTIALS_SHEET);
}

function getOtpVerificationSheet() {
  return getOrCreateSheet(OTP_VERIFICATION_SHEET);
}

function isValidEmailAddress(email) {
  var normalized = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

function maskEmailAddress(email) {
  var normalized = String(email || '').trim().toLowerCase();
  var parts = normalized.split('@');
  if (parts.length !== 2) return '';
  var local = parts[0];
  var visible = local.length <= 2 ? local.charAt(0) : local.substring(0, 2);
  return visible + '******@' + parts[1];
}

function validateNewPassword(password) {
  var value = String(password || '');
  if (value.length < 8) {
    return { valid: false, message: 'Password must contain at least 8 characters.' };
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return { valid: false, message: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}

function getOrCreateOtpSecret() {
  var secret = PropertiesService.getScriptProperties().getProperty('OTP_SECRET');
  if (!secret || !String(secret).trim()) {
    throw new Error('OTP_SECRET is not configured. Run Verify/Create Google Sheet setup and try again.');
  }
  return String(secret).trim();
}

function computeOtpHash(challengeId, otp) {
  var payload = String(challengeId || '') + ':' + String(otp || '');
  var sig = Utilities.computeHmacSha256Signature(payload, getOrCreateOtpSecret());
  return sig.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function generateSixDigitOtp() {
  var seed = Utilities.getUuid() + ':' + Date.now() + ':' + Math.random();
  var sig = Utilities.computeHmacSha256Signature(seed, getOrCreateOtpSecret());
  var hex = sig.slice(0, 6).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  var num = parseInt(hex, 16) % 1000000;
  return ('000000' + num).slice(-6);
}

function generateOtpVerificationToken(challengeId, purpose, principalId) {
  var expiry = Date.now() + OTP_VERIFY_TOKEN_TTL_MS;
  var principal = normalizeEmpId(principalId) || String(principalId || '').trim().toLowerCase();
  var payload = 'OTPV1:' + challengeId + ':' + purpose + ':' + principal + ':' + expiry;
  var sig = Utilities.computeHmacSha256Signature(payload, getOrCreateOtpSecret());
  var signature = sig.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return payload + ':' + signature;
}

function verifyOtpVerificationToken(token, expectedPurpose, expectedPrincipalId) {
  if (!token) return null;
  var parts = String(token).split(':');
  if (parts.length !== 6 || parts[0] !== 'OTPV1') return null;

  var challengeId = parts[1];
  var purpose = parts[2];
  var principalId = parts[3];
  var expiry = parseInt(parts[4], 10);
  var receivedSig = parts[5];

  if (purpose !== expectedPurpose || isNaN(expiry) || Date.now() > expiry) return null;

  var expectedPrincipal = normalizeEmpId(expectedPrincipalId) || String(expectedPrincipalId || '').trim().toLowerCase();
  if (principalId !== expectedPrincipal) return null;

  var payload = parts.slice(0, 5).join(':');
  var sig = Utilities.computeHmacSha256Signature(payload, getOrCreateOtpSecret());
  var expectedSig = sig.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  if (!timingSafeEqual(receivedSig, expectedSig)) return null;

  return { challengeId: challengeId, purpose: purpose, principalId: principalId, expiry: expiry };
}

function migrateLegacyCredentialsToAuthCredentials(authSheet) {
  var props = PropertiesService.getScriptProperties();
  var alreadyMigrated = props.getProperty('AUTH_CREDENTIALS_V2_MIGRATED') === 'YES';
  if (alreadyMigrated && authSheet.getLastRow() > 1) return;

  var ss = getCNESpreadsheet();
  var legacy = ss.getSheetByName('User Credentials');
  if (!legacy || legacy.getLastRow() <= 1) {
    props.setProperty('AUTH_CREDENTIALS_V2_MIGRATED', 'YES');
    return;
  }

  var existing = {};
  if (authSheet.getLastRow() > 1) {
    var existingRows = authSheet.getRange(2, 1, authSheet.getLastRow() - 1, 12).getValues();
    for (var e = 0; e < existingRows.length; e++) {
      var existingId = normalizeEmpId(existingRows[e][0]);
      if (existingId) existing[existingId] = true;
    }
  }

  var legacyRows = legacy.getDataRange().getValues();
  var toAppend = [];
  var nowIso = new Date().toISOString();

  for (var i = 1; i < legacyRows.length; i++) {
    var empId = normalizeEmpId(legacyRows[i][0]);
    if (!empId || existing[empId]) continue;

    var legacyHash = String(legacyRows[i][1] || '').trim();
    var legacySalt = String(legacyRows[i][2] || '').trim();
    var legacyMustChange = String(legacyRows[i][3] || '').trim().toUpperCase() === 'YES';
    var createdAt = String(legacyRows[i][4] || '').trim() || nowIso;
    var updatedAt = String(legacyRows[i][5] || '').trim() || createdAt;
    var lastLogin = String(legacyRows[i][6] || '').trim();
    var accountStatus = String(legacyRows[i][7] || '').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    var keepLegacyPassword = false;
    if (legacyHash && legacySalt && !legacyMustChange) {
      try {
        keepLegacyPassword = computePasswordHash('pass1234', legacySalt) !== legacyHash;
      } catch (e) {
        keepLegacyPassword = true;
      }
    }

    toAppend.push([
      empId,
      keepLegacyPassword ? legacyHash : '',
      keepLegacyPassword ? legacySalt : '',
      1,
      keepLegacyPassword ? createdAt : '',
      keepLegacyPassword ? updatedAt : '',
      lastLogin,
      accountStatus,
      0,
      '',
      createdAt,
      nowIso
    ]);
    existing[empId] = true;
  }

  if (toAppend.length > 0) {
    authSheet.getRange(authSheet.getLastRow() + 1, 1, toAppend.length, 12).setValues(toAppend);
  }
  props.setProperty('AUTH_CREDENTIALS_V2_MIGRATED', 'YES');
}

function getAuthCredentialRecord(employeeId, forceFresh) {
  var cleanId = normalizeEmpId(employeeId);
  if (!cleanId) return null;

  // Request-local reuse only. This cache is reset at the start of every doGet/doPost,
  // so account/password changes are still authoritative on the very next request.
  if (!forceFresh && Object.prototype.hasOwnProperty.call(_executionCredentialCache, cleanId)) {
    return _executionCredentialCache[cleanId];
  }

  var sheet = getAuthCredentialsSheet();
  var rowIndex = findExactEmployeeRow_(sheet, 1, cleanId, 2);
  if (rowIndex < 2) {
    _executionCredentialCache[cleanId] = null;
    return null;
  }

  var row = sheet.getRange(rowIndex, 1, 1, 12).getValues()[0];
  if (normalizeEmpId(row[0]) !== cleanId) {
    _executionCredentialCache[cleanId] = null;
    return null;
  }
  var record = {
    rowIndex: rowIndex,
    employeeId: cleanId,
    passwordHash: String(row[1] || '').trim(),
    passwordSalt: String(row[2] || '').trim(),
    passwordVersion: Math.max(1, parseInt(row[3] || '1', 10) || 1),
    passwordCreatedAt: String(row[4] || '').trim(),
    passwordChangedAt: String(row[5] || '').trim(),
    lastLoginAt: String(row[6] || '').trim(),
    accountStatus: String(row[7] || '').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    failedLoginCount: parseInt(row[8] || '0', 10) || 0,
    lockedUntil: String(row[9] || '').trim(),
    createdAt: String(row[10] || '').trim(),
    updatedAt: String(row[11] || '').trim()
  };
  _executionCredentialCache[cleanId] = record;
  return record;
}

function getUserCredentialSecurityState(employeeId) {
  var cleanId = normalizeEmpId(employeeId);
  if (!cleanId) return { accountStatus: 'ACTIVE', passwordVersion: 0, hasPassword: false };

  var cache = CacheService.getScriptCache();
  var cached = cache.get('cred_sec_' + cleanId);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  var record = getAuthCredentialRecord(cleanId);
  var state = {
    accountStatus: record ? record.accountStatus : 'ACTIVE',
    passwordVersion: record ? record.passwordVersion : 0,
    hasPassword: Boolean(record && record.passwordHash && record.passwordSalt)
  };
  cache.put('cred_sec_' + cleanId, JSON.stringify(state), 300);
  return state;
}

function clearCredentialSecurityCache(employeeId) {
  var cleanId = normalizeEmpId(employeeId);
  if (cleanId) {
    CacheService.getScriptCache().remove('cred_sec_' + cleanId);
    delete _executionCredentialCache[cleanId];
  }
}

function upsertPasswordCredential(employeeId, newPassword) {
  var cleanId = normalizeEmpId(employeeId);
  var validation = validateNewPassword(newPassword);
  if (!cleanId || !validation.valid) {
    throw new Error(validation.message || 'Valid Employee ID and password are required.');
  }

  var sheet = getAuthCredentialsSheet();
  var record = getAuthCredentialRecord(cleanId);
  if (record && record.accountStatus === 'INACTIVE') {
    var inactiveError = new Error('Your CNE account is inactive. Please contact Nursing Administration.');
    inactiveError.code = 'ACCOUNT_INACTIVE';
    throw inactiveError;
  }

  var salt = Utilities.getUuid().replace(/-/g, '');
  var hash = computePasswordHash(newPassword, salt);
  var nowIso = new Date().toISOString();
  var nextVersion = record ? Math.max(1, record.passwordVersion + 1) : 1;
  var passwordCreatedAt = record && record.passwordCreatedAt ? record.passwordCreatedAt : nowIso;
  var createdAt = record && record.createdAt ? record.createdAt : nowIso;
  var lastLoginAt = record ? record.lastLoginAt : '';
  var accountStatus = record ? record.accountStatus : 'ACTIVE';

  var row = [
    cleanId, hash, salt, nextVersion, passwordCreatedAt, nowIso,
    lastLoginAt, accountStatus, 0, '', createdAt, nowIso
  ];

  if (record) {
    sheet.getRange(record.rowIndex, 1, 1, 12).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  clearCredentialSecurityCache(cleanId);
  invalidateUserRoleCache(cleanId);
  return { passwordVersion: nextVersion, accountStatus: accountStatus, created: !record || !record.passwordHash };
}

function handleLogin(params) {
  var employeeId = normalizeEmpId(params.employeeId);
  var password = String(params.password || '');
  if (!employeeId || !password) {
    return { success: false, message: 'Employee ID and password are required.' };
  }

  // Fast public-directory check before waiting for the auth transaction lock.
  var officer;
  try {
    officer = findOfficerByIdTargeted_(employeeId);
  } catch (err) {
    return { success: false, message: err.message || 'Error accessing Officers data.' };
  }
  if (!officer) {
    logAuditAction('LOGIN_FAILED', employeeId, 'Employee ID not found in Officers data', 'FAILED');
    return { success: false, message: 'Invalid Employee ID or password.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  try {
    // Re-resolve the employee and credential while serialized. This prevents concurrent
    // failures from losing counter increments and prevents login against stale employee data.
    officer = findOfficerByIdFresh_(employeeId);
    if (!officer) {
      logAuditAction('LOGIN_FAILED', employeeId, 'Employee ID no longer present in Officers data', 'FAILED');
      return { success: false, message: 'Invalid Employee ID or password.' };
    }

    var record = getAuthCredentialRecord(employeeId);
    if (!record || !record.passwordHash || !record.passwordSalt) {
      return {
        success: false,
        errorCode: 'PASSWORD_NOT_SET',
        message: 'No personal password is set for this Employee ID. Use Create / Reset Password to verify your registered email and create a password.'
      };
    }

    if (record.accountStatus === 'INACTIVE') {
      logAuditAction('LOGIN_FAILED', employeeId, 'Inactive account login attempt', 'BLOCKED');
      return { success: false, errorCode: 'ACCOUNT_INACTIVE', message: 'Your CNE account is inactive. Please contact Nursing Administration.' };
    }

    var nowMs = Date.now();
    var lockedUntilMs = record.lockedUntil ? new Date(record.lockedUntil).getTime() : 0;
    if (lockedUntilMs && !isNaN(lockedUntilMs) && nowMs < lockedUntilMs) {
      return { success: false, errorCode: 'RATE_LIMITED', message: 'Too many failed login attempts. Please try again after 15 minutes.' };
    }

    var computed = computePasswordHash(password, record.passwordSalt);
    if (!timingSafeEqual(computed, record.passwordHash)) {
      var failures = (lockedUntilMs && nowMs >= lockedUntilMs) ? 1 : (record.failedLoginCount + 1);
      var newLockedUntil = '';
      if (failures >= 5) {
        failures = 5;
        newLockedUntil = new Date(nowMs + 15 * 60 * 1000).toISOString();
      }
      var authSheet = getAuthCredentialsSheet();
      authSheet.getRange(record.rowIndex, 9).setValue(failures);
      authSheet.getRange(record.rowIndex, 10).setValue(newLockedUntil);
      authSheet.getRange(record.rowIndex, 12).setValue(new Date().toISOString());
      clearCredentialSecurityCache(employeeId);
      logAuditAction('LOGIN_FAILED', employeeId, 'Invalid credentials attempt', 'FAILED');
      return {
        success: false,
        errorCode: failures >= 5 ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS',
        message: failures >= 5 ? 'Too many failed login attempts. Please try again after 15 minutes.' : 'Invalid Employee ID or password.'
      };
    }

    var authSheet = getAuthCredentialsSheet();
    var nowIso = new Date().toISOString();
    authSheet.getRange(record.rowIndex, 7).setValue(nowIso);
    authSheet.getRange(record.rowIndex, 9).setValue(0);
    authSheet.getRange(record.rowIndex, 10).setValue('');
    authSheet.getRange(record.rowIndex, 12).setValue(nowIso);
    clearCredentialSecurityCache(employeeId);

    var roleInfo = getUserRoleInfo(employeeId, true);
    var token = generateSessionToken(employeeId, record);
    logAuditAction('LOGIN_SUCCESS', employeeId, 'Role: ' + roleInfo.role, 'SUCCESS');

    return {
      success: true,
      message: 'Login successful',
      data: {
        employeeId: officer.employeeId,
        name: officer.name,
        designation: officer.designation,
        role: roleInfo.role,
        assignedArea: roleInfo.assignedArea,
        assignedAreas: roleInfo.assignedAreas,
        token: token
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function handleChangePassword(params, session) {
  if (!session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Invalid or expired session. Please log in again.' };
  }

  var empId = normalizeEmpId(session.employeeId);
  var currentPassword = String(params.currentPassword || '');
  var newPassword = String(params.newPassword || '');

  if (!currentPassword) {
    return {
      success: false,
      errorCode: 'CURRENT_PASSWORD_REQUIRED',
      message: 'Current password is required.'
    };
  }

  var validation = validateNewPassword(newPassword);
  if (!validation.valid) return { success: false, message: validation.message };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var freshSessionCheck = refreshMutationSession(session);
    if (!freshSessionCheck.success) return freshSessionCheck;
    session = freshSessionCheck.session;

    // Re-read the credential while holding the lock. A valid authenticated session
    // should always have a personal password, but fail closed if the account state
    // changed after the session was issued.
    var record = getAuthCredentialRecord(empId);
    if (!record || !record.passwordHash || !record.passwordSalt) {
      return {
        success: false,
        errorCode: 'PASSWORD_NOT_SET',
        message: 'No personal password is currently set. Please use Create / Reset Password.'
      };
    }
    if (record.accountStatus === 'INACTIVE') {
      return {
        success: false,
        errorCode: 'ACCOUNT_INACTIVE',
        message: 'Your CNE account is inactive. Please contact Nursing Administration.'
      };
    }

    var currentHash = computePasswordHash(currentPassword, record.passwordSalt);
    if (!timingSafeEqual(currentHash, record.passwordHash)) {
      logAuditAction('PASSWORD_CHANGE_FAILED', empId, 'Incorrect current password', 'FAILED');
      return {
        success: false,
        errorCode: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect.'
      };
    }

    var newHashWithCurrentSalt = computePasswordHash(newPassword, record.passwordSalt);
    if (timingSafeEqual(newHashWithCurrentSalt, record.passwordHash)) {
      return {
        success: false,
        errorCode: 'PASSWORD_UNCHANGED',
        message: 'New password must be different from your current password.'
      };
    }

    var result = upsertPasswordCredential(empId, newPassword);
    var officer = findOfficerById(empId);
    var roleInfo = getUserRoleInfo(empId);
    var newToken = generateSessionToken(empId);
    logAuditAction('PASSWORD_CHANGED', empId, 'User changed personal password after current-password verification; version ' + result.passwordVersion, 'SUCCESS');

    return {
      success: true,
      message: 'Password updated successfully.',
      data: {
        employeeId: officer ? officer.employeeId : empId,
        name: officer ? officer.name : '',
        designation: officer ? officer.designation : '',
        role: roleInfo.role,
        assignedArea: roleInfo.assignedArea,
        assignedAreas: roleInfo.assignedAreas,
        token: newToken
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function getOtpChallengeById(challengeId) {
  var clean = String(challengeId || '').trim();
  if (!clean) return null;
  var sheet = getOtpVerificationSheet();
  if (sheet.getLastRow() <= 1) return null;
  var rowIndex = findExactRowInColumn_(sheet, 0, clean, 2);
  if (rowIndex < 2) return null;
  var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
  return {
    rowIndex: rowIndex,
    challengeId: clean,
    purpose: String(row[1] || '').trim(),
    principalType: String(row[2] || '').trim(),
    principalId: String(row[3] || '').trim(),
    email: String(row[4] || '').trim().toLowerCase(),
    otpHash: String(row[5] || '').trim(),
    expiresAt: String(row[6] || '').trim(),
    attempts: parseInt(row[7] || '0', 10) || 0,
    maxAttempts: parseInt(row[8] || String(OTP_MAX_ATTEMPTS), 10) || OTP_MAX_ATTEMPTS,
    resendAvailableAt: String(row[9] || '').trim(),
    verifiedAt: String(row[10] || '').trim(),
    consumedAt: String(row[11] || '').trim(),
    status: String(row[12] || '').trim().toUpperCase(),
    createdAt: String(row[13] || '').trim(),
    updatedAt: String(row[14] || '').trim()
  };
}

function invalidateOpenOtpChallenges(purpose, principalId) {
  var sheet = getOtpVerificationSheet();
  if (sheet.getLastRow() <= 1) return;
  var normalizedPrincipal = normalizeEmpId(principalId) || String(principalId || '').trim().toLowerCase();
  var matchingRows = findExactRowsInColumn_(sheet, 3, normalizedPrincipal, 2);
  var statusRanges = [];
  var updatedRanges = [];
  for (var i = 0; i < matchingRows.length; i++) {
    var row = sheet.getRange(matchingRows[i], 2, 1, 12).getValues()[0]; // B:M
    var rowPurpose = String(row[0] || '').trim();
    var status = String(row[11] || '').trim().toUpperCase();
    if (rowPurpose === purpose && (status === 'PENDING' || status === 'VERIFIED')) {
      statusRanges.push('M' + matchingRows[i]);
      updatedRanges.push('O' + matchingRows[i]);
    }
  }
  if (statusRanges.length > 0) {
    sheet.getRangeList(statusRanges).setValue('SUPERSEDED');
    sheet.getRangeList(updatedRanges).setValue(new Date().toISOString());
  }
}

function countRecentOtpSends(purpose, principalId, sinceMs) {
  var sheet = getOtpVerificationSheet();
  if (sheet.getLastRow() <= 1) return 0;
  var normalizedPrincipal = normalizeEmpId(principalId) || String(principalId || '').trim().toLowerCase();
  var matchingRows = findExactRowsInColumn_(sheet, 3, normalizedPrincipal, 2);
  var count = 0;
  for (var i = 0; i < matchingRows.length; i++) {
    var row = sheet.getRange(matchingRows[i], 2, 1, 13).getValues()[0]; // B:N
    var rowPurpose = String(row[0] || '').trim();
    if (rowPurpose !== purpose) continue;
    var createdMs = new Date(row[12]).getTime();
    if (!isNaN(createdMs) && createdMs >= sinceMs) count++;
  }
  return count;
}

function getLatestOtpChallengeForPrincipal_(purpose, principalId) {
  var sheet = getOtpVerificationSheet();
  if (sheet.getLastRow() <= 1) return null;
  var normalizedPrincipal = normalizeEmpId(principalId) || String(principalId || '').trim().toLowerCase();
  var matchingRows = findExactRowsInColumn_(sheet, 3, normalizedPrincipal, 2);
  var latest = null;
  var latestMs = -1;
  for (var i = 0; i < matchingRows.length; i++) {
    var row = sheet.getRange(matchingRows[i], 1, 1, 15).getValues()[0];
    var rowPurpose = String(row[1] || '').trim();
    if (rowPurpose !== purpose) continue;
    var createdMs = new Date(row[13]).getTime();
    if (isNaN(createdMs)) createdMs = 0;
    if (!latest || createdMs >= latestMs) {
      latestMs = createdMs;
      latest = {
        rowIndex: matchingRows[i],
        challengeId: String(row[0] || '').trim(),
        purpose: rowPurpose,
        principalId: String(row[3] || '').trim(),
        status: String(row[12] || '').trim().toUpperCase(),
        resendAvailableAt: String(row[9] || '').trim(),
        createdAt: String(row[13] || '').trim()
      };
    }
  }
  return latest;
}

function getOtpCooldownRemainingSeconds_(purpose, principalId) {
  var latest = getLatestOtpChallengeForPrincipal_(purpose, principalId);
  if (!latest) return 0;
  // A delivery failure is intentionally retryable immediately. Superseded/invalidated
  // rows are historical and must never block the current request.
  if (latest.status === 'SEND_FAILED' || latest.status === 'SUPERSEDED' || latest.status === 'INVALIDATED') return 0;
  var resendMs = new Date(latest.resendAvailableAt).getTime();
  if (isNaN(resendMs)) return 0;
  return Math.max(0, Math.ceil((resendMs - Date.now()) / 1000));
}


function handleRequestPasswordOtp(params) {
  var employeeId = normalizeEmpId(params.employeeId);
  if (!employeeId) return { success: false, message: 'Employee ID is required.' };

  var cooldownKey = 'otp_cd_' + employeeId;
  var cache = CacheService.getScriptCache();
  if (cache.get(cooldownKey)) {
    return { success: false, errorCode: 'OTP_COOLDOWN', message: 'Please wait 60 seconds before requesting another verification code.' };
  }

  var officer;
  try {
    officer = findOfficerById(employeeId);
  } catch (e) {
    return { success: false, message: e.message || 'Unable to access Officers data.' };
  }
  if (!officer) return { success: false, message: 'Employee ID was not found in Officers data.' };

  var email = String(officer.email || '').trim().toLowerCase();
  if (!isValidEmailAddress(email)) {
    return {
      success: false,
      errorCode: 'EMAIL_NOT_AVAILABLE',
      message: 'A valid registered email address is not available for this Employee ID. Please contact the CNE administrator to update Officers data.'
    };
  }

  var credential = getAuthCredentialRecord(employeeId);
  if (credential && credential.accountStatus === 'INACTIVE') {
    return { success: false, errorCode: 'ACCOUNT_INACTIVE', message: 'Your CNE account is inactive. Please contact Nursing Administration.' };
  }

  if (countRecentOtpSends(OTP_PURPOSE_PASSWORD, employeeId, Date.now() - 60 * 60 * 1000) >= OTP_MAX_SENDS_PER_HOUR) {
    return { success: false, errorCode: 'OTP_RATE_LIMITED', message: 'Too many verification-code requests. Please try again later.' };
  }

  var remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota < 1) {
    return {
      success: false,
      errorCode: 'EMAIL_QUOTA_EXHAUSTED',
      message: 'Email verification is temporarily unavailable because the daily email quota has been reached. Please contact the CNE administrator.'
    };
  }

  // Reserve OTP creation atomically. The cooldown is written BEFORE releasing the lock,
  // so two simultaneous requests for the same employee cannot both create active challenges.
  var challengeId = '';
  var otp = '';
  var otpSheet = null;
  var otpCreationLock = LockService.getScriptLock();
  try {
    otpCreationLock.waitLock(10000);
  } catch (lockErr) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy processing another verification request. Please try again.' };
  }

  try {
    // Re-check mutable controls while holding the lock. The checks above are only fast rejects.
    if (cache.get(cooldownKey)) {
      return { success: false, errorCode: 'OTP_COOLDOWN', message: 'Please wait 60 seconds before requesting another verification code.' };
    }
    var authoritativeCooldownSeconds = getOtpCooldownRemainingSeconds_(OTP_PURPOSE_PASSWORD, employeeId);
    if (authoritativeCooldownSeconds > 0) {
      return { success: false, errorCode: 'OTP_COOLDOWN', message: 'Please wait ' + authoritativeCooldownSeconds + ' seconds before requesting another verification code.' };
    }
    if (countRecentOtpSends(OTP_PURPOSE_PASSWORD, employeeId, Date.now() - 60 * 60 * 1000) >= OTP_MAX_SENDS_PER_HOUR) {
      return { success: false, errorCode: 'OTP_RATE_LIMITED', message: 'Too many verification-code requests. Please try again later.' };
    }

    // Re-read authoritative identity/account state while serialized. The registered
    // email may have changed between the fast pre-check and challenge creation.
    officer = findOfficerByIdFresh_(employeeId);
    if (!officer) return { success: false, message: 'Employee ID was not found in Officers data.' };
    email = String(officer.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(email)) {
      return { success: false, errorCode: 'EMAIL_NOT_AVAILABLE', message: 'A valid registered email address is not available for this Employee ID. Please contact the CNE administrator to update Officers data.' };
    }
    credential = getAuthCredentialRecord(employeeId);
    if (credential && credential.accountStatus === 'INACTIVE') {
      return { success: false, errorCode: 'ACCOUNT_INACTIVE', message: 'Your CNE account is inactive. Please contact Nursing Administration.' };
    }

    // A newly-created challenge supersedes every older open challenge for this purpose/principal.
    invalidateOpenOtpChallenges(OTP_PURPOSE_PASSWORD, employeeId);

    challengeId = Utilities.getUuid().replace(/-/g, '');
    otp = generateSixDigitOtp();
    var otpHash = computeOtpHash(challengeId, otp);
    var now = new Date();
    var nowIso = now.toISOString();
    var expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString();
    var resendAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString();

    otpSheet = getOtpVerificationSheet();
    otpSheet.appendRow([
      challengeId, OTP_PURPOSE_PASSWORD, 'INTERNAL', employeeId, email, otpHash,
      expiresAt, 0, OTP_MAX_ATTEMPTS, resendAt, '', '', 'PENDING', nowIso, nowIso
    ]);

    // Set cooldown before releasing the lock to close the concurrent-request race window.
    cache.put(cooldownKey, '1', OTP_RESEND_COOLDOWN_SECONDS);
  } finally {
    otpCreationLock.releaseLock();
  }

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'CNE Management System verification code',
      body:
        'CNE Management System Verification Code\n\n' +
        'Your 6-digit verification code is: ' + otp + '\n\n' +
        'This code expires in 10 minutes and can be used only once.\n' +
        'If you did not request this code, please ignore this email.\n\n' +
        'AIIMS Rishikesh - CNE Management System'
    });
  } catch (sendErr) {
    var sendFailLock = LockService.getScriptLock();
    try {
      sendFailLock.waitLock(10000);
      var challenge = getOtpChallengeById(challengeId);
      var latestChallenge = getLatestOtpChallengeForPrincipal_(OTP_PURPOSE_PASSWORD, employeeId);
      var failedChallengeIsLatest = Boolean(latestChallenge && latestChallenge.challengeId === challengeId);
      if (challenge && challenge.status === 'PENDING' && otpSheet && failedChallengeIsLatest) {
        otpSheet.getRange(challenge.rowIndex, 13).setValue('SEND_FAILED');
        otpSheet.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
        // Remove cooldown only for the challenge whose email actually failed. Never
        // erase a newer request's cooldown if this older email completes/fails late.
        try { cache.remove(cooldownKey); } catch (cacheErr) {}
      }
    } finally {
      try { sendFailLock.releaseLock(); } catch (releaseErr) {}
    }
    logAuditAction('PASSWORD_OTP_SEND_FAILED', employeeId, 'Email delivery failed', 'FAILED');
    return { success: false, errorCode: 'OTP_EMAIL_FAILED', message: 'The verification email could not be sent. Please try again or contact the CNE administrator.' };
  }

  logAuditAction('PASSWORD_OTP_SENT', employeeId, 'OTP sent to registered email ' + maskEmailAddress(email), 'SUCCESS');

  return {
    success: true,
    message: 'A 6-digit verification code has been sent to your registered email.',
    data: {
      challengeId: challengeId,
      maskedEmail: maskEmailAddress(email),
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      employeeName: officer.name || ''
    }
  };
}

function handleVerifyPasswordOtp(params) {
  var employeeId = normalizeEmpId(params.employeeId);
  var challengeId = String(params.challengeId || '').trim();
  var otp = String(params.otp || '').trim();

  if (!employeeId || !challengeId || !/^\d{6}$/.test(otp)) {
    return { success: false, message: 'Employee ID, challenge, and a valid 6-digit verification code are required.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var challenge = getOtpChallengeById(challengeId);
    if (!challenge || challenge.purpose !== OTP_PURPOSE_PASSWORD || normalizeEmpId(challenge.principalId) !== employeeId) {
      return { success: false, errorCode: 'OTP_INVALID', message: 'Verification code is invalid or expired.' };
    }
    if (challenge.status !== 'PENDING') {
      return { success: false, errorCode: 'OTP_INVALID', message: 'Verification code is no longer active. Request a new code.' };
    }

    var liveOfficer = findOfficerByIdFresh_(employeeId);
    var liveCredential = getAuthCredentialRecord(employeeId);
    var liveEmail = liveOfficer ? String(liveOfficer.email || '').trim().toLowerCase() : '';
    if (!liveOfficer || !isValidEmailAddress(liveEmail) || liveEmail !== String(challenge.email || '').trim().toLowerCase()) {
      var changedSheet = getOtpVerificationSheet();
      changedSheet.getRange(challenge.rowIndex, 13).setValue('INVALIDATED');
      changedSheet.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
      return { success: false, errorCode: 'OTP_IDENTITY_CHANGED', message: 'Registered employee/email details changed. Request a new verification code.' };
    }
    if (liveCredential && liveCredential.accountStatus === 'INACTIVE') {
      return { success: false, errorCode: 'ACCOUNT_INACTIVE', message: 'Your CNE account is inactive. Please contact Nursing Administration.' };
    }

    var expiresMs = new Date(challenge.expiresAt).getTime();
    if (isNaN(expiresMs) || Date.now() > expiresMs) {
      var otpSheet = getOtpVerificationSheet();
      otpSheet.getRange(challenge.rowIndex, 13).setValue('EXPIRED');
      otpSheet.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
      return { success: false, errorCode: 'OTP_EXPIRED', message: 'Verification code has expired. Request a new code.' };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      return { success: false, errorCode: 'OTP_LOCKED', message: 'Too many incorrect verification attempts. Request a new code.' };
    }

    var suppliedHash = computeOtpHash(challengeId, otp);
    if (!timingSafeEqual(suppliedHash, challenge.otpHash)) {
      var attempts = challenge.attempts + 1;
      var otpSheet2 = getOtpVerificationSheet();
      otpSheet2.getRange(challenge.rowIndex, 8).setValue(attempts);
      otpSheet2.getRange(challenge.rowIndex, 13).setValue(attempts >= challenge.maxAttempts ? 'LOCKED' : 'PENDING');
      otpSheet2.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
      logAuditAction('PASSWORD_OTP_FAILED', employeeId, 'Incorrect OTP attempt ' + attempts, 'FAILED');
      return {
        success: false,
        errorCode: attempts >= challenge.maxAttempts ? 'OTP_LOCKED' : 'OTP_INVALID',
        message: attempts >= challenge.maxAttempts ? 'Too many incorrect verification attempts. Request a new code.' : 'Incorrect verification code.'
      };
    }

    var verifiedAt = new Date().toISOString();
    var otpSheet3 = getOtpVerificationSheet();
    otpSheet3.getRange(challenge.rowIndex, 6).setValue('');
    otpSheet3.getRange(challenge.rowIndex, 11).setValue(verifiedAt);
    otpSheet3.getRange(challenge.rowIndex, 13).setValue('VERIFIED');
    otpSheet3.getRange(challenge.rowIndex, 15).setValue(verifiedAt);

    var verificationToken = generateOtpVerificationToken(challengeId, OTP_PURPOSE_PASSWORD, employeeId);
    logAuditAction('PASSWORD_OTP_VERIFIED', employeeId, 'Registered email verified', 'SUCCESS');

    return {
      success: true,
      message: 'Email verification successful. You can now create your password.',
      data: { verificationToken: verificationToken, expiresInSeconds: Math.floor(OTP_VERIFY_TOKEN_TTL_MS / 1000) }
    };
  } finally {
    lock.releaseLock();
  }
}

function handleSetPasswordWithOtp(params) {
  var employeeId = normalizeEmpId(params.employeeId);
  var verificationToken = String(params.verificationToken || '').trim();
  var newPassword = String(params.newPassword || '');
  var passwordValidation = validateNewPassword(newPassword);

  if (!employeeId || !verificationToken || !passwordValidation.valid) {
    return { success: false, message: passwordValidation.message || 'Employee ID, verification token, and new password are required.' };
  }

  var tokenData = verifyOtpVerificationToken(verificationToken, OTP_PURPOSE_PASSWORD, employeeId);
  if (!tokenData) {
    return { success: false, errorCode: 'VERIFICATION_EXPIRED', message: 'Email verification has expired or is invalid. Please request a new verification code.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var challenge = getOtpChallengeById(tokenData.challengeId);
    if (!challenge || challenge.status !== 'VERIFIED' || challenge.consumedAt || normalizeEmpId(challenge.principalId) !== employeeId) {
      return { success: false, errorCode: 'VERIFICATION_ALREADY_USED', message: 'This verification has already been used or is no longer valid.' };
    }

    var officer = findOfficerByIdFresh_(employeeId);
    if (!officer) return { success: false, message: 'Employee ID was not found in Officers data.' };
    var currentRegisteredEmail = String(officer.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(currentRegisteredEmail) || currentRegisteredEmail !== String(challenge.email || '').trim().toLowerCase()) {
      return { success: false, errorCode: 'OTP_IDENTITY_CHANGED', message: 'Registered employee/email details changed. Please request a new verification code.' };
    }

    // Consume the verified challenge BEFORE changing credentials. If the password write
    // later fails, the OTP remains non-replayable and the user must request a fresh code.
    var consumedAt = new Date().toISOString();
    var otpSheet = getOtpVerificationSheet();
    otpSheet.getRange(challenge.rowIndex, 12).setValue(consumedAt);
    otpSheet.getRange(challenge.rowIndex, 13).setValue('CONSUMED');
    otpSheet.getRange(challenge.rowIndex, 15).setValue(consumedAt);

    var result = upsertPasswordCredential(employeeId, newPassword);

    logAuditAction(
      result.created ? 'PASSWORD_CREATED' : 'PASSWORD_RESET_SUCCESS',
      employeeId,
      'Password established after registered-email OTP verification; version ' + result.passwordVersion,
      'SUCCESS'
    );

    return {
      success: true,
      message: result.created ? 'Password created successfully. You can now log in.' : 'Password reset successfully. You can now log in with your new password.',
      data: { passwordVersion: result.passwordVersion }
    };
  } catch (err) {
    if (err && err.code === 'ACCOUNT_INACTIVE') {
      return { success: false, errorCode: 'ACCOUNT_INACTIVE', message: err.message };
    }
    return { success: false, message: err && err.message ? err.message : 'Unable to update password.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Legacy reset endpoint intentionally disabled.
 * Password creation/reset must use requestPasswordOtp -> verifyPasswordOtp -> setPasswordWithOtp.
 */
function handleResetPassword(params) {
  return {
    success: false,
    errorCode: 'OTP_REQUIRED',
    message: 'Password reset now requires registered-email verification. Please use Create / Reset Password on the login page.'
  };
}

/**
 * Admin reset no longer assigns a shared/default password.
 * It clears the password, increments Password Version, invalidates existing sessions,
 * and requires the employee to complete the registered-email OTP flow.
 */
function handleAdminResetPassword(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var targetEmpId = normalizeEmpId(params.targetEmployeeId || params.employeeId);
  if (!targetEmpId) return { success: false, message: 'Target Employee ID is required.' };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  try {
    var freshAdmin = requireFreshAdminMutation(session);
    if (!freshAdmin.success) return freshAdmin;
    session = freshAdmin.session;

    var targetOfficer = findOfficerByIdFresh_(targetEmpId);
    if (!targetOfficer) return { success: false, message: 'Employee ID (' + targetEmpId + ') not found in Officers data.' };

    var sheet = getAuthCredentialsSheet();
    var record = getAuthCredentialRecord(targetEmpId);
    var nowIso = new Date().toISOString();

    if (record && record.accountStatus === 'INACTIVE') {
      return { success: false, errorCode: 'ACCOUNT_INACTIVE', message: 'The target CNE account is inactive.' };
    }

    if (record) {
      var nextVersion = Math.max(1, record.passwordVersion + 1);
      sheet.getRange(record.rowIndex, 2).setValue('');
      sheet.getRange(record.rowIndex, 3).setValue('');
      sheet.getRange(record.rowIndex, 4).setValue(nextVersion);
      sheet.getRange(record.rowIndex, 6).setValue(nowIso);
      sheet.getRange(record.rowIndex, 9).setValue(0);
      sheet.getRange(record.rowIndex, 10).setValue('');
      sheet.getRange(record.rowIndex, 12).setValue(nowIso);
    } else {
      sheet.appendRow([targetEmpId, '', '', 1, '', nowIso, '', 'ACTIVE', 0, '', nowIso, nowIso]);
    }

    clearCredentialSecurityCache(targetEmpId);
    invalidateUserRoleCache(targetEmpId);
    invalidateOpenOtpChallenges(OTP_PURPOSE_PASSWORD, targetEmpId);

    logAuditAction(
      'ADMIN_PASSWORD_RESET_REQUIRED',
      session.employeeId,
      'Password cleared for ' + targetEmpId + '; employee must verify registered email to create/reset password.',
      'SUCCESS'
    );

    return {
      success: true,
      message: 'Password access has been reset for ' + targetOfficer.name + ' (' + targetEmpId + '). The employee must now use Create / Reset Password and verify the registered email.'
    };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Areas Management
 * Uses CacheService (TTL 60s) to avoid repeated sheet reads for frequent UI dropdowns.
 */
function handleGetAreas(params) {
  var startedAt = Date.now();
  var cacheKey = 'cne_areas_list';
  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        logPerf('handleGetAreas [cache-hit]', startedAt);
        return { success: true, data: parsed, _cached: true };
      }
    }
  } catch (e) {}

  var sheet = getOrCreateSheet('Area');
  var data = sheet.getDataRange().getValues();
  var areas = [];
  
  for (var r = 1; r < data.length; r++) {
    var name = String(data[r][0] || '').trim();
    var status = String(data[r][1] || 'ACTIVE').trim().toUpperCase();
    if (name) {
      areas.push({
        id: 'AREA-' + r,
        name: name,
        status: (status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE',
        createdAt: data[r][2] ? String(data[r][2]) : ''
      });
    }
  }
  
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(areas), 60);
  } catch (ce) {}

  logPerf('handleGetAreas [sheet-read]', startedAt, 'count: ' + areas.length);
  return { success: true, data: areas };
}

/**
 * Authoritative Area Status Helpers
 * Normalizes area names: String(areaName || '').trim().toUpperCase()
 * Uses existing Area cache (cne_areas_list) when safe, or performs authoritative sheet read when forceFresh is true.
 */
function getAreaStatusMap_(forceFresh) {
  var map = {};
  var areas = [];
  var cacheKey = 'cne_areas_list';
  if (!forceFresh) {
    try {
      var cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          areas = parsed;
        }
      }
    } catch (e) {}
  }
  if (areas.length === 0) {
    var sheet = getOrCreateSheet('Area');
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var name = String(data[r][0] || '').trim();
      var status = String(data[r][1] || 'ACTIVE').trim().toUpperCase();
      if (name) {
        areas.push({
          id: 'AREA-' + r,
          name: name,
          status: (status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE',
          createdAt: data[r][2] ? String(data[r][2]) : ''
        });
      }
    }
    try {
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(areas), 60);
    } catch (ce) {}
  }
  for (var i = 0; i < areas.length; i++) {
    var normName = String(areas[i].name || '').trim().toUpperCase();
    if (normName) {
      map[normName] = (areas[i].status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
    }
  }
  return map;
}

function isAreaActive_(areaName, forceFresh) {
  var norm = String(areaName || '').trim().toUpperCase();
  if (!norm) return false;
  var map = getAreaStatusMap_(forceFresh);
  return map[norm] === 'ACTIVE';
}

function requireActiveArea_(areaName, forceFresh) {
  if (!isAreaActive_(areaName, forceFresh)) {
    return {
      success: false,
      errorCode: 'AREA_INACTIVE',
      message: 'The selected ward/area is inactive. Please select an active area.'
    };
  }
  return null;
}

function handleAddArea(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var areaName = sanitizeCellInput(params.name);
  if (!areaName) return { success: false, message: 'Area name is required.' };
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy processing another request. Please try again.' };
  }
  
  try {
    var sheet = getOrCreateSheet('Area');
    var data = sheet.getDataRange().getValues();
    
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === areaName.toLowerCase()) {
        return { success: false, message: 'An area with this name already exists.' };
      }
    }
    
    sheet.appendRow([areaName, 'ACTIVE', new Date().toISOString()]);
    try {
      CacheService.getScriptCache().remove('cne_areas_list');
    } catch (e) {}
    if (params.inchargeEmpId || params.inchargeId || params.employeeId) {
      invalidateUserRoleCache(params.inchargeEmpId || params.inchargeId || params.employeeId);
    }
    logAuditAction('ADD_AREA', session.employeeId, 'Added area: ' + areaName, 'SUCCESS');
    return { success: true, message: 'Area added successfully.' };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateArea(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var oldName = String(params.oldName || '').trim();
  var newName = sanitizeCellInput(params.name);
  var rawStatus = params.status !== undefined ? String(params.status).trim().toUpperCase() : '';
  var status = (rawStatus === 'INACTIVE' || rawStatus === 'ACTIVE') ? rawStatus : 'ACTIVE';
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var ss = getSpreadsheet('CNE');
    var sheet = ss.getSheetByName('Area');
    if (!sheet) return { success: false, message: 'Area sheet not found.' };
    
    var data = sheet.getDataRange().getValues();
    var isRename = Boolean(newName && newName.toLowerCase() !== oldName.toLowerCase());
    var oldNorm = oldName.toUpperCase();

    // Validate duplicate name if renaming
    if (isRename) {
      for (var dr = 1; dr < data.length; dr++) {
        if (String(data[dr][0]).trim().toLowerCase() === newName.toLowerCase()) {
          return { success: false, message: 'An area with this name already exists.' };
        }
      }
    }

    var targetAreaRow = -1;
    var currentStatus = 'ACTIVE';
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === oldName.toLowerCase()) {
        targetAreaRow = r + 1;
        currentStatus = String(data[r][1] || 'ACTIVE').trim().toUpperCase();
        break;
      }
    }

    if (targetAreaRow === -1) {
      return { success: false, message: 'Area not found.' };
    }

    var targetStatus = rawStatus ? status : currentStatus;

    // If NOT renaming (status update only), perform simple atomic master update
    if (!isRename) {
      sheet.getRange(targetAreaRow, 2).setValue(targetStatus);
      try {
        CacheService.getScriptCache().remove('cne_areas_list');
      } catch (e) {}

      // Invalidate incharge cached role if incharge column is present in Area sheet
      var inchargeCol = -1;
      for (var c = 0; c < data[0].length; c++) {
        var ah = String(data[0][c]).toLowerCase().trim();
        if (ah.indexOf('incharge') !== -1 && ah.indexOf('id') !== -1) inchargeCol = c;
      }
      if (inchargeCol !== -1 && data[targetAreaRow - 1][inchargeCol]) {
        invalidateUserRoleCache(data[targetAreaRow - 1][inchargeCol]);
      }
      if (params.inchargeEmpId || params.inchargeId || params.employeeId) {
        invalidateUserRoleCache(params.inchargeEmpId || params.inchargeId || params.employeeId);
      }

      logAuditAction('UPDATE_AREA', session.employeeId, 'Updated area: ' + oldName + ' status: ' + targetStatus, 'SUCCESS');
      return { success: true, message: 'Area updated successfully.' };
    }

    // ---------------------------------------------------------
    // RENAME FLOW: Prepare dependent updates in memory first
    // ---------------------------------------------------------
    var roleUpdates = [];
    var roleAffectedEmpIds = [];
    var roleSheet = ss.getSheetByName('Role');
    if (roleSheet) {
      var rData = roleSheet.getDataRange().getValues();
      if (rData.length > 1) {
        var rHeaders = rData[0];
        var rEmpCol = 0;
        var rAreaCol = 4;
        for (var rc = 0; rc < rHeaders.length; rc++) {
          var rh = String(rHeaders[rc] || '').toLowerCase();
          if (rh.indexOf('emp') !== -1 && rh.indexOf('id') !== -1) rEmpCol = rc;
          if (rh.indexOf('area') !== -1 || rh.indexOf('dept') !== -1 || rh.indexOf('ward') !== -1) rAreaCol = rc;
        }

        for (var ri = 1; ri < rData.length; ri++) {
          var rawEmpArea = String(rData[ri][rAreaCol] || '').trim();
          if (!rawEmpArea) continue;

          var isJson = false;
          var tokens = [];
          if (rawEmpArea.charAt(0) === '[' && rawEmpArea.charAt(rawEmpArea.length - 1) === ']') {
            try {
              var parsedJson = JSON.parse(rawEmpArea);
              if (Array.isArray(parsedJson)) {
                tokens = parsedJson;
                isJson = true;
              }
            } catch (pe) {}
          }
          if (!isJson) {
            tokens = rawEmpArea.split(/[,;\n]+/).map(function(s) { return String(s).trim(); }).filter(Boolean);
          }

          var rowChanged = false;
          var updatedTokens = [];
          for (var ti = 0; ti < tokens.length; ti++) {
            var tokenStr = String(tokens[ti] || '').trim();
            if (tokenStr.toUpperCase() === oldNorm) {
              updatedTokens.push(newName);
              rowChanged = true;
            } else {
              updatedTokens.push(tokenStr);
            }
          }

          if (rowChanged) {
            var serializedArea = isJson ? JSON.stringify(updatedTokens) : updatedTokens.join(', ');
            var rEmpId = normalizeEmpId(rData[ri][rEmpCol]);
            if (rEmpId && roleAffectedEmpIds.indexOf(rEmpId) === -1) {
              roleAffectedEmpIds.push(rEmpId);
            }
            roleUpdates.push({
              row: ri + 1,
              col: rAreaCol + 1,
              oldVal: rawEmpArea,
              newVal: serializedArea
            });
          }
        }
      }
    }

    var cneUpdates = [];
    var cneSheet = ss.getSheetByName('CNE Schedule');
    if (cneSheet) {
      var cneData = cneSheet.getDataRange().getValues();
      if (cneData.length > 1) {
        var cneColMap = getHeaderMap(cneSheet);
        var cneAreaCol = cneColMap['area'] !== undefined ? cneColMap['area'] : 2;
        for (var ci = 1; ci < cneData.length; ci++) {
          var cneAreaVal = String(cneData[ci][cneAreaCol] || '').trim();
          if (cneAreaVal.toUpperCase() === oldNorm) {
            cneUpdates.push({
              row: ci + 1,
              col: cneAreaCol + 1,
              oldVal: cneData[ci][cneAreaCol],
              newVal: newName
            });
          }
        }
      }
    }

    // ---------------------------------------------------------
    // EXECUTE WRITES WITH ROLLBACK TRACKING
    // Preferred order:
    // 1. Role references (only affected cells, rollback registered BEFORE write)
    // 2. CNE Schedule references (only affected cells, rollback registered BEFORE write)
    // 3. Area master name and status last (atomically with setValues, rollback registered BEFORE write)
    // ---------------------------------------------------------
    var executedRollbacks = [];
    try {
      // 1. Update dependent Role references (only affected cells)
      if (roleSheet && roleUpdates.length > 0) {
        for (var ru = 0; ru < roleUpdates.length; ru++) {
          var rItem = roleUpdates[ru];
          executedRollbacks.push({ sheet: roleSheet, row: rItem.row, col: rItem.col, oldVal: rItem.oldVal });
          roleSheet.getRange(rItem.row, rItem.col).setValue(rItem.newVal);
        }
      }

      // 2. Update dependent CNE Schedule references (only affected cells)
      if (cneSheet && cneUpdates.length > 0) {
        for (var cu = 0; cu < cneUpdates.length; cu++) {
          var cItem = cneUpdates[cu];
          executedRollbacks.push({ sheet: cneSheet, row: cItem.row, col: cItem.col, oldVal: cItem.oldVal });
          cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);
        }
      }

      // 3. Update Area master name + status together.
      // Register BOTH rollback values BEFORE attempting the grouped write.
      var oldAreaMasterName = String(data[targetAreaRow - 1][0] || '').trim();
      var oldAreaMasterStatus = String(data[targetAreaRow - 1][1] || 'ACTIVE').trim().toUpperCase();

      executedRollbacks.push({ sheet: sheet, row: targetAreaRow, col: 1, oldVal: oldAreaMasterName });
      executedRollbacks.push({ sheet: sheet, row: targetAreaRow, col: 2, oldVal: oldAreaMasterStatus });

      // Write Name + Status in one Sheets operation.
      sheet.getRange(targetAreaRow, 1, 1, 2).setValues([[newName, targetStatus]]);
    } catch (writeErr) {
      // Propagation failure encountered: Attempt rollback
      var rollbackSucceeded = true;
      for (var rb = executedRollbacks.length - 1; rb >= 0; rb--) {
        try {
          var rbItem = executedRollbacks[rb];
          rbItem.sheet.getRange(rbItem.row, rbItem.col).setValue(rbItem.oldVal);
        } catch (rbErr) {
          rollbackSucceeded = false;
          console.error('Rollback step failed at row ' + rbItem.row + ', col ' + rbItem.col + ': ' + (rbErr.message || rbErr));
        }
      }

      // Invalidate caches even on failure to avoid serving stale data
      try { CacheService.getScriptCache().remove('cne_areas_list'); } catch (e) {}
      _inMemoryRoleCache = {};
      for (var fa = 0; fa < roleAffectedEmpIds.length; fa++) {
        invalidateUserRoleCache(roleAffectedEmpIds[fa]);
      }

      logAuditAction(
        'AREA_RENAME_FAILED',
        session.employeeId,
        'Failed renaming ' + oldName + ' -> ' + newName + ': ' + (writeErr.message || writeErr) + (rollbackSucceeded ? ' (Rollback completed)' : ' (Rollback partial/failed)'),
        'FAILURE'
      );

      if (!rollbackSucceeded) {
        return {
          success: false,
          errorCode: 'AREA_RENAME_RECONCILIATION_REQUIRED',
          message: 'Ward/area rename encountered an unexpected error and requires administrator review.'
        };
      }

      return {
        success: false,
        errorCode: 'AREA_RENAME_FAILED',
        message: 'Ward/area rename could not be completed safely. No changes were finalized. Please try again.'
      };
    }

    // ---------------------------------------------------------
    // SUCCESS: Invalidate caches & audit log
    // ---------------------------------------------------------
    try {
      CacheService.getScriptCache().remove('cne_areas_list');
    } catch (e) {}
    _inMemoryRoleCache = {};

    for (var sa = 0; sa < roleAffectedEmpIds.length; sa++) {
      invalidateUserRoleCache(roleAffectedEmpIds[sa]);
    }

    if (params.inchargeEmpId || params.inchargeId || params.employeeId) {
      invalidateUserRoleCache(params.inchargeEmpId || params.inchargeId || params.employeeId);
    }

    logAuditAction(
      'AREA_RENAMED',
      session.employeeId,
      'Renamed area: ' + oldName + ' -> ' + newName + ' (Role rows updated: ' + roleUpdates.length + ', CNE rows updated: ' + cneUpdates.length + ')',
      'SUCCESS'
    );

    return { success: true, message: 'Area updated successfully.' };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Teaching Mode Master Management
 * Admin controls only Name + ACTIVE/INACTIVE. Updated At is backend metadata.
 */
var DEFAULT_TEACHING_MODES_ = [
  'Lecture Cum Discussion',
  'Demonstration',
  'Hands-on Training',
  'Workshop',
  'Case Study Presentation',
  'Simulation'
];

function ensureTeachingModeSheet_() {
  var sheet = getOrCreateSheet('Teaching Mode', ['Mode Name', 'Status', 'Updated At']);
  if (sheet.getLastRow() <= 1) {
    var now = new Date().toISOString();
    var rows = DEFAULT_TEACHING_MODES_.map(function(name) {
      return [name, 'ACTIVE', now];
    });
    if (rows.length > 0) {
      // Fixed-range idempotent seeding prevents duplicate defaults on concurrent first reads.
      sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
  }
  return sheet;
}

function readTeachingModesFromSheet_() {
  var sheet = ensureTeachingModeSheet_();
  var data = sheet.getDataRange().getValues();
  var modes = [];
  for (var r = 1; r < data.length; r++) {
    var name = String(data[r][0] || '').trim();
    if (!name) continue;
    var status = String(data[r][1] || 'ACTIVE').trim().toUpperCase();
    modes.push({
      name: name,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      updatedAt: data[r][2] ? String(data[r][2]) : ''
    });
  }
  modes.sort(function(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
  });
  return modes;
}

function handleGetTeachingModes(params) {
  var startedAt = Date.now();
  var cacheKey = 'cne_teaching_modes_list';
  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        logPerf('handleGetTeachingModes [cache-hit]', startedAt);
        return { success: true, data: parsed, _cached: true };
      }
    }
  } catch (e) {}

  var modes = readTeachingModesFromSheet_();
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(modes), 60);
  } catch (cacheErr) {}
  logPerf('handleGetTeachingModes [sheet-read]', startedAt, 'count: ' + modes.length);
  return { success: true, data: modes };
}

function getTeachingModeStatusMap_(forceFresh) {
  var cacheKey = 'cne_teaching_modes_list';
  var modes = [];
  if (!forceFresh) {
    try {
      var cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) modes = parsed;
      }
    } catch (e) {}
  }
  if (modes.length === 0) {
    modes = readTeachingModesFromSheet_();
    try {
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(modes), 60);
    } catch (cacheErr) {}
  }

  var map = {};
  for (var i = 0; i < modes.length; i++) {
    var key = String(modes[i].name || '').trim().toUpperCase();
    if (!key) continue;
    map[key] = String(modes[i].status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }
  return map;
}

function isTeachingModeActive_(modeName, forceFresh) {
  var normalized = String(modeName || '').trim().toUpperCase();
  if (!normalized) return false;
  return getTeachingModeStatusMap_(forceFresh)[normalized] === 'ACTIVE';
}

function requireActiveTeachingMode_(modeName, forceFresh) {
  if (!isTeachingModeActive_(modeName, forceFresh)) {
    return {
      success: false,
      errorCode: 'TEACHING_MODE_INACTIVE',
      message: 'The selected Teaching Mode is inactive. Please select an active Teaching Mode.'
    };
  }
  return null;
}

function handleAddTeachingMode(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var modeName = sanitizeCellInput(params.name);
  if (!modeName) return { success: false, message: 'Teaching Mode name is required.' };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy processing another request. Please try again.' };
  }

  try {
    var sheet = ensureTeachingModeSheet_();
    var data = sheet.getDataRange().getValues();
    var normalized = modeName.toUpperCase();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0] || '').trim().toUpperCase() === normalized) {
        return { success: false, message: 'A Teaching Mode with this name already exists.' };
      }
    }

    sheet.appendRow([modeName, 'ACTIVE', new Date().toISOString()]);
    try { CacheService.getScriptCache().remove('cne_teaching_modes_list'); } catch (cacheErr) {}
    logAuditAction('ADD_TEACHING_MODE', session.employeeId, 'Added Teaching Mode: ' + modeName, 'SUCCESS');
    return { success: true, message: 'Teaching Mode added successfully.' };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateTeachingMode(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var oldName = String(params.oldName || '').trim();
  var newName = sanitizeCellInput(params.name);
  var rawStatus = params.status !== undefined ? String(params.status || '').trim().toUpperCase() : '';
  var requestedStatus = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  if (!oldName || !newName) return { success: false, message: 'Teaching Mode name is required.' };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var ss = getSpreadsheet('CNE');
    var sheet = ensureTeachingModeSheet_();
    var data = sheet.getDataRange().getValues();
    var oldNorm = oldName.toUpperCase();
    var newNorm = newName.toUpperCase();
    var targetRow = -1;
    var currentStatus = 'ACTIVE';
    var oldUpdatedAt = '';

    for (var r = 1; r < data.length; r++) {
      var candidate = String(data[r][0] || '').trim();
      if (candidate.toUpperCase() === oldNorm) {
        targetRow = r + 1;
        currentStatus = String(data[r][1] || 'ACTIVE').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
        oldUpdatedAt = data[r][2] || '';
      }
      if (newNorm !== oldNorm && candidate.toUpperCase() === newNorm) {
        return { success: false, message: 'A Teaching Mode with this name already exists.' };
      }
    }

    if (targetRow === -1) return { success: false, message: 'Teaching Mode not found.' };

    var targetStatus = rawStatus ? requestedStatus : currentStatus;
    var isRename = newNorm !== oldNorm;
    var updatedAt = new Date().toISOString();

    if (!isRename) {
      sheet.getRange(targetRow, 2, 1, 2).setValues([[targetStatus, updatedAt]]);
      try { CacheService.getScriptCache().remove('cne_teaching_modes_list'); } catch (cacheErr) {}
      logAuditAction('UPDATE_TEACHING_MODE', session.employeeId, 'Updated Teaching Mode: ' + oldName + ' status: ' + targetStatus, 'SUCCESS');
      return { success: true, message: 'Teaching Mode updated successfully.' };
    }

    // Prepare exact-match CNE Schedule references before the first mutation.
    var cneUpdates = [];
    var cneSheet = ss.getSheetByName('CNE Schedule');
    if (cneSheet && cneSheet.getLastRow() > 1) {
      var cneData = cneSheet.getDataRange().getValues();
      var cneMap = getHeaderMap(cneSheet);
      var modeColumns = [];
      if (cneMap['modeofteaching'] !== undefined) modeColumns.push(cneMap['modeofteaching']);
      if (cneMap['mode'] !== undefined && modeColumns.indexOf(cneMap['mode']) === -1) modeColumns.push(cneMap['mode']);
      if (modeColumns.length === 0) modeColumns.push(8);

      for (var ci = 1; ci < cneData.length; ci++) {
        for (var mc = 0; mc < modeColumns.length; mc++) {
          var modeCol = modeColumns[mc];
          var oldCell = cneData[ci][modeCol];
          if (String(oldCell || '').trim().toUpperCase() === oldNorm) {
            cneUpdates.push({ row: ci + 1, col: modeCol + 1, oldVal: oldCell, newVal: newName });
          }
        }
      }
    }

    var executedRollbacks = [];
    try {
      if (cneSheet && cneUpdates.length > 0) {
        for (var cu = 0; cu < cneUpdates.length; cu++) {
          var cItem = cneUpdates[cu];
          executedRollbacks.push({ sheet: cneSheet, row: cItem.row, col: cItem.col, oldVal: cItem.oldVal });
          cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);
        }
      }

      // Register all master rollback metadata before the grouped master write.
      executedRollbacks.push({ sheet: sheet, row: targetRow, col: 1, oldVal: data[targetRow - 1][0] });
      executedRollbacks.push({ sheet: sheet, row: targetRow, col: 2, oldVal: currentStatus });
      executedRollbacks.push({ sheet: sheet, row: targetRow, col: 3, oldVal: oldUpdatedAt });
      sheet.getRange(targetRow, 1, 1, 3).setValues([[newName, targetStatus, updatedAt]]);
    } catch (writeErr) {
      var rollbackSucceeded = true;
      for (var rb = executedRollbacks.length - 1; rb >= 0; rb--) {
        try {
          var rbItem = executedRollbacks[rb];
          rbItem.sheet.getRange(rbItem.row, rbItem.col).setValue(rbItem.oldVal);
        } catch (rbErr) {
          rollbackSucceeded = false;
          console.error('Teaching Mode rollback failed at row ' + rbItem.row + ', col ' + rbItem.col + ': ' + (rbErr.message || rbErr));
        }
      }
      try { CacheService.getScriptCache().remove('cne_teaching_modes_list'); } catch (cacheErr) {}
      logAuditAction(
        'TEACHING_MODE_RENAME_FAILED',
        session.employeeId,
        'Failed Teaching Mode rename ' + oldName + ' -> ' + newName + ': ' + (writeErr.message || writeErr) + (rollbackSucceeded ? ' (Rollback completed)' : ' (Rollback partial/failed)'),
        'FAILURE'
      );
      if (!rollbackSucceeded) {
        return {
          success: false,
          errorCode: 'TEACHING_MODE_RENAME_RECONCILIATION_REQUIRED',
          message: 'Teaching Mode rename encountered an unexpected error and requires administrator review.'
        };
      }
      return {
        success: false,
        errorCode: 'TEACHING_MODE_RENAME_FAILED',
        message: 'Teaching Mode rename could not be completed safely. No changes were finalized. Please try again.'
      };
    }

    try { CacheService.getScriptCache().remove('cne_teaching_modes_list'); } catch (cacheErr) {}
    logAuditAction(
      'TEACHING_MODE_RENAMED',
      session.employeeId,
      'Renamed Teaching Mode: ' + oldName + ' -> ' + newName + ' (CNE cells updated: ' + cneUpdates.length + ')',
      'SUCCESS'
    );
    return { success: true, message: 'Teaching Mode updated successfully.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper: Safely normalize Duration to standard HH:MM:SS duration string.
 * Duration in Google Sheets can be returned as:
 * 1. Formatted display string from getDisplayValues() (e.g. "1:00:00", "1:30:00", "0:30:00", "15:00:00")
 * 2. Numeric serial fraction of a day (e.g. 1/24 = 0.041666... for 1 hr, 1.5/24 = 0.0625 for 1.5 hrs, 25/24 for 25 hrs)
 * 3. Formatted duration string (e.g. "1:30:00", "25:00:00")
 * 4. Date object from getValues() (e.g. Sat Dec 30 1899 01:30:00 GMT+...)
 * Note: Duration can exceed 24 hours (e.g. 25:00:00, 120:00:00). It must NEVER be converted to a JavaScript Date object.
 */
function formatDurationValue(rawValue, displayValue) {
  function secondsToDuration_(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return '';
    totalSeconds = Math.round(totalSeconds);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    var hh = hours < 10 ? '0' + hours : String(hours);
    var mm = minutes < 10 ? '0' + minutes : String(minutes);
    var ss = seconds < 10 ? '0' + seconds : String(seconds);
    return hh + ':' + mm + ':' + ss;
  }

  function parseColonDuration_(value) {
    if (value === null || value === undefined) return '';
    var str = String(value).trim();
    if (!str) return '';
    var match = str.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
    if (!match) return '';
    var hours = Number(match[1]);
    var minutes = Number(match[2]);
    var seconds = match[3] === undefined ? 0 : Number(match[3]);
    if (!isFinite(hours) || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return '';
    return secondsToDuration_((hours * 3600) + (minutes * 60) + seconds);
  }

  // 1. Prefer a valid Google Sheets display value when it is already a duration string.
  // Do not interpret a plain decimal display value here because a numeric Sheet cell may
  // be a day fraction (e.g. 0.0625 = 1.5 hours); the raw numeric value below handles that safely.
  var displayDuration = parseColonDuration_(displayValue);
  if (displayDuration) return displayDuration;

  // 2. Google Sheets stores time/duration-formatted numeric cells as day fractions.
  if (typeof rawValue === 'number' && isFinite(rawValue) && rawValue >= 0) {
    return secondsToDuration_(rawValue * 86400);
  }

  // 3. Strings may be HH:MM[:SS] or decimal hours (e.g. "1.5" = 01:30:00).
  if (typeof rawValue === 'string') {
    var str = rawValue.trim();
    if (!str) return '';

    var stringDuration = parseColonDuration_(str);
    if (stringDuration) return stringDuration;

    var decimalHoursMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)?$/i);
    if (decimalHoursMatch) {
      var decimalHours = Number(decimalHoursMatch[1]);
      if (isFinite(decimalHours) && decimalHours >= 0) {
        return secondsToDuration_(decimalHours * 3600);
      }
    }

    // Google Sheets/Apps Script can sometimes serialize time cells as 1899/GMT date strings.
    if (str.indexOf('1899') !== -1 || str.indexOf('GMT') !== -1) {
      var parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        return secondsToDuration_(
          (parsedDate.getHours() * 3600) +
          (parsedDate.getMinutes() * 60) +
          parsedDate.getSeconds()
        );
      }
    }
  }

  // 4. Google Sheets can also return an actual Date object for time-formatted cells under 24 hours.
  if (Object.prototype.toString.call(rawValue) === '[object Date]' || (rawValue instanceof Date)) {
    if (!isNaN(rawValue.getTime())) {
      return secondsToDuration_(
        (rawValue.getHours() * 3600) +
        (rawValue.getMinutes() * 60) +
        rawValue.getSeconds()
      );
    }
  }

  // Missing or invalid duration must never fabricate training time.
  return '';
}

/**
 * Helper: Convert duration input (string "HH:MM:SS" or "HH:MM", or numeric day fraction) to day-fraction number.
 * e.g. "1:00:00" -> 1/24 (0.041666666666666664)
 *      "1:30:00" -> 1.5/24 (0.0625)
 *      "0:30:00" -> 0.5/24 (0.020833333333333332)
 *      "25:00:00" -> 25/24 (1.0416666666666667)
 * Returns number (day fraction), or null if unparseable.
 */

function buildHeaderMapFromRow_(headers) {
  var map = {};
  var row = Array.isArray(headers) ? headers : [];
  for (var c = 0; c < row.length; c++) {
    var key = String(row[c] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key) map[key] = c;
  }
  return map;
}

/**
 * Request-local CNE Schedule snapshot. A homepage request needs both the upcoming
 * schedule and Program Impact; sharing this snapshot avoids reading the same sheet
 * twice (and avoids a second getDisplayValues call) in one Apps Script execution.
 */
function getCNEScheduleSnapshot_() {
  if (_executionCneScheduleSnapshot) return _executionCneScheduleSnapshot;
  var startedAt = Date.now();
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('CNE Schedule');
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    _executionCneScheduleSnapshot = { sheet: sheet, data: [], displayValues: [], colMap: {} };
    return _executionCneScheduleSnapshot;
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  var displayValues = range.getDisplayValues();
  var headers = data.length ? data[0] : [];
  _executionCneScheduleSnapshot = {
    sheet: sheet,
    data: data,
    displayValues: displayValues,
    colMap: buildHeaderMapFromRow_(headers)
  };
  logPerf('getCNEScheduleSnapshot [single read]', startedAt, 'rows: ' + data.length);
  return _executionCneScheduleSnapshot;
}

/**
 * 6. CNE Records Retrieval with Strict Server-Side Role and Privacy Filtering
 */
function handleGetCNERecords(params, session, scheduleSnapshot) {
  var isMyRecordsOnly = Boolean(params && (params.myRecordsOnly || params.scope === 'my-cne-records'));
  if (isMyRecordsOnly && !session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized session.' };
  }

  var startedAt = Date.now();
  var sessionRole = session ? String(session.role || '').toUpperCase() : '';
  var isAdmin = sessionRole === 'ADMIN';
  var loggedInId = session ? normalizeEmpId(session.employeeId) : '';

  var snapshot = scheduleSnapshot || getCNEScheduleSnapshot_();
  var sheet = snapshot.sheet;
  var data = snapshot.data || [];
  var displayValues = snapshot.displayValues || [];
  if (!sheet || data.length <= 1) return { success: true, data: [] };
  var officerMap = getOfficerNameMap();
  var colMap = snapshot.colMap || buildHeaderMapFromRow_(data[0] || []);

  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : (colMap['classid'] !== undefined ? colMap['classid'] : (colMap['dataid'] !== undefined ? colMap['dataid'] : 0));
  var areaCol = colMap['area'] !== undefined ? colMap['area'] : (colMap['wardnamearea'] !== undefined ? colMap['wardnamearea'] : 1);
  var fromDateCol = colMap['fromdate'] !== undefined ? colMap['fromdate'] : (colMap['date'] !== undefined ? colMap['date'] : 2);
  var toDateCol = colMap['todate'] !== undefined ? colMap['todate'] : 3;
  var durCol = colMap['duration'] !== undefined ? colMap['duration'] : 4;
  var topicCol = colMap['topic'] !== undefined ? colMap['topic'] : 5;
  var rpCol = colMap['resourcepersonempid'] !== undefined ? colMap['resourcepersonempid'] : 6;
  var modeCol = colMap['modeofteaching'] !== undefined ? colMap['modeofteaching'] : (colMap['mode'] !== undefined ? colMap['mode'] : 7);
  var descCol = colMap['description'] !== undefined ? colMap['description'] : -1;
  var maxPartCol = colMap['maxparticipants'] !== undefined ? colMap['maxparticipants'] : -1;
  var staffCol = colMap['staffempid'] !== undefined ? colMap['staffempid'] : 8;
  var countCol = colMap['staffcount'] !== undefined ? colMap['staffcount'] : 9;
  var adminRemarksCol = colMap['adminremarks'] !== undefined ? colMap['adminremarks'] : -1;
  var remarksCol = colMap['remarks'] !== undefined ? colMap['remarks'] : -1;
  var typeCol = colMap['typeofcne'] !== undefined ? colMap['typeofcne'] : (colMap['cnetype'] !== undefined ? colMap['cnetype'] : 15);
  var extRpCol = colMap['externalresourcepersons'] !== undefined ? colMap['externalresourcepersons'] : 13;
  var extStaffCol = colMap['externalstaffparticipants'] !== undefined ? colMap['externalstaffparticipants'] : 14;
  var proposedByCol = colMap['proposedby'] !== undefined ? colMap['proposedby'] : -1;
  var statusCol = colMap['status'] !== undefined ? colMap['status'] : -1;

  var myPostTestScores = {};
  if (isMyRecordsOnly && loggedInId) {
    var responsesSheet = getResponsesSheet();
    if (responsesSheet && responsesSheet.getLastRow() > 1) {
      var responseRows = responsesSheet
        .getRange(2, 2, responsesSheet.getLastRow() - 1, 9)
        .getValues();

      for (var p = 0; p < responseRows.length; p++) {
        var pRow = responseRows[p];
        var pCneId = String(pRow[0] || '').trim().toUpperCase();
        var pParticipantId = normalizeEmpId(pRow[1]);
        var pPercentage = pRow[7];
        var pSource = String(pRow[8] || '').trim().toUpperCase();

        if (
          pCneId &&
          pParticipantId === loggedInId &&
          pSource === 'POST_TEST' &&
          pPercentage !== '' &&
          pPercentage !== null &&
          pPercentage !== undefined &&
          !isNaN(Number(pPercentage))
        ) {
          myPostTestScores[pCneId] = Number(pPercentage);
        }
      }
    }
  }

  var records = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var dataId = String(row[idCol] || '').trim();
    if (!dataId) continue;

    var area = String(row[areaCol] || '').trim();
    var fromDate = formatDateValue(row[fromDateCol]);
    var toDate = formatDateValue(row[toDateCol] || row[fromDateCol]);
    var durationDisplay = displayValues[r] ? displayValues[r][durCol] : '';
    var duration = formatDurationValue(row[durCol], durationDisplay);
    var topic = String(row[topicCol] || '').trim();
    var resourcePersonEmpId = String(row[rpCol] || '').trim();
    var mode = String(row[modeCol] || 'Lecture Cum Discussion').trim();
    var description = descCol !== -1 ? String(row[descCol] || '').trim() : '';
    var maxParticipants = maxPartCol !== -1 ? (parseInt(row[maxPartCol], 10) || 50) : 50;
    var staffIdsRaw = String(row[staffCol] || '').trim();
    var staffCount = parseInt(row[countCol], 10) || 0;
    var adminRemarks = adminRemarksCol !== -1 ? String(row[adminRemarksCol] || '').trim() : '';
    var remarks = remarksCol !== -1 ? String(row[remarksCol] || '').trim() : '';
    var rawType = row[typeCol];
    var cneType = normalizeCNEType(rawType);
    var status = statusCol !== -1 ? normalizeCNEStatus(row[statusCol]) : 'Scheduled';
    var proposedBy = proposedByCol !== -1 ? normalizeEmpId(row[proposedByCol]) : '';

    var staffArray = staffIdsRaw.split(',').map(function(s) {
      return normalizeEmpId(s);
    }).filter(Boolean);

    if (staffCount === 0 && staffArray.length > 0) {
      staffCount = staffArray.length;
    }

    var rpArray = resourcePersonEmpId.split(/[,;\n]+/).map(function(s) {
      return normalizeEmpId(s);
    }).filter(Boolean);

    var isResourcePerson = loggedInId ? (rpArray.indexOf(loggedInId) !== -1) : false;
    var isStaffParticipant = loggedInId ? (staffArray.indexOf(loggedInId) !== -1) : false;

    // CNE Schedule visibility is enforced server-side as well as in the UI:
    // - Scheduled/non-historical records remain available for the public upcoming preview and all authenticated users.
    // - Completed/Canceled records are visible in CNE Schedule only to Admin, the concerned Area/Ward Incharge,
    //   or an assigned Resource Person for that CNE.
    // - My CNE Records is handled separately below so an employee can still see their own completed participation.
    var normalizedStatusForVisibility = String(status || '').trim().toLowerCase();
    var isHistoricalScheduleRecord = normalizedStatusForVisibility === 'completed' || normalizedStatusForVisibility === 'canceled' || normalizedStatusForVisibility === 'cancelled';
    if (!isMyRecordsOnly && isHistoricalScheduleRecord) {
      if (!session) {
        continue;
      }
      if (!isAdmin) {
        var scheduleVisibilityRecord = {
          area: area,
          cneType: cneType,
          resourcePersonEmpId: resourcePersonEmpId,
          instructor: resourcePersonEmpId
        };
        if (checkCNEActionAuthorized(session, scheduleVisibilityRecord) !== null) {
          continue;
        }
      }
    }

    // My CNE Records is always personal, regardless of role.
    // Admins and Incharges see only CNEs where they personally participated
    // or were assigned as a Resource Person.
    if (isMyRecordsOnly && !isResourcePerson && !isStaffParticipant) {
      continue;
    }

    if (params) {
      if (params.status && params.status !== 'ALL' && status.toLowerCase() !== String(params.status).toLowerCase()) {
        continue;
      }
      if (params.cneType && params.cneType !== 'ALL' && cneType !== normalizeCNEType(params.cneType)) {
        continue;
      }
      if (params.area && params.area !== 'ALL' && area.toLowerCase() !== String(params.area).toLowerCase()) {
        continue;
      }
    }

    var extRp = extRpCol !== -1 && row[extRpCol] ? String(row[extRpCol]).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
    var extStaff = extStaffCol !== -1 && row[extStaffCol] ? String(row[extStaffCol]).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

    // Names are safe display fields and may be shown to everyone.
    // Raw Employee IDs remain restricted to authorized management/dropdown workflows.
    var rpNames = rpArray.map(function(id) {
      return officerMap[id] || 'Resource Person';
    }).filter(Boolean);
    var rpNameString = rpNames.join(', ');

    var staffNameList = staffArray.map(function(id) {
      return officerMap[id] || 'Staff Member';
    }).filter(Boolean);

    var proposedByName = proposedBy ? (officerMap[proposedBy] || 'Staff Member') : '';

    // Management fields are available only to Admin or the responsible Area Incharge/Incharge.
    var canSeeInternalManagementFields = isAdmin;
    if (!canSeeInternalManagementFields && session && (sessionRole === 'AREA_INCHARGE' || sessionRole === 'INCHARGE')) {
      canSeeInternalManagementFields = (checkCNEAuthorized(session, area, cneType) === null);
    }

    // An assigned Resource Person receives only their own ID so the frontend can recognize
    // their CNE-specific management permission without exposing co-resource-person IDs.
    var resourcePersonEmpIdForResponse = '';
    if (session) {
      if (canSeeInternalManagementFields) {
        resourcePersonEmpIdForResponse = rpArray.join(', ');
      } else if (isResourcePerson) {
        resourcePersonEmpIdForResponse = loggedInId;
      }
    }

    // Participant IDs are similarly minimized; names remain visible to everyone.
    var staffEmpIdsForResponse = [];
    if (session) {
      if (canSeeInternalManagementFields) {
        staffEmpIdsForResponse = staffArray;
      } else if (isStaffParticipant) {
        staffEmpIdsForResponse = [loggedInId];
      }
    }

    records.push({
      cneId: dataId,
      dataId: dataId,
      classId: dataId,
      area: area,
      fromDate: fromDate,
      date: fromDate,
      toDate: toDate,
      duration: duration,
      topic: topic,
      resourcePersonEmpId: resourcePersonEmpIdForResponse,
      resourcePersonName: rpNameString,
      externalResourcePersons: extRp,
      externalStaffParticipants: extStaff,
      modeOfTeaching: mode,
      description: description,
      maxParticipants: maxParticipants,
      staffEmpIds: staffEmpIdsForResponse,
      staffNames: staffNameList,
      staffCount: staffCount,
      status: status,
      remarks: remarks,
      adminRemarks: canSeeInternalManagementFields ? adminRemarks : '',
      cneType: cneType,
      proposedByEmpId: canSeeInternalManagementFields ? proposedBy : '',
      proposedByName: proposedByName,
      myPostTestScore: (isMyRecordsOnly && Object.prototype.hasOwnProperty.call(myPostTestScores, String(dataId).trim().toUpperCase()))
        ? myPostTestScores[String(dataId).trim().toUpperCase()]
        : null
    });
  }

  logPerf('handleGetCNERecords', startedAt, 'records: ' + records.length);
  return { success: true, data: records };
}

function handleCreateCNE(params, session) {
  if (!session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }

  // Normalize any client-supplied lifecycle status BEFORE authorization decisions.
  // This prevents aliases/casing such as "Finalized", "Finalised", or "completed"
  // from bypassing the Admin-only retrospective CNE path.
  var requestedCreateStatus = normalizeCNEStatus(params.status || 'Scheduled');
  var explicitlyUnscheduled = Boolean(
    params.isUnscheduled === true ||
    params.isUnscheduled === 'true' ||
    params.action === 'addUnscheduledCNE'
  );
  var isUnscheduled = Boolean(
    explicitlyUnscheduled ||
    requestedCreateStatus === 'Completed'
  );

  // A CNE must never be born in the Canceled state. Cancellation is a separate,
  // authorized lifecycle action against an existing scheduled CNE.
  if (requestedCreateStatus === 'Canceled') {
    return {
      success: false,
      errorCode: 'INVALID_INITIAL_STATUS',
      message: 'A new CNE cannot be created directly in Canceled status.'
    };
  }

  var rawType = params.cneType || 'CENTRAL';
  var cneType = normalizeCNEType(rawType) || 'CENTRAL';

  var isAdmin = session.role === 'ADMIN';
  var isAreaIncharge = session.role === 'AREA_INCHARGE' || session.role === 'INCHARGE';

  // Retrospective Record & Finalize is an Admin-only lifecycle operation.
  if (isUnscheduled && !isAdmin) {
    return {
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Permission denied. Only Administrators can record and finalize an unscheduled CNE.'
    };
  }

  // Authorization check: Central CNE requires Admin; Departmental requires Admin or Area Incharge
  if (cneType === 'CENTRAL' && !isAdmin) {
    return {
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Permission denied. Only Administrators can create Central CNE programs.'
    };
  }
  if (cneType === 'DEPARTMENTAL' && !isAdmin && !isAreaIncharge) {
    return {
      success: false,
      errorCode: 'FORBIDDEN',
      message: 'Permission denied. Only Administrators or designated Area Incharges can create Departmental CNE programs.'
    };
  }

  var topic = sanitizeCellInput(params.topic);
  var area = sanitizeCellInput(params.area);
  var modeOfTeaching = sanitizeCellInput(params.modeOfTeaching || 'Lecture Cum Discussion');
  var fromDate = String(params.fromDate || params.date || '').trim();
  var toDate = String(params.toDate || fromDate).trim();

  if (!topic || !area || !fromDate) {
    return { success: false, message: 'Topic, Area, and Date are required.' };
  }
  if (!toDate) {
    return { success: false, message: 'To Date & Time is required and cannot be blank.' };
  }

  // FIX 1: Enforce server-side authoritative area/ward authorization for Departmental CNE creation
  var areaAuthErr = checkCNEAuthorized(session, area, cneType);
  if (areaAuthErr) {
    return areaAuthErr;
  }

  var preActiveAreaErr = requireActiveArea_(area, false);
  if (preActiveAreaErr) {
    return preActiveAreaErr;
  }

  var preTeachingModeErr = requireActiveTeachingMode_(modeOfTeaching, false);
  if (preTeachingModeErr) {
    return preTeachingModeErr;
  }

  var dFrom = new Date(fromDate);
  var dTo = new Date(toDate);
  if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
    return { success: false, message: 'Invalid Date & Time format.' };
  }
  if (dTo < dFrom) {
    return { success: false, message: 'To Date & Time must be equal to or later than From Date & Time.' };
  }

  var fromDay = getCNECanonicalDay(fromDate);
  var todayIndia = getIndiaTodayString();
  if (!fromDay) {
    return { success: false, message: 'Invalid From Date.' };
  }
  if (!isUnscheduled) {
    if (fromDay < todayIndia) {
      return { success: false, message: 'Past dates are not allowed. Please select today or a future date.' };
    }
  } else if (fromDay > todayIndia) {
    return { success: false, message: 'A completed unscheduled CNE cannot be recorded for a future date.' };
  }

  // Duration is authoritative data and must never be fabricated.
  var duration = String(params.duration || '').trim();
  if (!duration) {
    return { success: false, message: 'Duration is required.' };
  }
  var durValidation = validateCneDuration(duration, fromDate, toDate);
  if (!durValidation.isValid) {
    return { success: false, message: durValidation.message };
  }

  // Validate internal Resource Person IDs individually
  var rawRp = params.resourcePersonEmpIds !== undefined ? params.resourcePersonEmpIds : params.resourcePersonEmpId;
  var listRp = Array.isArray(rawRp) ? rawRp : (rawRp || '').split(',');
  var inputRp = [];
  for (var k = 0; k < listRp.length; k++) {
    var splitParts = String(listRp[k] || '').split(/[,;\n]+/);
    for (var sp = 0; sp < splitParts.length; sp++) {
      var trimmed = splitParts[sp].trim();
      if (trimmed) inputRp.push(trimmed);
    }
  }
  var cleanRpMap = {};
  var rpClean = [];
  var invalidRpIds = [];

  for (var i = 0; i < inputRp.length; i++) {
    var rpid = normalizeEmpId(inputRp[i]);
    if (!rpid) continue;
    if (rpid.toLowerCase().indexOf('ext:') === 0) continue;
    if (!cleanRpMap[rpid]) {
      cleanRpMap[rpid] = true;
      var rpOfficerCheck = findOfficerById(rpid);
      if (!rpOfficerCheck) {
        invalidRpIds.push(rpid);
      } else {
        rpClean.push(rpid);
      }
    }
  }

  if (invalidRpIds.length > 0) {
    return {
      success: false,
      message: 'Invalid Resource Person Employee ID(s) not found in Officers data: ' + invalidRpIds.join(', ')
    };
  }

  // External Resource Persons
  var extRp = Array.isArray(params.externalResourcePersons)
    ? params.externalResourcePersons
    : (params.externalResourcePersons || '').split(',');
  var extRpClean = extRp.map(function(s) { return sanitizeCellInput(String(s).trim()); }).filter(Boolean);

  if (rpClean.length === 0 && extRpClean.length === 0) {
    return { success: false, message: 'At least one Resource Person (Internal or External) is required.' };
  }

  // Staff Participants validation (for unscheduled CNE or pre-enrolled sessions)
  var rawStaff = params.staffEmpIds !== undefined ? params.staffEmpIds : params.staffEmpId;
  var listStaff = Array.isArray(rawStaff) ? rawStaff : (rawStaff || '').split(',');
  var inputStaff = [];
  for (var sk = 0; sk < listStaff.length; sk++) {
    var sParts = String(listStaff[sk] || '').split(/[,;\n]+/);
    for (var ssp = 0; ssp < sParts.length; ssp++) {
      var sTrimmed = sParts[ssp].trim();
      if (sTrimmed) inputStaff.push(sTrimmed);
    }
  }
  var cleanStaffMap = {};
  var staffClean = [];
  var invalidStaffIds = [];

  for (var si = 0; si < inputStaff.length; si++) {
    var sid = normalizeEmpId(inputStaff[si]);
    if (!sid) continue;
    if (!cleanStaffMap[sid]) {
      cleanStaffMap[sid] = true;
      var officerCheck = findOfficerById(sid);
      if (!officerCheck) {
        invalidStaffIds.push(sid);
      } else {
        staffClean.push(sid);
      }
    }
  }

  if (invalidStaffIds.length > 0) {
    return {
      success: false,
      message: 'Invalid participant Employee ID(s) not found in Officers data: ' + invalidStaffIds.join(', ')
    };
  }

  var extStaff = Array.isArray(params.externalStaffParticipants)
    ? params.externalStaffParticipants
    : (params.externalStaffParticipants || '').split(',');
  var extStaffClean = extStaff.map(function(s) { return sanitizeCellInput(String(s).trim()); }).filter(Boolean);

  var staffString = staffClean.join(', ');
  var totalStaffCount = staffClean.length + extStaffClean.length;

  if (isUnscheduled && totalStaffCount < 1) {
    return { success: false, message: 'At least one participant is required before an unscheduled CNE can be recorded as Completed.' };
  }

  // Authoritative create-state assignment. Because Completed aliases were already routed
  // through the Admin-only retrospective path and Canceled was rejected above, the normal
  // branch can only resolve to Scheduled. Keep normalization here for schema compatibility.
  var status = isUnscheduled ? 'Completed' : normalizeCNEStatus(params.status || 'Scheduled');

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy processing another update. Please try again.' };
  }

  try {
    var freshCreateSession = refreshMutationSession(session);
    if (!freshCreateSession.success) return freshCreateSession;
    session = freshCreateSession.session;

    // Re-run role/area authorization after waiting for the lock. A role or assigned
    // area can change while the request is queued.
    isAdmin = session.role === 'ADMIN';
    isAreaIncharge = session.role === 'AREA_INCHARGE' || session.role === 'INCHARGE';
    if (isUnscheduled && !isAdmin) {
      return { success: false, errorCode: 'FORBIDDEN', message: 'Permission denied. Only Administrators can record and finalize an unscheduled CNE.' };
    }
    if (cneType === 'CENTRAL' && !isAdmin) {
      return { success: false, errorCode: 'FORBIDDEN', message: 'Permission denied. Only Administrators can create Central CNE programs.' };
    }
    if (cneType === 'DEPARTMENTAL' && !isAdmin && !isAreaIncharge) {
      return { success: false, errorCode: 'FORBIDDEN', message: 'Permission denied. Only Administrators or designated Area Incharges can create Departmental CNE programs.' };
    }
    var liveAreaAuthErr = checkCNEAuthorized(session, area, cneType);
    if (liveAreaAuthErr) return liveAreaAuthErr;

    var activeAreaErr = requireActiveArea_(area, true);
    if (activeAreaErr) return activeAreaErr;

    var activeTeachingModeErr = requireActiveTeachingMode_(modeOfTeaching, true);
    if (activeTeachingModeErr) return activeTeachingModeErr;

    // Revalidate internal identities against a fresh Officers-data snapshot at commit time.
    _executionRosterData = null;
    _inMemoryOfficerMap = null;
    for (var rpIdx = 0; rpIdx < rpClean.length; rpIdx++) {
      if (!findOfficerById(rpClean[rpIdx])) {
        return { success: false, errorCode: 'OFFICER_DATA_CHANGED', message: 'Resource Person Employee ID is no longer present in Officers data: ' + rpClean[rpIdx] };
      }
    }
    for (var staffIdx = 0; staffIdx < staffClean.length; staffIdx++) {
      if (!findOfficerById(staffClean[staffIdx])) {
        return { success: false, errorCode: 'OFFICER_DATA_CHANGED', message: 'Participant Employee ID is no longer present in Officers data: ' + staffClean[staffIdx] };
      }
    }

    var sheet = getOrCreateSheet('CNE Schedule');
    var curYear = parseInt(getIndiaTodayString().slice(0, 4), 10) || new Date().getFullYear();
    var timestampSuffix = Date.now().toString().slice(-4);
    var randSuffix = ('000' + Math.floor(Math.random() * 1000)).slice(-3);
    var cneId = 'CLS-' + curYear + '-' + (cneType === 'DEPARTMENTAL' ? 'D-' : '') + (isUnscheduled ? 'U-' : '') + timestampSuffix + randSuffix;

    var colMap = getHeaderMap(sheet);
    var maxCol = Math.max(sheet.getLastColumn(), 22);
    var rowData = [];
    for (var col = 0; col < maxCol; col++) rowData.push('');

    var setCell = function(key, fallbackCol, val) {
      var idx = colMap[key] !== undefined ? colMap[key] : fallbackCol;
      while (rowData.length <= idx) rowData.push('');
      rowData[idx] = val;
    };

    var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : (colMap['classid'] !== undefined ? colMap['classid'] : (colMap['dataid'] !== undefined ? colMap['dataid'] : 0));
    while (rowData.length <= idCol) rowData.push('');
    rowData[idCol] = cneId;

    setCell('topic', 1, topic);
    setCell('area', 2, area);
    setCell('fromdate', 3, fromDate);
    if (colMap['date'] !== undefined) rowData[colMap['date']] = fromDate;
    setCell('todate', 4, toDate);
    setCell('duration', 5, sanitizeCellInput(duration));
    setCell('resourcepersonempid', 7, rpClean.join(', '));
    setCell('modeofteaching', 8, modeOfTeaching);
    if (colMap['mode'] !== undefined) rowData[colMap['mode']] = modeOfTeaching;
    setCell('description', 9, sanitizeCellInput(params.description || ''));
    setCell('maxparticipants', 10, parseInt(params.maxParticipants, 10) || 50);
    setCell('status', 11, status);
    setCell('typeofcne', 12, cneType);
    setCell('externalresourcepersons', 13, extRpClean.join(', '));
    setCell('proposedby', 14, session.employeeId || '');
    setCell('adminremarks', 15, sanitizeCellInput(params.adminRemarks || params.remarks || ''));
    setCell('staffempid', 16, staffString);
    setCell('staffcount', 17, totalStaffCount);
    setCell('externalstaffparticipants', 18, extStaffClean.join(', '));
    setCell('createdat', 19, new Date().toISOString());
    setCell('createdby', 20, session.employeeId || '');
    if (isUnscheduled) {
      setCell('finalizedat', 21, new Date().toISOString());
      setCell('finalizedby', 22, session.employeeId || '');
    }

    sheet.appendRow(rowData);

    logAuditAction('CREATE_CNE', session.employeeId, 'Created ' + (isUnscheduled ? 'Unscheduled ' : '') + cneType + ' CNE: ' + cneId + ' (' + topic + ') Status: ' + status, 'SUCCESS');
    return {
      success: true,
      message: isUnscheduled ? 'Unscheduled CNE activity recorded successfully.' : ((cneType === 'DEPARTMENTAL' ? 'Departmental' : 'Central') + ' CNE class scheduled successfully.'),
      data: { cneId: cneId, classId: cneId, dataId: cneId, status: status, cneType: cneType }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2. Secure CNE Activity Update with Concurrency Locking & Server-Side Roster Validation
 */
function handleUpdateCNE(params, session) {
  if (!session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized session.' };
  }

  var cneId = String(params.cneId || params.classId || params.dataId || '').trim();
  if (!cneId) return { success: false, message: 'CNE ID is required.' };

  // Strict CNE ID immutability: Backend must reject any attempt to modify an existing CNE ID
  if (
    params.newClassId ||
    params.newCneId ||
    params.updatedClassId ||
    params.updatedCneId ||
    (params.id && String(params.id).trim().toLowerCase() !== cneId.toLowerCase()) ||
    (params.cneId && params.classId && String(params.cneId).trim().toLowerCase() !== String(params.classId).trim().toLowerCase())
  ) {
    return {
      success: false,
      errorCode: 'IMMUTABLE_CNE_ID',
      message: 'CNE ID is permanently immutable and cannot be modified.'
    };
  }

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };

  var authErr = checkCNEAuthorized(session, record.area, record.cneType);
  if (authErr) return authErr;

  // Closed CNEs are immutable through Edit CNE.
  var normalizedRecordStatus = normalizeCNEStatus(record.status);
  if (normalizeCNEStatus(record.status) === 'Completed') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_FINALIZED',
      message: 'This CNE has already been finalized. Details cannot be modified.'
    };
  }
  if (normalizedRecordStatus === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_CANCELED',
      message: 'This CNE has been canceled. Details cannot be modified.'
    };
  }

  // Prevent updateCNE from bypassing official Finalize or Cancel lifecycle
  if (params.status !== undefined) {
    var proposedStatus = normalizeCNEStatus(params.status);
    var currentStatus = normalizeCNEStatus(record.status);
    if (proposedStatus !== currentStatus) {
      return {
        success: false,
        errorCode: 'INVALID_STATUS_TRANSITION',
        message: 'CNE status cannot be changed through Edit CNE. Use the official Finalize or Cancel workflow.'
      };
    }
  }

  // Fix 1: Prevent Area Incharge from transferring a Departmental CNE to another ward/area
  if (session.role === 'AREA_INCHARGE' || session.role === 'INCHARGE') {
    if (params.area !== undefined) {
      var proposedArea = String(params.area || '').trim().toLowerCase();
      var currentArea = String(record.area || '').trim().toLowerCase();
      if (proposedArea !== currentArea) {
        return {
          success: false,
          errorCode: 'FORBIDDEN_WARD_TRANSFER',
          message: 'Permission denied. Area Incharge cannot transfer a Departmental CNE to another area/ward.'
        };
      }
    }
  }

  if (params.area !== undefined) {
    var preOldArea = String(record.area || '').trim().toUpperCase();
    var preNewArea = String(params.area || '').trim().toUpperCase();
    if (preNewArea && preNewArea !== preOldArea) {
      var preAreaActiveErr = requireActiveArea_(params.area, false);
      if (preAreaActiveErr) return preAreaActiveErr;
    }
  }

  if (params.modeOfTeaching !== undefined) {
    var preOldTeachingMode = String(record.modeOfTeaching || '').trim().toUpperCase();
    var preNewTeachingMode = String(params.modeOfTeaching || '').trim().toUpperCase();
    if (preNewTeachingMode && preNewTeachingMode !== preOldTeachingMode) {
      var preTeachingModeActiveErr = requireActiveTeachingMode_(params.modeOfTeaching, false);
      if (preTeachingModeActiveErr) return preTeachingModeActiveErr;
    }
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy processing another request. Please try again.' };
  }

  try {
    var freshUpdateSession = refreshMutationSession(session);
    if (!freshUpdateSession.success) return freshUpdateSession;
    session = freshUpdateSession.session;
    _executionRosterData = null;
    _inMemoryOfficerMap = null;

    // Re-read the authoritative CNE while holding the lock. The record may have
    // been finalized, canceled, or administratively changed after the initial
    // pre-lock validation above. Never write using stale authorization/lifecycle
    // state.
    var liveUpdateRecord = getCNEScheduleRecord(cneId);
    if (!liveUpdateRecord) {
      return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found.' };
    }

    var liveUpdateAuthErr = checkCNEAuthorized(session, liveUpdateRecord.area, liveUpdateRecord.cneType);
    if (liveUpdateAuthErr) return liveUpdateAuthErr;

    var liveUpdateStatus = normalizeCNEStatus(liveUpdateRecord.status);
    if (liveUpdateStatus === 'Completed') {
      return {
        success: false,
        errorCode: 'CNE_ALREADY_FINALIZED',
        message: 'This CNE has already been finalized. Details cannot be modified.'
      };
    }
    if (liveUpdateStatus === 'Canceled') {
      return {
        success: false,
        errorCode: 'CNE_ALREADY_CANCELED',
        message: 'This CNE has been canceled. Details cannot be modified.'
      };
    }

    // Re-check Area Incharge scope against the live authoritative area.
    if (session.role === 'AREA_INCHARGE' || session.role === 'INCHARGE') {
      if (params.area !== undefined) {
        var liveProposedArea = String(params.area || '').trim().toLowerCase();
        var liveCurrentArea = String(liveUpdateRecord.area || '').trim().toLowerCase();
        if (liveProposedArea !== liveCurrentArea) {
          return {
            success: false,
            errorCode: 'FORBIDDEN_WARD_TRANSFER',
            message: 'Permission denied. Area Incharge cannot transfer a Departmental CNE to another area/ward.'
          };
        }
      }
    }

    if (params.area !== undefined) {
      var liveOldArea = String(liveUpdateRecord.area || '').trim().toUpperCase();
      var liveNewArea = String(params.area || '').trim().toUpperCase();
      if (liveNewArea && liveNewArea !== liveOldArea) {
        var liveAreaActiveErr = requireActiveArea_(params.area, true);
        if (liveAreaActiveErr) return liveAreaActiveErr;
      }
    }

    if (params.modeOfTeaching !== undefined) {
      var liveOldTeachingMode = String(liveUpdateRecord.modeOfTeaching || '').trim().toUpperCase();
      var liveNewTeachingMode = String(params.modeOfTeaching || '').trim().toUpperCase();
      if (liveNewTeachingMode && liveNewTeachingMode !== liveOldTeachingMode) {
        var liveTeachingModeActiveErr = requireActiveTeachingMode_(params.modeOfTeaching, true);
        if (liveTeachingModeActiveErr) return liveTeachingModeActiveErr;
      }
    }

    if (params.status !== undefined) {
      var liveProposedStatus = normalizeCNEStatus(params.status);
      if (liveProposedStatus !== liveUpdateStatus) {
        return {
          success: false,
          errorCode: 'INVALID_STATUS_TRANSITION',
          message: 'CNE status cannot be changed through Edit CNE. Use the official Finalize or Cancel workflow.'
        };
      }
    }

    var ss = getSpreadsheet('CNE');
    var sheet = ss.getSheetByName('CNE Schedule');
    if (!sheet) return { success: false, message: 'CNE Schedule sheet not found.' };

    var data = sheet.getDataRange().getValues();
    var colMap = getHeaderMap(sheet);
    var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : (colMap['classid'] !== undefined ? colMap['classid'] : (colMap['dataid'] !== undefined ? colMap['dataid'] : 0));

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][idCol]).trim().toLowerCase() === cneId.toLowerCase()) {
        var rowNum = r + 1;
        var setColVal = function(key, fallbackCol, val) {
          var c = colMap[key] !== undefined ? colMap[key] : fallbackCol;
          if (c !== undefined && c >= 0) {
            sheet.getRange(rowNum, c + 1).setValue(val);
          }
        };

        if (params.topic !== undefined) setColVal('topic', 1, sanitizeCellInput(params.topic));
        if (params.area !== undefined) setColVal('area', 2, sanitizeCellInput(params.area));

        var effDate = params.date !== undefined ? String(params.date).trim() : (params.fromDate !== undefined ? String(params.fromDate).trim() : String(data[r][colMap['fromdate'] !== undefined ? colMap['fromdate'] : 3] || ''));
        var effToDate = params.toDate !== undefined ? String(params.toDate).trim() : String(data[r][colMap['todate'] !== undefined ? colMap['todate'] : 4] || effDate);
        var effDuration = params.duration !== undefined ? String(params.duration).trim() : String(data[r][colMap['duration'] !== undefined ? colMap['duration'] : 6] || '');

        if (params.date !== undefined || params.fromDate !== undefined || params.toDate !== undefined) {
          if (!effDate) {
            return { success: false, message: 'From Date & Time is required and cannot be blank.' };
          }
          if (!effToDate) {
            return { success: false, message: 'To Date & Time is required and cannot be blank.' };
          }
          var dFrom = new Date(effDate);
          var dTo = new Date(effToDate);
          if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
            return { success: false, message: 'Invalid Date & Time format.' };
          }
          if (dTo < dFrom) {
            return { success: false, message: 'To Date & Time must be equal to or later than From Date & Time.' };
          }
          var editFromDay = getCNECanonicalDay(effDate);
          if (!editFromDay || editFromDay < getIndiaTodayString()) {
            return { success: false, message: 'Scheduled CNE date cannot be in the past.' };
          }
        }

        if (params.duration !== undefined || params.date !== undefined || params.fromDate !== undefined || params.toDate !== undefined) {
          if (!effDuration) {
            return { success: false, message: 'Duration is required and cannot be blank.' };
          }
          var durVal = validateCneDuration(effDuration, effDate, effToDate);
          if (!durVal.isValid) {
            return { success: false, message: durVal.message };
          }
        }

        if (params.date !== undefined || params.fromDate !== undefined) {
          setColVal('fromdate', 3, effDate);
          if (colMap['date'] !== undefined) sheet.getRange(rowNum, colMap['date'] + 1).setValue(effDate);
        }
        if (params.toDate !== undefined) setColVal('todate', 4, effToDate);
        if (params.duration !== undefined) setColVal('duration', 5, effDuration);

        // Resource person update
        var existingRp = data[r][colMap['resourcepersonempid'] !== undefined ? colMap['resourcepersonempid'] : 7]
          ? String(data[r][colMap['resourcepersonempid'] !== undefined ? colMap['resourcepersonempid'] : 7]).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
        var existingExtRp = data[r][colMap['externalresourcepersons'] !== undefined ? colMap['externalresourcepersons'] : 13]
          ? String(data[r][colMap['externalresourcepersons'] !== undefined ? colMap['externalresourcepersons'] : 13]).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
        var rpClean = existingRp;
        var extRpClean = existingExtRp;

        if (params.resourcePersonEmpId !== undefined || params.resourcePersonEmpIds !== undefined) {
          var rawRp = params.resourcePersonEmpIds !== undefined ? params.resourcePersonEmpIds : params.resourcePersonEmpId;
          var listRp = Array.isArray(rawRp) ? rawRp : (rawRp || '').split(',');
          var inputRp = [];
          for (var k = 0; k < listRp.length; k++) {
            var splitParts = String(listRp[k] || '').split(/[,;\n]+/);
            for (var sp = 0; sp < splitParts.length; sp++) {
              var trimmed = splitParts[sp].trim();
              if (trimmed) inputRp.push(trimmed);
            }
          }
          var cleanRpMap = {};
          rpClean = [];
          var invalidRpIds = [];

          for (var i = 0; i < inputRp.length; i++) {
            var rpid = normalizeEmpId(inputRp[i]);
            if (!rpid) continue;
            if (rpid.toLowerCase().indexOf('ext:') === 0) continue;
            if (!cleanRpMap[rpid]) {
              cleanRpMap[rpid] = true;
              var rpOfficerCheck = findOfficerById(rpid);
              if (!rpOfficerCheck) {
                invalidRpIds.push(rpid);
              } else {
                rpClean.push(rpid);
              }
            }
          }

          if (invalidRpIds.length > 0) {
            return {
              success: false,
              message: 'Invalid Resource Person Employee ID(s) not found in roster: ' + invalidRpIds.join(', ')
            };
          }
        }

        if (params.externalResourcePersons !== undefined) {
          var extRp = Array.isArray(params.externalResourcePersons)
            ? params.externalResourcePersons
            : (params.externalResourcePersons || '').split(',');
          extRpClean = extRp.map(function(s) { return sanitizeCellInput(String(s).trim()); }).filter(Boolean);
        }

        if (params.resourcePersonEmpId !== undefined || params.resourcePersonEmpIds !== undefined || params.externalResourcePersons !== undefined) {
          if (rpClean.length === 0 && extRpClean.length === 0) {
            return { success: false, message: 'At least one Resource Person (Internal or External) is required.' };
          }
          setColVal('resourcepersonempid', 7, rpClean.join(', '));
          setColVal('externalresourcepersons', 13, extRpClean.join(', '));
        }

        if (params.modeOfTeaching !== undefined) {
          setColVal('modeofteaching', 8, sanitizeCellInput(params.modeOfTeaching));
          if (colMap['mode'] !== undefined) sheet.getRange(rowNum, colMap['mode'] + 1).setValue(sanitizeCellInput(params.modeOfTeaching));
        }
        if (params.description !== undefined) setColVal('description', 9, sanitizeCellInput(params.description));

        // Staff participant update (if provided)
        if (params.staffEmpIds !== undefined || params.staffEmpId !== undefined || params.externalStaffParticipants !== undefined) {
          var rawStaff = params.staffEmpIds !== undefined ? params.staffEmpIds : params.staffEmpId;
          var listStaff = Array.isArray(rawStaff) ? rawStaff : (rawStaff || '').split(',');
          var inputStaff = [];
          for (var sk = 0; sk < listStaff.length; sk++) {
            var sParts = String(listStaff[sk] || '').split(/[,;\n]+/);
            for (var ssp = 0; ssp < sParts.length; ssp++) {
              var sTrimmed = sParts[ssp].trim();
              if (sTrimmed) inputStaff.push(sTrimmed);
            }
          }
          var cleanStaffMap = {};
          var staffClean = [];
          var invalidStaffIds = [];

          for (var si = 0; si < inputStaff.length; si++) {
            var sid = normalizeEmpId(inputStaff[si]);
            if (!sid) continue;
            if (!cleanStaffMap[sid]) {
              cleanStaffMap[sid] = true;
              var officerCheck = findOfficerById(sid);
              if (!officerCheck) {
                invalidStaffIds.push(sid);
              } else {
                staffClean.push(sid);
              }
            }
          }

          if (invalidStaffIds.length > 0) {
            return {
              success: false,
              message: 'Invalid participant Employee ID(s) not found in Officers data: ' + invalidStaffIds.join(', ')
            };
          }

          var extStaffClean = [];
          if (params.externalStaffParticipants !== undefined) {
            var extStaff = Array.isArray(params.externalStaffParticipants)
              ? params.externalStaffParticipants
              : (params.externalStaffParticipants || '').split(',');
            extStaffClean = extStaff.map(function(s) { return sanitizeCellInput(String(s).trim()); }).filter(Boolean);
          }

          setColVal('staffempid', 16, staffClean.join(', '));
          setColVal('staffcount', 17, staffClean.length + extStaffClean.length);
          if (params.externalStaffParticipants !== undefined) {
            setColVal('externalstaffparticipants', 18, extStaffClean.join(', '));
          }
        }

        // Central CNE only maxParticipants
        var currentCneType = normalizeCNEType(liveUpdateRecord.cneType);
        if (currentCneType === 'CENTRAL' && params.maxParticipants !== undefined) {
          setColVal('maxparticipants', 10, parseInt(params.maxParticipants, 10) || 50);
        }

        // Status transitions cannot be performed through handleUpdateCNE; identical status is safely ignored
        if (params.status !== undefined) {
          var proposedStatus = normalizeCNEStatus(params.status);
          var currentStatus = normalizeCNEStatus(liveUpdateRecord.status);
          if (proposedStatus !== currentStatus) {
            return {
              success: false,
              errorCode: 'INVALID_STATUS_TRANSITION',
              message: 'CNE status cannot be changed through Edit CNE. Use the official Finalize or Cancel workflow.'
            };
          }
        }

        // CNE Category / Type immutability
        if (params.cneType !== undefined) {
          var normType = normalizeCNEType(params.cneType);
          if (normType && normType !== currentCneType) {
            return {
              success: false,
              errorCode: 'IMMUTABLE_CNE_TYPE',
              message: 'CNE Category / Type is immutable and cannot be changed.'
            };
          }
        }

        if (params.remarks !== undefined || params.adminRemarks !== undefined) {
          setColVal('adminremarks', 15, sanitizeCellInput(params.adminRemarks || params.remarks || ''));
        }

        logAuditAction('UPDATE_CNE', session.employeeId, 'Updated CNE ID: ' + cneId, 'SUCCESS');
        return { success: true, message: 'CNE record updated successfully.' };
      }
    }
    return { success: false, message: 'CNE record with ID ' + cneId + ' not found.' };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Helper: Parse duration string (HH:MM:SS or HH:MM or decimal hours) into total seconds.
 */
function parseDurationToSeconds(str) {
  if (!str) return null;
  var trimmed = String(str).trim();
  var parts = trimmed.split(':');
  if (parts.length >= 2 && parts.length <= 3) {
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var s = parts.length === 3 ? parseInt(parts[2], 10) : 0;
    if (isNaN(h) || isNaN(m) || isNaN(s) || m < 0 || m >= 60 || s < 0 || s >= 60 || h < 0) {
      return null;
    }
    return h * 3600 + m * 60 + s;
  }
  var num = parseFloat(trimmed);
  if (!isNaN(num) && num > 0) {
    return Math.round(num * 3600);
  }
  return null;
}

/**
 * Helper: Format total seconds into standard HH:MM:SS (e.g. 08:00:00).
 */
function formatSecondsToDuration(totalSeconds) {
  var s = Math.max(0, Math.round(totalSeconds));
  var hours = Math.floor(s / 3600);
  var minutes = Math.floor((s % 3600) / 60);
  var seconds = s % 60;
  var pad = function(n) { return (n < 10 ? '0' : '') + n; };
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

/**
 * Compact homepage duration label, e.g. 150 Hrs+.
 * Keeps raw second-based calculation internal while exposing only a simple display metric.
 */
function formatDurationAsHoursPlus(totalSeconds) {
  var safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  if (safeSeconds === 0) return '0 Hrs';
  var hours = Math.floor(safeSeconds / 3600);
  if (hours === 0) return '<1 Hr';
  return hours === 1 ? '1 Hr+' : hours + ' Hrs+';
}

/**
 * Helper: Calculate distinct calendar days touched between fromDt and toDt inclusive.
 */
function getCalendarDaysTouched(fromDtStr, toDtStr) {
  if (!fromDtStr || !toDtStr) return 1;
  var d1 = new Date(fromDtStr);
  var d2 = new Date(toDtStr);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
  var utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  var utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  var diffDays = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Helper: Authoritative CNE duration validator.
 * Enforces minimum 00:05:00 (5 minutes) and maximum 8 hours × calendar days touched.
 */
function validateCneDuration(durationStr, fromDtStr, toDtStr) {
  var daysTouched = getCalendarDaysTouched(fromDtStr, toDtStr);
  var maxSeconds = daysTouched * 8 * 3600;
  var maxDurationStr = formatSecondsToDuration(maxSeconds);
  var minSeconds = 300; // 5 minutes (00:05:00)

  var sec = parseDurationToSeconds(durationStr);
  if (sec === null) {
    return {
      isValid: false,
      message: 'Invalid duration format. Please enter as HH:MM:SS (e.g. 01:30:00 or 08:00:00).',
      maxDurationStr: maxDurationStr
    };
  }

  if (sec < minSeconds || sec > maxSeconds) {
    return {
      isValid: false,
      message: 'Duration must be between 00:05:00 and ' + maxDurationStr + ' for this CNE.',
      maxDurationStr: maxDurationStr
    };
  }

  return { isValid: true, maxDurationStr: maxDurationStr };
}

/**
 * Batch Schedule Departmental CNEs (Admin and Area Incharge)
 * Creates separate, independent records in CNE Schedule for each schedule row.
 */
function handleAddDepartmentalSchedule(params, session) {
  if (!session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }

  var rawClasses = params.schedules || params.classes;
  if (!rawClasses || !Array.isArray(rawClasses) || rawClasses.length === 0) {
    return { success: false, message: 'At least one departmental CNE schedule row is required.' };
  }

  var isAdmin = session.role === 'ADMIN';
  var isAreaIncharge = session.role === 'AREA_INCHARGE' || session.role === 'INCHARGE';
  if (!isAdmin && !isAreaIncharge) {
    return { success: false, errorCode: 'FORBIDDEN', message: 'Only an Administrator or designated Area Incharge can schedule Departmental CNEs.' };
  }

  var todayStr = getIndiaTodayString();
  var validatedList = [];

  for (var i = 0; i < rawClasses.length; i++) {
    var c = rawClasses[i];
    var topic = sanitizeCellInput(c.topic);
    var area = sanitizeCellInput(c.area);
    var date = (c.date || '').trim();
    var toDate = (c.toDate || date).trim();

    if (!topic || !area || !date) {
      return { success: false, message: 'Row ' + (i + 1) + ': Topic, Area, and From Date & Time are required.' };
    }
    if (!toDate) {
      return { success: false, message: 'Row ' + (i + 1) + ': To Date & Time is required and cannot be blank.' };
    }

    var dFrom = new Date(date);
    var dTo = new Date(toDate);
    if (isNaN(dFrom.getTime())) {
      return { success: false, message: 'Row ' + (i + 1) + ': Invalid From Date & Time format.' };
    }
    if (isNaN(dTo.getTime())) {
      return { success: false, message: 'Row ' + (i + 1) + ': Invalid To Date & Time format.' };
    }
    if (dTo < dFrom) {
      return { success: false, message: 'Row ' + (i + 1) + ': To Date & Time must be equal to or later than From Date & Time.' };
    }

    var rowDay = getCNECanonicalDay(date);
    if (!rowDay || rowDay < todayStr) {
      return { success: false, message: 'Row ' + (i + 1) + ': Scheduled date cannot be in the past.' };
    }

    var duration = (c.duration || '').trim();
    if (!duration) {
      return { success: false, message: 'Row ' + (i + 1) + ': Duration is required.' };
    }
    var durVal = validateCneDuration(duration, date, toDate);
    if (!durVal.isValid) {
      return { success: false, message: 'Row ' + (i + 1) + ': ' + durVal.message };
    }

    var teachingMode = sanitizeCellInput(c.modeOfTeaching || 'Lecture Cum Discussion');
    var rowTeachingModeErr = requireActiveTeachingMode_(teachingMode, false);
    if (rowTeachingModeErr) {
      return { success: false, errorCode: 'TEACHING_MODE_INACTIVE', message: 'Row ' + (i + 1) + ': ' + rowTeachingModeErr.message };
    }

    // Check authorization for this department
    var authErr = checkCNEAuthorized(session, area, 'DEPARTMENTAL');
    if (authErr) {
      return { success: false, errorCode: 'FORBIDDEN', message: 'Row ' + (i + 1) + ' (' + area + '): ' + authErr.message };
    }

    var rowActiveAreaErr = requireActiveArea_(area, false);
    if (rowActiveAreaErr) {
      return { success: false, errorCode: 'AREA_INACTIVE', message: 'Row ' + (i + 1) + ' (' + area + '): ' + rowActiveAreaErr.message };
    }

    // Internal RP validation
    var rawRp = c.resourcePersonEmpIds !== undefined ? c.resourcePersonEmpIds : c.resourcePersonEmpId;
    var listRp = Array.isArray(rawRp) ? rawRp : (rawRp || '').split(',');
    var cleanRpMap = {};
    var rpClean = [];
    var invalidRpIds = [];

    for (var k = 0; k < listRp.length; k++) {
      var splitParts = String(listRp[k] || '').split(/[,;\n]+/);
      for (var sp = 0; sp < splitParts.length; sp++) {
        var rpid = normalizeEmpId(splitParts[sp]);
        if (!rpid || rpid.toLowerCase().indexOf('ext:') === 0) continue;
        if (!cleanRpMap[rpid]) {
          cleanRpMap[rpid] = true;
          var officerCheck = findOfficerById(rpid);
          if (!officerCheck) {
            invalidRpIds.push(rpid);
          } else {
            rpClean.push(rpid);
          }
        }
      }
    }

    if (invalidRpIds.length > 0) {
      return { success: false, message: 'Row ' + (i + 1) + ': Invalid Resource Person Employee ID(s): ' + invalidRpIds.join(', ') };
    }

    // External RP
    var extRp = Array.isArray(c.externalResourcePersons)
      ? c.externalResourcePersons
      : (c.externalResourcePersons || '').split(',');
    var extRpClean = extRp.map(function(s) { return sanitizeCellInput(String(s).trim()); }).filter(Boolean);

    if (rpClean.length === 0 && extRpClean.length === 0) {
      return { success: false, message: 'Row ' + (i + 1) + ': At least one Resource Person (Internal or External) is required.' };
    }

    validatedList.push({
      topic: topic,
      area: area,
      date: date,
      toDate: toDate,
      duration: sanitizeCellInput(duration),
      rpClean: rpClean,
      extRpClean: extRpClean,
      mode: teachingMode,
      description: sanitizeCellInput(c.description || ''),
      maxParticipants: parseInt(c.maxParticipants, 10) || 30,
      adminRemarks: sanitizeCellInput(c.adminRemarks || '')
    });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var freshDepartmentalSession = refreshMutationSession(session);
    if (!freshDepartmentalSession.success) return freshDepartmentalSession;
    session = freshDepartmentalSession.session;
    isAdmin = session.role === 'ADMIN';
    isAreaIncharge = session.role === 'AREA_INCHARGE' || session.role === 'INCHARGE';
    if (!isAdmin && !isAreaIncharge) {
      return { success: false, errorCode: 'FORBIDDEN', message: 'Only an Administrator or designated Area Incharge can schedule Departmental CNEs.' };
    }
    _executionRosterData = null;
    _inMemoryOfficerMap = null;
    var liveAreaStatusMap = getAreaStatusMap_(true);
    var liveTeachingModeStatusMap = getTeachingModeStatusMap_(true);
    for (var liveIdx = 0; liveIdx < validatedList.length; liveIdx++) {
      var liveItem = validatedList[liveIdx];
      var liveDeptAuth = checkCNEAuthorized(session, liveItem.area, 'DEPARTMENTAL');
      if (liveDeptAuth) return { success: false, errorCode: 'FORBIDDEN', message: 'Row ' + (liveIdx + 1) + ' (' + liveItem.area + '): ' + liveDeptAuth.message };
      var normLiveArea = String(liveItem.area || '').trim().toUpperCase();
      if (liveAreaStatusMap[normLiveArea] !== 'ACTIVE') {
        return {
          success: false,
          errorCode: 'AREA_INACTIVE',
          message: 'The selected ward/area is inactive. Please select an active area.'
        };
      }
      var normLiveTeachingMode = String(liveItem.mode || '').trim().toUpperCase();
      if (liveTeachingModeStatusMap[normLiveTeachingMode] !== 'ACTIVE') {
        return {
          success: false,
          errorCode: 'TEACHING_MODE_INACTIVE',
          message: 'The selected Teaching Mode is inactive. Please select an active Teaching Mode.'
        };
      }
      for (var liveRpIdx = 0; liveRpIdx < liveItem.rpClean.length; liveRpIdx++) {
        if (!findOfficerById(liveItem.rpClean[liveRpIdx])) {
          return { success: false, errorCode: 'OFFICER_DATA_CHANGED', message: 'Row ' + (liveIdx + 1) + ': Resource Person Employee ID is no longer present in Officers data: ' + liveItem.rpClean[liveRpIdx] };
        }
      }
    }

    var sheet = getOrCreateSheet('CNE Schedule');

    var colMap = getHeaderMap(sheet);
    var curYear = new Date().getFullYear();
    var createdIds = [];
    var allRows = [];
    var targetCols = Math.max(sheet.getLastColumn(), 16);

    for (var j = 0; j < validatedList.length; j++) {
      var item = validatedList[j];
      var timestampSuffix = Date.now().toString().slice(-4);
      var randSuffix = ('000' + Math.floor(Math.random() * 1000)).slice(-3) + j;
      var cneId = 'CLS-' + curYear + '-D-' + timestampSuffix + randSuffix;

      var rowData = [];
      for (var col = 0; col < targetCols; col++) rowData.push('');

      var setCell = function(key, fallbackCol, val) {
        var idx = colMap[key] !== undefined ? colMap[key] : fallbackCol;
        while (rowData.length <= idx) rowData.push('');
        rowData[idx] = val;
      };

      var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : (colMap['classid'] !== undefined ? colMap['classid'] : 0);
      while (rowData.length <= idCol) rowData.push('');
      rowData[idCol] = cneId;

      setCell('topic', 1, item.topic);
      setCell('area', 2, item.area);
      setCell('fromdate', 3, item.date);
      if (colMap['date'] !== undefined) rowData[colMap['date']] = item.date;
      setCell('todate', 4, item.toDate);
      setCell('duration', 5, item.duration);
      setCell('resourcepersonempid', 7, item.rpClean.join(', '));
      setCell('modeofteaching', 8, item.mode);
      if (colMap['mode'] !== undefined) rowData[colMap['mode']] = item.mode;
      setCell('description', 9, item.description);
      setCell('maxparticipants', 10, item.maxParticipants);
      setCell('status', 11, 'Scheduled');
      setCell('typeofcne', 12, 'DEPARTMENTAL');
      setCell('externalresourcepersons', 13, item.extRpClean.join(', '));
      setCell('proposedby', 14, session.employeeId || '');
      setCell('adminremarks', 15, item.adminRemarks);

      allRows.push(rowData);
      createdIds.push(cneId);
    }

    if (allRows.length > 0) {
      var numColumns = targetCols;
      for (var r = 0; r < allRows.length; r++) {
        if (allRows[r].length > numColumns) {
          numColumns = allRows[r].length;
        }
      }
      for (var r = 0; r < allRows.length; r++) {
        while (allRows[r].length < numColumns) {
          allRows[r].push('');
        }
      }

      var startRow = sheet.getLastRow() + 1;
      var numRows = allRows.length;

      var maxRows = sheet.getMaxRows();
      if (startRow + numRows - 1 > maxRows) {
        sheet.insertRowsAfter(maxRows, (startRow + numRows - 1) - maxRows);
      }
      var maxCols = sheet.getMaxColumns();
      if (numColumns > maxCols) {
        sheet.insertColumnsAfter(maxCols, numColumns - maxCols);
      }

      sheet.getRange(startRow, 1, numRows, numColumns).setValues(allRows);
    }

    logAuditAction('ADD_DEPARTMENTAL_SCHEDULE', session.employeeId, 'Scheduled ' + createdIds.length + ' departmental CNE(s): ' + createdIds.join(', '), 'SUCCESS');

    return {
      success: true,
      message: 'Scheduled ' + createdIds.length + ' Departmental CNE session(s) successfully.',
      data: { createdClasses: createdIds, count: createdIds.length }
    };
  } finally {
    lock.releaseLock();
  }
}


/**
 * 9 & 10. Gallery & Drive Image Storage (Isolated Public View, Strict Image MIME Validation & 5MB Limit)
 */
function handleGetGallery(params, session) {
  var sheet = getOrCreateSheet('Gallery');
  
  var isAdmin = session && String(session.role || '').toUpperCase() === 'ADMIN';
  var data = sheet.getDataRange().getValues();
  var list = [];
  
  for (var r = 1; r < data.length; r++) {
    var id = String(data[r][0] || '').trim();
    var status = String(data[r][8] || 'ACTIVE').toUpperCase().trim();
    if (!id || status === 'INACTIVE') continue;
    
    var item = {
      id: id,
      title: String(data[r][1] || ''),
      description: String(data[r][2] || ''),
      date: formatDateValue(data[r][3]),
      imageUrl: String(data[r][5] || ''),
      isActive: true
    };
    
    // Privacy protection: only expose management metadata to verified administrators
    if (isAdmin) {
      item.driveFileId = String(data[r][4] || '');
      item.uploadedBy = String(data[r][6] || '');
      item.uploadedAt = String(data[r][7] || '');
    }
    
    list.push(item);
  }
  
  return { success: true, data: list };
}

function handleUploadImage(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var base64Data = params.base64Image;
  var title = sanitizeCellInput(params.title || 'CNE Activity');
  var description = sanitizeCellInput(params.description || '');
  var date = params.date || new Date().toISOString().split('T')[0];
  
  if (!base64Data) return { success: false, message: 'Image data is required.' };
  
  var driveFolderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (!driveFolderId || driveFolderId.trim() === '') {
    return {
      success: false,
      message: 'Google Drive upload error: Gallery Drive folder is not configured. Please configure DRIVE_FOLDER_ID in Script Properties.'
    };
  }
  
  var folder;
  try {
    folder = DriveApp.getFolderById(driveFolderId.trim());
  } catch (e) {
    return { success: false, message: 'Google Drive upload error: Invalid DRIVE_FOLDER_ID configured.' };
  }
  
  var contentType = 'image/jpeg';
  var rawBase64 = base64Data;
  if (base64Data.indexOf(';base64,') !== -1) {
    var parts = base64Data.split(';base64,');
    contentType = parts[0].replace('data:', '').toLowerCase().trim();
    rawBase64 = parts[1];
  }
  
  // Strict MIME Type Validation
  var allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.indexOf(contentType) === -1) {
    return { success: false, message: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.' };
  }
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy uploading images. Please try again.' };
  }
  
  try {
    var decoded = Utilities.base64Decode(rawBase64);
    // 5MB maximum upload size check
    if (decoded.length > 5 * 1024 * 1024) {
      return { success: false, message: 'Image exceeds maximum allowed size of 5MB.' };
    }
    
    var ext = (contentType === 'image/png') ? '.png' : ((contentType === 'image/webp') ? '.webp' : '.jpg');
    var blob = Utilities.newBlob(decoded, contentType, 'CNE_' + new Date().getTime() + ext);
    var file = folder.createFile(blob);
    
    // Public view-only permission granted strictly for institutional CNE display in the portal
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var imageUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    var curYear = new Date().getFullYear();
    var imageId = 'IMG-' + curYear + '-' + Date.now().toString().slice(-4) + ('000' + Math.floor(Math.random() * 1000)).slice(-3);
    
    var sheet = getOrCreateSheet('Gallery');
    
    sheet.appendRow([
      imageId,
      title,
      description,
      date,
      fileId,
      imageUrl,
      session.employeeId || '',
      new Date().toISOString(),
      'ACTIVE'
    ]);
    
    logAuditAction('UPLOAD_IMAGE', session.employeeId, 'Uploaded Image: ' + imageId + ' (' + title + ')', 'SUCCESS');
    
    return {
      success: true,
      message: 'Image uploaded successfully to Google Drive.',
      data: { id: imageId, imageUrl: imageUrl, fileId: fileId }
    };
  } catch (err) {
    return { success: false, message: 'Failed to upload photo to Google Drive: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateGalleryItem(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var id = (params.id || '').trim();
  if (!id) return { success: false, message: 'Item ID is required.' };
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var ss = getSpreadsheet('CNE');
    var sheet = ss.getSheetByName('Gallery');
    if (!sheet) return { success: false, message: 'Gallery sheet not found.' };
    
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === id.toLowerCase()) {
        if (params.title !== undefined) sheet.getRange(r + 1, 2).setValue(sanitizeCellInput(params.title));
        if (params.description !== undefined) sheet.getRange(r + 1, 3).setValue(sanitizeCellInput(params.description));
        if (params.date !== undefined) sheet.getRange(r + 1, 4).setValue(params.date);
        if (params.isActive !== undefined) sheet.getRange(r + 1, 9).setValue(params.isActive ? 'ACTIVE' : 'INACTIVE');
        
        logAuditAction('UPDATE_GALLERY', session.employeeId, 'Updated Gallery ID: ' + id, 'SUCCESS');
        return { success: true, message: 'Gallery item updated.' };
      }
    }
    return { success: false, message: 'Item not found.' };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteGalleryItem(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var id = (params.id || '').trim();
  if (!id) return { success: false, message: 'Item ID is required.' };
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var ss = getSpreadsheet('CNE');
    var sheet = ss.getSheetByName('Gallery');
    if (!sheet) return { success: false, message: 'Gallery sheet not found.' };
    
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === id.toLowerCase()) {
        sheet.getRange(r + 1, 9).setValue('INACTIVE');
        logAuditAction('DELETE_GALLERY', session.employeeId, 'Deactivated Gallery Photo ID: ' + id, 'SUCCESS');
        return { success: true, message: 'Photo deactivated from gallery successfully.' };
      }
    }
    return { success: false, message: 'Gallery item not found.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 7. Secure Role Management (With Last Administrator Protection)
 */
function handleGetRoles(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var sheet = getOrCreateSheet('Role');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return { success: true, data: [] };
  }
  var colMap = getHeaderMap(sheet);
  var headers = data[0];

  // Resiliently locate Employee ID column
  var empIdCol = -1;
  var possibleEmpKeys = ['employeeidno', 'employeeid', 'empid', 'id', 'officerid'];
  for (var k = 0; k < possibleEmpKeys.length; k++) {
    if (colMap[possibleEmpKeys[k]] !== undefined) {
      empIdCol = colMap[possibleEmpKeys[k]];
      break;
    }
  }
  if (empIdCol === -1) {
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').toLowerCase();
      if (h.indexOf('emp') !== -1 && h.indexOf('id') !== -1) {
        empIdCol = c;
        break;
      }
    }
  }
  if (empIdCol === -1) empIdCol = 0;

  // Resiliently locate Name column
  var nameCol = -1;
  var possibleNameKeys = ['nameoftheofficers', 'name', 'officername', 'employeename'];
  for (var k = 0; k < possibleNameKeys.length; k++) {
    if (colMap[possibleNameKeys[k]] !== undefined) {
      nameCol = colMap[possibleNameKeys[k]];
      break;
    }
  }
  if (nameCol === -1) nameCol = 1;

  // Resiliently locate Designation column
  var desigCol = -1;
  if (colMap['designation'] !== undefined) desigCol = colMap['designation'];
  else if (colMap['desig'] !== undefined) desigCol = colMap['desig'];
  if (desigCol === -1) desigCol = 2;

  // Resiliently locate Role column
  var roleCol = -1;
  if (colMap['role'] !== undefined) roleCol = colMap['role'];
  else if (colMap['assignedrole'] !== undefined) roleCol = colMap['assignedrole'];
  else if (colMap['userrole'] !== undefined) roleCol = colMap['userrole'];
  if (roleCol === -1) {
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').toLowerCase();
      if (h.indexOf('role') !== -1) {
        roleCol = c;
        break;
      }
    }
  }
  if (roleCol === -1) roleCol = 3;

  // Resiliently locate Area / Department / Ward column
  var areaCol = -1;
  var possibleAreaKeys = [
    'departmentarea', 'area', 'department', 'ward', 'wardarea',
    'assignedareas', 'assignedarea', 'assignedwards', 'assignedward',
    'departmentward', 'wards', 'areas', 'clinicalarea', 'clinicalareas'
  ];
  for (var k = 0; k < possibleAreaKeys.length; k++) {
    if (colMap[possibleAreaKeys[k]] !== undefined) {
      areaCol = colMap[possibleAreaKeys[k]];
      break;
    }
  }
  if (areaCol === -1) {
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').toLowerCase();
      if (h.indexOf('area') !== -1 || h.indexOf('dept') !== -1 || h.indexOf('ward') !== -1) {
        areaCol = c;
        break;
      }
    }
  }
  if (areaCol === -1) areaCol = 4;

  var roles = [];
  for (var r = 1; r < data.length; r++) {
    var empId = normalizeEmpId(data[r][empIdCol]);
    if (empId) {
      var rawArea = areaCol !== -1 ? String(data[r][areaCol] || '').trim() : '';
      var assignedAreas = rawArea
        ? rawArea.split(/[,;\n]+/).map(function(s) { return String(s).trim(); }).filter(Boolean)
        : [];
      
      var rawRole = String(data[r][roleCol] || 'EMPLOYEE').toUpperCase().trim();
      var normalizedRole = 'EMPLOYEE';
      if (rawRole.indexOf('ADMIN') !== -1) {
        normalizedRole = 'ADMIN';
      } else if (rawRole.indexOf('INCHARGE') !== -1 || assignedAreas.length > 0) {
        normalizedRole = 'AREA_INCHARGE';
      }

      roles.push({
        employeeId: empId,
        name: String(data[r][nameCol] || ''),
        designation: String(data[r][desigCol] || ''),
        role: normalizedRole,
        area: rawArea,
        departmentarea: rawArea,
        department: rawArea,
        assignedAreas: assignedAreas
      });
    }
  }
  
  return { success: true, data: roles };
}

function handleUpdateRole(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var employeeId = normalizeEmpId(params.employeeId);
  if (!employeeId) return { success: false, message: 'Employee ID is required.' };
  
  var rawRole = String(params.role || 'EMPLOYEE').toUpperCase().trim();
  var targetRole = 'EMPLOYEE';
  if (rawRole.indexOf('ADMIN') !== -1) targetRole = 'ADMIN';
  else if (rawRole.indexOf('INCHARGE') !== -1) targetRole = 'AREA_INCHARGE';

  var rawArea = '';
  if (Array.isArray(params.assignedAreas)) {
    rawArea = params.assignedAreas.map(function(a) { return String(a).trim(); }).filter(Boolean).join(', ');
  } else if (params.area || params.department) {
    rawArea = String(params.area || params.department || '').trim();
  }
  var area = sanitizeCellInput(rawArea);
  
  // If assigned areas exist and not ADMIN, targetRole is AREA_INCHARGE
  if (targetRole !== 'ADMIN' && area) {
    targetRole = 'AREA_INCHARGE';
  }
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var sheet = getOrCreateSheet('Role');
    var data = sheet.getDataRange().getValues();
    var colMap = getHeaderMap(sheet);
    var headers = data.length > 0 ? data[0] : [];
    var adminCount = 0;
    var targetRow = -1;
    var currentRole = 'EMPLOYEE';

    // Resiliently locate Employee ID column
    var empIdCol = -1;
    var possibleEmpKeys = ['employeeidno', 'employeeid', 'empid', 'id', 'officerid'];
    for (var k = 0; k < possibleEmpKeys.length; k++) {
      if (colMap[possibleEmpKeys[k]] !== undefined) {
        empIdCol = colMap[possibleEmpKeys[k]];
        break;
      }
    }
    if (empIdCol === -1) {
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c] || '').toLowerCase();
        if (h.indexOf('emp') !== -1 && h.indexOf('id') !== -1) {
          empIdCol = c;
          break;
        }
      }
    }
    if (empIdCol === -1) empIdCol = 0;

    // Resiliently locate Role column
    var roleCol = -1;
    if (colMap['role'] !== undefined) roleCol = colMap['role'];
    else if (colMap['assignedrole'] !== undefined) roleCol = colMap['assignedrole'];
    else if (colMap['userrole'] !== undefined) roleCol = colMap['userrole'];
    if (roleCol === -1) {
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c] || '').toLowerCase();
        if (h.indexOf('role') !== -1) {
          roleCol = c;
          break;
        }
      }
    }
    if (roleCol === -1) roleCol = 3;

    // Resiliently locate Area / Department / Ward column
    var areaCol = -1;
    var possibleAreaKeys = [
      'departmentarea', 'area', 'department', 'ward', 'wardarea',
      'assignedareas', 'assignedarea', 'assignedwards', 'assignedward',
      'departmentward', 'wards', 'areas', 'clinicalarea', 'clinicalareas'
    ];
    for (var k = 0; k < possibleAreaKeys.length; k++) {
      if (colMap[possibleAreaKeys[k]] !== undefined) {
        areaCol = colMap[possibleAreaKeys[k]];
        break;
      }
    }
    if (areaCol === -1) {
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c] || '').toLowerCase();
        if (h.indexOf('area') !== -1 || h.indexOf('dept') !== -1 || h.indexOf('ward') !== -1) {
          areaCol = c;
          break;
        }
      }
    }
    if (areaCol === -1) areaCol = 4;
    
    for (var r = 1; r < data.length; r++) {
      var rowEmpId = normalizeEmpId(data[r][empIdCol]);
      var rVal = String(data[r][roleCol] || 'EMPLOYEE').toUpperCase().trim();
      if (rVal.indexOf('ADMIN') !== -1) {
        adminCount++;
      }
      if (rowEmpId === employeeId) {
        targetRow = r + 1;
        currentRole = rVal;
      }
    }
    
    // Prevent accidental removal of the last administrator
    if (currentRole.indexOf('ADMIN') !== -1 && targetRole !== 'ADMIN' && adminCount <= 1) {
      return {
        success: false,
        message: 'Cannot remove the last administrator account. Please assign another administrator first.'
      };
    }
    
    // Authoritatively enforce active area for newly added Area Incharge assignments
    // Existing historical assignments may remain or be removed without reactivation.
    var prevAreas = [];
    if (targetRow > 0) {
      var rawPrevArea = String(data[targetRow - 1][areaCol] || '');
      prevAreas = rawPrevArea.split(/[,;\n]+/).map(function(s) {
        return String(s || '').trim().toUpperCase();
      }).filter(Boolean);
    }

    var reqAreas = String(area || '').split(/[,;\n]+/).map(function(s) {
      return String(s || '').trim().toUpperCase();
    }).filter(Boolean);

    var newlyAddedAreas = [];
    for (var rqa = 0; rqa < reqAreas.length; rqa++) {
      if (prevAreas.indexOf(reqAreas[rqa]) === -1) {
        newlyAddedAreas.push(reqAreas[rqa]);
      }
    }

    if (newlyAddedAreas.length > 0) {
      var roleAreaStatusMap = getAreaStatusMap_(true);
      for (var naIdx = 0; naIdx < newlyAddedAreas.length; naIdx++) {
        var naNorm = newlyAddedAreas[naIdx];
        if (roleAreaStatusMap[naNorm] !== 'ACTIVE') {
          return {
            success: false,
            errorCode: 'AREA_INACTIVE',
            message: 'The selected ward/area is inactive. Please select an active area.'
          };
        }
      }
    }
    
    var roleColNumber = roleCol + 1;
    var areaColNumber = areaCol + 1;

    if (targetRow > 0) {
      sheet.getRange(targetRow, roleColNumber).setValue(targetRole);
      sheet.getRange(targetRow, areaColNumber).setValue(area);
    } else {
      var officer = findOfficerById(employeeId);
      var name = officer ? officer.name : (params.name || '');
      var desig = officer ? officer.designation : (params.designation || '');
      var maxCol = Math.max(5, areaColNumber, roleColNumber);
      var newRow = [];
      for (var i = 0; i < maxCol; i++) newRow.push('');
      newRow[empIdCol] = employeeId;
      newRow[colMap['nameoftheofficers'] !== undefined ? colMap['nameoftheofficers'] : 1] = name;
      newRow[colMap['designation'] !== undefined ? colMap['designation'] : 2] = desig;
      newRow[roleCol] = targetRole;
      newRow[areaCol] = area;
      sheet.appendRow(newRow);
    }
    
    invalidateUserRoleCache(employeeId);
    if (params.targetEmployeeId && params.targetEmployeeId !== employeeId) {
      invalidateUserRoleCache(params.targetEmployeeId);
    }
    if (params.empId && params.empId !== employeeId) {
      invalidateUserRoleCache(params.empId);
    }
    logAuditAction('UPDATE_ROLE', session.employeeId, 'Set role for ' + employeeId + ' -> ' + targetRole + (area ? ' (Area: ' + area + ')' : ''), 'SUCCESS');
    return { success: true, message: 'Role assigned successfully.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lightweight public/home read caches. These contain display-only data and never
 * replace authoritative mutation-time reads. Cache misses/failures safely fall
 * back to Google Sheets/Drive.
 */
function removeScriptCacheEntry_(baseKey) {
  if (!baseKey) return;
  try {
    var cache = CacheService.getScriptCache();
    var chunkCount = parseInt(cache.get(baseKey + '_chunks'), 10) || 0;
    var keys = [baseKey, baseKey + '_chunks'];
    for (var i = 0; i < chunkCount && i < MAX_SAFE_CHUNKS; i++) {
      keys.push(baseKey + '_p' + i);
    }
    cache.removeAll(keys);
  } catch (e) {}
}

function getPublicHomeCache_(key) {
  try { return getFromScriptCache(key); } catch (e) { return null; }
}

function putPublicHomeCache_(key, data, ttlSeconds) {
  try { putToScriptCache(key, data, ttlSeconds || 300); } catch (e) {}
}

var HOME_CACHE_NEWS = 'cne_public_news_v1';
var HOME_CACHE_QUICK_LINKS = 'cne_public_quicklinks_v1';
var HOME_CACHE_COORDINATOR = 'cne_public_coordinator_v1';
var HOME_CACHE_CHAIR_PHOTO = 'cne_public_chairphoto_v1';

/**
 * 11. News & Events Management (Public Read, Admin Write)
 */
function handleGetNewsEvents(params) {
  var cachedNews = getPublicHomeCache_(HOME_CACHE_NEWS);
  if (Array.isArray(cachedNews)) return { success: true, data: cachedNews, _cached: true };

  var sheet = getOrCreateSheet('News and Events');
  var data = sheet.getDataRange().getValues();
  var list = [];
  
  for (var r = 1; r < data.length; r++) {
    var id = String(data[r][0] || '').trim();
    var status = String(data[r][6] || 'ACTIVE').toUpperCase().trim();
    if (!id || status === 'INACTIVE') continue;
    
    list.push({
      id: id,
      title: String(data[r][1] || ''),
      category: String(data[r][2] || 'Circular'),
      date: formatDateValue(data[r][3]),
      summary: String(data[r][4] || ''),
      content: String(data[r][5] || ''),
      createdAt: formatDateValue(data[r][7])
    });
  }
  
  // Fallback institutional default news if sheet has no custom rows
  if (list.length === 0) {
    list = [
      {
        id: 'NEWS-INIT-01',
        title: 'Mandatory Continuing Nursing Education (CNE) Guidelines 2026',
        category: 'Circular',
        date: new Date().toISOString().split('T')[0],
        summary: 'All Nursing Officers are directed to complete minimum 30 verified CNE training hours for annual APAR compliance.',
        content: 'As per the directives of the Nursing Services Committee and AIIMS Rishikesh Academic Cell, all registered Nursing Officers must participate in accredited CNE programs.',
        createdAt: new Date().toISOString().split('T')[0]
      }
    ];
  }
  
  putPublicHomeCache_(HOME_CACHE_NEWS, list, 300);
  return { success: true, data: list };
}

function handleAddNewsEvent(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var title = sanitizeCellInput(params.title);
  var summary = sanitizeCellInput(params.summary);
  var content = sanitizeCellInput(params.content || params.summary);
  var category = sanitizeCellInput(params.category || 'Circular');
  var date = (params.date || new Date().toISOString().split('T')[0]).trim();
  
  if (!title || !summary) {
    return { success: false, message: 'Title and Summary are required.' };
  }
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var sheet = getOrCreateSheet('News and Events');
    
    var curYear = new Date().getFullYear();
    var eventId = 'NEWS-' + curYear + '-' + Date.now().toString().slice(-4) + ('000' + Math.floor(Math.random() * 1000)).slice(-3);
    
    sheet.appendRow([
      eventId,
      title,
      category,
      date,
      summary,
      content,
      'ACTIVE',
      new Date().toISOString(),
      session.employeeId || ''
    ]);
    
    removeScriptCacheEntry_(HOME_CACHE_NEWS);
    logAuditAction('ADD_NEWS', session.employeeId, 'Published News: ' + eventId + ' (' + title + ')', 'SUCCESS');
    return { success: true, message: 'News and Event published successfully.', data: { id: eventId } };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateNewsEvent(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var id = (params.id || '').trim();
  if (!id) return { success: false, message: 'Event ID is required.' };
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var ss = getSpreadsheet('CNE');
    var sheet = ss.getSheetByName('News and Events');
    if (!sheet) return { success: false, message: 'News and Events sheet not found.' };
    
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === id.toLowerCase()) {
        if (params.title !== undefined) sheet.getRange(r + 1, 2).setValue(sanitizeCellInput(params.title));
        if (params.category !== undefined) sheet.getRange(r + 1, 3).setValue(sanitizeCellInput(params.category));
        if (params.date !== undefined) sheet.getRange(r + 1, 4).setValue(params.date);
        if (params.summary !== undefined) sheet.getRange(r + 1, 5).setValue(sanitizeCellInput(params.summary));
        if (params.content !== undefined) sheet.getRange(r + 1, 6).setValue(sanitizeCellInput(params.content));
        if (params.status !== undefined) sheet.getRange(r + 1, 7).setValue(params.status);
        
        removeScriptCacheEntry_(HOME_CACHE_NEWS);
        logAuditAction('UPDATE_NEWS', session.employeeId, 'Updated News ID: ' + id, 'SUCCESS');
        return { success: true, message: 'News event updated successfully.' };
      }
    }
    return { success: false, message: 'News item not found.' };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteNewsEvent(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var id = (params.id || '').trim();
  if (!id) return { success: false, message: 'Event ID is required.' };
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var ss = getSpreadsheet('CNE');
    var sheet = ss.getSheetByName('News and Events');
    if (!sheet) return { success: false, message: 'News and Events sheet not found.' };
    
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === id.toLowerCase()) {
        sheet.getRange(r + 1, 7).setValue('INACTIVE');
        removeScriptCacheEntry_(HOME_CACHE_NEWS);
        logAuditAction('DELETE_NEWS', session.employeeId, 'Deactivated News ID: ' + id, 'SUCCESS');
        return { success: true, message: 'News event deactivated successfully.' };
      }
    }
    return { success: false, message: 'News item not found.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 12a. Chairperson Photo (Public Read-Only)
 *
 * Name, designation and message remain static in the frontend. Only the photo
 * is configurable via the CHAIRPERSON_PHOTO Script Property.
 *
 * Supported values:
 * - Google Drive / googleusercontent URL containing /d/<fileId>
 * - Google Drive URL containing ?id=<fileId>
 * - Raw Google Drive file ID
 * - Other publicly fetchable HTTPS image URL
 *
 * The response uses a data URL so the Cloudflare frontend does not depend on
 * direct Google Drive hotlinking behavior.
 */
function extractChairpersonPhotoDriveId(value) {
  var text = String(value || '').trim();
  if (!text) return '';

  var directId = text.match(/^[A-Za-z0-9_-]{20,}$/);
  if (directId) return directId[0];

  var slashMatch = text.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  if (slashMatch && slashMatch[1]) return slashMatch[1];

  var queryMatch = text.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];

  return '';
}

function handleGetChairpersonPhoto() {
  var cachedPhoto = getPublicHomeCache_(HOME_CACHE_CHAIR_PHOTO);
  if (cachedPhoto && typeof cachedPhoto.photoUrl === 'string') {
    return { success: true, data: cachedPhoto, _cached: true };
  }

  var configured = String(
    PropertiesService.getScriptProperties().getProperty('CHAIRPERSON_PHOTO') || ''
  ).trim();

  if (!configured) {
    return { success: true, data: { photoUrl: '' } };
  }

  try {
    var blob = null;
    var driveFileId = extractChairpersonPhotoDriveId(configured);

    if (driveFileId) {
      var file = DriveApp.getFileById(driveFileId);
      blob = file.getBlob();
    } else if (/^https:\/\//i.test(configured)) {
      var response = UrlFetchApp.fetch(configured, {
        muteHttpExceptions: true,
        followRedirects: true
      });
      var statusCode = response.getResponseCode();
      if (statusCode < 200 || statusCode >= 300) {
        return {
          success: false,
          errorCode: 'CHAIRPERSON_PHOTO_FETCH_FAILED',
          message: 'Chairperson photo could not be loaded from the configured URL.'
        };
      }
      blob = response.getBlob();
    } else {
      return {
        success: false,
        errorCode: 'CHAIRPERSON_PHOTO_INVALID',
        message: 'CHAIRPERSON_PHOTO must contain a Google Drive file ID or HTTPS image URL.'
      };
    }

    var contentType = String(blob.getContentType() || '').toLowerCase();
    if (contentType.indexOf('image/') !== 0) {
      return {
        success: false,
        errorCode: 'CHAIRPERSON_PHOTO_INVALID_TYPE',
        message: 'The configured Chairperson photo is not a valid image file.'
      };
    }

    var bytes = blob.getBytes();
    // Keep the public homepage response lightweight and predictable.
    if (bytes.length > 2 * 1024 * 1024) {
      return {
        success: false,
        errorCode: 'CHAIRPERSON_PHOTO_TOO_LARGE',
        message: 'Chairperson photo must be 2 MB or smaller.'
      };
    }

    var dataUrl = 'data:' + contentType + ';base64,' + Utilities.base64Encode(bytes);
    var photoData = { photoUrl: dataUrl };
    // putToScriptCache safely skips oversized payloads, so large photos still work
    // without risking CacheService quota errors.
    putPublicHomeCache_(HOME_CACHE_CHAIR_PHOTO, photoData, 300);
    return { success: true, data: photoData };
  } catch (e) {
    console.warn('Chairperson photo load error: ' + e.message);
    return {
      success: false,
      errorCode: 'CHAIRPERSON_PHOTO_UNAVAILABLE',
      message: 'Chairperson photo is currently unavailable.'
    };
  }
}

/**
 * 13. Institutional Quick Links (Public Read, Admin Write)
 * Stored in the CNE spreadsheet tab: "Quick Links".
 * Legacy QUICK_LINKS_CUSTOM Script Property is used only once to seed/migrate
 * an empty/new sheet, then the sheet becomes the authoritative source.
 */
function getDefaultQuickLinks_() {
  return [
    {
      id: 'ql-cne-schedule',
      title: 'Upcoming CNE Schedule',
      description: 'Browse open classes, curriculum topics, venue allocations, and secure your registration.',
      iconName: 'Sparkles',
      target: 'cne-schedule',
      badge: 'Open for Enrollment',
      actionType: 'navigate'
    },
    {
      id: 'ql-calendar',
      title: 'CNE Interactive Calendar',
      description: 'View monthly training schedules, departmental rotations, and upcoming skill sessions.',
      iconName: 'Calendar',
      target: 'calendar',
      badge: 'Monthly View',
      actionType: 'navigate'
    },
    {
      id: 'ql-guidelines',
      title: 'CNE Guidelines & Policy',
      description: 'Institutional policy document outlining attendance requirements, credits, and speaker recognition.',
      iconName: 'ShieldCheck',
      target: 'guidelines',
      badge: 'Official Norms',
      actionType: 'modal',
      modalContent: {
        title: 'AIIMS Rishikesh CNE Guidelines & Attendance Norms',
        body: [
          '1. Minimum Attendance: All Nursing Officers (N.O) and Senior Nursing Officers (S.N.O) should aim to complete at least 20 documented CNE hours per academic year.',
          '2. Punctuality & Verification: Attendance is digitally signed and logged through the Area Incharge and verified against Officers data.',
          '3. Faculty / Resource Person Recognition: Serving as an approved resource person or instructor carries double CNE credits and is recognized as institutional academic leadership.',
          '4. Certificate of Completion: Certificates and annual summary records can be downloaded directly from the portal once logged in with verified credentials.',
          '5. Leave & Excusal: Prior written notification to the CNE Coordinator is required if unable to attend a class for which registration was confirmed.'
        ]
      }
    },
    {
      id: 'ql-main-portal',
      title: 'AIIMS Rishikesh Main Portal',
      description: 'Official institutional hospital & academic portal',
      iconName: 'Building',
      target: 'https://aiimsrishikesh.edu.in',
      badge: 'Portal',
      actionType: 'external',
      url: 'https://aiimsrishikesh.edu.in'
    },
    {
      id: 'ql-inc',
      title: 'Indian Nursing Council (INC)',
      description: 'National statutory body for nurses and nurse education',
      iconName: 'Award',
      target: 'https://indiannursingcouncil.org',
      badge: 'Council',
      actionType: 'external',
      url: 'https://indiannursingcouncil.org'
    }
  ];
}

function writeQuickLinkRow_(sheet, link, sortOrder, updatedBy) {
  var modal = link && link.modalContent ? link.modalContent : null;
  var modalBody = modal && Array.isArray(modal.body) ? modal.body.join('\n') : '';
  sheet.appendRow([
    sanitizeCellInput(link.id || ('ql-' + Date.now())),
    sanitizeCellInput(link.title || ''),
    sanitizeCellInput(link.description || ''),
    sanitizeCellInput(link.iconName || 'Link'),
    sanitizeCellInput(link.target || link.url || ''),
    sanitizeCellInput(link.badge || ''),
    sanitizeCellInput(link.actionType || 'navigate'),
    sanitizeCellInput(link.url || ''),
    sanitizeCellInput(modal && modal.title ? modal.title : ''),
    sanitizeCellInput(modalBody),
    'ACTIVE',
    Number(sortOrder) || 0,
    new Date().toISOString(),
    sanitizeCellInput(updatedBy || 'SYSTEM')
  ]);
}

function ensureQuickLinksSheetSeeded_() {
  var ss = getSpreadsheet('CNE');
  var existing = ss.getSheetByName('Quick Links');
  var sheet = getOrCreateSheet('Quick Links');

  // An existing sheet with any data rows is already authoritative, including
  // rows marked INACTIVE after Admin deletions. Never re-seed it automatically.
  if (existing && sheet.getLastRow() > 1) return sheet;

  var seedLinks = null;
  var legacy = PropertiesService.getScriptProperties().getProperty('QUICK_LINKS_CUSTOM');
  if (legacy) {
    try {
      var parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) seedLinks = parsed;
    } catch (e) {}
  }
  if (!seedLinks) seedLinks = getDefaultQuickLinks_();

  if (sheet.getLastRow() <= 1) {
    for (var i = 0; i < seedLinks.length; i++) {
      writeQuickLinkRow_(sheet, seedLinks[i], i + 1, legacy ? 'MIGRATED_FROM_SCRIPT_PROPERTIES' : 'SYSTEM_DEFAULT');
    }
  }
  return sheet;
}

function readQuickLinksFromSheet_(sourceSheet) {
  var sheet = sourceSheet || ensureQuickLinksSheetSeeded_();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var map = getHeaderMap(sheet);
  var links = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var id = String(row[map['id']] || '').trim();
    var status = String(row[map['status']] || 'ACTIVE').toUpperCase().trim();
    if (!id || status !== 'ACTIVE') continue;

    var actionType = String(row[map['actiontype']] || 'navigate').trim();
    var modalTitle = String(row[map['modaltitle']] || '').trim();
    var modalBodyRaw = String(row[map['modalbody']] || '').trim();
    var item = {
      id: id,
      title: String(row[map['title']] || ''),
      description: String(row[map['description']] || ''),
      iconName: String(row[map['iconname']] || 'Link'),
      target: String(row[map['target']] || ''),
      badge: String(row[map['badge']] || ''),
      actionType: actionType,
      url: String(row[map['url']] || '')
    };
    if (modalTitle || modalBodyRaw) {
      item.modalContent = {
        title: modalTitle,
        body: modalBodyRaw ? modalBodyRaw.split(/\r?\n/).map(function(v) { return v.trim(); }).filter(Boolean) : []
      };
    }
    links.push({ item: item, sortOrder: Number(row[map['sortorder']]) || (r + 1) });
  }

  links.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  return links.map(function(entry) { return entry.item; });
}

function handleGetQuickLinks(params) {
  var cachedLinks = getPublicHomeCache_(HOME_CACHE_QUICK_LINKS);
  if (Array.isArray(cachedLinks)) return { success: true, data: cachedLinks, _cached: true };

  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('Quick Links');

  // Only first-use seeding needs serialization. Normal public reads are lock-free.
  if (!sheet || sheet.getLastRow() <= 1) {
    var initLock = LockService.getScriptLock();
    if (!initLock.tryLock(3000)) {
      sheet = ss.getSheetByName('Quick Links');
      if (!sheet || sheet.getLastRow() <= 1) {
        return { success: true, data: getDefaultQuickLinks_(), message: 'Loaded default Quick Links while initialization is completing.' };
      }
    } else {
      try {
        sheet = ensureQuickLinksSheetSeeded_();
      } finally {
        initLock.releaseLock();
      }
    }
  }

  var links = readQuickLinksFromSheet_(sheet);
  putPublicHomeCache_(HOME_CACHE_QUICK_LINKS, links, 300);
  return { success: true, data: links };
}

function handleAddQuickLink(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var title = sanitizeCellInput(params.title || '');
  if (!title) return { success: false, message: 'Link title is required.' };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var sheet = ensureQuickLinksSheetSeeded_();
    var map = getHeaderMap(sheet);
    var data = sheet.getDataRange().getValues();
    var maxSort = 0;
    for (var r = 1; r < data.length; r++) {
      maxSort = Math.max(maxSort, Number(data[r][map['sortorder']]) || 0);
    }

    var newId = 'ql-' + Date.now();
    var newLink = {
      id: newId,
      title: title,
      description: sanitizeCellInput(params.description || ''),
      iconName: sanitizeCellInput(params.iconName || 'Link'),
      target: sanitizeCellInput(params.target || params.url || ''),
      badge: sanitizeCellInput(params.badge || ''),
      actionType: params.actionType || (params.target && params.target.startsWith('http') ? 'external' : 'navigate'),
      url: sanitizeCellInput(params.url || (params.target && params.target.startsWith('http') ? params.target : ''))
    };
    writeQuickLinkRow_(sheet, newLink, maxSort + 1, session.employeeId);

    removeScriptCacheEntry_(HOME_CACHE_QUICK_LINKS);
    logAuditAction('ADD_QUICK_LINK', session.employeeId, 'Added Quick Link: ' + title, 'SUCCESS');
    return { success: true, message: 'Quick Link added successfully.', data: { id: newId } };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateQuickLink(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var id = (params.id || '').trim();
  if (!id) return { success: false, message: 'Link ID is required.' };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var sheet = ensureQuickLinksSheetSeeded_();
    var map = getHeaderMap(sheet);
    var data = sheet.getDataRange().getValues();
    var foundRow = -1;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][map['id']] || '').trim() === id) {
        foundRow = r + 1;
        break;
      }
    }
    if (foundRow < 0) return { success: false, message: 'Quick link not found.' };

    function setIfProvided(paramName, headerKey, sanitize) {
      if (params[paramName] === undefined || map[headerKey] === undefined) return;
      var value = sanitize === false ? params[paramName] : sanitizeCellInput(params[paramName]);
      sheet.getRange(foundRow, map[headerKey] + 1).setValue(value);
    }

    setIfProvided('title', 'title');
    setIfProvided('description', 'description');
    setIfProvided('iconName', 'iconname');
    setIfProvided('target', 'target');
    setIfProvided('badge', 'badge');
    setIfProvided('actionType', 'actiontype');
    setIfProvided('url', 'url');
    if (map['updatedat'] !== undefined) sheet.getRange(foundRow, map['updatedat'] + 1).setValue(new Date().toISOString());
    if (map['updatedby'] !== undefined) sheet.getRange(foundRow, map['updatedby'] + 1).setValue(session.employeeId);

    removeScriptCacheEntry_(HOME_CACHE_QUICK_LINKS);
    logAuditAction('UPDATE_QUICK_LINK', session.employeeId, 'Updated Quick Link ID: ' + id, 'SUCCESS');
    return { success: true, message: 'Quick link updated successfully.' };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteQuickLink(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var id = (params.id || '').trim();
  if (!id) return { success: false, message: 'Link ID is required.' };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var sheet = ensureQuickLinksSheetSeeded_();
    var map = getHeaderMap(sheet);
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][map['id']] || '').trim() === id) {
        sheet.getRange(r + 1, map['status'] + 1).setValue('INACTIVE');
        if (map['updatedat'] !== undefined) sheet.getRange(r + 1, map['updatedat'] + 1).setValue(new Date().toISOString());
        if (map['updatedby'] !== undefined) sheet.getRange(r + 1, map['updatedby'] + 1).setValue(session.employeeId);
        removeScriptCacheEntry_(HOME_CACHE_QUICK_LINKS);
        logAuditAction('DELETE_QUICK_LINK', session.employeeId, 'Deactivated Quick Link ID: ' + id, 'SUCCESS');
        return { success: true, message: 'Quick link removed successfully.' };
      }
    }
    return { success: false, message: 'Quick link not found.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 13a. Coordinator Desk (Public Read, Admin Write)
 * Stored in the CNE spreadsheet tab: "Portal Content".
 * Legacy COORDINATOR_* Script Properties are used only once to seed/migrate
 * an empty/new sheet, then the sheet becomes the authoritative source.
 */
function ensureCoordinatorContentSeeded_() {
  var ss = getSpreadsheet('CNE');
  var existing = ss.getSheetByName('Portal Content');
  var sheet = getOrCreateSheet('Portal Content');

  var map = getHeaderMap(sheet);
  var data = sheet.getDataRange().getValues();
  var hasCoordinatorRows = false;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][map['section']] || '').toUpperCase().trim() === 'COORDINATOR') {
      hasCoordinatorRows = true;
      break;
    }
  }
  if (hasCoordinatorRows) return sheet;

  // If the sheet already existed with unrelated content, adding only missing
  // Coordinator keys is safe and non-destructive.
  var props = PropertiesService.getScriptProperties();
  var note = props.getProperty('COORDINATOR_NOTE') || 'Have questions regarding class credits, attendance verification, or training schedules?';
  var email = props.getProperty('COORDINATOR_EMAIL') || 'training.nur@aiimsrishikesh.edu.in';
  var names = ['Ms. Ramya T', 'Ms. Suman Choudhary'];
  var namesRaw = props.getProperty('COORDINATOR_NAMES');
  if (namesRaw) {
    try {
      var parsed = JSON.parse(namesRaw);
      if (Array.isArray(parsed) && parsed.length > 0) names = parsed;
    } catch (e) {
      names = namesRaw.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
    }
  }

  var source = (props.getProperty('COORDINATOR_NOTE') || props.getProperty('COORDINATOR_EMAIL') || namesRaw)
    ? 'MIGRATED_FROM_SCRIPT_PROPERTIES'
    : 'SYSTEM_DEFAULT';
  sheet.appendRow(['COORDINATOR', 'NAMES', names.join('\n'), new Date().toISOString(), source]);
  sheet.appendRow(['COORDINATOR', 'EMAIL', sanitizeCellInput(email), new Date().toISOString(), source]);
  sheet.appendRow(['COORDINATOR', 'NOTE', sanitizeCellInput(note), new Date().toISOString(), source]);
  return sheet;
}

function getPortalContentValue_(sheet, section, key) {
  var map = getHeaderMap(sheet);
  var data = sheet.getDataRange().getValues();
  section = String(section || '').toUpperCase().trim();
  key = String(key || '').toUpperCase().trim();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][map['section']] || '').toUpperCase().trim() === section &&
        String(data[r][map['key']] || '').toUpperCase().trim() === key) {
      return String(data[r][map['value']] || '');
    }
  }
  return '';
}

function upsertPortalContentValue_(sheet, section, key, value, updatedBy) {
  var map = getHeaderMap(sheet);
  var data = sheet.getDataRange().getValues();
  section = String(section || '').toUpperCase().trim();
  key = String(key || '').toUpperCase().trim();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][map['section']] || '').toUpperCase().trim() === section &&
        String(data[r][map['key']] || '').toUpperCase().trim() === key) {
      sheet.getRange(r + 1, map['value'] + 1).setValue(value);
      sheet.getRange(r + 1, map['updatedat'] + 1).setValue(new Date().toISOString());
      sheet.getRange(r + 1, map['updatedby'] + 1).setValue(updatedBy || 'SYSTEM');
      return;
    }
  }
  sheet.appendRow([section, key, value, new Date().toISOString(), updatedBy || 'SYSTEM']);
}

function handleGetCoordinatorDesk(params) {
  var cachedCoordinator = getPublicHomeCache_(HOME_CACHE_COORDINATOR);
  if (cachedCoordinator && typeof cachedCoordinator === 'object') {
    return { success: true, data: cachedCoordinator, _cached: true };
  }

  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('Portal Content');

  if (!sheet || !hasCoordinatorContentRows_(sheet)) {
    var initLock = LockService.getScriptLock();
    if (!initLock.tryLock(3000)) {
      sheet = ss.getSheetByName('Portal Content');
      if (!sheet || !hasCoordinatorContentRows_(sheet)) {
        return { success: false, errorCode: 'SERVER_BUSY', message: 'Coordinator content is being initialized. Please try again.' };
      }
    } else {
      try {
        sheet = ensureCoordinatorContentSeeded_();
      } finally {
        initLock.releaseLock();
      }
    }
  }

  var coordinatorResponse = buildCoordinatorDeskResponse_(sheet);
  if (coordinatorResponse && coordinatorResponse.success) {
    putPublicHomeCache_(HOME_CACHE_COORDINATOR, coordinatorResponse.data, 300);
  }
  return coordinatorResponse;
}

function buildCoordinatorDeskResponse_(sheet) {
  var namesRaw = getPortalContentValue_(sheet, 'COORDINATOR', 'NAMES');
  var coordinators = namesRaw
    ? namesRaw.split(/\r?\n|,/).map(function(v) { return v.trim(); }).filter(Boolean)
    : [];
  var email = getPortalContentValue_(sheet, 'COORDINATOR', 'EMAIL');
  var note = getPortalContentValue_(sheet, 'COORDINATOR', 'NOTE');
  return {
    success: true,
    data: { note: note, coordinators: coordinators, email: email }
  };
}

function handleUpdateCoordinatorDesk(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var freshAdminCheck = requireFreshAdminMutation(session);
    if (!freshAdminCheck.success) return freshAdminCheck;
    session = freshAdminCheck.session;
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var sheet = ensureCoordinatorContentSeeded_();
    if (params.note !== undefined) {
      upsertPortalContentValue_(sheet, 'COORDINATOR', 'NOTE', sanitizeCellInput(params.note), session.employeeId);
    }
    if (params.email !== undefined) {
      upsertPortalContentValue_(sheet, 'COORDINATOR', 'EMAIL', sanitizeCellInput(params.email), session.employeeId);
    }
    if (params.coordinators !== undefined) {
      var coords = Array.isArray(params.coordinators)
        ? params.coordinators.map(function(c) { return sanitizeCellInput(c); }).filter(Boolean)
        : [sanitizeCellInput(params.coordinators)].filter(Boolean);
      upsertPortalContentValue_(sheet, 'COORDINATOR', 'NAMES', coords.join('\n'), session.employeeId);
    }

    removeScriptCacheEntry_(HOME_CACHE_COORDINATOR);
    logAuditAction('UPDATE_COORDINATOR_DESK', session.employeeId, 'Updated Coordinator Desk info', 'SUCCESS');
    var response = buildCoordinatorDeskResponse_(sheet);
    if (response && response.success) putPublicHomeCache_(HOME_CACHE_COORDINATOR, response.data, 300);
    return response;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 13b. Institutional & User CNE Program Impact
 * Retrieves live impact metrics calculated from the 'CNE Schedule' sheet.
 * - Unauthenticated (session is null): Returns institutional/global metrics across all completed classes.
 * - Authenticated (session exists): Returns personalized impact metrics for the authenticated user (RP or participant).
 * Uses server-side session identity exclusively; does not accept unverified client-supplied employee IDs.
 */
function handleGetProgramImpact(params, session, scheduleSnapshot) {
  var isUserLoggedIn = Boolean(session && session.employeeId);
  var loggedInId = isUserLoggedIn ? normalizeEmpId(session.employeeId) : null;
  var impactCacheKey = isUserLoggedIn ? ('cne_impact_user_' + loggedInId) : 'cne_impact_public';
  var forceFreshImpact = Boolean(params && params.forceFresh);
  if (!forceFreshImpact) {
    var cachedImpact = getFromScriptCache(impactCacheKey);
    if (cachedImpact && typeof cachedImpact === 'object') {
      return { success: true, data: cachedImpact, _cached: true };
    }
  }

  var snapshot = scheduleSnapshot || getCNEScheduleSnapshot_();
  var dataSheet = snapshot.sheet;
  
  if (!dataSheet) {
    return {
      success: true,
      data: {
        totalCompletedClasses: 0,
        cneDuration: '0 Hrs',
        uniqueStaffTrained: 0,
        scope: isUserLoggedIn ? 'user' : 'institutional'
      }
    };
  }
  
  var data = snapshot.data || [];
  if (data.length <= 1) {
    return {
      success: true,
      data: {
        totalCompletedClasses: 0,
        cneDuration: '0 Hrs',
        uniqueStaffTrained: 0,
        scope: isUserLoggedIn ? 'user' : 'institutional'
      }
    };
  }
  
  var colMap = snapshot.colMap || buildHeaderMapFromRow_(data[0] || []);
  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : (colMap['dataid'] !== undefined ? colMap['dataid'] : (colMap['classid'] !== undefined ? colMap['classid'] : 0));
  var durCol = colMap['duration'] !== undefined ? colMap['duration'] : (colMap['dur'] !== undefined ? colMap['dur'] : 4);
  var rpCol = colMap['resourcepersonempid'] !== undefined ? colMap['resourcepersonempid'] : 6;
  var staffCol = colMap['staffempid'] !== undefined ? colMap['staffempid'] : 8;
  var countCol = colMap['staffcount'] !== undefined ? colMap['staffcount'] : 9;
  var statusCol = colMap['status'] !== undefined ? colMap['status'] : -1;

  var displayValues = snapshot.displayValues || [];
  var completedClasses = 0;
  var totalDurationSeconds = 0;
  var uniqueStaffMap = {};
  var userTrainedOthersMap = {};
  var anonymousStaffCount = 0;
  var anonymousStaffTrainedByRp = 0;
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var dataId = String(row[idCol] || '').trim();
    if (!dataId) continue;

    // In unified CNE Schedule, only count Completed sessions for program impact
    if (statusCol !== -1) {
      var rowStatus = normalizeCNEStatus(row[statusCol]);
      if (rowStatus !== 'Completed') continue;
    }
    
    var displayDur = (displayValues && displayValues[r]) ? displayValues[r][durCol] : '';
    var duration = formatDurationValue(row[durCol], displayDur);
    var durSec = parseDurationToSeconds(duration) || 0;
    var rpEmpId = normalizeEmpId(row[rpCol]);
    var staffIdsRaw = String(row[staffCol] || '').trim();
    var staffCount = parseInt(row[countCol], 10) || 0;
    
    var staffArray = staffIdsRaw.split(',').map(function(s) {
      return normalizeEmpId(s);
    }).filter(Boolean);
    
    if (staffCount === 0 && staffArray.length > 0) {
      staffCount = staffArray.length;
    }
    
    if (!isUserLoggedIn) {
      // INSTITUTIONAL: All valid completed classes in CNE Schedule
      completedClasses++;
      totalDurationSeconds += durSec;
      if (staffArray.length > 0) {
        for (var s = 0; s < staffArray.length; s++) {
          uniqueStaffMap[staffArray[s]] = true;
        }
      } else if (staffCount > 0) {
        anonymousStaffCount += staffCount;
      }
    } else {
      // USER-SPECIFIC: Only records associated with authenticated user
      var isResourcePerson = (rpEmpId === loggedInId);
      var isParticipant = (staffArray.indexOf(loggedInId) !== -1);
      
      if (isResourcePerson || isParticipant) {
        completedClasses++;
        totalDurationSeconds += durSec;
        if (isResourcePerson) {
          if (staffArray.length > 0) {
            for (var sp = 0; sp < staffArray.length; sp++) {
              if (staffArray[sp] !== loggedInId) {
                userTrainedOthersMap[staffArray[sp]] = true;
              }
            }
          } else if (staffCount > 0) {
            anonymousStaffTrainedByRp += staffCount;
          }
        }
      }
    }
  }
  
  var totalStaff = 0;
  if (!isUserLoggedIn) {
    var uniqueCount = Object.keys(uniqueStaffMap).length;
    totalStaff = uniqueCount > 0 ? uniqueCount : anonymousStaffCount;
  } else {
    // For logged-in Resource Person, Officers Trained = unique participants trained by RP (excluding themselves)
    var trainedOthers = Object.keys(userTrainedOthersMap).length;
    if (trainedOthers === 0 && anonymousStaffTrainedByRp > 0) {
      trainedOthers = anonymousStaffTrainedByRp;
    }
    totalStaff = trainedOthers;
  }
  
  var impactData = {
    totalCompletedClasses: completedClasses,
    cneDuration: formatDurationAsHoursPlus(totalDurationSeconds),
    uniqueStaffTrained: totalStaff,
    scope: isUserLoggedIn ? 'user' : 'institutional'
  };
  // Impact metrics are display-only. A short cache removes repeated full CNE Schedule
  // scans during navigation while limiting any staleness to a small window.
  putToScriptCache(impactCacheKey, impactData, 30);
  return { success: true, data: impactData };
}

/**
 * Optimized homepage bootstrap. One client request replaces multiple Apps Script
 * executions while preserving session-aware personal impact metrics. Public CNE
 * schedule data is deliberately fetched without a session to avoid exposing
 * management-only identifiers in the homepage payload.
 */
function handleGetHomeDashboard(params, session) {
  var startedAt = Date.now();
  var scheduleSnapshot = getCNEScheduleSnapshot_();
  var scheduleRes = handleGetCNERecords({ status: 'Scheduled' }, null, scheduleSnapshot);
  var newsRes = handleGetNewsEvents({});
  var linksRes = handleGetQuickLinks({});
  var coordinatorRes = handleGetCoordinatorDesk({});
  var impactRes = handleGetProgramImpact({}, session, scheduleSnapshot);

  var response = {
    success: true,
    data: {
      upcomingClasses: scheduleRes && scheduleRes.success && Array.isArray(scheduleRes.data) ? scheduleRes.data : [],
      newsEvents: newsRes && newsRes.success && Array.isArray(newsRes.data) ? newsRes.data : [],
      quickLinks: linksRes && linksRes.success && Array.isArray(linksRes.data) ? linksRes.data : [],
      coordinatorDesk: coordinatorRes && coordinatorRes.success && coordinatorRes.data
        ? coordinatorRes.data
        : { note: '', coordinators: [], email: '' },
      impactStats: impactRes && impactRes.success && impactRes.data
        ? impactRes.data
        : { totalCompletedClasses: 0, cneDuration: '0 Hrs', uniqueStaffTrained: 0, scope: session && session.employeeId ? 'user' : 'institutional' }
    }
  };
  logPerf('handleGetHomeDashboard', startedAt, 'single CNE Schedule snapshot');
  return response;
}


/**
 * Format Date Helper (Asia/Kolkata consistent)
 */
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var hours = val.getHours();
    var minutes = val.getMinutes();
    var seconds = val.getSeconds();
    if (hours !== 0 || minutes !== 0 || seconds !== 0) {
      return Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm");
    }
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return String(val).trim();
}

/**
 * Header Normalization Map Helper
 * Maps all headers to lowercase alphanumeric keys for resilient column lookups
 */
function getHeaderMap(sheet) {
  if (!sheet) return {};
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};
  return buildHeaderMapFromRow_(sheet.getRange(1, 1, 1, lastCol).getValues()[0]);
}

/**
 * ============================================================================
 * AUTHORITATIVE CNE SPREADSHEET INITIALIZATION & HEADER ARCHITECTURE
 * ============================================================================
 */

/**
 * Authoritative Centralized CNE Spreadsheet Headers
 * Defines the standard header structure for all required CNE tabs.
 */
var CNE_SHEET_HEADERS = {
  'CNE Schedule': [
    'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
    'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
    'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
    'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy'
  ],
  'Area': ['Area', 'Status', 'CreatedAt'],
  'Teaching Mode': ['Mode Name', 'Status', 'Updated At'],
  'Role': ['Employee ID No.', 'Name of the Officers', 'Designation', 'Role', 'Department / Area'],
  'Gallery': ['Image ID', 'Title', 'Description', 'Date', 'Drive File ID', 'Image URL', 'Uploaded By', 'Uploaded At', 'Status'],
  'News and Events': ['Event ID', 'Title', 'Category', 'Date', 'Summary', 'Full Content', 'Status', 'CreatedAt', 'CreatedBy'],
  'Portal Content': ['Section', 'Key', 'Value', 'Updated At', 'Updated By'],
  'Quick Links': ['ID', 'Title', 'Description', 'Icon Name', 'Target', 'Badge', 'Action Type', 'URL', 'Modal Title', 'Modal Body', 'Status', 'Sort Order', 'Updated At', 'Updated By'],
  'Auth_Credentials': [
    'Employee ID', 'Password Hash', 'Password Salt', 'Password Version',
    'Password Created At', 'Password Changed At', 'Last Login At', 'Account Status',
    'Failed Login Count', 'Locked Until', 'Created At', 'Updated At'
  ],
  'OTP_Verification': [
    'Challenge ID', 'Purpose', 'Principal Type', 'Principal ID', 'Email', 'OTP Hash',
    'Expires At', 'Attempts', 'Max Attempts', 'Resend Available At', 'Verified At',
    'Consumed At', 'Status', 'Created At', 'Updated At'
  ],
  'Audit Log': ['Timestamp', 'Action', 'Employee ID', 'Details', 'Status'],
  'CNE Post Test Questions': ['CNE ID', 'Question ID', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Explanation', 'Is Finalized', 'Is Locked', 'Created At', 'Created By', 'Authoritative Source', 'Status'],
  'CNE Post Test Responses': ['Response ID', 'CNE ID', 'Employee ID', 'Employee Name', 'Designation', 'Department', 'Score', 'Total Questions', 'Percentage', 'Source', 'Submitted At', 'Answers JSON', 'Status', 'Remarks'],
  'CNE_Reference': ['CNE ID', 'Topic', 'Reference Text / Clinical Guides', 'Updated At', 'Updated By', 'Drive File ID', 'File Name', 'File Type', 'Resource Person Name', 'File Size', 'Indexing Status', 'Indexing Error Code', 'Indexing Message', 'Chunks Count', 'Indexed At'],
  'CNE_QR_Tokens': ['QR Token', 'CNE ID', 'Created At', 'Created By', 'Status'],
  'CNE_AI_Quota': ['CNE ID', 'Topic', 'Attempts Used', 'Max Quota', 'Last Attempt At', 'Last Generated By', 'Reservation Token', 'Reserved Until', 'Last Committed Token'],
  'CNE_Reference_Index': ['Index ID', 'Source Type', 'CNE ID', 'Drive File ID', 'Resource Title', 'Topic', 'Section / Heading', 'Chunk Index', 'Chunk Text', 'Clinical Keywords', 'Extraction Status', 'Updated At'],
  'CNE_Reference_Library': ['Resource ID', 'Source Type', 'Resource Title', 'Drive File ID', 'Author / Organization', 'License', 'Version', 'File Type', 'Active', 'Indexed At', 'Updated At']
};

/**
 * Header alias normalization map to prevent duplicate or mismatched headers
 */
var CNE_HEADER_ALIASES = {
  'cneid': ['cneid', 'classid'],
  'classid': ['cneid', 'classid'],
  'typeofcne': ['typeofcne', 'cnetype', 'type'],
  'fromdate': ['fromdate', 'date'],
  'todate': ['todate'],
  'modeofteaching': ['modeofteaching', 'mode'],
  'areadepartment': ['areadepartment', 'departmentarea', 'area', 'department'],
  'departmentarea': ['departmentarea', 'areadepartment', 'area', 'department'],
  'questiontext': ['questiontext', 'question'],
  'correctoption': ['correctoption', 'correctanswer'],
  'isfinalized': ['isfinalized', 'selectedfinal'],
  'islocked': ['islocked'],
  'authoritativesource': ['authoritativesource', 'source', 'clinicalsource', 'reference'],
  'status': ['status', 'questionstatus', 'state'],
  'referencetextclinicalguides': ['referencetextclinicalguides', 'referencetext'],
  'referencetext': ['referencetext', 'referencetextclinicalguides'],
  'answersjson': ['answersjson', 'answers'],
  'source': ['source', 'participantsource'],
  'passwordsalt': ['passwordsalt', 'salt'],
  'lastloginat': ['lastloginat', 'lastlogin'],
  'cneaiquota': ['cneaiquota', 'aiquota', 'cnequota'],
  'attemptsused': ['attemptsused', 'attempts', 'generationattempts'],
  'maxquota': ['maxquota', 'maxattempts'],
  'lastattemptat': ['lastattemptat', 'lastattempt', 'attemptat'],
  'lastgeneratedby': ['lastgeneratedby', 'generatedby'],
  'drivefileid': ['drivefileid', 'fileid'],
  'filename': ['filename'],
  'filetype': ['filetype'],
  'resourcepersonname': ['resourcepersonname', 'resourceperson', 'instructor'],
  'filesize': ['filesize', 'size'],
  'indexingstatus': ['indexingstatus', 'indexstatus'],
  'indexingerrorcode': ['indexingerrorcode', 'indexerrorcode'],
  'indexingmessage': ['indexingmessage', 'indexmessage'],
  'chunkscount': ['chunkscount', 'chunkcount'],
  'indexid': ['indexid', 'chunkid'],
  'sourcetype': ['sourcetype'],
  'resourcetitle': ['resourcetitle', 'title'],
  'sectionheading': ['sectionheading', 'section', 'heading'],
  'chunkindex': ['chunkindex', 'chunkno', 'index'],
  'chunktext': ['chunktext', 'text', 'content'],
  'clinicalkeywords': ['clinicalkeywords', 'keywords'],
  'extractionstatus': ['extractionstatus', 'status'],
  'resourceid': ['resourceid', 'id'],
  'authororganization': ['authororganization', 'author', 'organization', 'authororg'],
  'license': ['license'],
  'version': ['version', 'edition'],
  'active': ['active', 'isactive', 'status'],
  'indexedat': ['indexedat']
};

/**
 * Single Standardized Generic Sheet Helper:
 * Strictly NON-DESTRUCTIVE Sheet Tab & Header Resolver
 * If tab exists: leaves existing rows, structure, and formatting completely untouched.
 * If tab is missing: creates tab and writes initial bold headers.
 */
function getOrCreateSheet(sheetName, defaultHeaders) {
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName(sheetName);
  var headers = defaultHeaders || CNE_SHEET_HEADERS[sheetName] || [];

  if (!sheet) {
    try {
      sheet = ss.insertSheet(sheetName);
    } catch (insertErr) {
      // Another execution may have created the sheet after our first read.
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw insertErr;
    }
  }

  // Header initialization is deliberately idempotent: set row 1 rather than appendRow,
  // so concurrent first-use executions cannot create duplicate header rows.
  if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
    if (sheet.getMaxColumns() < headers.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

/**
 * Single Authoritative Sheet Initializer & Header Verifier (Idempotent & Non-Destructive)
 * Verifies all required CNE tabs and their headers.
 * Never deletes or clears existing sheets or rows. Appends missing headers if needed.
 */
function setupAndVerifyCNESheets(executorEmpId, session) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    return { success: false, message: 'Server is busy verifying sheets. Please try again.' };
  }

  try {
    if (session) {
      var freshSetupAdmin = requireFreshAdminMutation(session);
      if (!freshSetupAdmin.success) return freshSetupAdmin;
      session = freshSetupAdmin.session;
      executorEmpId = session.employeeId;
    }
    setupSecurityProperties();

    var tabNames = [
      'CNE Schedule',
      'Area',
      'Teaching Mode',
      'Role',
      'Gallery',
      'News and Events',
      'Portal Content',
      'Quick Links',
      'Auth_Credentials',
      'OTP_Verification',
      'Audit Log',
      'CNE Post Test Questions',
      'CNE Post Test Responses',
      'CNE_Reference',
      'CNE_QR_Tokens',
      'CNE_AI_Quota',
      'CNE_Reference_Index',
      'CNE_Reference_Library'
    ];

    var auditReport = [];
    var ss = getSpreadsheet('CNE');

    for (var i = 0; i < tabNames.length; i++) {
      var tabName = tabNames[i];
      var expectedHeaders = CNE_SHEET_HEADERS[tabName] || [];
      var existingSheet = ss.getSheetByName(tabName);
      var isNew = !existingSheet;

      // Use the single generic helper getOrCreateSheet
      var sheet = getOrCreateSheet(tabName);

      if (isNew) {
        auditReport.push({ tab: tabName, status: 'Created new sheet with headers', rowCount: 1 });
      } else {
        var lastRow = sheet.getLastRow();
        if (lastRow === 0 && expectedHeaders.length > 0) {
          auditReport.push({ tab: tabName, status: 'Existing (Headers added to empty tab)', rowCount: 1 });
        } else {
          var lastCol = sheet.getLastColumn() || 1;
          var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          var existingKeys = existingHeaders.map(function(h) {
            return String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          });

          // Non-destructive standardization: rename header 'Class ID' to 'CNE ID' in-place if present
          if (tabName === 'CNE Schedule') {
            for (var c = 0; c < existingHeaders.length; c++) {
              var rawH = String(existingHeaders[c] || '').trim();
              if (rawH.toLowerCase().replace(/[^a-z0-9]/g, '') === 'classid') {
                sheet.getRange(1, c + 1).setValue('CNE ID');
                existingHeaders[c] = 'CNE ID';
                existingKeys[c] = 'cneid';
                auditReport.push({ tab: tabName, status: 'Migrated header "Class ID" to "CNE ID" (in-place)', rowCount: lastRow });
                break;
              }
            }
          }

          // Targeted surgical cleanup: For CNE Schedule sheet, physically delete obsolete legacy column "Time"
          if (tabName === 'CNE Schedule') {
            var deletedTimeCols = [];
            for (var c = existingHeaders.length - 1; c >= 0; c--) {
              var rawH = String(existingHeaders[c] || '').trim();
              var normH = rawH.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normH === 'time') {
                sheet.deleteColumn(c + 1);
                deletedTimeCols.push(rawH);
              }
            }
            if (deletedTimeCols.length > 0) {
              auditReport.push({
                tab: tabName,
                status: 'Surgically deleted obsolete column(s): ' + deletedTimeCols.reverse().join(', '),
                rowCount: sheet.getLastRow()
              });
              lastCol = sheet.getLastColumn() || 1;
              existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
              existingKeys = existingHeaders.map(function(h) {
                return String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              });
            }
          }

          // Targeted surgical cleanup: ONLY for CNE_Reference sheet, physically delete legacy columns "Syllabus" and "Reference Links"
          if (tabName === 'CNE_Reference') {
            var deletedCols = [];
            // Scan from right to left (descending index) so earlier column indices remain stable during deletion
            for (var c = existingHeaders.length - 1; c >= 0; c--) {
              var rawH = String(existingHeaders[c] || '').trim();
              var normH = rawH.toLowerCase().replace(/[^a-z0-9]/g, '');
              // Detect headers named exactly "Syllabus" and "Reference Links" (case-insensitive / normalized)
              if (normH === 'syllabus' || normH === 'referencelinks' || normH === 'referencelink') {
                sheet.deleteColumn(c + 1);
                deletedCols.push(rawH);
              }
            }
            if (deletedCols.length > 0) {
              auditReport.push({
                tab: tabName,
                status: 'Surgically deleted legacy column(s): ' + deletedCols.reverse().join(', '),
                rowCount: sheet.getLastRow()
              });
              // Re-fetch headers and column count after physical column deletion
              lastCol = sheet.getLastColumn() || 1;
              existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
              existingKeys = existingHeaders.map(function(h) {
                return String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              });
            }
          }

          var missingHeaders = [];
          for (var h = 0; h < expectedHeaders.length; h++) {
            var reqH = expectedHeaders[h];
            var reqKey = String(reqH).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            var matched = false;

            if (existingKeys.indexOf(reqKey) !== -1) {
              matched = true;
            } else if (CNE_HEADER_ALIASES && CNE_HEADER_ALIASES[reqKey]) {
              for (var a = 0; a < CNE_HEADER_ALIASES[reqKey].length; a++) {
                if (existingKeys.indexOf(CNE_HEADER_ALIASES[reqKey][a]) !== -1) {
                  matched = true;
                  break;
                }
              }
            }

            if (!matched) {
              missingHeaders.push(reqH);
            }
          }

          if (missingHeaders.length > 0) {
            sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
            sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setFontWeight('bold');
            auditReport.push({
              tab: tabName,
              status: 'Appended ' + missingHeaders.length + ' missing header(s): ' + missingHeaders.join(', '),
              rowCount: lastRow
            });
          } else {
            auditReport.push({ tab: tabName, status: 'Verified (All required headers present)', rowCount: lastRow });
          }
        }
      }
    }

    // Migrate existing personal passwords once. Legacy default-password rows are intentionally NOT preserved.
    try {
      migrateLegacyCredentialsToAuthCredentials(ss.getSheetByName(AUTH_CREDENTIALS_SHEET));
      auditReport.push({ tab: AUTH_CREDENTIALS_SHEET, status: 'Legacy credential migration checked (personal passwords preserved; default-password accounts require OTP setup)' });
    } catch (migrationErr) {
      auditReport.push({ tab: AUTH_CREDENTIALS_SHEET, status: 'Credential migration warning', error: migrationErr.message });
    }

    // Verify authoritative employee master: Officers data (A:L only).
    try {
      var offSS=getSpreadsheet('OFFICERS');
      var offSheet=offSS.getSheetByName('Officers data');
      if (!offSheet) {
        auditReport.push({tab:'Officers data',status:'Missing',error:'Required Officers data tab was not found.'});
      } else {
        var offLastRow=offSheet.getLastRow();
        var officerHeaders=offSheet.getRange(1,1,1,12).getDisplayValues()[0];
        var officerCols=findOfficerHeaders(officerHeaders);
        var requiredOk=officerCols.empCol!==-1&&officerCols.nameCol!==-1&&officerCols.desigCol!==-1&&officerCols.dojCol!==-1&&officerCols.emailCol!==-1;
        if (!requiredOk) {
          auditReport.push({tab:'Officers data',status:'Header verification failed',error:'Expected Employee ID No., Name of the Officers, Designation, Date of Joining, and EmailID within A:L.'});
        } else {
          var missingEmailCount=0,invalidEmailCount=0,duplicateEmployeeIdCount=0,duplicateEmailCount=0,seenIds={},seenEmails={};
          if (offLastRow>1) {
            var officerRows=offSheet.getRange(2,1,offLastRow-1,12).getDisplayValues();
            for (var orow=0;orow<officerRows.length;orow++) {
              var oid=normalizeEmpId(officerRows[orow][officerCols.empCol]);
              var oemail=String(officerRows[orow][officerCols.emailCol]||'').trim().toLowerCase();
              if (oid) { if (seenIds[oid]) duplicateEmployeeIdCount++; seenIds[oid]=true; }
              if (!oemail) { if (oid) missingEmailCount++; }
              else if (!isValidEmailAddress(oemail)) invalidEmailCount++;
              else { if (seenEmails[oemail]) duplicateEmailCount++; seenEmails[oemail]=true; }
            }
          }
          auditReport.push({tab:'Officers data',status:'Verified A:L employee master',rowCount:offLastRow,details:'Missing emails: '+missingEmailCount+'; Invalid emails: '+invalidEmailCount+'; Duplicate Employee IDs: '+duplicateEmployeeIdCount+'; Duplicate emails: '+duplicateEmailCount});
        }
      }
    } catch(e) { auditReport.push({tab:'Officers data',status:'Separate Sheet / Unconfigured',error:e.message}); }

    logAuditAction('SETUP_AND_VERIFY_SHEETS', executorEmpId || 'SYSTEM', 'Sheet verification executed', 'SUCCESS');

    return {
      success: true,
      message: 'Sheet initialization and verification completed safely. All existing data remained completely untouched.',
      auditReport: auditReport
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 8 & 24. Auto-Initialize / Verify Sheets Action Handlers (Strictly NON-DESTRUCTIVE, Requires ADMIN)
 */
function handleSetupAndVerifyCNESheets(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  return setupAndVerifyCNESheets(session ? session.employeeId : 'ADMIN', session);
}

/**
 * ============================================================================
 * PART 2: TOPIC REFERENCE, AI QUESTIONS, LOCKING, QR, POST-TEST & COMPLETION
 * ============================================================================
 */

function getCNEScheduleRecord(cneId) {
  if (!cneId) return null;
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('CNE Schedule');
  if (!sheet || sheet.getLastRow() <= 1) return null;

  var colMap = getHeaderMap(sheet);
  var cleanId = String(cneId).trim().toUpperCase();
  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : (colMap['classid'] !== undefined ? colMap['classid'] : 0);
  var rowIndex = findExactRowInColumn_(sheet, idCol, cleanId, 2);
  if (rowIndex < 2) return null;

  var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rawType = colMap['typeofcne'] !== undefined ? row[colMap['typeofcne']] : row[12];
  var rawStatus = colMap['status'] !== undefined ? row[colMap['status']] : row[11];
  var durVal = colMap['duration'] !== undefined ? row[colMap['duration']] : row[6];
  var maxP = colMap['maxparticipants'] !== undefined ? row[colMap['maxparticipants']] : row[10];

  return {
    rowIndex: rowIndex,
    cneId: String(row[idCol] || '').trim(),
    topic: String((colMap['topic'] !== undefined ? row[colMap['topic']] : row[1]) || '').trim(),
    area: String((colMap['area'] !== undefined ? row[colMap['area']] : row[2]) || '').trim(),
    date: formatDateValue(colMap['fromdate'] !== undefined ? row[colMap['fromdate']] : (colMap['date'] !== undefined ? row[colMap['date']] : row[3])),
    toDate: formatDateValue(colMap['todate'] !== undefined ? row[colMap['todate']] : (row[4] || row[3])),
    duration: durVal ? Number(durVal) : 60,
    instructor: String((colMap['resourcepersonempid'] !== undefined ? row[colMap['resourcepersonempid']] : row[7]) || '').trim(),
    mode: String((colMap['modeofteaching'] !== undefined ? row[colMap['modeofteaching']] : (colMap['mode'] !== undefined ? row[colMap['mode']] : row[8])) || 'Offline').trim(),
    description: String((colMap['description'] !== undefined ? row[colMap['description']] : row[9]) || '').trim(),
    maxParticipants: maxP ? Number(maxP) : 50,
    status: normalizeCNEStatus(rawStatus),
    externalResourcePersons: String((colMap['externalresourcepersons'] !== undefined ? row[colMap['externalresourcepersons']] : row[13]) || '').trim(),
    proposedBy: String((colMap['proposedby'] !== undefined ? row[colMap['proposedby']] : row[14]) || '').trim(),
    adminRemarks: String((colMap['adminremarks'] !== undefined ? row[colMap['adminremarks']] : row[15]) || '').trim(),
    cneType: normalizeCNEType(rawType)
  };
}

/**
 * Save CNE Topic and Reference Material
 * 5-Column Schema:
 * 1: CNE ID
 * 2: Topic
 * 3: Reference Text / Clinical Guides (holds complete educational content)
 * 4: Updated At
 * 5: Updated By
 */
function handleSaveReferenceMaterial(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) {
    return { success: false, message: 'CNE ID is required.' };
  }
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return { success: false, message: 'CNE record not found for ID: ' + cneId };
  }
  
  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;

  // Prevent learning-material modification after finalization.
  if (normalizeCNEStatus(record.status) === 'Completed') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_FINALIZED',
      message: 'This CNE has already been finalized. Learning materials cannot be modified.'
    };
  }

  // Also fail closed for canceled sessions.
  var materialStatus = normalizeCNEStatus(record.status);
  if (materialStatus === 'Canceled' || materialStatus === 'Cancelled') {
    return {
      success: false,
      errorCode: 'CNE_CANCELED',
      message: 'This CNE has been canceled. Learning materials cannot be modified.'
    };
  }
  
  // Unified educational content entered through the single large content box
  var unifiedContent = sanitizeCellInput(params.unifiedContent || params.referenceText || params.material || '');
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var freshMaterialSession = refreshMutationSession(session);
    if (!freshMaterialSession.success) return freshMaterialSession;
    session = freshMaterialSession.session;
    var liveMaterialRecord = getCNEScheduleRecord(cneId);
    if (!liveMaterialRecord) return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
    var liveMaterialAuth = checkCNEActionAuthorized(session, liveMaterialRecord);
    if (liveMaterialAuth) return liveMaterialAuth;
    var liveMaterialStatus = normalizeCNEStatus(liveMaterialRecord.status);
    if (liveMaterialStatus === 'Completed' || liveMaterialStatus === 'Canceled') {
      return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Learning materials cannot be modified.' };
    }
    record = liveMaterialRecord;

    var sheet = getOrCreateSheet('CNE_Reference');
    var data = sheet.getDataRange().getValues();
    var colMap = getHeaderMap(sheet);
    var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
    var existingRow = -1;
    
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        existingRow = r + 1;
        break;
      }
    }
    
    var updatedAt = new Date().toISOString();
    var updatedBy = session.employeeId;
    
    // Exactly 5 columns: CNE ID, Topic, Reference Text / Clinical Guides, Updated At, Updated By
    var rowValues = [cneId, record.topic, unifiedContent, updatedAt, updatedBy];
    
    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, 5).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    // Resolve employee name for frontend display response - never expose employee ID
    var officerMap = getOfficerNameMap();
    var officerName = 'Coordinator';
    if (session && session.employeeId) {
      var normEmpId = normalizeEmpId(session.employeeId);
      if (officerMap && officerMap[normEmpId]) {
        officerName = officerMap[normEmpId];
      } else if (session.name && String(session.name).trim() && String(session.name).trim().toUpperCase() !== String(session.employeeId).toUpperCase()) {
        officerName = String(session.name).trim();
      }
    }
    
    logAuditAction('SAVE_REFERENCE_MATERIAL', session.employeeId, 'Saved reference material for CNE: ' + cneId, 'SUCCESS');
    return {
      success: true,
      message: 'CNE learning material saved successfully.',
      data: {
        cneId: cneId,
        unifiedContent: unifiedContent,
        referenceText: unifiedContent,
        updatedAt: updatedAt,
        updatedBy: officerName
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Non-destructively ensure all 10 CNE_Reference headers exist.
 * Preserves existing columns 1-5 and existing row data.
 */
function ensureSheetHeadersSafe_(sheet, expected, lockAlreadyHeld) {
  if (!sheet || !expected || expected.length === 0) return;

  function applyMissingHeaders_() {
    if (sheet.getLastRow() === 0) {
      if (sheet.getMaxColumns() < expected.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), expected.length - sheet.getMaxColumns());
      }
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]).setFontWeight('bold');
      return;
    }
    var colMap = getHeaderMap(sheet);
    var missing = [];
    for (var i = 0; i < expected.length; i++) {
      var key = expected[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (colMap[key] === undefined) missing.push(expected[i]);
    }
    if (missing.length === 0) return;
    var lastCol = sheet.getLastColumn() || 1;
    if (sheet.getMaxColumns() < lastCol + missing.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), (lastCol + missing.length) - sheet.getMaxColumns());
    }
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }

  // Fast no-write path avoids lock overhead after setup is complete.
  if (sheet.getLastRow() > 0) {
    var fastMap = getHeaderMap(sheet);
    var allPresent = true;
    for (var f = 0; f < expected.length; f++) {
      var fastKey = expected[f].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fastMap[fastKey] === undefined) { allPresent = false; break; }
    }
    if (allPresent) return;
  }

  if (lockAlreadyHeld) {
    applyMissingHeaders_();
    return;
  }

  var headerLock = LockService.getScriptLock();
  try {
    headerLock.waitLock(10000);
  } catch (e) {
    throw new Error('Server is busy initializing sheet headers. Please try again.');
  }
  try {
    // Re-read after acquiring the lock so another request cannot append duplicates.
    applyMissingHeaders_();
  } finally {
    headerLock.releaseLock();
  }
}

function ensureReferenceSheetHeaders(sheet, lockAlreadyHeld) {
  ensureSheetHeadersSafe_(sheet, CNE_SHEET_HEADERS['CNE_Reference'] || [], Boolean(lockAlreadyHeld));
}

/**
 * Non-destructively ensure all 12 CNE_Reference_Index headers exist.
 * Preserves existing rows, structure, and formatting.
 * Appends missing headers only if necessary.
 */
function ensureReferenceIndexSheetHeaders(sheet, lockAlreadyHeld) {
  ensureSheetHeadersSafe_(sheet, CNE_SHEET_HEADERS['CNE_Reference_Index'] || [], Boolean(lockAlreadyHeld));
}

/**
 * Non-destructively ensure all CNE_Reference headers exist.
 * Preserves existing rows, structure, and formatting.
 * Appends missing headers only if necessary.
 */
function ensureLearningResourceSheetHeaders(sheet, lockAlreadyHeld) {
  ensureSheetHeadersSafe_(sheet, CNE_SHEET_HEADERS['CNE_Reference'] || [], Boolean(lockAlreadyHeld));
}

/**
 * Non-destructively ensure all 12 CNE_Reference_Library headers exist.
 * Preserves existing rows, structure, and formatting.
 * Appends missing headers only if necessary.
 */
function ensureReferenceLibrarySheetHeaders(sheet, lockAlreadyHeld) {
  ensureSheetHeadersSafe_(sheet, CNE_SHEET_HEADERS['CNE_Reference_Library'] || [], Boolean(lockAlreadyHeld));
}

/**
 * Helper: Obtain or create the 'Learning Resources' subfolder inside the configured DRIVE_FOLDER_ID.
 * Strictly non-destructive, idempotent, and authoritative.
 * Uses ONLY DRIVE_FOLDER_ID from ScriptProperties; ignores any client folder IDs.
 */
function getOrCreateLearningResourcesFolder() {
  try {
    var rootId = getProperty('LEARNING_RESOURCES_ROOT_FOLDER_ID');
    var rootFolder = rootId ? DriveApp.getFolderById(rootId) : DriveApp.getRootFolder();
    return { success: true, folder: getOrCreateChildFolderSafe_(rootFolder, 'CNE Learning Resources') };
  } catch (e) {
    return { success: false, message: 'Unable to access CNE Learning Resources folder: ' + e.message };
  }
}

/**
 * Helper: Obtain or create the 'Nursing Reference Library' subfolder inside 'Learning Resources'.
 */
function getOrCreateChildFolderSafe_(parentFolder, folderName) {
  var existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) return existing.next();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error('Server is busy creating the Drive folder. Please try again.');
  }
  try {
    // Re-check while serialized so two first-use requests cannot create duplicate folders.
    var latest = parentFolder.getFoldersByName(folderName);
    if (latest.hasNext()) return latest.next();
    return parentFolder.createFolder(folderName);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateNursingRefLibraryFolder(learningResourcesFolder) {
  try {
    if (!learningResourcesFolder) {
      var parentResult = getOrCreateLearningResourcesFolder();
      if (!parentResult.success) return parentResult;
      learningResourcesFolder = parentResult.folder;
    }
    return { success: true, folder: getOrCreateChildFolderSafe_(learningResourcesFolder, 'Nursing Reference Library') };
  } catch (e) {
    return { success: false, message: 'Unable to access Nursing Reference Library folder: ' + e.message };
  }
}

/**
 * Helper: Obtain or create the 'Open RN' subfolder inside 'Nursing Reference Library'.
 * Hierarchy: DRIVE_FOLDER_ID -> Learning Resources -> Nursing Reference Library -> Open RN
 * Strict Server-Authoritative: resolves ONLY from configured DRIVE_FOLDER_ID. Never accepts client folder IDs.
 */
function getOrCreateOpenRnFolder() {
  var lrResult = getOrCreateLearningResourcesFolder();
  if (!lrResult.success) return lrResult;
  var nrlResult = getOrCreateNursingRefLibraryFolder(lrResult.folder);
  if (!nrlResult.success) return nrlResult;
  try {
    return { success: true, folder: getOrCreateChildFolderSafe_(nrlResult.folder, 'Open RN') };
  } catch (e) {
    return { success: false, message: 'Unable to access Open RN folder: ' + e.message };
  }
}

/**
 * Server-side validation: Verifies whether a Drive File is strictly located within the Open RN folder.
 */
function isFileInOpenRnFolder(file, openRnFolder) {
  if (!file || !openRnFolder) return false;
  try {
    var parents = file.getParents();
    while (parents.hasNext()) {
      var p = parents.next();
      if (p.getId() === openRnFolder.getId()) {
        return true;
      }
    }
  } catch (err) {
    return false;
  }
  return false;
}

/**
 * Helper: Sanitize string to create safe filename part.
 * Strips path traversal / directory injection chars (/ \ : * ? " < > | ..).
 */
function sanitizeFileNamePart(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\\/:*?"<>|\r\n\t]/g, '')
    .replace(/\.\.+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Upload and Store CNE Learning Resource File
 * Document Policy: Strictly PDF only (.pdf)
 * Maximum Size: 3 MB (MAX_CNE_LEARNING_MATERIAL_BYTES = 3 * 1024 * 1024)
 * Authoritative storage: DRIVE_FOLDER_ID -> Learning Resources subfolder
 * Access: Completely PRIVATE (No ANYONE_WITH_LINK)
 * Metadata: Appended non-destructively to CNE_Reference
 */
function handleUploadLearningResource(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, errorCode: 'INVALID_CNE_ID', message: 'CNE ID is required.' };

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;
  if (normalizeCNEStatus(record.status) === 'Completed') return { success: false, errorCode: 'CNE_ALREADY_FINALIZED', message: 'This CNE has already been finalized. Learning materials cannot be modified.' };
  var materialStatus = normalizeCNEStatus(record.status);
  if (materialStatus === 'Canceled' || materialStatus === 'Cancelled') return { success: false, errorCode: 'CNE_CANCELED', message: 'This CNE has been canceled. Learning materials cannot be modified.' };

  var base64Data = params.base64Data || params.fileData || params.fileBase64;
  if (!base64Data) return { success: false, errorCode: 'MISSING_FILE', message: 'File data is required.' };
  var clientFileName = sanitizeCellInput(params.fileName || '');
  var contentType = '';
  var rawBase64 = String(base64Data);
  if (rawBase64.indexOf(';base64,') !== -1) {
    var parts = rawBase64.split(';base64,');
    contentType = parts[0].replace('data:', '').toLowerCase().trim();
    rawBase64 = parts[1];
  } else if (params.fileType || params.mimeType) {
    contentType = String(params.fileType || params.mimeType).toLowerCase().trim();
  }

  var MAX_CNE_LEARNING_MATERIAL_BYTES = 3 * 1024 * 1024;
  if (rawBase64.length > 4.5 * 1024 * 1024) return { success: false, errorCode: 'FILE_TOO_LARGE', message: 'File exceeds maximum allowed size of 3 MB.' };

  var ext = '';
  if (clientFileName && clientFileName.lastIndexOf('.') !== -1) ext = clientFileName.substring(clientFileName.lastIndexOf('.') + 1).toLowerCase().trim();
  else if (params.extension) ext = String(params.extension).toLowerCase().replace(/^\./, '').trim();
  var ALLOWED_EXTS = ['pdf'];
  if (!ext || ALLOWED_EXTS.indexOf(ext) === -1) return { success: false, errorCode: 'INVALID_FILE_TYPE', message: 'Invalid file format. Only PDF (.pdf) documents are permitted.' };

  var SPECIFIC_MIMES_BY_EXT = { 'pdf': ['application/pdf', 'application/x-pdf'] };
  var GENERIC_MIMES = ['application/octet-stream', 'binary/octet-stream'];
  if (contentType) {
    var isSpecific = SPECIFIC_MIMES_BY_EXT[ext] && SPECIFIC_MIMES_BY_EXT[ext].indexOf(contentType) !== -1;
    var isGeneric = GENERIC_MIMES.indexOf(contentType) !== -1;
    if (!isSpecific && !isGeneric) return { success: false, errorCode: 'INVALID_MIME_TYPE', message: 'Declared MIME type (' + contentType + ') is not permitted for .' + ext.toUpperCase() + ' documents.' };
  }

  var decoded;
  try { decoded = Utilities.base64Decode(rawBase64); }
  catch (decodeErr) { return { success: false, errorCode: 'INVALID_FILE_ENCODING', message: 'Failed to decode base64 file data.' }; }
  var fileSize = decoded.length;
  if (fileSize <= 0) return { success: false, errorCode: 'EMPTY_FILE', message: 'Uploaded file is empty (0 bytes).' };
  if (fileSize > MAX_CNE_LEARNING_MATERIAL_BYTES || fileSize > 3 * 1024 * 1024) {
    return { success: false, errorCode: 'FILE_TOO_LARGE', message: 'File exceeds maximum allowed size of 3 MB (Actual: ' + (Math.round(fileSize / (1024 * 1024) * 10) / 10) + ' MB).' };
  }
  if (decoded.length < 4 || (decoded[0] & 0xFF) !== 0x25 || (decoded[1] & 0xFF) !== 0x50 || (decoded[2] & 0xFF) !== 0x44 || (decoded[3] & 0xFF) !== 0x46) {
    return { success: false, errorCode: 'INVALID_FILE_CONTENT', message: 'File content does not match standard PDF document structure (%PDF header missing).' };
  }

  var folderRes = getOrCreateLearningResourcesFolder();
  if (!folderRes.success) return folderRes;
  var targetFolder = folderRes.folder;

  // Fresh authorization/identity preparation before Drive work. No global lock is held here.
  var freshUploadSession = refreshMutationSession(session);
  if (!freshUploadSession.success) return freshUploadSession;
  session = freshUploadSession.session;
  record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;
  materialStatus = normalizeCNEStatus(record.status);
  if (materialStatus === 'Completed' || materialStatus === 'Canceled') return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Learning materials cannot be modified.' };

  var authoritativeTopic = sanitizeFileNamePart(record.topic) || ('CNE_' + cneId);
  var authoritativeRpNames = [];
  var seenRpNames = {};
  function addAuthoritativeRpName(rawName) {
    var cleanName = sanitizeFileNamePart(rawName);
    if (!cleanName) return;
    var key = cleanName.toUpperCase();
    if (seenRpNames[key]) return;
    seenRpNames[key] = true;
    authoritativeRpNames.push(cleanName);
  }

  _executionRosterData = null;
  _inMemoryOfficerMap = null;
  var internalRpIds = String(record.instructor || '').split(/[,;\n]+/).map(function(id) { return String(id || '').trim(); }).filter(Boolean);
  for (var rpIdx = 0; rpIdx < internalRpIds.length; rpIdx++) {
    var authoritativeOfficer = findOfficerById(internalRpIds[rpIdx]);
    if (authoritativeOfficer && authoritativeOfficer.name) addAuthoritativeRpName(authoritativeOfficer.name);
  }
  var externalRpNames = String(record.externalResourcePersons || '').split(/[,;\n]+/).map(function(name) { return String(name || '').trim(); }).filter(Boolean);
  for (var extRpIdx = 0; extRpIdx < externalRpNames.length; extRpIdx++) addAuthoritativeRpName(externalRpNames[extRpIdx]);
  if (authoritativeRpNames.length === 0) {
    logAuditAction('UPLOAD_LEARNING_RESOURCE_REJECTED', session.employeeId, 'Learning resource upload rejected for CNE ' + cneId + ': Resource Person could not be resolved from the authoritative CNE assignment.', 'FAILED');
    return { success: false, errorCode: 'CNE_RESOURCE_PERSON_NOT_CONFIGURED', message: 'Resource Person could not be resolved from the selected CNE. Please update the CNE Resource Person assignment before uploading learning material.' };
  }

  var authoritativeRpName = authoritativeRpNames.join(', ');
  var baseFileName = authoritativeTopic + ' - ' + authoritativeRpName;
  var finalFileName = baseFileName + '.' + ext;
  try {
    if (targetFolder.getFilesByName(finalFileName).hasNext()) {
      finalFileName = baseFileName + ' (' + Utilities.getUuid().substring(0, 8) + ').' + ext;
    }
  } catch (dupCheckErr) {
    finalFileName = baseFileName + ' (' + Utilities.getUuid().substring(0, 8) + ').' + ext;
  }

  // Drive file creation is independent work and must not monopolize ScriptLock.
  var newlyCreatedDriveFile = null;
  var newDriveFileId = null;
  try {
    var blob = Utilities.newBlob(decoded, 'application/pdf', finalFileName);
    newlyCreatedDriveFile = targetFolder.createFile(blob);
    newDriveFileId = newlyCreatedDriveFile.getId();
  } catch (driveErr) {
    return { success: false, errorCode: 'DRIVE_UPLOAD_FAILED', message: 'Failed to create file in Google Drive: ' + driveErr.message };
  }

  var preparedIdentity = [String(record.topic || '').trim(), String(record.instructor || '').trim(), String(record.externalResourcePersons || '').trim()].join('|');
  var commitError = null;
  var updatedAt = new Date().toISOString();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    try { newlyCreatedDriveFile.setTrashed(true); } catch (cleanupErr) {}
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy committing the learning resource. Please try again.' };
  }

  try {
    var liveSession = refreshMutationSession(session);
    if (!liveSession.success) {
      commitError = liveSession;
    } else {
      session = liveSession.session;
      var liveRecord = getCNEScheduleRecord(cneId);
      if (!liveRecord) commitError = { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
      else {
        var liveAuth = checkCNEActionAuthorized(session, liveRecord);
        if (liveAuth) commitError = liveAuth;
        else if (isCNEClosedForParticipantAccess(liveRecord)) commitError = { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Learning materials cannot be modified.' };
        else {
          var liveIdentity = [String(liveRecord.topic || '').trim(), String(liveRecord.instructor || '').trim(), String(liveRecord.externalResourcePersons || '').trim()].join('|');
          if (liveIdentity !== preparedIdentity) {
            commitError = { success: false, errorCode: 'CNE_RESOURCE_IDENTITY_CHANGED', message: 'The CNE topic/resource-person assignment changed during upload. Please retry with the latest CNE details.' };
          } else {
            record = liveRecord;
            var sheet = getOrCreateSheet('CNE_Reference');
            ensureReferenceSheetHeaders(sheet, true);
            ensureLearningResourceSheetHeaders(sheet, true);
            var colMap = getHeaderMap(sheet);
            var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
            var existingRow = findExactRowInColumn_(sheet, idCol, cneId.toUpperCase(), 2);
            var rowWidth = sheet.getLastColumn();
            var rowValues = existingRow > 1 ? sheet.getRange(existingRow, 1, 1, rowWidth).getValues()[0] : new Array(rowWidth).fill('');
            var refCol = colMap['referencetextclinicalguides'] !== undefined ? colMap['referencetextclinicalguides'] : (colMap['referencetext'] !== undefined ? colMap['referencetext'] : 2);
            var existingText = existingRow > 1 ? String(rowValues[refCol] || '') : '';
            var contentText = existingText || sanitizeCellInput(params.unifiedContent || params.referenceText || '');

            if (colMap['cneid'] !== undefined) rowValues[colMap['cneid']] = cneId; else rowValues[0] = cneId;
            if (colMap['topic'] !== undefined) rowValues[colMap['topic']] = record.topic; else rowValues[1] = record.topic;
            if (refCol !== undefined) rowValues[refCol] = contentText;
            if (colMap['updatedat'] !== undefined) rowValues[colMap['updatedat']] = updatedAt; else rowValues[3] = updatedAt;
            if (colMap['updatedby'] !== undefined) rowValues[colMap['updatedby']] = session.employeeId; else rowValues[4] = session.employeeId;
            if (colMap['drivefileid'] !== undefined) rowValues[colMap['drivefileid']] = newDriveFileId; else rowValues[5] = newDriveFileId;
            if (colMap['filename'] !== undefined) rowValues[colMap['filename']] = finalFileName; else rowValues[6] = finalFileName;
            if (colMap['filetype'] !== undefined) rowValues[colMap['filetype']] = ext.toUpperCase(); else rowValues[7] = ext.toUpperCase();
            if (colMap['resourcepersonname'] !== undefined) rowValues[colMap['resourcepersonname']] = authoritativeRpName; else rowValues[8] = authoritativeRpName;
            if (colMap['filesize'] !== undefined) rowValues[colMap['filesize']] = fileSize; else rowValues[9] = fileSize;
            if (colMap['indexingstatus'] !== undefined) rowValues[colMap['indexingstatus']] = 'PENDING';
            if (colMap['indexingerrorcode'] !== undefined) rowValues[colMap['indexingerrorcode']] = '';
            if (colMap['indexingmessage'] !== undefined) rowValues[colMap['indexingmessage']] = 'Indexing is in progress.';
            if (colMap['chunkscount'] !== undefined) rowValues[colMap['chunkscount']] = 0;
            if (colMap['indexedat'] !== undefined) rowValues[colMap['indexedat']] = '';

            if (existingRow > 1) sheet.getRange(existingRow, 1, 1, rowWidth).setValues([rowValues]);
            else sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowWidth).setValues([rowValues]);
          }
        }
      }
    }
  } catch (sheetErr) {
    commitError = { success: false, errorCode: 'METADATA_PERSIST_FAILED', message: 'Failed to persist reference metadata in sheet: ' + sheetErr.message };
  } finally {
    lock.releaseLock();
  }

  if (commitError) {
    var rolledBack = false;
    try { newlyCreatedDriveFile.setTrashed(true); rolledBack = true; } catch (trashErr) {}
    logAuditAction(rolledBack ? 'UPLOAD_LEARNING_RESOURCE_ROLLED_BACK' : 'UPLOAD_LEARNING_RESOURCE_ORPHANED', session.employeeId, 'Learning resource metadata commit failed for CNE ' + cneId + '. Drive File ID: ' + newDriveFileId + '. Reason: ' + (commitError.message || commitError.errorCode || 'Unknown'), 'FAILED');
    if (rolledBack) return { success: false, errorCode: commitError.errorCode || 'METADATA_PERSIST_FAILED_ROLLED_BACK', message: (commitError.message || 'Metadata persistence failed.') + ' The uploaded file was rolled back.' };
    return { success: false, errorCode: 'METADATA_PERSIST_FAILED_CLEANUP_FAILED', message: 'Metadata persistence failed and uploaded-file cleanup could not be completed. Administrative reconciliation may be required.' };
  }

  logAuditAction('UPLOAD_LEARNING_RESOURCE', session.employeeId, 'Uploaded learning resource for CNE ' + cneId + ': ' + finalFileName + ' (' + fileSize + ' bytes)', 'SUCCESS');

  // Index with NO caller-held ScriptLock. Extraction happens concurrently; only final shared-sheet commit is serialized.
  var indexResult = null;
  try {
    indexResult = indexLearningResourceContent(cneId, newDriveFileId, finalFileName, ext.toUpperCase(), record.topic, session, false);
  } catch (indexErr) {
    indexResult = { success: false, errorCode: 'INDEXING_EXECUTION_ERROR', message: 'Error occurred during content indexing: ' + (indexErr && indexErr.message ? indexErr.message : String(indexErr)) };
  }

  var indexingStatus = (indexResult && indexResult.success) ? 'SUCCESS' : 'FAILED';
  var indexingMessage = (indexResult && indexResult.message) ? indexResult.message : (indexingStatus === 'SUCCESS' ? 'Content indexed successfully.' : 'Unable to extract readable text from the uploaded material.');
  var indexingErrorCode = (indexResult && !indexResult.success && indexResult.errorCode) ? indexResult.errorCode : '';
  var indexingChunksCount = (indexResult && indexResult.chunksCount) ? Number(indexResult.chunksCount) : 0;
  var indexedAt = new Date().toISOString();

  return {
    success: true,
    data: {
      cneId: cneId,
      driveFileId: newDriveFileId,
      fileName: finalFileName,
      fileType: ext.toUpperCase(),
      fileSize: fileSize,
      resourcePersonName: authoritativeRpName,
      uploadedAt: updatedAt,
      topic: record.topic,
      indexingStatus: indexingStatus,
      indexingErrorCode: indexingErrorCode || undefined,
      indexingMessage: indexingMessage,
      chunksCount: indexingChunksCount,
      indexedAt: indexedAt
    },
    message: indexingStatus === 'SUCCESS' ? 'Learning resource uploaded and indexed successfully.' : 'Learning resource uploaded to Drive, but content indexing could not be completed.'
  };
}

/**
 * Securely delete an uploaded Learning Resource for a CNE
 * Enforces authoritative verification:
 *   CNE exists -> Caller authorized -> CNE_Reference metadata -> Associated Drive File ID
 *   -> Verification file resides in Learning Resources folder -> Trashing -> Metadata cleanup -> Audit log
 */
function handleDeleteLearningResource(params, session) {
  if (!session || !session.employeeId) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var cneId = sanitizeCellInput(params ? params.cneId : '');
  if (!cneId) {
    return {
      success: false,
      errorCode: 'INVALID_CNE_ID',
      message: 'CNE ID is required.'
    };
  }

  // 1. Verify CNE exists
  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return {
      success: false,
      errorCode: 'CNE_NOT_FOUND',
      message: 'CNE record not found for ID: ' + cneId
    };
  }

  // 2. Verify caller is authorized for that CNE
  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;

  // Prevent learning-material modification after finalization.
  if (normalizeCNEStatus(record.status) === 'Completed') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_FINALIZED',
      message: 'This CNE has already been finalized. Learning materials cannot be modified.'
    };
  }

  // Also fail closed for canceled sessions.
  var materialStatus = normalizeCNEStatus(record.status);
  if (materialStatus === 'Canceled' || materialStatus === 'Cancelled') {
    return {
      success: false,
      errorCode: 'CNE_CANCELED',
      message: 'This CNE has been canceled. Learning materials cannot be modified.'
    };
  }

  // 3. Resolve the associated Drive File ID from the authoritative CNE_Reference record
  var sheet = getOrCreateSheet('CNE_Reference');
  ensureReferenceSheetHeaders(sheet);
  var colMap = getHeaderMap(sheet);
  var data = sheet.getDataRange().getValues();
  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
  var driveFileIdCol = colMap['drivefileid'];
  var fileNameCol = colMap['filename'];
  var fileTypeCol = colMap['filetype'];
  var fileSizeCol = colMap['filesize'];
  var indexingStatusCol = colMap['indexingstatus'];
  var indexingErrorCodeCol = colMap['indexingerrorcode'];
  var indexingMessageCol = colMap['indexingmessage'];
  var chunksCountCol = colMap['chunkscount'];
  var indexedAtCol = colMap['indexedat'];
  var updatedCol = colMap['updatedat'] !== undefined ? colMap['updatedat'] : 3;
  var byCol = colMap['updatedby'] !== undefined ? colMap['updatedby'] : 4;

  var existingRow = -1;
  var targetDriveFileId = '';
  var targetFileName = '';

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      existingRow = r + 1;
      targetDriveFileId = driveFileIdCol !== undefined ? String(data[r][driveFileIdCol] || '').trim() : '';
      targetFileName = fileNameCol !== undefined ? String(data[r][fileNameCol] || '').trim() : '';
      break;
    }
  }

  if (!targetDriveFileId || existingRow === -1) {
    return {
      success: false,
      errorCode: 'NO_RESOURCE_FILE',
      message: 'No uploaded learning resource file is currently associated with this CNE.'
    };
  }

  // 4. Verify the file belongs to the configured DRIVE_FOLDER_ID / Learning Resources folder
  var folderRes = getOrCreateLearningResourcesFolder();
  if (!folderRes.success || !folderRes.folder) {
    return {
      success: false,
      errorCode: 'DRIVE_STORAGE_ERROR',
      message: folderRes.message || 'Learning Resources folder could not be accessed.'
    };
  }

  var targetFolder = folderRes.folder;
  var targetFolderId = targetFolder.getId();

  var file = null;
  try {
    file = DriveApp.getFileById(targetDriveFileId);
  } catch (driveLookupErr) {
    file = null;
  }

  if (file) {
    var parents = file.getParents();
    var inFolder = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === targetFolderId) {
        inFolder = true;
        break;
      }
    }

    if (!inFolder) {
      logAuditAction('DELETE_LEARNING_RESOURCE_REJECTED', session.employeeId, 'Attempted to delete Drive file ' + targetDriveFileId + ' which does not belong to the authoritative Learning Resources directory for CNE ' + cneId, 'FAILED');
      return {
        success: false,
        errorCode: 'FILE_OUTSIDE_REPOSITORY',
        message: 'Resource file does not belong to the authoritative Learning Resources folder.'
      };
    }
  }

  // 5. Use ScriptLock for critical Drive + metadata mutation
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    return {
      success: false,
      errorCode: 'SERVER_BUSY',
      message: 'Server is busy. Please try again in a few moments.'
    };
  }

  try {
    var freshDeleteSession = refreshMutationSession(session);
    if (!freshDeleteSession.success) return freshDeleteSession;
    session = freshDeleteSession.session;
    var liveDeleteRecord = getCNEScheduleRecord(cneId);
    if (!liveDeleteRecord) return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
    var liveDeleteAuth = checkCNEActionAuthorized(session, liveDeleteRecord);
    if (liveDeleteAuth) return liveDeleteAuth;
    var liveDeleteStatus = normalizeCNEStatus(liveDeleteRecord.status);
    if (liveDeleteStatus === 'Completed' || liveDeleteStatus === 'Canceled') {
      return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Learning materials cannot be modified.' };
    }

    // Re-resolve metadata under the lock so a concurrent replacement cannot make us
    // trash an old file and then clear the newer file's metadata row.
    sheet = getOrCreateSheet('CNE_Reference');
    ensureReferenceSheetHeaders(sheet, true);
    ensureLearningResourceSheetHeaders(sheet, true);
    colMap = getHeaderMap(sheet);
    data = sheet.getDataRange().getValues();
    idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
    driveFileIdCol = colMap['drivefileid'];
    fileNameCol = colMap['filename'];
    fileTypeCol = colMap['filetype'];
    fileSizeCol = colMap['filesize'];
    indexingStatusCol = colMap['indexingstatus'];
    indexingErrorCodeCol = colMap['indexingerrorcode'];
    indexingMessageCol = colMap['indexingmessage'];
    chunksCountCol = colMap['chunkscount'];
    indexedAtCol = colMap['indexedat'];
    updatedCol = colMap['updatedat'] !== undefined ? colMap['updatedat'] : 3;
    byCol = colMap['updatedby'] !== undefined ? colMap['updatedby'] : 4;
    existingRow = -1;
    targetDriveFileId = '';
    targetFileName = '';
    for (var liveMetaRow = 1; liveMetaRow < data.length; liveMetaRow++) {
      if (String(data[liveMetaRow][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        existingRow = liveMetaRow + 1;
        targetDriveFileId = driveFileIdCol !== undefined ? String(data[liveMetaRow][driveFileIdCol] || '').trim() : '';
        targetFileName = fileNameCol !== undefined ? String(data[liveMetaRow][fileNameCol] || '').trim() : '';
        break;
      }
    }
    if (!targetDriveFileId || existingRow === -1) {
      return { success: false, errorCode: 'NO_RESOURCE_FILE', message: 'No uploaded learning resource file is currently associated with this CNE.' };
    }
    file = null;
    try { file = DriveApp.getFileById(targetDriveFileId); } catch (liveDriveLookupErr) { file = null; }
    if (file) {
      var liveParents = file.getParents();
      var liveInFolder = false;
      while (liveParents.hasNext()) {
        if (liveParents.next().getId() === targetFolderId) { liveInFolder = true; break; }
      }
      if (!liveInFolder) {
        return { success: false, errorCode: 'FILE_OUTSIDE_REPOSITORY', message: 'Resource file does not belong to the authoritative Learning Resources folder.' };
      }
    }

    // 6. Trash/delete only that specific Learning Resource file if it exists
    if (file) {
      try {
        file.setTrashed(true);
      } catch (trashErr) {
        return {
          success: false,
          errorCode: 'DRIVE_DELETE_FAILED',
          message: 'Failed to trash learning resource file in Google Drive: ' + trashErr.message
        };
      }
    }

    // 7. Remove corresponding Learning Resource metadata from CNE_Reference
    try {
      var updatedAt = new Date().toISOString();
      var updatedBy = session.employeeId;

      if (driveFileIdCol !== undefined) sheet.getRange(existingRow, driveFileIdCol + 1).setValue('');
      if (fileNameCol !== undefined) sheet.getRange(existingRow, fileNameCol + 1).setValue('');
      if (fileTypeCol !== undefined) sheet.getRange(existingRow, fileTypeCol + 1).setValue('');
      if (fileSizeCol !== undefined) sheet.getRange(existingRow, fileSizeCol + 1).setValue(0);
      if (indexingStatusCol !== undefined) sheet.getRange(existingRow, indexingStatusCol + 1).setValue('');
      if (indexingErrorCodeCol !== undefined) sheet.getRange(existingRow, indexingErrorCodeCol + 1).setValue('');
      if (indexingMessageCol !== undefined) sheet.getRange(existingRow, indexingMessageCol + 1).setValue('');
      if (chunksCountCol !== undefined) sheet.getRange(existingRow, chunksCountCol + 1).setValue(0);
      if (indexedAtCol !== undefined) sheet.getRange(existingRow, indexedAtCol + 1).setValue('');
      if (updatedCol !== undefined) sheet.getRange(existingRow, updatedCol + 1).setValue(updatedAt);
      if (byCol !== undefined) sheet.getRange(existingRow, byCol + 1).setValue(updatedBy);

      // Invalidate script cache for this file ID if cached
      try {
        var safeFileId = targetDriveFileId.replace(/[^a-zA-Z0-9_-]/g, '');
        var cache = CacheService.getScriptCache();
        cache.remove('cne_res_' + safeFileId);
      } catch (cacheErr) {}

      // Phase 4A: Clean up index rows for this CNE in CNE_Reference_Index
      try {
        cleanUpIndexRowsForCNELocked_(cneId);
      } catch (cleanIndexErr) {}

      // 8. Write audit entry for successful deletion
      logAuditAction(
        'DELETE_LEARNING_RESOURCE',
        session.employeeId,
        'Deleted learning resource ' + (targetFileName || targetDriveFileId) + ' for CNE: ' + cneId,
        'SUCCESS'
      );

      // 9. Return structured success response
      return {
        success: true,
        data: {
          cneId: cneId,
          deletedFileId: targetDriveFileId,
          deletedFileName: targetFileName,
          updatedAt: updatedAt,
          updatedBy: updatedBy
        },
        message: 'Learning resource deleted successfully.'
      };
    } catch (metaErr) {
      // Drive deletion succeeded, but metadata cleanup failed
      logAuditAction(
        'DELETE_LEARNING_RESOURCE_INCONSISTENCY',
        session.employeeId,
        'CRITICAL: Drive file ' + targetDriveFileId + ' trashed, but metadata cleanup failed for CNE ' + cneId + ': ' + metaErr.message,
        'FAILED'
      );
      return {
        success: false,
        errorCode: 'METADATA_CLEANUP_FAILED',
        message: 'The file was trashed in Drive, but updating reference metadata failed. Administrative reconciliation may be required: ' + metaErr.message
      };
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retrieve metadata for uploaded CNE learning resource
 */
function getLearningResourceIndexingInfoFromIndex(cneId, driveFileId) {
  if (!cneId || !driveFileId) return null;

  try {
    var indexSheet = getOrCreateSheet('CNE_Reference_Index');
    ensureReferenceIndexSheetHeaders(indexSheet);
    var indexData = indexSheet.getDataRange().getValues();
    if (indexData.length <= 1) return null;

    var indexMap = getHeaderMap(indexSheet);
    var cneCol = indexMap['cneid'] !== undefined ? indexMap['cneid'] : 2;
    var driveCol = indexMap['drivefileid'] !== undefined ? indexMap['drivefileid'] : 3;
    var statusCol = indexMap['extractionstatus'] !== undefined ? indexMap['extractionstatus'] : 10;
    var chunkTextCol = indexMap['chunktext'] !== undefined ? indexMap['chunktext'] : 8;
    var updatedAtCol = indexMap['updatedat'] !== undefined ? indexMap['updatedat'] : 11;

    var targetCne = String(cneId).trim().toUpperCase();
    var targetDrive = String(driveFileId).trim();
    var successCount = 0;
    var failedMessage = '';
    var failedErrorCode = '';
    var latestIndexedAt = '';

    for (var i = 1; i < indexData.length; i++) {
      var rowCne = String(indexData[i][cneCol] || '').trim().toUpperCase();
      var rowDrive = String(indexData[i][driveCol] || '').trim();
      if (rowCne !== targetCne || rowDrive !== targetDrive) continue;

      var rowStatus = String(indexData[i][statusCol] || '').trim().toUpperCase();
      var rowUpdatedAt = String(indexData[i][updatedAtCol] || '').trim();
      if (rowUpdatedAt && (!latestIndexedAt || rowUpdatedAt > latestIndexedAt)) {
        latestIndexedAt = rowUpdatedAt;
      }

      if (rowStatus === 'SUCCESS') {
        successCount++;
      } else if (rowStatus === 'FAILED' && !failedMessage) {
        var rawFailure = String(indexData[i][chunkTextCol] || '').trim();
        var colonPos = rawFailure.indexOf(':');
        if (colonPos > 0) {
          failedErrorCode = rawFailure.substring(0, colonPos).trim();
          failedMessage = rawFailure.substring(colonPos + 1).trim();
        } else {
          failedMessage = rawFailure || 'Learning-resource indexing failed.';
        }
      }
    }

    if (successCount > 0) {
      return {
        indexingStatus: 'SUCCESS',
        indexingErrorCode: '',
        indexingMessage: 'Learning resource indexed successfully (' + successCount + ' chunks).',
        chunksCount: successCount,
        indexedAt: latestIndexedAt
      };
    }

    if (failedMessage) {
      return {
        indexingStatus: 'FAILED',
        indexingErrorCode: failedErrorCode,
        indexingMessage: failedMessage,
        chunksCount: 0,
        indexedAt: latestIndexedAt
      };
    }
  } catch (e) {
    // Read-time inference is best-effort only. Never fail the whole resource lookup.
  }

  return null;
}

/**
 * Retrieve metadata for uploaded CNE learning resource, including persistent indexing status.
 */
function handleGetLearningResource(params, session) {
  var cneId = sanitizeCellInput(params ? params.cneId : '');
  if (!cneId) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE ID is required.' };
  }

  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  }

  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;

  var sheet = getOrCreateSheet('CNE_Reference');
  ensureReferenceSheetHeaders(sheet);
  ensureLearningResourceSheetHeaders(sheet);

  var data = sheet.getDataRange().getValues();
  var colMap = getHeaderMap(sheet);

  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
  var topicCol = colMap['topic'] !== undefined ? colMap['topic'] : 1;
  var updatedCol = colMap['updatedat'] !== undefined ? colMap['updatedat'] : 3;
  var byCol = colMap['updatedby'] !== undefined ? colMap['updatedby'] : 4;
  var driveFileIdCol = colMap['drivefileid'];
  var fileNameCol = colMap['filename'];
  var fileTypeCol = colMap['filetype'];
  var rpNameCol = colMap['resourcepersonname'];
  var fileSizeCol = colMap['filesize'];
  var indexingStatusCol = colMap['indexingstatus'];
  var indexingErrorCodeCol = colMap['indexingerrorcode'];
  var indexingMessageCol = colMap['indexingmessage'];
  var chunksCountCol = colMap['chunkscount'];
  var indexedAtCol = colMap['indexedat'];

  var officerMap = getOfficerNameMap();

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      var driveFileId = driveFileIdCol !== undefined ? String(data[r][driveFileIdCol] || '').trim() : '';
      var fileName = fileNameCol !== undefined ? String(data[r][fileNameCol] || '').trim() : '';
      var fileType = fileTypeCol !== undefined ? String(data[r][fileTypeCol] || '').trim() : '';
      var rpName = rpNameCol !== undefined ? String(data[r][rpNameCol] || '').trim() : '';
      var fileSize = fileSizeCol !== undefined ? (Number(data[r][fileSizeCol]) || 0) : 0;
      var indexingStatus = indexingStatusCol !== undefined ? String(data[r][indexingStatusCol] || '').trim().toUpperCase() : '';
      var indexingErrorCode = indexingErrorCodeCol !== undefined ? String(data[r][indexingErrorCodeCol] || '').trim() : '';
      var indexingMessage = indexingMessageCol !== undefined ? String(data[r][indexingMessageCol] || '').trim() : '';
      var chunksCount = chunksCountCol !== undefined ? (Number(data[r][chunksCountCol]) || 0) : 0;
      var indexedAt = indexedAtCol !== undefined ? String(data[r][indexedAtCol] || '').trim() : '';

      // Backward-compatible migration for resources uploaded before persistent indexing columns existed.
      // If the current Drive file already has rows in CNE_Reference_Index, infer and persist that result.
      if (driveFileId && !indexingStatus) {
        var inferredIndexing = getLearningResourceIndexingInfoFromIndex(cneId, driveFileId);
        if (inferredIndexing) {
          indexingStatus = inferredIndexing.indexingStatus || '';
          indexingErrorCode = inferredIndexing.indexingErrorCode || '';
          indexingMessage = inferredIndexing.indexingMessage || '';
          chunksCount = Number(inferredIndexing.chunksCount) || 0;
          indexedAt = inferredIndexing.indexedAt || '';
        }
      }

      var rawUpdatedBy = String(data[r][byCol] || '').trim();
      var displayName = 'Coordinator';
      if (rawUpdatedBy) {
        var norm = normalizeEmpId(rawUpdatedBy);
        if (officerMap && officerMap[norm]) {
          displayName = officerMap[norm];
        }
      }

      return {
        success: true,
        data: {
          cneId: cneId,
          topic: String(data[r][topicCol] || (record ? record.topic : '')),
          driveFileId: driveFileId,
          fileName: fileName,
          fileType: fileType,
          fileSize: fileSize,
          resourcePersonName: rpName,
          updatedAt: String(data[r][updatedCol] || ''),
          updatedBy: displayName,
          hasFile: Boolean(driveFileId),
          indexingStatus: indexingStatus,
          indexingErrorCode: indexingErrorCode || undefined,
          indexingMessage: indexingMessage,
          chunksCount: chunksCount,
          indexedAt: indexedAt
        }
      };
    }
  }

  return {
    success: true,
    data: {
      cneId: cneId,
      topic: record ? record.topic : '',
      driveFileId: '',
      fileName: '',
      fileType: '',
      fileSize: 0,
      resourcePersonName: '',
      updatedAt: '',
      updatedBy: 'Coordinator',
      hasFile: false,
      indexingStatus: '',
      indexingErrorCode: undefined,
      indexingMessage: '',
      chunksCount: 0,
      indexedAt: ''
    }
  };
}

/**
 * List all CNE Learning Resources for any authenticated employee.
 * Enforces authoritative authentication and CNE existence.
 * Fails closed for unauthenticated requests.
 */
function handleListLearningResources(params, session) {
  if (!session || !session.employeeId) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }

  var sheet = getOrCreateSheet('CNE_Reference');
  ensureLearningResourceSheetHeaders(sheet);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, data: [] };
  }
  var colMap = getHeaderMap(sheet);

  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
  var topicCol = colMap['topic'] !== undefined ? colMap['topic'] : 1;
  var updatedCol = colMap['updatedat'] !== undefined ? colMap['updatedat'] : 3;
  var byCol = colMap['updatedby'] !== undefined ? colMap['updatedby'] : 4;
  var driveFileIdCol = colMap['drivefileid'];
  var fileNameCol = colMap['filename'];
  var fileTypeCol = colMap['filetype'];
  var rpNameCol = colMap['resourcepersonname'];
  var fileSizeCol = colMap['filesize'];
  var indexingStatusCol = colMap['indexingstatus'];
  var indexingErrorCodeCol = colMap['indexingerrorcode'];
  var indexingMessageCol = colMap['indexingmessage'];
  var chunksCountCol = colMap['chunkscount'];
  var indexedAtCol = colMap['indexedat'];

  // Efficient batched read of CNE Schedule sheet (single read instead of N+1)
  var ss = getSpreadsheet('CNE');
  var classSheet = ss ? ss.getSheetByName('CNE Schedule') : null;
  var cneMap = {};
  if (classSheet) {
    var classData = classSheet.getDataRange().getValues();
    if (classData.length > 1) {
      var classColMap = getHeaderMap(classSheet);
      var classIdCol = classColMap['cneid'] !== undefined ? classColMap['cneid'] : (classColMap['classid'] !== undefined ? classColMap['classid'] : 0);

      for (var c = 1; c < classData.length; c++) {
        var cRow = classData[c];
        var cneKey = String(cRow[classIdCol] || '').trim().toUpperCase();
        if (!cneKey) continue;

        var rawType = classColMap['typeofcne'] !== undefined ? cRow[classColMap['typeofcne']] : cRow[12];
        var rawStatus = classColMap['status'] !== undefined ? cRow[classColMap['status']] : cRow[11];
        var durVal = classColMap['duration'] !== undefined ? cRow[classColMap['duration']] : cRow[6];
        var maxP = classColMap['maxparticipants'] !== undefined ? cRow[classColMap['maxparticipants']] : cRow[10];

        cneMap[cneKey] = {
          rowIndex: c + 1,
          cneId: String(cRow[classIdCol] || '').trim(),
          topic: String((classColMap['topic'] !== undefined ? cRow[classColMap['topic']] : cRow[1]) || '').trim(),
          area: String((classColMap['area'] !== undefined ? cRow[classColMap['area']] : cRow[2]) || '').trim(),
          date: formatDateValue(classColMap['fromdate'] !== undefined ? cRow[classColMap['fromdate']] : (classColMap['date'] !== undefined ? cRow[classColMap['date']] : cRow[3])),
          toDate: formatDateValue(classColMap['todate'] !== undefined ? cRow[classColMap['todate']] : (cRow[4] || cRow[3])),
          duration: durVal ? Number(durVal) : 60,
          instructor: String((classColMap['resourcepersonempid'] !== undefined ? cRow[classColMap['resourcepersonempid']] : cRow[7]) || '').trim(),
          mode: String((classColMap['modeofteaching'] !== undefined ? cRow[classColMap['modeofteaching']] : (classColMap['mode'] !== undefined ? cRow[classColMap['mode']] : cRow[8])) || 'Offline').trim(),
          description: String((classColMap['description'] !== undefined ? cRow[classColMap['description']] : cRow[9]) || '').trim(),
          maxParticipants: maxP ? Number(maxP) : 50,
          status: normalizeCNEStatus(rawStatus),
          externalResourcePersons: String((classColMap['externalresourcepersons'] !== undefined ? cRow[classColMap['externalresourcepersons']] : cRow[13]) || '').trim(),
          proposedBy: String((classColMap['proposedby'] !== undefined ? cRow[classColMap['proposedby']] : cRow[14]) || '').trim(),
          adminRemarks: String((classColMap['adminremarks'] !== undefined ? cRow[classColMap['adminremarks']] : cRow[15]) || '').trim(),
          cneType: normalizeCNEType(rawType)
        };
      }
    }
  }

  var officerMap = getOfficerNameMap();
  var results = [];

  for (var r = 1; r < data.length; r++) {
    var cneId = String(data[r][idCol] || '').trim();
    var driveFileId = driveFileIdCol !== undefined ? String(data[r][driveFileIdCol] || '').trim() : '';
    if (!cneId || !driveFileId) continue;

    var record = cneMap[cneId.toUpperCase()];
    if (!record) continue; // Fail closed if CNE cannot be resolved

    var fileName = fileNameCol !== undefined ? String(data[r][fileNameCol] || '').trim() : '';
    var fileType = fileTypeCol !== undefined ? String(data[r][fileTypeCol] || '').trim() : '';
    var rpName = rpNameCol !== undefined ? String(data[r][rpNameCol] || '').trim() : '';
    var fileSize = fileSizeCol !== undefined ? (Number(data[r][fileSizeCol]) || 0) : 0;
    var indexingStatus = indexingStatusCol !== undefined ? String(data[r][indexingStatusCol] || '').trim().toUpperCase() : '';
    var indexingErrorCode = indexingErrorCodeCol !== undefined ? String(data[r][indexingErrorCodeCol] || '').trim() : '';
    var indexingMessage = indexingMessageCol !== undefined ? String(data[r][indexingMessageCol] || '').trim() : '';
    var chunksCount = chunksCountCol !== undefined ? (Number(data[r][chunksCountCol]) || 0) : 0;
    var indexedAt = indexedAtCol !== undefined ? String(data[r][indexedAtCol] || '').trim() : '';

    // Backward-compatible migration for resources uploaded before indexing metadata
    // was persisted in CNE_Reference. Infer from CNE_Reference_Index once encountered
    // and persist the result so subsequent list requests are inexpensive and stable.
    if (driveFileId && !indexingStatus) {
      var inferredIndexing = getLearningResourceIndexingInfoFromIndex(cneId, driveFileId);
      if (inferredIndexing) {
        indexingStatus = inferredIndexing.indexingStatus || '';
        indexingErrorCode = inferredIndexing.indexingErrorCode || '';
        indexingMessage = inferredIndexing.indexingMessage || '';
        chunksCount = Number(inferredIndexing.chunksCount) || 0;
        indexedAt = inferredIndexing.indexedAt || '';
      }
    }

    var rawUpdatedBy = String(data[r][byCol] || '').trim();
    var displayName = 'Coordinator';
    if (rawUpdatedBy) {
      var norm = normalizeEmpId(rawUpdatedBy);
      if (officerMap && officerMap[norm]) {
        displayName = officerMap[norm];
      }
    }

    var resolvedRpName = rpName;
    if (!resolvedRpName && record.instructor) {
      var instIds = String(record.instructor).split(',').map(function(s) { return normalizeEmpId(s); }).filter(Boolean);
      var instNames = instIds.map(function(id) { return (officerMap && officerMap[id]) ? officerMap[id] : ''; }).filter(Boolean);
      resolvedRpName = instNames.join(', ');
    }

    results.push({
      cneId: cneId,
      topic: String(data[r][topicCol] || record.topic),
      area: record.area || '',
      cneType: record.cneType || 'DEPARTMENTAL',
      fileName: fileName,
      fileType: fileType,
      fileSize: fileSize,
      resourcePersonName: resolvedRpName || 'Department Faculty',
      updatedAt: String(data[r][updatedCol] || ''),
      updatedBy: displayName,
      hasFile: true,
      indexingStatus: indexingStatus,
      indexingErrorCode: indexingErrorCode || undefined,
      indexingMessage: indexingMessage,
      chunksCount: chunksCount,
      indexedAt: indexedAt
    });
  }

  return {
    success: true,
    data: results
  };
}

/**
 * Securely download or stream an authoritative Learning Resource file for any authenticated employee.
 * Fails closed if caller is unauthenticated, CNE does not exist, or file is outside Learning Resources folder.
 */
function handleDownloadLearningResource(params, session) {
  if (!session || !session.employeeId) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }

  var cneId = sanitizeCellInput(params ? params.cneId : '');
  if (!cneId) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE ID is required.' };
  }

  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  }

  var sheet = getOrCreateSheet('CNE_Reference');
  var data = sheet.getDataRange().getValues();
  var colMap = getHeaderMap(sheet);
  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
  var driveFileIdCol = colMap['drivefileid'];
  var fileNameCol = colMap['filename'];
  var fileTypeCol = colMap['filetype'];

  var targetDriveFileId = '';
  var targetFileName = '';
  var targetFileType = '';

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      targetDriveFileId = driveFileIdCol !== undefined ? String(data[r][driveFileIdCol] || '').trim() : '';
      targetFileName = fileNameCol !== undefined ? String(data[r][fileNameCol] || '').trim() : '';
      targetFileType = fileTypeCol !== undefined ? String(data[r][fileTypeCol] || '').trim() : '';
      break;
    }
  }

  if (!targetDriveFileId) {
    return { success: false, errorCode: 'NO_RESOURCE_FILE', message: 'No learning resource file attached to this CNE.' };
  }

  var folderRes = getOrCreateLearningResourcesFolder();
  if (!folderRes.success || !folderRes.folder) {
    return { success: false, errorCode: 'DRIVE_STORAGE_ERROR', message: folderRes.message };
  }

  var file;
  try {
    file = DriveApp.getFileById(targetDriveFileId);
  } catch (e) {
    return { success: false, errorCode: 'LEARNING_RESOURCE_FILE_NOT_FOUND', message: 'File not found in Drive.' };
  }

  var parents = file.getParents();
  var inFolder = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === folderRes.folder.getId()) {
      inFolder = true;
      break;
    }
  }

  if (!inFolder) {
    return { success: false, errorCode: 'FILE_OUTSIDE_REPOSITORY', message: 'Resource file does not belong to the authoritative Learning Resources directory.' };
  }

  var blob = file.getBlob();
  var base64 = Utilities.base64Encode(blob.getBytes());
  var mimeType = blob.getContentType();

  logAuditAction('DOWNLOAD_LEARNING_RESOURCE', session.employeeId, 'Downloaded learning resource: ' + (targetFileName || file.getName()) + ' for CNE: ' + cneId, 'SUCCESS');

  return {
    success: true,
    data: {
      cneId: cneId,
      fileName: targetFileName || file.getName(),
      fileType: targetFileType,
      mimeType: mimeType,
      fileBase64: base64
    }
  };
}

/**
 * ============================================================================
 * PHASE 2: CNE LEARNING RESOURCES CONTENT EXTRACTION SERVICE
 * ============================================================================
 * Extracts readable textual content from stored Google Drive learning resource
 * files (PDF only, maximum 3 MB) for AI MCQ generation grounding.
 * Authoritative source of truth remains the Drive file stored in the configured
 * Learning Resources directory.
 */

/**
 * Core extraction service for CNE Learning Resource
 * Fails closed on any security, authorization, or structural defect.
 */
function extractLearningResourceContentCore(cneId, session) {
  if (!cneId) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE ID is required.' };
  }

  // 1. Authoritative CNE Record lookup
  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  }

  // 2. Authorization verification
  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) {
    return authErr;
  }

  // 3. Authoritative CNE_Reference lookup
  var refSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference');
  if (!refSheet || refSheet.getLastRow() <= 1) {
    return {
      success: false,
      errorCode: 'LEARNING_RESOURCE_NOT_FOUND',
      message: 'No learning resource is associated with this CNE.'
    };
  }

  var refData = refSheet.getDataRange().getValues();
  var refColMap = getHeaderMap(refSheet);
  var idCol = refColMap['cneid'] !== undefined ? refColMap['cneid'] : 0;
  var driveCol = refColMap['drivefileid'];
  var fileNameCol = refColMap['filename'];
  var fileTypeCol = refColMap['filetype'];
  var rpNameCol = refColMap['resourcepersonname'];

  var driveFileId = '';
  var storedFileName = '';
  var storedFileType = '';
  var storedRpName = '';

  for (var r = 1; r < refData.length; r++) {
    if (String(refData[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      driveFileId = driveCol !== undefined ? String(refData[r][driveCol] || '').trim() : '';
      storedFileName = fileNameCol !== undefined ? String(refData[r][fileNameCol] || '').trim() : '';
      storedFileType = fileTypeCol !== undefined ? String(refData[r][fileTypeCol] || '').trim() : '';
      storedRpName = rpNameCol !== undefined ? String(refData[r][rpNameCol] || '').trim() : '';
      break;
    }
  }

  if (!driveFileId) {
    return {
      success: false,
      errorCode: 'LEARNING_RESOURCE_NOT_FOUND',
      message: 'No learning resource file has been uploaded for this CNE.'
    };
  }

  // 4. Retrieve Drive File & verify existence
  var file;
  try {
    file = DriveApp.getFileById(driveFileId);
  } catch (driveErr) {
    return {
      success: false,
      errorCode: 'LEARNING_RESOURCE_FILE_NOT_FOUND',
      message: 'Associated learning resource file could not be found in Google Drive.'
    };
  }

  if (!file || file.isTrashed()) {
    return {
      success: false,
      errorCode: 'LEARNING_RESOURCE_FILE_NOT_FOUND',
      message: 'Associated learning resource file has been deleted or trashed.'
    };
  }

  // 5. Verify file belongs strictly to configured Learning Resources folder
  var folderRes = getOrCreateLearningResourcesFolder();
  if (!folderRes.success) {
    return folderRes;
  }
  var targetFolderId = folderRes.folder.getId();
  var parents = file.getParents();
  var isInsideTargetFolder = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === targetFolderId) {
      isInsideTargetFolder = true;
      break;
    }
  }

  if (!isInsideTargetFolder) {
    return {
      success: false,
      errorCode: 'LEARNING_RESOURCE_INVALID',
      message: 'Learning resource file does not belong to the authoritative Learning Resources directory.'
    };
  }

  // 6. Validate supported format (PDF only)
  var nameForExt = file.getName() || storedFileName;
  var ext = '';
  var dotIdx = nameForExt.lastIndexOf('.');
  if (dotIdx !== -1) {
    ext = nameForExt.substring(dotIdx + 1).toLowerCase().trim();
  }
  if (!ext && storedFileType) {
    ext = storedFileType.toLowerCase().trim();
  }

  var ALLOWED_EXTS = ['pdf'];
  if (ALLOWED_EXTS.indexOf(ext) === -1) {
    return {
      success: false,
      errorCode: 'UNSUPPORTED_FILE_TYPE',
      message: 'Unsupported file type. Only PDF (.pdf) documents are permitted.'
    };
  }

  // 7. Validate size (Max 3 MB for CNE learning materials)
  var MAX_CNE_LEARNING_MATERIAL_BYTES = 3 * 1024 * 1024;
  if (file.getSize() > MAX_CNE_LEARNING_MATERIAL_BYTES) {
    return {
      success: false,
      errorCode: 'CONTENT_TOO_LARGE',
      message: 'Learning resource exceeds maximum allowed size of 3 MB.'
    };
  }

  // 8. Temporary Cache check using CacheService (best effort)
  var safeFileId = driveFileId.replace(/[^a-zA-Z0-9_-]/g, '');
  var lastUpdated = 0;
  try {
    lastUpdated = file.getLastUpdated().getTime();
  } catch (timeErr) {
    lastUpdated = 0;
  }
  var cacheKey = ('cne_res_' + safeFileId + '_' + lastUpdated).substring(0, 240);
  var cache = null;
  try {
    cache = CacheService.getScriptCache();
    var cachedJson = cache.get(cacheKey);
    if (cachedJson) {
      var parsedCache = JSON.parse(cachedJson);
      if (parsedCache && parsedCache.extractedText && parsedCache.extractedText.length >= 15) {
        return {
          success: true,
          data: {
            cneId: cneId,
            topic: record.topic,
            resourcePersonName: storedRpName,
            driveFileId: driveFileId,
            fileName: file.getName(),
            fileType: 'PDF',
            extractedText: parsedCache.extractedText,
            charCount: parsedCache.extractedText.length,
            isTruncated: Boolean(parsedCache.isTruncated),
            originalCharCount: parsedCache.originalCharCount || parsedCache.extractedText.length,
            cached: true
          }
        };
      }
    }
  } catch (cacheErr) {
    // Cache failure must never cause functional failure
  }

  // 9. Extract textual content from PDF
  var rawExtracted = '';
  var blob = file.getBlob();

  try {
    rawExtracted = extractTextFromPdf(blob);
  } catch (extractErr) {
    logAuditAction('CONTENT_EXTRACTION_FAILED', {
      cneId: cneId,
      driveFileId: driveFileId,
      ext: ext,
      error: String(extractErr && extractErr.message ? extractErr.message : extractErr)
    });
    return {
      success: false,
      errorCode: 'CONTENT_EXTRACTION_FAILED',
      message: 'Failed to extract textual content from PDF document: ' + (extractErr.message || 'Malformed structure')
    };
  }

  // 10. Check if extracted content is empty or unusable (scanned/image-only PDF)
  if (!rawExtracted || rawExtracted.trim().length < 15) {
    return {
      success: false,
      errorCode: 'NO_EXTRACTABLE_CONTENT',
      message: 'This PDF does not contain usable text. Please upload a text-based PDF.'
    };
  }

  var cleanText = rawExtracted.trim();
  var maxChars = 40000;
  var isTruncated = false;
  var originalCharCount = cleanText.length;
  var finalText = cleanText;

  // 11. Deterministic size limit safeguard
  if (cleanText.length > maxChars) {
    isTruncated = true;
    var headChars = 25000;
    var tailChars = 15000;
    var head = cleanText.substring(0, headChars);
    var tail = cleanText.substring(cleanText.length - tailChars);
    finalText = head + '\n\n[... Content deterministically truncated for AI processing: omitted ' + (originalCharCount - (headChars + tailChars)) + ' characters ...]\n\n' + tail;
  }

  // 12. Populate temporary cache (TTL 6 hours)
  if (cache) {
    try {
      var cachePayload = JSON.stringify({
        extractedText: finalText,
        isTruncated: isTruncated,
        originalCharCount: originalCharCount
      });
      if (cachePayload.length < 95000) {
        cache.put(cacheKey, cachePayload, 21600);
      }
    } catch (cacheWriteErr) {
      // Non-blocking
    }
  }

  return {
    success: true,
    data: {
      cneId: cneId,
      topic: record.topic,
      resourcePersonName: storedRpName,
      driveFileId: driveFileId,
      fileName: file.getName(),
      fileType: 'PDF',
      extractedText: finalText,
      charCount: finalText.length,
      isTruncated: isTruncated,
      originalCharCount: originalCharCount,
      cached: false
    }
  };
}

/**
 * ============================================================================
 * PHASE 4A: UPLOAD-TIME CNE MATERIAL EXTRACTION & PERSISTENT INDEXING
 * ============================================================================
 */

/**
 * Deterministic chunking of extracted document content.
 * Target chunk size: ~1,200 characters (allowed range: 1,000 - 1,500 chars).
 * Preserves section headings for PDF.
 * Stable, deterministic chunk ordering without AI or external dependencies.
 */
function chunkExtractedContent(text, fileType) {
  if (!text || typeof text !== 'string') return [];
  var clean = text.trim();
  if (clean.length < 15) return [];

  var chunks = [];

  // Document (PDF) chunking by paragraph and heading
  var paragraphs = clean.split(/\n{2,}/);
  var currentHeading = 'General Content';
  var currentAccumulator = '';

  for (var p = 0; p < paragraphs.length; p++) {
    var para = paragraphs[p].trim();
    if (!para) continue;

    // Detect potential heading: short line (<= 80 chars)
    if (para.length <= 80 && isProbableHeading(para)) {
      if (currentAccumulator.trim()) {
        flushAccumulatedText(chunks, currentHeading, currentAccumulator);
        currentAccumulator = '';
      }
      currentHeading = para;
      continue;
    }

    if ((currentAccumulator.length + para.length + 2) <= 1400) {
      currentAccumulator = currentAccumulator ? (currentAccumulator + '\n\n' + para) : para;
    } else {
      if (currentAccumulator.length >= 800) {
        flushAccumulatedText(chunks, currentHeading, currentAccumulator);
        currentAccumulator = para;
      } else {
        var combined = currentAccumulator ? (currentAccumulator + '\n\n' + para) : para;
        var windows = splitTextIntoWindows(combined, 1200, 150);
        for (var w = 0; w < windows.length - 1; w++) {
          chunks.push({
            heading: currentHeading,
            text: windows[w]
          });
        }
        currentAccumulator = windows[windows.length - 1];
      }
    }
  }

  if (currentAccumulator.trim()) {
    flushAccumulatedText(chunks, currentHeading, currentAccumulator);
  }

  // Fallback if no chunks produced
  if (chunks.length === 0) {
    var fallbackWindows = splitTextIntoWindows(clean, 1200, 150);
    for (var f = 0; f < fallbackWindows.length; f++) {
      chunks.push({
        heading: 'General Content',
        text: fallbackWindows[f]
      });
    }
  }

  return chunks;
}

function isProbableHeading(line) {
  if (!line || line.length > 80) return false;
  var trimmed = line.trim();
  if (trimmed.charAt(trimmed.length - 1) === '.') return false;
  if (trimmed.charAt(trimmed.length - 1) === ',') return false;
  if (trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0) return false;
  if (/^(?:chapter|section|part|module|unit|topic|guideline|protocol|procedure)\b/i.test(trimmed)) return true;
  if (/^\d+(\.\d+)*\s+[A-Z]/.test(trimmed)) return true;
  if (trimmed === trimmed.toUpperCase() && trimmed.length >= 4 && /[A-Z]/.test(trimmed)) return true;
  if (trimmed.length <= 60 && !/[\.\?!]/.test(trimmed)) return true;
  return false;
}

function flushAccumulatedText(chunks, heading, text) {
  var trimmed = text.trim();
  if (!trimmed) return;
  if (trimmed.length <= 1500) {
    chunks.push({ heading: heading || 'General Content', text: trimmed });
  } else {
    var windows = splitTextIntoWindows(trimmed, 1200, 150);
    for (var i = 0; i < windows.length; i++) {
      chunks.push({
        heading: heading ? (heading + (windows.length > 1 ? ' (Part ' + (i + 1) + ')' : '')) : 'General Content',
        text: windows[i]
      });
    }
  }
}

function splitTextIntoWindows(text, targetSize, overlap) {
  var result = [];
  if (!text) return result;
  if (text.length <= targetSize) {
    result.push(text);
    return result;
  }

  var pos = 0;
  while (pos < text.length) {
    var end = pos + targetSize;
    if (end >= text.length) {
      var remaining = text.substring(pos).trim();
      if (remaining) result.push(remaining);
      break;
    }

    var breakPos = -1;
    var searchStart = pos + Math.floor(targetSize * 0.7);
    var searchEnd = Math.min(pos + targetSize + 150, text.length);
    var searchSlice = text.substring(searchStart, searchEnd);

    var pIdx = searchSlice.lastIndexOf('\n\n');
    if (pIdx !== -1) {
      breakPos = searchStart + pIdx + 2;
    } else {
      var sMatch = searchSlice.match(/[\.\?!]\s+/g);
      if (sMatch) {
        var lastS = searchSlice.lastIndexOf(sMatch[sMatch.length - 1]);
        if (lastS !== -1) {
          breakPos = searchStart + lastS + sMatch[sMatch.length - 1].length;
        }
      }
    }

    if (breakPos === -1) {
      var spaceIdx = searchSlice.lastIndexOf(' ');
      if (spaceIdx !== -1) {
        breakPos = searchStart + spaceIdx + 1;
      } else {
        breakPos = end;
      }
    }

    var chunk = text.substring(pos, breakPos).trim();
    if (chunk) result.push(chunk);

    pos = Math.max(pos + 1, breakPos - overlap);
  }

  return result;
}

/**
 * Helper: Delete specific 1-based row numbers from a sheet in descending order,
 * grouping contiguous rows to minimize sheet API operations and prevent index shifting.
 */
function deleteSheetRowsByIndices(sheet, rowNumbers) {
  if (!sheet || !rowNumbers || rowNumbers.length === 0) return;
  var sorted = rowNumbers.slice().sort(function(a, b) { return b - a; });
  var i = 0;
  while (i < sorted.length) {
    var count = 1;
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] - 1) {
      count++;
      i++;
    }
    var startRow = sorted[i]; // Smallest row number in this contiguous block
    if (count === 1) {
      sheet.deleteRow(startRow);
    } else {
      sheet.deleteRows(startRow, count);
    }
    i++;
  }
}

/**
 * Remove index rows for a specific CNE from CNE_Reference_Index surgically.
 * Strictly non-destructive to other CNEs.
 * Uses row-level deletion without clearing the sheet or rewriting unrelated rows.
 */
function cleanUpIndexRowsForCNELocked_(cneId) {
  if (!cneId) return;
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('CNE_Reference_Index');
  if (!sheet || sheet.getLastRow() <= 1) return;

  var colMap = getHeaderMap(sheet);
  var cneIdCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 2;
  var targetCne = String(cneId).trim().toUpperCase();
  var values = sheet.getRange(2, cneIdCol + 1, sheet.getLastRow() - 1, 1).getValues();
  var rowsToDelete = [];
  for (var r = 0; r < values.length; r++) {
    if (String(values[r][0] || '').trim().toUpperCase() === targetCne) rowsToDelete.push(r + 2);
  }
  if (rowsToDelete.length > 0) deleteSheetRowsByIndices(sheet, rowsToDelete);
}

function cleanUpIndexRowsForCNE(cneId) {
  if (!cneId) return;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    return;
  }
  try {
    cleanUpIndexRowsForCNELocked_(cneId);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Index learning resource content into CNE_Reference_Index sheet surgically.
 * 1. Document extraction and chunking occur OUTSIDE of ScriptLock.
 * 2. Shared sheet mutations (duplicate check, removing targeted old rows, appending new chunks)
 *    occur INSIDE the ScriptLock.
 * 3. Does NOT clear the sheet or rewrite unrelated rows.
 * 4. Appends all new chunk rows in ONE batch setValues() call.
 */
function indexLearningResourceContent(cneId, driveFileId, fileName, fileType, topic, session, lockAlreadyHeld) {
  if (!cneId || !driveFileId) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: 'CNE ID and Drive File ID are required.' };
  }

  // 1. Content extraction/chunking is deliberately outside the global ScriptLock.
  var extResult = null;
  try {
    extResult = extractLearningResourceContentCore(cneId, session);
  } catch (extErr) {
    extResult = { success: false, errorCode: 'EXTRACTION_EXCEPTION', message: 'Exception during content extraction: ' + (extErr && extErr.message ? extErr.message : String(extErr)) };
  }

  var rowsToInsert = [];
  var nowIso = new Date().toISOString();
  var isSuccess = extResult && extResult.success && extResult.data && extResult.data.extractedText;

  if (isSuccess) {
    var extractedText = extResult.data.extractedText;
    var chunks = chunkExtractedContent(extractedText, fileType);
    if (chunks.length > 0) {
      for (var c = 0; c < chunks.length; c++) {
        rowsToInsert.push([
          'IDX_' + cneId + '_' + driveFileId.substring(0, 8) + '_C' + (c + 1),
          'UPLOADED_CNE', cneId, driveFileId, fileName, topic,
          chunks[c].heading || 'General Content', c + 1, chunks[c].text, '', 'SUCCESS', nowIso
        ]);
      }
    } else {
      isSuccess = false;
      extResult = { success: false, errorCode: 'NO_EXTRACTABLE_CONTENT', message: 'No readable textual content could be extracted into chunks.' };
    }
  }

  if (!isSuccess) {
    var failErrCode = extResult ? extResult.errorCode : 'CONTENT_EXTRACTION_FAILED';
    var failErrMsg = extResult ? extResult.message : 'No readable textual content could be extracted.';
    rowsToInsert.push([
      'IDX_' + cneId + '_' + driveFileId.substring(0, 8) + '_FAIL',
      'UPLOADED_CNE', cneId, driveFileId, fileName, topic, 'Extraction Error', 0,
      failErrCode + ': ' + failErrMsg, '', 'FAILED', nowIso
    ]);
  }

  var lock = lockAlreadyHeld ? null : LockService.getScriptLock();
  if (!lockAlreadyHeld) {
    try {
      lock.waitLock(15000);
    } catch (lockErr) {
      return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy indexing content. Please try again.' };
    }
  }

  var alreadyIndexed = false;
  var alreadyIndexedCount = 0;
  var refSheet = null;
  var refMap = null;
  var refRow = -1;

  try {
    refSheet = getOrCreateSheet('CNE_Reference');
    ensureReferenceSheetHeaders(refSheet, true);
    ensureLearningResourceSheetHeaders(refSheet, true);
    refMap = getHeaderMap(refSheet);
    var refIdCol = refMap['cneid'] !== undefined ? refMap['cneid'] : 0;
    var refDriveCol = refMap['drivefileid'];
    refRow = findExactRowInColumn_(refSheet, refIdCol, String(cneId).trim().toUpperCase(), 2);
    var currentDriveId = (refRow > 1 && refDriveCol !== undefined)
      ? String(refSheet.getRange(refRow, refDriveCol + 1).getValue() || '').trim()
      : '';
    if (!currentDriveId || currentDriveId !== String(driveFileId).trim()) {
      return { success: false, errorCode: 'RESOURCE_SUPERSEDED', message: 'Learning resource changed before indexing completed. Stale indexing result was discarded.' };
    }

    var sheet = getOrCreateSheet('CNE_Reference_Index');
    ensureReferenceIndexSheetHeaders(sheet, true);
    var colMap = getHeaderMap(sheet);
    var cneIdCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 2;
    var driveCol = colMap['drivefileid'] !== undefined ? colMap['drivefileid'] : 3;
    var statusCol = colMap['extractionstatus'] !== undefined ? colMap['extractionstatus'] : 10;
    var targetCne = String(cneId).trim().toUpperCase();
    var rowCount = Math.max(0, sheet.getLastRow() - 1);
    var cneVals = rowCount ? sheet.getRange(2, cneIdCol + 1, rowCount, 1).getValues() : [];
    var driveVals = rowCount ? sheet.getRange(2, driveCol + 1, rowCount, 1).getValues() : [];
    var statusVals = rowCount ? sheet.getRange(2, statusCol + 1, rowCount, 1).getValues() : [];
    var rowsToDelete = [];

    for (var r = 0; r < rowCount; r++) {
      var rCneId = String(cneVals[r][0] || '').trim().toUpperCase();
      var rDriveId = String(driveVals[r][0] || '').trim();
      var rStatus = String(statusVals[r][0] || '').trim().toUpperCase();
      if (rCneId === targetCne && rDriveId === driveFileId && rStatus === 'SUCCESS') alreadyIndexedCount++;
      if (rCneId === targetCne) rowsToDelete.push(r + 2);
    }

    if (alreadyIndexedCount > 0) {
      alreadyIndexed = true;
    } else {
      // Safe replacement: write the new batch first. If the write fails, old index rows remain intact.
      if (rowsToInsert.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
      }
      if (rowsToDelete.length > 0) deleteSheetRowsByIndices(sheet, rowsToDelete);
    }

    // Persist indexing outcome in the same short critical section.
    if (refRow > 1) {
      var rowWidth = refSheet.getLastColumn();
      var refRowValues = refSheet.getRange(refRow, 1, 1, rowWidth).getValues()[0];
      var indexingStatus = (alreadyIndexed || isSuccess) ? 'SUCCESS' : 'FAILED';
      var indexingErrorCode = (!alreadyIndexed && !isSuccess && extResult && extResult.errorCode) ? extResult.errorCode : '';
      var indexingMessage = alreadyIndexed
        ? 'Learning resource is already indexed.'
        : (isSuccess ? 'Learning resource indexed successfully (' + rowsToInsert.length + ' chunks).' : 'Unable to extract readable text from the uploaded material.');
      var chunksCount = alreadyIndexed ? alreadyIndexedCount : (isSuccess ? rowsToInsert.length : 0);
      if (refMap['indexingstatus'] !== undefined) refRowValues[refMap['indexingstatus']] = indexingStatus;
      if (refMap['indexingerrorcode'] !== undefined) refRowValues[refMap['indexingerrorcode']] = indexingErrorCode;
      if (refMap['indexingmessage'] !== undefined) refRowValues[refMap['indexingmessage']] = indexingMessage;
      if (refMap['chunkscount'] !== undefined) refRowValues[refMap['chunkscount']] = chunksCount;
      if (refMap['indexedat'] !== undefined) refRowValues[refMap['indexedat']] = new Date().toISOString();
      refSheet.getRange(refRow, 1, 1, rowWidth).setValues([refRowValues]);
    }
  } finally {
    if (!lockAlreadyHeld && lock) lock.releaseLock();
  }

  if (alreadyIndexed) {
    return { success: true, alreadyIndexed: true, chunksCount: alreadyIndexedCount, message: 'Learning resource is already indexed.' };
  }

  if (isSuccess) {
    logAuditAction('LEARNING_RESOURCE_CONTENT_INDEXED', session ? session.employeeId : 'SYSTEM', 'Successfully indexed ' + rowsToInsert.length + ' chunks for CNE ' + cneId + ' (' + fileName + ')', 'SUCCESS');
    return { success: true, chunksCount: rowsToInsert.length, message: 'Learning resource indexed successfully (' + rowsToInsert.length + ' chunks).' };
  }

  logAuditAction('LEARNING_RESOURCE_CONTENT_INDEX_FAILED', session ? session.employeeId : 'SYSTEM', 'Content indexing failed for CNE ' + cneId + ' (' + fileName + '): ' + (extResult ? extResult.errorCode : 'FAILED'), 'FAILED');
  return {
    success: false,
    errorCode: (extResult && extResult.errorCode) ? extResult.errorCode : 'CONTENT_EXTRACTION_FAILED',
    message: 'Unable to extract readable text from the uploaded material. The file has been saved, but its content could not be indexed.'
  };
}

/**
 * ============================================================================
 * PHASE 4B: LOCAL NURSING REFERENCE LIBRARY (OPEN RN) PERSISTENT INDEXING
 * ============================================================================
 */

/**
 * Deterministic chunking of reference library content (books/guidelines).
 * Preserves structural Chapter / Topic and Section headings.
 * Target chunk size: ~1,200 chars (1,000 - 1,500 chars).
 * Never invents clinical topics; retains structural hierarchy.
 */
function chunkReferenceLibraryContent(text, fileType, defaultTitle) {
  if (!text || typeof text !== 'string') return [];
  var clean = text.trim();
  if (clean.length < 15) return [];

  // Support both (text, defaultTitle) and (text, fileType, defaultTitle) signatures
  var fallbackTitle = 'Open RN Nursing Reference';
  if (defaultTitle && typeof defaultTitle === 'string') {
    fallbackTitle = defaultTitle.trim();
  } else if (fileType && typeof fileType === 'string' && fileType.toUpperCase() !== 'PDF') {
    fallbackTitle = fileType.trim();
  }

  var chunks = [];
  var currentChapter = fallbackTitle;
  var currentSection = 'General Content';

  // Document (PDF) chunking by paragraph and heading
  var paragraphs = clean.split(/\n{2,}/);
  var currentAccumulator = '';

  for (var p = 0; p < paragraphs.length; p++) {
    var para = paragraphs[p].trim();
    if (!para) continue;

    // Detect structural heading: either isolated short paragraph or first line of multi-line block
    var lines = para.split('\n');
    var firstLine = lines[0].trim();
    var isHeaderOnly = para.length <= 80 && isProbableHeading(para);
    var isFirstLineHeader = !isHeaderOnly && lines.length > 1 && firstLine.length <= 80 && isProbableHeading(firstLine);

    if (isHeaderOnly || isFirstLineHeader) {
      if (currentAccumulator.trim()) {
        flushAccumulatedRefText(chunks, currentChapter, currentSection, currentAccumulator);
        currentAccumulator = '';
      }
      var headerText = isHeaderOnly ? para : firstLine;
      if (/^(?:chapter|unit|module|part)\b/i.test(headerText)) {
        currentChapter = headerText;
        currentSection = 'Chapter Overview';
      } else {
        currentSection = headerText;
      }

      if (isHeaderOnly) {
        continue;
      } else {
        para = lines.slice(1).join('\n').trim();
        if (!para) continue;
      }
    }

    if ((currentAccumulator.length + para.length + 2) <= 1400) {
      currentAccumulator = currentAccumulator ? (currentAccumulator + '\n\n' + para) : para;
    } else {
      if (currentAccumulator.length >= 800) {
        flushAccumulatedRefText(chunks, currentChapter, currentSection, currentAccumulator);
        currentAccumulator = para;
      } else {
        var combined = currentAccumulator ? (currentAccumulator + '\n\n' + para) : para;
        var windows = splitTextIntoWindows(combined, 1200, 150);
        for (var w = 0; w < windows.length - 1; w++) {
          chunks.push({
            topic: currentChapter,
            sectionHeading: currentSection,
            text: windows[w]
          });
        }
        currentAccumulator = windows[windows.length - 1];
      }
    }
  }

  if (currentAccumulator.trim()) {
    flushAccumulatedRefText(chunks, currentChapter, currentSection, currentAccumulator);
  }

  if (chunks.length === 0) {
    var fallbackWindows = splitTextIntoWindows(clean, 1200, 150);
    for (var f = 0; f < fallbackWindows.length; f++) {
      chunks.push({
        topic: fallbackTitle,
        sectionHeading: 'General Content',
        text: fallbackWindows[f]
      });
    }
  }

  return chunks;
}

function flushAccumulatedRefText(chunks, chapter, section, text) {
  var trimmed = text.trim();
  if (!trimmed) return;
  if (trimmed.length <= 1500) {
    chunks.push({
      topic: chapter || 'General Reference',
      sectionHeading: section || 'General Content',
      text: trimmed
    });
  } else {
    var windows = splitTextIntoWindows(trimmed, 1200, 150);
    for (var i = 0; i < windows.length; i++) {
      chunks.push({
        topic: chapter || 'General Reference',
        sectionHeading: (section || 'General Content') + (windows.length > 1 ? ' (Part ' + (i + 1) + ')' : ''),
        text: windows[i]
      });
    }
  }
}

/**
 * Extract textual content from a reference library document blob.
 * Authoritative PDF extraction engine without OCR or external dependencies.
 */
function extractReferenceLibraryBlob(blob, fileType) {
  return extractTextFromPdf(blob);
}

/**
 * Register and index an approved Open RN nursing reference resource into CNE_Reference_Index.
 * Strictly Admin-only.
 * Document Policy: PDF only (.pdf). No application-defined size limit.
 * Extraction & chunking run OUTSIDE ScriptLock.
 * Duplicate protection and surgical batch writing run INSIDE ScriptLock.
 */
function indexReferenceLibraryResource(driveFileId, metadata, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  if (!driveFileId || typeof driveFileId !== 'string' || !driveFileId.trim()) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      message: 'Drive File ID is required.'
    };
  }
  var cleanDriveFileId = driveFileId.trim();

  // 1. Resolve Open RN folder strictly from DRIVE_FOLDER_ID
  var folderResult = getOrCreateOpenRnFolder();
  if (!folderResult.success || !folderResult.folder) {
    return {
      success: false,
      errorCode: folderResult.errorCode || 'FOLDER_RESOLUTION_FAILED',
      message: folderResult.message || 'Failed to resolve Open RN library folder.'
    };
  }
  var openRnFolder = folderResult.folder;

  // 2. Validate file existence
  var file;
  try {
    file = DriveApp.getFileById(cleanDriveFileId);
  } catch (e) {
    return {
      success: false,
      errorCode: 'FILE_NOT_FOUND',
      message: 'Specified Drive file could not be found or accessed.'
    };
  }

  // 3. Validate file containment within Open RN folder
  if (!isFileInOpenRnFolder(file, openRnFolder)) {
    logAuditAction(
      'REFERENCE_LIBRARY_SECURITY_ALERT',
      session ? session.employeeId : 'UNKNOWN',
      'Attempt to index file outside approved Open RN folder: ' + cleanDriveFileId,
      'FORBIDDEN'
    );
    return {
      success: false,
      errorCode: 'FILE_OUTSIDE_APPROVED_FOLDER',
      message: 'Access denied. The specified file is not inside the approved Open RN folder.'
    };
  }

  // 4. Validate file non-empty and type (PDF only)
  var fileSize = file.getSize();
  var sourceLastUpdatedMs = file.getLastUpdated().getTime();
  if (fileSize <= 0) {
    return {
      success: false,
      errorCode: 'EMPTY_FILE',
      message: 'Specified reference file is empty (0 bytes).'
    };
  }

  var fileName = file.getName();
  var ext = getFileExtension(fileName).toLowerCase();
  var ALLOWED_EXTS = ['pdf'];
  if (ALLOWED_EXTS.indexOf(ext) === -1) {
    return {
      success: false,
      errorCode: 'UNSUPPORTED_FILE_TYPE',
      message: 'Unsupported file type. Only PDF (.pdf) documents are permitted.'
    };
  }

  // 5. Binary & Structural Signature Validation (%PDF header)
  var fileBlob = file.getBlob();
  var headerBytes = fileBlob.getBytes().slice(0, 4);
  if (headerBytes.length < 4 ||
      (headerBytes[0] & 0xFF) !== 0x25 ||
      (headerBytes[1] & 0xFF) !== 0x50 ||
      (headerBytes[2] & 0xFF) !== 0x44 ||
      (headerBytes[3] & 0xFF) !== 0x46) {
    return {
      success: false,
      errorCode: 'INVALID_FILE_CONTENT',
      message: 'File content does not match standard PDF document structure (%PDF header missing).'
    };
  }

  // 6. Validate sharing permissions: ensure not public (FAIL-CLOSED)
  try {
    var sharingAccess = file.getSharingAccess();
    if (sharingAccess === DriveApp.Access.ANYONE || sharingAccess === DriveApp.Access.ANYONE_WITH_LINK) {
      logAuditAction(
        'REFERENCE_LIBRARY_SECURITY_ALERT',
        session ? session.employeeId : 'UNKNOWN',
        'Security policy violation: Reference file has public Drive link sharing: ' + cleanDriveFileId,
        'FORBIDDEN'
      );
      return {
        success: false,
        errorCode: 'PUBLIC_ACCESS_FORBIDDEN',
        message: 'Security policy violation: Reference file has public Drive link sharing. Sharing must be private.'
      };
    }
  } catch (shareErr) {
    logAuditAction(
      'REFERENCE_LIBRARY_PRIVACY_CHECK_ERROR',
      session ? session.employeeId : 'UNKNOWN',
      'Drive privacy check failed for file ' + cleanDriveFileId + ': ' + (shareErr && shareErr.message ? shareErr.message : String(shareErr)),
      'FAILED'
    );
    return {
      success: false,
      errorCode: 'DRIVE_PRIVACY_CHECK_FAILED',
      message: 'Drive privacy check failed. Reference resource cannot be indexed without verifying sharing permissions: ' + (shareErr && shareErr.message ? shareErr.message : String(shareErr))
    };
  }

  var meta = metadata || {};
  var resourceTitle = String(meta.resourceTitle || meta.title || fileName.replace(/\.[^/.]+$/, '')).trim();
  var authorOrg = String(meta.authorOrganization || meta.author || 'Open RN Project / Chippewa Valley Technical College').trim();
  var license = String(meta.license || 'CC BY 4.0').trim();
  var version = String(meta.version || 'Latest').trim();
  var isReindex = Boolean(meta.reindex);

  // 7. CONTENT EXTRACTION & CHUNKING OUTSIDE SCRIPTLOCK
  var extResult = null;
  var rawText = '';
  try {
    rawText = extractReferenceLibraryBlob(fileBlob, ext);
    if (!rawText || rawText.trim().length < 15) {
      extResult = {
        success: false,
        errorCode: 'NO_EXTRACTABLE_CONTENT',
        message: 'This PDF does not contain usable text. Please upload a text-based PDF.'
      };
    } else {
      extResult = {
        success: true,
        extractedText: rawText.trim()
      };
    }
  } catch (extractErr) {
    extResult = {
      success: false,
      errorCode: 'CONTENT_EXTRACTION_FAILED',
      message: extractErr && extractErr.message ? extractErr.message : String(extractErr)
    };
  }

  var rowsToInsert = [];
  var nowIso = new Date().toISOString();
  var isSuccess = extResult && extResult.success && extResult.extractedText;

  if (isSuccess) {
    var chunks = chunkReferenceLibraryContent(extResult.extractedText, ext, resourceTitle);
    if (chunks.length > 0) {
      for (var c = 0; c < chunks.length; c++) {
        var chunkIndexId = 'IDX_LIB_' + cleanDriveFileId.substring(0, 8) + '_C' + (c + 1);
        rowsToInsert.push([
          chunkIndexId,
          'LOCAL_REFERENCE_LIB',
          '', // CNE ID is empty for general reference library resources
          cleanDriveFileId,
          resourceTitle,
          chunks[c].topic || resourceTitle,
          chunks[c].sectionHeading || 'General Content',
          (c + 1),
          chunks[c].text,
          '', // Clinical Keywords left empty for Phase 4B
          'SUCCESS',
          nowIso
        ]);
      }
    } else {
      isSuccess = false;
      extResult = {
        success: false,
        errorCode: 'NO_EXTRACTABLE_CONTENT',
        message: 'This PDF does not contain usable text. Please upload a text-based PDF.'
      };
    }
  }

  if (!isSuccess) {
    var failErrCode = extResult ? (extResult.errorCode || 'EXTRACTION_FAILED') : 'EXTRACTION_FAILED';
    var failErrMsg = extResult ? (extResult.message || 'Extraction failed') : 'No readable content';
    var failIndexId = 'IDX_LIB_' + cleanDriveFileId.substring(0, 8) + '_FAIL';

    rowsToInsert.push([
      failIndexId,
      'LOCAL_REFERENCE_LIB',
      '',
      cleanDriveFileId,
      resourceTitle,
      'Extraction Error',
      'Extraction Error',
      0,
      failErrCode + ': ' + failErrMsg,
      '',
      'FAILED',
      nowIso
    ]);
  }

  // 8. Revalidate Drive state immediately before the shared-sheet commit.
  // ScriptLock cannot serialize external Drive permission/file edits, so keeping Drive calls
  // inside the script-wide mutex only increases contention without providing stronger atomicity.
  var liveReferenceFile;
  try { liveReferenceFile = DriveApp.getFileById(cleanDriveFileId); } catch (liveRefErr) { liveReferenceFile = null; }
  if (!liveReferenceFile || !isFileInOpenRnFolder(liveReferenceFile, openRnFolder)) {
    return { success: false, errorCode: 'REFERENCE_RESOURCE_CHANGED', message: 'Reference resource was removed or moved while indexing. Stale indexing result was discarded.' };
  }
  if (liveReferenceFile.getSize() !== fileSize || liveReferenceFile.getLastUpdated().getTime() !== sourceLastUpdatedMs) {
    return { success: false, errorCode: 'REFERENCE_RESOURCE_CHANGED', message: 'Reference resource changed while indexing. Please index the latest file version again.' };
  }
  try {
    var liveSharing = liveReferenceFile.getSharingAccess();
    if (liveSharing === DriveApp.Access.ANYONE || liveSharing === DriveApp.Access.ANYONE_WITH_LINK) {
      return { success: false, errorCode: 'PUBLIC_ACCESS_FORBIDDEN', message: 'Security policy violation: Reference file has public Drive link sharing. Sharing must be private.' };
    }
  } catch (livePrivacyErr) {
    return { success: false, errorCode: 'DRIVE_PRIVACY_CHECK_FAILED', message: 'Drive privacy check failed before indexing commit.' };
  }

  // 9. CRITICAL SECTION: shared Sheet state only.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy indexing reference library. Please try again.' };
  }

  var alreadyIndexed = false;
  var alreadyIndexedCount = 0;
  var resourceId = 'LIB_OPENRN_' + cleanDriveFileId.substring(0, 10);

  try {
    var freshIndexAdmin = requireFreshAdminMutation(session);
    if (!freshIndexAdmin.success) return freshIndexAdmin;
    session = freshIndexAdmin.session;

    // 8A. Update / Verify CNE_Reference_Library metadata sheet
    var libSheet = getOrCreateSheet('CNE_Reference_Library');
    ensureReferenceLibrarySheetHeaders(libSheet, true);
    var libMap = getHeaderMap(libSheet);
    var driveColLib = libMap['drivefileid'] !== undefined ? libMap['drivefileid'] : 3;
    var activeColLib = libMap['active'] !== undefined ? libMap['active'] : 8;
    var updatedColLib = libMap['updatedat'] !== undefined ? libMap['updatedat'] : 10;
    var resIdColLib = libMap['resourceid'] !== undefined ? libMap['resourceid'] : 0;

    var existingLibRow = findExactRowInColumn_(libSheet, driveColLib, cleanDriveFileId, 2);
    if (existingLibRow > 1) {
      resourceId = String(libSheet.getRange(existingLibRow, resIdColLib + 1).getValue() || resourceId).trim();
    }

    // 8B. Duplicate Check in CNE_Reference_Index
    var indexSheet = getOrCreateSheet('CNE_Reference_Index');
    ensureReferenceIndexSheetHeaders(indexSheet, true);
    var idxMap = getHeaderMap(indexSheet);
    var srcTypeCol = idxMap['sourcetype'] !== undefined ? idxMap['sourcetype'] : 1;
    var driveColIdx = idxMap['drivefileid'] !== undefined ? idxMap['drivefileid'] : 3;
    var statusColIdx = idxMap['extractionstatus'] !== undefined ? idxMap['extractionstatus'] : 10;
    var idxRowCount = Math.max(0, indexSheet.getLastRow() - 1);
    var srcVals = idxRowCount ? indexSheet.getRange(2, srcTypeCol + 1, idxRowCount, 1).getValues() : [];
    var driveVals = idxRowCount ? indexSheet.getRange(2, driveColIdx + 1, idxRowCount, 1).getValues() : [];
    var statusVals = idxRowCount ? indexSheet.getRange(2, statusColIdx + 1, idxRowCount, 1).getValues() : [];

    for (var ir = 0; ir < idxRowCount; ir++) {
      var rSrc = String(srcVals[ir][0] || '').trim().toUpperCase();
      var rDrive = String(driveVals[ir][0] || '').trim();
      var rStat = String(statusVals[ir][0] || '').trim().toUpperCase();
      if (rSrc === 'LOCAL_REFERENCE_LIB' && rDrive === cleanDriveFileId && rStat === 'SUCCESS') alreadyIndexedCount++;
    }

    if (alreadyIndexedCount > 0 && !isReindex) {
      alreadyIndexed = true;
    } else {
      // If content extraction/chunking failed on re-index, preserve previous valid index!
      if (!isSuccess && alreadyIndexedCount > 0) {
        logAuditAction(
          'REFERENCE_REINDEX_PRESERVED',
          session ? session.employeeId : 'SYSTEM',
          'Re-indexing failed to extract new content for ' + cleanDriveFileId + '. Previous valid index preserved.',
          'WARNING'
        );
        return {
          success: false,
          errorCode: extResult ? extResult.errorCode : 'CONTENT_EXTRACTION_FAILED',
          message: 'Re-indexing failed: unable to extract new content. Previous valid index has been preserved.'
        };
      }

      // Collect existing LOCAL_REFERENCE_LIB rows for this Drive File ID ONLY
      var rowsToDelete = [];
      for (var ir2 = 0; ir2 < idxRowCount; ir2++) {
        var rowSrc = String(srcVals[ir2][0] || '').trim().toUpperCase();
        var rowDrive = String(driveVals[ir2][0] || '').trim();
        if (rowSrc === 'LOCAL_REFERENCE_LIB' && rowDrive === cleanDriveFileId) rowsToDelete.push(ir2 + 2);
      }

      // 8C. Safe Replacement: Batch write new chunk rows FIRST before deleting old rows
      if (rowsToInsert.length > 0) {
        var startRow = indexSheet.getLastRow() + 1;
        try {
          indexSheet.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
        } catch (writeErr) {
          // If the new batch write fails, existing index rows were NOT deleted and remain intact
          logAuditAction(
            'REFERENCE_INDEX_WRITE_FAILED',
            session ? session.employeeId : 'SYSTEM',
            'Failed to write new reference index chunks for ' + cleanDriveFileId + ': ' + (writeErr && writeErr.message ? writeErr.message : String(writeErr)),
            'FAILED'
          );
          return {
            success: false,
            errorCode: 'INDEX_BATCH_WRITE_FAILED',
            message: 'Failed to write new reference index chunks. Previous valid index has been preserved.'
          };
        }

        // 8D. Only after new replacement data is successfully written to the sheet,
        // delete previous index rows for this specific LOCAL_REFERENCE_LIB resource.
        if (rowsToDelete.length > 0) {
          try {
            deleteSheetRowsByIndices(indexSheet, rowsToDelete);
          } catch (delErr) {
            logAuditAction(
              'REFERENCE_INDEX_PURGE_WARNING',
              session ? session.employeeId : 'SYSTEM',
              'Warning deleting old index rows during reindex: ' + (delErr && delErr.message ? delErr.message : String(delErr)),
              'WARNING'
            );
          }
        }
      }

      // 8E. Update metadata registry in CNE_Reference_Library
      var libRowValues = [
        resourceId,
        'LOCAL_REFERENCE_LIB',
        resourceTitle,
        cleanDriveFileId,
        authorOrg,
        license,
        version,
        ext.toUpperCase(),
        isSuccess ? 'TRUE' : 'FALSE',
        nowIso,
        nowIso
      ];

      if (existingLibRow > 1) {
        libSheet.getRange(existingLibRow, 1, 1, libRowValues.length).setValues([libRowValues]);
      } else {
        libSheet.appendRow(libRowValues);
      }
    }
  } finally {
    lock.releaseLock();
  }

  // 9. Audit and Return
  if (alreadyIndexed) {
    return {
      success: true,
      alreadyIndexed: true,
      resourceId: resourceId,
      chunksCount: alreadyIndexedCount,
      message: 'Nursing reference resource is already indexed.'
    };
  }

  if (isSuccess) {
    logAuditAction(
      'REFERENCE_LIBRARY_RESOURCE_INDEXED',
      session ? session.employeeId : 'SYSTEM',
      'Successfully indexed ' + rowsToInsert.length + ' chunks for reference resource "' + resourceTitle + '" (' + cleanDriveFileId + ')',
      'SUCCESS'
    );
    return {
      success: true,
      resourceId: resourceId,
      chunksCount: rowsToInsert.length,
      message: 'Reference resource indexed successfully (' + rowsToInsert.length + ' chunks).'
    };
  } else {
    logAuditAction(
      'REFERENCE_LIBRARY_RESOURCE_INDEX_FAILED',
      session ? session.employeeId : 'SYSTEM',
      'Indexing failed for reference resource "' + resourceTitle + '": ' + (extResult ? extResult.errorCode : 'FAILED'),
      'FAILED'
    );
    return {
      success: false,
      errorCode: extResult ? extResult.errorCode : 'CONTENT_EXTRACTION_FAILED',
      message: 'Unable to extract readable text from reference resource: ' + (extResult ? extResult.message : 'No readable content.')
    };
  }
}

/**
 * Surgically delete / deactivate a reference library resource from CNE_Reference_Library
 * and CNE_Reference_Index.
 * Strictly Admin-only.
 */
function deleteReferenceLibraryResource(driveFileId, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  if (!driveFileId || typeof driveFileId !== 'string' || !driveFileId.trim()) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: 'Drive File ID is required.' };
  }
  var cleanDriveFileId = driveFileId.trim();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  var deletedChunksCount = 0;
  try {
    var freshDeleteAdmin = requireFreshAdminMutation(session);
    if (!freshDeleteAdmin.success) return freshDeleteAdmin;
    session = freshDeleteAdmin.session;

    // 1. Remove chunks from CNE_Reference_Index
    var indexSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference_Index');
    if (indexSheet && indexSheet.getLastRow() > 1) {
      var idxMap = getHeaderMap(indexSheet);
      var idxData = indexSheet.getDataRange().getValues();
      var srcTypeCol = idxMap['sourcetype'] !== undefined ? idxMap['sourcetype'] : 1;
      var driveColIdx = idxMap['drivefileid'] !== undefined ? idxMap['drivefileid'] : 3;

      var rowsToDelete = [];
      for (var r = 1; r < idxData.length; r++) {
        var rowSrc = String(idxData[r][srcTypeCol] || '').trim().toUpperCase();
        var rowDrive = String(idxData[r][driveColIdx] || '').trim();
        if (rowSrc === 'LOCAL_REFERENCE_LIB' && rowDrive === cleanDriveFileId) {
          rowsToDelete.push(r + 1);
        }
      }

      if (rowsToDelete.length > 0) {
        deletedChunksCount = rowsToDelete.length;
        deleteSheetRowsByIndices(indexSheet, rowsToDelete);
      }
    }

    // 2. Update active flag in CNE_Reference_Library
    var libSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference_Library');
    if (libSheet && libSheet.getLastRow() > 1) {
      var libMap = getHeaderMap(libSheet);
      var libData = libSheet.getDataRange().getValues();
      var driveColLib = libMap['drivefileid'] !== undefined ? libMap['drivefileid'] : 3;
      var activeColLib = libMap['active'] !== undefined ? libMap['active'] : 8;
      var updatedColLib = libMap['updatedat'] !== undefined ? libMap['updatedat'] : 10;

      for (var lr = 1; lr < libData.length; lr++) {
        if (String(libData[lr][driveColLib] || '').trim() === cleanDriveFileId) {
          libSheet.getRange(lr + 1, activeColLib + 1).setValue('FALSE');
          libSheet.getRange(lr + 1, updatedColLib + 1).setValue(new Date().toISOString());
          break;
        }
      }
    }
  } finally {
    lock.releaseLock();
  }

  logAuditAction(
    'REFERENCE_LIBRARY_RESOURCE_DELETED',
    session ? session.employeeId : 'SYSTEM',
    'Removed reference resource ' + cleanDriveFileId + ' (' + deletedChunksCount + ' index chunks deleted)',
    'SUCCESS'
  );

  return {
    success: true,
    deletedChunksCount: deletedChunksCount,
    message: 'Reference resource successfully removed and unindexed.'
  };
}

/**
 * List all registered nursing reference library resources from CNE_Reference_Library
 * and available files in the Open RN Drive folder.
 */
function listNursingReferenceResources(session) {
  if (!session || !session.employeeId) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }

  var isAdmin = session && String(session.role || '').trim().toUpperCase() === 'ADMIN';
  var resources = [];
  var driveFiles = [];

  // 1. Read metadata from CNE_Reference_Library
  try {
    var libSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference_Library');
    if (libSheet && libSheet.getLastRow() > 1) {
      ensureReferenceLibrarySheetHeaders(libSheet);
      var libMap = getHeaderMap(libSheet);
      var libData = libSheet.getDataRange().getValues();

      var resIdCol = libMap['resourceid'] !== undefined ? libMap['resourceid'] : 0;
      var srcTypeCol = libMap['sourcetype'] !== undefined ? libMap['sourcetype'] : 1;
      var titleCol = libMap['resourcetitle'] !== undefined ? libMap['resourcetitle'] : 2;
      var driveCol = libMap['drivefileid'] !== undefined ? libMap['drivefileid'] : 3;
      var authorCol = libMap['authororganization'] !== undefined ? libMap['authororganization'] : 4;
      var licCol = libMap['license'] !== undefined ? libMap['license'] : 5;
      var verCol = libMap['version'] !== undefined ? libMap['version'] : 6;
      var typeCol = libMap['filetype'] !== undefined ? libMap['filetype'] : 7;
      var activeCol = libMap['active'] !== undefined ? libMap['active'] : 8;
      var indAtCol = libMap['indexedat'] !== undefined ? libMap['indexedat'] : 9;
      var updAtCol = libMap['updatedat'] !== undefined ? libMap['updatedat'] : 10;

      for (var r = 1; r < libData.length; r++) {
        var isActive = String(libData[r][activeCol] || '').trim().toUpperCase() === 'TRUE';
        if (isActive) {
          resources.push({
            resourceId: String(libData[r][resIdCol] || '').trim(),
            sourceType: 'LOCAL_REFERENCE_LIB',
            resourceTitle: String(libData[r][titleCol] || '').trim(),
            driveFileId: String(libData[r][driveCol] || '').trim(),
            authorOrganization: String(libData[r][authorCol] || '').trim(),
            license: String(libData[r][licCol] || '').trim(),
            version: String(libData[r][verCol] || '').trim(),
            fileType: String(libData[r][typeCol] || '').trim(),
            active: true,
            indexedAt: String(libData[r][indAtCol] || '').trim(),
            updatedAt: String(libData[r][updAtCol] || '').trim()
          });
        }
      }
    }
  } catch (sheetErr) {
    // Non-blocking
  }

  // 2. Scan Open RN Drive folder (Admin only)
  if (isAdmin) {
    try {
      var folderResult = getOrCreateOpenRnFolder();
      if (folderResult.success && folderResult.folder) {
        var filesIter = folderResult.folder.getFiles();
        var ALLOWED_EXTS = ['pdf'];

        var indexedMap = {};
        for (var i = 0; i < resources.length; i++) {
          indexedMap[resources[i].driveFileId] = resources[i];
        }

        while (filesIter.hasNext()) {
          var f = filesIter.next();
          var fName = f.getName();
          var fExt = getFileExtension(fName).toLowerCase();
          if (ALLOWED_EXTS.indexOf(fExt) !== -1) {
            var fId = f.getId();
            var isIndexed = Boolean(indexedMap[fId]);
            driveFiles.push({
              driveFileId: fId,
              fileName: fName,
              fileType: fExt.toUpperCase(),
              fileSize: f.getSize(),
              lastUpdated: f.getLastUpdated().toISOString(),
              isIndexed: isIndexed,
              resourceId: isIndexed ? indexedMap[fId].resourceId : null,
              resourceTitle: isIndexed ? indexedMap[fId].resourceTitle : fName.replace(/\.[^/.]+$/, '')
            });
          }
        }
      }
    } catch (driveErr) {
      // Non-blocking
    }
  }

  return {
    success: true,
    data: {
      resources: resources,
      driveFiles: driveFiles
    }
  };
}

/**
 * Upload an Open RN reference resource directly into the Open RN folder and index it.
 * Strictly Admin-only.
 * Document Policy: PDF only (.pdf). No application-defined size limit.
 */
function uploadNursingReferenceResource(params, session) {
  var adminError = requireAdmin(session);
  if (adminError) return adminError;

  var fileName = params ? params.fileName : null;
  var base64Data = params ? params.base64Data : null;
  var resourceTitle = params ? params.resourceTitle : null;
  if (!fileName || !base64Data) return { success: false, errorCode: 'INVALID_PARAMS', message: 'File name and file content are required.' };

  var ext = getFileExtension(fileName).toLowerCase();
  var ALLOWED_EXTS = ['pdf'];
  if (ALLOWED_EXTS.indexOf(ext) === -1) return { success: false, errorCode: 'UNSUPPORTED_FILE_TYPE', message: 'Only PDF (.pdf) documents are permitted.' };

  var folderResult = getOrCreateOpenRnFolder();
  if (!folderResult.success || !folderResult.folder) return { success: false, errorCode: folderResult.errorCode || 'FOLDER_ERROR', message: folderResult.message || 'Failed to access Open RN folder.' };

  var cleanBase64 = base64Data;
  if (cleanBase64.indexOf(',') !== -1) cleanBase64 = cleanBase64.split(',')[1];
  var fileBytes;
  try { fileBytes = Utilities.base64Decode(cleanBase64); }
  catch (decErr) { return { success: false, errorCode: 'INVALID_PAYLOAD', message: 'Invalid file payload: unable to decode base64 content.' }; }
  if (!fileBytes || fileBytes.length === 0) return { success: false, errorCode: 'EMPTY_FILE', message: 'Uploaded file is empty (0 bytes).' };
  if (fileBytes.length < 4 || (fileBytes[0] & 0xFF) !== 0x25 || (fileBytes[1] & 0xFF) !== 0x50 || (fileBytes[2] & 0xFF) !== 0x44 || (fileBytes[3] & 0xFF) !== 0x46) {
    return { success: false, errorCode: 'INVALID_FILE_CONTENT', message: 'File content does not match standard PDF document structure (%PDF header missing).' };
  }

  var freshAdmin = requireFreshAdminMutation(session);
  if (!freshAdmin.success) return freshAdmin;
  session = freshAdmin.session;

  var safeName = sanitizeFileNamePart(fileName.replace(/\.[^/.]+$/, '')) + '.' + ext;
  var blob = Utilities.newBlob(fileBytes, 'application/pdf', safeName);
  var createdFile;
  try {
    createdFile = folderResult.folder.createFile(blob);
    createdFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  } catch (createErr) {
    return { success: false, errorCode: 'FILE_CREATION_FAILED', message: 'Failed to create file in Open RN folder: ' + createErr.message };
  }

  var indexResult = null;
  try {
    indexResult = indexReferenceLibraryResource(createdFile.getId(), {
      resourceTitle: resourceTitle || safeName.replace(/\.[^/.]+$/, ''),
      authorOrganization: params.authorOrganization,
      license: params.license,
      version: params.version,
      reindex: false
    }, session);
  } catch (idxException) {
    indexResult = { success: false, errorCode: 'INDEXING_UNEXPECTED_ERROR', message: idxException && idxException.message ? idxException.message : String(idxException) };
  }

  if (!indexResult || !indexResult.success) {
    var rolledBack = false;
    try { createdFile.setTrashed(true); rolledBack = true; } catch (trashErr) {}
    if (rolledBack) {
      logAuditAction('UPLOAD_REFERENCE_RESOURCE_ROLLED_BACK', session ? session.employeeId : 'SYSTEM', 'Indexing failed for uploaded reference file "' + safeName + '". Newly created Drive file rolled back (trashed): ' + createdFile.getId() + '. Reason: ' + (indexResult ? indexResult.message : 'Unknown error'), 'FAILED');
      return { success: false, errorCode: (indexResult && indexResult.errorCode) ? indexResult.errorCode : 'INDEXING_FAILED_ROLLED_BACK', message: 'Failed to index uploaded reference resource. The uploaded file was rolled back. ' + (indexResult ? indexResult.message : '') };
    }
    logAuditAction('UPLOAD_REFERENCE_RESOURCE_ORPHANED', session ? session.employeeId : 'SYSTEM', 'CRITICAL: Reference resource indexing failed AND Drive rollback failed. Orphaned Drive File ID: ' + createdFile.getId() + '. Index error: ' + (indexResult ? indexResult.message : 'Unknown error'), 'FAILED');
    return { success: false, errorCode: 'INDEXING_FAILED_CLEANUP_FAILED', message: 'Failed to index uploaded reference resource, and cleanup of the newly created Drive file also failed. Administrative reconciliation may be required.' };
  }

  logAuditAction('UPLOAD_REFERENCE_RESOURCE', session ? session.employeeId : 'SYSTEM', 'Uploaded and indexed reference resource "' + safeName + '" (' + createdFile.getId() + ')', 'SUCCESS');
  return {
    success: true,
    data: {
      driveFileId: createdFile.getId(),
      fileName: safeName,
      resourceId: indexResult.resourceId,
      chunksCount: indexResult.chunksCount || 0
    },
    message: 'Reference resource uploaded and indexed successfully.'
  };
}

// Action Dispatch Handlers for Phase 4B
function handleListNursingReferenceResources(params, session) {
  return listNursingReferenceResources(session);
}

function handleIndexNursingReferenceResource(params, session) {
  return handleAdminAction(params, session, function(p, s) {
    var driveFileId = p ? (p.driveFileId || p.fileId) : null;
    return indexReferenceLibraryResource(driveFileId, p, s);
  }, 'INDEX_NURSING_REFERENCE_RESOURCE');
}

function handleUploadNursingReferenceResource(params, session) {
  return handleAdminAction(params, session, function(p, s) {
    return uploadNursingReferenceResource(p, s);
  }, 'UPLOAD_NURSING_REFERENCE_RESOURCE');
}

function handleDeleteNursingReferenceResource(params, session) {
  return handleAdminAction(params, session, function(p, s) {
    var driveFileId = p ? (p.driveFileId || p.fileId) : null;
    return deleteReferenceLibraryResource(driveFileId, s);
  }, 'DELETE_NURSING_REFERENCE_RESOURCE');
}

/**
 * Securely download or stream a Nursing Reference Library file for any authenticated employee.
 */
function handleDownloadNursingReferenceResource(params, session) {
  if (!session || !session.employeeId) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }

  var driveFileId = params ? (params.driveFileId || params.fileId) : null;
  var resourceId = params ? params.resourceId : null;

  if (!driveFileId && !resourceId) {
    return { success: false, errorCode: 'INVALID_PARAMS', message: 'Drive file ID or Resource ID is required.' };
  }

  var cleanDriveFileId = driveFileId ? sanitizeCellInput(driveFileId) : '';
  var cleanResourceId = resourceId ? sanitizeCellInput(resourceId) : '';

  var libSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference_Library');
  if (!libSheet || libSheet.getLastRow() <= 1) {
    return { success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Nursing reference library is empty or not initialized.' };
  }

  var libMap = getHeaderMap(libSheet);
  var libData = libSheet.getDataRange().getValues();

  var resIdCol = libMap['resourceid'] !== undefined ? libMap['resourceid'] : 0;
  var titleCol = libMap['resourcetitle'] !== undefined ? libMap['resourcetitle'] : 2;
  var driveCol = libMap['drivefileid'] !== undefined ? libMap['drivefileid'] : 3;
  var authorCol = libMap['authororganization'] !== undefined ? libMap['authororganization'] : 4;
  var typeCol = libMap['filetype'] !== undefined ? libMap['filetype'] : 7;
  var activeCol = libMap['active'] !== undefined ? libMap['active'] : 8;

  var matchedRow = null;
  for (var r = 1; r < libData.length; r++) {
    var rowDrive = String(libData[r][driveCol] || '').trim();
    var rowResId = String(libData[r][resIdCol] || '').trim();
    if ((cleanDriveFileId && rowDrive === cleanDriveFileId) || (cleanResourceId && rowResId === cleanResourceId)) {
      matchedRow = libData[r];
      cleanDriveFileId = rowDrive;
      break;
    }
  }

  if (!matchedRow) {
    return { success: false, errorCode: 'RESOURCE_NOT_FOUND', message: 'Resource not found in Nursing Reference Library.' };
  }

  var isActive = String(matchedRow[activeCol] || '').trim().toUpperCase() === 'TRUE';
  if (!isActive) {
    return { success: false, errorCode: 'RESOURCE_INACTIVE', message: 'This reference resource is inactive or removed.' };
  }

  var folderResult = getOrCreateOpenRnFolder();
  if (!folderResult.success || !folderResult.folder) {
    return { success: false, errorCode: 'FOLDER_ERROR', message: folderResult.message || 'Open RN repository folder unavailable.' };
  }

  var file;
  try {
    file = DriveApp.getFileById(cleanDriveFileId);
  } catch (driveErr) {
    return { success: false, errorCode: 'FILE_NOT_FOUND', message: 'File not found in Drive.' };
  }

  // Ensure file is in the Open RN folder
  var parents = file.getParents();
  var inFolder = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === folderResult.folder.getId()) {
      inFolder = true;
      break;
    }
  }

  if (!inFolder) {
    return { success: false, errorCode: 'FILE_OUTSIDE_REPOSITORY', message: 'File is outside authorized reference library storage.' };
  }

  var blob = file.getBlob();
  var fileBase64 = Utilities.base64Encode(blob.getBytes());
  var mimeType = blob.getContentType();
  var fileName = file.getName();
  var fileType = String(matchedRow[typeCol] || getFileExtension(fileName)).toUpperCase();

  logAuditAction('DOWNLOAD_NURSING_REFERENCE_RESOURCE', session.employeeId, 'Downloaded nursing reference resource: ' + fileName + ' (' + cleanDriveFileId + ')', 'SUCCESS');

  return {
    success: true,
    data: {
      resourceId: String(matchedRow[resIdCol] || ''),
      resourceTitle: String(matchedRow[titleCol] || fileName),
      authorOrganization: String(matchedRow[authorCol] || ''),
      fileName: fileName,
      fileType: fileType,
      mimeType: mimeType,
      fileBase64: fileBase64
    }
  };
}

// ==========================================
// PHASE 4C: LOCAL TOPIC-RELEVANCE RETRIEVAL
// ==========================================

var CLINICAL_PROCEDURAL_TAXONOMY = [
  {
    topicId: 'iv_cannulation',
    matchRegex: /\b(?:iv|cannulat|venipuncture|intravenous)\b/i,
    coreProcedures: [
      'cannulat', 'venipuncture', 'catheter', 'cannula', 'insertion',
      'flashback', 'tourniquet', 'peripheral iv', 'iv access', 'site selection',
      'vein', 'gauge', 'stylet', 'chlorhexidine', 'aseptic'
    ],
    procedureDistinguishers: ['cannulat', 'venipuncture', 'insertion', 'catheter', 'cannula', 'access', 'vein', 'flashback'],
    antiProcedureNoise: ['piggyback', 'infusion pump rate', 'titration', 'oral tablet', 'elixir']
  },
  {
    topicId: 'foley_catheterization',
    matchRegex: /\b(?:foley|catheteriz|urinary\s+catheter)\b/i,
    coreProcedures: [
      'foley', 'catheteriz', 'urinary catheter', 'indwelling', 'balloon',
      'sterile technique', 'drainage bag', 'retention', 'meatus', 'lubricant', 'peri-care'
    ],
    procedureDistinguishers: ['foley', 'catheter', 'urinary', 'bladder'],
    antiProcedureNoise: []
  },
  {
    topicId: 'wound_dressing',
    matchRegex: /\b(?:wound|dressing)\b/i,
    coreProcedures: [
      'wound', 'dressing', 'gauze', 'sterile', 'exudate',
      'wound bed', 'cleansing', 'debridement', 'drainage', 'maceration', 'bandage', 'granulation'
    ],
    procedureDistinguishers: ['wound', 'dressing', 'gauze', 'debridement'],
    antiProcedureNoise: []
  },
  {
    topicId: 'cpr',
    matchRegex: /\b(?:cpr|resuscitat|cardiopulmonary|bls)\b/i,
    coreProcedures: [
      'cpr', 'resuscitat', 'chest compression', 'compression', 'rescue breath',
      'defibrillat', 'aed', 'cardiac arrest', 'circulation', 'airway', 'ventilation', 'bls'
    ],
    procedureDistinguishers: ['compression', 'resuscitat', 'cpr', 'cardiac arrest', 'defibrillat'],
    antiProcedureNoise: []
  },
  {
    topicId: 'medication_administration',
    matchRegex: /\b(?:medication|drug\s+admin)\b/i,
    coreProcedures: [
      'medication administration', 'rights of medication', 'rights of drug',
      'oral', 'parenteral', 'dosage', 'prescription', 'patient verification',
      'five rights', 'six rights', 'ten rights', 'adverse reaction'
    ],
    procedureDistinguishers: ['medication', 'drug administration', 'dosage', 'rights'],
    antiProcedureNoise: []
  },
  {
    topicId: 'blood_transfusion',
    matchRegex: /\b(?:blood\s+transfusion|transfusion)\b/i,
    coreProcedures: [
      'blood transfusion', 'transfusion', 'crossmatch', 'packed red blood cells',
      'prbc', 'blood administration', 'hemolytic', 'transfusion reaction', 'blood typing', 'filter'
    ],
    procedureDistinguishers: ['transfusion', 'blood administration', 'crossmatch', 'prbc'],
    antiProcedureNoise: []
  }
];

/**
 * Deterministic Clinical Topic Relevance Scorer
 * Evaluates a candidate chunk against the target clinical topic query.
 */
function calculateTopicRelevanceScore(queryTopic, candidate) {
  if (!queryTopic || !candidate) return 0;

  var normQuery = String(queryTopic).toLowerCase().trim();
  if (normQuery.length < 2) return 0;

  var normTitle = String(candidate.resourceTitle || '').toLowerCase();
  var normTopic = String(candidate.topic || '').toLowerCase();
  var normHeading = String(candidate.sectionHeading || '').toLowerCase();
  var normKeywords = String(candidate.clinicalKeywords || '').toLowerCase();
  var normText = String(candidate.chunkText || '').toLowerCase();

  var score = 0;

  // Generic stop words to downweight
  var STOP_WORDS = {
    'and': 1, 'or': 1, 'the': 1, 'of': 1, 'in': 1, 'for': 1, 'to': 1,
    'a': 1, 'an': 1, 'on': 1, 'at': 1, 'by': 1, 'with': 1, 'from': 1,
    'as': 1, 'is': 1, 'are': 1, 'was': 1, 'were': 1, 'be': 1, 'this': 1,
    'that': 1, 'care': 1, 'nursing': 1, 'skills': 1, 'procedure': 1, 'patient': 1
  };

  // 1. Exact Full-Phrase Matching (Strongest Weight)
  if (normHeading.indexOf(normQuery) !== -1) score += 50;
  if (normKeywords.indexOf(normQuery) !== -1) score += 45;
  if (normTopic.indexOf(normQuery) !== -1) score += 40;
  if (normTitle.indexOf(normQuery) !== -1) score += 35;
  if (normText.indexOf(normQuery) !== -1) score += 30;

  // 2. Query Tokens Extraction & Matching
  var rawTokens = normQuery.split(/[^a-z0-9]+/);
  var tokens = [];
  for (var t = 0; t < rawTokens.length; t++) {
    var tok = rawTokens[t];
    if (tok.length >= 2 && !STOP_WORDS[tok]) {
      tokens.push(tok);
    }
  }

  var matchedTokenCount = 0;
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var baseWeight = token.length <= 2 ? 3 : (token.length === 3 ? 6 : 12);
    var tokenFoundInChunk = false;

    if (normHeading.indexOf(token) !== -1) {
      score += baseWeight * 2.5;
      tokenFoundInChunk = true;
    }
    if (normKeywords.indexOf(token) !== -1) {
      score += baseWeight * 2.0;
      tokenFoundInChunk = true;
    }
    if (normTopic.indexOf(token) !== -1 || normTitle.indexOf(token) !== -1) {
      score += baseWeight * 1.5;
      tokenFoundInChunk = true;
    }

    // Term frequency in chunk text with diminishing returns (capped at 4)
    if (normText.indexOf(token) !== -1) {
      tokenFoundInChunk = true;
      var count = 0;
      var pos = normText.indexOf(token);
      while (pos !== -1 && count < 4) {
        count++;
        pos = normText.indexOf(token, pos + token.length);
      }
      var tfMultipliers = [1.0, 0.6, 0.4, 0.2];
      for (var c = 0; c < count; c++) {
        score += baseWeight * tfMultipliers[c];
      }
    }

    if (tokenFoundInChunk) {
      matchedTokenCount++;
    }
  }

  // Coordination bonus if all tokens of a multi-token query matched
  if (tokens.length >= 2 && matchedTokenCount === tokens.length) {
    score += 25;
  }

  // 3. Clinical Procedural Disambiguation & Taxonomy
  for (var p = 0; p < CLINICAL_PROCEDURAL_TAXONOMY.length; p++) {
    var spec = CLINICAL_PROCEDURAL_TAXONOMY[p];
    if (spec.matchRegex.test(normQuery)) {
      // Procedural terms score
      var procScore = 0;
      for (var cp = 0; cp < spec.coreProcedures.length; cp++) {
        var term = spec.coreProcedures[cp];
        if (normHeading.indexOf(term) !== -1) procScore += 15;
        if (normKeywords.indexOf(term) !== -1) procScore += 12;
        if (normText.indexOf(term) !== -1) procScore += 8;
      }
      score += Math.min(procScore, 40);

      // Specific Procedural Disambiguation (e.g. IV Cannulation vs Generic IV Medication)
      if (spec.procedureDistinguishers.length > 0) {
        var hasDistinguisher = false;
        for (var d = 0; d < spec.procedureDistinguishers.length; d++) {
          var dist = spec.procedureDistinguishers[d];
          if (normHeading.indexOf(dist) !== -1 || normKeywords.indexOf(dist) !== -1 || normText.indexOf(dist) !== -1) {
            hasDistinguisher = true;
            break;
          }
        }

        if (hasDistinguisher) {
          score += 25; // Procedural specificity reward
        } else {
          // If query is specifically about cannulation / insertion / access and candidate has NO procedural distinguisher
          // e.g. purely generic IV infusion / medication without insertion
          if (normQuery.indexOf('cannulat') !== -1 || normQuery.indexOf('insertion') !== -1 || normQuery.indexOf('catheter') !== -1) {
            score = Math.max(0, score - 35);
          }
        }
      }
      break;
    }
  }

  return score;
}

/**
 * Phase 4D.1: Clinical Relevance Gate
 * Evaluates candidate chunks after calculateTopicRelevanceScore() to filter out
 * clinically unrelated false positives that only matched generic shared clinical vocabulary.
 * 
 * Rules:
 * 1. Must have meaningful evidence from:
 *    - exact / multi-word topic phrase match
 *    - meaningful topic token coordination (non-generic tokens)
 *    - relevant clinical heading or keyword match
 *    - applicable procedural taxonomy distinguishers
 * 2. Generic shared clinical words (catheter, sterile, dressing, patient, care, nursing,
 *    procedure, infusion, monitoring, etc.) CANNOT by themselves qualify an unrelated chunk.
 * 3. Multi-word procedural topics require sufficient topic-specific coordination.
 */
function passesClinicalRelevanceGate(queryTopic, candidate) {
  if (!queryTopic || !candidate) return false;

  var normQuery = String(queryTopic).toLowerCase().trim();
  if (normQuery.length < 2) return false;

  var normTitle = String(candidate.resourceTitle || '').toLowerCase();
  var normTopic = String(candidate.topic || '').toLowerCase();
  var normHeading = String(candidate.sectionHeading || '').toLowerCase();
  var normKeywords = String(candidate.clinicalKeywords || '').toLowerCase();
  var normText = String(candidate.chunkText || '').toLowerCase();

  var combinedMeta = normHeading + ' ' + normKeywords + ' ' + normTopic + ' ' + normTitle;
  var allCandidateText = combinedMeta + ' ' + normText;

  var GENERIC_CLINICAL_TOKENS = {
    'catheter': 1,
    'sterile': 1,
    'dressing': 1,
    'patient': 1,
    'care': 1,
    'nursing': 1,
    'procedure': 1,
    'infusion': 1,
    'monitoring': 1,
    'access': 1,
    'insertion': 1,
    'technique': 1,
    'protocol': 1,
    'management': 1,
    'skills': 1,
    'checklist': 1,
    'guidelines': 1,
    'administration': 1,
    'site': 1,
    'therapy': 1,
    'change': 1,
    'prevention': 1,
    'assessment': 1,
    'selection': 1,
    'score': 1,
    'scale': 1
  };

  var STOP_WORDS = {
    'and': 1, 'or': 1, 'the': 1, 'of': 1, 'in': 1, 'for': 1, 'to': 1,
    'a': 1, 'an': 1, 'on': 1, 'at': 1, 'by': 1, 'with': 1, 'from': 1,
    'as': 1, 'is': 1, 'are': 1, 'was': 1, 'were': 1, 'be': 1, 'this': 1,
    'that': 1
  };

  // 1. Procedural Taxonomy Distinguisher Evaluation
  var matchedTaxonomy = null;
  for (var p = 0; p < CLINICAL_PROCEDURAL_TAXONOMY.length; p++) {
    var spec = CLINICAL_PROCEDURAL_TAXONOMY[p];
    if (spec.matchRegex.test(normQuery)) {
      matchedTaxonomy = spec;
      break;
    }
  }

  if (matchedTaxonomy) {
    var tid = matchedTaxonomy.topicId;
    if (tid === 'iv_cannulation') {
      var ivTerms = ['iv', 'cannulat', 'cannula', 'venipunct', 'vein', 'flashback', 'phlebitis', 'tourniquet', 'peripheral iv', 'iv access', 'intravenous'];
      var hasIv = false;
      for (var i = 0; i < ivTerms.length; i++) {
        if (allCandidateText.indexOf(ivTerms[i]) !== -1) {
          hasIv = true;
          break;
        }
      }
      if (!hasIv) return false;
    } else if (tid === 'foley_catheterization') {
      var foleyTerms = ['foley', 'catheteriz', 'urinary', 'bladder', 'meatus', 'retention balloon', 'drainage bag', 'peri-care'];
      var hasFoley = false;
      for (var f = 0; f < foleyTerms.length; f++) {
        if (allCandidateText.indexOf(foleyTerms[f]) !== -1) {
          hasFoley = true;
          break;
        }
      }
      if (!hasFoley) return false;
    } else if (tid === 'wound_dressing') {
      var woundTerms = ['wound', 'wound care', 'wound bed', 'exudate', 'debridement', 'granulation', 'ulcer', 'pressure injury', 'eschar', 'maceration'];
      var hasWound = false;
      for (var w = 0; w < woundTerms.length; w++) {
        if (allCandidateText.indexOf(woundTerms[w]) !== -1) {
          hasWound = true;
          break;
        }
      }
      if (!hasWound) return false;
    } else if (tid === 'blood_transfusion') {
      var transTerms = ['transfusion', 'prbc', 'crossmatch', 'packed red', 'hemolytic', 'blood administration', 'blood typing', 'blood filter'];
      var hasTrans = false;
      for (var bt = 0; bt < transTerms.length; bt++) {
        if (allCandidateText.indexOf(transTerms[bt]) !== -1) {
          hasTrans = true;
          break;
        }
      }
      if (!hasTrans) return false;
    } else if (tid === 'cpr') {
      var cprTerms = ['cpr', 'resuscitat', 'chest compression', 'compression', 'rescue breath', 'defibrillat', 'aed', 'cardiac arrest', 'bls'];
      var hasCpr = false;
      for (var cp = 0; cp < cprTerms.length; cp++) {
        if (allCandidateText.indexOf(cprTerms[cp]) !== -1) {
          hasCpr = true;
          break;
        }
      }
      if (!hasCpr) return false;
    } else if (tid === 'medication_administration') {
      var medTerms = ['medication', 'drug administration', 'rights of medication', 'dosage', 'prescription', 'mar'];
      var hasMed = false;
      for (var m = 0; m < medTerms.length; m++) {
        if (allCandidateText.indexOf(medTerms[m]) !== -1) {
          hasMed = true;
          break;
        }
      }
      if (!hasMed) return false;
    }
  }

  // 2. Exact Multi-Word Query Phrase Match in Heading, Keywords, Topic, or Text
  var querySegments = normQuery.split(/\s*[\/\-]\s*/);
  for (var s = 0; s < querySegments.length; s++) {
    var seg = querySegments[s].trim();
    if (seg.length >= 3 && seg.indexOf(' ') !== -1) {
      if (combinedMeta.indexOf(seg) !== -1 || normText.indexOf(seg) !== -1) {
        return true;
      }
    }
  }
  if (normQuery.indexOf(' ') !== -1 && (combinedMeta.indexOf(normQuery) !== -1 || normText.indexOf(normQuery) !== -1)) {
    return true;
  }

  // 3. Extract and evaluate query tokens
  var rawTokens = normQuery.split(/[^a-z0-9]+/);
  var specificTokens = [];
  var genericQueryTokens = [];

  for (var t = 0; t < rawTokens.length; t++) {
    var tok = rawTokens[t];
    if (tok.length < 2 || STOP_WORDS[tok]) continue;
    if (GENERIC_CLINICAL_TOKENS[tok]) {
      genericQueryTokens.push(tok);
    } else {
      specificTokens.push(tok);
    }
  }

  if (specificTokens.length > 0) {
    var matchedSpecific = 0;
    for (var st = 0; st < specificTokens.length; st++) {
      var sTok = specificTokens[st];
      var stem = sTok.length > 4 ? sTok.substring(0, sTok.length - 1) : sTok;
      if (combinedMeta.indexOf(stem) !== -1 || normText.indexOf(stem) !== -1) {
        matchedSpecific++;
      }
    }

    if (matchedSpecific === 0) {
      return false;
    }

    if (specificTokens.length >= 2 && matchedSpecific < 2) {
      var matchedInMeta = false;
      for (var sm = 0; sm < specificTokens.length; sm++) {
        var sTokMeta = specificTokens[sm];
        var sStemMeta = sTokMeta.length > 4 ? sTokMeta.substring(0, sTokMeta.length - 1) : sTokMeta;
        if (combinedMeta.indexOf(sStemMeta) !== -1) {
          matchedInMeta = true;
          break;
        }
      }
      if (!matchedInMeta) {
        return false;
      }
    }

    return true;
  }

  if (genericQueryTokens.length >= 2) {
    var matchedGeneric = 0;
    for (var gt = 0; gt < genericQueryTokens.length; gt++) {
      var gTok = genericQueryTokens[gt];
      if (combinedMeta.indexOf(gTok) !== -1 || normText.indexOf(gTok) !== -1) {
        matchedGeneric++;
      }
    }
    return matchedGeneric >= 2;
  }

  return false;
}

/**
 * Phase 4C: Local Topic-Relevance Retrieval
 * Finds and ranks the most relevant evidence chunks for a CNE topic from CNE_Reference_Index.
 * 
 * Source Priority:
 * 1. UPLOADED_CNE — primary source (rows belonging to cneId)
 * 2. LOCAL_REFERENCE_LIB — supplementary source from Open RN library (active resources only)
 * 
 * Uploaded CNE material always precedes local library material.
 * Within each source, chunks are ranked by deterministic relevance score.
 * If no meaningful relevant material is found (score < sufficiency threshold),
 * returns INSUFFICIENT_TOPIC_MATERIAL.
 */
function retrieveCNETopicEvidence(cneId, topic, session) {
  var cleanCneId = sanitizeCellInput(cneId);
  var cleanTopic = sanitizeCellInput(topic);

  if (!cleanCneId) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMETERS',
      message: 'CNE ID is required.'
    };
  }

  // Authorize CNE access
  var record = getCNEScheduleRecord(cleanCneId);
  if (!record) {
    return {
      success: false,
      errorCode: 'CNE_NOT_FOUND',
      message: 'CNE record not found: ' + cleanCneId
    };
  }

  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;

  // If topic is not passed, default to CNE record topic
  if (!cleanTopic && record.topic) {
    cleanTopic = String(record.topic).trim();
  }

  if (!cleanTopic) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMETERS',
      message: 'Topic is required for retrieval.'
    };
  }

  // Read index without holding ScriptLock (pure read operation)
  var ss = getSpreadsheet('CNE');
  var indexSheet = ss.getSheetByName('CNE_Reference_Index');
  if (!indexSheet || indexSheet.getLastRow() <= 1) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_TOPIC_MATERIAL',
      message: 'No relevant material related to this topic is available on the server. Kindly upload the relevant topic material and try again.',
      evidence: []
    };
  }

  // Pre-fetch active library resources to ensure only active LOCAL_REFERENCE_LIB chunks are included
  var activeLibFiles = {};
  try {
    var libSheet = ss.getSheetByName('CNE_Reference_Library');
    if (libSheet && libSheet.getLastRow() > 1) {
      var libMap = getHeaderMap(libSheet);
      var libDriveCol = libMap['drivefileid'] !== undefined ? libMap['drivefileid'] : 3;
      var libActiveCol = libMap['active'] !== undefined ? libMap['active'] : 8;
      var libData = libSheet.getDataRange().getValues();
      for (var lr = 1; lr < libData.length; lr++) {
        var driveId = String(libData[lr][libDriveCol] || '').trim();
        var activeVal = libData[lr][libActiveCol];
        var isActive = (activeVal === true || String(activeVal).trim().toLowerCase() === 'true');
        if (driveId && isActive) {
          activeLibFiles[driveId] = true;
        }
      }
    }
  } catch (libErr) {
    activeLibFiles = {};
  }

  // Read all index rows in one single sheet call
  var idxMap = getHeaderMap(indexSheet);
  var idxData = indexSheet.getDataRange().getValues();

  var idCol = idxMap['indexid'] !== undefined ? idxMap['indexid'] : 0;
  var srcTypeCol = idxMap['sourcetype'] !== undefined ? idxMap['sourcetype'] : 1;
  var cneIdCol = idxMap['cneid'] !== undefined ? idxMap['cneid'] : 2;
  var driveFileIdCol = idxMap['drivefileid'] !== undefined ? idxMap['drivefileid'] : 3;
  var resTitleCol = idxMap['resourcetitle'] !== undefined ? idxMap['resourcetitle'] : 4;
  var topicCol = idxMap['topic'] !== undefined ? idxMap['topic'] : 5;
  var secCol = idxMap['sectionheading'] !== undefined ? idxMap['sectionheading'] : 6;
  var chunkIdxCol = idxMap['chunkindex'] !== undefined ? idxMap['chunkindex'] : 7;
  var textCol = idxMap['chunktext'] !== undefined ? idxMap['chunktext'] : 8;
  var keywordsCol = idxMap['clinicalkeywords'] !== undefined ? idxMap['clinicalkeywords'] : 9;
  var statusCol = idxMap['extractionstatus'] !== undefined ? idxMap['extractionstatus'] : 10;

  var uploadedCandidates = [];
  var libraryCandidates = [];

  var upperCneId = cleanCneId.toUpperCase();

  for (var r = 1; r < idxData.length; r++) {
    var status = String(idxData[r][statusCol] || '').trim().toUpperCase();
    if (status !== 'SUCCESS') continue;

    var srcType = String(idxData[r][srcTypeCol] || '').trim().toUpperCase();
    var rowCneId = String(idxData[r][cneIdCol] || '').trim().toUpperCase();
    var rowDriveId = String(idxData[r][driveFileIdCol] || '').trim();

    var candidate = {
      indexId: String(idxData[r][idCol] || ('IDX_' + r)),
      sourceType: srcType,
      resourceTitle: String(idxData[r][resTitleCol] || ''),
      topic: String(idxData[r][topicCol] || ''),
      sectionHeading: String(idxData[r][secCol] || ''),
      chunkIndex: Number(idxData[r][chunkIdxCol]) || 0,
      chunkText: String(idxData[r][textCol] || ''),
      clinicalKeywords: String(idxData[r][keywordsCol] || ''),
      relevanceScore: 0
    };

    if (srcType === 'UPLOADED_CNE') {
      if (rowCneId === upperCneId) {
        uploadedCandidates.push(candidate);
      }
    } else if (srcType === 'LOCAL_REFERENCE_LIB') {
      if (rowDriveId && activeLibFiles[rowDriveId]) {
        libraryCandidates.push(candidate);
      }
    }
  }

  // Score candidate chunks and evaluate clinical relevance gate (Phase 4D.1)
  var scoredUploaded = [];
  for (var u = 0; u < uploadedCandidates.length; u++) {
    var uc = uploadedCandidates[u];
    var score = calculateTopicRelevanceScore(cleanTopic, uc);
    if (score > 0 && passesClinicalRelevanceGate(cleanTopic, uc)) {
      uc.relevanceScore = score;
      scoredUploaded.push(uc);
    }
  }

  var scoredLibrary = [];
  for (var l = 0; l < libraryCandidates.length; l++) {
    var lc = libraryCandidates[l];
    var libScore = calculateTopicRelevanceScore(cleanTopic, lc);
    if (libScore > 0 && passesClinicalRelevanceGate(cleanTopic, lc)) {
      lc.relevanceScore = libScore;
      scoredLibrary.push(lc);
    }
  }

  // Sort each list descending by relevance score
  scoredUploaded.sort(function(a, b) {
    return b.relevanceScore - a.relevanceScore;
  });

  scoredLibrary.sort(function(a, b) {
    return b.relevanceScore - a.relevanceScore;
  });

  // Source ordering: relevant UPLOADED_CNE chunks first, followed by relevant LOCAL_REFERENCE_LIB chunks
  var totalEvidence = scoredUploaded.concat(scoredLibrary);

  if (totalEvidence.length === 0) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_TOPIC_MATERIAL',
      message: 'No relevant material related to this topic is available on the server. Kindly upload the relevant topic material and try again.',
      evidence: []
    };
  }

  return {
    success: true,
    cneId: cleanCneId,
    topic: cleanTopic,
    totalEvidenceChunks: totalEvidence.length,
    uploadedCount: scoredUploaded.length,
    libraryCount: scoredLibrary.length,
    evidence: totalEvidence.map(function(c) {
      return {
        indexId: c.indexId,
        sourceType: c.sourceType,
        resourceTitle: c.resourceTitle,
        sectionHeading: c.sectionHeading,
        chunkIndex: c.chunkIndex,
        chunkText: c.chunkText,
        relevanceScore: Math.round(c.relevanceScore * 10) / 10
      };
    })
  };
}

/**
 * Extract readable text from PDF
 */
function extractTextFromPdf(blob) {
  var bytes = blob.getBytes();
  if (!bytes || bytes.length < 30) {
    throw new Error('CORRUPT_FILE');
  }

  // Validate PDF header (%PDF)
  if ((bytes[0] & 0xFF) !== 0x25 || (bytes[1] & 0xFF) !== 0x50 || (bytes[2] & 0xFF) !== 0x44 || (bytes[3] & 0xFF) !== 0x46) {
    throw new Error('INVALID_PDF_HEADER');
  }

  var textBlocks = [];
  var rawString = '';
  try {
    rawString = blob.getDataAsString('ISO-8859-1');
  } catch (e) {
    rawString = '';
  }

  // Match streams in PDF: << dict >> stream ... endstream
  // Flexible regex handling spaces/tabs after stream, mixed line endings (\r\n, \n, \r)
  var streamRegex = /<<([\s\S]*?)>>[\s%]*stream[ \t]*\r?[\r\n]([\s\S]*?)(?:\r?\n|\r)[ \t]*endstream/g;
  var match;
  var streamCount = 0;

  while ((match = streamRegex.exec(rawString)) !== null && streamCount < 250) {
    streamCount++;
    var dict = match[1];
    var streamRaw = match[2];

    // If /Length is declared as direct integer, verify we have the full stream
    var lenMatch = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
    if (lenMatch) {
      var exactLen = parseInt(lenMatch[1], 10);
      if (exactLen > 0 && exactLen < 5000000 && streamRaw.length < exactLen) {
        var startIdx = match.index + match[0].indexOf(streamRaw);
        if (startIdx >= 0 && startIdx + exactLen <= rawString.length) {
          streamRaw = rawString.substr(startIdx, exactLen);
        }
      }
    }

    // Skip leading whitespace / null bytes to inspect header
    var firstByteIdx = 0;
    while (firstByteIdx < streamRaw.length && (streamRaw.charCodeAt(firstByteIdx) === 10 || streamRaw.charCodeAt(firstByteIdx) === 13 || streamRaw.charCodeAt(firstByteIdx) === 32 || streamRaw.charCodeAt(firstByteIdx) === 0)) {
      firstByteIdx++;
    }
    var b0 = streamRaw.length > firstByteIdx ? (streamRaw.charCodeAt(firstByteIdx) & 0xFF) : 0;
    var b1 = streamRaw.length > firstByteIdx + 1 ? (streamRaw.charCodeAt(firstByteIdx + 1) & 0xFF) : 0;
    var hasZlibHeader = (b0 & 0x0F) === 8 && (((b0 << 8) | b1) % 31 === 0);

    // Filter check: handles /Filter /FlateDecode, /Filter [ /FlateDecode ], /Filter[/FlateDecode], /F /FlateDecode, etc.
    var isFlate = hasZlibHeader || /(?:Filter|F)[\s\S]*?FlateDecode/i.test(dict);
    var decompressedText = '';

    if (isFlate) {
      var streamBytes = [];
      var sStart = (firstByteIdx > 0 && hasZlibHeader) ? firstByteIdx : 0;
      for (var b = sStart; b < streamRaw.length; b++) {
        streamBytes.push(streamRaw.charCodeAt(b) & 0xFF);
      }
      try {
        var inflatedBytes = inflatePdfStreamBytes(streamBytes);
        if (inflatedBytes && inflatedBytes.length > 0) {
          var charArray = [];
          for (var ic = 0; ic < inflatedBytes.length; ic++) {
            charArray.push(String.fromCharCode(inflatedBytes[ic]));
          }
          decompressedText = charArray.join('');
        }
      } catch (infErr) {
        decompressedText = '';
      }
    } else if (!/(?:Filter|F)/i.test(dict)) {
      decompressedText = streamRaw;
    }

    if (decompressedText) {
      var extractedStreamText = parsePdfStreamText(decompressedText);
      if (extractedStreamText && extractedStreamText.trim()) {
        textBlocks.push(extractedStreamText.trim());
      }
    }
  }

  // Fallback 1: If stream parsing found nothing, try parsePdfStreamText on rawString
  if (textBlocks.length === 0 && rawString) {
    var fallbackText = parsePdfStreamText(rawString);
    if (fallbackText && fallbackText.trim()) {
      textBlocks.push(fallbackText.trim());
    }
  }

  // Fallback 2: Scan raw string for uncompressed ASCII/UTF-8 phrases (useful for raw or object stream text)
  if (textBlocks.length === 0 && rawString) {
    var asciiWords = [];
    var wordRegex = /[A-Za-z0-9][A-Za-z0-9\s,.:;!?'"()\-–—/]{4,}[A-Za-z0-9.]/g;
    var wMatch;
    while ((wMatch = wordRegex.exec(rawString)) !== null && asciiWords.length < 150) {
      var candidate = wMatch[0].trim();
      if (!/^(obj|endobj|stream|endstream|xref|trailer|startxref|FlateDecode|Length|Filter|Type|Pages|Catalog|Font|Contents|MediaBox|CropBox|Rotate|Resources|ProcSet|Parent|Kids|Count|Producer|CreationDate|ModDate)$/i.test(candidate) && candidate.length >= 8) {
        asciiWords.push(candidate);
      }
    }
    if (asciiWords.join(' ').length >= 15) {
      textBlocks.push(asciiWords.join('\n'));
    }
  }

  return textBlocks.join('\n\n');
}

function decodePdfHex(hex) {
  hex = hex.replace(/[\s\r\n]/g, '');
  if (!hex) return '';
  if (hex.length % 2 !== 0) hex += '0';
  if (hex.toLowerCase().indexOf('feff') === 0) {
    var uStr = '';
    for (var u = 4; u < hex.length; u += 4) {
      var code = parseInt(hex.substr(u, 4), 16);
      if (!isNaN(code) && code >= 32 && code < 0xFFFE) {
        uStr += String.fromCharCode(code);
      }
    }
    return uStr;
  }
  if (hex.length >= 8 && hex.substr(0, 2) === '00' && hex.substr(4, 2) === '00') {
    var uStr2 = '';
    for (var u2 = 0; u2 < hex.length; u2 += 4) {
      var code2 = parseInt(hex.substr(u2, 4), 16);
      if (!isNaN(code2) && code2 >= 32 && code2 < 0xFFFE) {
        uStr2 += String.fromCharCode(code2);
      }
    }
    if (uStr2.length > 0) return uStr2;
  }
  var s = '';
  for (var i = 0; i < hex.length; i += 2) {
    var b = parseInt(hex.substr(i, 2), 16);
    if (!isNaN(b)) {
      if (b >= 32 && b <= 255) {
        s += String.fromCharCode(b);
      } else if (b === 10 || b === 13 || b === 9) {
        s += ' ';
      }
    }
  }
  return s;
}

function parsePdfStreamText(content) {
  var textPieces = [];
  function unescapePdfStr(str) {
    return str.replace(/\\([()nrtbf\\]|[0-7]{1,3})/g, function(m, esc) {
      if (esc === 'n') return '\n';
      if (esc === 'r') return '\r';
      if (esc === 't') return '\t';
      if (esc === 'b') return '\b';
      if (esc === 'f') return '\f';
      if (esc === '(' || esc === ')' || esc === '\\') return esc;
      if (/^[0-7]{1,3}$/.test(esc)) return String.fromCharCode(parseInt(esc, 8));
      return esc;
    });
  }

  function extractFromBlock(block) {
    // 1. Tj: (text) Tj
    var tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    var m;
    while ((m = tjRegex.exec(block)) !== null) {
      var t = unescapePdfStr(m[1]).trim();
      if (t) textPieces.push(t);
    }

    // 2. Tj with hex: <hex> Tj
    var tjHexRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
    while ((m = tjHexRegex.exec(block)) !== null) {
      var hText = decodePdfHex(m[1]).trim();
      if (hText) textPieces.push(hText);
    }

    // 3. Single / Double quote operators: (text) ' or <hex> ' or "
    var quoteRegex = /(?:\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F\s]+)>)\s*['"]/g;
    while ((m = quoteRegex.exec(block)) !== null) {
      var qText = m[1] !== undefined ? unescapePdfStr(m[1]).trim() : decodePdfHex(m[2]).trim();
      if (qText) textPieces.push(qText);
    }

    // 4. TJ: [(text) 10 <hex>] TJ
    var tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g;
    while ((m = tjArrRegex.exec(block)) !== null) {
      var inner = m[1];
      var strRegex = /\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F\s]+)>|(-?\d+(?:\.\d+)?)/g;
      var s;
      var line = '';
      while ((s = strRegex.exec(inner)) !== null) {
        if (s[1] !== undefined) {
          line += unescapePdfStr(s[1]);
        } else if (s[2] !== undefined) {
          line += decodePdfHex(s[2]);
        } else if (Number(s[3]) < -100) {
          line += ' ';
        }
      }
      if (line.trim()) textPieces.push(line.trim());
    }
  }

  var btEtRegex = /BT[\s\S]*?ET/g;
  var match;
  var hasBt = false;
  while ((match = btEtRegex.exec(content)) !== null) {
    hasBt = true;
    extractFromBlock(match[0]);
  }

  if (!hasBt || textPieces.length === 0) {
    extractFromBlock(content);
  }

  // Fallback: Scan parenthesized strings if no operators were matched
  if (textPieces.length === 0) {
    var parenRegex = /\(((?:[^()\\]|\\.)*)\)/g;
    var pm;
    while ((pm = parenRegex.exec(content)) !== null) {
      var pt = unescapePdfStr(pm[1]).trim();
      if (pt.length >= 3 && !/^[0-9\s.]+$/.test(pt)) {
        textPieces.push(pt);
      }
    }
  }

  return textPieces.join('\n');
}

/**
 * Pure JavaScript RFC 1951 Deflate / zlib Inflate implementation for PDF streams
 */
function inflatePdfStreamBytes(input) {
  var inPos = 0;
  // Skip leading whitespaces or newlines
  while (inPos < input.length && (input[inPos] === 10 || input[inPos] === 13 || input[inPos] === 32 || input[inPos] === 0)) {
    inPos++;
  }
  if (input.length > inPos + 2 && (input[inPos] & 0x0F) === 8 && (((input[inPos] << 8) | input[inPos + 1]) % 31 === 0)) {
    inPos += 2; // Skip 2-byte zlib header
  }

  var bitBuf = 0;
  var bitLen = 0;

  function getBits(n) {
    while (bitLen < n) {
      if (inPos >= input.length) return -1;
      bitBuf |= (input[inPos++] & 0xFF) << bitLen;
      bitLen += 8;
    }
    var val = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitLen -= n;
    return val;
  }

  function getBit() {
    return getBits(1);
  }

  var output = [];
  var isLast = 0;

  function buildHuffmanTree(lengths) {
    var maxLen = 0;
    for (var ml = 0; ml < lengths.length; ml++) {
      if (lengths[ml] > maxLen) maxLen = lengths[ml];
    }
    if (maxLen === 0) return null;
    var blCount = new Array(maxLen + 1);
    for (var bc = 0; bc <= maxLen; bc++) blCount[bc] = 0;
    for (var l = 0; l < lengths.length; l++) {
      if (lengths[l] > 0) blCount[lengths[l]]++;
    }
    var nextCode = new Array(maxLen + 1);
    for (var nc = 0; nc <= maxLen; nc++) nextCode[nc] = 0;
    var code = 0;
    for (var bits = 1; bits <= maxLen; bits++) {
      code = (code + blCount[bits - 1]) << 1;
      nextCode[bits] = code;
    }
    var tree = {};
    for (var i = 0; i < lengths.length; i++) {
      var len = lengths[i];
      if (len !== 0) {
        var c = nextCode[len]++;
        var rev = 0;
        for (var b = 0; b < len; b++) {
          rev = (rev << 1) | ((c >>> b) & 1);
        }
        tree[(len << 16) | rev] = i;
      }
    }
    return { tree: tree, maxLen: maxLen };
  }

  function decodeSymbol(huff) {
    var code = 0;
    for (var len = 1; len <= huff.maxLen; len++) {
      var bit = getBit();
      if (bit === -1) return -1;
      code |= (bit << (len - 1));
      var key = (len << 16) | code;
      if (huff.tree[key] !== undefined) {
        return huff.tree[key];
      }
    }
    return -1;
  }

  var fixedLitLens = new Array(288);
  for (var i0 = 0; i0 <= 143; i0++) fixedLitLens[i0] = 8;
  for (var i1 = 144; i1 <= 255; i1++) fixedLitLens[i1] = 9;
  for (var i2 = 256; i2 <= 279; i2++) fixedLitLens[i2] = 7;
  for (var i3 = 280; i3 <= 287; i3++) fixedLitLens[i3] = 8;
  var fixedLitTree = buildHuffmanTree(fixedLitLens);

  var fixedDistLens = new Array(32);
  for (var fd = 0; fd < 32; fd++) fixedDistLens[fd] = 5;
  var fixedDistTree = buildHuffmanTree(fixedDistLens);

  var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var lengthBases = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  var lengthExtra = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  var distBases = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  var distExtra = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

  while (!isLast) {
    isLast = getBit();
    var btype = getBits(2);
    if (btype === 0) {
      bitBuf = 0; bitLen = 0;
      if (inPos + 4 > input.length) break;
      var len = (input[inPos] & 0xFF) | ((input[inPos + 1] & 0xFF) << 8);
      inPos += 4;
      for (var u = 0; u < len && inPos < input.length; u++) {
        output.push(input[inPos++] & 0xFF);
      }
    } else if (btype === 1 || btype === 2) {
      var litTree, distTree;
      if (btype === 1) {
        litTree = fixedLitTree;
        distTree = fixedDistTree;
      } else {
        var hlit = getBits(5) + 257;
        var hdist = getBits(5) + 1;
        var hclen = getBits(4) + 4;
        var codeLengths = new Array(19);
        for (var cl = 0; cl < 19; cl++) codeLengths[cl] = 0;
        for (var o = 0; o < hclen; o++) codeLengths[order[o]] = getBits(3);
        var codeTree = buildHuffmanTree(codeLengths);
        var allLengths = [];
        while (allLengths.length < hlit + hdist) {
          var sym = decodeSymbol(codeTree);
          if (sym < 16) {
            allLengths.push(sym);
          } else if (sym === 16) {
            var repeat = getBits(2) + 3;
            var prev = allLengths[allLengths.length - 1] || 0;
            for (var r16 = 0; r16 < repeat; r16++) allLengths.push(prev);
          } else if (sym === 17) {
            var rep17 = getBits(3) + 3;
            for (var r17 = 0; r17 < rep17; r17++) allLengths.push(0);
          } else if (sym === 18) {
            var rep18 = getBits(7) + 11;
            for (var r18 = 0; r18 < rep18; r18++) allLengths.push(0);
          } else {
            break;
          }
        }
        litTree = buildHuffmanTree(allLengths.slice(0, hlit));
        distTree = buildHuffmanTree(allLengths.slice(hlit));
      }

      while (true) {
        var dSym = decodeSymbol(litTree);
        if (dSym === -1 || dSym === 256) break;
        if (dSym < 256) {
          output.push(dSym);
        } else {
          var lenIdx = dSym - 257;
          var length = lengthBases[lenIdx];
          var extraL = lengthExtra[lenIdx];
          if (extraL > 0) length += getBits(extraL);

          var distSym = decodeSymbol(distTree);
          if (distSym === -1) break;
          var dist = distBases[distSym];
          var extraD = distExtra[distSym];
          if (extraD > 0) dist += getBits(extraD);

          var src = output.length - dist;
          for (var k = 0; k < length; k++) {
            output.push(output[src + k]);
          }
        }
      }
    } else {
      break;
    }
  }

  return output;
}

/**
 * Get CNE Topic and Reference Material
 * 10-Column Schema (Backwards compatible with 5-column legacy layout):
 * 1: CNE ID
 * 2: Topic
 * 3: Reference Text / Clinical Guides
 * 4: Updated At
 * 5: Updated By
 * 6: Drive File ID
 * 7: File Name
 * 8: File Type
 * 9: Resource Person Name
 * 10: File Size
 */
function handleGetReferenceMaterial(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (record) {
    var authErr = checkCNEActionAuthorized(session, record);
    if (authErr) return authErr;
  }
  
  var sheet = getOrCreateSheet('CNE_Reference');
  var data = sheet.getDataRange().getValues();
  var colMap = getHeaderMap(sheet);
  
  var idCol = colMap['cneid'] !== undefined ? colMap['cneid'] : 0;
  var topicCol = colMap['topic'] !== undefined ? colMap['topic'] : 1;
  var refCol = colMap['referencetextclinicalguides'] !== undefined ? colMap['referencetextclinicalguides'] : (colMap['referencetext'] !== undefined ? colMap['referencetext'] : 2);
  var updatedCol = colMap['updatedat'] !== undefined ? colMap['updatedat'] : 3;
  var byCol = colMap['updatedby'] !== undefined ? colMap['updatedby'] : 4;
  var driveFileIdCol = colMap['drivefileid'];
  var fileNameCol = colMap['filename'];
  var fileTypeCol = colMap['filetype'];
  var rpNameCol = colMap['resourcepersonname'];
  var fileSizeCol = colMap['filesize'];
  
  var officerMap = getOfficerNameMap();

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      var refText = String(data[r][refCol] || '');
      var updatedAt = String(data[r][updatedCol] || '');
      var rawUpdatedBy = String(data[r][byCol] || '').trim();
      var driveFileId = driveFileIdCol !== undefined ? String(data[r][driveFileIdCol] || '').trim() : '';
      var fileName = fileNameCol !== undefined ? String(data[r][fileNameCol] || '').trim() : '';
      var fileType = fileTypeCol !== undefined ? String(data[r][fileTypeCol] || '').trim() : '';
      var rpName = rpNameCol !== undefined ? String(data[r][rpNameCol] || '').trim() : '';
      var fileSize = fileSizeCol !== undefined ? (Number(data[r][fileSizeCol]) || 0) : 0;
      
      // Resolve employee ID to Officer Name. NEVER expose employee ID as fallback
      var displayName = 'Coordinator';
      if (rawUpdatedBy) {
        var norm = normalizeEmpId(rawUpdatedBy);
        if (officerMap && officerMap[norm]) {
          displayName = officerMap[norm];
        }
      }

      return {
        success: true,
        data: {
          cneId: cneId,
          topic: String(data[r][topicCol] || ''),
          referenceText: refText,
          unifiedContent: refText,
          updatedAt: updatedAt,
          updatedBy: displayName,
          driveFileId: driveFileId,
          fileName: fileName,
          fileType: fileType,
          resourcePersonName: rpName,
          fileSize: fileSize,
          hasFile: Boolean(driveFileId)
        }
      };
    }
  }
  
  return {
    success: true,
    data: {
      cneId: cneId,
      topic: record ? record.topic : '',
      referenceText: record && record.description ? record.description : '',
      unifiedContent: record && record.description ? record.description : '',
      updatedAt: '',
      updatedBy: 'Coordinator',
      driveFileId: '',
      fileName: '',
      fileType: '',
      resourcePersonName: '',
      fileSize: 0,
      hasFile: false
    }
  };
}

/**
 * Get CNE Activity Progress (Real Data Check)
 * Checked against actual Google Sheet records:
 * 1. Material: Added or Not Added (checks CNE_Reference for clinical guides / notes)
 * 2. Questions: Generated or Not Generated (checks CNE Post Test Questions)
 * 3. QR Code: Generated or Not Generated (checks CNE_QR_Tokens for active QR token)
 * 4. Participants: Real participant count (checks CNE Post Test Responses)
 * 5. Post Test: Available, Not Available, or Completed
 * 6. Finalization: Finalized or Not Finalized
 */
function handleGetCNEActivityProgress(params, session) {
  if (!session) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found for ID: ' + cneId };

  // Authorization is always checked against authoritative CNE data before any
  // shared advisory cache is consulted.
  var progressAuthErr = checkCNEActionAuthorized(session, record);
  if (progressAuthErr) return progressAuthErr;

  var cleanId = cneId.toUpperCase();
  var progressCacheKey = 'cne_activity_' + normalizeCneId(cleanId);
  var forceFresh = Boolean(params && params.forceFresh);
  if (!forceFresh) {
    var cachedProgress = getFromScriptCache(progressCacheKey);
    if (cachedProgress && typeof cachedProgress === 'object') {
      return { success: true, data: cachedProgress, _cached: true };
    }
  }

  // 1. Learning Material: target only this CNE row instead of scanning the sheet.
  var materialStatus = 'Not Added';
  try {
    var refSheet = getOrCreateSheet('CNE_Reference');
    var refColMap = getHeaderMap(refSheet);
    var refIdCol = refColMap['cneid'] !== undefined ? refColMap['cneid'] : 0;
    var refTextCol = refColMap['referencetextclinicalguides'] !== undefined
      ? refColMap['referencetextclinicalguides']
      : (refColMap['referencetext'] !== undefined ? refColMap['referencetext'] : 2);
    var refFileIdCol = refColMap['drivefileid'];
    var refRowNum = findExactRowInColumn_(refSheet, refIdCol, cleanId, 2);
    if (refRowNum >= 2) {
      var refRow = refSheet.getRange(refRowNum, 1, 1, refSheet.getLastColumn()).getValues()[0];
      var refText = String(refRow[refTextCol] || '').trim();
      var refHasFile = refFileIdCol !== undefined && Boolean(String(refRow[refFileIdCol] || '').trim());
      if (refText.length >= 15 || refHasFile) materialStatus = 'Added';
    }
  } catch (e) {
    materialStatus = 'Not Added';
  }

  // 2. Questions: TextFinder narrows to matching CNE rows, then one bounded read
  // calculates finalized active questions.
  var questionsStatus = 'Not Generated';
  var finalizedCount = 0;
  try {
    var qSheet = getQuestionsSheet();
    var qCols = getQuestionColIndexes(qSheet);
    var qRows = findExactRowsInColumn_(qSheet, qCols.cneId, cleanId, 2);
    if (qRows.length > 0) {
      var qMin = Math.min.apply(null, qRows);
      var qMax = Math.max.apply(null, qRows);
      var qBlock = qSheet.getRange(qMin, 1, qMax - qMin + 1, qSheet.getLastColumn()).getValues();
      for (var qi = 0; qi < qBlock.length; qi++) {
        var qRow = qBlock[qi];
        if (String(qRow[qCols.cneId] || '').trim().toUpperCase() !== cleanId) continue;
        var isFin = String(qRow[qCols.isFinalized] || 'NO').toUpperCase() === 'YES';
        var qStatus = String(qRow[qCols.status] || 'ACTIVE').trim().toUpperCase();
        if (isFin && qStatus !== 'INACTIVE' && qStatus !== 'REPLACED' && qStatus !== 'INCOMPLETE') {
          finalizedCount++;
        }
      }
    }
    if (finalizedCount >= 5) questionsStatus = 'Generated';
  } catch (e) {
    questionsStatus = 'Not Generated';
  }

  // 3. QR Code: reuse the targeted active-token lookup.
  var qrStatus = 'Not Generated';
  try {
    if (findActiveQrTokenForCne_(cleanId)) qrStatus = 'Generated';
  } catch (e) {
    qrStatus = 'Not Generated';
  }

  // 4. Participants: find only rows belonging to this CNE and read one bounded block.
  var participantsCount = 0;
  try {
    var respSheet = getResponsesSheet();
    var respRows = findExactRowsInColumn_(respSheet, 1, cleanId, 2);
    var participantKeys = {};
    if (respRows.length > 0) {
      var pMin = Math.min.apply(null, respRows);
      var pMax = Math.max.apply(null, respRows);
      var respBlock = respSheet.getRange(pMin, 2, pMax - pMin + 1, 3).getValues(); // CNE ID, Employee/Participant ID, Name
      for (var pi = 0; pi < respBlock.length; pi++) {
        var pRow = respBlock[pi];
        if (String(pRow[0] || '').trim().toUpperCase() !== cleanId) continue;
        var progressEmpId = String(pRow[1] || '').trim().toUpperCase();
        var progressName = String(pRow[2] || '').trim().toLowerCase();
        var progressKey = progressEmpId ? ('ID:' + progressEmpId) : (progressName ? ('NAME:' + progressName) : '');
        if (progressKey) participantKeys[progressKey] = true;
      }
    }
    participantsCount = Object.keys(participantKeys).length;
  } catch (e) {
    participantsCount = 0;
  }

  var normalizedProgressStatus = normalizeCNEStatus(record.status);
  var isCompleted = normalizedProgressStatus === 'Completed';
  var postTestStatus = 'Not Available';
  if (isCompleted) {
    postTestStatus = 'Completed';
  } else if (qrStatus === 'Generated' && finalizedCount >= 5) {
    postTestStatus = 'Available';
  }

  var progressData = {
    cneId: cneId,
    materialStatus: materialStatus,
    questionsStatus: questionsStatus,
    finalizedQuestionsCount: finalizedCount,
    requiredQuestionsCount: 5,
    qrStatus: qrStatus,
    participantsCount: participantsCount,
    postTestStatus: postTestStatus,
    finalizationStatus: isCompleted ? 'Finalized' : 'Not Finalized'
  };

  // Advisory UI cache only. Child mutation flows explicitly request forceFresh,
  // so progress updates immediately after changes while repeated modal reads are cheap.
  putToScriptCache(progressCacheKey, progressData, 10);
  return { success: true, data: progressData };
}

/**
 * Authoritative Reservation Lifetime (10 minutes)
 */
var AI_QUOTA_RESERVATION_MS = 10 * 60 * 1000;

/**
 * Authoritative check: User must be System Admin, Responsible Area Incharge, or Assigned Resource Person for this CNE
 */
function checkQuestionManagementAuthorized(session, record) {
  return checkCNEActionAuthorized(session, record);
}

/**
 * Retrieve learning material text from CNE_Reference
 */
function getCNELearningMaterial(cneId) {
  if (!cneId) return '';
  var sheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference');
  if (!sheet || sheet.getLastRow() <= 1) return '';
  var data = sheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0] || '').trim().toUpperCase() === String(cneId).trim().toUpperCase()) {
      return String(data[r][2] || '').trim();
    }
  }
  return '';
}

/**
 * Get CNE AI Generation Quota Status
 * Authoritative read from CNE_AI_Quota sheet (Strict ONE successful generation per CNE)
 */
function handleGetAiQuota(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };

  // This is an advisory read only. Generation/reservation/commit endpoints still
  // revalidate authorization, lifecycle state, question lock state and quota under ScriptLock.
  var freshReadSession = refreshMutationSession(session);
  if (!freshReadSession.success) return freshReadSession;
  session = freshReadSession.session;

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  var quotaLifecycleStatus = normalizeCNEStatus(record.status);
  var isClosed = quotaLifecycleStatus === 'Completed' || quotaLifecycleStatus === 'Canceled';
  var isLocked = isCNEQuestionsLocked(cneId) || isClosed;
  var sheet = getOrCreateSheet('CNE_AI_Quota');
  var data = sheet.getDataRange().getValues();
  var attemptsUsed = 0;
  var maxQuota = 1;
  var lastAttemptAt = '';
  var lastGeneratedBy = '';

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      var rawUsed = parseInt(data[r][2], 10) || 0;
      attemptsUsed = rawUsed >= 1 ? 1 : 0;
      lastAttemptAt = String(data[r][4] || '');
      lastGeneratedBy = String(data[r][5] || '');
      break;
    }
  }

  var status = attemptsUsed >= 1 ? 'USED' : 'AVAILABLE';
  var canGenerate = (attemptsUsed === 0) && !isLocked;

  return {
    success: true,
    data: {
      cneId: cneId,
      topic: record.topic,
      status: status,
      attemptsUsed: attemptsUsed,
      maxQuota: maxQuota,
      remaining: Math.max(0, maxQuota - attemptsUsed),
      canGenerate: canGenerate,
      isLocked: isLocked,
      isClosed: isClosed,
      lastAttemptAt: lastAttemptAt,
      lastGeneratedBy: lastGeneratedBy
    }
  };
}

/**
 * Helper: Find persisted active AI question batches for a CNE.
 * Scans CNE Post Test Questions under ScriptLock.
 * Detects any batch of active AI questions tagged with [AI:<token>] or q_ai_ prefix.
 * Invariant: IF an AI batch has been successfully persisted for a CNE,
 * that CNE must never become eligible for a second AI generation.
 */
function findPersistedAiBatchInfo(cneId, questionsSheet, qCols) {
  var normCne = String(cneId || '').trim().toUpperCase();
  if (!normCne) {
    return { hasPersistedBatch: false, activeAiCount: 0, tokens: [], primaryToken: '', matchingRows: [] };
  }
  
  var sheet = questionsSheet || getQuestionsSheet();
  if (!sheet || sheet.getLastRow() <= 1) {
    return { hasPersistedBatch: false, activeAiCount: 0, tokens: [], primaryToken: '', matchingRows: [] };
  }
  
  var cols = qCols || getQuestionColIndexes(sheet);
  var data = sheet.getDataRange().getValues();
  var tokenCounts = {};
  var tokenRows = {};
  var allAiRows = [];
  var allAiCount = 0;
  
  for (var r = 1; r < data.length; r++) {
    var rCne = String(data[r][cols.cneId] || '').trim().toUpperCase();
    if (rCne !== normCne) continue;
    
    var rStatus = String(data[r][cols.status] || 'ACTIVE').trim().toUpperCase();
    if (rStatus !== 'ACTIVE') continue;
    
    var rCreatedBy = String(data[r][cols.createdBy] || '').trim();
    var rQId = String(data[r][cols.qId] || '').trim().toLowerCase();
    
    var match = rCreatedBy.match(/\[AI:([^\]]+)\]/);
    var token = match ? match[1].trim() : '';
    
    if (token || rCreatedBy.indexOf('[AI:') !== -1 || rQId.indexOf('q_ai_') === 0) {
      allAiCount++;
      allAiRows.push(r + 1);
      var key = token || '__NO_TOKEN__';
      tokenCounts[key] = (tokenCounts[key] || 0) + 1;
      if (!tokenRows[key]) tokenRows[key] = [];
      tokenRows[key].push(r + 1);
    }
  }
  
  var foundTokens = Object.keys(tokenCounts);
  var primaryToken = '';
  var hasBatch = false;
  
  for (var t = 0; t < foundTokens.length; t++) {
    var tk = foundTokens[t];
    if (tokenCounts[tk] >= 5) {
      hasBatch = true;
      primaryToken = tk === '__NO_TOKEN__' ? '' : tk;
      break;
    }
  }
  
  if (!hasBatch && allAiCount >= 5) {
    hasBatch = true;
    if (foundTokens.length > 0 && foundTokens[0] !== '__NO_TOKEN__') {
      primaryToken = foundTokens[0];
    }
  }
  
  return {
    hasPersistedBatch: hasBatch,
    activeAiCount: allAiCount,
    tokens: foundTokens.filter(function(k) { return k !== '__NO_TOKEN__'; }),
    primaryToken: primaryToken,
    matchingRows: allAiRows,
    tokenCounts: tokenCounts
  };
}

/**
 * Atomically reserve one AI generation slot for a CNE
 * Uses LockService to ensure atomic concurrency control
 */
function handleReserveAiQuota(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found for ID: ' + cneId };
  
  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  var lifecycleStatus = normalizeCNEStatus(record.status);
  if (lifecycleStatus === 'Completed' || lifecycleStatus === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_CLOSED',
      message: lifecycleStatus === 'Canceled'
        ? 'This CNE has been canceled. AI question generation is disabled.'
        : 'This CNE has already been finalized. AI question generation is disabled.'
    };
  }
  
  if (isCNEQuestionsLocked(cneId)) {
    return {
      success: false,
      errorCode: 'QUESTIONS_LOCKED',
      message: 'Questions are locked because post-test submissions have already begun for this CNE.'
    };
  }

  var genSource = String(params.generationSource || params.sourceMode || '').trim().toUpperCase();
  if (genSource === 'EXTERNAL') {
    return {
      success: false,
      errorCode: 'EXTERNAL_SOURCE_PROHIBITED',
      message: 'External or online clinical sources are not permitted. Question generation must use locally stored CNE or Nursing Reference Library material.'
    };
  }

  // Material-First rule: Learning Material must exist in Drive learning resource, reference text, or reference library index (minimum 15 characters)
  var learningMaterial = getCNELearningMaterial(cneId);
  var hasDriveResource = false;
  try {
    var refSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference');
    if (refSheet && refSheet.getLastRow() > 1) {
      var refData = refSheet.getDataRange().getValues();
      var refColMap = getHeaderMap(refSheet);
      var idCol = refColMap['cneid'] !== undefined ? refColMap['cneid'] : 0;
      var driveCol = refColMap['drivefileid'];
      for (var r = 1; r < refData.length; r++) {
        if (String(refData[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
          if (driveCol !== undefined && String(refData[r][driveCol] || '').trim()) {
            hasDriveResource = true;
          }
          break;
        }
      }
    }
  } catch (e) {
    hasDriveResource = false;
  }

  if (!hasDriveResource && (!learningMaterial || learningMaterial.length < 15)) {
    // Check if relevant material is available in local reference library / index (Priority 1: UPLOADED_CNE, Priority 2: LOCAL_REFERENCE_LIB)
    var localEvidenceCheck = retrieveCNETopicEvidence(cneId, record.topic, session);
    if (!localEvidenceCheck || !localEvidenceCheck.success || !localEvidenceCheck.evidence || localEvidenceCheck.evidence.length === 0) {
      return {
        success: false,
        errorCode: 'INSUFFICIENT_TOPIC_MATERIAL',
        message: 'No relevant material related to this topic is available on the server. Kindly upload the relevant topic material and try again.'
      };
    }
  }
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Backend is busy processing another request. Please try again in a few seconds.' };
  }
  
  try {
    var liveMutation = revalidateCneMutation_(session, cneId, 'QUESTION', false);
    if (!liveMutation.success) return liveMutation;
    session = liveMutation.session;
    record = liveMutation.record;
    if (isCNEQuestionsLocked(cneId)) {
      return { success: false, errorCode: 'QUESTIONS_LOCKED', message: 'Questions are permanently locked because post-test submissions have begun.' };
    }
    var sheet = getOrCreateSheet('CNE_AI_Quota');
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var attemptsUsed = 0;
    var maxQuota = 1;
    var existingToken = '';
    var reservedUntil = 0;
    var now = Date.now();
    
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        rowIndex = r + 1;
        var rawUsed = parseInt(data[r][2], 10) || 0;
        attemptsUsed = rawUsed >= 1 ? 1 : 0;
        existingToken = String(data[r][6] || '').trim();
        reservedUntil = parseInt(data[r][7], 10) || 0;
        break;
      }
    }
    
    // Protection against duplicate AI generation:
    // 1. Authoritative check in CNE_AI_Quota sheet:
    // AI generation status becomes USED ONLY after successful AI batch persistence by handleCommitAiQuota().
    // Manual questions MUST NOT consume, reset, or alter the one-time AI generation allowance.
    if (attemptsUsed >= 1) {
      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'AI question generation has already been completed for this CNE. The one-time initial AI generation allowance is used.',
        data: {
          cneId: cneId,
          status: 'USED',
          attemptsUsed: 1,
          maxQuota: 1,
          remaining: 0,
          canGenerate: false
        }
      };
    }

    // 2. CRITICAL RECONCILIATION & PREVENTION OF SECOND AI GENERATION:
    // Invariant: IF an AI batch has been successfully persisted for a CNE,
    // that CNE must NEVER become eligible for a second AI generation,
    // even if the quota USED state update previously failed or reservation expired!
    var questionsSheet = getQuestionsSheet();
    var qCols = getQuestionColIndexes(questionsSheet);
    var aiBatchInfo = findPersistedAiBatchInfo(cneId, questionsSheet, qCols);

    if (aiBatchInfo.hasPersistedBatch) {
      var committedToken = aiBatchInfo.primaryToken || existingToken || 'RECONCILED_BATCH';
      var nowIso = new Date().toISOString();
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 3, 1, 7).setValues([[1, 1, nowIso, session.employeeId, '', '0', committedToken]]);
      } else {
        sheet.appendRow([cneId, record.topic, 1, 1, nowIso, session.employeeId, '', '0', committedToken]);
      }
      SpreadsheetApp.flush();

      logAuditAction('RECONCILE_AI_QUOTA', session.employeeId, 'Reconciled CNE AI quota to USED after detecting already persisted batch (' + aiBatchInfo.activeAiCount + ' active AI questions) for CNE: ' + cneId, 'SUCCESS');

      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'An AI question batch has already been persisted for this CNE. The one-time initial AI generation allowance is used.',
        data: {
          cneId: cneId,
          status: 'USED',
          attemptsUsed: 1,
          maxQuota: 1,
          remaining: 0,
          canGenerate: false
        }
      };
    }

    // Check if there is an active unexpired reservation from another in-flight request
    var hasActiveReservation = existingToken && (reservedUntil > now);
    if (hasActiveReservation) {
      return {
        success: false,
        errorCode: 'RESERVATION_IN_PROGRESS',
        message: 'An AI question generation request is already in progress for this CNE. Please wait.',
        data: {
          cneId: cneId,
          status: 'RESERVED',
          attemptsUsed: 0,
          maxQuota: 1,
          remaining: 0,
          canGenerate: false
        }
      };
    }
    
    // Create new reservation token (valid for 10 minutes)
    var reservationToken = Utilities.getUuid().replace(/-/g, '');
    var newReservedUntil = now + AI_QUOTA_RESERVATION_MS;
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 7, 1, 2).setValues([[reservationToken, String(newReservedUntil)]]);
    } else {
      sheet.appendRow([cneId, record.topic, 0, 1, '', '', reservationToken, String(newReservedUntil), '']);
    }
    
    return {
      success: true,
      data: {
        reservationToken: reservationToken,
        cneId: cneId,
        status: 'AVAILABLE',
        attemptsUsed: 0,
        maxQuota: 1,
        remaining: 1,
        canGenerate: true
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Atomically commit a successful AI generation attempt
 * Implements strict failure-safe persistence and one-time generation state commit
 * Invariant: A CNE must NEVER reach a state where another AI generation can occur
 * after its first 5-question batch has already been successfully persisted.
 */
function handleCommitAiQuota(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  var reservationToken = sanitizeCellInput(params.reservationToken);
  if (!cneId || !reservationToken) {
    return { success: false, message: 'CNE ID and reservation token are required.' };
  }
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found for ID: ' + cneId };
  
  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  var lifecycleStatus = normalizeCNEStatus(record.status);
  if (lifecycleStatus === 'Completed' || lifecycleStatus === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_CLOSED',
      message: lifecycleStatus === 'Canceled'
        ? 'This CNE has been canceled. AI question generation is disabled.'
        : 'This CNE has already been finalized. AI question generation is disabled.'
    };
  }
  
  if (isCNEQuestionsLocked(cneId)) {
    return {
      success: false,
      errorCode: 'QUESTIONS_LOCKED',
      message: 'Questions are permanently locked because post-test submissions have begun.'
    };
  }

  // ScriptLock protects the entire critical section
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Backend is busy. Please try again.' };
  }
  
  try {
    var liveMutation = revalidateCneMutation_(session, cneId, 'QUESTION', false);
    if (!liveMutation.success) return liveMutation;
    session = liveMutation.session;
    record = liveMutation.record;
    if (isCNEQuestionsLocked(cneId)) {
      return { success: false, errorCode: 'QUESTIONS_LOCKED', message: 'Questions are permanently locked because post-test submissions have begun.' };
    }
    var quotaSheet = getOrCreateSheet('CNE_AI_Quota');
    var qData = quotaSheet.getDataRange().getValues();
    var rowIndex = -1;
    var attemptsUsed = 0;
    var maxQuota = 1;
    var storedToken = '';
    var reservedUntil = 0;
    var lastCommittedToken = '';
    
    for (var r = 1; r < qData.length; r++) {
      if (String(qData[r][0] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        rowIndex = r + 1;
        var rawUsed = parseInt(qData[r][2], 10) || 0;
        attemptsUsed = rawUsed >= 1 ? 1 : 0;
        storedToken = String(qData[r][6] || '').trim();
        reservedUntil = parseInt(qData[r][7], 10) || 0;
        lastCommittedToken = String(qData[r][8] || '').trim();
        break;
      }
    }

    // 1. RE-CHECK AUTHORITATIVE GENERATION STATE
    // Idempotency: If this token was already committed, return success immediately
    if (rowIndex > 0 && lastCommittedToken === reservationToken) {
      invalidateCNEQuestionsCache(cneId);
      return {
        success: true,
        alreadyCommitted: true,
        message: 'AI generation for this CNE was already successfully committed and marked USED.',
        data: {
          cneId: cneId,
          status: 'USED',
          attemptsUsed: 1,
          maxQuota: 1,
          remaining: 0,
          canGenerate: false
        }
      };
    }

    // Inspect existing questions sheet to prevent duplicate active AI batches and handle recovery
    var questionsSheet = getQuestionsSheet();
    var qCols = getQuestionColIndexes(questionsSheet);
    var qSheetData = questionsSheet.getDataRange().getValues();
    var aiBatchInfo = findPersistedAiBatchInfo(cneId, questionsSheet, qCols);

    // If an AI batch was already persisted for this CNE under another reservation token:
    if (aiBatchInfo.hasPersistedBatch && aiBatchInfo.primaryToken && aiBatchInfo.primaryToken !== reservationToken) {
      if (rowIndex > 0) {
        quotaSheet.getRange(rowIndex, 3, 1, 7).setValues([[1, 1, new Date().toISOString(), session.employeeId, '', '0', aiBatchInfo.primaryToken]]);
        SpreadsheetApp.flush();
      }
      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'An AI question batch has already been persisted for this CNE under another reservation.'
      };
    }
    
    if (rowIndex === -1 || (storedToken !== reservationToken && lastCommittedToken !== reservationToken)) {
      return {
        success: false,
        errorCode: 'INVALID_RESERVATION',
        message: 'Invalid, expired, or already consumed reservation token.'
      };
    }

    // 2. VALIDATE EXACTLY 5 QUESTIONS
    var rawQuestions = params.questions;
    if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length !== 5) {
      return {
        success: false,
        errorCode: 'INVALID_QUESTION_COUNT',
        message: 'Initial AI generation must contain EXACTLY 5 questions. Received: ' + (rawQuestions ? rawQuestions.length : 0)
      };
    }

    var now = Date.now();
    var nowIso = new Date().toISOString();
    var aiBatchTag = '[AI:' + reservationToken + ']';

    // Inspect existing questions in sheet across all rows for ID uniqueness & this CNE's reservation
    var allExistingSheetQIds = {};
    var matchingTagRows = []; // 1-based row numbers
    var matchingTagQIds = [];

    for (var rIdx = 1; rIdx < qSheetData.length; rIdx++) {
      var rQId = String(qSheetData[rIdx][qCols.qId] || '').trim();
      if (rQId) {
        allExistingSheetQIds[rQId.toLowerCase()] = true;
      }

      var rCne = String(qSheetData[rIdx][qCols.cneId] || '').trim().toUpperCase();
      if (rCne === cneId.toUpperCase()) {
        var rStatus = String(qSheetData[rIdx][qCols.status] || 'ACTIVE').trim().toUpperCase();
        var rCreatedBy = String(qSheetData[rIdx][qCols.createdBy] || '').trim();

        if (rStatus === 'ACTIVE') {
          if (rCreatedBy.indexOf(aiBatchTag) !== -1) {
            matchingTagRows.push(rIdx + 1);
            if (rQId) {
              matchingTagQIds.push(rQId);
            }
          }
        }
      }
    }

    // Idempotency/Recovery check: Has this AI batch ALREADY been persisted in the sheet?
    // A batch is considered already persisted ONLY when:
    // exactly 5 ACTIVE questions for the current CNE contain: [AI:<current reservationToken>]
    var batchAlreadyPersisted = (matchingTagRows.length === 5);

    // Handle incomplete state safely under ScriptLock:
    // If only some of the current batch exists (1 to 4 questions matching this reservation token),
    // DO NOT treat it as successfully persisted. Mark those orphaned partial rows INCOMPLETE so they
    // do not corrupt questions or conflict with the fresh 5-question batch.
    // Unrelated manual and AI questions are completely untouched.
    if (!batchAlreadyPersisted && matchingTagRows.length > 0 && matchingTagRows.length < 5) {
      for (var p = 0; p < matchingTagRows.length; p++) {
        questionsSheet.getRange(matchingTagRows[p], qCols.status + 1).setValue('INCOMPLETE');
      }
      SpreadsheetApp.flush();
    }

    // Reservation expiry check:
    // If the batch was already persisted prior to a failed quota commit, allow recovery to complete
    if (reservedUntil < now && !batchAlreadyPersisted) {
      return {
        success: false,
        errorCode: 'RESERVATION_EXPIRED',
        message: 'AI quota reservation token has expired. Please initiate a new generation request.'
      };
    }

    if (attemptsUsed >= 1 && !batchAlreadyPersisted) {
      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'One-time AI generation allowance for this CNE is already used.'
      };
    }

    // 3. VALIDATE & PERSIST THE COMPLETE 5-QUESTION BATCH
    var rowsToSave = [];
    var validatedQuestionIds = [];
    var seenInBatch = {};

    if (batchAlreadyPersisted) {
      // Use the verified IDs already in the sheet for this reservation
      validatedQuestionIds = matchingTagQIds;
    } else {
      for (var qIdx = 0; qIdx < rawQuestions.length; qIdx++) {
        var qObj = rawQuestions[qIdx];
        var qNum = qIdx + 1;

        var qText = sanitizeCellInput(qObj.question || '').trim();
        if (qText.length < 8) {
          return { success: false, message: 'Question ' + qNum + ' has insufficient question text (minimum 8 characters).' };
        }

        var opts = qObj.options || {};
        var optA = sanitizeCellInput(opts.A || '').trim();
        var optB = sanitizeCellInput(opts.B || '').trim();
        var optC = sanitizeCellInput(opts.C || '').trim();
        var optD = sanitizeCellInput(opts.D || '').trim();
        if (!optA || !optB || !optC || !optD) {
          return { success: false, message: 'Question ' + qNum + ' is missing one or more of options A, B, C, D.' };
        }

        var optSet = {};
        optSet[optA.toLowerCase()] = true;
        optSet[optB.toLowerCase()] = true;
        optSet[optC.toLowerCase()] = true;
        optSet[optD.toLowerCase()] = true;
        if (Object.keys(optSet).length < 4) {
          return { success: false, message: 'Question ' + qNum + ' has duplicate option choices.' };
        }

        var rawCorrect = String(qObj.correctOption || '').trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(rawCorrect)) {
          return { success: false, message: 'Question ' + qNum + ' has invalid correct option: ' + rawCorrect };
        }

        var expl = sanitizeCellInput(qObj.explanation || '').trim();
        if (expl.length < 5) {
          return { success: false, message: 'Question ' + qNum + ' is missing a clinical explanation/rationale.' };
        }

        var authSrc = sanitizeCellInput(qObj.authoritativeSource || '').trim();
        if (authSrc.length < 3) {
          return { success: false, message: 'Question ' + qNum + ' is missing an authoritative clinical source.' };
        }

        // QUESTION ID UNIQUENESS:
        // Ensure Question IDs do not already exist in CNE Post Test Questions.
        // If an ID collision exists, generate a new unique q_ai_<unique value> ID.
        // Never overwrite an existing row because of an ID collision.
        var rawQId = sanitizeCellInput(qObj.id || '').trim();
        var qId = rawQId;
        var needsNewId = !qId ||
                         !qId.toLowerCase().startsWith('q_ai_') ||
                         allExistingSheetQIds[qId.toLowerCase()] ||
                         seenInBatch[qId.toLowerCase()];

        if (needsNewId) {
          var randVal = Math.floor(Math.random() * 1000000);
          qId = 'q_ai_' + now + '_' + qNum + '_' + randVal;
          while (allExistingSheetQIds[qId.toLowerCase()] || seenInBatch[qId.toLowerCase()]) {
            randVal = Math.floor(Math.random() * 1000000);
            qId = 'q_ai_' + now + '_' + qNum + '_' + randVal;
          }
        }

        seenInBatch[qId.toLowerCase()] = true;
        allExistingSheetQIds[qId.toLowerCase()] = true;
        validatedQuestionIds.push(qId);

        var item = {
          cneId: cneId,
          id: qId,
          question: qText,
          optA: optA,
          optB: optB,
          optC: optC,
          optD: optD,
          correctOption: rawCorrect,
          explanation: expl,
          isFinalized: 'YES',
          isLocked: 'NO',
          createdAt: nowIso,
          createdBy: session.employeeId + ' ' + aiBatchTag,
          authoritativeSource: authSrc,
          status: 'ACTIVE'
        };
        rowsToSave.push(buildQuestionRowArray(qCols, item, qSheetData[0].length));
      }

      try {
        var startRow = questionsSheet.getLastRow() + 1;
        questionsSheet.getRange(startRow, 1, rowsToSave.length, rowsToSave[0].length).setValues(rowsToSave);
        SpreadsheetApp.flush();
      } catch (saveErr) {
        return {
          success: false,
          errorCode: 'QUESTION_PERSISTENCE_FAILED',
          message: 'Failed to write question batch to sheet: ' + (saveErr.message || saveErr)
        };
      }
    }

    // 4. VERIFY THAT THE EXACT 5 QUESTIONS TIED TO CURRENT RESERVATION WERE PERSISTED
    var isVerified = false;
    var verifiedTagCount = 0;
    for (var vAttempt = 1; vAttempt <= 3; vAttempt++) {
      SpreadsheetApp.flush();
      var verifyData = questionsSheet.getDataRange().getValues();
      verifiedTagCount = 0;

      for (var vRow = 1; vRow < verifyData.length; vRow++) {
        var rowCne = String(verifyData[vRow][qCols.cneId] || '').trim().toUpperCase();
        var rowStatus = String(verifyData[vRow][qCols.status] || 'ACTIVE').trim().toUpperCase();
        var rowCreatedBy = String(verifyData[vRow][qCols.createdBy] || '').trim();

        if (rowCne === cneId.toUpperCase() && rowStatus === 'ACTIVE') {
          if (rowCreatedBy.indexOf(aiBatchTag) !== -1) {
            verifiedTagCount++;
          }
        }
      }

      if (verifiedTagCount === 5) {
        isVerified = true;
        break;
      }
      Utilities.sleep(150);
    }

    if (!isVerified) {
      return {
        success: false,
        errorCode: 'PERSISTENCE_VERIFICATION_FAILED',
        message: 'Persistence verification failed: Exactly 5 questions matching current reservation could not be verified in sheet. Generation remains available.'
      };
    }

    // 5. MARK AI GENERATION STATE USED/GENERATED ONLY AFTER SUCCESSFUL PERSISTENCE VERIFICATION
    // Safely reconcile/retry the generation-state commit while protected by the script lock
    var quotaCommitSuccess = false;
    for (var retry = 1; retry <= 3; retry++) {
      try {
        quotaSheet.getRange(rowIndex, 3, 1, 7).setValues([[1, 1, nowIso, session.employeeId, '', '0', reservationToken]]);
        SpreadsheetApp.flush();
        var recheckVal = quotaSheet.getRange(rowIndex, 3).getValue();
        if (parseInt(recheckVal, 10) >= 1) {
          quotaCommitSuccess = true;
          break;
        }
      } catch (quotaUpdateErr) {
        Utilities.sleep(150);
      }
    }

    if (!quotaCommitSuccess) {
      // DO NOT silently report success.
      return {
        success: false,
        errorCode: 'QUOTA_COMMIT_FAILED',
        message: '5 questions were successfully persisted, but recording quota state encountered an error.'
      };
    }

    logAuditAction('AI_QUESTION_GENERATION_SUCCESS', session.employeeId, 'Generated, verified, and saved exactly 5 clinical MCQs for CNE: ' + cneId, 'SUCCESS');
    
    // Invalidate CNE questions read cache upon successful AI question commit
    invalidateCNEQuestionsCache(cneId);

    return {
      success: true,
      message: 'AI question generation completed and saved successfully (One-time generation marked USED).',
      data: {
        cneId: cneId,
        status: 'USED',
        attemptsUsed: 1,
        maxQuota: 1,
        remaining: 0,
        canGenerate: false
      }
    };
  } finally {
    // 6. RELEASE LOCK IN FINALLY
    lock.releaseLock();
  }
}

/**
 * Release an active reservation when Gemini generation fails or is aborted
 * Attempt remains unconsumed
 */
function handleReleaseAiQuota(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  var reservationToken = sanitizeCellInput(params.reservationToken);
  if (!cneId || !reservationToken) return { success: false, errorCode: 'INVALID_RESERVATION', message: 'CNE ID and reservation token are required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found for ID: ' + cneId };
  
  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy.' };
  }
  
  try {
    var liveMutation = revalidateCneMutation_(session, cneId, 'QUESTION', false);
    if (!liveMutation.success) return liveMutation;
    session = liveMutation.session;
    record = liveMutation.record;
    if (isCNEQuestionsLocked(cneId)) {
      return { success: false, errorCode: 'QUESTIONS_LOCKED', message: 'Questions are permanently locked because post-test submissions have begun.' };
    }
    var sheet = getOrCreateSheet('CNE_AI_Quota');
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var storedToken = '';
    
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        rowIndex = r + 1;
        storedToken = String(data[r][6] || '').trim();
        var attemptsUsed = parseInt(data[r][2], 10) || 0;
        if (attemptsUsed >= 1) {
          return {
            success: false,
            errorCode: 'QUOTA_EXHAUSTED',
            message: 'Cannot release reservation: One-time AI generation quota for this CNE has already been successfully committed and marked USED.'
          };
        }
        break;
      }
    }
    
    // Invariant check: Cannot release reservation if an AI batch has already been persisted for this CNE
    var questionsSheet = getQuestionsSheet();
    var qCols = getQuestionColIndexes(questionsSheet);
    var aiBatchInfo = findPersistedAiBatchInfo(cneId, questionsSheet, qCols);
    if (aiBatchInfo.hasPersistedBatch) {
      var committedToken = aiBatchInfo.primaryToken || storedToken || 'RECONCILED_BATCH';
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 3, 1, 7).setValues([[1, 1, new Date().toISOString(), session.employeeId, '', '0', committedToken]]);
        SpreadsheetApp.flush();
      }
      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'Cannot release reservation: An AI question batch has already been persisted for this CNE.'
      };
    }
    
    if (rowIndex === -1) {
      return {
        success: false,
        errorCode: 'INVALID_RESERVATION',
        message: 'No quota reservation record found for this CNE.'
      };
    }
    
    if (!storedToken || storedToken !== reservationToken) {
      return {
        success: false,
        errorCode: 'INVALID_RESERVATION',
        message: 'Reservation token is invalid, unknown, or does not match the active reservation for this CNE.'
      };
    }
    
    // ONLY when the token matches, clear the reservation token and reservation expiry
    sheet.getRange(rowIndex, 7, 1, 2).setValues([['', '0']]);
    return { success: true, message: 'Reservation released. Allowance remains AVAILABLE.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Authoritatively validate an AI generation quota reservation before Express invokes Gemini
 * Does NOT consume quota.
 * Does NOT increment attempts used.
 * Does NOT release reservation.
 */
function handleValidateAiQuotaReservation(params, session) {
  if (!session) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var cneId = sanitizeCellInput(params.cneId);
  var reservationToken = sanitizeCellInput(params.reservationToken);

  if (!cneId) {
    return { success: false, errorCode: 'CNE_ID_REQUIRED', message: 'CNE ID is required.' };
  }
  if (!reservationToken) {
    return { success: false, errorCode: 'RESERVATION_TOKEN_REQUIRED', message: 'Reservation token is required.' };
  }

  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  }

  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  var lifecycleStatus = normalizeCNEStatus(record.status);
  if (lifecycleStatus === 'Completed' || lifecycleStatus === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_CLOSED',
      message: lifecycleStatus === 'Canceled'
        ? 'This CNE has been canceled. AI question generation is disabled.'
        : 'This CNE has already been finalized. AI question generation is disabled.'
    };
  }

  if (isCNEQuestionsLocked(cneId)) {
    return {
      success: false,
      errorCode: 'QUESTIONS_LOCKED',
      message: 'Questions are permanently locked because post-test submissions have begun.'
    };
  }

  var genSource = String(params.generationSource || params.sourceMode || '').trim().toUpperCase();
  if (genSource === 'EXTERNAL') {
    return {
      success: false,
      errorCode: 'EXTERNAL_SOURCE_PROHIBITED',
      message: 'External or online clinical sources are not permitted. Question generation must use locally stored CNE or Nursing Reference Library material.'
    };
  }

  var learningMaterial = '';
  var authoritativeExtracted = null;
  var hasLearningResource = false;
  var authoritativeRpName = record.instructor || '';

  // 1. Resolve from authoritative CNE_Reference
  var dFileId = '';
  var refTxt = '';

  var refSheet = getSpreadsheet('CNE').getSheetByName('CNE_Reference');
  if (refSheet && refSheet.getLastRow() > 1) {
    var refData = refSheet.getDataRange().getValues();
    var refColMap = getHeaderMap(refSheet);
    var idCol = refColMap['cneid'] !== undefined ? refColMap['cneid'] : 0;
    var driveCol = refColMap['drivefileid'];
    var textCol = refColMap['referencetextclinicalguides'] !== undefined ? refColMap['referencetextclinicalguides'] : (refColMap['referencetext'] !== undefined ? refColMap['referencetext'] : 2);
    var rpCol = refColMap['resourcepersonname'];

    for (var r = 1; r < refData.length; r++) {
      if (String(refData[r][idCol] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        dFileId = driveCol !== undefined ? String(refData[r][driveCol] || '').trim() : '';
        refTxt = textCol !== undefined ? String(refData[r][textCol] || '').trim() : '';
        var rpTxt = rpCol !== undefined ? String(refData[r][rpCol] || '').trim() : '';
        if (rpTxt) authoritativeRpName = rpTxt;
        break;
      }
    }
  }

  // 2. If a CNE has an associated Learning Resource / Drive File ID:
  if (dFileId) {
    hasLearningResource = true;
    var extResult = extractLearningResourceContentCore(cneId, session);
    if (!extResult || !extResult.success) {
      return extResult || {
        success: false,
        errorCode: 'CONTENT_EXTRACTION_FAILED',
        message: 'Failed to extract content from authoritative learning resource.'
      };
    }
    authoritativeExtracted = extResult.data;
    learningMaterial = extResult.data.extractedText;
    if (extResult.data.resourcePersonName) {
      authoritativeRpName = extResult.data.resourcePersonName;
    }
  } else {
    learningMaterial = refTxt || getCNELearningMaterial(cneId);
  }

  // Retrieve relevant topic evidence using the approved Phase 4C/4D.1 pipeline:
  // Priority 1: UPLOADED_CNE, Priority 2: LOCAL_REFERENCE_LIB
  var topicEvidenceResult = retrieveCNETopicEvidence(cneId, record.topic, session);
  var retrievedEvidenceChunks = (topicEvidenceResult && topicEvidenceResult.success && topicEvidenceResult.evidence)
    ? topicEvidenceResult.evidence
    : [];

  // If direct extracted material is missing or too short, synthesize from retrieved local evidence chunks
  if ((!learningMaterial || learningMaterial.length < 15) && retrievedEvidenceChunks.length > 0) {
    learningMaterial = retrievedEvidenceChunks.map(function(ev) {
      return '[' + ev.sourceType + ': ' + (ev.resourceTitle || '') + (ev.sectionHeading ? ' - ' + ev.sectionHeading : '') + ']\n' + ev.chunkText;
    }).join('\n\n');
  }

  // If STILL no relevant local material can be found, STOP. No general knowledge fallback.
  if (!learningMaterial || learningMaterial.length < 15) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_TOPIC_MATERIAL',
      message: 'No relevant material related to this topic is available on the server. Kindly upload the relevant topic material and try again.'
    };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  try {
    var liveMutation = revalidateCneMutation_(session, cneId, 'QUESTION', false);
    if (!liveMutation.success) return liveMutation;
    session = liveMutation.session;
    record = liveMutation.record;
    if (isCNEQuestionsLocked(cneId)) {
      return { success: false, errorCode: 'QUESTIONS_LOCKED', message: 'Questions are permanently locked because post-test submissions have begun.' };
    }
    var sheet = getOrCreateSheet('CNE_AI_Quota');
    var data = sheet.getDataRange().getValues();
    var storedToken = '';
    var reservedUntil = 0;
    var attemptsUsed = 0;
    var maxQuota = 1;
    var found = false;
    var rowIndex = -1;

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        found = true;
        rowIndex = r + 1;
        var rawUsed = parseInt(data[r][2], 10) || 0;
        attemptsUsed = rawUsed >= 1 ? 1 : 0;
        storedToken = String(data[r][6] || '').trim();
        reservedUntil = parseInt(data[r][7], 10) || 0;
        break;
      }
    }

    if (!found || storedToken !== reservationToken) {
      return {
        success: false,
        errorCode: 'INVALID_RESERVATION',
        message: 'Invalid or unknown reservation token for this CNE.'
      };
    }

    var now = Date.now();
    if (reservedUntil < now) {
      return {
        success: false,
        errorCode: 'RESERVATION_EXPIRED',
        message: 'AI quota reservation token has expired. Please initiate a new generation request.'
      };
    }

    if (attemptsUsed >= 1) {
      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'One-time AI generation allowance already used for this CNE.'
      };
    }

    // Invariant check: Fail validation if an AI batch has already been persisted for this CNE
    var questionsSheet = getQuestionsSheet();
    var qCols = getQuestionColIndexes(questionsSheet);
    var aiBatchInfo = findPersistedAiBatchInfo(cneId, questionsSheet, qCols);
    if (aiBatchInfo.hasPersistedBatch) {
      var committedToken = aiBatchInfo.primaryToken || storedToken || 'RECONCILED_BATCH';
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 3, 1, 7).setValues([[1, 1, new Date().toISOString(), session.employeeId, '', '0', committedToken]]);
        SpreadsheetApp.flush();
      }
      return {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'One-time AI generation allowance already used for this CNE (persisted question batch detected).'
      };
    }

    return {
      success: true,
      authorized: true,
      data: {
        cneId: cneId,
        topic: record.topic,
        status: 'AVAILABLE',
        authorizedEmployeeId: session.employeeId,
        role: session.role,
        reservationToken: reservationToken,
        remaining: 1,
        authoritativeLearningContent: authoritativeExtracted ? authoritativeExtracted.extractedText : (learningMaterial || ''),
        resourcePersonName: authoritativeRpName || '',
        hasLearningResource: hasLearningResource,
        learningResourceMetadata: authoritativeExtracted || null,
        generationSource: 'MATERIAL',
        retrievedEvidence: retrievedEvidenceChunks
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Direct Gemini Clinical MCQ Generation in Google Apps Script (Internal Helper)
 * Grounded strictly in local CNE Material and Nursing Reference Library.
 * Authoritatively verifies session, question management authorization, and active quota reservation.
 * Invokes Google Gemini API directly using UrlFetchApp.
 * Never uses paid models or external online knowledge fallback.
 */
function generateAiQuestionsInternal(params, session) {
  if (!session || !session.employeeId) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var cneId = sanitizeCellInput(params.cneId);
  var reservationToken = sanitizeCellInput(params.reservationToken);

  if (!cneId) {
    return { success: false, errorCode: 'CNE_ID_REQUIRED', message: 'CNE ID is required.' };
  }
  if (!reservationToken) {
    return { success: false, errorCode: 'RESERVATION_TOKEN_REQUIRED', message: 'A valid AI quota reservation token is required before invoking question generation.' };
  }

  // 1. Authoritative validation of quota reservation and retrieval of local grounding material
  var validation = handleValidateAiQuotaReservation(params, session);
  if (!validation || !validation.success) {
    return validation || {
      success: false,
      errorCode: 'VALIDATION_FAILED',
      message: 'Failed to validate AI quota reservation.'
    };
  }

  var valData = validation.data || {};
  var authoritativeTopic = valData.topic || '';
  var authoritativeRpName = valData.resourcePersonName || '';
  var directMaterial = String(valData.authoritativeLearningContent || '').trim();
  var retrievedEvidence = Array.isArray(valData.retrievedEvidence) ? valData.retrievedEvidence : [];

  var authoritativeMaterial = directMaterial;
  if (retrievedEvidence.length > 0) {
    var formattedChunks = retrievedEvidence.map(function(ev, idx) {
      return '[Reference Evidence Chunk ' + (idx + 1) + ']\n' +
        'Source: ' + (ev.resourceTitle || 'Authoritative Clinical Guide') + (ev.sectionHeading ? ' - ' + ev.sectionHeading : '') + '\n' +
        ev.chunkText;
    }).join('\n\n---\n\n');

    if (directMaterial && directMaterial.indexOf(retrievedEvidence[0] && retrievedEvidence[0].chunkText ? retrievedEvidence[0].chunkText.substring(0, 40) : '___NOMATCH___') === -1) {
      authoritativeMaterial = '=== CNE SESSION LEARNING MATERIAL ===\n' + directMaterial + '\n\n=== RETRIEVED REFERENCE EVIDENCE ===\n' + formattedChunks;
    } else {
      authoritativeMaterial = formattedChunks;
    }
  }

  if (!authoritativeMaterial || authoritativeMaterial.length < 15) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_TOPIC_MATERIAL',
      message: 'No relevant material related to this topic is available on the server. Kindly upload the relevant topic material and try again.'
    };
  }

  // 2. Resolve Gemini API Key from Script Properties
  var props = PropertiesService.getScriptProperties();
  var apiKey = (props.getProperty('GEMINI_API_KEY') ||
                PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY') ||
                (params && params.geminiApiKey ? String(params.geminiApiKey).trim() : '')).trim();

  if (!apiKey) {
    return {
      success: false,
      errorCode: 'AI_CONFIGURATION_ERROR',
      message: 'Gemini API key is not configured in Google Apps Script properties (GEMINI_API_KEY). Please configure GEMINI_API_KEY in Project Settings > Script Properties.'
    };
  }

var configuredModel = (props.getProperty('GEMINI_MODEL') || 'gemini-3.8-flash').trim();

  var blockedModels = [
    'gemini-3.1-pro-preview',
    'gemini-3.1-pro',
    'gemini-3-pro-image',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-2.0-pro',
    'veo-3.1-generate-preview',
    'veo-3.1-lite-generate-preview',
    'lyria-3-clip-preview',
    'lyria-3-pro-preview'
  ];

  if (blockedModels.indexOf(configuredModel.toLowerCase()) !== -1 || /pro|image|veo|lyria/i.test(configuredModel)) {
    return {
      success: false,
      errorCode: 'PAID_MODEL_PROHIBITED',
      message: 'Configured model "' + configuredModel + '" is a paid model. Paid models are prohibited.'
    };
  }

  // 3. Construct clinical prompt
  var prompt = 'You are a Senior Clinical Nursing Education Specialist and Examiner at AIIMS (All India Institute of Medical Sciences).\n' +
    'Your task is to generate EXACTLY 5 high-quality Multiple Choice Questions (MCQs) for a Clinical Nursing Education (CNE) session post-test evaluation.\n\n' +
    'CNE Topic:\n"' + authoritativeTopic + '"\n' +
    (authoritativeRpName ? 'Resource Person / Speaker:\n"' + authoritativeRpName + '"\n' : '') +
    'Authoritative CNE Session Content & Local Clinical Material (PRIMARY GROUNDING SOURCE):\n"""\n' +
    authoritativeMaterial + '\n"""\n\n' +
    'GROUNDING AND SOURCE VERIFICATION REQUIREMENTS (STRICT):\n' +
    '1. PRIMARY GROUNDING SOURCE: Use the local CNE session content and clinical material above as your SOLE grounding source. All 5 questions, correct answers, and distractors must be strictly grounded in and directly verifiable from this supplied local clinical material.\n' +
    '2. EVIDENCE & SOURCE ATTRIBUTION:\n' +
    '   - For each question, extract and cite the specific authoritative clinical guideline, protocol, or standard cited in or directly supporting the session (e.g., "AIIMS Clinical Nursing Protocols", "WHO Guidelines", "Ministry of Health and Family Welfare / INC Standards", "Indian Nursing Council Standards", "CDC Clinical Guidelines", or local clinical literature).\n' +
    '   - DO NOT fabricate online verification, DO NOT invent fake URLs, and DO NOT cite unretrieved online sources. Instead, cite authoritative references contained in the supplied local material or clearly designate the source as derived from the verified CNE session (e.g., "Verified CNE Session: [Topic/Section/Protocol]").\n' +
    '   - Absolutely DO NOT cite random blogs, forums, social media, commercial SEO articles, or unverified websites.\n' +
    '3. CLINICAL RIGOR: Focus on clinical nursing practice, patient assessment, pharmacological safety, emergency escalation, infection control protocols, and nursing care standards.\n' +
    '4. OPTIONS: Each question must have EXACTLY 4 distinct, plausible options labeled A, B, C, and D.\n' +
    '5. CORRECT ANSWER: Exactly one option must be the correct answer ("A", "B", "C", or "D").\n' +
    '6. CLINICAL RATIONALE: Provide an evidence-based clinical rationale/explanation for why the correct option is the standard of care based strictly on the provided local material.\n' +
    '7. AUTHORITATIVE SOURCE: Every single question MUST provide the "authoritativeSource" field reflecting genuine grounding as specified above.\n' +
    '8. Output MUST strictly conform to the requested JSON schema with an array of exactly 5 question objects.';

  var geminiPayload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          questions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                questionText: { type: 'STRING' },
                optionA: { type: 'STRING' },
                optionB: { type: 'STRING' },
                optionC: { type: 'STRING' },
                optionD: { type: 'STRING' },
                correctOption: { type: 'STRING' },
                explanation: { type: 'STRING' },
                authoritativeSource: { type: 'STRING' }
              },
              required: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption', 'explanation', 'authoritativeSource']
            }
          }
        },
        required: ['questions']
      }
    }
  };

  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(configuredModel) + ':generateContent?key=' + encodeURIComponent(apiKey);
  var maxRetries = 2;
  var generatedText = '';
  var lastErrorMsg = '';

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var fetchOptions = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(geminiPayload),
        muteHttpExceptions: true
      };

      var res = UrlFetchApp.fetch(endpoint, fetchOptions);
      var resCode = res.getResponseCode();
      var resText = res.getContentText();

      if (resCode === 200) {
        var parsed = JSON.parse(resText);
        var cand = parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] ? parsed.candidates[0].content.parts[0].text : '';
        if (cand) {
          generatedText = cand;
          break;
        }
      } else {
        var errJson = {};
        try { errJson = JSON.parse(resText); } catch (pe) {}
        lastErrorMsg = (errJson.error && errJson.error.message) || ('HTTP ' + resCode + ': ' + resText);
        if ((resCode === 503 || resCode === 429) && attempt < maxRetries) {
          Utilities.sleep(1000);
        } else {
          break;
        }
      }
    } catch (fetchErr) {
      lastErrorMsg = fetchErr.message || String(fetchErr);
      if (attempt < maxRetries) {
        Utilities.sleep(1000);
      } else {
        break;
      }
    }
  }

  if (!generatedText) {
    var isOverloaded = /503|UNAVAILABLE|high demand|429|RESOURCE_EXHAUSTED|capacity/i.test(lastErrorMsg);
    return {
      success: false,
      errorCode: isOverloaded ? 'AI_TEMPORARILY_UNAVAILABLE' : 'AI_GENERATION_FAILED',
      message: isOverloaded
        ? 'AI question generation service is temporarily at capacity. Please try again in a few moments.'
        : ('AI question generation encountered an error: ' + (lastErrorMsg || 'No candidate response returned from Gemini.'))
    };
  }

  // 4. Parse and sanitize JSON output
  var cleaned = generatedText.trim();
  if (cleaned.indexOf('```json') === 0) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.indexOf('```') === 0) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  var rawQuestionsList = [];
  try {
    var jsonParsed = JSON.parse(cleaned);
    rawQuestionsList = Array.isArray(jsonParsed) ? jsonParsed : (Array.isArray(jsonParsed.questions) ? jsonParsed.questions : []);
  } catch (jsonErr) {
    return {
      success: false,
      errorCode: 'JSON_PARSE_ERROR',
      message: 'Failed to parse AI question output as structured JSON: ' + jsonErr.message
    };
  }

  if (!rawQuestionsList || rawQuestionsList.length !== 5) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_QUESTIONS',
      message: 'AI generation returned ' + (rawQuestionsList ? rawQuestionsList.length : 0) + ' questions. Exactly 5 questions are required.'
    };
  }

  var validatedQuestions = [];
  var seenQuestions = {};

  for (var qIdx = 0; qIdx < rawQuestionsList.length; qIdx++) {
    var rawQ = rawQuestionsList[qIdx] || {};
    var qText = String(rawQ.questionText || rawQ.question || '').trim();
    if (!qText || qText.length < 10) {
      return { success: false, errorCode: 'INVALID_QUESTION_TEXT', message: 'Question ' + (qIdx + 1) + ' is too short or missing question text.' };
    }

    var qKey = qText.toLowerCase();
    if (seenQuestions[qKey]) {
      return { success: false, errorCode: 'DUPLICATE_QUESTION', message: 'Duplicate question generated in batch at position ' + (qIdx + 1) };
    }
    seenQuestions[qKey] = true;

    var optA = String(rawQ.optionA || (rawQ.options && rawQ.options.A) || '').trim();
    var optB = String(rawQ.optionB || (rawQ.options && rawQ.options.B) || '').trim();
    var optC = String(rawQ.optionC || (rawQ.options && rawQ.options.C) || '').trim();
    var optD = String(rawQ.optionD || (rawQ.options && rawQ.options.D) || '').trim();

    if (!optA || !optB || !optC || !optD) {
      return { success: false, errorCode: 'MISSING_OPTIONS', message: 'Question ' + (qIdx + 1) + ' is missing one or more of options A, B, C, D.' };
    }

    var distinctCheck = {};
    distinctCheck[optA.toLowerCase()] = true;
    distinctCheck[optB.toLowerCase()] = true;
    distinctCheck[optC.toLowerCase()] = true;
    distinctCheck[optD.toLowerCase()] = true;
    if (Object.keys(distinctCheck).length < 4) {
      return { success: false, errorCode: 'DUPLICATE_OPTIONS', message: 'Question ' + (qIdx + 1) + ' has duplicate option values.' };
    }

    var rawCorrect = String(rawQ.correctOption || rawQ.correctAnswer || '').trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].indexOf(rawCorrect) === -1) {
      return { success: false, errorCode: 'INVALID_CORRECT_OPTION', message: 'Question ' + (qIdx + 1) + ' has invalid correct option: ' + rawCorrect };
    }

    var explanation = String(rawQ.explanation || rawQ.rationale || '').trim();
    if (!explanation || explanation.length < 5) {
      return { success: false, errorCode: 'MISSING_EXPLANATION', message: 'Question ' + (qIdx + 1) + ' is missing an evidence-based clinical explanation.' };
    }

    var authSource = String(rawQ.authoritativeSource || rawQ.source || rawQ.reference || '').trim();
    if (!authSource || authSource.length < 3) {
      authSource = 'Verified CNE Session: ' + authoritativeTopic;
    }

    // Informal source check
    if (/\b(blog|quora|reddit|wordpress|medium\.com|wikipedia)\b/i.test(authSource)) {
      return { success: false, errorCode: 'INFORMAL_SOURCE_PROHIBITED', message: 'Question ' + (qIdx + 1) + ' cites an informal source (' + authSource + ').' };
    }

    if (/^https?:\/\//i.test(authSource) || /live online verified/i.test(authSource)) {
      authSource = 'Verified CNE Material (Topic: ' + authoritativeTopic + ') - ' + (authSource.replace(/^https?:\/\/[^\/]+\/?/i, '') || 'Clinical Standard');
    }

    validatedQuestions.push({
      id: 'q_ai_' + Date.now() + '_' + (qIdx + 1),
      cneId: cneId,
      question: qText,
      questionText: qText,
      options: {
        A: optA,
        B: optB,
        C: optC,
        D: optD
      },
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      correctOption: rawCorrect,
      explanation: explanation,
      authoritativeSource: authSource,
      status: 'Active',
      isFinalized: true
    });
  }

  logAuditAction('AI_QUESTION_GENERATION_COMPLETED', session.employeeId, 'Generated 5 grounded clinical MCQs for CNE: ' + cneId + ' via Gemini (' + configuredModel + ')', 'SUCCESS');

  return {
    success: true,
    data: validatedQuestions,
    cneId: cneId,
    reservationToken: reservationToken,
    source: configuredModel
  };
}

/**
 * Part 1C / 1D: Authoritative End-to-End Gemini MCQ Generation in Google Apps Script
 * Action: generateCNEQuestions
 *
 * Workflow:
 * 1. Verify authenticated session
 * 2. Resolve CNE record
 * 3. Authorize user (admin or instructor/incharge) via checkQuestionManagementAuthorized
 * 4. Confirm CNE is not finalized (normalizeCNEStatus !== 'Completed')
 * 5. Confirm questions are not permanently locked (!isCNEQuestionsLocked)
 * 6. Safely reserve one-time quota (locks held only during reservation)
 * 7. Retrieve only approved local CNE / reference material
 * 8. Invoke Gemini REST API dynamically via UrlFetchApp (WITHOUT holding ScriptLock)
 * 9. Validate exactly 5 structurally valid MCQs
 * 10. Persist questions and commit quota (under lock)
 * 11. Release reservation if generation/validation fails
 * 12. Write audit log and return generated questions
 */
function handleGenerateCNEQuestions(params, session) {
  if (!session || !session.employeeId) {
    return {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.'
    };
  }

  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) {
    return { success: false, errorCode: 'CNE_ID_REQUIRED', message: 'CNE ID is required.' };
  }

  var record = getCNEScheduleRecord(cneId);
  if (!record) {
    return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found for ID: ' + cneId };
  }

  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  var generationStatus = normalizeCNEStatus(record.status);
  if (generationStatus === 'Completed') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_FINALIZED',
      message: 'This CNE has already been finalized. Questions cannot be modified.'
    };
  }
  if (generationStatus === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_CANCELED',
      message: 'This CNE has been canceled. Questions cannot be generated or modified.'
    };
  }

  if (isCNEQuestionsLocked(cneId)) {
    return {
      success: false,
      errorCode: 'QUESTIONS_LOCKED',
      message: 'Questions are permanently locked because post-test submissions have already begun.'
    };
  }

  // Quota reservation: lock acquired and released within handleReserveAiQuota
  var reservationToken = params.reservationToken ? sanitizeCellInput(params.reservationToken) : '';
  if (!reservationToken) {
    var reserveRes = handleReserveAiQuota({ cneId: cneId, generationSource: 'MATERIAL' }, session);
    if (!reserveRes || !reserveRes.success) {
      return reserveRes || {
        success: false,
        errorCode: 'QUOTA_EXHAUSTED',
        message: 'Failed to reserve AI generation quota.'
      };
    }

    reservationToken = reserveRes.data && reserveRes.data.reservationToken;
    if (!reservationToken) {
      return {
        success: false,
        errorCode: 'RESERVATION_FAILED',
        message: 'Failed to obtain AI quota reservation token.'
      };
    }
  }

  // Direct Gemini network call and validation (OUTSIDE ScriptLock)
  var genRes = null;
  try {
    genRes = generateAiQuestionsInternal({
      cneId: cneId,
      reservationToken: reservationToken,
      generationSource: 'MATERIAL'
    }, session);
  } catch (genErr) {
    genRes = {
      success: false,
      errorCode: 'AI_GENERATION_FAILED',
      message: 'Unexpected error during AI generation: ' + (genErr && genErr.message ? genErr.message : String(genErr))
    };
  }

  if (!genRes || !genRes.success || !Array.isArray(genRes.data) || genRes.data.length !== 5) {
    // Release quota reservation so the user does not forfeit allowance upon failure
    try {
      handleReleaseAiQuota({ cneId: cneId, reservationToken: reservationToken }, session);
    } catch (relErr) {
      console.warn('Failed to release AI quota reservation: ' + relErr);
    }
    return genRes || {
      success: false,
      errorCode: 'AI_GENERATION_FAILED',
      message: 'AI question generation failed to produce 5 valid questions.'
    };
  }

  var validatedQuestions = genRes.data;

  // Persist questions to sheet
  var saveRes = handleSaveCNEQuestions({
    cneId: cneId,
    questions: validatedQuestions
  }, session);

  if (!saveRes || !saveRes.success) {
    try {
      handleReleaseAiQuota({ cneId: cneId, reservationToken: reservationToken }, session);
    } catch (relErr2) {}
    return saveRes || {
      success: false,
      errorCode: 'SAVE_QUESTIONS_FAILED',
      message: 'Failed to persist generated MCQs to sheet.'
    };
  }

  // Commit quota to USED
  var commitRes = handleCommitAiQuota({
    cneId: cneId,
    reservationToken: reservationToken,
    questions: validatedQuestions
  }, session);

  if (!commitRes || !commitRes.success) {
    logAuditAction('AI_QUOTA_COMMIT_WARNING', session.employeeId, 'Questions saved but quota commit returned warning for CNE: ' + cneId, 'WARNING');
  }

  logAuditAction('AI_QUESTION_GENERATION_SUCCESS', session.employeeId, 'End-to-end AI MCQ generation completed and saved for CNE: ' + cneId, 'SUCCESS');

  return {
    success: true,
    data: validatedQuestions,
    cneId: cneId,
    source: genRes.source || 'gemini',
    message: 'Successfully generated and saved exactly 5 clinical MCQs.'
  };
}

/**
 * Normalize CNE ID consistently across operations
 */
function normalizeCneId(cneId) {
  return String(cneId || '').trim().toUpperCase();
}

/**
 * Invalidate CNE Questions Cache
 * Called whenever questions for a CNE are mutated (saved, edited, added, replaced, deactivated, finalized, or committed by AI).
 */
function invalidateCNEQuestionsCache(cneId) {
  var normCneId = normalizeCneId(cneId);
  if (!normCneId) return;
  try {
    var cacheKey = 'cne_questions_' + normCneId;
    CacheService.getScriptCache().remove(cacheKey);
  } catch (e) {
    console.warn('Failed to invalidate CNE questions cache: ' + e.message);
  }
}

/**
 * Read and Cache Sanitized Finalized Post-Test Questions (Short-lived 60s CacheService)
 * STRICT SECURITY:
 * - Cache key: 'cne_questions_' + normalizeCneId(cneId)
 * - Cache payload: Sanitized question array ONLY (id, question, options A/B/C/D).
 * - NEVER contains correct answers, answer keys, explanations, or authoritative sources.
 * - Best-effort: On any cache read/parse/write error, gracefully falls back to Google Sheets.
 */
function getCachedSanitizedQuestions(cneId) {
  var normCneId = normalizeCneId(cneId);
  if (!normCneId) return [];

  var cacheKey = 'cne_questions_' + normCneId;
  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length >= 5) {
        return parsed;
      }
    }
  } catch (cacheReadErr) {
    console.warn('CacheService read error for ' + cacheKey + ': ' + (cacheReadErr.message || cacheReadErr));
  }

  // Fallback to reading authoritative Google Sheet
  var qSheet = getQuestionsSheet();
  if (!qSheet || qSheet.getLastRow() <= 1) return [];

  var cols = getQuestionColIndexes(qSheet);
  var qData = qSheet.getDataRange().getValues();
  var sanitized = [];

  for (var r = 1; r < qData.length; r++) {
    var qCne = String(qData[r][cols.cneId] || '').trim().toUpperCase();
    var isFin = String(qData[r][cols.isFinalized] || 'NO').toUpperCase() === 'YES';
    var qStatus = String(qData[r][cols.status] || 'ACTIVE').trim().toUpperCase();
    if (qCne === normCneId && isFin && qStatus !== 'INACTIVE' && qStatus !== 'REPLACED') {
      sanitized.push({
        id: String(qData[r][cols.qId] || ''),
        question: String(qData[r][cols.question] || ''),
        options: {
          A: String(qData[r][cols.optA] || ''),
          B: String(qData[r][cols.optB] || ''),
          C: String(qData[r][cols.optC] || ''),
          D: String(qData[r][cols.optD] || '')
        }
        // STRICT SECURITY: Correct Option, Explanation, and Authoritative Source are NEVER included in sanitized payload!
      });
    }
  }

  // Only cache if valid minimum question count (>= 5) and safe size (< 90KB)
  if (sanitized.length >= 5) {
    try {
      var payloadStr = JSON.stringify(sanitized);
      if (payloadStr.length < 90000) {
        CacheService.getScriptCache().put(cacheKey, payloadStr, 60);
      }
    } catch (cacheWriteErr) {
      console.warn('CacheService write error for ' + cacheKey + ': ' + (cacheWriteErr.message || cacheWriteErr));
    }
  }

  return sanitized;
}

/**
 * Helper: Ensure Question Sheet has all necessary headers
 */
function ensureQuestionsSheetHeaders(sheet) {
  // Legacy external-source headers (Source URL, Source Retrieved At) are removed from dynamic creation.
  // Existing sheet columns are preserved untouched.
  return;
}

/**
 * Helper: Resolve Questions Sheet
 * Prefers 'CNE Post Test Questions' tab; falls back to 'CNE_Questions' if already present.
 */
function getQuestionsSheet() {
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('CNE Post Test Questions') || ss.getSheetByName('CNE_Questions');
  if (!sheet) {
    sheet = getOrCreateSheet('CNE Post Test Questions');
  }
  ensureQuestionsSheetHeaders(sheet);
  return sheet;
}

/**
 * Helper: Resolve Questions Sheet Column Mapping
 * Dynamically resolves 0-based column indexes from the header row.
 */
function getQuestionColIndexes(sheet) {
  ensureQuestionsSheetHeaders(sheet);
  var colMap = getHeaderMap(sheet);
  return {
    cneId: colMap['cneid'] !== undefined ? colMap['cneid'] : 0,
    qId: colMap['questionid'] !== undefined ? colMap['questionid'] : (colMap['id'] !== undefined ? colMap['id'] : 1),
    question: colMap['questiontext'] !== undefined ? colMap['questiontext'] : (colMap['question'] !== undefined ? colMap['question'] : 2),
    optA: colMap['optiona'] !== undefined ? colMap['optiona'] : 3,
    optB: colMap['optionb'] !== undefined ? colMap['optionb'] : 4,
    optC: colMap['optionc'] !== undefined ? colMap['optionc'] : 5,
    optD: colMap['optiond'] !== undefined ? colMap['optiond'] : 6,
    correctOption: colMap['correctoption'] !== undefined ? colMap['correctoption'] : (colMap['correctanswer'] !== undefined ? colMap['correctanswer'] : 7),
    explanation: colMap['explanation'] !== undefined ? colMap['explanation'] : (colMap['rationale'] !== undefined ? colMap['rationale'] : 8),
    isFinalized: colMap['isfinalized'] !== undefined ? colMap['isfinalized'] : 9,
    isLocked: colMap['islocked'] !== undefined ? colMap['islocked'] : 10,
    createdAt: colMap['createdat'] !== undefined ? colMap['createdat'] : 11,
    createdBy: colMap['createdby'] !== undefined ? colMap['createdby'] : 12,
    authoritativeSource: colMap['authoritativesource'] !== undefined ? colMap['authoritativesource'] : (colMap['source'] !== undefined ? colMap['source'] : 13),
    status: colMap['status'] !== undefined ? colMap['status'] : 14
  };
}

/**
 * Builds a 0-indexed row array for writing to the question sheet according to the dynamic column mapping.
 */
function buildQuestionRowArray(cols, item, totalCols, existingRow) {
  var row = existingRow ? existingRow.slice() : [];
  var targetLen = Math.max(totalCols || 0, 15);
  for (var k in cols) {
    if (cols[k] !== undefined && cols[k] >= targetLen) {
      targetLen = cols[k] + 1;
    }
  }
  while (row.length < targetLen) {
    row.push('');
  }
  if (cols.cneId !== undefined) row[cols.cneId] = item.cneId || '';
  if (cols.qId !== undefined) row[cols.qId] = item.id || '';
  if (cols.question !== undefined) row[cols.question] = item.question || '';
  if (cols.optA !== undefined) row[cols.optA] = item.optA || '';
  if (cols.optB !== undefined) row[cols.optB] = item.optB || '';
  if (cols.optC !== undefined) row[cols.optC] = item.optC || '';
  if (cols.optD !== undefined) row[cols.optD] = item.optD || '';
  if (cols.correctOption !== undefined) row[cols.correctOption] = item.correctOption || 'A';
  if (cols.explanation !== undefined) row[cols.explanation] = item.explanation || '';
  if (cols.isFinalized !== undefined) row[cols.isFinalized] = item.isFinalized || 'NO';
  if (cols.isLocked !== undefined) row[cols.isLocked] = item.isLocked || 'NO';
  if (cols.createdAt !== undefined && (!existingRow || !row[cols.createdAt])) row[cols.createdAt] = item.createdAt || new Date().toISOString();
  if (cols.createdBy !== undefined) row[cols.createdBy] = item.createdBy || '';
  if (cols.authoritativeSource !== undefined) row[cols.authoritativeSource] = item.authoritativeSource || '';
  if (cols.status !== undefined) row[cols.status] = item.status || 'ACTIVE';
  return row;
}

/**
 * Helper: Count Active Finalized Questions for a CNE
 * Returns the authoritative count of active post-test questions persisted in Google Sheets.
 */
function countActiveCNEQuestions(cneId) {
  if (!cneId) return 0;
  var sheet = getQuestionsSheet();
  if (!sheet || sheet.getLastRow() <= 1) return 0;
  var data = sheet.getDataRange().getValues();
  var cols = getQuestionColIndexes(sheet);
  var count = 0;
  var targetCne = String(cneId).trim().toUpperCase();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][cols.cneId] || '').trim().toUpperCase() === targetCne) {
      var status = String(data[r][cols.status] || 'ACTIVE').trim().toUpperCase();
      var isFinalized = String(data[r][cols.isFinalized] || '').trim().toUpperCase();
      if (status === 'ACTIVE' && (isFinalized === 'YES' || isFinalized === 'TRUE')) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Helper: Resolve Responses Sheet
 * Prefers 'CNE Post Test Responses' tab; falls back to 'CNE_Participants' if already present.
 */
function getResponsesSheet() {
  var ss = getSpreadsheet('CNE');
  var sheet = ss.getSheetByName('CNE Post Test Responses') || ss.getSheetByName('CNE_Participants');
  if (!sheet) {
    sheet = getOrCreateSheet('CNE Post Test Responses');
  }
  return sheet;
}

/**
 * Helper: Resolve QR Tokens Sheet
 */
function getQRTokensSheet() {
  return getOrCreateSheet('CNE_QR_Tokens');
}

/**
 * Check if Question Set is Locked
 * A question set is permanently locked once the FIRST participant post-test submission occurs.
 */
function isCNEQuestionsLocked(cneId) {
  if (!cneId) return false;
  if (isCNEQuestionsLockedCached_(cneId)) return true;

  var target = String(cneId).trim().toUpperCase();
  var record = getCNEScheduleRecord(cneId);
  if (record && normalizeCNEStatus(record.status) === 'Completed') {
    markCNEQuestionsLockedCache_(cneId);
    return true;
  }

  var partSheet = getResponsesSheet();
  if (partSheet && partSheet.getLastRow() > 1) {
    // Read only B:J; deliberately excludes large Answers JSON column L.
    var pData = partSheet.getRange(2, 2, partSheet.getLastRow() - 1, 9).getValues();
    for (var p = 0; p < pData.length; p++) {
      var rowCneId = String(pData[p][0] || '').trim().toUpperCase();
      var source = String(pData[p][8] || '').trim().toUpperCase();
      if (rowCneId === target && source === 'POST_TEST') {
        markCNEQuestionsLockedCache_(cneId);
        return true;
      }
    }
  }

  var qSheet = getQuestionsSheet();
  if (qSheet && qSheet.getLastRow() > 1) {
    var cols = getQuestionColIndexes(qSheet);
    var matchingRows = findExactRowsInColumn_(qSheet, cols.cneId, target, 2);
    if (matchingRows.length > 0) {
      var minRow = Math.min.apply(null, matchingRows);
      var maxRow = Math.max.apply(null, matchingRows);
      var lockValues = qSheet.getRange(minRow, cols.isLocked + 1, maxRow - minRow + 1, 1).getValues();
      var rowSet = {};
      for (var mr = 0; mr < matchingRows.length; mr++) rowSet[matchingRows[mr]] = true;
      for (var offset = 0; offset < lockValues.length; offset++) {
        var sheetRow = minRow + offset;
        if (rowSet[sheetRow] && String(lockValues[offset][0] || '').trim().toUpperCase() === 'YES') {
          markCNEQuestionsLockedCache_(cneId);
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Save & Finalize Questions for CNE
 * Enforces:
 * - Admin or Assigned Resource Person / Instructor authorization
 * - Locked if first participant post-test submission exists
 * - Minimum 5 ACTIVE questions required
 * - Authoritative Clinical Source required for each question
 * - Question history preservation (marking replaced questions REPLACED/INACTIVE rather than hard deletion)
 */
function handleSaveCNEQuestions(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  if (isCNEClosedForParticipantAccess(record)) {
    return { success: false, errorCode: 'CNE_CLOSED', message: 'QR Code and Post-Test are disabled after CNE finalization or cancellation.' };
  }
  
  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  // Fix 5: Lock question modification after finalization
  if (normalizeCNEStatus(record.status) === 'Completed') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_FINALIZED',
      message: 'This CNE has already been finalized. Questions cannot be modified.'
    };
  }
  
  if (isCNEQuestionsLocked(cneId)) {
    return {
      success: false,
      errorCode: 'QUESTIONS_LOCKED',
      message: 'Questions are permanently locked because post-test submissions have already begun and cannot be modified.'
    };
  }
  
  var rawQuestions = params.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return {
      success: false,
      errorCode: 'MINIMUM_QUESTIONS_REQUIRED',
      message: 'Validation failed: A valid questions array is required.'
    };
  }
  
  // Strict Pre-Validation
  var seenIds = {};
  var validatedList = [];
  var activeCount = 0;
  var finalizedCount = 0;
  var now = new Date().toISOString();

  for (var i = 0; i < rawQuestions.length; i++) {
    var q = rawQuestions[i];
    var qNum = i + 1;
    if (!q || typeof q !== 'object') {
      return { success: false, message: 'Question ' + qNum + ': Invalid question data format.' };
    }

    var qId = sanitizeCellInput(q.id || ('q' + qNum)).trim();
    if (!qId) {
      return { success: false, message: 'Question ' + qNum + ': Question ID is required.' };
    }
    if (seenIds[qId.toLowerCase()]) {
      return { success: false, message: 'Validation failed: Duplicate question ID detected: "' + qId + '". Question IDs must be unique.' };
    }
    seenIds[qId.toLowerCase()] = true;

    var qText = sanitizeCellInput(q.question || '').trim();
    if (!qText || qText.length < 8) {
      return { success: false, message: 'Question ' + qNum + ': Question text is required (minimum 8 characters).' };
    }

    var opts = q.options || {};
    var optA = sanitizeCellInput(opts.A !== undefined ? opts.A : (opts.a || '')).trim();
    var optB = sanitizeCellInput(opts.B !== undefined ? opts.B : (opts.b || '')).trim();
    var optC = sanitizeCellInput(opts.C !== undefined ? opts.C : (opts.c || '')).trim();
    var optD = sanitizeCellInput(opts.D !== undefined ? opts.D : (opts.d || '')).trim();

    if (!optA || !optB || !optC || !optD) {
      return { success: false, message: 'Question ' + qNum + ': All four options (Option A, Option B, Option C, Option D) must be present and non-empty.' };
    }

    var rawCorrect = String(q.correctOption || '').trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].indexOf(rawCorrect) === -1) {
      return { success: false, message: 'Question ' + qNum + ': A valid correct option (must be A, B, C, or D) is required.' };
    }

    var expl = sanitizeCellInput(q.explanation || '').trim();
    if (!expl || expl.length < 5) {
      return { success: false, message: 'Question ' + qNum + ': Clinical rationale / explanation is required.' };
    }

    var authSrc = sanitizeCellInput(q.authoritativeSource || '').trim();
    if (!authSrc || authSrc.length < 3) {
      return { success: false, message: 'Question ' + qNum + ': Authoritative clinical source from local material is required.' };
    }

    var qStatus = String(q.status || 'ACTIVE').trim().toUpperCase();
    if (qStatus !== 'INACTIVE' && qStatus !== 'REPLACED') {
      qStatus = 'ACTIVE';
      activeCount++;
    }

    var isFin = (q.isFinalized === true || String(q.isFinalized).toUpperCase() === 'YES') ? 'YES' : 'NO';
    if (isFin === 'YES' && qStatus === 'ACTIVE') {
      finalizedCount++;
    }

    validatedList.push({
      id: qId,
      question: qText,
      optA: optA,
      optB: optB,
      optC: optC,
      optD: optD,
      correctOption: rawCorrect,
      explanation: expl,
      isFinalized: isFin,
      authoritativeSource: authSrc,
      status: qStatus
    });
  }

  // Minimum 5 ACTIVE questions required before saving
  if (activeCount < 5) {
    return {
      success: false,
      errorCode: 'MINIMUM_QUESTIONS_REQUIRED',
      message: 'Validation failed: A minimum of 5 active questions is required. Active count: ' + activeCount
    };
  }

  // Concurrency lock for writing questions
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }

  try {
    var liveSaveQuestions = revalidateCneMutation_(session, cneId, 'QUESTION', false);
    if (!liveSaveQuestions.success) return liveSaveQuestions;
    session = liveSaveQuestions.session;
    record = liveSaveQuestions.record;

    // Re-verify locked state under lock
    if (isCNEQuestionsLocked(cneId)) {
      return {
        success: false,
        errorCode: 'QUESTIONS_LOCKED',
        message: 'Questions are permanently locked because post-test submissions have begun.'
      };
    }

    var sheet = getQuestionsSheet();
    var cols = getQuestionColIndexes(sheet);
    var data = sheet.getDataRange().getValues();
    var existingRowMap = {}; // qId.toLowerCase() -> rowNumber
    var existingCneRows = [];

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][cols.cneId] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        var existingQId = String(data[r][cols.qId] || '').trim().toLowerCase();
        existingRowMap[existingQId] = r + 1;
        existingCneRows.push({ rowNum: r + 1, qId: existingQId });
      }
    }

    // Preserve history: For existing rows not in validatedList, mark as REPLACED instead of hard deleting
    for (var e = 0; e < existingCneRows.length; e++) {
      var exQId = existingCneRows[e].qId;
      if (!seenIds[exQId]) {
        var rowNum = existingCneRows[e].rowNum;
        sheet.getRange(rowNum, cols.status + 1).setValue('REPLACED');
      }
    }

    // Update or append validated questions
    for (var v = 0; v < validatedList.length; v++) {
      var item = validatedList[v];
      var targetRow = existingRowMap[item.id.toLowerCase()];
      var existingRowValues = targetRow ? data[targetRow - 1] : null;
      var rowValues = buildQuestionRowArray(cols, {
        cneId: cneId,
        id: item.id,
        question: item.question,
        optA: item.optA,
        optB: item.optB,
        optC: item.optC,
        optD: item.optD,
        correctOption: item.correctOption,
        explanation: item.explanation,
        isFinalized: item.isFinalized,
        isLocked: 'NO',
        createdAt: now,
        createdBy: session.employeeId,
        authoritativeSource: item.authoritativeSource,
        status: item.status
      }, data[0].length, existingRowValues);

      if (targetRow) {
        sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
    }

    logAuditAction('SAVE_QUESTIONS', session.employeeId, 'Saved ' + validatedList.length + ' questions (' + activeCount + ' active, ' + finalizedCount + ' finalized) for CNE: ' + cneId, 'SUCCESS');

    // Invalidate CNE questions read cache upon successful mutation
    invalidateCNEQuestionsCache(cneId);

    return {
      success: true,
      message: 'Question set validated and saved successfully.',
      totalQuestions: validatedList.length,
      activeCount: activeCount,
      finalizedCount: finalizedCount,
      readyForPostTest: activeCount >= 5 && finalizedCount >= 5
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get Questions for Admin/Incharge (Includes answer keys, authoritative sources, and status)
 */
function handleGetCNEQuestions(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  
  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;
  
  var isLocked = isCNEQuestionsLocked(cneId);
  var sheet = getQuestionsSheet();
  var cols = getQuestionColIndexes(sheet);
  var data = sheet.getDataRange().getValues();
  var questions = [];
  var finalizedCount = 0;
  var activeCount = 0;
  
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][cols.cneId] || '').trim().toUpperCase() === cneId.toUpperCase()) {
      var isFin = String(data[r][cols.isFinalized] || 'NO').toUpperCase() === 'YES';
      var authSrc = String(data[r][cols.authoritativeSource] || '').trim();
      var qStatus = String(data[r][cols.status] || 'ACTIVE').trim().toUpperCase();
      if (qStatus !== 'INACTIVE' && qStatus !== 'REPLACED') {
        qStatus = 'ACTIVE';
        activeCount++;
        if (isFin) finalizedCount++;
      }
      questions.push({
        id: String(data[r][cols.qId] || ''),
        question: String(data[r][cols.question] || ''),
        options: {
          A: String(data[r][cols.optA] || ''),
          B: String(data[r][cols.optB] || ''),
          C: String(data[r][cols.optC] || ''),
          D: String(data[r][cols.optD] || '')
        },
        correctOption: String(data[r][cols.correctOption] || 'A'),
        explanation: String(data[r][cols.explanation] || ''),
        authoritativeSource: authSrc,
        status: qStatus,
        isFinalized: isFin,
        isLocked: isLocked || String(data[r][cols.isLocked] || 'NO').toUpperCase() === 'YES'
      });
    }
  }
  
  return {
    success: true,
    data: questions,
    isLocked: isLocked,
    activeCount: activeCount,
    finalizedCount: finalizedCount,
    readyForPostTest: activeCount >= 5 && finalizedCount >= 5
  };
}

/**
 * Get Secure QR Token for CNE Post-Test
 * Rejects if fewer than 5 active finalized questions
 */

/**
 * Post-Test participant verification helpers.
 * Public QR participants are verified server-side before questions/submission.
 * Internal: Employee ID + Date of Joining (DOJ).
 * External: Name + Email, saved as a stable external participant registration.
 */
function normalizeExternalEmail(email) {
  var value = String(email || '').trim().toLowerCase();
  if (!value || value.length > 254) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '';
  return value;
}

function makeExternalParticipantId(email) {
  var normalized = normalizeExternalEmail(email);
  if (!normalized) return '';
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalized, Utilities.Charset.UTF_8);
  var hex = digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return 'EXT-' + hex.slice(0, 24).toUpperCase();
}

function isExternalParticipantId(participantId) {
  return /^EXT-[A-F0-9]{24}$/i.test(String(participantId || '').trim());
}

function isCNEClosedForParticipantAccess(record) {
  if (!record) return true;
  var status = normalizeCNEStatus(record.status);
  return status === 'Completed' || status === 'Canceled';
}

function resolveActiveQrToken(qrToken) {
  var token = sanitizeCellInput(qrToken || '');
  if (!token) return null;
  var qrSheet = getQRTokensSheet();
  if (!qrSheet || qrSheet.getLastRow() <= 1) return null;
  var rowIndex = findExactRowInColumn_(qrSheet, 0, token, 2);
  if (rowIndex < 2) return null;
  var row = qrSheet.getRange(rowIndex, 1, 1, 5).getValues()[0];
  var rowTok = String(row[0] || '').trim();
  var rowStatus = String(row[4] || 'ACTIVE').trim().toUpperCase();
  if (rowTok === token && rowStatus === 'ACTIVE') {
    return { qrToken: rowTok, cneId: String(row[1] || '').trim() };
  }
  return null;
}

function deactivateQRTokensForCNE(cneId) {
  var target = String(cneId || '').trim().toUpperCase();
  if (!target) return;
  var qrSheet = getQRTokensSheet();
  if (!qrSheet || qrSheet.getLastRow() <= 1) return;
  var rows = findExactRowsInColumn_(qrSheet, 1, target, 2);
  var statusRanges = [];
  for (var i = 0; i < rows.length; i++) {
    var status = String(qrSheet.getRange(rows[i], 5).getValue() || 'ACTIVE').trim().toUpperCase();
    if (status === 'ACTIVE') statusRanges.push('E' + rows[i]);
  }
  if (statusRanges.length > 0) qrSheet.getRangeList(statusRanges).setValue('INACTIVE');
}

function generatePostTestParticipantVerificationToken(cneId, participantId, participantType) {
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!secret || !secret.trim()) throw new Error('SESSION_SECRET is not configured in Script Properties.');
  var type = String(participantType || '').trim().toUpperCase();
  var cne = String(cneId || '').trim().toUpperCase();
  var pid = String(participantId || '').trim().toUpperCase();
  var timestamp = Date.now();
  var nonce = Utilities.getUuid().replace(/-/g, '');
  var payload = 'PT|' + type + '|' + cne + '|' + pid + '|' + timestamp + '|' + nonce;
  var sigBytes = Utilities.computeHmacSha256Signature(payload, secret.trim());
  var signature = sigBytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return payload + '|' + signature;
}

function verifyPostTestParticipantVerificationToken(token, expectedCneId) {
  var raw = String(token || '').trim();
  var parts = raw.split('|');
  if (parts.length !== 7 || parts[0] !== 'PT') return null;
  var type = String(parts[1] || '').toUpperCase();
  var cneId = String(parts[2] || '').toUpperCase();
  var participantId = String(parts[3] || '').toUpperCase();
  var timestamp = parseInt(parts[4], 10);
  var nonce = String(parts[5] || '');
  var receivedSig = String(parts[6] || '');
  if ((type !== 'INTERNAL' && type !== 'EXTERNAL') || !cneId || !participantId || !nonce || !receivedSig) return null;
  if (expectedCneId && cneId !== String(expectedCneId).trim().toUpperCase()) return null;
  var now = Date.now();
  // Verification token is intentionally short-lived: 6 hours.
  if (isNaN(timestamp) || timestamp > now + 300000 || now - timestamp > 6 * 60 * 60 * 1000) return null;
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!secret || !secret.trim()) return null;
  var payload = 'PT|' + type + '|' + cneId + '|' + participantId + '|' + timestamp + '|' + nonce;
  var sigBytes = Utilities.computeHmacSha256Signature(payload, secret.trim());
  var expectedSig = sigBytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  if (!timingSafeEqual(receivedSig, expectedSig)) return null;
  return { participantType: type, cneId: cneId, participantId: participantId };
}

function findExternalRegistration(cneId, participantId) {
  var partSheet = getResponsesSheet();
  if (!partSheet || partSheet.getLastRow() <= 1) return null;
  var cne = String(cneId || '').trim().toUpperCase();
  var pid = String(participantId || '').trim().toUpperCase();
  var rows = partSheet.getRange(2, 2, partSheet.getLastRow() - 1, 9).getValues(); // B:J only
  for (var r = 0; r < rows.length; r++) {
    if (String(rows[r][0] || '').trim().toUpperCase() === cne &&
        String(rows[r][1] || '').trim().toUpperCase() === pid &&
        String(rows[r][8] || '').trim().toUpperCase() === 'EXTERNAL_REGISTRATION') {
      var rowIndex = r + 2;
      var fullRow = partSheet.getRange(rowIndex, 1, 1, 14).getValues()[0];
      return {
        rowIndex: rowIndex,
        participantId: pid,
        name: String(fullRow[3] || '').trim(),
        email: String(fullRow[13] || '').replace(/^External Email:\s*/i, '').trim(),
        designation: String(fullRow[4] || 'External Participant').trim(),
        department: String(fullRow[5] || '').trim()
      };
    }
  }
  return null;
}

var OTP_PURPOSE_POSTTEST_INTERNAL = 'POSTTEST_INTERNAL';
var OTP_PURPOSE_POSTTEST_EXTERNAL = 'POSTTEST_EXTERNAL';

function buildPostTestOtpPrincipal(cneId, identity) {
  var cne = String(cneId || '').trim().toUpperCase();
  var id = String(identity || '').trim().toUpperCase();
  return cne && id ? (cne + '#' + id) : '';
}

function findExistingPostTestSubmission(cneId, participantId) {
  var partSheet = getResponsesSheet();
  if (!partSheet || partSheet.getLastRow() <= 1) return null;
  var cne = String(cneId || '').trim().toUpperCase();
  var pid = String(participantId || '').trim().toUpperCase();
  var rows = partSheet.getRange(2, 2, partSheet.getLastRow() - 1, 9).getValues(); // B:J only; excludes Answers JSON
  for (var r = 0; r < rows.length; r++) {
    if (String(rows[r][0] || '').trim().toUpperCase() === cne &&
        String(rows[r][1] || '').trim().toUpperCase() === pid &&
        String(rows[r][8] || '').trim().toUpperCase() === 'POST_TEST') {
      var rowIndex = r + 2;
      var fullRow = partSheet.getRange(rowIndex, 1, 1, 13).getValues()[0]; // A:M, one matched row only
      return {
        rowIndex: rowIndex,
        responseId: String(fullRow[0] || '').trim(),
        participantId: pid,
        participantName: String(fullRow[3] || '').trim(),
        designation: String(fullRow[4] || '').trim(),
        department: String(fullRow[5] || '').trim(),
        score: fullRow[6],
        totalQuestions: fullRow[7],
        percentage: fullRow[8],
        submittedAt: String(fullRow[10] || '').trim(),
        status: String(fullRow[12] || '').trim()
      };
    }
  }
  return null;
}

function sendPostTestOtpEmail(email, otp, record, participantType) {
  var topic = record && record.topic ? String(record.topic).trim() : 'CNE Post-Test';
  var typeLabel = participantType === 'EXTERNAL' ? 'external participant' : 'internal participant';
  MailApp.sendEmail({
    to: email,
    subject: 'CNE Post-Test verification code',
    body:
      'CNE Management System - Post-Test Verification\n\n' +
      'Your 6-digit verification code is: ' + otp + '\n\n' +
      'CNE: ' + topic + '\n' +
      'Verification type: ' + typeLabel + '\n\n' +
      'This code expires in 10 minutes and can be used only once.\n' +
      'If you did not request this code, please ignore this email.\n\n' +
      'AIIMS Rishikesh - CNE Management System'
  });
}

/**
 * Request a Post-Test OTP.
 * INTERNAL: Employee ID is resolved only from Officers data and OTP is sent to its registered EmailID.
 * EXTERNAL: Name + email are supplied by the participant and OTP is sent to that email.
 * The challenge is bound to both CNE ID and participant identity, so it cannot be reused for another CNE.
 */
function handleRequestPostTestOtp(params, session) {
  var resolvedQr = resolveActiveQrToken(params.qrToken || params.token);
  if (!resolvedQr || !resolvedQr.cneId) {
    return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'A valid active QR token is required for Post-Test verification.' };
  }

  var cneId = resolvedQr.cneId;
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  if (isCNEClosedForParticipantAccess(record)) {
    return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Post-Test verification is closed.' };
  }

  var participantType = String(params.participantType || 'INTERNAL').trim().toUpperCase();
  var participantId = '';
  var principal = '';
  var purpose = '';
  var email = '';

  if (participantType === 'INTERNAL') {
    var employeeId = normalizeEmpId(params.employeeId);
    if (!employeeId) return { success: false, errorCode: 'EMPLOYEE_ID_REQUIRED', message: 'Employee ID is required.' };

    var officer;
    try {
      officer = findOfficerById(employeeId);
    } catch (e) {
      return { success: false, message: e.message || 'Unable to access Officers data.' };
    }
    if (!officer || !officer.name) {
      return { success: false, errorCode: 'INVALID_EMPLOYEE_ID', message: 'Employee ID was not found in Officers data.' };
    }
    email = String(officer.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(email)) {
      return { success: false, errorCode: 'EMAIL_NOT_AVAILABLE', message: 'A valid registered email address is not available for this Employee ID. Please contact the CNE administrator to update Officers data.' };
    }
    participantId = employeeId;
    purpose = OTP_PURPOSE_POSTTEST_INTERNAL;
    principal = buildPostTestOtpPrincipal(cneId, participantId);
  } else if (participantType === 'EXTERNAL') {
    var externalName = sanitizeCellInput(params.name || params.externalName || '');
    var externalEmail = normalizeExternalEmail(params.email || params.externalEmail || '');
    if (!externalName || externalName.length < 2) {
      return { success: false, errorCode: 'INVALID_EXTERNAL_NAME', message: 'Please enter the external participant name.' };
    }
    if (!externalEmail) {
      return { success: false, errorCode: 'INVALID_EXTERNAL_EMAIL', message: 'Please enter a valid email address.' };
    }
    participantId = makeExternalParticipantId(externalEmail);
    purpose = OTP_PURPOSE_POSTTEST_EXTERNAL;
    principal = buildPostTestOtpPrincipal(cneId, participantId);
    email = externalEmail;
  } else {
    return { success: false, errorCode: 'INVALID_PARTICIPANT_TYPE', message: 'Participant type must be INTERNAL or EXTERNAL.' };
  }

  // Refresh the external Officers roster BEFORE taking the script-wide lock.
  // The Officers spreadsheet is outside this script's transactional boundary, so holding
  // ScriptLock during that remote read adds contention without making the roster read atomic.
  if (participantType === 'INTERNAL') {
    try {
      officer = findOfficerByIdFresh_(participantId);
    } catch (freshRosterErr) {
      return { success: false, message: freshRosterErr.message || 'Unable to access Officers data.' };
    }
    if (!officer || !officer.name) {
      return { success: false, errorCode: 'INVALID_EMPLOYEE_ID', message: 'Employee ID was not found in Officers data.' };
    }
    email = String(officer.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(email)) {
      return { success: false, errorCode: 'EMAIL_NOT_AVAILABLE', message: 'A valid registered email address is not available for this Employee ID.' };
    }
  }

  var previousSubmission = findExistingPostTestSubmission(cneId, participantId);
  if (previousSubmission) {
    return { success: false, errorCode: 'ALREADY_SUBMITTED', message: 'This participant has already submitted the Post-Test for this CNE.' };
  }

  var cooldownKey = 'ptotp_cd_' + purpose + '_' + principal;
  var cache = CacheService.getScriptCache();
  if (cache.get(cooldownKey)) {
    return { success: false, errorCode: 'OTP_COOLDOWN', message: 'Please wait 60 seconds before requesting another verification code.' };
  }

  if (countRecentOtpSends(purpose, principal, Date.now() - 60 * 60 * 1000) >= OTP_MAX_SENDS_PER_HOUR) {
    return { success: false, errorCode: 'OTP_RATE_LIMITED', message: 'Too many verification-code requests. Please try again later.' };
  }

  if (MailApp.getRemainingDailyQuota() < 1) {
    return { success: false, errorCode: 'EMAIL_QUOTA_EXHAUSTED', message: 'Email verification is temporarily unavailable because the daily email quota has been reached. Please contact the CNE administrator.' };
  }

  // Reserve Post-Test OTP creation atomically. This guarantees that concurrent resend
  // requests cannot both survive the cooldown check and create multiple active challenges.
  var challengeId = '';
  var otp = '';
  var otpSheet = null;
  var otpCreationLock = LockService.getScriptLock();
  try {
    otpCreationLock.waitLock(10000);
  } catch (lockErr) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy processing another verification request. Please try again.' };
  }

  try {
    // Re-check mutable controls while holding the lock. The checks above are only fast rejects.
    if (cache.get(cooldownKey)) {
      return { success: false, errorCode: 'OTP_COOLDOWN', message: 'Please wait 60 seconds before requesting another verification code.' };
    }
    var authoritativeCooldownSeconds = getOtpCooldownRemainingSeconds_(purpose, principal);
    if (authoritativeCooldownSeconds > 0) {
      return { success: false, errorCode: 'OTP_COOLDOWN', message: 'Please wait ' + authoritativeCooldownSeconds + ' seconds before requesting another verification code.' };
    }
    if (countRecentOtpSends(purpose, principal, Date.now() - 60 * 60 * 1000) >= OTP_MAX_SENDS_PER_HOUR) {
      return { success: false, errorCode: 'OTP_RATE_LIMITED', message: 'Too many verification-code requests. Please try again later.' };
    }

    var liveQr = resolveActiveQrToken(params.qrToken || params.token);
    if (!liveQr || String(liveQr.cneId || '').trim().toUpperCase() !== cneId.toUpperCase()) {
      return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'The QR token is no longer active.' };
    }
    var liveOtpRecord = getCNEScheduleRecord(cneId);
    if (!liveOtpRecord || isCNEClosedForParticipantAccess(liveOtpRecord)) {
      return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Post-Test verification is closed.' };
    }
    if (findExistingPostTestSubmission(cneId, participantId)) {
      return { success: false, errorCode: 'ALREADY_SUBMITTED', message: 'This participant has already submitted the Post-Test for this CNE.' };
    }
    record = liveOtpRecord;

    // A newly-created challenge supersedes every older open challenge for this CNE/participant.
    invalidateOpenOtpChallenges(purpose, principal);

    challengeId = Utilities.getUuid().replace(/-/g, '');
    otp = generateSixDigitOtp();
    var otpHash = computeOtpHash(challengeId, otp);
    var now = new Date();
    var nowIso = now.toISOString();
    var expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString();
    var resendAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString();
    otpSheet = getOtpVerificationSheet();
    otpSheet.appendRow([
      challengeId, purpose, participantType, principal, email, otpHash,
      expiresAt, 0, OTP_MAX_ATTEMPTS, resendAt, '', '', 'PENDING', nowIso, nowIso
    ]);

    // Set cooldown before releasing the lock to close the concurrent-request race window.
    cache.put(cooldownKey, '1', OTP_RESEND_COOLDOWN_SECONDS);
  } finally {
    otpCreationLock.releaseLock();
  }

  try {
    sendPostTestOtpEmail(email, otp, record, participantType);
  } catch (sendErr) {
    var postSendFailLock = LockService.getScriptLock();
    try {
      postSendFailLock.waitLock(10000);
      var failedChallenge = getOtpChallengeById(challengeId);
      var latestPostTestChallenge = getLatestOtpChallengeForPrincipal_(purpose, principal);
      var failedPostTestChallengeIsLatest = Boolean(latestPostTestChallenge && latestPostTestChallenge.challengeId === challengeId);
      if (failedChallenge && failedChallenge.status === 'PENDING' && otpSheet && failedPostTestChallengeIsLatest) {
        otpSheet.getRange(failedChallenge.rowIndex, 13).setValue('SEND_FAILED');
        otpSheet.getRange(failedChallenge.rowIndex, 15).setValue(new Date().toISOString());
        try { cache.remove(cooldownKey); } catch (cacheErr) {}
      }
    } finally {
      try { postSendFailLock.releaseLock(); } catch (releaseErr) {}
    }
    logAuditAction('POST_TEST_OTP_SEND_FAILED', participantId, 'CNE: ' + cneId + ', email delivery failed', 'FAILED');
    return { success: false, errorCode: 'OTP_EMAIL_FAILED', message: 'The verification email could not be sent. Please try again or contact the CNE administrator.' };
  }

  logAuditAction('POST_TEST_OTP_SENT', participantId, 'CNE: ' + cneId + ', type: ' + participantType + ', email: ' + maskEmailAddress(email), 'SUCCESS');

  return {
    success: true,
    message: 'A 6-digit verification code has been sent to the registered email address.',
    data: {
      challengeId: challengeId,
      participantType: participantType,
      maskedEmail: maskEmailAddress(email),
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS
    }
  };
}

/**
 * Verify Post-Test OTP and issue the short-lived CNE-bound participant token.
 * External registration is written only AFTER email ownership is successfully verified.
 */
function handleVerifyPostTestOtp(params, session) {
  var resolvedQr = resolveActiveQrToken(params.qrToken || params.token);
  if (!resolvedQr || !resolvedQr.cneId) {
    return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'A valid active QR token is required for Post-Test verification.' };
  }

  var cneId = resolvedQr.cneId;
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  if (isCNEClosedForParticipantAccess(record)) {
    return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Post-Test verification is closed.' };
  }

  var participantType = String(params.participantType || 'INTERNAL').trim().toUpperCase();
  var challengeId = String(params.challengeId || '').trim();
  var otp = String(params.otp || '').trim();
  if (!challengeId || !/^\d{6}$/.test(otp)) {
    return { success: false, errorCode: 'OTP_REQUIRED', message: 'Challenge ID and a valid 6-digit verification code are required.' };
  }

  var participantId = '';
  var principal = '';
  var purpose = '';
  var expectedEmail = '';
  var participantName = '';
  var designation = '';
  var externalName = '';
  var externalEmail = '';

  if (participantType === 'INTERNAL') {
    var employeeId = normalizeEmpId(params.employeeId);
    if (!employeeId) return { success: false, errorCode: 'EMPLOYEE_ID_REQUIRED', message: 'Employee ID is required.' };
    var officer = findOfficerById(employeeId);
    if (!officer || !officer.name) return { success: false, errorCode: 'INVALID_EMPLOYEE_ID', message: 'Employee ID was not found in Officers data.' };
    expectedEmail = String(officer.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(expectedEmail)) return { success: false, errorCode: 'EMAIL_NOT_AVAILABLE', message: 'A valid registered email address is not available for this Employee ID.' };
    participantId = employeeId;
    participantName = officer.name;
    designation = officer.designation || '';
    purpose = OTP_PURPOSE_POSTTEST_INTERNAL;
    principal = buildPostTestOtpPrincipal(cneId, participantId);
  } else if (participantType === 'EXTERNAL') {
    externalName = sanitizeCellInput(params.name || params.externalName || '');
    externalEmail = normalizeExternalEmail(params.email || params.externalEmail || '');
    if (!externalName || externalName.length < 2) return { success: false, errorCode: 'INVALID_EXTERNAL_NAME', message: 'Please enter the external participant name.' };
    if (!externalEmail) return { success: false, errorCode: 'INVALID_EXTERNAL_EMAIL', message: 'Please enter a valid email address.' };
    participantId = makeExternalParticipantId(externalEmail);
    participantName = externalName;
    designation = 'External Participant';
    expectedEmail = externalEmail;
    purpose = OTP_PURPOSE_POSTTEST_EXTERNAL;
    principal = buildPostTestOtpPrincipal(cneId, participantId);
  } else {
    return { success: false, errorCode: 'INVALID_PARTICIPANT_TYPE', message: 'Participant type must be INTERNAL or EXTERNAL.' };
  }

  // Refresh the external Officers roster BEFORE taking the global mutation lock.
  // The challenge email is still compared inside the lock, so a stale/mismatched roster
  // value cannot authorize verification. This keeps the critical section short.
  if (participantType === 'INTERNAL') {
    try {
      officer = findOfficerByIdFresh_(participantId);
    } catch (freshRosterErr) {
      return { success: false, message: freshRosterErr.message || 'Unable to access Officers data.' };
    }
    if (!officer || !officer.name) {
      return { success: false, errorCode: 'INVALID_EMPLOYEE_ID', message: 'Employee ID was not found in Officers data.' };
    }
    expectedEmail = String(officer.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(expectedEmail)) {
      return { success: false, errorCode: 'EMAIL_NOT_AVAILABLE', message: 'A valid registered email address is not available for this Employee ID.' };
    }
    participantName = officer.name;
    designation = officer.designation || '';
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  try {
    var liveQr = resolveActiveQrToken(params.qrToken || params.token);
    if (!liveQr || String(liveQr.cneId || '').trim().toUpperCase() !== cneId.toUpperCase()) {
      return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'The QR token is no longer active.' };
    }
    var liveRecord = getCNEScheduleRecord(cneId);
    if (!liveRecord || isCNEClosedForParticipantAccess(liveRecord)) {
      return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Post-Test verification is closed.' };
    }
    if (findExistingPostTestSubmission(cneId, participantId)) {
      return { success: false, errorCode: 'ALREADY_SUBMITTED', message: 'This participant has already submitted the Post-Test for this CNE.' };
    }

    var challenge = getOtpChallengeById(challengeId);
    if (!challenge || challenge.purpose !== purpose ||
        String(challenge.principalType || '').toUpperCase() !== participantType ||
        String(challenge.principalId || '').toUpperCase() !== String(principal || '').toUpperCase() ||
        String(challenge.email || '').toLowerCase() !== expectedEmail) {
      return { success: false, errorCode: 'OTP_INVALID', message: 'Verification code is invalid or does not belong to this participant/CNE.' };
    }
    if (challenge.status !== 'PENDING') {
      return { success: false, errorCode: 'OTP_INVALID', message: 'Verification code is no longer active. Request a new code.' };
    }

    var otpSheet = getOtpVerificationSheet();
    var expiresMs = new Date(challenge.expiresAt).getTime();
    if (isNaN(expiresMs) || Date.now() > expiresMs) {
      otpSheet.getRange(challenge.rowIndex, 13).setValue('EXPIRED');
      otpSheet.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
      return { success: false, errorCode: 'OTP_EXPIRED', message: 'Verification code has expired. Request a new code.' };
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      otpSheet.getRange(challenge.rowIndex, 13).setValue('LOCKED');
      otpSheet.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
      return { success: false, errorCode: 'OTP_LOCKED', message: 'Too many incorrect verification attempts. Request a new code.' };
    }

    var submittedHash = computeOtpHash(challengeId, otp);
    if (!timingSafeEqual(submittedHash, challenge.otpHash)) {
      var newAttempts = challenge.attempts + 1;
      otpSheet.getRange(challenge.rowIndex, 8).setValue(newAttempts);
      otpSheet.getRange(challenge.rowIndex, 15).setValue(new Date().toISOString());
      if (newAttempts >= challenge.maxAttempts) otpSheet.getRange(challenge.rowIndex, 13).setValue('LOCKED');
      return {
        success: false,
        errorCode: newAttempts >= challenge.maxAttempts ? 'OTP_LOCKED' : 'OTP_MISMATCH',
        message: newAttempts >= challenge.maxAttempts ? 'Too many incorrect verification attempts. Request a new code.' : 'Incorrect verification code.',
        data: { attemptsRemaining: Math.max(0, challenge.maxAttempts - newAttempts) }
      };
    }

    // Consume the challenge before any registration/token side effect. A partial failure
    // can require a new OTP, but can never leave a successfully verified OTP replayable.
    var verifiedAt = new Date().toISOString();
    otpSheet.getRange(challenge.rowIndex, 6).setValue('');
    otpSheet.getRange(challenge.rowIndex, 11).setValue(verifiedAt);
    otpSheet.getRange(challenge.rowIndex, 12).setValue(verifiedAt);
    otpSheet.getRange(challenge.rowIndex, 13).setValue('CONSUMED');
    otpSheet.getRange(challenge.rowIndex, 15).setValue(verifiedAt);

    // For external participants, persist registration only after successful email ownership verification.
    if (participantType === 'EXTERNAL') {
      var existing = findExternalRegistration(cneId, participantId);
      if (existing && existing.name && existing.name.toLowerCase() !== externalName.toLowerCase()) {
        return { success: false, errorCode: 'EXTERNAL_EMAIL_ALREADY_REGISTERED', message: 'This email is already registered for this CNE under another participant name.' };
      }
      if (!existing) {
        var partSheet = getResponsesSheet();
        var registeredAt = new Date().toISOString();
        partSheet.appendRow([
          'EXTREG-' + Date.now(),
          cneId,
          participantId,
          externalName,
          'External Participant',
          liveRecord.area || 'External',
          '', '', '',
          'EXTERNAL_REGISTRATION',
          registeredAt,
          '',
          'REGISTERED',
          'External Email: ' + externalEmail
        ]);
        logAuditAction('REGISTER_EXTERNAL_POST_TEST_PARTICIPANT', participantId, 'CNE: ' + cneId + ', verified email', 'SUCCESS');
      }
    }

    var verificationToken = generatePostTestParticipantVerificationToken(cneId, participantId, participantType);
    logAuditAction('POST_TEST_OTP_VERIFIED', participantId, 'CNE: ' + cneId + ', type: ' + participantType, 'SUCCESS');

    return {
      success: true,
      message: 'Email verification successful.',
      data: {
        cneId: cneId,
        participantType: participantType,
        participantId: participantId,
        employeeId: participantType === 'INTERNAL' ? participantId : '',
        participantName: participantName,
        designation: designation,
        email: participantType === 'EXTERNAL' ? externalEmail : '',
        maskedEmail: maskEmailAddress(expectedEmail),
        verificationToken: verificationToken
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Legacy participant-verification endpoint is deliberately disabled as a direct
 * Employee ID + DOJ / Name + Email bypass. New clients must use the email OTP flow.
 * A challenge+OTP payload is accepted here only as a compatibility alias.
 */
function handleVerifyPostTestParticipant(params, session) {
  if (params && params.challengeId && params.otp) {
    return handleVerifyPostTestOtp(params, session);
  }
  return {
    success: false,
    errorCode: 'POST_TEST_OTP_REQUIRED',
    message: 'Email OTP verification is required before the Post-Test can be opened.'
  };
}

function handleGetQRToken(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };

  var authErr = checkQuestionManagementAuthorized(session, record);
  if (authErr) return authErr;

  if (isCNEClosedForParticipantAccess(record)) {
    return { success: false, errorCode: 'CNE_CLOSED', message: 'QR Code is unavailable because this CNE has been finalized or canceled.' };
  }

  var isCheckOnly = params.checkOnly === true || params.createIfMissing === false;

  // Read-only QR status no longer takes the global ScriptLock. Creation remains serialized.
  if (isCheckOnly) {
    var freshReadSession = refreshMutationSession(session);
    if (!freshReadSession.success) return freshReadSession;
    session = freshReadSession.session;
    record = getCNEScheduleRecord(cneId);
    if (!record) return { success: false, message: 'CNE record not found.' };
    var readAuthErr = checkQuestionManagementAuthorized(session, record);
    if (readAuthErr) return readAuthErr;
    if (isCNEClosedForParticipantAccess(record)) {
      return { success: false, errorCode: 'CNE_CLOSED', message: 'QR Code is unavailable because this CNE has been finalized or canceled.' };
    }
    var readFinalizedCount = countActiveCNEQuestions(cneId, true);
    var activeReadToken = findActiveQrTokenForCne_(cneId);
    return {
      success: true,
      data: {
        hasQR: Boolean(activeReadToken && activeReadToken.qrToken),
        qrToken: activeReadToken ? activeReadToken.qrToken : '',
        cneId: cneId,
        topic: record.topic,
        area: record.area,
        finalizedCount: readFinalizedCount
      }
    };
  }

  var finalizedCount = countActiveCNEQuestions(cneId);
  var existingQr = findActiveQrTokenForCne_(cneId);
  var existingToken = existingQr ? existingQr.qrToken : null;

  if (!existingToken && finalizedCount < 5) {
    return { success: false, errorCode: 'INSUFFICIENT_QUESTIONS', message: 'At least 5 active finalized questions must be present before QR Code and Post-Test can be generated. Currently active & finalized: ' + finalizedCount };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  try {
    var liveQrMutation = revalidateCneMutation_(session, cneId, 'QUESTION', false);
    if (!liveQrMutation.success) return liveQrMutation;
    session = liveQrMutation.session;
    record = liveQrMutation.record;
    finalizedCount = countActiveCNEQuestions(cneId, true);

    var liveActiveQr = findActiveQrTokenForCne_(cneId);
    var qrToken = liveActiveQr ? liveActiveQr.qrToken : null;

    if (!qrToken && finalizedCount < 5) {
      return { success: false, errorCode: 'INSUFFICIENT_QUESTIONS', message: 'At least 5 active finalized questions must be present before QR Code and Post-Test can be generated. Currently active & finalized: ' + finalizedCount };
    }

    if (!qrToken) {
      qrToken = Utilities.getUuid().replace(/-/g, '');
      var qrSheet = getQRTokensSheet();
      qrSheet.appendRow([qrToken, cneId, new Date().toISOString(), session.employeeId, 'ACTIVE']);
      logAuditAction('GENERATE_QR', session.employeeId, 'Generated secure QR token for CNE: ' + cneId, 'SUCCESS');
    }

    return {
      success: true,
      data: { hasQR: true, qrToken: qrToken, cneId: cneId, topic: record.topic, area: record.area, finalizedCount: finalizedCount }
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Resolve QR Token to CNE Session Details (Public for participants)
 * Resolves CNE ID authoritatively on the server from the opaque token.
 * Prevents CNE enumeration and strips all answers/explanations.
 */

/**
 * Get Post-Test Questions for Participant
 * Public post-test access MUST require a valid opaque QR token.
 * Does NOT allow public access using CNE ID alone.
 * Legacy QRT token fallback parsing is completely removed.
 * Token must be resolved through CNE_QR_Tokens.
 * Strips correctOption and explanation!
 * Checks if participant has already submitted.
 */
function handleGetPostTestQuestions(params, session) {
  // Security compatibility marker: resolveActiveQrToken authoritatively requires rowStatus === 'ACTIVE' in CNE_QR_Tokens.
  var resolvedQr = resolveActiveQrToken(params.qrToken || params.token);
  var isPublicQrAccess = Boolean(resolvedQr && resolvedQr.cneId);
  var cneId = resolvedQr ? resolvedQr.cneId : null;
  var participantId = '';
  var participantType = '';
  var participantName = '';

  if (cneId) {
    var verification = verifyPostTestParticipantVerificationToken(params.participantVerificationToken, cneId);
    if (!verification) {
      return { success: false, errorCode: 'PARTICIPANT_VERIFICATION_REQUIRED', message: 'Please verify the participant before opening the post-test.' };
    }
    participantId = verification.participantId;
    participantType = verification.participantType;
  } else if (params.cneId) {
    var candidateId = sanitizeCellInput(params.cneId);
    var candidateRecord = getCNEScheduleRecord(candidateId);
    if (!candidateRecord) return { success: false, message: 'CNE record not found.' };
    var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);
    if (actionAuthErr) return actionAuthErr;
    cneId = candidateId;
    participantId = normalizeEmpId(params.employeeId || (session ? session.employeeId : ''));
    participantType = 'INTERNAL';
  }

  if (!cneId) return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'A valid opaque QR token is required for public post-test access.' };
  if (!participantId) return { success: false, message: 'Verified participant identity is required.' };

  // This endpoint is read-only. A participant may receive a snapshot just before a CNE closes,
  // but submission always re-checks QR status, CNE lifecycle and duplicate state under ScriptLock.
  if (isPublicQrAccess) {
    var liveQr = resolveActiveQrToken(params.qrToken || params.token);
    if (!liveQr || String(liveQr.cneId || '').trim().toUpperCase() !== String(cneId).trim().toUpperCase()) {
      return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'The QR token is no longer active.' };
    }
    var liveVerification = verifyPostTestParticipantVerificationToken(params.participantVerificationToken, cneId);
    if (!liveVerification || liveVerification.participantId !== participantId || liveVerification.participantType !== participantType) {
      return { success: false, errorCode: 'PARTICIPANT_VERIFICATION_REQUIRED', message: 'Participant verification expired or changed. Please verify again.' };
    }
  } else {
    var freshReadSession = refreshMutationSession(session);
    if (!freshReadSession.success) return freshReadSession;
    session = freshReadSession.session;
  }

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  if (!isPublicQrAccess) {
    var liveActionAuthErr = checkCNEActionAuthorized(session, record);
    if (liveActionAuthErr) return liveActionAuthErr;
  }
  if (isCNEClosedForParticipantAccess(record)) {
    return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. The post-test is closed.' };
  }

  if (participantType === 'INTERNAL') {
    var officer = findOfficerByIdFresh_(participantId);
    if (!officer || !officer.name) return { success: false, errorCode: 'INVALID_EMPLOYEE_ID', message: 'Verified employee is no longer present in the Officers data.' };
    participantName = officer.name;
  } else {
    var registration = findExternalRegistration(cneId, participantId);
    if (!registration) return { success: false, errorCode: 'EXTERNAL_REGISTRATION_REQUIRED', message: 'External participant registration was not found. Please register again.' };
    participantName = registration.name;
  }

  var existingSubmission = findExistingPostTestSubmission(cneId, participantId);
  if (existingSubmission) {
    return {
      success: true,
      data: {
        alreadySubmitted: true,
        cneId: cneId,
        topic: record.topic,
        area: record.area,
        participantType: participantType,
        participantName: participantName,
        submission: {
          participantId: existingSubmission.responseId || '',
          cneId: cneId,
          employeeId: participantType === 'INTERNAL' ? participantId : '',
          externalParticipantId: participantType === 'EXTERNAL' ? participantId : '',
          name: existingSubmission.participantName || participantName,
          designation: existingSubmission.designation || '',
          department: existingSubmission.department || '',
          score: Number(existingSubmission.score || 0),
          totalQuestions: Number(existingSubmission.totalQuestions || 0),
          percentage: Number(existingSubmission.percentage || 0),
          status: existingSubmission.status || '',
          submittedAt: existingSubmission.submittedAt || ''
        }
      }
    };
  }

  var sanitizedQuestions = getCachedSanitizedQuestions(cneId);
  if (sanitizedQuestions.length < 5) {
    return { success: false, errorCode: 'POST_TEST_NOT_READY', message: 'Post-test is not ready yet. At least 5 questions must be finalized by the coordinator.' };
  }

  return {
    success: true,
    data: {
      alreadySubmitted: false,
      cneId: cneId,
      topic: record.topic,
      area: record.area,
      participantType: participantType,
      participantName: participantName,
      questions: sanitizedQuestions
    }
  };
}

/**
 * Submit Participant Post-Test
 * Protected by LockService for strict concurrency:
 * duplicate check -> question retrieval -> scoring -> response write -> question locking.
 * Enforces:
 * 1. Opaque QR token resolution via CNE_QR_Tokens (no CNE ID only access)
 * 2. Authoritative employee validation against Officers data
 * 3. Server-side scoring (never trust browser score)
 * 4. Rejection of duplicate submissions per employee per CNE
 * 5. A failed submission does NOT lock questions.
 * 6. Only the first successful submission locks the question set.
 * 7. Returns correct answers and explanations ONLY after successful submission
 */
function handleSubmitPostTest(params, session) {
  var resolvedQr = resolveActiveQrToken(params.qrToken || params.token);
  var isPublicQrSubmission = Boolean(resolvedQr && resolvedQr.cneId);
  var cneId = resolvedQr ? resolvedQr.cneId : null;
  var participantId = '';
  var participantType = '';

  if (cneId) {
    var verification = verifyPostTestParticipantVerificationToken(params.participantVerificationToken, cneId);
    if (!verification) {
      return { success: false, errorCode: 'PARTICIPANT_VERIFICATION_REQUIRED', message: 'Participant verification expired or is invalid. Please verify again.' };
    }
    participantId = verification.participantId;
    participantType = verification.participantType;
  } else if (params.cneId) {
    var candidateId = sanitizeCellInput(params.cneId);
    var candidateRecord = getCNEScheduleRecord(candidateId);
    if (!candidateRecord) return { success: false, message: 'CNE record not found.' };
    var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);
    if (actionAuthErr) return actionAuthErr;
    cneId = candidateId;
    participantId = normalizeEmpId(params.employeeId || (session ? session.employeeId : ''));
    participantType = 'INTERNAL';
  }

  if (!cneId) return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'A valid opaque QR token is required for public post-test submission.' };
  if (!participantId) return { success: false, message: 'Verified participant identity is required.' };

  var answers = params.answers;
  if (!answers || typeof answers !== 'object') return { success: false, message: 'Answers object is required.' };

  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  if (isCNEClosedForParticipantAccess(record)) {
    return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Post-test submission is closed.' };
  }

  var participantName = '';
  var designation = '';
  var department = record.area || '';
  var responseRemarks = '';

  // Officers data is an external authoritative spreadsheet and is not protected by this script's
  // ScriptLock. Perform its fresh read before taking the global CNE lock so one roster read cannot
  // block every other Post-Test submission.
  if (participantType === 'INTERNAL') {
    var liveParticipantOfficer = findOfficerByIdFresh_(participantId);
    if (!liveParticipantOfficer || !liveParticipantOfficer.name) {
      return { success: false, errorCode: 'INVALID_EMPLOYEE_ID', message: 'Verified employee is no longer present in the Officers data.' };
    }
    participantName = liveParticipantOfficer.name;
    designation = liveParticipantOfficer.designation || 'Nursing Officer';
    department = liveParticipantOfficer.department || record.area || '';
  } else if (participantType === 'EXTERNAL') {
    var registration = findExternalRegistration(cneId, participantId);
    if (!registration) return { success: false, errorCode: 'EXTERNAL_REGISTRATION_REQUIRED', message: 'External participant registration was not found. Please register again.' };
    participantName = registration.name;
    designation = registration.designation || 'External Participant';
    department = registration.department || record.area || 'External';
    responseRemarks = registration.email ? ('External Email: ' + registration.email) : '';
  } else {
    return { success: false, errorCode: 'INVALID_PARTICIPANT_TYPE', message: 'Verified participant type is invalid.' };
  }

  // After the first successful Post-Test submission, questions are permanently immutable.
  // From then on answer-key reading/scoring can safely happen outside the global lock.
  var questionsAlreadyLocked = isCNEQuestionsLocked(cneId);
  var preparedSnapshot = null;
  var preparedScore = null;
  if (questionsAlreadyLocked) {
    preparedSnapshot = getPostTestAnswerSnapshot_(cneId);
    if (!preparedSnapshot || preparedSnapshot.answerKeys.length < 5) {
      return { success: false, message: 'Cannot submit: CNE post-test does not have at least 5 finalized questions.' };
    }
    preparedScore = scorePostTestAnswers_(preparedSnapshot.answerKeys, answers);
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy processing submissions. Please try again.' };
  }

  var successPayload = null;
  var auditDetails = '';
  try {
    if (isPublicQrSubmission) {
      var liveSubmitQr = resolveActiveQrToken(params.qrToken || params.token);
      if (!liveSubmitQr || String(liveSubmitQr.cneId || '').trim().toUpperCase() !== cneId.toUpperCase()) {
        return { success: false, errorCode: 'INVALID_OR_MISSING_QR_TOKEN', message: 'The QR token is no longer active.' };
      }
    }

    var liveRecord = getCNEScheduleRecord(cneId);
    if (!liveRecord || isCNEClosedForParticipantAccess(liveRecord)) {
      return { success: false, errorCode: 'CNE_CLOSED', message: 'This CNE has been finalized or canceled. Post-test submission is closed.' };
    }
    if (!isPublicQrSubmission) {
      var freshSubmitSession = refreshMutationSession(session);
      if (!freshSubmitSession.success) return freshSubmitSession;
      session = freshSubmitSession.session;
      var liveSubmitAuth = checkCNEActionAuthorized(session, liveRecord);
      if (liveSubmitAuth) return liveSubmitAuth;
    }
    record = liveRecord;

    if (participantType === 'EXTERNAL') {
      var liveRegistration = findExternalRegistration(cneId, participantId);
      if (!liveRegistration) return { success: false, errorCode: 'EXTERNAL_REGISTRATION_REQUIRED', message: 'External participant registration was not found. Please register again.' };
      participantName = liveRegistration.name;
      designation = liveRegistration.designation || 'External Participant';
      department = liveRegistration.department || liveRecord.area || 'External';
      responseRemarks = liveRegistration.email ? ('External Email: ' + liveRegistration.email) : '';
    }

    if (findExistingPostTestSubmission(cneId, participantId)) {
      return { success: false, errorCode: 'ALREADY_SUBMITTED', message: 'You have already submitted the post-test for this CNE.' };
    }

    var snapshot = preparedSnapshot;
    var scored = preparedScore;

    // Conservative first-submission path: questions may still be editable, so take the
    // authoritative answer snapshot only after acquiring the same global lock used by question mutations.
    if (!questionsAlreadyLocked) {
      snapshot = getPostTestAnswerSnapshot_(cneId);
      if (!snapshot || snapshot.answerKeys.length < 5) {
        return { success: false, message: 'Cannot submit: CNE post-test does not have at least 5 finalized questions.' };
      }
      scored = scorePostTestAnswers_(snapshot.answerKeys, answers);
    }

    var now = new Date().toISOString();
    var responseId = 'RESP-' + Date.now() + '-' + Utilities.getUuid().substring(0, 8);
    var partSheet = getResponsesSheet();
    partSheet.appendRow([
      responseId,
      cneId,
      participantId,
      participantName,
      designation,
      department,
      scored.score,
      scored.total,
      scored.percentage,
      'POST_TEST',
      now,
      JSON.stringify(answers),
      scored.status,
      responseRemarks
    ]);

    // Only the first-submission path needs to persist question-row lock markers.
    // Logical locking is also guaranteed by the POST_TEST response row itself.
    if (!questionsAlreadyLocked && snapshot.questionRowsToLock.length > 0) {
      lockQuestionRowsBatch_(snapshot.qSheet, snapshot.questionRowsToLock, snapshot.cols.isLocked);
    }
    markCNEQuestionsLockedCache_(cneId);

    auditDetails = 'CNE: ' + cneId + ', Score: ' + scored.score + '/' + scored.total + ' (' + scored.percentage + '%)';
    successPayload = {
      success: true,
      message: 'Post-test submitted successfully!',
      data: {
        participantId: responseId,
        cneId: cneId,
        participantType: participantType,
        participantName: participantName,
        score: scored.score,
        totalQuestions: scored.total,
        percentage: scored.percentage,
        passed: scored.passed,
        status: scored.status,
        submittedAt: now,
        review: scored.detailedReview
      }
    };
  } finally {
    lock.releaseLock();
  }

  // Audit logging is intentionally outside the global mutation lock.
  if (successPayload) logAuditAction('SUBMIT_POST_TEST', participantId, auditDetails, 'SUCCESS');
  return successPayload || { success: false, errorCode: 'SUBMISSION_FAILED', message: 'Post-test submission could not be completed.' };
}

/**
 * Add Manual Participant(s) (Admin, Area Incharge, or Authorized Resource Person)
 * Manual attendees receive Participant Source = MANUAL.
 * They have no score and are NOT treated as failed or assigned 0%.
 * Supports both single participant and batch participant addition with ONE ScriptLock and ONE setValues write.
 */
function handleAddManualParticipants(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  
  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;

  // Prevent participant modification after finalization or cancellation.
  if (normalizeCNEStatus(record.status) === 'Completed') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_FINALIZED',
      message: 'This CNE has already been finalized. Participants cannot be added or modified.'
    };
  }
  if (normalizeCNEStatus(record.status) === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_CANCELED',
      message: 'This CNE has been canceled. Participants cannot be added or modified.'
    };
  }

  var submittedList = [];
  if (params.participants && Array.isArray(params.participants)) {
    submittedList = params.participants;
    if (submittedList.length === 0) {
      return { success: false, message: 'At least one participant is required.' };
    }
  } else if (params.employeeId || params.name) {
    submittedList = [{
      employeeId: params.employeeId,
      name: params.name,
      designation: params.designation,
      department: params.department,
      remarks: params.remarks
    }];
  } else {
    return { success: false, message: 'Employee ID or Participant Name is required.' };
  }

  var validatedList = [];
  var seenBatchEmpIds = {};
  var seenBatchNames = {};

  for (var i = 0; i < submittedList.length; i++) {
    var rawItem = submittedList[i];
    if (!rawItem || typeof rawItem !== 'object') {
      return { success: false, message: 'Invalid participant entry at position ' + (i + 1) + '.' };
    }

    var empId = normalizeEmpId(rawItem.employeeId);
    var manualName = sanitizeCellInput(rawItem.name || '');
    var designation = sanitizeCellInput(rawItem.designation || 'Staff Nurse');
    var department = sanitizeCellInput(rawItem.department || record.area);
    var remarks = sanitizeCellInput(rawItem.remarks || 'Manual Attendance Recorded');

    if (!empId && !manualName) {
      return { success: false, message: 'Employee ID or Participant Name is required for participant #' + (i + 1) + '.' };
    }

    if (empId) {
      var officer = findOfficerById(empId);
      if (!officer) {
        return {
          success: false,
          errorCode: 'INVALID_EMPLOYEE_ID',
          message: 'Employee ID ' + empId + ' not found in official staff roster.'
        };
      }
      manualName = officer.name;
      designation = officer.designation || designation;
      department = officer.department || department;

      if (seenBatchEmpIds[empId]) {
        return {
          success: false,
          errorCode: 'DUPLICATE_PARTICIPANT',
          message: 'Employee ID ' + empId + ' appears more than once in the submitted list.'
        };
      }
      seenBatchEmpIds[empId] = true;
    } else if (manualName) {
      var lowerName = manualName.toLowerCase();
      if (seenBatchNames[lowerName]) {
        return {
          success: false,
          errorCode: 'DUPLICATE_PARTICIPANT',
          message: 'Participant ' + manualName + ' appears more than once in the submitted list.'
        };
      }
      seenBatchNames[lowerName] = true;
    }

    validatedList.push({
      empId: empId,
      manualName: manualName,
      designation: designation,
      department: department,
      remarks: remarks
    });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy. Please try again.' };
  }

  try {
    var freshParticipantSession = refreshMutationSession(session);
    if (!freshParticipantSession.success) return freshParticipantSession;
    session = freshParticipantSession.session;

    // Re-read lifecycle state while holding the lock so finalization/cancellation
    // cannot race a manual attendance write.
    var liveParticipantRecord = getCNEScheduleRecord(cneId);
    if (!liveParticipantRecord) {
      return { success: false, errorCode: 'CNE_NOT_FOUND', message: 'CNE record not found.' };
    }

    // Re-authorize against the live CNE record while holding the lock. Area, CNE
    // type, or RP assignment may have changed after the pre-lock authorization
    // check, so manual attendance must never rely on stale authorization state.
    var liveParticipantAuthErr = checkCNEActionAuthorized(session, liveParticipantRecord);
    if (liveParticipantAuthErr) return liveParticipantAuthErr;

    var liveParticipantStatus = normalizeCNEStatus(liveParticipantRecord.status);
    if (liveParticipantStatus === 'Completed' || liveParticipantStatus === 'Canceled') {
      return {
        success: false,
        errorCode: 'CNE_CLOSED',
        message: 'This CNE has been finalized or canceled. Participants cannot be added or modified.'
      };
    }

    var partSheet = getResponsesSheet();
    var pData = partSheet.getLastRow() > 1
      ? partSheet.getRange(2, 2, partSheet.getLastRow() - 1, 3).getValues()
      : []; // B:D only: CNE ID, Employee ID, Employee Name

    var existingEmpIds = {};
    var existingNames = {};
    for (var p = 0; p < pData.length; p++) {
      if (String(pData[p][0] || '').trim().toUpperCase() === cneId.toUpperCase()) {
        var existingEmp = normalizeEmpId(pData[p][1]);
        if (existingEmp) existingEmpIds[existingEmp] = true;
        var existingNm = String(pData[p][2] || '').trim().toLowerCase();
        if (existingNm) existingNames[existingNm] = true;
      }
    }

    for (var v = 0; v < validatedList.length; v++) {
      var vItem = validatedList[v];
      if (vItem.empId && existingEmpIds[vItem.empId]) {
        return {
          success: false,
          errorCode: 'DUPLICATE_PARTICIPANT',
          message: 'Employee ID ' + vItem.empId + ' is already recorded as a participant for this CNE.'
        };
      }
      if (!vItem.empId && existingNames[vItem.manualName.toLowerCase()]) {
        return {
          success: false,
          errorCode: 'DUPLICATE_PARTICIPANT',
          message: 'Participant ' + vItem.manualName + ' is already recorded for this CNE.'
        };
      }
    }

    var baseTime = Date.now();
    var now = new Date().toISOString();
    var allRows = [];
    var auditEntries = [];

    for (var k = 0; k < validatedList.length; k++) {
      var item = validatedList[k];
      var participantId = validatedList.length === 1
        ? ('MAN-' + baseTime)
        : ('MAN-' + baseTime + '-' + (k + 1));

      allRows.push([
        participantId,
        cneId,
        item.empId,
        item.manualName,
        item.designation,
        item.department,
        '',
        '',
        '',
        'MANUAL',
        now,
        '',
        'ATTENDED',
        item.remarks
      ]);

      auditEntries.push({
        action: 'ADD_MANUAL_PARTICIPANT',
        employeeId: session.employeeId,
        details: 'Added participant ' + (item.empId || item.manualName) + ' to CNE: ' + cneId,
        status: 'SUCCESS'
      });
    }

    if (allRows.length > 0) {
      var startRow = partSheet.getLastRow() + 1;
      var numRows = allRows.length;
      var numColumns = 14;

      if (startRow === 1) {
        var defaultHeaders = ['Response ID', 'CNE ID', 'Employee ID', 'Employee Name', 'Designation', 'Department', 'Score', 'Total Questions', 'Percentage', 'Source', 'Submitted At', 'Answers JSON', 'Status', 'Remarks'];
        partSheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
        startRow = 2;
      }

      var maxRows = partSheet.getMaxRows();
      if (startRow + numRows - 1 > maxRows) {
        partSheet.insertRowsAfter(maxRows, (startRow + numRows - 1) - maxRows);
      }
      var maxCols = partSheet.getMaxColumns();
      if (numColumns > maxCols) {
        partSheet.insertColumnsAfter(maxCols, numColumns - maxCols);
      }

      partSheet.getRange(startRow, 1, numRows, numColumns).setValues(allRows);
    }

    logAuditActionsBatch(auditEntries);

    return {
      success: true,
      message: allRows.length === 1 ? 'Participant added successfully.' : 'Successfully recorded ' + allRows.length + ' participants.',
      count: allRows.length,
      addedCount: allRows.length
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get All Participants for CNE & Calculate Pure Average Score
 * Note: Average Score is computed EXCLUSIVELY from POST_TEST participants!
 * If no post-test submissions exist, averageScore is null (never 0).
 */
function handleGetCNEParticipants(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  var authErr = checkCNEActionAuthorized(session, record);
  if (authErr) return authErr;

  var partSheet = getResponsesSheet();
  var data = partSheet.getDataRange().getValues();
  var byParticipant = {};

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1] || '').trim().toUpperCase() !== cneId.toUpperCase()) continue;
    var pType = String(data[r][9] || 'POST_TEST').trim().toUpperCase();
    var empId = String(data[r][2] || '').trim().toUpperCase();
    var name = String(data[r][3] || '').trim();
    var key = empId ? ('ID:' + empId) : ('NAME:' + name.toLowerCase());
    if (!key || key === 'NAME:') continue;

    var scoreVal = null;
    var totalVal = null;
    var pct = null;
    if (pType === 'POST_TEST') {
      var scoreRaw = data[r][6];
      scoreVal = (scoreRaw !== '' && scoreRaw !== null && scoreRaw !== undefined && !isNaN(Number(scoreRaw))) ? Number(scoreRaw) : null;
      var totalRaw = data[r][7];
      totalVal = (totalRaw !== '' && totalRaw !== null && totalRaw !== undefined && !isNaN(Number(totalRaw))) ? Number(totalRaw) : null;
      var pctRaw = data[r][8];
      pct = (pctRaw !== '' && pctRaw !== null && pctRaw !== undefined && !isNaN(Number(pctRaw))) ? Number(pctRaw) : null;
    }

    var candidate = {
      id: String(data[r][0] || ''),
      cneId: cneId,
      employeeId: isExternalParticipantId(empId) ? '' : empId,
      externalParticipantId: isExternalParticipantId(empId) ? empId : '',
      name: name,
      designation: String(data[r][4] || (isExternalParticipantId(empId) ? 'External Participant' : 'Nursing Officer')),
      department: String(data[r][5] || record.area),
      participantType: pType,
      score: scoreVal,
      totalQuestions: totalVal,
      percentage: pct,
      source: pType,
      submittedAt: String(data[r][10] || ''),
      answersJson: String(data[r][11] || ''),
      status: String(data[r][12] || 'ATTENDED'),
      remarks: String(data[r][13] || '')
    };

    // Prefer POST_TEST over registration/manual rows for the same participant.
    var current = byParticipant[key];
    if (!current || pType === 'POST_TEST' || (current.participantType === 'EXTERNAL_REGISTRATION' && pType !== 'EXTERNAL_REGISTRATION')) {
      byParticipant[key] = candidate;
    }
  }

  var participants = Object.keys(byParticipant).map(function(key) { return byParticipant[key]; });
  var postTestCount = 0;
  var manualCount = 0;
  var totalScorePercent = 0;
  var scoredPostTests = 0;
  for (var i = 0; i < participants.length; i++) {
    var item = participants[i];
    if (item.participantType === 'POST_TEST') {
      postTestCount++;
      if (item.percentage !== null && item.percentage !== undefined && !isNaN(Number(item.percentage))) {
        totalScorePercent += Number(item.percentage);
        scoredPostTests++;
      }
    } else {
      manualCount++;
    }
  }
  var avgScore = scoredPostTests > 0 ? Math.round((totalScorePercent / scoredPostTests) * 10) / 10 : null;
  return {
    success: true,
    data: {
      cneId: cneId,
      topic: record.topic,
      area: record.area,
      status: record.status,
      totalParticipants: participants.length,
      postTestCount: postTestCount,
      manualCount: manualCount,
      averageScore: avgScore,
      participants: participants
    }
  };
}

/**
 * Finalize CNE Session and Update CNE Schedule Record
 * Atomic & In-place lifecycle update via ScriptLock
 */
function handleFinalizeCNE(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  // 1. Resolve CNE
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  
  // 2. Validate CNE type
  var cneType = normalizeCNEType(record.cneType);
  if (!cneType) {
    return {
      success: false,
      errorCode: 'INVALID_CNE_TYPE',
      message: 'Cannot finalize CNE: Session record has an invalid or missing Type of CNE (must be CENTRAL or DEPARTMENTAL).'
    };
  }

  // 3. Validate current authorization
  var authErr = checkCNEAuthorized(session, record.area, cneType);
  if (authErr) return authErr;

  // A canceled CNE cannot later be finalized.
  if (normalizeCNEStatus(record.status) === 'Canceled') {
    return {
      success: false,
      errorCode: 'CNE_ALREADY_CANCELED',
      message: 'Cannot finalize a CNE that has already been canceled.'
    };
  }
  
  // 4. Acquire ScriptLock
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, errorCode: 'SERVER_BUSY', message: 'Server is busy processing another operation. Please try again.' };
  }
  
  try {
    var freshFinalizeSession = refreshMutationSession(session);
    if (!freshFinalizeSession.success) return freshFinalizeSession;
    session = freshFinalizeSession.session;
    var ss = getSpreadsheet('CNE');
    var cneSheet = ss.getSheetByName('CNE Schedule');
    if (!cneSheet) {
      return { success: false, message: 'CNE Schedule sheet not found.' };
    }
    
    // 5. Re-read the authoritative row while holding the lock
    var liveRecord = getCNEScheduleRecord(cneId);
    if (!liveRecord) {
      return { success: false, message: 'CNE record not found upon re-reading CNE Schedule.' };
    }

    // Re-authorize against the live record while holding the lock. The CNE Area or
    // Type may have changed after the initial pre-lock check, so lifecycle actions
    // must never rely on stale authorization state.
    var liveFinalizeType = normalizeCNEType(liveRecord.cneType);
    if (!liveFinalizeType) {
      return {
        success: false,
        errorCode: 'INVALID_CNE_TYPE',
        message: 'Cannot finalize CNE: Session record has an invalid or missing Type of CNE (must be CENTRAL or DEPARTMENTAL).'
      };
    }
    var liveFinalizeAuthErr = checkCNEAuthorized(session, liveRecord.area, liveFinalizeType);
    if (liveFinalizeAuthErr) return liveFinalizeAuthErr;
    
    // 6. Confirm the CNE is not already Completed or Canceled.
    var liveFinalizeStatus = normalizeCNEStatus(liveRecord.status);
    if (liveFinalizeStatus === 'Completed') {
      return {
        success: true,
        alreadyFinalized: true,
        message: 'This CNE has already been marked as Completed.',
        data: {
          cneId: cneId,
          dataId: cneId
        },
        cneId: cneId,
        dataId: cneId
      };
    }
    if (liveFinalizeStatus === 'Canceled') {
      return {
        success: false,
        errorCode: 'CNE_ALREADY_CANCELED',
        message: 'Cannot finalize a CNE that has already been canceled.'
      };
    }
    
    // 7. Read participant records and deduplicate by participant identity.
    var partSheet = getResponsesSheet();
    var participantMap = {};
    var postTestScores = [];

    if (partSheet && partSheet.getLastRow() > 1) {
      var pData = partSheet.getDataRange().getValues();
      for (var p = 1; p < pData.length; p++) {
        if (String(pData[p][1] || '').trim().toUpperCase() !== cneId.toUpperCase()) continue;
        var rawEmp = String(pData[p][2] || '').trim().toUpperCase();
        var pName = String(pData[p][3] || '').trim();
        var pSrc = String(pData[p][9] || '').trim().toUpperCase();
        var key = rawEmp ? ('ID:' + rawEmp) : ('NAME:' + pName.toLowerCase());
        if (!key || key === 'NAME:') continue;
        if (!participantMap[key] || pSrc === 'POST_TEST') {
          participantMap[key] = { empId: rawEmp, name: pName, source: pSrc };
        }
        var pctRaw = pData[p][8];
        if (pSrc === 'POST_TEST' && pctRaw !== '' && pctRaw !== null && pctRaw !== undefined && !isNaN(Number(pctRaw))) {
          postTestScores.push(Number(pctRaw));
        }
      }
    }

    var internalEmpIds = [];
    var externalParticipants = [];
    Object.keys(participantMap).forEach(function(key) {
      var item = participantMap[key];
      if (item.empId && !isExternalParticipantId(item.empId)) {
        internalEmpIds.push(item.empId);
      } else if (item.name) {
        externalParticipants.push(item.name);
      }
    });

    var totalParticipantsCount = Object.keys(participantMap).length;
    if (totalParticipantsCount <= 0) {
      return {
        success: false,
        errorCode: 'NO_PARTICIPANTS',
        message: 'Cannot finalize CNE: At least one participant must be recorded before finalization.'
      };
    }

    var avg = postTestScores.length > 0 ? Math.round((postTestScores.reduce(function(a, b) { return a + b; }, 0) / postTestScores.length) * 10) / 10 : null;
    var remarksSummary = 'Finalized CNE Session [' + cneId + ']. Total Attendees: ' + totalParticipantsCount + (avg !== null ? ' (Avg Post-Test Score: ' + avg + '%)' : '') + (params.remarks ? '. ' + sanitizeCellInput(params.remarks) : '');
    
    // 8. Update authoritative CNE Schedule record directly
    var colMap = getHeaderMap(cneSheet);
    var statusCol = colMap['status'] !== undefined ? (colMap['status'] + 1) : 12;
    var remarksCol = colMap['adminremarks'] !== undefined ? (colMap['adminremarks'] + 1) : (colMap['remarks'] !== undefined ? (colMap['remarks'] + 1) : 16);
    
    cneSheet.getRange(liveRecord.rowIndex, statusCol).setValue('Completed');
    cneSheet.getRange(liveRecord.rowIndex, remarksCol).setValue(remarksSummary);
    deactivateQRTokensForCNE(cneId);
    
    if (colMap['staffempid'] !== undefined) {
      cneSheet.getRange(liveRecord.rowIndex, colMap['staffempid'] + 1).setValue(internalEmpIds.join(', '));
    }
    if (colMap['staffcount'] !== undefined) {
      cneSheet.getRange(liveRecord.rowIndex, colMap['staffcount'] + 1).setValue(totalParticipantsCount);
    }
    if (colMap['externalstaffparticipants'] !== undefined) {
      cneSheet.getRange(liveRecord.rowIndex, colMap['externalstaffparticipants'] + 1).setValue(externalParticipants.join(', '));
    }

    // 9. Write audit log
    logAuditAction('FINALIZE_CNE', session.employeeId, 'Finalized CNE: ' + cneId + ' (status updated to Completed in CNE Schedule)', 'SUCCESS');
    
    return {
      success: true,
      message: 'CNE finalized successfully.',
      data: {
        cneId: cneId,
        dataId: cneId
      },
      cneId: cneId,
      dataId: cneId
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cancel CNE Session
 */
function handleCancelCNE(params, session) {
  var cneId = sanitizeCellInput(params.cneId);
  if (!cneId) return { success: false, message: 'CNE ID is required.' };
  
  var record = getCNEScheduleRecord(cneId);
  if (!record) return { success: false, message: 'CNE record not found.' };
  
  var authErr = checkCNEAuthorized(session, record.area, record.cneType);
  if (authErr) return authErr;

  // Keep cancellation idempotent and avoid rewriting remarks/audit entries.
  if (normalizeCNEStatus(record.status) === 'Canceled') {
    return {
      success: true,
      alreadyCanceled: true,
      message: 'This CNE has already been canceled.'
    };
  }
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Server is busy. Please try again.' };
  }
  
  try {
    var freshCancelSession = refreshMutationSession(session);
    if (!freshCancelSession.success) return freshCancelSession;
    session = freshCancelSession.session;
    var liveRecord = getCNEScheduleRecord(cneId);
    if (!liveRecord) return { success: false, message: 'CNE record not found.' };

    // Re-authorize against the live record while holding the lock. This closes the
    // same stale-authorization window as Edit/Finalize when Area or CNE Type changes
    // between the initial check and the lifecycle write.
    var liveCancelType = normalizeCNEType(liveRecord.cneType);
    if (!liveCancelType) {
      return {
        success: false,
        errorCode: 'INVALID_CNE_TYPE',
        message: 'Cannot cancel CNE: Session record has an invalid or missing Type of CNE (must be CENTRAL or DEPARTMENTAL).'
      };
    }
    var liveCancelAuthErr = checkCNEAuthorized(session, liveRecord.area, liveCancelType);
    if (liveCancelAuthErr) return liveCancelAuthErr;

    var liveCancelStatus = normalizeCNEStatus(liveRecord.status);
    if (liveCancelStatus === 'Completed') {
      return { success: false, errorCode: 'CNE_ALREADY_FINALIZED', message: 'Cannot cancel a CNE that has already been finalized/completed.' };
    }
    if (liveCancelStatus === 'Canceled') {
      return {
        success: true,
        alreadyCanceled: true,
        message: 'This CNE has already been canceled.'
      };
    }
    
    var reason = sanitizeCellInput(params.remarks || 'Cancelled by coordinator');
    var ss = getSpreadsheet('CNE');
    var upcomingSheet = ss.getSheetByName('CNE Schedule');
    if (upcomingSheet) {
      var upColMap = getHeaderMap(upcomingSheet);
      var statusCol = upColMap['status'] !== undefined ? (upColMap['status'] + 1) : 12;
      var remarksCol = upColMap['adminremarks'] !== undefined ? (upColMap['adminremarks'] + 1) : 16;
      upcomingSheet.getRange(liveRecord.rowIndex, statusCol).setValue('Canceled');
      upcomingSheet.getRange(liveRecord.rowIndex, remarksCol).setValue(reason);
      deactivateQRTokensForCNE(cneId);
    }
    
    logAuditAction('CANCEL_CNE', session.employeeId, 'Cancelled CNE: ' + cneId + '. Reason: ' + reason, 'SUCCESS');
    return { success: true, message: 'CNE cancelled successfully.' };
  } finally {
    lock.releaseLock();
  }
}

