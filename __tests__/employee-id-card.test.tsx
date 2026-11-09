import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  EmployeeIdCard,
  EmployeeIdCardData,
  parseEmergencyContactDetails,
  formatBadgeDate,
  calculateExpiryDate,
  DEFAULT_COMPANY
} from '../components/id-card/EmployeeIdCard'

describe('EmployeeIdCard UI Component Tests (Landscape Design)', () => {
  const sampleEmployee: EmployeeIdCardData = {
    id: 'b9efcbda-434b-422c-9d49-f178e91c6d8a',
    firstName: 'Harishchandra',
    lastName: 'Nanavare',
    fullName: 'Harishchandra Nanavare',
    employeeId: 'EMP-002',
    designation: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    dob: '1995-04-12',
    joiningDate: '2023-08-01',
    bloodGroup: 'B+',
    phone: '+91 98765 12345',
    email: 'harish@triplesproduction.com',
    emergencyContact: 'Sunita Nanavare - Spouse - +91-98220-45678',
    status: 'Working',
    workLocation: 'OFFICE',
  }

  describe('Front Face Rendering', () => {
    it('renders employee name, ID number, department, location and brand headers', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={false} />
      )

      expect(html).toContain('Harishchandra Nanavare')
      expect(html).toContain('EMP-002')
      expect(html).toContain('Engineering')
      expect(html).toContain('TripleS OS')
      expect(html).toContain('AGENCY PERSONNEL')
      expect(html).toContain('EMPLOYEE')
      expect(html).toContain('ID NUMBER')
      expect(html).toContain('DEPARTMENT')
      expect(html).toContain('JOINED')
      expect(html).toContain('LOCATION')
      expect(html).toContain('OFFICE')
      expect(html).toContain('VALID THRU')
      expect(html).toContain('AUTHORIZED SIGNATURE')
      expect(html).toContain('TripleS Admin')
      expect(html).toContain('HN') // Initials fallback when no profile photo
    })

    it('renders profile photo image when profilePhoto url is supplied', () => {
      const employeeWithPhoto: EmployeeIdCardData = {
        ...sampleEmployee,
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      }

      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={employeeWithPhoto} isFlipped={false} />
      )

      expect(html).toContain('src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"')
      expect(html).toContain('alt="Harishchandra Nanavare"')
    })
  })

  describe('Back Face Rendering', () => {
    it('renders emergency contact, blood group, signature strip and disclaimer in back view', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={true} />
      )

      expect(html).toContain('TripleS OS')
      expect(html).toContain('AGENCY PERSONNEL')
      expect(html).toContain('EMERGENCY CONTACT &amp; MEDICAL')
      expect(html).toContain('CONTACT NAME / PHONE')
      expect(html).toContain('+91-98220-45678')
      expect(html).toContain('BLOOD GROUP')
      expect(html).toContain('B+')
      expect(html).toContain('Authorizing Digital Signature...')
      expect(html).toContain('This ID remains property of TripleS OS.')
      expect(html).toContain('REF:')
    })
  })

  describe('Helper Utilities', () => {
    it('parses emergency contact with hyphens in telephone number without chopping digits', () => {
      const parsed = parseEmergencyContactDetails('Kavita Sharma - Mother - +91-98765-43210')
      expect(parsed.name).toBe('Kavita Sharma')
      expect(parsed.relation).toBe('Mother')
      expect(parsed.phone).toBe('+91-98765-43210')
    })

    it('falls back gracefully on empty or null emergency contact string', () => {
      const parsed = parseEmergencyContactDetails(undefined)
      expect(parsed.name).toBe('HR Desk')
      expect(parsed.relation).toBe('Office')
      expect(parsed.phone).toBe('+91 8956183973')
    })

    it('formats badge dates cleanly', () => {
      expect(formatBadgeDate('2024-03-15')).toBe('3/15/2024')
      expect(formatBadgeDate('')).toBe('N/A')
      expect(formatBadgeDate('-')).toBe('N/A')
    })

    it('calculates 4-year card expiry date accurately', () => {
      const expiry = calculateExpiryDate('2024-05-10')
      expect(expiry).toBe('05/2028')
    })
  })
})
