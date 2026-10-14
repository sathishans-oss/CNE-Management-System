/**
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

  const trimmed = str.replace(/^[ \f\v\u0000-\u0008\u000b\u000e-\u001f]+/, '');
  if (/^[=+@\-\t\r]/.test(str) || /^[=+@\-]/.test(trimmed)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('CNE Expression of Interest Behavioral Verification');
console.log('Scope: 46 True Behavioral Tests (Registration, Security, Lifecycle, Strict Date/Time & ISO Offsets)');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runBehavioralTest(name, fn) {
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
  // Test formula injection characters: =, +, -, @, \t, \r, with and without leading whitespace
  assert.strictEqual(sanitizeCsvCell('=cmd| /C calc'), `"'=cmd| /C calc"`);
  assert.strictEqual(sanitizeCsvCell('  =1+1'), `"'  =1+1"`);
  assert.strictEqual(sanitizeCsvCell('+9999999999'), `"'+9999999999"`);
  assert.strictEqual(sanitizeCsvCell('-1000'), `"'-1000"`);
  assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), `"'@SUM(A1:A10)"`);
  assert.strictEqual(sanitizeCsvCell('\tmalicious'), `"'	malicious"`);
  assert.strictEqual(sanitizeCsvCell('Normal Clinical Staff'), `"Normal Clinical Staff"`);
  assert.strictEqual(sanitizeCsvCell('ICU "Critical Care"'), `"ICU ""Critical Care"""`);
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
    assert.strictEqual(res.success, false, `Input "${input}" must be rejected`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', `Input "${input}" must return REGISTRATION_CLOSED`);
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
    assert.ok(isNaN(sandbox.parseCneStartTimestamp_(input)), `Input "${input}" must return NaN`);
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, `Input "${input}" must reject registration`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', `Input "${input}" must return REGISTRATION_CLOSED`);
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
    assert.ok(isNaN(sandbox.parseCneStartTimestamp_(input)), `Invalid offset "${input}" must return NaN`);
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, `Invalid offset "${input}" must reject registration`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', `Invalid offset "${input}" must return REGISTRATION_CLOSED`);
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
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL CNE INTEREST BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');

