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
    codeGs.indexOf('function handleAddCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Date parsing with time support
  assert.ok(
    handleAddSection.includes('var dFrom = new Date(fromDate);') &&
    handleAddSection.includes('var dTo = new Date(toDate);'),
    'handleAddCNE must parse fromDate and toDate with Date objects'
  );
  assert.ok(
    handleAddSection.includes('Invalid Date & Time format.'),
    'handleAddCNE must validate Date & Time format'
  );

  // Chronological order verification
  assert.ok(
    handleAddSection.includes('To Date & Time must be equal to or later than From Date & Time.'),
    'handleAddCNE must validate that toDate is equal to or later than fromDate'
  );

  // Duration validation
  assert.ok(
    handleAddSection.includes('validateCneDuration(duration, fromDate, toDate)'),
    'handleAddCNE must validate duration against fromDate and toDate'
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
    codeGs.indexOf('function handleAddCNE'),
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
    codeGs.indexOf('function handleAddCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Area/ward check
  assert.ok(
    handleAddSection.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
    'handleAddCNE must validate area authorization via checkCNEAuthorized'
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
    codeGs.indexOf('function handleAddCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  assert.ok(
    handleAddSection.includes("var isUnscheduled = Boolean("),
    'handleAddCNE must calculate isUnscheduled flag'
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
    codeGs.indexOf('function migrateCNEApplicationsHeaderToCNEId')
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
  // Staff IDs, count, and external participants in handleAddCNE
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleAddCNE'),
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

  // Manual participant additions write to participant responses sheet
  const manualPartSection = codeGs.substring(
    codeGs.indexOf('function handleAddManualParticipant'),
    codeGs.indexOf('function handleGetCNEParticipants')
  );
  assert.ok(
    manualPartSection.includes('getResponsesSheet') && manualPartSection.includes("'MANUAL'"),
    'handleAddManualParticipant must record participant in responses sheet with MANUAL source'
  );

  // Post test submissions write participant record and update responses sheet
  const submitPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipant')
  );
  assert.ok(
    submitPostTestSection.includes('getResponsesSheet()') && submitPostTestSection.includes('ALREADY_SUBMITTED'),
    'handleSubmitPostTest must record in responses sheet and prevent duplicate submissions'
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

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL CNE WORKFLOWS & SCHEMA TESTS PASSED!');
console.log('========================================================\n');
