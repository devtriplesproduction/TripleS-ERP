import * as z from 'zod'

export const onboardSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  phone_number: z.string().regex(/^\+91 ?\d{10}$/, 'Must be a 10-digit number with +91 prefix (e.g., +91 9876543210)'),
  personal_email: z.string().email('Valid personal email is required').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  emergency_name: z.string().optional(),
  emergency_relationship: z.string().optional(),
  emergency_phone: z.string().optional(),
  
  department: z.string().min(1, 'Department is required'),
  division: z.string().min(1, 'Division is required'),
  designation: z.string().min(1, 'Role is required'),
  employment_type: z.string().min(1, 'Employment type is required'),
  employment_status: z.string().min(1, 'Employment status is required'),
  reporting_manager: z.string().optional(),
  role: z.string().optional(),
  is_hod: z.boolean(),
  salary: z.string().optional(),
  basic_salary: z.string().optional(),
  stipend: z.string().optional(),
  experience_type: z.string().optional(),
  experience_years: z.string().optional(),
  experience_months: z.string().optional(),
  joining_date: z.string().min(1, 'Joining date is required'),
  probation_start_date: z.string().optional(),
  probation_end_date: z.string().optional(),
  probation_period: z.string().optional(),
  
  email: z.string().email('Valid work email is required'),
  // employee_id_number and password are auto-generated server-side
  employee_id_number: z.string().optional(),
  password: z.string().optional(),
  confirm_password: z.string().optional(),
}).refine((data) => {
  if (data.employment_status === 'Probation' && data.employment_type !== 'Full Time') {
    return false;
  }
  return true;
}, {
  message: "Probation is only available for Full Time employees",
  path: ["employment_status"],
}).refine((data) => {
  if (data.employment_type === 'Intern') {
    return true; // We validate stipend separately
  } else {
    return !!data.salary && data.salary.trim().length > 0;
  }
}, {
  message: "Annual CTC is required for this employment type",
  path: ["salary"],
}).refine((data) => {
  if (data.employment_type === 'Intern') {
    return !!data.stipend && data.stipend.trim().length > 0;
  }
  return true;
}, {
  message: "Stipend is required for Interns",
  path: ["stipend"],
}).refine((data) => {
  if (data.employment_type !== 'Intern') {
    return !!data.experience_type && data.experience_type.trim().length > 0;
  }
  return true;
}, {
  message: "Experience type is required",
  path: ["experience_type"],
})

export type OnboardFormData = z.infer<typeof onboardSchema>
