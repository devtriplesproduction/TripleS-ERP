/**
 * TripleS ERP — Shared Time Utility
 * 
 * Single source of truth for all time calculations across EOD, Attendance,
 * Payroll, Comp Off, and Leave modules.
 * 
 * RULES:
 * - 1 hour = 60 minutes
 * - Standard working day = 8 hours = 480 minutes
 * - Working days: Monday–Saturday
 * - Weekly off: Sunday
 * - Business timezone: Asia/Kolkata
 * - NO floating-point arithmetic for business-hour calculations
 * - User-facing time format: HH.MM (e.g. 8.19 = 8h 19m, NOT decimal hours)
 * - Database storage: decimal hours (for backward compat)
 */

/** Standard working day in minutes */
export const STANDARD_WORK_MINUTES = 480;

/** Standard working day in hours (display only) */
export const STANDARD_WORK_HOURS = 8;

// ─── Conversion ──────────────────────────────────────────────────────

/** Convert hours + minutes to total minutes. Normalizes overflow (e.g. 1h 75m → 135 min). */
export function toTotalMinutes(hours: number, minutes: number): number {
  return Math.round(hours) * 60 + Math.round(minutes);
}

/** Convert total minutes to hours + minutes (remainder). */
export function fromTotalMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const m = Math.round(Math.max(0, totalMinutes));
  return { hours: Math.floor(m / 60), minutes: m % 60 };
}

/** Convert a decimal office_hours value (e.g. 9.75) to total minutes. Used for backward compat with existing DB records. */
export function decimalHoursToMinutes(decimalHours: number): number {
  return Math.round(decimalHours * 60);
}

/** Convert total minutes to decimal hours (for backward compat DB writes). */
export function minutesToDecimalHours(totalMinutes: number): number {
  return Math.round((totalMinutes / 60) * 100) / 100;
}

// ─── HH.MM Format (Primary User-Facing Format) ─────────────────────

/**
 * Parse an HH.MM formatted string into total minutes.
 * 
 * The value is NOT a mathematical decimal. It is an hours-and-minutes representation:
 *   8.19  = 8 hours 19 minutes = 499 total minutes
 *   9.05  = 9 hours 05 minutes = 545 total minutes
 *   9.30  = 9 hours 30 minutes = 570 total minutes
 *   10.45 = 10 hours 45 minutes = 645 total minutes
 * 
 * Returns null if the input is invalid.
 */
export function parseHHMM(value: string): number | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Allow integer-only input (e.g. "8" means 8h 00m)
  if (/^\d+$/.test(trimmed)) {
    const h = parseInt(trimmed, 10);
    if (h < 0 || h > 24) return null;
    return h * 60;
  }

  // Must match HH.MM pattern (one dot, digits on both sides)
  if (!/^\d+\.\d{1,2}$/.test(trimmed)) return null;

  const [hoursPart, minutesPart] = trimmed.split('.');
  const h = parseInt(hoursPart, 10);
  
  // As per rules: 8.5 -> 5 mins, 8.05 -> 5 mins, 8.30 -> 30 mins
  const m = parseInt(minutesPart, 10);

  if (h < 0 || h > 24) return null;
  if (m < 0 || m > 59) return null;
  if (h === 24 && m > 0) return null;

  return h * 60 + m;
}

/**
 * Format total minutes as HH.MM string for user display.
 * 
 * Examples:
 *   499  → "8.19"
 *   545  → "9.05"
 *   570  → "9.30"
 *   480  → "8.00"
 *   30   → "0.30"
 *   1440 → "24.00"
 */
export function formatMinutesAsHHMM(totalMinutes: number): string {
  const m = Math.round(Math.max(0, totalMinutes));
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

/**
 * Convert a database office_hours decimal value to HH.MM display format.
 * 
 * Existing DB values are stored as decimal hours:
 *   DB 8.5  → 510 minutes → "8.30"
 *   DB 7.2  → 432 minutes → "7.12"
 *   DB 9.75 → 585 minutes → "9.45"
 */
export function formatOfficeHoursAsHHMM(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  return formatMinutesAsHHMM(totalMinutes);
}

/**
 * Validate an HH.MM string input. Returns error message or null if valid.
 */
export function validateHHMM(value: string): string | null {
  if (!value || !value.trim()) return 'Worked hours are required.';
  const result = parseHHMM(value);
  if (result === null) {
    return 'Enter valid hours and minutes in HH.MM format. Minutes must be between 00 and 59.';
  }
  if (result === 0) return 'Worked time cannot be zero.';
  if (result > 24 * 60) return 'Worked time exceeds maximum (24.00).';
  return null;
}

// ─── Formatting ─────────────────────────────────────────────────────

/** Format total minutes as HH.MM string (primary user-facing format). */
export function formatWorkedTime(totalMinutes: number): string {
  return formatMinutesAsHHMM(totalMinutes);
}

/** Format total minutes with days: "1d 2h 30m" */
export function formatWorkedTimeLong(totalMinutes: number): string {
  const m = Math.abs(Math.round(totalMinutes));
  const days = Math.floor(m / (STANDARD_WORK_MINUTES));
  const remaining = m % STANDARD_WORK_MINUTES;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  const sign = totalMinutes < 0 ? '-' : '';

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${String(minutes).padStart(2, '0')}m`);

  return `${sign}${parts.join(' ')}`;
}

// ─── Comp Off Conversion ────────────────────────────────────────────

/** Convert total minutes to comp-off days + remainder. 480 minutes = 1 day. */
export function minutesToCompOffDays(totalMinutes: number): { days: number; hours: number; minutes: number } {
  const m = Math.round(Math.max(0, totalMinutes));
  const days = Math.floor(m / STANDARD_WORK_MINUTES);
  const remaining = m % STANDARD_WORK_MINUTES;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return { days, hours, minutes };
}

/** Format comp-off balance as human string: "1 day 2h 30m", "4h 00m", "0h 00m" */
export function formatCompOffBalance(totalMinutes: number): string {
  const { days, hours, minutes } = minutesToCompOffDays(totalMinutes);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${String(minutes).padStart(2, '0')}m`);
  return parts.join(' ');
}

/** Format hours into an exact string like "126h 52m" */
export function formatHoursMinutes(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// ─── Validation ─────────────────────────────────────────────────────

/** Validate hours + minutes input. Returns error string or null. */
export function validateWorkedTime(hours: number, minutes: number): string | null {
  if (!Number.isFinite(hours) || hours < 0) return 'Hours must be 0 or greater.';
  if (!Number.isFinite(minutes) || minutes < 0) return 'Minutes must be 0 or greater.';
  if (minutes > 59) return 'Minutes must be between 0 and 59.';
  if (hours > 23) return 'Hours must be between 0 and 23.';
  const total = toTotalMinutes(hours, minutes);
  if (total === 0) return 'Worked time cannot be zero.';
  if (total > 23 * 60 + 59) return 'Worked time exceeds maximum (23h 59m).';
  return null;
}

/** Normalize invalid minutes (e.g. 1h 75m → 2h 15m). Used as safety net. */
export function normalizeTime(hours: number, minutes: number): { hours: number; minutes: number } {
  const total = toTotalMinutes(hours, minutes);
  return fromTotalMinutes(total);
}

// ─── Date / Timezone ────────────────────────────────────────────────

/** Get current business date string in Asia/Kolkata (YYYY-MM-DD). */
export function getISTDateString(date?: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date || new Date());
}

/** Get day of week for a date string (YYYY-MM-DD). 0=Sunday, 6=Saturday. */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Check if a date string is a Sunday (weekly off). */
export function isSunday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 0;
}

/** Check if a date string is a working day (Mon–Sat). */
export function isWorkingDay(dateStr: string): boolean {
  return getDayOfWeek(dateStr) !== 0; // Sunday is the only weekly off
}

// ─── Constants ──────────────────────────────────────────────────────

/** Full working day in minutes (8 hours) */
export const FULL_DAY_MINUTES = 480;

/** Half day threshold in minutes (4 hours) */
export const HALF_DAY_THRESHOLD = 240;

/** Standard working day in hours (display only) */
export const WORKING_DAY_HOURS = 8;

// ─── Extra Hours Calculation ────────────────────────────────────────

export type WorkDayContext = 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave';

/**
 * Calculate extra minutes earned from an approved EOD.
 * 
 * Rules:
 * - Normal Mon-Sat: extra = worked - 480 (only if positive)
 * - Sunday: ALL worked time is extra
 * - Paid Holiday: ALL worked time is extra
 * - Approved Leave day with EOD: ALL worked time is extra
 */
export function calculateExtraMinutes(workedMinutes: number, context: WorkDayContext): number {
  if (workedMinutes <= 0) return 0;

  switch (context) {
    case 'sunday':
    case 'paid_holiday':
    case 'approved_leave':
      return workedMinutes; // ALL time is extra
    case 'normal':
    default:
      return Math.max(0, workedMinutes - STANDARD_WORK_MINUTES);
  }
}

/**
 * Calculate short-fall minutes on a normal working day.
 * Only applicable for normal Mon-Sat working days.
 */
export function calculateShortMinutes(workedMinutes: number, context: WorkDayContext): number {
  if (context !== 'normal') return 0;
  if (workedMinutes >= STANDARD_WORK_MINUTES) return 0;
  return STANDARD_WORK_MINUTES - workedMinutes;
}

/**
 * Determine the work day context for a given date.
 * Needs holiday and leave data to be passed in.
 */
export function determineWorkDayContext(
  dateStr: string,
  paidHolidayDates: Set<string>,
  approvedLeaveDates: Set<string>
): WorkDayContext {
  if (isSunday(dateStr)) return 'sunday';
  if (paidHolidayDates.has(dateStr)) return 'paid_holiday';
  if (approvedLeaveDates.has(dateStr)) return 'approved_leave';
  return 'normal';
}

// ─── Work Day Classification (Centralized Business Logic) ───────────

/**
 * Classification result for a work day.
 * Single source of truth used by EOD, Attendance, Payroll, and Comp Off modules.
 */
export type PayrollDayStatus = 'FULL_DAY' | 'HALF_DAY' | 'UNPAID_LEAVE' | 'COMP_OFF_DAY';

export interface WorkDayClassification {
  /** The context in which work was done */
  context: WorkDayContext;
  /** Total worked minutes from approved EOD */
  workedMinutes: number;
  /** Payroll classification for the day */
  payrollStatus: PayrollDayStatus;
  /** Whether this day should count towards payroll calculation */
  isPayableDay: boolean;
  /** Minutes to credit as Comp Off (never negative) */
  compOffMinutes: number;
  /** Human-readable attendance status */
  attendanceStatus: string;
}

/**
 * Classify a work day based on approved EOD worked minutes and context.
 *
 * Priority:
 * A. Sunday / Paid Holiday / Approved Comp Off Leave + EOD → ALL worked → Comp Off
 * B. Normal <4h → Unpaid Leave, ALL worked → Comp Off, day excluded from payroll
 * C. Normal ≥4h & <8h → Half Day, 0 Comp Off
 * D. Normal =8h → Full Day, 0 Comp Off
 * E. Normal >8h → Full Day, extra → Comp Off
 *
 * CRITICAL: Comp Off can NEVER be negative. No subtraction, no deduction from
 * missing hours, no negative balance calculations.
 */
export function classifyWorkDay(workedMinutes: number, context: WorkDayContext): WorkDayClassification {
  // Ensure non-negative
  const wm = Math.max(0, Math.round(workedMinutes));

  // Sunday, Paid Holiday, or Approved Leave: ALL worked time → Comp Off
  if (context === 'sunday' || context === 'paid_holiday' || context === 'approved_leave') {
    return {
      context,
      workedMinutes: wm,
      payrollStatus: 'COMP_OFF_DAY',
      isPayableDay: context !== 'approved_leave', // Leave days already handled by leave system
      compOffMinutes: wm, // ALL time → Comp Off
      attendanceStatus: context === 'sunday' ? 'Weekly Off' :
                        context === 'paid_holiday' ? 'Paid Holiday' : 'Comp Off Leave',
    };
  }

  // Normal working day (Mon-Sat)
  if (wm < HALF_DAY_THRESHOLD) {
    // Case A: Less than 4 hours → Unpaid Leave
    return {
      context,
      workedMinutes: wm,
      payrollStatus: 'UNPAID_LEAVE',
      isPayableDay: false, // Excluded from payroll
      compOffMinutes: wm, // ALL worked time → Comp Off
      attendanceStatus: 'Unpaid Leave',
    };
  }

  if (wm < FULL_DAY_MINUTES) {
    // Case B: 4h to 7h59m → Half Day
    return {
      context,
      workedMinutes: wm,
      payrollStatus: 'HALF_DAY',
      isPayableDay: true,
      compOffMinutes: 0, // No Comp Off for half day
      attendanceStatus: 'Half Day',
    };
  }

  if (wm === FULL_DAY_MINUTES) {
    // Case C: Exactly 8h → Full Day
    return {
      context,
      workedMinutes: wm,
      payrollStatus: 'FULL_DAY',
      isPayableDay: true,
      compOffMinutes: 0,
      attendanceStatus: 'Present',
    };
  }

  // Case D: More than 8h → Full Day + Extra → Comp Off
  return {
    context,
    workedMinutes: wm,
    payrollStatus: 'FULL_DAY',
    isPayableDay: true,
    compOffMinutes: wm - FULL_DAY_MINUTES, // Only extra time
    attendanceStatus: 'Present',
  };
}

/**
 * Calculate comp off minutes to credit for an approved EOD.
 * Convenience wrapper around classifyWorkDay.
 * Returns 0 for non-approved statuses.
 * NEVER returns negative values.
 */
export function calculateCompOffMinutes(
  workedMinutes: number,
  context: WorkDayContext,
  eodStatus: string
): number {
  if (eodStatus !== 'Approved') return 0;
  if (workedMinutes <= 0) return 0;
  return classifyWorkDay(workedMinutes, context).compOffMinutes;
}

/**
 * Determine the attendance status string for a given work day.
 * Convenience wrapper around classifyWorkDay.
 */
export function determineAttendanceStatus(
  workedMinutes: number,
  context: WorkDayContext,
  eodStatus: string
): string {
  if (eodStatus === 'Pending') return 'Pending';
  if (eodStatus === 'Rejected') return 'Absent';
  if (eodStatus !== 'Approved') return 'Absent';
  return classifyWorkDay(workedMinutes, context).attendanceStatus;
}
