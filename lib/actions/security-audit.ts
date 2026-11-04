'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  SecurityAuditRecord,
  getPersistentAuditLogs,
  updateSessionStatus,
  logSecurityEvent
} from '@/lib/utils/audit-logger'
import {
  resolveClientMetadata,
  classifyIp,
  type IpClassification
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
// In-memory cache for auth users lookup to accelerate audit history queries
let cachedAuthUsersData: { users: any[]; timestamp: number } | null = null
const AUTH_CACHE_TTL_MS = 60000

interface CachedEmployeeMetadata {
  empOnboarding: any
  empIdNumber: string | null
  targetAuthUserIdList: string[]
  empName: string | null
  timestamp: number
}
const employeeMetadataCache = new Map<string, CachedEmployeeMetadata>()
const EMP_CACHE_TTL_MS = 60000

async function getCachedAuthUsers(admin: any): Promise<any[]> {
  const now = Date.now()
  if (cachedAuthUsersData && now - cachedAuthUsersData.timestamp < AUTH_CACHE_TTL_MS) {
    return cachedAuthUsersData.users
  }
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 100 })
    if (data?.users) {
      cachedAuthUsersData = { users: data.users, timestamp: now }
      return data.users
    }
  } catch {
    // Non-blocking
  }
  return cachedAuthUsersData?.users || []
}

export async function getEmployeeAuditLogs(
  employeeId: string,
  filter: AuditLogFilter = {}
): Promise<SecurityAuditResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('Authentication required')
  }

  const admin = await createAdminClient()

  // 1. Resolve employee metadata (onboarding record, employee_id_number, and all auth user IDs)
  const now = Date.now()
  const cachedEmp = employeeMetadataCache.get(employeeId)
  let empOnboarding: any = null
  let empIdNumber: string | null = null
  let targetAuthUserIdList: string[] = []
  let empName: string | null = null

  if (cachedEmp && now - cachedEmp.timestamp < EMP_CACHE_TTL_MS) {
    empOnboarding = cachedEmp.empOnboarding
    empIdNumber = cachedEmp.empIdNumber
    targetAuthUserIdList = cachedEmp.targetAuthUserIdList
    empName = cachedEmp.empName
  } else {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)

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

    empIdNumber = empOnboarding?.employee_id_number || (isUuid ? null : employeeId)
    const targetAuthUserIds = new Set<string>()

    // Resolve matching profiles (using .limit() rather than .maybeSingle() to handle duplicate profiles gracefully)
    if (empIdNumber) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, employee_id, first_name, last_name')
        .eq('employee_id', empIdNumber)

      if (profs && profs.length > 0) {
        const nameMatch = profs.find(p =>
          p.first_name?.toLowerCase() === empOnboarding?.first_name?.toLowerCase() &&
          p.last_name?.toLowerCase() === empOnboarding?.last_name?.toLowerCase()
        )
        if (nameMatch) {
          targetAuthUserIds.add(nameMatch.id)
        } else {
          profs.forEach(p => targetAuthUserIds.add(p.id))
        }
      }
    }

    // Also match auth.users by email or employee_id metadata
    const emails = [empOnboarding?.email, empOnboarding?.personal_email].filter(Boolean)
    const authUsersList = await getCachedAuthUsers(admin)
    authUsersList.forEach(u => {
      const matchesEmail = emails.some(e => e.toLowerCase() === u.email?.toLowerCase())
      const matchesEmpNum = empIdNumber && u.user_metadata?.employee_id === empIdNumber
      if (matchesEmail || matchesEmpNum) {
        targetAuthUserIds.add(u.id)
      }
    })

    targetAuthUserIdList = Array.from(targetAuthUserIds)
    empName = empOnboarding
      ? `${empOnboarding.first_name || ''} ${empOnboarding.last_name || ''}`.trim()
      : null

    employeeMetadataCache.set(employeeId, {
      empOnboarding,
      empIdNumber,
      targetAuthUserIdList,
      empName,
      timestamp: now,
    })
  }

  // 2. Authorization check
  const isAdminOrHr = ['HR', 'Admin', 'Super Admin'].includes(currentUser.role)
  const isSelf = targetAuthUserIdList.length > 0
    ? targetAuthUserIdList.includes(currentUser.id)
    : false

  if (!isAdminOrHr && !isSelf) {
    throw new Error('Access denied: You do not have permission to view this employee’s security logs.')
  }

  // 3. Query time_sessions and security_audit_logs in parallel
  let sessionRecords: SecurityAuditRecord[] = []
  let dbAuditRecords: SecurityAuditRecord[] = []

  const orClauses: string[] = []
  if (empOnboarding?.id) orClauses.push(`employee_id.eq.${empOnboarding.id}`)
  if (empIdNumber) orClauses.push(`employee_id_number.eq.${empIdNumber}`)
  targetAuthUserIdList.forEach(uid => orClauses.push(`user_id.eq.${uid}`))

  try {
    const [sessionsRes, auditLogsRes] = await Promise.all([
      targetAuthUserIdList.length > 0
        ? admin
            .from('time_sessions')
            .select('*')
            .in('employee_id', targetAuthUserIdList)
            .order('clock_in', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      orClauses.length > 0
        ? admin
            .from('security_audit_logs')
            .select('*')
            .or(orClauses.join(','))
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null })
    ])

    if (!sessionsRes.error && sessionsRes.data) {
      sessionsRes.data.forEach((s: any) => {
        const isWorking = ['working', 'on_break', 'Working', 'On Break'].includes(s.status)
        const isSessionActive = isWorking && !s.clock_out

        const resolvedIp = s.ip_address || null
        const resolvedClassification: IpClassification = resolvedIp
          ? ((s.ip_classification as any) || classifyIp(resolvedIp))
          : 'Unavailable'
        const resolvedLocation = s.location || (resolvedIp ? 'Approximate Location Unavailable' : 'Not captured')
        const resolvedBrowser = s.browser || 'TripleS Time Tracker'
        const resolvedOs = s.os || 'Windows 11 / 10'
        const resolvedDevice = s.device || 'Desktop'
        const resolvedUa = s.user_agent || 'TripleS Time Tracker v1.0.0 (Windows)'
        const lastActivity = s.updated_at || s.clock_out || s.clock_in

        // A. Login / Clock-in Event
        sessionRecords.push({
          id: `sess_login_${s.id}`,
          user_id: s.employee_id,
          employee_id: empOnboarding?.id || null,
          employee_id_number: empIdNumber,
          employee_name: empName,
          event_type: 'login_success',
          status: 'Success',
          auth_method: 'TripleS Time Tracker (Desktop)',
          ip_address: resolvedIp,
          ip_classification: resolvedClassification,
          location: resolvedLocation,
          user_agent: resolvedUa,
          browser: resolvedBrowser,
          os: resolvedOs,
          device: resolvedDevice,
          session_id: s.id,
          session_status: isSessionActive ? 'Active' : 'Expired',
          is_suspicious: false,
          flag_reason: null,
          client_type: s.client_type || 'desktop_app',
          app_name: 'TripleS Time Tracker',
          app_version: s.app_version || '1.0.0',
          runtime: s.runtime || 'Electron 34.2.0 (Windows)',
          clock_in: s.clock_in,
          clock_out: s.clock_out,
          worked_minutes: s.worked_minutes,
          active_minutes: s.active_minutes,
          last_activity_at: lastActivity,
          metadata: {
            session_date: s.session_date,
            clock_in: s.clock_in,
            clock_out: s.clock_out,
            worked_minutes: s.worked_minutes,
            active_minutes: s.active_minutes,
            last_activity_at: lastActivity
          },
          created_at: s.clock_in || s.created_at
        })

        // B. Logout / Clock-out Event (if completed)
        if (s.clock_out) {
          sessionRecords.push({
            id: `sess_logout_${s.id}`,
            user_id: s.employee_id,
            employee_id: empOnboarding?.id || null,
            employee_id_number: empIdNumber,
            employee_name: empName,
            event_type: 'logout',
            status: 'Success',
            auth_method: 'Session Termination',
            ip_address: resolvedIp,
            ip_classification: resolvedClassification,
            location: resolvedLocation,
            user_agent: resolvedUa,
            browser: resolvedBrowser,
            os: resolvedOs,
            device: resolvedDevice,
            session_id: s.id,
            session_status: 'Expired',
            is_suspicious: false,
            flag_reason: null,
            client_type: s.client_type || 'desktop_app',
            app_name: 'TripleS Time Tracker',
            app_version: s.app_version || '1.0.0',
            runtime: s.runtime || 'Electron 34.2.0 (Windows)',
            clock_in: s.clock_in,
            clock_out: s.clock_out,
            worked_minutes: s.worked_minutes,
            active_minutes: s.active_minutes,
            last_activity_at: s.clock_out,
            metadata: {
              clock_out: s.clock_out,
              worked_minutes: s.worked_minutes,
              active_minutes: s.active_minutes
            },
            created_at: s.clock_out
          })
        }
      })
    }

    if (!auditLogsRes.error && auditLogsRes.data) {
      dbAuditRecords = auditLogsRes.data as SecurityAuditRecord[]
    }
  } catch (err) {
    console.warn('[getEmployeeAuditLogs] Exception querying sessions or audit logs:', err)
  }

  // 5. Query persistent store and in-memory fallback logs for this employee
  const persistentLogs = getPersistentAuditLogs().filter(m => {
    if (empOnboarding?.id && m.employee_id === empOnboarding.id) return true
    if (m.user_id && targetAuthUserIdList.includes(m.user_id)) return true
    if (empIdNumber && m.employee_id_number === empIdNumber) return true
    // Match by email if recorded in metadata
    const attemptedEmail = m.metadata?.attempted_email?.toLowerCase() || m.metadata?.email?.toLowerCase()
    if (attemptedEmail) {
      if (empOnboarding?.email && attemptedEmail === empOnboarding.email.toLowerCase()) return true
      if (empOnboarding?.personal_email && attemptedEmail === empOnboarding.personal_email.toLowerCase()) return true
    }
    return false
  })

  // 6. Combine and deduplicate
  const recordMap = new Map<string, SecurityAuditRecord>()

  // A. Add session records from database
  sessionRecords.forEach(r => recordMap.set(r.id, r))

  // B. Add database audit logs
  dbAuditRecords.forEach(r => {
    // If matching a session_id, preserve session status
    recordMap.set(r.id, r)
  })

  // C. Add persistent / file-stored audit logs (password changes, failed logins, etc.)
  persistentLogs.forEach(r => {
    recordMap.set(r.id, r)
  })

  // Check if any session was revoked or modified in persistent logs
  const revokedSessionIds = new Set<string>()
  persistentLogs.forEach(r => {
    if (r.session_status === 'Revoked' && r.session_id) {
      revokedSessionIds.add(r.session_id)
    }
  })

  let allRecords = Array.from(recordMap.values())

  // Ensure session status reflects revocation, classify IP, and hydrate rich metadata
  allRecords = allRecords.map(r => {
    let sessionStatus = r.session_status
    if (r.session_id && revokedSessionIds.has(r.session_id)) {
      sessionStatus = 'Revoked'
    }

    const meta = r.metadata || {}
    const isNoIp = !r.ip_address || r.ip_address === '-' || r.ip_address === 'Unknown'
    const cleanIp = isNoIp ? null : r.ip_address
    const cleanClassification: IpClassification = cleanIp
      ? (r.ip_classification || classifyIp(cleanIp))
      : 'Unavailable'

    let cleanLocation: string
    let resolvedIsp: string | null = null
    let resolvedCity: string | null = null
    let resolvedRegion: string | null = null
    let resolvedCountry: string | null = null
    let resolvedLat: number | null = null
    let resolvedLon: number | null = null
    let resolvedTz: string | null = r.timezone || meta.timezone || 'Asia/Kolkata'

    if (cleanClassification === 'Localhost') {
      cleanLocation = 'Localhost (Development Environment)'
      resolvedIsp = null
      resolvedCity = null
      resolvedRegion = null
      resolvedCountry = null
      resolvedLat = null
      resolvedLon = null
    } else if (cleanClassification === 'Private Network') {
      cleanLocation = 'Private / Corporate Network'
      resolvedIsp = null
      resolvedCity = null
      resolvedRegion = null
      resolvedCountry = null
      resolvedLat = null
      resolvedLon = null
    } else if (cleanIp) {
      cleanLocation = r.location && r.location !== 'Unknown' && r.location !== 'Localhost (Development Environment)'
        ? r.location
        : 'Approximate Location Unavailable'
      resolvedIsp = r.isp || meta.isp || null
      resolvedCity = r.city || meta.city || null
      resolvedRegion = r.region || meta.region || null
      resolvedCountry = r.country || meta.country || null
      resolvedLat = r.latitude ?? meta.latitude ?? null
      resolvedLon = r.longitude ?? meta.longitude ?? null
    } else {
      cleanLocation = 'Not captured'
      resolvedIsp = null
      resolvedCity = null
      resolvedRegion = null
      resolvedCountry = null
      resolvedLat = null
      resolvedLon = null
    }

    const clientType = r.client_type || meta.client_type || (r.browser?.includes('Tracker') || r.auth_method?.includes('Time Tracker') ? 'desktop_app' : 'browser')
    const appName = r.app_name || meta.app_name || (clientType === 'desktop_app' ? 'TripleS Time Tracker' : null)
    const appVersion = r.app_version || meta.app_version || (clientType === 'desktop_app' ? '1.0.0' : null)
    const runtime = r.runtime || meta.runtime || (clientType === 'desktop_app' ? 'Electron 34.2.0 (Windows)' : null)

    return {
      ...r,
      ip_address: cleanIp,
      ip_classification: cleanClassification,
      location: cleanLocation,
      session_status: sessionStatus,
      client_type: clientType,
      app_name: appName,
      app_version: appVersion,
      runtime: runtime,
      browser_version: r.browser_version || meta.browser_version || null,
      browser_engine: r.browser_engine || meta.browser_engine || (clientType === 'desktop_app' ? 'Chromium / Electron' : null),
      os_version: r.os_version || meta.os_version || null,
      city: resolvedCity,
      region: resolvedRegion,
      country: resolvedCountry,
      isp: resolvedIsp,
      timezone: resolvedTz,
      latitude: resolvedLat,
      longitude: resolvedLon,
      clock_in: r.clock_in || meta.clock_in || null,
      clock_out: r.clock_out || meta.clock_out || null,
      worked_minutes: r.worked_minutes ?? meta.worked_minutes ?? null,
      active_minutes: r.active_minutes ?? meta.active_minutes ?? null,
      last_activity_at: r.last_activity_at || meta.last_activity_at || r.created_at,
    }
  })

  // Sort descending by created_at (newest first)
  allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // 7. Calculate KPI Summary metrics across the employee's records
  const activeSessionIds = new Set<string>()
  allRecords.forEach(r => {
    if (r.session_status === 'Active' && r.session_id) {
      activeSessionIds.add(r.session_id)
    }
  })

  const summary: SecurityAuditSummary = {
    totalAttempts: allRecords.filter(r => r.event_type === 'login_success' || r.event_type === 'login_failed').length,
    successfulLogins: allRecords.filter(r => r.event_type === 'login_success' && r.status === 'Success').length,
    failedLogins: allRecords.filter(r => r.event_type === 'login_failed' || (r.status === 'Failed' && r.event_type.includes('login'))).length,
    activeSessions: activeSessionIds.size,
  }

  // 8. Apply Filters across complete historical records
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

  // Date Range Filter (Asia/Kolkata timezone standard)
  if (filter.dateRange && filter.dateRange !== 'all') {
    const now = new Date()
    // Kolkata date string format: YYYY-MM-DD
    const kolkataFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
    const todayKolkata = kolkataFormatter.format(now)

    filtered = filtered.filter(r => {
      const recDate = new Date(r.created_at)
      if (isNaN(recDate.getTime())) return false

      if (filter.dateRange === 'today') {
        return kolkataFormatter.format(recDate) === todayKolkata
      }
      if (filter.dateRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return recDate >= sevenDaysAgo
      }
      if (filter.dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return recDate >= thirtyDaysAgo
      }
      return true
    })
  }

  // Search Filter across all fields
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
        r.auth_method?.toLowerCase().includes(q) ||
        r.session_id?.toLowerCase().includes(q)
      )
    })
  }

  // 9. Pagination
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

    // Update session status in audit records and database
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

    revalidatePath(`/employees/${employeeId}`)
    revalidatePath(`/hr/onboarding/${employeeId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[revokeSessionAction] Failed:', err)
    return { success: false, message: err.message || 'Failed to revoke session' }
  }
}
