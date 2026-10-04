export type ClientStatus = 'Active' | 'Inactive'

export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'ON_HOLD'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Client {
  id: string
  client_id_display: string
  name: string
  location: string
  // Restricted fields: only accessible by Admin & Manager
  contact_number?: string | null
  whatsapp_number?: string | null
  email?: string | null
  status: ClientStatus
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  created_at: string
  profile?: {
    id: string
    first_name: string
    last_name: string | null
    employee_id: string | null
    department?: string | null
    designation?: string | null
    profile_photo?: string | null
  }
}

export interface TaskSummary {
  total: number
  done: number
  in_progress: number
  in_review: number
  todo: number
  on_hold: number
}

export interface Project {
  id: string
  project_id_display: string
  name: string
  client_id: string
  client_name?: string
  description: string | null
  start_date: string | null
  deadline: string | null
  status: ProjectStatus
  priority: ProjectPriority
  department: string | null
  project_manager_id: string | null
  project_manager_name?: string | null
  objective: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Aggregated data
  members?: ProjectMember[]
  task_summary?: TaskSummary
  progress?: number
  is_overdue?: boolean
}

export interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
  assigned_at: string
  assigned_by?: string | null
  profile?: {
    id: string
    first_name: string
    last_name: string | null
    employee_id: string | null
    department?: string | null
    designation?: string | null
    profile_photo?: string | null
  }
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
  updated_at: string
  user_profile?: {
    id: string
    first_name: string
    last_name: string | null
    profile_photo?: string | null
  }
}

export interface Task {
  id: string
  task_id_display: string
  title: string
  description: string | null
  project_id: string
  project_name?: string
  priority: TaskPriority
  status: TaskStatus
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  worked_hours: number | null
  dependencies: string[]
  attachments: Array<{ name: string; url: string; size?: number }>
  order_index: number
  created_by: string | null
  created_at: string
  updated_at: string
  assignees?: TaskAssignee[]
  comments?: TaskComment[]
  comments_count?: number
  is_overdue?: boolean
}

export interface ProjectActivity {
  id: string
  project_id: string
  task_id?: string | null
  user_id?: string | null
  activity_type: string
  details?: Record<string, any>
  created_at: string
  user_profile?: {
    id: string
    first_name: string
    last_name: string | null
  }
}

export interface ProjectDashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  overdueProjects: number
}

export interface ProjectTeamMemberStats {
  userId: string
  name: string
  designation: string
  assignedTasks: number
  completedTasks: number
  operationalHours: number
  profilePhoto?: string | null
}
