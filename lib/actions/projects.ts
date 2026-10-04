'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canCreateProjects, canEditProject, canViewRestrictedClientInfo } from '@/lib/permissions/project-management'
import { Project, ProjectStatus, ProjectPriority, ProjectDashboardStats, ProjectTeamMemberStats, ProjectActivity } from '@/types/project-management'
import { revalidatePath } from 'next/cache'

export interface CreateProjectInput {
  name: string
  client_id: string
  description?: string | null
  start_date?: string | null
  deadline?: string | null
  status?: ProjectStatus
  priority?: ProjectPriority
  department?: string | null
  project_manager_id?: string | null
  team_members?: string[] // user UUIDs
  objective?: string | null
  notes?: string | null
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string
}

async function generateProjectId(): Promise<string> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('projects')
    .select('project_id_display')
    .order('created_at', { ascending: false })
    .limit(100)

  let maxNum = 0
  if (data) {
    for (const row of data) {
      const match = row.project_id_display?.match(/^PRJ-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
  }

  return `PRJ-${String(maxNum + 1).padStart(3, '0')}`
}

/**
 * Fetch all projects with client details, team members, and task summary progress.
 * Client contact fields are excluded server-side for HOD and Employee users.
 */
export async function getProjects(filters?: {
  status?: string
  priority?: string
  department?: string
  search?: string
}): Promise<{ success: boolean; data: Project[]; stats: ProjectDashboardStats; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        data: [],
        stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, overdueProjects: 0 },
        error: 'Authentication required'
      }
    }

    const admin = await createAdminClient()
    const canSeeContact = canViewRestrictedClientInfo(user)

    // Build client select without contact info for restricted roles
    const clientSelect = canSeeContact
      ? 'clients(id, client_id_display, name, location, contact_number, whatsapp_number, email)'
      : 'clients(id, client_id_display, name, location)'

    let query = admin
      .from('projects')
      .select(`
        *,
        ${clientSelect},
        project_manager:profiles!projects_project_manager_id_fkey(id, first_name, last_name),
        members:project_members(
          id, user_id, role,
          profile:profiles(id, first_name, last_name, employee_id)
        ),
        tasks(id, status, worked_hours, due_date)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status)
    }

    if (filters?.priority && filters.priority !== 'ALL') {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.department && filters.department !== 'ALL') {
      query = query.eq('department', filters.department)
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
        return {
          success: true,
          data: [],
          stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, overdueProjects: 0 }
        }
      }
      return {
        success: false,
        data: [],
        stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, overdueProjects: 0 },
        error: error.message
      }
    }

    const now = new Date()

    const projects: Project[] = (data || []).map((row: any) => {
      const tasks = row.tasks || []
      const total = tasks.length
      const done = tasks.filter((t: any) => t.status === 'DONE').length
      const in_progress = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length
      const in_review = tasks.filter((t: any) => t.status === 'IN_REVIEW').length
      const on_hold = tasks.filter((t: any) => t.status === 'ON_HOLD').length
      const todo = tasks.filter((t: any) => t.status === 'TODO').length

      const progress = total > 0 ? Math.round((done / total) * 100) : 0
      const is_overdue = row.deadline && new Date(row.deadline) < now && row.status !== 'COMPLETED' && row.status !== 'CANCELLED'

      const managerName = row.project_manager
        ? `${row.project_manager.first_name || ''} ${row.project_manager.last_name || ''}`.trim()
        : null

      return {
        id: row.id,
        project_id_display: row.project_id_display,
        name: row.name,
        client_id: row.client_id,
        client_name: row.clients?.name || 'Unknown Client',
        description: row.description,
        start_date: row.start_date,
        deadline: row.deadline,
        status: row.status,
        priority: row.priority,
        department: row.department,
        project_manager_id: row.project_manager_id,
        project_manager_name: managerName,
        objective: row.objective,
        notes: row.notes,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        members: row.members || [],
        task_summary: {
          total,
          done,
          in_progress,
          in_review,
          todo,
          on_hold,
        },
        progress,
        is_overdue: !!is_overdue,
      }
    })

    // Compute stats
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PLANNED').length
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const overdueProjects = projects.filter(p => p.is_overdue).length

    return {
      success: true,
      data: projects,
      stats: { totalProjects, activeProjects, completedProjects, overdueProjects }
    }
  } catch (err: any) {
    return {
      success: false,
      data: [],
      stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, overdueProjects: 0 },
      error: err.message || 'Failed to fetch projects'
    }
  }
}

/**
 * Fetch detailed project view by ID:
 * Overview, Tasks, Team (with operational hours, STRICTLY NO SALARY/FINANCIAL DATA), Timeline, Activity.
 */
export async function getProjectById(projectId: string): Promise<{
  success: boolean
  data?: {
    project: Project
    teamStats: ProjectTeamMemberStats[]
    activities: ProjectActivity[]
    totalOperationalHours: number
  }
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const admin = await createAdminClient()
    const canSeeContact = canViewRestrictedClientInfo(user)

    const clientSelect = canSeeContact
      ? 'clients(id, client_id_display, name, location, contact_number, whatsapp_number, email)'
      : 'clients(id, client_id_display, name, location)'

    // 1. Fetch project with client, manager, members
    const { data: proj, error: projErr } = await admin
      .from('projects')
      .select(`
        *,
        ${clientSelect},
        project_manager:profiles!projects_project_manager_id_fkey(id, first_name, last_name, employee_id),
        members:project_members(
          id, user_id, role,
          profile:profiles(id, first_name, last_name, employee_id)
        )
      `)
      .eq('id', projectId)
      .single()

    if (projErr || !proj) {
      return { success: false, error: projErr?.message || 'Project not found' }
    }

    // 2. Fetch tasks for this project
    const { data: tasks } = await admin
      .from('tasks')
      .select(`
        id, task_id_display, title, description, priority, status, start_date, due_date,
        estimated_hours, worked_hours, created_at,
        assignees:task_assignees(
          id, user_id,
          profile:profiles!task_assignees_user_id_fkey(id, first_name, last_name, employee_id)
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    const projectTasks = tasks || []

    // 3. Fetch project activities
    const { data: activitiesData } = await admin
      .from('project_activity')
      .select(`
        id, project_id, task_id, user_id, activity_type, details, created_at,
        user_profile:profiles(first_name, last_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50)

    // 4. Calculate task summaries
    const total = projectTasks.length
    const done = projectTasks.filter(t => t.status === 'DONE').length
    const in_progress = projectTasks.filter(t => t.status === 'IN_PROGRESS').length
    const in_review = projectTasks.filter(t => t.status === 'IN_REVIEW').length
    const on_hold = projectTasks.filter(t => t.status === 'ON_HOLD').length
    const todo = projectTasks.filter(t => t.status === 'TODO').length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0
    const now = new Date()
    const is_overdue = proj.deadline && new Date(proj.deadline) < now && proj.status !== 'COMPLETED' && proj.status !== 'CANCELLED'

    let totalOperationalHours = 0

    // 5. Build Team Member Stats (Operational hours and tasks only, ZERO financial info)
    const teamStatsMap = new Map<string, ProjectTeamMemberStats>()

    // Add manager to team if not present
    const pm = Array.isArray(proj.project_manager) ? proj.project_manager[0] : proj.project_manager
    if (pm) {
      const pmName = `${pm.first_name || ''} ${pm.last_name || ''}`.trim() || 'Manager'
      teamStatsMap.set(pm.id, {
        userId: pm.id,
        name: pmName,
        designation: 'Project Manager / HOD',
        assignedTasks: 0,
        completedTasks: 0,
        operationalHours: 0,
      })
    }

    // Add all project members
    for (const m of (proj.members || [])) {
      const mProf = Array.isArray(m.profile) ? m.profile[0] : m.profile
      if (mProf) {
        const mName = `${mProf.first_name || ''} ${mProf.last_name || ''}`.trim() || 'Member'
        if (!teamStatsMap.has(m.user_id)) {
          teamStatsMap.set(m.user_id, {
            userId: m.user_id,
            name: mName,
            designation: m.role || 'Team Member',
            assignedTasks: 0,
            completedTasks: 0,
            operationalHours: 0,
          })
        }
      }
    }

    // Calculate assigned, completed tasks and operational hours per team member
    for (const t of projectTasks) {
      const worked = Number(t.worked_hours) || 0
      totalOperationalHours += worked

      const assignees = t.assignees || []
      for (const a of assignees) {
        let memberStat = teamStatsMap.get(a.user_id)
        if (!memberStat) {
          const aProf = Array.isArray(a.profile) ? a.profile[0] : a.profile
          const aName = aProf ? `${aProf.first_name || ''} ${aProf.last_name || ''}`.trim() : 'Assignee'
          memberStat = {
            userId: a.user_id,
            name: aName,
            designation: 'Contributor',
            assignedTasks: 0,
            completedTasks: 0,
            operationalHours: 0,
          }
          teamStatsMap.set(a.user_id, memberStat)
        }
        memberStat.assignedTasks += 1
        if (t.status === 'DONE') {
          memberStat.completedTasks += 1
        }
        memberStat.operationalHours += worked / (assignees.length || 1)
      }
    }

    const teamStats = Array.from(teamStatsMap.values()).map(s => ({
      ...s,
      operationalHours: Math.round(s.operationalHours * 10) / 10,
    }))

    const project: Project = {
      id: proj.id,
      project_id_display: proj.project_id_display,
      name: proj.name,
      client_id: proj.client_id,
      client_name: (Array.isArray(proj.clients) ? proj.clients[0]?.name : proj.clients?.name) || 'Unknown Client',
      description: proj.description,
      start_date: proj.start_date,
      deadline: proj.deadline,
      status: proj.status,
      priority: proj.priority,
      department: proj.department,
      project_manager_id: proj.project_manager_id,
      project_manager_name: pm
        ? `${pm.first_name || ''} ${pm.last_name || ''}`.trim()
        : null,
      objective: proj.objective,
      notes: proj.notes,
      created_by: proj.created_by,
      created_at: proj.created_at,
      updated_at: proj.updated_at,
      members: proj.members || [],
      task_summary: {
        total,
        done,
        in_progress,
        in_review,
        todo,
        on_hold,
      },
      progress,
      is_overdue: !!is_overdue,
    }

    const mappedActivities: ProjectActivity[] = (activitiesData || []).map((a: any) => {
      const up = Array.isArray(a.user_profile) ? a.user_profile[0] : a.user_profile
      return {
        id: a.id,
        project_id: a.project_id,
        task_id: a.task_id,
        user_id: a.user_id,
        activity_type: a.activity_type,
        details: a.details,
        created_at: a.created_at,
        user_profile: up ? { id: a.user_id, first_name: up.first_name, last_name: up.last_name } : undefined,
      }
    })

    return {
      success: true,
      data: {
        project,
        teamStats,
        activities: mappedActivities,
        totalOperationalHours: Math.round(totalOperationalHours * 10) / 10,
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch project details' }
  }
}

/**
 * Create a new Project.
 * HOD is responsible for creating projects; Admin and Manager also authorized.
 * Requires selecting an existing client.
 * Strictly prevents creating duplicate client records.
 */
export async function createProjectAction(input: CreateProjectInput): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!canCreateProjects(user)) {
      return { success: false, error: 'Unauthorized: Only HOD, Project Manager, or Admin can create projects.' }
    }

    const name = input.name?.trim()
    if (!name) {
      return { success: false, error: 'Project Name is required.' }
    }

    if (!input.client_id) {
      return { success: false, error: 'Client selection is required.' }
    }

    const admin = await createAdminClient()

    // Verify existing client
    const { data: clientData, error: clientErr } = await admin
      .from('clients')
      .select('id, name')
      .eq('id', input.client_id)
      .single()

    if (clientErr || !clientData) {
      return { success: false, error: 'Selected client does not exist. Please select an existing client.' }
    }

    const projectIdDisplay = await generateProjectId()

    // Insert project
    const { data: inserted, error: insertErr } = await admin
      .from('projects')
      .insert({
        project_id_display: projectIdDisplay,
        name,
        client_id: input.client_id,
        description: input.description?.trim() || null,
        start_date: input.start_date || null,
        deadline: input.deadline || null,
        status: input.status || 'PLANNED',
        priority: input.priority || 'MEDIUM',
        department: input.department?.trim() || user.department || null,
        project_manager_id: input.project_manager_id || user.id,
        objective: input.objective?.trim() || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr || !inserted) {
      return { success: false, error: insertErr?.message || 'Failed to create project.' }
    }

    // Insert team members if provided
    const teamMembers = Array.from(new Set(input.team_members || []))
    // Ensure project manager / creator is also recorded if needed
    if (input.project_manager_id && !teamMembers.includes(input.project_manager_id)) {
      teamMembers.push(input.project_manager_id)
    }

    if (teamMembers.length > 0) {
      const memberRows = teamMembers.map(uid => ({
        project_id: inserted.id,
        user_id: uid,
        role: uid === inserted.project_manager_id ? 'Project Manager' : 'Member',
      }))
      await admin.from('project_members').insert(memberRows)
    }

    // Log project activity
    await admin.from('project_activity').insert({
      project_id: inserted.id,
      user_id: user.id,
      activity_type: 'PROJECT_CREATED',
      details: {
        project_name: inserted.name,
        client_name: clientData.name,
        created_by: user.employee_name || user.email,
      },
    })

    revalidatePath('/projects')
    revalidatePath('/dashboard')
    return { success: true, data: inserted as Project }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create project' }
  }
}

/**
 * Update an existing Project.
 */
export async function updateProjectAction(input: UpdateProjectInput): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!canEditProject(user)) {
      return { success: false, error: 'Unauthorized: You do not have permission to edit this project.' }
    }

    const admin = await createAdminClient()

    const updatePayload: Record<string, any> = {}
    if (input.name !== undefined) updatePayload.name = input.name.trim()
    if (input.client_id !== undefined) updatePayload.client_id = input.client_id
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null
    if (input.start_date !== undefined) updatePayload.start_date = input.start_date || null
    if (input.deadline !== undefined) updatePayload.deadline = input.deadline || null
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.priority !== undefined) updatePayload.priority = input.priority
    if (input.department !== undefined) updatePayload.department = input.department?.trim() || null
    if (input.project_manager_id !== undefined) updatePayload.project_manager_id = input.project_manager_id || null
    if (input.objective !== undefined) updatePayload.objective = input.objective?.trim() || null
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null

    const { data: updated, error: updateErr } = await admin
      .from('projects')
      .update(updatePayload)
      .eq('id', input.id)
      .select()
      .single()

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Update members if provided
    if (input.team_members) {
      const uniqueMembers = Array.from(new Set(input.team_members))
      await admin.from('project_members').delete().eq('project_id', input.id)
      if (uniqueMembers.length > 0) {
        const memberRows = uniqueMembers.map(uid => ({
          project_id: input.id,
          user_id: uid,
          role: uid === updated.project_manager_id ? 'Project Manager' : 'Member',
        }))
        await admin.from('project_members').insert(memberRows)
      }
    }

    // Log activity
    await admin.from('project_activity').insert({
      project_id: input.id,
      user_id: user.id,
      activity_type: 'PROJECT_UPDATED',
      details: {
        updated_by: user.employee_name || user.email,
        updated_fields: Object.keys(updatePayload),
      },
    })

    revalidatePath('/projects')
    revalidatePath(`/projects/${input.id}`)
    return { success: true, data: updated as Project }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update project' }
  }
}
