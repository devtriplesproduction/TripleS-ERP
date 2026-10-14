import type { DerivedAttendance } from "@/lib/actions/attendance"

export interface AttendanceSummary {
  present: number;
  holidayWork: number;
  holiday: number;
  wfh: number;
  leave: number;
  halfDay: number;
  unpaidLeave: number;
  absent: number;
  pending: number;
  workedHours: number;
  extraHours: number;
  compOffMinutes: number;
}

/** Single source of truth for summarizing attendance records. Used by both list and detail views. */
export function calculateAttendanceSummary(attendance: DerivedAttendance[]): AttendanceSummary {
  return attendance.reduce((acc, curr) => {
    switch (curr.status) {
      case 'Present':
        acc.present += 1;
        break;
      case 'Holiday Work':
        acc.holidayWork += 1;
        break;
      case 'Holiday':
        acc.holiday += 1;
        break;
      case 'WFH':
        acc.wfh += 1;
        break;
      case 'Leave':
        acc.leave += 1;
        break;
      case 'Half Day':
      case 'Half Day + Present':
      case 'Half Day + WFH':
        acc.halfDay += 1;
        break;
      case 'Unpaid Leave':
        acc.unpaidLeave += 1;
        acc.absent += 1;
        break;
      case 'Absent':
        acc.absent += 1;
        break;
      case 'Pending':
        acc.pending += 1;
        break;
      default:
        // 'Not Marked' or other unbadged dates
        break;
    }
    acc.workedHours += curr.workedHours;
    acc.extraHours += curr.extraHours;
    acc.compOffMinutes += (curr.compOffMinutes || 0);
    return acc;
  }, { present: 0, holidayWork: 0, holiday: 0, wfh: 0, leave: 0, halfDay: 0, unpaidLeave: 0, absent: 0, pending: 0, workedHours: 0, extraHours: 0, compOffMinutes: 0 });
}
