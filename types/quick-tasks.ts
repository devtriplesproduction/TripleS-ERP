/**
 * TripleS ERP — Quick Tasks Types
 * Lightweight casual task assignment data structures.
 */

export type QuickTaskPriority = 'Low' | 'Medium' | 'High'
export type QuickTaskStatus = 'Pending' | 'Completed' | 'Cancelled'

export interface QuickTask {
  id: string
  title: string
  description?: string | null
  assigned_by: string
  assigned_to: string
  due_date?: string | null
  priority: QuickTaskPriority
  status: QuickTaskStatus
  completed_at?: string | null
  completed_by?: string | null
  created_at: string
  updated_at: string

  // Resolved metadata for UI display
  assigned_by_name?: string
  assigned_to_name?: string
  assigned_to_email?: string
  assigned_to_department?: string | null
  completed_by_name?: string
}

export interface CreateQuickTaskInput {
  title: string
  description?: string
  assigned_to: string[] // Array of profile IDs (single or multiple recipients)
  due_date?: string
  priority?: QuickTaskPriority
}

export interface UpdateQuickTaskInput {
  title?: string
  description?: string
  due_date?: string | null
  priority?: QuickTaskPriority
  status?: QuickTaskStatus
}

export interface QuickTaskFilterOptions {
  status?: 'All' | 'Pending' | 'Completed' | 'Cancelled'
  assigneeId?: string
  dueDate?: string
  search?: string
}

export interface QuickTasksActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface AssignableUser {
  id: string
  name: string
  email?: string
  role: string
  employee_id?: string | null
  department?: string | null
  designation?: string | null
}
