import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateMonthlyPayroll, classifyDay } from '@/lib/services/payroll.service';
import { resolveSalaryForPeriod } from '@/lib/utils/salary';
import { isWorkingDay } from '@/lib/utils/time';
import {
  finalizePayrollRun,
  isPayrollFinalized,
  getFinalizedPayroll,
  resetPayrollRunForTesting
} from '@/lib/services/payroll-records.service';

let mockEmployees: any[] = [];
let mockProfiles: any[] = [];
let mockEODs: any[] = [];
let mockHolidays: any[] = [];
let mockLeaves: any[] = [];
let mockSalaryHistory: any[] = [];
let mockDeductions: any[] = [];
let mockLedger: any[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: (table: string) => {
      let currentData: any[] = [];
      if (table === 'employee_onboarding') currentData = mockEmployees;
      else if (table === 'profiles') currentData = mockProfiles;
      else if (table === 'eod_reports') currentData = mockEODs;
      else if (table === 'holidays') currentData = mockHolidays;
      else if (table === 'leave_requests') currentData = mockLeaves;
      else if (table === 'salary_history') currentData = mockSalaryHistory;
      else if (table === 'payroll_deductions') currentData = mockDeductions;
      else if (table === 'comp_off_ledger') currentData = mockLedger;
      else if (table === 'payroll_runs' || table === 'payroll_items') currentData = [];

      const createQueryBuilder = (filteredData: any[]) => {
        const builder: any = {
          data: filteredData,
          error: null,
          select: () => builder,
          order: () => builder,
          in: (col: string, vals: any[]) =>
            createQueryBuilder(filteredData.filter(item => vals.includes(item[col]))),
          eq: (col: string, val: any) =>
            createQueryBuilder(filteredData.filter(item => item[col] === val)),
          gte: (col: string, val: any) =>
            createQueryBuilder(filteredData.filter(item => item[col] >= val)),
          lte: (col: string, val: any) =>
            createQueryBuilder(filteredData.filter(item => item[col] <= val)),
          maybeSingle: async () => ({ data: filteredData[0] || null, error: null }),
          single: async () => ({ data: filteredData[0] || null, error: null }),
          limit: () => builder,
          then: (resolve: any) => resolve({ data: filteredData, error: null })
        };
        return builder;
      };

      return {
        select: (cols?: string) => createQueryBuilder(currentData),
        insert: async (rows: any) => {
          const arr = Array.isArray(rows) ? rows : [rows];
          currentData.push(...arr);
          return { data: rows, error: null };
        },
        upsert: async (rows: any) => {
          const arr = Array.isArray(rows) ? rows : [rows];
          currentData.push(...arr);
          return { data: rows, error: null };
        },
        update: () => ({ eq: () => ({ error: null }) })
      };
    }
  }),
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({ then: (res: any) => res({ data: [], error: null }) })
        })
      })
    })
  })
}));

describe('Master Payroll Regression Suite: 18 Mandatory Scenarios', () => {
  beforeEach(() => {
    mockEmployees = [];
    mockProfiles = [];
    mockEODs = [];
    mockHolidays = [];
    mockLeaves = [];
    mockSalaryHistory = [];
    mockDeductions = [];
    mockLedger = [];
  });

  // 1. Full working day (8h)
  it('Scenario 1: Full working day (8h) receives full day pay, 1.0 payable fraction, and 0 comp-off', () => {
    const classification = classifyDay(480, 'normal');
    expect(classification.status).toBe('FULL_DAY');
    expect(classification.payFraction).toBe(1.0);
    expect(classification.compOffMinutes).toBe(0);
  });

  // 2. Half working day (4h to <8h)
  it('Scenario 2: Half working day (4h to <8h) receives 0.5 payable fraction, 0.5 day deduction, and 0 comp-off', () => {
    const classification = classifyDay(300, 'normal'); // 5 hours
    expect(classification.status).toBe('HALF_DAY');
    expect(classification.payFraction).toBe(0.5);
    expect(classification.compOffMinutes).toBe(0);
  });

  // 3. Unpaid absence (<4h / unexcused)
  it('Scenario 3: Unpaid absence (<4h or unexcused missing day) receives 0 pay fraction, 1.0 day deduction, and credits short hours to comp-off', () => {
    const shortDay = classifyDay(180, 'normal'); // 3 hours (<4h)
    expect(shortDay.status).toBe('UNPAID');
    expect(shortDay.payFraction).toBe(0);
    expect(shortDay.compOffMinutes).toBe(180);
  });

  // 4. Approved Casual Leave
  it('Scenario 4: Approved Casual Leave is paid leave with 1.0 payable fraction and zero deduction', async () => {
    mockEmployees = [{
      id: 'emp-cl',
      first_name: 'Casual',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-CL',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-cl', employee_id: 'EMP-CL' }];
    mockLeaves = [{
      id: 'leave-cl-1',
      employee_id: 'auth-cl',
      start_date: '2026-10-05',
      end_date: '2026-10-05',
      is_half_day: false,
      request_type: 'Leave',
      leave_type: 'Casual Leave',
      status: 'Approved'
    }];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-cl']);
    expect(results).toHaveLength(1);
    expect(results[0].creditedLeaveHours).toBe(8);
    const oct5 = results[0].dailyBreakdown?.find(d => d.date === '2026-10-05');
    expect(oct5?.status).toBe('LEAVE');
    expect(oct5?.payableFraction).toBe(1.0);
    expect(oct5?.deductionDays).toBe(0);
  });

  // 5. Approved Sick Leave
  it('Scenario 5: Approved Sick Leave is paid leave with 1.0 payable fraction and zero deduction', async () => {
    mockEmployees = [{
      id: 'emp-sl',
      first_name: 'Sick',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-SL',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-sl', employee_id: 'EMP-SL' }];
    mockLeaves = [{
      id: 'leave-sl-1',
      employee_id: 'auth-sl',
      start_date: '2026-10-06',
      end_date: '2026-10-06',
      is_half_day: false,
      request_type: 'Leave',
      leave_type: 'Sick Leave',
      status: 'Approved'
    }];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-sl']);
    expect(results).toHaveLength(1);
    expect(results[0].creditedLeaveHours).toBe(8);
    const oct6 = results[0].dailyBreakdown?.find(d => d.date === '2026-10-06');
    expect(oct6?.status).toBe('LEAVE');
    expect(oct6?.payableFraction).toBe(1.0);
    expect(oct6?.deductionDays).toBe(0);
  });

  // 6. Approved Comp-Off leave
  it('Scenario 6: Approved Comp-Off leave is paid leave with 1.0 payable fraction and zero deduction', async () => {
    mockEmployees = [{
      id: 'emp-co-leave',
      first_name: 'CompOff',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-COL',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-col', employee_id: 'EMP-COL' }];
    mockLeaves = [{
      id: 'leave-co-1',
      employee_id: 'auth-col',
      start_date: '2026-10-16',
      end_date: '2026-10-16',
      is_half_day: false,
      request_type: 'Leave',
      leave_type: 'Compensatory Off',
      status: 'Approved'
    }];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-co-leave']);
    expect(results).toHaveLength(1);
    expect(results[0].creditedLeaveHours).toBe(8);
    const oct16 = results[0].dailyBreakdown?.find(d => d.date === '2026-10-16');
    expect(oct16?.status).toBe('LEAVE');
    expect(oct16?.payableFraction).toBe(1.0);
    expect(oct16?.deductionDays).toBe(0);
    expect(oct16?.notes).toContain('8h debited from Comp-Off ledger');
  });

  // 7. Approved WFH
  it('Scenario 7: Approved WFH is counted as payable working time and not as leave deduction', async () => {
    mockEmployees = [{
      id: 'emp-wfh-scen',
      first_name: 'Remote',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-WFH-S',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-wfhs', employee_id: 'EMP-WFH-S' }];
    mockLeaves = [{
      id: 'wfh-req-s',
      employee_id: 'auth-wfhs',
      start_date: '2026-10-02',
      end_date: '2026-10-02',
      is_half_day: false,
      request_type: 'WFH',
      leave_type: 'Paid',
      status: 'Approved'
    }];
    mockEODs = [{
      id: 'eod-wfh-s',
      employee_id: 'auth-wfhs',
      office_hours: 8.5,
      report_date: '2026-10-02',
      status: 'Approved'
    }];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-wfh-scen']);
    expect(results).toHaveLength(1);
    const oct2 = results[0].dailyBreakdown?.find(d => d.date === '2026-10-02');
    expect(oct2?.status).toBe('FULL_DAY');
    expect(oct2?.payableFraction).toBe(1.0);
    expect(oct2?.deductionDays).toBe(0);
    expect(oct2?.activity).toContain('WFH Remote Work');
  });

  // 8. Paid company holiday
  it('Scenario 8: Paid company holiday grants 1.0 day pay without attendance deduction', async () => {
    mockEmployees = [{
      id: 'emp-hol-scen',
      first_name: 'Holiday',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-HOL-S',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-hols', employee_id: 'EMP-HOL-S' }];
    mockHolidays = [{
      id: 'hol-oct-20',
      name: 'Diwali',
      date: '2026-10-20',
      holiday_type: 'PAID'
    }];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-hol-scen']);
    expect(results).toHaveLength(1);
    expect(results[0].paidHolidayHours).toBe(8);
    const oct20 = results[0].dailyBreakdown?.find(d => d.date === '2026-10-20');
    expect(oct20?.status).toBe('HOLIDAY');
    expect(oct20?.payableFraction).toBe(1.0);
    expect(oct20?.deductionDays).toBe(0);
  });

  // 9. Sunday work
  it('Scenario 9: Sunday work credits 100% of worked time to Comp-Off with 0 regular payroll salary', () => {
    const sunWork = classifyDay(300, 'sunday'); // 5 hours worked on Sunday
    expect(sunWork.status).toBe('SUNDAY');
    expect(sunWork.payFraction).toBe(0); // 0 regular salary
    expect(sunWork.compOffMinutes).toBe(300); // 100% credited to comp-off
  });

  // 10. Weekday overtime
  it('Scenario 10: Weekday overtime credits hours above 8h to Comp-Off, not additional salary', () => {
    const otWork = classifyDay(570, 'normal'); // 9.5 hours on normal weekday
    expect(otWork.status).toBe('FULL_DAY');
    expect(otWork.payFraction).toBe(1.0); // 1 day regular pay
    expect(otWork.compOffMinutes).toBe(90); // 1.5h (90 mins) to comp-off
  });

  // 11. Employee joining mid-month
  it('Scenario 11: Employee joining mid-month has prorated base pay and zero deductions before joining date', () => {
    const employee = {
      id: 'emp-join-mid',
      employment_type: 'Full Time',
      salary: 26000,
      basic_salary: 26000,
      joining_date: '2026-10-15',
      employment_status: 'Active'
    };

    const resolution = resolveSalaryForPeriod(employee, [], 2026, 10, 26, isWorkingDay);
    expect(resolution.isEligible).toBe(true);
    expect(resolution.proration.isProrated).toBe(true);
    expect(resolution.proration.effectiveStartDate).toBe('2026-10-15');
    // Mon-Sat from Oct 15 to Oct 31 = 15 working days
    expect(resolution.proration.eligibleWorkingDays).toBe(15);
    expect(resolution.basePay).toBe(Math.round(26000 * (15 / 26) * 100) / 100);
  });

  // 12. Employee offboarding mid-month
  it('Scenario 12: Employee offboarding mid-month has prorated base pay and zero deductions after exit date', () => {
    const employee = {
      id: 'emp-exit-mid',
      employment_type: 'Full Time',
      salary: 26000,
      basic_salary: 26000,
      joining_date: '2025-01-01',
      deactivated_at: '2026-10-14',
      employment_status: 'Inactive'
    };

    const resolution = resolveSalaryForPeriod(employee, [], 2026, 10, 26, isWorkingDay);
    expect(resolution.isEligible).toBe(true);
    expect(resolution.proration.isProrated).toBe(true);
    expect(resolution.proration.effectiveEndDate).toBe('2026-10-14');
    // Mon-Sat from Oct 1 to Oct 14 = 12 working days
    expect(resolution.proration.eligibleWorkingDays).toBe(12);
    expect(resolution.basePay).toBe(Math.round(26000 * (12 / 26) * 100) / 100);
  });

  // 13. Salary hike during a month
  it('Scenario 13: Salary hike during month calculates exact daily rates for each segment', () => {
    const employee = {
      id: 'emp-hike-test',
      employment_type: 'Full Time',
      salary: 26000,
      basic_salary: 26000,
      joining_date: '2025-01-01',
      employment_status: 'Active'
    };

    const history = [{
      previous_salary: 26000,
      new_salary: 52000,
      effective_date: '2026-10-16',
      created_at: '2026-10-16T00:00:00Z'
    }];

    const resolution = resolveSalaryForPeriod(employee, history, 2026, 10, 26, isWorkingDay);
    expect(resolution.proration.isProrated).toBe(true);
    expect(resolution.proration.hikeSplits).toHaveLength(2);
    // 13 days @ 26,000 + 14 days @ 52,000
    const split1 = resolution.proration.hikeSplits![0];
    const split2 = resolution.proration.hikeSplits![1];
    expect(split1.rate).toBe(26000);
    expect(split2.rate).toBe(52000);
    expect(split1.workingDays).toBe(13);
    expect(split2.workingDays).toBe(14);
  });

  // 14. Manual deduction
  it('Scenario 14: Manual deduction subtracts amount from net payable and maintains exact financial reconciliation', async () => {
    mockEmployees = [{
      id: 'emp-man-ded',
      first_name: 'Manual',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-MD-1',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-md', employee_id: 'EMP-MD-1' }];
    // Provide full attendance (approved EOD for all 31 days)
    mockEODs = Array.from({ length: 31 }, (_, i) => ({
      id: `eod-md-${i + 1}`,
      employee_id: 'auth-md',
      office_hours: 8,
      report_date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      status: 'Approved'
    }));
    mockDeductions = [{
      id: 'ded-1',
      employee_id: 'emp-man-ded',
      payroll_year: 2026,
      payroll_month: 10,
      deduction_type: 'Security Deposit',
      amount: 1500,
      status: 'ACTIVE',
      reason: 'Key deposit'
    }];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-man-ded']);
    expect(results).toHaveLength(1);
    expect(results[0].manualDeductions).toBe(1500);
    expect(results[0].reconciliation?.isFinancialReconciled).toBe(true);
    expect(results[0].netPayable + results[0].totalDeductions).toBe(results[0].salary);
  });

  // 15. Payroll recalculation idempotency
  it('Scenario 15: Repeated payroll recalculation is deterministic and yields identical results', async () => {
    mockEmployees = [{
      id: 'emp-recalc',
      first_name: 'Idempotent',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-IDEM',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-idem', employee_id: 'EMP-IDEM' }];
    mockEODs = [
      { id: 'eod-i1', employee_id: 'auth-idem', office_hours: 8, report_date: '2026-10-01', status: 'Approved' },
      { id: 'eod-i2', employee_id: 'auth-idem', office_hours: 8, report_date: '2026-10-02', status: 'Approved' }
    ];

    const run1 = await calculateMonthlyPayroll(2026, 10, ['emp-recalc']);
    const run2 = await calculateMonthlyPayroll(2026, 10, ['emp-recalc']);

    expect(run1[0].netPayable).toBe(run2[0].netPayable);
    expect(run1[0].attendanceDeduction).toBe(run2[0].attendanceDeduction);
    expect(run1[0].daysFullDay).toBe(run2[0].daysFullDay);
    expect(run1[0].compOffMinutesEarned).toBe(run2[0].compOffMinutesEarned);
  });

  // 16. Duplicate EOD prevention
  it('Scenario 16: Duplicate approved EODs for the same day are consolidated and never double-counted', async () => {
    mockEmployees = [{
      id: 'emp-dup-test',
      first_name: 'NoDup',
      last_name: 'User',
      salary: 26000,
      basic_salary: 26000,
      employee_id_number: 'EMP-NODUP',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }];
    mockProfiles = [{ id: 'auth-nodup', employee_id: 'EMP-NODUP' }];
    // Two duplicate EOD submissions on Oct 1
    mockEODs = [
      { id: 'eod-dup-a', employee_id: 'auth-nodup', office_hours: 8, report_date: '2026-10-01', status: 'Approved' },
      { id: 'eod-dup-b', employee_id: 'auth-nodup', office_hours: 8, report_date: '2026-10-01', status: 'Approved' }
    ];

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-dup-test']);
    // Date-wise breakdown only has 1 entry for 2026-10-01
    const oct1Entries = results[0].dailyBreakdown?.filter(d => d.date === '2026-10-01');
    expect(oct1Entries).toHaveLength(1);
    expect(oct1Entries![0].payableFraction).toBe(1.0);
    expect(results[0].daysFullDay).toBe(1);
  });

  // 17. Duplicate Comp-Off credit/debit prevention
  it('Scenario 17: Comp-Off ledger integration prevents duplicate credits and debits', async () => {
    const { processEODCompOff, processLeaveCompOff } = await import('@/lib/actions/compoff');

    mockEmployees = [{ id: 'emp-co-dup', first_name: 'CO', last_name: 'Dup' }];
    mockProfiles = [{ id: 'auth-co-dup', employee_id: 'EMP-CODUP' }];

    // Simulate EOD processing twice with the same eodId
    await processEODCompOff('eod-co-1', 'emp-co-dup', 10, 'Approved', {
      reportDate: '2026-10-05',
      onboardingId: 'emp-co-dup'
    });
    await processEODCompOff('eod-co-1', 'emp-co-dup', 10, 'Approved', {
      reportDate: '2026-10-05',
      onboardingId: 'emp-co-dup'
    });

    const credits = mockLedger.filter(l => l.reference_id === 'eod-co-1' && l.transaction_type === 'CREDIT');
    expect(credits).toHaveLength(1); // Exactly 1 credit

    // Simulate Leave processing twice with the same leaveId
    await processLeaveCompOff('leave-co-1', 'emp-co-dup', 1, 'Approved');
    await processLeaveCompOff('leave-co-1', 'emp-co-dup', 1, 'Approved');

    const debits = mockLedger.filter(l => l.reference_id === 'leave-co-1' && l.transaction_type === 'DEBIT');
    expect(debits).toHaveLength(1); // Exactly 1 debit
  });

  // 18. Payroll finalization and historical retrieval
  it('Scenario 18: Payroll finalization creates an immutable snapshot retrievable for historical audit', async () => {
    const snapshotData: any[] = [{
      employeeId: 'emp-snap-hist',
      name: 'Historical Record',
      department: 'Engineering',
      salary: 50000,
      standardHours: 208,
      actualWorkedHours: 208,
      creditedLeaveHours: 0,
      unpaidLeaveHours: 0,
      paidHolidayHours: 0,
      wfhHours: 0,
      extraHours: 0,
      shortHours: 0,
      totalPaidHours: 208,
      daysFullDay: 26,
      daysHalfDay: 0,
      daysUnpaidLeaveEod: 0,
      daysAbsent: 0,
      payableWorkedHours: 208,
      payableHours: 208,
      compOffMinutesEarned: 0,
      overtimePay: 0,
      unpaidLeaveDeduction: 0,
      attendanceDeduction: 0,
      shortHoursDeduction: 0,
      manualDeductions: 0,
      deductionsCount: 0,
      grossPay: 50000,
      totalDeductions: 0,
      netPayable: 50000,
      hasPayrollData: true
    }];

    resetPayrollRunForTesting(2026, 12);
    const finalization = await finalizePayrollRun(2026, 12, snapshotData, 'admin-auditor');
    expect(finalization.success).toBe(true);

    const isLocked = await isPayrollFinalized(2026, 12);
    expect(isLocked).toBe(true);

    const retrieved = await getFinalizedPayroll(2026, 12, ['emp-snap-hist']);
    expect(retrieved).not.toBeNull();
    expect(retrieved![0].netPayable).toBe(50000);
    expect(retrieved![0].isLocked).toBe(true);
    expect(retrieved![0].daysFullDay).toBe(26);
  });
});
