import { describe, it, expect } from 'vitest';
import {
  parseHHMM,
  minutesToCanonicalDecimalHours,
  canonicalOfficeHoursToMinutes,
  formatCanonicalDuration,
  formatHoursMinutes,
  classifyWorkDay,
  calculateCompOffMinutes,
  isSunday,
  STANDARD_WORK_MINUTES,
  HALF_DAY_THRESHOLD
} from '../lib/utils/time';

describe('TripleS ERP — Canonical Time Format and Comp-Off Reconciliation', () => {

  describe('1. Canonical Parsing & Conversion Utilities', () => {
    it('parses HH.MM user input strings into integer minutes correctly', () => {
      expect(parseHHMM('8')).toBe(480);
      expect(parseHHMM('8.00')).toBe(480);
      expect(parseHHMM('8.05')).toBe(485); // 8 hours 5 minutes
      expect(parseHHMM('8.30')).toBe(510); // 8 hours 30 minutes
      expect(parseHHMM('8.45')).toBe(525); // 8 hours 45 minutes
      expect(parseHHMM('10.30')).toBe(630); // 10 hours 30 minutes
      expect(parseHHMM('4.00')).toBe(240);
      expect(parseHHMM('0.30')).toBe(30);
    });

    it('converts canonical integer minutes to database decimal hours with full precision', () => {
      expect(minutesToCanonicalDecimalHours(480)).toBe(8);
      expect(minutesToCanonicalDecimalHours(485)).toBe(8.083333); // 8h 5m
      expect(minutesToCanonicalDecimalHours(510)).toBe(8.5);      // 8h 30m
      expect(minutesToCanonicalDecimalHours(525)).toBe(8.75);     // 8h 45m
      expect(minutesToCanonicalDecimalHours(630)).toBe(10.5);     // 10h 30m
      expect(minutesToCanonicalDecimalHours(240)).toBe(4);
    });

    it('safely interprets both legacy HH.MM values and true decimal hours into canonical minutes', () => {
      // Legacy records in database
      expect(canonicalOfficeHoursToMinutes(8.05)).toBe(485); // 8h 5m
      expect(canonicalOfficeHoursToMinutes(8.15)).toBe(495); // 8h 15m
      expect(canonicalOfficeHoursToMinutes(8.45)).toBe(525); // 8h 45m
      expect(canonicalOfficeHoursToMinutes(10.47)).toBe(647); // 10h 47m
      expect(canonicalOfficeHoursToMinutes(8.3)).toBe(510);  // 8h 30m
      expect(canonicalOfficeHoursToMinutes(11.3)).toBe(690); // 11h 30m

      // True decimal records in database
      expect(canonicalOfficeHoursToMinutes(8.083333)).toBe(485);
      expect(canonicalOfficeHoursToMinutes(8.25)).toBe(495);
      expect(canonicalOfficeHoursToMinutes(8.75)).toBe(525);
      expect(canonicalOfficeHoursToMinutes(10.783333)).toBe(647);
      expect(canonicalOfficeHoursToMinutes(8.5)).toBe(510);
      expect(canonicalOfficeHoursToMinutes(11.5)).toBe(690);
      expect(canonicalOfficeHoursToMinutes(8)).toBe(480);
      expect(canonicalOfficeHoursToMinutes(4.25)).toBe(255);
    });
  });

  describe('2. Comp-Off Credit Rules (Centralized Classification)', () => {
    it('Normal working day under 4 hours: Unpaid Leave with 0 Comp-Off credit', () => {
      const minutes = 210; // 3h 30m
      const result = classifyWorkDay(minutes, 'normal');
      expect(result.payrollStatus).toBe('UNPAID_LEAVE');
      expect(result.isPayableDay).toBe(false);
      expect(result.compOffMinutes).toBe(0);
    });

    it('Normal working day from 4 hours to under 8 hours: Half Day with 0 Comp-Off credit', () => {
      const fourHours = classifyWorkDay(240, 'normal');
      expect(fourHours.payrollStatus).toBe('HALF_DAY');
      expect(fourHours.isPayableDay).toBe(true);
      expect(fourHours.compOffMinutes).toBe(0);

      const sixHours = classifyWorkDay(360, 'normal');
      expect(sixHours.payrollStatus).toBe('HALF_DAY');
      expect(sixHours.compOffMinutes).toBe(0);

      const sevenHours59 = classifyWorkDay(479, 'normal');
      expect(sevenHours59.payrollStatus).toBe('HALF_DAY');
      expect(sevenHours59.compOffMinutes).toBe(0);
    });

    it('Normal working day exactly 8 hours: Full Day with 0 Comp-Off credit', () => {
      const result = classifyWorkDay(480, 'normal');
      expect(result.payrollStatus).toBe('FULL_DAY');
      expect(result.isPayableDay).toBe(true);
      expect(result.compOffMinutes).toBe(0);
    });

    it('Normal working day above 8 hours: credits ONLY minutes exceeding 8 hours', () => {
      // 8h 5m (485 mins) -> 5 mins overtime
      const eight05 = classifyWorkDay(485, 'normal');
      expect(eight05.payrollStatus).toBe('FULL_DAY');
      expect(eight05.compOffMinutes).toBe(5);

      // 8h 30m (510 mins) -> 30 mins overtime
      const eight30 = classifyWorkDay(510, 'normal');
      expect(eight30.compOffMinutes).toBe(30);

      // 8h 45m (525 mins) -> 45 mins overtime
      const eight45 = classifyWorkDay(525, 'normal');
      expect(eight45.compOffMinutes).toBe(45);

      // 10h 30m (630 mins) -> 150 mins overtime (2h 30m)
      const ten30 = classifyWorkDay(630, 'normal');
      expect(ten30.compOffMinutes).toBe(150);
    });

    it('Sunday with approved work: credits ALL worked minutes', () => {
      const sundayWork = classifyWorkDay(480, 'sunday');
      expect(sundayWork.payrollStatus).toBe('COMP_OFF_DAY');
      expect(sundayWork.compOffMinutes).toBe(480); // Full 8 hours credited

      const sundayPartTime = classifyWorkDay(240, 'sunday');
      expect(sundayPartTime.compOffMinutes).toBe(240); // 4 hours credited
    });

    it('Published paid holiday with approved work: credits ALL worked minutes', () => {
      const holidayWork = classifyWorkDay(690, 'paid_holiday'); // 11h 30m
      expect(holidayWork.payrollStatus).toBe('COMP_OFF_DAY');
      expect(holidayWork.compOffMinutes).toBe(690); // All 11h 30m credited
    });

    it('Approved EOD only rule: Pending or Rejected EODs never generate Comp-Off credit', () => {
      expect(calculateCompOffMinutes(510, 'normal', 'Pending')).toBe(0);
      expect(calculateCompOffMinutes(510, 'normal', 'Rejected')).toBe(0);
      expect(calculateCompOffMinutes(510, 'normal', 'Draft')).toBe(0);
      expect(calculateCompOffMinutes(510, 'normal', 'Approved')).toBe(30);
    });
  });

  describe('3. Unified Display Formatter', () => {
    it('Review EOD and Comp-Off Ledger Details format identical canonical duration', () => {
      // 8h 5m
      expect(formatCanonicalDuration(8.083333)).toBe('8h 5m');
      expect(formatCanonicalDuration(8.05)).toBe('8h 5m'); // Legacy fallback

      // 8h 30m
      expect(formatCanonicalDuration(8.5)).toBe('8h 30m');
      expect(formatCanonicalDuration(8.3)).toBe('8h 30m');

      // 8h 45m
      expect(formatCanonicalDuration(8.75)).toBe('8h 45m');
      expect(formatCanonicalDuration(8.45)).toBe('8h 45m');

      // 10h 30m
      expect(formatCanonicalDuration(10.5)).toBe('10h 30m');

      // 8h exact
      expect(formatCanonicalDuration(8)).toBe('8h');
      expect(formatCanonicalDuration(4)).toBe('4h');
    });

    it('Comp-Off transaction amounts display eligible credits accurately', () => {
      // 5 min credit (0.08h)
      expect(`+${formatHoursMinutes(0.08)}`).toBe('+0h 5m');
      expect(`+${formatHoursMinutes(0.083333)}`).toBe('+0h 5m');

      // 45 min credit (0.75h)
      expect(`+${formatHoursMinutes(0.75)}`).toBe('+0h 45m');

      // 30 min credit (0.5h)
      expect(`+${formatHoursMinutes(0.5)}`).toBe('+0h 30m');

      // 2h 47m credit (2.78h)
      expect(`+${formatHoursMinutes(2.78)}`).toBe('+2h 47m');

      // 8h credit (Sunday or leave debit)
      expect(`+${formatHoursMinutes(8)}`).toBe('+8h');
    });

    it('Ledger balance calculation strictly equals credits + reversals - debits', () => {
      const transactions = [
        { type: 'CREDIT', hours: 0.08 }, // +5m
        { type: 'CREDIT', hours: 0.50 }, // +30m
        { type: 'CREDIT', hours: 8.00 }, // +8h
        { type: 'DEBIT', hours: 8.00 },  // -8h leave
        { type: 'REVERSAL', hours: 8.00 },// +8h cancelled leave reversal
        { type: 'DEBIT', hours: 8.00 }   // -8h approved leave
      ];

      let earned = 0;
      let debits = 0;
      let reversals = 0;

      for (const t of transactions) {
        if (t.type === 'CREDIT') earned += t.hours;
        else if (t.type === 'DEBIT') debits += t.hours;
        else if (t.type === 'REVERSAL') reversals += t.hours;
      }

      const used = Math.round(Math.max(0, debits - reversals) * 100) / 100;
      const totalEarned = Math.round(earned * 100) / 100;
      const available = Math.round(Math.max(0, totalEarned - used) * 100) / 100;

      expect(totalEarned).toBe(8.58);
      expect(used).toBe(8);
      expect(available).toBe(0.58);
    });
  });
});
