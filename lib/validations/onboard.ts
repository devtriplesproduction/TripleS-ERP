import * as z from 'zod'

export const onboardSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  dob: z.string().optional(),
  gender: z.string().optional(),
  phone_number: z.string().optional(),
  personal_email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  emergency_name: z.string().optional(),
  emergency_relationship: z.string().optional(),
  emergency_phone: z.string().optional(),
  
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Role is required'),
  employment_type: z.string().min(1, 'Employment type is required'),
  salary: z.string().optional(),
  experience: z.string().optional(),
  joining_date: z.string().min(1, 'Joining date is required'),
  
  email: z.string().email('Valid work email is required'),
  employee_id_number: z.string().min(1, 'Employee ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

export type OnboardFormData = z.infer<typeof onboardSchema>
