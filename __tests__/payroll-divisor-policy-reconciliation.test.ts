import { describe, it, expect } from 'vitest';
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service';
import {
  getAuthoritativeDivisorPolicy,
  getDivisorForMonth
} from '@/lib/services/payroll-config.service';
import {
  getStandardWorkingDaysInMonth,
  getCalendarDaysInMonth,
  getSundaysCountInMonth,
  isSunday,
  isWorkingDay
} from '@/lib/utils/time';

describe('TripleS ERP — Master Dynamic Payroll Divisor Policy', () => {
  const OMKAR_ID = '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6';

  describe('1. Dynamic Divisor Formula Verification (Asia/Kolkata)', () => {
    it('October 2026: 31 calendar days - 4 Sundays = 27 days', () => {
      const totalDays = getCalendarDaysInMonth(2026, 10);
      const sundays = getSundaysCountInMonth(2026, 10);
      const workingDays = getStandardWorkingDaysInMonth(2026, 10);

      expect(totalDays).toBe(31);
      expect(sundays).toBe(4);
      expect(workingDays).toBe(27);
      expect(getDivisorForMonth(2026, 10)).toBe(27);
    });

    it('November 2026: 30 calendar days - 5 Sundays = 25 days', () => {
      const totalDays = getCalendarDaysInMonth(2026, 11);
      const sundays = getSundaysCountInMonth(2026, 11);
      const workingDays = getStandardWorkingDaysInMonth(2026, 11);

      expect(totalDays).toBe(30);
      expect(sundays).toBe(5);
      expect(workingDays).toBe(25);
      expect(getDivisorForMonth(2026, 11)).toBe(25);
    });

    it('December 2026: 31 calendar days - 4 Sundays = 27 days', () => {
      const totalDays = getCalendarDaysInMonth(2026, 12);
      const sundays = getSundaysCountInMonth(2026, 12);
      const workingDays = getStandardWorkingDaysInMonth(2026, 12);

      expect(totalDays).toBe(31);
      expect(sundays).toBe(4);
      expect(workingDays).toBe(27);
      expect(getDivisorForMonth(2026, 12)).toBe(27);
    });

    it('January 2027: 31 calendar days - 5 Sundays = 26 days', () => {
      const totalDays = getCalendarDaysInMonth(2027, 1);
      const sundays = getSundaysCountInMonth(2027, 1);
      const workingDays = getStandardWorkingDaysInMonth(2027, 1);

      expect(totalDays).toBe(31);
      expect(sundays).toBe(5);
      expect(workingDays).toBe(26);
      expect(getDivisorForMonth(2027, 1)).toBe(26);
    });

    it('Confirms Saturdays and Company Holidays are included in divisor, Sundays excluded', () => {
      // In October 2026:
      // Oct 4, 11, 18, 25 are Sundays
      expect(isSunday('2026-10-04')).toBe(true);
      expect(isWorkingDay('2026-10-04')).toBe(false);

      // Oct 3, 10, 17, 24, 31 are Saturdays — counted as working days in divisor
      expect(isSunday('2026-10-03')).toBe(false);
      expect(isWorkingDay('2026-10-03')).toBe(true);
      expect(isWorkingDay('2026-10-31')).toBe(true);

      // Oct 20 is a company holiday — working day in calendar divisor, 100% paid
      expect(isSunday('2026-10-20')).toBe(false);
      expect(isWorkingDay('2026-10-20')).toBe(true);
    });
  });

  describe('2. Active Divisor Policy Configuration', () => {
    it('authoritative policy strictly returns actual_mon_sat (dynamic divisor)', async () => {
      const policy = await getAuthoritativeDivisorPolicy();
      expect(policy).toBe('actual_mon_sat');
    });
  });

  describe('3. Financial Reconciliation for Omkar Sawant across Months', () => {
    it('October 2026: calculates automatically with 27-day divisor', async () => {
      // Calling without options must automatically use dynamic divisor (27)
      const results = await calculateMonthlyPayroll(2026, 10, [OMKAR_ID]);
      expect(results).toHaveLength(1);
      const omkar = results[0];

      // Divisor is dynamically 27
      expect(omkar.reconciliation?.divisorDays).toBe(27);
      expect(omkar.reconciliation?.divisorMode).toBe('actual_mon_sat');
      expect(omkar.reconciliation?.scheduledWorkingDays).toBe(27);

      // Daily Rate = 8000 / 27 = 296.30
      expect(omkar.reconciliation?.dailyRate).toBe(296.30);

      // Payable = 16.5, Deducted = 10.5
      expect(omkar.reconciliation?.payableDays).toBe(16.5);
      expect(omkar.reconciliation?.deductedDays).toBe(10.5);
      expect(omkar.reconciliation?.payableDays! + omkar.reconciliation?.deductedDays!).toBe(27);

      // Net = 16.5 * (8000 / 27) = 4888.89
      // Deductions = 10.5 * (8000 / 27) = 3111.11
      // Sum = 4888.89 + 3111.11 = 8000.00
      expect(omkar.netPayable).toBe(4888.89);
      expect(omkar.totalDeductions).toBe(3111.11);
      expect(Math.round((omkar.netPayable + omkar.totalDeductions) * 100) / 100).toBe(8000.00);
      expect(omkar.reconciliation?.isFinancialReconciled).toBe(true);
      expect(omkar.reconciliation?.status).toBe('RECONCILED');
    }, 60000);

    it('November 2026: calculates automatically with 25-day divisor', async () => {
      // Calling without options must automatically use dynamic divisor (25)
      const results = await calculateMonthlyPayroll(2026, 11, [OMKAR_ID]);
      expect(results).toHaveLength(1);
      const omkar = results[0];

      // Divisor is dynamically 25
      expect(omkar.reconciliation?.divisorDays).toBe(25);
      expect(omkar.reconciliation?.scheduledWorkingDays).toBe(25);

      // Daily Rate = 8000 / 25 = 320.00
      expect(omkar.reconciliation?.dailyRate).toBe(320.00);

      // Invariant: payable days + deducted days = 25
      const totalDays = (omkar.reconciliation?.payableDays || 0) + (omkar.reconciliation?.deductedDays || 0);
      expect(totalDays).toBe(25);

      // Net + Attendance Deductions = 8000.00
      expect(Math.round((omkar.netPayable + omkar.attendanceDeduction) * 100) / 100).toBe(8000.00);
      expect(omkar.reconciliation?.isFinancialReconciled).toBe(true);
    }, 60000);

    it('December 2026: calculates automatically with 27-day divisor', async () => {
      // Calling without options must automatically use dynamic divisor (27)
      const results = await calculateMonthlyPayroll(2026, 12, [OMKAR_ID]);
      expect(results).toHaveLength(1);
      const omkar = results[0];

      // Divisor is dynamically 27
      expect(omkar.reconciliation?.divisorDays).toBe(27);
      expect(omkar.reconciliation?.scheduledWorkingDays).toBe(27);

      // Daily Rate = 8000 / 27 = 296.30
      expect(omkar.reconciliation?.dailyRate).toBe(296.30);

      // Invariant: payable days + deducted days = 27
      const totalDays = (omkar.reconciliation?.payableDays || 0) + (omkar.reconciliation?.deductedDays || 0);
      expect(totalDays).toBe(27);

      // Net + Attendance Deductions = 8000.00
      expect(Math.round((omkar.netPayable + omkar.attendanceDeduction) * 100) / 100).toBe(8000.00);
      expect(omkar.reconciliation?.isFinancialReconciled).toBe(true);
    }, 60000);
  });

  describe('4. Organization-wide Dynamic Divisor Consistency', () => {
    it('applies the dynamic divisor consistently to all employees without hardcoding 26', async () => {
      const results = await calculateMonthlyPayroll(2026, 10);
      expect(results.length).toBeGreaterThan(0);

      for (const res of results) {
        expect(res.reconciliation?.divisorMode).toBe('actual_mon_sat');
        expect(res.reconciliation?.divisorDays).toBe(27);

        // Daily rate is computed using the 27-day dynamic divisor
        if (res.salary && res.salary > 0 && !res.prorationDetail?.isProrated) {
          const expectedDailyRate = Math.round((res.salary / 27) * 100) / 100;
          expect(res.reconciliation?.dailyRate).toBe(expectedDailyRate);
        }

        // Scheduled days invariant
        const total = (res.reconciliation?.payableDays || 0) + (res.reconciliation?.deductedDays || 0);
        expect(Math.abs(total - (res.reconciliation?.scheduledWorkingDays || 0))).toBeLessThanOrEqual(0.01);
      }
    }, 90000);
  });
});
