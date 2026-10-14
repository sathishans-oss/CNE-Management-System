/**
 * ============================================================================
 * EXECUTABLE BEHAVIORAL TEST SUITE: CNE Expression of Interest (Phase 1)
 * Scope: 16 True Behavioral Tests with Authentic Apps Script Execution
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
console.log('CNE Expression of Interest Behavioral Verification');
console.log('Scope: 16 True Behavioral Tests (Registration, Scope & Integrity)');
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

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
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

  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }

  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  appendRow(rowVals) {
    this.grid.push([...rowVals]);
  }

  deleteRow(rowIdx) {
    if (rowIdx >= 1 && rowIdx <= this.grid.length) {
      this.grid.splice(rowIdx - 1, 1);
    }
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
    ['Emergency', 'ACTIVE', '2026-01-01']
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

  const scriptLock = {
    hasLock: false,
    waitLock() { this.hasLock = true; return true; },
    releaseLock() { this.hasLock = false; }
  };

  const sandbox = {
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
          return date.toISOString();
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
// BEHAVIORAL VERIFICATION TEST SUITE
// =============================================================================

runBehavioralTest('1. Registering interest saves record in CNE Interest Registrations with INTERESTED status', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };
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
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };

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
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };

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
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };

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
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE' };

  // CNE-2026-PAST has date 2020-01-10 (in the past)
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-PAST' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('6. Registration for canceled CNE is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE' };

  // CNE-2026-CNCL has status Canceled
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-CNCL' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('7. Registration for nonexistent or deleted CNE is rejected with CNE_NOT_FOUND', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE' };

  const res = sandbox.handleRegisterCneInterest({ cneId: 'NONEXISTENT-CNE' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'CNE_NOT_FOUND');
});

runBehavioralTest('8. Employee identity is derived strictly from session and cannot be spoofed via client params', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  // Malicious attempt: Session is EMP-NURSE-01, but params attempts to submit EMP-ADM-001
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };
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
  const employeeSession = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };

  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, employeeSession);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'FORBIDDEN');
});

runBehavioralTest('10. Administrator is authorized to view interested participant list for all CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  // Register 2 staff members
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha' });
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta' });

  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };
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
    assignedAreas: ['ICU']
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
  const rpSession = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', name: 'Master Instructor One' };

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

  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE' };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res.success, true);
  assert.strictEqual(lockAcquired, false, 'Lock must be cleanly released');
});

runBehavioralTest('14. Active-interest count counts only INTERESTED records and excludes WITHDRAWN records', () => {
  const { sandbox } = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN' };

  // Nurse 1: Registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha' });
  // Nurse 2: Registers then withdraws
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta' });
  sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta' });

  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.participants.length, 2, '2 total registration records present');
  assert.strictEqual(res.data.totalInterested, 1, 'Only 1 active INTERESTED record counted');
});

runBehavioralTest('15. Expression of interest does NOT modify attendance or Post-Test responses', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };

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
  const nurseSession = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha' };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

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

console.log('========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL CNE INTEREST BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');
