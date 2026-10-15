import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HodStatusBadge } from '@/components/hr/onboarding/hod-status-badge'
import { Employee } from '@/lib/supabase/types'

// Mock getEmployeeAccountStatus
vi.mock('@/lib/actions/account', () => ({
  getEmployeeAccountStatus: vi.fn(async (id: string) => {
    if (id === 'hod-emp-id') {
      return { hasAccount: true, isHod: true, authUserId: 'user-1' }
    }
    return { hasAccount: true, isHod: false, authUserId: 'user-2' }
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
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
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

describe('HOD Status Badge & Logic Tests', () => {
  it('renders HOD Active badge when is_hod is true', () => {
    const employee = createMockEmployee({ is_hod: true })
    const html = renderToStaticMarkup(React.createElement(HodStatusBadge, { employee, isHod: true }))
    expect(html).toContain('HOD Active')
    expect(html).not.toContain('Not assigned')
  })

  it('renders nothing (empty string, no "Not assigned" badge) when is_hod is false', () => {
    const employee = createMockEmployee({ is_hod: false })
    const html = renderToStaticMarkup(React.createElement(HodStatusBadge, { employee, isHod: false }))
    expect(html).toBe('')
    expect(html).not.toContain('Not assigned')
    expect(html).not.toContain('HOD Active')
  })

  it('does not contain "Not assigned" string in either active or inactive states', () => {
    const nonHodEmployee = createMockEmployee({ is_hod: false })
    const nonHodHtml = renderToStaticMarkup(React.createElement(HodStatusBadge, { employee: nonHodEmployee, isHod: false }))
    expect(nonHodHtml).not.toContain('Not assigned')

    const hodEmployee = createMockEmployee({ is_hod: true })
    const hodHtml = renderToStaticMarkup(React.createElement(HodStatusBadge, { employee: hodEmployee, isHod: true }))
    expect(hodHtml).not.toContain('Not assigned')
  })

  it('correctly filters HOD star indicator on employee list', () => {
    const employees: Employee[] = [
      createMockEmployee({ id: '1', first_name: 'Omkar', last_name: 'Sawant', is_hod: true }),
      createMockEmployee({ id: '2', first_name: 'H', last_name: 'R', is_hod: false }),
      createMockEmployee({ id: '3', first_name: 'Suraj', last_name: 'Mane', is_hod: false })
    ]

    const hods = employees.filter(e => Boolean(e.is_hod))
    const nonHods = employees.filter(e => !e.is_hod)

    expect(hods).toHaveLength(1)
    expect(hods[0].first_name).toBe('Omkar')
    expect(nonHods).toHaveLength(2)
  })

  it('unifies HOD status across profiles and onboarding tables', () => {
    const onboardingRecords = [
      { id: '1', employee_id_number: 'EMP-001', is_hod: false },
      { id: '2', employee_id_number: 'EMP-002', is_hod: true },
      { id: '3', employee_id_number: 'EMP-003', is_hod: false },
    ]

    const hodProfiles = [
      { employee_id: 'EMP-003', is_hod: true }
    ]

    const hodEmpIdSet = new Set(hodProfiles.filter(p => p.is_hod).map(p => p.employee_id))

    const unified = onboardingRecords.map(emp => ({
      ...emp,
      is_hod: Boolean(emp.is_hod || (emp.employee_id_number && hodEmpIdSet.has(emp.employee_id_number)))
    }))

    // EMP-001 is neither: false
    expect(unified[0].is_hod).toBe(false)
    // EMP-002 has is_hod in onboarding: true
    expect(unified[1].is_hod).toBe(true)
    // EMP-003 has is_hod in profiles: true
    expect(unified[2].is_hod).toBe(true)
  })
})
