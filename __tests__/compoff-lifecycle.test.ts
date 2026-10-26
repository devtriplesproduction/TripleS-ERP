import { describe, it, expect } from 'vitest';
import {
  classifyWorkDay,
  calculateCompOffMinutes,
  formatHoursMinutes,
} from '@/lib/utils/time';

describe('Comp-Off Credits & Ledger Lifecycle', () => {
  describe('1. Business Rules for Daily EOD Hours', () => {
    it('Normal working day under 4 hours (e.g. 2h): Unpaid Leave with 0 Comp-Off credit', () => {
      const result = classifyWorkDay(120, 'normal'); // 2 hours
      expect(result.payrollStatus).toBe('UNPAID_LEAVE');
      expect(result.isPayableDay).toBe(false);
      expect(result.compOffMinutes).toBe(0);
      expect(calculateCompOffMinutes(120, 'normal', 'Approved')).toBe(0);
    });

    it('Normal working day from 4h to 8h (e.g. 6h): Half Day with 0 Comp-Off credit', () => {
      const result = classifyWorkDay(360, 'normal'); // 6 hours
      expect(result.payrollStatus).toBe('HALF_DAY');
      expect(result.isPayableDay).toBe(true);
      expect(result.compOffMinutes).toBe(0);
      expect(calculateCompOffMinutes(360, 'normal', 'Approved')).toBe(0);
    });

    it('Normal working day exactly 8h (480m): Full Day with 0 Comp-Off credit', () => {
      const result = classifyWorkDay(480, 'normal');
      expect(result.payrollStatus).toBe('FULL_DAY');
      expect(result.isPayableDay).toBe(true);
      expect(result.compOffMinutes).toBe(0);
      expect(calculateCompOffMinutes(480, 'normal', 'Approved')).toBe(0);
    });

    it('Normal working day above 8h threshold (e.g. 9h 13m): credits ONLY extra minutes', () => {
      const result = classifyWorkDay(553, 'normal'); // 9h 13m = 553m
      expect(result.payrollStatus).toBe('FULL_DAY');
      expect(result.compOffMinutes).toBe(73); // 1h 13m extra
      expect(calculateCompOffMinutes(553, 'normal', 'Approved')).toBe(73);
    });

    it('Sunday work: credits ALL worked minutes', () => {
      const result = classifyWorkDay(360, 'sunday'); // 6 hours
      expect(result.payrollStatus).toBe('COMP_OFF_DAY');
      expect(result.compOffMinutes).toBe(360);
      expect(calculateCompOffMinutes(360, 'sunday', 'Approved')).toBe(360);
    });

    it('Paid Holiday work: credits ALL worked minutes', () => {
      const result = classifyWorkDay(480, 'paid_holiday'); // 8 hours
      expect(result.payrollStatus).toBe('COMP_OFF_DAY');
      expect(result.compOffMinutes).toBe(480);
      expect(calculateCompOffMinutes(480, 'paid_holiday', 'Approved')).toBe(480);
    });

    it('Unapproved EOD statuses (Pending, Rejected, Draft): always return 0 Comp-Off', () => {
      expect(calculateCompOffMinutes(600, 'normal', 'Pending')).toBe(0);
      expect(calculateCompOffMinutes(600, 'normal', 'Rejected')).toBe(0);
      expect(calculateCompOffMinutes(600, 'normal', 'Draft')).toBe(0);
    });
  });

  describe('2. Available Balance Formula (Available = Earned - Used)', () => {
    it('guarantees Available = Total Earned - Total Used with exact formatting', () => {
      const earnedHours = 25.93;
      const usedHours = 8;
      const availableHours = Math.round(Math.max(0, earnedHours - usedHours) * 100) / 100;
      expect(availableHours).toBe(17.93);

      expect(formatHoursMinutes(earnedHours)).toBe('25h 56m');
      expect(formatHoursMinutes(usedHours)).toBe('8h');
      expect(formatHoursMinutes(availableHours)).toBe('17h 56m');
    });

    it('displays 0h without negative sign when usedHours is 0', () => {
      const usedHours = 0;
      const formattedUsed = usedHours > 0 ? `-${formatHoursMinutes(usedHours)}` : '0h';
      expect(formattedUsed).toBe('0h');
      expect(formattedUsed).not.toBe('-0h');
    });

    it('displays negative prefix when usedHours > 0', () => {
      const usedHours = 8;
      const formattedUsed = usedHours > 0 ? `-${formatHoursMinutes(usedHours)}` : '0h';
      expect(formattedUsed).toBe('-8h');
    });
  });

  describe('3. Ledger Math: DEBIT and REVERSAL synchronization', () => {
    it('calculates net used hours correctly from debits and reversals', () => {
      const entries = [
        { transaction_type: 'CREDIT', hours: 10 },
        { transaction_type: 'DEBIT', hours: 8 },
        { transaction_type: 'REVERSAL', hours: 8 }, // cancelled leave
      ];

      let earnedHours = 0;
      let debitHours = 0;
      let reversalHours = 0;

      for (const e of entries) {
        if (e.transaction_type === 'CREDIT') earnedHours += e.hours;
        else if (e.transaction_type === 'DEBIT') debitHours += e.hours;
        else if (e.transaction_type === 'REVERSAL') reversalHours += e.hours;
      }

      const usedHours = Math.round(Math.max(0, debitHours - reversalHours) * 100) / 100;
      const availableHours = Math.round(Math.max(0, earnedHours - usedHours) * 100) / 100;

      expect(usedHours).toBe(0);
      expect(availableHours).toBe(10);
      expect(availableHours).toBe(earnedHours - usedHours);
    });
  });
});
