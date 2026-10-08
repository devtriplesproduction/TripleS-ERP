'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export type SearchCategory = 
  | 'EMPLOYEES'
  | 'PROJECTS'
  | 'TASKS'
  | 'CLIENTS'
  | 'EOD_REPORTS'
  | 'LEAVE'
  | 'ANNOUNCEMENTS'
  | 'RULEBOOK'
  | 'DOCUMENTS'

export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  category: SearchCategory
  url: string
  avatar?: string
}

export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  const user = await getCurrentUser()
  if (!user || !query || query.trim().length < 2) return []

  const supabase = await createClient()
  const searchTerm = `%${query.trim()}%`
  const results: SearchResult[] = []

  const isAdminOrHR = user.role === 'Admin' || user.role === 'HR'
  const isManager = user.role === 'Manager'

  // 1. Employees
  // Employees can only see basic details, Admin/HR see more. We just return a standard format.
  let employeeQuery = supabase
    .from('employee_onboarding')
    .select('id, employee_id_number, first_name, last_name, email, department, designation, job_title, profile_photo')
    .or(`first_name.ilike."${searchTerm}",last_name.ilike."${searchTerm}",email.ilike."${searchTerm}",employee_id_number.ilike."${searchTerm}",department.ilike."${searchTerm}",designation.ilike."${searchTerm}",job_title.ilike."${searchTerm}"`)
    .limit(5)
  
  if (!isAdminOrHR && !isManager) {
    employeeQuery = employeeQuery.eq('email', user.email)
  }

  const { data: employees } = await employeeQuery
  
  if (employees) {
    employees.forEach((emp: any) => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown'
      results.push({
        id: `emp-${emp.id}`,
        title: fullName,
        subtitle: `${emp.employee_id_number || ''} · ${emp.department || 'No Dept'} · ${emp.designation || emp.job_title || 'No Role'}`,
        category: 'EMPLOYEES',
        url: `/hr/onboarding/${emp.id}`,
        avatar: emp.profile_photo
      })
    })
  }

  // 2. Projects
  // Assuming 'projects' table
  let projectQuery = supabase
    .from('projects')
    .select('id, project_id_display, name, status')
    .or(`name.ilike."${searchTerm}",project_id_display.ilike."${searchTerm}",status.ilike."${searchTerm}"`)
    .limit(5)
  
  const { data: projects } = await projectQuery
  
  if (projects) {
    projects.forEach((proj: any) => {
      results.push({
        id: `proj-${proj.id}`,
        title: proj.name,
        subtitle: `${proj.project_id_display || proj.id} · Status: ${proj.status}`,
        category: 'PROJECTS',
        url: `/projects/details/${proj.id}`
      })
    })
  }

  // 3. Tasks
  let taskQuery = supabase
    .from('tasks')
    .select('id, task_id_display, title, status')
    .or(`title.ilike."${searchTerm}",task_id_display.ilike."${searchTerm}"`)
    .limit(5)
    
  // If not admin/hr, only show tasks they are assigned to or created
  // In a real app we'd do a join or check project membership, keeping it simple for now based on RBAC instructions.
  
  const { data: tasks } = await taskQuery
  
  if (tasks) {
    tasks.forEach((task: any) => {
      results.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: `${task.task_id_display || task.id} · Status: ${task.status}`,
        category: 'TASKS',
        url: `/tasks/details/${task.id}` // Placeholder route
      })
    })
  }

  // 4. Clients
  if (isAdminOrHR || isManager) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, client_id_display')
      .or(`name.ilike."${searchTerm}"`)
      .limit(5)
      
    if (clients) {
      clients.forEach((client: any) => {
        results.push({
          id: `client-${client.id}`,
          title: client.name,
          subtitle: `Client ID: ${client.client_id_display || client.id}`,
          category: 'CLIENTS',
          url: `/clients/${client.id}`
        })
      })
    }
  }

  // 5. EOD Reports
  let eodQuery = supabase
    .from('eod_reports')
    .select('id, report_date, tasks_accomplished, employee_id, profiles!inner(first_name, last_name, employee_id)')
    .or(`tasks_accomplished.ilike."${searchTerm}",report_date.ilike."${searchTerm}"`)
    .limit(5)

  if (!isAdminOrHR) {
    // Only see own EOD
    eodQuery = eodQuery.eq('employee_id', user.id)
  }
  
  const { data: eods } = await eodQuery
  
  if (eods) {
    eods.forEach((eod: any) => {
      const name = `${eod.profiles?.first_name || ''} ${eod.profiles?.last_name || ''}`.trim() || 'Unknown'
      results.push({
        id: `eod-${eod.id}`,
        title: `${name} - EOD`,
        subtitle: `${eod.report_date} · ${eod.tasks_accomplished?.substring(0, 50)}...`,
        category: 'EOD_REPORTS',
        url: isAdminOrHR ? `/admin-eod` : `/employee-eod`
      })
    })
  }

  // 6. Leave
  let leaveQuery = supabase
    .from('leave_requests')
    .select('id, leave_type, status, start_date, employee_id, profiles!inner(first_name, last_name)')
    .or(`leave_type.ilike."${searchTerm}",status.ilike."${searchTerm}"`)
    .limit(5)
    
  if (!isAdminOrHR) {
    // Only see own leave
    leaveQuery = leaveQuery.eq('employee_id', user.id)
  }
  
  const { data: leaves } = await leaveQuery
  
  if (leaves) {
    leaves.forEach((leave: any) => {
      const name = `${leave.profiles?.first_name || ''} ${leave.profiles?.last_name || ''}`.trim() || 'Unknown'
      results.push({
        id: `leave-${leave.id}`,
        title: `${name} - ${leave.leave_type}`,
        subtitle: `${leave.start_date} · Status: ${leave.status}`,
        category: 'LEAVE',
        url: isAdminOrHR ? `/hr/leave` : `/employee-holiday`
      })
    })
  }

  // 7. Announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, message')
    .or(`title.ilike."${searchTerm}",message.ilike."${searchTerm}"`)
    .limit(5)
    
  if (announcements) {
    announcements.forEach((ann: any) => {
      results.push({
        id: `ann-${ann.id}`,
        title: ann.title,
        subtitle: `${ann.message?.substring(0, 50)}...`,
        category: 'ANNOUNCEMENTS',
        url: `/announcements`
      })
    })
  }

  // 8. Rulebook
  const { data: rules } = await supabase
    .from('company_rules')
    .select('id, title, category, description')
    .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
    .limit(5)
    
  if (rules) {
    rules.forEach((rule: any) => {
      results.push({
        id: `rule-${rule.id}`,
        title: rule.title,
        subtitle: `${rule.category} · ${rule.description?.substring(0, 50)}...`,
        category: 'RULEBOOK',
        url: `/rulebook`
      })
    })
  }
  
  // 9. Documents
  // Simple document mock/query if there's a table
  if (isAdminOrHR) {
    const { data: docs } = await supabase
      .from('employee_documents')
      .select('id, document_type, file_name, employee_id_number, employee_onboarding!inner(employee_name)')
      .or(`document_type.ilike."${searchTerm}",file_name.ilike."${searchTerm}"`)
      .limit(5)
      
    if (docs) {
      docs.forEach((doc: any) => {
        results.push({
          id: `doc-${doc.id}`,
          title: doc.file_name || doc.document_type,
          subtitle: `${doc.employee_onboarding?.employee_name || 'Unknown'} · ${doc.document_type}`,
          category: 'DOCUMENTS',
          url: `/hr/directory/${doc.employee_id_number}?tab=documents`
        })
      })
    }
  } else {
    // Employee viewing own docs
    const { data: docs } = await supabase
      .from('employee_documents')
      .select('id, document_type, file_name')
      .eq('employee_id_number', user.employee_id || '')
      .or(`document_type.ilike."${searchTerm}",file_name.ilike."${searchTerm}"`)
      .limit(5)
      
    if (docs) {
      docs.forEach((doc: any) => {
        results.push({
          id: `doc-${doc.id}`,
          title: doc.file_name || doc.document_type,
          subtitle: doc.document_type,
          category: 'DOCUMENTS',
          url: `/employee-profile`
        })
      })
    }
  }

  return results
}
