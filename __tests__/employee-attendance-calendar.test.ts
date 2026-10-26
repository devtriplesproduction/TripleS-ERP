import { describe, it, expect } from 'vitest'
import {
  buildAttendanceRecords,
  extractOffboardingDate,
  getEmploymentNavigationBounds
} from '../lib/utils/attendance-builder'
import { calculateAttendanceSummary } from '../lib/utils/attendance-summary'

describe('Employee Attendance Calendar - Employment Period & Attendance Rules', () => {
  describe('extractOffboardingDate', () => {
    it('returns null for an active employee', () => {
      const activeEmployee = {
        employment_status: 'Active',
        notes: null,
        deactivated_at: null
      }
      expect(extractOffboardingDate(activeEmployee)).toBeNull()
    })

    it('extracts effective offboarding date from notes when employment_status is Inactive', () => {
      const inactiveEmployee = {
        employment_status: 'Inactive',
        notes: `[DEACTIVATED: 2026-10-17T05:09:28.131Z by admin - Reason: Admin]\n[REACTIVATED: 2026-10-17T06:26:08.037Z by admin]\n[DEACTIVATED: 2026-10-17T06:50:43.029Z by admin - Reason: Administrative Deactivation]`,
        deactivated_at: null
      }
      expect(extractOffboardingDate(inactiveEmployee)).toBe('2026-10-17')
    })

    it('returns null for a reactivated employee whose employment_status is Active despite past deactivation notes', () => {
      const reactivatedEmployee = {
        employment_status: 'Active',
        notes: `[DEACTIVATED: 2026-10-10T10:00:00Z by admin]\n[REACTIVATED: 2026-10-12T10:00:00Z by admin]`,
        deactivated_at: null
      }
      expect(extractOffboardingDate(reactivatedEmployee)).toBeNull()
    })

    it('prefers direct deactivated_at timestamp when present', () => {
      const employeeWithCol = {
        employment_status: 'Inactive',
        deactivated_at: '2026-10-15T12:00:00.000Z',
        notes: '[DEACTIVATED: 2026-10-17T00:00:00Z]'
      }
      expect(extractOffboardingDate(employeeWithCol)).toBe('2026-10-15')
    })
  })

  describe('getEmploymentNavigationBounds', () => {
    const fixedToday = '2026-10-26'

    it('restricts Suraj Mane (joined 2026-10-01, offboarded 2026-10-17) strictly to October 2026 and stops defaulting to 2023', () => {
      const suraj = {
        joining_date: '2026-10-01',
        employment_status: 'Inactive',
        notes: '[DEACTIVATED: 2026-10-17T06:50:43.029Z by admin]'
      }
      const bounds = getEmploymentNavigationBounds(suraj, fixedToday)

      expect(bounds.startYear).toBe(2026)
      expect(bounds.startMonth).toBe(10)
      expect(bounds.endYear).toBe(2026)
      expect(bounds.endMonth).toBe(10)
      expect(bounds.years).toEqual([2026])
      expect(bounds.initialYear).toBe(2026)
      expect(bounds.initialMonth).toBe(10)
      expect(bounds.isOffboarded).toBe(true)
      expect(bounds.offboardingDate).toBe('2026-10-17')
      // Ensure 2023 is never included
      expect(bounds.years).not.toContain(2023)
    })

    it('allows active employee who joined in 2024 to navigate between 2024 and 2026, defaulting to current month', () => {
      const prince = {
        joining_date: '2024-10-01',
        employment_status: 'Active',
        notes: null
      }
      const bounds = getEmploymentNavigationBounds(prince, fixedToday)

      expect(bounds.startYear).toBe(2024)
      expect(bounds.startMonth).toBe(10)
      expect(bounds.endYear).toBe(2026)
      expect(bounds.endMonth).toBe(10)
      expect(bounds.years).toEqual([2024, 2025, 2026])
      expect(bounds.initialYear).toBe(2026)
      expect(bounds.initialMonth).toBe(10) // Defaults to current month October 2026
      expect(bounds.isOffboarded).toBe(false)
      expect(bounds.years).not.toContain(2023)
    })

    it('safely handles employee with missing joining date by defaulting to current month and year', () => {
      const missingJoining = {
        joining_date: null,
        employment_status: 'Active',
        notes: null,
        created_at: null
      }
      const bounds = getEmploymentNavigationBounds(missingJoining, fixedToday)

      expect(bounds.initialYear).toBe(2026)
      expect(bounds.initialMonth).toBe(10)
      expect(bounds.years).toContain(2026)
      expect(bounds.joiningDate).toBeNull()
    })
  })

  describe('buildAttendanceRecords with joiningDate & offboardingDate', () => {
    it('does NOT mark pre-joining dates as Absent and excludes them from monthly summary', () => {
      // Employee joined on 2026-10-10
      // October 2026 has 31 days. Dates 2026-10-01 to 2026-10-09 are pre-joining.
      const eods = [
        { report_date: '2026-10-12', office_hours: 8, status: 'Approved' } // Monday after joining
      ]

      const records = buildAttendanceRecords(2026, 10, eods, [], [], {
        joiningDate: '2026-10-10'
      })

      // Pre-joining working days (e.g. 2026-10-01 Thursday, 2026-10-02 Friday, 2026-10-05 Monday)
      const day1 = records.find(r => r.date === '2026-10-01')
      const day5 = records.find(r => r.date === '2026-10-05')
      const day9 = records.find(r => r.date === '2026-10-09')

      expect(day1?.status).toBe('Not Marked')
      expect(day5?.status).toBe('Not Marked')
      expect(day9?.status).toBe('Not Marked')

      // Post-joining active date with approved EOD
      const day12 = records.find(r => r.date === '2026-10-12')
      expect(day12?.status).toBe('Present')

      // Post-joining past working day without EOD (e.g. 2026-10-13)
      const day13 = records.find(r => r.date === '2026-10-13')
      expect(day13?.status).toBe('Absent')

      // Monthly insights calculation excludes pre-joining dates
      const summary = calculateAttendanceSummary(records.filter(r => r.date >= '2026-10-10'))
      expect(summary.present).toBe(1)
      // Absent count only counts from day 10 onward, not the 8 weekdays prior to joining
      expect(records.filter(r => r.date < '2026-10-10' && r.status === 'Absent')).toHaveLength(0)
    })

    it('stops generating Present/Absent statuses after effective offboarding date while preserving historical records', () => {
      // Suraj Mane scenario: joined 2026-10-01, offboarded 2026-10-17
      const eods = [
        { report_date: '2026-10-01', office_hours: 8, status: 'Approved' },
        { report_date: '2026-10-02', office_hours: 8, status: 'Approved' }
      ]

      const records = buildAttendanceRecords(2026, 10, eods, [], [], {
        joiningDate: '2026-10-01',
        offboardingDate: '2026-10-17'
      })

      // During employment: Days 1 & 2 are Present
      expect(records.find(r => r.date === '2026-10-01')?.status).toBe('Present')
      expect(records.find(r => r.date === '2026-10-02')?.status).toBe('Present')

      // After offboarding date (2026-10-18 to 2026-10-31):
      // No Absent status generated!
      const postOffboardingDays = records.filter(r => r.date > '2026-10-17')
      expect(postOffboardingDays.length).toBe(14) // 31 - 17 = 14 days
      postOffboardingDays.forEach(day => {
        expect(day.status).toBe('Not Marked')
      })

      // Ensure Monthly Insights only calculates from eligible employment period (Oct 1 to Oct 17)
      const eligibleRecords = records.filter(r => r.date >= '2026-10-01' && r.date <= '2026-10-17')
      const summary = calculateAttendanceSummary(eligibleRecords)
      expect(summary.present).toBe(2)
      // Days after Oct 17 do NOT add to Absent
      const totalPostAbsent = records.filter(r => r.date > '2026-10-17' && r.status === 'Absent')
      expect(totalPostAbsent).toHaveLength(0)
    })

    it('does NOT mark every date absent when employee joining date is missing and attendance records are missing', () => {
      const eods = [
        { report_date: '2026-10-06', office_hours: 8, status: 'Approved' }
      ]

      const records = buildAttendanceRecords(2026, 10, eods, [], [], {
        joiningDate: null
      })

      // Date with approved EOD has status Present
      expect(records.find(r => r.date === '2026-10-06')?.status).toBe('Present')

      // Other dates with missing records are NOT marked absent
      const day1 = records.find(r => r.date === '2026-10-01')
      const day2 = records.find(r => r.date === '2026-10-02')
      expect(day1?.status).toBe('Not Marked')
      expect(day2?.status).toBe('Not Marked')
    })
  })
})
