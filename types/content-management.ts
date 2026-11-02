export type ContentStatus =
  | 'To Do'
  | 'In Progress'
  | 'In Review'
  | 'Completed'
  | 'Draft'
  | 'Changes Requested'
  | 'Approved'
  | 'Published'
  | 'Rejected'
  | 'Archived'

export type ContentPriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type ReviewDecision = 'Approved' | 'Rejected' | 'Changes Requested'
export type AssignedRole =
  | 'Developer'
  | 'Team Lead'
  | 'Content Strategist'
  | 'Copywriter'
  | 'Social Media Manager'
  | 'SEO Specialist'
  | 'Video Editor'
  | 'Graphic Designer'
export type DeadlineState = 'Upcoming' | 'Pending' | 'Overdue' | 'Completed'
export type FreshnessState = 'Fresh' | 'Due Soon' | 'Outdated' | 'Unreviewed'

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

export interface ContentVersionRecord {
  id: string
  content_id: string
  version_number: number
  version_label: string
  title: string
  summary: string
  body: string
  content_type: string
  category?: string | null
  tags: string[]
  status: ContentStatus
  created_at: string
  created_by_id: string
  created_by_name: string
  change_summary?: string
}

export interface ContentCategory {
  id: string
  name: string
  description?: string
  color?: string
  department?: string
  is_active: boolean
  created_at: string
  created_by?: string
}

export interface ContentTag {
  id: string
  name: string
  color?: string
  created_at: string
}

export interface ReviewRecord {
  id: string
  reviewer_id: string
  reviewer_name: string
  decision: ReviewDecision
  comment: string
  feedback?: string
  required_corrections?: string[]
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
    | 'Version Restored'
    | 'Quality Flag Updated'
  user_id: string
  user_name: string
  details: string
  created_at: string
  timestamp_display: string
}

export interface ContentNotificationRecord {
  id: string
  user_id: string
  type: 'New Assignment' | 'Approaching Deadline' | 'Overdue' | 'Changes Requested' | 'Review Due'
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
  start_date?: string | null
  due_date?: string | null
  instructions?: string | null
  progress?: number | null
  reference_attachment?: string | null
  published_at?: string | null

  // Version Management
  version?: number
  version_number?: number | string
  version_history?: ContentVersionRecord[]

  // Categorization & Organization
  category?: string | null
  department?: string | null
  product?: string | null

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
  reviews?: ReviewRecord[]

  // Content Quality & Freshness
  last_reviewed_date?: string | null
  last_reviewed_at?: string | null
  next_review_date?: string | null
  review_frequency_days?: number | null
  review_frequency?: string | number | null
  is_duplicate?: boolean
  duplicate_of_id?: string | null
  duplicate_of_title?: string | null
  duplicate_reason?: string | null
  related_content_ids?: string[]
  follow_up_required?: boolean
  follow_up_reason?: string | null
  follow_up_note?: string | null
  follow_up_date?: string | null

  // Digital Marketing Agency Specifications
  client_name?: string | null
  campaign_name?: string | null
  target_platforms?: string[]
  primary_platform?: string | null
  target_audience?: string | null
  content_objective?: string | null
  tone_of_voice?: string | null
  call_to_action?: string | null
  primary_keywords?: string[]
  hashtags?: string[]
  creative_format?: string | null
  creative_brief?: string | null
  scheduled_publish_time?: string | null

  // Media & Attachments
  attachments?: ContentAttachment[]
}

export interface ContentFilterOptions {
  search?: string
  status?: string
  contentType?: string
  projectId?: string
  assigneeId?: string
  ownerId?: string
  category?: string
  tag?: string
  priority?: string
  deadlineState?: string
  freshnessState?: string
  startDate?: string
  endDate?: string
  sortBy?: 'newest' | 'last_updated' | 'due_date' | 'title'
  sortOrder?: 'asc' | 'desc'
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
  category?: string | null
  department?: string | null
  product?: string | null
  tags?: string[]
  start_date?: string | null
  due_date?: string | null
  instructions?: string | null
  progress?: number | null
  reference_attachment?: string | null
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  assigned_role?: AssignedRole
  priority?: ContentPriority
  attachments?: ContentAttachment[]
  change_summary?: string
  published_at?: string | null
  last_reviewed_date?: string | null
  last_reviewed_at?: string | null
  next_review_date?: string | null
  review_frequency_days?: number | null
  review_frequency?: string | number | null
  duplicate_reason?: string | null
  follow_up_note?: string | null
  // Digital Marketing Agency Specifications
  client_name?: string | null
  campaign_name?: string | null
  target_platforms?: string[]
  primary_platform?: string | null
  target_audience?: string | null
  content_objective?: string | null
  tone_of_voice?: string | null
  call_to_action?: string | null
  primary_keywords?: string[]
  hashtags?: string[]
  creative_format?: string | null
  creative_brief?: string | null
  scheduled_publish_time?: string | null
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
  category?: string | null
  department?: string | null
  product?: string | null
  tags?: string[]
  start_date?: string | null
  due_date?: string | null
  instructions?: string | null
  progress?: number | null
  reference_attachment?: string | null
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  assigned_role?: AssignedRole
  priority?: ContentPriority
  attachments?: ContentAttachment[]
  change_summary?: string
  published_at?: string | null
  last_reviewed_date?: string | null
  last_reviewed_at?: string | null
  next_review_date?: string | null
  review_frequency_days?: number | null
  review_frequency?: string | number | null
  is_duplicate?: boolean
  duplicate_of_id?: string | null
  duplicate_of_title?: string | null
  duplicate_reason?: string | null
  related_content_ids?: string[]
  follow_up_required?: boolean
  follow_up_reason?: string | null
  follow_up_note?: string | null
  follow_up_date?: string | null
  // Digital Marketing Agency Specifications
  client_name?: string | null
  campaign_name?: string | null
  target_platforms?: string[]
  primary_platform?: string | null
  target_audience?: string | null
  content_objective?: string | null
  tone_of_voice?: string | null
  call_to_action?: string | null
  primary_keywords?: string[]
  hashtags?: string[]
  creative_format?: string | null
  creative_brief?: string | null
  scheduled_publish_time?: string | null
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

export function computeFreshnessState(item: ContentItem): FreshnessState {
  if (item.status !== 'Published' && item.status !== 'Approved') {
    return 'Unreviewed'
  }
  if (!item.last_reviewed_date && !item.next_review_date) {
    return 'Unreviewed'
  }
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  if (item.next_review_date) {
    const nextDate = item.next_review_date.slice(0, 10)
    if (nextDate < todayStr) {
      return 'Outdated'
    }
    const diffTime = new Date(item.next_review_date).getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays <= 14) {
      return 'Due Soon'
    }
    return 'Fresh'
  }

  if (item.last_reviewed_date) {
    const last = new Date(item.last_reviewed_date)
    const diffTime = now.getTime() - last.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const maxDays = item.review_frequency_days || 90
    if (diffDays > maxDays) {
      return 'Outdated'
    }
    if (diffDays > maxDays - 14) {
      return 'Due Soon'
    }
    return 'Fresh'
  }

  return 'Fresh'
}
