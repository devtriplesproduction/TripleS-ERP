import type { DerivedAttendance } from "@/lib/actions/attendance"

export interface AttendanceSummary {
  present: number;
  wfh: number;
  leave: number;
  halfDay: number;
  absent: number;
  pending: number;
  workedHours: number;
  extraHours: number;
}

/** Single source of truth for summarizing attendance records. Used by both list and detail views. */
export function calculateAttendanceSummary(attendance: DerivedAttendance[]): AttendanceSummary {
  return attendance.reduce((acc, curr) => {
    if (curr.status === 'Present' || curr.status === 'Half Day + Present') acc.present += 1;
    if (curr.status === 'WFH' || curr.status === 'Half Day + WFH') acc.wfh += 1;
    if (curr.status === 'Leave') acc.leave += 1;
    if (curr.status.includes('Half Day')) acc.halfDay += 1;
    if (curr.status === 'Absent') acc.absent += 1;
    if (curr.status === 'Pending') acc.pending += 1;
    acc.workedHours += curr.workedHours;
    acc.extraHours += curr.extraHours;
    return acc;
  }, { present: 0, wfh: 0, leave: 0, halfDay: 0, absent: 0, pending: 0, workedHours: 0, extraHours: 0 });
}
