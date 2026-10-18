'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getClientIpDetails } from '@/lib/utils/device-parser'
import { logSecurityEvent } from '@/lib/utils/audit-logger'

export interface DeactivationImpact {
  success: boolean
  employee: {
    id: string
    employee_id_number: string | null
    fullName: string
    department: string
    designation: string
    employment_status: string
    email: string
    is_hod: boolean
    auth_user_id: string | null
  } | null
  isSelf: boolean
  isTargetAdmin: boolean
  isHod: boolean
  hodDepartment: string | null
  activeProjectsCount: number
  activeProjects: { id: string; name: string; status: string }[]
  activeTasksCount: number
  activeTasks: { id: string; title: string; status: string }[]
  pendingLeaveCount: number
  pendingEodCount: number
  pendingApprovalsCount: number
  canDeactivate: boolean
  blockReason?: string
  errorMessage?: string
}

/**
 * Safely fetches an employee record by UUID or employee_id_number.
 * Prevents PostgreSQL 22P02 invalid UUID syntax errors.
 */
async function findEmployeeSafely(admin: any, employeeId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)

  if (isUuid) {
    const { data: empById } = await admin
      .from('employee_onboarding')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()
    if (empById) return empById
  }

  const { data: empByNum } = await admin
    .from('employee_onboarding')
    .select('*')
    .eq('employee_id_number', employeeId)
    .maybeSingle()
  if (empByNum) return empByNum

  if (!isUuid) {
    try {
      const { data: fallback, error } = await admin
        .from('employee_onboarding')
        .select('*')
        .eq('id', employeeId)
        .maybeSingle()
      if (!error && fallback) return fallback
    } catch {
      // Ignore uuid syntax error on fallback
    }
  }

  return null
}

/**
 * Inspects all active responsibilities, HOD status, projects, tasks,
 * and pending approvals before deactivation.
 */
export async function getEmployeeDeactivationImpact(employeeId: string): Promise<DeactivationImpact> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        employee: null,
        isSelf: false,
        isTargetAdmin: false,
        isHod: false,
        hodDepartment: null,
        activeProjectsCount: 0,
        activeProjects: [],
        activeTasksCount: 0,
        activeTasks: [],
        pendingLeaveCount: 0,
        pendingEodCount: 0,
        pendingApprovalsCount: 0,
        canDeactivate: false,
        errorMessage: 'Authentication required',
      }
    }

    const roleLower = (currentUser.role || '').toLowerCase()
    const isAuthorized = roleLower === 'admin' || roleLower === 'super admin' || roleLower === 'hr'
    if (!isAuthorized) {
      return {
        success: false,
        employee: null,
        isSelf: false,
        isTargetAdmin: false,
        isHod: false,
        hodDepartment: null,
        activeProjectsCount: 0,
        activeProjects: [],
        activeTasksCount: 0,
        activeTasks: [],
        pendingLeaveCount: 0,
        pendingEodCount: 0,
        pendingApprovalsCount: 0,
        canDeactivate: false,
        errorMessage: 'Insufficient permissions. Only Admin and HR can view deactivation impact.',
      }
    }

    const admin = await createAdminClient()
    const employee = await findEmployeeSafely(admin, employeeId)

    if (!employee) {
      return {
        success: false,
        employee: null,
        isSelf: false,
        isTargetAdmin: false,
        isHod: false,
        hodDepartment: null,
        activeProjectsCount: 0,
        activeProjects: [],
        activeTasksCount: 0,
        activeTasks: [],
        pendingLeaveCount: 0,
        pendingEodCount: 0,
        pendingApprovalsCount: 0,
        canDeactivate: false,
        errorMessage: 'Employee record not found',
      }
    }

    // Resolve profile and Auth User ID
    let targetAuthUserId: string | null = employee.auth_user_id || null
    let targetProfile: any = null

    if (employee.employee_id_number) {
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('employee_id', employee.employee_id_number)
        .maybeSingle()

      if (prof) {
        targetProfile = prof
        if (!targetAuthUserId && prof.id) {
          targetAuthUserId = prof.id
        }
      }
    }

    if (!targetAuthUserId && employee.email) {
      try {
        const { data: listData } = await admin.auth.admin.listUsers()
        const found = listData?.users?.find(
          (u: any) => u.email?.toLowerCase().trim() === employee.email?.toLowerCase().trim()
        )
        if (found) targetAuthUserId = found.id
      } catch {
        // Continue if listUsers restricted
      }
    }

    // Check if self-deactivation attempt
    const isSelf = Boolean(
      (targetAuthUserId && targetAuthUserId === currentUser.id) ||
      (employee.employee_id_number && employee.employee_id_number === currentUser.employee_id)
    )

    // Check if target is Admin
    const targetRole = (targetProfile?.role || employee.role || '').toLowerCase()
    const isTargetAdmin = targetRole === 'admin' || targetRole === 'super admin'

    // Check HOD status
    let isHod = Boolean(employee.is_hod || targetProfile?.is_hod)
    let hodDepartment: string | null = employee.department || targetProfile?.department || null

    if (targetAuthUserId) {
      try {
        const { data: activeAssignments } = await admin
          .from('department_hod_assignments')
          .select('department, is_active')
          .eq('employee_id', targetAuthUserId)
          .eq('is_active', true)

        if (activeAssignments && activeAssignments.length > 0) {
          isHod = true
          hodDepartment = activeAssignments.map((a: any) => a.department).filter(Boolean).join(', ')
        }
      } catch {
        // Table may be absent in some test environments
      }
    }

    // 1. Query Active Projects Managed
    let activeProjects: { id: string; name: string; status: string }[] = []
    if (targetAuthUserId) {
      try {
        const { data: projects } = await admin
          .from('projects')
          .select('id, name, status')
          .eq('project_manager_id', targetAuthUserId)
          .not('status', 'in', '("COMPLETED","CANCELLED")')

        if (projects) {
          activeProjects = projects
        }
      } catch {
        // Ignore table errors if not present
      }
    }

    // 2. Query Active Assigned Tasks
    let activeTasks: { id: string; title: string; status: string }[] = []
    if (targetAuthUserId) {
      try {
        const { data: assignees } = await admin
          .from('task_assignees')
          .select('task_id, tasks(id, title, status)')
          .eq('user_id', targetAuthUserId)

        if (assignees) {
          activeTasks = assignees
            .map((a: any) => a.tasks)
            .filter((t: any) => t && !['DONE', 'CANCELLED'].includes(t.status))
        }
      } catch {
        // Ignore table errors if not present
      }
    }

    // 3. Query Pending Leave & WFH Requests
    let pendingLeaveCount = 0
    try {
      const { data: leaves } = await admin
        .from('leave_requests')
        .select('id, status')
        .eq('employee_id', employee.id)
        .in('status', ['Pending Level', 'Pending HR', 'Pending Admin'])

      if (leaves) {
        pendingLeaveCount = leaves.length
      }
    } catch {
      // Ignore if table not present
    }

    // 4. Query Pending EOD Reports
    let pendingEodCount = 0
    if (targetAuthUserId) {
      try {
        const { data: eods } = await admin
          .from('eod_reports')
          .select('id, status')
          .eq('employee_id', targetAuthUserId)
          .eq('status', 'Pending')

        if (eods) {
          pendingEodCount = eods.length
        }
      } catch {
        // Ignore if table not present
      }
    }

    // 5. Query Pending Approvals where employee is first_level_approver or hr_approver
    let pendingApprovalsCount = 0
    try {
      const { data: approvals } = await admin
        .from('leave_requests')
        .select('id, status')
        .or(`first_level_approver_id.eq.${employee.id},hr_approver_id.eq.${employee.id}`)
        .in('status', ['Pending Level', 'Pending HR', 'Pending Admin'])

      if (approvals) {
        pendingApprovalsCount = approvals.length
      }
    } catch {
      // Ignore if not applicable
    }

    // Determine canDeactivate and blocking reasons
    let canDeactivate = true
    let blockReason: string | undefined

    if (isSelf) {
      canDeactivate = false
      blockReason = 'You cannot deactivate your own account.'
    } else if (isTargetAdmin && roleLower !== 'super admin') {
      canDeactivate = false
      blockReason = 'Cannot deactivate an Admin or Super Admin account directly. Administrative privileges must be revoked first.'
    } else if (isHod) {
      canDeactivate = false
      blockReason = `This employee is currently an active Head of Department (HOD) for ${hodDepartment || 'their department'}. HOD responsibilities must be reassigned before deactivation can proceed.`
    }

    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'

    return {
      success: true,
      employee: {
        id: employee.id,
        employee_id_number: employee.employee_id_number || null,
        fullName,
        department: employee.department || 'Not Assigned',
        designation: employee.designation || employee.job_title || 'Employee',
        employment_status: employee.employment_status || 'Active',
        email: employee.email || '',
        is_hod: isHod,
        auth_user_id: targetAuthUserId,
      },
      isSelf,
      isTargetAdmin,
      isHod,
      hodDepartment,
      activeProjectsCount: activeProjects.length,
      activeProjects,
      activeTasksCount: activeTasks.length,
      activeTasks,
      pendingLeaveCount,
      pendingEodCount,
      pendingApprovalsCount,
      canDeactivate,
      blockReason,
    }
  } catch (error: any) {
    console.error('[getEmployeeDeactivationImpact] Error:', error)
    return {
      success: false,
      employee: null,
      isSelf: false,
      isTargetAdmin: false,
      isHod: false,
      hodDepartment: null,
      activeProjectsCount: 0,
      activeProjects: [],
      activeTasksCount: 0,
      activeTasks: [],
      pendingLeaveCount: 0,
      pendingEodCount: 0,
      pendingApprovalsCount: 0,
      canDeactivate: false,
      errorMessage: error.message || 'Failed to inspect deactivation impact',
    }
  }
}

interface DeactivateParams {
  employeeId: string
  reason?: string
}

/**
 * Execute employee deactivation:
 * 1. Strict RBAC validation (Admin only).
 * 2. Pre-flight sanity checks (no self-deactivation, no HOD deactivation without reassignment).
 * 3. Sets employment_status = 'Inactive'.
 * 4. Revokes Supabase Auth access and bans authentication.
 * 5. Logs security audit event without exposing secrets.
 * 6. Preserves all historical records (leaves, EOD, payroll, tasks).
 */
export async function deactivateEmployee({ employeeId, reason }: DeactivateParams): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Authentication required' }
    }

    // Role check: Only Admin (or Super Admin) can deactivate
    const roleLower = (currentUser.role || '').toLowerCase()
    const isAdmin = roleLower === 'admin' || roleLower === 'super admin'
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admin users can deactivate employees.' }
    }

    const admin = await createAdminClient()
    const employee = await findEmployeeSafely(admin, employeeId)

    if (!employee) {
      return { success: false, error: 'Employee record not found.' }
    }

    // Check pre-flight impact
    const impact = await getEmployeeDeactivationImpact(employee.id)
    if (!impact.canDeactivate) {
      return { success: false, error: impact.blockReason || 'Employee cannot be deactivated at this time.' }
    }

    const nowIso = new Date().toISOString()
    const actorName = currentUser.employee_name || currentUser.email
    const deactivationNote = `[DEACTIVATED: ${nowIso} by ${actorName} (${currentUser.employee_id || currentUser.id}) - Reason: ${reason?.trim() || 'Administrative Deactivation'}]`

    const existingNotes = employee.notes ? `${employee.notes}\n${deactivationNote}` : deactivationNote

    // 1. Update authoritative employment_status to 'Inactive'
    try {
      const { error: updateErr } = await admin
        .from('employee_onboarding')
        .update({
          employment_status: 'Inactive',
          notes: existingNotes,
          updated_at: nowIso,
        })
        .eq('id', employee.id)

      if (updateErr) {
        throw new Error(`Failed to update employee status: ${updateErr.message}`)
      }
    } catch (err: any) {
      throw new Error(`Database error while updating employee status: ${err.message}`)
    }

    // 2. Revoke Supabase Auth access and ban active sessions
    let targetAuthUserId = impact.employee?.auth_user_id || employee.auth_user_id || null

    if (targetAuthUserId) {
      try {
        const profileUpdates: any = { updated_at: nowIso }
        await admin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', targetAuthUserId)
      } catch {
        // Ignore
      }
    }

    if (targetAuthUserId) {
      try {
        // Ban user for 100 years and set app_metadata.deactivated = true
        await admin.auth.admin.updateUserById(targetAuthUserId, {
          ban_duration: '876600h',
          app_metadata: {
            deactivated: true,
            deactivated_at: nowIso,
            deactivated_by: currentUser.id,
          },
        })

        // Sign out all active sessions if supported
        try {
          if (typeof (admin.auth.admin as any).signOut === 'function') {
            await (admin.auth.admin as any).signOut(targetAuthUserId, 'global')
          }
        } catch {
          // Ignore if admin signOut requires a JWT string
        }
      } catch (authErr: any) {
        console.warn('[deactivateEmployee] Warning during Supabase Auth revocation:', authErr.message)
      }
    }

    // 4. Record Security Audit Log & Activity Log
    const targetName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    try {
      let ip: string | null = null
      let location = 'Localhost (Development Environment)'
      let userAgent = 'Internal Server Action'
      let sourceHeader = 'internal-action'
      let classification: any = 'Localhost'

      try {
        const headerStore = await headers()
        const details = getClientIpDetails(headerStore)
        ip = details.ip
        location = details.location
        sourceHeader = details.sourceHeader
        classification = details.classification
        userAgent = headerStore.get('user-agent') || 'Internal Server Action'
      } catch {
        // Non-request context fallback
      }

      await logSecurityEvent({
        eventType: 'session_revoked',
        status: 'Success',
        userId: targetAuthUserId,
        employeeId: employee.id,
        employeeIdNumber: employee.employee_id_number || null,
        employeeName: targetName,
        authMethod: 'Admin Action',
        ipAddress: ip,
        ipClassification: classification,
        location,
        userAgent,
        sessionStatus: 'Revoked',
        metadataSource: sourceHeader,
        metadata: {
          action: 'employee_deactivated',
          actor_email: currentUser.email,
          actor_role: currentUser.role,
          actor_id: currentUser.id,
          deactivation_reason: reason || 'Not Specified',
          preserved_records: {
            active_projects: impact.activeProjectsCount,
            active_tasks: impact.activeTasksCount,
            pending_leaves: impact.pendingLeaveCount,
            pending_eods: impact.pendingEodCount,
          },
        },
      })

      // Also record in activity_logs
      await admin.from('activity_logs').insert({
        action: 'employee_deactivated',
        actor_email: currentUser.email,
        user_id: currentUser.id,
        target_user_id: targetAuthUserId,
        details: {
          target_employee_id: employee.employee_id_number,
          target_name: targetName,
          reason: reason || 'Not Specified',
          deactivated_at: nowIso,
        },
        severity: 'WARN',
        created_at: nowIso,
      })
    } catch (auditErr) {
      console.warn('[deactivateEmployee] Audit logging non-blocking notice:', auditErr)
    }

    // 5. Revalidate Paths
    revalidatePath('/employees')
    revalidatePath(`/employees/${employee.id}`)
    revalidatePath('/hr/onboarding')
    revalidatePath(`/hr/onboarding/${employee.id}`)
    revalidatePath('/dashboard')
    revalidatePath('/tasks')
    revalidatePath('/projects')
    revalidatePath('/quick-tasks')

    return {
      success: true,
      message: `${targetName} has been deactivated successfully. ERP access has been revoked.`,
    }
  } catch (err: any) {
    console.error('[deactivateEmployee] Error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while deactivating the employee.',
    }
  }
}

interface ReactivateParams {
  employeeId: string
  reason?: string
}

/**
 * Execute employee reactivation:
 * 1. Strict RBAC validation (Admin only).
 * 2. Restores employment_status to 'Active'.
 * 3. Lifts ban in Supabase Auth (ban_duration: 'none').
 * 4. Logs security audit event.
 * 5. Requires employee to re-authenticate (revoked sessions are not restored).
 */
export async function reactivateEmployee({ employeeId, reason }: ReactivateParams): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Authentication required' }
    }

    const roleLower = (currentUser.role || '').toLowerCase()
    const isAdmin = roleLower === 'admin' || roleLower === 'super admin'
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admin users can reactivate employees.' }
    }

    const admin = await createAdminClient()
    const employee = await findEmployeeSafely(admin, employeeId)

    if (!employee) {
      return { success: false, error: 'Employee record not found.' }
    }

    const nowIso = new Date().toISOString()
    const actorName = currentUser.employee_name || currentUser.email
    const reactivationNote = `[REACTIVATED: ${nowIso} by ${actorName} (${currentUser.employee_id || currentUser.id}) - Reason: ${reason?.trim() || 'Administrative Reactivation'}]`

    const existingNotes = employee.notes ? `${employee.notes}\n${reactivationNote}` : reactivationNote

    // 1. Update employment_status to 'Active'
    try {
      const { error: updateErr } = await admin
        .from('employee_onboarding')
        .update({
          employment_status: 'Active',
          notes: existingNotes,
          updated_at: nowIso,
        })
        .eq('id', employee.id)

      if (updateErr) {
        throw new Error(`Failed to reactivate employee: ${updateErr.message}`)
      }
    } catch (err: any) {
      throw new Error(`Database error while reactivating employee: ${err.message}`)
    }

    // 2. Lift ban in Supabase Auth
    let targetAuthUserId: string | null = employee.auth_user_id || null
    if (!targetAuthUserId && employee.employee_id_number) {
      const { data: prof } = await admin
        .from('profiles')
        .select('id')
        .eq('employee_id', employee.employee_id_number)
        .maybeSingle()
      if (prof) targetAuthUserId = prof.id
    }

    if (targetAuthUserId) {
      try {
        await admin.auth.admin.updateUserById(targetAuthUserId, {
          ban_duration: 'none',
          app_metadata: {
            deactivated: false,
            reactivated_at: nowIso,
            reactivated_by: currentUser.id,
          },
        })
      } catch (authErr: any) {
        console.warn('[reactivateEmployee] Warning during Supabase Auth unbanning:', authErr.message)
      }
    }

    // 4. Record Security Audit Log
    const targetName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    try {
      let ip: string | null = null
      let location = 'Localhost (Development Environment)'
      let userAgent = 'Internal Server Action'
      let sourceHeader = 'internal-action'
      let classification: any = 'Localhost'

      try {
        const headerStore = await headers()
        const details = getClientIpDetails(headerStore)
        ip = details.ip
        location = details.location
        sourceHeader = details.sourceHeader
        classification = details.classification
        userAgent = headerStore.get('user-agent') || 'Internal Server Action'
      } catch {
        // Fallback
      }

      await logSecurityEvent({
        eventType: 'session_refresh',
        status: 'Success',
        userId: targetAuthUserId,
        employeeId: employee.id,
        employeeIdNumber: employee.employee_id_number || null,
        employeeName: targetName,
        authMethod: 'Admin Action',
        ipAddress: ip,
        ipClassification: classification,
        location,
        userAgent,
        sessionStatus: 'Active',
        metadataSource: sourceHeader,
        metadata: {
          action: 'employee_reactivated',
          actor_email: currentUser.email,
          actor_role: currentUser.role,
          actor_id: currentUser.id,
          reactivation_reason: reason || 'Not Specified',
        },
      })

      await admin.from('activity_logs').insert({
        action: 'employee_reactivated',
        actor_email: currentUser.email,
        user_id: currentUser.id,
        target_user_id: targetAuthUserId,
        details: {
          target_employee_id: employee.employee_id_number,
          target_name: targetName,
          reason: reason || 'Not Specified',
          reactivated_at: nowIso,
        },
        severity: 'INFO',
        created_at: nowIso,
      })
    } catch (auditErr) {
      console.warn('[reactivateEmployee] Audit logging non-blocking notice:', auditErr)
    }

    revalidatePath('/employees')
    revalidatePath(`/employees/${employee.id}`)
    revalidatePath('/hr/onboarding')
    revalidatePath(`/hr/onboarding/${employee.id}`)
    revalidatePath('/dashboard')
    revalidatePath('/tasks')
    revalidatePath('/projects')
    revalidatePath('/quick-tasks')

    return {
      success: true,
      message: `${targetName} has been reactivated successfully. They may now authenticate into the ERP.`,
    }
  } catch (err: any) {
    console.error('[reactivateEmployee] Error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while reactivating the employee.',
    }
  }
}
