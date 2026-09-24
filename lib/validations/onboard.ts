import * as z from 'zod'

export const onboardSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  phone_number: z.string().min(10, 'Valid phone number is required'),
  personal_email: z.string().email('Valid personal email is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  pincode: z.string().min(1, 'PIN code is required'),
  emergency_name: z.string().min(1, 'Emergency contact is required'),
  emergency_relationship: z.string().min(1, 'Relation is required'),
  emergency_phone: z.string().min(10, 'Valid emergency phone is required'),
  
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Role is required'),
  employment_type: z.string().min(1, 'Employment type is required'),
  employment_status: z.string().min(1, 'Employment status is required'),
  reporting_manager: z.string().optional(),
  salary: z.string().min(1, 'Annual CTC is required'),
  basic_salary: z.string().min(1, 'Basic salary is required'),
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
