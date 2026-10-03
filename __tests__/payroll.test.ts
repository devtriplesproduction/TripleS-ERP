import { describe, it, expect, vi } from 'vitest'
import {
  calculateExtraMinutes,
  calculateShortMinutes,
  determineWorkDayContext,
  isWorkingDay,
  classifyWorkDay,
  STANDARD_WORK_MINUTES,
  FULL_DAY_MINUTES,
  HALF_DAY_THRESHOLD
} from '../lib/utils/time'

describe('classifyWorkDay - New Classification Logic', () => {
  it('classifies < 4h as Unpaid Leave on normal days', () => {
    const result = classifyWorkDay(239, 'normal'); // 3h 59m
    expect(result.payrollStatus).toBe('UNPAID_LEAVE');
    expect(result.isPayableDay).toBe(false);
    expect(result.compOffMinutes).toBe(239); // All time to comp off
  })

  it('classifies 4h-7h59m as Half Day on normal days', () => {
    const result4h = classifyWorkDay(240, 'normal'); // 4h
    expect(result4h.payrollStatus).toBe('HALF_DAY');
    expect(result4h.isPayableDay).toBe(true);
    expect(result4h.compOffMinutes).toBe(0);

    const result7h = classifyWorkDay(479, 'normal'); // 7h 59m
    expect(result7h.payrollStatus).toBe('HALF_DAY');
    expect(result7h.isPayableDay).toBe(true);
    expect(result7h.compOffMinutes).toBe(0);
  })

  it('classifies exactly 8h as Full Day with 0 Comp Off', () => {
    const result = classifyWorkDay(480, 'normal');
    expect(result.payrollStatus).toBe('FULL_DAY');
    expect(result.isPayableDay).toBe(true);
    expect(result.compOffMinutes).toBe(0);
  })

  it('classifies > 8h as Full Day and credits extra time to Comp Off', () => {
    const result = classifyWorkDay(540, 'normal'); // 9h
    expect(result.payrollStatus).toBe('FULL_DAY');
    expect(result.isPayableDay).toBe(true);
    expect(result.compOffMinutes).toBe(60); // 1h extra
  })

  it('classifies Sunday/Holiday/Leave as Comp Off Day and credits all time', () => {
    const resultSunday = classifyWorkDay(120, 'sunday');
    expect(resultSunday.payrollStatus).toBe('COMP_OFF_DAY');
    expect(resultSunday.isPayableDay).toBe(true);
    expect(resultSunday.compOffMinutes).toBe(120);

    const resultHoliday = classifyWorkDay(60, 'paid_holiday');
    expect(resultHoliday.payrollStatus).toBe('COMP_OFF_DAY');
    expect(resultHoliday.isPayableDay).toBe(true);
    expect(resultHoliday.compOffMinutes).toBe(60);

    const resultLeave = classifyWorkDay(300, 'approved_leave');
    expect(resultLeave.payrollStatus).toBe('COMP_OFF_DAY');
    expect(resultLeave.isPayableDay).toBe(false); // Leave handled separately
    expect(resultLeave.compOffMinutes).toBe(300);
  })
})

describe('Payroll Working Calendar & Time Rules', () => {
  it('identifies working days correctly (Mon-Sat)', () => {
    // 2026-10-04 is a Sunday
    expect(isWorkingDay('2026-10-04')).toBe(false)
    // 2026-10-05 is a Monday
    expect(isWorkingDay('2026-10-05')).toBe(true)
  })

  it('calculates extra minutes on a normal working day (8h)', () => {
    // Normal day, no leave, no holiday
    const context = determineWorkDayContext('2026-10-05', new Set(), new Set())
    expect(calculateExtraMinutes(480, context)).toBe(0) // 8h
    expect(calculateExtraMinutes(540, context)).toBe(60) // 9h -> 1h extra
    expect(calculateExtraMinutes(510, context)).toBe(30) // 8.5h -> 30m extra
  })

  it('calculates short minutes on a normal working day', () => {
    const context = determineWorkDayContext('2026-10-05', new Set(), new Set())
    expect(calculateShortMinutes(420, context)).toBe(60) // 7h -> 1h short
    expect(calculateShortMinutes(480, context)).toBe(0) // 8h -> 0 short
  })

  it('treats all Sunday hours as extra, with no short hours', () => {
    // Sunday
    const context = determineWorkDayContext('2026-10-04', new Set(), new Set())
    expect(calculateExtraMinutes(600, context)).toBe(600) // 10h -> 10h extra
    expect(calculateShortMinutes(0, context)).toBe(0) // No EOD on Sunday -> 0 short
    expect(calculateShortMinutes(120, context)).toBe(0) // 2h on Sunday -> 0 short
  })

  it('treats all holiday worked hours as extra, with no short hours', () => {
    const context = determineWorkDayContext('2026-10-05', new Set(['2026-10-05']), new Set())
    expect(calculateExtraMinutes(360, context)).toBe(360) // 6h on holiday -> 6h extra
    expect(calculateShortMinutes(0, context)).toBe(0) // No EOD on holiday -> 0 short
  })

  it('treats approved leave worked hours as extra', () => {
    const context = determineWorkDayContext('2026-10-05', new Set(), new Set(['2026-10-05']))
    expect(calculateExtraMinutes(180, context)).toBe(180) // 3h on leave -> 3h extra
    expect(calculateShortMinutes(0, context)).toBe(0) // No EOD on leave -> 0 short
  })
})

describe('Edge Cases', () => {
  it('handles exact and extreme minutes properly', () => {
    const ctx = determineWorkDayContext('2026-10-05', new Set(), new Set())
    expect(calculateExtraMinutes(481, ctx)).toBe(1)
    expect(calculateExtraMinutes(1439, ctx)).toBe(959) // 23h59m
    expect(calculateShortMinutes(0, ctx)).toBe(480) // 0 worked mins -> 8h short
  })
})
