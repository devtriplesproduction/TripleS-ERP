'use server'

import { createClient } from '@/lib/supabase/server'
import { Employee, OnboardingTask, EmployeeStatus } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
  const supabase = await createClient()

  const employeeData = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone_number || null,
    job_title: data.designation,
    department: data.department,
    joining_date: data.joining_date,
    status: 'Not Started',
    dob: data.dob || null,
    gender: data.gender || null,
    personal_email: data.personal_email || null,
    address: data.address || null,
    emergency_contact: data.emergency_contact || null,
    employment_type: data.employment_type || 'full-time',
    salary: data.salary || null,
    experience: data.experience || null,
    employee_id_number: data.employee_id_number,
    password_hash: data.password, // Ideally hashed with bcrypt
    profile_photo: data.profile_photo || null,
    documents: data.documents || []
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
  return { success: true, data: { employee_id: employee.employee_id_number || employee.id } }
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
    .upload(filePath, file)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, path: filePath }
}
