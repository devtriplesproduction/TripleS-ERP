'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type {
  QuickTask,
  CreateQuickTaskInput,
  UpdateQuickTaskInput,
  QuickTaskFilterOptions,
  QuickTasksActionResponse,
  AssignableUser,
  QuickTasksBadgeState,
} from '@/types/quick-tasks'
import { validateActiveEmployees } from '@/lib/services/employee-eligibility'
import fs from 'fs'
import path from 'path'

function safeRevalidatePath(pathUrl: string) {
  try {
    revalidatePath(pathUrl)
  } catch {
    // In test runner or non-request contexts, ignore static generation store invariant
  }
}

const FALLBACK_DIR = path.join(process.cwd(), 'scratch')
const DEFAULT_STORE_FILE = 'quick_tasks_store.json'

function getFallbackStorePath(): string {
  const customPath = process.env.QUICK_TASKS_STORE_PATH
  if (customPath) {
    const fileName = path.basename(customPath)
    return path.join(FALLBACK_DIR, fileName)
  }
  return path.join(FALLBACK_DIR, DEFAULT_STORE_FILE)
}

function ensureStoreDir(): void {
  const storePath = getFallbackStorePath()
  const dir = path.dirname(storePath)
  if (!fs.existsSync(/* turbopackIgnore: true */ dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readFallbackTasks(): QuickTask[] {
  try {
    ensureStoreDir()
    const storePath = getFallbackStorePath()
    if (!fs.existsSync(/* turbopackIgnore: true */ storePath)) {
      return []
    }
    const raw = fs.readFileSync(/* turbopackIgnore: true */ storePath, 'utf-8')
    return JSON.parse(raw) as QuickTask[]
  } catch (err) {
    console.error('[QuickTasks] Failed to read fallback store:', err)
    return []
  }
}

function writeFallbackTasks(tasks: QuickTask[]): void {
  try {
    ensureStoreDir()
    const storePath = getFallbackStorePath()
    fs.writeFileSync(/* turbopackIgnore: true */ storePath, JSON.stringify(tasks, null, 2), 'utf-8')
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

    // 1. Fetch profiles with activity lifecycle fields
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, employee_id, is_active, deactivated_at')
      .order('first_name', { ascending: true })

    if (pErr) {
      return { success: false, error: pErr.message }
    }

    // 2. Fetch onboarding details for designation, department, and employment status
    const empIds = (profiles || []).map((p) => p.employee_id).filter(Boolean)
    const empMap = new Map<string, { department?: string | null; designation?: string | null; email?: string; status?: string; deactivated_at?: string | null }>()

    if (empIds.length > 0) {
      const { data: emps } = await supabase
        .from('employee_onboarding')
        .select('employee_id_number, department, designation, email, employment_status')
        .in('employee_id_number', empIds)

      if (emps) {
        emps.forEach((e) => {
          empMap.set(e.employee_id_number, {
            department: e.department,
            designation: e.designation,
            email: e.email,
            status: e.employment_status,
            deactivated_at: (e as any).deactivated_at,
          })
        })
      }
    }

    const result: AssignableUser[] = (profiles || [])
      .filter((p) => {
        // Exclude deactivated or inactive profiles
        if (p.is_active === false || p.deactivated_at != null) {
          return false
        }
        // If linked to onboarding, check authoritative employment status
        if (p.employee_id && empMap.has(p.employee_id)) {
          const emp = empMap.get(p.employee_id)
          const status = (emp?.status || '').toLowerCase()
          if (status === 'inactive' || status === 'terminated' || (status && status !== 'active') || emp?.deactivated_at != null) {
            return false
          }
        }
        return true
      })
      .map((p) => {
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
 * - Everyone (Admin, HR, Employee) sees their own personal tasks.
 * - Employees and HR see tasks assigned to them + their own personal tasks.
 * - Admin sees all assigned tasks (is_personal = false) + Admin's OWN personal tasks.
 * - Admin CANNOT see other users' private personal tasks.
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

    // Role-based scoping:
    if (!isAdmin) {
      // Non-Admin: only tasks assigned to current user (both their personal tasks and assigned to them)
      query = query.eq('assigned_to', user.id)
    } else {
      // Admin scoping:
      // If filtering specifically for personal tasks:
      if (options?.assigneeId === 'PERSONAL' || options?.type === 'Personal') {
        query = query.eq('assigned_to', user.id).eq('is_personal', true)
      } else if (options?.assigneeId && options.assigneeId !== 'ALL') {
        // Admin viewing tasks for a specific assignee
        query = query.eq('assigned_to', options.assigneeId).or('is_personal.is.false,is_personal.is.null')
      } else {
        // Admin viewing ALL:
        // Must show: assigned tasks (is_personal = false or null) OR admin's own tasks (assigned_to = admin.id)
        // Must NOT show other users' personal tasks!
        query = query.or(`assigned_to.eq.${user.id},and(is_personal.is.false),and(is_personal.is.null)`)
      }
    }

    // Status filter
    if (options?.status && options.status !== 'All') {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query
      .order('status', { ascending: false }) // 'Pending' before 'Completed'
      .order('created_at', { ascending: false })

    if (error) {
      // If table not yet registered in schema cache or column is_personal missing (PGRST205 / 42703), use fallback
      if (error.code === 'PGRST205' || error.code === '42703') {
        const allTasks = readFallbackTasks()
        let scoped = allTasks.filter((t) => {
          const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
          if (!isAdmin) {
            // Non-admin can only see tasks where they are assigned_to
            return t.assigned_to === user.id
          }
          // Admin can see:
          // 1. Their own personal tasks (assigned_to === admin.id && isPersonal)
          // 2. All assigned non-personal tasks (!isPersonal)
          // Admin CANNOT see other users' personal tasks!
          if (isPersonal) {
            return t.assigned_to === user.id
          }
          return true
        })

        // Apply filters
        if (isAdmin && options?.assigneeId) {
          if (options.assigneeId === 'PERSONAL') {
            scoped = scoped.filter((t) => (t.is_personal || t.assigned_by === t.assigned_to) && t.assigned_to === user.id)
          } else if (options.assigneeId !== 'ALL') {
            scoped = scoped.filter((t) => t.assigned_to === options.assigneeId && !t.is_personal)
          }
        }

        if (options?.type === 'Personal') {
          scoped = scoped.filter((t) => (t.is_personal || t.assigned_by === t.assigned_to) && t.assigned_to === user.id)
        } else if (options?.type === 'Assigned') {
          scoped = scoped.filter((t) => !t.is_personal && t.assigned_by !== t.assigned_to)
        }

        if (options?.status && options.status !== 'All') {
          scoped = scoped.filter((t) => t.status === options.status)
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

    let enrichedTasks: QuickTask[] = data.map((t: any) => {
      const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
      return {
        ...t,
        is_personal: isPersonal,
        assigned_by_name: isPersonal
          ? (t.assigned_by === user.id ? 'You' : profileMap.get(t.assigned_by)?.name || 'Owner')
          : profileMap.get(t.assigned_by)?.name || 'Admin',
        assigned_to_name: isPersonal
          ? (t.assigned_to === user.id ? 'You' : profileMap.get(t.assigned_to)?.name || 'Owner')
          : profileMap.get(t.assigned_to)?.name || 'Employee',
        assigned_to_department: profileMap.get(t.assigned_to)?.department || null,
        completed_by_name: t.completed_by ? profileMap.get(t.completed_by)?.name : undefined,
      }
    })

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

    // Type filter in memory
    if (options?.type === 'Personal') {
      enrichedTasks = enrichedTasks.filter((t) => t.is_personal && t.assigned_to === user.id)
    } else if (options?.type === 'Assigned') {
      enrichedTasks = enrichedTasks.filter((t) => !t.is_personal)
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
 * Create Quick Task(s):
 * - Anyone (Admin, HR, Employee) can create a personal task for themselves.
 * - When no assignees are selected (or assignee is self), creates a Personal Task.
 * - Admin can assign tasks to other employees/HR.
 * - HR and Employees CANNOT assign tasks to other people.
 */
export async function createQuickTasksAction(
  input: CreateQuickTaskInput
): Promise<QuickTasksActionResponse<QuickTask[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Primary text is description, fallback to title
    const rawText = (input.description || input.title || '').trim()
    if (!rawText) {
      return { success: false, error: 'Task description is required' }
    }

    const firstLine = rawText.split('\n')[0].trim().slice(0, 100) || rawText.slice(0, 100)

    // Assignees: if empty or only contains user.id => personal task
    const assignees = Array.isArray(input.assigned_to)
      ? input.assigned_to.filter(Boolean)
      : []

    const isPersonal =
      assignees.length === 0 ||
      (assignees.length === 1 && assignees[0] === user.id)

    // Permission check: only Admin can assign tasks to other people
    if (!isPersonal && user.role !== 'Admin') {
      return {
        success: false,
        error: 'Unauthorized: Only Admin can assign tasks to other team members',
      }
    }

    const supabase = await createClient()

    // Server-side active employee validation for assigned Quick Tasks
    if (!isPersonal && assignees.length > 0) {
      const validation = await validateActiveEmployees(assignees)
      if (!validation.allActive) {
        return {
          success: false,
          error: `Cannot assign Quick Task to inactive or deactivated user(s): ${validation.inactiveNames.join(', ')}.`,
        }
      }
    }

    const nowIso = new Date().toISOString()
    const priority = input.priority || 'Medium'
    const dueDate = input.due_date ? input.due_date : null

    // Build rows to insert:
    // If personal: single row with assigned_to = user.id, is_personal = true, is_read = true (creator already saw it)
    // If assigned: one row for each assignee, is_read = false (unread assignment indicator for recipient)
    const rowsToInsert = isPersonal
      ? [
          {
            title: firstLine,
            description: rawText,
            assigned_by: user.id,
            assigned_to: user.id,
            is_personal: true,
            is_read: true,
            seen_at: nowIso,
            due_date: dueDate,
            priority,
            status: 'Pending' as const,
            created_at: nowIso,
            updated_at: nowIso,
          },
        ]
      : assignees.map((recipientId) => ({
          title: firstLine,
          description: rawText,
          assigned_by: user.id,
          assigned_to: recipientId,
          is_personal: recipientId === user.id,
          is_read: recipientId === user.id,
          seen_at: recipientId === user.id ? nowIso : null,
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
      // If table not registered or missing column, use fallback store
      if (error.code === 'PGRST205' || error.code === '42703') {
        const existing = readFallbackTasks()
        const newRecords: QuickTask[] = rowsToInsert.map((r) => ({
          id: crypto.randomUUID(),
          ...r,
        }))

        const allIds = [user.id, ...assignees]
        const profileMap = await resolveProfileMap(supabase, allIds)

        const enrichedRecords = newRecords.map((t) => ({
          ...t,
          assigned_by_name: t.is_personal ? 'You' : profileMap.get(t.assigned_by)?.name || 'Admin',
          assigned_to_name: t.is_personal ? 'You' : profileMap.get(t.assigned_to)?.name || 'Employee',
          assigned_to_department: profileMap.get(t.assigned_to)?.department || null,
        }))

        writeFallbackTasks([...enrichedRecords, ...existing])
        createdTasks = enrichedRecords
      } else {
        return { success: false, error: error.message }
      }
    } else {
      const allIds = [user.id, ...assignees]
      const profileMap = await resolveProfileMap(supabase, allIds)

      createdTasks = (data || []).map((t: any) => ({
        ...t,
        is_personal: Boolean(t.is_personal || t.assigned_by === t.assigned_to),
        assigned_by_name: t.is_personal ? 'You' : profileMap.get(t.assigned_by)?.name || 'Admin',
        assigned_to_name: t.is_personal ? 'You' : profileMap.get(t.assigned_to)?.name || 'Employee',
        assigned_to_department: profileMap.get(t.assigned_to)?.department || null,
      }))
    }

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data: createdTasks }
  } catch (err: any) {
    console.error('[QuickTasks] createQuickTasksAction error:', err)
    return { success: false, error: err.message || 'Failed to create quick task' }
  }
}

/**
 * Mark a task as Completed or Pending.
 * - Owners can mark their own personal tasks completed/pending.
 * - Assigned users can mark tasks assigned to them completed/pending.
 * - Admin can mark assigned tasks completed/pending.
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
      // Non-admin can only update task if assigned to them
      updateQuery = updateQuery.eq('assigned_to', user.id)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42703') {
        const allTasks = readFallbackTasks()
        const idx = allTasks.findIndex((t) => t.id === taskId)
        if (idx === -1) {
          return { success: false, error: 'Task not found' }
        }

        const task = allTasks[idx]
        const isPersonal = Boolean(task.is_personal || task.assigned_by === task.assigned_to)

        // Security check: non-admin can only update their own task
        if (!isAdmin && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: You can only complete tasks assigned to you' }
        }
        // Admin cannot touch someone else's personal task
        if (isAdmin && isPersonal && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: Personal tasks are private to their owner' }
        }

        const updatedTask: QuickTask = {
          ...task,
          status: newStatus,
          completed_at: completedAt,
          completed_by: completedBy,
          completed_by_name: completed ? (user.employee_name || 'You') : undefined,
          updated_at: nowIso,
        }

        allTasks[idx] = updatedTask
        writeFallbackTasks(allTasks)

        safeRevalidatePath('/quick-tasks')
        safeRevalidatePath('/')

        return { success: true, data: updatedTask }
      }

      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Task not found or permission denied' }
    }

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data }
  } catch (err: any) {
    console.error('[QuickTasks] markQuickTaskCompleteAction error:', err)
    return { success: false, error: err.message || 'Failed to update task completion' }
  }
}

/**
 * Update task details (description, status).
 * - Owners can edit their own personal tasks.
 * - Admin can edit assigned tasks.
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

    const supabase = await createClient()
    const isAdmin = user.role === 'Admin'
    const nowIso = new Date().toISOString()

    const rawDesc = input.description !== undefined ? input.description.trim() : undefined
    const titleVal = input.title !== undefined
      ? input.title.trim()
      : (rawDesc !== undefined ? (rawDesc.split('\n')[0].trim().slice(0, 100) || rawDesc.slice(0, 100)) : undefined)

    const updatePayload: any = {
      updated_at: nowIso,
    }
    if (titleVal !== undefined) updatePayload.title = titleVal
    if (rawDesc !== undefined) updatePayload.description = rawDesc
    if (input.due_date !== undefined) updatePayload.due_date = input.due_date || null
    if (input.priority !== undefined) updatePayload.priority = input.priority
    if (input.status !== undefined) updatePayload.status = input.status

    let updateQuery = supabase.from('quick_tasks').update(updatePayload).eq('id', taskId)

    if (!isAdmin) {
      // Non-admin can only update their own task
      updateQuery = updateQuery.eq('assigned_to', user.id)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42703') {
        const allTasks = readFallbackTasks()
        const idx = allTasks.findIndex((t) => t.id === taskId)
        if (idx === -1) {
          return { success: false, error: 'Task not found' }
        }

        const task = allTasks[idx]
        const isPersonal = Boolean(task.is_personal || task.assigned_by === task.assigned_to)

        if (!isAdmin && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: You can only edit your own tasks' }
        }
        if (isAdmin && isPersonal && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: Personal tasks are private to their owner' }
        }

        const updatedTask: QuickTask = {
          ...task,
          ...updatePayload,
        }

        allTasks[idx] = updatedTask
        writeFallbackTasks(allTasks)

        safeRevalidatePath('/quick-tasks')
        safeRevalidatePath('/')

        return { success: true, data: updatedTask }
      }

      return { success: false, error: error.message }
    }

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data }
  } catch (err: any) {
    console.error('[QuickTasks] updateQuickTaskAction error:', err)
    return { success: false, error: err.message || 'Failed to update task' }
  }
}

/**
 * Delete a Quick Task:
 * - Owners can delete their own personal tasks.
 * - Admin can delete assigned tasks (or their own personal tasks).
 * - Non-admin cannot delete other users' tasks.
 */
export async function deleteQuickTaskAction(
  taskId: string
): Promise<QuickTasksActionResponse<{ id: string }>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    const isAdmin = user.role === 'Admin'

    let deleteQuery = supabase.from('quick_tasks').delete().eq('id', taskId)

    if (!isAdmin) {
      // Non-admin can only delete if owner (assigned_to = user.id)
      deleteQuery = deleteQuery.eq('assigned_to', user.id)
    }

    const { error } = await deleteQuery

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42703') {
        const allTasks = readFallbackTasks()
        const idx = allTasks.findIndex((t) => t.id === taskId)
        if (idx === -1) {
          return { success: false, error: 'Task not found' }
        }

        const task = allTasks[idx]
        const isPersonal = Boolean(task.is_personal || task.assigned_by === task.assigned_to)

        if (!isAdmin && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: You can only delete your own tasks' }
        }
        if (isAdmin && isPersonal && task.assigned_to !== user.id) {
          return { success: false, error: 'Unauthorized: Personal tasks are private to their owner' }
        }

        allTasks.splice(idx, 1)
        writeFallbackTasks(allTasks)

        safeRevalidatePath('/quick-tasks')
        safeRevalidatePath('/')

        return { success: true, data: { id: taskId } }
      }

      return { success: false, error: error.message }
    }

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data: { id: taskId } }
  } catch (err: any) {
    console.error('[QuickTasks] deleteQuickTaskAction error:', err)
    return { success: false, error: err.message || 'Failed to delete task' }
  }
}

/**
 * Cancel a task (Admin action).
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
 * Mark all assigned quick tasks for current user as seen.
 * Removes the red notification dot once the recipient views Quick Tasks.
 */
export async function markQuickTasksSeenAction(): Promise<QuickTasksActionResponse<{ markedCount: number }>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    // Update in Supabase
    const { data, error } = await supabase
      .from('quick_tasks')
      .update({
        is_read: true,
        seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq('assigned_to', user.id)
      .eq('is_read', false)
      .select('id')

    if (error) {
      const allTasks = readFallbackTasks()
      let marked = 0
      allTasks.forEach((t) => {
        const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
        const isUnread = t.is_read === false || (t.is_read === undefined && !isPersonal && t.assigned_by !== user.id)
        if (t.assigned_to === user.id && isUnread) {
          t.is_read = true
          t.seen_at = nowIso
          marked++
        }
      })
      if (marked > 0) {
        writeFallbackTasks(allTasks)
      }
      safeRevalidatePath('/quick-tasks')
      safeRevalidatePath('/')
      return { success: true, data: { markedCount: marked } }
    }

    // Always keep fallback store in sync if it has any unread records for this user
    try {
      const allTasks = readFallbackTasks()
      let markedFallback = 0
      allTasks.forEach((t) => {
        const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
        const isUnread = t.is_read === false || (t.is_read === undefined && !isPersonal && t.assigned_by !== user.id)
        if (t.assigned_to === user.id && isUnread) {
          t.is_read = true
          t.seen_at = nowIso
          markedFallback++
        }
      })
      if (markedFallback > 0) {
        writeFallbackTasks(allTasks)
      }
    } catch {
      // ignore
    }

    safeRevalidatePath('/quick-tasks')
    safeRevalidatePath('/')

    return { success: true, data: { markedCount: data?.length || 0 } }
  } catch (err: any) {
    console.error('[QuickTasks] markQuickTasksSeenAction error:', err)
    return { success: false, error: err.message || 'Failed to mark tasks as seen' }
  }
}

/**
 * Fast badge count action for navbar trigger.
 * Returns count of Pending tasks and unread task assignment state for the current user.
 */
export async function getQuickTasksBadgeCountAction(): Promise<QuickTasksBadgeState> {
  try {
    const user = await getCurrentUser()
    if (!user) return { pendingCount: 0, hasUnreadAssignment: false, unreadAssignmentCount: 0 }

    const supabase = await createClient()

    let pendingQuery = supabase
      .from('quick_tasks')
      .select('id', { count: 'exact' })
      .eq('status', 'Pending')

    if (user.role !== 'Admin') {
      // Non-admin: pending tasks assigned to them (personal + assigned)
      pendingQuery = pendingQuery.eq('assigned_to', user.id)
    } else {
      // Admin: pending tasks assigned to them + pending non-personal tasks
      pendingQuery = pendingQuery.or(`assigned_to.eq.${user.id},and(is_personal.is.false),and(is_personal.is.null)`)
    }

    // Unread assignment query (only newly assigned tasks by others that are unread & pending)
    const unreadQuery = supabase
      .from('quick_tasks')
      .select('id', { count: 'exact' })
      .eq('assigned_to', user.id)
      .neq('assigned_by', user.id)
      .or('is_personal.is.false,is_personal.is.null')
      .eq('is_read', false)
      .eq('status', 'Pending')

    const [pendingRes, unreadRes] = await Promise.all([pendingQuery, unreadQuery])

    // If PostgREST schema cache misses the table or returns 404/204 or error, fallback to resilient store
    if (
      pendingRes.error ||
      unreadRes.error ||
      pendingRes.status !== 200 ||
      unreadRes.status !== 200 ||
      pendingRes.data === null ||
      unreadRes.data === null
    ) {
      const allTasks = readFallbackTasks()
      const pending = allTasks.filter((t) => {
        if (t.status !== 'Pending') return false
        const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
        if (user.role !== 'Admin') {
          return t.assigned_to === user.id
        }
        if (isPersonal) {
          return t.assigned_to === user.id
        }
        return true
      })

      const unreadAssigned = allTasks.filter((t) => {
        if (t.status !== 'Pending') return false
        const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
        const isUnread = t.is_read === false || (t.is_read === undefined && !isPersonal && t.assigned_by !== user.id)
        return (
          t.assigned_to === user.id &&
          t.assigned_by !== user.id &&
          !isPersonal &&
          isUnread
        )
      })

      return {
        pendingCount: pending.length,
        hasUnreadAssignment: unreadAssigned.length > 0,
        unreadAssignmentCount: unreadAssigned.length,
      }
    }

    const unreadCount = unreadRes.count ?? (unreadRes.data ? unreadRes.data.length : 0)
    const pendingCount = pendingRes.count ?? (pendingRes.data ? pendingRes.data.length : 0)

    return {
      pendingCount,
      hasUnreadAssignment: unreadCount > 0,
      unreadAssignmentCount: unreadCount,
    }
  } catch (err) {
    console.error('[QuickTasks] getQuickTasksBadgeCountAction error, falling back:', err)
    try {
      const user = await getCurrentUser()
      if (!user) return { pendingCount: 0, hasUnreadAssignment: false, unreadAssignmentCount: 0 }
      const allTasks = readFallbackTasks()
      const pending = allTasks.filter((t) => {
        if (t.status !== 'Pending') return false
        const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
        if (user.role !== 'Admin') return t.assigned_to === user.id
        if (isPersonal) return t.assigned_to === user.id
        return true
      })
      const unreadAssigned = allTasks.filter((t) => {
        if (t.status !== 'Pending') return false
        const isPersonal = Boolean(t.is_personal || t.assigned_by === t.assigned_to)
        const isUnread = t.is_read === false || (t.is_read === undefined && !isPersonal && t.assigned_by !== user.id)
        return (
          t.assigned_to === user.id &&
          t.assigned_by !== user.id &&
          !isPersonal &&
          isUnread
        )
      })
      return {
        pendingCount: pending.length,
        hasUnreadAssignment: unreadAssigned.length > 0,
        unreadAssignmentCount: unreadAssigned.length,
      }
    } catch {
      return { pendingCount: 0, hasUnreadAssignment: false, unreadAssignmentCount: 0 }
    }
  }
}
