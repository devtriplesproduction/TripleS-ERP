import { describe, it, expect } from 'vitest'
import { buildAttendanceRecords as _buildAttendanceRecords } from '../lib/utils/attendance-builder'
import { calculateAttendanceSummary } from '../lib/utils/attendance-summary'
import { determineAttendanceStatus } from '../lib/utils/time'

describe('Holiday Work and Holiday Display in Attendance Calendar', () => {
  const publishedHolidays = [
    {
      id: 'h-1',
      date: '2026-10-20',
      name: 'Dusshera',
      holiday_type: 'PAID'
    }
  ];

  it('1. Marks Sunday with approved EOD (>0h) as "Holiday Work" instead of Present and credits Comp-Off', () => {
    // 2026-10-04 is a Sunday
    const eods = [
      { report_date: '2026-10-04', office_hours: 8, status: 'Approved' }
    ];

    const records = _buildAttendanceRecords(2026, 10, eods, [], publishedHolidays);
    const sundayRecord = records.find(r => r.date === '2026-10-04');

    expect(sundayRecord).toBeDefined();
    expect(sundayRecord?.status).toBe('Holiday Work');
    expect(sundayRecord?.workedHours).toBe(8);
    expect(sundayRecord?.compOffMinutes).toBe(480);
    expect(sundayRecord?.payrollStatus).toBe('COMP_OFF_DAY');
    expect(sundayRecord?.holiday?.name).toBe('Sunday');
  });

  it('2. Marks HR/Admin published holiday with approved EOD (>0h) as "Holiday Work" instead of Present and credits Comp-Off', () => {
    // 2026-10-20 is a Tuesday (Dusshera)
    const eods = [
      { report_date: '2026-10-20', office_hours: 6.5, status: 'Approved' }
    ];

    const records = _buildAttendanceRecords(2026, 10, eods, [], publishedHolidays);
    const holidayRecord = records.find(r => r.date === '2026-10-20');

    expect(holidayRecord).toBeDefined();
    expect(holidayRecord?.status).toBe('Holiday Work');
    expect(holidayRecord?.workedHours).toBe(6.5);
    expect(holidayRecord?.compOffMinutes).toBe(390); // 6.5 * 60
    expect(holidayRecord?.payrollStatus).toBe('COMP_OFF_DAY');
    expect(holidayRecord?.holiday?.name).toBe('Dusshera');
  });

  it('3. Displays "Holiday" badge on every Sunday without approved work', () => {
    // 2026-10-18 and 2026-10-25 are Sundays with no EOD
    const records = _buildAttendanceRecords(2026, 10, [], [], publishedHolidays);
    const sundayRecord18 = records.find(r => r.date === '2026-10-18');
    const sundayRecord25 = records.find(r => r.date === '2026-10-25');

    expect(sundayRecord18).toBeDefined();
    expect(sundayRecord18?.status).toBe('Holiday');
    expect(sundayRecord18?.holiday?.name).toBe('Sunday');

    expect(sundayRecord25).toBeDefined();
    expect(sundayRecord25?.status).toBe('Holiday');
  });

  it('4. Displays "Holiday" badge on every HR/Admin published holiday without approved work', () => {
    // 2026-10-20 (Dusshera) with no EOD
    const records = _buildAttendanceRecords(2026, 10, [], [], publishedHolidays);
    const holidayRecord = records.find(r => r.date === '2026-10-20');

    expect(holidayRecord).toBeDefined();
    expect(holidayRecord?.status).toBe('Holiday');
    expect(holidayRecord?.workedHours).toBe(0);
    expect(holidayRecord?.compOffMinutes).toBe(0);
    expect(holidayRecord?.holiday?.name).toBe('Dusshera');
  });

  it('5. Priority Holiday Work -> Holiday: Displays Holiday on Sunday/Holiday when EOD is pending or rejected', () => {
    const eods = [
      { report_date: '2026-10-11', office_hours: 8, status: 'Pending' },  // Sunday pending
      { report_date: '2026-10-18', office_hours: 8, status: 'Rejected' }, // Sunday rejected
      { report_date: '2026-10-20', office_hours: 8, status: 'Pending' }   // Holiday pending
    ];

    const records = _buildAttendanceRecords(2026, 10, eods, [], publishedHolidays);
    const sundayPending = records.find(r => r.date === '2026-10-11');
    const sundayRejected = records.find(r => r.date === '2026-10-18');
    const holidayPending = records.find(r => r.date === '2026-10-20');

    expect(sundayPending?.status).toBe('Holiday');
    expect(sundayRejected?.status).toBe('Holiday');
    expect(holidayPending?.status).toBe('Holiday');
  });

  it('6. Does NOT mark Sunday or Holiday as "Holiday Work" if office_hours is 0', () => {
    const eods = [
      { report_date: '2026-10-04', office_hours: 0, status: 'Approved' }
    ];

    const records = _buildAttendanceRecords(2026, 10, eods, [], publishedHolidays);
    const sundayRecord = records.find(r => r.date === '2026-10-04');

    expect(sundayRecord?.status).toBe('Holiday');
  });

  it('7. Preserves ordinary working day with approved EOD as "Present"', () => {
    // 2026-10-01 is a Thursday
    const eods = [
      { report_date: '2026-10-01', office_hours: 8, status: 'Approved' }
    ];

    const records = _buildAttendanceRecords(2026, 10, eods, [], publishedHolidays);
    const normalRecord = records.find(r => r.date === '2026-10-01');

    expect(normalRecord).toBeDefined();
    expect(normalRecord?.status).toBe('Present');
    expect(normalRecord?.workedHours).toBe(8);
    expect(normalRecord?.compOffMinutes).toBe(0);
    expect(normalRecord?.payrollStatus).toBe('FULL_DAY');
  });

  it('8. Preserves normal day Pending, Leave, WFH, Half Day, and Absent statuses', () => {
    const leaveRequests = [
      { start_date: '2026-10-02', end_date: '2026-10-02', request_type: 'Leave', is_half_day: false, status: 'Approved' },
      { start_date: '2026-10-03', end_date: '2026-10-03', request_type: 'WFH', is_half_day: false, status: 'Approved' }
    ];
    const eods = [
      { report_date: '2026-10-06', office_hours: 8, status: 'Pending' }, // Normal Tuesday -> Pending
      { report_date: '2026-10-07', office_hours: 5, status: 'Approved' } // Normal Wednesday 5h -> Half Day
    ];

    const records = _buildAttendanceRecords(2026, 10, eods, leaveRequests, publishedHolidays);
    expect(records.find(r => r.date === '2026-10-02')?.status).toBe('Leave');
    expect(records.find(r => r.date === '2026-10-03')?.status).toBe('WFH');
    expect(records.find(r => r.date === '2026-10-06')?.status).toBe('Pending');
    expect(records.find(r => r.date === '2026-10-07')?.status).toBe('Half Day');
    expect(records.find(r => r.date === '2026-10-05')?.status).toBe('Absent'); // Normal Monday without EOD
  });

  it('9. Correctly computes Monthly Insights summary separating Present, Holiday Work, and Holiday without double-counting', () => {
    const sepPublishedHolidays = [
      { id: 'h-sep', date: '2026-09-30', name: 'Anant Chaturthi', holiday_type: 'PAID' }
    ];
    // In September 2026: 30 days total
    // Sundays: Sept 6, 13, 20, 27 (4 Sundays)
    // Holiday: Sept 30 (Wednesday)
    // Total holiday dates = 5
    const eods = [
      { report_date: '2026-09-01', office_hours: 8, status: 'Approved' }, // Normal Tuesday -> Present
      { report_date: '2026-09-06', office_hours: 8, status: 'Approved' }, // Sunday -> Holiday Work
      { report_date: '2026-09-30', office_hours: 6, status: 'Approved' }, // Anant Chaturthi -> Holiday Work
      { report_date: '2026-09-13', office_hours: 8, status: 'Pending' },  // Sunday -> Holiday (not Holiday Work!)
    ];

    const records = _buildAttendanceRecords(2026, 9, eods, [], sepPublishedHolidays);
    const summary = calculateAttendanceSummary(records);

    expect(summary.present).toBe(1); // Only 2026-09-01
    expect(summary.holidayWork).toBe(2); // Sunday (09-06) + Holiday (09-30)
    expect(summary.holiday).toBe(3); // 3 other Sundays (09-13, 09-20, 09-27)
    expect(summary.compOffMinutes).toBe(480 + 360); // 8h + 6h = 840 mins
    expect(summary.workedHours).toBe(22); // 8 + 8 + 6
  });

  it('10. Helper determineAttendanceStatus returns Holiday Work and Holiday correctly', () => {
    expect(determineAttendanceStatus(480, 'sunday', 'Approved')).toBe('Holiday Work');
    expect(determineAttendanceStatus(0, 'sunday', 'Approved')).toBe('Holiday');
    expect(determineAttendanceStatus(360, 'paid_holiday', 'Approved')).toBe('Holiday Work');
    expect(determineAttendanceStatus(480, 'sunday', 'Pending')).toBe('Holiday');
    expect(determineAttendanceStatus(480, 'paid_holiday', 'Rejected')).toBe('Holiday');
    expect(determineAttendanceStatus(480, 'normal', 'Approved')).toBe('Present');
    expect(determineAttendanceStatus(480, 'normal', 'Pending')).toBe('Pending');
    expect(determineAttendanceStatus(480, 'normal', 'Rejected')).toBe('Absent');
  });

  it('11. Current day without EOD or request is "Not Marked", Pending only after submission, and Absent on rejection', () => {
    // Current IST date
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [y, m, d] = todayStr.split('-').map(Number);

    // Case A: No EOD today -> Not Marked (not Absent, not Pending prematurely)
    const recordsNoEod = _buildAttendanceRecords(y, m, [], [], []);
    const todayRecNoEod = recordsNoEod.find(r => r.date === todayStr);
    // If today is a Sunday, it's Holiday, otherwise on a working day it must be Not Marked
    const isTodaySunday = new Date(y, m - 1, d).getDay() === 0;
    if (!isTodaySunday) {
      expect(todayRecNoEod?.status).toBe('Not Marked');
    }

    // Case B: Submitted EOD today -> Pending
    const recordsPending = _buildAttendanceRecords(y, m, [{ report_date: todayStr, office_hours: 8, status: 'Pending' }], [], []);
    const todayRecPending = recordsPending.find(r => r.date === todayStr);
    if (!isTodaySunday) {
      expect(todayRecPending?.status).toBe('Pending');
    }

    // Case C: Rejected EOD today -> Absent
    const recordsRejected = _buildAttendanceRecords(y, m, [{ report_date: todayStr, office_hours: 8, status: 'Rejected' }], [], []);
    const todayRecRejected = recordsRejected.find(r => r.date === todayStr);
    if (!isTodaySunday) {
      expect(todayRecRejected?.status).toBe('Absent');
    }
  });

  it('12. Future dates have no status (Not Marked) unless a scheduled holiday applies', () => {
    // Pick year 2029 (always in the future)
    // 2029-10-01 is a Monday, 2029-10-07 is a Sunday
    const futureHolidays = [{ id: 'fh-1', date: '2029-10-02', name: 'Gandhi Jayanti', holiday_type: 'PAID' }];
    const records = _buildAttendanceRecords(2029, 10, [], [], futureHolidays);

    const normalMonday = records.find(r => r.date === '2029-10-01');
    const holidayTuesday = records.find(r => r.date === '2029-10-02');
    const sunday = records.find(r => r.date === '2029-10-07');

    expect(normalMonday?.status).toBe('Not Marked'); // Future normal working day
    expect(holidayTuesday?.status).toBe('Holiday');   // Scheduled published holiday applies
    expect(sunday?.status).toBe('Holiday');           // Scheduled Sunday applies
  });

  it('13. Monthly insights counts Present, Holiday Work, WFH, Leave, Half Day, Absent, and Pending without double-counting', () => {
    // In August 2026:
    // Past month where dates are guaranteed past:
    // 2026-08-01 (Sat) - Present (Approved 8h)
    // 2026-08-02 (Sun) - Holiday Work (Approved 8h on Sunday)
    // 2026-08-03 (Mon) - WFH (Approved WFH)
    // 2026-08-04 (Tue) - Leave (Approved Leave)
    // 2026-08-05 (Wed) - Half Day (Approved 5h)
    // 2026-08-06 (Thu) - Pending (Pending EOD)
    // 2026-08-07 (Fri) - Absent (Rejected EOD)
    // 2026-08-08 (Sat) - Absent (No EOD on past working day)
    // 2026-08-09 (Sun) - Holiday (Sunday without work)
    const eods = [
      { report_date: '2026-08-01', office_hours: 8, status: 'Approved' },
      { report_date: '2026-08-02', office_hours: 8, status: 'Approved' },
      { report_date: '2026-08-05', office_hours: 5, status: 'Approved' },
      { report_date: '2026-08-06', office_hours: 8, status: 'Pending' },
      { report_date: '2026-08-07', office_hours: 8, status: 'Rejected' },
    ];
    const leaves = [
      { start_date: '2026-08-03', end_date: '2026-08-03', request_type: 'WFH', is_half_day: false, status: 'Approved' },
      { start_date: '2026-08-04', end_date: '2026-08-04', request_type: 'Leave', is_half_day: false, status: 'Approved' }
    ];

    const records = _buildAttendanceRecords(2026, 8, eods, leaves, []);
    const summary = calculateAttendanceSummary(records);

    expect(summary.present).toBe(1);      // 2026-08-01
    expect(summary.holidayWork).toBe(1);  // 2026-08-02
    expect(summary.wfh).toBe(1);          // 2026-08-03
    expect(summary.leave).toBe(1);        // 2026-08-04
    expect(summary.halfDay).toBe(1);      // 2026-08-05 (NOT counted as present)
    expect(summary.pending).toBe(1);      // 2026-08-06
    // 2026-08-07 (Rejected) + all other unworked past working days -> counted as Absent
    expect(summary.absent).toBeGreaterThanOrEqual(2);
    // Ensure total counted dates equals sum of distinct categories without double counting
    const totalCounted = summary.present + summary.holidayWork + summary.holiday + summary.wfh + summary.leave + summary.halfDay + summary.absent + summary.pending;
    expect(totalCounted).toBe(31); // August has 31 days, each day accounted for exactly once
  });
});
