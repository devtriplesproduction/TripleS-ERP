export type EmployeeStatus = 'Not Started' | 'In Progress' | 'Completed'

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  job_title: string
  department: string
  division: string | null
  designation: string | null
  joining_date: string
  status: EmployeeStatus
  created_at: string
  updated_at: string
  dob: string | null
  gender: string | null
  personal_email: string | null
  city: string | null
  pincode: string | null
  address: string | null
  emergency_contact: string | null
  employment_type: string
  employment_status: string
  probation_start_date: string | null
  probation_end_date: string | null
  probation_period: string | null
  salary: number | null
  basic_salary: number | null
  stipend: number | null
  experience_type: string | null
  experience_years: number | null
  experience_months: number | null
  employee_id_number: string | null
  password_hash: string | null
  profile_photo: string | null
  reporting_manager: string | null
  notes: string | null
  documents: any[]
  role: string | null
  is_hod: boolean | null
  auth_user_id: string | null
}

export interface OnboardingTask {
  id: string
  employee_id: string
  task_name: string
  is_completed: boolean
  is_required: boolean
  created_at: string
  updated_at: string
}
