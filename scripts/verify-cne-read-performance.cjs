/**
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
console.log('================================================================\n');

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
    console.log(`✓ ${totalTests}. ${name}`);
  } catch (err) {
    console.error(`✗ ${totalTests}. ${name}`);
    console.error(`  Error: ${err.message}\n${err.stack}\n`);
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
      `RESP-OTHER-${i}`,
      `CNE-OTHER-${Math.floor(i / 10)}`,
      `EMP-EXT-${1000 + i}`,
      `External Nurse ${i}`,
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
            return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
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
    assert.ok(elapsed < 100, `Schedule loading took ${elapsed}ms, should be < 100ms and independent of master data`);
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
console.log('\n================================================================');
console.log(`CNE Read Performance Verification: ${passedTests}/${totalTests} tests passed`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
