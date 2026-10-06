/**
 * Security & Access Verification Suite
 *
 * Verifies:
 * - Authentication & cryptographic session token validation
 * - Admin-only endpoint protection
 * - Area Incharge ward isolation & cross-ward transfer prevention
 * - Assigned Resource Person authorization & isolation
 * - Ordinary employee permission boundaries
 * - Authoritative CNE lifecycle protections & status transition enforcement
 * - Immutability of CNE ID and CNE Type
 * - Finalized CNE mutation locks (edits, participants, materials, questions)
 * - Post-test authorization & opaque QR token access control
 * - Synchronization between Code.gs and src/backend/googleAppsScript.ts
 */

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('Security & Access Verification');
console.log('========================================================\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const cneSchedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const appTs = fs.readFileSync('src/App.tsx', 'utf8');
const changePasswordModalTs = fs.readFileSync('src/components/ChangePasswordModal.tsx', 'utf8');
const adminRolesTs = fs.readFileSync('src/components/AdminRoles.tsx', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}\n`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Source Synchronization & Backend Wrapper Verification
// -----------------------------------------------------------------------------
runTest('Apps Script source code and TypeScript wrapper synchronization', () => {
  assert.ok(
    backendGs.includes('export const APPS_SCRIPT_SOURCE_CODE = `'),
    'src/backend/googleAppsScript.ts must wrap Code.gs'
  );
  assert.ok(
    backendGs.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
    'src/backend/googleAppsScript.ts must contain checkCNEAuthorized'
  );
  assert.ok(
    backendGs.includes('INVALID_STATUS_TRANSITION'),
    'src/backend/googleAppsScript.ts must contain INVALID_STATUS_TRANSITION'
  );
  assert.ok(
    backendGs.includes('checkCNEActionAuthorized(session, candidateRecord)'),
    'src/backend/googleAppsScript.ts must contain checkCNEActionAuthorized'
  );
});

// -----------------------------------------------------------------------------
// 2. Authentication & Session Security Structure
// -----------------------------------------------------------------------------
runTest('Protected backend actions require a valid session', () => {
  // Session verification function exists
  assert.ok(codeGs.includes('function verifySession('), 'verifySession function must exist');
  assert.ok(codeGs.includes('computeHmacSha256Signature'), 'Session tokens must be HMAC-SHA256 signed');
  assert.ok(codeGs.includes('timingSafeEqual'), 'Session signature comparison must use timingSafeEqual');

  // Critical protected handlers fail closed without session
  assert.ok(
    codeGs.includes("if (!session) {\n    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };\n  }"),
    'handleCreateCNE must require session'
  );
  assert.ok(
    codeGs.includes("if (!session) {\n    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized session.' };\n  }"),
    'handleUpdateCNE must require session'
  );
  assert.ok(
    codeGs.includes('function handleAdminAction(params, session, handlerFn, actionName) {'),
    'handleAdminAction must wrap all admin endpoints'
  );
});

runTest('Admin-only actions remain strictly Admin-only', () => {
  assert.ok(codeGs.includes('function requireAdmin(session) {'), 'requireAdmin helper must exist');
  assert.ok(
    codeGs.includes("if (String(session.role || '').toUpperCase() !== 'ADMIN')"),
    'requireAdmin must strictly check for ADMIN role'
  );
  assert.ok(
    codeGs.includes("errorCode: 'FORBIDDEN'"),
    'requireAdmin must return FORBIDDEN for non-admin'
  );

  // Router passes admin endpoints through handleAdminAction
  const adminEndpoints = [
    'addArea',
    'updateArea',
    'getRoles',
    'updateRole',
    'setupAndVerifyCNESheets',
    'uploadImage',
    'updateGalleryItem',
    'deleteGalleryItem',
    'addNewsEvent',
    'updateNewsEvent',
    'deleteNewsEvent',
    'updateCoordinatorDesk',
    'addQuickLink',
    'updateQuickLink',
    'deleteQuickLink',
    'adminResetPassword'
  ];

  for (const ep of adminEndpoints) {
    const casePattern = new RegExp(`case '${ep}':[\\s\\S]*?handleAdminAction`, 'm');
    assert.ok(casePattern.test(codeGs), `Endpoint '${ep}' must be protected by handleAdminAction`);
  }

  // Obsolete deleteCNE and reviewCNE endpoints must remain completely absent
  assert.ok(!codeGs.includes("case 'deleteCNE':"), "Code.gs must not contain obsolete router case 'deleteCNE'");
  assert.ok(!codeGs.includes("function handleDeleteCNE"), "Code.gs must not define obsolete function 'handleDeleteCNE'");
  assert.ok(!codeGs.includes("case 'reviewCNE':"), "Code.gs must not contain obsolete router case 'reviewCNE'");
  assert.ok(!codeGs.includes("function handleReviewCNE"), "Code.gs must not define obsolete function 'handleReviewCNE'");
});

// -----------------------------------------------------------------------------
// 3. Departmental CNE Area Isolation & Scoping
// -----------------------------------------------------------------------------
// Simulate checkCNEAuthorized logic faithfully as implemented in Code.gs
function simulateCheckCNEAuthorized(session, cneArea, cneType) {
  if (!session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }
  const role = String(session.role || '').toUpperCase();
  if (role === 'ADMIN') return null; // Admin has full control

  if (role === 'AREA_INCHARGE' || role === 'INCHARGE') {
    const type = String(cneType || '').trim().toUpperCase();
    if (type === 'DEPARTMENTAL' || type === 'DEPT') {
      const assignedAreas = (session.assignedAreas || (session.assignedArea ? [session.assignedArea] : []))
        .map(a => String(a).trim().toLowerCase());
      const targetArea = String(cneArea || '').trim().toLowerCase();
      if (targetArea && assignedAreas.length > 0 && assignedAreas.includes(targetArea)) {
        return null; // Authorized for this Departmental CNE
      }
    }
  }

  return {
    success: false,
    errorCode: 'FORBIDDEN',
    message: 'Permission denied. Only an Administrator or the designated Area Incharge for this department may manage this CNE.'
  };
}

runTest('Area Incharge authorization remains ward-scoped', () => {
  const inchargeWardA = {
    employeeId: 'EMP001',
    role: 'AREA_INCHARGE',
    assignedAreas: ['ICU-A', 'ICU-B']
  };

  // Eligible Ward A: Allowed
  assert.strictEqual(simulateCheckCNEAuthorized(inchargeWardA, 'ICU-A', 'DEPARTMENTAL'), null);
  assert.strictEqual(simulateCheckCNEAuthorized(inchargeWardA, 'ICU-B', 'DEPARTMENTAL'), null);

  // Ineligible Ward C: Rejected
  const rejectWardC = simulateCheckCNEAuthorized(inchargeWardA, 'Ward-C', 'DEPARTMENTAL');
  assert.ok(rejectWardC !== null && rejectWardC.errorCode === 'FORBIDDEN');

  // Central CNE: Rejected for Area Incharge
  const rejectCentral = simulateCheckCNEAuthorized(inchargeWardA, 'ICU-A', 'CENTRAL');
  assert.ok(rejectCentral !== null && rejectCentral.errorCode === 'FORBIDDEN');

  // Ordinary employee: Rejected for all
  const employee = { employeeId: 'EMP002', role: 'EMPLOYEE', assignedAreas: [] };
  const rejectEmployee = simulateCheckCNEAuthorized(employee, 'ICU-A', 'DEPARTMENTAL');
  assert.ok(rejectEmployee !== null && rejectEmployee.errorCode === 'FORBIDDEN');

  // Admin retains institution-wide authority across all wards and types
  const admin = { employeeId: 'ADMIN01', role: 'ADMIN', assignedAreas: [] };
  assert.strictEqual(simulateCheckCNEAuthorized(admin, 'ICU-A', 'DEPARTMENTAL'), null);
  assert.strictEqual(simulateCheckCNEAuthorized(admin, 'Ward-Z', 'DEPARTMENTAL'), null);
  assert.strictEqual(simulateCheckCNEAuthorized(admin, 'All Department', 'CENTRAL'), null);
});

runTest('Area Incharge cannot transfer a Departmental CNE to another ward', () => {
  // Check that handleUpdateCNE includes FORBIDDEN_WARD_TRANSFER check
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );
  assert.ok(
    updateSection.includes('FORBIDDEN_WARD_TRANSFER'),
    'handleUpdateCNE must contain FORBIDDEN_WARD_TRANSFER'
  );
  assert.ok(
    updateSection.includes('Area Incharge cannot transfer a Departmental CNE to another area/ward'),
    'handleUpdateCNE must explain that Area Incharge cannot transfer ward'
  );
});

// -----------------------------------------------------------------------------
// 4. Assigned Resource Person Authorization & Isolation
// -----------------------------------------------------------------------------
// Simulate checkCNEActionAuthorized logic as implemented in Code.gs
function simulateCheckCNEActionAuthorized(session, record) {
  if (!session || !session.employeeId) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }
  const role = String(session.role || '').toUpperCase();
  if (role === 'ADMIN') return null; // Admin has full operational authority

  if (record) {
    const loggedInId = String(session.employeeId).trim().toUpperCase();
    const rawRp = record.instructor || record.resourcePersonEmpId || '';
    const rpList = String(rawRp).split(/[,;\n]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

    // 1. Check if authenticated user is assigned Resource Person for THIS PARTICULAR CNE
    if (loggedInId && rpList.includes(loggedInId)) {
      return null;
    }

    // 2. Check if responsible Area Incharge for this Departmental CNE
    const areaAuth = simulateCheckCNEAuthorized(session, record.area, record.cneType);
    if (areaAuth === null) {
      return null;
    }
  }

  return {
    success: false,
    errorCode: 'FORBIDDEN',
    message: 'Permission denied. Only Administrators, the responsible Area Incharge, or assigned Resource Persons for this CNE may perform this action.'
  };
}

runTest('Assigned Resource Person authorization is CNE-specific', () => {
  const cneSession1 = {
    cneId: 'CNE-001',
    area: 'Ward-A',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-1001, RP-1002'
  };

  const cneSession2 = {
    cneId: 'CNE-002',
    area: 'Ward-B',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-2001'
  };

  const assignedRp = { employeeId: 'RP-1001', role: 'EMPLOYEE' };
  const unrelatedRp = { employeeId: 'RP-2001', role: 'EMPLOYEE' };
  const ordinaryEmp = { employeeId: 'EMP-9999', role: 'EMPLOYEE' };

  // Assigned Resource Person authorized for own CNE
  assert.strictEqual(simulateCheckCNEActionAuthorized(assignedRp, cneSession1), null);

  // Unrelated Resource Person rejected for another CNE
  const resUnrelated = simulateCheckCNEActionAuthorized(unrelatedRp, cneSession1);
  assert.ok(resUnrelated !== null && resUnrelated.errorCode === 'FORBIDDEN');

  // Ordinary employee rejected
  const resOrdinary = simulateCheckCNEActionAuthorized(ordinaryEmp, cneSession1);
  assert.ok(resOrdinary !== null && resOrdinary.errorCode === 'FORBIDDEN');

  // Responsible Area Incharge authorized
  const responsibleIncharge = { employeeId: 'INC-01', role: 'AREA_INCHARGE', assignedAreas: ['Ward-A'] };
  assert.strictEqual(simulateCheckCNEActionAuthorized(responsibleIncharge, cneSession1), null);

  // Unrelated Area Incharge rejected
  const unrelatedIncharge = { employeeId: 'INC-02', role: 'AREA_INCHARGE', assignedAreas: ['Ward-X'] };
  const resUnrelatedInc = simulateCheckCNEActionAuthorized(unrelatedIncharge, cneSession1);
  assert.ok(resUnrelatedInc !== null && resUnrelatedInc.errorCode === 'FORBIDDEN');
});

runTest('CNESchedule UI button restricts Post Test management to authorized users', () => {
  assert.ok(
    cneSchedule.includes('canManageCneActions(user, selectedDetailCne)'),
    'CNESchedule must verify canManageCneActions for selectedDetailCne'
  );
  assert.ok(
    cneSchedule.includes('disabled={!canManageCneActions(user, selectedDetailCne)}'),
    'Post Test button must be disabled when user cannot manage CNE actions'
  );
});

// -----------------------------------------------------------------------------
// 5. Authoritative CNE Lifecycle Protections
// -----------------------------------------------------------------------------
runTest('CNE ID and CNE Type cannot be modified through Edit CNE', () => {
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );

  // Immutability of CNE ID
  assert.ok(
    updateSection.includes('IMMUTABLE_CNE_ID'),
    'handleUpdateCNE must reject modified CNE ID with IMMUTABLE_CNE_ID'
  );
  assert.ok(
    updateSection.includes('CNE ID is permanently immutable and cannot be modified'),
    'handleUpdateCNE must explain that CNE ID is permanently immutable'
  );

  // Immutability of CNE Type
  assert.ok(
    updateSection.includes('IMMUTABLE_CNE_TYPE'),
    'handleUpdateCNE must reject modified CNE Type with IMMUTABLE_CNE_TYPE'
  );
  assert.ok(
    updateSection.includes('CNE Category / Type is immutable and cannot be changed'),
    'handleUpdateCNE must explain that CNE Category / Type is immutable'
  );
});

runTest('updateCNE cannot directly change Scheduled to Completed or Canceled', () => {
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );

  assert.ok(
    updateSection.includes('INVALID_STATUS_TRANSITION'),
    'handleUpdateCNE must reject status changes with INVALID_STATUS_TRANSITION'
  );
  assert.ok(
    updateSection.includes('CNE status cannot be changed through Edit CNE. Use the official Finalize or Cancel workflow'),
    'handleUpdateCNE must direct users to Finalize or Cancel workflow'
  );
  // Status column must NOT be modified by handleUpdateCNE
  assert.ok(
    !updateSection.includes("setColVal('status'"),
    'handleUpdateCNE must not write modified status to the sheet'
  );
});

runTest('Finalize uses dedicated finalization workflow', () => {
  assert.ok(codeGs.includes('function handleFinalizeCNE('), 'handleFinalizeCNE must exist');
  const finalizeSection = codeGs.substring(
    codeGs.indexOf('function handleFinalizeCNE'),
    codeGs.indexOf('function handleCancelCNE')
  );

  assert.ok(finalizeSection.includes("setValue('Completed')"), 'Finalize must set status to Completed');
  assert.ok(finalizeSection.includes('NO_PARTICIPANTS'), 'Finalize must require at least one recorded participant');
  assert.ok(finalizeSection.includes('totalParticipantsCount'), 'Finalize must compute and persist total attendees');
  assert.ok(finalizeSection.includes('remarksSummary'), 'Finalize must write remarks summary including average score');
});

runTest('Cancel uses dedicated cancellation workflow', () => {
  assert.ok(codeGs.includes('function handleCancelCNE('), 'handleCancelCNE must exist');
  const cancelSection = codeGs.substring(
    codeGs.indexOf('function handleCancelCNE'),
    codeGs.length
  );

  assert.ok(cancelSection.includes("setValue('Canceled')"), 'Cancel must set status to Canceled');
  assert.ok(
    cancelSection.includes('Cannot cancel a CNE that has already been finalized/completed'),
    'Cancel must reject already finalized/completed CNE'
  );
});

runTest('Finalized CNE cannot be edited or have mutations', () => {
  // 1. Edit CNE locked
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );
  assert.ok(
    updateSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    updateSection.includes('CNE_ALREADY_FINALIZED'),
    'handleUpdateCNE must reject edits on Completed CNE with CNE_ALREADY_FINALIZED'
  );

  // 2. Participant mutations locked
  const manualPartSection = codeGs.substring(
    codeGs.indexOf('function handleAddManualParticipants'),
    codeGs.indexOf('function handleGetCNEParticipants')
  );
  assert.ok(
    manualPartSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    manualPartSection.includes('CNE_ALREADY_FINALIZED'),
    'handleAddManualParticipants must reject additions to Completed CNE with CNE_ALREADY_FINALIZED'
  );

  // 3. Learning material mutations locked
  const refMatSection = codeGs.substring(
    codeGs.indexOf('function handleSaveReferenceMaterial'),
    codeGs.indexOf('function ensureReferenceSheetHeaders')
  );
  assert.ok(
    refMatSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    refMatSection.includes('CNE_ALREADY_FINALIZED'),
    'handleSaveReferenceMaterial must reject changes to Completed CNE with CNE_ALREADY_FINALIZED'
  );

  // 4. Question mutations locked
  const questionsSection = codeGs.substring(
    codeGs.indexOf('function handleSaveCNEQuestions'),
    codeGs.indexOf('function handleGetCNEQuestions')
  );
  assert.ok(
    questionsSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    questionsSection.includes('CNE_ALREADY_FINALIZED'),
    'handleSaveCNEQuestions must reject changes to Completed CNE with CNE_ALREADY_FINALIZED'
  );
});

// -----------------------------------------------------------------------------
// 6. Post Test Authorization & Public QR Token Flow
// -----------------------------------------------------------------------------
runTest('Post Test direct CNE-ID lookup is restricted to authorized roles', () => {
  const getPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleGetPostTestQuestions'),
    codeGs.indexOf('function handleSubmitPostTest')
  );
  assert.ok(
    getPostTestSection.includes('var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);'),
    'handleGetPostTestQuestions must enforce checkCNEActionAuthorized for direct CNE-ID access'
  );

  const submitPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipants')
  );
  assert.ok(
    submitPostTestSection.includes('var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);'),
    'handleSubmitPostTest must enforce checkCNEActionAuthorized for direct CNE-ID access'
  );
});

runTest('Valid public QR token flow is required and permitted for attendees', () => {
  const getPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleGetPostTestQuestions'),
    codeGs.indexOf('function handleSubmitPostTest')
  );
  assert.ok(
    getPostTestSection.includes('INVALID_OR_MISSING_QR_TOKEN'),
    'Post test access must reject missing or invalid QR token for unauthenticated attendees'
  );
  assert.ok(
    getPostTestSection.includes("rowStatus === 'ACTIVE'"),
    'QR token must be verified as ACTIVE in CNE_QR_Tokens'
  );
  assert.ok(
    getPostTestSection.includes('getCachedSanitizedQuestions'),
    'Attendee question delivery must sanitize answer keys and explanations'
  );

  const submitSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipants')
  );
  assert.ok(
    submitSection.includes('findOfficerById'),
    'Post test submission must authoritatively validate employee in staff roster'
  );
  assert.ok(
    submitSection.includes('ALREADY_SUBMITTED'),
    'Post test submission must reject duplicate submissions from same employee'
  );
  assert.ok(
    submitSection.includes("qSheet.getRange(questionRowsToLock[k], cols.isLocked + 1).setValue('YES')") ||
      (submitSection.includes('lockQuestionRowsBatch_') &&
        codeGs.includes("qSheet.getRangeList(a1).setValue('YES')")),
    'First successful submission must lock questions using a direct write or batched RangeList write'
  );
});

// -----------------------------------------------------------------------------
// 7. Password Security, Registered-Email OTP & Versioned Session Invalidation
// -----------------------------------------------------------------------------
runTest('Password hashing and Password Version session invalidation structure intact', () => {
  assert.ok(codeGs.includes('function computePasswordHash('), 'computePasswordHash must exist');
  assert.ok(codeGs.includes('PASSWORD_PEPPER'), 'Password hashing must require server-side pepper');
  assert.ok(codeGs.includes("'Password Version'"), 'Auth_Credentials must persist Password Version');

  const tokenSection = codeGs.substring(
    codeGs.indexOf('function generateSessionToken('),
    codeGs.indexOf('function timingSafeEqual(')
  );
  const verifySection = codeGs.substring(
    codeGs.indexOf('function verifySession('),
    codeGs.indexOf('/**\n * 1. Reusable ADMIN Authorization Helper')
  );
  assert.ok(
    tokenSection.includes("payload = normId + ':' + timestamp + ':' + nonce + ':' + passwordVersion"),
    'Session token payload must include persistent Password Version'
  );
  assert.ok(
    verifySection.includes("tokenPasswordVersion = parseInt(parts[3], 10)") &&
    verifySection.includes("parseInt(secState.passwordVersion || '0',10) !== tokenPasswordVersion"),
    'verifySession must reject tokens whose Password Version no longer matches Auth_Credentials'
  );

  const upsertSection = codeGs.substring(
    codeGs.indexOf('function upsertPasswordCredential('),
    codeGs.indexOf('function handleLogin(')
  );
  assert.ok(
    upsertSection.includes('record.passwordVersion + 1') &&
    upsertSection.includes('clearCredentialSecurityCache(cleanId)'),
    'Password creation/change must increment Password Version and clear credential security cache'
  );
});

runTest('Login uses Officers data, requires a personal password, rate-limits failures, and rejects inactive accounts', () => {
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    loginSection.includes('findOfficerById(employeeId)') && loginSection.includes('Officers data'),
    'handleLogin must resolve Employee ID from Officers data'
  );
  assert.ok(
    loginSection.includes("errorCode: 'PASSWORD_NOT_SET'") &&
    loginSection.includes('Create / Reset Password'),
    'Accounts without a personal password must be directed to Create / Reset Password'
  );
  assert.ok(
    !loginSection.includes("pass1234"),
    'Normal login must not accept the legacy shared pass1234 password'
  );
  assert.ok(
    loginSection.includes("record.accountStatus === 'INACTIVE'") &&
    loginSection.includes("errorCode: 'ACCOUNT_INACTIVE'"),
    'handleLogin must reject INACTIVE accounts'
  );

  const inactiveIndex = loginSection.indexOf("errorCode: 'ACCOUNT_INACTIVE'");
  const tokenGenIndex = loginSection.indexOf('generateSessionToken(employeeId)');
  assert.ok(
    inactiveIndex !== -1 && tokenGenIndex !== -1 && inactiveIndex < tokenGenIndex,
    'Inactive account rejection must occur before session-token issuance'
  );

  assert.ok(
    loginSection.includes('record.failedLoginCount + 1') &&
    loginSection.includes('failures >= 5') &&
    loginSection.includes("errorCode: failures >= 5 ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS'") &&
    loginSection.includes('15 * 60 * 1000'),
    'Normal login must enforce 5 failed attempts followed by a 15-minute lock'
  );
  assert.ok(
    loginSection.includes('getRange(record.rowIndex, 9).setValue(0)') &&
    loginSection.includes("getRange(record.rowIndex, 10).setValue('')"),
    'Successful login must clear the failed-login counter and lock timestamp'
  );
});

runTest('Registered-email password OTP flow is rate-limited, hashed, single-use, and Officers-data authoritative', () => {
  assert.ok(codeGs.includes("var OTP_PURPOSE_PASSWORD = 'PASSWORD_CREATE_RESET'"), 'Password OTP purpose must be explicit');
  assert.ok(codeGs.includes('function handleRequestPasswordOtp('), 'requestPasswordOtp backend handler must exist');
  assert.ok(codeGs.includes('function handleVerifyPasswordOtp('), 'verifyPasswordOtp backend handler must exist');
  assert.ok(codeGs.includes('function handleSetPasswordWithOtp('), 'setPasswordWithOtp backend handler must exist');

  const requestSection = codeGs.substring(
    codeGs.indexOf('function handleRequestPasswordOtp('),
    codeGs.indexOf('function handleVerifyPasswordOtp(')
  );
  assert.ok(
    requestSection.includes('findOfficerById(employeeId)') &&
    requestSection.includes('var email = String(officer.email || \'\').trim().toLowerCase()'),
    'Password OTP email must be resolved from the employee record in Officers data, not supplied by the browser'
  );
  assert.ok(
    requestSection.includes('countRecentOtpSends(OTP_PURPOSE_PASSWORD') &&
    requestSection.includes('OTP_MAX_SENDS_PER_HOUR') &&
    requestSection.includes("errorCode: 'OTP_RATE_LIMITED'"),
    'Password OTP requests must enforce a per-employee hourly send limit'
  );
  assert.ok(
    requestSection.includes('MailApp.getRemainingDailyQuota()') &&
    requestSection.includes("errorCode: 'EMAIL_QUOTA_EXHAUSTED'"),
    'Password OTP sending must check Apps Script email quota'
  );
  assert.ok(
    requestSection.includes('computeOtpHash(challengeId, otp)') &&
    requestSection.includes('otpSheet.appendRow([') &&
    !requestSection.includes('otpSheet.appendRow([\n    challengeId, OTP_PURPOSE_PASSWORD, \'INTERNAL\', employeeId, email, otp,'),
    'OTP_Verification must store a hash rather than the plaintext OTP'
  );
  assert.ok(
    requestSection.includes('OTP_RESEND_COOLDOWN_SECONDS') && requestSection.includes("cache.put(cooldownKey, '1'"),
    'Password OTP requests must enforce resend cooldown'
  );

  const verifyOtpSection = codeGs.substring(
    codeGs.indexOf('function handleVerifyPasswordOtp('),
    codeGs.indexOf('function handleSetPasswordWithOtp(')
  );
  assert.ok(
    verifyOtpSection.includes('/^\\d{6}$/.test(otp)') &&
    verifyOtpSection.includes('challenge.attempts >= challenge.maxAttempts') &&
    verifyOtpSection.includes('timingSafeEqual(suppliedHash, challenge.otpHash)'),
    'OTP verification must enforce 6 digits, maximum attempts, and timing-safe hashed comparison'
  );
  assert.ok(
    verifyOtpSection.includes("setValue('VERIFIED')") &&
    verifyOtpSection.includes('generateOtpVerificationToken('),
    'Successful OTP verification must mark the challenge VERIFIED and issue a short-lived verification token'
  );

  const setPasswordSection = codeGs.substring(
    codeGs.indexOf('function handleSetPasswordWithOtp('),
    codeGs.indexOf('/**\n * Legacy reset endpoint intentionally disabled.')
  );
  assert.ok(
    setPasswordSection.includes('verifyOtpVerificationToken(') &&
    setPasswordSection.includes("challenge.status !== 'VERIFIED'") &&
    setPasswordSection.includes('challenge.consumedAt'),
    'Password setup must require a valid, unconsumed verified OTP challenge'
  );
  assert.ok(
    setPasswordSection.includes('upsertPasswordCredential(employeeId, newPassword)') &&
    setPasswordSection.includes("setValue('CONSUMED')"),
    'Setting a password must update the versioned credential and consume the OTP challenge exactly once'
  );
});

runTest('Legacy password reset is disabled and admin reset invalidates sessions without assigning a shared password', () => {
  const resetSection = codeGs.substring(
    codeGs.indexOf('function handleResetPassword('),
    codeGs.indexOf('function handleAdminResetPassword(')
  );
  assert.ok(
    resetSection.includes("errorCode: 'OTP_REQUIRED'") && resetSection.includes('registered-email verification'),
    'Legacy resetPassword endpoint must be disabled in favor of registered-email OTP'
  );

  const adminResetSection = codeGs.substring(
    codeGs.indexOf('function handleAdminResetPassword('),
    codeGs.indexOf('function handleGetAreas(')
  );
  assert.ok(
    adminResetSection.includes('record.passwordVersion + 1') &&
    adminResetSection.includes("sheet.getRange(record.rowIndex, 2).setValue('')") &&
    adminResetSection.includes("sheet.getRange(record.rowIndex, 3).setValue('')"),
    'Admin reset must clear password hash/salt and increment Password Version'
  );
  assert.ok(
    !adminResetSection.includes('pass1234') &&
    adminResetSection.includes('invalidateOpenOtpChallenges(OTP_PURPOSE_PASSWORD, targetEmpId)'),
    'Admin reset must not assign a shared password and must invalidate pending password OTP challenges'
  );
});

runTest('Frontend Create / Reset Password flow uses the new OTP APIs and authentication fails closed', () => {
  const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
  const loginModalTs = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
  const forgotPasswordModalTs = fs.readFileSync('src/components/ForgotPasswordModal.tsx', 'utf8');

  assert.ok(
    loginModalTs.includes('Create / Reset Password') &&
    loginModalTs.includes("response.errorCode === 'PASSWORD_NOT_SET'"),
    'LoginModal must direct first-time/no-password users to Create / Reset Password'
  );
  assert.ok(
    !loginModalTs.includes('pass1234'),
    'LoginModal must not expose or instruct users to use the legacy shared password'
  );
  assert.ok(
    forgotPasswordModalTs.includes('ApiService.requestPasswordOtp(') &&
    forgotPasswordModalTs.includes('ApiService.verifyPasswordOtp(') &&
    forgotPasswordModalTs.includes('ApiService.setPasswordWithOtp('),
    'Create / Reset Password modal must use Send OTP -> Verify OTP -> Set Password APIs'
  );
  assert.ok(
    !forgotPasswordModalTs.includes('Date of Joining') &&
    !forgotPasswordModalTs.includes('dateOfJoining') &&
    !forgotPasswordModalTs.includes('resetPassword('),
    'Create / Reset Password modal must not retain the old DOJ/resetPassword flow'
  );

  assert.ok(
    apiTs.includes("'requestPasswordOtp'") &&
    apiTs.includes("'verifyPasswordOtp'") &&
    apiTs.includes("'setPasswordWithOtp'"),
    'api.ts must expose the three password OTP actions'
  );
  assert.ok(
    !apiTs.includes('static async resetPassword('),
    'Legacy resetPassword frontend API must be removed after OTP migration'
  );

  assert.ok(
    !apiTs.includes("? 'ADMIN' : 'ADMIN'"),
    'api.ts must not contain ADMIN fallback for unknown Employee IDs'
  );
  assert.ok(
    !apiTs.includes("token: 'preview-token-'") &&
    !apiTs.includes("token: currentUser.token || 'mock_token_'") &&
    !apiTs.includes('Authentication successful (Preview Mode)'),
    'api.ts must not generate preview/mock sessions or authenticate in preview mode'
  );
  assert.ok(
    apiTs.includes("errorCode: 'BACKEND_NOT_CONFIGURED'") &&
    apiTs.includes("message: 'CNE authentication service is not configured. Please contact the system administrator.'"),
    'api.ts must fail closed with BACKEND_NOT_CONFIGURED when VITE_APPS_SCRIPT_URL is missing or unusable'
  );
  assert.ok(
    apiTs.includes("storedToken.startsWith('preview-token-')") &&
    apiTs.includes("storedToken.startsWith('mock_token_')"),
    'api.ts must purge legacy preview/mock stored sessions'
  );
  assert.ok(
    loginModalTs.includes('response.success === true') &&
    loginModalTs.includes('sessionData.token.trim().length > 0') &&
    loginModalTs.includes('sessionData.employeeId.trim().length > 0') &&
    loginModalTs.includes('validRoles.includes(sessionData.role.trim().toUpperCase())'),
    'LoginModal must validate success, server token, Employee ID, and recognized role before accepting login'
  );

  // Frontend API caching security: explicit public allowlist, no generic action.startsWith('get').
  assert.ok(
    !apiTs.includes("action.startsWith('get')"),
    'api.ts must NOT use generic action.startsWith(\'get\') for localStorage caching/offline fallback'
  );
  assert.ok(
    apiTs.includes('function isPublicCacheableAction(action: string): boolean') &&
    apiTs.includes('PUBLIC_CACHEABLE_ACTIONS') &&
    apiTs.includes('NEVER_CACHEABLE_PROTECTED_ACTIONS'),
    'api.ts must use an explicit public-cache allowlist and protected-action denylist'
  );

  const allowlistMatch = apiTs.match(/const\s+PUBLIC_CACHEABLE_ACTIONS[\s\S]*?new\s+Set\(\[([\s\S]*?)\]\)/);
  assert.ok(allowlistMatch, 'PUBLIC_CACHEABLE_ACTIONS Set must be defined in api.ts');
  const allowlistedActions = eval(`[${allowlistMatch[1]}]`);
  const approvedPublicCmsActions = ['getCoordinatorDesk', 'getNewsEvents', 'getQuickLinks', 'getGallery'];
  assert.deepStrictEqual(
    allowlistedActions.slice().sort(),
    approvedPublicCmsActions.slice().sort(),
    'Only approved public CMS actions may be persisted in browser cache'
  );

  const protectedExcludedReads = [
    'getCNEQuestions', 'getPostTestQuestions', 'getCNEParticipants', 'getRoles',
    'getQRToken', 'getAiQuota', 'getCNEActivityProgress', 'getLearningResource',
    'getReferenceMaterial', 'getCNERecords'
  ];
  const denylistMatch = apiTs.match(/const\s+NEVER_CACHEABLE_PROTECTED_ACTIONS[\s\S]*?new\s+Set\(\[([\s\S]*?)\]\)/);
  assert.ok(denylistMatch, 'NEVER_CACHEABLE_PROTECTED_ACTIONS Set must be defined in api.ts');
  const denylistedActions = eval(`[${denylistMatch[1]}]`);
  for (const protectedAction of protectedExcludedReads) {
    assert.ok(!allowlistedActions.includes(protectedAction), `Protected action '${protectedAction}' must not be publicly cacheable`);
    assert.ok(denylistedActions.includes(protectedAction), `Protected action '${protectedAction}' must be explicitly never-cacheable`);
  }

  const execActionSection = apiTs.substring(
    apiTs.indexOf('static async executeAction'),
    apiTs.indexOf('static async login')
  );
  assert.ok(
    execActionSection.includes('if (result.success && result.data && isPublicCacheableAction(action))'),
    'executeAction must gate localStorage writes with isPublicCacheableAction(action)'
  );
  const fallbackChecks = execActionSection.match(/if\s*\(\s*isPublicCacheableAction\(action\)\s*\)/g) || [];
  assert.strictEqual(
    fallbackChecks.length,
    2,
    'HTTP-error and network-error offline fallbacks must both be gated by isPublicCacheableAction(action)'
  );

  const getCachedSection = apiTs.substring(
    apiTs.indexOf('static getCachedData'),
    apiTs.indexOf('static async getOfficersDropdown')
  );
  assert.ok(
    getCachedSection.includes('if (!isPublicCacheableAction(action))') && getCachedSection.includes('return null;'),
    'ApiService.getCachedData must return null for non-public actions'
  );

  const logoutSection = apiTs.substring(
    apiTs.indexOf('static logout()'),
    apiTs.indexOf('static getSessionUser()')
  );
  assert.ok(
    logoutSection.includes("k.startsWith('cne_cache_')") &&
    logoutSection.includes('localStorage.removeItem(k)') &&
    logoutSection.includes('localStorage.removeItem(STORAGE_KEYS.SESSION)'),
    'ApiService.logout() must remove all cne_cache_* entries and the session'
  );
});

// -----------------------------------------------------------------------------
// 8. Officer Directory Role Restriction & Public Employee ID Protection
// -----------------------------------------------------------------------------
runTest('Officer directory access is restricted to Admin, Area Incharge/Incharge, or CNE-scoped authorized manager, and rejected for ordinary EMPLOYEE', () => {
  const officersDropdownSection = codeGs.substring(
    codeGs.indexOf('function handleGetOfficersDropdown('),
    codeGs.indexOf('function getOfficerNameMap(')
  );

  const compactOfficerDirectorySection = officersDropdownSection.replace(/\s+/g, '');
  assert.ok(
    compactOfficerDirectorySection.includes("role==='ADMIN'||role==='AREA_INCHARGE'||role==='INCHARGE'"),
    'handleGetOfficersDropdown must explicitly check for ADMIN, AREA_INCHARGE, or INCHARGE roles'
  );
  assert.ok(
    compactOfficerDirectorySection.includes("errorCode:'FORBIDDEN'") &&
    compactOfficerDirectorySection.includes("message:'Youarenotauthorizedtoaccesstheofficerdirectory.'"),
    'handleGetOfficersDropdown must return FORBIDDEN with authorization message for ordinary employees'
  );

  // Simulate handleGetOfficersDropdown authorization logic
  function simulateOfficersDropdownAuth(session, params = {}, cneRecordMap = {}) {
    if (!session) {
      return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
    }
    const role = String(session.role || '').trim().toUpperCase();
    const isDirectoryRole = (role === 'ADMIN' || role === 'AREA_INCHARGE' || role === 'INCHARGE');
    if (!isDirectoryRole) {
      const cneId = params && params.cneId ? String(params.cneId).trim() : '';
      let isAuthorizedForCne = false;
      if (cneId && cneRecordMap[cneId]) {
        if (simulateCheckCNEActionAuthorized(session, cneRecordMap[cneId]) === null) {
          isAuthorizedForCne = true;
        }
      }
      if (!isAuthorizedForCne) {
        return {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'You are not authorized to access the officer directory.'
        };
      }
    }
    return { success: true };
  }

  // Ordinary EMPLOYEE cannot access full officer dropdown
  const ordinaryEmployee = { employeeId: 'EMP100', role: 'EMPLOYEE' };
  const empRes = simulateOfficersDropdownAuth(ordinaryEmployee);
  assert.strictEqual(empRes.success, false, 'Ordinary EMPLOYEE must be denied officer directory access');
  assert.strictEqual(empRes.errorCode, 'FORBIDDEN', 'Ordinary EMPLOYEE must receive FORBIDDEN');

  // Admin can access it
  const adminSession = { employeeId: 'ADM01', role: 'ADMIN' };
  assert.strictEqual(simulateOfficersDropdownAuth(adminSession).success, true, 'ADMIN must be allowed officer directory access');

  // Area Incharge and Incharge can access it
  const areaInchargeSession = { employeeId: 'INC01', role: 'AREA_INCHARGE', assignedAreas: ['ICU'] };
  const inchargeSession = { employeeId: 'INC02', role: 'INCHARGE', assignedAreas: ['Ward-1'] };
  assert.strictEqual(simulateOfficersDropdownAuth(areaInchargeSession).success, true, 'AREA_INCHARGE must be allowed officer directory access');
  assert.strictEqual(simulateOfficersDropdownAuth(inchargeSession).success, true, 'INCHARGE must be allowed officer directory access');

  // Assigned Resource Person can access only when scoped to their assigned CNE, not globally
  const rpSession = { employeeId: 'RP500', role: 'EMPLOYEE' };
  assert.strictEqual(simulateOfficersDropdownAuth(rpSession).success, false, 'Resource Person without CNE scope must not have global directory access');
  assert.strictEqual(
    simulateOfficersDropdownAuth(rpSession, { cneId: 'CNE-500' }, { 'CNE-500': { cneId: 'CNE-500', area: 'ICU', cneType: 'CENTRAL', resourcePersonEmpId: 'RP500' } }).success,
    true,
    'Assigned Resource Person with valid CNE scope must be allowed directory access for that CNE'
  );
});

runTest('Frontend does not automatically fetch officer directory for every logged-in user and protects public CNE output from raw Employee ID fallback', () => {
  const myCneRecordsTs = fs.readFileSync('src/components/MyCNERecords.tsx', 'utf8');
  const utilsTs = fs.readFileSync('src/utils.ts', 'utf8');

  // MyCNERecords (ordinary employee view) must not call loadOfficersSingleFlight
  assert.ok(
    !myCneRecordsTs.includes('loadOfficersSingleFlight'),
    'MyCNERecords.tsx must not fetch the officer directory'
  );

  // CNESchedule loadData must not unconditionally fetch officers whenever any user is logged in
  const loadDataSlice = cneSchedule.substring(
    cneSchedule.indexOf('const loadData = async'),
    cneSchedule.indexOf('const handleChildModalUpdated')
  );
  assert.ok(
    !loadDataSlice.includes('if (user) {\n        loadOfficersSingleFlight()'),
    'CNESchedule loadData must not fetch the officer directory merely because any user is logged in'
  );
  assert.ok(
    loadDataSlice.includes('if (canScheduleCne && (isAddClassOpen || Boolean(editingCne))'),
    'CNESchedule must gate on-demand officer loading behind canScheduleCne && (isAddClassOpen || Boolean(editingCne))'
  );

  // Public CNE output cannot fall back to raw Employee ID
  const getCneSection = codeGs.substring(
    codeGs.indexOf('function handleGetCNERecords('),
    codeGs.indexOf('function handleCreateCNE(')
  );
  assert.ok(
    getCneSection.includes("return officerMap[id] || 'Resource Person';") &&
    getCneSection.includes("return officerMap[id] || 'Staff Member';"),
    'handleGetCNERecords must use neutral display labels rather than raw Employee IDs when roster names cannot be resolved'
  );
  assert.ok(
    getCneSection.includes("resourcePersonEmpIdForResponse = ''") &&
    getCneSection.includes("resourcePersonEmpIdForResponse = loggedInId") &&
    getCneSection.includes("staffEmpIdsForResponse = []") &&
    getCneSection.includes("staffNameList = staffArray.map") &&
    getCneSection.includes("proposedByEmpId: canSeeInternalManagementFields ? proposedBy : ''") &&
    getCneSection.includes("proposedByName: proposedByName") &&
    getCneSection.includes("remarks: remarks") &&
    getCneSection.includes("adminRemarks: canSeeInternalManagementFields ? adminRemarks : ''"),
    'handleGetCNERecords must expose safe names/general remarks while minimizing raw Employee IDs and restricting Admin Remarks'
  );
  assert.ok(
    getCneSection.includes("var adminRemarksCol = colMap['adminremarks']") &&
    getCneSection.includes("var remarksCol = colMap['remarks']"),
    'handleGetCNERecords must read general Remarks separately from Admin Remarks'
  );

  const rpDisplaySection = utilsTs.substring(
    utilsTs.indexOf('export function formatResourcePersonsDisplay('),
    utilsTs.indexOf('export function getUserAssignedAreas(')
  );
  assert.ok(
    rpDisplaySection.includes(".map(() => 'Resource Person')"),
    "formatResourcePersonsDisplay must never fall back to raw Employee ID when officer directory is not loaded"
  );
});

// -----------------------------------------------------------------------------
// 12. Admin Role Management Fixed Role-Priority Sorting
// -----------------------------------------------------------------------------
runTest('Admin Role Management enforces fixed role priority (ADMIN > AREA_INCHARGE > EMPLOYEE)', () => {
  assert.ok(
    adminRolesTs.includes('ROLE_SORT_PRIORITY: Record<string, number> = {') &&
    adminRolesTs.includes('ADMIN: 0') &&
    adminRolesTs.includes('AREA_INCHARGE: 1') &&
    adminRolesTs.includes('EMPLOYEE: 2'),
    'AdminRoles must define ROLE_SORT_PRIORITY with ADMIN: 0, AREA_INCHARGE: 1, EMPLOYEE: 2'
  );

  assert.ok(
    adminRolesTs.includes('const getRolePriority =') &&
    adminRolesTs.includes('?? 99'),
    'AdminRoles must map unknown or future roles to priority 99'
  );

  assert.ok(
    adminRolesTs.includes('getUserRolePriority ='),
    'AdminRoles must implement getUserRolePriority helper'
  );

  // Functional verification of sorting logic simulated with sample data
  const priorityMap = { ADMIN: 0, AREA_INCHARGE: 1, EMPLOYEE: 2 };
  const getP = (role) => priorityMap[String(role || '').trim().toUpperCase()] ?? 99;

  assert.ok(getP('ADMIN') < getP('AREA_INCHARGE'), 'ADMIN must sort before AREA_INCHARGE');
  assert.ok(getP('AREA_INCHARGE') < getP('EMPLOYEE'), 'AREA_INCHARGE must sort before EMPLOYEE');
  assert.ok(getP('EMPLOYEE') < getP('OTHER'), 'EMPLOYEE must sort before unknown roles');
  assert.ok(getP('EMPLOYEE') < getP('GUEST'), 'Unknown roles must appear after EMPLOYEE');

  // Verify multiple role resolution (highest privileged role)
  const resolveMultiRole = (roles) => Math.min(...roles.map(getP));
  assert.strictEqual(resolveMultiRole(['EMPLOYEE', 'AREA_INCHARGE']), 1, 'Multiple roles [EMPLOYEE, AREA_INCHARGE] must resolve to AREA_INCHARGE');
  assert.strictEqual(resolveMultiRole(['ADMIN', 'EMPLOYEE']), 0, 'Multiple roles [ADMIN, EMPLOYEE] must resolve to ADMIN');
});

runTest('Admin Role Management applies secondary sort by Employee ID and sorts before pagination', () => {
  assert.ok(
    adminRolesTs.includes('const sortedFilteredOfficers = useMemo('),
    'AdminRoles must compute sortedFilteredOfficers via useMemo'
  );

  assert.ok(
    adminRolesTs.includes('[...filteredOfficers].sort('),
    'AdminRoles must sort a shallow copy to prevent source array mutation'
  );

  assert.ok(
    adminRolesTs.includes('localeCompare(') &&
    adminRolesTs.includes('numeric: true') &&
    adminRolesTs.includes("sensitivity: 'base'"),
    'AdminRoles must sort Employee IDs ascending using localeCompare with numeric: true and sensitivity: base'
  );

  assert.ok(
    adminRolesTs.includes('paginatedOfficers = useMemo(') &&
    adminRolesTs.includes('sortedFilteredOfficers.slice('),
    'AdminRoles must paginate from sortedFilteredOfficers (sorting before pagination)'
  );

  assert.ok(
    !adminRolesTs.includes('paginatedOfficers.sort('),
    'AdminRoles must NOT sort after pagination'
  );
});

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL SECURITY & ACCESS TESTS PASSED!');
console.log('========================================================\n');
