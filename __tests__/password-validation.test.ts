import { describe, it, expect } from 'vitest'
import { validatePassword } from '../lib/validations/password'

describe('Password Validation & Policy Enforcement', () => {
  it('accepts strong, compliant passwords', () => {
    const result = validatePassword('TripleS#2026Secure', 'TripleS#2026Secure')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.strengthScore).toBeGreaterThanOrEqual(3)
  })

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Short1!', 'Short1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters long.')
  })

  it('rejects passwords longer than 72 characters', () => {
    const longPassword = 'A1!' + 'a'.repeat(71)
    const result = validatePassword(longPassword, longPassword)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must not exceed 72 characters.')
  })

  it('rejects passwords without uppercase letters', () => {
    const result = validatePassword('lowercase123!@#', 'lowercase123!@#')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must include at least one uppercase letter (A-Z).')
  })

  it('rejects passwords without lowercase letters', () => {
    const result = validatePassword('UPPERCASE123!@#', 'UPPERCASE123!@#')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must include at least one lowercase letter (a-z).')
  })

  it('rejects passwords without numerical digits', () => {
    const result = validatePassword('NoNumbersHere!@#', 'NoNumbersHere!@#')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must include at least one number (0-9).')
  })

  it('rejects passwords without special characters', () => {
    const result = validatePassword('NoSpecialChars123', 'NoSpecialChars123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must include at least one special character (e.g. !@#$%&*).')
  })

  it('rejects mismatched new and confirm passwords', () => {
    const result = validatePassword('ValidPass123!', 'DifferentPass123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('New password and confirm password do not match.')
  })

  it('rejects common trivial passwords', () => {
    const result = validatePassword('password123', 'password123')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('common and easily guessable'))).toBe(true)
  })

  it('rejects passwords containing the employee email username', () => {
    const result = validatePassword('johnsmith123!A', 'johnsmith123!A', {
      email: 'johnsmith@triples.com',
      employeeName: 'John Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password cannot contain your email username.')
  })

  it('rejects passwords containing parts of employee name', () => {
    const result = validatePassword('Alexander123!@#', 'Alexander123!@#', {
      email: 'work@triples.com',
      employeeName: 'Alexander Hamilton',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('cannot contain parts of the employee\'s name'))).toBe(true)
  })

  it('provides detailed checklist feedback for UI display', () => {
    const result = validatePassword('weak')
    expect(result.checks).toBeDefined()
    expect(result.checks.length).toBeGreaterThanOrEqual(5)

    const lengthCheck = result.checks.find((c) => c.id === 'length')
    expect(lengthCheck?.passed).toBe(false)

    const lowerCheck = result.checks.find((c) => c.id === 'lowercase')
    expect(lowerCheck?.passed).toBe(true)
  })
})
