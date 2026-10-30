export type ContentStatus =
  | 'Draft'
  | 'In Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Published'
  | 'Rejected'
  | 'Archived'

export type ContentPriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type ReviewDecision = 'Approved' | 'Rejected' | 'Changes Requested'
export type AssignedRole = 'Developer' | 'Team Lead'
export type DeadlineState = 'Upcoming' | 'Pending' | 'Overdue' | 'Completed'

export interface ContentAttachment {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  file_url: string
  uploaded_by_id: string
  uploaded_by_name: string
  created_at: string
  content_id?: string | null
  content_title?: string | null
  project_id?: string | null
  project_name?: string | null
  is_private?: boolean
}

export interface ReviewRecord {
  id: string
  reviewer_id: string
  reviewer_name: string
  decision: ReviewDecision
  comment: string
  date: string
  time: string
  created_at: string
}

export interface AssignmentRecord {
  id: string
  previous_assignee_id?: string | null
  previous_assignee_name?: string | null
  new_assignee_id: string
  new_assignee_name: string
  changed_by_id: string
  changed_by_name: string
  date: string
  time: string
  reason?: string | null
  created_at: string
}

export interface ContentActivityRecord {
  id: string
  content_id: string
  content_title: string
  action:
    | 'Created'
    | 'Assigned'
    | 'Reassigned'
    | 'Submitted'
    | 'Changes Requested'
    | 'Approved'
    | 'Rejected'
    | 'Published'
    | 'Archived'
  user_id: string
  user_name: string
  details: string
  created_at: string
  timestamp_display: string
}

export interface ContentNotificationRecord {
  id: string
  user_id: string
  type: 'New Assignment' | 'Approaching Deadline' | 'Overdue' | 'Changes Requested'
  title: string
  message: string
  content_id: string
  content_title: string
  reason?: string
  is_read: boolean
  created_at: string
}

export interface ContentType {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  created_by?: string
}

export interface ContentItem {
  id: string
  title: string
  summary: string
  body: string
  content_type: string
  project_id?: string | null
  project_name?: string | null
  owner_id: string
  owner_name: string
  status: ContentStatus
  tags: string[]
  created_at: string
  updated_at: string
  due_date?: string | null

  // Assignment & Reassignment
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  assigned_role?: AssignedRole
  priority?: ContentPriority
  completion_date?: string | null
  assignment_history?: AssignmentRecord[]

  // Approval & Review
  submission_date?: string | null
  current_reviewer_id?: string | null
  current_reviewer_name?: string | null
  review_history?: ReviewRecord[]

  // Media & Attachments
  attachments?: ContentAttachment[]
}

export interface ContentFilterOptions {
  search?: string
  status?: string
  contentType?: string
  projectId?: string
  assigneeId?: string
  priority?: string
  deadlineState?: string
  page?: number
  limit?: number
}

export interface CreateContentInput {
  title: string
  summary: string
  body: string
  content_type: string
  project_id?: string | null
  project_name?: string | null
  owner_id?: string
  owner_name?: string
  status?: ContentStatus
  tags?: string[]
  due_date?: string | null
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  assigned_role?: AssignedRole
  priority?: ContentPriority
  attachments?: ContentAttachment[]
}

export interface UpdateContentInput {
  title?: string
  summary?: string
  body?: string
  content_type?: string
  project_id?: string | null
  project_name?: string | null
  owner_id?: string
  owner_name?: string
  status?: ContentStatus
  tags?: string[]
  due_date?: string | null
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  assigned_role?: AssignedRole
  priority?: ContentPriority
  attachments?: ContentAttachment[]
}

export function computeDeadlineState(dueDate?: string | null, status?: ContentStatus): DeadlineState {
  if (status === 'Published' || status === 'Approved') {
    return 'Completed'
  }
  if (!dueDate) {
    return 'Pending'
  }
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const dueStr = dueDate.slice(0, 10)
  if (dueStr < todayStr) {
    return 'Overdue'
  }
  const due = new Date(dueDate)
  const diffTime = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 3) {
    return 'Upcoming'
  }
  return 'Pending'
}
