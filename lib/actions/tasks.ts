'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canManageTasks, canUpdateTaskStatus } from '@/lib/permissions/project-management'
import { Task, TaskStatus, TaskPriority, TaskComment } from '@/types/project-management'
import { revalidatePath } from 'next/cache'

export interface CreateTaskInput {
  title: string
  description?: string | null
  project_id: string
  priority?: TaskPriority
  status?: TaskStatus
  start_date?: string | null
  due_date?: string | null
  estimated_hours?: number | null
  worked_hours?: number | null
  dependencies?: string[]
  attachments?: Array<{ name: string; url: string; size?: number }>
  assignees?: string[] // user UUIDs
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string
}

async function generateTaskId(): Promise<string> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('tasks')
    .select('task_id_display')
    .order('created_at', { ascending: false })
    .limit(100)

  let maxNum = 0
  if (data) {
    for (const row of data) {
      const match = row.task_id_display?.match(/^TSK-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
  }

  return `TSK-${String(maxNum + 1).padStart(3, '0')}`
}

/**
 * Fetch tasks for Kanban board or project details.
 */
export async function getTasks(filters?: {
  projectId?: string
  status?: string
  priority?: string
  search?: string
}): Promise<{ success: boolean; data: Task[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, data: [], error: 'Authentication required' }
    }

    const admin = await createAdminClient()

    const isPrivileged = user.role === 'Admin' || user.role === 'HR' || user.is_hod
    let allowedTaskIds: string[] | null = null

    if (!isPrivileged) {
      const { data: userTasks } = await admin
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', user.id)
      
      allowedTaskIds = (userTasks || []).map((t: any) => t.task_id)

      if (allowedTaskIds.length === 0) {
        return { success: true, data: [] }
      }
    }

    let query = admin
      .from('tasks')
      .select(`
        *,
        project:projects(id, name),
        assignees:task_assignees(
          id, user_id, assigned_at,
          profile:profiles!task_assignees_user_id_fkey(id, first_name, last_name, employee_id)
        ),
        comments:task_comments(
          id, user_id, comment, created_at, updated_at,
          user_profile:profiles(id, first_name, last_name)
        )
      `)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })

    if (filters?.projectId && filters.projectId !== 'ALL') {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status)
    }

    if (filters?.priority && filters.priority !== 'ALL') {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    if (allowedTaskIds) {
      query = query.in('id', allowedTaskIds)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
        return { success: true, data: [] }
      }
      return { success: false, data: [], error: error.message }
    }

    const now = new Date()

    const tasks: Task[] = (data || []).map((row: any) => {
      const is_overdue = row.due_date && new Date(row.due_date) < now && row.status !== 'DONE'
      return {
        id: row.id,
        task_id_display: row.task_id_display,
        title: row.title,
        description: row.description,
        project_id: row.project_id,
        project_name: row.projects?.name || row.project?.name || null,
        priority: row.priority,
        status: row.status,
        start_date: row.start_date,
        due_date: row.due_date,
        estimated_hours: row.estimated_hours ? Number(row.estimated_hours) : null,
        worked_hours: row.worked_hours ? Number(row.worked_hours) : null,
        dependencies: row.dependencies || [],
        attachments: row.attachments || [],
        order_index: row.order_index || 0,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        assignees: row.assignees || [],
        comments: row.comments || [],
        comments_count: (row.comments || []).length,
        is_overdue: !!is_overdue,
      }
    })

    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Failed to fetch tasks' }
  }
}

/**
 * Fetch tasks for the current logged-in employee:
 * Categorized into Today, Pending, Overdue, Recently Assigned, Completed, and associated Projects.
 */
export async function getMyTasks(): Promise<{
  success: boolean
  data?: {
    todayTasks: Task[]
    pendingTasks: Task[]
    overdueTasks: Task[]
    recentlyAssignedTasks: Task[]
    completedTasks: Task[]
    allAssignedTasks: Task[]
    userProjects: Array<{ id: string; name: string; taskCount: number }>
  }
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const admin = await createAdminClient()

    // 1. Get task IDs assigned to the user
    const { data: assignments, error: assignErr } = await admin
      .from('task_assignees')
      .select('task_id, assigned_at')
      .eq('user_id', user.id)

    if (assignErr) {
      if (assignErr.code === 'PGRST205' || assignErr.message.includes('does not exist')) {
        return {
          success: true,
          data: {
            todayTasks: [],
            pendingTasks: [],
            overdueTasks: [],
            recentlyAssignedTasks: [],
            completedTasks: [],
            allAssignedTasks: [],
            userProjects: [],
          }
        }
      }
      return { success: false, error: assignErr.message }
    }

    const taskIds = (assignments || []).map(a => a.task_id)

    if (taskIds.length === 0) {
      return {
        success: true,
        data: {
          todayTasks: [],
          pendingTasks: [],
          overdueTasks: [],
          recentlyAssignedTasks: [],
          completedTasks: [],
          allAssignedTasks: [],
          userProjects: [],
        }
      }
    }

    // 2. Fetch full tasks
    const { data: tasksData, error: tasksErr } = await admin
      .from('tasks')
      .select(`
        *,
        project:projects(id, name),
        assignees:task_assignees(
          id, user_id, assigned_at,
          profile:profiles!task_assignees_user_id_fkey(id, first_name, last_name, employee_id)
        ),
        comments:task_comments(
          id, user_id, comment, created_at,
          user_profile:profiles(id, first_name, last_name)
        )
      `)
      .in('id', taskIds)
      .order('due_date', { ascending: true })

    if (tasksErr) {
      return { success: false, error: tasksErr.message }
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const allAssignedTasks: Task[] = (tasksData || []).map((row: any) => {
      const is_overdue = row.due_date && row.due_date < todayStr && row.status !== 'DONE'
      return {
        id: row.id,
        task_id_display: row.task_id_display,
        title: row.title,
        description: row.description,
        project_id: row.project_id,
        project_name: row.project?.name || null,
        priority: row.priority,
        status: row.status,
        start_date: row.start_date,
        due_date: row.due_date,
        estimated_hours: row.estimated_hours ? Number(row.estimated_hours) : null,
        worked_hours: row.worked_hours ? Number(row.worked_hours) : null,
        dependencies: row.dependencies || [],
        attachments: row.attachments || [],
        order_index: row.order_index || 0,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        assignees: row.assignees || [],
        comments: row.comments || [],
        comments_count: (row.comments || []).length,
        is_overdue: !!is_overdue,
      }
    })

    const todayTasks = allAssignedTasks.filter(t => t.due_date === todayStr && t.status !== 'DONE')
    const overdueTasks = allAssignedTasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== 'DONE')
    const pendingTasks = allAssignedTasks.filter(t => t.status !== 'DONE' && (!t.due_date || t.due_date >= todayStr))
    const completedTasks = allAssignedTasks.filter(t => t.status === 'DONE')

    const assignmentDateMap = new Map<string, Date>()
    for (const a of assignments) {
      assignmentDateMap.set(a.task_id, new Date(a.assigned_at))
    }

    const recentlyAssignedTasks = allAssignedTasks.filter(t => {
      const assignedAt = assignmentDateMap.get(t.id)
      return assignedAt && assignedAt >= sevenDaysAgo
    })

    // Group projects
    const projectMap = new Map<string, { id: string; name: string; taskCount: number }>()
    for (const t of allAssignedTasks) {
      if (t.project_id) {
        const existing = projectMap.get(t.project_id) || {
          id: t.project_id,
          name: t.project_name || 'Unknown Project',
          taskCount: 0,
        }
        existing.taskCount += 1
        projectMap.set(t.project_id, existing)
      }
    }

    return {
      success: true,
      data: {
        todayTasks,
        pendingTasks,
        overdueTasks,
        recentlyAssignedTasks,
        completedTasks,
        allAssignedTasks,
        userProjects: Array.from(projectMap.values()),
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch personal tasks' }
  }
}

/**
 * Create a new task.
 * HOD / Project Manager / Admin can create tasks.
 * Supports multi-assignee assignment with duplicate prevention.
 */
export async function createTaskAction(input: CreateTaskInput): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!canManageTasks(user)) {
      return { success: false, error: 'Unauthorized: Only HOD, Project Manager, or Admin can create tasks.' }
    }

    const title = input.title?.trim()
    if (!title) {
      return { success: false, error: 'Task Title is required.' }
    }

    if (!input.project_id) {
      return { success: false, error: 'Project is required.' }
    }

    const admin = await createAdminClient()
    const taskIdDisplay = await generateTaskId()

    const { data: inserted, error: insertErr } = await admin
      .from('tasks')
      .insert({
        task_id_display: taskIdDisplay,
        title,
        description: input.description?.trim() || null,
        project_id: input.project_id,
        priority: input.priority || 'MEDIUM',
        status: input.status || 'TODO',
        start_date: input.start_date || null,
        due_date: input.due_date || null,
        estimated_hours: input.estimated_hours || 0,
        worked_hours: input.worked_hours || 0,
        dependencies: input.dependencies || [],
        attachments: input.attachments || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr || !inserted) {
      return { success: false, error: insertErr?.message || 'Failed to create task.' }
    }

    // Insert assignees (de-duplicate IDs)
    const uniqueAssignees = Array.from(new Set(input.assignees || []))
    if (uniqueAssignees.length > 0) {
      const assigneeRows = uniqueAssignees.map(uid => ({
        task_id: inserted.id,
        user_id: uid,
        assigned_by: user.id,
      }))
      await admin.from('task_assignees').insert(assigneeRows)
    }

    // Log Activity: Task Created & Assigned
    await admin.from('project_activity').insert({
      project_id: input.project_id,
      task_id: inserted.id,
      user_id: user.id,
      activity_type: 'TASK_CREATED',
      details: {
        task_title: inserted.title,
        task_id_display: inserted.task_id_display,
        priority: inserted.priority,
        created_by: user.employee_name || user.email,
        assigned_count: uniqueAssignees.length,
      },
    })

    revalidatePath('/tasks')
    revalidatePath('/my-tasks')
    revalidatePath(`/projects/${input.project_id}`)
    revalidatePath('/dashboard')

    return { success: true, data: inserted as Task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create task' }
  }
}

/**
 * Update task status (e.g. from Kanban drag-and-drop or status selector).
 * Updates server-side immediately and records activity.
 */
export async function updateTaskStatusAction(
  taskId: string,
  newStatus: TaskStatus,
  newOrderIndex?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const admin = await createAdminClient()

    // 1. Fetch current task with assignees
    const { data: currentTask, error: fetchErr } = await admin
      .from('tasks')
      .select('id, title, status, project_id, task_id_display, assignees:task_assignees(user_id)')
      .eq('id', taskId)
      .single()

    if (fetchErr || !currentTask) {
      return { success: false, error: 'Task not found' }
    }

    const isAssignee = (currentTask.assignees || []).some((a: any) => a.user_id === user.id)

    // Enforce permission: HOD/Manager/Admin or assigned employee
    if (!canUpdateTaskStatus(user, isAssignee)) {
      return { success: false, error: 'Unauthorized: You are not permitted to change this task status.' }
    }

    if (newStatus === 'DONE' && user.role === 'Employee' && !user.is_hod) {
      return { success: false, error: 'Employees cannot mark tasks as DONE. Please mark as IN_REVIEW instead.' }
    }

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (typeof newOrderIndex === 'number') {
      updatePayload.order_index = newOrderIndex
    }

    const { error: updateErr } = await admin
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Activity tracking
    const activityType = newStatus === 'DONE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED'

    await admin.from('project_activity').insert({
      project_id: currentTask.project_id,
      task_id: taskId,
      user_id: user.id,
      activity_type: activityType,
      details: {
        task_title: currentTask.title,
        old_status: currentTask.status,
        new_status: newStatus,
        updated_by: user.employee_name || user.email,
      },
    })

    revalidatePath('/tasks')
    revalidatePath('/my-tasks')
    revalidatePath(`/projects/${currentTask.project_id}`)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update task status' }
  }
}

/**
 * Update full task details (HOD / Project Manager / Admin).
 */
export async function updateTaskAction(input: UpdateTaskInput): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!canManageTasks(user)) {
      return { success: false, error: 'Unauthorized: Only HOD, Project Manager, or Admin can edit tasks.' }
    }

    const admin = await createAdminClient()

    const updatePayload: Record<string, any> = {}
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null
    if (input.priority !== undefined) updatePayload.priority = input.priority
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.start_date !== undefined) updatePayload.start_date = input.start_date || null
    if (input.due_date !== undefined) updatePayload.due_date = input.due_date || null
    if (input.estimated_hours !== undefined) updatePayload.estimated_hours = input.estimated_hours
    if (input.worked_hours !== undefined) updatePayload.worked_hours = input.worked_hours
    if (input.dependencies !== undefined) updatePayload.dependencies = input.dependencies
    if (input.attachments !== undefined) updatePayload.attachments = input.attachments

    const { data: updated, error: updateErr } = await admin
      .from('tasks')
      .update(updatePayload)
      .eq('id', input.id)
      .select()
      .single()

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Reassign members if assignees array provided
    if (input.assignees) {
      const uniqueAssignees = Array.from(new Set(input.assignees))
      await admin.from('task_assignees').delete().eq('task_id', input.id)
      if (uniqueAssignees.length > 0) {
        const rows = uniqueAssignees.map(uid => ({
          task_id: input.id,
          user_id: uid,
          assigned_by: user.id,
        }))
        await admin.from('task_assignees').insert(rows)
      }

      await admin.from('project_activity').insert({
        project_id: updated.project_id,
        task_id: input.id,
        user_id: user.id,
        activity_type: 'TASK_REASSIGNED',
        details: {
          task_title: updated.title,
          new_assignees_count: uniqueAssignees.length,
          reassigned_by: user.employee_name || user.email,
        },
      })
    }

    revalidatePath('/tasks')
    revalidatePath('/my-tasks')
    revalidatePath(`/projects/${updated.project_id}`)
    revalidatePath('/dashboard')

    return { success: true, data: updated as Task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update task' }
  }
}

/**
 * Add a comment to a task.
 * Permitted for any team member, assignee, or manager.
 */
export async function addTaskCommentAction(taskId: string, commentText: string): Promise<{ success: boolean; data?: TaskComment; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const trimmed = commentText?.trim()
    if (!trimmed) {
      return { success: false, error: 'Comment text cannot be empty.' }
    }

    const admin = await createAdminClient()

    // Verify task exists
    const { data: task } = await admin
      .from('tasks')
      .select('id, title, project_id')
      .eq('id', taskId)
      .single()

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    const { data: inserted, error: insertErr } = await admin
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        comment: trimmed,
      })
      .select(`
        *,
        user_profile:profiles(id, first_name, last_name)
      `)
      .single()

    if (insertErr || !inserted) {
      return { success: false, error: insertErr?.message || 'Failed to add comment.' }
    }

    // Log Activity
    await admin.from('project_activity').insert({
      project_id: task.project_id,
      task_id: taskId,
      user_id: user.id,
      activity_type: 'TASK_COMMENT_ADDED',
      details: {
        task_title: task.title,
        comment_by: user.employee_name || user.email,
      },
    })

    revalidatePath('/tasks')
    revalidatePath(`/projects/${task.project_id}`)

    return { success: true, data: inserted as TaskComment }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add comment' }
  }
}

/**
 * Log or update operational/worked hours on a task.
 * Note: Operational hours are strictly project worked time, not salary/financial data.
 */
export async function logTaskHoursAction(taskId: string, additionalHours: number): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (isNaN(additionalHours) || additionalHours < 0) {
      return { success: false, error: 'Invalid hours value' }
    }

    const admin = await createAdminClient()

    const { data: task, error: fetchErr } = await admin
      .from('tasks')
      .select('id, worked_hours, project_id, title')
      .eq('id', taskId)
      .single()

    if (fetchErr || !task) {
      return { success: false, error: 'Task not found' }
    }

    const currentHours = Number(task.worked_hours) || 0
    const newHours = Math.round((currentHours + additionalHours) * 100) / 100

    await admin
      .from('tasks')
      .update({ worked_hours: newHours })
      .eq('id', taskId)

    revalidatePath('/tasks')
    revalidatePath(`/projects/${task.project_id}`)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to log hours' }
  }
}
