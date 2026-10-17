import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  getUserNotificationsAction,
  clearUserNotificationsAction,
  markAllNotificationsAsReadAction,
  invalidateNotificationCache,
  type ERPNotificationItem,
} from '@/actions/notifications.actions'

// Mock getCurrentUser from @/lib/auth
let mockUser: any = null
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => Promise.resolve(mockUser),
  requireAuth: () => {
    if (!mockUser) throw new Error('Authentication required')
    return Promise.resolve(mockUser)
  },
}))

// Mock cookies from next/headers
const mockCookiesStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (key: string) => {
        const val = mockCookiesStore.get(key)
        return val !== undefined ? { value: val } : undefined
      },
      set: (key: string, value: string) => {
        mockCookiesStore.set(key, value)
      },
    }),
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Shared Source Data (Announcements, Company Rules, Holidays)
const initialRules = [
  {
    id: 'rule-uuid-001',
    title: 'Code of Conduct',
    category: 'Work Policy',
    description: 'Updated guidelines on remote conduct.',
    version: '1.0',
    status: 'Published',
    created_by: 'admin-uuid-001',
    published_at: '2026-10-10T10:00:00.000Z',
    created_at: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'rule-uuid-002',
    title: 'Data Security Policy',
    category: 'Security & IT',
    description: 'Guidelines on laptop encryption.',
    version: '1.0',
    status: 'Published',
    created_by: 'admin-uuid-001',
    published_at: '2026-10-12T10:00:00.000Z',
    created_at: '2026-10-12T10:00:00.000Z',
  },
]

const initialHolidays = [
  {
    id: 'hol-uuid-001',
    name: 'Diwali',
    date: '2026-11-18',
    is_optional: false,
    holiday_type: 'PAID',
    created_by: 'admin-uuid-001',
    created_at: '2026-09-29T05:53:47.000Z',
  },
  {
    id: 'hol-uuid-002',
    name: 'Christmas',
    date: '2026-12-25',
    is_optional: false,
    holiday_type: 'PAID',
    created_by: 'admin-uuid-001',
    created_at: '2026-09-29T06:14:41.000Z',
  },
]

let sharedAnnouncements = [
  {
    id: 'ann-uuid-001',
    title: 'Company Townhall Meeting',
    message: 'Join us on Friday for our quarterly review.',
    target_audience: 'all',
    target_department: null,
    priority: 'high',
    status: 'published',
    created_by: 'admin-uuid-001',
    created_at: '2026-10-13T09:00:00.000Z',
    published_at: '2026-10-13T09:00:00.000Z',
    created_by_profile: { first_name: 'Admin', last_name: 'User' },
    announcement_reads: [] as { user_id: string; read_at: string }[],
  },
]

// Mock user_notification_clears DB table
let mockDbNotificationClears: Record<string, { cleared_at: string; cleared_ids: string[]; updated_at: string }> = {}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => {
      if (table === 'company_rules') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: initialRules, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'holidays') {
        return {
          select: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: initialHolidays, error: null }),
            }),
          }),
        }
      }

      if (table === 'announcements') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: sharedAnnouncements, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'employee_rule_acknowledgements') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }

      if (table === 'announcement_reads') {
        return {
          upsert: (items: any[]) => {
            const list = Array.isArray(items) ? items : [items]
            list.forEach((item) => {
              const ann = sharedAnnouncements.find((a) => a.id === item.announcement_id)
              if (ann) {
                if (!ann.announcement_reads.some((r) => r.user_id === item.user_id)) {
                  ann.announcement_reads.push({ user_id: item.user_id, read_at: item.read_at })
                }
              }
            })
            return Promise.resolve({ data: null, error: null })
          },
        }
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { id: 'admin-uuid-001', employee_id: 'EMP-001', first_name: 'Admin', last_name: 'User' },
                ],
                error: null,
              }),
          }),
        }
      }

      if (table === 'user_notification_clears') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: () => {
                const rec = mockDbNotificationClears[val]
                return Promise.resolve({ data: rec || null, error: null })
              },
            }),
          }),
          upsert: (record: any) => {
            mockDbNotificationClears[record.user_id] = {
              cleared_at: record.cleared_at,
              cleared_ids: record.cleared_ids,
              updated_at: record.updated_at,
            }
            return Promise.resolve({ data: null, error: null })
          },
        }
      }

      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }
    },
  })),
}))

const STORE_PATH = path.join(process.cwd(), 'scratch', 'notification_clears_store.json')

describe('TripleS ERP — Per-User Notification Clearing & Feed Isolation', () => {
  const employeeA = {
    id: 'emp-aaa-1111',
    email: 'employeeA@triples.com',
    role: 'Employee' as const,
    employee_id: 'EMP-101',
    department: 'Engineering',
  }

  const employeeB = {
    id: 'emp-bbb-2222',
    email: 'employeeB@triples.com',
    role: 'Employee' as const,
    employee_id: 'EMP-102',
    department: 'Marketing',
  }

  const hrUser = {
    id: 'hr-hhh-3333',
    email: 'hr@triples.com',
    role: 'HR' as const,
    employee_id: 'EMP-050',
    department: 'Human Resources',
  }

  beforeEach(() => {
    mockCookiesStore.clear()
    mockDbNotificationClears = {}
    invalidateNotificationCache()
    if (fs.existsSync(STORE_PATH)) {
      try {
        fs.unlinkSync(STORE_PATH)
      } catch {}
    }
  })

  afterEach(() => {
    mockUser = null
    invalidateNotificationCache()
    if (fs.existsSync(STORE_PATH)) {
      try {
        fs.unlinkSync(STORE_PATH)
      } catch {}
    }
  })

  it('1. Both Employee A and Employee B initially see all shared notifications', async () => {
    // Check Employee A
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)
    const resA = await getUserNotificationsAction()

    expect(resA.notifications.length).toBe(5) // 2 rules + 2 holidays + 1 announcement
    expect(resA.unreadCount).toBe(5)

    // Check Employee B
    mockUser = employeeB
    invalidateNotificationCache(employeeB.id)
    const resB = await getUserNotificationsAction()

    expect(resB.notifications.length).toBe(5)
    expect(resB.unreadCount).toBe(5)
  })

  it('2. Employee A clears notifications — only Employee A notifications are cleared', async () => {
    // Employee A clears notifications
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)
    const clearRes = await clearUserNotificationsAction()
    expect(clearRes.success).toBe(true)

    // Employee A notifications should now be 0
    const resA = await getUserNotificationsAction()
    expect(resA.notifications.length).toBe(0)
    expect(resA.unreadCount).toBe(0)

    // Employee B notifications must remain COMPLETELY UNCHANGED
    mockUser = employeeB
    invalidateNotificationCache(employeeB.id)
    const resB = await getUserNotificationsAction()

    expect(resB.notifications.length).toBe(5)
    expect(resB.unreadCount).toBe(5)

    // HR notifications must also remain unchanged
    mockUser = hrUser
    invalidateNotificationCache(hrUser.id)
    const resHR = await getUserNotificationsAction()

    expect(resHR.notifications.length).toBe(5)
    expect(resHR.unreadCount).toBe(5)
  })

  it('3. Employee A list and badge stay cleared after cache invalidation and page refresh simulation', async () => {
    // Employee A clears notifications
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)
    await clearUserNotificationsAction()

    // Invalidate in-memory cache to simulate subsequent request / page reload
    invalidateNotificationCache(employeeA.id)
    const reloadedRes = await getUserNotificationsAction()

    expect(reloadedRes.notifications.length).toBe(0)
    expect(reloadedRes.unreadCount).toBe(0)
  })

  it('4. Underlying shared announcements, policies, and holidays are NOT deleted', async () => {
    // Employee A clears notifications
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)
    await clearUserNotificationsAction()

    // Shared arrays are unchanged
    expect(initialRules.length).toBe(2)
    expect(initialHolidays.length).toBe(2)
    expect(sharedAnnouncements.length).toBe(1)
    expect(sharedAnnouncements[0].status).toBe('published')
  })

  it('5. New notifications created after clearing arrive normally for Employee A', async () => {
    // Employee A clears notifications at T0
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)
    await clearUserNotificationsAction()

    let resA = await getUserNotificationsAction()
    expect(resA.notifications.length).toBe(0)

    // At T1 (future timestamp), a new announcement is published
    const futureTime = new Date(Date.now() + 60000).toISOString()
    const newAnnouncement = {
      id: 'ann-uuid-002-new',
      title: 'Emergency Server Maintenance',
      message: 'Maintenance scheduled tonight at 11 PM.',
      target_audience: 'all',
      target_department: null,
      priority: 'high',
      status: 'published',
      created_by: 'admin-uuid-001',
      created_at: futureTime,
      published_at: futureTime,
      created_by_profile: { first_name: 'Admin', last_name: 'User' },
      announcement_reads: [],
    }
    sharedAnnouncements.push(newAnnouncement)

    // Employee A now sees ONLY the new notification
    invalidateNotificationCache(employeeA.id)
    resA = await getUserNotificationsAction()

    expect(resA.notifications.length).toBe(1)
    expect(resA.notifications[0].title).toBe('Emergency Server Maintenance')
    expect(resA.unreadCount).toBe(1)

    // Employee B sees all 6 notifications (5 old + 1 new)
    mockUser = employeeB
    invalidateNotificationCache(employeeB.id)
    const resB = await getUserNotificationsAction()

    expect(resB.notifications.length).toBe(6)
    expect(resB.unreadCount).toBe(6)

    // Clean up added announcement
    sharedAnnouncements.pop()
  })

  it('6. Mark all read action continues to work independently without clearing items', async () => {
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)

    // First fetch items
    const beforeRead = await getUserNotificationsAction()
    expect(beforeRead.notifications.length).toBe(5)
    expect(beforeRead.unreadCount).toBe(5)

    // Mark all as read
    await markAllNotificationsAsReadAction(
      beforeRead.notifications.map((n) => ({
        notifId: n.id,
        rawId: n.rawId,
        type: n.type,
      }))
    )

    // After mark read: items are STILL in the list, but unreadCount is 0 and isRead is true
    invalidateNotificationCache(employeeA.id)
    const afterRead = await getUserNotificationsAction()

    expect(afterRead.notifications.length).toBe(5) // Still in list! Not cleared!
    expect(afterRead.unreadCount).toBe(0)
    expect(afterRead.notifications.every((n) => n.isRead)).toBe(true)
  })

  it('7. Unauthorized request cannot clear notifications', async () => {
    mockUser = null // No authenticated user session
    invalidateNotificationCache()

    const res = await clearUserNotificationsAction()
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Unauthorized/i)
  })

  it('8. Fallback store persistence works when DB table returns error or is unmigrated', async () => {
    // Employee A clears with fallback store
    mockUser = employeeA
    invalidateNotificationCache(employeeA.id)

    // Clear fallback store and DB mock for clean check
    mockDbNotificationClears = {}
    const clearRes = await clearUserNotificationsAction()
    expect(clearRes.success).toBe(true)

    // Check that fallback store file was written
    expect(fs.existsSync(STORE_PATH)).toBe(true)
    const content = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))
    expect(content[employeeA.id]).toBeDefined()
    expect(content[employeeA.id].cleared_at).toBeDefined()
    expect(content[employeeA.id].cleared_ids.length).toBeGreaterThan(0)

    // Even if DB mock is wiped, fallback store provides persistent cleared state
    mockDbNotificationClears = {}
    invalidateNotificationCache(employeeA.id)
    const resA = await getUserNotificationsAction()

    expect(resA.notifications.length).toBe(0)
    expect(resA.unreadCount).toBe(0)
  })
})
