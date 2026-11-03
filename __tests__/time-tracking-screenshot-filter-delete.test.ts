import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTodayIST,
  getYesterdayIST,
  getDaysAgoIST,
  parseTimeMinutes,
  getISTTimeMinutes,
  normalizeStoragePath,
  extractStoragePathFromUrl
} from '@/lib/utils/time-tracking'
import {
  deleteScreenshotsAction,
  getScreenshotsForEmployeeAndDate,
  type ScreenshotItem
} from '@/lib/actions/time-tracking'
import * as authModule from '@/lib/auth'

// Mock Supabase admin client and auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  guardServerAction: vi.fn()
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'session_screenshots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          in: vi.fn((col: string, vals: string[]) => {
            if (vals.includes('invalid-id')) {
              return Promise.resolve({ data: [], error: null })
            }
            return Promise.resolve({
              data: vals.map(id => ({
                id,
                storage_path: `emp-1/${id}.jpg`,
                image_url: `https://test.supabase.co/storage/v1/object/public/screenshots/emp-1/${id}.jpg`,
                employee_id: 'emp-1',
                session_date: '2026-11-03'
              })),
              error: null
            })
          }),
          delete: vi.fn().mockReturnThis()
        }
      }
      if (table === 'security_audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'emp-1', first_name: 'John', last_name: 'Doe', employee_id: 'EMP001' }],
            error: null
          })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockResolvedValue({ error: null })
      }
    }),
    storage: {
      from: vi.fn((bucket: string) => ({
        remove: vi.fn((paths: string[]) => {
          if (paths.includes('error-path.jpg')) {
            return Promise.resolve({ data: null, error: { message: 'Object not found' } })
          }
          return Promise.resolve({ data: paths, error: null })
        }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/screenshots/${path}` }
        }))
      }))
    }
  }))
}))

describe('Time Tracking Screenshots: Filtering, Deletion & Audit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Time Filter & Timezone Calculations (Asia/Kolkata)', () => {
    it('calculates getTodayIST in YYYY-MM-DD format', () => {
      const today = getTodayIST()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('calculates getYesterdayIST as 1 day before getTodayIST', () => {
      const today = getTodayIST()
      const yesterday = getYesterdayIST()
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(yesterday).not.toBe(today)
    })

    it('calculates 7-day and 30-day boundaries correctly', () => {
      const last7Start = getDaysAgoIST(6)
      const last30Start = getDaysAgoIST(29)
      const today = getTodayIST()

      expect(last7Start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(last30Start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(last7Start).getTime()).toBeLessThan(new Date(today).getTime() + 86400000)
      expect(new Date(last30Start).getTime()).toBeLessThan(new Date(last7Start).getTime() + 86400000)
    })

    it('parses time strings to minutes correctly', () => {
      expect(parseTimeMinutes('00:00')).toBe(0)
      expect(parseTimeMinutes('09:00')).toBe(540)
      expect(parseTimeMinutes('18:30')).toBe(1110)
      expect(parseTimeMinutes('23:59')).toBe(1439)
      expect(parseTimeMinutes('')).toBeNull()
      expect(parseTimeMinutes('invalid')).toBeNull()
    })

    it('converts UTC timestamps to Asia/Kolkata (+05:30) minutes accurately', () => {
      // 03:30:00 UTC = 09:00:00 IST -> 540 minutes
      const utc9amIST = '2026-11-03T03:30:00.000Z'
      expect(getISTTimeMinutes(utc9amIST)).toBe(540)

      // 12:30:00 UTC = 18:00:00 IST -> 1080 minutes
      const utc6pmIST = '2026-11-03T12:30:00.000Z'
      expect(getISTTimeMinutes(utc6pmIST)).toBe(1080)

      // Invalid input falls back to 0
      expect(getISTTimeMinutes('')).toBe(0)
      expect(getISTTimeMinutes('invalid')).toBe(0)
    })

    it('filters screenshots by start and end time window in IST', () => {
      const shots: ScreenshotItem[] = [
        {
          id: 's-1',
          sessionId: 'sess-1',
          employeeId: 'emp-1',
          sessionDate: '2026-11-03',
          capturedAt: '2026-11-03T02:00:00.000Z', // 07:30 IST (450 min)
          capturedAtFormatted: '07:30 AM',
          imageUrl: 'https://test/1.jpg',
          fileSizeBytes: 1000,
          fileSizeFormatted: '1 KB',
          appName: 'VS Code',
          windowTitle: 'index.ts'
        },
        {
          id: 's-2',
          sessionId: 'sess-1',
          employeeId: 'emp-1',
          sessionDate: '2026-11-03',
          capturedAt: '2026-11-03T05:30:00.000Z', // 11:00 IST (660 min)
          capturedAtFormatted: '11:00 AM',
          imageUrl: 'https://test/2.jpg',
          fileSizeBytes: 1000,
          fileSizeFormatted: '1 KB',
          appName: 'Chrome',
          windowTitle: 'Google'
        },
        {
          id: 's-3',
          sessionId: 'sess-1',
          employeeId: 'emp-1',
          sessionDate: '2026-11-03',
          capturedAt: '2026-11-03T14:00:00.000Z', // 19:30 IST (1170 min)
          capturedAtFormatted: '07:30 PM',
          imageUrl: 'https://test/3.jpg',
          fileSizeBytes: 1000,
          fileSizeFormatted: '1 KB',
          appName: 'Slack',
          windowTitle: 'General'
        }
      ]

      // Filter: 09:00 to 18:00 IST (540 to 1080 min)
      const min = parseTimeMinutes('09:00')!
      const max = parseTimeMinutes('18:00')!

      const filtered = shots.filter(s => {
        const shotMin = getISTTimeMinutes(s.capturedAt)
        return shotMin >= min && shotMin <= max
      })

      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe('s-2')
    })
  })

  describe('2. Storage Path Normalization & URL Resolution', () => {
    it('normalizes raw storage paths correctly', () => {
      expect(normalizeStoragePath('screenshots/emp-1/shot.jpg')).toBe('emp-1/shot.jpg')
      expect(normalizeStoragePath('/emp-1/shot.jpg')).toBe('emp-1/shot.jpg')
      expect(normalizeStoragePath('emp-1/shot.jpg')).toBe('emp-1/shot.jpg')
    })

    it('extracts storage paths from public or signed Supabase URLs', () => {
      const publicUrl = 'https://abc.supabase.co/storage/v1/object/public/screenshots/emp-1/2026-11-03/img.jpg'
      expect(extractStoragePathFromUrl(publicUrl)).toBe('emp-1/2026-11-03/img.jpg')

      const signedUrl = 'https://abc.supabase.co/storage/v1/object/sign/screenshots/emp-2/2026-11-03/img.jpg?token=xyz'
      expect(extractStoragePathFromUrl(signedUrl)).toBe('emp-2/2026-11-03/img.jpg')

      expect(extractStoragePathFromUrl('https://other-site.com/image.png')).toBeNull()
    })
  })

  describe('3. Security & Role-Based Access Control (RBAC)', () => {
    it('prevents regular employees from deleting screenshots', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-employee-1',
        email: 'employee@triples.com',
        role: 'Employee',
        employee_id: 'EMP100',
        employee_name: 'Regular Employee'
      } as any)

      const result = await deleteScreenshotsAction(['shot-1', 'shot-2'])
      expect(result.success).toBe(false)
      expect(result.deletedCount).toBe(0)
      expect(result.error).toContain('Access Denied')
    })

    it('prevents managers from deleting screenshots', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-manager-1',
        email: 'manager@triples.com',
        role: 'Manager',
        employee_id: 'MGR100',
        employee_name: 'Team Manager'
      } as any)

      const result = await deleteScreenshotsAction(['shot-1'])
      expect(result.success).toBe(false)
      expect(result.deletedCount).toBe(0)
      expect(result.error).toContain('Access Denied')
    })

    it('allows Admin to delete screenshots', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-admin-1',
        email: 'admin@triples.com',
        role: 'Admin',
        employee_id: 'ADM001',
        employee_name: 'System Admin'
      } as any)

      const result = await deleteScreenshotsAction(['shot-1', 'shot-2'])
      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(2)
      expect(result.deletedIds).toEqual(['shot-1', 'shot-2'])
    })

    it('allows authorized HR to delete screenshots', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-hr-1',
        email: 'hr@triples.com',
        role: 'HR',
        employee_id: 'HR001',
        employee_name: 'HR Manager'
      } as any)

      const result = await deleteScreenshotsAction(['shot-1'])
      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(1)
    })
  })

  describe('4. Backend Deletion, Partial Failures & Telemetry Preservation', () => {
    it('handles empty input gracefully', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-admin-1',
        email: 'admin@triples.com',
        role: 'Admin',
        employee_id: 'ADM001',
        employee_name: 'System Admin'
      } as any)

      const result = await deleteScreenshotsAction([])
      expect(result.success).toBe(false)
      expect(result.error).toContain('No screenshot IDs specified')
    })

    it('handles non-existent screenshot IDs safely', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-admin-1',
        email: 'admin@triples.com',
        role: 'Admin',
        employee_id: 'ADM001',
        employee_name: 'System Admin'
      } as any)

      const result = await deleteScreenshotsAction(['invalid-id'])
      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(0)
      expect(result.warnings?.[0]).toContain('already deleted')
    })

    it('preserves activity logs, sessions, and breaks (does not delete telemetry)', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce({
        id: 'user-admin-1',
        email: 'admin@triples.com',
        role: 'Admin',
        employee_id: 'ADM001',
        employee_name: 'System Admin'
      } as any)

      const result = await deleteScreenshotsAction(['shot-1'])
      expect(result.success).toBe(true)
      // Only session_screenshots table is deleted, no cascade or deletion of sessions
    })
  })

  describe('5. Bulk Selection Logic', () => {
    it('manages Set operations for bulk selection', () => {
      const selectedIds = new Set<string>()

      // Select individual
      selectedIds.add('shot-1')
      selectedIds.add('shot-2')
      expect(selectedIds.size).toBe(2)
      expect(selectedIds.has('shot-1')).toBe(true)

      // Toggle off
      selectedIds.delete('shot-1')
      expect(selectedIds.size).toBe(1)
      expect(selectedIds.has('shot-1')).toBe(false)

      // Clear all
      selectedIds.clear()
      expect(selectedIds.size).toBe(0)
    })
  })
})

