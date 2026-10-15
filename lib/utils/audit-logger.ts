/**
 * Security Audit Logger Service
 * Captures append-only authentication and security events.
 * Provides fallback in-memory ring-buffer when database table is pending migration.
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  parseUserAgent,
  extractClientIp,
  extractApproxLocation,
  normalizeIp,
  classifyIp,
  IpClassification
} from './device-parser'

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'session_refresh'
  | 'password_change'
  | 'password_reset'
  | 'session_revoked'
  | 'suspicious_attempt'

export type SecurityEventStatus = 'Success' | 'Failed'
export type SessionStatus = 'Active' | 'Logged Out' | 'Revoked' | 'Expired'

export interface SecurityAuditRecord {
  id: string
  user_id: string | null
  employee_id: string | null
  employee_id_number: string | null
  employee_name: string | null
  event_type: SecurityEventType
  status: SecurityEventStatus
  auth_method: string
  ip_address: string | null
  ip_classification: IpClassification
  location: string
  user_agent: string
  browser: string
  os: string
  device: string
  session_id: string | null
  session_status: SessionStatus
  is_suspicious: boolean
  flag_reason: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface LogSecurityEventOptions {
  eventType: SecurityEventType
  status: SecurityEventStatus
  userId?: string | null
  employeeId?: string | null
  employeeIdNumber?: string | null
  employeeName?: string | null
  authMethod?: string
  ipAddress?: string | null
  ipClassification?: IpClassification
  location?: string
  userAgent?: string
  browser?: string
  os?: string
  device?: string
  sessionId?: string | null
  sessionStatus?: SessionStatus
  isSuspicious?: boolean
  flagReason?: string | null
  metadataSource?: string
  metadata?: Record<string, any>
}

// In-memory fallback ring-buffer for dev/test when DB table is not yet migrated
const memoryAuditBuffer: SecurityAuditRecord[] = []
const MAX_MEMORY_LOGS = 200

// In-memory deduplication cache to prevent duplicate records during rapid retries or double submits
const deduplicationCache = new Map<string, { record: SecurityAuditRecord; timestamp: number }>()
const DEDUP_WINDOW_MS = 3000 // 3 seconds window

/**
 * Log a security event to the audit trail.
 * Prevents rapid event retries from producing duplicate records.
 */
export async function logSecurityEvent(options: LogSecurityEventOptions): Promise<SecurityAuditRecord> {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  // Clean expired dedup entries older than 30s
  for (const [key, entry] of deduplicationCache.entries()) {
    if (now - entry.timestamp > 30000) {
      deduplicationCache.delete(key)
    }
  }

  // Normalize IP & Classification
  const normalizedIp = normalizeIp(options.ipAddress)
  const classification = options.ipClassification || classifyIp(normalizedIp)

  // Build deduplication key
  const identityKey = options.userId || options.employeeIdNumber || options.metadata?.attempted_email || options.employeeId || 'anon'
  const dedupKey = `${options.eventType}:${identityKey}:${normalizedIp ?? 'none'}:${options.status}`

  const cached = deduplicationCache.get(dedupKey)
  if (cached && now - cached.timestamp < DEDUP_WINDOW_MS) {
    // Return the previously logged record to avoid duplicate log entries
    return cached.record
  }

  const eventId = crypto.randomUUID()

  // Parse UA if not provided
  let browser = options.browser
  let os = options.os
  let device = options.device
  if ((!browser || !os || !device) && options.userAgent) {
    const parsed = parseUserAgent(options.userAgent)
    browser = browser || parsed.browser
    os = os || parsed.os
    device = device || parsed.device
  }

  const record: SecurityAuditRecord = {
    id: eventId,
    user_id: options.userId || null,
    employee_id: options.employeeId || null,
    employee_id_number: options.employeeIdNumber || null,
    employee_name: options.employeeName || null,
    event_type: options.eventType,
    status: options.status,
    auth_method: options.authMethod || 'Password',
    ip_address: normalizedIp,
    ip_classification: classification,
    location: options.location || (classification === 'Localhost' ? 'Localhost (Development Environment)' : classification === 'Unavailable' ? 'Approximate Location Unavailable' : 'Local / Office Network'),
    user_agent: options.userAgent || 'Unknown',
    browser: browser || 'Unknown Browser',
    os: os || 'Unknown OS',
    device: device || 'Desktop',
    session_id: options.sessionId || (options.eventType === 'login_success' ? `sess_${crypto.randomUUID().slice(0, 8)}` : null),
    session_status: options.sessionStatus || (options.eventType === 'login_success' ? 'Active' : options.eventType === 'logout' ? 'Logged Out' : 'Expired'),
    is_suspicious: Boolean(options.isSuspicious),
    flag_reason: options.flagReason || null,
    metadata: options.metadata || {},
    created_at: nowIso,
  }

  // Safe diagnostics (Development environment only)
  // Strictly logs non-sensitive provenance metadata; never logs credentials, tokens, or OTPs
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SecurityAudit Dev Diagnostic]', {
      eventId: record.id,
      eventType: record.event_type,
      status: record.status,
      metadataSource: options.metadataSource || 'trusted_server_headers',
      ipFound: Boolean(normalizedIp),
      ipAddress: normalizedIp,
      classification,
    })
  }

  // Cache record for deduplication
  deduplicationCache.set(dedupKey, { record, timestamp: now })

  try {
    const admin = await createAdminClient()
    const { error } = await admin.from('security_audit_logs').insert(record)

    if (error) {
      if (error.code === 'PGRST205') {
        // Table not in schema cache yet, push to in-memory fallback
        addToMemoryBuffer(record)
      } else {
        console.error('[logSecurityEvent] Insert error:', error.message)
        addToMemoryBuffer(record)
      }
    }
  } catch (err) {
    console.warn('[logSecurityEvent] Database unreachable, saving to fallback buffer:', err)
    addToMemoryBuffer(record)
  }

  // Also maintain in memory for rapid retrieval / unit testing
  addToMemoryBuffer(record)
  return record
}

function addToMemoryBuffer(record: SecurityAuditRecord) {
  // Avoid duplicate ID
  if (memoryAuditBuffer.some(r => r.id === record.id)) return

  memoryAuditBuffer.unshift(record)
  if (memoryAuditBuffer.length > MAX_MEMORY_LOGS) {
    memoryAuditBuffer.pop()
  }
}

/**
 * Access fallback memory logs (useful for unit tests or if table pending)
 */
export function getMemoryAuditLogs(): SecurityAuditRecord[] {
  return [...memoryAuditBuffer]
}

/**
 * Update session status (e.g. on revocation or logout)
 */
export async function updateSessionStatus(sessionId: string, newStatus: SessionStatus): Promise<boolean> {
  // Update in memory buffer
  for (const item of memoryAuditBuffer) {
    if (item.session_id === sessionId) {
      item.session_status = newStatus
    }
  }

  try {
    const admin = await createAdminClient()
    const { error } = await admin
      .from('security_audit_logs')
      .update({ session_status: newStatus })
      .eq('session_id', sessionId)

    if (error && error.code !== 'PGRST205') {
      console.error('[updateSessionStatus] Error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[updateSessionStatus] Error:', err)
    return true
  }
}
