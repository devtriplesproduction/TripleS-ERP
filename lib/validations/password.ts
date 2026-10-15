/**
 * Password validation rules and strength calculations for TripleS ERP.
 * Enforces enterprise-grade security policy:
 * - Minimum 8 characters, maximum 72 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numerical digit (0-9)
 * - At least one special character (!@#$%^&* etc.)
 * - Confirmation match check
 * - Prevention of trivial and context-based passwords (name, email)
 */

export interface PasswordRuleCheck {
  id: string
  label: string
  passed: boolean
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strengthScore: number
  strengthLabel: 'Too Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  checks: PasswordRuleCheck[]
}

const COMMON_TRIVIAL_PASSWORDS = new Set([
  'password',
  'password123',
  'password@123',
  '12345678',
  '123456789',
  'admin123',
  'admin@123',
  'changeme',
  'changeme123',
  'triples123',
  'triples@123',
  'qwerty123',
  'welcome123',
  'welcome@123',
])

export function validatePassword(
  newPassword: string,
  confirmPassword?: string,
  context?: {
    email?: string | null
    employeeName?: string | null
  }
): PasswordValidationResult {
  const errors: string[] = []
  const pwd = newPassword || ''

  // Individual rule checks
  const hasLength = pwd.length >= 8 && pwd.length <= 72
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)
  const matchesConfirm = confirmPassword === undefined || pwd === confirmPassword

  const checks: PasswordRuleCheck[] = [
    { id: 'length', label: 'At least 8 characters (max 72)', passed: hasLength },
    { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', passed: hasUpper },
    { id: 'lowercase', label: 'At least one lowercase letter (a-z)', passed: hasLower },
    { id: 'number', label: 'At least one number (0-9)', passed: hasNumber },
    { id: 'special', label: 'At least one special character (!@#$%...)', passed: hasSpecial },
  ]

  if (confirmPassword !== undefined) {
    checks.push({
      id: 'match',
      label: 'Passwords must match',
      passed: matchesConfirm && pwd.length > 0,
    })
  }

  if (!hasLength) {
    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters long.')
    } else {
      errors.push('Password must not exceed 72 characters.')
    }
  }

  if (!hasUpper) {
    errors.push('Password must include at least one uppercase letter (A-Z).')
  }

  if (!hasLower) {
    errors.push('Password must include at least one lowercase letter (a-z).')
  }

  if (!hasNumber) {
    errors.push('Password must include at least one number (0-9).')
  }

  if (!hasSpecial) {
    errors.push('Password must include at least one special character (e.g. !@#$%&*).')
  }

  if (confirmPassword !== undefined && !matchesConfirm) {
    errors.push('New password and confirm password do not match.')
  }

  // Trivial password check
  const lowerPwd = pwd.toLowerCase().trim()
  if (COMMON_TRIVIAL_PASSWORDS.has(lowerPwd)) {
    errors.push('Password is too common and easily guessable. Please choose a more complex password.')
  }

  // Context-based checks
  if (context?.email) {
    const emailPrefix = context.email.split('@')[0]?.toLowerCase()
    if (emailPrefix && emailPrefix.length >= 3 && lowerPwd.includes(emailPrefix)) {
      errors.push('Password cannot contain your email username.')
    }
  }

  if (context?.employeeName) {
    const nameTokens = context.employeeName
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length >= 3)
    for (const token of nameTokens) {
      if (lowerPwd.includes(token)) {
        errors.push(`Password cannot contain parts of the employee's name ("${token}").`)
        break
      }
    }
  }

  // Calculate strength score (0 to 4)
  let score = 0
  if (hasLength) score++
  if (hasUpper && hasLower) score++
  if (hasNumber) score++
  if (hasSpecial) score++
  if (pwd.length >= 12 && hasSpecial && hasNumber && hasUpper && hasLower) score++

  // Cap score between 0 and 4
  const finalScore = Math.min(Math.max(score, 0), 4)

  const labels: Array<PasswordValidationResult['strengthLabel']> = [
    'Too Weak',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ]

  const isValid = errors.length === 0

  return {
    valid: isValid,
    errors,
    strengthScore: finalScore,
    strengthLabel: labels[finalScore],
    checks,
  }
}
