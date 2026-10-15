import { describe, it, expect } from 'vitest'
import {
  onboardSchema,
  validatePhone,
  STEP_1_FIELDS,
  STEP_2_FIELDS
} from '@/lib/validations/onboard'

describe('Employee Onboarding Wizard Validation', () => {
  describe('Phone Number Validation (validatePhone)', () => {
    it('Case 2: Empty phone string returns "Phone number is required."', () => {
      expect(validatePhone('')).toEqual({
        valid: false,
        message: 'Phone number is required.',
        national: ''
      })
    })

    it('Case 2: Default "+91 " prefix alone returns "Phone number is required."', () => {
      expect(validatePhone('+91 ')).toEqual({
        valid: false,
        message: 'Phone number is required.',
        national: ''
      })
      expect(validatePhone('+91')).toEqual({
        valid: false,
        message: 'Phone number is required.',
        national: ''
      })
      expect(validatePhone('   ')).toEqual({
        valid: false,
        message: 'Phone number is required.',
        national: ''
      })
    })

    it('Case 3: Nine-digit phone number returns "Enter a valid 10-digit mobile number."', () => {
      expect(validatePhone('987654321')).toEqual({
        valid: false,
        message: 'Enter a valid 10-digit mobile number.',
        national: '987654321'
      })
      expect(validatePhone('+91 987654321')).toEqual({
        valid: false,
        message: 'Enter a valid 10-digit mobile number.',
        national: '987654321'
      })
    })

    it('Reject letters, special characters, and numbers longer than 10 digits', () => {
      expect(validatePhone('+91 98765abcde').valid).toBe(false)
      expect(validatePhone('+91 98765abcde').message).toBe('Enter a valid 10-digit mobile number.')
      expect(validatePhone('+91 98765432100').valid).toBe(false)
      expect(validatePhone('+91 98765432100').message).toBe('Enter a valid 10-digit mobile number.')
    })

    it('Case 4: Valid 10-digit number passes (with or without +91)', () => {
      const resWithPrefix = validatePhone('+91 9876543210')
      expect(resWithPrefix.valid).toBe(true)
      expect(resWithPrefix.national).toBe('9876543210')

      const resWithoutPrefix = validatePhone('9876543210')
      expect(resWithoutPrefix.valid).toBe(true)
      expect(resWithoutPrefix.national).toBe('9876543210')

      const resWithInternalSpace = validatePhone('+91 98765 43210')
      expect(resWithInternalSpace.valid).toBe(true)
      expect(resWithInternalSpace.national).toBe('9876543210')
    })
  })

  describe('Step 1 Required Fields Validation (onboardSchema)', () => {
    it('Case 1: Empty Personal Information form produces individual errors for all missing required fields', () => {
      const emptyData = {
        first_name: '',
        last_name: '',
        dob: '',
        gender: '',
        phone_number: '+91 ',
        personal_email: '',
      }

      const result = onboardSchema.safeParse(emptyData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const issues = result.error.issues
        const issueMap = new Map(issues.map(i => [i.path[0], i.message]))

        expect(issueMap.get('first_name')).toBe('First name is required.')
        expect(issueMap.get('last_name')).toBe('Last name is required.')
        expect(issueMap.get('dob')).toBe('Date of birth is required.')
        expect(issueMap.get('gender')).toBe('Please select a gender.')
        expect(issueMap.get('phone_number')).toBe('Phone number is required.')

        // Case 5: Optional email left empty produces NO error
        expect(issueMap.has('personal_email')).toBe(false)
        expect(issueMap.has('address')).toBe(false)
        expect(issueMap.has('city')).toBe(false)
        expect(issueMap.has('pincode')).toBe(false)
      }
    })

    it('Case 5: Optional personal email left empty produces no error, but invalid email produces error', () => {
      const validWithEmptyEmail = onboardSchema.safeParse({
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-01-01',
        gender: 'male',
        phone_number: '+91 9876543210',
        personal_email: '',
        department: 'Engineering',
        division: 'Development',
        designation: 'Software Engineer',
        employment_type: 'Full Time',
        employment_status: 'Active',
        salary: '1200000',
        experience_type: 'Fresher',
        joining_date: '2026-01-01',
      })
      expect(validWithEmptyEmail.success).toBe(true)

      const invalidEmail = onboardSchema.safeParse({
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-01-01',
        gender: 'male',
        phone_number: '+91 9876543210',
        personal_email: 'not-an-email',
      })
      expect(invalidEmail.success).toBe(false)
      if (!invalidEmail.success) {
        const emailErr = invalidEmail.error.issues.find(i => i.path[0] === 'personal_email')
        expect(emailErr).toBeDefined()
        expect(emailErr?.message).toBe('Enter a valid email address.')
      }
    })

    it('Case 6: Correcting one field removes that field from errors while others remain', () => {
      const partiallyFilled = {
        first_name: 'John',
        last_name: '',
        dob: '',
        gender: '',
        phone_number: '+91 ',
      }

      const result = onboardSchema.safeParse(partiallyFilled)
      expect(result.success).toBe(false)
      if (!result.success) {
        const issuePaths = result.error.issues.map(i => i.path[0])
        expect(issuePaths).not.toContain('first_name')
        expect(issuePaths).toContain('last_name')
        expect(issuePaths).toContain('dob')
        expect(issuePaths).toContain('gender')
        expect(issuePaths).toContain('phone_number')
      }
    })

    it('Step field definitions correctly partition wizard steps', () => {
      expect(STEP_1_FIELDS).toContain('first_name')
      expect(STEP_1_FIELDS).toContain('last_name')
      expect(STEP_1_FIELDS).toContain('dob')
      expect(STEP_1_FIELDS).toContain('gender')
      expect(STEP_1_FIELDS).toContain('phone_number')
      expect(STEP_1_FIELDS).not.toContain('department')
      expect(STEP_1_FIELDS).not.toContain('salary')

      expect(STEP_2_FIELDS).toContain('department')
      expect(STEP_2_FIELDS).toContain('division')
      expect(STEP_2_FIELDS).toContain('designation')
      expect(STEP_2_FIELDS).toContain('salary')
      expect(STEP_2_FIELDS).not.toContain('first_name')
    })
  })
})
