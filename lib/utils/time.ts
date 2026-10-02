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

// ─── Formatting ─────────────────────────────────────────────────────

/** Format total minutes as short human-readable string: "9h 45m", "0h 30m", "8h 00m" */
export function formatWorkedTime(totalMinutes: number): string {
  const { hours, minutes } = fromTotalMinutes(Math.abs(totalMinutes));
  const sign = totalMinutes < 0 ? '-' : '';
  return `${sign}${hours}h ${String(minutes).padStart(2, '0')}m`;
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
