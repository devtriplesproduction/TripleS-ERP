/**
 * TripleS ERP — Quick Tasks Types
 * Lightweight casual task assignment and personal tasks data structures.
 */

export type QuickTaskPriority = 'Low' | 'Medium' | 'High'
export type QuickTaskStatus = 'Pending' | 'Completed' | 'Cancelled'

export interface QuickTask {
  id: string
  title: string
  description?: string | null
  assigned_by: string
  assigned_to: string
  is_personal?: boolean
  is_read?: boolean
  seen_at?: string | null
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
  description: string // Primary field: multiline task text or notes
  title?: string // Optional fallback title
  assigned_to?: string[] // Optional array of profile IDs. If omitted or empty, creates personal task
  due_date?: string
  priority?: QuickTaskPriority
}

export interface UpdateQuickTaskInput {
  description?: string
  title?: string
  is_read?: boolean
  due_date?: string | null
  priority?: QuickTaskPriority
  status?: QuickTaskStatus
}

export interface QuickTaskFilterOptions {
  status?: 'All' | 'Pending' | 'Completed' | 'Cancelled'
  assigneeId?: string
  type?: 'All' | 'Personal' | 'Assigned'
  dueDate?: string
  search?: string
}

export interface QuickTasksBadgeState {
  pendingCount: number
  hasUnreadAssignment: boolean
  unreadAssignmentCount: number
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
