import { type AuthUser } from '@/lib/auth'

export function isUserAdmin(user: AuthUser | null): boolean {
  if (!user) return false
  const r = (user.role || '').toLowerCase()
  return r === 'admin' || r === 'super admin' || r === 'super_admin'
}

export function isUserManager(user: AuthUser | null): boolean {
  if (!user) return false
  const r = (user.role || '').toLowerCase()
  return r === 'manager'
}

export function isUserHOD(user: AuthUser | null): boolean {
  if (!user) return false
  return !!user.is_hod
}

export function canManageClients(user: AuthUser | null): boolean {
  return isUserAdmin(user) || isUserManager(user)
}

/**
 * Restricted fields: contact_number, whatsapp_number, email
 * Allowed ONLY for Admin and Manager.
 * Strictly forbidden for HOD and Employee.
 */
export function canViewRestrictedClientInfo(user: AuthUser | null): boolean {
  return isUserAdmin(user) || isUserManager(user)
}

/**
 * HOD is responsible for creating projects.
 * Admin and Manager also have project creation rights.
 */
export function canCreateProjects(user: AuthUser | null): boolean {
  return isUserAdmin(user) || isUserManager(user) || isUserHOD(user)
}

export function canEditProject(user: AuthUser | null, projectCreatedBy?: string | null): boolean {
  if (!user) return false
  if (isUserAdmin(user) || isUserManager(user)) return true
  if (isUserHOD(user)) return true
  return false
}

/**
 * HOD / Project Manager can create and edit tasks.
 */
export function canManageTasks(user: AuthUser | null): boolean {
  return isUserAdmin(user) || isUserManager(user) || isUserHOD(user)
}

/**
 * Can an employee update task status?
 * HOD/Manager/Admin can always update any status.
 * An assigned employee can update their assigned task.
 */
export function canUpdateTaskStatus(user: AuthUser | null, isAssignee: boolean): boolean {
  if (!user) return false
  if (isUserAdmin(user) || isUserManager(user) || isUserHOD(user)) return true
  return isAssignee
}

/**
 * FINANCIAL DATA ACCESS:
 * Strictly limited to HR and Admin.
 * HOD, Manager, and Employee must NEVER be allowed access to salary, stipend, CTC, or payroll.
 */
export function canAccessFinancialData(user: AuthUser | null): boolean {
  if (!user) return false
  const r = (user.role || '').toLowerCase()
  return r === 'admin' || r === 'super admin' || r === 'super_admin' || r === 'hr'
}
