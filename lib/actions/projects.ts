'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canCreateProjects, canEditProject, canViewRestrictedClientInfo } from '@/lib/permissions/project-management'
import { Project, ProjectStatus, ProjectPriority, ProjectDashboardStats, ProjectTeamMemberStats, ProjectActivity } from '@/types/project-management'
import { revalidatePath } from 'next/cache'
import { attachProfilePhotos } from '@/lib/utils/profile-photos'

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

    const isEmployee = user.role === 'Employee' && !user.is_hod
    let allowedTaskIds: string[] = []

    if (isEmployee) {
      // First find projects where the user is a member
      const { data: memberProjects } = await admin
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)

      // Second find tasks where the user is assigned, then get those project IDs
      const { data: userTasks } = await admin
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', user.id)
        
      allowedTaskIds = (userTasks || []).map((t: any) => t.task_id)
      let taskProjectIds: string[] = []
      
      if (allowedTaskIds.length > 0) {
        const { data: tData } = await admin
          .from('tasks')
          .select('project_id')
          .in('id', allowedTaskIds)
        taskProjectIds = (tData || []).map((t: any) => t.project_id)
      }

      const memberProjectIds = (memberProjects || []).map(m => m.project_id)
      const allProjectIds = Array.from(new Set([...memberProjectIds, ...taskProjectIds]))

      if (allProjectIds.length > 0) {
        query = query.in('id', allProjectIds)
      } else {
        // If employee has no projects, return empty immediately
        return {
          success: true,
          data: [],
          stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, overdueProjects: 0 }
        }
      }
    }

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

    // Collect all profiles to fetch photos
    const allProfiles: any[] = []
    ;(data || []).forEach((row: any) => {
      if (row.project_manager) allProfiles.push(row.project_manager)
      ;(row.members || []).forEach((m: any) => {
        if (m.profile) allProfiles.push(m.profile)
      })
    })
    await attachProfilePhotos(admin, allProfiles)

    const now = new Date()

    const projects: Project[] = (data || []).map((row: any) => {
      let tasks = row.tasks || []
      
      // If employee, filter their visible tasks for accurate counts
      if (isEmployee) {
        tasks = tasks.filter((t: any) => allowedTaskIds.includes(t.id))
      }
      
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
 * Fetch projects assigned to the current employee.
 * Useful for the Employee Dashboard "My Projects" view.
 */
export async function getMyProjects(): Promise<{ success: boolean; data: Project[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, data: [], error: 'Authentication required' }
    }

    const admin = await createAdminClient()
    const canSeeContact = canViewRestrictedClientInfo(user)

    // Build client select without contact info for restricted roles
    const clientSelect = canSeeContact
      ? 'clients(id, client_id_display, name, location, contact_number, whatsapp_number, email)'
      : 'clients(id, client_id_display, name, location)'

    // First find projects where the user is a member or the manager
    const { data: memberProjects } = await admin
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)

    // Second find tasks where the user is assigned, then get those project IDs
    const { data: userTasks } = await admin
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', user.id)
      
    const taskIds = (userTasks || []).map(t => t.task_id)
    let taskProjectIds: string[] = []
    
    if (taskIds.length > 0) {
      const { data: tData } = await admin
        .from('tasks')
        .select('project_id')
        .in('id', taskIds)
      taskProjectIds = (tData || []).map(t => t.project_id)
    }

    const memberProjectIds = (memberProjects || []).map(m => m.project_id)
    
    // Combine all project IDs
    const allProjectIds = Array.from(new Set([...memberProjectIds, ...taskProjectIds]))
    
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
      .order('deadline', { ascending: true })

    if (allProjectIds.length > 0) {
      query = query.or(`id.in.(${allProjectIds.join(',')}),project_manager_id.eq.${user.id}`)
    } else {
      query = query.eq('project_manager_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
        return { success: true, data: [] }
      }
      return { success: false, data: [], error: error.message }
    }

    // Collect all profiles to fetch photos
    const allProfiles: any[] = []
    ;(data || []).forEach((row: any) => {
      if (row.project_manager) allProfiles.push(row.project_manager)
      ;(row.members || []).forEach((m: any) => {
        if (m.profile) allProfiles.push(m.profile)
      })
    })
    await attachProfilePhotos(admin, allProfiles)

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

    return { success: true, data: projects }
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Failed to fetch my projects' }
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

    // Ensure authorization
    const isGlobalAdminOrManager = user.role === 'Admin' || user.is_hod
    let isAuthorized = isGlobalAdminOrManager
    
    if (!isAuthorized) {
      // Check if project manager
      const { data: pCheck } = await admin.from('projects').select('project_manager_id').eq('id', projectId).single()
      if (pCheck?.project_manager_id === user.id) {
        isAuthorized = true
      } else {
        // Check membership
        const { data: mCheck } = await admin.from('project_members').select('id').eq('project_id', projectId).eq('user_id', user.id)
        if (mCheck && mCheck.length > 0) {
          isAuthorized = true
        } else {
          // Check task assignment
          const { data: tCheck } = await admin.from('tasks').select('id').eq('project_id', projectId)
          if (tCheck && tCheck.length > 0) {
            const taskIds = tCheck.map((t: any) => t.id)
            const { data: taCheck } = await admin.from('task_assignees').select('id').in('task_id', taskIds).eq('user_id', user.id).limit(1)
            if (taCheck && taCheck.length > 0) {
              isAuthorized = true
            }
          }
        }
      }
    }
    
    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized access: You are not assigned to this project or its tasks.' }
    }

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
    let tasksQuery = admin
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

    if (user.role === 'Employee' && !user.is_hod) {
      const { data: userTasks } = await admin
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', user.id)
      
      const allowedTaskIds = (userTasks || []).map((t: any) => t.task_id)
      
      if (allowedTaskIds.length === 0) {
        // Fallback: no tasks allowed
        tasksQuery = tasksQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
      } else {
        tasksQuery = tasksQuery.in('id', allowedTaskIds)
      }
    }

    const { data: tasks } = await tasksQuery

    const projectTasks = tasks || []

    // Collect all profiles to fetch photos
    const allProfiles: any[] = []
    if (proj.project_manager) {
      if (Array.isArray(proj.project_manager)) allProfiles.push(...proj.project_manager)
      else allProfiles.push(proj.project_manager)
    }
    ;(proj.members || []).forEach((m: any) => {
      if (m.profile) {
        if (Array.isArray(m.profile)) allProfiles.push(...m.profile)
        else allProfiles.push(m.profile)
      }
    })
    projectTasks.forEach((t: any) => {
      ;(t.assignees || []).forEach((a: any) => {
        if (a.profile) {
          if (Array.isArray(a.profile)) allProfiles.push(...a.profile)
          else allProfiles.push(a.profile)
        }
      })
    })
    await attachProfilePhotos(admin, allProfiles)

    // Ensure teamStatsMap receives the updated profile photos
    // Note: teamStatsMap is built after this, but we will pass the mutated profiles directly into the map builder below.


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
        profilePhoto: pm.profile_photo || null,
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
            profilePhoto: mProf.profile_photo || null,
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
            profilePhoto: (aProf as any)?.profile_photo || null,
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

    const teamStats = Array.from(teamStatsMap.values()).map(s => {
      // Find updated profile from allProfiles
      const p = allProfiles.find(ap => ap.id === s.userId)
      if (p && p.profile_photo) {
        s.profilePhoto = p.profile_photo
      }
      return {
        ...s,
        operationalHours: Math.round(s.operationalHours * 10) / 10,
      }
    })

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

/**
 * Check if the user has access to any projects via membership or task assignments.
 */
export async function checkEmployeeProjectAccess(userId: string): Promise<boolean> {
  try {
    const admin = await createAdminClient()

    // Check project manager
    const { data: pCheck } = await admin.from('projects').select('id').eq('project_manager_id', userId).limit(1)
    if (pCheck && pCheck.length > 0) return true

    // Check membership
    const { data: mCheck } = await admin.from('project_members').select('id').eq('user_id', userId).limit(1)
    if (mCheck && mCheck.length > 0) return true

    // Check task assignment
    const { data: taCheck } = await admin.from('task_assignees').select('id').eq('user_id', userId).limit(1)
    if (taCheck && taCheck.length > 0) return true

    return false
  } catch (err) {
    console.error('Error checking project access:', err)
    return false
  }
}

/**
 * Check if the user has any tasks assigned to them.
 */
export async function checkEmployeeHasTasks(userId: string): Promise<boolean> {
  try {
    const admin = await createAdminClient()
    const { data: taCheck } = await admin.from('task_assignees').select('id').eq('user_id', userId).limit(1)
    return !!(taCheck && taCheck.length > 0)
  } catch (err) {
    console.error('Error checking task assignment:', err)
    return false
  }
}
