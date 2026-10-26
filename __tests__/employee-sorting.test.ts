import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnboardingTable } from '@/components/hr/onboarding/onboarding-table'
import { Employee } from '@/lib/supabase/types'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock-storage/${path}` } })
      })
    }
  })
}))

const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-emp-1',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  phone: null,
  job_title: 'Developer',
  department: 'Development',
  division: null,
  designation: 'Developer',
  joining_date: '2026-01-01',
  status: 'Completed',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  dob: null,
  gender: null,
  personal_email: null,
  city: null,
  pincode: null,
  address: null,
  emergency_contact: null,
  employment_type: 'Full Time',
  employment_status: 'Active',
  probation_start_date: null,
  probation_end_date: null,
  probation_period: null,
  salary: null,
  basic_salary: null,
  stipend: null,
  experience_type: null,
  experience_years: null,
  experience_months: null,
  employee_id_number: 'EMP-001',
  password_hash: null,
  profile_photo: null,
  reporting_manager: null,
  notes: null,
  documents: [],
  role: 'Employee',
  is_hod: false,
  auth_user_id: null,
  ...overrides
})

describe('Employees List Sorting & HOD Badge', () => {
  it('places HOD employees at the top and inactive employees at the bottom', () => {
    const employees: Employee[] = [
      createMockEmployee({ id: '1', first_name: 'Prachi', last_name: 'Thorat', joining_date: '2026-10-19', employment_status: 'Active', is_hod: false }),
      createMockEmployee({ id: '2', first_name: 'Suraj', last_name: 'Mane', joining_date: '2026-10-01', employment_status: 'Inactive', is_hod: false }),
      createMockEmployee({ id: '3', first_name: 'Omkar', last_name: 'Sawant', joining_date: '2026-09-11', employment_status: 'Active', is_hod: true }),
      createMockEmployee({ id: '4', first_name: 'Harishchandra', last_name: 'Nanavare', joining_date: '2026-08-04', employment_status: 'Active', is_hod: false }),
      createMockEmployee({ id: '5', first_name: 'Prince', last_name: 'Nandagawali', joining_date: '2024-10-01', employment_status: 'Active', is_hod: true }),
    ]

    const html = renderToStaticMarkup(React.createElement(OnboardingTable, { employees }))

    // In rendered markup, Omkar and Prince should appear before Prachi and Harishchandra, and Suraj (inactive) must appear last
    const omkarIdx = html.indexOf('Omkar Sawant')
    const princeIdx = html.indexOf('Prince Nandagawali')
    const prachiIdx = html.indexOf('Prachi Thorat')
    const harishIdx = html.indexOf('Harishchandra Nanavare')
    const surajIdx = html.indexOf('Suraj Mane')

    expect(omkarIdx).toBeGreaterThan(-1)
    expect(princeIdx).toBeGreaterThan(-1)
    expect(prachiIdx).toBeGreaterThan(-1)
    expect(harishIdx).toBeGreaterThan(-1)
    expect(surajIdx).toBeGreaterThan(-1)

    // HODs at top
    expect(omkarIdx).toBeLessThan(prachiIdx)
    expect(princeIdx).toBeLessThan(prachiIdx)

    // Within HODs, joining date descending: Omkar (2026-09-11) before Prince (2024-10-01)
    expect(omkarIdx).toBeLessThan(princeIdx)

    // Within Regular Active: Prachi (2026-10-19) before Harishchandra (2026-08-04)
    expect(prachiIdx).toBeLessThan(harishIdx)

    // Inactive employee at the very bottom
    expect(surajIdx).toBeGreaterThan(harishIdx)
    expect(surajIdx).toBeGreaterThan(prachiIdx)
    expect(surajIdx).toBeGreaterThan(omkarIdx)
  })

  it('renders clearly highlighted existing-style HOD badge with star and HOD text', () => {
    const employees: Employee[] = [
      createMockEmployee({ id: '1', first_name: 'Omkar', last_name: 'Sawant', is_hod: true }),
      createMockEmployee({ id: '2', first_name: 'Prachi', last_name: 'Thorat', is_hod: false }),
    ]

    const html = renderToStaticMarkup(React.createElement(OnboardingTable, { employees }))

    expect(html).toContain('HOD')
    expect(html).toContain('text-amber-400')
    expect(html).toContain('border-amber-500/25')
  })

  it('identifies HOD through designation or job_title without hardcoding names', () => {
    const employees: Employee[] = [
      createMockEmployee({ id: '1', first_name: 'Regular', last_name: 'Dev', job_title: 'Software Engineer', is_hod: false, joining_date: '2026-10-10' }),
      createMockEmployee({ id: '2', first_name: 'Dynamic', last_name: 'Lead', job_title: 'HOD - Engineering', is_hod: false, joining_date: '2026-05-01' }),
      createMockEmployee({ id: '3', first_name: 'Inactive', last_name: 'Staff', employment_status: 'Inactive', is_hod: false }),
    ]

    const html = renderToStaticMarkup(React.createElement(OnboardingTable, { employees }))

    const dynamicLeadIdx = html.indexOf('Dynamic Lead')
    const regularDevIdx = html.indexOf('Regular Dev')
    const inactiveStaffIdx = html.indexOf('Inactive Staff')

    // Dynamic Lead identified as HOD by job_title, placed above regular dev
    expect(dynamicLeadIdx).toBeLessThan(regularDevIdx)
    // Inactive staff placed at bottom
    expect(inactiveStaffIdx).toBeGreaterThan(regularDevIdx)
  })

  it('always places inactive employees at the bottom even if is_hod is true', () => {
    const employees: Employee[] = [
      createMockEmployee({ id: '1', first_name: 'Active', last_name: 'Member', is_hod: false, employment_status: 'Active', joining_date: '2026-01-01' }),
      createMockEmployee({ id: '2', first_name: 'Former', last_name: 'Hod', is_hod: true, employment_status: 'Inactive', joining_date: '2026-12-01' }),
      createMockEmployee({ id: '3', first_name: 'Current', last_name: 'Hod', is_hod: true, employment_status: 'Active', joining_date: '2026-02-01' }),
    ]

    const html = renderToStaticMarkup(React.createElement(OnboardingTable, { employees }))

    const currentHodIdx = html.indexOf('Current Hod')
    const activeMemberIdx = html.indexOf('Active Member')
    const formerHodIdx = html.indexOf('Former Hod')

    expect(currentHodIdx).toBeLessThan(activeMemberIdx)
    expect(formerHodIdx).toBeGreaterThan(activeMemberIdx)
  })
})
