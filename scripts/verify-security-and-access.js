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
    'deleteCNE',
    'setupAndVerifyCNESheets',
    'reviewCNE',
    'getAllApplications',
    'updateApplicationStatus',
    'uploadImage',
    'updateGalleryItem',
    'deleteGalleryItem',
    'addNewsEvent',
    'updateNewsEvent',
    'deleteNewsEvent',
    'updateChairpersonMessage',
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
    codeGs.indexOf('function handleDeleteCNE')
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
    codeGs.indexOf('function handleDeleteCNE')
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
    codeGs.indexOf('function handleDeleteCNE')
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
    codeGs.indexOf('function migrateCNEApplicationsHeaderToCNEId')
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
    codeGs.indexOf('function handleDeleteCNE')
  );
  assert.ok(
    updateSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    updateSection.includes('CNE_ALREADY_FINALIZED'),
    'handleUpdateCNE must reject edits on Completed CNE with CNE_ALREADY_FINALIZED'
  );

  // 2. Participant mutations locked
  const manualPartSection = codeGs.substring(
    codeGs.indexOf('function handleAddManualParticipant'),
    codeGs.indexOf('function handleGetCNEParticipants')
  );
  assert.ok(
    manualPartSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    manualPartSection.includes('CNE_ALREADY_FINALIZED'),
    'handleAddManualParticipant must reject additions to Completed CNE with CNE_ALREADY_FINALIZED'
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
    codeGs.indexOf('function handleAddManualParticipant')
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
    codeGs.indexOf('function handleAddManualParticipant')
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
    submitSection.includes("qSheet.getRange(questionRowsToLock[k], cols.isLocked + 1).setValue('YES')"),
    'First successful submission must lock questions'
  );
});

// -----------------------------------------------------------------------------
// 7. Password Security & First-Login Enforcement
// -----------------------------------------------------------------------------
runTest('Password hashing and first-login enforcement structure intact', () => {
  assert.ok(codeGs.includes('computePasswordHash'), 'computePasswordHash must exist');
  assert.ok(codeGs.includes('PASSWORD_PEPPER'), 'Password hashing must require server-side pepper');
  assert.ok(codeGs.includes('mustChangePass'), 'Login handler must check mustChangePass flag');
  assert.ok(
    codeGs.includes('function handleChangePassword('),
    'handleChangePassword must exist to clear mustChangePass flag'
  );
  assert.ok(
    codeGs.includes('pwd_change_'),
    'Password change must invalidate previously issued session tokens'
  );
});

runTest('handleLogin reads Account Status & explicit INACTIVE login is rejected without token', () => {
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    loginSection.includes("accountStatus === 'INACTIVE'") || loginSection.includes("ACCOUNT_INACTIVE"),
    'handleLogin must check accountStatus and reject INACTIVE accounts'
  );
  assert.ok(
    loginSection.includes("errorCode: 'ACCOUNT_INACTIVE'"),
    "handleLogin must return errorCode 'ACCOUNT_INACTIVE' for inactive accounts"
  );

  // Must reject before generating token
  const inactiveIndex = loginSection.indexOf("errorCode: 'ACCOUNT_INACTIVE'");
  const tokenGenIndex = loginSection.indexOf('generateSessionToken(');
  assert.ok(
    inactiveIndex !== -1 && tokenGenIndex !== -1 && inactiveIndex < tokenGenIndex,
    'handleLogin must reject INACTIVE accounts before generating a session token'
  );
});

runTest('Normal login enforces 5-attempt / 15-minute rate limiting & clears counter on success', () => {
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    loginSection.includes("login_fail_"),
    "handleLogin must maintain cache key 'login_fail_<id>'"
  );
  assert.ok(
    loginSection.includes("failCount >= 5") || loginSection.includes("failCount >= 5"),
    'handleLogin must enforce rate limiting at 5 failed attempts'
  );
  assert.ok(
    loginSection.includes("errorCode: 'RATE_LIMITED'"),
    "handleLogin must return errorCode 'RATE_LIMITED' when threshold reached"
  );
  assert.ok(
    loginSection.includes("cache.remove(cacheKey)") || loginSection.includes("cache.remove('login_fail_'"),
    'handleLogin must clear failure counter upon successful credentials verification'
  );
});

runTest('First default-password login establishes persistent User Credentials row with Must Change Password = YES', () => {
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    loginSection.includes("pass1234"),
    'handleLogin must recognize default first-time password pass1234'
  );
  assert.ok(
    loginSection.includes("authSheet.appendRow([employeeId, defaultHash, defaultSalt, 'YES'") ||
    (loginSection.includes("defaultHash") && loginSection.includes("'YES'")),
    "First login must establish User Credentials record with Must Change Password = YES and hashed password"
  );

  // 1. Concurrent first-login protection remains under ScriptLock and re-reads User Credentials
  assert.ok(
    loginSection.includes('var lock = LockService.getScriptLock();') &&
    loginSection.includes('lock.waitLock(10000);'),
    'First-login setup must acquire ScriptLock via LockService.getScriptLock().waitLock(10000)'
  );
  assert.ok(
    loginSection.includes('var freshData = authSheet.getDataRange().getValues();') &&
    loginSection.includes('if (existingRow > 0)'),
    'First-login setup must re-read User Credentials under lock and inspect existing row rather than duplicating'
  );

  // 1b. Existing populated credential rows are NOT blindly overwritten under lock
  assert.ok(
    loginSection.includes('var existingHash = String(existingRowData[1] || \'\').trim();') &&
    loginSection.includes('var existingSalt = String(existingRowData[2] || \'\').trim();') &&
    loginSection.includes('var existingMustChange = String(existingRowData[3] || \'\').trim().toUpperCase();') &&
    loginSection.includes('var existingAccountStatus = String(existingRowData[7] || \'\').trim().toUpperCase();'),
    'First-login lock section must inspect existingHash, existingSalt, existingMustChange, and existingAccountStatus before writing'
  );

  // 1c. Explicit INACTIVE status discovered under lock aborts with ACCOUNT_INACTIVE and does NOT overwrite to ACTIVE
  assert.ok(
    loginSection.includes("if (existingAccountStatus === 'INACTIVE')") &&
    loginSection.includes("errorCode: 'ACCOUNT_INACTIVE'"),
    'Explicit INACTIVE status discovered under lock must abort with ACCOUNT_INACTIVE instead of setting ACTIVE'
  );

  // 1d. Existing Must Change Password = NO causes stale first-login request to abort with CREDENTIAL_STATE_CHANGED
  assert.ok(
    loginSection.includes("if (existingMustChange === 'NO')") &&
    loginSection.includes("errorCode: 'CREDENTIAL_STATE_CHANGED'") &&
    loginSection.includes("message: 'Your account credentials changed while signing in. Please sign in again with your current password.'"),
    'Existing Must Change Password = NO under lock must abort stale first-login request with CREDENTIAL_STATE_CHANGED'
  );

  // 1e. Only blank existingHash and existingSalt may initialize an existing row with new defaultHash/defaultSalt
  assert.ok(
    loginSection.includes('if (!existingHash && !existingSalt)'),
    'Existing row may only be initialized with a new default password hash when both existingHash and existingSalt are blank'
  );

  // 1f. Concurrent already-created default credentials with Must Change Password = YES are reused rather than regenerated
  assert.ok(
    loginSection.includes("if (computePasswordHash('pass1234', existingSalt) === existingHash && existingMustChange === 'YES')") &&
    loginSection.includes('expectedHash = existingHash;') &&
    loginSection.includes('expectedSalt = existingSalt;'),
    'Concurrent default-password row with Must Change Password = YES must be reused without regenerating salt or overwriting hash'
  );

  // 1g. Populated hash that no longer matches pass1234 aborts with CREDENTIAL_STATE_CHANGED and logs FIRST_LOGIN_STATE_CHANGED
  assert.ok(
    loginSection.includes("logAuditAction('FIRST_LOGIN_STATE_CHANGED'"),
    'Stale concurrent credential state change must log FIRST_LOGIN_STATE_CHANGED audit event'
  );

  // 2. Lock failure is not silently swallowed; releaseLock() is only called after lock is acquired
  assert.ok(
    loginSection.includes('Server is busy completing account setup. Please try again.'),
    'Lock acquisition failure must return temporary busy message'
  );
  const waitLockIdx = loginSection.indexOf('lock.waitLock(10000);');
  const busyMsgIdx = loginSection.indexOf('Server is busy completing account setup. Please try again.');
  const releaseLockIdx = loginSection.indexOf('lock.releaseLock();');
  assert.ok(
    waitLockIdx !== -1 && busyMsgIdx !== -1 && releaseLockIdx !== -1 &&
    waitLockIdx < busyMsgIdx && busyMsgIdx < releaseLockIdx,
    'Lock failure must return before entering the try/finally block that calls lock.releaseLock()'
  );

  // 3. No empty or silent catch block that allows falling through to token generation
  assert.ok(
    !loginSection.includes('Fallback if lock busy'),
    'handleLogin must not contain silent fallback catch comment'
  );
  const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*\s*)*\}/;
  assert.ok(
    !emptyCatchPattern.test(loginSection),
    'handleLogin must not contain any empty or comment-only catch block'
  );

  // 4. Persistence confirmation and CREDENTIAL_SETUP_FAILED error response
  assert.ok(
    loginSection.includes('SpreadsheetApp.flush();') &&
    loginSection.includes('var persistedData = authSheet.getDataRange().getValues();') &&
    loginSection.includes('if (!persistedSuccessfully || verifiedRowCount !== 1)'),
    'First-login setup must flush and re-read User Credentials to confirm exactly one valid row was persisted'
  );
  assert.ok(
    loginSection.includes("logAuditAction('FIRST_LOGIN_SETUP_FAILED'"),
    'First-login setup failure must log FIRST_LOGIN_SETUP_FAILED audit event'
  );
  assert.ok(
    loginSection.includes("errorCode: 'CREDENTIAL_SETUP_FAILED'") &&
    loginSection.includes("message: 'Your account security setup could not be completed. Please try again.'"),
    'Credential persistence failure must return CREDENTIAL_SETUP_FAILED with safe user message'
  );
  assert.ok(
    !loginSection.includes('setupErr.message') && !loginSection.includes('lockErr.message'),
    'First-login error responses must not expose technical exception details to the user'
  );

  // 5. Token generation and security cache update occur ONLY after authoritative under-lock state is accepted
  const setupErrorReturnIdx = loginSection.lastIndexOf("errorCode: 'CREDENTIAL_SETUP_FAILED'");
  const stateChangedReturnIdx = loginSection.lastIndexOf("errorCode: 'CREDENTIAL_STATE_CHANGED'");
  const credSecCacheIdx = loginSection.indexOf("cache.put('cred_sec_'");
  const tokenGenIdx = loginSection.indexOf('generateSessionToken(employeeId)');
  assert.ok(
    setupErrorReturnIdx !== -1 && stateChangedReturnIdx !== -1 && credSecCacheIdx !== -1 && tokenGenIdx !== -1 &&
    setupErrorReturnIdx < credSecCacheIdx && stateChangedReturnIdx < credSecCacheIdx && credSecCacheIdx < tokenGenIdx,
    'All under-lock state checks, persistence checks, and error returns must complete before updating cred_sec_ cache or calling generateSessionToken()'
  );
});

runTest('Backend protected actions enforce MUST_CHANGE_PASSWORD while changePassword remains allowed', () => {
  assert.ok(
    codeGs.includes("function getUserCredentialSecurityState("),
    'Code.gs must define getUserCredentialSecurityState helper'
  );
  assert.ok(
    codeGs.includes("errorCode: 'MUST_CHANGE_PASSWORD'"),
    "handleRequest must return errorCode 'MUST_CHANGE_PASSWORD' for sessions requiring password change"
  );

  const routerSection = codeGs.substring(
    codeGs.indexOf('function handleRequest('),
    codeGs.indexOf('switch (action)')
  );
  assert.ok(
    routerSection.includes("secState.mustChangePassword") && routerSection.includes("action !== 'changePassword'"),
    "handleRequest must enforce MUST_CHANGE_PASSWORD while explicitly permitting 'changePassword'"
  );

  // Authenticated protected actions reject secState.accountStatus === 'INACTIVE' BEFORE MUST_CHANGE_PASSWORD
  assert.ok(
    routerSection.includes("if (secState.accountStatus === 'INACTIVE')") &&
    routerSection.includes("errorCode: 'ACCOUNT_INACTIVE'") &&
    routerSection.includes("message: 'Your CNE account is inactive. Please contact Nursing Administration.'"),
    "handleRequest must reject authenticated sessions when secState.accountStatus === 'INACTIVE'"
  );
  const inactiveCheckIdx = routerSection.indexOf("if (secState.accountStatus === 'INACTIVE')");
  const mustChangeCheckIdx = routerSection.indexOf("if (secState.mustChangePassword && action !== 'changePassword')");
  assert.ok(
    inactiveCheckIdx !== -1 && mustChangeCheckIdx !== -1 && inactiveCheckIdx < mustChangeCheckIdx,
    "ACCOUNT_INACTIVE enforcement must occur strictly before MUST_CHANGE_PASSWORD enforcement"
  );

  // changePassword bypasses MUST_CHANGE_PASSWORD only, NOT ACCOUNT_INACTIVE
  const outerGuardLine = routerSection.substring(
    routerSection.indexOf('if (session && !isPublicQrAction'),
    inactiveCheckIdx
  );
  assert.ok(
    !outerGuardLine.includes("action !== 'changePassword'"),
    "changePassword must NOT bypass the outer security guard that enforces ACCOUNT_INACTIVE"
  );
});

runTest('Password change clears Must Change Password flag and returns fresh valid session', () => {
  const changeSection = codeGs.substring(
    codeGs.indexOf('function handleChangePassword('),
    codeGs.indexOf('function handleResetPassword(')
  );
  const resetSection = codeGs.substring(
    codeGs.indexOf('function handleResetPassword('),
    codeGs.indexOf('function handleAdminResetPassword(')
  );
  const adminResetSection = codeGs.substring(
    codeGs.indexOf('function handleAdminResetPassword('),
    codeGs.indexOf('function handleGetAreas(')
  );

  assert.ok(
    changeSection.includes("authSheet.getRange(i + 1, 4).setValue('NO')") || changeSection.includes("'NO'"),
    'handleChangePassword must set Must Change Password to NO'
  );
  assert.ok(
    changeSection.includes("generateSessionToken("),
    'handleChangePassword must generate a fresh session token'
  );
  assert.ok(
    changeSection.includes("mustChangePassword: false") && changeSection.includes("isFirstLogin: false"),
    'handleChangePassword must return SessionUser data with mustChangePassword = false'
  );

  // 1. handleChangePassword does NOT write ACTIVE to Column 8 of an existing credential row and rejects INACTIVE under lock
  assert.ok(
    !changeSection.includes("getRange(i + 1, 8).setValue('ACTIVE')"),
    'handleChangePassword must not overwrite Column 8 (Account Status) to ACTIVE on an existing row'
  );
  assert.ok(
    changeSection.includes("if (rawStatus === 'INACTIVE')") &&
    changeSection.includes("logAuditAction('PASSWORD_CHANGE_BLOCKED', empId, 'Account inactive', 'BLOCKED')") &&
    changeSection.includes("errorCode: 'ACCOUNT_INACTIVE'"),
    'handleChangePassword must re-read Account Status under ScriptLock and reject INACTIVE accounts with ACCOUNT_INACTIVE'
  );
  const changeInactiveReturnIdx = changeSection.indexOf("errorCode: 'ACCOUNT_INACTIVE'");
  const changeWriteIdx = changeSection.indexOf("authSheet.getRange(i + 1, 2).setValue(hashStr)");
  const changeTokenIdx = changeSection.indexOf("generateSessionToken(empId)");
  assert.ok(
    changeInactiveReturnIdx !== -1 && changeWriteIdx !== -1 && changeTokenIdx !== -1 &&
    changeInactiveReturnIdx < changeWriteIdx && changeInactiveReturnIdx < changeTokenIdx,
    'handleChangePassword must abort on INACTIVE before writing password hash or issuing a new session token'
  );
  assert.ok(
    changeSection.includes("authSheet.appendRow([empId, hashStr, salt, 'NO', now, now, now, 'ACTIVE'])"),
    'handleChangePassword may still initialize genuinely new credential rows as ACTIVE'
  );

  // 2. handleResetPassword (Forgot Password) does NOT change an existing INACTIVE account to ACTIVE and rejects INACTIVE under lock
  assert.ok(
    !resetSection.includes("getRange(i + 1, 8).setValue('ACTIVE')"),
    'handleResetPassword must not overwrite Column 8 (Account Status) to ACTIVE on an existing row'
  );
  assert.ok(
    resetSection.includes("if (rawStatus === 'INACTIVE')") &&
    resetSection.includes("logAuditAction('PASSWORD_RESET_BLOCKED', employeeId, 'Account inactive', 'BLOCKED')") &&
    resetSection.includes("errorCode: 'ACCOUNT_INACTIVE'"),
    'handleResetPassword must re-read Account Status under ScriptLock and reject INACTIVE accounts with ACCOUNT_INACTIVE'
  );
  const resetLockIdx = resetSection.indexOf('lock.waitLock(10000);');
  const resetInactiveReturnIdx = resetSection.indexOf("errorCode: 'ACCOUNT_INACTIVE'");
  const resetWriteIdx = resetSection.indexOf("authSheet.getRange(i + 1, 2).setValue(hashStr)");
  assert.ok(
    resetLockIdx !== -1 && resetInactiveReturnIdx !== -1 && resetWriteIdx !== -1 &&
    resetLockIdx < resetInactiveReturnIdx && resetInactiveReturnIdx < resetWriteIdx,
    'handleResetPassword must check INACTIVE status while holding ScriptLock and abort before modifying credentials'
  );
  assert.ok(
    resetSection.includes("authSheet.appendRow([employeeId, hashStr, salt, 'NO', now, now, now, 'ACTIVE'])"),
    'handleResetPassword may still initialize genuinely new credential rows as ACTIVE'
  );

  // 3. handleAdminResetPassword preserves existing Account Status (including INACTIVE) and does NOT write ACTIVE to Column 8
  assert.ok(
    !adminResetSection.includes("getRange(i + 1, 8).setValue('ACTIVE')"),
    'handleAdminResetPassword must not overwrite Column 8 (Account Status) to ACTIVE on an existing row'
  );
  assert.ok(
    adminResetSection.includes("preservedAccountStatus = (rawStatus === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';"),
    'handleAdminResetPassword must read and preserve existing Account Status (INACTIVE vs ACTIVE) under ScriptLock'
  );
  assert.ok(
    adminResetSection.includes("authSheet.appendRow([targetEmpId, defaultHash, salt, 'YES', now, now, now, 'ACTIVE'])"),
    'handleAdminResetPassword may initialize genuinely new credential rows as ACTIVE'
  );

  // 4. cred_sec_ cache is never blindly set to ACTIVE when authoritative status is INACTIVE
  assert.ok(
    changeSection.includes("CacheService.getScriptCache().remove('cred_sec_' + empId)") &&
    resetSection.includes("CacheService.getScriptCache().remove('cred_sec_' + employeeId)"),
    'Blocked password operations on INACTIVE accounts must clear stale cred_sec_ cache entries'
  );
  assert.ok(
    adminResetSection.includes("accountStatus: preservedAccountStatus"),
    'handleAdminResetPassword must cache preservedAccountStatus in cred_sec_ rather than hardcoded ACTIVE'
  );
});

runTest('Frontend consumes mustChangePassword & forced Change Password modal cannot be dismissed before success', () => {
  assert.ok(
    appTs.includes("isForcedPasswordChange"),
    'App.tsx must define isForcedPasswordChange mode'
  );
  assert.ok(
    appTs.includes("forced={isForcedPasswordChange}"),
    'App.tsx must pass forced={isForcedPasswordChange} to ChangePasswordModal'
  );
  assert.ok(
    appTs.includes("!isForcedPasswordChange && (") && appTs.includes("<TopToolbar"),
    'App.tsx must hide TopToolbar while isForcedPasswordChange is true'
  );
  assert.ok(
    changePasswordModalTs.includes("!forced && (") && changePasswordModalTs.includes("<X className="),
    'ChangePasswordModal must hide X close button when forced is true'
  );
  assert.ok(
    changePasswordModalTs.includes("e.key === 'Escape' && !forced"),
    'ChangePasswordModal must prevent Escape dismissal when forced is true'
  );
  assert.ok(
    changePasswordModalTs.includes("You must set your personal password before continuing to the CNE Portal"),
    'ChangePasswordModal must inform user that personal password is required'
  );

  // Verify frontend authentication fails closed without Google Apps Script and removes mock/preview fallbacks
  const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
  const loginModalTs = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');

  assert.ok(
    !apiTs.includes("? 'ADMIN' : 'ADMIN'"),
    'api.ts must not contain ADMIN fallback (? \'ADMIN\' : \'ADMIN\') for unknown Employee IDs'
  );
  assert.ok(
    !apiTs.includes("token: 'preview-token-'") &&
    !apiTs.includes("token: currentUser.token || 'mock_token_'") &&
    !apiTs.includes('Authentication successful (Preview Mode)'),
    'api.ts must not generate preview-token-* or mock_token_* or authenticate in preview mode'
  );
  assert.ok(
    apiTs.includes("errorCode: 'BACKEND_NOT_CONFIGURED'") &&
    apiTs.includes("message: 'CNE authentication service is not configured. Please contact the system administrator.'"),
    'api.ts must fail closed with BACKEND_NOT_CONFIGURED when VITE_APPS_SCRIPT_URL is missing or unusable'
  );
  assert.ok(
    apiTs.includes("storedToken.startsWith('preview-token-')") &&
    apiTs.includes("storedToken.startsWith('mock_token_')"),
    'api.ts must purge legacy stored sessions whose token starts with preview-token- or mock_token_'
  );
  assert.ok(
    loginModalTs.includes('response.success === true') &&
    loginModalTs.includes('sessionData.token.trim().length > 0') &&
    loginModalTs.includes('sessionData.employeeId.trim().length > 0') &&
    loginModalTs.includes('validRoles.includes(sessionData.role.trim().toUpperCase())'),
    'LoginModal must validate response.success, non-empty server token, employeeId, and recognized role before calling onLoginSuccess'
  );

  // Verify frontend API caching security: explicit public allowlist, no generic action.startsWith('get')
  assert.ok(
    !apiTs.includes("action.startsWith('get')"),
    'api.ts must NOT use generic action.startsWith(\'get\') for browser localStorage caching or offline fallback'
  );
  assert.ok(
    apiTs.includes('function isPublicCacheableAction(action: string): boolean') &&
    apiTs.includes('PUBLIC_CACHEABLE_ACTIONS') &&
    apiTs.includes('NEVER_CACHEABLE_PROTECTED_ACTIONS'),
    'api.ts must define isPublicCacheableAction with explicit PUBLIC_CACHEABLE_ACTIONS allowlist and NEVER_CACHEABLE_PROTECTED_ACTIONS denylist'
  );

  // Extract PUBLIC_CACHEABLE_ACTIONS entries and verify only approved public CMS data can persist
  const allowlistMatch = apiTs.match(/const\s+PUBLIC_CACHEABLE_ACTIONS[\s\S]*?new\s+Set\(\[([\s\S]*?)\]\)/);
  assert.ok(allowlistMatch, 'PUBLIC_CACHEABLE_ACTIONS Set must be defined in api.ts');
  const allowlistedActions = eval(`[${allowlistMatch[1]}]`);
  const approvedPublicCmsActions = [
    'getChairpersonMessage',
    'getCoordinatorDesk',
    'getNewsEvents',
    'getQuickLinks',
    'getGallery'
  ];
  assert.deepStrictEqual(
    allowlistedActions.slice().sort(),
    approvedPublicCmsActions.slice().sort(),
    'Only explicitly approved public CMS actions may be in PUBLIC_CACHEABLE_ACTIONS'
  );

  // Explicit answer-key & protected-read regression assertions
  const protectedExcludedReads = [
    'getCNEQuestions',
    'getPostTestQuestions',
    'getCNEParticipants',
    'getRoles',
    'getAllApplications',
    'getMyApplications',
    'getQRToken',
    'getAiQuota',
    'getCNEActivityProgress',
    'getLearningResource',
    'getReferenceMaterial',
    'getCNERecords'
  ];
  const denylistMatch = apiTs.match(/const\s+NEVER_CACHEABLE_PROTECTED_ACTIONS[\s\S]*?new\s+Set\(\[([\s\S]*?)\]\)/);
  assert.ok(denylistMatch, 'NEVER_CACHEABLE_PROTECTED_ACTIONS Set must be defined in api.ts');
  const denylistedActions = eval(`[${denylistMatch[1]}]`);
  for (const protectedAction of protectedExcludedReads) {
    assert.ok(
      !allowlistedActions.includes(protectedAction),
      `Protected action '${protectedAction}' must NEVER be present in PUBLIC_CACHEABLE_ACTIONS`
    );
    assert.ok(
      denylistedActions.includes(protectedAction),
      `Protected action '${protectedAction}' must be explicitly listed in NEVER_CACHEABLE_PROTECTED_ACTIONS`
    );
  }

  // Answer-key protection: getCNEQuestions can never be written to localStorage or served from offline fallback
  const execActionSection = apiTs.substring(
    apiTs.indexOf('static async executeAction'),
    apiTs.indexOf('static async testConnection')
  );
  assert.ok(
    execActionSection.includes('if (result.success && result.data && isPublicCacheableAction(action))'),
    'executeAction must gate localStorage writes strictly with isPublicCacheableAction(action)'
  );
  const fallbackChecks = execActionSection.match(/if\s*\(\s*isPublicCacheableAction\(action\)\s*\)/g) || [];
  assert.strictEqual(
    fallbackChecks.length,
    2,
    'Both HTTP error and network error offline fallbacks in executeAction must be gated strictly by isPublicCacheableAction(action)'
  );

  // getCachedData enforces the same allowlist
  const getCachedSection = apiTs.substring(
    apiTs.indexOf('static getCachedData'),
    apiTs.indexOf('static async getOfficersDropdown')
  );
  assert.ok(
    getCachedSection.includes('if (!isPublicCacheableAction(action))') &&
    getCachedSection.includes('return null;'),
    'ApiService.getCachedData must enforce isPublicCacheableAction(action) and return null for non-public actions'
  );

  // Logout removes all cne_cache_* entries and session
  const logoutSection = apiTs.substring(
    apiTs.indexOf('static logout()'),
    apiTs.indexOf('static getSessionUser()')
  );
  assert.ok(
    logoutSection.includes("k.startsWith('cne_cache_')") &&
    logoutSection.includes('localStorage.removeItem(k)') &&
    logoutSection.includes('localStorage.removeItem(STORAGE_KEYS.SESSION)'),
    'ApiService.logout() must remove all cne_cache_* keys in addition to STORAGE_KEYS.SESSION'
  );
});

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL SECURITY & ACCESS TESTS PASSED!');
console.log('========================================================\n');
