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

describe('EmployeeIdCard UI Component Tests', () => {
  const sampleEmployee: EmployeeIdCardData = {
    id: 'emp-002',
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
  }

  describe('Front Face Rendering', () => {
    it('renders employee name, ID badge, designation, and department in front view', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={false} theme="dark" />
      )

      expect(html).toContain('Harishchandra Nanavare')
      expect(html).toContain('EMP-002')
      expect(html).toContain('Engineering')
      expect(html).toContain('Senior Full-Stack Engineer')
      expect(html).toContain('Triple S Production')
      expect(html).toContain('Staff Identity Card')
      expect(html).toContain('B+')
      expect(html).toContain('HN') // Initials fallback when no profile photo
      expect(html).toContain('SYSTEM GENERATED • SECURE IDENTIFIER')
    })

    it('renders profile photo image when profilePhoto url is supplied', () => {
      const employeeWithPhoto: EmployeeIdCardData = {
        ...sampleEmployee,
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      }

      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={employeeWithPhoto} isFlipped={false} theme="dark" />
      )

      expect(html).toContain('src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"')
      expect(html).toContain('alt="Harishchandra Nanavare"')
    })

    it('renders active verified status check and smart NFC chip', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={false} theme="dark" />
      )

      expect(html).toContain('Verified')
      expect(html).toContain('Secure Smart NFC')
    })
  })

  describe('Back Face Rendering', () => {
    it('renders magnetic stripe, company address, and emergency contact details in back view', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={true} theme="dark" />
      )

      expect(html).toContain('SECURITY SMART ENCODING')
      expect(html).toContain('Industrial Area Phase II, Okhla')
      expect(html).toContain('Sunita Nanavare')
      expect(html).toContain('(Spouse)')
      expect(html).toContain('+91-98220-45678')
      expect(html).toContain('Scan to Verify Badge')
      expect(html).toContain('This card remains the exclusive property of Triple S Production')
      expect(html).toContain('*EMP-002-')
    })
  })

  describe('Theme Customization', () => {
    it('applies dark gradient styling in dark mode', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={false} theme="dark" />
      )

      expect(html).toContain('from-zinc-900 via-zinc-950 to-black')
      expect(html).toContain('text-zinc-100')
    })

    it('applies light gradient styling in light mode', () => {
      const html = renderToStaticMarkup(
        <EmployeeIdCard employee={sampleEmployee} isFlipped={false} theme="light" />
      )

      expect(html).toContain('from-slate-50 via-white to-slate-100')
      expect(html).toContain('text-slate-800')
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
      expect(parsed.name).toBe('Company HR Desk')
      expect(parsed.relation).toBe('Office')
      expect(parsed.phone).toBe('+91 11 4567 8900')
    })

    it('formats badge dates cleanly', () => {
      expect(formatBadgeDate('2024-03-15')).toBe('15 Mar 2024')
      expect(formatBadgeDate('')).toBe('N/A')
      expect(formatBadgeDate('-')).toBe('N/A')
    })

    it('calculates 3-year card expiry date accurately', () => {
      const expiry = calculateExpiryDate('2024-05-10')
      expect(expiry).toBe('05/2027')
    })
  })
})
