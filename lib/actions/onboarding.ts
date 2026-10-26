'use server'

import { createClient } from '@/lib/supabase/server'
import { Employee, OnboardingTask, EmployeeStatus } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { guardServerAction } from '@/lib/auth'
import { calculateMonthlyBasicSalary } from '@/lib/utils/salary'
import { onboardSchema, validatePhone } from '@/lib/validations/onboard'
import { extractWorkLocation } from '@/lib/utils/work-location'

const DEFAULT_TASKS = [
  { task_name: 'Collect Identity Documents', is_required: true },
  { task_name: 'Set up Email Account', is_required: true },
  { task_name: 'Provide Hardware Equipment', is_required: true },
  { task_name: 'Sign Employment Contract', is_required: true },
  { task_name: 'Office Tour & Introduction', is_required: false },
]

export async function getEmployees(columns = 'id, first_name, last_name, email, phone, job_title, department, designation, division, joining_date, status, employee_id_number, employment_type, employment_status, probation_start_date, probation_end_date, probation_period, salary, stipend, profile_photo, created_at, is_hod, notes'): Promise<Employee[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employee_onboarding')
    .select(columns)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching employees:', error)
    return []
  }

  // Cross-reference profiles.is_hod and active department_hod_assignments to ensure consistent source of truth
  let hodProfiles: any[] | null = null
  let activeAssignments: any[] | null = null

  try {
    const [profRes, assignRes] = await Promise.all([
      supabase.from('profiles').select('id, employee_id, is_hod'),
      supabase.from('department_hod_assignments').select('employee_id, department').eq('is_active', true)
    ])
    hodProfiles = profRes.data
    activeAssignments = assignRes.data
  } catch (err) {
    console.warn('Error fetching HOD cross-references:', err)
  }

  const hodEmpIdSet = new Set<string>()
  const profileIdToEmpId = new Map<string, string>()

  if (hodProfiles) {
    hodProfiles.forEach((p: any) => {
      if (p.employee_id) {
        profileIdToEmpId.set(p.id, p.employee_id)
        if (p.is_hod) {
          hodEmpIdSet.add(p.employee_id)
        }
      }
    })
  }

  if (activeAssignments) {
    activeAssignments.forEach((assign: any) => {
      const empId = profileIdToEmpId.get(assign.employee_id)
      if (empId) {
        hodEmpIdSet.add(empId)
      }
    })
  }

  const isHodTitle = (str?: string | null) => {
    if (!str) return false
    return /\b(hod|head of department)\b/i.test(str)
  }

  const employees = (data || []).map((emp: any) => ({
    ...emp,
    is_hod: Boolean(
      emp.is_hod ||
      (emp.employee_id_number && hodEmpIdSet.has(emp.employee_id_number)) ||
      isHodTitle(emp.job_title) ||
      isHodTitle(emp.designation)
    ),
    work_location: extractWorkLocation(emp),
  })) as Employee[]

  // Default sorting: HODs at top (tier 1), Active regular in middle (tier 2), Inactive at bottom (tier 3)
  // Within each group: joining-date descending, fallback to created_at descending
  employees.sort((a, b) => {
    const isInactiveA = a.employment_status === 'Inactive' || a.employment_status === 'Terminated'
    const isInactiveB = b.employment_status === 'Inactive' || b.employment_status === 'Terminated'
    const tierA = isInactiveA ? 3 : (a.is_hod ? 1 : 2)
    const tierB = isInactiveB ? 3 : (b.is_hod ? 1 : 2)

    if (tierA !== tierB) return tierA - tierB

    const dateA = a.joining_date ? new Date(a.joining_date).getTime() : 0
    const dateB = b.joining_date ? new Date(b.joining_date).getTime() : 0
    if (dateA !== dateB) return dateB - dateA

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
    return createdB - createdA
  })

  return employees
}

export async function getEmployeeById(id: string): Promise<{ employee: Employee | null, tasks: OnboardingTask[] }> {
  const supabase = await createClient()
  
  const [employeeRes, tasksRes] = await Promise.all([
    supabase.from('employee_onboarding').select('*').eq('id', id).single(),
    supabase.from('onboarding_tasks').select('*').eq('employee_id', id).order('created_at', { ascending: true })
  ])

  let employee = employeeRes.data as Employee | null
  if (employee && employee.employee_id_number) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_hod')
      .eq('employee_id', employee.employee_id_number)
      .maybeSingle()
    if (profile?.is_hod) {
      employee.is_hod = true
    } else if (profile?.id) {
      const { data: assign } = await supabase
        .from('department_hod_assignments')
        .select('id')
        .eq('employee_id', profile.id)
        .eq('is_active', true)
        .maybeSingle()
      if (assign) {
        employee.is_hod = true
      }
    }
  }

  if (employee) {
    const isHodTitle = (str?: string | null) => str ? /\b(hod|head of department)\b/i.test(str) : false
    if (isHodTitle(employee.job_title) || isHodTitle(employee.designation)) {
      employee.is_hod = true
    }
    employee.work_location = extractWorkLocation(employee)
  }

  return {
    employee,
    tasks: (tasksRes.data || []) as OnboardingTask[]
  }
}

export async function createEmployee(formData: FormData) {
  await guardServerAction(['HR', 'Admin'])
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

  revalidatePath('/employees')
  revalidatePath('/hr/onboarding')
  redirect(`/employees/${employee.id}`)
}

export async function updateEmployee(id: string, formData: FormData) {
  await guardServerAction(['HR', 'Admin'])
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

  revalidatePath(`/employees/${id}`)
  revalidatePath('/employees')
  revalidatePath(`/hr/onboarding/${id}`)
  revalidatePath('/hr/onboarding')
}

export async function updateEmployeeData(id: string, data: Partial<Employee>): Promise<{ success: boolean; error?: string }> {
  await guardServerAction(['HR', 'Admin'])
  const supabase = await createClient()
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  // 1. Fetch current employee
  const { data: currentEmployee, error: fetchError } = await adminClient
    .from('employee_onboarding')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !currentEmployee) {
    throw new Error('Employee not found')
  }

  const originalEmployeeIdNumber = currentEmployee.employee_id_number

  // 2. Prepare payload
  const updatePayload: any = { ...data }

  // Recalculate basic salary if salary is modified
  if (updatePayload.salary !== undefined) {
    if (updatePayload.salary) {
      updatePayload.basic_salary = calculateMonthlyBasicSalary(Number(updatePayload.salary))
    } else {
      updatePayload.basic_salary = null
    }
  }

  // Ensure compensation fields align with employment type
  if (updatePayload.employment_type !== undefined) {
    if (updatePayload.employment_type === 'Intern') {
      updatePayload.salary = null
      updatePayload.basic_salary = null
    } else {
      updatePayload.stipend = null
    }
  }

  // Handle work_location gracefully with database fallback
  let workLocationValue: string | null = null
  if (updatePayload.work_location !== undefined) {
    workLocationValue = updatePayload.work_location
  }

  let directError = false
  try {
    const { error } = await supabase.from('employee_onboarding').update(updatePayload).eq('id', id)
    if (error) {
      if (error.code === '42703' || error.message?.includes('work_location')) {
        directError = true
      } else {
        const { error: adminErr } = await adminClient.from('employee_onboarding').update(updatePayload).eq('id', id)
        if (adminErr) {
          throw new Error(adminErr.message)
        }
      }
    }
  } catch (err: any) {
    if (err.message?.includes('work_location')) {
      directError = true
    } else {
      const { error: adminErr } = await adminClient.from('employee_onboarding').update(updatePayload).eq('id', id)
      if (adminErr) {
        throw new Error(adminErr.message)
      }
    }
  }

  if (directError) {
    delete updatePayload.work_location
    let existingNotes = currentEmployee.notes || ''
    if (workLocationValue) {
      existingNotes = existingNotes.replace(/\[WORK_LOCATION:\s*[^\]]+\]\n?/gi, '').trim()
      const locTag = `[WORK_LOCATION: ${workLocationValue}]`
      existingNotes = existingNotes ? `${existingNotes}\n${locTag}` : locTag
      updatePayload.notes = existingNotes
    }

    const { error: retryError } = await supabase.from('employee_onboarding').update(updatePayload).eq('id', id)
    if (retryError) {
      const { error: adminRetryErr } = await adminClient.from('employee_onboarding').update(updatePayload).eq('id', id)
      if (adminRetryErr) throw new Error(adminRetryErr.message)
    }
  }

  // 3. Keep profiles in sync if organizational fields change
  try {
    const profileUpdates: any = {}
    if (data.employee_id_number) profileUpdates.employee_id = data.employee_id_number
    if (data.department) profileUpdates.department = data.department
    if (data.designation) profileUpdates.designation = data.designation
    if (data.first_name) profileUpdates.first_name = data.first_name
    if (data.last_name) profileUpdates.last_name = data.last_name

    if (Object.keys(profileUpdates).length > 0 && originalEmployeeIdNumber) {
      await (adminClient as any)
        .from('profiles')
        .update(profileUpdates)
        .eq('employee_id', originalEmployeeIdNumber)
    }
  } catch (syncErr) {
    console.warn('Profile sync warning:', syncErr)
  }

  // 4. Sync email in auth.users if changed and auth user exists
  if (data.email && data.email !== currentEmployee.email) {
    try {
      const { data: usersData } = await adminClient.auth.admin.listUsers()
      const authUser = usersData?.users?.find(u =>
        u.email === currentEmployee.email ||
        (currentEmployee.employee_id_number && u.user_metadata?.employee_id === currentEmployee.employee_id_number)
      )
      if (authUser) {
        await adminClient.auth.admin.updateUserById(authUser.id, { email: data.email })
      }
    } catch (authErr) {
      console.warn('Auth user email sync warning:', authErr)
    }
  }

  revalidatePath(`/employees/${id}`)
  revalidatePath('/employees')
  revalidatePath(`/hr/onboarding/${id}`)
  revalidatePath('/hr/onboarding')
  return { success: true }
}

export async function deleteEmployee(id: string) {
  await guardServerAction(['Admin'])
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('employee_onboarding')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/employees')
  revalidatePath('/hr/onboarding')
  redirect('/employees')
}

export async function deleteEmployeesBulk(ids: string[]) {
  await guardServerAction(['Admin'])
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('employee_onboarding')
    .delete()
    .in('id', ids)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/employees')
  revalidatePath('/hr/onboarding')
}

export async function toggleTaskStatus(taskId: string, isCompleted: boolean, employeeId: string) {
  await guardServerAction(['HR', 'Admin'])
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
  
  revalidatePath(`/employees/${employeeId}`)
  revalidatePath('/employees')
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

  // Server-side validation
  const validationResult = onboardSchema.safeParse(data)
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0]?.message || 'Validation failed. Please verify required fields.'
    }
  }

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
    phone: (() => {
      const p = validatePhone(data.phone_number)
      return p.valid ? `+91 ${p.national}` : (data.phone_number || null)
    })(),
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
    basic_salary: data.employment_type === 'Intern' ? null : (data.salary ? calculateMonthlyBasicSalary(Number(data.salary)) : null),
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

  revalidatePath('/employees')
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
  try {
    await guardServerAction(['HR', 'Admin'])
    const { createAdminClient } = await import('@/lib/supabase/server')
    const admin = await createAdminClient()
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 10MB limit' }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    const filePath = `onboarding/${fileName}`

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error } = await admin.storage
      .from('employee-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, path: filePath }
  } catch (err: any) {
    console.error('uploadEmployeeFileAction error:', err)
    return { success: false, error: err.message || 'Failed to upload document' }
  }
}

