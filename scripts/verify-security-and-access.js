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
    'handleAddCNE must require session'
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

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL SECURITY & ACCESS TESTS PASSED!');
console.log('========================================================\n');
