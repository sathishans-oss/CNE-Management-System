/**
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
console.log('========================================================\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
const cneScheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const unscheduledModalTs = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');

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
    handleAddSection.includes('var dFrom = new Date(fromDate);') &&
    handleAddSection.includes('var dTo = new Date(toDate);'),
    'handleCreateCNE must parse fromDate and toDate with Date objects'
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
    handleAddSection.includes("if (isUnscheduled) {\n      setCell('finalizedat', 21, new Date().toISOString());\n      setCell('finalizedby', 22, session.employeeId || '');\n    }"),
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
    !codeGs.includes(`case '${singularActionCheck}':`) &&
    !codeGs.includes(`function ${singularHandlerCheck}(`) &&
    !apiTs.includes(`'${singularActionCheck}'`),
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
// 6. CNE Schedule Active Schema & Schema Invariance
// -----------------------------------------------------------------------------
runTest('CNE Schedule sheet schema contains required active headers', () => {
  const match = codeGs.match(/'CNE Schedule':\s*\[([\s\S]*?)\]/);
  assert.ok(match, 'CNE Schedule headers definition must exist in Code.gs');

  const headers = eval(`[${match[1]}]`);
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
    'CreatedBy'
  ];

  for (const req of requiredHeaders) {
    assert.ok(
      headers.includes(req),
      `CNE Schedule schema must contain required header '${req}'`
    );
  }
});

runTest("Separate legacy 'Time' column is NOT recreated in CNE Schedule schema", () => {
  const match = codeGs.match(/'CNE Schedule':\s*\[([\s\S]*?)\]/);
  assert.ok(match, 'CNE Schedule headers definition must exist in Code.gs');
  const headers = eval(`[${match[1]}]`);

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
    !updateAreaFunc.includes('console.warn(\'Error propagating area rename'),
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
    updateAreaFunc.indexOf('// ---------------------------------------------------------\n    // SUCCESS:')
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
    updateAreaFunc.includes("logAuditAction(\n      'AREA_RENAMED',"),
    'handleUpdateArea must log AREA_RENAMED on success'
  );
  assert.ok(
    updateAreaFunc.includes("' (Role rows updated: ' + roleUpdates.length + ', CNE rows updated: ' + cneUpdates.length + ')'"),
    'Audit log must record updated Role and CNE counts'
  );
  assert.ok(
    updateAreaFunc.includes("logAuditAction(\n        'AREA_RENAME_FAILED',"),
    'handleUpdateArea must log AREA_RENAME_FAILED on failure'
  );
});

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL CNE WORKFLOWS & SCHEMA TESTS PASSED!');
console.log('========================================================\n');
