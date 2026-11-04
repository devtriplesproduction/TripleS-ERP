/**
 * Security Audit Logger Service
 * Captures append-only authentication and security events.
 * Provides fallback persistent JSON store and in-memory buffer when database table is pending migration.
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
import fs from 'fs'
import path from 'path'

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
  client_type?: string | null
  app_name?: string | null
  app_version?: string | null
  runtime?: string | null
  browser_version?: string | null
  browser_engine?: string | null
  os_version?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  isp?: string | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
  clock_in?: string | null
  clock_out?: string | null
  worked_minutes?: number | null
  active_minutes?: number | null
  last_activity_at?: string | null
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
  clientType?: string | null
  appName?: string | null
  appVersion?: string | null
  runtime?: string | null
  browserVersion?: string | null
  browserEngine?: string | null
  osVersion?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  isp?: string | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
  clockIn?: string | null
  clockOut?: string | null
  workedMinutes?: number | null
  activeMinutes?: number | null
  lastActivityAt?: string | null
}

// In-memory fallback ring-buffer for dev/test when DB table is not yet migrated
const memoryAuditBuffer: SecurityAuditRecord[] = []
const MAX_MEMORY_LOGS = 500

// In-memory deduplication cache to prevent duplicate records during rapid retries or double submits
const deduplicationCache = new Map<string, { record: SecurityAuditRecord; timestamp: number }>()
const DEDUP_WINDOW_MS = 15000 // 15 seconds window (resilient to slow database network queries)

const FALLBACK_DIR = path.join(process.cwd(), 'scratch')
const DEFAULT_STORE_FILE = 'security_audit_logs_store.json'
const TMP_STORE_PATH = path.join('/tmp', DEFAULT_STORE_FILE)

function getPrimaryStorePath(): string {
  return path.join(/*turbopackIgnore: true*/ FALLBACK_DIR, DEFAULT_STORE_FILE)
}

function ensureStoreDir(): void {
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ FALLBACK_DIR)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ FALLBACK_DIR, { recursive: true })
    }
  } catch {
    // Ignore in read-only environment
  }
}

/**
 * Read records from the file-backed store (checking scratch directory and /tmp fallback)
 */
function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

export function readPersistentStore(): SecurityAuditRecord[] {
  const recordsMap = new Map<string, SecurityAuditRecord>()

  // 1. Read from scratch store
  try {
    const primaryPath = getPrimaryStorePath()
    if (fs.existsSync(/*turbopackIgnore: true*/ primaryPath)) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ primaryPath, 'utf-8')
      const parsed = JSON.parse(raw) as SecurityAuditRecord[]
      if (Array.isArray(parsed)) {
        parsed.forEach(r => recordsMap.set(r.id, r))
      }
    }
  } catch (err) {
    // Scratch directory unreadable or does not exist
  }

  // 2. Read from /tmp fallback store
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ TMP_STORE_PATH)) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ TMP_STORE_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as SecurityAuditRecord[]
      if (Array.isArray(parsed)) {
        parsed.forEach(r => recordsMap.set(r.id, r))
      }
    }
  } catch {
    // /tmp unreadable
  }

  return Array.from(recordsMap.values())
}

/**
 * Persist records to disk (scratch file and /tmp fallback)
 */
function writePersistentRecord(record: SecurityAuditRecord): void {
  const existing = readPersistentStore()
  const map = new Map<string, SecurityAuditRecord>()
  existing.forEach(r => map.set(r.id, r))
  map.set(record.id, record)
  const all = Array.from(map.values())

  // Try writing to primary scratch
  try {
    ensureStoreDir()
    fs.writeFileSync(
      /*turbopackIgnore: true*/ getPrimaryStorePath(),
      JSON.stringify(all, null, 2),
      'utf-8'
    )
  } catch {
    // Primary scratch not writable (e.g. serverless read-only filesystem)
  }

  // Try writing to /tmp
  try {
    fs.writeFileSync(
      /*turbopackIgnore: true*/ TMP_STORE_PATH,
      JSON.stringify(all, null, 2),
      'utf-8'
    )
  } catch {
    // /tmp write ignored
  }
}

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

  // Detailed client inspection
  let browser = options.browser
  let os = options.os
  let device = options.device
  let clientType = options.clientType
  let appName = options.appName
  let appVersion = options.appVersion
  let runtime = options.runtime
  let browserVersion = options.browserVersion
  let browserEngine = options.browserEngine
  let osVersion = options.osVersion

  if (options.userAgent) {
    const { parseDetailedUserAgent } = await import('./device-parser')
    const detailed = parseDetailedUserAgent(options.userAgent)
    browser = browser || detailed.displayName
    os = os || detailed.fullOs
    device = device || detailed.deviceType
    clientType = clientType || detailed.clientType
    appName = appName || detailed.appName
    appVersion = appVersion || detailed.appVersion
    runtime = runtime || detailed.runtime
    browserVersion = browserVersion || detailed.browserVersion
    browserEngine = browserEngine || detailed.browserEngine
    osVersion = osVersion || detailed.osVersion
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
    location: options.location || (classification === 'Localhost' ? 'Localhost (Development Environment)' : classification === 'Private Network' ? 'Private / Corporate Network' : classification === 'Unavailable' ? 'Approximate Location Unavailable' : 'Unknown'),
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
    client_type: clientType || null,
    app_name: appName || null,
    app_version: appVersion || null,
    runtime: runtime || null,
    browser_version: browserVersion || null,
    browser_engine: browserEngine || null,
    os_version: osVersion || null,
    country: options.country || null,
    region: options.region || null,
    city: options.city || null,
    isp: options.isp || null,
    timezone: options.timezone || null,
    latitude: options.latitude ?? null,
    longitude: options.longitude ?? null,
    clock_in: options.clockIn || null,
    clock_out: options.clockOut || null,
    worked_minutes: options.workedMinutes ?? null,
    active_minutes: options.activeMinutes ?? null,
    last_activity_at: options.lastActivityAt || null,
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

  // Cache record for deduplication immediately
  deduplicationCache.set(dedupKey, { record, timestamp: Date.now() })

  // Maintain in memory & persistent store
  addToMemoryBuffer(record)
  writePersistentRecord(record)

  try {
    const admin = await createAdminClient()
    const dbPayload: Record<string, any> = {
      id: record.id,
      user_id: record.user_id,
      employee_id: record.employee_id,
      employee_id_number: record.employee_id_number,
      employee_name: record.employee_name,
      event_type: record.event_type,
      status: record.status,
      auth_method: record.auth_method,
      ip_address: record.ip_address,
      ip_classification: record.ip_classification,
      location: record.location,
      user_agent: record.user_agent,
      browser: record.browser,
      os: record.os,
      device: record.device,
      session_id: record.session_id,
      session_status: record.session_status,
      is_suspicious: record.is_suspicious,
      flag_reason: record.flag_reason,
      metadata: {
        ...record.metadata,
        client_type: record.client_type,
        app_name: record.app_name,
        app_version: record.app_version,
        runtime: record.runtime,
        browser_version: record.browser_version,
        browser_engine: record.browser_engine,
        os_version: record.os_version,
        country: record.country,
        region: record.region,
        city: record.city,
        isp: record.isp,
        timezone: record.timezone,
        latitude: record.latitude,
        longitude: record.longitude,
        clock_in: record.clock_in,
        clock_out: record.clock_out,
        worked_minutes: record.worked_minutes,
        active_minutes: record.active_minutes,
        last_activity_at: record.last_activity_at,
      },
      created_at: record.created_at
    }
    const { error } = await withTimeout(admin.from('security_audit_logs').insert(dbPayload), 2500)

    if (error) {
      if (error.code !== 'PGRST205') {
        console.error('[logSecurityEvent] Insert error:', error.message)
      }
    }
  } catch (err: any) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[logSecurityEvent] Database unreachable or table pending migration:', err.message)
    }
  }

  // Re-update deduplication timestamp after any network operation
  deduplicationCache.set(dedupKey, { record, timestamp: Date.now() })

  return record
}

function addToMemoryBuffer(record: SecurityAuditRecord) {
  if (memoryAuditBuffer.some(r => r.id === record.id)) return

  memoryAuditBuffer.unshift(record)
  if (memoryAuditBuffer.length > MAX_MEMORY_LOGS) {
    memoryAuditBuffer.pop()
  }
}

/**
 * Access in-memory buffer logs
 */
export function getMemoryAuditLogs(): SecurityAuditRecord[] {
  return [...memoryAuditBuffer]
}

/**
 * Access all persisted and in-memory audit logs combined and deduplicated
 */
export function getPersistentAuditLogs(): SecurityAuditRecord[] {
  const recordMap = new Map<string, SecurityAuditRecord>()
  readPersistentStore().forEach(r => recordMap.set(r.id, r))
  memoryAuditBuffer.forEach(r => recordMap.set(r.id, r))
  return Array.from(recordMap.values())
}

/**
 * Update session status (e.g. on revocation, logout, or completion)
 */
export async function updateSessionStatus(sessionId: string, newStatus: SessionStatus): Promise<boolean> {
  // 1. Update in memory buffer
  for (const item of memoryAuditBuffer) {
    if (item.session_id === sessionId) {
      item.session_status = newStatus
    }
  }

  // 2. Update in persistent store
  try {
    const fileRecords = readPersistentStore()
    let changed = false
    for (const item of fileRecords) {
      if (item.session_id === sessionId) {
        item.session_status = newStatus
        changed = true
      }
    }
    if (changed) {
      try {
        ensureStoreDir()
        fs.writeFileSync(
          /*turbopackIgnore: true*/ getPrimaryStorePath(),
          JSON.stringify(fileRecords, null, 2),
          'utf-8'
        )
      } catch {}
      try {
        fs.writeFileSync(
          /*turbopackIgnore: true*/ TMP_STORE_PATH,
          JSON.stringify(fileRecords, null, 2),
          'utf-8'
        )
      } catch {}
    }
  } catch {}

  // 3. Update in database security_audit_logs if available
  try {
    const admin = await createAdminClient()
    await withTimeout(
      admin
        .from('security_audit_logs')
        .update({ session_status: newStatus })
        .eq('session_id', sessionId),
      2500
    )

    // 4. Also terminate session in time_sessions if revoked or logged out
    if (newStatus === 'Revoked' || newStatus === 'Logged Out') {
      await withTimeout(
        admin
          .from('time_sessions')
          .update({
            status: 'completed',
            clock_out: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId),
        2500
      )
    }

    return true
  } catch (err) {
    console.warn('[updateSessionStatus] DB update exception:', err)
    return true
  }
}
