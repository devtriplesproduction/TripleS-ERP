import { describe, it, expect } from 'vitest'
import {
  calculateProbationEndDate,
  parseMonthsFromDuration,
  getDurationForDates,
  formatProbationDateDisplay,
  getProbationStatus,
} from '@/lib/utils/probation'

describe('Probation Utilities', () => {
  describe('calculateProbationEndDate', () => {
    it('calculates 3 months from 2026-10-01 as 2027-01-01', () => {
      expect(calculateProbationEndDate('2026-10-01', 3)).toBe('2027-01-01')
    })

    it('calculates 6 months from 2026-10-01 as 2027-04-01', () => {
      expect(calculateProbationEndDate('2026-10-01', 6)).toBe('2027-04-01')
    })

    it('calculates 12 months from 2026-10-01 as 2027-10-01', () => {
      expect(calculateProbationEndDate('2026-10-01', 12)).toBe('2027-10-01')
    })

    it('calculates 1 month from 2026-01-31 capping to Feb 28 in a non-leap year', () => {
      expect(calculateProbationEndDate('2026-01-31', 1)).toBe('2026-02-28')
    })

    it('calculates 1 month from 2024-01-31 capping to Feb 29 in a leap year', () => {
      expect(calculateProbationEndDate('2024-01-31', 1)).toBe('2024-02-29')
    })

    it('returns null if joining date is missing or empty (does NOT invent date)', () => {
      expect(calculateProbationEndDate('', 3)).toBeNull()
      expect(calculateProbationEndDate(null, 3)).toBeNull()
      expect(calculateProbationEndDate(undefined, 3)).toBeNull()
    })

    it('returns null if duration is invalid or 0', () => {
      expect(calculateProbationEndDate('2026-10-01', 0)).toBeNull()
      expect(calculateProbationEndDate('2026-10-01', -1)).toBeNull()
    })

    it('handles ISO timestamps with T cleanly', () => {
      expect(calculateProbationEndDate('2026-10-01T00:00:00.000Z', 3)).toBe('2027-01-01')
    })
  })

  describe('parseMonthsFromDuration', () => {
    it('parses "3 Months", "6 Months", "12 Months"', () => {
      expect(parseMonthsFromDuration('3 Months')).toBe(3)
      expect(parseMonthsFromDuration('6 Months')).toBe(6)
      expect(parseMonthsFromDuration('12 Months')).toBe(12)
      expect(parseMonthsFromDuration('1 Month')).toBe(1)
    })

    it('returns null for "None", "Custom", or empty strings', () => {
      expect(parseMonthsFromDuration('None')).toBeNull()
      expect(parseMonthsFromDuration('Custom')).toBeNull()
      expect(parseMonthsFromDuration('')).toBeNull()
      expect(parseMonthsFromDuration(null)).toBeNull()
      expect(parseMonthsFromDuration(undefined)).toBeNull()
    })
  })

  describe('getDurationForDates', () => {
    it('recognizes standard durations', () => {
      expect(getDurationForDates('2026-10-01', '2027-01-01')).toBe('3 Months')
      expect(getDurationForDates('2026-10-01', '2027-04-01')).toBe('6 Months')
      expect(getDurationForDates('2026-10-01', '2027-10-01')).toBe('12 Months')
    })

    it('returns custom for non-standard dates', () => {
      expect(getDurationForDates('2026-10-01', '2027-01-15')).toBe('custom')
    })

    it('returns none if end date is empty', () => {
      expect(getDurationForDates('2026-10-01', '')).toBe('none')
      expect(getDurationForDates('2026-10-01', null)).toBe('none')
    })

    it('returns custom if joining date is missing but end date is present', () => {
      expect(getDurationForDates('', '2027-01-01')).toBe('custom')
      expect(getDurationForDates(null, '2027-01-01')).toBe('custom')
    })
  })

  describe('formatProbationDateDisplay', () => {
    it('formats valid dates to DD MMM YYYY', () => {
      expect(formatProbationDateDisplay('2027-01-01')).toBe('01 Jan 2027')
      expect(formatProbationDateDisplay('2026-10-01')).toBe('01 Oct 2026')
    })

    it('returns fallback for missing or empty dates', () => {
      expect(formatProbationDateDisplay(null)).toBe('-')
      expect(formatProbationDateDisplay('')).toBe('-')
      expect(formatProbationDateDisplay(undefined, 'Not Set')).toBe('Not Set')
    })
  })

  describe('getProbationStatus', () => {
    it('returns none if no probation end date is set', () => {
      expect(getProbationStatus(null).status).toBe('none')
      expect(getProbationStatus('').status).toBe('none')
    })

    it('returns active for future end dates and completed for past end dates', () => {
      const future = getProbationStatus('2099-01-01')
      expect(future.status).toBe('active')
      expect(future.label).toBe('Active Probation')

      const past = getProbationStatus('2000-01-01')
      expect(past.status).toBe('completed')
      expect(past.label).toBe('Probation Completed')
    })
  })
})
