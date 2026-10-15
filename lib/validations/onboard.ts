import * as z from 'zod'

/**
 * Validates and normalizes phone numbers.
 * Supports numbers with or without +91 prefix.
 * Rejects numbers that are empty, not 10 digits, or contain non-digits.
 */
export const validatePhone = (val: unknown): { valid: boolean; message: string; national: string } => {
  const str = typeof val === 'string' ? val.trim() : ''
  if (!str) {
    return { valid: false, message: 'Phone number is required.', national: '' }
  }

  // Remove +91 prefix if present
  let national = str
  if (str.startsWith('+91')) {
    national = str.slice(3).trim()
  }

  // If after removing +91 there's nothing, it's considered empty
  if (!national) {
    return { valid: false, message: 'Phone number is required.', national: '' }
  }

  // Strip internal whitespace to inspect national number
  const nationalDigits = national.replace(/\s+/g, '')

  // Reject alphabetic/special characters and lengths other than 10
  if (!/^\d{10}$/.test(nationalDigits)) {
    return { valid: false, message: 'Enter a valid 10-digit mobile number.', national }
  }

  return { valid: true, message: '', national: nationalDigits }
}

export const onboardSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.'),
  last_name: z.string().trim().min(1, 'Last name is required.'),
  dob: z.string().trim().min(1, 'Date of birth is required.'),
  gender: z.string().trim().min(1, 'Please select a gender.'),
  phone_number: z.string().superRefine((val, ctx) => {
    const res = validatePhone(val)
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.message
      })
    }
  }),
  personal_email: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  emergency_name: z.string().optional(),
  emergency_relationship: z.string().optional(),
  emergency_phone: z.string().optional(),

  department: z.string().trim().min(1, 'Department is required.'),
  division: z.string().trim().min(1, 'Division is required.'),
  designation: z.string().trim().min(1, 'Designation is required.'),
  employment_type: z.string().trim().min(1, 'Employment type is required.'),
  employment_status: z.string().trim().min(1, 'Employment status is required.'),
  reporting_manager: z.string().optional(),
  role: z.string().optional(),
  is_hod: z.boolean().default(false),
  salary: z.string().optional(),
  basic_salary: z.string().optional(),
  stipend: z.string().optional(),
  experience_type: z.string().optional(),
  experience_years: z.string().optional(),
  experience_months: z.string().optional(),
  joining_date: z.string().trim().min(1, 'Joining date is required.'),
  probation_start_date: z.string().optional(),
  probation_end_date: z.string().optional(),
  probation_period: z.string().optional(),

  email: z.string().trim().email('Valid work email is required.').optional().or(z.literal('')),
  employee_id_number: z.string().optional(),
  password: z.string().optional(),
  confirm_password: z.string().optional(),
  profile_photo: z.string().optional(),
  documents: z.any().optional(),
}).refine((data) => {
  if (data.employment_status === 'Probation' && data.employment_type !== 'Full Time') {
    return false;
  }
  return true;
}, {
  message: "Probation is only available for Full Time employees.",
  path: ["employment_status"],
}).refine((data) => {
  if (data.employment_type === 'Intern') {
    return true;
  } else {
    return !!data.salary && data.salary.trim().length > 0;
  }
}, {
  message: "Annual CTC is required for this employment type.",
  path: ["salary"],
}).refine((data) => {
  if (data.employment_type === 'Intern') {
    return !!data.stipend && data.stipend.trim().length > 0;
  }
  return true;
}, {
  message: "Stipend is required for Interns.",
  path: ["stipend"],
}).refine((data) => {
  if (data.employment_type !== 'Intern') {
    return !!data.experience_type && data.experience_type.trim().length > 0;
  }
  return true;
}, {
  message: "Experience type is required.",
  path: ["experience_type"],
}).refine((data) => {
  if (data.employment_type !== 'Intern' && data.experience_type === 'Experienced') {
    return !!data.experience_years && data.experience_years.trim().length > 0;
  }
  return true;
}, {
  message: "Years of experience is required.",
  path: ["experience_years"],
})

export type OnboardFormData = z.infer<typeof onboardSchema>

export const STEP_1_FIELDS: (keyof OnboardFormData)[] = [
  'first_name',
  'last_name',
  'dob',
  'gender',
  'phone_number',
  'personal_email',
  'address',
  'city',
  'pincode',
  'emergency_name',
  'emergency_relationship',
  'emergency_phone',
]

export const STEP_2_FIELDS: (keyof OnboardFormData)[] = [
  'department',
  'division',
  'designation',
  'employment_type',
  'employment_status',
  'salary',
  'basic_salary',
  'stipend',
  'experience_type',
  'experience_years',
  'experience_months',
  'joining_date',
  'role',
  'is_hod',
]
