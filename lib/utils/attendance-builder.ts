import type { AttendanceStatus, DerivedAttendance } from "@/lib/actions/attendance"
import { getDayOfWeek, STANDARD_WORK_MINUTES, HALF_DAY_THRESHOLD, calculateExtraMinutes, classifyWorkDay, getISTDateString, canonicalOfficeHoursToMinutes } from "@/lib/utils/time"

export interface AttendanceBuilderOptions {
  joiningDate?: string | null;
  offboardingDate?: string | null;
}

/**
 * Extract effective offboarding date (YYYY-MM-DD) if an employee is deactivated/offboarded.
 * Authoritative sources:
 * 1. direct deactivated_at string/timestamp if set
 * 2. notes tag: [DEACTIVATED: <iso-timestamp> ...] if employment_status is Inactive/Terminated
 * 3. updated_at if status is Inactive/Terminated
 * Returns null if the employee is currently Active.
 */
export function extractOffboardingDate(employee?: {
  employment_status?: string | null;
  deactivated_at?: string | null;
  notes?: string | null;
  updated_at?: string | null;
} | null): string | null {
  if (!employee) return null;
  const status = (employee.employment_status || '').toLowerCase();
  const isInactive = status === 'inactive' || status === 'terminated' || Boolean(employee.deactivated_at);
  if (!isInactive) return null;

  if (employee.deactivated_at) {
    return employee.deactivated_at.split('T')[0];
  }

  if (employee.notes) {
    const matches = Array.from(employee.notes.matchAll(/\[DEACTIVATED:\s*([^\s\]]+)/g));
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1][1];
      const datePart = lastMatch.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
      }
    }
  }

  if (employee.updated_at) {
    return employee.updated_at.split('T')[0];
  }

  return null;
}

/**
 * Computes the navigable year and month bounds for an employee's attendance calendar.
 */
export function getEmploymentNavigationBounds(
  employee: {
    joining_date?: string | null;
    employment_status?: string | null;
    deactivated_at?: string | null;
    notes?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  } | null | undefined,
  currentISTDateStr: string = getISTDateString()
) {
  const [todayYear, todayMonth] = currentISTDateStr.split('-').map(Number);
  const offboardingDate = extractOffboardingDate(employee);
  const joiningDate = employee?.joining_date || null;

  let startYear = todayYear;
  let startMonth = todayMonth;

  if (joiningDate && /^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) {
    const [jY, jM] = joiningDate.split('-').map(Number);
    startYear = jY;
    startMonth = jM;
  } else if (employee?.created_at) {
    try {
      const cDate = new Date(employee.created_at);
      if (!isNaN(cDate.getTime())) {
        startYear = cDate.getFullYear();
        startMonth = cDate.getMonth() + 1;
      }
    } catch {}
  }

  let endYear = todayYear;
  let endMonth = todayMonth;

  if (offboardingDate && /^\d{4}-\d{2}-\d{2}$/.test(offboardingDate)) {
    const [oY, oM] = offboardingDate.split('-').map(Number);
    endYear = oY;
    endMonth = oM;
  }

  // Safety clamp if start > end
  if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
    startYear = endYear;
    startMonth = endMonth;
  }

  // Generate valid years array
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  if (years.length === 0) {
    years.push(todayYear);
  }

  // Clamped initial default month and year (opens current month unless clamped by bounds)
  let initialYear = todayYear;
  let initialMonth = todayMonth;

  if (initialYear > endYear || (initialYear === endYear && initialMonth > endMonth)) {
    initialYear = endYear;
    initialMonth = endMonth;
  }
  if (initialYear < startYear || (initialYear === startYear && initialMonth < startMonth)) {
    initialYear = startYear;
    initialMonth = startMonth;
  }

  return {
    startYear,
    startMonth,
    endYear,
    endMonth,
    years,
    initialYear,
    initialMonth,
    joiningDate,
    offboardingDate,
    isOffboarded: Boolean(offboardingDate)
  };
}

/** Pure in-memory attendance record builder */
export function buildAttendanceRecords(
  year: number,
  month: number,
  eods: any[],
  leaveRequests: any[],
  holidays: any[],
  options?: AttendanceBuilderOptions
): DerivedAttendance[] {
  const endDate = new Date(year, month, 0);
  const eodMap = new Map(eods?.map((e: any) => [e.report_date, e]) || []);
  const holidayMap = new Map(holidays?.map((h: any) => [h.date, h]) || []);
  
  const leavesMap = new Map();
  const wfhMap = new Map();
  
  if (leaveRequests) {
    for (const req of leaveRequests) {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (req.request_type === 'WFH') {
          wfhMap.set(dateStr, req);
        } else {
          leavesMap.set(dateStr, req);
        }
      }
    }
  }

  const attendance: DerivedAttendance[] = [];
  const todayStr = getISTDateString();

  const joiningDate = options?.joiningDate || null;
  const offboardingDate = options?.offboardingDate || null;
  const isMissingJoiningDate = Boolean(options && !options.joiningDate);

  for (let d = 1; d <= endDate.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const eod = eodMap.get(dateStr);
    const leave = leavesMap.get(dateStr);
    const wfh = wfhMap.get(dateStr);
    const holidayRecord = holidayMap.get(dateStr);
    const isSunday = getDayOfWeek(dateStr) === 0;
    const isHolidayDate = isSunday || Boolean(holidayRecord);
    const holiday = holidayRecord || (isSunday ? { name: 'Sunday' } : undefined);
    
    const hasRecord = Boolean(eod || leave || wfh);
    const isPreJoining = Boolean(joiningDate && dateStr < joiningDate);
    const isPostOffboarding = Boolean(offboardingDate && dateStr > offboardingDate);

    // Rule: Pre-joining dates: Do not show attendance before joining date
    if (isPreJoining) {
      attendance.push({
        date: dateStr,
        status: 'Not Marked',
        workedHours: 0,
        extraHours: 0,
        compOffMinutes: 0,
        payrollStatus: '',
        holiday: undefined
      });
      continue;
    }

    // Rule: Offboarding: If offboarded, stop generating Present/Absent statuses after effective offboarding date.
    // Preserve historical attendance records if any existed.
    if (isPostOffboarding && !hasRecord) {
      attendance.push({
        date: dateStr,
        status: 'Not Marked',
        workedHours: 0,
        extraHours: 0,
        compOffMinutes: 0,
        payrollStatus: '',
        holiday: undefined
      });
      continue;
    }

    let status: AttendanceStatus = 'Not Marked';
    let workedHours = 0;
    
    const eodStatus = eod ? (eod as any).status : null;
    const isApprovedEod = eodStatus === 'Approved';
    const isPendingEod = eodStatus === 'Pending';
    const isRejectedEod = eodStatus === 'Rejected';
    
    let workedMinutes = 0;
    if (isApprovedEod) {
      workedMinutes = canonicalOfficeHoursToMinutes(Number((eod as any).office_hours || 0));
      workedHours = workedMinutes / 60; // Keep for backwards compat
    }

    // Determine extra hours context
    let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = 'normal';
    if (isSunday) context = 'sunday';
    else if (holidayRecord) context = 'paid_holiday';
    else if (leave && !leave.is_half_day) context = 'approved_leave';

    // Centralized classification for approved EODs
    const classification = isApprovedEod ? classifyWorkDay(workedMinutes, context) : null;
    const compOffMinutes = classification ? classification.compOffMinutes : 0;
    const payrollStatus = classification ? classification.payrollStatus : '';

    // Priority: Holiday Work → Holiday → existing attendance status
    const hasApprovedWork = isApprovedEod && workedMinutes > 0;

    if (isHolidayDate) {
      // Holiday Work takes priority over Holiday and Present
      if (hasApprovedWork) {
        status = 'Holiday Work';
      } else {
        status = 'Holiday';
      }
    } else {
      // Normal working days (Mon-Sat, non-holiday)
      if (leave && !leave.is_half_day) {
        status = 'Leave';
      } else if (wfh && !wfh.is_half_day) {
        status = 'WFH';
      } else if (leave && leave.is_half_day && isApprovedEod) {
        status = 'Half Day';
      } else if (wfh && wfh.is_half_day && isApprovedEod) {
        status = 'Half Day';
      } else if (isApprovedEod) {
        if (workedMinutes < HALF_DAY_THRESHOLD) {
          status = 'Absent';
        } else if (workedMinutes < STANDARD_WORK_MINUTES) {
          status = 'Half Day';
        } else {
          status = 'Present';
        }
      } else if (isPendingEod) {
        status = 'Pending';
      } else if (isRejectedEod) {
        // Rejected EOD follows existing absent rule
        status = 'Absent';
      } else if (dateStr > todayStr) {
        // Future dates: No attendance status unless a scheduled holiday applies
        status = 'Not Marked';
      } else if (dateStr === todayStr) {
        // Current day: If no EOD or approved request exists yet, do not mark Absent prematurely.
        // Show Pending only after submission.
        status = 'Not Marked';
      } else if (isMissingJoiningDate && !hasRecord) {
        // Rule: When joining date is missing from database and records are missing,
        // do not mark every date absent.
        status = 'Not Marked';
      } else {
        // Past working day (`dateStr < todayStr`): submission deadline passed with no valid EOD/leave/WFH
        status = 'Absent';
      }
    }

    const extraMinutes = calculateExtraMinutes(workedMinutes, context);
    const extraHours = extraMinutes / 60;
    
    attendance.push({
      date: dateStr,
      status,
      workedHours,
      extraHours,
      compOffMinutes,
      payrollStatus,
      eod,
      leave,
      wfh,
      holiday
    });
  }

  return attendance;
}
