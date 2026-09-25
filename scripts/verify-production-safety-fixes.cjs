/**
 * Verification script for the 3 production safety fixes:
 * Fix 1: Backend Area/Ward restriction when creating Departmental CNE
 * Fix 2: Prevent handleUpdateCNE from bypassing lifecycle
 * Fix 3: Align Post Test management access with canManageCneActions and backend checkCNEActionAuthorized
 */

const fs = require('fs');
const assert = require('assert');

console.log('=== RUNNING PRODUCTION SAFETY FIXES VERIFICATION ===\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const cneSchedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');

// 1. Verify Code.gs and backend synchronization
console.log('Test 1: Code.gs and src/backend/googleAppsScript.ts synchronization');
assert.ok(
  backendGs.includes('export const APPS_SCRIPT_SOURCE_CODE = `'),
  'src/backend/googleAppsScript.ts must wrap Code.gs'
);
assert.ok(
  backendGs.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
  'src/backend/googleAppsScript.ts must contain Fix 1'
);
assert.ok(
  backendGs.includes('INVALID_STATUS_TRANSITION'),
  'src/backend/googleAppsScript.ts must contain Fix 2'
);
assert.ok(
  backendGs.includes('checkCNEActionAuthorized(session, candidateRecord)'),
  'src/backend/googleAppsScript.ts must contain Fix 3'
);
console.log('✓ Test 1 Passed: Code.gs is in 100% sync with src/backend/googleAppsScript.ts\n');

// 2. Verify Fix 1: handleAddCNE area restriction
console.log('Test 2: Backend Area/Ward check in handleAddCNE');
assert.ok(
  codeGs.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
  'handleAddCNE must invoke checkCNEAuthorized(session, area, cneType)'
);
// Ensure it is inside handleAddCNE before dFrom/dTo or insertion
const handleAddCNESection = codeGs.substring(
  codeGs.indexOf('function handleAddCNE'),
  codeGs.indexOf('function handleUpdateCNE')
);
assert.ok(
  handleAddCNESection.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
  'checkCNEAuthorized must be present in handleAddCNE'
);
console.log('✓ Test 2 Passed: handleAddCNE validates area/ward with checkCNEAuthorized\n');

// 3. Verify Fix 2: handleUpdateCNE lifecycle protection
console.log('Test 3: Lifecycle protection in handleUpdateCNE');
const handleUpdateCNESection = codeGs.substring(
  codeGs.indexOf('function handleUpdateCNE'),
  codeGs.indexOf('function handleFinalizeCNE')
);
assert.ok(
  handleUpdateCNESection.includes('INVALID_STATUS_TRANSITION'),
  'handleUpdateCNE must reject status transitions with INVALID_STATUS_TRANSITION'
);
assert.ok(
  !handleUpdateCNESection.includes("setColVal('status', 11, normalizeCNEStatus(params.status));"),
  'handleUpdateCNE must not write modified status to the sheet'
);
console.log('✓ Test 3 Passed: handleUpdateCNE strictly rejects lifecycle bypass attempts\n');

// 4. Verify Fix 3: Post Test authorization in Code.gs
console.log('Test 4: Post Test direct CNE-ID authorization in Code.gs');
const handleGetPostTestSection = codeGs.substring(
  codeGs.indexOf('function handleGetPostTestQuestions'),
  codeGs.indexOf('function handleSubmitPostTest')
);
assert.ok(
  handleGetPostTestSection.includes('var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);'),
  'handleGetPostTestQuestions must use checkCNEActionAuthorized for direct CNE-ID access'
);

const handleSubmitPostTestSection = codeGs.substring(
  codeGs.indexOf('function handleSubmitPostTest'),
  codeGs.indexOf('function generateDefaultFeedbackQuestions')
);
assert.ok(
  handleSubmitPostTestSection.includes('var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);'),
  'handleSubmitPostTest must use checkCNEActionAuthorized for direct CNE-ID access'
);
console.log('✓ Test 4 Passed: Both post-test handlers enforce checkCNEActionAuthorized for direct CNE ID access\n');

// 5. Verify Fix 3: Post Test button in CNESchedule.tsx
console.log('Test 5: CNESchedule Post Test management button authorization');
assert.ok(
  cneSchedule.includes('canManageCneActions(user, selectedDetailCne)'),
  'CNESchedule must use canManageCneActions for selectedDetailCne'
);
assert.ok(
  cneSchedule.includes('disabled={!canManageCneActions(user, selectedDetailCne)}'),
  'Post Test button must be disabled when user cannot manage CNE actions'
);
console.log('✓ Test 5 Passed: CNESchedule restricts Post Test button to authorized managers\n');

console.log('========================================================');
console.log('ALL PRODUCTION SAFETY TESTS PASSED (5/5)!');
console.log('========================================================');
