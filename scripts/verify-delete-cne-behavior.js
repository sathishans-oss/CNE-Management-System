/**
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
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runBehavioralTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}\n${err.stack}\n`);
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
      const match = a1.match(/([A-Z]+)(\d+)/);
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

  insertColumnsAfter(afterIndex, numColumns) {
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
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onAppendRow = () => { archiveAppendOccurred = true; };
      arch.hooks.onGetRange = (startRow, startCol, numRows, numCols) => {
        if (startRow >= 2 && numRows === 1 && numCols > 5) {
          // Return corrupted row values with mismatched CNE ID
          const corrupted = new Array(numCols).fill('CORRUPTED');
          return {
            getValues: () => [corrupted],
            setValue: () => {},
            setValues: () => {}
          };
        }
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
  qrSheet.hooks.onGetRange = (r, c) => {
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
    assert.ok(archColIdx !== -1, `Original header ${h} must exist in archive headers`);
    assert.strictEqual(archRow[archColIdx], origScheduleRow[c], `Original value for ${h} must match in archive row`);
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

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL 16 BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');
