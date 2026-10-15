import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getQuickTasksAction,
  createQuickTasksAction,
  markQuickTaskCompleteAction,
  updateQuickTaskAction,
  cancelQuickTaskAction,
  getQuickTasksBadgeCountAction,
  getAssignableUsersAction,
} from '@/lib/actions/quick-tasks'
import { hasRouteAccess, ROLE_ROUTE_MAP } from '@/config/rbac'
import fs from 'fs'
import path from 'path'

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

// Mock Supabase createClient to simulate schema cache fallback PGRST205
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: (table: string) => ({
      select: () => {
        const makePromiseChain = () => {
          const p = Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' }, count: null }) as any
          p.eq = () => makePromiseChain()
          p.order = () => makePromiseChain()
          p.limit = () => makePromiseChain()
          p.in = () => Promise.resolve({ data: [], error: null })
          return p
        }
        return makePromiseChain()
      },
      insert: () => ({
        select: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }),
      }),
      update: () => ({
        eq: () => {
          const chain = Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }) as any
          chain.select = () => ({
            single: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }),
          })
          chain.eq = () => {
            const inner = Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }) as any
            inner.select = () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }),
            })
            return inner
          }
          return chain
        },
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: { code: 'PGRST205', message: 'Table missing' } }),
      }),
    })
  }))
}))

const STORE_PATH = path.join(process.cwd(), 'scratch', 'quick_tasks_store.json')

describe('Quick Tasks (Casual Task Assignment)', () => {
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
      title: 'Review Client Contract',
      description: 'Check clauses 4 and 5',
      assigned_to: [employeeA.id, employeeB.id],
      priority: 'High',
      due_date: '2026-10-20',
    })

    expect(createRes.success).toBe(true)
    expect(createRes.data).toBeDefined()
    expect(createRes.data?.length).toBe(2)

    const tasks = createRes.data!
    expect(tasks[0].title).toBe('Review Client Contract')
    expect(tasks[0].priority).toBe('High')
    expect(tasks[0].status).toBe('Pending')
    expect(tasks.map((t) => t.assigned_to)).toEqual(
      expect.arrayContaining([employeeA.id, employeeB.id])
    )
  })

  it('3. HR cannot assign tasks to others without permission', async () => {
    mockCurrentUser.mockResolvedValue(hrUser)

    const createRes = await createQuickTasksAction({
      title: 'HR Attempt Task',
      assigned_to: [employeeA.id],
      priority: 'Medium',
    })

    expect(createRes.success).toBe(false)
    expect(createRes.error).toContain('Only Admin can create and assign casual tasks')
  })

  it('4. Employee cannot assign tasks to others', async () => {
    mockCurrentUser.mockResolvedValue(employeeA)

    const createRes = await createQuickTasksAction({
      title: 'Employee Attempt Task',
      assigned_to: [employeeB.id],
    })

    expect(createRes.success).toBe(false)
    expect(createRes.error).toContain('Only Admin can create and assign casual tasks')
  })

  it('5. The correct employee sees their task, while other employees cannot see it', async () => {
    // Admin creates task for employeeA
    mockCurrentUser.mockResolvedValue(adminUser)
    const created = await createQuickTasksAction({
      title: 'Private task for Employee A',
      assigned_to: [employeeA.id],
      priority: 'Medium',
    })
    expect(created.success).toBe(true)

    // Employee A views tasks
    mockCurrentUser.mockResolvedValue(employeeA)
    const resA = await getQuickTasksAction()
    expect(resA.success).toBe(true)
    expect(resA.data?.some((t) => t.title === 'Private task for Employee A')).toBe(true)

    // Employee B views tasks
    mockCurrentUser.mockResolvedValue(employeeB)
    const resB = await getQuickTasksAction()
    expect(resB.success).toBe(true)
    expect(resB.data?.some((t) => t.title === 'Private task for Employee A')).toBe(false)
  })

  it('6. HR cannot see unrelated employees private tasks', async () => {
    // Admin creates task for employeeA
    mockCurrentUser.mockResolvedValue(adminUser)
    await createQuickTasksAction({
      title: 'Confidential Task for Employee A',
      assigned_to: [employeeA.id],
    })

    // HR views tasks
    mockCurrentUser.mockResolvedValue(hrUser)
    const hrTasks = await getQuickTasksAction()
    expect(hrTasks.success).toBe(true)
    expect(hrTasks.data?.some((t) => t.title === 'Confidential Task for Employee A')).toBe(false)
  })

  it('7. Employee marks their assigned task Completed, updating status and timestamp', async () => {
    // Admin creates task for employeeA
    mockCurrentUser.mockResolvedValue(adminUser)
    const created = await createQuickTasksAction({
      title: 'Employee A Deliverable',
      assigned_to: [employeeA.id],
    })
    const taskId = created.data![0].id

    // Employee A marks it complete
    mockCurrentUser.mockResolvedValue(employeeA)
    const markRes = await markQuickTaskCompleteAction(taskId, true)
    expect(markRes.success).toBe(true)
    expect(markRes.data?.status).toBe('Completed')
    expect(markRes.data?.completed_at).toBeDefined()
    expect(markRes.data?.completed_by).toBe(employeeA.id)

    // Verify persistence after reload
    const reloaded = await getQuickTasksAction()
    const task = reloaded.data?.find((t) => t.id === taskId)
    expect(task?.status).toBe('Completed')
    expect(task?.completed_by).toBe(employeeA.id)
  })

  it('8. Employee cannot mark tasks assigned to someone else as Completed', async () => {
    // Admin creates task for employeeA
    mockCurrentUser.mockResolvedValue(adminUser)
    const created = await createQuickTasksAction({
      title: 'Employee A Private Deliverable',
      assigned_to: [employeeA.id],
    })
    const taskId = created.data![0].id

    // Employee B attempts to mark it complete
    mockCurrentUser.mockResolvedValue(employeeB)
    const markRes = await markQuickTaskCompleteAction(taskId, true)
    expect(markRes.success).toBe(false)
    expect(markRes.error).toContain('Unauthorized: You can only complete tasks assigned to you')
  })

  it('9. HR marks their own assigned task Completed', async () => {
    // Admin creates task for HR
    mockCurrentUser.mockResolvedValue(adminUser)
    const created = await createQuickTasksAction({
      title: 'HR Policy Documentation',
      assigned_to: [hrUser.id],
    })
    const taskId = created.data![0].id

    // HR marks it complete
    mockCurrentUser.mockResolvedValue(hrUser)
    const markRes = await markQuickTaskCompleteAction(taskId, true)
    expect(markRes.success).toBe(true)
    expect(markRes.data?.status).toBe('Completed')
    expect(markRes.data?.completed_by).toBe(hrUser.id)
  })

  it('10. Admin can view all tasks and filter by status and assignee', async () => {
    mockCurrentUser.mockResolvedValue(adminUser)

    // Create 1 for employeeA, 1 for employeeB, 1 for hrUser
    await createQuickTasksAction({
      title: 'Task for Emp A',
      assigned_to: [employeeA.id],
    })
    await createQuickTasksAction({
      title: 'Task for Emp B',
      assigned_to: [employeeB.id],
    })
    await createQuickTasksAction({
      title: 'Task for HR',
      assigned_to: [hrUser.id],
    })

    // Admin views all
    const allRes = await getQuickTasksAction({ status: 'All' })
    expect(allRes.success).toBe(true)
    expect(allRes.data?.length).toBeGreaterThanOrEqual(3)

    // Admin filters by assignee: employeeA
    const empARes = await getQuickTasksAction({ assigneeId: employeeA.id })
    expect(empARes.success).toBe(true)
    expect(empARes.data?.every((t) => t.assigned_to === employeeA.id)).toBe(true)

    // Admin edits task
    const taskToEdit = empARes.data![0]
    const editRes = await updateQuickTaskAction(taskToEdit.id, {
      title: 'Updated Title by Admin',
      priority: 'High',
    })
    expect(editRes.success).toBe(true)
    expect(editRes.data?.title).toBe('Updated Title by Admin')
    expect(editRes.data?.priority).toBe('High')

    // Admin cancels task
    const cancelRes = await cancelQuickTaskAction(taskToEdit.id)
    expect(cancelRes.success).toBe(true)
    expect(cancelRes.data?.status).toBe('Cancelled')
  })

  it('11. Pending badge count updates accurately for users', async () => {
    mockCurrentUser.mockResolvedValue(adminUser)
    await createQuickTasksAction({
      title: 'Task 1 for Emp A',
      assigned_to: [employeeA.id],
    })
    await createQuickTasksAction({
      title: 'Task 2 for Emp A',
      assigned_to: [employeeA.id],
    })

    // Check Employee A badge count
    mockCurrentUser.mockResolvedValue(employeeA)
    const countA = await getQuickTasksBadgeCountAction()
    expect(countA.pendingCount).toBe(2)

    // Check Employee B badge count
    mockCurrentUser.mockResolvedValue(employeeB)
    const countB = await getQuickTasksBadgeCountAction()
    expect(countB.pendingCount).toBe(0)
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
})
