'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  SecurityAuditRecord,
  getMemoryAuditLogs,
  updateSessionStatus,
  logSecurityEvent
} from '@/lib/utils/audit-logger'
import {
  getClientIpDetails,
  resolveClientMetadata,
  extractClientIp,
  extractApproxLocation,
  classifyIp
} from '@/lib/utils/device-parser'
import { revalidatePath } from 'next/cache'

export interface AuditLogFilter {
  search?: string
  status?: 'all' | 'success' | 'failed' | 'suspicious'
  dateRange?: 'all' | 'today' | '7days' | '30days'
  page?: number
  pageSize?: number
}

export interface SecurityAuditSummary {
  totalAttempts: number
  successfulLogins: number
  failedLogins: number
  activeSessions: number
}

export interface SecurityAuditResponse {
  records: SecurityAuditRecord[]
  totalCount: number
  summary: SecurityAuditSummary
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Fetch security audit logs for a specific employee.
 * Enforces role-based access:
 * - Ordinary employees can only view their own logs.
 * - HR, Admin, Super Admin can view any employee's logs.
 */
export async function getEmployeeAuditLogs(
  employeeId: string,
  filter: AuditLogFilter = {}
): Promise<SecurityAuditResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('Authentication required')
  }

  const admin = await createAdminClient()

  // 1. Resolve employee metadata (auth user ID & employee_id_number)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)
  let empOnboarding: any = null

  if (isUuid) {
    const { data } = await admin
      .from('employee_onboarding')
      .select('id, employee_id_number, first_name, last_name, personal_email, email')
      .eq('id', employeeId)
      .maybeSingle()
    empOnboarding = data
  }

  if (!empOnboarding) {
    const { data } = await admin
      .from('employee_onboarding')
      .select('id, employee_id_number, first_name, last_name, personal_email, email')
      .eq('employee_id_number', employeeId)
      .maybeSingle()
    empOnboarding = data
  }

  let targetAuthUserId: string | null = null
  const empIdNumber = empOnboarding?.employee_id_number || (isUuid ? null : employeeId)

  if (empIdNumber) {
    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .eq('employee_id', empIdNumber)
      .maybeSingle()
    if (prof) targetAuthUserId = prof.id
  }

  // 2. Authorization check
  const isAdminOrHr = ['HR', 'Admin', 'Super Admin'].includes(currentUser.role)
  const isSelf = targetAuthUserId ? currentUser.id === targetAuthUserId : false

  if (!isAdminOrHr && !isSelf) {
    throw new Error('Access denied: You do not have permission to view this employee’s security logs.')
  }

  // 3. Query records from database
  let dbRecords: SecurityAuditRecord[] = []
  try {
    let query = admin
      .from('security_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (empOnboarding?.id && targetAuthUserId) {
      query = query.or(`employee_id.eq.${empOnboarding.id},user_id.eq.${targetAuthUserId},employee_id_number.eq.${empIdNumber}`)
    } else if (empOnboarding?.id) {
      query = query.or(`employee_id.eq.${empOnboarding.id},employee_id_number.eq.${empIdNumber}`)
    } else if (targetAuthUserId) {
      query = query.eq('user_id', targetAuthUserId)
    }

    const { data, error } = await query
    if (error) {
      if (error.code !== 'PGRST205') {
        console.error('[getEmployeeAuditLogs] DB query error:', error.message)
      }
    } else if (data) {
      dbRecords = data as SecurityAuditRecord[]
    }
  } catch (err) {
    console.warn('[getEmployeeAuditLogs] Exception querying DB:', err)
  }

  // 4. Merge with in-memory buffer logs for this employee
  const memoryLogs = getMemoryAuditLogs().filter(m => {
    if (empOnboarding?.id && m.employee_id === empOnboarding.id) return true
    if (targetAuthUserId && m.user_id === targetAuthUserId) return true
    if (empIdNumber && m.employee_id_number === empIdNumber) return true
    return false
  })

  // Combine and deduplicate by ID
  const recordMap = new Map<string, SecurityAuditRecord>()
  dbRecords.forEach(r => recordMap.set(r.id, r))
  memoryLogs.forEach(r => recordMap.set(r.id, r))

  let allRecords = Array.from(recordMap.values())

  // Ensure ip_classification is reliably populated on all records
  allRecords = allRecords.map(r => ({
    ...r,
    ip_classification: r.ip_classification || classifyIp(r.ip_address),
  }))

  // Sort descending by created_at
  allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // 5. Calculate KPI Summary metrics (across all unfiltered records for this employee)
  const summary: SecurityAuditSummary = {
    totalAttempts: allRecords.filter(r => r.event_type === 'login_success' || r.event_type === 'login_failed').length,
    successfulLogins: allRecords.filter(r => r.status === 'Success' && r.event_type === 'login_success').length,
    failedLogins: allRecords.filter(r => r.status === 'Failed' || r.event_type === 'login_failed').length,
    activeSessions: allRecords.filter(r => r.session_status === 'Active').length,
  }

  // 6. Apply Filters
  let filtered = [...allRecords]

  // Status Filter
  if (filter.status && filter.status !== 'all') {
    if (filter.status === 'success') {
      filtered = filtered.filter(r => r.status === 'Success')
    } else if (filter.status === 'failed') {
      filtered = filtered.filter(r => r.status === 'Failed')
    } else if (filter.status === 'suspicious') {
      filtered = filtered.filter(r => r.is_suspicious || r.event_type === 'suspicious_attempt')
    }
  }

  // Date Range Filter
  if (filter.dateRange && filter.dateRange !== 'all') {
    const now = new Date()
    filtered = filtered.filter(r => {
      const recordDate = new Date(r.created_at)
      if (filter.dateRange === 'today') {
        return recordDate.toDateString() === now.toDateString()
      }
      if (filter.dateRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return recordDate >= sevenDaysAgo
      }
      if (filter.dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return recordDate >= thirtyDaysAgo
      }
      return true
    })
  }

  // Search Filter (IP, Location, Browser, OS, Employee, Event Type, Flag)
  if (filter.search && filter.search.trim()) {
    const q = filter.search.toLowerCase().trim()
    filtered = filtered.filter(r => {
      return (
        r.ip_address?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.browser?.toLowerCase().includes(q) ||
        r.os?.toLowerCase().includes(q) ||
        r.device?.toLowerCase().includes(q) ||
        r.event_type?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q) ||
        r.flag_reason?.toLowerCase().includes(q) ||
        r.auth_method?.toLowerCase().includes(q)
      )
    })
  }

  // 7. Pagination
  const page = Math.max(1, filter.page || 1)
  const pageSize = Math.max(1, filter.pageSize || 10)
  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const startIndex = (page - 1) * pageSize
  const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize)

  return {
    records: paginatedRecords,
    totalCount,
    summary,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Revoke an active session. Restricted to HR and Administrators.
 */
export async function revokeSessionAction(
  sessionId: string,
  employeeId: string
): Promise<{ success: boolean; message?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser || !['HR', 'Admin', 'Super Admin'].includes(currentUser.role)) {
    return { success: false, message: 'Unauthorized. Admin permissions required.' }
  }

  try {
    const headerStore = await headers()
    const { ip, sourceHeader, classification, location } = await resolveClientMetadata(headerStore)
    const userAgent = headerStore.get('user-agent') || ''

    // Update session status in audit records
    await updateSessionStatus(sessionId, 'Revoked')

    // Record an audit log for the revocation event
    await logSecurityEvent({
      eventType: 'session_revoked',
      status: 'Success',
      userId: currentUser.id,
      employeeId,
      authMethod: 'Admin Action',
      ipAddress: ip,
      ipClassification: classification,
      location,
      userAgent,
      sessionId,
      sessionStatus: 'Revoked',
      metadataSource: sourceHeader,
      metadata: {
        revoked_by_email: currentUser.email,
        revoked_by_role: currentUser.role,
        target_session_id: sessionId,
      },
    })

    revalidatePath(`/hr/onboarding/${employeeId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[revokeSessionAction] Failed:', err)
    return { success: false, message: err.message || 'Failed to revoke session' }
  }
}

