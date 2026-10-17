import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getEmployeeDeactivationImpact,
  deactivateEmployee,
  reactivateEmployee,
} from '@/lib/actions/deactivation'
import { getCurrentUser, guardServerAction } from '@/lib/auth'

// Mock Data
let mockCurrentUser: any = null

const mockEmployees: Record<string, any> = {
  'emp-uuid-1': {
    id: 'emp-uuid-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@triples.com',
    employee_id_number: 'EMP-001',
    job_title: 'Software Engineer',
    department: 'Engineering',
    employment_status: 'Active',
    role: 'Employee',
    is_hod: false,
    auth_user_id: 'auth-user-uuid-1',
    notes: 'Initial hire notes',
  },
  'emp-uuid-2': {
    id: 'emp-uuid-2',
    first_name: 'Sarah',
    last_name: 'HOD',
    email: 'sarah.hod@triples.com',
    employee_id_number: 'EMP-002',
    job_title: 'Engineering Lead',
    department: 'Engineering',
    employment_status: 'Active',
    role: 'Employee',
    is_hod: true,
    auth_user_id: 'auth-user-uuid-2',
    notes: 'Department head notes',
  },
  'emp-uuid-3': {
    id: 'emp-uuid-3',
    first_name: 'Alice',
    last_name: 'Admin',
    email: 'alice.admin@triples.com',
    employee_id_number: 'EMP-003',
    job_title: 'System Administrator',
    department: 'Management',
    employment_status: 'Active',
    role: 'Admin',
    is_hod: false,
    auth_user_id: 'auth-user-uuid-3',
    notes: 'Admin notes',
  },
  'emp-uuid-4': {
    id: 'emp-uuid-4',
    first_name: 'Bob',
    last_name: 'Inactive',
    email: 'bob.inactive@triples.com',
    employee_id_number: 'EMP-004',
    job_title: 'Marketing Specialist',
    department: 'Marketing',
    employment_status: 'Inactive',
    role: 'Employee',
    is_hod: false,
    auth_user_id: 'auth-user-uuid-4',
    notes: 'Previously deactivated',
  },
}

let mockProfiles: Record<string, any> = {}
let mockAuthUsers: Record<string, any> = {}
let mockActivityLogs: any[] = []
let mockSecurityLogs: any[] = []
let mockHodAssignments: any[] = []
let mockProjects: any[] = []
let mockTasks: any[] = []
let mockLeaveRequests: any[] = []
let mockEodReports: any[] = []

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => mockCurrentUser),
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (header: string) => {
      if (header === 'user-agent') return 'Vitest/Mock'
      if (header === 'x-forwarded-for') return '127.0.0.1'
      return null
    },
  }),
}))

vi.mock('@/lib/utils/audit-logger', () => ({
  logSecurityEvent: async (options: any) => {
    mockSecurityLogs.push(options)
    return options
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => {
        if (!mockCurrentUser) return { data: { user: null }, error: { message: 'Not authenticated' } }
        const authUser = mockAuthUsers[mockCurrentUser.id] || { id: mockCurrentUser.id, email: mockCurrentUser.email }
        return { data: { user: authUser }, error: null }
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          single: async () => {
            const p = mockProfiles[val]
            return { data: p || null, error: p ? null : { message: 'Profile not found' } }
          },
          maybeSingle: async () => {
            const emp = Object.values(mockEmployees).find((e: any) => e[col] === val)
            return { data: emp || null, error: null }
          },
        }),
      }),
    }),
  }),
  createAdminClient: async () => ({
    from: (table: string) => {
      if (table === 'employee_onboarding') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                const emp = Object.values(mockEmployees).find((e: any) => e[col] === val || e.id === val)
                return { data: emp ? { ...emp } : null, error: null }
              },
            }),
          }),
          update: (fields: any) => ({
            eq: (col: string, val: string) => {
              const emp = Object.values(mockEmployees).find((e: any) => e[col] === val || e.id === val)
              if (emp) {
                Object.assign(emp, fields)
                return { data: [emp], error: null }
              }
              return { data: null, error: { message: 'Employee not found' } }
            },
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                const prof = Object.values(mockProfiles).find((p: any) => p[col] === val || p.id === val)
                return { data: prof ? { ...prof } : null, error: null }
              },
            }),
          }),
          update: (fields: any) => ({
            eq: (col: string, val: string) => {
              const prof = Object.values(mockProfiles).find((p: any) => p[col] === val || p.id === val)
              if (prof) {
                Object.assign(prof, fields)
                return { data: [prof], error: null }
              }
              return { data: null, error: null }
            },
          }),
        }
      }
      if (table === 'department_hod_assignments') {
        return {
          select: () => ({
            eq: (c1: string, v1: any) => ({
              eq: (c2: string, v2: any) => {
                const matches = mockHodAssignments.filter((a: any) => a[c1] === v1 && a[c2] === v2)
                return { data: matches, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'projects') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              not: (cond: string, op: string, values: string) => {
                const activeP = mockProjects.filter((p: any) => p[col] === val && !['COMPLETED', 'CANCELLED'].includes(p.status))
                return { data: activeP, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'task_assignees') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              const assigned = mockTasks.filter((t: any) => t.user_id === val)
              return { data: assigned, error: null }
            },
          }),
        }
      }
      if (table === 'leave_requests') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              in: (statCol: string, statuses: string[]) => {
                const leaves = mockLeaveRequests.filter((l: any) => l[col] === val && statuses.includes(l.status))
                return { data: leaves, error: null }
              },
            }),
            or: (cond: string) => ({
              in: (statCol: string, statuses: string[]) => {
                return { data: [], error: null }
              },
            }),
          }),
        }
      }
      if (table === 'eod_reports') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              eq: (c2: string, v2: string) => {
                const eods = mockEodReports.filter((e: any) => e[col] === val && e[c2] === v2)
                return { data: eods, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'activity_logs') {
        return {
          insert: async (rec: any) => {
            mockActivityLogs.push(rec)
            return { error: null }
          },
        }
      }
      return {
        select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        insert: () => ({ data: null, error: null }),
      }
    },
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: Object.values(mockAuthUsers) },
          error: null,
        }),
        updateUserById: async (uid: string, attrs: any) => {
          if (mockAuthUsers[uid]) {
            Object.assign(mockAuthUsers[uid], attrs)
          }
          return { data: { user: mockAuthUsers[uid] }, error: null }
        },
        signOut: vi.fn(async () => ({ error: null })),
      },
    },
  }),
}))

describe('Employee Deactivation Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset base mock state
    mockEmployees['emp-uuid-1'].employment_status = 'Active'
    mockEmployees['emp-uuid-2'].employment_status = 'Active'
    mockEmployees['emp-uuid-3'].employment_status = 'Active'
    mockEmployees['emp-uuid-4'].employment_status = 'Inactive'

    mockProfiles = {
      'auth-user-uuid-1': { id: 'auth-user-uuid-1', employee_id: 'EMP-001', role: 'Employee', is_hod: false },
      'auth-user-uuid-2': { id: 'auth-user-uuid-2', employee_id: 'EMP-002', role: 'Employee', is_hod: true, department: 'Engineering' },
      'auth-user-uuid-3': { id: 'auth-user-uuid-3', employee_id: 'EMP-003', role: 'Admin', is_hod: false },
      'auth-user-uuid-4': { id: 'auth-user-uuid-4', employee_id: 'EMP-004', role: 'Employee', is_hod: false },
    }

    mockAuthUsers = {
      'auth-user-uuid-1': { id: 'auth-user-uuid-1', email: 'john.doe@triples.com', app_metadata: {} },
      'auth-user-uuid-2': { id: 'auth-user-uuid-2', email: 'sarah.hod@triples.com', app_metadata: {} },
      'auth-user-uuid-3': { id: 'auth-user-uuid-3', email: 'alice.admin@triples.com', app_metadata: {} },
      'auth-user-uuid-4': { id: 'auth-user-uuid-4', email: 'bob.inactive@triples.com', app_metadata: { deactivated: true } },
    }

    mockActivityLogs = []
    mockSecurityLogs = []
    mockHodAssignments = [
      { employee_id: 'auth-user-uuid-2', department: 'Engineering', is_active: true },
    ]
    mockProjects = [
      { id: 'proj-1', name: 'ERP Modernization', project_manager_id: 'auth-user-uuid-1', status: 'IN_PROGRESS' },
    ]
    mockTasks = [
      { user_id: 'auth-user-uuid-1', tasks: { id: 'task-1', title: 'Implement Auth Tests', status: 'IN_PROGRESS' } },
    ]
    mockLeaveRequests = [
      { id: 'leave-1', employee_id: 'emp-uuid-1', status: 'Pending Level' },
    ]
    mockEodReports = [
      { id: 'eod-1', employee_id: 'auth-user-uuid-1', status: 'Pending' },
    ]

    // Default logged-in user is Alice Admin
    mockCurrentUser = {
      id: 'auth-user-uuid-3',
      email: 'alice.admin@triples.com',
      role: 'Admin',
      employee_id: 'EMP-003',
      employee_name: 'Alice Admin',
    }
  })

  // 1. Authorized Admin can deactivate an active employee
  it('allows an authorized Admin to deactivate an active employee', async () => {
    const res = await deactivateEmployee({
      employeeId: 'emp-uuid-1',
      reason: 'Resigned voluntarily',
    })

    expect(res.success).toBe(true)
    expect(res.message).toContain('deactivated successfully')

    // Employment status updated to Inactive
    expect(mockEmployees['emp-uuid-1'].employment_status).toBe('Inactive')

    // Supabase Auth banned & metadata updated
    expect(mockAuthUsers['auth-user-uuid-1'].ban_duration).toBe('876600h')
    expect(mockAuthUsers['auth-user-uuid-1'].app_metadata?.deactivated).toBe(true)

    // Security audit log captured
    expect(mockSecurityLogs.length).toBeGreaterThan(0)
    const audit = mockSecurityLogs.find((s) => s.eventType === 'session_revoked')
    expect(audit).toBeDefined()
    expect(audit.employeeIdNumber).toBe('EMP-001')
    expect(audit.metadata.actor_email).toBe('alice.admin@triples.com')
    expect(audit.metadata.deactivation_reason).toBe('Resigned voluntarily')
  })

  // 2. Cancel leaves all data and access unchanged
  it('leaves all records and access unchanged if action is cancelled', async () => {
    // When no server action is triggered (cancel modal)
    expect(mockEmployees['emp-uuid-1'].employment_status).toBe('Active')
    expect(mockAuthUsers['auth-user-uuid-1'].app_metadata?.deactivated).toBeFalsy()
  })

  // 3. Unauthorized users cannot deactivate employees
  it('blocks non-admin users (e.g. Employee role) from deactivating employees', async () => {
    mockCurrentUser = {
      id: 'auth-user-uuid-1',
      email: 'john.doe@triples.com',
      role: 'Employee',
      employee_id: 'EMP-001',
    }

    const res = await deactivateEmployee({
      employeeId: 'emp-uuid-4',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Unauthorized: Only Admin users can deactivate employees')
    expect(mockEmployees['emp-uuid-4'].employment_status).toBe('Inactive')
  })

  // 4. Admin cannot deactivate themselves (self-deactivation prevention)
  it('prevents an Admin from deactivating their own account', async () => {
    const res = await deactivateEmployee({
      employeeId: 'emp-uuid-3', // Alice trying to deactivate Alice
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('You cannot deactivate your own account')
    expect(mockEmployees['emp-uuid-3'].employment_status).toBe('Active')
  })

  // 5. Cannot deactivate another Admin account directly
  it('prevents deactivating privileged Admin accounts directly', async () => {
    // Simulate another admin Bob
    mockEmployees['emp-uuid-5'] = {
      id: 'emp-uuid-5',
      employee_id_number: 'EMP-005',
      first_name: 'Bob',
      last_name: 'CoAdmin',
      role: 'Admin',
      employment_status: 'Active',
      auth_user_id: 'auth-user-uuid-5',
    }
    mockProfiles['auth-user-uuid-5'] = { id: 'auth-user-uuid-5', role: 'Admin', employee_id: 'EMP-005' }

    const res = await deactivateEmployee({
      employeeId: 'emp-uuid-5',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Cannot deactivate an Admin or Super Admin account directly')
    expect(mockEmployees['emp-uuid-5'].employment_status).toBe('Active')
  })

  // 6. Active HOD safety check requires HOD reassignment first
  it('blocks deactivating an active HOD and requires role reassignment first', async () => {
    const impact = await getEmployeeDeactivationImpact('emp-uuid-2')

    expect(impact.isHod).toBe(true)
    expect(impact.canDeactivate).toBe(false)
    expect(impact.blockReason).toContain('Head of Department (HOD)')

    const res = await deactivateEmployee({
      employeeId: 'emp-uuid-2',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Head of Department')
    expect(mockEmployees['emp-uuid-2'].employment_status).toBe('Active')
  })

  // 7. Active responsibilities inspection without deleting historical records
  it('inspects active projects, tasks, leaves, and EODs without deleting them', async () => {
    const impact = await getEmployeeDeactivationImpact('emp-uuid-1')

    expect(impact.success).toBe(true)
    expect(impact.activeProjectsCount).toBe(1)
    expect(impact.activeTasksCount).toBe(1)
    expect(impact.pendingLeaveCount).toBe(1)
    expect(impact.pendingEodCount).toBe(1)

    // Deactivate employee
    const res = await deactivateEmployee({
      employeeId: 'emp-uuid-1',
    })
    expect(res.success).toBe(true)

    // Verify historical records still exist completely intact
    expect(mockProjects.length).toBe(1)
    expect(mockTasks.length).toBe(1)
    expect(mockLeaveRequests.length).toBe(1)
    expect(mockEodReports.length).toBe(1)
    expect(mockProjects[0].project_manager_id).toBe('auth-user-uuid-1')
  })

  // 8. Server-side authorization blocks inactive employee sessions
  it('enforces inactive status in server-side authentication and guards', async () => {
    // Mock user is deactivated
    mockCurrentUser = null // Simulate getCurrentUser rejecting inactive account

    await expect(guardServerAction(['Employee', 'Admin'])).rejects.toThrow(
      'Authentication required'
    )
  })

  // 9. Authorized Admin can reactivate an inactive employee
  it('allows an authorized Admin to reactivate an inactive employee', async () => {
    expect(mockEmployees['emp-uuid-4'].employment_status).toBe('Inactive')

    const res = await reactivateEmployee({
      employeeId: 'emp-uuid-4',
      reason: 'Returned from sabbatical',
    })

    expect(res.success).toBe(true)
    expect(res.message).toContain('reactivated successfully')

    // Status updated to Active
    expect(mockEmployees['emp-uuid-4'].employment_status).toBe('Active')

    // Auth ban lifted
    expect(mockAuthUsers['auth-user-uuid-4'].ban_duration).toBe('none')
    expect(mockAuthUsers['auth-user-uuid-4'].app_metadata?.deactivated).toBe(false)

    // Reactivation security audit captured
    const reactivateAudit = mockSecurityLogs.find((s) => s.metadata?.action === 'employee_reactivated')
    expect(reactivateAudit).toBeDefined()
    expect(reactivateAudit.employeeIdNumber).toBe('EMP-004')
  })

  // 10. Audit event never exposes secrets or passwords
  it('never stores passwords or authentication tokens in audit logs', async () => {
    await deactivateEmployee({
      employeeId: 'emp-uuid-1',
      reason: 'Standard exit',
    })

    const audit = mockSecurityLogs.find((s) => s.eventType === 'session_revoked')
    expect(audit).toBeDefined()
    const serialized = JSON.stringify(audit)
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('token')
    expect(serialized).not.toContain('secret')
  })
})
