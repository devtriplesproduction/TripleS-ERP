'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { invalidateNotificationCache } from '@/actions/notifications.actions'
import type {
  QuickTask,
  CreateQuickTaskInput,
  UpdateQuickTaskInput,
  QuickTaskFilterOptions,
  QuickTasksActionResponse,
  AssignableUser,
} from '@/types/quick-tasks'
import fs from 'fs'
import path from 'path'

function safeRevalidatePath(pathUrl: string) {
  try {
    revalidatePath(pathUrl)
  } catch {
    // In test runner or non-request contexts, ignore static generation store invariant
  }
}

// Fallback persistence file in case table migration is pending on remote Supabase
const FALLBACK_STORE_PATH = path.join(process.cwd(), 'scratch', 'quick_tasks_store.json')

function ensureStoreDir(): void {
  const dir = path.dirname(FALLBACK_STORE_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readFallbackTasks(): QuickTask[] {
  try {
    ensureStoreDir()
    if (!fs.existsSync(FALLBACK_STORE_PATH)) {
      return []
    }
    const raw = fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8')
    return JSON.parse(raw) as QuickTask[]
  } catch (err) {
    console.error('[QuickTasks] Failed to read fallback store:', err)
    return []
  }
}

function writeFallbackTasks(tasks: QuickTask[]): void {
  try {
    ensureStoreDir()
    fs.writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(tasks, null, 2), 'utf-8')
  } catch (err) {
    console.error('[QuickTasks] Failed to write fallback store:', err)
  }
}

// In-memory profile resolution helper
async function resolveProfileMap(supabase: any, userIds: string[]): Promise<Map<string, { name: string; email?: string; department?: string | null }>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  const map = new Map<string, { name: string; email?: string; department?: string | null }>()
  if (uniqueIds.length === 0) return map

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, employee_id')
      .in('id', uniqueIds)

    if (profiles && profiles.length > 0) {
      const empIds = profiles.map((p: any) => p.employee_id).filter(Boolean)
      let empMap = new Map<string, string>()

      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from('employee_onboarding')
          .select('employee_id_number, department')
          .in('employee_id_number', empIds)

        if (emps) {
          emps.forEach((e: any) => {
            empMap.set(e.employee_id_number, e.department || null)
          })
        }
      }

      profiles.forEach((p: any) => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.role || 'User'
        const dept = p.employee_id ? empMap.get(p.employee_id) || null : null
        map.set(p.id, { name: fullName, department: dept })
      })
    }
  } catch (err) {
    console.error('[QuickTasks] Profile resolution error:', err)
  }

  return map
}

/**
 * Get all assignable users (Employees + HR + Admin) for the Admin selector.
 */
export async function getAssignableUsersAction(): Promise<QuickTasksActionResponse<AssignableUser[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()

    // 1. Fetch profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, employee_id')
      .order('first_name', { ascending: true })

    if (pErr) {
      return { success: false, error: pErr.message }
    }

    // 2. Fetch onboarding details for designation and department
    const empIds = (profiles || []).map((p) => p.employee_id).filter(Boolean)
    const empMap = new Map<string, { department?: string | null; designation?: string | null; email?: string }>()

    if (empIds.length > 0) {
      const { data: emps } = await supabase
        .from('employee_onboarding')
        .select('employee_id_number, department, designation, email')
        .in('employee_id_number', empIds)

      if (emps) {
        emps.forEach((e) => {
          empMap.set(e.employee_id_number, {
            department: e.department,
            designation: e.designation,
            email: e.email,
          })
        })
      }
    }

    const result: AssignableUser[] = (profiles || []).map((p) => {
      const extra = p.employee_id ? empMap.get(p.employee_id) : undefined
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || (p.role === 'Admin' ? 'Administrator' : 'User')
      return {
        id: p.id,
        name: fullName,
        email: extra?.email,
        role: p.role,
        employee_id: p.employee_id,
        department: extra?.department || null,
        designation: extra?.designation || null,
      }
    })

    return { success: true, data: result }
  } catch (err: any) {
    console.error('[QuickTasks] getAssignableUsersAction error:', err)
    return { success: false, error: err.message || 'Failed to fetch assignable users' }
  }
}

/**
 * Fetch Quick Tasks based on authenticated user's role and filter options.
 * Admin: Can view all tasks or filter by assignee, status, due date.
 * HR: Can only view tasks assigned to them.
 * Employee: Can only view tasks assigned to them.
 */
export async function getQuickTasksAction(
  options?: QuickTaskFilterOptions
): Promise<QuickTasksActionResponse<QuickTask[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    const isAdmin = user.role === 'Admin'

    // Try Supabase first
    let query = supabase.from('quick_tasks').select('*')

    // Role-based scoping
    if (!isAdmin) {
      // HR and Employee can ONLY view tasks assigned to their own account
      query = query.eq('assigned_to', user.id)
    } else {
      // Admin filters
      if (options?.assigneeId && options.assigneeId !== 'ALL') {
        query = query.eq('assigned_to', options.assigneeId)
      }
    }

    // Status filter
    if (options?.status && options.status !== 'All') {
      query = query.eq('status', options.status)
    }

    // Due date filter
    if (options?.dueDate) {
      query = query.eq('due_date', options.dueDate)
    }

    const { data, error } = await query
      .order('status', { ascending: false }) // 'Pending' before 'Completed'
      .order('created_at', { ascending: false })

    if (error) {
      // If table not yet registered in schema cache (PGRST205), use fallback persistence
      if (error.code === 'PGRST205') {
        const allTasks = readFallbackTasks()
        let scoped = allTasks

        if (!isAdmin) {
          scoped = scoped.filter((t) => t.assigned_to === user.id)
        } else {
          if (options?.assigneeId && options.assigneeId !== 'ALL') {
            scoped = scoped.filter((t) => t.assigned_to === options.assigneeId)
          }
        }

        if (options?.status && options.status !== 'All') {
          scoped = scoped.filter((t) => t.status === options.status)
        }

        if (options?.dueDate) {
          scoped = scoped.filter((t) => t.due_date === options.dueDate)
        }

        if (options?.search && options.search.trim()) {
          const q = options.search.trim().toLowerCase()
          scoped = scoped.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.description && t.description.toLowerCase().includes(q)) ||
              (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
          )
        }

        // Sort: Pending first, then newest
        scoped.sort((a, b) => {
          if (a.status === 'Pending' && b.status !== 'Pending') return -1
          if (a.status !== 'Pending' && b.status === 'Pending') return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        return { success: true, data: scoped }
      }

      return { success: false, error: error.message }
    }

    // Attach user names
    const userIdsToResolve: string[] = []
    data.forEach((t: QuickTask) => {
      if (t.assigned_by) userIdsToResolve.push(t.assigned_by)
      if (t.assigned_to) userIdsToResolve.push(t.assigned_to)
      if (t.completed_by) userIdsToResolve.push(t.completed_by)
    })

    const profileMap = await resolveProfileMap(supabase, userIdsToResolve)

    let enrichedTasks: QuickTask[] = data.map((t: any) => ({
      ...t,
      assigned_by_name: profileMap.get(t.assigned_by)?.name || 'Admin',
      assigned_to_name: profileMap.get(t.assigned_to)?.name || 'Employee',
      assigned_to_department: profileMap.get(t.assigned_to)?.department || null,
      completed_by_name: t.completed_by ? profileMap.get(t.completed_by)?.name : undefined,
    }))

    // Search filter in memory
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase()
      enrichedTasks = enrichedTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
      )
    }

    // Sort: Pending first, then newest
    enrichedTasks.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1
      if (a.status !== 'Pending' && b.status === 'Pending') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return { success: true, data: enrichedTasks }
  } catch (err: any) {
    console.error('[QuickTasks] getQuickTasksAction error:', err)
    return { success: false, error: err.message || 'Failed to load quick tasks' }
  }
}

/**
 * Create casual Quick Task(s).
 * Admin-only permission.
 * Supports assigning to one or multiple recipients.
 */
export async function createQuickTasksAction(
  input: CreateQuickTaskInput
): Promise<QuickTasksActionResponse<QuickTask[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (user.role !== 'Admin') {
      return { success: false, error: 'Unauthorized: Only Admin can create and assign casual tasks' }
    }

    const titleTrim = input.title?.trim()
    if (!titleTrim) {
      return { success: false, error: 'Task title is required' }
    }

    if (!Array.isArray(input.assigned_to) || input.assigned_to.length === 0) {
      return { success: false, error: 'At least one recipient must be selected' }
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()
    const priority = input.priority || 'Medium'
    const desc = input.description?.trim() || null
    const dueDate = input.due_date ? input.due_date : null

    // Build task records for each recipient
    const rowsToInsert = input.assigned_to.map((recipientId) => ({
      title: titleTrim,
      description: desc,
      assigned_by: user.id,
      assigned_to: recipientId,
      due_date: dueDate,
      priority,
      status: 'Pending' as const,
      created_at: nowIso,
      updated_at: nowIso,
    }))

    // Try Supabase insert
    const { data, error } = await supabase
      .from('quick_tasks')
      .insert(rowsToInsert)
      .select()

    let createdTasks: QuickTask[] = []

    if (error) {
      if (error.code === 'PGRST205') {
        // Fallback store
        const existing = readFallbackTasks()
        const newRecords: QuickTask[] = rowsToInsert.map((r) => ({
          id: crypto.randomUUID(),
          ...r,
        }))

        // Attach names
        const profileMap = await resolveProfileMap(supabase, [
          user.id,
          ...input.assigned_to,
        ])

        const enrichedRecords = newRecords.map((t) => ({
          ...t,
          assigned_by_name: profileMap.get(t.assigned_by)?.name || 'Admin',
          assigned_to_name: profileMap.get(t.assigned_to)?.name || 'Employee',
          assigned_to_department: profileMap.get(t.assigned_to)?.department || null,
        }))

        writeFallbackTasks([...enrichedRecords, ...existing])
        createdTasks = enrichedRecords
      } else {
        return { success: false, error: error.message }
      }
    } else {
      // Resolve names for returned data
      const profileMap = await resolveProfileMap(supabase, [
        user.id,
        ...input.assigned_to,
      ])

      createdTasks = (data || []).map((t: any) => ({
        ...t,
        assigned_by_name: profileMap.get(t.assigned_by)?.name || 'Admin',
        assigned_to_name: profileMap.get(t.assigned_to)?.name || 'Employee',
        assigned_to_department: profileMap.get(t.assigned_to)?.department || null,
      }))
    }

    // Invalidate notification cache for assigned users
    input.assigned_to.forEach((recId) => {
      invalidateNotificationCache(recId)
    })
    invalidateNotificationCache(user.id)

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data: createdTasks }
  } catch (err: any) {
    console.error('[QuickTasks] createQuickTasksAction error:', err)
    return { success: false, error: err.message || 'Failed to create quick tasks' }
  }
}

/**
 * Mark a task as Completed or Pending.
 * Non-admin can ONLY mark their own assigned tasks as Completed/Pending.
 * Admin can mark any task.
 */
export async function markQuickTaskCompleteAction(
  taskId: string,
  completed: boolean
): Promise<QuickTasksActionResponse<QuickTask>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    const isAdmin = user.role === 'Admin'
    const nowIso = new Date().toISOString()

    const newStatus = completed ? 'Completed' : 'Pending'
    const completedAt = completed ? nowIso : null
    const completedBy = completed ? user.id : null

    // Try Supabase update
    let updateQuery = supabase
      .from('quick_tasks')
      .update({
        status: newStatus,
        completed_at: completedAt,
        completed_by: completedBy,
        updated_at: nowIso,
      })
      .eq('id', taskId)

    if (!isAdmin) {
      // Security check: non-admin can only update their own task
      updateQuery = updateQuery.eq('assigned_to', user.id)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      if (error.code === 'PGRST205') {
        const allTasks = readFallbackTasks()
        const idx = allTasks.findIndex((t) => t.id === taskId)
        if (idx === -1) {
          return { success: false, error: 'Task not found' }
        }

        const task = allTasks[idx]
        if (!isAdmin && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: You can only complete tasks assigned to you' }
        }

        const updatedTask: QuickTask = {
          ...task,
          status: newStatus,
          completed_at: completedAt,
          completed_by: completedBy,
          completed_by_name: completed ? (user.employee_name || 'User') : undefined,
          updated_at: nowIso,
        }

        allTasks[idx] = updatedTask
        writeFallbackTasks(allTasks)

        invalidateNotificationCache(task.assigned_to)
        invalidateNotificationCache(task.assigned_by)

        safeRevalidatePath('/quick-tasks')
        safeRevalidatePath('/')

        return { success: true, data: updatedTask }
      }

      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Task not found or permission denied' }
    }

    invalidateNotificationCache(data.assigned_to)
    invalidateNotificationCache(data.assigned_by)

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data }
  } catch (err: any) {
    console.error('[QuickTasks] markQuickTaskCompleteAction error:', err)
    return { success: false, error: err.message || 'Failed to update task completion' }
  }
}

/**
 * Update task details (title, description, due date, priority, status).
 * Admin-only action.
 */
export async function updateQuickTaskAction(
  taskId: string,
  input: UpdateQuickTaskInput
): Promise<QuickTasksActionResponse<QuickTask>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (user.role !== 'Admin') {
      return { success: false, error: 'Unauthorized: Only Admin can edit task details' }
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    const updatePayload: any = {
      updated_at: nowIso,
    }
    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null
    if (input.due_date !== undefined) updatePayload.due_date = input.due_date || null
    if (input.priority !== undefined) updatePayload.priority = input.priority
    if (input.status !== undefined) updatePayload.status = input.status

    const { data, error } = await supabase
      .from('quick_tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST205') {
        const allTasks = readFallbackTasks()
        const idx = allTasks.findIndex((t) => t.id === taskId)
        if (idx === -1) {
          return { success: false, error: 'Task not found' }
        }

        const task = allTasks[idx]
        const updatedTask: QuickTask = {
          ...task,
          ...updatePayload,
        }

        allTasks[idx] = updatedTask
        writeFallbackTasks(allTasks)

        invalidateNotificationCache(task.assigned_to)
        safeRevalidatePath('/quick-tasks')
        safeRevalidatePath('/')

        return { success: true, data: updatedTask }
      }

      return { success: false, error: error.message }
    }

    invalidateNotificationCache(data.assigned_to)
    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data }
  } catch (err: any) {
    console.error('[QuickTasks] updateQuickTaskAction error:', err)
    return { success: false, error: err.message || 'Failed to update task' }
  }
}

/**
 * Cancel a task.
 * Admin-only action. Sets status to 'Cancelled'.
 */
export async function cancelQuickTaskAction(
  taskId: string
): Promise<QuickTasksActionResponse<QuickTask>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (user.role !== 'Admin') {
      return { success: false, error: 'Unauthorized: Only Admin can cancel tasks' }
    }

    return updateQuickTaskAction(taskId, { status: 'Cancelled' })
  } catch (err: any) {
    console.error('[QuickTasks] cancelQuickTaskAction error:', err)
    return { success: false, error: err.message || 'Failed to cancel task' }
  }
}

/**
 * Fast badge count action for navbar trigger.
 * Returns count of Pending tasks for the current user.
 */
export async function getQuickTasksBadgeCountAction(): Promise<{ pendingCount: number }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { pendingCount: 0 }

    const supabase = await createClient()

    let query = supabase
      .from('quick_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending')

    if (user.role !== 'Admin') {
      query = query.eq('assigned_to', user.id)
    }

    const { count, error } = await query

    if (error) {
      if (error.code === 'PGRST205') {
        const allTasks = readFallbackTasks()
        const pending = allTasks.filter(
          (t) =>
            t.status === 'Pending' &&
            (user.role === 'Admin' ? true : t.assigned_to === user.id)
        )
        return { pendingCount: pending.length }
      }
      return { pendingCount: 0 }
    }

    return { pendingCount: count || 0 }
  } catch {
    return { pendingCount: 0 }
  }
}
