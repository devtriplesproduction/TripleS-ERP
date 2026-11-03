import { describe, it, expect } from 'vitest'
import {
  parseDate,
  formatDate,
  formatDateReadable,
  formatDateLong,
  formatDateTime,
  toISODateString,
  getTodayIST,
  getTodayDisplay,
  getDaysInMonth,
  isValidDateString,
  BUSINESS_TIMEZONE,
} from '@/lib/utils/date'

describe('Standardized Date Formatting & Parsing (DD/MM/YYYY & Asia/Kolkata)', () => {
  describe('Specific Test Dates: 03/11/2026, 11/03/2026, 01/02/2026', () => {
    it('correctly handles 03/11/2026 (3rd November 2026) without day/month swapping', () => {
      // From DD/MM/YYYY input
      const parsedFromSlash = parseDate('03/11/2026')
      expect(parsedFromSlash).not.toBeNull()
      expect(formatDate(parsedFromSlash)).toBe('03/11/2026')
      expect(formatDateReadable(parsedFromSlash)).toBe('03 Nov 2026')
      expect(formatDateLong(parsedFromSlash)).toBe('03 November 2026')
      expect(toISODateString(parsedFromSlash)).toBe('2026-11-03')

      // From ISO input (2026-11-03)
      const parsedFromIso = parseDate('2026-11-03')
      expect(parsedFromIso).not.toBeNull()
      expect(formatDate(parsedFromIso)).toBe('03/11/2026')
      expect(formatDateReadable(parsedFromIso)).toBe('03 Nov 2026')
      expect(toISODateString(parsedFromIso)).toBe('2026-11-03')

      // Direct string formatting without explicit parse call
      expect(formatDate('2026-11-03')).toBe('03/11/2026')
      expect(formatDateReadable('2026-11-03')).toBe('03 Nov 2026')
      expect(toISODateString('03/11/2026')).toBe('2026-11-03')
    })

    it('correctly handles 11/03/2026 (11th March 2026) without day/month swapping', () => {
      // From DD/MM/YYYY input
      const parsedFromSlash = parseDate('11/03/2026')
      expect(parsedFromSlash).not.toBeNull()
      expect(formatDate(parsedFromSlash)).toBe('11/03/2026')
      expect(formatDateReadable(parsedFromSlash)).toBe('11 Mar 2026')
      expect(formatDateLong(parsedFromSlash)).toBe('11 March 2026')
      expect(toISODateString(parsedFromSlash)).toBe('2026-03-11')

      // From ISO input (2026-03-11)
      const parsedFromIso = parseDate('2026-03-11')
      expect(parsedFromIso).not.toBeNull()
      expect(formatDate(parsedFromIso)).toBe('11/03/2026')
      expect(formatDateReadable(parsedFromIso)).toBe('11 Mar 2026')
      expect(toISODateString(parsedFromIso)).toBe('2026-03-11')

      // Direct string formatting
      expect(formatDate('2026-03-11')).toBe('11/03/2026')
      expect(formatDateReadable('2026-03-11')).toBe('11 Mar 2026')
      expect(toISODateString('11/03/2026')).toBe('2026-03-11')
    })

    it('correctly handles 01/02/2026 (1st February 2026) without day/month swapping', () => {
      // From DD/MM/YYYY input
      const parsedFromSlash = parseDate('01/02/2026')
      expect(parsedFromSlash).not.toBeNull()
      expect(formatDate(parsedFromSlash)).toBe('01/02/2026')
      expect(formatDateReadable(parsedFromSlash)).toBe('01 Feb 2026')
      expect(formatDateLong(parsedFromSlash)).toBe('01 February 2026')
      expect(toISODateString(parsedFromSlash)).toBe('2026-02-01')

      // From ISO input (2026-02-01)
      const parsedFromIso = parseDate('2026-02-01')
      expect(parsedFromIso).not.toBeNull()
      expect(formatDate(parsedFromIso)).toBe('01/02/2026')
      expect(formatDateReadable(parsedFromIso)).toBe('01 Feb 2026')
      expect(toISODateString(parsedFromIso)).toBe('2026-02-01')

      // Direct string formatting
      expect(formatDate('2026-02-01')).toBe('01/02/2026')
      expect(formatDateReadable('2026-02-01')).toBe('01 Feb 2026')
      expect(toISODateString('01/02/2026')).toBe('2026-02-01')
    })
  })

  describe('Month and Year Boundaries', () => {
    it('handles year rollover between 31/12/2025 and 01/01/2026', () => {
      // Year-end 2025
      expect(formatDate('2025-12-31')).toBe('31/12/2025')
      expect(formatDateReadable('2025-12-31')).toBe('31 Dec 2025')
      expect(toISODateString('31/12/2025')).toBe('2025-12-31')

      // New-year 2026
      expect(formatDate('2026-01-01')).toBe('01/01/2026')
      expect(formatDateReadable('2026-01-01')).toBe('01 Jan 2026')
      expect(toISODateString('01/01/2026')).toBe('2026-01-01')
    })

    it('handles leap year 29/02/2024 vs non-leap year 28/02/2026', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29)
      expect(getDaysInMonth(2026, 2)).toBe(28)

      // Leap day 2024
      expect(formatDate('2024-02-29')).toBe('29/02/2024')
      expect(formatDateReadable('2024-02-29')).toBe('29 Feb 2024')
      expect(toISODateString('29/02/2024')).toBe('2024-02-29')

      // Non-leap February end 2026
      expect(formatDate('2026-02-28')).toBe('28/02/2026')
      expect(formatDateReadable('2026-02-28')).toBe('28 Feb 2026')
      expect(toISODateString('28/02/2026')).toBe('2026-02-28')

      // Invalid 29/02/2026 should fail parsing
      expect(parseDate('29/02/2026')).toBeNull()
    })

    it('handles 30-day and 31-day month boundaries accurately', () => {
      // April (30 days)
      expect(getDaysInMonth(2026, 4)).toBe(30)
      expect(formatDate('2026-04-30')).toBe('30/04/2026')
      expect(formatDateReadable('2026-04-30')).toBe('30 Apr 2026')
      expect(parseDate('31/04/2026')).toBeNull() // April 31 is invalid

      // May 1st
      expect(formatDate('2026-05-01')).toBe('01/05/2026')
      expect(formatDateReadable('2026-05-01')).toBe('01 May 2026')
    })
  })

  describe('Timezone Safety with Asia/Kolkata', () => {
    it('uses Asia/Kolkata timezone standard constant', () => {
      expect(BUSINESS_TIMEZONE).toBe('Asia/Kolkata')
    })

    it('formats UTC timestamps according to Asia/Kolkata without shifting dates', () => {
      // 2026-11-02T18:30:00.000Z in UTC is 2026-11-03 00:00:00 in Asia/Kolkata (UTC+5:30)
      const istMidnight = '2026-11-02T18:30:00.000Z'
      expect(formatDate(istMidnight)).toBe('03/11/2026')
      expect(formatDateReadable(istMidnight)).toBe('03 Nov 2026')

      // 2026-11-03T18:29:59.000Z in UTC is 2026-11-03 23:59:59 in Asia/Kolkata
      const istEndOfDay = '2026-11-03T18:29:59.000Z'
      expect(formatDate(istEndOfDay)).toBe('03/11/2026')
      expect(formatDateReadable(istEndOfDay)).toBe('03 Nov 2026')

      // 2026-11-03T18:30:00.000Z in UTC is 2026-11-04 00:00:00 in Asia/Kolkata
      const nextDayMidnight = '2026-11-03T18:30:00.000Z'
      expect(formatDate(nextDayMidnight)).toBe('04/11/2026')
      expect(formatDateReadable(nextDayMidnight)).toBe('04 Nov 2026')
    })

    it('formats current date in Asia/Kolkata', () => {
      const todayIso = getTodayIST()
      expect(todayIso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const todayDisplay = getTodayDisplay()
      expect(todayDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    })
  })

  describe('Database Storage & API Format Preservation', () => {
    it('preserves database date storage in ISO YYYY-MM-DD format', () => {
      expect(toISODateString('03/11/2026')).toBe('2026-11-03')
      expect(toISODateString('11/03/2026')).toBe('2026-03-11')
      expect(toISODateString('01/02/2026')).toBe('2026-02-01')
      expect(toISODateString('2026-11-03')).toBe('2026-11-03')
    })

    it('returns empty string on invalid inputs to prevent DB errors', () => {
      expect(toISODateString(null)).toBe('')
      expect(toISODateString(undefined)).toBe('')
      expect(toISODateString('')).toBe('')
      expect(toISODateString('invalid-date')).toBe('')
    })
  })

  describe('Validation & Edge Cases', () => {
    it('validates date strings properly', () => {
      expect(isValidDateString('03/11/2026')).toBe(true)
      expect(isValidDateString('2026-11-03')).toBe(true)
      expect(isValidDateString('31/02/2026')).toBe(false)
      expect(isValidDateString('')).toBe(false)
      expect(isValidDateString(null)).toBe(false)
    })

    it('gracefully returns fallback on null or undefined', () => {
      expect(formatDate(null, '—')).toBe('—')
      expect(formatDate(undefined, 'N/A')).toBe('N/A')
      expect(formatDateReadable(null, '-')).toBe('-')
    })
  })
})

