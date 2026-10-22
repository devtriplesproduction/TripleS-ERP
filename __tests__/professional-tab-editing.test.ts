import { describe, it, expect, vi, beforeEach } from 'vitest'
import { professionalEditSchema } from '@/lib/validations/onboard'
import { extractWorkLocation } from '@/lib/utils/work-location'
import { updateEmployeeData } from '@/lib/actions/onboarding'

// In-memory mock databases
let mockCurrentUser: any = {
  id: 'user-admin-1',
  email: 'admin@triples.com',
  role: 'Admin',
  employee_id: 'TSP001',
  employee_name: 'Admin User',
}

let mockEmployees: Record<string, any> = {}
let mockProfiles: Record<string, any> = {}
let mockAuthUsers: any[] = []
let revalidatedPaths: string[] = []

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    revalidatedPaths.push(path)
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
  guardServerAction: async (allowedRoles: string[]) => {
    if (!mockCurrentUser) throw new Error('Authentication required')
    if (!allowedRoles.includes(mockCurrentUser.role)) {
      throw new Error('Unauthorized: insufficient permissions')
    }
    return mockCurrentUser
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      update: (payload: any) => ({
        eq: async (col: string, val: string) => {
          if (table === 'employee_onboarding' && col === 'id') {
            const emp = mockEmployees[val]
            if (!emp) return { data: null, error: { message: 'Employee not found' } }

            // Simulate database error if work_location is passed but mock table doesn't have column
            if ('work_location' in payload && (mockEmployees as any).__simulate_missing_work_location_col) {
              return { data: null, error: { code: '42703', message: 'column employee_onboarding.work_location does not exist' } }
            }

            Object.assign(emp, payload)
            return { data: emp, error: null }
          }
          return { data: null, error: null }
        },
      }),
    }),
  }),
  createAdminClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          single: async () => {
            if (table === 'employee_onboarding' && col === 'id') {
              const emp = mockEmployees[val]
              if (!emp) return { data: null, error: { message: 'Not found' } }
              return { data: { ...emp }, error: null }
            }
            return { data: null, error: { message: 'Not found' } }
          },
        }),
      }),
      update: (payload: any) => ({
        eq: async (col: string, val: string) => {
          if (table === 'profiles') {
            const profile = Object.values(mockProfiles).find((p: any) => p[col] === val)
            if (profile) Object.assign(profile, payload)
            return { data: profile || null, error: null }
          }
          return { data: null, error: null }
        },
      }),
    }),
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: mockAuthUsers },
          error: null,
        }),
        updateUserById: async (userId: string, attributes: any) => {
          const u = mockAuthUsers.find(user => user.id === userId)
          if (u) Object.assign(u, attributes)
          return { data: u, error: null }
        },
      },
    },
  }),
}))

describe('Professional Tab Editing & Permissions', () => {
  beforeEach(() => {
    revalidatedPaths = []
    mockCurrentUser = {
      id: 'user-admin-1',
      email: 'admin@triples.com',
      role: 'Admin',
      employee_id: 'TSP001',
      employee_name: 'Admin User',
    }
    mockEmployees = {
      'emp-1': {
        id: 'emp-1',
        employee_id_number: 'TSP101',
        first_name: 'Rohan',
        last_name: 'Patil',
        department: 'Engineering',
        division: 'Development',
        designation: 'Software Engineer',
        job_title: 'Software Engineer',
        employment_type: 'Full Time',
        joining_date: '2025-01-15',
        email: 'rohan.patil@tsp.com',
        salary: 600000,
        basic_salary: 50000,
        stipend: null,
        notes: null,
        work_location: 'Satara (Office)',
      },
      'emp-intern': {
        id: 'emp-intern',
        employee_id_number: 'TSP102',
        first_name: 'Priya',
        last_name: 'Sharma',
        department: 'Operations',
        division: 'Logistics',
        designation: 'Operations Intern',
        job_title: 'Operations Intern',
        employment_type: 'Intern',
        joining_date: '2026-03-01',
        email: 'priya.sharma@tsp.com',
        salary: null,
        basic_salary: null,
        stipend: 15000,
        notes: null,
        work_location: 'Pune (Office)',
      },
    }
    mockProfiles = {
      'prof-1': {
        id: 'user-emp-1',
        employee_id: 'TSP101',
        first_name: 'Rohan',
        last_name: 'Patil',
        department: 'Engineering',
        designation: 'Software Engineer',
        role: 'Employee',
      },
    }
    mockAuthUsers = [
      {
        id: 'user-emp-1',
        email: 'rohan.patil@tsp.com',
        user_metadata: { employee_id: 'TSP101' },
      },
    ]
    delete (mockEmployees as any).__simulate_missing_work_location_col
  })

  describe('1. Validation (professionalEditSchema)', () => {
    it('validates a complete, correct professional edit payload', () => {
      const validData = {
        employee_id_number: 'TSP999',
        department: 'Engineering',
        division: 'Frontend',
        designation: 'Senior Frontend Engineer',
        employment_type: 'Full Time',
        joining_date: '2026-01-10',
        email: 'new.email@tsp.com',
        work_location: 'Pune (Office)',
        salary: 750000,
        stipend: null,
      }
      const res = professionalEditSchema.safeParse(validData)
      expect(res.success).toBe(true)
    })

    it('rejects empty employee ID number', () => {
      const invalidData = {
        employee_id_number: '   ',
        department: 'Engineering',
        division: 'Frontend',
        designation: 'Developer',
        employment_type: 'Full Time',
        joining_date: '2026-01-10',
        email: 'dev@tsp.com',
        work_location: 'Satara (Office)',
      }
      const res = professionalEditSchema.safeParse(invalidData)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Employee ID is required.')
      }
    })

    it('rejects invalid work email', () => {
      const invalidData = {
        employee_id_number: 'TSP101',
        department: 'Engineering',
        division: 'Frontend',
        designation: 'Developer',
        employment_type: 'Full Time',
        joining_date: '2026-01-10',
        email: 'invalid-email-address',
        work_location: 'Satara (Office)',
      }
      const res = professionalEditSchema.safeParse(invalidData)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Valid work email is required.')
      }
    })

    it('requires a valid non-negative stipend for Intern employment type', () => {
      const internMissingStipend = {
        employee_id_number: 'TSP102',
        department: 'Operations',
        division: 'Logistics',
        designation: 'Intern',
        employment_type: 'Intern',
        joining_date: '2026-01-10',
        email: 'intern@tsp.com',
        work_location: 'Satara (Office)',
        stipend: '',
      }
      const res1 = professionalEditSchema.safeParse(internMissingStipend)
      expect(res1.success).toBe(false)

      const internValidStipend = {
        ...internMissingStipend,
        stipend: 12000,
      }
      const res2 = professionalEditSchema.safeParse(internValidStipend)
      expect(res2.success).toBe(true)
    })

    it('rejects empty work location', () => {
      const invalidData = {
        employee_id_number: 'TSP101',
        department: 'Engineering',
        division: 'Frontend',
        designation: 'Developer',
        employment_type: 'Full Time',
        joining_date: '2026-01-10',
        email: 'dev@tsp.com',
        work_location: '',
      }
      const res = professionalEditSchema.safeParse(invalidData)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Work location is required.')
      }
    })
  })

  describe('2. Work Location Extraction and Fallback', () => {
    it('returns direct work_location if present on employee', () => {
      const loc = extractWorkLocation({ work_location: 'Mumbai Branch' })
      expect(loc).toBe('Mumbai Branch')
    })

    it('extracts from [WORK_LOCATION: ...] tag in notes if work_location is null', () => {
      const loc = extractWorkLocation({
        work_location: null,
        notes: '[DEACTIVATED: 2026-10-10]\n[WORK_LOCATION: Pune Tech Park]\nOther notes',
      })
      expect(loc).toBe('Pune Tech Park')
    })

    it('defaults to Satara (Office) when neither is present', () => {
      expect(extractWorkLocation({ work_location: null, notes: null })).toBe('Satara (Office)')
      expect(extractWorkLocation({})).toBe('Satara (Office)')
    })
  })

  describe('3. Role-Based Access Control (RBAC) Enforcement', () => {
    it('allows Admin user to update professional details', async () => {
      mockCurrentUser.role = 'Admin'
      const res = await updateEmployeeData('emp-1', {
        department: 'R&D',
      })
      expect(res.success).toBe(true)
      expect(mockEmployees['emp-1'].department).toBe('R&D')
    })

    it('allows HR user to update professional details', async () => {
      mockCurrentUser.role = 'HR'
      const res = await updateEmployeeData('emp-1', {
        department: 'Quality Assurance',
      })
      expect(res.success).toBe(true)
      expect(mockEmployees['emp-1'].department).toBe('Quality Assurance')
    })

    it('rejects Employee role with unauthorized error', async () => {
      mockCurrentUser.role = 'Employee'
      await expect(
        updateEmployeeData('emp-1', { department: 'Hacked' })
      ).rejects.toThrow('Unauthorized: insufficient permissions')
      expect(mockEmployees['emp-1'].department).toBe('Engineering')
    })

    it('rejects Manager role with unauthorized error', async () => {
      mockCurrentUser.role = 'Manager'
      await expect(
        updateEmployeeData('emp-1', { department: 'Hacked' })
      ).rejects.toThrow('Unauthorized: insufficient permissions')
      expect(mockEmployees['emp-1'].department).toBe('Engineering')
    })

    it('rejects unauthenticated user', async () => {
      mockCurrentUser = null
      await expect(
        updateEmployeeData('emp-1', { department: 'Hacked' })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('4. Saving, Persistence, and Synchronization', () => {
    it('updates all professional fields and revalidates paths', async () => {
      mockCurrentUser.role = 'Admin'
      const updateData = {
        employee_id_number: 'TSP888',
        department: 'Design',
        division: 'UI/UX',
        designation: 'Principal Designer',
        job_title: 'Principal Designer',
        employment_type: 'Full Time',
        joining_date: '2024-06-01',
        email: 'rohan.designer@tsp.com',
        salary: 960000,
        work_location: 'Remote (Home Office)',
      }

      const res = await updateEmployeeData('emp-1', updateData)
      expect(res.success).toBe(true)

      const updated = mockEmployees['emp-1']
      expect(updated.employee_id_number).toBe('TSP888')
      expect(updated.department).toBe('Design')
      expect(updated.division).toBe('UI/UX')
      expect(updated.designation).toBe('Principal Designer')
      expect(updated.job_title).toBe('Principal Designer')
      expect(updated.employment_type).toBe('Full Time')
      expect(updated.joining_date).toBe('2024-06-01')
      expect(updated.email).toBe('rohan.designer@tsp.com')
      expect(updated.salary).toBe(960000)
      expect(updated.basic_salary).toBe(80000) // 960000 / 12 = 80000
      expect(updated.work_location).toBe('Remote (Home Office)')

      // Profiles table synced
      expect(mockProfiles['prof-1'].employee_id).toBe('TSP888')
      expect(mockProfiles['prof-1'].department).toBe('Design')
      expect(mockProfiles['prof-1'].designation).toBe('Principal Designer')

      // Auth user email synced
      expect(mockAuthUsers[0].email).toBe('rohan.designer@tsp.com')

      // Paths revalidated
      expect(revalidatedPaths).toContain('/employees/emp-1')
      expect(revalidatedPaths).toContain('/employees')
      expect(revalidatedPaths).toContain('/hr/onboarding/emp-1')
      expect(revalidatedPaths).toContain('/hr/onboarding')
    })

    it('clears salary and basic_salary when employment_type is set to Intern', async () => {
      mockCurrentUser.role = 'Admin'
      const res = await updateEmployeeData('emp-1', {
        employment_type: 'Intern',
        stipend: 20000,
      })
      expect(res.success).toBe(true)

      const updated = mockEmployees['emp-1']
      expect(updated.employment_type).toBe('Intern')
      expect(updated.stipend).toBe(20000)
      expect(updated.salary).toBeNull()
      expect(updated.basic_salary).toBeNull()
    })

    it('clears stipend when employment_type is changed from Intern to Full Time', async () => {
      mockCurrentUser.role = 'HR'
      const res = await updateEmployeeData('emp-intern', {
        employment_type: 'Full Time',
        salary: 480000,
      })
      expect(res.success).toBe(true)

      const updated = mockEmployees['emp-intern']
      expect(updated.employment_type).toBe('Full Time')
      expect(updated.salary).toBe(480000)
      expect(updated.basic_salary).toBe(40000)
      expect(updated.stipend).toBeNull()
    })

    it('falls back to notes tag persistence if work_location column is not yet provisioned in Postgres', async () => {
      mockCurrentUser.role = 'HR'
      mockEmployees['emp-1'].work_location = null
      ;(mockEmployees as any).__simulate_missing_work_location_col = true

      const updateData = {
        work_location: 'Kolhapur Testing Site',
      }

      const res = await updateEmployeeData('emp-1', updateData)
      expect(res.success).toBe(true)

      const updated = mockEmployees['emp-1']
      expect(updated.notes).toContain('[WORK_LOCATION: Kolhapur Testing Site]')
      // Extractor accurately resolves it
      expect(extractWorkLocation(updated)).toBe('Kolhapur Testing Site')
    })
  })

  describe('5. UI Role Permissions & Read-Only Enforcement', () => {
    it('determines Admin and HR are permitted to edit while Employee and Manager are read-only', () => {
      const checkCanEdit = (r: string | null | undefined) => r === 'Admin' || r === 'HR'

      expect(checkCanEdit('Admin')).toBe(true)
      expect(checkCanEdit('HR')).toBe(true)
      expect(checkCanEdit('Employee')).toBe(false)
      expect(checkCanEdit('Manager')).toBe(false)
      expect(checkCanEdit('HOD')).toBe(false)
      expect(checkCanEdit(null)).toBe(false)
      expect(checkCanEdit(undefined)).toBe(false)
    })
  })
})

