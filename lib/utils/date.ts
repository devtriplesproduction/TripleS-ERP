/**
 * TripleS ERP — Standardized Date Utility
 * 
 * Single source of truth for date formatting, parsing, and timezone handling.
 * 
 * STANDARDS:
 * - Default display format: DD/MM/YYYY (e.g. 03/11/2026)
 * - Readable label format: DD MMM YYYY (e.g. 03 Nov 2026)
 * - Storage / API format: ISO YYYY-MM-DD (e.g. 2026-11-03)
 * - Timezone: Asia/Kolkata (IST, UTC+5:30)
 * - Parsing: Strict prevention of day/month swapping and timezone date shifts.
 */

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns number of days in a given month of a given year (1-indexed month: 1=Jan, 12=Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Safely parses any date representation into a valid Date object.
 * 
 * Supports:
 * - Date objects
 * - ISO date strings: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss..."
 * - DD/MM/YYYY strings (e.g. "03/11/2026" -> 3rd Nov 2026, NOT March 11)
 * - DD-MM-YYYY strings
 * - Timestamp numbers
 * 
 * Avoids browser timezone date shifts by constructing dates safely.
 */
export function parseDate(input: string | Date | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : new Date(input.getTime());
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // 1. Pure date in YYYY-MM-DD format (or starts with YYYY-MM-DD)
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (isoDateMatch) {
      const year = parseInt(isoDateMatch[1], 10);
      const month = parseInt(isoDateMatch[2], 10);
      const day = parseInt(isoDateMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month)) {
        // If string contains time components with Z or timezone offset, let standard Date parse it
        if (trimmed.includes('T') || (trimmed.includes(':') && (trimmed.includes('+') || trimmed.includes('Z')))) {
          const d = new Date(trimmed);
          if (!isNaN(d.getTime())) return d;
        }
        // Pure date: use local noon (12:00:00) so local timezone offset never crosses midnight
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      }
    }

    // 2. Pure date in DD/MM/YYYY format
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month)) {
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      }
    }

    // 3. Pure date in DD-MM-YYYY format
    const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const day = parseInt(dashMatch[1], 10);
      const month = parseInt(dashMatch[2], 10);
      const year = parseInt(dashMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month)) {
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      }
    }

    // 4. Fallback to standard JavaScript date parsing
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  return null;
}

/**
 * Extracts Asia/Kolkata calendar day, month, year from a Date or date string.
 */
function getKolkataDateParts(input: string | Date | number | null | undefined): { day: number; month: number; year: number } | null {
  if (input === null || input === undefined || input === '') return null;

  // Optimize for pure YYYY-MM-DD or DD/MM/YYYY strings to avoid timezone drift
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month)) {
        return { day, month, year };
      }
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month)) {
        return { day, month, year };
      }
    }
  }

  const d = parseDate(input);
  if (!d) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: BUSINESS_TIMEZONE,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    let day = 0, month = 0, year = 0;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }
    if (day && month && year) return { day, month, year };
  } catch {
    // Fallback if Intl fails
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };
  }

  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

/**
 * Standard date formatter across TripleS ERP: DD/MM/YYYY
 * e.g. 2026-11-03 -> "03/11/2026"
 */
export function formatDate(input: string | Date | number | null | undefined, fallback: string = ''): string {
  const parts = getKolkataDateParts(input);
  if (!parts) return fallback;

  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  const yyyy = String(parts.year);

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Readable date label formatter: DD MMM YYYY
 * e.g. 2026-11-03 -> "03 Nov 2026"
 */
export function formatDateReadable(input: string | Date | number | null | undefined, fallback: string = ''): string {
  const parts = getKolkataDateParts(input);
  if (!parts) return fallback;

  const dd = String(parts.day).padStart(2, '0');
  const mmm = MONTH_NAMES_SHORT[parts.month - 1] || '';
  const yyyy = String(parts.year);

  return `${dd} ${mmm} ${yyyy}`;
}

/**
 * Long readable date label formatter: DD MMMM YYYY
 * e.g. 2026-11-03 -> "03 November 2026"
 */
export function formatDateLong(input: string | Date | number | null | undefined, fallback: string = ''): string {
  const parts = getKolkataDateParts(input);
  if (!parts) return fallback;

  const dd = String(parts.day).padStart(2, '0');
  const mmmm = MONTH_NAMES_LONG[parts.month - 1] || '';
  const yyyy = String(parts.year);

  return `${dd} ${mmmm} ${yyyy}`;
}

/**
 * Standard date-time formatter: "DD/MM/YYYY, hh:mm A" (in Asia/Kolkata)
 */
export function formatDateTime(input: string | Date | number | null | undefined, fallback: string = ''): string {
  const d = parseDate(input);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: BUSINESS_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d);
  } catch {
    return formatDate(d, fallback);
  }
}

/**
 * Readable date-time formatter: "DD MMM YYYY, hh:mm A" (in Asia/Kolkata)
 * e.g. "03 Nov 2026, 1:15 pm"
 */
export function formatDateTimeReadable(input: string | Date | number | null | undefined, fallback: string = ''): string {
  const d = parseDate(input);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: BUSINESS_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d);
  } catch {
    return formatDateReadable(d, fallback);
  }
}

/**
 * Converts any date representation to ISO storage format: "YYYY-MM-DD".
 * Preserves database date storage in ISO YYYY-MM-DD format.
 */
export function toISODateString(input: string | Date | number | null | undefined): string {
  const parts = getKolkataDateParts(input);
  if (!parts) return '';

  const yyyy = String(parts.year);
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Gets current date in Asia/Kolkata timezone in ISO format: "YYYY-MM-DD".
 */
export function getTodayIST(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Gets date N days ago in Asia/Kolkata timezone in ISO format: "YYYY-MM-DD".
 */
export function getDaysAgoIST(days: number): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10);
    const m = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
    const d = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

    const date = new Date(Date.UTC(y, m, d - days, 12, 0, 0));
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    const date = new Date(Date.now() - days * 86400000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Gets yesterday's date in Asia/Kolkata timezone in ISO format: "YYYY-MM-DD".
 */
export function getYesterdayIST(): string {
  return getDaysAgoIST(1);
}

/**
 * Gets current date in Asia/Kolkata timezone formatted as "DD/MM/YYYY".
 */
export function getTodayDisplay(): string {
  return formatDate(getTodayIST());
}

/**
 * Gets current date in Asia/Kolkata timezone formatted as "DD MMM YYYY".
 */
export function getTodayDisplayReadable(): string {
  return formatDateReadable(getTodayIST());
}

/**
 * Validates whether a given string is a valid DD/MM/YYYY or YYYY-MM-DD date.
 */
export function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return parseDate(dateStr) !== null;
}
