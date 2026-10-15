/**
 * Cross-Module Timezone & Date/Time Regression Test Suite
 *
 * Verifies application-wide date, time, and timezone consistency for:
 * 1. CNE Schedule parsing (Asia/Kolkata interpretation, rejection of invalid calendar dates / times)
 * 2. CNE start timestamps (ISO with Z, ISO with +05:30, negative offsets, timezone-less Asia/Kolkata, separate date & time)
 * 3. CNE duration calculations (elapsed time, calendar days touched, 8-hour cap rule, duration validation)
 * 4. Date formatting and display (consistent Indian local civil time, DD-MMM-YYYY, hh:mm AM/PM, datetime-local)
 * 5. Google Sheets Date objects (Date instances handled without unintended timezone shifts or rollovers)
 * 6. Invalid date/time rejection (impossible dates, invalid time components, invalid timezone offsets, contradictory fields)
 *
 * Cross-timezone execution:
 * Validates consistent behavior across:
 * - Asia/Kolkata
 * - UTC
 * - America/Los_Angeles
 *
 * Direct source functions from src/utils.ts are evaluated authoritative to production behavior.
 */

const assert = require('assert');
const path = require('path');
const child_process = require('child_process');
const esbuild = require('esbuild');

// Bundle src/utils.ts in memory to access authoritative production functions without touching disk
function loadUtils() {
  const entryPath = path.resolve(__dirname, '../src/utils.ts');
  const bundle = esbuild.buildSync({
    entryPoints: [entryPath],
    write: false,
    format: 'cjs',
    bundle: true,
    platform: 'node',
    target: 'node18'
  });

  const utils = {};
  const mod = { exports: utils };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', bundle.outputFiles[0].text);
  fn(mod, utils, require, path.dirname(entryPath), entryPath);
  return mod.exports;
}

// -----------------------------------------------------------------------------
// Test Suite Definition for a Specific Runtime Timezone
// -----------------------------------------------------------------------------

function runTestsForTimezone(tz) {
  process.env.TZ = tz;
  const utils = loadUtils();
  const {
    isValidCalendarDate,
    parseStrictTime,
    parseCneStartTimestamp,
    parseToIsoDateString,
    formatCneDateDisplay,
    formatCneDateRangeDisplay,
    formatCneDateTimeDisplay,
    formatCneDateTimeRangeDisplay,
    toDateTimeLocalString,
    parseDurationToSeconds,
    formatSecondsToDuration,
    getCalendarDaysTouched,
    calculateCneDuration,
    validateCneDuration,
    getIndiaTodayIsoDate
  } = utils;

  let passed = 0;
  let total = 0;
  const failures = [];

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [${tz}] ${name}`);
    } catch (err) {
      failures.push({ name, error: err });
      console.error(`  ✗ [${tz}] ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`Running Timezone Tests under TZ = ${tz}`);
  console.log(`============================================================`);

  // ---------------------------------------------------------------------------
  // 1. CNE Schedule Parsing & Validation
  // ---------------------------------------------------------------------------
  test('1.1 Valid schedule date & time in ISO format defaults to Asia/Kolkata (+05:30)', () => {
    // 2026-10-25 14:30:00 in Asia/Kolkata (+05:30) = 2026-10-25 09:00:00Z = 1792918800000 ms
    const epochCombined = parseCneStartTimestamp('2026-10-25T14:30:00');
    assert.strictEqual(epochCombined, 1792918800000, 'Timezone-less ISO must default to Asia/Kolkata (+05:30)');
  });

  test('1.2 Valid schedule date & separate time fields default to Asia/Kolkata (+05:30)', () => {
    const epochSeparate = parseCneStartTimestamp('2026-10-25', '14:30:00');
    assert.strictEqual(epochSeparate, 1792918800000, 'Separate date and time must default to Asia/Kolkata (+05:30)');
  });

  test('1.3 Valid schedule in DD-MMM-YYYY and 12-hour AM/PM parsed in Asia/Kolkata', () => {
    const epochDmmm = parseCneStartTimestamp('25-Oct-2026', '02:30 PM');
    assert.strictEqual(epochDmmm, 1792918800000, 'DD-MMM-YYYY with 12-hour AM/PM must match');
  });

  test('1.4 Valid schedule in DD/MM/YYYY and 24-hour time parsed in Asia/Kolkata', () => {
    const epochSlash = parseCneStartTimestamp('25/10/2026', '14:30');
    assert.strictEqual(epochSlash, 1792918800000, 'DD/MM/YYYY with 24-hr time must match');
  });

  test('1.5 Strict calendar date validator rejects impossible dates and non-leap years', () => {
    assert.strictEqual(isValidCalendarDate(2026, 2, 29), false, '2026-02-29 is non-leap year');
    assert.strictEqual(isValidCalendarDate(2024, 2, 29), true, '2024-02-29 is leap year');
    assert.strictEqual(isValidCalendarDate(2026, 4, 31), false, 'April has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 6, 31), false, 'June has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 9, 31), false, 'September has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 11, 31), false, 'November has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 13, 1), false, 'Month 13 is invalid');
    assert.strictEqual(isValidCalendarDate(2026, 0, 1), false, 'Month 0 is invalid');
    assert.strictEqual(isValidCalendarDate(2026, 10, 0), false, 'Day 0 is invalid');
    assert.strictEqual(isValidCalendarDate(2026, 10, 32), false, 'Day 32 is invalid');
  });

  test('1.6 parseCneStartTimestamp returns NaN for invalid calendar dates', () => {
    assert.ok(isNaN(parseCneStartTimestamp('2026-02-29T10:00:00')), 'parseCneStartTimestamp must return NaN for non-leap Feb 29');
    assert.ok(isNaN(parseCneStartTimestamp('2026-04-31T10:00:00')), 'parseCneStartTimestamp must return NaN for April 31');
    assert.ok(isNaN(parseCneStartTimestamp('31-Feb-2026', '10:00 AM')), 'parseCneStartTimestamp must return NaN for 31-Feb-2026');
  });

  test('1.7 Strict time parser rejects overflow hours, overflow minutes, and invalid 12-hour AM/PM', () => {
    assert.strictEqual(parseStrictTime('24:00'), null, '24:00 is not valid 24-hour time');
    assert.strictEqual(parseStrictTime('25:00'), null, '25:00 is overflow hour');
    assert.strictEqual(parseStrictTime('99:99'), null, '99:99 is invalid');
    assert.strictEqual(parseStrictTime('10:60'), null, '10:60 is overflow minute');
    assert.strictEqual(parseStrictTime('14:60:00Z'), null, '14:60:00Z is overflow minute');
    assert.strictEqual(parseStrictTime('13:00 PM'), null, '13:00 PM is invalid 12-hour hour');
    assert.strictEqual(parseStrictTime('0:00 AM'), null, '0:00 AM is invalid 12-hour hour');
    assert.strictEqual(parseStrictTime('00:30 PM'), null, '00:30 PM is invalid 12-hour hour');
    assert.strictEqual(parseStrictTime('bogus'), null, 'Non-time string must be rejected');
    assert.strictEqual(parseStrictTime(''), null, 'Empty string must be rejected');
  });

  // ---------------------------------------------------------------------------
  // 2. CNE Start Timestamps & Instant Equivalence
  // ---------------------------------------------------------------------------
  test('2.1 Handles ISO timestamps with explicit UTC Z', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0); // 1856075400000
    const tZ = parseCneStartTimestamp('2028-10-25T08:30:00Z');
    assert.strictEqual(tZ, expectedUtcMillis, 'ISO timestamp with Z matches absolute instant');
  });

  test('2.2 Handles ISO timestamps with explicit +05:30 offset', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0);
    const tAsia = parseCneStartTimestamp('2028-10-25T14:00:00+05:30');
    assert.strictEqual(tAsia, expectedUtcMillis, 'ISO timestamp with +05:30 matches absolute instant');
  });

  test('2.3 Handles ISO timestamps with negative offset (-05:00)', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0);
    const tEst = parseCneStartTimestamp('2028-10-25T03:30:00-05:00');
    assert.strictEqual(tEst, expectedUtcMillis, 'ISO timestamp with -05:00 matches absolute instant');
  });

  test('2.4 Equivalent timestamps across formats represent the exact same absolute instant', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0);
    const tZ = parseCneStartTimestamp('2028-10-25T08:30:00Z');
    const tAsia = parseCneStartTimestamp('2028-10-25T14:00:00+05:30');
    const tEst = parseCneStartTimestamp('2028-10-25T03:30:00-05:00');
    const tDefault = parseCneStartTimestamp('2028-10-25T14:00:00');
    const tSeparate = parseCneStartTimestamp('2028-10-25', '14:00:00');
    const tDmmmAmPm = parseCneStartTimestamp('25-Oct-2028', '02:00 PM');

    assert.strictEqual(tZ, expectedUtcMillis);
    assert.strictEqual(tAsia, expectedUtcMillis);
    assert.strictEqual(tEst, expectedUtcMillis);
    assert.strictEqual(tDefault, expectedUtcMillis);
    assert.strictEqual(tSeparate, expectedUtcMillis);
    assert.strictEqual(tDmmmAmPm, expectedUtcMillis);

    assert.strictEqual(tZ, tAsia, 'Z and +05:30 represent the exact same epoch instant');
    assert.strictEqual(tZ, tEst, 'Z and -05:00 represent the exact same epoch instant');
    assert.strictEqual(tZ, tDefault, 'Z and default Asia/Kolkata represent the exact same epoch instant');
  });

  // ---------------------------------------------------------------------------
  // 3. CNE Duration Calculations & Calendar Day Boundaries
  // ---------------------------------------------------------------------------
  test('3.1 Calculates single-day CNE duration from actual elapsed time', () => {
    const dur1 = calculateCneDuration('2026-10-25T09:00:00', '2026-10-25T11:30:00');
    assert.strictEqual(dur1, '02:30:00', 'Single-day duration is exact elapsed time');
  });

  test('3.2 Caps single-day CNE duration at 8 hours maximum', () => {
    const durCapped = calculateCneDuration('2026-10-25T06:00:00', '2026-10-25T18:00:00');
    assert.strictEqual(durCapped, '08:00:00', 'Single day duration capped at 8 hours maximum');
  });

  test('3.3 Computes Indian calendar days touched correctly', () => {
    const days1 = getCalendarDaysTouched('2026-10-25T09:00:00', '2026-10-25T17:00:00');
    assert.strictEqual(days1, 1, 'Same day touched count is 1');

    const days2 = getCalendarDaysTouched('2026-10-25T09:00:00', '2026-10-26T17:00:00');
    assert.strictEqual(days2, 2, 'Consecutive days touched count is 2');
  });

  test('3.4 Validates entered duration against 5-min minimum and daily 8-hour cap', () => {
    const vValid = validateCneDuration('02:30:00', '2026-10-25T09:00:00', '2026-10-25T11:30:00');
    assert.strictEqual(vValid.isValid, true, 'Valid duration passes validation');
    assert.strictEqual(vValid.maxDurationStr, '08:00:00', 'Max duration for 1 day is 08:00:00');

    const vUnder = validateCneDuration('00:04:00', '2026-10-25T09:00:00', '2026-10-25T11:30:00');
    assert.strictEqual(vUnder.isValid, false, 'Duration under 5 minutes rejected');

    const vOver = validateCneDuration('08:05:00', '2026-10-25T09:00:00', '2026-10-25T11:30:00');
    assert.strictEqual(vOver.isValid, false, 'Duration exceeding 8h daily cap rejected');

    const vInverted = validateCneDuration('01:00:00', '2026-10-25T12:00:00', '2026-10-25T10:00:00');
    assert.strictEqual(vInverted.isValid, false, 'Inverted dates rejected');
  });

  // ---------------------------------------------------------------------------
  // 4. Date Formatting and Display
  // ---------------------------------------------------------------------------
  test('4.1 Formats UTC ISO timestamp (2028-10-25T08:30:00Z) to 25-Oct-2028 02:00 PM (IST)', () => {
    const dtDisplay = formatCneDateTimeDisplay('2028-10-25T08:30:00Z');
    assert.strictEqual(dtDisplay, '25-Oct-2028 02:00 PM', 'formatCneDateTimeDisplay converts UTC to Indian civil time');
  });

  test('4.2 Formats UTC ISO timestamp to Indian calendar date DD-MMM-YYYY', () => {
    const dDisplay = formatCneDateDisplay('2028-10-25T08:30:00Z');
    assert.strictEqual(dDisplay, '25-Oct-2028', 'formatCneDateDisplay displays Indian calendar date');
  });

  test('4.3 Formats datetime-local string to Indian civil time YYYY-MM-DDTHH:mm', () => {
    const dLocal = toDateTimeLocalString('2028-10-25T08:30:00Z');
    assert.strictEqual(dLocal, '2028-10-25T14:00', 'toDateTimeLocalString converts UTC to Indian local input string');
  });

  test('4.4 Formats date and time ranges consistently in Indian civil time', () => {
    const rangeDisplay = formatCneDateTimeRangeDisplay('2028-10-25T08:30:00Z', '2028-10-25T10:30:00Z');
    assert.strictEqual(rangeDisplay, '25-Oct-2028 02:00 PM – 25-Oct-2028 04:00 PM', 'Range displays Indian start and end times');

    const dateOnlyRange = formatCneDateRangeDisplay('2026-10-25', '2026-10-26');
    assert.strictEqual(dateOnlyRange, '25-Oct-2026 - 26-Oct-2026', 'Date-only range formatted cleanly');
  });

  // ---------------------------------------------------------------------------
  // 5. Google Sheets Date Objects
  // ---------------------------------------------------------------------------
  test('5.1 Handles Google Sheets JavaScript Date objects without unintended timezone shifts', () => {
    // 25-Oct-2026 14:00:00 IST = 1792917000000 ms UTC
    const sheetsDateObj = new Date(1792917000000);

    const parsedEpoch = parseCneStartTimestamp(sheetsDateObj);
    assert.strictEqual(parsedEpoch, 1792917000000, 'JS Date parsed into exact UTC epoch ms');

    const formattedDt = formatCneDateTimeDisplay(sheetsDateObj);
    assert.strictEqual(formattedDt, '25-Oct-2026 02:00 PM', 'JS Date formatted as Indian civil time');

    const formattedDate = formatCneDateDisplay(sheetsDateObj);
    assert.strictEqual(formattedDate, '25-Oct-2026', 'JS Date formatted as Indian date DD-MMM-YYYY');

    const isoDay = parseToIsoDateString(sheetsDateObj);
    assert.strictEqual(isoDay, '2026-10-25', 'JS Date converts to canonical India YYYY-MM-DD');
  });

  test('5.2 Handles invalid Date objects by safely returning NaN or fallback', () => {
    const invalidDate = new Date('Invalid Date');
    assert.ok(isNaN(parseCneStartTimestamp(invalidDate)), 'Invalid JS Date returns NaN');
    assert.strictEqual(formatCneDateTimeDisplay(invalidDate), '—', 'Invalid JS Date displays fallback dash');
  });

  // ---------------------------------------------------------------------------
  // 6. Invalid Date/Time Rejection
  // ---------------------------------------------------------------------------
  test('6.1 Rejects invalid timezone offsets (+25:00, -25:00, +05:60)', () => {
    assert.strictEqual(parseStrictTime('14:00:00+25:00'), null, 'Offset > +23 hours rejected');
    assert.strictEqual(parseStrictTime('14:00:00-25:00'), null, 'Offset < -23 hours rejected');
    assert.strictEqual(parseStrictTime('14:00:00+05:60'), null, 'Offset minute > 59 rejected');
  });

  test('6.2 Rejects out-of-range years (<1970 or >2100)', () => {
    assert.strictEqual(isValidCalendarDate(1969, 12, 31), false, 'Year < 1970 rejected');
    assert.strictEqual(isValidCalendarDate(2101, 1, 1), false, 'Year > 2100 rejected');
  });

  test('6.3 Rejects contradictory timestamp inputs and falsy inputs', () => {
    const contradictory = parseCneStartTimestamp('2026-10-25T14:00:00Z', '16:00:00');
    assert.ok(isNaN(contradictory), 'Contradictory ISO time and separate explicit time rejected');

    assert.ok(isNaN(parseCneStartTimestamp(null)), 'Null date returns NaN');
    assert.ok(isNaN(parseCneStartTimestamp(undefined)), 'Undefined date returns NaN');
    assert.ok(isNaN(parseCneStartTimestamp('')), 'Empty string returns NaN');
  });

  if (failures.length > 0) {
    throw new Error(`${failures.length} test(s) failed under timezone ${tz}`);
  }

  return { passed, total };
}

// -----------------------------------------------------------------------------
// Cross-Timezone Master Runner
// -----------------------------------------------------------------------------

function main() {
  const isWorker = process.argv.includes('--tz-run');
  if (isWorker) {
    const tzIdx = process.argv.indexOf('--tz-run') + 1;
    const tz = process.argv[tzIdx] || 'UTC';
    const result = runTestsForTimezone(tz);
    // Print machine-readable summary line for worker parent
    console.log(`\nTZ_WORKER_RESULT:${tz}:${result.passed}:${result.total}`);
    process.exit(0);
  }

  console.log('================================================================');
  console.log('   CROSS-MODULE TIMEZONE REGRESSION TEST SUITE');
  console.log('   Validating CNE Date/Time & Asia/Kolkata Consistency');
  console.log('================================================================');

  const targetTimezones = ['Asia/Kolkata', 'UTC', 'America/Los_Angeles'];
  let totalExecuted = 0;
  let totalPassed = 0;

  for (const tz of targetTimezones) {
    try {
      // Execute in child process with explicit TZ environment variable
      const output = child_process.execFileSync(
        process.execPath,
        [__filename, '--tz-run', tz],
        {
          env: { ...process.env, TZ: tz },
          encoding: 'utf8'
        }
      );

      process.stdout.write(output);

      // Parse worker result
      const match = output.match(/TZ_WORKER_RESULT:([^:]+):(\d+):(\d+)/);
      if (match) {
        const passedCount = parseInt(match[2], 10);
        const totalCount = parseInt(match[3], 10);
        totalPassed += passedCount;
        totalExecuted += totalCount;
      }
    } catch (err) {
      console.error(`\nFATAL: Tests failed under timezone environment ${tz}:`);
      if (err.stdout) console.error(err.stdout);
      if (err.stderr) console.error(err.stderr);
      process.exit(1);
    }
  }

  console.log('\n================================================================');
  console.log(`TIMEZONE REGRESSION SUITE COMPLETE: ${totalPassed}/${totalExecuted} tests passed across 3 timezones`);
  console.log('Tested environments: Asia/Kolkata, UTC, America/Los_Angeles');
  console.log('================================================================\n');

  if (totalPassed !== totalExecuted || totalExecuted === 0) {
    process.exit(1);
  }
}

main();
