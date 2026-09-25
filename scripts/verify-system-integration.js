/**
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
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================');
console.log('System Integration Verification');
console.log('========================================================\n');

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
  const caseRegex = /case\s+'([^']+)'\s*:/g;
  let match;
  while ((match = caseRegex.exec(codeGs)) !== null) {
    backendCases.add(match[1]);
  }

  // Extract all executeAction calls in src/services/api.ts
  const frontendActions = new Set();
  const actionRegex = /executeAction(?:<[\s\S]*?>)?\s*\(\s*'([^']+)'/g;
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
    `Frontend actions with no backend router case: ${unhandledActions.join(', ')}`
  );

  // Check for duplicated router cases in the main switch block
  const mainSwitchMatch = codeGs.match(/switch\s*\(\s*action\s*\)\s*\{([\s\S]*?)\n\s*default:/);
  assert.ok(mainSwitchMatch, 'Main switch(action) block must exist in Code.gs');
  const switchBody = mainSwitchMatch[1];
  const switchCases = [];
  const switchCaseRegex = /case\s+'([^']+)'\s*:/g;
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
    `Duplicated active router case names in Code.gs: ${duplicateCases.join(', ')}`
  );
});

// -----------------------------------------------------------------------------
// 2. Code.gs Synchronization
// -----------------------------------------------------------------------------
runTest('Code.gs synchronized with TypeScript mirror', () => {
  // Normalize Code.gs using the established wrapper convention from scripts/sync-apps-script.js
  const escaped = codeGs
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  const expectedMirrorContent = `/**
 * Google Apps Script Source Export
 * Authoritative source: Code.gs
 * This file is automatically synchronized from Code.gs
 */
export const APPS_SCRIPT_SOURCE_CODE = \`${escaped}\`;

export const GOOGLE_APPS_SCRIPT_CODE = APPS_SCRIPT_SOURCE_CODE;
`;

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
  const viewModeMatch = typesTs.match(/export\s+type\s+ViewMode\s*=([\s\S]*?);/);
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
});

// -----------------------------------------------------------------------------
// 4. CNE Sheet Architecture & No Time Column
// -----------------------------------------------------------------------------
runTest('CNE Schedule sheet architecture & no obsolete Time column', () => {
  // Check CNE_SHEET_HEADERS in Code.gs
  const sheetHeadersMatch = codeGs.match(/var\s+CNE_SHEET_HEADERS\s*=\s*\{([\s\S]*?)\n\};/);
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
  const cneSchedHeadersMatch = codeGs.match(/'CNE Schedule':\s*\[([\s\S]*?)\]/);
  assert.ok(cneSchedHeadersMatch, "CNE Schedule headers array must be present in Code.gs");
  const headers = eval(`[${cneSchedHeadersMatch[1]}]`);

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
    assert.ok(headers.includes(h), `CNE Schedule schema must include required header '${h}'`);
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
  const finalizeCodeMatch = codeGs.match(/function\s+handleFinalizeCNE\s*\([\s\S]*?\n\}/);
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
    apiTs.includes("executeAction<CNEQuestion[]>('generateAiQuestions'"),
    "Frontend ApiService.generateAiQuestions must route through Apps Script action 'generateAiQuestions'"
  );

  // 2. Frontend does not call /api/ai/generate-questions
  const frontendFiles = getFilesRecursively('src');
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('/api/ai/generate-questions'),
      `File ${file} must not call obsolete endpoint /api/ai/generate-questions`
    );
  }

  // 3. No active Cloudflare Gemini function exists
  const hasCloudflareFunctions = fs.existsSync('functions') || fs.existsSync('worker') || fs.existsSync('workers');
  assert.strictEqual(
    hasCloudflareFunctions,
    false,
    'No Cloudflare Functions or Workers directory should exist for Gemini generation'
  );

  // 4. Gemini API key is not referenced in browser/client source
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('GEMINI_API_KEY'),
      `Client file ${file} must not reference GEMINI_API_KEY`
    );
    assert.ok(
      !content.includes('AIzaSy'),
      `Client file ${file} must not contain any hardcoded Google API key`
    );
  }

  // 5. Apps Script contains the active Gemini caller
  assert.ok(
    codeGs.includes("generativelanguage.googleapis.com"),
    "Code.gs must contain the active Gemini API endpoint caller"
  );
  assert.ok(
    codeGs.includes("function generateCNEQuestions(") || codeGs.includes("generateCNEQuestions"),
    "Code.gs must contain CNE question generation logic"
  );

  // 6. Apps Script reads Gemini configuration from Script Properties
  assert.ok(
    codeGs.includes("props.getProperty('GEMINI_API_KEY')"),
    "Code.gs must read GEMINI_API_KEY from Script Properties"
  );

  // 7. Exactly one production Gemini implementation
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert.ok(
    !serverTs.includes('generateContent') && !serverTs.includes('genai'),
    "server.ts must not implement a secondary/redundant Gemini caller"
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
  assert.ok(
    codeGs.includes("ext === 'pdf'") && codeGs.includes("0x25") && codeGs.includes("0x50"),
    "Code.gs uploadLearningResource must enforce PDF extension and binary signature"
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
  const indexMatch = codeGs.match(/function\s+indexReferenceLibraryResource\s*\([\s\S]*?\n\}/);
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
      `Critical repository file '${filePath}' must exist`
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
      `File ${file} contains what appears to be a real Google API key (AIzaSy...)`
    );
  }

  // 2. No PASSWORD_PEPPER secret value in frontend client files
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('PASSWORD_PEPPER'),
      `File ${file} must not reference PASSWORD_PEPPER`
    );
  }

  // 3. No SESSION_SECRET secret value in frontend client files
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('SESSION_SECRET'),
      `File ${file} must not reference SESSION_SECRET`
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
  const lines = envExample.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  for (const line of lines) {
    const val = line.split('=')[1]?.trim() || '';
    assert.ok(
      !val.startsWith('http://') && !val.startsWith('https://'),
      `.env.example must have an empty placeholder for URL, not a live production URL: ${line}`
    );
  }
});

// -----------------------------------------------------------------------------
// 10. Active API Methods & Cleanup Candidates
// -----------------------------------------------------------------------------
runTest('Active API methods wired correctly & cleanup candidates audited', () => {
  // Extract backend cases
  const backendCases = new Set();
  const caseRegex = /case\s+'([^']+)'\s*:/g;
  let m;
  while ((m = caseRegex.exec(codeGs)) !== null) {
    backendCases.add(m[1]);
  }

  // Extract ApiService methods
  const methodRegex = /static\s+(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  const methods = [];
  while ((m = methodRegex.exec(apiTs)) !== null) {
    if (!['isLiveBackendConnected', 'getAppsScriptUrl', 'executeLocalMockAction', 'executeAction', 'testConnection', 'logout', 'getSessionUser', 'getCurrentUser', 'saveSessionUser', 'invalidateCache'].includes(m[1])) {
      methods.push(m[1]);
    }
  }

  // Find all caller files in src
  const allSourceFiles = getFilesRecursively('src');
  const otherFilesContent = allSourceFiles
    .filter(f => !f.endsWith('api.ts') && !f.includes('googleAppsScript.ts'))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');

  const cleanupCandidates = [];
  const activeMethodsVerified = [];

  for (const method of methods) {
    // Find action called by this method
    const methodIdx = apiTs.indexOf(`static async ${method}`) !== -1 ? apiTs.indexOf(`static async ${method}`) : apiTs.indexOf(`static ${method}`);
    let actionName = null;
    if (methodIdx !== -1) {
      const slice = apiTs.slice(methodIdx, methodIdx + 600);
      const actMatch = slice.match(/executeAction(?:<[\s\S]*?>)?\s*\(\s*'([^']+)'/);
      if (actMatch) {
        actionName = actMatch[1];
      }
    }

    const hasCaller = otherFilesContent.includes(`ApiService.${method}`) || otherFilesContent.includes(`${method}(`);
    const hasBackend = actionName ? backendCases.has(actionName) : false;

    if (actionName) {
      assert.ok(
        hasBackend,
        `Active ApiService method '${method}' targets nonexistent backend action '${actionName}'`
      );
      activeMethodsVerified.push(method);
    }

    if (!hasCaller && !hasBackend) {
      cleanupCandidates.push({ method, actionName });
    }
  }

  assert.ok(activeMethodsVerified.length > 30, 'Should verify over 30 active ApiService methods');
  if (cleanupCandidates.length > 0) {
    console.log(`    Note: Found ${cleanupCandidates.length} cleanup candidate(s): ${cleanupCandidates.map(c => c.method).join(', ')}`);
  }
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
    "Central CNE creation workflow must render <CneDateTimeFields idPrefix=\"central-cne\" ... />"
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
    "Edit CNE workflow must render <CneDateTimeFields idPrefix=\"edit-cne\" ... />"
  );
});

// -----------------------------------------------------------------------------
// Summary Report
// -----------------------------------------------------------------------------
console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL SYSTEM INTEGRATION TESTS PASSED!');
console.log('========================================================\n');

process.exit(0);
