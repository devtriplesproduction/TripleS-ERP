import type { AttendanceStatus, DerivedAttendance } from "@/lib/actions/attendance"
import { getDayOfWeek, STANDARD_WORK_MINUTES, HALF_DAY_THRESHOLD, calculateExtraMinutes, classifyWorkDay } from "@/lib/utils/time"

/** Pure in-memory attendance record builder */
export function buildAttendanceRecords(
  year: number,
  month: number,
  eods: any[],
  leaveRequests: any[],
  holidays: any[]
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
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr = formatter.format(new Date());

  for (let d = 1; d <= endDate.getDate(); d++) {
    const currentDate = new Date(year, month - 1, d); // local date
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const eod = eodMap.get(dateStr);
    const leave = leavesMap.get(dateStr);
    const wfh = wfhMap.get(dateStr);
    const holidayRecord = holidayMap.get(dateStr);
    const isSunday = getDayOfWeek(dateStr) === 0;
    const isHolidayDate = isSunday || Boolean(holidayRecord);
    const holiday = holidayRecord || (isSunday ? { name: 'Sunday' } : undefined);
    
    let status: AttendanceStatus = 'Absent';
    let workedHours = 0;
    
    const eodStatus = eod ? (eod as any).status : null;
    const isApprovedEod = eodStatus === 'Approved';
    const isPendingEod = eodStatus === 'Pending';
    // Rejected EOD = treat as no EOD (Absent / Holiday)
    
    let workedMinutes = 0;
    if (isApprovedEod) {
      workedMinutes = Math.round(Number((eod as any).office_hours || 0) * 60);
      workedHours = Number((eod as any).office_hours || 0); // Keep for backwards compat
    }

    // Determine extra hours context
    let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = 'normal';
    if (isSunday) context = 'sunday';
    else if (holidayRecord) context = 'paid_holiday';
    else if (leave && !leave.is_half_day) context = 'approved_leave';

    // Use centralized classification for approved EODs
    const classification = isApprovedEod ? classifyWorkDay(workedMinutes, context) : null;
    const compOffMinutes = classification ? classification.compOffMinutes : 0;
    const payrollStatus = classification ? classification.payrollStatus : '';

    // Priority: Holiday Work → Holiday → existing attendance status
    const hasApprovedWork = isApprovedEod && workedMinutes > 0;

    if (isHolidayDate) {
      if (hasApprovedWork) {
        status = 'Holiday Work';
      } else {
        status = 'Holiday';
      }
    } else {
      // Normal working days (Mon-Sat, non-holiday)
      if (leave && leave.is_half_day && isApprovedEod) {
        status = 'Half Day + Present';
      } else if (wfh && wfh.is_half_day && isApprovedEod) {
        status = 'Half Day + WFH';
      } else if (leave && !leave.is_half_day) {
        status = 'Leave';
      } else if (wfh && !wfh.is_half_day) {
        status = 'WFH';
      } else if (isApprovedEod) {
        if (workedMinutes < HALF_DAY_THRESHOLD) {
          status = 'Unpaid Leave';
        } else if (workedMinutes < STANDARD_WORK_MINUTES) {
          status = 'Half Day';
        } else {
          status = 'Present';
        }
      } else if (isPendingEod) {
        status = 'Pending';
      } else if (dateStr > todayStr) {
        status = 'Not Marked'; // Future dates
      } else if (dateStr === todayStr && !eod) {
        status = 'Pending'; // Current day without EOD is Pending, not Absent.
      } else {
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
