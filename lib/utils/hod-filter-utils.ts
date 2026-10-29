import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { Project, Task } from '@/types/project-management'
import { HODFilterValues } from '@/components/hod/HODFilterBar'

dayjs.extend(isBetween)

/**
 * Checks if a specific date or date-span falls within or overlaps [startDate, endDate]
 */
export function isDateInRange(
  dateStr: string | null | undefined,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true
  if (!dateStr) return false

  const d = dayjs(dateStr).format('YYYY-MM-DD')
  if (startDate && d < startDate) return false
  if (endDate && d > endDate) return false
  return true
}

/**
 * Checks if a project's timeline (start_date to deadline) overlaps with the filter date range [startDate, endDate]
 */
export function isProjectInDateRange(
  project: Project,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true

  const pStart = project.start_date ? dayjs(project.start_date).format('YYYY-MM-DD') : null
  const pEnd = project.deadline ? dayjs(project.deadline).format('YYYY-MM-DD') : null
  const pCreated = project.created_at ? dayjs(project.created_at).format('YYYY-MM-DD') : null

  // If both start and end dates are specified in project
  if (pStart && pEnd) {
    if (startDate && pEnd < startDate) return false
    if (endDate && pStart > endDate) return false
    return true
  }

  // If only deadline is set
  if (pEnd) {
    if (startDate && pEnd < startDate) return false
    if (endDate && pEnd > endDate) return false
    return true
  }

  // If only start date is set
  if (pStart) {
    if (startDate && pStart < startDate) return false
    if (endDate && pStart > endDate) return false
    return true
  }

  // Fallback to created_at
  if (pCreated) {
    if (startDate && pCreated < startDate) return false
    if (endDate && pCreated > endDate) return false
    return true
  }

  return true
}

/**
 * Checks if a task's due_date or created_at falls within the filter date range [startDate, endDate]
 */
export function isTaskInDateRange(
  task: Task,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true

  const tDue = task.due_date ? dayjs(task.due_date).format('YYYY-MM-DD') : null
  const tCreated = task.created_at ? dayjs(task.created_at).format('YYYY-MM-DD') : null

  if (tDue) {
    if (startDate && tDue < startDate) return false
    if (endDate && tDue > endDate) return false
    return true
  }

  if (tCreated) {
    if (startDate && tCreated < startDate) return false
    if (endDate && tCreated > endDate) return false
    return true
  }

  return true
}

/**
 * Filter projects based on Date Range, Project ID, Developer ID, and Project Status
 */
export function filterProjects(
  projects: Project[],
  filters: HODFilterValues,
  tasks?: Task[]
): Project[] {
  const now = new Date()

  return projects.filter((p) => {
    // 1. Project ID filter
    if (filters.projectId && filters.projectId !== 'ALL' && p.id !== filters.projectId) {
      return false
    }

    // 2. Project Status filter
    if (filters.projectStatus && filters.projectStatus !== 'ALL') {
      const pStatus = (p.status || '').toUpperCase()
      if (filters.projectStatus === 'OVERDUE') {
        const isCompleted = pStatus === 'COMPLETED' || pStatus === 'CANCELLED'
        const isOverdue = p.is_overdue || (p.deadline && new Date(p.deadline) < now && !isCompleted)
        if (!isOverdue) return false
      } else if (pStatus !== filters.projectStatus.toUpperCase()) {
        return false
      }
    }

    // 3. Developer ID filter
    if (filters.developerId && filters.developerId !== 'ALL') {
      const isMember = p.members?.some((m) => m.user_id === filters.developerId)
      const isManager = p.project_manager_id === filters.developerId
      const hasAssignedTask = tasks?.some(
        (t) => t.project_id === p.id && t.assignees?.some((a) => a.user_id === filters.developerId)
      )
      if (!isMember && !isManager && !hasAssignedTask) {
        return false
      }
    }

    // 4. Date Range filter
    if (filters.startDate || filters.endDate) {
      if (!isProjectInDateRange(p, filters.startDate, filters.endDate)) {
        return false
      }
    }

    return true
  })
}

/**
 * Filter tasks based on Date Range, Project ID, Developer ID, Project Status, and Task Status
 */
export function filterTasks(
  tasks: Task[],
  filters: HODFilterValues,
  projects?: Project[]
): Task[] {
  const now = new Date()

  return tasks.filter((t) => {
    // 1. Project ID filter
    if (filters.projectId && filters.projectId !== 'ALL' && t.project_id !== filters.projectId) {
      return false
    }

    // 2. Developer ID filter
    if (filters.developerId && filters.developerId !== 'ALL') {
      const hasAssignee = t.assignees?.some((a) => a.user_id === filters.developerId)
      if (!hasAssignee) return false
    }

    // 3. Task Status filter
    if (filters.taskStatus && filters.taskStatus !== 'ALL') {
      const tStatus = (t.status || '').toUpperCase()
      if (tStatus !== filters.taskStatus.toUpperCase()) {
        return false
      }
    }

    // 4. Project Status filter (via parent project)
    if (filters.projectStatus && filters.projectStatus !== 'ALL' && projects) {
      const parentProject = projects.find((p) => p.id === t.project_id)
      if (!parentProject) return false

      const pStatus = (parentProject.status || '').toUpperCase()
      if (filters.projectStatus === 'OVERDUE') {
        const isCompleted = pStatus === 'COMPLETED' || pStatus === 'CANCELLED'
        const isOverdue =
          parentProject.is_overdue ||
          (parentProject.deadline && new Date(parentProject.deadline) < now && !isCompleted)
        if (!isOverdue) return false
      } else if (pStatus !== filters.projectStatus.toUpperCase()) {
        return false
      }
    }

    // 5. Date Range filter
    if (filters.startDate || filters.endDate) {
      if (!isTaskInDateRange(t, filters.startDate, filters.endDate)) {
        return false
      }
    }

    return true
  })
}
