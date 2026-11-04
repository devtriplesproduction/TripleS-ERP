import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCalendarDaysInMonth,
  getSundaysCountInMonth,
  getStandardWorkingDaysInMonth,
  isSunday,
  isWorkingDay
} from '@/lib/utils/time';
import { calculateMonthlyPayroll, classifyDay } from '@/lib/services/payroll.service';
import { resolveSalaryForPeriod } from '@/lib/utils/salary';

let mockEmployees: any[] = [];
let mockProfiles: any[] = [];
let mockEODs: any[] = [];
let mockHolidays: any[] = [];
let mockLeaves: any[] = [];
let mockSalaryHistory: any[] = [];
let mockDeductions: any[] = [];

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
        insert: async (rows: any) => ({ data: rows, error: null }),
        upsert: async (rows: any) => ({ data: rows, error: null }),
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

describe('Dynamic Calendar Payroll Engine: Working-Day Counts, Divisors & Edge Cases', () => {
  beforeEach(() => {
    mockEmployees = [];
    mockProfiles = [];
    mockEODs = [];
    mockHolidays = [];
    mockLeaves = [];
    mockSalaryHistory = [];
    mockDeductions = [];
  });

  describe('1. Dynamic Working Days: Asia/Kolkata Calendar Calculations', () => {
    it('calculates months with 4 Sundays (e.g. October 2026: 31 days - 4 Sundays = 27 working days)', () => {
      const days = getCalendarDaysInMonth(2026, 10);
      const sundays = getSundaysCountInMonth(2026, 10);
      const workingDays = getStandardWorkingDaysInMonth(2026, 10);

      expect(days).toBe(31);
      expect(sundays).toBe(4); // Oct 4, 11, 18, 25
      expect(workingDays).toBe(27);
    });

    it('calculates months with 5 Sundays (e.g. November 2026: 30 days - 5 Sundays = 25 working days)', () => {
      const days = getCalendarDaysInMonth(2026, 11);
      const sundays = getSundaysCountInMonth(2026, 11);
      const workingDays = getStandardWorkingDaysInMonth(2026, 11);

      expect(days).toBe(30);
      expect(sundays).toBe(5); // Nov 1, 8, 15, 22, 29
      expect(workingDays).toBe(25);
    });

    it('calculates 31-day months with 5 Sundays (e.g. August 2026: 31 days - 5 Sundays = 26 working days)', () => {
      const days = getCalendarDaysInMonth(2026, 8);
      const sundays = getSundaysCountInMonth(2026, 8);
      const workingDays = getStandardWorkingDaysInMonth(2026, 8);

      expect(days).toBe(31);
      expect(sundays).toBe(5); // Aug 2, 9, 16, 23, 30
      expect(workingDays).toBe(26);
    });

    it('calculates normal February (e.g. February 2026: 28 days - 4 Sundays = 24 working days)', () => {
      const days = getCalendarDaysInMonth(2026, 2);
      const sundays = getSundaysCountInMonth(2026, 2);
      const workingDays = getStandardWorkingDaysInMonth(2026, 2);

      expect(days).toBe(28);
      expect(sundays).toBe(4); // Feb 1, 8, 15, 22
      expect(workingDays).toBe(24);
    });

    it('calculates Leap Year February (e.g. February 2028: 29 days - 4 Sundays = 25 working days)', () => {
      const days = getCalendarDaysInMonth(2028, 2);
      const sundays = getSundaysCountInMonth(2028, 2);
      const workingDays = getStandardWorkingDaysInMonth(2028, 2);

      expect(days).toBe(29);
      expect(sundays).toBe(4); // Feb 6, 13, 20, 27
      expect(workingDays).toBe(25);
    });
  });

  describe('2. Dynamic Salary Divisors & Financial Reconciliation', () => {
    it('uses dynamic Mon–Sat working days as salary divisor when divisorMode is actual_mon_sat', async () => {
      mockEmployees = [{
        id: 'emp-dyn-1',
        first_name: 'Dynamic',
        last_name: 'Worker',
        salary: 27000,
        basic_salary: 27000,
        employee_id_number: 'EMP-DYN-1',
        employment_type: 'Full Time',
        joining_date: '2026-01-01',
        employment_status: 'Active'
      }];
      mockProfiles = [{ id: 'auth-dyn-1', employee_id: 'EMP-DYN-1' }];

      // October 2026 has 27 working days. With 0 attendance, employee loses 27 days @ (27000 / 27) = ₹1,000/day
      const results = await calculateMonthlyPayroll(2026, 10, ['emp-dyn-1'], { divisorMode: 'actual_mon_sat' });
      expect(results).toHaveLength(1);
      expect(results[0].standardHours).toBe(216); // 27 * 8 = 216
      expect(results[0].reconciliation?.scheduledWorkingDays).toBe(27);
      expect(results[0].reconciliation?.dailyRate).toBe(1000); // 27000 / 27 = 1000
    });

    it('supports fixed 26-day divisor mode when explicitly configured', async () => {
      mockEmployees = [{
        id: 'emp-fix-1',
        first_name: 'Fixed',
        last_name: 'Worker',
        salary: 26000,
        basic_salary: 26000,
        employee_id_number: 'EMP-FIX-1',
        employment_type: 'Full Time',
        joining_date: '2026-01-01',
        employment_status: 'Active'
      }];
      mockProfiles = [{ id: 'auth-fix-1', employee_id: 'EMP-FIX-1' }];

      const results = await calculateMonthlyPayroll(2026, 10, ['emp-fix-1'], { divisorMode: 'fixed_26' });
      expect(results).toHaveLength(1);
      expect(results[0].standardHours).toBe(208); // 26 * 8 = 208
      expect(results[0].reconciliation?.dailyRate).toBe(1000); // 26000 / 26 = 1000
    });
  });

  describe('3. Half-Day Leaves & Complete Attendance Reconciliations', () => {
    it('correctly reconciles approved half-day leave with unexcused absence on the remaining half', async () => {
      mockEmployees = [{
        id: 'emp-hd-leave',
        first_name: 'HalfDay',
        last_name: 'Leave',
        salary: 27000,
        basic_salary: 27000,
        employee_id_number: 'EMP-HDL-1',
        employment_type: 'Full Time',
        joining_date: '2026-01-01',
        employment_status: 'Active'
      }];
      mockProfiles = [{ id: 'auth-hdl-1', employee_id: 'EMP-HDL-1' }];
      // Provide full attendance for 26 days, and half-day leave on Oct 31 with NO EOD
      mockEODs = Array.from({ length: 30 }, (_, i) => {
        const dStr = `2026-10-${String(i + 1).padStart(2, '0')}`;
        if (isSunday(dStr)) return null;
        return {
          id: `eod-hdl-${i + 1}`,
          employee_id: 'auth-hdl-1',
          office_hours: 8,
          report_date: dStr,
          status: 'Approved'
        };
      }).filter(Boolean);

      // Half-day leave on Oct 31
      mockLeaves = [{
        id: 'leave-hd-oct31',
        employee_id: 'auth-hdl-1',
        start_date: '2026-10-31',
        end_date: '2026-10-31',
        is_half_day: true,
        request_type: 'Leave',
        leave_type: 'Compensatory Off',
        status: 'Approved'
      }];

      const results = await calculateMonthlyPayroll(2026, 10, ['emp-hd-leave'], { divisorMode: 'actual_mon_sat' });
      expect(results).toHaveLength(1);
      const res = results[0];

      // Oct 31 has 0.5 payable leave + 0.5 unexcused absence
      const oct31 = res.dailyBreakdown?.find(d => d.date === '2026-10-31');
      expect(oct31?.payableFraction).toBe(0.5);
      expect(oct31?.deductionDays).toBe(0.5);

      // Reconciles exactly: 26.5 payable days + 0.5 deducted days = 27.0 scheduled days!
      expect(res.reconciliation?.isScheduledDaysReconciled).toBe(true);
      expect(res.reconciliation?.payableDays).toBe(26.5);
      expect(res.reconciliation?.deductedDays).toBe(0.5);
      expect(res.reconciliation?.isFinancialReconciled).toBe(true);
      expect(res.netPayable + res.totalDeductions).toBe(res.salary);
    });

    it('correctly reconciles approved half-day leave with worked 4h shift on the other half (full day pay)', async () => {
      mockEmployees = [{
        id: 'emp-hd-worked',
        first_name: 'HalfDay',
        last_name: 'Worked',
        salary: 27000,
        basic_salary: 27000,
        employee_id_number: 'EMP-HDW-1',
        employment_type: 'Full Time',
        joining_date: '2026-01-01',
        employment_status: 'Active'
      }];
      mockProfiles = [{ id: 'auth-hdw-1', employee_id: 'EMP-HDW-1' }];

      mockLeaves = [{
        id: 'leave-hd-oct1',
        employee_id: 'auth-hdw-1',
        start_date: '2026-10-01',
        end_date: '2026-10-01',
        is_half_day: true,
        request_type: 'Leave',
        leave_type: 'Casual Leave',
        status: 'Approved'
      }];

      // EOD on Oct 1 of 4.5 hours (worked the other half + 0.5h OT)
      mockEODs = [{
        id: 'eod-hdw-oct1',
        employee_id: 'auth-hdw-1',
        office_hours: 4.5,
        report_date: '2026-10-01',
        status: 'Approved'
      }];

      const results = await calculateMonthlyPayroll(2026, 10, ['emp-hd-worked'], { divisorMode: 'actual_mon_sat' });
      const oct1 = results[0].dailyBreakdown?.find(d => d.date === '2026-10-01');
      expect(oct1?.payableFraction).toBe(1.0); // 0.5 leave + 0.5 work = 1.0 day pay!
      expect(oct1?.deductionDays).toBe(0.0);
      expect(oct1?.compOffMinutesEarned).toBe(30); // 0.5h extra to comp-off
    });
  });

  describe('4. Mid-Month Proration with Dynamic Divisor', () => {
    it('prorates salary accurately for mid-month joining in a 27-day month', () => {
      const employee = {
        id: 'emp-mid-join-27',
        employment_type: 'Intern',
        stipend: 27000,
        joining_date: '2026-10-19', // Joined Oct 19
        employment_status: 'Active'
      };

      const resolution = resolveSalaryForPeriod(employee, [], 2026, 10, 27, isWorkingDay);
      expect(resolution.isEligible).toBe(true);
      expect(resolution.proration.isProrated).toBe(true);
      expect(resolution.proration.eligibleWorkingDays).toBe(12);

      // Base pay = 27000 * (12 / 27) = 12000
      expect(resolution.basePay).toBe(12000);
      expect(resolution.dailyRate).toBe(1000);
    });

    it('prorates salary accurately for mid-month exit in a 25-day month (November 2026)', () => {
      const employee = {
        id: 'emp-mid-exit-25',
        employment_type: 'Full Time',
        salary: 25000,
        basic_salary: 25000,
        joining_date: '2025-01-01',
        deactivated_at: '2026-11-14', // Exited Nov 14, 2026
        employment_status: 'Inactive'
      };

      // Nov 1 to Nov 14 (14 calendar days, Nov 1, 8 are Sundays -> 12 working days)
      const resolution = resolveSalaryForPeriod(employee, [], 2026, 11, 25, isWorkingDay);
      expect(resolution.isEligible).toBe(true);
      expect(resolution.proration.isProrated).toBe(true);
      expect(resolution.proration.eligibleWorkingDays).toBe(12);

      // Base pay = 25000 * (12 / 25) = 12000
      expect(resolution.basePay).toBe(12000);
      expect(resolution.dailyRate).toBe(1000);
    });
  });
});

