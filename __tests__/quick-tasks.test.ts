import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getQuickTasksAction,
  createQuickTasksAction,
  markQuickTaskCompleteAction,
  updateQuickTaskAction,
  deleteQuickTaskAction,
  cancelQuickTaskAction,
  getQuickTasksBadgeCountAction,
  markQuickTasksSeenAction,
  getAssignableUsersAction,
} from '@/lib/actions/quick-tasks'
import { getUserNotificationsAction } from '@/actions/notifications.actions'
import { hasRouteAccess, ROLE_ROUTE_MAP } from '@/config/rbac'
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
    { id: 'admin-uuid-001', first_name: 'Admin', last_name: 'User', role: 'Admin', is_active: true, deactivated_at: null as string | null },
    { id: 'hr-uuid-002', first_name: 'HR', last_name: 'User', role: 'HR', is_active: true, deactivated_at: null as string | null },
    { id: 'emp-uuid-003', first_name: 'Suraj', last_name: 'Mane', role: 'Employee', is_active: true, deactivated_at: null as string | null },
    { id: 'emp-uuid-004', first_name: 'Prince', last_name: 'Nandagawali', role: 'Employee', is_active: true, deactivated_at: null as string | null },
  ],
}))

function createChainableMock(table?: string): any {
  const p = Promise.resolve({
    data: null,
    error: { code: 'PGRST205', message: 'Table missing' },
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

// Mock Supabase createClient and createAdminClient to simulate schema cache fallback PGRST205
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

const STORE_PATH = path.join(process.cwd(), 'scratch', 'quick_tasks_test_store.json')
process.env.QUICK_TASKS_STORE_PATH = STORE_PATH

describe('Quick Tasks (Personal & Casual Task Assignment)', () => {
  const adminUser = {
    id: 'admin-uuid-001',
    email: 'admin@triples.com',
    role: 'Admin' as const,
    employee_id: null,
    employee_name: 'Admin User',
  }

  const hrUser = {
    id: 'hr-uuid-002',
    email: 'hr@triples.com',
    role: 'HR' as const,
    employee_id: 'EMP-006',
    employee_name: 'HR User',
  }

  const employeeA = {
    id: 'emp-uuid-003',
    email: 'suraj@triples.com',
    role: 'Employee' as const,
    employee_id: 'EMP-005',
    employee_name: 'Suraj Mane',
  }

  const employeeB = {
    id: 'emp-uuid-004',
    email: 'prince@triples.com',
    role: 'Employee' as const,
    employee_id: 'EMP-001',
    employee_name: 'Prince Nandagawali',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockProfiles.forEach((p) => {
      p.is_active = true
      p.deactivated_at = null
    })
    mockCurrentUser.mockResolvedValue(adminUser)
    // Clean test store
    if (fs.existsSync(STORE_PATH)) {
      fs.unlinkSync(STORE_PATH)
    }
  })

  it('1. Rejects unauthenticated access to quick tasks', async () => {
    mockCurrentUser.mockResolvedValue(null)
    const res = await getQuickTasksAction()
    expect(res.success).toBe(false)
    expect(res.error).toContain('Authentication required')
  })

  it('2. Admin can create and assign a Quick Task to single or multiple recipients', async () => {
    mockCurrentUser.mockResolvedValue(adminUser)

    const createRes = await createQuickTasksAction({
      description: 'Check clauses 4 and 5 for client contract',
      assigned_to: [employeeA.id, employeeB.id],
    })

    expect(createRes.success).toBe(true)
    expect(createRes.data).toBeDefined()
    expect(createRes.data?.length).toBe(2)

    const tasks = createRes.data!
    expect(tasks[0].description).toBe('Check clauses 4 and 5 for client contract')
    expect(tasks[0].status).toBe('Pending')
    expect(tasks[0].is_personal).toBe(false)
    expect(tasks[0].is_read).toBe(false) // Unread assignment for recipient
    expect(tasks.map((t) => t.assigned_to)).toEqual(
      expect.arrayContaining([employeeA.id, employeeB.id])
    )
  })

  it('3. HR cannot assign tasks to other people without Admin permission', async () => {
    mockCurrentUser.mockResolvedValue(hrUser)

    const createRes = await createQuickTasksAction({
      description: 'HR Attempt to assign task',
      assigned_to: [employeeA.id],
    })

    expect(createRes.success).toBe(false)
    expect(createRes.error).toContain('Only Admin can')
  })

  it('4. Employee cannot assign tasks to other people', async () => {
    mockCurrentUser.mockResolvedValue(employeeA)

    const createRes = await createQuickTasksAction({
      description: 'Employee Attempt to assign task',
      assigned_to: [employeeB.id],
    })

    expect(createRes.success).toBe(false)
    expect(createRes.error).toContain('Only Admin can')
  })

  it('5. Admin, HR, and Employees can all create their own personal quick tasks', async () => {
    // 1. Admin creates personal task
    mockCurrentUser.mockResolvedValue(adminUser)
    const adminPersonal = await createQuickTasksAction({
      description: 'Admin personal to-do: review monthly budget',
      assigned_to: [],
    })
    expect(adminPersonal.success).toBe(true)
    expect(adminPersonal.data![0].is_personal).toBe(true)
    expect(adminPersonal.data![0].assigned_to).toBe(adminUser.id)

    // 2. HR creates personal task
    mockCurrentUser.mockResolvedValue(hrUser)
    const hrPersonal = await createQuickTasksAction({
      description: 'HR personal notes: update employee handbook checklist',
    })
    expect(hrPersonal.success).toBe(true)
    expect(hrPersonal.data![0].is_personal).toBe(true)
    expect(hrPersonal.data![0].assigned_to).toBe(hrUser.id)

    // 3. Employee creates personal task
    mockCurrentUser.mockResolvedValue(employeeA)
    const empPersonal = await createQuickTasksAction({
      description: 'Suraj personal task: prepare demo slides',
    })
    expect(empPersonal.success).toBe(true)
    expect(empPersonal.data![0].is_personal).toBe(true)
    expect(empPersonal.data![0].assigned_to).toBe(employeeA.id)
  })

  it('6. Personal tasks are private to their owner and hidden from other users, including Admin', async () => {
    // Employee A creates a personal task
    mockCurrentUser.mockResolvedValue(employeeA)
    const empTaskRes = await createQuickTasksAction({
      description: 'Suraj strictly confidential personal reminder',
    })
    expect(empTaskRes.success).toBe(true)
    const empTaskId = empTaskRes.data![0].id

    // Employee A sees their personal task
    const resA = await getQuickTasksAction()
    expect(resA.data?.some((t) => t.id === empTaskId)).toBe(true)

    // Employee B CANNOT see Employee A's personal task
    mockCurrentUser.mockResolvedValue(employeeB)
    const resB = await getQuickTasksAction()
    expect(resB.data?.some((t) => t.id === empTaskId)).toBe(false)

    // Admin CANNOT see Employee A's personal task
    mockCurrentUser.mockResolvedValue(adminUser)
    const resAdmin = await getQuickTasksAction({ status: 'All' })
    expect(resAdmin.data?.some((t) => t.id === empTaskId)).toBe(false)
  })

  it('7. Owner can edit description and mark their personal task as Completed', async () => {
    mockCurrentUser.mockResolvedValue(employeeA)
    const created = await createQuickTasksAction({
      description: 'Original personal description',
    })
    const taskId = created.data![0].id

    // Edit description
    const editRes = await updateQuickTaskAction(taskId, {
      description: 'Updated personal task description with details',
    })
    expect(editRes.success).toBe(true)
    expect(editRes.data?.description).toBe('Updated personal task description with details')

    // Mark Completed
    const completeRes = await markQuickTaskCompleteAction(taskId, true)
    expect(completeRes.success).toBe(true)
    expect(completeRes.data?.status).toBe('Completed')
    expect(completeRes.data?.completed_by).toBe(employeeA.id)
    expect(completeRes.data?.completed_at).toBeDefined()
  })

  it('8. Owner can delete their personal task, but non-owners cannot', async () => {
    mockCurrentUser.mockResolvedValue(employeeA)
    const created = await createQuickTasksAction({
      description: 'Task to be deleted by owner',
    })
    const taskId = created.data![0].id

    // Employee B tries to delete Employee A's task -> Rejected
    mockCurrentUser.mockResolvedValue(employeeB)
    const deleteByB = await deleteQuickTaskAction(taskId)
    expect(deleteByB.success).toBe(false)
    expect(deleteByB.error).toContain('Unauthorized')

    // Admin tries to delete Employee A's personal task -> Rejected (private personal task)
    mockCurrentUser.mockResolvedValue(adminUser)
    const deleteByAdmin = await deleteQuickTaskAction(taskId)
    expect(deleteByAdmin.success).toBe(false)
    expect(deleteByAdmin.error).toContain('Unauthorized')

    // Owner (Employee A) deletes it -> Success
    mockCurrentUser.mockResolvedValue(employeeA)
    const deleteByOwner = await deleteQuickTaskAction(taskId)
    expect(deleteByOwner.success).toBe(true)

    // Verify it is gone
    const reloaded = await getQuickTasksAction()
    expect(reloaded.data?.some((t) => t.id === taskId)).toBe(false)
  })

  it('9. Assigned task flow: Admin assigns to Employee, Employee completes it, Admin can delete it', async () => {
    // Admin assigns to employeeA
    mockCurrentUser.mockResolvedValue(adminUser)
    const assignedRes = await createQuickTasksAction({
      description: 'Prepare Q3 Financial Deck',
      assigned_to: [employeeA.id],
    })
    expect(assignedRes.success).toBe(true)
    const taskId = assignedRes.data![0].id
    expect(assignedRes.data![0].is_personal).toBe(false)

    // Both Admin and Employee A see it
    mockCurrentUser.mockResolvedValue(employeeA)
    const empList = await getQuickTasksAction()
    expect(empList.data?.some((t) => t.id === taskId)).toBe(true)

    mockCurrentUser.mockResolvedValue(adminUser)
    const adminList = await getQuickTasksAction()
    expect(adminList.data?.some((t) => t.id === taskId)).toBe(true)

    // Employee A marks complete
    mockCurrentUser.mockResolvedValue(employeeA)
    const completeRes = await markQuickTaskCompleteAction(taskId, true)
    expect(completeRes.success).toBe(true)
    expect(completeRes.data?.status).toBe('Completed')

    // Admin deletes assigned task
    mockCurrentUser.mockResolvedValue(adminUser)
    const adminDelete = await deleteQuickTaskAction(taskId)
    expect(adminDelete.success).toBe(true)
  })

  it('10. Tab filters and counts (Pending, Completed, All) work accurately', async () => {
    mockCurrentUser.mockResolvedValue(employeeA)

    // Create 2 personal tasks: 1 pending, 1 completed
    const t1 = await createQuickTasksAction({ description: 'Emp A Task 1' })
    const t2 = await createQuickTasksAction({ description: 'Emp A Task 2' })

    await markQuickTaskCompleteAction(t2.data![0].id, true)

    // Pending filter
    const pendingList = await getQuickTasksAction({ status: 'Pending' })
    expect(pendingList.data?.length).toBe(1)
    expect(pendingList.data![0].id).toBe(t1.data![0].id)

    // Completed filter
    const completedList = await getQuickTasksAction({ status: 'Completed' })
    expect(completedList.data?.length).toBe(1)
    expect(completedList.data![0].id).toBe(t2.data![0].id)

    // All filter
    const allList = await getQuickTasksAction({ status: 'All' })
    expect(allList.data?.length).toBe(2)

    // Badge count
    const badge = await getQuickTasksBadgeCountAction()
    expect(badge.pendingCount).toBe(1)
  })

  it('11. Unread task notification dot: Appears on Quick Tasks icon ONLY for recipient (NOT on bell), clears after viewing, and persists independently across recipients', async () => {
    // Admin assigns a task to Employee A
    mockCurrentUser.mockResolvedValue(adminUser)
    const assignRes = await createQuickTasksAction({
      description: 'Urgent compliance review assigned by Admin',
      assigned_to: [employeeA.id],
    })
    expect(assignRes.success).toBe(true)

    // 1. Employee A has unread assignment -> RED DOT VISIBLE on Quick Tasks icon
    mockCurrentUser.mockResolvedValue(employeeA)
    const empABadge = await getQuickTasksBadgeCountAction()
    expect(empABadge.hasUnreadAssignment).toBe(true)
    expect(empABadge.unreadAssignmentCount).toBe(1)

    // CRITICAL: Bell notification icon does NOT show this indicator or count
    const empANotifs = await getUserNotificationsAction()
    expect(empANotifs.unreadCount).toBe(0)
    expect(empANotifs.notifications.some((n) => (n as any).type === 'quick_task')).toBe(false)

    // 2. Employee B was not assigned this task -> NO RED DOT on Quick Tasks icon, and Bell is 0
    mockCurrentUser.mockResolvedValue(employeeB)
    const empBBadge = await getQuickTasksBadgeCountAction()
    expect(empBBadge.hasUnreadAssignment).toBe(false)
    expect(empBBadge.unreadAssignmentCount).toBe(0)

    const empBNotifs = await getUserNotificationsAction()
    expect(empBNotifs.unreadCount).toBe(0)

    // 3. Admin assigned the task (not recipient) -> NO RED DOT on Quick Tasks icon
    mockCurrentUser.mockResolvedValue(adminUser)
    const adminBadge = await getQuickTasksBadgeCountAction()
    expect(adminBadge.hasUnreadAssignment).toBe(false)

    // 4. Personal task created by Employee A does not create an unread notification dot
    mockCurrentUser.mockResolvedValue(employeeA)
    await createQuickTasksAction({
      description: 'Suraj own personal task reminder',
    })
    // Unread assigned tasks is still 1 (not 2)
    const empABadgeAfterPersonal = await getQuickTasksBadgeCountAction()
    expect(empABadgeAfterPersonal.unreadAssignmentCount).toBe(1)

    // 5. Admin assigns a separate casual task to Employee B
    mockCurrentUser.mockResolvedValue(adminUser)
    await createQuickTasksAction({
      description: 'Review security audit logs',
      assigned_to: [employeeB.id],
    })

    // Both Employee A and Employee B now have unread assignments
    mockCurrentUser.mockResolvedValue(employeeA)
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(true)

    mockCurrentUser.mockResolvedValue(employeeB)
    expect((await getQuickTasksBadgeCountAction()).hasUnreadAssignment).toBe(true)

    // 6. Employee A opens Quick Tasks popover (marks tasks as seen)
    mockCurrentUser.mockResolvedValue(employeeA)
    const markSeenRes = await markQuickTasksSeenAction()
    expect(markSeenRes.success).toBe(true)

    // 7. Dot disappears immediately for Employee A
    const empABadgeAfterSeen = await getQuickTasksBadgeCountAction()
    expect(empABadgeAfterSeen.hasUnreadAssignment).toBe(false)
    expect(empABadgeAfterSeen.unreadAssignmentCount).toBe(0)

    // 8. Dot remains visible for other recipient (Employee B) who has not viewed yet
    mockCurrentUser.mockResolvedValue(employeeB)
    const empBBadgeStillUnread = await getQuickTasksBadgeCountAction()
    expect(empBBadgeStillUnread.hasUnreadAssignment).toBe(true)
    expect(empBBadgeStillUnread.unreadAssignmentCount).toBe(1)

    // 9. Employee A's seen state persists across refresh (simulated by re-querying badge action)
    mockCurrentUser.mockResolvedValue(employeeA)
    const refreshedBadge = await getQuickTasksBadgeCountAction()
    expect(refreshedBadge.hasUnreadAssignment).toBe(false)
    expect(refreshedBadge.unreadAssignmentCount).toBe(0)

    // 10. Bell icon remains completely unaffected for both users
    const empANotifsFinal = await getUserNotificationsAction()
    expect(empANotifsFinal.unreadCount).toBe(0)

    mockCurrentUser.mockResolvedValue(employeeB)
    const empBNotifsFinal = await getUserNotificationsAction()
    expect(empBNotifsFinal.unreadCount).toBe(0)
  })

  it('12. RBAC configuration allows /quick-tasks route for all roles', () => {
    expect(ROLE_ROUTE_MAP.Admin).toContain('/quick-tasks')
    expect(ROLE_ROUTE_MAP.HR).toContain('/quick-tasks')
    expect(ROLE_ROUTE_MAP.Employee).toContain('/quick-tasks')
    expect(ROLE_ROUTE_MAP.Manager).toContain('/quick-tasks')

    expect(hasRouteAccess('Admin', '/quick-tasks')).toBe(true)
    expect(hasRouteAccess('HR', '/quick-tasks')).toBe(true)
    expect(hasRouteAccess('Employee', '/quick-tasks')).toBe(true)
    expect(hasRouteAccess('Manager', '/quick-tasks')).toBe(true)
  })

  it('13. Rejects assigning Quick Task to deactivated employee', async () => {
    mockCurrentUser.mockResolvedValue(adminUser)

    // Deactivate employeeA
    const profileA = mockProfiles.find((p) => p.id === employeeA.id)
    if (profileA) {
      profileA.is_active = false
      profileA.deactivated_at = new Date().toISOString()
    }

    const res = await createQuickTasksAction({
      description: 'Attempt assignment to deactivated user',
      assigned_to: [employeeA.id],
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Cannot assign Quick Task to inactive or deactivated user(s)')
    expect(res.error).toContain('Suraj Mane')
  })
})
