import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAssignableEmployees } from '@/lib/actions/team'
import { getAssignableUsersAction, createQuickTasksAction } from '@/lib/actions/quick-tasks'
import { createTaskAction, updateTaskAction } from '@/lib/actions/tasks'
import { createProjectAction, updateProjectAction } from '@/lib/actions/projects'
import { assignHod } from '@/lib/actions/hod'
import { getTopContributorData } from '@/lib/actions/top-contributor'
import { getApprovedWorklogOverview } from '@/lib/actions/worklog'
import { deactivateEmployee, reactivateEmployee } from '@/lib/actions/deactivation'
import { getCurrentUser } from '@/lib/auth'
import { validateActiveEmployees } from '@/lib/services/employee-eligibility'

// In-Memory Test State
let mockCurrentUser: any = null

const mockEmployees: Record<string, any> = {
  'emp-uuid-suraj': {
    id: 'emp-uuid-suraj',
    first_name: 'Suraj',
    last_name: 'Mane',
    email: 'suraj.mane@triples.com',
    employee_id_number: 'EMP-005',
    job_title: 'Full Stack Engineer',
    department: 'Development',
    employment_status: 'Active',
    role: 'Employee',
    is_hod: false,
    auth_user_id: 'auth-user-suraj',
  },
  'emp-uuid-active': {
    id: 'emp-uuid-active',
    first_name: 'Aarav',
    last_name: 'Sharma',
    email: 'aarav.sharma@triples.com',
    employee_id_number: 'EMP-006',
    job_title: 'Frontend Developer',
    department: 'Development',
    employment_status: 'Active',
    role: 'Employee',
    is_hod: false,
    auth_user_id: 'auth-user-aarav',
  },
  'emp-uuid-admin': {
    id: 'emp-uuid-admin',
    first_name: 'Alice',
    last_name: 'Admin',
    email: 'admin@triples.com',
    employee_id_number: 'EMP-001',
    job_title: 'Operations Director',
    department: 'Management',
    employment_status: 'Active',
    role: 'Admin',
    is_hod: false,
    auth_user_id: 'auth-user-admin',
  },
}

let mockProfiles: Record<string, any> = {}
let mockTasks: any[] = []
let mockTaskAssignees: any[] = []
let mockProjects: any[] = []
let mockProjectMembers: any[] = []
let mockQuickTasks: any[] = []
let mockEodReports: any[] = []
let mockDepartmentHodAssignments: any[] = []

// Mock Auth
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => mockCurrentUser),
    guardServerAction: vi.fn(async () => mockCurrentUser),
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: () => '127.0.0.1',
  }),
}))

// Mock Supabase Server Admin Client
vi.mock('@/lib/supabase/server', () => {
  const buildQuery = (tableName: string) => {
    let filters: Array<(row: any) => boolean> = []
    let selectFields: string | null = null
    let updatePayload: any = null
    let insertRows: any[] = []
    let deleteMode = false
    let isSingle = false
    let isMaybeSingle = false

    const chain: any = {
      select: (fields = '*') => {
        selectFields = fields
        return chain
      },
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      gte: (col: string, val: any) => {
        filters.push((r) => r[col] >= val)
        return chain
      },
      lte: (col: string, val: any) => {
        filters.push((r) => r[col] <= val)
        return chain
      },
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val)
        return chain
      },
      neq: (col: string, val: any) => {
        filters.push((r) => r[col] !== val)
        return chain
      },
      not: (col: string, op: string, val: any) => {
        return chain
      },
      in: (col: string, vals: any[]) => {
        filters.push((r) => vals.includes(r[col]))
        return chain
      },
      or: () => chain,
      ilike: () => chain,
      insert: (rows: any | any[]) => {
        insertRows = Array.isArray(rows) ? rows : [rows]
        return chain
      },
      update: (payload: any) => {
        updatePayload = payload
        return chain
      },
      delete: () => {
        deleteMode = true
        return chain
      },
      single: () => {
        isSingle = true
        return chain
      },
      maybeSingle: () => {
        isMaybeSingle = true
        return chain
      },
      then: (resolve: any, reject?: any) => {
        try {
          let source: any[] = []
          if (tableName === 'employee_onboarding') source = Object.values(mockEmployees)
          else if (tableName === 'profiles') source = Object.values(mockProfiles)
          else if (tableName === 'tasks') source = mockTasks
          else if (tableName === 'task_assignees') source = mockTaskAssignees
          else if (tableName === 'projects') source = mockProjects
          else if (tableName === 'project_members') source = mockProjectMembers
          else if (tableName === 'quick_tasks') source = mockQuickTasks
          else if (tableName === 'eod_reports') source = mockEodReports
          else if (tableName === 'department_hod_assignments') source = mockDepartmentHodAssignments
          else source = []

          if (deleteMode) {
            if (tableName === 'task_assignees') {
              mockTaskAssignees = mockTaskAssignees.filter((r) => !filters.every((f) => f(r)))
            } else if (tableName === 'project_members') {
              mockProjectMembers = mockProjectMembers.filter((r) => !filters.every((f) => f(r)))
            }
            return resolve({ data: null, error: null })
          }

          if (updatePayload) {
            let matched = source.filter((r) => filters.every((f) => f(r)))
            matched.forEach((r) => {
              Object.assign(r, updatePayload)
            })
            const ret = isSingle || isMaybeSingle ? (matched[0] || null) : matched
            return resolve({ data: ret, error: null })
          }

          if (insertRows.length > 0) {
            insertRows.forEach((row) => {
              const withId = { id: row.id || `id-${Date.now()}-${Math.random()}`, ...row }
              source.push(withId)
            })
            const ret = isSingle ? insertRows[0] : insertRows
            return resolve({ data: ret, error: null })
          }

          // Select queries
          let results = source.filter((r) => filters.every((f) => f(r)))

          // Handle custom relations for eod_reports (join profile)
          if (tableName === 'eod_reports' && selectFields?.includes('profile:profiles')) {
            results = results.map((e) => ({
              ...e,
              profile: mockProfiles[e.employee_id] || null,
            }))
          }

          if (isSingle) {
            return resolve({ data: results[0] || null, error: results[0] ? null : { message: 'Row not found' } })
          }
          if (isMaybeSingle) {
            return resolve({ data: results[0] || null, error: null })
          }

          return resolve({ data: results, error: null })
        } catch (e) {
          if (reject) reject(e)
          else resolve({ data: null, error: e })
        }
      },
    }
    return chain
  }

  const fakeAdmin = {
    from: (table: string) => buildQuery(table),
    auth: {
      admin: {
        updateUserById: vi.fn(async () => ({ data: {}, error: null })),
        listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })),
      },
      getUser: vi.fn(async () => ({
        data: { user: mockCurrentUser ? { id: mockCurrentUser.id, email: mockCurrentUser.email } : null },
      })),
    },
  }

  return {
    createAdminClient: vi.fn(async () => fakeAdmin),
    createClient: vi.fn(async () => fakeAdmin),
  }
})

describe('Enforce Employee Deactivation Across TripleS ERP', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCurrentUser = {
      id: 'auth-user-admin',
      email: 'admin@triples.com',
      role: 'Admin',
      employee_id: 'EMP-001',
      employee_name: 'Alice Admin',
      is_hod: false,
    }

    // Reset Employees
    mockEmployees['emp-uuid-suraj'] = {
      id: 'emp-uuid-suraj',
      first_name: 'Suraj',
      last_name: 'Mane',
      email: 'suraj.mane@triples.com',
      employee_id_number: 'EMP-005',
      job_title: 'Full Stack Engineer',
      department: 'Development',
      employment_status: 'Active',
      role: 'Employee',
      is_hod: false,
      auth_user_id: 'auth-user-suraj',
      deactivated_at: null,
    }

    mockEmployees['emp-uuid-active'] = {
      id: 'emp-uuid-active',
      first_name: 'Aarav',
      last_name: 'Sharma',
      email: 'aarav.sharma@triples.com',
      employee_id_number: 'EMP-006',
      job_title: 'Frontend Developer',
      department: 'Development',
      employment_status: 'Active',
      role: 'Employee',
      is_hod: false,
      auth_user_id: 'auth-user-aarav',
      deactivated_at: null,
    }

    mockEmployees['emp-uuid-admin'] = {
      id: 'emp-uuid-admin',
      first_name: 'Alice',
      last_name: 'Admin',
      email: 'admin@triples.com',
      employee_id_number: 'EMP-001',
      job_title: 'Operations Director',
      department: 'Management',
      employment_status: 'Active',
      role: 'Admin',
      is_hod: false,
      auth_user_id: 'auth-user-admin',
      deactivated_at: null,
    }

    // Reset Profiles
    mockProfiles = {
      'auth-user-suraj': {
        id: 'auth-user-suraj',
        first_name: 'Suraj',
        last_name: 'Mane',
        employee_id: 'EMP-005',
        role: 'Employee',
        is_active: true,
        deactivated_at: null,
      },
      'auth-user-aarav': {
        id: 'auth-user-aarav',
        first_name: 'Aarav',
        last_name: 'Sharma',
        employee_id: 'EMP-006',
        role: 'Employee',
        is_active: true,
        deactivated_at: null,
      },
      'auth-user-admin': {
        id: 'auth-user-admin',
        first_name: 'Alice',
        last_name: 'Admin',
        employee_id: 'EMP-001',
        role: 'Admin',
        is_active: true,
        deactivated_at: null,
      },
    }

    mockTasks = [
      {
        id: 'task-hist-1',
        task_id_display: 'TSK-001',
        title: 'Historical Task of Suraj',
        status: 'IN_PROGRESS',
        project_id: 'prj-1',
      },
    ]

    mockTaskAssignees = [
      { id: 'ta-1', task_id: 'task-hist-1', user_id: 'auth-user-suraj' },
    ]

    mockProjects = [
      {
        id: 'prj-1',
        project_id_display: 'PRJ-001',
        name: 'Core ERP Project',
        client_id: 'client-1',
        project_manager_id: 'auth-user-admin',
        status: 'IN_PROGRESS',
      },
    ]

    mockProjectMembers = [
      { id: 'pm-1', project_id: 'prj-1', user_id: 'auth-user-admin', role: 'Project Manager' },
      { id: 'pm-2', project_id: 'prj-1', user_id: 'auth-user-suraj', role: 'Member' },
    ]

    mockQuickTasks = []

    mockEodReports = [
      {
        id: 'eod-1',
        employee_id: 'auth-user-suraj',
        office_hours: 8,
        status: 'Approved',
        report_date: '2026-10-10',
      },
      {
        id: 'eod-2',
        employee_id: 'auth-user-aarav',
        office_hours: 6,
        status: 'Approved',
        report_date: '2026-10-10',
      },
    ]
  })

  it('1. validateActiveEmployees correctly detects active and inactive employees', async () => {
    // Both are active initially
    const resActive = await validateActiveEmployees(['auth-user-suraj', 'auth-user-aarav'])
    expect(resActive.allActive).toBe(true)
    expect(resActive.inactiveUserIds).toHaveLength(0)

    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false
    mockProfiles['auth-user-suraj'].deactivated_at = new Date().toISOString()

    const resInactive = await validateActiveEmployees(['auth-user-suraj', 'auth-user-aarav'])
    expect(resInactive.allActive).toBe(false)
    expect(resInactive.inactiveUserIds).toContain('auth-user-suraj')
    expect(resInactive.inactiveNames).toContain('Suraj Mane')
    expect(resInactive.activeUserIds).toEqual(['auth-user-aarav'])
  })

  it('2. getAssignableEmployees excludes Suraj Mane once he is deactivated', async () => {
    // Initially Suraj is present in assignable list
    const initialList = await getAssignableEmployees()
    expect(initialList.success).toBe(true)
    const surajFoundBefore = initialList.data.find((e) => e.name === 'Suraj Mane')
    expect(surajFoundBefore).toBeDefined()

    // Deactivate Suraj
    await deactivateEmployee({
      employeeId: 'emp-uuid-suraj',
      reason: 'Contract concluded',
    })

    // Confirm Suraj Mane disappears from getAssignableEmployees
    const afterList = await getAssignableEmployees()
    expect(afterList.success).toBe(true)
    const surajFoundAfter = afterList.data.find((e) => e.name === 'Suraj Mane')
    expect(surajFoundAfter).toBeUndefined()

    // Active employee Aarav Sharma remains available
    const aaravFound = afterList.data.find((e) => e.name === 'Aarav Sharma')
    expect(aaravFound).toBeDefined()
  })

  it('3. getAssignableUsersAction in Quick Tasks excludes inactive users', async () => {
    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false

    const usersRes = await getAssignableUsersAction()
    expect(usersRes.success).toBe(true)
    const suraj = (usersRes.data || []).find((u) => u.name === 'Suraj Mane')
    expect(suraj).toBeUndefined()

    const aarav = (usersRes.data || []).find((u) => u.name === 'Aarav Sharma')
    expect(aarav).toBeDefined()
  })

  it('4. createTaskAction rejects direct server-side assignment to inactive Suraj Mane', async () => {
    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false

    const result = await createTaskAction({
      title: 'Fix ERP Core Issue',
      project_id: 'prj-1',
      assignees: ['auth-user-suraj'],
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Cannot assign task to inactive or deactivated employee/i)
    expect(result.error).toContain('Suraj Mane')
  })

  it('5. updateTaskAction rejects reassigning a task to inactive employee', async () => {
    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false

    const result = await updateTaskAction({
      id: 'task-hist-1',
      title: 'Historical Task Updated',
      assignees: ['auth-user-suraj'],
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Cannot assign task to inactive or deactivated employee/i)
  })

  it('6. createQuickTasksAction rejects assigning a Quick Task to inactive employee', async () => {
    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false

    const result = await createQuickTasksAction({
      description: 'Urgent: update production configuration',
      assigned_to: ['auth-user-suraj'],
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Cannot assign Quick Task to inactive or deactivated user/i)
  })

  it('7. createProjectAction & updateProjectAction reject inactive Project Manager or Team Members', async () => {
    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false

    // Attempt to set Suraj as Project Manager
    const createRes = await createProjectAction({
      name: 'Alpha Initiative',
      client_id: 'client-1',
      project_manager_id: 'auth-user-suraj',
    })
    expect(createRes.success).toBe(false)
    expect(createRes.error).toMatch(/Cannot assign inactive or deactivated employee as Project Manager/i)

    // Attempt to add Suraj as team member
    const createMemberRes = await createProjectAction({
      name: 'Alpha Initiative',
      client_id: 'client-1',
      project_manager_id: 'auth-user-admin',
      team_members: ['auth-user-suraj'],
    })
    expect(createMemberRes.success).toBe(false)
    expect(createMemberRes.error).toMatch(/Cannot assign inactive or deactivated employee\(s\) to project team/i)

    // Update Project with inactive team member
    const updateRes = await updateProjectAction({
      id: 'prj-1',
      team_members: ['auth-user-suraj'],
    })
    expect(updateRes.success).toBe(false)
    expect(updateRes.error).toMatch(/Cannot assign inactive or deactivated employee\(s\) to project team/i)
  })

  it('8. assignHod rejects assigning an inactive employee as HOD', async () => {
    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false

    const hodRes = await assignHod('auth-user-suraj', 'EMP-005', 'Development')
    expect(hodRes.success).toBe(false)
    expect(hodRes.error).toMatch(/Cannot assign inactive or deactivated employee as Head of Department/i)
  })

  it('9. getTopContributorData excludes inactive employees from current leaderboard while preserving records', async () => {
    // Before deactivation: Suraj has 8 hours, Aarav has 6 hours. Suraj is top contributor.
    const beforeRes = await getTopContributorData({ month: 10, year: 2026 })
    expect(beforeRes.success).toBe(true)
    expect(beforeRes.data?.topContributor?.name).toBe('Suraj Mane')

    // Deactivate Suraj
    mockEmployees['emp-uuid-suraj'].employment_status = 'Inactive'
    mockProfiles['auth-user-suraj'].is_active = false
    mockProfiles['auth-user-suraj'].deactivated_at = new Date().toISOString()

    // After deactivation: Suraj is excluded from current active leaderboard. Aarav becomes top contributor.
    const afterRes = await getTopContributorData({ month: 10, year: 2026 })
    expect(afterRes.success).toBe(true)
    expect(afterRes.data?.topContributor?.name).toBe('Aarav Sharma')
    const leaderboardNames = (afterRes.data?.leaderboard || []).map((e) => e.name)
    expect(leaderboardNames).not.toContain('Suraj Mane')
    expect(leaderboardNames).toContain('Aarav Sharma')

    // Historical EOD records in mockEodReports remain intact
    expect(mockEodReports).toHaveLength(2)
    expect(mockEodReports.find((e) => e.employee_id === 'auth-user-suraj')).toBeDefined()
  })

  it('10. Historical task assignments and project memberships remain preserved', async () => {
    // Deactivate Suraj
    await deactivateEmployee({
      employeeId: 'emp-uuid-suraj',
      reason: 'Contract concluded',
    })

    // Historical tasks in tasks table and task_assignees remain untouched
    const historicalTask = mockTasks.find((t) => t.id === 'task-hist-1')
    expect(historicalTask).toBeDefined()
    const historicalAssignment = mockTaskAssignees.find((ta) => ta.user_id === 'auth-user-suraj')
    expect(historicalAssignment).toBeDefined()

    // Historical project membership remains untouched
    const historicalMember = mockProjectMembers.find((pm) => pm.user_id === 'auth-user-suraj')
    expect(historicalMember).toBeDefined()
  })

  it('11. Reactivating an employee restores eligibility across all selectors and assignments', async () => {
    // Deactivate Suraj
    await deactivateEmployee({
      employeeId: 'emp-uuid-suraj',
      reason: 'Temporary absence',
    })

    // Verify Suraj is excluded
    let list = await getAssignableEmployees()
    expect(list.data.find((e) => e.name === 'Suraj Mane')).toBeUndefined()

    // Reactivate Suraj
    const reactivateRes = await reactivateEmployee({
      employeeId: 'emp-uuid-suraj',
      reason: 'Reinstated',
    })
    expect(reactivateRes.success).toBe(true)

    // Verify Suraj is restored in getAssignableEmployees
    list = await getAssignableEmployees()
    expect(list.data.find((e) => e.name === 'Suraj Mane')).toBeDefined()

    // Verify new task assignment to Suraj is now accepted
    const taskRes = await createTaskAction({
      title: 'Post-reactivation task',
      project_id: 'prj-1',
      assignees: ['auth-user-suraj'],
    })
    expect(taskRes.success).toBe(true)
  })
})
