import { describe, it, expect, vi } from 'vitest'
import {
  calculateExtraMinutes,
  calculateShortMinutes,
  determineWorkDayContext,
  isWorkingDay,
  STANDARD_WORK_MINUTES
} from '../lib/utils/time'

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
