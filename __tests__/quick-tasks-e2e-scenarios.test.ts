import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getQuickTasksAction,
  createQuickTasksAction,
  markQuickTaskCompleteAction,
  getQuickTasksBadgeCountAction,
  markQuickTasksSeenAction,
} from '@/lib/actions/quick-tasks'
import { getUserNotificationsAction } from '@/actions/notifications.actions'
import fs from 'fs'
import path from 'path'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(() =>
    Promise.resolve({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
  headers: vi.fn().mockReturnValue(new Map()),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Mock getCurrentUser from @/lib/auth
const mockCurrentUser = vi.fn()
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockCurrentUser(),
  requireAuth: () => {
    const user = mockCurrentUser()
    if (!user) throw new Error('Authentication required')
    return user
  },
}))

const { mockProfiles } = vi.hoisted(() => ({
  mockProfiles: [
    { id: 'admin-uuid-001', first_name: 'admin', last_name: '', role: 'Admin', is_active: true, deactivated_at: null },
    { id: '3f1a7db7-0ebf-45a7-b5a9-f9a0a393c023', first_name: 'Omkar', last_name: 'Sawant', role: 'Employee', is_active: true, deactivated_at: null },
    { id: 'ee284db8-bc2a-4ca6-b195-917e9dc5781c', first_name: 'Suraj', last_name: 'Mane', role: 'Employee', is_active: true, deactivated_at: null },
  ],
}))

function createChainableMock(table?: string): any {
  const p = Promise.resolve({
    data: null,
    error: { code: 'PGRST205', message: "Could not find the table 'public.quick_tasks' in the schema cache" },
    count: null,
  }) as any

  p.eq = () => createChainableMock(table)
  p.neq = () => createChainableMock(table)
  p.in = (field: string, values: any[]) => {
    if (table === 'profiles') {
      const matched = mockProfiles.filter((p: any) => values.includes(p.id))
      return Promise.resolve({ data: matched, error: null })
    }
    return Promise.resolve({ data: [], error: null })
  }
  p.or = () => createChainableMock(table)
  p.order = () => createChainableMock(table)
  p.limit = () => createChainableMock(table)
  p.select = () => createChainableMock(table)
  p.single = () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } })
  return p
}

vi.mock('@/lib/supabase/server', () => {
  const mockClient = {
    from: (table: string) => ({
      select: () => createChainableMock(table),
      insert: () => createChainableMock(table),
      update: () => createChainableMock(table),
      delete: () => createChainableMock(table),
    }),
  }
  return {
    createClient: vi.fn().mockImplementation(async () => mockClient),
    createAdminClient: vi.fn().mockImplementation(async () => mockClient),
  }
})

const E2E_STORE_PATH = path.join(process.cwd(), 'scratch', 'quick_tasks_e2e_spec_store.json')
process.env.QUICK_TASKS_STORE_PATH = E2E_STORE_PATH

describe('Mandatory End-to-End Scenarios: Quick Tasks Red Dot Notification', () => {
  const admin = {
    id: 'admin-uuid-001',
    email: 'admin@triples.com',
    role: 'Admin' as const,
    employee_id: null,
    employee_name: 'Admin User',
  }

  const employeeA = {
    id: '3f1a7db7-0ebf-45a7-b5a9-f9a0a393c023',
    email: 'omkar.sawant@tsp.com',
    role: 'Employee' as const,
    employee_id: 'EMP-003',
    employee_name: 'Omkar Sawant',
  }

  const employeeB = {
    id: 'ee284db8-bc2a-4ca6-b195-917e9dc5781c',
    email: 'suraj.mane@tsp.com',
    role: 'Employee' as const,
    employee_id: 'EMP-005',
    employee_name: 'Suraj Mane',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    if (fs.existsSync(E2E_STORE_PATH)) {
      fs.unlinkSync(E2E_STORE_PATH)
    }
  })

  it('Scenarios 1-7: Single Assignment, Bell Isolation, Non-recipient Isolation, Clearance & Persistence', async () => {
    // 1. Admin assigns a Quick Task to Employee A
    mockCurrentUser.mockResolvedValue(admin)
    const assignRes = await createQuickTasksAction({
      description: 'Review compliance documents for audit',
      assigned_to: [employeeA.id],
    })
    expect(assignRes.success).toBe(true)
    expect(assignRes.data).toBeDefined()
    expect(assignRes.data?.length).toBe(1)
    expect(assignRes.data![0].assigned_to).toBe(employeeA.id)
    expect(assignRes.data![0].is_read).toBe(false)

    // Admin should NOT have a red dot
    const adminBadge = await getQuickTasksBadgeCountAction()
    expect(adminBadge.hasUnreadAssignment).toBe(false)

    // 2. Employee A logs in / refreshes ERP
    mockCurrentUser.mockResolvedValue(employeeA)

    // 3. Confirm the red dot appears on Employee A's Quick Tasks icon
    const empABadge = await getQuickTasksBadgeCountAction()
    expect(empABadge.hasUnreadAssignment).toBe(true)
    expect(empABadge.unreadAssignmentCount).toBe(1)

    // 4. Confirm it does not appear on the bell icon
    const bellNotifs = await getUserNotificationsAction()
    expect(bellNotifs.unreadCount).toBe(0)
    expect(bellNotifs.notifications.some((n: any) => n.type === 'quick_task')).toBe(false)

    // 5. Employee B must not see the dot for Employee A's assignment
    mockCurrentUser.mockResolvedValue(employeeB)
    const empBBadge = await getQuickTasksBadgeCountAction()
    expect(empBBadge.hasUnreadAssignment).toBe(false)
    expect(empBBadge.unreadAssignmentCount).toBe(0)
    const empBBell = await getUserNotificationsAction()
    expect(empBBell.unreadCount).toBe(0)

    // 6. Employee A opens Quick Tasks and the dot clears
    mockCurrentUser.mockResolvedValue(employeeA)
    const markRes = await markQuickTasksSeenAction()
    expect(markRes.success).toBe(true)
    expect(markRes.data?.markedCount).toBe(1)

    const empABadgeCleared = await getQuickTasksBadgeCountAction()
    expect(empABadgeCleared.hasUnreadAssignment).toBe(false)
    expect(empABadgeCleared.unreadAssignmentCount).toBe(0)

    // 7. Refresh Employee A's page and confirm the cleared state persists
    const empARefreshedBadge = await getQuickTasksBadgeCountAction()
    expect(empARefreshedBadge.hasUnreadAssignment).toBe(false)
    expect(empARefreshedBadge.unreadAssignmentCount).toBe(0)
  })

  it('Scenario 8: Assign another task and confirm the dot appears again', async () => {
    // Start with seen task for Employee A
    mockCurrentUser.mockResolvedValue(admin)
    await createQuickTasksAction({
      description: 'First task',
      assigned_to: [employeeA.id],
    })

    mockCurrentUser.mockResolvedValue(employeeA)
    await markQuickTasksSeenAction()
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(false)

    // Admin assigns another task to Employee A
    mockCurrentUser.mockResolvedValue(admin)
    const secondTask = await createQuickTasksAction({
      description: 'Second urgent task',
      assigned_to: [employeeA.id],
    })
    expect(secondTask.success).toBe(true)

    // Employee A receives dot again
    mockCurrentUser.mockResolvedValue(employeeA)
    const badgeAgain = await getQuickTasksBadgeCountAction()
    expect(badgeAgain.hasUnreadAssignment).toBe(true)
    expect(badgeAgain.unreadAssignmentCount).toBe(1)
  })

  it('Scenario 9: Assign one task to multiple employees and verify independent read states', async () => {
    // Admin assigns single task to both Employee A and Employee B
    mockCurrentUser.mockResolvedValue(admin)
    const multiAssignRes = await createQuickTasksAction({
      description: 'Coordinate joint sprint planning',
      assigned_to: [employeeA.id, employeeB.id],
    })
    expect(multiAssignRes.success).toBe(true)
    expect(multiAssignRes.data?.length).toBe(2)

    // Both recipients have independent unread indicators
    mockCurrentUser.mockResolvedValue(employeeA)
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(true)

    mockCurrentUser.mockResolvedValue(employeeB)
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(true)

    // Employee A views and clears their dot
    mockCurrentUser.mockResolvedValue(employeeA)
    await markQuickTasksSeenAction()
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(false)

    // Employee B must STILL see the red dot!
    mockCurrentUser.mockResolvedValue(employeeB)
    const empBStillUnread = await getQuickTasksBadgeCountAction()
    expect(empBStillUnread.hasUnreadAssignment).toBe(true)
    expect(empBStillUnread.unreadAssignmentCount).toBe(1)

    // Employee B opens and clears their dot
    await markQuickTasksSeenAction()
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(false)

    // Verify both persist cleared
    mockCurrentUser.mockResolvedValue(employeeA)
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(false)
    mockCurrentUser.mockResolvedValue(employeeB)
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(false)
  })

  it('Scenario 10: Personal tasks and project tasks remain unaffected', async () => {
    // 1. Employee A creates personal task
    mockCurrentUser.mockResolvedValue(employeeA)
    const personalA = await createQuickTasksAction({
      description: 'Personal task: submit timesheet',
      assigned_to: [], // Empty assignees = personal task
    })
    expect(personalA.success).toBe(true)
    expect(personalA.data![0].is_personal).toBe(true)
    expect(personalA.data![0].is_read).toBe(true)

    // Employee A must NOT get an unread dot from creating their own personal task
    const badgeA = await getQuickTasksBadgeCountAction()
    expect(badgeA.hasUnreadAssignment).toBe(false)
    expect(badgeA.pendingCount).toBe(1) // Pending count increments, but NOT unread assignment

    // 2. Personal tasks are hidden from others
    mockCurrentUser.mockResolvedValue(employeeB)
    const tasksB = await getQuickTasksAction()
    expect(tasksB.data?.some((t) => t.id === personalA.data![0].id)).toBe(false)

    mockCurrentUser.mockResolvedValue(admin)
    const tasksAdmin = await getQuickTasksAction()
    expect(tasksAdmin.data?.some((t) => t.id === personalA.data![0].id)).toBe(false)

    // 3. Bell icon has zero unread notifications
    const bellA = await getUserNotificationsAction()
    expect(bellA.unreadCount).toBe(0)
  })
})
