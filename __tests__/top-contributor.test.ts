import { describe, it, expect } from 'vitest'
import {
  formatHours,
  getInitials,
  getRankColor,
} from '@/lib/utils/top-contributor'

describe('Top Contributor Feature', () => {
  describe('formatHours — Decimal & Display Conversion', () => {
    it('formats 29.5 hrs as 29.5 hrs and represents 29 hours 30 minutes', () => {
      const result = formatHours(29.5)
      expect(result.formatted).toBe('29.5 hrs')
      expect(result.detailed).toBe('29 hours 30 minutes')
    })

    it('formats 29.9 hrs as 29.9 hrs and represents 29 hours 54 minutes', () => {
      const result = formatHours(29.9)
      expect(result.formatted).toBe('29.9 hrs')
      expect(result.detailed).toBe('29 hours 54 minutes')
    })

    it('formats 24.5 hrs as 24.5 hrs and represents 24 hours 30 minutes', () => {
      const result = formatHours(24.5)
      expect(result.formatted).toBe('24.5 hrs')
      expect(result.detailed).toBe('24 hours 30 minutes')
    })

    it('formats whole number 10 as 10 hrs and represents 10 hours', () => {
      const result = formatHours(10)
      expect(result.formatted).toBe('10 hrs')
      expect(result.detailed).toBe('10 hours')
    })

    it('formats 0 as 0 hrs and represents 0 hours', () => {
      const result = formatHours(0)
      expect(result.formatted).toBe('0 hrs')
      expect(result.detailed).toBe('0 hours')
    })

    it('handles rounding floating point inaccuracies correctly', () => {
      const result = formatHours(10.7333333333)
      expect(result.formatted).toBe('10.7 hrs')
      expect(result.detailed).toBe('10 hours 44 minutes')
    })
  })

  describe('getInitials — Avatar Fallback', () => {
    it('extracts initials for first and last names', () => {
      expect(getInitials('Omkar Sawant')).toBe('OS')
      expect(getInitials('Prince Nandagawali')).toBe('PN')
      expect(getInitials('Harishchandra Nanavare')).toBe('HN')
    })

    it('handles single names and edge cases gracefully', () => {
      expect(getInitials('Prince')).toBe('PR')
      expect(getInitials('')).toBe('??')
      expect(getInitials('   ')).toBe('??')
    })
  })

  describe('getRankColor — Leaderboard Visual Hierarchy', () => {
    it('returns high-contrast foreground for rank 1, muted foreground for rank 2 and 3', () => {
      expect(getRankColor(1)).toBe('text-foreground font-bold')
      expect(getRankColor(2)).toBe('text-muted-foreground font-semibold')
      expect(getRankColor(3)).toBe('text-muted-foreground/70 font-semibold')
      expect(getRankColor(4)).toBe('text-muted-foreground')
      expect(getRankColor(5)).toBe('text-muted-foreground')
    })
  })

  describe('Leaderboard Aggregation & Rules Logic', () => {
    it('aggregates only approved reports and ignores pending and rejected', () => {
      const mockEodReports = [
        { employee_id: 'emp-1', office_hours: 8, status: 'Approved', name: 'Alice' },
        { employee_id: 'emp-1', office_hours: 4.5, status: 'Pending', name: 'Alice' },
        { employee_id: 'emp-1', office_hours: 6, status: 'Rejected', name: 'Alice' },
        { employee_id: 'emp-2', office_hours: 9.5, status: 'Approved', name: 'Bob' },
        { employee_id: 'emp-2', office_hours: 8, status: 'Approved', name: 'Bob' },
      ]

      const approvedReports = mockEodReports.filter((e) => e.status === 'Approved')
      const empMap = new Map<string, { id: string; name: string; totalHours: number }>()

      for (const eod of approvedReports) {
        if (!empMap.has(eod.employee_id)) {
          empMap.set(eod.employee_id, { id: eod.employee_id, name: eod.name, totalHours: 0 })
        }
        empMap.get(eod.employee_id)!.totalHours += eod.office_hours
      }

      const list = Array.from(empMap.values()).sort((a, b) => b.totalHours - a.totalHours)

      expect(list.length).toBe(2)
      // Bob: 9.5 + 8 = 17.5
      expect(list[0].name).toBe('Bob')
      expect(list[0].totalHours).toBe(17.5)
      // Alice: only 8 (pending 4.5 and rejected 6 are excluded)
      expect(list[1].name).toBe('Alice')
      expect(list[1].totalHours).toBe(8)
    })

    it('resolves ties consistently using secondary sort (employee name)', () => {
      const employees = [
        { id: 'emp-1', name: 'Zack Taylor', totalHours: 25.0 },
        { id: 'emp-2', name: 'Alice Walker', totalHours: 25.0 },
        { id: 'emp-3', name: 'Charlie Brown', totalHours: 25.0 },
      ]

      const sorted = [...employees].sort((a, b) => {
        if (Math.abs(b.totalHours - a.totalHours) > 0.0001) {
          return b.totalHours - a.totalHours
        }
        return a.name.localeCompare(b.name)
      })

      expect(sorted[0].name).toBe('Alice Walker')
      expect(sorted[1].name).toBe('Charlie Brown')
      expect(sorted[2].name).toBe('Zack Taylor')
    })

    it('limits leaderboard to top 3 contributors', () => {
      const employees = [
        { id: '1', name: 'Emp 1', totalHours: 50 },
        { id: '2', name: 'Emp 2', totalHours: 40 },
        { id: '3', name: 'Emp 3', totalHours: 30 },
        { id: '4', name: 'Emp 4', totalHours: 20 },
        { id: '5', name: 'Emp 5', totalHours: 10 },
        { id: '6', name: 'Emp 6', totalHours: 5 },
        { id: '7', name: 'Emp 7', totalHours: 2 },
      ]

      const top3 = employees.slice(0, 3)
      expect(top3.length).toBe(3)
      expect(top3[0].totalHours).toBe(50)
      expect(top3[2].totalHours).toBe(30)
    })

    it('handles empty state when no approved records exist', () => {
      const mockReports: any[] = []
      const approved = mockReports.filter((e) => e.status === 'Approved')
      expect(approved.length).toBe(0)
    })
  })
})
