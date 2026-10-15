/**
 * CNE Management System - Consolidated Regression Runner
 *
 * Contains the seven authoritative original verification suites in readable
 * embedded source sections. Each suite executes in its own isolated Node.js
 * subprocess, as it did when stored in separate files.
 *
 * Structural/behavioral assertions, test fixtures, and expected failures
 * have not been removed or weakened. A SHA-256 hash verifies each embedded
 * source before execution to detect an incomplete manual paste.
 *
 * Usage:
 *   node scripts/verify-all.js                  # all 7 core suites
 *   node scripts/verify-all.js --suite security  # one named suite
 *   node scripts/verify-timezone-cross-module.cjs # timezone regression
 *
 * Do not place verification code in browser bundles or Apps Script.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, '..');
const SCRIPT_URL = pathToFileURL(join(SCRIPT_DIR, 'verify-all.js')).href;

// Each block below reproduces an original test file verbatim at runtime.
// The source is kept readable, not minified or encoded, so tests can be edited.
const suites = [
  // ===== BEGIN ORIGINAL SUITE: verify-security-and-access.js =====
  {
    id: "security",
    name: "Security & Access Control",
    originalFilename: "verify-security-and-access.js",
    mode: "module",
    expectedChecks: 30,
    sha256: "6a7188cb0826fba87ca5bd7965e6672be1ef3de6fea0ec4f537053fb367c5583",
    source: `/**
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
console.log('========================================================\\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const cneSchedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const appTs = fs.readFileSync('src/App.tsx', 'utf8');
const changePasswordModalTs = fs.readFileSync('src/components/ChangePasswordModal.tsx', 'utf8');
const adminRolesTs = fs.readFileSync('src/components/AdminRoles.tsx', 'utf8');
const cneDetailsTs = fs.readFileSync('src/components/cne/CneDetailsModal.tsx', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Source Synchronization & Backend Wrapper Verification
// -----------------------------------------------------------------------------
runTest('Apps Script source code and TypeScript wrapper synchronization', () => {
  assert.ok(
    backendGs.includes('export const APPS_SCRIPT_SOURCE_CODE = \`'),
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
    codeGs.includes("if (!session) {\\n    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };\\n  }"),
    'handleCreateCNE must require session'
  );
  assert.ok(
    codeGs.includes("if (!session) {\\n    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized session.' };\\n  }"),
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
    'adminResetPassword',
    'getDepartmentalCneOutcomeReport',
    'deleteCNE'
  ];

  for (const ep of adminEndpoints) {
    const casePattern = new RegExp(\`case '\${ep}':[\\\\s\\\\S]*?handleAdminAction\`, 'm');
    assert.ok(casePattern.test(codeGs), \`Endpoint '\${ep}' must be protected by handleAdminAction\`);
  }

  // Obsolete reviewCNE endpoint must remain completely absent
  assert.ok(!codeGs.includes("case 'reviewCNE':"), "Code.gs must not contain obsolete router case 'reviewCNE'");
  assert.ok(!codeGs.includes("function handleReviewCNE"), "Code.gs must not define obsolete function 'handleReviewCNE'");
});

runTest('Secure ADMIN-Only Delete CNE authorization and backend protection', () => {
  // deleteCNE router action exists and is wrapped by handleAdminAction
  assert.ok(
    codeGs.includes("case 'deleteCNE':") &&
      codeGs.includes("handleAdminAction(params, session, handleDeleteCNE, 'DELETE_CNE')"),
    "deleteCNE router action must be wrapped by handleAdminAction"
  );
  // handleDeleteCNE exists
  assert.ok(codeGs.includes('function handleDeleteCNE'), "Code.gs must define handleDeleteCNE");

  const deleteSection = codeGs.substring(
    codeGs.indexOf('function handleDeleteCNE'),
    codeGs.length
  );

  // Fresh ADMIN check under ScriptLock
  assert.ok(deleteSection.includes('lock.waitLock(15000)'), 'handleDeleteCNE must acquire ScriptLock');
  assert.ok(deleteSection.includes('refreshMutationSession(session)'), 'handleDeleteCNE must refresh mutation session under lock');
  assert.ok(deleteSection.includes('var adminErr = requireAdmin(session);'), 'handleDeleteCNE must re-verify Admin role under lock');

  // AREA_INCHARGE, EMPLOYEE cannot delete (enforced by requireAdmin)
  assert.ok(codeGs.includes("function requireAdmin(session)"), "requireAdmin must guard administrative actions");

  // Frontend Delete button is ADMIN-only and does not reuse canManageLifecycle
  assert.ok(cneSchedule.includes("const canDeleteCne = user?.role === 'ADMIN';"), 'Frontend delete permission must be strictly user?.role === ADMIN');
  assert.ok(cneSchedule.includes("canDeleteCne={canDeleteCne}"), 'canDeleteCne must be passed to CneDetailsModal');
  assert.ok(!cneDetailsTs.includes("canLifecycle && !isCompleted && onDelete"), 'CneDetailsModal must not use canLifecycle for deletion');

  // API fails closed without secure backend
  assert.ok(apiTs.includes("case 'deleteCNE':"), 'ApiService must include deleteCNE in fail-closed switch');
  assert.ok(apiTs.includes('static async deleteCNE'), 'ApiService must expose deleteCNE method');
});

runTest('Departmental CNE Outcome page is protected on both backend and frontend', () => {
  assert.ok(
    codeGs.includes("case 'getDepartmentalCneOutcomeReport':") &&
      codeGs.includes("handleAdminAction(params, session, handleGetDepartmentalCneOutcomeReport"),
    'Departmental CNE Outcome backend action must be wrapped by handleAdminAction'
  );
  assert.ok(
    codeGs.includes('function handleGetDepartmentalCneOutcomeReport(params, session)') &&
      codeGs.substring(codeGs.indexOf('function handleGetDepartmentalCneOutcomeReport'), codeGs.indexOf('function handleGetRoles')).includes('requireAdmin(session)'),
    'Departmental CNE Outcome handler must independently require Admin'
  );
  assert.ok(
    appTs.includes("activeView === 'admin-departmental-cne-outcome' && user?.role === 'ADMIN'"),
    'Frontend route must render Departmental CNE Outcome only for Admin'
  );
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
    const rpList = String(rawRp).split(/[,;\\n]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

    // 1. Check if authenticated user is assigned Resource Person for THIS PARTICULAR CNE
    if (loggedInId && rpList.includes(loggedInId)) {
      return null;
    }

    // 2. Check if responsible Area Incharge for internal CNE (CENTRAL or DEPARTMENTAL)
    const type = String(record.cneType || '').trim().toUpperCase();
    if (
      (role === 'AREA_INCHARGE' || role === 'INCHARGE') &&
      (type === 'CENTRAL' || type === 'DEPARTMENTAL' || type === 'DEPT')
    ) {
      const assignedAreas = (session.assignedAreas || (session.assignedArea ? [session.assignedArea] : []))
        .map(a => String(a).trim().toLowerCase());
      const targetArea = String(record.area || '').trim().toLowerCase();
      if (targetArea && assignedAreas.length > 0 && assignedAreas.includes(targetArea)) {
        return null;
      }
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

runTest('Area Incharge operational authorization strictly excludes External CNE types', () => {
  const matchingAreaIncharge = {
    employeeId: 'INC-WARD-A',
    role: 'AREA_INCHARGE',
    assignedAreas: ['ICU-A']
  };

  const adminSession = {
    employeeId: 'ADM-001',
    role: 'ADMIN'
  };

  const centralCne = {
    cneId: 'CNE-CENTRAL-01',
    area: 'ICU-A',
    cneType: 'CENTRAL',
    resourcePersonEmpId: 'RP-900'
  };

  const deptCne = {
    cneId: 'CNE-DEPT-01',
    area: 'ICU-A',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-900'
  };

  const externalOffsiteCne = {
    cneId: 'CNE-EXT-OUT-01',
    area: 'ICU-A',
    cneType: 'EXTERNAL_OFFSITE',
    resourcePersonEmpId: 'RP-900'
  };

  const externalOnsiteCne = {
    cneId: 'CNE-EXT-IN-01',
    area: 'ICU-A',
    cneType: 'EXTERNAL_ONSITE',
    resourcePersonEmpId: 'RP-900'
  };

  // 1. AREA_INCHARGE + assigned matching area + CENTRAL -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(matchingAreaIncharge, centralCne),
    null,
    'Area Incharge with matching area must be authorized for CENTRAL CNE operational actions'
  );

  // 2. AREA_INCHARGE + assigned matching area + DEPARTMENTAL -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(matchingAreaIncharge, deptCne),
    null,
    'Area Incharge with matching area must be authorized for DEPARTMENTAL CNE operational actions'
  );

  // 3. AREA_INCHARGE + assigned matching area + EXTERNAL_OFFSITE -> DENIED
  const resExtOffsite = simulateCheckCNEActionAuthorized(matchingAreaIncharge, externalOffsiteCne);
  assert.ok(
    resExtOffsite !== null && resExtOffsite.errorCode === 'FORBIDDEN',
    'Area Incharge must be DENIED operational authority for EXTERNAL_OFFSITE even with matching area'
  );

  // 4. AREA_INCHARGE + assigned matching area + EXTERNAL_ONSITE -> DENIED
  const resExtOnsite = simulateCheckCNEActionAuthorized(matchingAreaIncharge, externalOnsiteCne);
  assert.ok(
    resExtOnsite !== null && resExtOnsite.errorCode === 'FORBIDDEN',
    'Area Incharge must be DENIED operational authority for EXTERNAL_ONSITE even with matching area'
  );

  // 5. ADMIN + EXTERNAL_OFFSITE -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(adminSession, externalOffsiteCne),
    null,
    'Admin must be authorized for EXTERNAL_OFFSITE'
  );

  // 6. ADMIN + EXTERNAL_ONSITE -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(adminSession, externalOnsiteCne),
    null,
    'Admin must be authorized for EXTERNAL_ONSITE'
  );

  // 7. Assigned Resource Person on External CNE remains authorized
  const assignedRpOnExt = { employeeId: 'RP-900', role: 'EMPLOYEE' };
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(assignedRpOnExt, externalOffsiteCne),
    null,
    'Assigned Resource Person on External CNE must retain operational authority'
  );

  // Backend Code.gs source verification
  assert.ok(
    codeGs.includes("actionCneType === 'CENTRAL' || actionCneType === 'DEPARTMENTAL'"),
    'Code.gs must restrict Area Incharge branch to CENTRAL or DEPARTMENTAL CNE types'
  );

  // Frontend CNESchedule.tsx canOperateCne source verification
  assert.ok(
    cneSchedule.includes("cne.cneType === 'CENTRAL' ||\\n      cne.cneType === 'DEPARTMENTAL'") ||
    cneSchedule.includes("cne.cneType === 'CENTRAL' || cne.cneType === 'DEPARTMENTAL'"),
    'CNESchedule.tsx canOperateCne must require internal CNE type before granting Area Incharge operational access'
  );
});

runTest('Frontend canOperateCne strictly excludes Area Incharge from External CNE operational access', () => {
  function simulateCanOperateCne(user, cne) {
    if (!user || !cne) return false;
    if (user.role === 'ADMIN') return true;
    const isConcernedAreaIncharge = (item) => {
      if (!user || !(user.role === 'AREA_INCHARGE' || user.role === 'INCHARGE')) return false;
      const targetArea = (item.area || '').trim().toLowerCase();
      if (!targetArea) return false;
      const assignedAreas = (user.assignedAreas || (user.assignedArea ? [user.assignedArea] : []))
        .map(a => String(a).trim().toLowerCase());
      return assignedAreas.includes(targetArea);
    };
    const isInternalOperationalType =
      cne.cneType === 'CENTRAL' ||
      cne.cneType === 'DEPARTMENTAL';
    if (isInternalOperationalType && isConcernedAreaIncharge(cne)) return true;
    const userEmpId = String(user.employeeId || '').trim().toUpperCase();
    const rawRp = [cne.resourcePersonEmpId, ...(cne.resourcePersonEmpIds || [])].filter(Boolean).join(',');
    const rpList = rawRp.split(/[,;\\n]+/).map(s => String(s).trim().toUpperCase()).filter(Boolean);
    return rpList.includes(userEmpId);
  }

  const matchingAreaIncharge = {
    employeeId: 'INC-WARD-A',
    role: 'AREA_INCHARGE',
    assignedAreas: ['ICU-A']
  };

  const adminSession = {
    employeeId: 'ADM-001',
    role: 'ADMIN'
  };

  const centralCne = {
    cneId: 'CNE-CENTRAL-01',
    area: 'ICU-A',
    cneType: 'CENTRAL',
    resourcePersonEmpId: 'RP-900'
  };

  const deptCne = {
    cneId: 'CNE-DEPT-01',
    area: 'ICU-A',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-900'
  };

  const extOffsiteCne = {
    cneId: 'CNE-EXT-01',
    area: 'ICU-A',
    cneType: 'EXTERNAL_OFFSITE',
    resourcePersonEmpId: 'RP-900'
  };

  const extOnsiteCne = {
    cneId: 'CNE-EXT-02',
    area: 'ICU-A',
    cneType: 'EXTERNAL_ONSITE',
    resourcePersonEmpId: 'RP-900'
  };

  // 1. AREA_INCHARGE + assigned matching area + CENTRAL -> allowed
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, centralCne), true, 'Area Incharge must be allowed for CENTRAL');

  // 2. AREA_INCHARGE + assigned matching area + DEPARTMENTAL -> allowed
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, deptCne), true, 'Area Incharge must be allowed for DEPARTMENTAL');

  // 3. AREA_INCHARGE + assigned matching area + EXTERNAL_OFFSITE -> DENIED
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, extOffsiteCne), false, 'Area Incharge must be DENIED for EXTERNAL_OFFSITE');

  // 4. AREA_INCHARGE + assigned matching area + EXTERNAL_ONSITE -> DENIED
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, extOnsiteCne), false, 'Area Incharge must be DENIED for EXTERNAL_ONSITE');

  // 5. ADMIN + EXTERNAL_OFFSITE -> allowed
  assert.strictEqual(simulateCanOperateCne(adminSession, extOffsiteCne), true, 'Admin must be allowed for EXTERNAL_OFFSITE');

  // 6. ADMIN + EXTERNAL_ONSITE -> allowed
  assert.strictEqual(simulateCanOperateCne(adminSession, extOnsiteCne), true, 'Admin must be allowed for EXTERNAL_ONSITE');

  // 7. Assigned Resource Person on External CNE remains authorized
  const assignedRpOnExt = { employeeId: 'RP-900', role: 'EMPLOYEE' };
  assert.strictEqual(simulateCanOperateCne(assignedRpOnExt, extOffsiteCne), true, 'Assigned RP must be allowed on External Offsite');
  assert.strictEqual(simulateCanOperateCne(assignedRpOnExt, extOnsiteCne), true, 'Assigned RP must be allowed on External Onsite');

  // 8. Ordinary employee not assigned -> DENIED
  const ordinaryEmp = { employeeId: 'EMP-999', role: 'EMPLOYEE' };
  assert.strictEqual(simulateCanOperateCne(ordinaryEmp, extOffsiteCne), false, 'Ordinary employee must be DENIED on External Offsite');
  assert.strictEqual(simulateCanOperateCne(ordinaryEmp, extOnsiteCne), false, 'Ordinary employee must be DENIED on External Onsite');
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
    codeGs.indexOf('/**\\n * 1. Reusable ADMIN Authorization Helper')
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
    loginSection.includes('findOfficerByIdTargeted_(employeeId)') && loginSection.includes('Officers data'),
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
  const tokenGenIndex = loginSection.indexOf('generateSessionToken(employeeId, record)');
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

runTest('Authentication hot paths use targeted single-row lookups and reuse the login credential record', () => {
  const targetedOfficerSection = codeGs.substring(
    codeGs.indexOf('function findOfficerByIdTargeted_('),
    codeGs.indexOf('/** Execution employee-directory cache')
  );
  const freshOfficerSection = codeGs.substring(
    codeGs.indexOf('function findOfficerByIdFresh_('),
    codeGs.indexOf('/**\\n * Cache Limits & Chunking Constants')
  );
  const credentialSection = codeGs.substring(
    codeGs.indexOf('function getAuthCredentialRecord('),
    codeGs.indexOf('function getUserCredentialSecurityState(')
  );
  const tokenSection = codeGs.substring(
    codeGs.indexOf('function generateSessionToken('),
    codeGs.indexOf('function timingSafeEqual(')
  );
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    codeGs.includes('function findExactEmployeeRow_(') &&
    codeGs.includes('.createTextFinder(cleanId)') &&
    codeGs.includes('.matchEntireCell(true)'),
    'Targeted employee lookup must use exact TextFinder lookup with a one-column fallback'
  );
  assert.ok(
    targetedOfficerSection.includes('getRange(rowIndex, 1, 1, 12)') &&
    !targetedOfficerSection.includes('getRange(1,1,lastRow,12)'),
    'Authentication officer lookup must read only the matching A:L row, not the full roster'
  );
  assert.ok(
    freshOfficerSection.includes('return findOfficerByIdTargeted_(employeeId, true);'),
    'Fresh session/mutation officer revalidation must use the targeted lookup'
  );
  assert.ok(
    credentialSection.includes('findExactEmployeeRow_(sheet, 1, cleanId, 2)') &&
    credentialSection.includes('getRange(rowIndex, 1, 1, 12)') &&
    !credentialSection.includes('getRange(2, 1, lastRow - 1, 12)'),
    'Auth_Credentials lookup must read only the matching credential row'
  );
  assert.ok(
    tokenSection.includes('credentialRecord') &&
    loginSection.includes('generateSessionToken(employeeId, record)'),
    'Successful login must reuse the already-fresh credential record when issuing the session token'
  );
});


runTest('Authenticated request path avoids duplicate credential reads while mutations still revalidate fresh', () => {
  const requestSection = codeGs.substring(
    codeGs.indexOf('function handleRequest('),
    codeGs.indexOf('/**\\n * Administrative Dispatch Wrapper')
  );
  const refreshSection = codeGs.substring(
    codeGs.indexOf('function refreshMutationSession('),
    codeGs.indexOf('function requireFreshAdminMutation(')
  );
  assert.ok(
    !requestSection.includes('getUserCredentialSecurityState(session.employeeId)') &&
    requestSection.includes('verifySession(params.token, params.loggedInEmployeeId)'),
    'handleRequest must rely on the already-authoritative verifySession result instead of rereading Auth_Credentials'
  );
  assert.ok(
    refreshSection.includes('getAuthCredentialRecord(employeeId, true)') &&
    refreshSection.includes('getUserRoleInfo(employeeId, true)'),
    'Protected mutations must retain fresh credential and role revalidation under the mutation flow'
  );
});

runTest('Fresh role resolution is targeted and request-local spreadsheet handles are reused', () => {
  const roleSection = codeGs.substring(
    codeGs.indexOf('function getUserRoleInfo('),
    codeGs.indexOf('function invalidateUserRoleCache(')
  );
  const spreadsheetSection = codeGs.substring(
    codeGs.indexOf('function getSpreadsheet('),
    codeGs.indexOf('function getCNESpreadsheet(')
  );
  assert.ok(
    roleSection.includes('findExactEmployeeRow_(roleMeta.sheet, roleMeta.empIdCol + 1, normId, 2)') &&
    roleSection.includes('getRange(roleRowIndex, 1, 1, width).getValues()[0]') &&
    !roleSection.includes('roleSheet.getDataRange().getValues()'),
    'Authoritative role checks must locate only the requested employee row instead of scanning the complete Role sheet'
  );
  assert.ok(
    spreadsheetSection.includes('_executionSpreadsheetCache[cacheKey]') &&
    spreadsheetSection.includes('return _executionSpreadsheetCache[cacheKey]'),
    'Spreadsheet handles must be reused within the same Apps Script request execution'
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
    requestSection.includes('var email = String(officer.email || \\'\\').trim().toLowerCase()'),
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
    !requestSection.includes('otpSheet.appendRow([\\n    challengeId, OTP_PURPOSE_PASSWORD, \\'INTERNAL\\', employeeId, email, otp,'),
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
    verifyOtpSection.includes('/^\\\\d{6}$/.test(otp)') &&
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
    codeGs.indexOf('/**\\n * Legacy reset endpoint intentionally disabled.')
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
    'api.ts must NOT use generic action.startsWith(\\'get\\') for localStorage caching/offline fallback'
  );
  assert.ok(
    apiTs.includes('function isPublicCacheableAction(action: string): boolean') &&
    apiTs.includes('PUBLIC_CACHEABLE_ACTIONS') &&
    apiTs.includes('NEVER_CACHEABLE_PROTECTED_ACTIONS'),
    'api.ts must use an explicit public-cache allowlist and protected-action denylist'
  );

  const allowlistMatch = apiTs.match(/const\\s+PUBLIC_CACHEABLE_ACTIONS[\\s\\S]*?new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)/);
  assert.ok(allowlistMatch, 'PUBLIC_CACHEABLE_ACTIONS Set must be defined in api.ts');
  const allowlistedActions = eval(\`[\${allowlistMatch[1]}]\`);
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
  const denylistMatch = apiTs.match(/const\\s+NEVER_CACHEABLE_PROTECTED_ACTIONS[\\s\\S]*?new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)/);
  assert.ok(denylistMatch, 'NEVER_CACHEABLE_PROTECTED_ACTIONS Set must be defined in api.ts');
  const denylistedActions = eval(\`[\${denylistMatch[1]}]\`);
  for (const protectedAction of protectedExcludedReads) {
    assert.ok(!allowlistedActions.includes(protectedAction), \`Protected action '\${protectedAction}' must not be publicly cacheable\`);
    assert.ok(denylistedActions.includes(protectedAction), \`Protected action '\${protectedAction}' must be explicitly never-cacheable\`);
  }

  const execActionSection = apiTs.substring(
    apiTs.indexOf('static async executeAction'),
    apiTs.indexOf('static async login')
  );
  assert.ok(
    execActionSection.includes('if (result.success && result.data && isPublicCacheableAction(action))'),
    'executeAction must gate localStorage writes with isPublicCacheableAction(action)'
  );
  const fallbackChecks = execActionSection.match(/if\\s*\\(\\s*isPublicCacheableAction\\(action\\)\\s*\\)/g) || [];
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

  const compactOfficerDirectorySection = officersDropdownSection.replace(/\\s+/g, '');
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
    !loadDataSlice.includes('if (user) {\\n        loadOfficersSingleFlight()'),
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

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL SECURITY & ACCESS TESTS PASSED!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-security-and-access.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-cne-workflows.js =====
  {
    id: "workflows",
    name: "CNE Workflows & Schemas",
    originalFilename: "verify-cne-workflows.js",
    mode: "module",
    expectedChecks: 75,
    sha256: "d49570ff2f2a53fff67ee35e636376c37a8e0e7f1ac4fdedc9fce9f1abffe541",
    source: `/**
 * CNE Business Workflows & Schema Verification Suite
 *
 * Verifies:
 * - Central CNE creation, date/time, duration, resource persons, Scheduled status, Admin authorization
 * - Departmental CNE scheduling, area/ward assignment, Area Incharge restrictions, proper CNE ID/type
 * - Unscheduled CNE historical recording, past date allowances, participants, immediate Completed status
 * - Authoritative CNE Schedule lifecycle: Scheduled -> Completed (Finalize) or Scheduled -> Canceled (Cancel)
 * - Single source of truth: Finalize updates CNE Schedule row (no duplicate Data/Data Master records)
 * - Participant management: manual participants, post-test participants, staff count, external participants
 * - CNE Schedule active schema headers and verification that legacy separate 'Time' column is NOT recreated
 */

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('CNE Workflows & Schema Verification');
console.log('========================================================\\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
const cneScheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const unscheduledModalTs = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');
const outcomePageTs = fs.readFileSync('src/components/AdminDepartmentalCneOutcome.tsx', 'utf8');
const deleteModalTs = fs.readFileSync('src/components/cne/DeleteCneModal.tsx', 'utf8');
const cneDetailsModalTs = fs.readFileSync('src/components/cne/CneDetailsModal.tsx', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Central CNE Workflow & Authorization
// -----------------------------------------------------------------------------
runTest('Central CNE creation requires Admin authority and enforces Scheduled status', () => {
  // Enforces admin role for Central CNE
  assert.ok(
    codeGs.includes("cneType === 'CENTRAL' && !isAdmin"),
    'Code.gs must enforce that Central CNE creation requires Admin role'
  );
  assert.ok(
    codeGs.includes('Only Administrators can create Central CNE programs'),
    'Code.gs must return descriptive error for non-admin attempting Central CNE'
  );

  // Status defaults to Scheduled for new Central CNE
  assert.ok(
    codeGs.includes("var status = isUnscheduled ? 'Completed' : normalizeCNEStatus(params.status || 'Scheduled');"),
    'Scheduled CNE must initialize with Scheduled status'
  );
});

runTest('Central CNE enforces full From/To Date & Time and Duration computation', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Date parsing with time support
  assert.ok(
    handleAddSection.includes('var dFrom = parseCneStartTimestamp_(fromDate);') &&
    handleAddSection.includes('var dTo = parseCneStartTimestamp_(toDate);') &&
    handleAddSection.includes('!isFinite(dFrom) || !isFinite(dTo)'),
    'handleCreateCNE must strictly validate fromDate and toDate with India-time-aware parsing'
  );
  assert.ok(
    handleAddSection.includes('Invalid Date & Time format.'),
    'handleCreateCNE must validate Date & Time format'
  );

  // Chronological order verification
  assert.ok(
    handleAddSection.includes('To Date & Time must be equal to or later than From Date & Time.'),
    'handleCreateCNE must validate that toDate is equal to or later than fromDate'
  );

  // Duration validation
  assert.ok(
    handleAddSection.includes('validateCneDuration(duration, fromDate, toDate)'),
    'handleCreateCNE must validate duration against fromDate and toDate'
  );

  // Persisting duration into CNE Schedule
  assert.ok(
    handleAddSection.includes("setCell('duration', 5, sanitizeCellInput(duration)"),
    'Duration must be stored in duration column of CNE Schedule'
  );
  assert.ok(
    handleAddSection.includes("setCell('fromdate', 3, fromDate)") &&
    handleAddSection.includes("setCell('todate', 4, toDate)"),
    'From Date and To Date must be stored in CNE Schedule'
  );
});

runTest('Central CNE stores Resource Persons cleanly', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  assert.ok(
    handleAddSection.includes("setCell('resourcepersonempid', 7, rpClean.join(', '))"),
    'Resource Person employee ID must be stored in CNE Schedule'
  );
  assert.ok(
    handleAddSection.includes("setCell('externalresourcepersons', 13, extRpClean.join(', '))"),
    'External resource persons must be stored in CNE Schedule'
  );
});

// -----------------------------------------------------------------------------
// 2. Departmental CNE Workflow & Isolation
// -----------------------------------------------------------------------------
runTest('Departmental CNE enforces Area/Ward assignment and Incharge scoping', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Area/ward check
  assert.ok(
    handleAddSection.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
    'handleCreateCNE must validate area authorization via checkCNEAuthorized'
  );

  // Area storage in CNE Schedule
  assert.ok(
    handleAddSection.includes("setCell('area', 2, area)"),
    'Ward Name / Area must be written to CNE Schedule area column'
  );

  // Departmental CNE category stored
  assert.ok(
    handleAddSection.includes("setCell('typeofcne', 12, cneType)"),
    'Type of CNE must be written to CNE Schedule column 12'
  );
});

runTest('Departmental CNE supports batch scheduling for multiple wards/schedules', () => {
  assert.ok(
    codeGs.includes("case 'createDepartmentalBatch':") || codeGs.includes("createCNE"),
    'Code.gs must support Departmental CNE scheduling'
  );
  assert.ok(
    cneScheduleTs.includes('DepartmentalScheduleModal') || cneScheduleTs.includes('selectedDepartmentalArea'),
    'CNESchedule must support Departmental scheduling modal or workflow'
  );
});

// -----------------------------------------------------------------------------
// 3. Unscheduled CNE Workflow
// -----------------------------------------------------------------------------
runTest('Unscheduled CNE records historical activity with U- prefix and Completed status', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  assert.ok(
    handleAddSection.includes("var isUnscheduled = Boolean("),
    'handleCreateCNE must calculate isUnscheduled flag'
  );
  assert.ok(
    handleAddSection.includes("(isUnscheduled ? 'U-' : '')"),
    'CNE ID must include U- prefix for Unscheduled CNE'
  );
  assert.ok(
    handleAddSection.includes("var status = isUnscheduled ? 'Completed' : normalizeCNEStatus(params.status || 'Scheduled');"),
    'Unscheduled CNE status must be Completed immediately'
  );
  assert.ok(
    handleAddSection.includes("if (isUnscheduled) {\\n      setCell('finalizedat', 21, new Date().toISOString());\\n      setCell('finalizedby', 22, session.employeeId || '');\\n    }"),
    'Unscheduled CNE must set finalizedat and finalizedby upon creation'
  );
});

runTest('Unscheduled CNE explicitly permits past dates', () => {
  const checkFromPastIdx = codeGs.indexOf("if (!isUnscheduled) {");
  assert.ok(checkFromPastIdx !== -1, 'Code.gs must guard past date validation behind !isUnscheduled');
  const nextPastError = codeGs.indexOf('Past dates are not allowed', checkFromPastIdx);
  assert.ok(
    nextPastError !== -1 && nextPastError - checkFromPastIdx < 400,
    'Past date validation must strictly apply only to scheduled CNE'
  );
});

runTest('Unscheduled CNE frontend modal and API routing are properly integrated', () => {
  // Routing
  assert.ok(codeGs.includes("case 'addUnscheduledCNE':"), "Code.gs must route addUnscheduledCNE");
  assert.ok(apiTs.includes('static async addUnscheduledCNE('), 'ApiService must provide addUnscheduledCNE');
  assert.ok(
    apiTs.includes("isUnscheduled: true, status: 'Completed'"),
    'addUnscheduledCNE must pass isUnscheduled: true and status: Completed'
  );

  // Frontend Modal
  assert.ok(unscheduledModalTs.includes('id="btn-submit-unscheduled-cne"'), 'Modal must have submit button');
  assert.ok(unscheduledModalTs.includes('Past dates are fully valid'), 'Modal must instruct that past dates are valid');
  assert.ok(cneScheduleTs.includes('id="btn-choice-unscheduled-cne"'), 'Admin choice menu must offer Unscheduled CNE');
});

// -----------------------------------------------------------------------------
// 4. Authoritative Lifecycle & Finalization Table Integrity
// -----------------------------------------------------------------------------
runTest('CNE Schedule is the sole authoritative lifecycle table (Scheduled -> Completed / Canceled)', () => {
  // Finalize handler modifies existing row in CNE Schedule
  const finalizeSection = codeGs.substring(
    codeGs.indexOf('function handleFinalizeCNE'),
    codeGs.indexOf('function handleCancelCNE')
  );

  assert.ok(
    finalizeSection.includes("ss.getSheetByName('CNE Schedule')"),
    'Finalize must operate on CNE Schedule sheet'
  );
  assert.ok(
    finalizeSection.includes(".setValue('Completed')"),
    'Finalize must update status column of existing CNE Schedule row to Completed'
  );
  // Must NOT create duplicate record in obsolete 'Data' or 'Data Master' sheets
  assert.ok(
    !finalizeSection.includes("'Data'") && !finalizeSection.includes("'Data Master'"),
    'Finalize must update the same CNE Schedule record without creating separate Data/Data Master records'
  );

  // Cancel handler modifies existing row in CNE Schedule
  const cancelSection = codeGs.substring(
    codeGs.indexOf('function handleCancelCNE'),
    codeGs.length
  );
  assert.ok(
    cancelSection.includes("ss.getSheetByName('CNE Schedule')"),
    'Cancel must operate on CNE Schedule sheet'
  );
  assert.ok(
    cancelSection.includes(".setValue('Canceled')"),
    'Cancel must update status column of existing CNE Schedule row to Canceled'
  );
});

// -----------------------------------------------------------------------------
// 5. Participants Management & Staff Count
// -----------------------------------------------------------------------------
runTest('Participant roster, staff counts, and post-test participants are recorded', () => {
  // Staff IDs, count, and external participants in handleCreateCNE
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );
  assert.ok(
    handleAddSection.includes("setCell('staffempid', 16, staffString);"),
    'Staff employee IDs stored in CNE Schedule column 16'
  );
  assert.ok(
    handleAddSection.includes("setCell('staffcount', 17, totalStaffCount);"),
    'Staff count computed and stored in CNE Schedule column 17'
  );
  assert.ok(
    handleAddSection.includes("setCell('externalstaffparticipants', 18, extStaffClean.join(', '));"),
    'External participants stored in CNE Schedule column 18'
  );

  // Manual participant additions write to participant responses sheet via canonical plural action/handler
  const singularActionCheck = ['addManual', 'Participant'].join('');
  const singularHandlerCheck = ['handleAddManual', 'Participant'].join('');
  assert.ok(
    apiTs.includes("executeAction<{ count?: number; addedCount?: number }>('addManualParticipants', params)"),
    'ApiService.addManualParticipants must invoke canonical plural action addManualParticipants'
  );
  assert.ok(
    codeGs.includes("case 'addManualParticipants':") &&
    codeGs.includes('output = handleAddManualParticipants(params, session);'),
    'Code.gs router must route canonical plural action addManualParticipants to handleAddManualParticipants'
  );
  assert.ok(
    !codeGs.includes(\`case '\${singularActionCheck}':\`) &&
    !codeGs.includes(\`function \${singularHandlerCheck}(\`) &&
    !apiTs.includes(\`'\${singularActionCheck}'\`),
    'Singular manual participant action and handler must be completely absent'
  );

  const manualPartSection = codeGs.substring(
    codeGs.indexOf('function handleAddManualParticipants'),
    codeGs.indexOf('function handleGetCNEParticipants')
  );
  assert.ok(
    manualPartSection.includes('getResponsesSheet') && manualPartSection.includes("'MANUAL'"),
    'handleAddManualParticipants must record participant in responses sheet with MANUAL source'
  );

  // Post test submissions write participant record, update responses sheet, and enforce >= 60% pass threshold
  const submitPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipants')
  );
  assert.ok(
    submitPostTestSection.includes('getResponsesSheet()') && submitPostTestSection.includes('ALREADY_SUBMITTED'),
    'handleSubmitPostTest must record in responses sheet and prevent duplicate submissions'
  );
  assert.ok(
    submitPostTestSection.includes('var passed = percentage >= 60;') ||
      (submitPostTestSection.includes('scorePostTestAnswers_') &&
        codeGs.includes('var passed = percentage >= 60;') &&
        codeGs.includes("status: passed ? 'PASSED' : 'NEEDS_IMPROVEMENT'")),
    'Post-Test scoring must enforce percentage >= 60 as PASSED threshold, directly or through the scoring helper'
  );
});

// -----------------------------------------------------------------------------
// 6. Departmental CNE Coverage Snapshot & Outcome Metrics
// -----------------------------------------------------------------------------
runTest('Departmental CNE coverage schema uses six dedicated columns without repurposing Staff Count', () => {
  const requiredCoverageHeaders = [
    'Coverage Areas Snapshot',
    'Total Allotted Staff',
    'Internal Attendance Count',
    'Attendance Percentage',
    'Post-Test Outcome Percentage',
    'Coverage Finalized At'
  ];
  for (const header of requiredCoverageHeaders) {
    assert.ok(codeGs.includes(\`'\${header}'\`), \`Code.gs must define \${header}\`);
  }
  assert.ok(codeGs.includes("setCell('staffcount', 17, totalStaffCount);"), 'Existing Staff Count semantics must remain intact');
  assert.ok(codeGs.includes("setCell('totalallottedstaff', 24"), 'Total Allotted Staff must use its own dedicated column');
});

runTest('Staff-count master lookup is exact, cached, and treats missing/invalid values as zero', () => {
  const section = codeGs.substring(
    codeGs.indexOf('function normalizeAreaMatchingKey_'),
    codeGs.indexOf('function ensureCneScheduleCoverageHeaders_')
  );
  assert.ok(section.includes("getSheetByName('CNE staff count')"), 'Must read CNE staff count tab');
  assert.ok(section.includes("getProperty('CNE_STAFF_COUNT_SPREADSHEET_ID')"), 'Separate spreadsheet must be configurable through Script Properties');
  assert.ok(section.includes("replace(/\\\\s+/g, ' ').toLowerCase()"), 'Area matching must normalize whitespace/case only');
  assert.ok(section.includes('var num = 0;'), 'Invalid or blank staff total must default to zero');
  assert.ok(section.includes('return 0;'), 'Missing Area lookup must return zero');
  assert.ok(section.includes("CacheService.getScriptCache().put(cacheKey, JSON.stringify(map), 60)"), 'Staff-count master must use a short cache');
});

runTest('Departmental scheduling snapshots Area Incharge active areas and Admin selected area', () => {
  const helper = codeGs.substring(
    codeGs.indexOf('function buildDepartmentalCoverageSnapshot_'),
    codeGs.indexOf('function ensureCneScheduleCoverageHeaders_')
  );
  assert.ok(helper.includes("if (role === 'ADMIN')"), 'Coverage helper must have explicit Admin branch');
  assert.ok(helper.includes('getStaffCountForArea_(selected, resolvedStaffMap)'), 'Admin denominator must use only selected Area');
  assert.ok(helper.includes("statusMap[statusKey] !== 'ACTIVE'"), 'Area Incharge snapshot must exclude inactive assigned Areas');
  assert.ok(helper.includes("activeAssigned.join(', ')"), 'Active assigned Areas must be persisted as the coverage snapshot');
  assert.ok(helper.includes('total += getStaffCountForArea_(areaName, resolvedStaffMap)'), 'Area Incharge denominator must sum active assigned Area totals');

  const createSection = codeGs.substring(codeGs.indexOf('function handleCreateCNE'), codeGs.indexOf('function handleUpdateCNE'));
  assert.ok(createSection.includes("cneType === 'DEPARTMENTAL' && !isUnscheduled"), 'Coverage snapshot must apply only to normally scheduled Departmental CNEs');
  assert.ok(createSection.includes("setCell('coverageareassnapshot'"), 'Scheduling must save Coverage Areas Snapshot');
  assert.ok(createSection.includes("setCell('totalallottedstaff'"), 'Scheduling must save Total Allotted Staff');
});

runTest('Departmental coverage metrics are calculated only in finalization, not attendance submission paths', () => {
  const finalize = codeGs.substring(codeGs.indexOf('function handleFinalizeCNE'), codeGs.indexOf('function handleCancelCNE'));
  assert.ok(finalize.includes("var isDeptFinalize = (liveFinalizeType === 'DEPARTMENTAL');"), 'Finalization must scope coverage calculation to Departmental CNEs');
  assert.ok(finalize.includes("var isUnscheduledFinalize = (cneId.indexOf('-U-') !== -1);"), 'Unscheduled Departmental CNEs must be excluded');
  assert.ok(finalize.includes("setValue(attPercentage !== null ? attPercentage : '')"), 'Attendance Percentage must be persisted during finalization');
  assert.ok(finalize.includes("setValue(postTestOutcome !== null ? postTestOutcome : '')"), 'Post-Test Outcome must be persisted during finalization');

  const manual = codeGs.substring(codeGs.indexOf('function handleAddManualParticipants'), codeGs.indexOf('function handleGetCNEParticipants'));
  const submit = codeGs.substring(codeGs.indexOf('function handleSubmitPostTest'), codeGs.indexOf('function handleAddManualParticipants'));
  assert.ok(!manual.includes("colMap['attendancepercentage']"), 'Manual attendance must not calculate attendance percentage');
  assert.ok(!submit.includes("colMap['attendancepercentage']"), 'Post-Test submission must not calculate attendance percentage');
});

runTest('Finalization deduplicates internal attendance, excludes external attendees, and handles zero denominator safely', () => {
  const finalize = codeGs.substring(codeGs.indexOf('function handleFinalizeCNE'), codeGs.indexOf('function handleCancelCNE'));
  assert.ok(finalize.includes("var key = rawEmp ? ('ID:' + rawEmp) : ('NAME:' + pName.toLowerCase());"), 'Finalization must deduplicate by participant identity');
  assert.ok(finalize.includes('!isExternalParticipantId(item.empId)'), 'Internal attendance must exclude external participant IDs');
  assert.ok(finalize.includes('var internalAttendanceCount = internalEmpIds.length;'), 'Internal Attendance Count must use unique internal employee IDs');
  assert.ok(finalize.includes('savedAllottedStaff !== null && savedAllottedStaff > 0'), 'Attendance percentage must only divide when denominator is positive');
  assert.ok(finalize.includes('var attPercentage = null;'), 'Zero denominator must preserve null percentage');
  assert.ok(finalize.includes('postTestScores.length > 0'), 'Outcome must be null when there are no valid Post-Test scores');
});

runTest('Departmental CNE Outcome report is Area-master driven and uses stored finalized metrics', () => {
  const report = codeGs.substring(codeGs.indexOf('function handleGetDepartmentalCneOutcomeReport'), codeGs.indexOf('function handleGetRoles'));
  assert.ok(report.includes('var adminError = requireAdmin(session);'), 'Report backend must be Admin-only');
  assert.ok(report.includes("if (cneType !== 'DEPARTMENTAL') continue;"), 'Report must include only Departmental CNEs');
  assert.ok(report.includes("if (cneId.indexOf('-U-') !== -1) continue;"), 'Report must exclude unscheduled/retrospective records');
  assert.ok(report.includes('for (var a = 0; a < activeAreas.length; a++)'), 'Every active Area must drive report output');
  assert.ok(report.includes('if (areaCnes.length === 0)'), 'Active Areas with no CNE must receive an empty placeholder row');
  assert.ok(report.includes("if (cneStatus === 'Canceled' || cneStatus === 'Cancelled')"), 'Remarks must be cancellation-only');
  assert.ok(report.includes('totalAllottedStaff: totalAllotted'), 'Report must read saved Total Allotted Staff');
  assert.ok(report.includes('attendancePercentage: attendancePct'), 'Report must read stored Attendance Percentage');
});

runTest('Departmental CNE Outcome UI has required table, filters, print header, and no Employee ID in Created By', () => {
  for (const heading of ['S.No', 'Area / Ward', 'CNE Topic', 'Status', 'Remarks', 'Created By', 'Total Allotted Staff', 'Attendance', 'Outcome']) {
    assert.ok(outcomePageTs.includes(heading), \`Outcome page must contain \${heading}\`);
  }
  assert.ok(outcomePageTs.includes('SearchInput'), 'Outcome page must reuse the CNE Schedule search control');
  assert.ok(outcomePageTs.includes('ConfirmDatePicker'), 'Outcome page must reuse the CNE Schedule date control');
  assert.ok(outcomePageTs.includes('ALL INDIA INSTITUTE OF MEDICAL SCIENCES, RISHIKESH'), 'Print header must contain institution name');
  assert.ok(outcomePageTs.includes('Departmental CNE Coverage & Outcome Report'), 'Print header must contain exact report title');
  assert.ok(outcomePageTs.includes('Period: {printPeriodText}'), 'Print header must show selected period');
  assert.ok(outcomePageTs.includes('window.print()'), 'Print action must print current rendered filtered report');
  assert.ok(!outcomePageTs.includes('row.employeeId'), 'Created By table must not expose Employee ID');
});

// -----------------------------------------------------------------------------
// 7. CNE Schedule Active Schema & Schema Invariance
// -----------------------------------------------------------------------------
runTest('CNE Schedule sheet schema contains required active headers', () => {
  const match = codeGs.match(/'CNE Schedule':\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(match, 'CNE Schedule headers definition must exist in Code.gs');

  const headers = eval(\`[\${match[1]}]\`);
  const requiredHeaders = [
    'CNE ID',
    'Topic',
    'Ward Name / Area',
    'From Date',
    'To Date',
    'Duration',
    'Resource Person Emp Id',
    'Mode of Teaching',
    'Description',
    'Max Participants',
    'Status',
    'Type of CNE',
    'External Resource Persons',
    'Staff Emp ID',
    'Staff Count',
    'External Staff Participants',
    'Proposed By',
    'Admin Remarks',
    'Remarks',
    'CreatedAt',
    'CreatedBy',
    'Coverage Areas Snapshot',
    'Total Allotted Staff',
    'Internal Attendance Count',
    'Attendance Percentage',
    'Post-Test Outcome Percentage',
    'Coverage Finalized At'
  ];

  for (const req of requiredHeaders) {
    assert.ok(
      headers.includes(req),
      \`CNE Schedule schema must contain required header '\${req}'\`
    );
  }
});

runTest("Separate legacy 'Time' column is NOT recreated in CNE Schedule schema", () => {
  const match = codeGs.match(/'CNE Schedule':\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(match, 'CNE Schedule headers definition must exist in Code.gs');
  const headers = eval(\`[\${match[1]}]\`);

  // Ensure 'Time' is NOT in active CNE Schedule headers
  assert.ok(
    !headers.includes('Time'),
    "Active CNE Schedule headers must NOT contain obsolete separate 'Time' column"
  );

  // Ensure headerAliases maps time to From Date / To Date or handles safely without recreating 'Time'
  assert.ok(
    !headers.some(h => h.trim().toLowerCase() === 'time'),
    "No column named 'time' may exist in CNE Schedule headers"
  );
});

// -----------------------------------------------------------------------------
// 7. Obsolete CNE Applications Subsystem & Schema Removal
// -----------------------------------------------------------------------------
runTest('CNE Applications is absent from active schema, Verify / Initialize, and migrations', () => {
  // 1. CNE Applications absent from CNE_SHEET_HEADERS
  assert.ok(
    !codeGs.includes("'CNE Applications':"),
    'CNE Applications must be completely absent from CNE_SHEET_HEADERS'
  );

  // 2. CNE Applications absent from tabNames in setupAndVerifyCNESheets
  const setupSection = codeGs.substring(
    codeGs.indexOf('function setupAndVerifyCNESheets'),
    codeGs.indexOf('function getOrCreateSheet')
  );
  assert.ok(
    !setupSection.includes("'CNE Applications'"),
    'CNE Applications must be absent from setupAndVerifyCNESheets tabNames, initialization, and validation'
  );

  // 3. migrateCNEApplicationsHeaderToCNEId function absent
  assert.ok(
    !codeGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    'migrateCNEApplicationsHeaderToCNEId must be completely absent from Code.gs'
  );
  assert.ok(
    !backendGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    'migrateCNEApplicationsHeaderToCNEId must be completely absent from src/backend/googleAppsScript.ts'
  );

  // 4. Verify / Initialize does not contain automatic deleteSheet calls
  assert.ok(
    !setupSection.includes('deleteSheet'),
    'setupAndVerifyCNESheets must NOT contain automatic deleteSheet logic'
  );
});

// -----------------------------------------------------------------------------
// 8. Ward / Area Active–Inactive Backend Enforcement
// -----------------------------------------------------------------------------
runTest('Authoritative area-status helpers exist with normalized uppercase lookup', () => {
  assert.ok(codeGs.includes('function getAreaStatusMap_(forceFresh)'), 'getAreaStatusMap_ must exist in Code.gs');
  assert.ok(codeGs.includes('function isAreaActive_(areaName, forceFresh)'), 'isAreaActive_ must exist in Code.gs');
  assert.ok(codeGs.includes('function requireActiveArea_(areaName, forceFresh)'), 'requireActiveArea_ must exist in Code.gs');
  assert.ok(codeGs.includes("errorCode: 'AREA_INACTIVE'"), 'Standard AREA_INACTIVE error code must be used');
  assert.ok(codeGs.includes("map[normName] = (areas[i].status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE'"), 'Map must normalize ACTIVE / INACTIVE');
  assert.ok(codeGs.includes("toUpperCase()"), 'Helpers must normalize area names using toUpperCase()');
});

runTest('handleCreateCNE rejects inactive area with standard AREA_INACTIVE error code both pre-lock and post-lock', () => {
  const createFunc = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE('),
    codeGs.indexOf('function handleUpdateCNE(')
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, false)'),
    'handleCreateCNE must check requireActiveArea_ pre-lock'
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, true)'),
    'handleCreateCNE must check requireActiveArea_ post-lock with forceFresh=true'
  );
});

runTest('Departmental CNE creation rejects inactive area in batch scheduling pre-lock and post-lock with AREA_INACTIVE', () => {
  const deptFunc = codeGs.substring(
    codeGs.indexOf('function handleAddDepartmentalSchedule('),
    codeGs.indexOf('function handleGetRoles(')
  );
  assert.ok(
    deptFunc.includes('requireActiveArea_(area, false)'),
    'handleAddDepartmentalSchedule must check active area pre-lock'
  );
  assert.ok(
    deptFunc.includes('getAreaStatusMap_(true)'),
    'handleAddDepartmentalSchedule must obtain authoritative status map inside lock'
  );
  assert.ok(
    deptFunc.includes("liveAreaStatusMap[normLiveArea] !== 'ACTIVE'"),
    'handleAddDepartmentalSchedule must verify each row is ACTIVE inside lock'
  );
  assert.ok(
    deptFunc.includes("errorCode: 'AREA_INACTIVE'"),
    'handleAddDepartmentalSchedule must return AREA_INACTIVE on inactive area'
  );
});

runTest('Unscheduled CNE creation is covered and rejects inactive area via shared handleCreateCNE', () => {
  assert.ok(
    codeGs.includes("case 'addUnscheduledCNE':"),
    'addUnscheduledCNE action must route to handleCreateCNE'
  );
  assert.ok(
    codeGs.includes("params.action === 'addUnscheduledCNE'"),
    'handleCreateCNE must recognize addUnscheduledCNE action'
  );
  const createFunc = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE('),
    codeGs.indexOf('function handleUpdateCNE(')
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, true)'),
    'Unscheduled CNE path must be guarded by authoritative requireActiveArea_'
  );
});

runTest('handleUpdateCNE checks active status only when target area changes and rejects with AREA_INACTIVE', () => {
  const updateFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE('),
    codeGs.indexOf('function handleFinalizeCNE(')
  );
  assert.ok(
    updateFunc.includes('preNewArea && preNewArea !== preOldArea'),
    'handleUpdateCNE must compare proposed area with old area pre-lock'
  );
  assert.ok(
    updateFunc.includes('liveNewArea && liveNewArea !== liveOldArea'),
    'handleUpdateCNE must compare proposed area with live old area post-lock'
  );
  assert.ok(
    updateFunc.includes('requireActiveArea_(params.area, true)'),
    'handleUpdateCNE must require active area when target area changed'
  );
});

runTest('handleUpdateCNE permits editing other fields of an existing CNE when its current area is inactive', () => {
  const updateFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE('),
    codeGs.indexOf('function handleFinalizeCNE(')
  );
  assert.ok(
    updateFunc.includes('if (preNewArea && preNewArea !== preOldArea) {'),
    'Active area check is gated on area change pre-lock'
  );
  assert.ok(
    updateFunc.includes('if (liveNewArea && liveNewArea !== liveOldArea) {'),
    'Active area check is gated on area change post-lock'
  );
});

runTest('handleUpdateRole rejects newly added Area Incharge assignments to inactive areas with AREA_INACTIVE', () => {
  const roleFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateRole('),
    codeGs.indexOf('function handleGetNewsEvents(')
  );
  assert.ok(
    roleFunc.includes('newlyAddedAreas'),
    'handleUpdateRole must compute newlyAddedAreas'
  );
  assert.ok(
    roleFunc.includes("roleAreaStatusMap[naNorm] !== 'ACTIVE'"),
    'handleUpdateRole must verify newly added areas against roleAreaStatusMap'
  );
  assert.ok(
    roleFunc.includes("errorCode: 'AREA_INACTIVE'"),
    'handleUpdateRole must reject with AREA_INACTIVE for inactive assigned area'
  );
});

runTest('handleUpdateRole permits existing inactive historical assignments to remain or be removed without reactivation', () => {
  const roleFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateRole('),
    codeGs.indexOf('function handleGetNewsEvents(')
  );
  assert.ok(
    roleFunc.includes('prevAreas.indexOf(reqAreas[rqa]) === -1'),
    'handleUpdateRole must filter only areas not already present in prevAreas'
  );
});

runTest('No blanket inactive-area block exists in historical or read authorization', () => {
  const authFunc = codeGs.substring(
    codeGs.indexOf('function checkCNEAuthorized('),
    codeGs.indexOf('function checkCNEActionAuthorized(')
  );
  assert.ok(
    !authFunc.includes('isAreaActive_'),
    'checkCNEAuthorized must not contain isAreaActive_ check to preserve historical access'
  );
  assert.ok(
    !authFunc.includes('requireActiveArea_'),
    'checkCNEAuthorized must not contain requireActiveArea_ check'
  );
  const getCneFunc = codeGs.substring(
    codeGs.indexOf('function getCNEScheduleRecord('),
    codeGs.indexOf('function handleSaveReferenceMaterial(')
  );
  assert.ok(
    !getCneFunc.includes('isAreaActive_'),
    'getCNEScheduleRecord must not block inactive areas from being retrieved'
  );
});

runTest('Admin area status toggle and update handlers remain protected by Admin authorization and ScriptLock', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('var adminError = requireAdmin(session);'),
    'handleUpdateArea must require admin session'
  );
  assert.ok(
    updateAreaFunc.includes('var freshAdminCheck = requireFreshAdminMutation(session);'),
    'handleUpdateArea must perform fresh mutation check inside lock'
  );
  assert.ok(
    updateAreaFunc.includes('LockService.getScriptLock()'),
    'handleUpdateArea must acquire ScriptLock'
  );
});

runTest('Admin area rename enforces duplicate name validation in backend handleUpdateArea', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('newName.toLowerCase() !== oldName.toLowerCase()'),
    'handleUpdateArea must check for name changes'
  );
  assert.ok(
    updateAreaFunc.includes('An area with this name already exists.'),
    'handleUpdateArea must reject duplicate area names'
  );
});

// -----------------------------------------------------------------------------
// 9. Ward / Area Referential Rename Propagation
// -----------------------------------------------------------------------------
runTest('handleUpdateArea rename updates Area master name and status together', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );

  assert.ok(
    updateAreaFunc.includes('getRange(targetAreaRow, 1, 1, 2)'),
    'handleUpdateArea must target Area master Name + Status together'
  );

  assert.ok(
    updateAreaFunc.includes('setValues([[newName, targetStatus]])'),
    'handleUpdateArea must write newName and targetStatus in one operation'
  );

  assert.ok(
    updateAreaFunc.includes('var isRename = Boolean(newName && newName.toLowerCase() !== oldName.toLowerCase());'),
    'handleUpdateArea must identify rename operations'
  );
});

runTest('rename propagates exact match into Role assignments', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("ss.getSheetByName('Role')"),
    'handleUpdateArea must access Role sheet during rename'
  );
  assert.ok(
    updateAreaFunc.includes('tokenStr.toUpperCase() === oldNorm'),
    'handleUpdateArea must match tokens using normalized uppercase equality'
  );
  assert.ok(
    updateAreaFunc.includes('updatedTokens.push(newName);'),
    'handleUpdateArea must replace matching token with newName'
  );
  assert.ok(
    updateAreaFunc.includes('roleSheet.getRange(rItem.row, rItem.col).setValue(rItem.newVal);'),
    'handleUpdateArea must update affected Role cells'
  );
});

runTest('rename propagates exact match into CNE Schedule', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("ss.getSheetByName('CNE Schedule')"),
    'handleUpdateArea must access CNE Schedule sheet during rename'
  );
  assert.ok(
    updateAreaFunc.includes('cneAreaVal.toUpperCase() === oldNorm'),
    'handleUpdateArea must match CNE Area/Ward using normalized uppercase equality'
  );
  assert.ok(
    updateAreaFunc.includes('cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);'),
    'handleUpdateArea must update affected CNE Schedule cells'
  );
});

runTest('rename does not modify partial names such as MICU/PICU/NICU', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    !updateAreaFunc.includes('.replace(oldName, newName)'),
    'handleUpdateArea must NOT use blind substring replacement'
  );
  assert.ok(
    updateAreaFunc.includes('tokenStr.toUpperCase() === oldNorm'),
    'Role sheet must use exact token comparison'
  );
  assert.ok(
    updateAreaFunc.includes('cneAreaVal.toUpperCase() === oldNorm'),
    'CNE Schedule must use exact area equality'
  );
});

runTest('rename preserves ACTIVE/INACTIVE status', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );

  assert.ok(
    updateAreaFunc.includes('var targetStatus = rawStatus ? status : currentStatus;'),
    'handleUpdateArea must preserve currentStatus when status is not explicitly passed'
  );

  assert.ok(
    updateAreaFunc.includes('setValues([[newName, targetStatus]])'),
    'Area master grouped write must preserve targetStatus'
  );
});

runTest('rename remains Admin-only and ScriptLock-protected', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('var adminError = requireAdmin(session);'),
    'handleUpdateArea must enforce requireAdmin'
  );
  assert.ok(
    updateAreaFunc.includes('lock.waitLock(10000);'),
    'handleUpdateArea must wait for ScriptLock before any mutation'
  );
  assert.ok(
    updateAreaFunc.includes('lock.releaseLock();'),
    'handleUpdateArea must release ScriptLock in finally block'
  );
});

runTest('relevant caches are invalidated after rename', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("CacheService.getScriptCache().remove('cne_areas_list');"),
    'handleUpdateArea must invalidate cne_areas_list cache'
  );
  assert.ok(
    updateAreaFunc.includes('invalidateUserRoleCache(roleAffectedEmpIds[sa]);'),
    'handleUpdateArea must invalidate affected officer role cache'
  );
  assert.ok(
    updateAreaFunc.includes('_inMemoryRoleCache = {};'),
    'handleUpdateArea must reset in-memory role cache'
  );
});

runTest('Active/Inactive enforcement still works after rename', () => {
  assert.ok(
    codeGs.includes("CacheService.getScriptCache().remove('cne_areas_list');"),
    'cne_areas_list cache removal ensures fresh status map'
  );
  assert.ok(
    codeGs.includes('function requireActiveArea_(areaName, forceFresh)'),
    'requireActiveArea_ helper functions across fresh reads'
  );
  const createFunc = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE('),
    codeGs.indexOf('function handleUpdateCNE(')
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, true)'),
    'handleCreateCNE uses forceFresh=true under lock to validate newly renamed area'
  );
});

// -----------------------------------------------------------------------------
// 10. Ward / Area Rename Production Hardening & Atomicity
// -----------------------------------------------------------------------------
runTest('Rename propagation errors are not silently swallowed', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    !updateAreaFunc.includes('console.warn(\\'Error propagating area rename'),
    'handleUpdateArea must NOT silently swallow rename errors with console.warn'
  );
  assert.ok(
    updateAreaFunc.includes('catch (writeErr) {'),
    'handleUpdateArea must catch write errors to perform rollback and fail closed'
  );
});

runTest('Failure does not return success and returns explicit error codes', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("errorCode: 'AREA_RENAME_FAILED'"),
    'handleUpdateArea must return AREA_RENAME_FAILED error code on write failure'
  );
  assert.ok(
    updateAreaFunc.includes("errorCode: 'AREA_RENAME_RECONCILIATION_REQUIRED'"),
    'handleUpdateArea must return AREA_RENAME_RECONCILIATION_REQUIRED if rollback fails'
  );
  assert.ok(
    updateAreaFunc.includes('success: false'),
    'Write failure must strictly return success: false'
  );
});

runTest('Only affected Role cells are updated', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('roleSheet.getRange(rItem.row, rItem.col).setValue(rItem.newVal);'),
    'handleUpdateArea must update only specific cell coordinates on matching Role rows'
  );
});

runTest('Only affected CNE Area cells are updated', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);'),
    'handleUpdateArea must update only specific cell coordinates on matching CNE rows'
  );
});

runTest('Unrelated columns and formulas are preserved without full-sheet overwrites', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    !updateAreaFunc.includes('roleSheet.getRange(1, 1, rData.length, rData[0].length).setValues(rData)'),
    'handleUpdateArea must not overwrite full Role sheet range'
  );
  assert.ok(
    !updateAreaFunc.includes('cneSheet.getRange(1, 1, cneData.length, cneData[0].length).setValues(cneData)'),
    'handleUpdateArea must not overwrite full CNE Schedule sheet range'
  );
});

runTest('Rollback and restoration are attempted on partial failure', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('var executedRollbacks = [];'),
    'handleUpdateArea must track executed rollbacks'
  );
  const renameTryBlock = updateAreaFunc.substring(
    updateAreaFunc.indexOf('// EXECUTE WRITES WITH ROLLBACK TRACKING'),
    updateAreaFunc.indexOf('} catch (writeErr) {')
  );
  assert.ok(
    renameTryBlock.indexOf('executedRollbacks.push({ sheet: roleSheet') < renameTryBlock.indexOf('roleSheet.getRange(rItem.row, rItem.col).setValue'),
    'Rollback entry must be registered before role write'
  );
  assert.ok(
    renameTryBlock.indexOf('executedRollbacks.push({ sheet: cneSheet') < renameTryBlock.indexOf('cneSheet.getRange(cItem.row, cItem.col).setValue'),
    'Rollback entry must be registered before CNE write'
  );
  const masterGroupedWriteIndex = renameTryBlock.indexOf('getRange(targetAreaRow, 1, 1, 2)');
  const nameRollbackIndex = renameTryBlock.indexOf('col: 1, oldVal: oldAreaMasterName');
  const statusRollbackIndex = renameTryBlock.indexOf('col: 2, oldVal: oldAreaMasterStatus');

  assert.ok(
    nameRollbackIndex !== -1 && nameRollbackIndex < masterGroupedWriteIndex,
    'Area master name rollback must be registered before grouped write'
  );

  assert.ok(
    statusRollbackIndex !== -1 && statusRollbackIndex < masterGroupedWriteIndex,
    'Area master status rollback must be registered before grouped write'
  );

  assert.ok(
    renameTryBlock.includes('setValues([[newName, targetStatus]])'),
    'Area master Name + Status must be written together'
  );
  assert.ok(
    updateAreaFunc.includes('rbItem.sheet.getRange(rbItem.row, rbItem.col).setValue(rbItem.oldVal);'),
    'handleUpdateArea must restore cells to oldVal during rollback'
  );
});

runTest('AREA_RENAME_FAILED error is returned appropriately on safe rollback', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("message: 'Ward/area rename could not be completed safely. No changes were finalized. Please try again.'"),
    'handleUpdateArea must return safe rollback failure message'
  );
});

runTest('Caches are invalidated on both success and failure', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  const catchSection = updateAreaFunc.substring(
    updateAreaFunc.indexOf('catch (writeErr) {'),
    updateAreaFunc.indexOf('// ---------------------------------------------------------\\n    // SUCCESS:')
  );
  assert.ok(
    catchSection.includes("CacheService.getScriptCache().remove('cne_areas_list');"),
    'Caches must be removed on failure'
  );
  assert.ok(
    catchSection.includes('_inMemoryRoleCache = {};'),
    'In-memory role cache must be cleared on failure'
  );
  assert.ok(
    catchSection.includes('invalidateUserRoleCache(roleAffectedEmpIds[fa]);'),
    'User role cache must be invalidated on failure'
  );
});

runTest('Active/Inactive status remains unchanged when renaming area', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );

  assert.ok(
    updateAreaFunc.includes('var targetStatus = rawStatus ? status : currentStatus;'),
    'targetStatus must resolve to currentStatus if status not specified'
  );

  assert.ok(
    updateAreaFunc.includes('setValues([[newName, targetStatus]])'),
    'Grouped Area master write must preserve resolved targetStatus'
  );
});

runTest('Audit logging records AREA_RENAMED with row counts on success and AREA_RENAME_FAILED on failure', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("logAuditAction(\\n      'AREA_RENAMED',"),
    'handleUpdateArea must log AREA_RENAMED on success'
  );
  assert.ok(
    updateAreaFunc.includes("' (Role rows updated: ' + roleUpdates.length + ', CNE rows updated: ' + cneUpdates.length + ')'"),
    'Audit log must record updated Role and CNE counts'
  );
  assert.ok(
    updateAreaFunc.includes("logAuditAction(\\n        'AREA_RENAME_FAILED',"),
    'handleUpdateArea must log AREA_RENAME_FAILED on failure'
  );
});


// -----------------------------------------------------------------------------
// 11. Admin-Controlled Teaching Mode Master
// -----------------------------------------------------------------------------
runTest('Teaching Mode master backend handlers and router actions exist', () => {
  assert.ok(codeGs.includes('function handleGetTeachingModes(params)'), 'getTeachingModes handler must exist');
  assert.ok(codeGs.includes('function handleAddTeachingMode(params, session)'), 'addTeachingMode handler must exist');
  assert.ok(codeGs.includes('function handleUpdateTeachingMode(params, session)'), 'updateTeachingMode handler must exist');
  assert.ok(codeGs.includes("case 'getTeachingModes':"), 'getTeachingModes router action must exist');
  assert.ok(codeGs.includes("case 'addTeachingMode':"), 'addTeachingMode router action must exist');
  assert.ok(codeGs.includes("case 'updateTeachingMode':"), 'updateTeachingMode router action must exist');
});

runTest('Teaching Mode mutations remain Admin-only and ScriptLock protected', () => {
  const addStart = codeGs.indexOf('function handleAddTeachingMode(');
  const updateStart = codeGs.indexOf('function handleUpdateTeachingMode(');
  const addFunc = codeGs.substring(addStart, updateStart);
  const updateEnd = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', updateStart);
  const updateFunc = codeGs.substring(updateStart, updateEnd);
  assert.ok(addFunc.includes('requireAdmin(session)'), 'add Teaching Mode must require Admin');
  assert.ok(addFunc.includes('LockService.getScriptLock()'), 'add Teaching Mode must use ScriptLock');
  assert.ok(updateFunc.includes('requireAdmin(session)'), 'update Teaching Mode must require Admin');
  assert.ok(updateFunc.includes('LockService.getScriptLock()'), 'update Teaching Mode must use ScriptLock');
});

runTest('Teaching Mode duplicate names are rejected case-insensitively', () => {
  const updateStart = codeGs.indexOf('function handleUpdateTeachingMode(');
  const updateEnd = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', updateStart);
  const updateFunc = codeGs.substring(updateStart, updateEnd);
  assert.ok(updateFunc.includes("candidate.toUpperCase() === newNorm"), 'rename duplicate validation must use normalized exact match');
  assert.ok(updateFunc.includes('A Teaching Mode with this name already exists.'), 'duplicate message must be present');
});

runTest('Authoritative Teaching Mode ACTIVE/INACTIVE helpers exist', () => {
  assert.ok(codeGs.includes('function getTeachingModeStatusMap_(forceFresh)'), 'status map helper must exist');
  assert.ok(codeGs.includes('function isTeachingModeActive_(modeName, forceFresh)'), 'active helper must exist');
  assert.ok(codeGs.includes('function requireActiveTeachingMode_(modeName, forceFresh)'), 'require-active helper must exist');
  assert.ok(codeGs.includes("errorCode: 'TEACHING_MODE_INACTIVE'"), 'standard inactive error code must exist');
});

runTest('New CNE creation validates Teaching Mode before and after the lock', () => {
  const createFunc = codeGs.substring(codeGs.indexOf('function handleCreateCNE('), codeGs.indexOf('function handleUpdateCNE('));
  assert.ok(createFunc.includes('requireActiveTeachingMode_(modeOfTeaching, false)'), 'create pre-lock validation required');
  assert.ok(createFunc.includes('requireActiveTeachingMode_(modeOfTeaching, true)'), 'create post-lock validation required');
});

runTest('Departmental CNE batch validates Teaching Modes pre-lock and with one fresh map under lock', () => {
  const deptStart = codeGs.indexOf('function handleAddDepartmentalSchedule(');
  const deptEnd = codeGs.indexOf('/**', deptStart + 20);
  const deptFunc = codeGs.substring(deptStart, deptEnd > deptStart ? deptEnd : codeGs.length);
  assert.ok(deptFunc.includes('requireActiveTeachingMode_(teachingMode, false)'), 'departmental pre-lock Teaching Mode validation required');
  assert.ok(deptFunc.includes('var liveTeachingModeStatusMap = getTeachingModeStatusMap_(true);'), 'departmental lock-time validation must read status map once');
  assert.ok(deptFunc.includes("errorCode: 'TEACHING_MODE_INACTIVE'"), 'departmental inactive mode must fail closed');
});

runTest('Edit CNE requires ACTIVE Teaching Mode only when the Teaching Mode changes', () => {
  const updateFunc = codeGs.substring(codeGs.indexOf('function handleUpdateCNE('), codeGs.indexOf('function handleAddDepartmentalSchedule('));
  assert.ok(updateFunc.includes('preNewTeachingMode !== preOldTeachingMode'), 'pre-lock mode check must compare old and new');
  assert.ok(updateFunc.includes('liveNewTeachingMode !== liveOldTeachingMode'), 'post-lock mode check must compare old and new');
  assert.ok(updateFunc.includes('requireActiveTeachingMode_(params.modeOfTeaching, true)'), 'changed mode must be freshly validated');
});

runTest('Existing CNE with inactive current Teaching Mode can remain unchanged', () => {
  const updateFunc = codeGs.substring(codeGs.indexOf('function handleUpdateCNE('), codeGs.indexOf('function handleAddDepartmentalSchedule('));
  assert.ok(!updateFunc.includes('requireActiveTeachingMode_(liveUpdateRecord.modeOfTeaching'), 'current stored Teaching Mode must not be globally blocked');
  assert.ok(updateFunc.includes('liveNewTeachingMode !== liveOldTeachingMode'), 'only a changed target is enforced');
});

runTest('Teaching Mode rename propagates exact matches to CNE Schedule only', () => {
  const start = codeGs.indexOf('function handleUpdateTeachingMode(');
  const end = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', start);
  const fn = codeGs.substring(start, end);
  assert.ok(fn.includes("String(oldCell || '').trim().toUpperCase() === oldNorm"), 'rename must use exact normalized match');
  assert.ok(fn.includes('cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);'), 'only affected CNE cells must be updated');
  assert.ok(!fn.includes('.replace(oldName'), 'substring replacement must not be used');
});

runTest('Teaching Mode rename registers rollback before dependent and master writes', () => {
  const start = codeGs.indexOf('function handleUpdateTeachingMode(');
  const end = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', start);
  const fn = codeGs.substring(start, end);
  const depRollback = fn.indexOf('executedRollbacks.push({ sheet: cneSheet');
  const depWrite = fn.indexOf('cneSheet.getRange(cItem.row, cItem.col).setValue');
  const masterRollback = fn.indexOf('col: 1, oldVal: data[targetRow - 1][0]');
  const masterWrite = fn.indexOf('getRange(targetRow, 1, 1, 3).setValues');
  assert.ok(depRollback !== -1 && depRollback < depWrite, 'CNE rollback must be registered before write');
  assert.ok(masterRollback !== -1 && masterRollback < masterWrite, 'master rollback must be registered before grouped write');
  assert.ok(fn.includes("errorCode: 'TEACHING_MODE_RENAME_FAILED'"), 'safe rollback failure code must exist');
  assert.ok(fn.includes("errorCode: 'TEACHING_MODE_RENAME_RECONCILIATION_REQUIRED'"), 'reconciliation failure code must exist');
});

runTest('Teaching Mode cache is invalidated after mutations and failures', () => {
  const tmStart = codeGs.indexOf('function handleAddTeachingMode(');
  const tmEnd = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', tmStart);
  const tmSection = codeGs.substring(tmStart, tmEnd);
  const removals = (tmSection.match(/remove\\('cne_teaching_modes_list'\\)/g) || []).length;
  assert.ok(removals >= 3, 'Teaching Mode cache must be cleared on add/update/rename failure paths');
});

runTest('Teaching Mode master schema has no Sort Order field', () => {
  assert.ok(codeGs.includes("'Teaching Mode': ['Mode Name', 'Status', 'Updated At']"), 'Teaching Mode sheet must contain Name, Status, Updated At only');
  assert.ok(!codeGs.includes("'Teaching Mode': ['Mode Name', 'Status', 'Sort Order'"), 'Teaching Mode master must not use Sort Order');
});

runTest('Frontend Control Center exposes Teaching Modes Admin page', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const toolbar = fs.readFileSync('src/components/TopToolbar.tsx', 'utf8');
  const adminModes = fs.readFileSync('src/components/AdminTeachingModes.tsx', 'utf8');
  assert.ok(app.includes("activeView === 'admin-teaching-modes'"), 'App must render Teaching Modes Admin page');
  assert.ok(toolbar.includes("id: 'admin-teaching-modes'"), 'Control Center must link to Teaching Modes');
  assert.ok(adminModes.includes('Teaching Mode | Status') || (adminModes.includes('Teaching Mode') && adminModes.includes('Status')), 'Admin page must expose Teaching Mode and Status columns');
  assert.ok(!adminModes.includes('Sort Order'), 'Admin Teaching Modes page must not expose Sort Order');
});

runTest('All CNE Teaching Mode selectors use the centralized master instead of hardcoded option lists', () => {
  const schedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
  const dept = fs.readFileSync('src/components/cne/DepartmentalScheduleModal.tsx', 'utf8');
  const unscheduled = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
  assert.ok(schedule.includes('ApiService.getTeachingModes()'), 'CNE Schedule must load master Teaching Modes');
  assert.ok(schedule.includes('activeTeachingModeNames.map'), 'Central CNE dropdown must use active master modes');
  assert.ok(dept.includes('teachingModes.map'), 'Departmental CNE dropdown must use master modes');
  assert.ok(unscheduled.includes('teachingModes.map'), 'Unscheduled CNE dropdown must use master modes');
  for (const source of [schedule, dept, unscheduled]) {
    assert.ok(!source.includes('<option value="Demonstration">Demonstration</option>'), 'hardcoded Teaching Mode option arrays must be removed');
  }
});

runTest('Edit CNE displays current inactive Teaching Mode while new selections remain ACTIVE-only', () => {
  const schedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
  assert.ok(schedule.includes('(Current — Inactive)'), 'Edit dropdown must label current inactive Teaching Mode');
  assert.ok(schedule.includes('teachingModeChanged'), 'Edit validation must distinguish unchanged historical mode from a new target');
  assert.ok(schedule.includes('activeTeachingModeNames.some'), 'Changed Teaching Mode must be checked against active master values');
});

// -----------------------------------------------------------------------------
// 7. External CNE Types & Workflow Enforcement
// -----------------------------------------------------------------------------
runTest('Authoritative normalizeCNEType recognizes all four types and fails closed on unknown inputs', () => {
  const normalizeDef = codeGs.substring(
    codeGs.indexOf('function normalizeCNEType'),
    codeGs.indexOf('function normalizeCNEStatus')
  );

  assert.ok(normalizeDef.includes("'CENTRAL'"), 'Must normalize CENTRAL');
  assert.ok(normalizeDef.includes("'DEPARTMENTAL'"), 'Must normalize DEPARTMENTAL');
  assert.ok(normalizeDef.includes("'EXTERNAL_OFFSITE'"), 'Must normalize EXTERNAL_OFFSITE');
  assert.ok(normalizeDef.includes("'EXTERNAL_ONSITE'"), 'Must normalize EXTERNAL_ONSITE');
  assert.ok(normalizeDef.includes('return null;'), 'Must return null for unknown values');
});

runTest('handleCreateCNE fails closed on invalid CNE type and enforces unscheduled-only for External types', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Fail-closed validation
  assert.ok(
    handleAddSection.includes("errorCode: 'INVALID_CNE_TYPE'"),
    'Must return INVALID_CNE_TYPE error code when type is invalid'
  );

  // Workflow enforcement: External CNEs unscheduled only
  assert.ok(
    handleAddSection.includes("errorCode: 'EXTERNAL_CNE_UNSCHEDULED_ONLY'"),
    'Must return EXTERNAL_CNE_UNSCHEDULED_ONLY error code when External CNE is not unscheduled'
  );
  assert.ok(
    handleAddSection.includes('External CNE categories can only be recorded through the Unscheduled CNE workflow.'),
    'Must return descriptive message for unscheduled-only enforcement'
  );

  // Server-side authorization: External CNE requires Admin role
  assert.ok(
    handleAddSection.includes("(cneType === 'EXTERNAL_OFFSITE' || cneType === 'EXTERNAL_ONSITE') && !isAdmin"),
    'Must enforce that External CNE requires Admin role'
  );
});

runTest('AddUnscheduledCneModal provides mandatory CNE Type dropdown and Associated Department label for External types', () => {
  const unscheduledModal = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');

  // Mandatory dropdown with 4 options
  assert.ok(unscheduledModal.includes('id="unscheduled-cne-type"'), 'Must have CNE Type select input');
  assert.ok(unscheduledModal.includes('value="CENTRAL"'), 'Must have CENTRAL option');
  assert.ok(unscheduledModal.includes('value="DEPARTMENTAL"'), 'Must have DEPARTMENTAL option');
  assert.ok(unscheduledModal.includes('value="EXTERNAL_OFFSITE"'), 'Must have EXTERNAL_OFFSITE option');
  assert.ok(unscheduledModal.includes('value="EXTERNAL_ONSITE"'), 'Must have EXTERNAL_ONSITE option');

  // Dynamic label for Area
  assert.ok(
    unscheduledModal.includes('Associated Department / Area *'),
    'Must display Associated Department / Area for External CNE types'
  );

  // No forbidden fields
  assert.ok(!unscheduledModal.includes('Organizing Institution'), 'Must not add Organizing Institution field');
  assert.ok(!unscheduledModal.includes('id="unscheduled-venue"'), 'Must not add separate Venue field');
});

runTest('Normal scheduled CNE popups remain strictly Central and Departmental only', () => {
  const scheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
  const deptModalTs = fs.readFileSync('src/components/cne/DepartmentalScheduleModal.tsx', 'utf8');

  // Schedule New Central CNE submits CENTRAL
  assert.ok(
    scheduleTs.includes("cneType: 'CENTRAL'"),
    'Schedule New CNE must submit CENTRAL'
  );
  // Departmental Schedule submits DEPARTMENTAL
  assert.ok(
    deptModalTs.includes("cneType: 'DEPARTMENTAL'"),
    'Departmental Schedule must submit DEPARTMENTAL'
  );
  // Neither scheduled modal contains External CNE options
  assert.ok(
    !deptModalTs.includes('EXTERNAL_OFFSITE'),
    'Departmental modal must not contain External CNE options'
  );
});

runTest('Frontend getCneTypeLabel displays correct human-facing labels for all four CNE types', () => {
  const utilsTs = fs.readFileSync('src/utils.ts', 'utf8');
  assert.ok(utilsTs.includes('function getCneTypeLabel'), 'src/utils.ts must export getCneTypeLabel');
  assert.ok(utilsTs.includes("'Central CNE'"), 'Must return Central CNE');
  assert.ok(utilsTs.includes("'Departmental CNE'"), 'Must return Departmental CNE');
  assert.ok(utilsTs.includes("'External CNE – Outside AIIMS'"), 'Must return External CNE – Outside AIIMS');
  assert.ok(utilsTs.includes("'External CNE – Hosted at AIIMS'"), 'Must return External CNE – Hosted at AIIMS');
});

runTest('Lifecycle finalize and cancel recognize all four CNE types in Code.gs', () => {
  assert.ok(
    codeGs.includes('must be CENTRAL, DEPARTMENTAL, EXTERNAL_OFFSITE, or EXTERNAL_ONSITE'),
    'Code.gs finalize/cancel error messages must recognize all four valid CNE types'
  );
});

// -----------------------------------------------------------------------------
// 8. Secure ADMIN-Only Delete CNE with Audit Archive Workflows
// -----------------------------------------------------------------------------
runTest('Delete CNE enforces strict Admin authorization both frontend and backend', () => {
  // Backend router is handleAdminAction
  assert.ok(codeGs.includes("handleAdminAction(params, session, handleDeleteCNE, 'DELETE_CNE')"), 'Backend deleteCNE must be guarded by handleAdminAction');
  // Re-verify under lock
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  assert.ok(fnBody.includes('var adminErr = requireAdmin(session);'), 'handleDeleteCNE must re-verify requireAdmin under lock');
  // Non-admins (AREA_INCHARGE, EMPLOYEE) rejected by requireAdmin
  assert.ok(codeGs.includes("String(session.role || '').toUpperCase() !== 'ADMIN'"), 'requireAdmin must reject any non-ADMIN role');
  // Frontend permission strictly checks user?.role === 'ADMIN'
  assert.ok(cneScheduleTs.includes("const canDeleteCne = user?.role === 'ADMIN';"), 'Frontend delete permission must strictly check user?.role === ADMIN');
  assert.ok(!cneDetailsModalTs.includes("canLifecycle && !isCompleted && onDelete"), 'CneDetailsModal must not use canLifecycle for delete');
});

runTest('Delete CNE permits Scheduled/Canceled without attendance, denies Completed or recorded attendance', () => {
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  // Completed rejected
  assert.ok(fnBody.includes("if (liveStatus === 'Completed')"), 'Completed CNE deletion must be denied');
  assert.ok(fnBody.includes("CANNOT_DELETE_LIFECYCLE"), 'Lifecycle error code must be CANNOT_DELETE_LIFECYCLE');
  // Allowed statuses: Scheduled and Canceled
  assert.ok(fnBody.includes("if (liveStatus !== 'Scheduled' && liveStatus !== 'Canceled')"), 'Only Scheduled or Canceled CNEs are eligible for deletion');
  // Attendance rejection
  assert.ok(fnBody.includes('ATTENDANCE_EXISTS'), 'Attendance error code must be ATTENDANCE_EXISTS');
  assert.ok(fnBody.includes('staffcount'), 'Must check staffcount');
  assert.ok(fnBody.includes('CNE Post Test Responses'), 'Must check CNE Post Test Responses sheet');
  assert.ok(fnBody.includes('CNE_Participants'), 'Must check CNE_Participants sheet');
  // Explicit error message
  assert.ok(fnBody.includes('This CNE cannot be deleted because participant attendance or Post-Test records already exist.'), 'Must return authoritative attendance denial message');
});

runTest('CNE Deleted Archive preserves all dynamic schedule columns plus deletion metadata', () => {
  assert.ok(codeGs.includes("'CNE Deleted Archive':"), 'CNE_SHEET_HEADERS must define CNE Deleted Archive');
  assert.ok(codeGs.includes("'Deleted At', 'Deleted By', 'Delete Reason'"), 'CNE Deleted Archive must include deletion metadata headers');
  assert.ok(codeGs.includes('function getOrCreateDeletedArchiveSheet_'), 'getOrCreateDeletedArchiveSheet_ must dynamically sync headers');
  
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  assert.ok(fnBody.includes('archiveSheet.appendRow(archiveRow);'), 'handleDeleteCNE must append original row to archive');
  assert.ok(fnBody.includes('findExactRowInColumn_(archiveSheet'), 'handleDeleteCNE must verify archive write before removing schedule row');
  assert.ok(fnBody.includes('cneSheet.deleteRow('), 'handleDeleteCNE must remove row from active CNE Schedule');
  assert.ok(fnBody.includes('ARCHIVE_INCONSISTENCY'), 'Existing archive entry for active CNE must be treated as inconsistency');
  assert.ok(fnBody.includes('DELETE_MUTATION_FAILED'), 'Safe rollback must be attempted if schedule deletion fails');
  assert.ok(!codeGs.includes('allowMismatch'), 'Archive recovery must enforce strict row ownership without allowMismatch');
});

runTest('Delete CNE deactivates all associated QR tokens and prevents CNE ID reuse', () => {
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  assert.ok(
    fnBody.includes('deactivateQRTokensForCNE(cneId, qrColMap);'),
    'Delete CNE must pass the validated QR column map'
  );
  assert.ok(codeGs.includes('function isCneIdInUse_'), 'Code.gs must implement isCneIdInUse_ helper');
  
  const inUseFn = codeGs.substring(codeGs.indexOf('function isCneIdInUse_'), codeGs.indexOf('function handleDeleteCNE'));
  assert.ok(inUseFn.includes("ss.getSheetByName('CNE Schedule')"), 'isCneIdInUse_ must check active schedule');
  assert.ok(inUseFn.includes("ss.getSheetByName('CNE Deleted Archive')"), 'isCneIdInUse_ must check deleted archive');
  assert.ok(codeGs.includes('while (isCneIdInUse_(cneId))'), 'CNE ID generation must loop to guarantee no ID reuse');
  assert.ok(fnBody.includes("logAuditAction('DELETE_CNE'"), 'handleDeleteCNE must log DELETE_CNE audit event');
});

runTest('DeleteCneModal requires exact CNE ID confirmation, mandatory reason, and disables for non-admin', () => {
  assert.ok(deleteModalTs.includes("confirmId === targetId"), 'Delete modal must require exact CNE ID match');
  assert.ok(deleteModalTs.includes("reason.trim()"), 'Delete modal must require nonempty reason');
  assert.ok(deleteModalTs.includes("user?.role === 'ADMIN'"), 'Delete modal must verify admin role');
  assert.ok(deleteModalTs.includes("This CNE will be removed from the active CNE Schedule and preserved in the Deleted CNE Archive for audit."), 'Delete modal must display exact warning text');
  assert.ok(deleteModalTs.includes("Deleting CNE..."), 'Delete modal must display in-flight progress text');
  assert.ok(cneScheduleTs.includes("CNE deleted from active schedule and archived successfully."), 'Schedule component must display exact success message');
});

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL CNE WORKFLOWS & SCHEMA TESTS PASSED!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-cne-workflows.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-pdf-resources-and-indexing.js =====
  {
    id: "pdf",
    name: "PDF Resources & Evidence Indexing",
    originalFilename: "verify-pdf-resources-and-indexing.js",
    mode: "module",
    expectedChecks: 17,
    sha256: "7cbea392e94f077dc58c660ac1d63bd210304a6f8452e603a61883c402afb987",
    source: `/**
 * PDF Learning Resources, Reference Library & Indexing Verification Suite
 *
 * Consolidates tests from:
 * - verify-phase4a.js (deterministic chunking, heading detection, indexing sheet schema, duplicate handling)
 * - verify-phase4d1.js (clinical relevance gate, taxonomy validation, false positive elimination)
 * - test-phase2-extraction.cjs (PDF signature validation, stream extraction, unsupported format rejection)
 *
 * Enforces the final document policy:
 * - CNE Learning Material: PDF only, maximum 3 MB, %PDF signature validation
 * - Nursing Reference Library: PDF only, Admin-only, no 3 MB inheritance, Drive location verification
 * - Unsupported formats rejected: DOC, DOCX, PPT, PPTX, TXT, images, ZIP, executables
 * - Evidence Retrieval: passesClinicalRelevanceGate, procedural taxonomy, cross-procedural contamination prevention
 */

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('PDF Resources, Indexing & Clinical Evidence Verification');
console.log('========================================================\\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const addResourceModalTs = fs.readFileSync('src/components/cne/AddResourceModal.tsx', 'utf8');
const learningResPageTs = fs.readFileSync('src/components/cne/LearningResourcesPage.tsx', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// =============================================================================
// 1. CNE Learning Material Document Policy & Size Limit (3 MB)
// =============================================================================
runTest('CNE Learning Material enforces PDF-only format in frontend modal', () => {
  assert.ok(
    addResourceModalTs.includes("if (ext !== 'pdf')"),
    'Frontend modal must strictly enforce ext === pdf'
  );
  assert.ok(
    addResourceModalTs.includes('Only PDF (.pdf) documents are supported'),
    'Frontend modal must inform user that only PDF documents are supported'
  );
});

runTest('CNE Learning Material enforces authoritative 3 MB maximum size limit', () => {
  // Frontend modal limit check
  assert.ok(
    addResourceModalTs.includes('3 * 1024 * 1024') || addResourceModalTs.includes('3MB authoritative limit'),
    'Frontend modal must check 3 MB limit'
  );
  assert.ok(
    addResourceModalTs.includes('exceeds the maximum allowed limit of 3 MB'),
    'Frontend modal must show 3 MB limit warning message'
  );

  // Simulation test for file size validation
  function validateCneFileSize(sizeBytes) {
    const MAX_SIZE = 3 * 1024 * 1024;
    if (sizeBytes > MAX_SIZE) {
      return { valid: false, error: 'EXCEEDS_SIZE_LIMIT' };
    }
    return { valid: true };
  }

  // Valid sizes <= 3 MB
  assert.strictEqual(validateCneFileSize(1024).valid, true);
  assert.strictEqual(validateCneFileSize(3 * 1024 * 1024).valid, true);

  // Invalid sizes > 3 MB
  assert.strictEqual(validateCneFileSize(3 * 1024 * 1024 + 1).valid, false);
  assert.strictEqual(validateCneFileSize(5 * 1024 * 1024).valid, false);
});

// =============================================================================
// 2. Unsupported File Formats Rejected
// =============================================================================
runTest('Unsupported formats (DOC, DOCX, PPT, PPTX, TXT, images, ZIP, EXE) are rejected', () => {
  const rejectedExtensions = [
    'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf',
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'sh', 'bat', 'cmd', 'js', 'py'
  ];

  function validateCneExtension(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext !== 'pdf') {
      return { valid: false, error: 'UNSUPPORTED_FORMAT' };
    }
    return { valid: true };
  }

  for (const ext of rejectedExtensions) {
    const res = validateCneExtension(\`test_document.\${ext}\`);
    assert.strictEqual(res.valid, false, \`Extension .\${ext} must be rejected\`);
    assert.strictEqual(res.error, 'UNSUPPORTED_FORMAT');
  }

  // Only .pdf is allowed
  assert.strictEqual(validateCneExtension('clinical_nursing_guide.pdf').valid, true);
  assert.strictEqual(validateCneExtension('EMERGENCY_BLS.PDF').valid, true);
});

// =============================================================================
// 3. PDF Content Validation & %PDF Signature
// =============================================================================
runTest('PDF signature verification accepts valid PDF and rejects fake/spoofed or empty files', () => {
  function validatePdfHeader(bytes) {
    if (!bytes || bytes.length === 0) {
      return { valid: false, errorCode: 'EMPTY_FILE', message: 'File is empty.' };
    }
    if (bytes.length < 4) {
      return { valid: false, errorCode: 'INVALID_FILE_CONTENT', message: 'File too small to be a PDF.' };
    }
    // Check %PDF header signature (0x25, 0x50, 0x44, 0x46)
    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      return { valid: false, errorCode: 'INVALID_FILE_CONTENT', message: 'Missing %PDF magic signature.' };
    }
    return { valid: true };
  }

  // Valid PDF header
  const validPdfHeader = Buffer.from('%PDF-1.4\\n%âãÏÓ\\n');
  assert.strictEqual(validatePdfHeader(validPdfHeader).valid, true);

  // Empty file rejected
  assert.strictEqual(validatePdfHeader(Buffer.alloc(0)).errorCode, 'EMPTY_FILE');

  // Spoofed file (text or image renamed .pdf)
  const fakePdf = Buffer.from('This is a text file renamed to guide.pdf');
  assert.strictEqual(validatePdfHeader(fakePdf).errorCode, 'INVALID_FILE_CONTENT');

  // Spoofed PNG renamed .pdf
  const fakePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assert.strictEqual(validatePdfHeader(fakePng).errorCode, 'INVALID_FILE_CONTENT');
});

runTest('PDF stream text extraction correctly extracts text operands', () => {
  // Simple PDF text stream parser simulation
  function parsePdfStreamText(streamText) {
    const textPieces = [];
    const tjRegex = /\\(([^)]*)\\)\\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(streamText)) !== null) {
      textPieces.push(m[1]);
    }
    const tjArrayRegex = /\\[([^\\]]*)\\]\\s*TJ/g;
    while ((m = tjArrayRegex.exec(streamText)) !== null) {
      const inner = m[1];
      const partRegex = /\\(([^)]*)\\)/g;
      let p;
      while ((p = partRegex.exec(inner)) !== null) {
        textPieces.push(p[1]);
      }
    }
    return textPieces.join(' ').replace(/\\\\([()\\\\])/g, '$1').trim();
  }

  const sampleStream = \`
    BT
    /F1 12 Tf
    72 712 Td
    (Peripheral Intravenous Catheterization Procedure) Tj
    0 -14 Td
    [(Ensure ) -20 (aseptic ) -20 (technique ) -20 (and ) -20 (vein ) -20 (flashback.)] TJ
    ET
  \`;

  const extracted = parsePdfStreamText(sampleStream);
  assert.ok(extracted.includes('Peripheral Intravenous Catheterization Procedure'));
  assert.ok(extracted.includes('Ensure'));
  assert.ok(extracted.includes('flashback'));
});

// =============================================================================
// 4. Nursing Reference Library Policy
// =============================================================================
runTest('Nursing Reference Library is strictly Admin-managed and requires PDF format', () => {
  // Reference management is guarded by Admin role in UI and backend
  assert.ok(
    learningResPageTs.includes("const isAdmin = user?.role === 'ADMIN';") &&
    learningResPageTs.includes("if (!isAdmin || item.sourceType !== 'NURSING_REFERENCE_LIB'"),
    'LearningResourcesPage must restrict Reference library actions to Admin role'
  );
  assert.ok(
    codeGs.includes('getOrCreateNursingRefLibraryFolder'),
    'Backend must maintain dedicated Nursing Reference Library folder hierarchy'
  );
  assert.ok(
    codeGs.includes('isFileInOpenRnFolder'),
    'Backend must validate Drive file location inside Open RN reference folder'
  );
});

runTest('Nursing Reference Library does NOT inherit the CNE 3 MB limit', () => {
  // In AddResourceModal, CNE_LEARNING_MATERIAL uses file select with 3MB limit,
  // whereas NURSING_REFERENCE_LIB connects to Drive files or reference items without 3 MB cutoff
  assert.ok(
    addResourceModalTs.includes("resourceType === 'NURSING_REFERENCE_LIB'"),
    'Modal must support NURSING_REFERENCE_LIB mode'
  );

  function checkSizeAllowance(resourceType, sizeBytes) {
    if (resourceType === 'CNE_LEARNING_MATERIAL') {
      const MAX_SIZE = 3 * 1024 * 1024;
      return sizeBytes <= MAX_SIZE;
    }
    // Reference library allows comprehensive clinical textbooks and reference guides beyond 3 MB
    return true;
  }

  const largeBookSize = 8 * 1024 * 1024; // 8 MB reference book
  assert.strictEqual(checkSizeAllowance('CNE_LEARNING_MATERIAL', largeBookSize), false);
  assert.strictEqual(checkSizeAllowance('NURSING_REFERENCE_LIB', largeBookSize), true);
});

runTest('Educational resources are readable by all authenticated employees without visibility toggles, while re-indexing and Reference Library management remain Admin-only', () => {
  const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
  const typesTs = fs.readFileSync('src/types.ts', 'utf8');

  // Visibility toggling and hidden-resource branches must be completely removed
  const removedVisibilityAction = ['setResource', 'Visibility'].join('');
  const removedVisibilityHandler = ['handleSetResource', 'Visibility'].join('');
  const removedVisibilityField = ['visibleTo', 'Users'].join('');
  const removedHiddenCode = ['RESOURCE_', 'HIDDEN'].join('');

  assert.ok(!codeGs.includes(removedVisibilityAction), 'Code.gs must not contain setResourceVisibility');
  assert.ok(!codeGs.includes(removedVisibilityHandler), 'Code.gs must not contain handleSetResourceVisibility');
  assert.ok(!codeGs.includes(removedHiddenCode), 'Code.gs must not contain RESOURCE_HIDDEN branch');
  assert.ok(!learningResPageTs.includes('handleToggleVisibility'), 'LearningResourcesPage must not contain handleToggleVisibility');
  assert.ok(!learningResPageTs.includes(removedVisibilityField), 'LearningResourcesPage must not contain visibleToUsers');
  assert.ok(!addResourceModalTs.includes(removedVisibilityField), 'AddResourceModal must not contain visibleToUsers');
  assert.ok(!apiTs.includes(removedVisibilityAction), 'api.ts must not contain setResourceVisibility');
  assert.ok(!apiTs.includes(removedVisibilityField), 'api.ts must not contain visibleToUsers');
  assert.ok(!typesTs.includes(removedVisibilityField), 'types.ts must not contain visibleToUsers');

  // CNE Learning Material listing and downloading allow all authenticated employees (do not call checkCNEActionAuthorized)
  const listLrSection = codeGs.substring(
    codeGs.indexOf('function handleListLearningResources('),
    codeGs.indexOf('function handleDownloadLearningResource(')
  );
  assert.ok(
    listLrSection.includes("if (!session || !session.employeeId)") &&
    !listLrSection.includes('checkCNEActionAuthorized'),
    'handleListLearningResources must allow any authenticated employee without requiring CNE management authorization'
  );

  const downloadLrSection = codeGs.substring(
    codeGs.indexOf('function handleDownloadLearningResource('),
    codeGs.indexOf('function extractLearningResourceContentCore(')
  );
  assert.ok(
    downloadLrSection.includes("if (!session || !session.employeeId)") &&
    !downloadLrSection.includes('checkCNEActionAuthorized'),
    'handleDownloadLearningResource must allow any authenticated employee without requiring CNE management authorization'
  );

  // Management endpoints (upload, delete, getLearningResource) still enforce checkCNEActionAuthorized
  const uploadLrSection = codeGs.substring(
    codeGs.indexOf('function handleUploadLearningResource('),
    codeGs.indexOf('function handleDeleteLearningResource(')
  );
  const deleteLrSection = codeGs.substring(
    codeGs.indexOf('function handleDeleteLearningResource('),
    codeGs.indexOf('function handleGetLearningResource(')
  );
  const getLrSection = codeGs.substring(
    codeGs.indexOf('function handleGetLearningResource('),
    codeGs.indexOf('function handleListLearningResources(')
  );
  assert.ok(uploadLrSection.includes('checkCNEActionAuthorized(session, record)'), 'handleUploadLearningResource must enforce checkCNEActionAuthorized');
  assert.ok(deleteLrSection.includes('checkCNEActionAuthorized(session, record)'), 'handleDeleteLearningResource must enforce checkCNEActionAuthorized');
  assert.ok(getLrSection.includes('checkCNEActionAuthorized(session, record)'), 'handleGetLearningResource must enforce checkCNEActionAuthorized');

  // Nursing Reference Library read/download allows all authenticated employees
  const listNrlSection = codeGs.substring(
    codeGs.indexOf('function listNursingReferenceResources('),
    codeGs.indexOf('function uploadNursingReferenceResource(')
  );
  const downloadNrlSection = codeGs.substring(
    codeGs.indexOf('function handleDownloadNursingReferenceResource('),
    codeGs.indexOf('var CLINICAL_PROCEDURAL_TAXONOMY')
  );
  assert.ok(
    listNrlSection.includes("if (!session || !session.employeeId)") &&
    !listNrlSection.includes('if (!isAdmin && !isVisible)'),
    'listNursingReferenceResources must return active reference resources to all authenticated employees'
  );
  assert.ok(
    downloadNrlSection.includes("if (!session || !session.employeeId)") &&
    !downloadNrlSection.includes(removedHiddenCode),
    'handleDownloadNursingReferenceResource must allow all authenticated employees to download active reference resources'
  );

  assert.ok(
    learningResPageTs.includes('handleReindex') || learningResPageTs.includes('reindex'),
    'LearningResourcesPage must support Admin re-indexing'
  );
});

runTest('Office extraction functions are completely removed and single shared PDF engine is used', () => {
  // Office extraction functions must NOT exist
  assert.ok(!codeGs.includes('function extractTextFromDocx('), 'extractTextFromDocx must be removed from Code.gs');
  assert.ok(!codeGs.includes('function extractTextFromPptx('), 'extractTextFromPptx must be removed from Code.gs');
  assert.ok(!codeGs.includes('function extractTextFromPpt('), 'extractTextFromPpt must be removed from Code.gs');
  assert.ok(!codeGs.includes('function parseWordDocumentXml('), 'parseWordDocumentXml must be removed from Code.gs');
  assert.ok(!codeGs.includes('function parsePptxSlideXml('), 'parsePptxSlideXml must be removed from Code.gs');
  assert.ok(!codeGs.includes('function validateOfficeOpenXmlStructure('), 'validateOfficeOpenXmlStructure must be removed from Code.gs');
  assert.ok(!codeGs.includes('function getZipArchiveEntryNames('), 'getZipArchiveEntryNames must be removed from Code.gs');

  // Authoritative extractTextFromPdf must exist as the single PDF engine
  assert.ok(codeGs.includes('function extractTextFromPdf('), 'extractTextFromPdf must exist in Code.gs');
  assert.ok(codeGs.includes('extractTextFromPdf(blob)'), 'extractTextFromPdf must be called for text extraction');

  // Both CNE learning material extraction and Reference Library extraction must use extractTextFromPdf
  const cneExtractionMatch = codeGs.includes('rawExtracted = extractTextFromPdf(blob)');
  const refExtractionMatch = codeGs.includes('return extractTextFromPdf(blob)');
  assert.ok(cneExtractionMatch, 'CNE learning material extraction must use extractTextFromPdf');
  assert.ok(refExtractionMatch, 'Reference Library extraction must use extractTextFromPdf');
});

runTest('No application-defined file size limits (3MB, 5MB, 10MB, 25MB) exist for Reference Library', () => {
  // indexReferenceLibraryResource must not have any 25MB or 3MB size check
  const indexMatch = codeGs.match(/function\\s+indexReferenceLibraryResource\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(indexMatch, 'indexReferenceLibraryResource must exist in Code.gs');
  assert.ok(!indexMatch[0].includes('25 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 25 MB limit');
  assert.ok(!indexMatch[0].includes('3 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 3 MB limit');
  assert.ok(!indexMatch[0].includes('5 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 5 MB limit');
  assert.ok(!indexMatch[0].includes('10 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 10 MB limit');

  // uploadNursingReferenceResource must not restrict reference textbooks to 3MB or 25MB
  const uploadRefMatch = codeGs.match(/function\\s+uploadNursingReferenceResource\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(uploadRefMatch, 'uploadNursingReferenceResource must exist in Code.gs');
  assert.ok(!uploadRefMatch[0].includes('3 * 1024 * 1024'), 'uploadNursingReferenceResource must not have 3 MB limit');
  assert.ok(!uploadRefMatch[0].includes('25 * 1024 * 1024'), 'uploadNursingReferenceResource must not have 25 MB limit');
});

runTest('Scanned/image-only PDFs return NO_EXTRACTABLE_CONTENT with helpful guidance', () => {
  assert.ok(
    codeGs.includes("'NO_EXTRACTABLE_CONTENT'"),
    'Code.gs must return NO_EXTRACTABLE_CONTENT error code'
  );
  assert.ok(
    codeGs.includes('This PDF does not contain usable text. Please upload a text-based PDF.'),
    'Code.gs must provide clear user-facing message for scanned/image-only PDFs'
  );
});

runTest('OCR is completely absent from PDF extraction engine', () => {
  assert.ok(
    !codeGs.includes('ocr: true') && !codeGs.includes('ocr:true'),
    'Code.gs must not contain Drive OCR conversions (ocr: true)'
  );
  assert.ok(
    !codeGs.includes('Drive.Files.insert'),
    'Code.gs must not call Drive.Files.insert for OCR conversion'
  );
  assert.ok(
    !codeGs.includes('temp_extract_'),
    'Code.gs must not create temporary Docs files for OCR'
  );
});

// =============================================================================
// 5. Deterministic Chunking & Indexing Schema (Phase 4A)
// =============================================================================
runTest('CNE_Reference_Index sheet headers and header aliases are correctly configured', () => {
  assert.ok(codeGs.includes("'CNE_Reference_Index': ["), "CNE_Reference_Index must be registered in CNE_SHEET_HEADERS");

  const requiredHeaders = [
    'Index ID',
    'Source Type',
    'CNE ID',
    'Drive File ID',
    'Resource Title',
    'Topic',
    'Section / Heading',
    'Chunk Index',
    'Chunk Text',
    'Clinical Keywords',
    'Extraction Status',
    'Updated At'
  ];

  for (const h of requiredHeaders) {
    assert.ok(codeGs.includes(\`'\${h}'\`), \`Header '\${h}' must be present in Code.gs\`);
  }

  assert.ok(codeGs.includes("'indexid':"), 'indexid alias must exist');
  assert.ok(codeGs.includes("'chunktext':"), 'chunktext alias must exist');
  assert.ok(codeGs.includes("'sectionheading':"), 'sectionheading alias must exist');
});

runTest('Deterministic text chunking respects 1,000-1,500 character boundaries and word limits', () => {
  function splitTextIntoWindows(text, targetSize, overlap) {
    const result = [];
    if (!text) return result;
    if (text.length <= targetSize) {
      result.push(text);
      return result;
    }
    let pos = 0;
    while (pos < text.length) {
      const end = pos + targetSize;
      if (end >= text.length) {
        const remaining = text.substring(pos).trim();
        if (remaining) result.push(remaining);
        break;
      }
      let breakPos = -1;
      const searchStart = pos + Math.floor(targetSize * 0.7);
      const searchEnd = Math.min(pos + targetSize + 150, text.length);
      const searchSlice = text.substring(searchStart, searchEnd);

      const pIdx = searchSlice.lastIndexOf('\\n\\n');
      if (pIdx !== -1) {
        breakPos = searchStart + pIdx + 2;
      } else {
        const sMatch = searchSlice.match(/[\\.\\?!]\\s+/g);
        if (sMatch) {
          const lastS = searchSlice.lastIndexOf(sMatch[sMatch.length - 1]);
          if (lastS !== -1) {
            breakPos = searchStart + lastS + sMatch[sMatch.length - 1].length;
          }
        }
      }
      if (breakPos === -1) {
        const spaceIdx = searchSlice.lastIndexOf(' ');
        breakPos = spaceIdx !== -1 ? (searchStart + spaceIdx + 1) : end;
      }
      const chunk = text.substring(pos, breakPos).trim();
      if (chunk) result.push(chunk);
      pos = Math.max(pos + 1, breakPos - overlap);
    }
    return result;
  }

  let text = 'Clinical nursing procedure guideline. ';
  for (let i = 0; i < 100; i++) {
    text += \`Step \${i + 1}: Check vital signs, administer prescribed medication, and monitor patient response. \`;
  }

  const windows = splitTextIntoWindows(text, 1200, 150);
  assert.ok(windows.length > 2, 'Long text should produce multiple windows');

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    assert.ok(w.length <= 1500, \`Window exceeds max boundary: \${w.length}\`);
    assert.ok(!w.startsWith(' '), 'Window should not begin with leading whitespace');
    assert.ok(!w.endsWith(' '), 'Window should not end with trailing whitespace');
  }
});

runTest('Replacement and duplicate handling selectively manage index rows without clearContents()', () => {
  // Ensure NO clearContents calls
  assert.ok(!codeGs.includes('clearContents()'), 'Code.gs must have ZERO clearContents() calls');
  assert.ok(!backendGs.includes('clearContents()'), 'backend wrapper must have ZERO clearContents() calls');

  // Surgical bottom-up deletion logic check
  assert.ok(
    codeGs.includes('deleteSheetRowsByIndices') || codeGs.includes('cleanUpIndexRowsForCNE'),
    'Code.gs must implement surgical index row cleanup'
  );
});

// =============================================================================
// 6. Clinical Relevance Retrieval Gate & Procedural Taxonomy (Phase 4D.1)
// =============================================================================
runTest('passesClinicalRelevanceGate and CLINICAL_PROCEDURAL_TAXONOMY are present in Code.gs', () => {
  assert.ok(
    codeGs.includes('function passesClinicalRelevanceGate('),
    'passesClinicalRelevanceGate must be defined in Code.gs'
  );
  assert.ok(
    codeGs.includes('CLINICAL_PROCEDURAL_TAXONOMY'),
    'CLINICAL_PROCEDURAL_TAXONOMY must exist in Code.gs'
  );
  const gateCallCount = (codeGs.match(/passesClinicalRelevanceGate\\(cleanTopic,/g) || []).length;
  assert.ok(
    gateCallCount >= 2,
    'passesClinicalRelevanceGate must be evaluated for both uploaded and reference library chunks'
  );
});

runTest('Clinical relevance gate filters generic terms and prevents cross-procedural contamination', () => {
  // Extract taxonomy and gate function from Code.gs
  const taxonomyMatch = codeGs.match(/var CLINICAL_PROCEDURAL_TAXONOMY = (\\[[\\s\\S]*?\\n\\]);/);
  assert.ok(taxonomyMatch, 'Could not extract CLINICAL_PROCEDURAL_TAXONOMY from Code.gs');
  const CLINICAL_PROCEDURAL_TAXONOMY = eval(taxonomyMatch[1]);

  const gateStart = codeGs.indexOf('function passesClinicalRelevanceGate(');
  const gateEnd = codeGs.indexOf('function retrieveCNETopicEvidence(');
  assert.ok(gateStart !== -1 && gateEnd !== -1, 'Could not locate gate function boundaries');
  const gateCode = codeGs.substring(gateStart, gateEnd);

  const passesClinicalRelevanceGate = new Function('CLINICAL_PROCEDURAL_TAXONOMY', \`
    \${gateCode}
    return passesClinicalRelevanceGate;
  \`)(CLINICAL_PROCEDURAL_TAXONOMY);

  // 1. Generic clinical vocabulary alone must FAIL
  const genericChunk = {
    resourceTitle: 'General Clinical Nursing Procedures',
    topic: 'Clinical Skills',
    sectionHeading: 'General Patient Care Guidelines',
    clinicalKeywords: 'catheter, sterile, dressing, patient, care, nursing, procedure, infusion, monitoring, access, insertion',
    chunkText: 'The nurse should adhere to standard sterile technique when performing nursing care and procedures. Proper access and site selection ensures optimal patient management and infusion monitoring.'
  };

  assert.strictEqual(
    passesClinicalRelevanceGate('IV Cannulation', genericChunk),
    false,
    'Generic clinical terms alone must NOT qualify for IV Cannulation'
  );
  assert.strictEqual(
    passesClinicalRelevanceGate('Foley Catheterization', genericChunk),
    false,
    'Generic clinical terms alone must NOT qualify for Foley Catheterization'
  );

  // 2. Cross-procedural contamination: Foley chunk must NOT qualify for IV Cannulation
  const foleyChunk = {
    resourceTitle: 'Nursing Skills Handbook',
    topic: 'Urinary Catheterization',
    sectionHeading: 'Foley Catheter Insertion Technique and Balloon Inflation',
    clinicalKeywords: 'foley catheter, urinary retention, bladder, sterile field, retention balloon, drainage bag, sterile water',
    chunkText: 'Insert the Foley catheter into the urinary meatus until urine flashback is noted in the tubing. Inflate the retention balloon with 10 mL of sterile water and connect to the gravity drainage bag.'
  };

  assert.strictEqual(
    passesClinicalRelevanceGate('IV Cannulation', foleyChunk),
    false,
    'Foley catheter chunk must NOT qualify for IV Cannulation'
  );
  assert.strictEqual(
    passesClinicalRelevanceGate('Foley Catheterization', foleyChunk),
    true,
    'Foley catheter chunk MUST qualify for Foley Catheterization'
  );

  // 3. Genuine IV Cannulation chunk
  const ivChunk = {
    resourceTitle: 'Clinical Nursing Practice',
    topic: 'Vascular Access',
    sectionHeading: 'Peripheral IV Cannulation and Vein Selection',
    clinicalKeywords: 'iv cannulation, peripheral iv, venipuncture, tourniquet, vein, flashback, cannula gauge, catheter stabilization',
    chunkText: 'Apply the tourniquet 10-15 cm above the intended venipuncture site. Palpate the vein, clean with chlorhexidine, insert the IV cannula at a 15 to 30-degree angle until blood flashback appears in the chamber, then advance the catheter into the vein.'
  };

  assert.strictEqual(
    passesClinicalRelevanceGate('IV Cannulation', ivChunk),
    true,
    'Genuine IV Cannulation chunk MUST qualify for IV Cannulation query'
  );
  assert.strictEqual(
    passesClinicalRelevanceGate('Foley Catheterization', ivChunk),
    false,
    'IV Cannulation chunk must NOT qualify for Foley Catheterization query'
  );
});

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL PDF RESOURCES, INDEXING & EVIDENCE TESTS PASSED!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-pdf-resources-and-indexing.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-system-integration.js =====
  {
    id: "integration",
    name: "System Integration",
    originalFilename: "verify-system-integration.js",
    mode: "module",
    expectedChecks: 19,
    sha256: "8a12827a93e8057479ad9d9c612024b6c9189aea9e7188c0300013767bb7aeb5",
    source: `/**
 * Permanent System Integration Verification Suite
 * scripts/verify-system-integration.js
 *
 * Verifies cross-cutting wiring and architectural integrity:
 * 1. Frontend API ↔ Apps Script Router Consistency
 * 2. Code.gs Synchronization with TypeScript mirror
 * 3. Navigation / View Integrity (canonical page IDs)
 * 4. CNE Sheet Architecture & No obsolete Time column
 * 5. CNE Lifecycle Architecture (single source of truth in CNE Schedule)
 * 6. Gemini Architecture (authoritative Apps Script-only implementation)
 * 7. PDF Resource Policy (CNE learning material vs Reference Library)
 * 8. Critical File Existence (canonical file tree locations)
 * 9. Environment Safety (no exposed keys, secrets, or hardcoded spreadsheet IDs)
 * 10. Active API Methods & Cleanup Candidate Detection
 * 11. Shared Date-Time Architecture across all CNE workflows
 * 12. QR Post-Test Email OTP identity verification (Internal + External)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================');
console.log('System Integration Verification');
console.log('========================================================\\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// Read core source files
const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');
const appTs = fs.readFileSync('src/App.tsx', 'utf8');
const topToolbarTs = fs.readFileSync('src/components/TopToolbar.tsx', 'utf8');
const cneScheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const unscheduledModalTs = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
const departmentalModalTs = fs.readFileSync('src/components/cne/DepartmentalScheduleModal.tsx', 'utf8');
const addResourceModalTs = fs.readFileSync('src/components/cne/AddResourceModal.tsx', 'utf8');
const learningResPageTs = fs.readFileSync('src/components/cne/LearningResourcesPage.tsx', 'utf8');
const postTestModalTs = fs.readFileSync('src/components/cne/CNEPostTestModal.tsx', 'utf8');
const cneQrModalTs = fs.readFileSync('src/components/cne/CNEQRModal.tsx', 'utf8');
const cneReferenceModalTs = fs.readFileSync('src/components/cne/CNEReferenceModal.tsx', 'utf8');
const cneHomeTs = fs.readFileSync('src/components/CneHomePage.tsx', 'utf8');
const envExample = fs.readFileSync('.env.example', 'utf8');

// Helper to recursively collect files
function getFilesRecursively(dir, filterExts = ['.ts', '.tsx']) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        results = results.concat(getFilesRecursively(fullPath, filterExts));
      }
    } else if (filterExts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// -----------------------------------------------------------------------------
// 1. Frontend API ↔ Apps Script Router Consistency
// -----------------------------------------------------------------------------
runTest('Frontend API actions match Apps Script router', () => {
  // Extract all cases from Code.gs router switch(action) block
  const backendCases = new Set();
  const caseRegex = /case\\s+'([^']+)'\\s*:/g;
  let match;
  while ((match = caseRegex.exec(codeGs)) !== null) {
    backendCases.add(match[1]);
  }

  // Extract all executeAction calls in src/services/api.ts
  const frontendActions = new Set();
  const actionRegex = /executeAction(?:<[\\s\\S]*?>)?\\s*\\(\\s*'([^']+)'/g;
  while ((match = actionRegex.exec(apiTs)) !== null) {
    frontendActions.add(match[1]);
  }

  assert.ok(frontendActions.size > 20, 'Should extract multiple active frontend actions from api.ts');
  assert.ok(backendCases.size > 20, 'Should extract multiple backend router cases from Code.gs');

  // Verify that every active frontend action has a matching backend case
  const unhandledActions = [];
  for (const action of frontendActions) {
    if (!backendCases.has(action)) {
      unhandledActions.push(action);
    }
  }

  assert.strictEqual(
    unhandledActions.length,
    0,
    \`Frontend actions with no backend router case: \${unhandledActions.join(', ')}\`
  );

  // Check for duplicated router cases in the main switch block
  const mainSwitchMatch = codeGs.match(/switch\\s*\\(\\s*action\\s*\\)\\s*\\{([\\s\\S]*?)\\n\\s*default:/);
  assert.ok(mainSwitchMatch, 'Main switch(action) block must exist in Code.gs');
  const switchBody = mainSwitchMatch[1];
  const switchCases = [];
  const switchCaseRegex = /case\\s+'([^']+)'\\s*:/g;
  while ((match = switchCaseRegex.exec(switchBody)) !== null) {
    switchCases.push(match[1]);
  }

  const seenCases = new Set();
  const duplicateCases = [];
  for (const c of switchCases) {
    if (seenCases.has(c)) {
      duplicateCases.push(c);
    }
    seenCases.add(c);
  }

  assert.strictEqual(
    duplicateCases.length,
    0,
    \`Duplicated active router case names in Code.gs: \${duplicateCases.join(', ')}\`
  );
});

// -----------------------------------------------------------------------------
// 2. Code.gs Synchronization
// -----------------------------------------------------------------------------
runTest('Code.gs synchronized with TypeScript mirror', () => {
  // Normalize Code.gs using the established wrapper convention from scripts/sync-apps-script.js
  const escaped = codeGs
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/\`/g, '\\\\\`')
    .replace(/\\$\\{/g, '\\\\\${');

  const expectedMirrorContent = \`/**
 * Google Apps Script Source Export
 * Authoritative source: Code.gs
 * This file is automatically synchronized from Code.gs
 */
export const APPS_SCRIPT_SOURCE_CODE = \\\`\${escaped}\\\`;

export const GOOGLE_APPS_SCRIPT_CODE = APPS_SCRIPT_SOURCE_CODE;
\`;

  assert.strictEqual(
    backendGs,
    expectedMirrorContent,
    'src/backend/googleAppsScript.ts has diverged from Code.gs. Run "npm run sync:gas" to re-synchronize.'
  );
});

// -----------------------------------------------------------------------------
// 3. Navigation / View Integrity
// -----------------------------------------------------------------------------
runTest('Canonical navigation IDs (cne-schedule, my-cne-records)', () => {
  // ViewMode in types.ts must have canonical IDs
  assert.ok(
    typesTs.includes("'cne-schedule'"),
    "types.ts ViewMode must contain canonical view ID 'cne-schedule'"
  );
  assert.ok(
    typesTs.includes("'my-cne-records'"),
    "types.ts ViewMode must contain canonical view ID 'my-cne-records'"
  );

  // ViewMode in types.ts must NOT use obsolete primary IDs
  const viewModeMatch = typesTs.match(/export\\s+type\\s+ViewMode\\s*=([\\s\\S]*?);/);
  assert.ok(viewModeMatch, 'ViewMode type definition must exist in types.ts');
  const viewModeBody = viewModeMatch[1];

  assert.ok(
    !viewModeBody.includes("'upcoming'"),
    "ViewMode must not include obsolete primary identifier 'upcoming'"
  );
  assert.ok(
    !viewModeBody.includes("'my-cne'"),
    "ViewMode must not include obsolete primary identifier 'my-cne' (should be 'my-cne-records')"
  );

  // TopToolbar must use canonical IDs for primary navigation
  assert.ok(
    topToolbarTs.includes("id: 'cne-schedule'"),
    "TopToolbar must register primary tab 'cne-schedule'"
  );
  assert.ok(
    topToolbarTs.includes("id: 'my-cne-records'"),
    "TopToolbar must register primary tab 'my-cne-records'"
  );

  // App.tsx must route canonical IDs
  assert.ok(
    appTs.includes("activeView === 'cne-schedule'"),
    "App.tsx must render view for 'cne-schedule'"
  );
  assert.ok(
    appTs.includes("activeView === 'my-cne-records'"),
    "App.tsx must render view for 'my-cne-records'"
  );

  // Legitimate uses such as upcomingCount or UpcomingClassesWidget are allowed
  assert.ok(
    topToolbarTs.includes('upcomingCount'),
    "Legitimate use 'upcomingCount' for badge count must be preserved"
  );

  // Backend naming cleanup & canonical identifiers
  assert.ok(
    codeGs.includes('function handleCreateCNE('),
    "Code.gs must define canonical 'handleCreateCNE'"
  );
  assert.ok(
    !codeGs.includes('handleAddCNE'),
    "Code.gs must not contain obsolete function name 'handleAddCNE'"
  );
  assert.ok(
    codeGs.includes('function getCNEScheduleRecord('),
    "Code.gs must define canonical 'getCNEScheduleRecord'"
  );
  assert.ok(
    !codeGs.includes('getCNEClassRecord'),
    "Code.gs must not contain obsolete function name 'getCNEClassRecord'"
  );
  assert.ok(
    codeGs.includes("params.scope === 'my-cne-records'"),
    "Code.gs must check canonical scope 'my-cne-records'"
  );
  assert.ok(
    !codeGs.includes("scope === 'my-cne'"),
    "Code.gs must not contain legacy scope 'my-cne'"
  );
  assert.ok(
    codeGs.includes("id: 'ql-cne-schedule'"),
    "Code.gs default quick links must use 'ql-cne-schedule'"
  );
  assert.ok(
    !codeGs.includes("'ql-upcoming'"),
    "Code.gs must not contain obsolete quick link ID 'ql-upcoming'"
  );

  const quickLinkMatch = codeGs.match(/\\{\\s*id:\\s*'ql-cne-schedule'[\\s\\S]*?target:\\s*'([^']+)'/);
  assert.ok(quickLinkMatch, "Backend default quick link 'ql-cne-schedule' must be defined in Code.gs");
  assert.strictEqual(quickLinkMatch[1], 'cne-schedule', "Backend default quick link target must be 'cne-schedule'");
});

runTest('My CNE Records remains personal for every role and Material modal does not repeat Resource Person', () => {
  const recordsSection = codeGs.substring(
    codeGs.indexOf('function handleGetCNERecords('),
    codeGs.indexOf('function handleCreateCNE(')
  );

  assert.ok(
    recordsSection.includes('if (isMyRecordsOnly && !isResourcePerson && !isStaffParticipant)'),
    'my-cne-records must filter strictly to the logged-in user participation/RP records for every role'
  );
  assert.ok(
    !recordsSection.includes('!isAdmin && !isResourcePerson && !isStaffParticipant'),
    'Admin must not bypass personal-record filtering in my-cne-records scope'
  );

  assert.ok(
    !cneReferenceModalTs.includes('Resource Person / Speaker'),
    'CNE Schedule Material modal must not repeat the Resource Person field'
  );
  assert.ok(
    !cneReferenceModalTs.includes('resourcePersonName: resourcePerson'),
    'Material modal must not submit a separately edited Resource Person name'
  );
});

// -----------------------------------------------------------------------------
// 4. CNE Sheet Architecture & No Time Column
// -----------------------------------------------------------------------------
runTest('CNE Schedule sheet architecture & no obsolete Time column', () => {
  // Check CNE_SHEET_HEADERS in Code.gs
  const sheetHeadersMatch = codeGs.match(/var\\s+CNE_SHEET_HEADERS\\s*=\\s*\\{([\\s\\S]*?)\\n\\};/);
  assert.ok(sheetHeadersMatch, 'CNE_SHEET_HEADERS definition must exist in Code.gs');
  const headersObjText = sheetHeadersMatch[1];

  // Confirm 'CNE Schedule' is registered
  assert.ok(
    headersObjText.includes("'CNE Schedule':"),
    "CNE_SHEET_HEADERS must define 'CNE Schedule' sheet"
  );

  // Confirm NO active separate lifecycle 'Data' or 'Data Master' sheets exist
  assert.ok(
    !headersObjText.includes("'Data':") && !headersObjText.includes('"Data":'),
    "No active separate lifecycle 'Data' sheet may be defined in CNE_SHEET_HEADERS"
  );
  assert.ok(
    !headersObjText.includes("'Data Master':") && !headersObjText.includes('"Data Master":'),
    "No active separate lifecycle 'Data Master' sheet may be defined in CNE_SHEET_HEADERS"
  );

  // Extract CNE Schedule headers array
  const cneSchedHeadersMatch = codeGs.match(/'CNE Schedule':\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(cneSchedHeadersMatch, "CNE Schedule headers array must be present in Code.gs");
  const headers = eval(\`[\${cneSchedHeadersMatch[1]}]\`);

  const requiredCurrentHeaders = [
    'CNE ID',
    'Topic',
    'Ward Name / Area',
    'From Date',
    'To Date',
    'Duration',
    'Resource Person Emp Id',
    'Mode of Teaching',
    'Description',
    'Max Participants',
    'Status',
    'Type of CNE',
    'External Resource Persons',
    'Staff Emp ID',
    'Staff Count',
    'External Staff Participants',
    'Proposed By',
    'Admin Remarks',
    'Remarks',
    'CreatedAt',
    'CreatedBy'
  ];

  for (const h of requiredCurrentHeaders) {
    assert.ok(headers.includes(h), \`CNE Schedule schema must include required header '\${h}'\`);
  }

  // Obsolete separate 'Time' column is not present
  assert.ok(
    !headers.includes('Time'),
    "Obsolete separate 'Time' column must NOT be present in CNE Schedule headers"
  );
  assert.ok(
    !headers.some(h => h.trim().toLowerCase() === 'time'),
    "No case variation of 'Time' may exist in CNE Schedule headers"
  );

  // Verify setupAndVerifyCNESheets does not recreate Time column and actively deletes it
  assert.ok(
    codeGs.includes("tabName === 'CNE Schedule'") && codeGs.includes("normH === 'time'"),
    "setupAndVerifyCNESheets must actively identify and clean up any legacy 'Time' column"
  );
  assert.ok(
    codeGs.includes("sheet.deleteColumn("),
    "setupAndVerifyCNESheets must delete legacy 'Time' column if encountered"
  );
});

// -----------------------------------------------------------------------------
// 5. CNE Lifecycle Architecture
// -----------------------------------------------------------------------------
runTest('CNE Schedule lifecycle architecture (in-place status update, no separate table)', () => {
  // Finalize updates existing CNE Schedule row to Completed
  assert.ok(
    codeGs.includes("function handleFinalizeCNE("),
    "handleFinalizeCNE function must exist in Code.gs"
  );
  assert.ok(
    codeGs.includes("cneSheet.getRange(liveRecord.rowIndex, statusCol).setValue('Completed')"),
    "handleFinalizeCNE must update existing CNE Schedule record status to 'Completed'"
  );

  // Cancel updates existing CNE Schedule row to Canceled
  assert.ok(
    codeGs.includes("function handleCancelCNE("),
    "handleCancelCNE function must exist in Code.gs"
  );
  assert.ok(
    codeGs.includes("upcomingSheet.getRange(liveRecord.rowIndex, statusCol).setValue('Canceled')"),
    "handleCancelCNE must update existing CNE Schedule record status to 'Canceled'"
  );

  // No active finalize path copies data into a separate lifecycle sheet (e.g. Data or Data Master)
  const finalizeCodeMatch = codeGs.match(/function\\s+handleFinalizeCNE\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(finalizeCodeMatch, "handleFinalizeCNE definition must be extractable");
  const finalizeCode = finalizeCodeMatch[0];

  assert.ok(
    !finalizeCode.includes("getSheetByName('Data')") && !finalizeCode.includes('getSheetByName("Data")'),
    "handleFinalizeCNE must not write to a separate 'Data' sheet"
  );
  assert.ok(
    !finalizeCode.includes("getSheetByName('Data Master')") && !finalizeCode.includes('getSheetByName("Data Master")'),
    "handleFinalizeCNE must not write to a separate 'Data Master' sheet"
  );
});

// -----------------------------------------------------------------------------
// 6. Gemini Architecture
// -----------------------------------------------------------------------------
runTest('Gemini architecture (Apps Script caller, Script Properties, no client secrets)', () => {
  // 1. Frontend AI generation uses Apps Script actions
  assert.ok(
    apiTs.includes("executeAction<CNEQuestion[]>('generateCNEQuestions'"),
    "Frontend ApiService.generateCNEQuestions must route through Apps Script action 'generateCNEQuestions'"
  );
  assert.ok(
    !apiTs.includes("executeAction<CNEQuestion[]>('generateAiQuestions'"),
    "Frontend ApiService must NOT expose obsolete generateAiQuestions"
  );
  assert.ok(
    !apiTs.includes("static async generateAiQuestions") &&
    !apiTs.includes("static async reserveAiQuota") &&
    !apiTs.includes("static async commitAiQuota") &&
    !apiTs.includes("static async releaseAiQuota"),
    "Obsolete frontend AI methods (generateAiQuestions, reserveAiQuota, commitAiQuota, releaseAiQuota) must be removed from api.ts"
  );

  // 2. Apps Script router exposes only generateCNEQuestions and getAiQuota; obsolete router actions removed
  const codeGsRouterMatch = codeGs.match(/switch\\s*\\(\\s*action\\s*\\)\\s*\\{([\\s\\S]*?)\\n\\s*default:/);
  assert.ok(codeGsRouterMatch, "Code.gs must have switch(action) router");
  const routerBody = codeGsRouterMatch[1];
  assert.ok(routerBody.includes("case 'generateCNEQuestions':"), "Router must include generateCNEQuestions");
  assert.ok(routerBody.includes("case 'getAiQuota':"), "Router must include getAiQuota");
  assert.ok(!routerBody.includes("case 'generateAiQuestions':"), "Router must NOT expose obsolete generateAiQuestions");
  assert.ok(!routerBody.includes("case 'reserveAiQuota':"), "Router must NOT expose obsolete reserveAiQuota");
  assert.ok(!routerBody.includes("case 'commitAiQuota':"), "Router must NOT expose obsolete commitAiQuota");
  assert.ok(!routerBody.includes("case 'releaseAiQuota':"), "Router must NOT expose obsolete releaseAiQuota");
  assert.ok(!routerBody.includes("case 'validateAiQuotaReservation':"), "Router must NOT expose obsolete validateAiQuotaReservation");

  // 3. Internal quota and generation helpers remain intact
  assert.ok(codeGs.includes("function handleReserveAiQuota("), "Internal handleReserveAiQuota helper must remain intact");
  assert.ok(codeGs.includes("function handleCommitAiQuota("), "Internal handleCommitAiQuota helper must remain intact");
  assert.ok(codeGs.includes("function handleReleaseAiQuota("), "Internal handleReleaseAiQuota helper must remain intact");
  assert.ok(codeGs.includes("function handleValidateAiQuotaReservation("), "Internal handleValidateAiQuotaReservation helper must remain intact");
  assert.ok(codeGs.includes("function generateAiQuestionsInternal("), "Internal generateAiQuestionsInternal helper must exist");
  assert.ok(codeGs.includes("function handleGenerateCNEQuestions("), "handleGenerateCNEQuestions must exist");

  // 4. Frontend does not call /api/ai/generate-questions
  const frontendFiles = getFilesRecursively('src');
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('/api/ai/generate-questions'),
      \`File \${file} must not call obsolete endpoint /api/ai/generate-questions\`
    );
  }

  // 5. No active Cloudflare Gemini function exists
  const hasCloudflareFunctions = fs.existsSync('functions') || fs.existsSync('worker') || fs.existsSync('workers');
  assert.strictEqual(
    hasCloudflareFunctions,
    false,
    'No Cloudflare Functions or Workers directory should exist for Gemini generation'
  );

  // 6. Gemini API key is not referenced in browser/client source
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('GEMINI_API_KEY'),
      \`Client file \${file} must not reference GEMINI_API_KEY\`
    );
    assert.ok(
      !content.includes('AIzaSy'),
      \`Client file \${file} must not contain any hardcoded Google API key\`
    );
  }

  // 7. Apps Script contains the only active production Gemini caller
  assert.ok(
    codeGs.includes("generativelanguage.googleapis.com"),
    "Code.gs must contain the active Gemini API endpoint caller"
  );
  assert.ok(
    codeGs.includes("UrlFetchApp.fetch("),
    "Code.gs must call Gemini via UrlFetchApp.fetch"
  );

  // 8. Apps Script reads Gemini configuration from Script Properties
  assert.ok(
    codeGs.includes("props.getProperty('GEMINI_API_KEY')"),
    "Code.gs must read GEMINI_API_KEY from Script Properties"
  );

  // 9. @google/genai is removed from package.json
  const pkgContent = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasGenAi = (pkgContent.dependencies && pkgContent.dependencies['@google/genai']) ||
                   (pkgContent.devDependencies && pkgContent.devDependencies['@google/genai']);
  assert.ok(!hasGenAi, "@google/genai must not be present in package.json");

  // 10. Exactly one production Gemini implementation - server.ts is retained strictly for local/preview hosting
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert.ok(
    !serverTs.includes('generateContent') && !serverTs.includes('genai'),
    "server.ts must not implement a secondary/redundant Gemini caller"
  );
  assert.ok(
    !serverTs.includes('SpreadsheetApp') && !serverTs.includes('handleLogin') && !serverTs.includes('handleGetCNE'),
    "server.ts must contain no CNE backend or Google Sheets logic"
  );
});

// -----------------------------------------------------------------------------
// 7. PDF Resource Policy
// -----------------------------------------------------------------------------
runTest('PDF resource policy (CNE 3MB limit vs Reference Library policy)', () => {
  // CNE Learning Material: PDF only, 3 MB maximum in both frontend and backend
  assert.ok(
    addResourceModalTs.includes("3 * 1024 * 1024"),
    "AddResourceModal must enforce 3 MB limit for CNE learning material"
  );
  assert.ok(
    codeGs.includes("fileSize > 3 * 1024 * 1024"),
    "Code.gs uploadLearningResource must enforce 3 MB limit"
  );
  const uploadLearningResourceSection = codeGs.substring(
    codeGs.indexOf('function handleUploadLearningResource'),
    codeGs.indexOf('function handleDeleteLearningResource')
  );
  assert.ok(
    (uploadLearningResourceSection.includes("ext === 'pdf'") ||
      (uploadLearningResourceSection.includes("var ALLOWED_EXTS = ['pdf']") &&
        uploadLearningResourceSection.includes('ALLOWED_EXTS.indexOf(ext) === -1'))) &&
      uploadLearningResourceSection.includes('0x25') &&
      uploadLearningResourceSection.includes('0x50') &&
      uploadLearningResourceSection.includes('0x44') &&
      uploadLearningResourceSection.includes('0x46'),
    "Code.gs uploadLearningResource must enforce PDF extension and %PDF binary signature"
  );

  // Reference Library: PDF only, Admin-only management
  assert.ok(
    learningResPageTs.includes("const isAdmin = user?.role === 'ADMIN';"),
    "LearningResourcesPage must restrict admin operations"
  );
  assert.ok(
    codeGs.includes("requireAdmin(session)") || codeGs.includes("handleAdminAction"),
    "Code.gs must enforce Admin authority for reference library operations"
  );

  // Reference Library does NOT inherit the CNE 3 MB limit for Drive indexing
  // Check indexReferenceLibraryResource does not check 3MB limit
  const indexMatch = codeGs.match(/function\\s+indexReferenceLibraryResource\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(indexMatch, "indexReferenceLibraryResource must exist in Code.gs");
  assert.ok(
    !indexMatch[0].includes("3 * 1024 * 1024"),
    "indexReferenceLibraryResource must not restrict reference textbooks to 3 MB"
  );

  // Confirm no shared global constant inadvertently applies 3 MB to the reference library
  assert.ok(
    !typesTs.includes('MAX_FILE_SIZE') && !typesTs.includes('MAX_RESOURCE_SIZE'),
    "types.ts should not define a shared global size limit that binds Reference Library to CNE 3MB limit"
  );
});

// -----------------------------------------------------------------------------
// 8. Critical File Existence
// -----------------------------------------------------------------------------
runTest('Critical file existence (canonical repository paths)', () => {
  const criticalFiles = [
    'src/App.tsx',
    'src/components/CNESchedule.tsx',
    'src/components/MyCNERecords.tsx',
    'src/components/cne/LearningResourcesPage.tsx',
    'src/components/cne/CneDateTimeFields.tsx',
    'src/components/cne/ConfirmDatePicker.tsx',
    'src/services/api.ts',
    'Code.gs',
    'src/backend/googleAppsScript.ts'
  ];

  for (const filePath of criticalFiles) {
    assert.ok(
      fs.existsSync(filePath),
      \`Critical repository file '\${filePath}' must exist\`
    );
  }
});

// -----------------------------------------------------------------------------
// 9. Environment Safety
// -----------------------------------------------------------------------------
runTest('Environment safety (no frontend secrets, no hardcoded sheet IDs, safe .env.example)', () => {
  // 1. No hardcoded GEMINI_API_KEY in frontend client files
  const frontendFiles = getFilesRecursively('src');
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('AIzaSy'),
      \`File \${file} contains what appears to be a real Google API key (AIzaSy...)\`
    );
  }

  // 2. No PASSWORD_PEPPER secret value in frontend client files
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('PASSWORD_PEPPER'),
      \`File \${file} must not reference PASSWORD_PEPPER\`
    );
  }

  // 3. No SESSION_SECRET secret value in frontend client files
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('SESSION_SECRET'),
      \`File \${file} must not reference SESSION_SECRET\`
    );
  }

  // 4. No real spreadsheet ID committed in frontend or environment example
  // Google Spreadsheet IDs are 44 characters of base64url: [a-zA-Z0-9_-]{44}
  const realSpreadsheetIdPattern = /1[a-zA-Z0-9_-]{43}/;
  assert.ok(
    !realSpreadsheetIdPattern.test(envExample),
    '.env.example must not contain a real spreadsheet ID'
  );

  // 5. .env.example contains placeholders/documentation only
  assert.ok(
    envExample.includes('VITE_APPS_SCRIPT_URL='),
    '.env.example should define VITE_APPS_SCRIPT_URL placeholder'
  );
  const lines = envExample.split('\\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  for (const line of lines) {
    const val = line.split('=')[1]?.trim() || '';
    assert.ok(
      !val.startsWith('http://') && !val.startsWith('https://'),
      \`.env.example must have an empty placeholder for URL, not a live production URL: \${line}\`
    );
  }

  // 6. Frontend API fails closed for authentication and mutations without Apps Script URL
  assert.ok(
    !apiTs.includes("? 'ADMIN' : 'ADMIN'"),
    'src/services/api.ts must not contain local ADMIN role fallback'
  );
  assert.ok(
    !apiTs.includes("token: 'preview-token-'") && !apiTs.includes("token: currentUser.token || 'mock_token_'"),
    'src/services/api.ts must never mint preview-token-* or mock_token_* session tokens'
  );
  assert.ok(
    apiTs.includes("errorCode: 'BACKEND_NOT_CONFIGURED'"),
    'src/services/api.ts must fail closed with BACKEND_NOT_CONFIGURED when Apps Script is not configured'
  );

  // 7. Frontend API caching uses explicit public CMS allowlist and never persists getCNEQuestions or protected reads
  assert.ok(
    !apiTs.includes("action.startsWith('get')"),
    'src/services/api.ts must not use generic action.startsWith(\\'get\\') for caching or offline fallback'
  );
  assert.ok(
    apiTs.includes('isPublicCacheableAction(action)'),
    'src/services/api.ts must gate browser cache persistence and offline fallback with isPublicCacheableAction(action)'
  );
});

// -----------------------------------------------------------------------------
// 10. Active API Methods & Cleanup Candidates
// -----------------------------------------------------------------------------
runTest('Active API methods wired correctly & cleanup candidates audited', () => {
  // Extract backend cases
  const backendCases = new Set();
  const caseRegex = /case\\s+'([^']+)'\\s*:/g;
  let m;
  while ((m = caseRegex.exec(codeGs)) !== null) {
    backendCases.add(m[1]);
  }

  // Extract ApiService methods
  const methodRegex = /static\\s+(?:async\\s+)?([a-zA-Z0-9_]+)\\s*\\(/g;
  const methods = [];
  while ((m = methodRegex.exec(apiTs)) !== null) {
    if (!['getAppsScriptUrl', 'executeLocalMockAction', 'executeAction', 'logout', 'getSessionUser', 'saveSessionUser', 'invalidateCache'].includes(m[1])) {
      methods.push(m[1]);
    }
  }

  // Find all caller files in src
  const allSourceFiles = getFilesRecursively('src');
  const otherFilesContent = allSourceFiles
    .filter(f => !f.endsWith('api.ts') && !f.includes('googleAppsScript.ts'))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\\n');

  const cleanupCandidates = [];
  const activeMethodsVerified = [];

  for (const method of methods) {
    // Find action called by this method
    const methodIdx = apiTs.indexOf(\`static async \${method}\`) !== -1 ? apiTs.indexOf(\`static async \${method}\`) : apiTs.indexOf(\`static \${method}\`);
    let actionName = null;
    if (methodIdx !== -1) {
      const slice = apiTs.slice(methodIdx, methodIdx + 600);
      const actMatch = slice.match(/executeAction(?:<[\\s\\S]*?>)?\\s*\\(\\s*'([^']+)'/);
      if (actMatch) {
        actionName = actMatch[1];
      }
    }

    const hasCaller = otherFilesContent.includes(\`ApiService.\${method}\`) || otherFilesContent.includes(\`\${method}(\`);
    const hasBackend = actionName ? backendCases.has(actionName) : false;

    if (actionName) {
      assert.ok(
        hasBackend,
        \`Active ApiService method '\${method}' targets nonexistent backend action '\${actionName}'\`
      );
      activeMethodsVerified.push(method);
    }

    if (!hasCaller && !hasBackend) {
      cleanupCandidates.push({ method, actionName });
    }
  }

  assert.ok(activeMethodsVerified.length > 30, 'Should verify over 30 active ApiService methods');
  assert.strictEqual(cleanupCandidates.length, 0, 'Should have 0 dead API cleanup candidates');
});

// -----------------------------------------------------------------------------
// 11. Shared Date-Time Architecture
// -----------------------------------------------------------------------------
runTest('Shared date-time architecture across all CNE creation/edit workflows', () => {
  // 1. Central CNE creation in CNESchedule.tsx
  assert.ok(
    cneScheduleTs.includes("import { CneDateTimeFields }") || cneScheduleTs.includes("CneDateTimeFields"),
    "CNESchedule.tsx must import CneDateTimeFields"
  );
  assert.ok(
    cneScheduleTs.includes('idPrefix="central-cne"') && cneScheduleTs.includes('<CneDateTimeFields'),
    "Central CNE creation workflow must render <CneDateTimeFields idPrefix=\\"central-cne\\" ... />"
  );

  // 2. Departmental CNE in DepartmentalScheduleModal.tsx
  assert.ok(
    departmentalModalTs.includes("import { CneDateTimeFields }") || departmentalModalTs.includes("CneDateTimeFields"),
    "DepartmentalScheduleModal.tsx must import CneDateTimeFields"
  );
  assert.ok(
    departmentalModalTs.includes('<CneDateTimeFields'),
    "Departmental CNE workflow must render <CneDateTimeFields ... />"
  );

  // 3. Unscheduled CNE in AddUnscheduledCneModal.tsx
  assert.ok(
    unscheduledModalTs.includes("import { CneDateTimeFields }") || unscheduledModalTs.includes("CneDateTimeFields"),
    "AddUnscheduledCneModal.tsx must import CneDateTimeFields"
  );
  assert.ok(
    unscheduledModalTs.includes('<CneDateTimeFields'),
    "Unscheduled CNE workflow must render <CneDateTimeFields ... />"
  );

  // 4. Edit CNE workflow in CNESchedule.tsx
  assert.ok(
    cneScheduleTs.includes('idPrefix="edit-cne"') && cneScheduleTs.includes('<CneDateTimeFields'),
    "Edit CNE workflow must render <CneDateTimeFields idPrefix=\\"edit-cne\\" ... />"
  );
});

// -----------------------------------------------------------------------------
// 12. QR Post-Test Root Deep-Link & Email OTP Participant Workflow
// -----------------------------------------------------------------------------
runTest('QR Post-Test root routing, Internal/External email OTP verification, and opaque token security', () => {
  // 1. App.tsx reads postTest query parameter on initial load.
  assert.ok(
    appTs.includes("params.get('postTest')"),
    "App.tsx must inspect window.location.search for 'postTest' query parameter"
  );

  // 2. App.tsx renders CNEPostTestModal at root level without requiring an authenticated session.
  assert.ok(
    appTs.includes("{rootQrToken && (") && appTs.includes("<CNEPostTestModal"),
    "App.tsx must render CNEPostTestModal directly at root level when rootQrToken exists"
  );

  // 3. CNESchedule.tsx no longer owns global query-param detection.
  assert.ok(
    !cneScheduleTs.includes("params.get('postTest')"),
    "CNESchedule.tsx must NOT contain duplicate postTest query parameter handling"
  );

  // 4. Public QR access uses an opaque token resolved server-side.
  assert.ok(
    cneQrModalTs.includes("/?postTest="),
    "CNEQRModal must generate public QR access URLs in canonical format /?postTest=<token>"
  );
  assert.ok(
    codeGs.includes('function resolveActiveQrToken(') && codeGs.includes('getQRTokensSheet()'),
    "Backend must resolve active opaque QR tokens through CNE_QR_Tokens"
  );
  assert.ok(
    codeGs.includes("INVALID_OR_MISSING_QR_TOKEN"),
    "Backend must reject Post-Test access without a valid opaque QR token or authorized session"
  );

  // 5. Frontend API exposes the two-stage Post-Test OTP contract.
  assert.ok(
    apiTs.includes("static async requestPostTestOtp(") &&
    apiTs.includes("executeAction<PostTestOtpRequestData>('requestPostTestOtp'"),
    "ApiService must expose requestPostTestOtp through the Apps Script router"
  );
  assert.ok(
    apiTs.includes("static async verifyPostTestOtp(") &&
    apiTs.includes("executeAction<PostTestParticipantVerificationData>('verifyPostTestOtp'"),
    "ApiService must expose verifyPostTestOtp through the Apps Script router"
  );
  assert.ok(
    !apiTs.includes('static async verifyPostTestParticipant('),
    "Legacy direct verifyPostTestParticipant frontend API must remain removed"
  );

  // 6. Public QR UI supports both participant types and requires OTP before questions load.
  assert.ok(
    postTestModalTs.includes("type ParticipantType = 'INTERNAL' | 'EXTERNAL'") &&
    postTestModalTs.includes('handleRequestOtp') &&
    postTestModalTs.includes('handleVerifyOtp') &&
    postTestModalTs.includes('ApiService.requestPostTestOtp') &&
    postTestModalTs.includes('ApiService.verifyPostTestOtp'),
    "CNEPostTestModal must implement Internal/External Send OTP -> Verify OTP flow"
  );
  assert.ok(
    postTestModalTs.includes('internalEmployeeId') &&
    postTestModalTs.includes("participantType: 'INTERNAL'") &&
    postTestModalTs.includes('externalName') &&
    postTestModalTs.includes('externalEmail') &&
    postTestModalTs.includes("participantType: 'EXTERNAL'"),
    "CNEPostTestModal must collect Employee ID for Internal users and Name + Email for External users"
  );
  assert.ok(
    postTestModalTs.includes('maskedEmail') &&
    postTestModalTs.includes('resendRemaining') &&
    postTestModalTs.includes('participantVerificationToken'),
    "CNEPostTestModal must show masked email/resend state and retain the signed participant verification token"
  );
  assert.ok(
    !postTestModalTs.includes('guestEmpIdVerified') &&
    !postTestModalTs.includes('handleGuestContinue') &&
    !postTestModalTs.includes('Date of Joining') &&
    !postTestModalTs.includes('dateOfJoining') &&
    !postTestModalTs.includes('ApiService.verifyPostTestParticipant'),
    "Legacy Employee ID + DOJ/direct participant verification UI must remain absent"
  );

  // 7. Backend Internal flow resolves Employee ID only from Officers data and sends OTP to its registered email.
  const requestOtpStart = codeGs.indexOf('function handleRequestPostTestOtp(');
  const verifyOtpStart = codeGs.indexOf('function handleVerifyPostTestOtp(');
  assert.ok(requestOtpStart >= 0 && verifyOtpStart > requestOtpStart, 'Post-Test OTP request/verify handlers must exist');
  const requestOtpSection = codeGs.substring(requestOtpStart, verifyOtpStart);
  assert.ok(
    requestOtpSection.includes("participantType === 'INTERNAL'") &&
    requestOtpSection.includes('findOfficerById(employeeId)') &&
    requestOtpSection.includes("officer.email") &&
    requestOtpSection.includes("errorCode: 'EMAIL_NOT_AVAILABLE'") &&
    requestOtpSection.includes('OTP_PURPOSE_POSTTEST_INTERNAL'),
    "Internal Post-Test OTP must resolve the employee in Officers data and use the registered EmailID"
  );

  // 8. Backend External flow derives stable identity from normalized email and does not register before OTP verification.
  assert.ok(
    requestOtpSection.includes("participantType === 'EXTERNAL'") &&
    requestOtpSection.includes('normalizeExternalEmail(') &&
    requestOtpSection.includes('makeExternalParticipantId(externalEmail)') &&
    requestOtpSection.includes('OTP_PURPOSE_POSTTEST_EXTERNAL'),
    "External Post-Test OTP request must use Name + normalized Email and derive a stable external participant ID"
  );
  assert.ok(
    !requestOtpSection.includes("'EXTERNAL_REGISTRATION'"),
    "External participant registration must not be persisted before OTP ownership is verified"
  );

  // 9. OTP challenge is bound to CNE + participant identity and duplicate submissions are blocked before sending.
  assert.ok(
    codeGs.includes('function buildPostTestOtpPrincipal(') &&
    codeGs.includes("return cne && id ? (cne + '#' + id) : ''") &&
    requestOtpSection.includes('findExistingPostTestSubmission(cneId, participantId)') &&
    requestOtpSection.includes("errorCode: 'ALREADY_SUBMITTED'"),
    "Post-Test OTP must be CNE-bound and reject participants who already submitted"
  );

  // 10. Verification validates the challenge binding, persists external registration only after success,
  //     consumes the challenge, and issues the signed participant token used to load/submit the test.
  const verifyOtpEnd = codeGs.indexOf('function handleVerifyPostTestParticipant(', verifyOtpStart);
  assert.ok(verifyOtpEnd > verifyOtpStart, 'Legacy compatibility handler must follow handleVerifyPostTestOtp');
  const verifyOtpSection = codeGs.substring(verifyOtpStart, verifyOtpEnd);
  assert.ok(
    verifyOtpSection.includes('challenge.purpose !== purpose') &&
    verifyOtpSection.includes('challenge.principalType') &&
    verifyOtpSection.includes('challenge.principalId') &&
    verifyOtpSection.includes('challenge.email') &&
    verifyOtpSection.includes("challenge.status !== 'PENDING'"),
    "Post-Test OTP verification must validate purpose, participant type, CNE-bound principal, email, and active status"
  );
  assert.ok(
    verifyOtpSection.includes("participantType === 'EXTERNAL'") &&
    verifyOtpSection.includes("'EXTERNAL_REGISTRATION'") &&
    verifyOtpSection.includes("setValue('CONSUMED')") &&
    verifyOtpSection.includes('generatePostTestParticipantVerificationToken('),
    "Successful OTP verification must persist verified external identity, consume the OTP, and issue a signed participant token"
  );

  // 11. The legacy direct verification endpoint is fail-closed unless it is used only as a challenge+OTP alias.
  const legacyVerifyStart = codeGs.indexOf('function handleVerifyPostTestParticipant(');
  const qrHandlerStart = codeGs.indexOf('function handleGetQRToken(', legacyVerifyStart);
  assert.ok(legacyVerifyStart >= 0 && qrHandlerStart > legacyVerifyStart, 'Legacy compatibility verification handler must remain bounded');
  const legacyVerifySection = codeGs.substring(legacyVerifyStart, qrHandlerStart);
  assert.ok(
    legacyVerifySection.includes('params.challengeId && params.otp') &&
    legacyVerifySection.includes('handleVerifyPostTestOtp(params, session)') &&
    legacyVerifySection.includes("errorCode: 'POST_TEST_OTP_REQUIRED'"),
    "Legacy participant verification endpoint must not allow Employee ID + DOJ or unverified Name + Email bypass"
  );

  // 12. Safe query parameter removal on close without reload.
  assert.ok(
    appTs.includes("url.searchParams.delete('postTest')") && appTs.includes("window.history.replaceState"),
    "App.tsx must remove 'postTest' query parameter using window.history.replaceState on modal close"
  );
});

// -----------------------------------------------------------------------------
// 13. Obsolete CNE Applications Subsystem Permanent Absence
// -----------------------------------------------------------------------------
runTest('CNE Applications subsystem and legacy artifacts remain permanently absent', () => {
  // 1. Obsolete frontend API methods in api.ts
  const obsoleteApiMethods = [
    'applyForClass',
    'getMyApplications',
    'getAllApplications',
    'updateApplicationStatus'
  ];
  for (const method of obsoleteApiMethods) {
    const methodRegex = new RegExp(\`\\\\b\${method}\\\\s*\\\\(\`, 'g');
    assert.ok(
      !methodRegex.test(apiTs),
      \`Frontend API method '\${method}' must be permanently absent from src/services/api.ts\`
    );
  }

  // 2. Obsolete backend router actions in Code.gs
  const obsoleteActions = [
    'applyForClass',
    'getMyApplications',
    'getAllApplications',
    'updateApplicationStatus'
  ];
  for (const action of obsoleteActions) {
    assert.ok(
      !codeGs.includes(\`case '\${action}':\`),
      \`Backend router action '\${action}' must be permanently absent from Code.gs\`
    );
  }

  // 3. Obsolete backend handlers in Code.gs
  const obsoleteHandlers = [
    'handleApplyForClass',
    'handleGetMyApplications',
    'handleGetAllApplications',
    'handleUpdateApplicationStatus'
  ];
  for (const handler of obsoleteHandlers) {
    assert.ok(
      !codeGs.includes(\`function \${handler}\`),
      \`Backend handler '\${handler}' must be permanently absent from Code.gs\`
    );
  }

  // 4. CNEApplication interface/type in types.ts
  assert.ok(
    !typesTs.includes('CNEApplication'),
    "Type/Interface 'CNEApplication' must be permanently absent from src/types.ts"
  );

  // 5. INITIAL_APPLICATIONS mock/initial data
  const allTsFiles = getFilesRecursively('src', ['.ts', '.tsx']);
  for (const file of allTsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('INITIAL_APPLICATIONS'),
      \`INITIAL_APPLICATIONS must be absent from \${file}\`
    );
    assert.ok(
      !content.includes('pendingApplicationsCount'),
      \`pendingApplicationsCount must be absent from \${file}\`
    );
  }

  // 6. pendingApplicationsCount absent from Code.gs
  assert.ok(
    !codeGs.includes('pendingApplicationsCount'),
    "pendingApplicationsCount must be absent from Code.gs"
  );

  // 7. Active CNE Applications schema absent from CNE_SHEET_HEADERS
  assert.ok(
    !codeGs.includes("'CNE Applications':"),
    "CNE Applications must be absent from CNE_SHEET_HEADERS in Code.gs"
  );

  // 8. migrateCNEApplicationsHeaderToCNEId absent
  assert.ok(
    !codeGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    "migrateCNEApplicationsHeaderToCNEId must be absent from Code.gs"
  );
  assert.ok(
    !backendGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    "migrateCNEApplicationsHeaderToCNEId must be absent from src/backend/googleAppsScript.ts"
  );

  // 9. No programmatic deleteSheet logic added
  assert.ok(
    !codeGs.includes("deleteSheet(sheet)") && !codeGs.includes("deleteSheet(cneAppSheet)"),
    "No automatic deleteSheet logic should be added to Code.gs"
  );
});

// -----------------------------------------------------------------------------
// 14. Final Production Cleanup: Obsolete Endpoints, OCR, & Real Data Permanent Absence
// -----------------------------------------------------------------------------
runTest('Obsolete production endpoints, OCR, and real employee data permanent absence', () => {
  // 1. Obsolete reviewCNE endpoint removed
  assert.ok(!apiTs.includes('static async reviewCNE'), 'ApiService.reviewCNE must be permanently absent');
  assert.ok(!codeGs.includes("case 'reviewCNE':"), "Code.gs must not contain router case 'reviewCNE'");
  assert.ok(!codeGs.includes('function handleReviewCNE'), "Code.gs must not define 'handleReviewCNE'");

  // 2. deleteCNE endpoint is Admin-only protected and verified
  assert.ok(apiTs.includes('static async deleteCNE'), 'ApiService.deleteCNE must be present');
  assert.ok(codeGs.includes("case 'deleteCNE':"), "Code.gs must contain router case 'deleteCNE'");
  assert.ok(codeGs.includes('function handleDeleteCNE'), "Code.gs must define 'handleDeleteCNE'");

  // 3. Obsolete public resolveQRToken endpoint removed
  assert.ok(!apiTs.includes('static async resolveQRToken'), 'ApiService.resolveQRToken must be permanently absent');
  assert.ok(!codeGs.includes("case 'resolveQRToken':"), "Code.gs must not contain router case 'resolveQRToken'");
  assert.ok(!codeGs.includes('function handleResolveQRToken'), "Code.gs must not define 'handleResolveQRToken'");

  // 4. Obsolete getDashboardStats removed
  assert.ok(!apiTs.includes('static async getDashboardStats'), 'ApiService.getDashboardStats must be permanently absent');
  assert.ok(!codeGs.includes("case 'getDashboardStats':"), "Code.gs must not contain router case 'getDashboardStats'");
  assert.ok(!codeGs.includes('function handleGetDashboardStats'), "Code.gs must not define 'handleGetDashboardStats'");

  // 5. OCR completely absent
  assert.ok(!codeGs.includes('ocr: true') && !codeGs.includes('ocr:true'), 'Code.gs must not contain ocr: true');
  assert.ok(!codeGs.includes('Drive.Files.insert'), 'Code.gs must not contain Drive.Files.insert');

  // 6. Real employee IDs absent from frontend source files.
  // Authentication screens intentionally show one approved example placeholder for staff:
  //   Example ID: RSNHO000001
  // Ignore only that exact placeholder in Login/Create-Reset Password screens while keeping
  // the repository-wide protection against any other RSNHO / AIIMSR / FNMDCNO identifiers.
  const frontendSourceFiles = getFilesRecursively('src', ['.ts', '.tsx']);
  for (const file of frontendSourceFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let contentForEmployeeIdScan = content;
    if (file.endsWith('src/components/LoginModal.tsx') ||
        file.endsWith('src/components/ForgotPasswordModal.tsx')) {
      contentForEmployeeIdScan = contentForEmployeeIdScan.replaceAll('Example ID: RSNHO000001', '');
    }
    if (file.endsWith('src/components/cne/CNEPostTestModal.tsx')) {
      contentForEmployeeIdScan = contentForEmployeeIdScan.replaceAll('e.g. RSNHO000001', '');
    }
    assert.ok(!contentForEmployeeIdScan.includes('RSNHO'), \`Real employee ID prefix RSNHO must be absent from \${file} except the approved Login placeholder\`);
    assert.ok(!contentForEmployeeIdScan.includes('AIIMSR'), \`Real employee ID prefix AIIMSR must be absent from \${file}\`);
    assert.ok(!contentForEmployeeIdScan.includes('FNMDCNO'), \`Real employee ID prefix FNMDCNO must be absent from \${file}\`);
  }

  // 7. handleGetCNERecords name-first privacy model
  assert.ok(
    codeGs.includes("resourcePersonEmpIdForResponse = ''") &&
    codeGs.includes("resourcePersonEmpIdForResponse = loggedInId") &&
    codeGs.includes("staffEmpIdsForResponse = []") &&
    codeGs.includes("staffNameList = staffArray.map") &&
    codeGs.includes("proposedByEmpId: canSeeInternalManagementFields ? proposedBy : ''") &&
    codeGs.includes("adminRemarks: canSeeInternalManagementFields ? adminRemarks : ''") &&
    codeGs.includes("remarks: remarks"),
    'handleGetCNERecords must show safe names/general remarks while keeping raw IDs and Admin Remarks restricted'
  );

  assert.ok(!typesTs.includes('CNEReferenceIndexChunk'), 'Unused CNEReferenceIndexChunk type must be removed');
  assert.ok(!apiTs.includes('static getCurrentUser('), 'Unused ApiService.getCurrentUser must be removed');
  assert.ok(!apiTs.includes('static isLiveBackendConnected('), 'Unused ApiService.isLiveBackendConnected must be removed');
  const officerLoaderTs = fs.readFileSync('src/services/officerLoader.ts', 'utf8');
  assert.ok(!officerLoaderTs.includes('setCachedOfficers'), 'Unused setCachedOfficers helper must be removed');

  // 8. Final cleanup symbols & Chairperson API verification
  const utilsTs = fs.readFileSync('src/utils.ts', 'utf8');
  const deadTimeHelper = ['formatCneTime', 'OrRangeShort'].join('');
  const deadStaffHelper = ['formatStaff', 'ParticipantsDisplay'].join('');
  const deadReportType = ['CNEReport', 'Stats'].join('');
  const deadChairpersonUpdate = ['updateChairperson', 'Message'].join('');
  const deadChairpersonHandler = ['handleUpdateChairperson', 'Message'].join('');

  assert.ok(!utilsTs.includes(deadTimeHelper), 'Dead utility formatCneTimeOrRangeShort must be absent from src/utils.ts');
  assert.ok(!utilsTs.includes(deadStaffHelper), 'Dead utility formatStaffParticipantsDisplay must be absent from src/utils.ts');
  assert.ok(!typesTs.includes(deadReportType), 'Dead interface CNEReportStats must be absent from src/types.ts');

  // Officer directory authorization is role-restricted. Normalize whitespace because
  // Code.gs intentionally keeps this hot-path handler compact.
  const officerDropdownSection = codeGs.substring(
    codeGs.indexOf('function handleGetOfficersDropdown('),
    codeGs.indexOf('function getOfficerNameMap(')
  );
  const compactOfficerDropdownSection = officerDropdownSection.replace(/\\s+/g, '');
  assert.ok(
    compactOfficerDropdownSection.includes("role==='ADMIN'||role==='AREA_INCHARGE'||role==='INCHARGE'") &&
    compactOfficerDropdownSection.includes("errorCode:'FORBIDDEN'") &&
    compactOfficerDropdownSection.includes('checkCNEActionAuthorized(session,rec)===null'),
    'handleGetOfficersDropdown must enforce Admin/Incharge or CNE-scoped authorization and return FORBIDDEN for unauthorized callers'
  );

  // Chairperson name/designation/message remain static. Only the photo is allowed to use Script Properties.
  assert.ok(!apiTs.includes(deadChairpersonUpdate), 'Unused updateChairpersonMessage must be absent from src/services/api.ts');
  assert.ok(!codeGs.includes(deadChairpersonUpdate), 'Unused updateChairpersonMessage router case must be absent from Code.gs');
  assert.ok(!codeGs.includes(deadChairpersonHandler), 'Unused handleUpdateChairpersonMessage handler must be absent from Code.gs');
  assert.ok(
    !apiTs.includes('static async getChairpersonMessage(') &&
    !codeGs.includes("case 'getChairpersonMessage':") &&
    !codeGs.includes('function handleUpdateChairpersonMessage(') &&
    cneHomeTs.includes('...INITIAL_CHAIRPERSON_MESSAGE') &&
    cneHomeTs.includes('ApiService.getHomeDashboard()') &&
    cneHomeTs.includes('ApiService.getChairpersonPhoto()') &&
    !cneHomeTs.includes('res.data.chairpersonPhotoUrl') &&
    !cneHomeTs.includes('ApiService.getChairpersonMessage('),
    'Chairperson text content must remain static while the photo loads independently so Drive/image latency cannot block Home Dashboard data'
  );
  assert.ok(
    !codeGs.includes('CHAIRPERSON_MESSAGE') &&
    !codeGs.includes('CHAIRPERSON_NAME') &&
    !codeGs.includes('CHAIRPERSON_DESIG') &&
    !codeGs.includes('CHAIRPERSON_PHOTO_DRIVE_ID') &&
    codeGs.includes("case 'getChairpersonPhoto':") &&
    codeGs.includes('function handleGetChairpersonPhoto()') &&
    codeGs.includes("getProperty('CHAIRPERSON_PHOTO')") &&
    apiTs.includes('static async getChairpersonPhoto'),
    'Only the CHAIRPERSON_PHOTO photo-only endpoint may remain as a Chairperson backend dependency'
  );
});


runTest('Home Dashboard reuses one CNE Schedule snapshot for Schedule and Impact', () => {
  const homeSection = codeGs.substring(
    codeGs.indexOf('function handleGetHomeDashboard('),
    codeGs.indexOf('/**\\n * Format Date Helper')
  );
  assert.ok(
    codeGs.includes('function getCNEScheduleSnapshot_(') &&
    homeSection.includes('var scheduleSnapshot = getCNEScheduleSnapshot_();') &&
    homeSection.includes("handleGetCNERecords({ status: 'Scheduled' }, null, scheduleSnapshot)") &&
    homeSection.includes('handleGetProgramImpact({}, session, scheduleSnapshot)'),
    'Home Dashboard must read CNE Schedule once and reuse the snapshot for upcoming classes and impact metrics'
  );
  assert.ok(
    !homeSection.includes('handleGetChairpersonPhoto()'),
    'Home Dashboard must not wait for Drive/remote Chairperson photo loading'
  );
});

runTest('Officer display-name map reads only Employee ID and Name columns on cache miss', () => {
  const mapSection = codeGs.substring(
    codeGs.indexOf('function getOfficerNameMap()'),
    codeGs.indexOf('/**\\n * ============================================================================\\n * AUTHENTICATION V2')
  );
  assert.ok(
    mapSection.includes('var empCol = meta.colMap.empCol + 1;') &&
    mapSection.includes('var nameCol = meta.colMap.nameCol + 1;') &&
    mapSection.includes('getDisplayValues()') &&
    !mapSection.includes('getExecutionRosterData()'),
    'Name resolution must avoid a full Officers A:L roster read when only ID and Name are required'
  );
});

runTest('Coordinator Desk and Quick Links use Google Sheet storage, not Script Properties', () => {
  assert.ok(
    codeGs.includes("'Portal Content': ['Section', 'Key', 'Value', 'Updated At', 'Updated By']"),
    "CNE_SHEET_HEADERS must define the 'Portal Content' sheet"
  );
  assert.ok(
    codeGs.includes("'Quick Links': ['ID', 'Title', 'Description', 'Icon Name', 'Target', 'Badge', 'Action Type', 'URL', 'Modal Title', 'Modal Body', 'Status', 'Sort Order', 'Updated At', 'Updated By']"),
    "CNE_SHEET_HEADERS must define the 'Quick Links' sheet"
  );
  assert.ok(
    codeGs.includes("'Portal Content',") && codeGs.includes("'Quick Links',"),
    'setupAndVerifyCNESheets must include Portal Content and Quick Links tabs'
  );
  assert.ok(
    codeGs.includes("getOrCreateSheet('Portal Content')") &&
    codeGs.includes("getOrCreateSheet('Quick Links')"),
    'Coordinator Desk and Quick Links must be backed by spreadsheet tabs'
  );
  assert.ok(
    !codeGs.includes("setProperty('COORDINATOR_NOTE'") &&
    !codeGs.includes("setProperty('COORDINATOR_EMAIL'") &&
    !codeGs.includes("setProperty('COORDINATOR_NAMES'") &&
    !codeGs.includes("setProperty('QUICK_LINKS_CUSTOM'"),
    'Coordinator Desk and Quick Links must not write editable content to Script Properties'
  );
  assert.ok(
    codeGs.includes("getProperty('COORDINATOR_NOTE')") &&
    codeGs.includes("getProperty('COORDINATOR_EMAIL')") &&
    codeGs.includes("getProperty('COORDINATOR_NAMES')") &&
    codeGs.includes("getProperty('QUICK_LINKS_CUSTOM')"),
    'Legacy content properties may only remain as one-time migration sources'
  );
  assert.ok(
    codeGs.includes('function handleGetCoordinatorDesk(') &&
    codeGs.includes('function handleUpdateCoordinatorDesk(') &&
    codeGs.includes('function handleGetQuickLinks(') &&
    codeGs.includes('function handleAddQuickLink(') &&
    codeGs.includes('function handleUpdateQuickLink(') &&
    codeGs.includes('function handleDeleteQuickLink('),
    'Existing Coordinator Desk and Quick Link API contracts must remain intact'
  );
});


runTest('Coordinator Desk homepage renders sheet-backed Admin content', () => {
  const coordinatorCardTs = fs.readFileSync('src/components/home/CoordinatorDeskCard.tsx', 'utf8');

  assert.ok(
    (
      (cneHomeTs.includes("ApiService.getCoordinatorDesk()") && cneHomeTs.includes("setCoordinatorDesk(res.data)")) ||
      (cneHomeTs.includes("ApiService.getHomeDashboard()") && cneHomeTs.includes("setCoordinatorDesk(res.data.coordinatorDesk"))
    ) &&
    cneHomeTs.includes("<CoordinatorDeskCard coordinatorDesk={coordinatorDesk}"),
    'CneHomePage must fetch Coordinator Desk data (directly or through the optimized Home Dashboard bootstrap) and pass it to the homepage card'
  );

  assert.ok(
    coordinatorCardTs.includes('coordinatorDesk.note') &&
    coordinatorCardTs.includes('coordinatorDesk.coordinators.map') &&
    coordinatorCardTs.includes('coordinatorDesk.email'),
    'CoordinatorDeskCard must render backend-provided note, coordinator names, and email'
  );

  assert.ok(
    !coordinatorCardTs.includes('Ms. Ramya T') &&
    !coordinatorCardTs.includes('Ms. Suman Choudhary') &&
    !coordinatorCardTs.includes('training.nur@aiimsrishikesh.edu.in'),
    'CoordinatorDeskCard must not hard-code editable Coordinator Desk content'
  );
});

// -----------------------------------------------------------------------------
// Summary Report
// -----------------------------------------------------------------------------
console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL SYSTEM INTEGRATION TESTS PASSED!');

console.log('========================================================\\n');

process.exit(0);
`
  },
  // ===== END ORIGINAL SUITE: verify-system-integration.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-delete-cne-behavior.js =====
  {
    id: "delete",
    name: "Delete CNE Behavioral Verification",
    originalFilename: "verify-delete-cne-behavior.js",
    mode: "module",
    expectedChecks: 34,
    sha256: "71fee67a54ebb774e2b494c09631ec0f291352865d9db7ffcc36e31003037e01",
    source: `/**
 * ============================================================================
 * EXECUTABLE BEHAVIORAL TEST SUITE: Delete CNE Data Integrity & Concurrency
 * Scope: 16 Realistic Behavioral Tests with Authentic Apps Script Execution
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('Delete CNE Executable Behavioral Verification');
console.log('Scope: 16 True Behavioral Tests (Data Mutation & Recovery)');
console.log('========================================================\\n');

let totalTests = 0;
let passedTests = 0;

function runBehavioralTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\${err.stack}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// High-Fidelity In-Memory Google Apps Script Mock Framework
// -----------------------------------------------------------------------------

class MockRange {
  constructor(sheet, startRow, startCol, numRows, numCols) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      const rowIndex = this.startRow - 1 + r;
      for (let c = 0; c < this.numCols; c++) {
        const colIndex = this.startCol - 1 + c;
        if (rowIndex < this.sheet.grid.length && colIndex < this.sheet.grid[rowIndex].length) {
          row.push(this.sheet.grid[rowIndex][colIndex]);
        } else {
          row.push('');
        }
      }
      result.push(row);
    }
    return result;
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => String(v !== null && v !== undefined ? v : '')));
  }

  getValue() {
    const vals = this.getValues();
    return vals[0] && vals[0][0] !== undefined ? vals[0][0] : '';
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIndex = this.startRow - 1 + r;
      while (this.sheet.grid.length <= rowIndex) {
        this.sheet.grid.push([]);
      }
      for (let c = 0; c < values[r].length; c++) {
        const colIndex = this.startCol - 1 + c;
        while (this.sheet.grid[rowIndex].length <= colIndex) {
          this.sheet.grid[rowIndex].push('');
        }
        this.sheet.grid[rowIndex][colIndex] = values[r][c];
      }
    }
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  setFontWeight() {
    return this;
  }

  createTextFinder(needle) {
    const range = this;
    const vals = this.getValues();
    const matches = [];
    for (let r = 0; r < vals.length; r++) {
      for (let c = 0; c < vals[r].length; c++) {
        const cell = String(vals[r][c] || '').trim();
        if (cell.toLowerCase() === String(needle).trim().toLowerCase()) {
          matches.push({
            getRow: () => range.startRow + r,
            getColumn: () => range.startCol + c,
            getDisplayValue: () => cell
          });
        }
      }
    }
    return {
      matchEntireCell: () => this,
      matchCase: () => this,
      findNext: () => matches[0] || null,
      findAll: () => matches
    };
  }
}

class MockRangeList {
  constructor(sheet, ranges) {
    this.sheet = sheet;
    this.ranges = ranges; // array of A1 notations e.g. "E2"
  }

  setValue(val) {
    for (const a1 of this.ranges) {
      const match = a1.match(/([A-Z]+)(\\d+)/);
      if (match) {
        const colChar = match[1];
        const rowNum = parseInt(match[2], 10);
        let col = 0;
        for (let i = 0; i < colChar.length; i++) {
          col = col * 26 + (colChar.charCodeAt(i) - 64);
        }
        this.sheet.getRange(rowNum, col).setValue(val);
      }
    }
  }
}

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
    this.hooks = {};
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    return this.grid.length;
  }

  getLastColumn() {
    let max = 0;
    for (const r of this.grid) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  getRange(startRow, startCol, numRows = 1, numCols = 1) {
    if (this.hooks.onGetRange) {
      const hooked = this.hooks.onGetRange(startRow, startCol, numRows, numCols);
      if (hooked) return hooked;
    }
    return new MockRange(this, startRow, startCol, numRows, numCols);
  }

  getRangeList(ranges) {
    if (this.hooks.onGetRangeList) {
      const hooked = this.hooks.onGetRangeList(ranges);
      if (hooked) return hooked;
    }
    return new MockRangeList(this, ranges);
  }

  appendRow(rowVals) {
    if (this.hooks.onAppendRow) {
      this.hooks.onAppendRow(rowVals);
    }
    this.grid.push([...rowVals]);
  }

  deleteRow(rowIdx) {
    if (this.hooks.onDeleteRow) {
      this.hooks.onDeleteRow(rowIdx);
    }
    if (rowIdx >= 1 && rowIdx <= this.grid.length) {
      this.grid.splice(rowIdx - 1, 1);
    }
  }

  setFrozenRows() {}

  getMaxColumns() {
    return Math.max(26, this.getLastColumn());
  }

  getMaxRows() {
    return Math.max(100, this.getLastRow());
  }

  insertColumnsAfter(afterIndex, numColumns) {
    return this;
  }

  insertRowsAfter(afterIndex, numRows) {
    return this;
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    this.hooks = {};
  }

  getSheetByName(name) {
    if (this.hooks.onGetSheetByName) {
      const h = this.hooks.onGetSheetByName(name);
      if (h !== undefined) return h;
    }
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const s = new MockSheet(name, this);
    this.sheets[name] = s;
    if (this.hooks.onGetSheetByName) {
      this.hooks.onGetSheetByName(name);
    }
    return s;
  }

  addSheet(name, grid) {
    const s = new MockSheet(name, this, grid);
    this.sheets[name] = s;
    return s;
  }
}

function createFreshTestEnvironment() {
  const cneSpreadsheet = new MockSpreadsheet();
  const officersSpreadsheet = new MockSpreadsheet();

  const scriptProperties = {
    DROPDOWN_SPREADSHEET_ID: 'officers-sheet-id',
    CNE_SPREADSHEET_ID: 'cne-sheet-id',
    SPREADSHEET_ID: 'cne-sheet-id',
    SESSION_SECRET: 'test-session-secret-32-chars-long-minimum-key!'
  };

  const scriptCache = new Map();

  const mockLock = {
    waitLock: (timeout) => {},
    releaseLock: () => {}
  };

  const auditLog = [];

  const sandbox = {
    Logger: {
      log: () => {}
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => scriptProperties[k] || null,
        setProperty: (k, v) => { scriptProperties[k] = v; },
        getProperties: () => ({ ...scriptProperties })
      })
    },
    LockService: {
      getScriptLock: () => mockLock
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => scriptCache.get(k) || null,
        put: (k, v) => { scriptCache.set(k, v); },
        remove: (k) => { scriptCache.delete(k); }
      })
    },
    SpreadsheetApp: {
      openById: (id) => {
        if (id === 'officers-sheet-id') return officersSpreadsheet;
        return cneSpreadsheet;
      },
      getActiveSpreadsheet: () => cneSpreadsheet,
      flush: () => {
        if (cneSpreadsheet.hooks.onFlush) {
          cneSpreadsheet.hooks.onFlush();
        }
      }
    },
    Utilities: {
      formatDate: (d, tz, fmt) => '2026-10-14T10:00:00+05:30',
      getUuid: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 10),
      computeHmacSha256Signature: (value, key) => {
        return Array.from(Buffer.from('sig-' + value)).map(b => b & 0xFF);
      }
    },
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    JSON: JSON,
    Error: Error
  };

  // Load and execute Code.gs in the VM context
  const codeGsSource = fs.readFileSync(path.join(rootDir, 'Code.gs'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);

  // Setup Standard Officer Data
  officersSpreadsheet.addSheet('Officers data', [
    ['Employee ID', 'Name', 'Designation', 'Department', 'Email', 'Status'],
    ['ADMIN001', 'Admin Officer', 'Chief Nursing Officer', 'Administration', 'admin@aiims.edu', 'ACTIVE'],
    ['STAFF001', 'Staff Nurse One', 'Nursing Officer', 'Emergency Ward', 'staff1@aiims.edu', 'ACTIVE']
  ]);

  // Setup Standard Role Data
  cneSpreadsheet.addSheet('Role', [
    ['Employee ID', 'Role', 'Status', 'Area'],
    ['ADMIN001', 'ADMIN', 'ACTIVE', 'Administration'],
    ['STAFF001', 'EMPLOYEE', 'ACTIVE', 'Emergency Ward']
  ]);

  // Setup Standard Auth Credentials Data
  cneSpreadsheet.addSheet('Auth_Credentials', [
    ['Employee ID', 'Password Hash', 'Password Salt', 'Password Version', 'Password Created At', 'Password Changed At', 'Last Login At', 'Account Status', 'Failed Login Count', 'Locked Until', 'Created At', 'Updated At'],
    ['ADMIN001', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['STAFF001', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z']
  ]);

  // Setup Standard CNE Schedule Data
  cneSpreadsheet.addSheet('CNE Schedule', [
    [
      'CNE ID', 'Date', 'To Date', 'Time', 'Duration', 'Area', 'CNE Type', 'Topic',
      'Resource Person Emp ID', 'Resource Person Name', 'Special Notes', 'Status',
      'Staff Count', 'Staff Emp ID', 'External Staff Participants', 'Internal Attendance Count',
      'Created At', 'Created By', 'Updated At', 'Updated By'
    ],
    [
      'CLS-2026-001', '2026-10-20', '2026-10-20', '10:00 AM', '1 Hour', 'Emergency Ward', 'CENTRAL', 'Emergency Triage Protocols',
      'ADMIN001', 'Admin Officer', 'Clinical Simulation', 'Scheduled',
      '0', '', '', '0',
      '2026-10-10T10:00:00Z', 'ADMIN001', '', ''
    ],
    [
      'CLS-2026-002', '2026-10-22', '2026-10-22', '02:00 PM', '2 Hours', 'ICU', 'DEPARTMENTAL', 'Ventilator Care Bundle',
      'STAFF001', 'Staff Nurse One', 'Hands-on workshop', 'Scheduled',
      '5', 'STAFF001', '', '5',
      '2026-10-10T11:00:00Z', 'ADMIN001', '', ''
    ]
  ]);

  // Setup Standard Attendance Response Sheet
  cneSpreadsheet.addSheet('CNE Post Test Responses', [
    ['Response ID', 'CNE ID', 'Employee ID', 'Participant Name', 'Designation', 'Department', 'Score', 'Total', 'Percentage', 'Source', 'Timestamp', 'Answers', 'Status', 'Remarks'],
    ['RESP-001', 'CLS-2026-002', 'STAFF001', 'Staff Nurse One', 'Nursing Officer', 'ICU', '5', '5', '100%', 'POST_TEST', '2026-10-12T10:00:00Z', '{}', 'PASSED', '']
  ]);

  // Setup Standard QR Tokens Sheet
  cneSpreadsheet.addSheet('CNE_QR_Tokens', [
    ['Token', 'CNE ID', 'Created At', 'Expires At', 'Status'],
    ['QR-TOK-001', 'CLS-2026-001', '2026-10-10T10:00:00Z', '2026-10-25T10:00:00Z', 'ACTIVE']
  ]);

  // Setup Standard Audit Log Sheet
  cneSpreadsheet.addSheet('Audit_Log', [
    ['Timestamp', 'Action', 'Employee ID', 'Details', 'Status']
  ]);

  const adminSession = {
    employeeId: 'ADMIN001',
    name: 'Admin Officer',
    role: 'ADMIN',
    sessionToken: 'valid-admin-token-12345'
  };

  const staffSession = {
    employeeId: 'STAFF001',
    name: 'Staff Nurse One',
    role: 'EMPLOYEE',
    sessionToken: 'valid-staff-token-12345'
  };

  return {
    sandbox,
    cneSpreadsheet,
    officersSpreadsheet,
    adminSession,
    staffSession
  };
}

// -----------------------------------------------------------------------------
// 16 Executable Behavioral Tests
// -----------------------------------------------------------------------------

// Test 1: Missing mandatory attendance sheet
runBehavioralTest('1. Missing mandatory attendance sheet fails closed with ATTENDANCE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  delete env.cneSpreadsheet.sheets['CNE Post Test Responses'];
  delete env.cneSpreadsheet.sheets['CNE_Participants'];

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false, 'Deletion must fail');
  assert.strictEqual(res.errorCode, 'ATTENDANCE_CHECK_FAILED', 'Must return ATTENDANCE_CHECK_FAILED');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, 3, 'CNE Schedule row must be preserved');
  assert.strictEqual(Boolean(env.cneSpreadsheet.sheets['CNE Deleted Archive']), false, 'No archive sheet or row should be created');
});

// Test 2: Invalid CNE ID header in attendance sheet
runBehavioralTest('2. Invalid CNE ID header fails closed without default column index substitution', () => {
  const env = createFreshTestEnvironment();
  // Corrupt header row of attendance responses sheet: replace 'CNE ID' with 'InvalidCol'
  env.cneSpreadsheet.sheets['CNE Post Test Responses'].grid[0][1] = 'CorruptedColumnHeader';

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ATTENDANCE_CHECK_FAILED');
  assert.ok(res.message.includes('Mandatory CNE ID column missing'), 'Message must indicate missing CNE ID column');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, 3, 'CNE Schedule must not be deleted');
});

// Test 3: Archive append succeeds but verification fails
runBehavioralTest('3. Archive append succeeds but verification fails rolls back appended archive and preserves schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialRowCount = cneSheet.grid.length;

  // Hook into getRange to corrupt read-back row verification
  let archiveAppendOccurred = false;
  let verificationReadCount = 0;
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onAppendRow = () => { archiveAppendOccurred = true; };
      arch.hooks.onGetRange = (startRow, startCol, numRows, numCols) => {
        if (startRow >= 2 && numRows === 1 && numCols > 5) {
          verificationReadCount++;
          if (verificationReadCount === 1) {
            // Return corrupted row values with mismatched CNE ID on initial verification read
            const corrupted = new Array(numCols).fill('CORRUPTED');
            return {
              getValues: () => [corrupted],
              setValue: () => {},
              setValues: () => {}
            };
          }
        }
        return null;
      };
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ARCHIVE_VERIFICATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, initialRowCount, 'Active CNE schedule row must be preserved');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token must remain ACTIVE');
});

// Test 4: Archive append fails
runBehavioralTest('4. Archive append fails returns ARCHIVE_WRITE_FAILED and preserves active schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialRowCount = cneSheet.grid.length;

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onAppendRow = () => {
        throw new Error('Simulated disk/append failure');
      };
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ARCHIVE_WRITE_FAILED');
  assert.strictEqual(cneSheet.grid.length, initialRowCount, 'Active schedule row must be preserved');
});

// Test 5: QR deactivation fails
runBehavioralTest('5. QR deactivation failure triggers state-aware compensation (removes archive row, restores QR tokens)', () => {
  const env = createFreshTestEnvironment();
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  // Hook qrSheet to throw during deactivation
  qrSheet.hooks.onGetRangeList = (ranges) => {
    throw new Error('Simulated QR token lock failure');
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active CNE schedule row must be preserved');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archRows = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archRows.length, 0, 'Appended archive row must be compensated/deleted');
  }
});

// Test 6: Schedule row deletion fails before removal
runBehavioralTest('6. Schedule row deletion fails before removal safely rolls back archive entry and restores QR token', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  cneSheet.hooks.onDeleteRow = (rowIdx) => {
    throw new Error('Permission denied deleting schedule row');
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Schedule row still exists');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token restored to ACTIVE');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archMatches.length, 0, 'Archive row rolled back cleanly');
  }
});

// Test 7: Schedule row deletion commits but flush throws
runBehavioralTest('7. Schedule row deletion commits but flush throws retains archive and keeps QR token inactive', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  let deletedRow = false;
  cneSheet.hooks.onDeleteRow = (rowIdx) => {
    deletedRow = true;
  };

  // Throw on flush AFTER row deletion
  env.cneSpreadsheet.hooks.onFlush = () => {
    if (deletedRow) {
      throw new Error('Transient network error during final SpreadsheetApp.flush');
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(archSheet, 'Archive sheet must exist');
  const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(archMatches.length, 1, 'Must RETAIN archive row as authoritative surviving record');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'INACTIVE', 'QR token must NOT be reactivated');
});

// Test 8: Audit logging fails after committed deletion
runBehavioralTest('8. Audit logging failure after committed deletion does not report rollback', () => {
  const env = createFreshTestEnvironment();
  const auditSheet = env.cneSpreadsheet.sheets['Audit_Log'];

  let count = 0;
  auditSheet.hooks.onAppendRow = () => {
    count++;
    if (count > 0) {
      throw new Error('Audit log database timeout');
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, true, 'Deletion must report success since schedule deletion committed');
  assert.strictEqual(res.cneId, 'CLS-2026-001');
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const schedMatches = cneSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(schedMatches.length, 0, 'Schedule row must remain deleted');
});

// Test 9: Duplicate deletion requests
runBehavioralTest('9. Duplicate deletion request returns CNE_NOT_FOUND and prevents duplicate archive rows', () => {
  const env = createFreshTestEnvironment();

  // First deletion: succeeds
  const res1 = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'First Deletion'
  }, env.adminSession);
  assert.strictEqual(res1.success, true);

  // Second deletion request for same ID
  const res2 = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Duplicate Deletion Attempt'
  }, env.adminSession);

  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.errorCode, 'CNE_NOT_FOUND');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(archMatches.length, 1, 'Only one archive row should exist');
});

// Test 10: Revoked ADMIN role
runBehavioralTest('10. Revoked or non-ADMIN role is rejected before taking locks or mutating sheets', () => {
  const env = createFreshTestEnvironment();
  const initialSchedCount = env.cneSpreadsheet.sheets['CNE Schedule'].grid.length;

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Non-admin attempt'
  }, env.staffSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'PERMISSION_DENIED');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, initialSchedCount);
});

// Test 11: Concurrent attendance and deletion
runBehavioralTest('11. Concurrent operations: attendance first denies deletion; deletion first denies attendance', () => {
  const env = createFreshTestEnvironment();

  // Scenario 11A: Attendance recorded first for CLS-2026-002
  const deleteResA = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-002',
    confirmationCneId: 'CLS-2026-002',
    reason: 'Attempt delete with attendance'
  }, env.adminSession);

  assert.strictEqual(deleteResA.success, false);
  assert.strictEqual(deleteResA.errorCode, 'ATTENDANCE_EXISTS', 'Deletion must be denied when attendance exists');

  // Scenario 11B: Deletion succeeds first on CLS-2026-001
  const deleteResB = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Normal delete'
  }, env.adminSession);
  assert.strictEqual(deleteResB.success, true);

  // Subsequent manual attendance attempt on deleted CLS-2026-001
  const manualAttRes = env.sandbox.handleAddManualParticipants({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001'
  }, env.adminSession);

  assert.strictEqual(manualAttRes.success, false);
  assert.strictEqual(manualAttRes.errorCode, 'CNE_NOT_FOUND', 'Attendance must be denied after deletion committed');
});

// Test 12: Original archive column preservation
runBehavioralTest('12. Original schedule columns and values are preserved completely in archive record', () => {
  const env = createFreshTestEnvironment();
  const origScheduleRow = [...env.cneSpreadsheet.sheets['CNE Schedule'].grid[1]];

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Preserve Column Test'
  }, env.adminSession);

  assert.strictEqual(res.success, true);
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  const archHeaders = archSheet.grid[0];
  const archRow = archSheet.grid[1];

  // Verify all original columns exist in archive headers
  const origHeaders = env.cneSpreadsheet.sheets['CNE Schedule'].grid[0];
  for (let c = 0; c < origHeaders.length; c++) {
    const h = origHeaders[c];
    const archColIdx = archHeaders.indexOf(h);
    assert.ok(archColIdx !== -1, \`Original header \${h} must exist in archive headers\`);
    assert.strictEqual(archRow[archColIdx], origScheduleRow[c], \`Original value for \${h} must match in archive row\`);
  }

  // Verify deletion metadata
  assert.ok(archHeaders.includes('Deleted At'));
  assert.ok(archHeaders.includes('Deleted By'));
  assert.ok(archHeaders.includes('Delete Reason'));
  assert.strictEqual(archRow[archHeaders.indexOf('Deleted By')], 'ADMIN001');
  assert.strictEqual(archRow[archHeaders.indexOf('Delete Reason')], 'Preserve Column Test');
});

// Test 13: Duplicate or invalid archive headers
runBehavioralTest('13. Duplicate or blank archive headers are rejected with ARCHIVE_SCHEMA_INVALID', () => {
  const env = createFreshTestEnvironment();
  // Pre-create corrupt archive sheet with duplicate column header 'Topic'
  env.cneSpreadsheet.addSheet('CNE Deleted Archive', [
    ['CNE ID', 'Topic', 'Topic', 'Deleted At', 'Deleted By', 'Delete Reason']
  ]);

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Duplicate Header Test'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ARCHIVE_SCHEMA_INVALID');
  assert.ok(res.message.includes('duplicate or conflicting header'), 'Message must indicate duplicate header');
});

// Test 14: Deleted CNE ID collision prevention
runBehavioralTest('14. Deleted CNE ID is recognized as in-use and cannot be reused by Central or Departmental creation', () => {
  const env = createFreshTestEnvironment();

  // Delete CLS-2026-001
  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Collision test'
  }, env.adminSession);
  assert.strictEqual(delRes.success, true);

  // Check isCneIdInUse_ recognizes it
  const inUse = env.sandbox.isCneIdInUse_('CLS-2026-001');
  assert.strictEqual(inUse, true, 'Deleted CNE ID must be recognized as in-use');

  // Verify missing header throws rather than silently returning false
  delete env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid[0];
  env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid = [['CorruptedCol1', 'CorruptedCol2']];
  assert.throws(() => {
    env.sandbox.isCneIdInUse_('CLS-2026-001');
  }, /missing mandatory CNE ID header/i, 'Must throw error if archive lacks CNE ID header');
});

// Test 15: Normal successful ADMIN deletion
runBehavioralTest('15. Normal successful ADMIN deletion removes schedule row, deactivates QR, logs audit, and creates archive', () => {
  const env = createFreshTestEnvironment();

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Routine program cancellation and cleanup'
  }, env.adminSession);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.cneId, 'CLS-2026-001');
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const matches = cneSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(matches.length, 0, 'Schedule row must be deleted');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'INACTIVE', 'QR token must be INACTIVE');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.strictEqual(archSheet.grid.length, 2, 'Archive row must be created');
});

// Test 16: Non-admin deletion rejected
runBehavioralTest('16. Non-admin deletion request is rejected and preserves all records', () => {
  const env = createFreshTestEnvironment();
  const initialSchedCount = env.cneSpreadsheet.sheets['CNE Schedule'].grid.length;

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Unauthorized attempt'
  }, env.staffSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'PERMISSION_DENIED');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, initialSchedCount);
});

// Test 17: Pre-mutation QR state inspection failure
runBehavioralTest('17. Pre-mutation QR state inspection failure denies deletion safely with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialSchedCount = cneSheet.grid.length;

  // Corrupt / fail getRange on qrSheet during pre-mutation snapshot inspection
  qrSheet.hooks.onGetRange = () => {
    throw new Error('Database connection reset during QR snapshot');
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Snapshot failure test'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'QR_STATE_CHECK_FAILED');
  assert.strictEqual(cneSheet.grid.length, initialSchedCount, 'Active schedule row must not be modified');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archRows = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archRows.length, 0, 'No archive data row should be created');
  }
});

// Test 18: Competing concurrent operations under ScriptLock
runBehavioralTest('18. Competing concurrent operations: simulated lock acquisition order preserves state consistency', () => {
  // Case A: Worker Attendance commits before Worker Deletion acquires lock
  const envA = createFreshTestEnvironment();
  // Simulate Attendance acquiring lock and recording attendance first
  const attResA = envA.sandbox.handleAddManualParticipants({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001'
  }, envA.adminSession);
  assert.strictEqual(attResA.success, true, 'Attendance commit succeeds');

  // Deletion then acquires lock and checks authoritative state
  const delResA = envA.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Competing deletion after attendance'
  }, envA.adminSession);
  assert.strictEqual(delResA.success, false);
  assert.strictEqual(delResA.errorCode, 'ATTENDANCE_EXISTS', 'Deletion must be denied because attendance committed');

  // Case B: Worker Deletion commits before Worker Attendance acquires lock
  const envB = createFreshTestEnvironment();
  const delResB = envB.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Competing deletion before attendance'
  }, envB.adminSession);
  assert.strictEqual(delResB.success, true, 'Deletion commit succeeds');

  // Attendance then acquires lock and re-checks live CNE record
  const attResB = envB.sandbox.handleAddManualParticipants({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001'
  }, envB.adminSession);
  assert.strictEqual(attResB.success, false);
  assert.strictEqual(attResB.errorCode, 'CNE_NOT_FOUND', 'Attendance must fail closed because parent CNE was deleted');
});

// Test 19: Deleted CNE cannot accept Post-Test submission or QR verification
runBehavioralTest('19. Deleted CNE cannot accept Post-Test submission or QR verification', () => {
  const env = createFreshTestEnvironment();

  // Delete CLS-2026-001
  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Delete before post-test'
  }, env.adminSession);
  assert.strictEqual(delRes.success, true);

  // Attempt Post-Test OTP request on deleted CNE (via deactivated token)
  const otpRes = env.sandbox.handleRequestPostTestOtp({
    qrToken: 'QR-TOK-001',
    participantType: 'INTERNAL',
    employeeId: 'STAFF001'
  }, null);
  assert.strictEqual(otpRes.success, false);
  assert.strictEqual(otpRes.errorCode, 'INVALID_OR_MISSING_QR_TOKEN');

  // Attempt direct post-test submission specifying deleted CNE ID
  const submitRes = env.sandbox.handleSubmitPostTest({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001',
    answers: { 'Q1': 'A' }
  }, env.staffSession);
  assert.strictEqual(submitRes.success, false);
  assert.strictEqual(submitRes.errorCode, 'CNE_NOT_FOUND', 'Submission targeting deleted CNE must return CNE_NOT_FOUND');
});

// Test 20: Merely registered external participant vs actual recorded attendance
runBehavioralTest('20. Merely registered external participant does not block deletion, but recorded attendance does', () => {
  const env = createFreshTestEnvironment();
  const respSheet = env.cneSpreadsheet.sheets['CNE Post Test Responses'];

  // Add an external participant who only completed email verification / registration (not attended)
  respSheet.appendRow([
    'REG-001', 'CLS-2026-001', 'EXT-001', 'External Guest', 'Nurse', 'Apollo Hospital',
    '', '', '', 'EXTERNAL_REGISTRATION', '2026-10-12T10:00:00Z', '', 'REGISTERED', 'External Email: guest@apollo.com'
  ]);

  // Deletion must succeed because no actual recorded attendance exists
  const delRes1 = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Eligible with only registered participant'
  }, env.adminSession);
  assert.strictEqual(delRes1.success, true, 'Registered-only external participant must not prevent deletion');

  // Now create new environment where external participant actually attended
  const env2 = createFreshTestEnvironment();
  const respSheet2 = env2.cneSpreadsheet.sheets['CNE Post Test Responses'];
  respSheet2.appendRow([
    'MAN-001', 'CLS-2026-001', 'EXT-001', 'External Guest', 'Nurse', 'Apollo Hospital',
    '', '', '', 'MANUAL', '2026-10-12T10:00:00Z', '', 'ATTENDED', 'External Email: guest@apollo.com'
  ]);

  const delRes2 = env2.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Attempt delete with recorded attendance'
  }, env2.adminSession);
  assert.strictEqual(delRes2.success, false);
  assert.strictEqual(delRes2.errorCode, 'ATTENDANCE_EXISTS', 'Actual attendance must deny deletion');
});

// Test 21: QR columns in a rearranged valid order
runBehavioralTest('21. QR columns in rearranged valid order are resolved dynamically and deactivated correctly', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  
  // Rearrange CNE_QR_Tokens columns: Status at col 1, CNE ID at col 2, QR Token at col 3, Created At at col 4, Created By at col 5
  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['Status', 'CNE ID', 'QR Token', 'Created At', 'Created By'],
    ['ACTIVE', 'CLS-2026-001', 'QR-TOK-REORDERED-001', '2026-10-10T10:00:00Z', 'AIIMS001']
  ]);
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Valid deletion with rearranged QR headers'
  }, env.adminSession);

  assert.strictEqual(delRes.success, true, 'Deletion must succeed with rearranged QR headers');
  // Column 1 (index 0) is Status, which must now be INACTIVE
  assert.strictEqual(qrSheet.grid[1][0], 'INACTIVE', 'Status in rearranged column 1 must be deactivated');
  // Original schedule row removed
  assert.strictEqual(cneSheet.grid.length, 2, 'Active schedule row must be removed');
  // Archive row created
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(archSheet && archSheet.grid.length >= 2, 'Archive row must be created');
});

// Test 22: Missing QR Status header fails closed
runBehavioralTest('22. Missing QR Status header fails closed with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['QR Token', 'CNE ID', 'Created At', 'Created By'],
    ['QR-TOK-001', 'CLS-2026-001', '2026-10-10T10:00:00Z', 'AIIMS001']
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Missing status header test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'QR_STATE_CHECK_FAILED', 'Missing Status header must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 23: Missing QR CNE ID header fails closed
runBehavioralTest('23. Missing QR CNE ID header fails closed with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['QR Token', 'Created At', 'Created By', 'Status'],
    ['QR-TOK-001', '2026-10-10T10:00:00Z', 'AIIMS001', 'ACTIVE']
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Missing CNE ID header test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'QR_STATE_CHECK_FAILED', 'Missing CNE ID header must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 24: Duplicate normalized QR headers fail closed
runBehavioralTest('24. Duplicate or ambiguous normalized QR headers fail closed with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['QR Token', 'CNE ID', 'Status', 'Status', 'Created At'],
    ['QR-TOK-001', 'CLS-2026-001', 'ACTIVE', 'ACTIVE', '2026-10-10T10:00:00Z']
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Duplicate status header test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'QR_STATE_CHECK_FAILED', 'Duplicate status headers must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 25: QR deactivation verification failure triggers safe compensation
runBehavioralTest('25. QR deactivation verification failure rolls back archive and preserves schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];

  // Hook setValue on qrSheet to simulate a write that does not persist or is ignored
  qrSheet.hooks.onGetRange = (r, c, nr, nc) => {
    // When reading row 2 col 5 (postStatus check), return ACTIVE to simulate failure to deactivate
    if (r === 2 && c === 5) {
      return {
        getValue: () => 'ACTIVE',
        setValue: () => {}
      };
    }
    return null;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'QR deactivation verification failure test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_MUTATION_FAILED', 'Must return DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archMatches.length, 0, 'Archive row must be rolled back');
  }
});

// Test 26: Schedule readback throwing during recovery returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('26. Schedule readback throwing during recovery returns DELETE_COMPLETION_UNCERTAIN', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  let deleteAttempted = false;
  cneSheet.hooks.onDeleteRow = () => {
    deleteAttempted = true;
    throw new Error('Database disconnected during row deletion');
  };

  // When recovery attempts to inspect cneSheet, throw
  cneSheet.hooks.onGetRange = (r, c, nr, nc) => {
    if (deleteAttempted) {
      throw new Error('Temporary connection loss during schedule readback recovery');
    }
    return null;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Recovery read error test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_COMPLETION_UNCERTAIN', 'Inconclusive state must return DELETE_COMPLETION_UNCERTAIN');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(archSheet, 'Archive sheet must exist');
  // Does NOT delete the archive row when schedule state is UNKNOWN
  const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(archMatches.length, 1, 'Must preserve archive record when schedule state is uncertain');
});

// Test 27: Both sources temporarily unreadable during recovery returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('27. Both schedule and archive unreadable during recovery returns DELETE_COMPLETION_UNCERTAIN', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  let deleteTriggered = false;
  cneSheet.hooks.onDeleteRow = () => {
    deleteTriggered = true;
    throw new Error('Mutation failed mid-operation');
  };

  cneSheet.hooks.onGetRange = () => {
    if (deleteTriggered) {
      throw new Error('Google Sheets API unavailable for CNE Schedule');
    }
    return null;
  };

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (deleteTriggered) {
      throw new Error('Google Sheets API unavailable');
    }
    return undefined;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Complete outage recovery test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
});

// Test 28: Secondary audit logging failure during recovery does not interrupt recovery
runBehavioralTest('28. Secondary audit logging failure during recovery does not interrupt recovery', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const auditSheet = env.cneSpreadsheet.sheets['Audit_Log'];

  // Throw on schedule row deletion
  cneSheet.hooks.onDeleteRow = () => {
    throw new Error('Simulated row deletion failure');
  };

  // And also throw on audit log append
  auditSheet.hooks.onAppendRow = () => {
    throw new Error('Audit sheet unreachable');
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Audit log failure during recovery'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Schedule row preserved');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token restored');
});

// Test 29: Post-Test submission evidence denies deletion
runBehavioralTest('29. Post-Test submission evidence denies deletion with ATTENDANCE_EXISTS', () => {
  const env = createFreshTestEnvironment();
  const respSheet = env.cneSpreadsheet.sheets['CNE Post Test Responses'];

  // Add post-test response with score and PASSED status
  respSheet.appendRow([
    'RESP-001', 'CLS-2026-001', 'AIIMS002', 'Staff Nurse B', 'Nursing Officer', 'ICU',
    '85', '10', '85%', 'POST_TEST', '2026-10-12T11:00:00Z', '{}', 'PASSED', 'Passed on first attempt'
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Delete with submitted post-test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'ATTENDANCE_EXISTS');
});

// Test 30: Unknown or malformed participant status/source values fail closed with ATTENDANCE_CHECK_FAILED
runBehavioralTest('30. Unknown or malformed participant status/source values fail closed with ATTENDANCE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const respSheet = env.cneSpreadsheet.sheets['CNE Post Test Responses'];
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  // Add a row with unrecognized source and status
  respSheet.appendRow([
    'RESP-CORRUPT-001', 'CLS-2026-001', 'EXT-999', 'Unknown Person', 'Unknown', 'Unknown',
    '', '', '', 'UNRECOGNIZED_LEGACY_SRC', '2026-10-12T11:00:00Z', '', 'AMBIGUOUS_STATE', ''
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Ambiguous status test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'ATTENDANCE_CHECK_FAILED', 'Ambiguous/malformed participant status must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 31: Optional legacy repository (CNE_Participants) missing when mandatory repository is present allows deletion
runBehavioralTest('31. Optional legacy repository (CNE_Participants) missing when mandatory repository is present allows deletion', () => {
  const env = createFreshTestEnvironment();
  // Ensure CNE_Participants does NOT exist
  delete env.cneSpreadsheet.sheets['CNE_Participants'];
  assert.strictEqual(env.cneSpreadsheet.getSheetByName('CNE_Participants'), null);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Valid deletion with absent optional legacy sheet'
  }, env.adminSession);

  assert.strictEqual(delRes.success, true, 'Absence of optional legacy sheet must not prevent deletion');
});

// Test 32: Flush succeeds but readback of archived row throws
runBehavioralTest('32. Flush succeeds but archive readback throws returns ARCHIVE_VERIFICATION_FAILED and preserves active CNE', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  
  // Hook archive getRange to throw on initial readback
  let readAttempts = 0;
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive') {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      if (arch) {
        arch.hooks.onGetRange = (r, c, nr, nc) => {
          // When reading back data row (row >= 2), throw on first read
          if (r >= 2) {
            readAttempts++;
            if (readAttempts === 1) {
              throw new Error('Transient read timeout reading archive row');
            }
          }
          return null;
        };
      }
    }
    return undefined;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Readback failure test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'ARCHIVE_VERIFICATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active CNE schedule row must be preserved');
});

// Test 33: Archive verification mismatch where archive row cannot be verified returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('33. Archive verification mismatch where archive row cannot be verified returns DELETE_COMPLETION_UNCERTAIN and retains schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialRowCount = cneSheet.grid.length;

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onGetRange = (startRow, startCol, numRows, numCols) => {
        if (startRow >= 2 && numRows === 1 && numCols > 5) {
          // Persistent corrupted row prevents ownership verification during cleanup
          const corrupted = new Array(numCols).fill('CORRUPTED');
          return {
            getValues: () => [corrupted],
            setValue: () => {},
            setValues: () => {}
          };
        }
        return null;
      };
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  assert.strictEqual(cneSheet.grid.length, initialRowCount, 'Active CNE schedule row must be preserved');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token must remain ACTIVE');
});

// Test 34: Archive readback throws and cleanup read also throws returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('34. Archive readback throws and cleanup read also throws returns DELETE_COMPLETION_UNCERTAIN and retains schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onGetRange = (r, c, nr, nc) => {
        if (r >= 2 && nc > 5) {
          throw new Error('Persistent Google Sheets API failure');
        }
        return null;
      };
    }
    return undefined;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Persistent failure test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active CNE schedule row must be preserved');
});

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-delete-cne-behavior.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-cne-interest.js =====
  {
    id: "interest",
    name: "CNE Expression of Interest",
    originalFilename: "verify-cne-interest.js",
    mode: "module",
    expectedChecks: 46,
    sha256: "8378434f7292c5e5e9f1970976c0196b02a382ba6c9b94d6c5abce5b3e245b44",
    source: `/**
 * ============================================================================
 * EXECUTABLE BEHAVIORAL TEST SUITE: CNE Expression of Interest (Phase 1)
 * Scope: 46 True Behavioral Tests with Authentic Apps Script Execution
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import assert from 'assert';
import { fileURLToPath } from 'url';
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  const trimmed = str.replace(/^[ \\f\\v\\u0000-\\u0008\\u000b\\u000e-\\u001f]+/, '');
  if (/^[=+@\\-\\t\\r]/.test(str) || /^[=+@\\-]/.test(trimmed)) {
    str = \`'\${str}\`;
  }

  const escaped = str.replace(/"/g, '""');
  return \`"\${escaped}"\`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('CNE Expression of Interest Behavioral Verification');
console.log('Scope: 46 True Behavioral Tests (Registration, Security, Lifecycle, Strict Date/Time & ISO Offsets)');
console.log('========================================================\\n');

let totalTests = 0;
let passedTests = 0;

function runBehavioralTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${totalTests}. \${name}\`);
  } catch (err) {
    console.error(\`✗ \${totalTests}. \${name}\`);
    console.error(\`  Error: \${err.message}\\n\${err.stack}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// In-Memory Google Apps Script Mock Framework
// -----------------------------------------------------------------------------

class MockRange {
  constructor(sheet, startRow, startCol, numRows, numCols) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      const rowIndex = this.startRow - 1 + r;
      for (let c = 0; c < this.numCols; c++) {
        const colIndex = this.startCol - 1 + c;
        if (rowIndex < this.sheet.grid.length && colIndex < this.sheet.grid[rowIndex].length) {
          row.push(this.sheet.grid[rowIndex][colIndex]);
        } else {
          row.push('');
        }
      }
      result.push(row);
    }
    return result;
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => String(v !== null && v !== undefined ? v : '')));
  }

  getValue() {
    const vals = this.getValues();
    return vals[0] && vals[0][0] !== undefined ? vals[0][0] : '';
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIndex = this.startRow - 1 + r;
      while (this.sheet.grid.length <= rowIndex) {
        this.sheet.grid.push([]);
      }
      for (let c = 0; c < values[r].length; c++) {
        const colIndex = this.startCol - 1 + c;
        while (this.sheet.grid[rowIndex].length <= colIndex) {
          this.sheet.grid[rowIndex].push('');
        }
        this.sheet.grid[rowIndex][colIndex] = values[r][c];
      }
    }
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setHorizontalAlignment() { return this; }
  setVerticalAlignment() { return this; }
  setWrap() { return this; }

  createTextFinder(query) {
    const range = this;
    const queryStr = String(query).trim().toLowerCase();
    return {
      matchEntireCell() { return this; },
      matchCase() { return this; },
      findNext() {
        const vals = range.getDisplayValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (vals[r][c].trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              return {
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return vals[r][c]; }
              };
            }
          }
        }
        return null;
      },
      findAll() {
        const matches = [];
        const vals = range.getDisplayValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (vals[r][c].trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              matches.push({
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return vals[r][c]; }
              });
            }
          }
        }
        return matches;
      }
    };
  }
}

class MockRangeList {
  constructor(sheet, ranges) {
    this.sheet = sheet;
    this.ranges = ranges || [];
  }

  setValue(val) {
    for (const a1 of this.ranges) {
      const match = a1.match(/([A-Z]+)(\\d+)/);
      if (match) {
        const colChar = match[1];
        const rowNum = parseInt(match[2], 10);
        let col = 0;
        for (let i = 0; i < colChar.length; i++) {
          col = col * 26 + (colChar.charCodeAt(i) - 64);
        }
        this.sheet.getRange(rowNum, col).setValue(val);
      }
    }
  }
}

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
    this.hooks = {};
  }

  getName() { return this.name; }
  getLastRow() { return this.grid.length; }
  getLastColumn() {
    let max = 0;
    for (const r of this.grid) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  getMaxColumns() {
    return Math.max(30, this.getLastColumn());
  }

  getMaxRows() {
    return Math.max(100, this.getLastRow());
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    if (this.hooks.onGetRange) {
      const hooked = this.hooks.onGetRange(row, col, numRows, numCols);
      if (hooked) return hooked;
    }
    return new MockRange(this, row, col, numRows, numCols);
  }

  getRangeList(ranges) {
    if (this.hooks.onGetRangeList) {
      const hooked = this.hooks.onGetRangeList(ranges);
      if (hooked) return hooked;
    }
    return new MockRangeList(this, ranges);
  }

  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  appendRow(rowVals) {
    if (this.hooks.onAppendRow) {
      this.hooks.onAppendRow(rowVals);
    }
    this.grid.push([...rowVals]);
  }

  deleteRow(rowIdx) {
    if (this.hooks.onDeleteRow) {
      this.hooks.onDeleteRow(rowIdx);
    }
    if (rowIdx >= 1 && rowIdx <= this.grid.length) {
      this.grid.splice(rowIdx - 1, 1);
    }
  }

  deleteRows(startRow, numRows = 1) {
    if (startRow >= 1 && startRow <= this.grid.length) {
      this.grid.splice(startRow - 1, numRows);
    }
  }

  deleteColumn(colIdx) {
    if (colIdx >= 1) {
      for (const row of this.grid) {
        if (colIdx - 1 < row.length) {
          row.splice(colIdx - 1, 1);
        }
      }
    }
  }

  deleteColumns(colIdx, numCols = 1) {
    for (let c = 0; c < numCols; c++) {
      this.deleteColumn(colIdx);
    }
  }

  insertColumnsAfter(afterIndex, numColumns) {
    return this;
  }

  insertColumnAfter(afterIndex) {
    return this;
  }

  setFrozenRows() {}
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const s = new MockSheet(name, this);
    this.sheets[name] = s;
    return s;
  }

  addSheet(name, grid) {
    const s = new MockSheet(name, this, grid);
    this.sheets[name] = s;
    return s;
  }
}

function createFreshTestEnvironment() {
  const cneSpreadsheet = new MockSpreadsheet();
  const officersSpreadsheet = new MockSpreadsheet();

  const scriptProperties = {
    DROPDOWN_SPREADSHEET_ID: 'officers_mock_id',
    CNE_SPREADSHEET_ID: 'cne_mock_id',
    SESSION_SECRET: 'test_session_secret_32bytes_minimum_length_required'
  };

  // 1. CNE Schedule sheet
  cneSpreadsheet.addSheet('CNE Schedule', [
    [
      'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
      'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
      'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
      'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy',
      'Coverage Areas Snapshot', 'Total Allotted Staff', 'Internal Attendance Count',
      'Attendance Percentage', 'Post-Test Outcome Percentage', 'Coverage Finalized At'
    ],
    // Future Scheduled CNE in ICU
    [
      'CNE-2026-FUT1', 'Advanced Mechanical Ventilation', 'ICU', '2028-11-20T10:00', '2028-11-20T11:30', '90',
      'EMP-RP-100', 'Workshop', 'Hands-on ventilator management', '40', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN'
    ],
    // Future Scheduled Departmental CNE in OT
    [
      'CNE-2026-FUT2', 'Surgical Asepsis & Sterilization', 'OT', '2028-12-15T09:00', '2028-12-15T10:30', '90',
      'EMP-RP-200', 'Lecture', 'Sterile technique in operating rooms', '30', 'Scheduled',
      'DEPARTMENTAL', '', '', '0', '',
      'EMP-RP-200', '', '', '2026-10-01', 'EMP-RP-200'
    ],
    // Past CNE
    [
      'CNE-2026-PAST', 'Historical Infection Control', 'Emergency', '2020-01-10T09:00', '2020-01-10T10:00', '60',
      'EMP-RP-100', 'Lecture', 'Basic infection control protocols', '50', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2020-01-01', 'ADMIN'
    ],
    // Canceled CNE
    [
      'CNE-2026-CNCL', 'Emergency Triage Protocols', 'Emergency', '2028-11-25T14:00', '2028-11-25T15:00', '60',
      'EMP-RP-100', 'Workshop', 'Triage algorithms', '40', 'Canceled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN'
    ],
    // Future CNE with separate date and time values
    [
      'CNE-2026-TIME', 'Pediatric Resuscitation', 'Pediatrics', '2028-10-15', '2028-10-15', '60',
      'EMP-RP-100', 'Lecture', 'Pediatric CPR protocols', '40', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN'
    ]
  ]);

  // 2. Officers data master sheet
  officersSpreadsheet.addSheet('Officers data', [
    [
      'Sr. No.', 'Employee ID No.', 'Name of the Officers', 'Designation', 'Contact No.',
      'Employment Type', 'Date of Joining', 'EmailID'
    ],
    ['1', 'EMP-ADM-001', 'Dr. System Administrator', 'Chief Nursing Officer', '9999999990', 'Regular', '2015-01-01', 'admin@aiims.edu'],
    ['2', 'EMP-INCH-ICU', 'Sister Incharge ICU', 'Senior Nursing Officer', '9999999991', 'Regular', '2016-02-01', 'inch.icu@aiims.edu'],
    ['3', 'EMP-RP-100', 'Master Instructor One', 'Nursing Officer', '9999999992', 'Regular', '2018-03-01', 'rp1@aiims.edu'],
    ['4', 'EMP-RP-200', 'Master Instructor Two', 'Nursing Officer', '9999999993', 'Regular', '2019-04-01', 'rp2@aiims.edu'],
    ['5', 'EMP-NURSE-01', 'Staff Nurse Alpha', 'Nursing Officer', '9999999994', 'Regular', '2021-05-01', 'nurse.alpha@aiims.edu'],
    ['6', 'EMP-NURSE-02', 'Staff Nurse Beta', 'Nursing Officer', '9999999995', 'Regular', '2022-06-01', 'nurse.beta@aiims.edu']
  ]);

  // 3. Role sheet
  cneSpreadsheet.addSheet('Role', [
    ['Employee ID No.', 'Name of the Officers', 'Designation', 'Role', 'Department / Area'],
    ['EMP-ADM-001', 'Dr. System Administrator', 'Chief Nursing Officer', 'ADMIN', ''],
    ['EMP-INCH-ICU', 'Sister Incharge ICU', 'Senior Nursing Officer', 'AREA_INCHARGE', 'ICU'],
    ['EMP-RP-100', 'Master Instructor One', 'Nursing Officer', 'EMPLOYEE', ''],
    ['EMP-RP-200', 'Master Instructor Two', 'Nursing Officer', 'EMPLOYEE', 'OT'],
    ['EMP-NURSE-01', 'Staff Nurse Alpha', 'Nursing Officer', 'EMPLOYEE', 'ICU'],
    ['EMP-NURSE-02', 'Staff Nurse Beta', 'Nursing Officer', 'EMPLOYEE', 'Emergency']
  ]);

  // 4. Area sheet
  cneSpreadsheet.addSheet('Area', [
    ['Area', 'Status', 'CreatedAt'],
    ['ICU', 'ACTIVE', '2026-01-01'],
    ['OT', 'ACTIVE', '2026-01-01'],
    ['Emergency', 'ACTIVE', '2026-01-01'],
    ['Pediatrics', 'ACTIVE', '2026-01-01']
  ]);

  // 5. CNE Post Test Responses (Empty baseline)
  cneSpreadsheet.addSheet('CNE Post Test Responses', [
    ['Response ID', 'CNE ID', 'Employee ID', 'Employee Name', 'Designation', 'Department', 'Score', 'Total Questions', 'Percentage', 'Source', 'Submitted At', 'Answers JSON', 'Status', 'Remarks']
  ]);

  // 6. CNE Deleted Archive
  cneSpreadsheet.addSheet('CNE Deleted Archive', [
    [
      'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
      'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
      'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
      'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy',
      'Coverage Areas Snapshot', 'Total Allotted Staff', 'Internal Attendance Count',
      'Attendance Percentage', 'Post-Test Outcome Percentage', 'Coverage Finalized At',
      'Deleted At', 'Deleted By', 'Delete Reason'
    ]
  ]);

  // 7. CNE_QR_Tokens
  cneSpreadsheet.addSheet('CNE_QR_Tokens', [
    ['QR Token', 'CNE ID', 'Created At', 'Created By', 'Status']
  ]);

  // 8. Auth_Credentials
  cneSpreadsheet.addSheet('Auth_Credentials', [
    ['Employee ID', 'Password Hash', 'Password Salt', 'Password Version', 'Password Created At', 'Password Changed At', 'Last Login At', 'Account Status', 'Failed Login Count', 'Locked Until', 'Created At', 'Updated At'],
    ['EMP-ADM-001', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-INCH-ICU', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-RP-100', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-RP-200', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-NURSE-01', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-NURSE-02', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z']
  ]);

  // 9. Audit_Log
  cneSpreadsheet.addSheet('Audit_Log', [
    ['Timestamp', 'Action', 'Employee ID', 'Details', 'Status']
  ]);

  const scriptLock = {
    hasLock: false,
    waitLock() { this.hasLock = true; return true; },
    releaseLock() { this.hasLock = false; }
  };

  const sandbox = {
    Logger: {
      log: () => {}
    },
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    JSON,
    SpreadsheetApp: {
      openById(id) {
        if (id === 'officers_mock_id') return officersSpreadsheet;
        return cneSpreadsheet;
      },
      getActiveSpreadsheet() {
        return cneSpreadsheet;
      },
      flush() {}
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) { return scriptProperties[k] || null; },
          getProperties() { return { ...scriptProperties }; },
          setProperty(k, v) { scriptProperties[k] = v; }
        };
      }
    },
    LockService: {
      getScriptLock() { return scriptLock; }
    },
    CacheService: {
      getScriptCache() {
        const cacheStore = {};
        return {
          get(k) { return cacheStore[k] || null; },
          put(k, v) { cacheStore[k] = v; },
          remove(k) { delete cacheStore[k]; }
        };
      }
    },
    Utilities: {
      formatDate(date, tz, fmt) {
        if (date instanceof Date) {
          try {
            const dtf = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz || 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            const parts = dtf.formatToParts(date);
            const p = {};
            for (const pt of parts) p[pt.type] = pt.value;
            return \`\${p.year}-\${p.month}-\${p.day}T\${p.hour}:\${p.minute}:\${p.second}\`;
          } catch (e) {
            return date.toISOString();
          }
        }
        return String(date);
      },
      computeHmacSha256Signature() { return [1, 2, 3]; },
      base64Encode() { return 'mock_token'; }
    },
    Session: {
      getScriptTimeZone() { return 'Asia/Kolkata'; }
    }
  };

  const codeGsSource = fs.readFileSync(path.join(rootDir, 'Code.gs'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);

  return { sandbox, cneSpreadsheet, officersSpreadsheet };
}

// =============================================================================
// ORIGINAL 16 BEHAVIORAL VERIFICATION SCENARIOS
// =============================================================================

runBehavioralTest('1. Registering interest saves record in CNE Interest Registrations with INTERESTED status', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.status, 'INTERESTED');

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.ok(sheet, 'CNE Interest Registrations tab must be created');
  assert.strictEqual(sheet.getLastRow(), 2, 'Must have 1 header row + 1 data row');

  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[0], 'CNE-2026-FUT1', 'CNE ID matches');
  assert.strictEqual(row[1], 'EMP-NURSE-01', 'Employee ID matches');
  assert.strictEqual(row[2], 'Staff Nurse Alpha', 'Employee name resolved from directory');
  assert.strictEqual(row[5], 'INTERESTED', 'Interest status is INTERESTED');
  assert.ok(row[6], 'Interested At timestamp recorded');
});

runBehavioralTest('2. Withdrawal updates interest status to WITHDRAWN', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const withdrawRes = sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(withdrawRes.success, true);
  assert.strictEqual(withdrawRes.data.status, 'WITHDRAWN');

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[5], 'WITHDRAWN', 'Status in sheet updated to WITHDRAWN');
});

runBehavioralTest('3. Re-registration updates existing row rather than creating duplicate row', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  // 1. Register -> 2. Withdraw -> 3. Re-register
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const reRegRes = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(reRegRes.success, true);
  assert.strictEqual(reRegRes.data.status, 'INTERESTED');

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(sheet.getLastRow(), 2, 'Must still have exactly 1 data row, no duplicate created');

  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[5], 'INTERESTED', 'Status updated back to INTERESTED');
});

runBehavioralTest('4. Duplicate registration calls are idempotent and prevent duplicate rows', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  const first = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const second = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(first.success, true);
  assert.strictEqual(second.success, true);
  assert.strictEqual(second.data.alreadyRegistered, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(sheet.getLastRow(), 2, 'Only 1 row created for same CNE ID and Employee ID');
});

runBehavioralTest('5. Registration after CNE start time is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // CNE-2026-PAST has date 2020-01-10 (in the past)
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-PAST' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('6. Registration for canceled CNE is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // CNE-2026-CNCL has status Canceled
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-CNCL' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('7. Registration for nonexistent or deleted CNE is rejected with CNE_NOT_FOUND', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  const res = sandbox.handleRegisterCneInterest({ cneId: 'NONEXISTENT-CNE' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'CNE_NOT_FOUND');
});

runBehavioralTest('8. Employee identity is derived strictly from session and cannot be spoofed via client params', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };
  const maliciousParams = {
    cneId: 'CNE-2026-FUT1',
    employeeId: 'EMP-ADM-001',
    loggedInEmployeeId: 'EMP-ADM-001',
    name: 'Fake Name'
  };

  const res = sandbox.handleRegisterCneInterest(maliciousParams, session);
  assert.strictEqual(res.success, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[1], 'EMP-NURSE-01', 'Must store authenticated session employeeId, ignoring client input');
  assert.strictEqual(row[2], 'Staff Nurse Alpha', 'Must store authentic directory name');
});

runBehavioralTest('9. Ordinary employee is denied access to organizer participant list with FORBIDDEN', () => {
  const { sandbox } = createFreshTestEnvironment();
  const employeeSession = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, employeeSession);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'FORBIDDEN');
});

runBehavioralTest('10. Administrator is authorized to view interested participant list for all CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 });
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 });

  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin', passwordVersion: 1 };
  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.totalInterested, 2);
  assert.strictEqual(res.data.participants.length, 2);
});

runBehavioralTest('11. Area Incharge is authorized for CNEs within their assigned area and denied for others', () => {
  const { sandbox } = createFreshTestEnvironment();
  const inchargeIcuSession = {
    employeeId: 'EMP-INCH-ICU',
    role: 'AREA_INCHARGE',
    assignedArea: 'ICU',
    assignedAreas: ['ICU'],
    passwordVersion: 1
  };

  // CNE-2026-FUT1 is in ICU -> Authorized
  const inScopeRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, inchargeIcuSession);
  assert.strictEqual(inScopeRes.success, true, 'Area Incharge must be allowed for their assigned area (ICU)');

  // CNE-2026-FUT2 is in OT -> Denied
  const outOfScopeRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT2' }, inchargeIcuSession);
  assert.strictEqual(outOfScopeRes.success, false);
  assert.strictEqual(outOfScopeRes.errorCode, 'FORBIDDEN', 'Area Incharge must be denied for out-of-scope area (OT)');
});

runBehavioralTest('12. Assigned Resource Person is authorized for their assigned CNE and denied for unassigned CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  const rpSession = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', name: 'Master Instructor One', passwordVersion: 1 };

  // CNE-2026-FUT1 has Resource Person EMP-RP-100 -> Authorized
  const assignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, rpSession);
  assert.strictEqual(assignedRes.success, true, 'Assigned Resource Person must be authorized');

  // CNE-2026-FUT2 has Resource Person EMP-RP-200 -> Denied for EMP-RP-100
  const unassignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT2' }, rpSession);
  assert.strictEqual(unassignedRes.success, false);
  assert.strictEqual(unassignedRes.errorCode, 'FORBIDDEN', 'Unassigned Resource Person must be denied');
});

runBehavioralTest('13. Concurrent registration requests acquire ScriptLock and execute safely', () => {
  const { sandbox } = createFreshTestEnvironment();
  let lockAcquired = false;

  sandbox.LockService.getScriptLock = () => ({
    waitLock(timeout) {
      assert.ok(timeout >= 5000, 'Must request sufficient lock timeout');
      lockAcquired = true;
      return true;
    },
    releaseLock() {
      lockAcquired = false;
    }
  });

  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res.success, true);
  assert.strictEqual(lockAcquired, false, 'Lock must be cleanly released');
});

runBehavioralTest('14. Active-interest count counts only INTERESTED records and excludes WITHDRAWN records', () => {
  const { sandbox } = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', passwordVersion: 1 };

  // Nurse 1: Registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 });
  // Nurse 2: Registers then withdraws
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 });
  sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 });

  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.participants.length, 2, '2 total registration records present');
  assert.strictEqual(res.data.totalInterested, 1, 'Only 1 active INTERESTED record counted');
});

runBehavioralTest('15. Expression of interest does NOT modify attendance or Post-Test responses', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  const respSheet = cneSpreadsheet.getSheetByName('CNE Post Test Responses');
  assert.strictEqual(respSheet.getLastRow(), 1, 'CNE Post Test Responses must remain empty (no attendance written)');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  const schedRow = schedSheet.getRange(2, 1, 1, 27).getValues()[0];
  assert.strictEqual(schedRow[14], '0', 'Staff Count in CNE Schedule must remain 0');
  assert.strictEqual(schedRow[23], '', 'Internal Attendance Count in CNE Schedule must remain empty');
});

runBehavioralTest('16. Interest registration alone does NOT block Admin Delete CNE', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const nurseSession = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin', passwordVersion: 1 };

  // 1. Employee registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseSession);

  // 2. Admin deletes CNE
  const deleteRes = sandbox.handleDeleteCNE({
    cneId: 'CNE-2026-FUT1',
    reason: 'Testing interest non-blocking deletion',
    confirmationCneId: 'CNE-2026-FUT1'
  }, adminSession);

  assert.strictEqual(deleteRes.success, true, 'Admin delete CNE must succeed even with interest registered');

  // Verify CNE was removed from active schedule and archived
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  const remainingIds = schedSheet.getRange(2, 1, Math.max(1, schedSheet.getLastRow() - 1), 1).getValues().map(r => r[0]);
  assert.ok(!remainingIds.includes('CNE-2026-FUT1'), 'CNE ID removed from active schedule');

  const archSheet = cneSpreadsheet.getSheetByName('CNE Deleted Archive');
  const archivedIds = archSheet.getRange(2, 1, Math.max(1, archSheet.getLastRow() - 1), 1).getValues().map(r => r[0]);
  assert.ok(archivedIds.includes('CNE-2026-FUT1'), 'CNE ID present in archive');

  // 3. Deleted CNE cannot accept new interest
  const postDeleteInterest = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseSession);
  assert.strictEqual(postDeleteInterest.success, false, 'Deleted CNE must reject interest registration');
});

// =============================================================================
// ADDITIONAL BEHAVIORAL SCENARIOS (Phase 1 Strengthening)
// =============================================================================

runBehavioralTest('17. Session revoked before/during mutation lock rejects registration with SESSION_REVOKED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  // Mark EMP-NURSE-01 as INACTIVE in Auth_Credentials
  const authSheet = cneSpreadsheet.getSheetByName('Auth_Credentials');
  const rows = authSheet.getDataRange().getValues();
  for (let r = 1; r < rows.length; r++) {
    if (rows[r][0] === 'EMP-NURSE-01') {
      authSheet.getRange(r + 1, 8).setValue('INACTIVE');
      break;
    }
  }

  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'SESSION_REVOKED', 'Must reject revoked/inactive account');
});

runBehavioralTest('18. CNE canceled while registration is waiting for lock rejects with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Simulate CNE becoming canceled before lock resolves
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 11).setValue('Canceled');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('19. CNE deleted before registration commits rejects with CNE_NOT_FOUND', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Remove the row from schedule
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.deleteRow(2);

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'CNE_NOT_FOUND');
});

runBehavioralTest('20. CNE starting before registration commits rejects with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Set start time to past
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2021-01-01T10:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('21. Missing or unparseable CNE start date rejects registration with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Set start date to invalid string
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('invalid-date-not-a-timestamp');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', 'Unparseable date must reject registration');
});

runBehavioralTest('22. Invalid interest sheet headers rejects registration with INTEREST_SHEET_INVALID', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Pre-create corrupt sheet missing "Employee ID" header
  cneSpreadsheet.addSheet('CNE Interest Registrations', [
    ['CNE ID', 'Corrupt Header', 'Employee Name', 'Designation', 'Department / Area', 'Interest Status', 'Interested At', 'Updated At']
  ]);

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'INTEREST_SHEET_INVALID', 'Must reject missing mandatory headers');
});

runBehavioralTest('23. Rearranged interest sheet columns are correctly resolved and updated dynamically', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  // Pre-create sheet with rearranged columns
  cneSpreadsheet.addSheet('CNE Interest Registrations', [
    ['Employee ID', 'Interest Status', 'CNE ID', 'Department / Area', 'Designation', 'Employee Name', 'Updated At', 'Interested At']
  ]);

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[0], 'EMP-NURSE-01', 'Employee ID in column 0');
  assert.strictEqual(row[1], 'INTERESTED', 'Interest Status in column 1');
  assert.strictEqual(row[2], 'CNE-2026-FUT1', 'CNE ID in column 2');
  assert.strictEqual(row[5], 'Staff Nurse Alpha', 'Employee Name in column 5');

  // Verify organizer query accurately parses rearranged columns
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', passwordVersion: 1 };
  const queryRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);
  assert.strictEqual(queryRes.success, true);
  assert.strictEqual(queryRes.data.participants[0].employeeId, 'EMP-NURSE-01');
  assert.strictEqual(queryRes.data.participants[0].employeeName, 'Staff Nurse Alpha');
  assert.strictEqual(queryRes.data.participants[0].status, 'INTERESTED');
});

runBehavioralTest('24. Concurrent duplicate registrations remain idempotent without creating duplicate rows', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  const res1 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const res2 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const res3 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res3.success, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(sheet.getLastRow(), 2, 'Only 1 row exists after 3 rapid registrations');
});

runBehavioralTest('25. Interest status isolation between different employee accounts', () => {
  const { sandbox } = createFreshTestEnvironment();
  const nurseAlpha = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const nurseBeta = { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 };

  // Alpha registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);

  // Alpha status is INTERESTED
  const alphaStatus = sandbox.handleGetMyCneInterestStatus({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);
  assert.strictEqual(alphaStatus.success, true);
  assert.strictEqual(alphaStatus.data.isInterested, true);
  assert.strictEqual(alphaStatus.data.status, 'INTERESTED');

  // Beta status is null / false (isolated!)
  const betaStatus = sandbox.handleGetMyCneInterestStatus({ cneId: 'CNE-2026-FUT1' }, nurseBeta);
  assert.strictEqual(betaStatus.success, true);
  assert.strictEqual(betaStatus.data.isInterested, false);
  assert.strictEqual(betaStatus.data.status, null);
});

runBehavioralTest('26. CSV formula injection neutralization protects dangerous cell values', () => {
  // Test formula injection characters: =, +, -, @, \\t, \\r, with and without leading whitespace
  assert.strictEqual(sanitizeCsvCell('=cmd| /C calc'), \`"'=cmd| /C calc"\`);
  assert.strictEqual(sanitizeCsvCell('  =1+1'), \`"'  =1+1"\`);
  assert.strictEqual(sanitizeCsvCell('+9999999999'), \`"'+9999999999"\`);
  assert.strictEqual(sanitizeCsvCell('-1000'), \`"'-1000"\`);
  assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), \`"'@SUM(A1:A10)"\`);
  assert.strictEqual(sanitizeCsvCell('\\tmalicious'), \`"'	malicious"\`);
  assert.strictEqual(sanitizeCsvCell('Normal Clinical Staff'), \`"Normal Clinical Staff"\`);
  assert.strictEqual(sanitizeCsvCell('ICU "Critical Care"'), \`"ICU ""Critical Care"""\`);
  assert.strictEqual(sanitizeCsvCell(null), '""');
  assert.strictEqual(sanitizeCsvCell(undefined), '""');
});

runBehavioralTest('27. Resource Person access is strictly limited to their assigned CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  const rp100 = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', name: 'Master Instructor One', passwordVersion: 1 };

  // EMP-RP-100 is assigned to CNE-2026-FUT1
  const assignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, rp100);
  assert.strictEqual(assignedRes.success, true);

  // EMP-RP-100 is NOT assigned to CNE-2026-FUT2 (assigned to EMP-RP-200)
  const unassignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT2' }, rp100);
  assert.strictEqual(unassignedRes.success, false);
  assert.strictEqual(unassignedRes.errorCode, 'FORBIDDEN');
});

runBehavioralTest('28. Department derivation does not treat officer employment type as department', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  // Role table does not have assigned area for EMP-RP-100; employmentType in roster is "Regular"
  const rpSession = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', passwordVersion: 1 };
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, rpSession);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  // Column 4 is Department / Area
  assert.notStrictEqual(row[4], 'Regular', 'Must NEVER treat Employment Type "Regular" as a department');
  assert.strictEqual(row[4], '', 'Preserves blank when no authoritative department assigned');
});

runBehavioralTest('29. Withdrawal after CNE start time is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  // First register while in future
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  // Advance CNE start time to the past
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2021-01-01T10:00');

  const withdrawRes = sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(withdrawRes.success, false);
  assert.strictEqual(withdrawRes.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('30. Preserved historical interest after CNE deletion and rejection of new registrations', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const nurseAlpha = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin', passwordVersion: 1 };

  // Alpha registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);

  // Admin deletes CNE
  const deleteRes = sandbox.handleDeleteCNE({
    cneId: 'CNE-2026-FUT1',
    reason: 'Routine program schedule retirement',
    confirmationCneId: 'CNE-2026-FUT1'
  }, adminSession);
  assert.strictEqual(deleteRes.success, true);

  // Historical record in CNE Interest Registrations is preserved
  const intSheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(intSheet.getLastRow(), 2, 'Historical interest registration remains intact in sheet');
  const row = intSheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[0], 'CNE-2026-FUT1');
  assert.strictEqual(row[1], 'EMP-NURSE-01');

  // New registration on deleted CNE is rejected
  const regDeleted = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);
  assert.strictEqual(regDeleted.success, false);
  assert.strictEqual(regDeleted.errorCode, 'CNE_NOT_FOUND');
});

// =============================================================================
// DATE AND TIME VALIDATION CORRECTION TESTS (Phase 1 Final Enhancement)
// =============================================================================

runBehavioralTest('31. Valid leap-year date (2028-02-29) is accepted and allows interest registration', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Verify parser accepts 2028-02-29 (2028 is a leap year)
  const leapTs = sandbox.parseCneStartTimestamp_('2028-02-29T10:00');
  assert.ok(!isNaN(leapTs), '2028-02-29 must parse as valid timestamp');

  // Verify registration succeeds for valid leap year schedule
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-02-29T10:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, true, 'Registration must succeed for valid leap year date');
  assert.strictEqual(res.data.status, 'INTERESTED');
});

runBehavioralTest('32. Invalid leap-year date (2026-02-29) is rejected and denies registration with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // 2026 is non-leap year: Feb 29 does not exist
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-29')), '2026-02-29 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-29T10:00')), '2026-02-29T10:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('29-02-2026 10:00')), '29-02-2026 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('29-Feb-2026 10:00')), '29-Feb-2026 must return NaN');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2026-02-29T10:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, 'Invalid leap year date must be rejected');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('33. Invalid calendar dates (2026-02-30, 2026-04-31) are strictly rejected with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Calendar days overflow check (prevent JS Date rollover to March 2 or May 1)
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-30T14:00')), '2026-02-30 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-31T14:00')), '2026-02-31 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-04-31T14:00')), '2026-04-31 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('30-02-2026 14:00')), '30-02-2026 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('31-Apr-2026 14:00')), '31-Apr-2026 must return NaN');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2026-02-30T14:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, '2026-02-30 schedule date must reject registration');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('34. Invalid month values (month 00, month 13) and day values (day 00, day 32) are rejected', () => {
  const { sandbox } = createFreshTestEnvironment();

  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-00-15')), 'Month 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-13-15')), 'Month 13 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-00')), 'Day 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-32')), 'Day 32 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('15-00-2028')), 'DD-MM-YYYY month 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('15-13-2028')), 'DD-MM-YYYY month 13 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('00-10-2028')), 'DD-MM-YYYY day 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('32-10-2028')), 'DD-MM-YYYY day 32 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('00-Oct-2028')), 'DD-MMM-YYYY day 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('32-Oct-2028')), 'DD-MMM-YYYY day 32 must return NaN');
});

runBehavioralTest('35. Invalid time components (24:00, 25:00, 99:99, 10:60) are rejected with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Embedded time in ISO
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T24:00')), '24:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T25:00')), '25:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T99:99')), '99:99 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T10:60')), '10:60 must return NaN');

  // Separate time parameter
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '24:00')), 'Separate 24:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '25:00')), 'Separate 25:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '99:99')), 'Separate 99:99 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '10:60')), 'Separate 10:60 must return NaN');

  // Invalid 12-hour AM/PM
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '0:00 AM')), '0:00 AM must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '13:00 PM')), '13:00 PM must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '12:60 PM')), '12:60 PM must return NaN');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-10-25T99:99');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, 'Invalid time in schedule must reject registration');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('36. Malformed time strings (bogus, abc) are rejected with REGISTRATION_CLOSED instead of defaulting to midnight', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Separate bogus time strings must NOT be ignored to fall back to midnight
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', 'bogus')), 'time bogus must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', 'abc')), 'time abc must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '14:00bogus')), 'trailing garbage time must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25 bogus')), 'embedded bogus time must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T14:00bogus')), 'embedded trailing garbage must return NaN');

  // Rejection during registration when separate or embedded time is bogus
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-10-25 bogus');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, 'Bogus time in schedule must reject registration');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('37. All supported valid date/time formats parse reliably and identically', () => {
  const { sandbox } = createFreshTestEnvironment();

  // 1. ISO format: 2028-10-25T14:00
  const isoTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00');
  assert.ok(!isNaN(isoTs), 'ISO format must parse');

  // 2. Separate date and 24-hr time fields
  const sepTs = sandbox.parseCneStartTimestamp_('2028-10-25', '14:00');
  assert.strictEqual(sepTs, isoTs, 'Separate date and 24-hr time must match ISO');

  // 3. DD-MM-YYYY format with 24-hr time
  const dmyTs = sandbox.parseCneStartTimestamp_('25-10-2028 14:00');
  assert.strictEqual(dmyTs, isoTs, 'DD-MM-YYYY 14:00 must match ISO');

  // 4. DD-MMM-YYYY format with 24-hr time
  const dmmmTs = sandbox.parseCneStartTimestamp_('25-Oct-2028 14:00');
  assert.strictEqual(dmmmTs, isoTs, 'DD-MMM-YYYY 14:00 must match ISO');

  // 5. 12-hour AM/PM format: 02:00 PM
  const ampmTs = sandbox.parseCneStartTimestamp_('2028-10-25', '02:00 PM');
  assert.strictEqual(ampmTs, isoTs, '02:00 PM must match 14:00');

  // 6. Object input with fromDate and fromTime
  const objTs = sandbox.parseCneStartTimestamp_({ fromDate: '2028-10-25', fromTime: '14:00' });
  assert.strictEqual(objTs, isoTs, 'Object input with fromDate/fromTime must match ISO');

  // 7. Google Sheets Date object
  const dateObj = new Date(isoTs);
  const dateObjTs = sandbox.parseCneStartTimestamp_(dateObj);
  assert.strictEqual(dateObjTs, isoTs, 'Date object must match original timestamp');

  // 8. Date-only valid format (defaults to midnight Asia/Kolkata)
  const dateOnlyTs = sandbox.parseCneStartTimestamp_('2028-10-25');
  assert.ok(!isNaN(dateOnlyTs), 'Date-only string must parse to midnight');
  const expectedMidnight = Date.UTC(2028, 9, 25, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000;
  assert.strictEqual(dateOnlyTs, expectedMidnight, 'Date-only must represent midnight in Asia/Kolkata');
});

runBehavioralTest('38. Rejection of interest registration when schedule contains invalid date or invalid time', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');

  const invalidInputs = [
    '2026-02-30T14:00',
    '2026-04-31T14:00',
    '2026-02-29T14:00',
    '2028-10-25T99:99',
    '2028-10-25T25:00',
    '2028-10-25T10:60',
    '2028-10-25 bogus',
    'not-a-date'
  ];

  for (const input of invalidInputs) {
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, \`Input "\${input}" must be rejected\`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', \`Input "\${input}" must return REGISTRATION_CLOSED\`);
  }
});

runBehavioralTest('39. Asia/Kolkata timezone computation precision (UTC+05:30 offset)', () => {
  const { sandbox } = createFreshTestEnvironment();

  // At 14:00 in Asia/Kolkata (+05:30), the UTC time is exactly 08:30 (5 hours 30 mins earlier)
  const kolkataTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00');
  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0);
  assert.strictEqual(kolkataTs, expectedUtcMs, '2028-10-25 14:00 in Kolkata must equal 2028-10-25 08:30 UTC');

  // Verify ISO representation in UTC of the Kolkata timestamp
  const dateFromTs = new Date(kolkataTs);
  assert.strictEqual(dateFromTs.toISOString(), '2028-10-25T08:30:00.000Z', 'UTC string must reflect +05:30 offset');
});

runBehavioralTest('40. Frontend date/time utility functions (src/utils.ts) match backend strictness and parity', () => {
  // Read and verify src/utils.ts contains the required strict validation exports
  const utilsContent = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf8');

  assert.ok(utilsContent.includes('export function isValidCalendarDate'), 'utils.ts must export isValidCalendarDate');
  assert.ok(utilsContent.includes('export function parseStrictTime'), 'utils.ts must export parseStrictTime');
  assert.ok(utilsContent.includes('export function parseCneStartTimestamp'), 'utils.ts must export parseCneStartTimestamp');
  assert.ok(utilsContent.includes('export function parseToIsoDateString'), 'utils.ts must export parseToIsoDateString');

  // Verify function signatures and execution in sandbox
  const { sandbox } = createFreshTestEnvironment();
  assert.ok(sandbox.isValidCalendarDate_(2028, 2, 29), '2028-02-29 is valid leap day');
  assert.strictEqual(sandbox.isValidCalendarDate_(2026, 2, 29), false, '2026-02-29 is invalid non-leap day');
  assert.strictEqual(sandbox.isValidCalendarDate_(2026, 2, 30), false, '2026-02-30 is invalid day');
  assert.strictEqual(sandbox.isValidCalendarDate_(2026, 4, 31), false, '2026-04-31 is invalid day');

  const parsed14 = sandbox.parseStrictTime_('14:00');
  assert.ok(parsed14, '14:00 parsed');
  assert.strictEqual(parsed14.hour, 14, '14:00 hour');
  assert.strictEqual(parsed14.min, 0, '14:00 min');
  assert.strictEqual(parsed14.sec, 0, '14:00 sec');

  assert.ok(!isNaN(sandbox.parseCneStartTimestamp_('2028-02-29T10:00')), '2028-02-29 accepted');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-29T10:00')), '2026-02-29 rejected');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-30T14:00')), '2026-02-30 rejected');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T99:99')), '99:99 rejected');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', 'bogus')), 'bogus time rejected');
});

// =============================================================================
// ISO 8601 EXPLICIT TIMEZONE-OFFSET VALIDATION TESTS
// =============================================================================

runBehavioralTest('41. ISO 8601 timestamps with explicit timezone offsets (Z, +05:30, +01:00, -05:00) produce identical Unix epoch timestamps', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // 1. 2028-10-25T14:00:00+05:30 (Asia/Kolkata wall clock +05:30)
  const ts1 = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30');
  // 2. 2028-10-25T08:30:00Z (UTC instant)
  const ts2 = sandbox.parseCneStartTimestamp_('2028-10-25T08:30:00Z');
  // 3. 2028-10-25T09:30:00+01:00 (Central European Time +01:00)
  const ts3 = sandbox.parseCneStartTimestamp_('2028-10-25T09:30:00+01:00');
  // 4. 2028-10-25T03:30:00-05:00 (Eastern Standard Time -05:00)
  const ts4 = sandbox.parseCneStartTimestamp_('2028-10-25T03:30:00-05:00');

  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0); // 1856075400000

  assert.strictEqual(ts1, expectedUtcMs, '2028-10-25T14:00:00+05:30 must equal 2028-10-25 08:30 UTC');
  assert.strictEqual(ts2, expectedUtcMs, '2028-10-25T08:30:00Z must equal 2028-10-25 08:30 UTC');
  assert.strictEqual(ts3, expectedUtcMs, '2028-10-25T09:30:00+01:00 must equal 2028-10-25 08:30 UTC');
  assert.strictEqual(ts4, expectedUtcMs, '2028-10-25T03:30:00-05:00 must equal 2028-10-25 08:30 UTC');

  // Verify all four represent the exact same instant
  assert.strictEqual(ts1, ts2, 'Offsets +05:30 and Z must be equal');
  assert.strictEqual(ts2, ts3, 'Offsets Z and +01:00 must be equal');
  assert.strictEqual(ts3, ts4, 'Offsets +01:00 and -05:00 must be equal');

  // Verify interest registration succeeds with explicit ISO timezone in CNE schedule
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-10-25T14:00:00+05:30');
  const res1 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res1.success, true, 'Registration must succeed for +05:30 offset');
  assert.strictEqual(res1.data.status, 'INTERESTED');

  // Verify registration succeeds with UTC Z in CNE schedule
  schedSheet.getRange(2, 4).setValue('2028-10-25T08:30:00Z');
  const res2 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res2.success, true, 'Registration must succeed for Z UTC offset');
});

runBehavioralTest('42. Fractional-second ISO timestamps and local ISO timestamps without offsets parse accurately', () => {
  const { sandbox } = createFreshTestEnvironment();
  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0);

  // 1. Valid fractional-second timestamp with Z (500 ms)
  const tsFracZ = sandbox.parseCneStartTimestamp_('2028-10-25T08:30:00.500Z');
  assert.strictEqual(tsFracZ, expectedUtcMs + 500, 'Fractional seconds .500Z must add 500ms');

  // 2. Valid fractional-second timestamp with offset (123 ms)
  const tsFracOff = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00.123+05:30');
  assert.strictEqual(tsFracOff, expectedUtcMs + 123, 'Fractional seconds .123+05:30 must add 123ms');

  // 3. Valid ISO local timestamp without an offset (authoritatively Asia/Kolkata)
  const tsLocal = sandbox.parseCneStartTimestamp_('2028-10-25T14:00');
  assert.strictEqual(tsLocal, expectedUtcMs, 'Local 14:00 without offset must match Asia/Kolkata instant');

  const tsLocalSecs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00');
  assert.strictEqual(tsLocalSecs, expectedUtcMs, 'Local 14:00:00 without offset must match Asia/Kolkata instant');

  // 4. Valid separate date and time
  const tsSep = sandbox.parseCneStartTimestamp_('2028-10-25', '14:00');
  assert.strictEqual(tsSep, expectedUtcMs, 'Separate date and time without offset must match Asia/Kolkata instant');

  // 5. Valid Google Sheets Date object
  const tsDateObj = sandbox.parseCneStartTimestamp_(new Date(expectedUtcMs));
  assert.strictEqual(tsDateObj, expectedUtcMs, 'Google Sheets Date object must match original instant');
});

runBehavioralTest('43. Strict rejection of invalid calendar dates and invalid time components in ISO timestamps with offsets', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');

  const invalidInputs = [
    '2028-02-30T14:00:00+05:30', // Feb 30 impossible calendar date
    '2026-02-29T14:00:00+05:30', // Feb 29 non-leap year impossible date
    '2028-04-31T14:00:00+05:30', // April 31 impossible calendar date
    '2028-10-25T25:00:00+05:30', // Hour 25 invalid
    '2028-10-25T24:00:00+05:30', // Hour 24 invalid
    '2028-10-25T14:60:00Z',       // Minute 60 invalid
    '2028-10-25T14:00:60+05:30', // Second 60 invalid
    '2028-10-25T99:99:00+05:30'  // Hour/min 99:99 invalid
  ];

  for (const input of invalidInputs) {
    assert.ok(isNaN(sandbox.parseCneStartTimestamp_(input)), \`Input "\${input}" must return NaN\`);
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, \`Input "\${input}" must reject registration\`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', \`Input "\${input}" must return REGISTRATION_CLOSED\`);
  }
});

runBehavioralTest('44. Strict rejection of invalid timezone offsets (+25:00, -25:00, +05:60, malformed offsets)', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');

  const invalidOffsetInputs = [
    '2028-10-25T14:00:00+25:00',       // Offset hour 25 exceeds standards-compliant 23
    '2028-10-25T14:00:00-25:00',       // Negative offset hour 25 exceeds 23
    '2028-10-25T14:00:00+05:60',       // Offset minute 60 exceeds 59
    '2028-10-25T14:00:00+14:60',       // Offset minute 60 exceeds 59
    '2028-10-25T14:00:00+bogus',       // Non-numeric offset
    '2028-10-25T14:00:00+',            // Truncated offset sign
    '2028-10-25T14:00:00Ztrailing',    // Trailing garbage after Z
    '2028-10-25T14:00:00+05:30bogus'   // Trailing garbage after offset
  ];

  for (const input of invalidOffsetInputs) {
    assert.ok(isNaN(sandbox.parseCneStartTimestamp_(input)), \`Invalid offset "\${input}" must return NaN\`);
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, \`Invalid offset "\${input}" must reject registration\`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', \`Invalid offset "\${input}" must return REGISTRATION_CLOSED\`);
  }
});

runBehavioralTest('45. Precedence and contradictory date/time field handling with explicit timezones', () => {
  const { sandbox } = createFreshTestEnvironment();
  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0);

  // 1. Separate time agreeing with embedded time and explicit offset defines the instant
  const agreeingTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30', '14:00');
  assert.strictEqual(agreeingTs, expectedUtcMs, 'Agreeing separate time must preserve explicit timezone instant');

  // 2. Separate time contradicting embedded time with explicit offset must be rejected (return NaN)
  const contradictoryTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30', '16:00');
  assert.ok(isNaN(contradictoryTs), 'Contradictory separate time field must return NaN');

  // 3. Separate bogus time with embedded explicit timezone must be rejected
  const bogusSepTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30', 'bogus');
  assert.ok(isNaN(bogusSepTs), 'Bogus separate time field must return NaN');

  // 4. Record with contradictory fromDate and fromTime fields must return NaN
  const contradictoryRecord = sandbox.getCneStartTimestamp_({
    fromDate: '2028-10-25T14:00:00+05:30',
    fromTime: '16:00'
  });
  assert.ok(isNaN(contradictoryRecord), 'Contradictory schedule record must return NaN');
});

runBehavioralTest('46. Frontend utils.ts parity for ISO timezone offsets and strict validation', () => {
  const utilsContent = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf8');

  // Verify type exports and signatures
  assert.ok(utilsContent.includes('export interface StrictTimeComponents'), 'utils.ts must export StrictTimeComponents');
  assert.ok(utilsContent.includes('hasExplicitOffset: boolean'), 'StrictTimeComponents must have hasExplicitOffset');
  assert.ok(utilsContent.includes('offsetMinutesTotal: number'), 'StrictTimeComponents must have offsetMinutesTotal');

  const { sandbox } = createFreshTestEnvironment();

  // Test parseStrictTime_ with ISO offsets
  const parsedZ = sandbox.parseStrictTime_('08:30:00Z');
  assert.ok(parsedZ, '08:30:00Z should parse');
  assert.strictEqual(parsedZ.hour, 8);
  assert.strictEqual(parsedZ.min, 30);
  assert.strictEqual(parsedZ.hasExplicitOffset, true);
  assert.strictEqual(parsedZ.offsetMinutesTotal, 0);

  const parsedOffset = sandbox.parseStrictTime_('14:00:00+05:30');
  assert.ok(parsedOffset, '14:00:00+05:30 should parse');
  assert.strictEqual(parsedOffset.hour, 14);
  assert.strictEqual(parsedOffset.min, 0);
  assert.strictEqual(parsedOffset.hasExplicitOffset, true);
  assert.strictEqual(parsedOffset.offsetMinutesTotal, 330);

  const parsedNegOffset = sandbox.parseStrictTime_('03:30:00-05:00');
  assert.ok(parsedNegOffset, '03:30:00-05:00 should parse');
  assert.strictEqual(parsedNegOffset.hour, 3);
  assert.strictEqual(parsedNegOffset.min, 30);
  assert.strictEqual(parsedNegOffset.hasExplicitOffset, true);
  assert.strictEqual(parsedNegOffset.offsetMinutesTotal, -300);

  // Rejection of invalid offsets
  assert.strictEqual(sandbox.parseStrictTime_('14:00:00+25:00'), null, '+25:00 must return null');
  assert.strictEqual(sandbox.parseStrictTime_('14:60:00Z'), null, '14:60:00Z must return null');
  assert.strictEqual(sandbox.parseStrictTime_('25:00:00+05:30'), null, '25:00:00 must return null');
  assert.strictEqual(sandbox.parseStrictTime_('14:00:00+05:60'), null, '+05:60 must return null');
});

console.log('========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL CNE INTEREST BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\\n');

`
  },
  // ===== END ORIGINAL SUITE: verify-cne-interest.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-cne-read-performance.cjs =====
  {
    id: "performance",
    name: "CNE Read Performance Regression",
    originalFilename: "verify-cne-read-performance.cjs",
    mode: "commonjs",
    expectedChecks: 8,
    sha256: "4090b915dd75b575e11d484e32ee85e37033db85c60eec01d2ce78f0e631d4d0",
    source: `/**
 * CNE Read Performance & Bounded Query Regression Verification Suite
 *
 * Verifies performance optimizations for CNE Schedule, CNE Progress, and Attendance:
 *
 * 1. CNE Schedule records load independently of Area and Teaching Mode master data
 * 2. Ordinary staff are not blocked by or requested for unnecessary schedule-creation master data
 * 3. handleGetCNEActivityProgress() uses bounded, CNE-specific reads without full-sheet scans
 * 4. CNE Activity Progress counts, statuses, and calculations remain accurate
 * 5. handleGetCNEParticipants() retrieves records using bounded reads without loading full response history
 * 6. Participant details, scores, and attendance aggregations remain accurate and intact
 * 7. Authorization checks and role restrictions are strictly enforced for participant and progress data
 * 8. Edge cases (empty CNEs, missing records, invalid IDs) are handled safely without exceptions
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('================================================================');
console.log('   CNE READ PERFORMANCE & BOUNDED QUERY VERIFICATION SUITE');
console.log('================================================================\\n');

const rootDir = path.resolve(__dirname, '..');
const codeGsSource = fs.readFileSync(path.join(rootDir, 'Code.gs'), 'utf8');
const cneScheduleSource = fs.readFileSync(path.join(rootDir, 'src/components/CNESchedule.tsx'), 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${totalTests}. \${name}\`);
  } catch (err) {
    console.error(\`✗ \${totalTests}. \${name}\`);
    console.error(\`  Error: \${err.message}\\n\${err.stack}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// In-Memory Google Apps Script Mock Framework
// -----------------------------------------------------------------------------

class MockRange {
  constructor(sheet, startRow, startCol, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    this.sheet.recordRead(this.startRow, this.startCol, this.numRows, this.numCols);
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      const rowIndex = this.startRow - 1 + r;
      for (let c = 0; c < this.numCols; c++) {
        const colIndex = this.startCol - 1 + c;
        if (rowIndex < this.sheet.grid.length && colIndex < this.sheet.grid[rowIndex].length) {
          row.push(this.sheet.grid[rowIndex][colIndex]);
        } else {
          row.push('');
        }
      }
      result.push(row);
    }
    return result;
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => (v !== null && v !== undefined ? String(v) : '')));
  }

  getValue() {
    const vals = this.getValues();
    return vals[0] && vals[0][0] !== undefined ? vals[0][0] : '';
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIndex = this.startRow - 1 + r;
      while (this.sheet.grid.length <= rowIndex) {
        this.sheet.grid.push([]);
      }
      for (let c = 0; c < values[r].length; c++) {
        const colIndex = this.startCol - 1 + c;
        while (this.sheet.grid[rowIndex].length <= colIndex) {
          this.sheet.grid[rowIndex].push('');
        }
        this.sheet.grid[rowIndex][colIndex] = values[r][c];
      }
    }
    return this;
  }

  setValue(val) {
    return this.setValues([[val]]);
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setHorizontalAlignment() { return this; }
  setVerticalAlignment() { return this; }
  setWrap() { return this; }

  createTextFinder(query) {
    const range = this;
    const queryStr = String(query).trim().toLowerCase();
    return {
      matchEntireCell() { return this; },
      matchCase() { return this; },
      findNext() {
        const vals = range.getValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (String(vals[r][c] || '').trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              return {
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return String(vals[r][c]); },
                getValue() { return vals[r][c]; }
              };
            }
          }
        }
        return null;
      },
      findAll() {
        const matches = [];
        const vals = range.getValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (String(vals[r][c] || '').trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              matches.push({
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return String(vals[r][c]); },
                getValue() { return vals[r][c]; }
              });
            }
          }
        }
        return matches;
      }
    };
  }
}

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
    this.readOps = [];
    this.getDataRangeCount = 0;
  }

  recordRead(row, col, numRows, numCols) {
    this.readOps.push({ row, col, numRows, numCols });
  }

  resetReadOps() {
    this.readOps = [];
    this.getDataRangeCount = 0;
  }

  getName() { return this.name; }
  getLastRow() { return this.grid.length; }
  getLastColumn() {
    let max = 0;
    for (const r of this.grid) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  getMaxColumns() { return Math.max(30, this.getLastColumn()); }
  getMaxRows() { return Math.max(100, this.getLastRow()); }

  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }

  getDataRange() {
    this.getDataRangeCount++;
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  appendRow(rowVals) {
    this.grid.push([...rowVals]);
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  addSheet(name, grid) {
    const s = new MockSheet(name, this, grid);
    this.sheets[name] = s;
    return s;
  }

  insertSheet(name) {
    return this.addSheet(name, []);
  }
}

function createFreshTestEnvironment() {
  const cneSpreadsheet = new MockSpreadsheet();
  const officersSpreadsheet = new MockSpreadsheet();

  const scriptProperties = {
    DROPDOWN_SPREADSHEET_ID: 'officers_mock_id',
    CNE_SPREADSHEET_ID: 'cne_mock_id',
    SESSION_SECRET: 'test_session_secret_32bytes_minimum_length_required'
  };

  // 1. CNE Schedule
  cneSpreadsheet.addSheet('CNE Schedule', [
    [
      'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
      'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
      'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
      'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy',
      'Coverage Areas Snapshot', 'Total Allotted Staff', 'Internal Attendance Count',
      'Attendance Percentage', 'Post-Test Outcome Percentage', 'Coverage Finalized At'
    ],
    // CNE 1: Active Scheduled CNE in ICU with assigned RP EMP-RP-100
    [
      'CNE-2026-PERF1', 'Emergency Trauma Resuscitation', 'ICU', '2028-11-20T10:00', '2028-11-20T11:30', '90',
      'EMP-RP-100', 'Workshop', 'Hands-on trauma resuscitation', '40', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN', '', '', '', '', '', ''
    ],
    // CNE 2: Completed Departmental CNE in OT with assigned RP EMP-RP-200
    [
      'CNE-2026-PERF2', 'Surgical Asepsis & Sterilization', 'OT', '2026-10-01T09:00', '2026-10-01T10:30', '90',
      'EMP-RP-200', 'Lecture', 'Sterile techniques in operating rooms', '30', 'Completed',
      'DEPARTMENTAL', '', '', '0', '',
      'EMP-RP-200', '', '', '2026-09-15', 'EMP-RP-200', '', '', '', '', '', ''
    ],
    // CNE 3: Empty CNE with no questions, participants, or material
    [
      'CNE-2026-EMPTY', 'Unpopulated Scheduled Topic', 'Emergency', '2028-12-01T09:00', '2028-12-01T10:00', '60',
      'EMP-RP-100', 'Lecture', 'Initial draft session', '30', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN', '', '', '', '', '', ''
    ]
  ]);

  // 2. CNE Post Test Questions
  cneSpreadsheet.addSheet('CNE Post Test Questions', [
    [
      'CNE ID', 'Question ID', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D',
      'Correct Option', 'Explanation', 'Is Finalized', 'Is Locked', 'Created At', 'Created By',
      'Authoritative Source', 'Status'
    ],
    // 5 finalized active questions for CNE-2026-PERF1
    ['CNE-2026-PERF1', 'Q1', 'Question 1', 'A', 'B', 'C', 'D', 'A', 'Expl 1', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q2', 'Question 2', 'A', 'B', 'C', 'D', 'B', 'Expl 2', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q3', 'Question 3', 'A', 'B', 'C', 'D', 'C', 'Expl 3', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q4', 'Question 4', 'A', 'B', 'C', 'D', 'D', 'Expl 4', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q5', 'Question 5', 'A', 'B', 'C', 'D', 'A', 'Expl 5', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    // 1 draft/unfinalized question
    ['CNE-2026-PERF1', 'Q6', 'Question 6 Draft', 'A', 'B', 'C', 'D', 'B', 'Expl 6', 'NO', 'NO', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    // Questions for another CNE
    ['CNE-OTHER-999', 'Q100', 'Other Q', 'A', 'B', 'C', 'D', 'A', 'Expl', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE']
  ]);

  // 3. CNE Reference
  cneSpreadsheet.addSheet('CNE_Reference', [
    [
      'CNE ID', 'Topic', 'Reference Text / Clinical Guides', 'Updated At', 'Updated By',
      'Drive File ID', 'File Name', 'File Type', 'Resource Person Name', 'File Size',
      'Indexing Status', 'Indexing Error Code', 'Indexing Message', 'Chunks Count', 'Indexed At'
    ],
    [
      'CNE-2026-PERF1', 'Emergency Trauma Resuscitation',
      'Comprehensive trauma clinical management protocols and guidelines for ICU emergency resuscitation.',
      '2026-10-10', 'EMP-RP-100', '', '', '', 'Dr. Speaker', '0', 'READY', '', '', '1', '2026-10-10'
    ]
  ]);

  // 4. CNE QR Tokens
  cneSpreadsheet.addSheet('CNE_QR_Tokens', [
    ['QR Token', 'CNE ID', 'Created At', 'Created By', 'Status'],
    ['QR-TOKEN-PERF1-ABC', 'CNE-2026-PERF1', '2026-10-10T10:00:00Z', 'EMP-RP-100', 'ACTIVE'],
    ['QR-TOKEN-EXPIRED-XYZ', 'CNE-2026-PERF1', '2026-10-09T10:00:00Z', 'EMP-RP-100', 'REVOKED']
  ]);

  // 5. CNE Post Test Responses (Simulate large response history with 50+ rows for other CNEs)
  const initialResponses = [
    [
      'Response ID', 'CNE ID', 'Employee ID', 'Employee Name', 'Designation', 'Department',
      'Score', 'Total Questions', 'Percentage', 'Source', 'Submitted At', 'Answers JSON', 'Status', 'Remarks'
    ],
    // Rows for CNE-2026-PERF1:
    // Participant 1: Completed post-test with 80% score
    ['RESP-101', 'CNE-2026-PERF1', 'EMP-STF-001', 'John Doe', 'Nursing Officer', 'ICU', 8, 10, 80, 'POST_TEST', '2026-10-15T10:00:00Z', '{"q1":"A","largeAnswersPayload":"..."}', 'ATTENDED', ''],
    // Participant 2: Completed post-test with 90% score
    ['RESP-102', 'CNE-2026-PERF1', 'EMP-STF-002', 'Jane Smith', 'Senior Nursing Officer', 'ICU', 9, 10, 90, 'POST_TEST', '2026-10-15T10:05:00Z', '{"q1":"B","largeAnswersPayload":"..."}', 'ATTENDED', ''],
    // Participant 3: Manual check-in (no post-test)
    ['RESP-103', 'CNE-2026-PERF1', 'EMP-STF-003', 'Bob Johnson', 'Nursing Officer', 'ICU', '', '', '', 'MANUAL', '2026-10-15T10:10:00Z', '', 'ATTENDED', 'Manual registration'],
    // Duplicate entry for Participant 1 (earlier manual check-in row superseded by post-test)
    ['RESP-104', 'CNE-2026-PERF1', 'EMP-STF-001', 'John Doe', 'Nursing Officer', 'ICU', '', '', '', 'MANUAL', '2026-10-15T09:45:00Z', '', 'ATTENDED', 'Check-in before test']
  ];

  // Add 60 unrelated rows for other CNEs with large payload strings to simulate production scale
  for (let i = 1; i <= 60; i++) {
    initialResponses.push([
      \`RESP-OTHER-\${i}\`,
      \`CNE-OTHER-\${Math.floor(i / 10)}\`,
      \`EMP-EXT-\${1000 + i}\`,
      \`External Nurse \${i}\`,
      'Nursing Officer',
      'Ward-X',
      7,
      10,
      70,
      'POST_TEST',
      '2026-09-01T12:00:00Z',
      JSON.stringify({ answers: Array(20).fill('Massive question payload text to simulate heavy sheet storage') }),
      'ATTENDED',
      'Historical record'
    ]);
  }

  cneSpreadsheet.addSheet('CNE Post Test Responses', initialResponses);

  // 6. Officers Data
  officersSpreadsheet.addSheet('Officers data', [
    ['Emp ID', 'Name', 'Designation', 'Area', 'Mobile', 'Email', 'Role'],
    ['EMP-ADM-001', 'System Administrator', 'Senior Registrar', 'Administration', '9999999991', 'admin@aiims.edu', 'ADMIN'],
    ['EMP-RP-100', 'Dr. Speaker One', 'Assistant Professor', 'ICU', '9999999992', 'rp1@aiims.edu', 'RESOURCE_PERSON'],
    ['EMP-RP-200', 'Dr. Speaker Two', 'Associate Professor', 'OT', '9999999993', 'rp2@aiims.edu', 'RESOURCE_PERSON'],
    ['EMP-INC-001', 'Sister Incharge ICU', 'Chief Nursing Officer', 'ICU', '9999999994', 'inc_icu@aiims.edu', 'AREA_INCHARGE'],
    ['EMP-INC-002', 'Sister Incharge Peds', 'Chief Nursing Officer', 'Pediatrics', '9999999995', 'inc_peds@aiims.edu', 'AREA_INCHARGE'],
    ['EMP-STF-001', 'Staff Nurse John', 'Nursing Officer', 'ICU', '9999999996', 'john@aiims.edu', 'STAFF']
  ]);

  const scriptLock = {
    hasLock: false,
    waitLock() { this.hasLock = true; return true; },
    releaseLock() { this.hasLock = false; }
  };

  const cacheStore = {};

  const sandbox = {
    Logger: { log: () => {} },
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    JSON,
    SpreadsheetApp: {
      openById(id) {
        if (id === 'officers_mock_id') return officersSpreadsheet;
        return cneSpreadsheet;
      },
      getActiveSpreadsheet() {
        return cneSpreadsheet;
      },
      flush() {}
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) { return scriptProperties[k] || null; },
          getProperties() { return { ...scriptProperties }; },
          setProperty(k, v) { scriptProperties[k] = v; }
        };
      }
    },
    LockService: {
      getScriptLock() { return scriptLock; }
    },
    CacheService: {
      getScriptCache() {
        return {
          get(k) { return cacheStore[k] || null; },
          put(k, v) { cacheStore[k] = v; },
          remove(k) { delete cacheStore[k]; }
        };
      }
    },
    Utilities: {
      formatDate(date, tz, fmt) {
        if (date instanceof Date) {
          try {
            const dtf = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz || 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            const parts = dtf.formatToParts(date);
            const p = {};
            for (const pt of parts) p[pt.type] = pt.value;
            return \`\${p.year}-\${p.month}-\${p.day}T\${p.hour}:\${p.minute}:\${p.second}\`;
          } catch (e) {
            return date.toISOString();
          }
        }
        return String(date);
      },
      computeHmacSha256Signature() { return [1, 2, 3]; },
      base64Encode() { return 'mock_token'; }
    },
    Session: {
      getScriptTimeZone() { return 'Asia/Kolkata'; }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);

  return {
    cneSpreadsheet,
    officersSpreadsheet,
    sandbox,
    responsesSheet: cneSpreadsheet.getSheetByName('CNE Post Test Responses'),
    questionsSheet: cneSpreadsheet.getSheetByName('CNE Post Test Questions'),
    referenceSheet: cneSpreadsheet.getSheetByName('CNE_Reference')
  };
}

// =============================================================================
// TEST SUITE: 8 REQUIRED PERFORMANCE REGRESSION TESTS
// =============================================================================

// -----------------------------------------------------------------------------
// Test 1: CNE Schedule records load independently of Area and Teaching Mode master data
// -----------------------------------------------------------------------------
runTest('CNE Schedule records load independently of Area and Teaching Mode master data', () => {
  // 1. Verify source architecture in CNESchedule.tsx
  assert.ok(
    cneScheduleSource.includes('void ApiService.getAreas()'),
    'CNESchedule must trigger ApiService.getAreas() as an independent background promise'
  );
  assert.ok(
    cneScheduleSource.includes('void ApiService.getTeachingModes()'),
    'CNESchedule must trigger ApiService.getTeachingModes() as an independent background promise'
  );
  assert.ok(
    !cneScheduleSource.includes('Promise.all([ApiService.getAreas()'),
    'CNESchedule must NOT gate record rendering behind a Promise.all barrier with master data'
  );
  assert.ok(
    cneScheduleSource.includes('const clsRes = await ApiService.getCNERecords();'),
    'CNESchedule must await ApiService.getCNERecords() directly to render primary schedule records promptly'
  );

  // 2. Behavioral simulation: verify that schedule records resolve independently of slow master data
  let masterDataCompleted = false;
  let scheduleLoaded = false;

  const mockApiService = {
    getAreas: () => new Promise((resolve) => {
      setTimeout(() => {
        masterDataCompleted = true;
        resolve({ success: true, data: [{ name: 'ICU', status: 'ACTIVE' }] });
      }, 250);
    }),
    getTeachingModes: () => new Promise((resolve) => {
      setTimeout(() => {
        masterDataCompleted = true;
        resolve({ success: true, data: [{ name: 'Lecture', status: 'ACTIVE' }] });
      }, 250);
    }),
    getCNERecords: () => new Promise((resolve) => {
      setTimeout(() => {
        scheduleLoaded = true;
        resolve({ success: true, data: [{ cneId: 'CNE-2026-PERF1', topic: 'Trauma' }] });
      }, 10);
    })
  };

  const simulateLoadData = async (canSchedule) => {
    if (canSchedule) {
      void mockApiService.getAreas();
      void mockApiService.getTeachingModes();
    }
    const res = await mockApiService.getCNERecords();
    return res.data;
  };

  const start = Date.now();
  return simulateLoadData(true).then((data) => {
    const elapsed = Date.now() - start;
    assert.strictEqual(scheduleLoaded, true, 'Schedule records must be loaded');
    assert.strictEqual(masterDataCompleted, false, 'Schedule must return before slow master data finishes');
    assert.ok(elapsed < 100, \`Schedule loading took \${elapsed}ms, should be < 100ms and independent of master data\`);
    assert.strictEqual(data.length, 1);
  });
});

// -----------------------------------------------------------------------------
// Test 2: Ordinary employees are not required to wait for unnecessary schedule-creation master data
// -----------------------------------------------------------------------------
runTest('Ordinary staff are not blocked by or requested for unnecessary schedule-creation master data', () => {
  // 1. Source verification: canScheduleCne gate guards master data loading
  assert.ok(
    cneScheduleSource.includes('const canScheduleCne = isAdmin || isAreaIncharge;'),
    'CNESchedule must compute canScheduleCne for Admin or Area Incharge roles only'
  );
  assert.ok(
    cneScheduleSource.includes('if (canScheduleCne) {'),
    'CNESchedule must gate master data requests strictly behind canScheduleCne'
  );

  // 2. Behavioral verification: staff user triggers 0 master data calls
  let areasCallCount = 0;
  let teachingModesCallCount = 0;
  let cneRecordsCallCount = 0;

  const staffUser = { employeeId: 'EMP-STF-001', role: 'STAFF', name: 'Nurse' };
  const isAdmin = staffUser.role === 'ADMIN';
  const isAreaIncharge = staffUser.role === 'AREA_INCHARGE' || staffUser.role === 'INCHARGE';
  const canScheduleCne = isAdmin || isAreaIncharge;

  assert.strictEqual(canScheduleCne, false, 'Ordinary staff role must have canScheduleCne = false');

  const mockApi = {
    getAreas: () => { areasCallCount++; return Promise.resolve({ success: true, data: [] }); },
    getTeachingModes: () => { teachingModesCallCount++; return Promise.resolve({ success: true, data: [] }); },
    getCNERecords: () => { cneRecordsCallCount++; return Promise.resolve({ success: true, data: [{ cneId: 'CNE-1' }] }); }
  };

  // Simulate CNESchedule loadData workflow for staff user
  if (canScheduleCne) {
    void mockApi.getAreas();
    void mockApi.getTeachingModes();
  }
  return mockApi.getCNERecords().then((res) => {
    assert.strictEqual(areasCallCount, 0, 'getAreas must NOT be called for ordinary staff');
    assert.strictEqual(teachingModesCallCount, 0, 'getTeachingModes must NOT be called for ordinary staff');
    assert.strictEqual(cneRecordsCallCount, 1, 'getCNERecords must be called for ordinary staff');
    assert.strictEqual(res.success, true);
  });
});

// -----------------------------------------------------------------------------
// Test 3: handleGetCNEActivityProgress() uses bounded, CNE-specific reads
// -----------------------------------------------------------------------------
runTest('handleGetCNEActivityProgress uses bounded, CNE-specific reads without full-sheet scans', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  env.responsesSheet.resetReadOps();
  env.questionsSheet.resetReadOps();
  env.referenceSheet.resetReadOps();

  const result = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-PERF1', forceFresh: true },
    adminSession
  );

  assert.strictEqual(result.success, true, 'handleGetCNEActivityProgress must succeed');

  // Verify response sheet bounded read:
  // Must NOT call getDataRange() on the full responses sheet
  assert.strictEqual(
    env.responsesSheet.getDataRangeCount,
    0,
    'Responses sheet must NEVER have getDataRange() called during activity progress read'
  );

  // Must only read bounded columns B:D (column 2, 3 columns wide)
  const respBoundedReads = env.responsesSheet.readOps.filter(op => op.col === 2 && op.numCols === 3);
  assert.ok(
    respBoundedReads.length > 0,
    'Responses sheet read must be bounded to columns B:D (CNE ID, Employee ID, Name)'
  );

  // Large answers JSON column (column 12 / L) must NOT be read during progress check
  const answersJsonReads = env.responsesSheet.readOps.filter(op => op.col <= 12 && (op.col + op.numCols - 1) >= 12);
  assert.strictEqual(
    answersJsonReads.length,
    0,
    'handleGetCNEActivityProgress must NOT read column 12 (Answers JSON) from responses sheet'
  );

  // Questions sheet must NOT have getDataRange() called
  assert.strictEqual(
    env.questionsSheet.getDataRangeCount,
    0,
    'Questions sheet must NEVER have getDataRange() called during activity progress read'
  );

  // Reference sheet must NOT perform full sheet read
  assert.strictEqual(
    env.referenceSheet.getDataRangeCount,
    0,
    'Reference sheet must NEVER have getDataRange() called during activity progress read'
  );
});

// -----------------------------------------------------------------------------
// Test 4: Progress results and counts remain accurate after optimization
// -----------------------------------------------------------------------------
runTest('CNE Activity Progress counts, statuses, and calculations remain accurate', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  // 1. Check Scheduled CNE with active QR and 5 finalized questions
  const res1 = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-PERF1', forceFresh: true },
    adminSession
  );

  assert.strictEqual(res1.success, true);
  const data1 = res1.data;
  assert.strictEqual(data1.cneId, 'CNE-2026-PERF1');
  assert.strictEqual(data1.materialStatus, 'Added', 'Learning material must be "Added" when text >= 15 chars');
  assert.strictEqual(data1.questionsStatus, 'Generated', 'Questions status must be "Generated" when finalized count >= 5');
  assert.strictEqual(data1.finalizedQuestionsCount, 5, 'Finalized questions count must be exactly 5');
  assert.strictEqual(data1.requiredQuestionsCount, 5, 'Required questions count must be 5');
  assert.strictEqual(data1.qrStatus, 'Generated', 'QR status must be "Generated" with active token');
  assert.strictEqual(data1.participantsCount, 3, 'Unique participants count must be 3 (deduplicating multiple entries)');
  assert.strictEqual(data1.postTestStatus, 'Available', 'Post-test must be "Available" for scheduled CNE with QR and questions');
  assert.strictEqual(data1.finalizationStatus, 'Not Finalized');

  // 2. Check Completed CNE
  const res2 = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-PERF2', forceFresh: true },
    adminSession
  );
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.data.postTestStatus, 'Completed', 'Post-test must be "Completed" for completed CNE');
  assert.strictEqual(res2.data.finalizationStatus, 'Finalized', 'Finalization must be "Finalized" for completed CNE');
});

// -----------------------------------------------------------------------------
// Test 5: handleGetCNEParticipants() retrieves records using bounded reads
// -----------------------------------------------------------------------------
runTest('handleGetCNEParticipants retrieves records using bounded reads without loading full response history', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  env.responsesSheet.resetReadOps();

  const res = env.sandbox.handleGetCNEParticipants(
    { cneId: 'CNE-2026-PERF1' },
    adminSession
  );

  assert.strictEqual(res.success, true, 'handleGetCNEParticipants must succeed');

  // Verify bounded read:
  // Must NOT call getDataRange()
  assert.strictEqual(
    env.responsesSheet.getDataRangeCount,
    0,
    'Responses sheet must NEVER have getDataRange() called during participant fetch'
  );

  // Must use bounded block read (firstColumn = 1, columnCount = 14) for matched rows
  const boundedReads = env.responsesSheet.readOps.filter(op => op.col === 1 && op.numCols === 14);
  assert.ok(
    boundedReads.length > 0,
    'handleGetCNEParticipants must read bounded blocks of matched rows'
  );

  // Unrelated rows for CNE-OTHER-* must not be part of the returned participants
  const participants = res.data.participants;
  for (const p of participants) {
    assert.strictEqual(p.cneId, 'CNE-2026-PERF1', 'Returned participants must only belong to requested CNE');
  }
});

// -----------------------------------------------------------------------------
// Test 6: Participant details, scores and attendance aggregations remain accurate
// -----------------------------------------------------------------------------
runTest('Participant details, scores, and attendance aggregations remain accurate and intact', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  const res = env.sandbox.handleGetCNEParticipants(
    { cneId: 'CNE-2026-PERF1' },
    adminSession
  );

  assert.strictEqual(res.success, true);
  const data = res.data;

  // Check overall counts
  assert.strictEqual(data.cneId, 'CNE-2026-PERF1');
  assert.strictEqual(data.totalParticipants, 3, 'Must have 3 unique participants');
  assert.strictEqual(data.postTestCount, 2, 'Must have 2 post-test participants');
  assert.strictEqual(data.manualCount, 1, 'Must have 1 manual participant');

  // Average score: (80 + 90) / 2 = 85.0
  assert.strictEqual(data.averageScore, 85, 'Average score must be 85.0 (only from post-test participants)');

  // Verify participant details and deduplication (POST_TEST takes precedence over earlier manual registration)
  const partMap = {};
  for (const p of data.participants) {
    partMap[p.employeeId] = p;
  }

  const p1 = partMap['EMP-STF-001'];
  assert.ok(p1, 'Participant 1 must exist');
  assert.strictEqual(p1.participantType, 'POST_TEST', 'POST_TEST type must take precedence over manual check-in row');
  assert.strictEqual(p1.score, 8);
  assert.strictEqual(p1.totalQuestions, 10);
  assert.strictEqual(p1.percentage, 80);
  assert.strictEqual(p1.status, 'ATTENDED');

  const p2 = partMap['EMP-STF-002'];
  assert.ok(p2, 'Participant 2 must exist');
  assert.strictEqual(p2.participantType, 'POST_TEST');
  assert.strictEqual(p2.score, 9);
  assert.strictEqual(p2.totalQuestions, 10);
  assert.strictEqual(p2.percentage, 90);

  const p3 = partMap['EMP-STF-003'];
  assert.ok(p3, 'Participant 3 must exist');
  assert.strictEqual(p3.participantType, 'MANUAL');
  assert.strictEqual(p3.score, null, 'Manual participants must have null score');
  assert.strictEqual(p3.percentage, null, 'Manual participants must have null percentage');
});

// -----------------------------------------------------------------------------
// Test 7: Authorization checks and employee role restrictions are preserved
// -----------------------------------------------------------------------------
runTest('Authorization checks and employee role restrictions are strictly enforced', () => {
  const env = createFreshTestEnvironment();

  const anonymousSession = null;
  const staffSession = { employeeId: 'EMP-STF-001', role: 'STAFF', name: 'Nurse' };
  const unassignedRpSession = { employeeId: 'EMP-RP-999', role: 'RESOURCE_PERSON', name: 'Dr. Other' };
  const assignedRpSession = { employeeId: 'EMP-RP-100', role: 'RESOURCE_PERSON', name: 'Dr. Speaker One' };
  const otherAreaInchargeSession = { employeeId: 'EMP-INC-002', role: 'AREA_INCHARGE', assignedArea: 'Pediatrics', assignedAreas: ['Pediatrics'] };
  const concernedAreaInchargeSession = { employeeId: 'EMP-INC-001', role: 'AREA_INCHARGE', assignedArea: 'ICU', assignedAreas: ['ICU'] };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  // 1. handleGetCNEParticipants authorization tests
  const unauthRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, anonymousSession);
  assert.strictEqual(unauthRes.success, false);
  assert.strictEqual(unauthRes.errorCode, 'UNAUTHORIZED');

  const staffRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, staffSession);
  assert.strictEqual(staffRes.success, false);
  assert.strictEqual(staffRes.errorCode, 'FORBIDDEN');

  const unassignedRpRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, unassignedRpSession);
  assert.strictEqual(unassignedRpRes.success, false);
  assert.strictEqual(unassignedRpRes.errorCode, 'FORBIDDEN');

  const otherAreaIncRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, otherAreaInchargeSession);
  assert.strictEqual(otherAreaIncRes.success, false);
  assert.strictEqual(otherAreaIncRes.errorCode, 'FORBIDDEN');

  // Authorized callers
  const assignedRpRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, assignedRpSession);
  assert.strictEqual(assignedRpRes.success, true, 'Assigned Resource Person must be authorized');

  const concernedIncRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, concernedAreaInchargeSession);
  assert.strictEqual(concernedIncRes.success, true, 'Concerned Area Incharge must be authorized');

  const adminRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, adminSession);
  assert.strictEqual(adminRes.success, true, 'Admin must be authorized');

  // 2. handleGetCNEActivityProgress authorization tests
  const progUnauth = env.sandbox.handleGetCNEActivityProgress({ cneId: 'CNE-2026-PERF1' }, anonymousSession);
  assert.strictEqual(progUnauth.success, false);
  assert.strictEqual(progUnauth.errorCode, 'UNAUTHORIZED');

  const progStaff = env.sandbox.handleGetCNEActivityProgress({ cneId: 'CNE-2026-PERF1' }, staffSession);
  assert.strictEqual(progStaff.success, false);
  assert.strictEqual(progStaff.errorCode, 'FORBIDDEN');
});

// -----------------------------------------------------------------------------
// Test 8: Edge cases (empty CNEs, missing records, invalid IDs) handled safely
// -----------------------------------------------------------------------------
runTest('Edge cases (empty CNEs, missing records, invalid IDs) are handled safely without exceptions', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  // 1. Missing or blank CNE ID
  const blankIdRes1 = env.sandbox.handleGetCNEActivityProgress({ cneId: '' }, adminSession);
  assert.strictEqual(blankIdRes1.success, false);
  assert.strictEqual(blankIdRes1.message, 'CNE ID is required.');

  const blankIdRes2 = env.sandbox.handleGetCNEParticipants({ cneId: '   ' }, adminSession);
  assert.strictEqual(blankIdRes2.success, false);
  assert.strictEqual(blankIdRes2.message, 'CNE ID is required.');

  // 2. Non-existent CNE ID
  const nonExistRes1 = env.sandbox.handleGetCNEActivityProgress({ cneId: 'CNE-DOES-NOT-EXIST' }, adminSession);
  assert.strictEqual(nonExistRes1.success, false);
  assert.ok(nonExistRes1.message.includes('CNE record not found'));

  const nonExistRes2 = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-DOES-NOT-EXIST' }, adminSession);
  assert.strictEqual(nonExistRes2.success, false);
  assert.ok(nonExistRes2.message.includes('CNE record not found'));

  // 3. Empty CNE (0 participants, 0 questions, no materials)
  const emptyProgRes = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-EMPTY', forceFresh: true },
    adminSession
  );
  assert.strictEqual(emptyProgRes.success, true);
  assert.strictEqual(emptyProgRes.data.materialStatus, 'Not Added');
  assert.strictEqual(emptyProgRes.data.questionsStatus, 'Not Generated');
  assert.strictEqual(emptyProgRes.data.finalizedQuestionsCount, 0);
  assert.strictEqual(emptyProgRes.data.qrStatus, 'Not Generated');
  assert.strictEqual(emptyProgRes.data.participantsCount, 0);
  assert.strictEqual(emptyProgRes.data.postTestStatus, 'Not Available');
  assert.strictEqual(emptyProgRes.data.finalizationStatus, 'Not Finalized');

  const emptyPartRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-EMPTY' }, adminSession);
  assert.strictEqual(emptyPartRes.success, true);
  assert.strictEqual(emptyPartRes.data.totalParticipants, 0);
  assert.strictEqual(emptyPartRes.data.postTestCount, 0);
  assert.strictEqual(emptyPartRes.data.manualCount, 0);
  assert.strictEqual(emptyPartRes.data.averageScore, null, 'Empty CNE averageScore must be null, never 0');
  assert.strictEqual(Array.isArray(emptyPartRes.data.participants), true);
  assert.strictEqual(emptyPartRes.data.participants.length, 0);

  // 4. Direct test of readMatchedCneRows_ on unmatched queries
  const unmatchedResult = env.sandbox.readMatchedCneRows_(env.responsesSheet, 1, 'NON-MATCHING-CNE', 1, 14);
  assert.strictEqual(Array.isArray(unmatchedResult), true);
  assert.strictEqual(unmatchedResult.length, 0, 'readMatchedCneRows_ must return empty array for unmatched CNE without throwing');
});

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\\n================================================================');
console.log(\`CNE Read Performance Verification: \${passedTests}/\${totalTests} tests passed\`);
console.log('================================================================\\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
`
  },
  // ===== END ORIGINAL SUITE: verify-cne-read-performance.cjs =====

];

function runSuite(suite) {
  const actualHash = createHash('sha256').update(suite.source).digest('hex');
  if (actualHash !== suite.sha256) {
    throw new Error(`Embedded suite ${suite.id} is incomplete or modified (SHA-256 mismatch). Check that the full TXT was pasted.`);
  }

  const args = suite.mode === 'module'
    ? ['--input-type=module', '-']
    : ['--input-type=commonjs', '-'];

  // Give embedded ESM tests their original scripts/ directory identity so
  // fileURLToPath(import.meta.url) still resolves to this project's root.
  const source = suite.mode === 'module'
    ? `const __CNE_SUITE_IMPORT_META_URL = ${JSON.stringify(SCRIPT_URL)};\n` +
      suite.source.replaceAll('import.meta.url', '__CNE_SUITE_IMPORT_META_URL')
    : `var __dirname = ${JSON.stringify(SCRIPT_DIR)};\n` +
      `var __filename = ${JSON.stringify(join(SCRIPT_DIR, 'verify-all.js'))};\n` +
      suite.source;

  // Isolated worker processes retain exactly the same fail-fast semantics as
  // the independent test scripts (including process.exit and thrown asserts).
  return execFileSync(process.execPath, args, {
    cwd: ROOT_DIR,
    input: source,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180000
  });
}

const suiteFlagIndex = process.argv.indexOf('--suite');
if (suiteFlagIndex !== -1 && !process.argv[suiteFlagIndex + 1]) {
  console.error('Missing suite name after --suite.');
  process.exit(2);
}
const wantedSuite = suiteFlagIndex !== -1 ? process.argv[suiteFlagIndex + 1] : null;
const selected = wantedSuite ? suites.filter(s => s.id === wantedSuite) : suites;
if (!selected.length) {
  console.error(`Unknown suite: ${wantedSuite}. Available: ${suites.map(s=>s.id).join(', ')}`);
  process.exit(2);
}

console.log('================================================================');
console.log('CNE MANAGEMENT SYSTEM - CONSOLIDATED VERIFICATION');
console.log('================================================================');

let passed = 0;
let passedChecks = 0;
for (const s of selected) {
  console.log(`\n>>> ${s.name} (${s.expectedChecks} baseline checks)`);
  const begin = Date.now();
  try {
    const output = runSuite(s);
    process.stdout.write(output);
    passed++;
    passedChecks += s.expectedChecks;
    console.log(`PASS: ${s.name} (${((Date.now() - begin)/1000).toFixed(2)}s)`);
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    console.error(`FAILED: ${s.name}: ${error.message}`);
  }
}
console.log('\n================================================================');
console.log(`Suites: ${passed}/${selected.length} passed; baseline checks covered by passing suites: ${passedChecks}/${selected.reduce((sum,s)=>sum+s.expectedChecks,0)}`);
console.log('================================================================');
if (passed !== selected.length) process.exit(1);
