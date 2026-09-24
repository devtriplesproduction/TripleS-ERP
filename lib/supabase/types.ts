export type EmployeeStatus = 'Not Started' | 'In Progress' | 'Completed'

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  job_title: string
  department: string
  joining_date: string
  status: EmployeeStatus
  created_at: string
  updated_at: string
  dob: string | null
  gender: string | null
  personal_email: string | null
  address: string | null
  emergency_contact: string | null
  employment_type: string
  salary: number | null
  experience: number | null
  employee_id_number: string | null
  password_hash: string | null
  profile_photo: string | null
  reporting_manager: string | null
  notes: string | null
  documents: any[]
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
