import { CNEType, Employee, NewsEventItem, SessionUser } from './types';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

/** Current India calendar date (YYYY-MM-DD), independent of browser timezone. */
export function getIndiaTodayIsoDate(): string {
  const now = new Date(Date.now() + 330 * 60 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/** Convert an epoch instant into India calendar components without browser-local getters. */
function indiaDateParts(epoch: number) {
  const d = new Date(epoch + 330 * 60 * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}

function indiaIsoDay(epoch: number): string {
  const p = indiaDateParts(epoch);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * Formats a date string into the strict DD-MMM-YYYY format (e.g., 01-Jan-2026).
 * Zero-pads single-digit days (01-31), uses 3-letter English month abbreviations (Jan-Dec),
 * and 4-digit years.
 */
export function formatCneDateDisplay(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';

  const isoDay = parseToIsoDateString(dateVal);
  if (isoDay) {
    const [year, month, day] = isoDay.split('-').map(Number);
    return `${String(day).padStart(2, '0')}-${MONTH_NAMES[month - 1]}-${year}`;
  }
  const str = String(dateVal).trim();
  if (!str) return '—';

  // 1. If already DD-MMM-YYYY (e.g. 01-Jan-2026, 1-Feb-2026, 05-feb-2026)
  const dmmmMatch = str.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})$/);
  if (dmmmMatch) {
    const day = dmmmMatch[1].padStart(2, '0');
    const mRaw = dmmmMatch[2].toLowerCase();
    const foundMonth = MONTH_NAMES.find((m) => m.toLowerCase() === mRaw);
    const month = foundMonth || (mRaw.charAt(0).toUpperCase() + mRaw.slice(1, 3));
    const year = dmmmMatch[3];
    return `${day}-${month}-${year}`;
  }

  // 2. YYYY-MM-DD or YYYY-M-D (e.g. 2026-03-01, 2026-01-05, 2026-09-30)
  // Parsing with regex avoids local/UTC timezone offsets shifting the date
  const ymdMatch = str.match(/^(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const monthIdx = parseInt(ymdMatch[2], 10) - 1;
    const day = ymdMatch[3].padStart(2, '0');
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
    }
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY (e.g. 01/01/2026)
  const dmyMatch = str.match(/^(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const monthIdx = parseInt(dmyMatch[2], 10) - 1;
    const year = dmyMatch[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
    }
  }

  // 4. Fallback: Parse via new Date()
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Formats a CNE activity date range (fromDate & optional toDate) using DD-MMM-YYYY.
 * If toDate is equal to fromDate or empty, returns formatted fromDate.
 * If toDate is different, returns `${formattedFrom} - ${formattedTo}`.
 */
export function formatCneDateRangeDisplay(fromDate?: string | null, toDate?: string | null): string {
  if (!fromDate) return '—';
  const formattedFrom = formatCneDateDisplay(fromDate);
  if (!toDate || toDate === fromDate) {
    return formattedFrom;
  }
  const formattedTo = formatCneDateDisplay(toDate);
  if (formattedTo === formattedFrom || formattedTo === '—') {
    return formattedFrom;
  }
  return `${formattedFrom} - ${formattedTo}`;
}

/**
 * Strict calendar date validator.
 * Validates 4-digit year, 1-indexed month (1-12), and day (1-31) accounting for
 * the exact number of days in each month and leap years.
 * Rejects roll-overs, day 00, month 00, month 13, April 31, Feb 29 (non-leap), etc.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1970 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  let daysInMonth: number;
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    daysInMonth = isLeap ? 29 : 28;
  } else if (month === 4 || month === 6 || month === 9 || month === 11) {
    daysInMonth = 30;
  } else {
    daysInMonth = 31;
  }

  if (day > daysInMonth) return false;

  // Strict JS Date comparison to ensure no normalization / rollover occurred
  const utcCheck = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    utcCheck.getUTCFullYear() !== year ||
    utcCheck.getUTCMonth() !== month - 1 ||
    utcCheck.getUTCDate() !== day
  ) {
    return false;
  }

  return true;
}

export interface StrictTimeComponents {
  hour: number;
  min: number;
  sec: number;
  millis: number;
  hasExplicitOffset: boolean;
  offsetMinutesTotal: number;
}

/**
 * Strict time validator.
 * Validates 24-hour ("14:00", "09:30:15", "08:30:00Z", "14:00:00+05:30", "03:30:00-05:00", "08:30:00.500Z")
 * and 12-hour AM/PM ("02:30 PM", "9:00 am") formats.
 * Rejects malformed strings ("bogus", "abc"), hour overflows ("24:00", "25:00", "99:99"),
 * minute overflows ("10:60", "14:60:00Z"), invalid AM/PM combinations ("13:00 PM", "0:00 AM"),
 * and invalid timezone offsets ("+25:00", "-25:00", "+05:60").
 * Returns { hour, min, sec, millis, hasExplicitOffset, offsetMinutesTotal } or null if invalid.
 */
export function parseStrictTime(timeVal?: string | Date | null): StrictTimeComponents | null {
  if (timeVal === null || timeVal === undefined) return null;

  if (timeVal instanceof Date) {
    if (isNaN(timeVal.getTime())) return null;
    const th = timeVal.getHours();
    const tm = timeVal.getMinutes();
    const ts = timeVal.getSeconds();
    const tms = timeVal.getMilliseconds();
    if (th >= 0 && th <= 23 && tm >= 0 && tm <= 59 && ts >= 0 && ts <= 59) {
      return { hour: th, min: tm, sec: ts, millis: tms, hasExplicitOffset: false, offsetMinutesTotal: 0 };
    }
    return null;
  }

  const s = String(timeVal).trim();
  if (!s) return null;

  // 12-hour AM/PM format: e.g. "02:30 PM", "2:30pm", "12:00 AM", "09:15:30 am"
  const ampmMatch = s.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\s*([ap]m)$/i);
  if (ampmMatch) {
    const h12 = parseInt(ampmMatch[1], 10);
    const mn12 = parseInt(ampmMatch[2], 10);
    const sc12 = ampmMatch[3] !== undefined ? parseInt(ampmMatch[3], 10) : 0;
    const ap = ampmMatch[4].toLowerCase();
    if (h12 < 1 || h12 > 12) return null;
    let h24 = h12;
    if (ap === 'pm') {
      h24 = (h12 === 12) ? 12 : h12 + 12;
    } else {
      h24 = (h12 === 12) ? 0 : h12;
    }
    return { hour: h24, min: mn12, sec: sc12, millis: 0, hasExplicitOffset: false, offsetMinutesTotal: 0 };
  }

  // 24-hour format with optional seconds, fractional seconds, and ISO 8601 timezone offset (Z, +HH:MM, -HH:MM):
  // e.g. "14:00", "09:30", "14:00:00", "08:30:00Z", "14:00:00+05:30", "03:30:00-05:00", "08:30:00.500Z", "14:00:00.123+05:30"
  // Rejects 24:00, 25:00, 99:99, 10:60, +25:00, -25:00, +05:60, +14:60, 14:60:00Z, bogus strings
  const h24Match = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?(?:\s*(?:([Zz])|([+-])(\d{1,2}):?(\d{2})))?$/);
  if (h24Match) {
    const h = parseInt(h24Match[1], 10);
    const m = parseInt(h24Match[2], 10);
    const sec = h24Match[3] !== undefined ? parseInt(h24Match[3], 10) : 0;
    if (h < 0 || h > 23) return null;
    if (m < 0 || m > 59) return null;
    if (sec < 0 || sec > 59) return null;

    let millis = 0;
    if (h24Match[4] !== undefined) {
      const fractionStr = h24Match[4];
      if (!/^\d+$/.test(fractionStr)) return null;
      millis = Math.floor(parseFloat('0.' + fractionStr) * 1000);
      if (isNaN(millis) || millis < 0 || millis > 999) return null;
    }

    let hasExplicitOffset = false;
    let offsetMinutesTotal = 0;

    if (h24Match[5]) {
      // 'Z' or 'z' (UTC)
      hasExplicitOffset = true;
      offsetMinutesTotal = 0;
    } else if (h24Match[6]) {
      // [+-]HH:MM or [+-]HHMM
      const sign = h24Match[6] === '-' ? -1 : 1;
      const offH = parseInt(h24Match[7], 10);
      const offM = parseInt(h24Match[8], 10);
      // Validate timezone offset hours and minutes against supported ISO 8601 range (00-23 hours, 00-59 minutes)
      // Rejects +25:00, -25:00, +05:60, +14:60, etc.
      if (isNaN(offH) || isNaN(offM) || offH < 0 || offH > 23 || offM < 0 || offM > 59) {
        return null;
      }
      hasExplicitOffset = true;
      offsetMinutesTotal = sign * (offH * 60 + offM);
    }

    return {
      hour: h,
      min: m,
      sec: sec,
      millis,
      hasExplicitOffset,
      offsetMinutesTotal
    };
  }

  return null;
}

/**
 * Authoritatively parses CNE start date and time into UTC epoch milliseconds.
 * Strictly validates calendar dates (leap years, month days, no silent rollover)
 * and time components (00-23 hours, 00-59 minutes, rejects bogus time strings).
 * Fully supports ISO 8601 explicit timezone offsets (Z, +HH:MM, -HH:MM, fractional seconds).
 * For timestamps without an explicit timezone offset, authoritatively uses Asia/Kolkata (+05:30).
 * Supports combined date/time strings, separate date + time fields, and Date objects.
 * Rejects unparseable, malformed, or contradictory dates/times by returning NaN.
 */
export function parseCneStartTimestamp(dateVal?: string | Date | null, timeVal?: string | null): number {
  if (!dateVal) return NaN;

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return NaN;
    try {
      const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = dtf.formatToParts(dateVal);
      const p: Record<string, string> = {};
      for (let i = 0; i < parts.length; i++) {
        p[parts[i].type] = parts[i].value;
      }
      const iso = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
      return parseCneStartTimestamp(iso, timeVal);
    } catch {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      const hr = String(dateVal.getHours()).padStart(2, '0');
      const mn = String(dateVal.getMinutes()).padStart(2, '0');
      const sc = String(dateVal.getSeconds()).padStart(2, '0');
      return parseCneStartTimestamp(`${y}-${m}-${d}T${hr}:${mn}:${sc}`, timeVal);
    }
  }

  const s = String(dateVal).trim();
  if (!s) return NaN;

  let year = NaN, month = NaN, day = NaN;
  let embeddedTimeStr: string | null = null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD with optional time
  const isoMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s](.+))?$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
    embeddedTimeStr = isoMatch[4] || null;
  } else {
    // 2. DD-MMM-YYYY format: e.g. 15-Oct-2026, 15 Oct 2026, 15/Oct/2026 with optional time
    const dmmmMatch = s.match(/^(\d{1,2})[-\s\/]([A-Za-z]{3})[-\s\/](\d{4})(?:[T\s](.+))?$/);
    if (dmmmMatch) {
      const monthMap: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
      };
      const mKey = dmmmMatch[2].toLowerCase();
      if (!monthMap[mKey]) return NaN;
      day = parseInt(dmmmMatch[1], 10);
      month = monthMap[mKey];
      year = parseInt(dmmmMatch[3], 10);
      embeddedTimeStr = dmmmMatch[4] || null;
    } else {
      // 3. DD-MM-YYYY format: e.g. 15-10-2026, 15/10/2026, 15.10.2026 with optional time
      const dmyMatch = s.match(/^(\d{1,2})[-\/\.]([0-9]{1,2})[-\/\.](\d{4})(?:[T\s](.+))?$/);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10);
        year = parseInt(dmyMatch[3], 10);
        embeddedTimeStr = dmyMatch[4] || null;
      } else {
        return NaN;
      }
    }
  }

  // Strict calendar date validation (leap year, days per month, range)
  if (!isValidCalendarDate(year, month, day)) {
    return NaN;
  }

  // Parse time components
  let hour = 0, min = 0, sec = 0, millis = 0;
  let hasExplicitOffset = false;
  let offsetMinutesTotal = 0;

  let parsedEmbedded: StrictTimeComponents | null = null;
  if (embeddedTimeStr !== null) {
    parsedEmbedded = parseStrictTime(embeddedTimeStr);
    if (!parsedEmbedded) return NaN;
  }

  let parsedExplicit: StrictTimeComponents | null = null;
  if (timeVal !== undefined && timeVal !== null && String(timeVal).trim() !== '') {
    parsedExplicit = parseStrictTime(timeVal);
    if (!parsedExplicit) return NaN;
  }

  if (parsedEmbedded && parsedExplicit) {
    if (parsedEmbedded.hasExplicitOffset) {
      // If a combined ISO date/time includes an explicit timezone, its embedded time
      // and offset must define the instant. Do not silently override it with a separate time field.
      // If contradictory date/time fields are supplied, reject the input with NaN.
      if (
        parsedExplicit.hour !== parsedEmbedded.hour ||
        parsedExplicit.min !== parsedEmbedded.min ||
        (parsedExplicit.sec !== undefined && parsedEmbedded.sec !== undefined && parsedExplicit.sec !== parsedEmbedded.sec)
      ) {
        return NaN;
      }
      hour = parsedEmbedded.hour;
      min = parsedEmbedded.min;
      sec = parsedEmbedded.sec;
      millis = parsedEmbedded.millis;
      hasExplicitOffset = true;
      offsetMinutesTotal = parsedEmbedded.offsetMinutesTotal;
    } else {
      // Embedded time had no explicit offset; explicit separate timeVal takes precedence
      hour = parsedExplicit.hour;
      min = parsedExplicit.min;
      sec = parsedExplicit.sec;
      millis = parsedExplicit.millis;
      hasExplicitOffset = parsedExplicit.hasExplicitOffset;
      offsetMinutesTotal = parsedExplicit.offsetMinutesTotal;
    }
  } else if (parsedEmbedded) {
    hour = parsedEmbedded.hour;
    min = parsedEmbedded.min;
    sec = parsedEmbedded.sec;
    millis = parsedEmbedded.millis;
    hasExplicitOffset = parsedEmbedded.hasExplicitOffset;
    offsetMinutesTotal = parsedEmbedded.offsetMinutesTotal;
  } else if (parsedExplicit) {
    hour = parsedExplicit.hour;
    min = parsedExplicit.min;
    sec = parsedExplicit.sec;
    millis = parsedExplicit.millis;
    hasExplicitOffset = parsedExplicit.hasExplicitOffset;
    offsetMinutesTotal = parsedExplicit.offsetMinutesTotal;
  }

  // If no explicit timezone offset was supplied in the timestamp, authoritatively use Asia/Kolkata (+05:30)
  if (!hasExplicitOffset) {
    offsetMinutesTotal = 5 * 60 + 30; // 330 minutes
  }

  // Strict time range check & prevent Date roll-over
  const utcCheck = new Date(Date.UTC(year, month - 1, day, hour, min, sec, millis));
  if (
    utcCheck.getUTCFullYear() !== year ||
    utcCheck.getUTCMonth() !== month - 1 ||
    utcCheck.getUTCDate() !== day ||
    utcCheck.getUTCHours() !== hour ||
    utcCheck.getUTCMinutes() !== min ||
    utcCheck.getUTCSeconds() !== sec ||
    utcCheck.getUTCMilliseconds() !== millis
  ) {
    return NaN;
  }

  // Calculate the absolute epoch milliseconds: UTC = local instant - timezone offset
  return utcCheck.getTime() - (offsetMinutesTotal * 60 * 1000);
}

/**
 * Safely parses any supported CNE date representation (ISO, YYYY-MM-DD, DD-MMM-YYYY, DD/MM/YYYY, Date)
 * into a canonical "YYYY-MM-DD" string for reliable chronological comparison and range filtering.
 * Returns null if the date is missing, empty, or unparseable.
 */
export function parseToIsoDateString(val?: string | Date | null): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return Number.isFinite(val.getTime()) ? indiaIsoDay(val.getTime()) : null;
  }
  const s = String(val).trim();
  if (!s) return null;
  // Timestamp with explicit Z/offset: group under its actual India calendar day.
  if (/[T\s]\d{1,2}:\d{2}.*(?:Z|[+-]\d{1,2}:?\d{2})$/i.test(s)) {
    const epoch = parseCneStartTimestamp(s);
    return Number.isFinite(epoch) ? indiaIsoDay(epoch) : null;
  }

  // 1. Direct YYYY-MM-DD or YYYY/MM/DD prefix (e.g. 2026-09-10 or 2026-09-10T08:00:00)
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (!isValidCalendarDate(y, m, d)) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // 2. DD-MMM-YYYY (e.g. 10-Sep-2026)
  const dmmmMatch = s.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})/);
  if (dmmmMatch) {
    const monthMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const mNum = monthMap[dmmmMatch[2].toLowerCase()];
    if (mNum) {
      const d = parseInt(dmmmMatch[1], 10);
      const y = parseInt(dmmmMatch[3], 10);
      if (!isValidCalendarDate(y, mNum, d)) return null;
      return `${y}-${String(mNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY (e.g. 10/09/2026)
  const dmyMatch = s.match(/^(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (!isValidCalendarDate(y, m, d)) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Sort circulars by their published date rather than Google Sheet row position.
 * Stable sorting leaves the backend's insertion order intact on tied dates.
 * Invalid dates are last; older date representations use shared parsing rules.
 */
export function newestNewsFirst(newsEvents: NewsEventItem[]): NewsEventItem[] {
  return [...newsEvents].sort((a, b) => {
    const aDate = parseToIsoDateString(a.date) || parseToIsoDateString(a.createdAt) || '';
    const bDate = parseToIsoDateString(b.date) || parseToIsoDateString(b.createdAt) || '';
    return bDate.localeCompare(aDate);
  });
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a Date or date-time string into standard user-facing:
 * "DD-MMM-YYYY hh:mm AM/PM" (e.g. "01-Jan-2026 08:00 AM").
 * If the input is date-only (e.g. "2026-01-01"), returns "DD-MMM-YYYY".
 */
export function formatCneDateTimeDisplay(
  fromDate?: string | Date | null,
  toDate?: string | null
): string {
  if (!fromDate) return '—';
  if (toDate !== undefined) {
    const fromStr = fromDate instanceof Date ? fromDate.toISOString() : fromDate;
    return formatCneDateTimeRangeDisplay(fromStr, toDate);
  }
  const original = String(fromDate).trim();
  if (typeof fromDate === 'string' && !/[T\s]\d{1,2}:\d{2}/.test(original)) {
    return formatCneDateDisplay(fromDate);
  }
  const epoch = parseCneStartTimestamp(fromDate);
  if (!Number.isFinite(epoch)) return '—';
  const p = indiaDateParts(epoch);
  const h12 = p.hour % 12 || 12;
  return `${String(p.day).padStart(2, '0')}-${MONTH_NAMES[p.month - 1]}-${p.year} ${String(h12).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} ${p.hour >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Formats a CNE activity date & time range.
 * Example: "01-Jan-2026 08:00 AM – 03-Jan-2026 05:00 PM"
 * If fromDate and toDate are identical: "01-Jan-2026 08:00 AM"
 */
export function formatCneDateTimeRangeDisplay(
  fromDate?: string | null,
  toDate?: string | null
): string {
  if (!fromDate) return '—';

  const hasFromTime = String(fromDate).includes('T') || (String(fromDate).includes(':') && /\d{1,2}:\d{2}/.test(String(fromDate)));
  const hasToTime = toDate ? (String(toDate).includes('T') || (String(toDate).includes(':') && /\d{1,2}:\d{2}/.test(String(toDate)))) : false;

  if (hasFromTime) {
    const formattedFrom = formatCneDateTimeDisplay(fromDate);
    if (!toDate || toDate === fromDate) {
      return formattedFrom;
    }
    const formattedTo = hasToTime ? formatCneDateTimeDisplay(toDate) : formatCneDateDisplay(toDate);
    if (formattedTo === formattedFrom || formattedTo === '—') {
      return formattedFrom;
    }
    return `${formattedFrom} – ${formattedTo}`;
  }

  // Date-only formatting
  const formattedFrom = formatCneDateDisplay(fromDate);
  const formattedTo = toDate && toDate !== fromDate ? formatCneDateDisplay(toDate) : '';
  return formattedTo && formattedTo !== formattedFrom ? `${formattedFrom} – ${formattedTo}` : formattedFrom;
}

/**
 * Converts any date or date-time representation into YYYY-MM-DDTHH:mm
 * for standard HTML <input type="datetime-local" /> fields.
 */
export function toDateTimeLocalString(val?: string | Date | null, defaultTime = '09:00'): string {
  if (!val) return '';
  const text = typeof val === 'string' ? val.trim() : '';
  const isDateOnly = typeof val === 'string' && !/[T\s]\d{1,2}:\d{2}/.test(text);
  const epoch = parseCneStartTimestamp(val);
  if (!Number.isFinite(epoch)) return '';
  const p = indiaDateParts(epoch);
  const day = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  // Do not silently reinterpret a date-time with a Z or timezone offset as raw local time.
  if (isDateOnly) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(defaultTime)) return '';
    return `${day}T${defaultTime}`;
  }
  return `${day}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/**
 * Parses a duration string (HH:MM:SS or HH:MM or decimal hours) into total seconds.
 */
export function parseDurationToSeconds(str: string): number | null {
  if (!str) return null;
  const trimmed = str.trim();
  const parts = trimmed.split(':');
  if (parts.length >= 2 && parts.length <= 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parts.length === 3 ? parseInt(parts[2], 10) : 0;
    if (isNaN(h) || isNaN(m) || isNaN(s) || m < 0 || m >= 60 || s < 0 || s >= 60 || h < 0) {
      return null;
    }
    return h * 3600 + m * 60 + s;
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num > 0) {
    return Math.round(num * 3600);
  }
  return null;
}

/**
 * Formats total seconds into standard HH:MM:SS (e.g. 08:00:00).
 */
export function formatSecondsToDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculates how many distinct calendar days are touched between fromDt and toDt inclusive.
 */
export function getCalendarDaysTouched(fromDtStr: string, toDtStr: string): number {
  const from = parseCneStartTimestamp(fromDtStr);
  const to = parseCneStartTimestamp(toDtStr);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  const offset = 330 * 60 * 1000;
  return Math.floor((to + offset) / 86400000) - Math.floor((from + offset) / 86400000) + 1;
}

/**
 * Authoritative CNE automatic duration calculation rule:
 * - For each calendar day touched by the CNE:
 *   - maximum allowed CNE duration for that day = 8 hours
 *   - first and last days respect actual time interval
 *   - intermediate full calendar days contribute a maximum of 8 hours each
 */
export function calculateCneDuration(fromDtStr: string, toDtStr: string): string {
  const start = parseCneStartTimestamp(fromDtStr);
  const end = parseCneStartTimestamp(toDtStr);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '00:00:00';
  const daysTouched = getCalendarDaysTouched(fromDtStr, toDtStr);
  if (daysTouched === 1) return formatSecondsToDuration(Math.min(8 * 3600, Math.max(0, (end - start) / 1000)));
  const begin = indiaDateParts(start);
  const finish = indiaDateParts(end);
  const fromHour = begin.hour + begin.minute / 60 + begin.second / 3600;
  const toHour = finish.hour + finish.minute / 60 + finish.second / 3600;
  // Preserve the existing eight-hours-per-day convention in India civil time.
  const firstHours = Math.min(8, Math.max(0, fromHour < 17 ? 17 - fromHour : 24 - fromHour));
  const middleHours = Math.max(0, daysTouched - 2) * 8;
  const lastHours = Math.min(8, Math.max(0, toHour));
  return formatSecondsToDuration((firstHours + middleHours + lastHours) * 3600);
}

/**
 * Validates whether an entered duration satisfies:
 * 1. Minimum 00:05:00 (5 minutes)
 * 2. Maximum 8 hours × calendar days touched
 */
export function validateCneDuration(
  durationStr: string,
  fromDtStr: string,
  toDtStr: string
): { isValid: boolean; error?: string; message: string; maxDurationStr: string } {
  const from = parseCneStartTimestamp(fromDtStr);
  const to = parseCneStartTimestamp(toDtStr);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    const err = 'Please enter a valid From Date & Time and To Date & Time before setting duration.';
    return {
      isValid: false,
      error: err,
      message: err,
      maxDurationStr: '00:00:00'
    };
  }

  const daysTouched = getCalendarDaysTouched(fromDtStr, toDtStr);
  const maxSeconds = daysTouched * 8 * 3600;
  const maxDurationStr = formatSecondsToDuration(maxSeconds);
  const minSeconds = 300; // 00:05:00

  const sec = parseDurationToSeconds(durationStr);
  if (sec === null) {
    const err = 'Invalid duration format. Please enter as HH:MM:SS (e.g. 01:30:00 or 08:00:00).';
    return {
      isValid: false,
      error: err,
      message: err,
      maxDurationStr
    };
  }

  if (sec < minSeconds || sec > maxSeconds) {
    const err = `Duration must be between 00:05:00 and ${maxDurationStr} for this CNE.`;
    return {
      isValid: false,
      error: err,
      message: err,
      maxDurationStr
    };
  }

  return { isValid: true, message: '', maxDurationStr };
}

/**
 * Resolves an individual Employee ID to the employee's name from the authoritative officers list.
 * If not found, safely returns the Employee ID.
 */
export function resolveEmployeeName(
  empId?: string | null,
  officers?: Employee[] | Map<string, Employee>,
  fallbackLabel: string = 'Staff Member'
): string {
  if (!empId) return '';
  const trimmedId = empId.trim();
  if (!trimmedId) return '';

  if (officers) {
    if (officers instanceof Map) {
      const found = officers.get(trimmedId.toLowerCase()) || officers.get(trimmedId.toUpperCase()) || officers.get(trimmedId);
      if (found && found.name && found.name.trim()) {
        return found.name.trim();
      }
    } else if (Array.isArray(officers) && officers.length > 0) {
      const norm = trimmedId.toLowerCase();
      const found = officers.find(
        (o) => (o.employeeId || '').trim().toLowerCase() === norm
      );
      if (found && found.name && found.name.trim()) {
        return found.name.trim();
      }
    }
  }

  return fallbackLabel;
}

/**
 * Resolves a comma/semicolon/newline-separated string or array of Employee IDs
 * to their corresponding Employee Names using the authoritative officers list.
 * Unresolved IDs use a neutral display label rather than exposing the raw Employee ID.
 */
export function resolveEmployeeNamesList(
  empIds?: string | string[] | null,
  officers?: Employee[] | Map<string, Employee>,
  fallbackLabel: string = 'Staff Member'
): string[] {
  if (!empIds) return [];
  const list = Array.isArray(empIds) ? empIds : String(empIds).split(/[,;\n]+/);
  return list
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => resolveEmployeeName(id, officers, fallbackLabel));
}

/**
 * Formats the full Resource Persons display string for an activity or class.
 * Internal Resource Persons are displayed by Employee Name (separated by commas).
 * External Resource Persons are appended with their entered name, marked with '(Ext)'.
 * If multiple internal RPs exist, displays their names separated by commas.
 */
export function formatResourcePersonsDisplay(params: {
  resourcePersonEmpId?: string | null;
  resourcePersonName?: string | null;
  externalResourcePersons?: string[] | null;
  officers?: Employee[] | Map<string, Employee>;
}): string {
  const { resourcePersonEmpId, resourcePersonName, externalResourcePersons, officers } = params;

  let internalNames: string[] = [];

  const hasOfficers = officers instanceof Map ? officers.size > 0 : (Array.isArray(officers) && officers.length > 0);
  if (hasOfficers && resourcePersonEmpId) {
    internalNames = resolveEmployeeNamesList(resourcePersonEmpId, officers, 'Resource Person');
  } else if (resourcePersonName && resourcePersonName.trim()) {
    internalNames = resourcePersonName
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (resourcePersonEmpId && resourcePersonEmpId.trim()) {
    internalNames = resourcePersonEmpId
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(() => 'Resource Person');
  }

  const extNames = (externalResourcePersons || [])
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `${p} (Ext)`);

  const combined = [...internalNames, ...extNames];
  return combined.length > 0 ? combined.join(', ') : '—';
}

/**
 * Retrieves all unique assigned clinical areas/wards for a user (Area Incharge).
 * Supports both array `assignedAreas` and comma/semicolon/newline-delimited `assignedArea`.
 */
export function getUserAssignedAreas(user?: SessionUser | null): string[] {
  if (!user) return [];
  const list: string[] = [];

  if (user.assignedAreas && Array.isArray(user.assignedAreas)) {
    for (const a of user.assignedAreas) {
      if (typeof a === 'string' && a.trim()) {
        const trimmed = a.trim();
        if (!list.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
          list.push(trimmed);
        }
      }
    }
  }

  if (user.assignedArea && typeof user.assignedArea === 'string') {
    const parts = user.assignedArea.split(/[,;\n]+/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed && !list.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    }
  }

  return list;
}

/**
 * Checks whether an Area/Ward Incharge is responsible for the CNE's area.
 *
 * This is an AREA-SCOPE helper only. It must not be used to grant Edit/Cancel/Finalize
 * lifecycle authority. Operational Progress actions may use it for both Central and
 * Departmental CNEs; lifecycle rules stay stricter in the Schedule/backend layers.
 */
export function isCneAuthorized(
  user?: SessionUser | null,
  cneArea?: string,
  cneType?: string
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  const normalizedRole = String(user.role || '').trim().toUpperCase();
  if (normalizedRole !== 'AREA_INCHARGE' && normalizedRole !== 'INCHARGE') return false;
  if (!cneArea) return false;

  // External or non-internal CNE types never grant Area Incharge operational authority
  if (cneType) {
    const normType = String(cneType).trim().toUpperCase();
    if (normType !== 'CENTRAL' && normType !== 'DEPARTMENTAL') {
      return false;
    }
  }

  const targetArea = cneArea.trim().toLowerCase();
  if (!targetArea) return false;
  return getUserAssignedAreas(user).some((area) => area.trim().toLowerCase() === targetArea);
}

/**
 * Checks if the user is an assigned Resource Person for a specific CNE.
 * Accepts a single ID, delimited IDs, or an array of IDs and compares case-insensitively.
 */
export function isUserAssignedResourcePerson(
  user?: SessionUser | null,
  resourcePersonEmpId?: string | string[] | null
): boolean {
  if (!user?.employeeId || !resourcePersonEmpId) return false;
  const userEmpId = user.employeeId.trim().toUpperCase();
  const rawList = Array.isArray(resourcePersonEmpId)
    ? resourcePersonEmpId
    : String(resourcePersonEmpId).split(/[,;\n]+/);
  const rpList = rawList
    .map((s) => String(s || '').trim().toUpperCase())
    .filter(Boolean);
  return rpList.includes(userEmpId);
}

/**
 * Shared operational CNE Progress authorization.
 *
 * Allowed for Material, Questions, QR, Post-Test management and Attendance:
 * 1. Admin
 * 2. Concerned Area/Ward Incharge for the CNE area (Central or Departmental only)
 * 3. Resource Person assigned to this specific CNE
 *
 * This helper intentionally does NOT grant Edit/Cancel/Finalize lifecycle authority.
 */
export function canManageCneActions(
  user?: SessionUser | null,
  cne?: {
    area?: string;
    cneType?: string;
    resourcePersonEmpId?: string | null;
    resourcePersonEmpIds?: string[] | null;
  } | null
): boolean {
  if (!user || !cne) return false;
  if (user.role === 'ADMIN') return true;

  const normType = String(cne.cneType || '').trim().toUpperCase();
  const isInternalOperationalType = normType === 'CENTRAL' || normType === 'DEPARTMENTAL';

  if (isInternalOperationalType && isCneAuthorized(user, cne.area, cne.cneType)) return true;

  const assignedRpIds = [
    ...(cne.resourcePersonEmpIds || []),
    ...(cne.resourcePersonEmpId ? String(cne.resourcePersonEmpId).split(/[,;\n]+/) : [])
  ];
  return isUserAssignedResourcePerson(user, assignedRpIds);
}

/**
 * Validates and sanitizes external URLs.
 * Strictly permits only http: and https: protocols.
 * Explicitly rejects javascript:, data:, file:, vbscript:, and malformed strings.
 */
export function getSafeExternalUrl(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol.toLowerCase()) ? url.toString() : null;
  } catch {
    return null;
  }
}
/**
 * Authoritative human-facing CNE type display label.
 *
 * CENTRAL -> "Central CNE"
 * DEPARTMENTAL -> "Departmental CNE"
 * EXTERNAL_OFFSITE -> "External CNE – Outside AIIMS"
 * EXTERNAL_ONSITE -> "External CNE – Hosted at AIIMS"
 * Fallback -> "CNE"
 */
export function getCneTypeLabel(type?: string | null): string {
  if (!type) return 'CNE';
  const norm = String(type).trim().toUpperCase();
  switch (norm) {
    case 'CENTRAL':
    case 'CENTRAL CNE':
      return 'Central CNE';
    case 'DEPARTMENTAL':
    case 'DEPARTMENTAL CNE':
    case 'DEPT':
      return 'Departmental CNE';
    case 'EXTERNAL_OFFSITE':
    case 'EXTERNAL OFFSITE':
    case 'EXTERNAL_CNE_OFFSITE':
    case 'EXTERNAL CNE OFFSITE':
    case 'EXTERNAL CNE – OUTSIDE AIIMS':
    case 'EXTERNAL CNE - OUTSIDE AIIMS':
    case 'EXTERNAL CNE – OUTSIDE':
    case 'EXTERNAL CNE - OUTSIDE':
    case 'EXTERNAL_OUTSIDE':
    case 'OUTSIDE AIIMS':
      return 'External CNE – Outside AIIMS';
    case 'EXTERNAL_ONSITE':
    case 'EXTERNAL ONSITE':
    case 'EXTERNAL_CNE_ONSITE':
    case 'EXTERNAL CNE ONSITE':
    case 'EXTERNAL CNE – HOSTED AT AIIMS':
    case 'EXTERNAL CNE - HOSTED AT AIIMS':
    case 'EXTERNAL CNE – HOSTED':
    case 'EXTERNAL CNE - HOSTED':
    case 'EXTERNAL_HOSTED':
    case 'HOSTED AT AIIMS':
    case 'EXTERNAL_ONSITE_AIIMS':
      return 'External CNE – Hosted at AIIMS';
    default:
      return 'CNE';
  }
}

/**
 * Returns Tailwind badge styling classes based on CNE type.
 */
export function getCneTypeBadgeClass(type?: string | null): string {
  const norm = String(type || '').trim().toUpperCase();
  if (norm === 'CENTRAL' || norm === 'CENTRAL CNE') {
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
  if (norm === 'DEPARTMENTAL' || norm === 'DEPARTMENTAL CNE' || norm === 'DEPT') {
    return 'bg-teal-50 text-teal-700 border border-teal-200';
  }
  if (norm.includes('OFFSITE') || norm.includes('OUTSIDE')) {
    return 'bg-amber-50 text-amber-800 border border-amber-200';
  }
  if (norm.includes('ONSITE') || norm.includes('HOSTED')) {
    return 'bg-purple-50 text-purple-700 border border-purple-200';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}
