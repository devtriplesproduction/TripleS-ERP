'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { validatePassword } from '@/lib/validations/password'
import { checkRateLimit } from '@/lib/utils/rate-limiter'
import { revalidatePath } from 'next/cache'

interface ChangePasswordParams {
  employeeId: string
  newPassword: string
  confirmPassword: string
}

interface AuditLogOptions {
  actorUserId: string
  actorEmail: string
  targetAuthUserId: string | null
  result: 'success' | 'failure'
  failureReason?: string
  employee?: {
    id: string
    employee_id_number?: string | null
    email?: string | null
    first_name?: string | null
    last_name?: string | null
  }
  actorRole: string
}

/**
 * Record an audit log entry for administrative password operations.
 * CRITICAL: Never logs plaintext passwords or sensitive credentials.
 */
async function recordPasswordAuditLog(options: AuditLogOptions) {
  try {
    const admin = await createAdminClient()
    const auditDetails = {
      action_type: 'administrative_password_change',
      result: options.result,
      target_employee_id: options.employee?.employee_id_number || null,
      target_employee_onboarding_id: options.employee?.id || null,
      target_email: options.employee?.email || null,
      target_name: options.employee
        ? `${options.employee.first_name || ''} ${options.employee.last_name || ''}`.trim()
        : null,
      actor_role: options.actorRole,
      ...(options.failureReason ? { failure_reason: options.failureReason } : {}),
    }

    const { error } = await admin.from('activity_logs').insert({
      action: 'administrative_password_change',
      actor_email: options.actorEmail,
      user_id: options.actorUserId,
      target_user_id: options.targetAuthUserId,
      details: auditDetails,
      severity: options.result === 'success' ? 'INFO' : 'WARN',
      created_at: new Date().toISOString(),
    })

    if (error && error.code !== 'PGRST205') {
      console.error('[recordPasswordAuditLog] activity_logs insert error:', error.message)
    }

    // Also record in dedicated security audit trail
    let ip: string | null = null
    let location = 'Unknown'
    let userAgent = 'Internal Server Action'
    let sourceHeader = 'internal-action'
    let classification: any = 'Unavailable'
    try {
      const { headers } = await import('next/headers')
      const headerStore = await headers()
      const { resolveClientMetadata } = await import('@/lib/utils/device-parser')
      const details = await resolveClientMetadata(headerStore)
      ip = details.ip
      location = details.location
      sourceHeader = details.sourceHeader
      classification = details.classification
      userAgent = headerStore.get('user-agent') || 'Internal Server Action'
    } catch {
      // In non-request or mock test context
    }

    const { logSecurityEvent } = await import('@/lib/utils/audit-logger')
    await logSecurityEvent({
      eventType: 'password_change',
      status: options.result === 'success' ? 'Success' : 'Failed',
      userId: options.targetAuthUserId,
      employeeId: options.employee?.id || null,
      employeeIdNumber: options.employee?.employee_id_number || null,
      employeeName: options.employee ? `${options.employee.first_name || ''} ${options.employee.last_name || ''}`.trim() : null,
      authMethod: 'Admin Action',
      ipAddress: ip,
      ipClassification: classification,
      location,
      userAgent,
      metadataSource: sourceHeader,
      metadata: {
        actor_email: options.actorEmail,
        actor_role: options.actorRole,
        failure_reason: options.failureReason
      }
    })
  } catch (err) {
    // Non-blocking: audit log failure should not crash operation
    console.error('[recordPasswordAuditLog] Unexpected error:', err)
  }
}

/**
 * Helper to safely fetch an employee record by UUID or employee_id_number.
 * Prevents PostgreSQL 22P02 invalid UUID syntax errors.
 */
async function findEmployeeSafely(admin: any, employeeId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)
  
  // 1. Try by id if UUID
  if (isUuid) {
    const { data: empById } = await admin
      .from('employee_onboarding')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()
    if (empById) return empById
  }

  // 2. Try by employee_id_number
  const { data: empByNum } = await admin
    .from('employee_onboarding')
    .select('*')
    .eq('employee_id_number', employeeId)
    .maybeSingle()
  if (empByNum) return empByNum

  // 3. Fallback try by id if not already tried (for test mocks / custom IDs)
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
 * Get account and permission status for Change Password UI.
 */
export async function getEmployeePasswordChangeInfo(employeeId: string): Promise<{
  success: boolean
  hasAccount: boolean
  employeeIdNumber: string | null
  employeeName: string
  email: string | null
  isTargetAdmin: boolean
  canChangePassword: boolean
  errorMessage?: string
}> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        hasAccount: false,
        employeeIdNumber: null,
        employeeName: '',
        email: null,
        isTargetAdmin: false,
        canChangePassword: false,
        errorMessage: 'Authentication required',
      }
    }

    const roleLower = (currentUser.role || '').toLowerCase()
    const isAuthorizedRole = roleLower === 'admin' || roleLower === 'hr'
    if (!isAuthorizedRole) {
      return {
        success: false,
        hasAccount: false,
        employeeIdNumber: null,
        employeeName: '',
        email: null,
        isTargetAdmin: false,
        canChangePassword: false,
        errorMessage: 'Insufficient permissions. Only Admin and HR can change passwords.',
      }
    }

    const admin = await createAdminClient()
    const employee = await findEmployeeSafely(admin, employeeId)

    if (!employee) {
      return {
        success: false,
        hasAccount: false,
        employeeIdNumber: null,
        employeeName: '',
        email: null,
        isTargetAdmin: false,
        canChangePassword: false,
        errorMessage: 'Employee not found',
      }
    }

    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()

    // Check if target is an Admin
    let targetRole = employee.role || ''
    let targetAuthUserId = employee.auth_user_id

    if (employee.employee_id_number) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, role')
        .eq('employee_id', employee.employee_id_number)
        .maybeSingle()

      if (profile) {
        if (!targetAuthUserId && profile.id) {
          targetAuthUserId = profile.id
        }
        if (profile.role) {
          targetRole = profile.role
        }
      }
    }

    const targetRoleLower = targetRole.toLowerCase()
    const isTargetAdmin = targetRoleLower === 'admin' || targetRoleLower === 'super_admin'

    // Check auth account existence
    let hasAccount = false
    if (targetAuthUserId) {
      const { data: authUser } = await admin.auth.admin.getUserById(targetAuthUserId)
      if (authUser?.user) {
        hasAccount = true
      }
    }

    if (!hasAccount && employee.email) {
      const { data: listData } = await admin.auth.admin.listUsers()
      const found = listData?.users?.find(
        (u) => u.email?.toLowerCase().trim() === employee.email?.toLowerCase().trim()
      )
      if (found) {
        hasAccount = true
        targetAuthUserId = found.id
      }
    }

    // Role boundary: HR cannot change Admin passwords
    const canChange = isAuthorizedRole && (!isTargetAdmin || roleLower === 'admin')

    let errorMessage: string | undefined = undefined
    if (isTargetAdmin && roleLower !== 'admin') {
      errorMessage = 'Only Administrators can change passwords for Admin accounts.'
    } else if (!hasAccount) {
      errorMessage = 'This employee has no linked Supabase Auth login account.'
    }

    return {
      success: true,
      hasAccount,
      employeeIdNumber: employee.employee_id_number,
      employeeName: fullName,
      email: employee.email,
      isTargetAdmin,
      canChangePassword: canChange && hasAccount,
      errorMessage,
    }
  } catch (err: any) {
    console.error('getEmployeePasswordChangeInfo error:', err)
    return {
      success: false,
      hasAccount: false,
      employeeIdNumber: null,
      employeeName: '',
      email: null,
      isTargetAdmin: false,
      canChangePassword: false,
      errorMessage: err.message || 'An unexpected error occurred.',
    }
  }
}

/**
 * Server action to change an employee's password.
 * Only accessible by authorized Admin or HR roles.
 */
export async function changeEmployeePasswordAction(params: ChangePasswordParams): Promise<{
  success: boolean
  message?: string
  error?: string
  errors?: string[]
}> {
  const { employeeId, newPassword, confirmPassword } = params

  // 1. Rate Limiting Check
  const rateLimitCheck = checkRateLimit(`pwd-change:${employeeId}`, 5, 60 * 1000)
  if (!rateLimitCheck.success) {
    return {
      success: false,
      error: `Too many password change requests. Please wait ${rateLimitCheck.retryAfterSeconds || 60} seconds before trying again.`,
    }
  }

  // 2. Authentication Check
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return {
      success: false,
      error: 'Unauthorized: Authentication required to perform password change.',
    }
  }

  // Rate limit by actor ID as well
  const actorRateLimit = checkRateLimit(`actor:${currentUser.id}:pwd-change`, 10, 60 * 1000)
  if (!actorRateLimit.success) {
    return {
      success: false,
      error: 'Action temporarily rate-limited. Please wait before attempting further password changes.',
    }
  }

  // 3. RBAC Enforcement
  const roleLower = (currentUser.role || '').toLowerCase()
  const isAuthorizedRole = roleLower === 'admin' || roleLower === 'hr'
  if (!isAuthorizedRole) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId: null,
      result: 'failure',
      failureReason: 'Unauthorized role attempt',
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: 'Forbidden: Insufficient permissions. Only Admin and HR users may change employee passwords.',
    }
  }

  // 4. Resolve Employee Record
  const admin = await createAdminClient()
  const employee = await findEmployeeSafely(admin, employeeId)

  if (!employee) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId: null,
      result: 'failure',
      failureReason: 'Employee record not found',
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: 'Employee record not found.',
    }
  }

  const employeeFullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()

  // 5. Enforce HR/Admin Boundaries
  let targetRole = employee.role || ''
  let profileAuthId: string | null = null

  if (employee.employee_id_number) {
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, role')
      .eq('employee_id', employee.employee_id_number)
      .maybeSingle()
    if (targetProfile) {
      if (targetProfile.role) targetRole = targetProfile.role
      if (targetProfile.id) profileAuthId = targetProfile.id
    }
  }

  const targetRoleLower = targetRole.toLowerCase()
  const isTargetAdmin = targetRoleLower === 'admin' || targetRoleLower === 'super_admin'

  if (isTargetAdmin && roleLower !== 'admin') {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId: null,
      result: 'failure',
      failureReason: 'HR role attempted to change Admin password',
      employee,
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: 'Unauthorized: HR users cannot change passwords for Administrator accounts.',
    }
  }

  // 6. Resolve and Verify Supabase Auth Account
  let targetAuthUserId: string | null = profileAuthId || employee.auth_user_id || null

  // Search by work email if needed
  if (!targetAuthUserId && employee.email) {
    const { data: listUsers, error: listError } = await admin.auth.admin.listUsers()
    if (!listError && listUsers?.users) {
      const matched = listUsers.users.find(
        (u) => u.email?.toLowerCase().trim() === employee.email?.toLowerCase().trim()
      )
      if (matched) {
        targetAuthUserId = matched.id
      }
    }
  }

  if (!targetAuthUserId) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId: null,
      result: 'failure',
      failureReason: 'No linked Supabase Auth user ID found',
      employee,
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: 'This employee does not have a linked Supabase Auth account. Please create their login account first.',
    }
  }

  // Strictly verify the Auth user in Supabase
  const { data: authUserResult, error: authUserError } = await admin.auth.admin.getUserById(targetAuthUserId)
  if (authUserError || !authUserResult?.user) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId,
      result: 'failure',
      failureReason: 'Supabase Auth user lookup failed: ' + (authUserError?.message || 'User not found'),
      employee,
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: 'The linked Supabase Auth account could not be found or verified.',
    }
  }

  // Verify that the Auth user actually corresponds to the target employee
  const authUser = authUserResult.user
  const emailMatches =
    authUser.email &&
    employee.email &&
    authUser.email.toLowerCase().trim() === employee.email.toLowerCase().trim()
  const empIdMatches =
    authUser.user_metadata?.employee_id &&
    employee.employee_id_number &&
    authUser.user_metadata.employee_id === employee.employee_id_number
  const profileMatches = profileAuthId && authUser.id === profileAuthId

  if (!emailMatches && !empIdMatches && !profileMatches) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId,
      result: 'failure',
      failureReason: 'Security validation failed: Auth user identity does not match employee records',
      employee,
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: 'Security validation failed: Supabase Auth identity does not match employee records.',
    }
  }

  // 7. Enforce Password Policy & Validation
  const validation = validatePassword(newPassword, confirmPassword, {
    email: employee.email,
    employeeName: employeeFullName,
  })

  if (!validation.valid) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId,
      result: 'failure',
      failureReason: `Password policy check failed: ${validation.errors.join(', ')}`,
      employee,
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: validation.errors[0] || 'Password does not meet policy requirements.',
      errors: validation.errors,
    }
  }

  // 8. Execute Secure Server-Side Auth Password Change
  const { data: updateRes, error: updateError } = await admin.auth.admin.updateUserById(
    targetAuthUserId,
    { password: newPassword }
  )

  if (updateError) {
    await recordPasswordAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      targetAuthUserId,
      result: 'failure',
      failureReason: updateError.message,
      employee,
      actorRole: currentUser.role,
    })
    return {
      success: false,
      error: updateError.message || 'Failed to update password in Supabase Auth.',
    }
  }

  // 9. Record Successful Audit Trail
  await recordPasswordAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    targetAuthUserId,
    result: 'success',
    employee,
    actorRole: currentUser.role,
  })

  // 10. Revalidate Paths
  revalidatePath('/employees')
  revalidatePath(`/employees/${employee.id}`)
  revalidatePath('/hr/onboarding')
  revalidatePath(`/hr/onboarding/${employee.id}`)

  return {
    success: true,
    message: `Password for ${employeeFullName} (${employee.employee_id_number || 'Employee'}) has been updated successfully.`,
  }
}
