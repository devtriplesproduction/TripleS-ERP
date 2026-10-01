'use server'

import { createClient } from '@/lib/supabase/server'
import { Employee, OnboardingTask, EmployeeStatus } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { guardServerAction } from '@/lib/auth'

const DEFAULT_TASKS = [
  { task_name: 'Collect Identity Documents', is_required: true },
  { task_name: 'Set up Email Account', is_required: true },
  { task_name: 'Provide Hardware Equipment', is_required: true },
  { task_name: 'Sign Employment Contract', is_required: true },
  { task_name: 'Office Tour & Introduction', is_required: false },
]

export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employee_onboarding')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching employees:', error)
    return []
  }

  return data as Employee[]
}

export async function getEmployeeById(id: string): Promise<{ employee: Employee | null, tasks: OnboardingTask[] }> {
  const supabase = await createClient()
  
  const [employeeRes, tasksRes] = await Promise.all([
    supabase.from('employee_onboarding').select('*').eq('id', id).single(),
    supabase.from('onboarding_tasks').select('*').eq('employee_id', id).order('created_at', { ascending: true })
  ])

  return {
    employee: employeeRes.data as Employee | null,
    tasks: (tasksRes.data || []) as OnboardingTask[]
  }
}

export async function createEmployee(formData: FormData) {
  const supabase = await createClient()

  const employeeData = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    job_title: formData.get('job_title') as string,
    department: formData.get('department') as string,
    joining_date: formData.get('joining_date') as string,
    status: 'Not Started'
  }

  const { data, error } = await supabase
    .from('employee_onboarding')
    .insert([employeeData])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const employee = data as Employee

  // Create default tasks
  const tasksToInsert = DEFAULT_TASKS.map(task => ({
    employee_id: employee.id,
    task_name: task.task_name,
    is_required: task.is_required,
    is_completed: false
  }))

  const { error: taskError } = await supabase
    .from('onboarding_tasks')
    .insert(tasksToInsert)

  if (taskError) {
    console.error('Failed to create default tasks:', taskError)
  }

  revalidatePath('/hr/onboarding')
  redirect(`/hr/onboarding/${employee.id}`)
}

export async function updateEmployee(id: string, formData: FormData) {
  const supabase = await createClient()

  const employeeData = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    phone: formData.get('phone') as string,
    job_title: formData.get('job_title') as string,
    department: formData.get('department') as string,
    joining_date: formData.get('joining_date') as string,
  }

  const { error } = await supabase
    .from('employee_onboarding')
    .update(employeeData)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/hr/onboarding/${id}`)
  revalidatePath('/hr/onboarding')
}

export async function updateEmployeeData(id: string, data: Partial<Employee>) {
  const supabase = await createClient()
  const { error } = await supabase.from('employee_onboarding').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/hr/onboarding/${id}`)
  revalidatePath('/hr/onboarding')
  return { success: true }
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('employee_onboarding')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/hr/onboarding')
  redirect('/hr/onboarding')
}

export async function deleteEmployeesBulk(ids: string[]) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('employee_onboarding')
    .delete()
    .in('id', ids)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/hr/onboarding')
}

export async function toggleTaskStatus(taskId: string, isCompleted: boolean, employeeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_tasks')
    .update({ is_completed: isCompleted })
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }

  // Calculate new status
  await updateEmployeeStatusFromTasks(employeeId)
  
  revalidatePath(`/hr/onboarding/${employeeId}`)
  revalidatePath('/hr/onboarding')
}

async function updateEmployeeStatusFromTasks(employeeId: string) {
  const supabase = await createClient()

  const { data: tasks, error } = await supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('employee_id', employeeId)

  if (error || !tasks) return

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.is_completed).length
  const requiredTasks = tasks.filter(t => t.is_required)
  const allRequiredCompleted = requiredTasks.every(t => t.is_completed)

  let newStatus: EmployeeStatus = 'Not Started'

  if (completedTasks === 0) {
    newStatus = 'Not Started'
  } else if (allRequiredCompleted) {
    newStatus = 'Completed'
  } else {
    newStatus = 'In Progress'
  }

  await supabase
    .from('employee_onboarding')
    .update({ status: newStatus })
    .eq('id', employeeId)
}

export async function onboardEmployeeAction(data: any) {
  await guardServerAction(['HR', 'Admin'])
  const supabase = await createClient()
  const { createEmployeeAccount, generateEmployeeId } = await import('@/actions/auth.actions')
  const { determineERPRole } = await import('@/config/rbac')

  // Calculate ERP Role based on organizational attributes
  const erpRole = determineERPRole(data.department, data.division, data.designation)

  // Step 1: Generate sequential employee ID server-side
  const employeeId = await generateEmployeeId()
  const employeeName = `${data.first_name} ${data.last_name}`
  const workEmail = data.email

  // Step 2: Create Supabase Auth account
  const accountResult = await createEmployeeAccount(workEmail, employeeName, erpRole)
  if (!accountResult.success) {
    return { success: false, error: accountResult.error || 'Failed to create auth account' }
  }

  // Step 3: Insert employee onboarding record
  const employeeData = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone_number || null,
    job_title: data.designation,
    department: data.department,
    division: data.division || null,
    designation: data.designation || null,
    joining_date: data.joining_date,
    status: 'Not Started',
    dob: data.dob || null,
    gender: data.gender || null,
    personal_email: data.personal_email || null,
    city: data.city || null,
    pincode: data.pincode || null,
    address: data.address || null,
    emergency_contact: JSON.stringify({
      name: data.emergency_name || '',
      relationship: data.emergency_relationship || '',
      phone: data.emergency_phone || ''
    }),
    reporting_manager: data.reporting_manager || null,
    employment_type: data.employment_type || 'Full Time',
    employment_status: data.employment_status || 'Active',
    probation_start_date: data.probation_start_date || null,
    probation_end_date: data.probation_end_date || null,
    probation_period: data.probation_period || null,
    salary: data.employment_type === 'Intern' ? null : data.salary || null,
    basic_salary: data.employment_type === 'Intern' ? null : data.basic_salary || null,
    stipend: data.employment_type === 'Intern' ? data.stipend || null : null,
    experience_type: data.employment_type === 'Intern' ? null : data.experience_type || null,
    experience_years: data.employment_type === 'Intern' ? null : data.experience_years || null,
    experience_months: data.employment_type === 'Intern' ? null : data.experience_months || null,
    employee_id_number: accountResult.employee_id,
    password_hash: null, // Never store plaintext passwords
    profile_photo: data.profile_photo || null,
    documents: data.documents || [],
    role: erpRole, // Dynamically determined based on Management/HR/HR vs others
    is_hod: data.employment_type === 'Intern' ? false : data.is_hod || false
  }

  const { data: inserted, error } = await supabase
    .from('employee_onboarding')
    .insert([employeeData])
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  const employee = inserted as Employee

  // Create default tasks
  const tasksToInsert = DEFAULT_TASKS.map(task => ({
    employee_id: employee.id,
    task_name: task.task_name,
    is_required: task.is_required,
    is_completed: false
  }))

  await supabase.from('onboarding_tasks').insert(tasksToInsert)

  revalidatePath('/hr/onboarding')
  return {
    success: true,
    data: {
      employee_id: accountResult.employee_id,
      temp_password: accountResult.temp_password,
      work_email: workEmail,
    }
  }
}

export async function uploadEmployeeFileAction(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) return { success: false, error: 'No file provided' }

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
  const filePath = `onboarding/${fileName}`

  const { error } = await supabase.storage
    .from('employee-documents')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, path: filePath }
}
