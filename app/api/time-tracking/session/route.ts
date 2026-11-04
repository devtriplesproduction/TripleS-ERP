import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/utils/rate-limiter'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { resolveClientMetadata, parseDetailedUserAgent } from '@/lib/utils/device-parser'
import { logSecurityEvent, updateSessionStatus } from '@/lib/utils/audit-logger'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }

    const rl = checkRateLimit(`tt-session:${user.id}`, 60, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: 'Too many session telemetry requests. Rate limit exceeded.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { action, sessionId, reason, clockInTime, workedMinutes, activeMinutes, suspendedSeconds } = body

    // Enforce identity verification: session ALWAYS belongs to the authenticated user
    const targetEmployeeId = user.id

    const adminSupa = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())

    const geoMeta = await resolveClientMetadata(req.headers)
    const userAgent = req.headers.get('user-agent') || ''
    const clientInfo = parseDetailedUserAgent(userAgent, req.headers)

    if (action === 'start') {
      const newSessionId = sessionId || crypto.randomUUID()
      const nowIso = clockInTime || new Date().toISOString()

      const fullPayload: Record<string, any> = {
        id: newSessionId,
        employee_id: targetEmployeeId,
        session_date: today,
        clock_in: nowIso,
        status: 'working',
        worked_minutes: workedMinutes || 0,
        active_minutes: activeMinutes || 0,
        suspended_seconds: suspendedSeconds || 0,
        updated_at: new Date().toISOString(),
        ip_address: geoMeta.ip,
        ip_classification: geoMeta.classification,
        location: geoMeta.location,
        isp: geoMeta.isp,
        user_agent: userAgent,
        browser: clientInfo.displayName,
        os: clientInfo.fullOs,
        device: clientInfo.deviceType,
        client_type: clientInfo.clientType,
        app_version: clientInfo.appVersion,
      }

      let { data, error } = await adminSupa
        .from('time_sessions')
        .upsert(fullPayload)
        .select()
        .single()

      if (error && error.code === 'PGRST204') {
        // Fallback for core columns before database migration
        const corePayload = {
          id: newSessionId,
          employee_id: targetEmployeeId,
          session_date: today,
          clock_in: nowIso,
          status: 'working',
          worked_minutes: workedMinutes || 0,
          active_minutes: activeMinutes || 0,
          suspended_seconds: suspendedSeconds || 0,
          updated_at: new Date().toISOString()
        }
        const fallback = await adminSupa
          .from('time_sessions')
          .upsert(corePayload)
          .select()
          .single()
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      // Record immutable security audit log event
      await logSecurityEvent({
        eventType: 'login_success',
        status: 'Success',
        userId: targetEmployeeId,
        authMethod: clientInfo.clientType === 'desktop_app' ? 'TripleS Time Tracker (Desktop)' : 'Time Tracking Client',
        ipAddress: geoMeta.ip,
        ipClassification: geoMeta.classification,
        location: geoMeta.location,
        userAgent,
        browser: clientInfo.displayName,
        os: clientInfo.fullOs,
        device: clientInfo.deviceType,
        clientType: clientInfo.clientType,
        appName: clientInfo.appName,
        appVersion: clientInfo.appVersion,
        runtime: clientInfo.runtime,
        browserVersion: clientInfo.browserVersion,
        browserEngine: clientInfo.browserEngine,
        osVersion: clientInfo.osVersion,
        city: geoMeta.city,
        region: geoMeta.region,
        country: geoMeta.country,
        latitude: geoMeta.latitude,
        longitude: geoMeta.longitude,
        timezone: geoMeta.timezone,
        isp: geoMeta.isp,
        sessionId: newSessionId,
        sessionStatus: 'Active',
        clockIn: nowIso,
        workedMinutes: workedMinutes || 0,
        activeMinutes: activeMinutes || 0,
        metadataSource: geoMeta.sourceHeader,
      })

      return NextResponse.json({ success: true, session: data })
    }

    if (action === 'break') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
      }
      const breakId = crypto.randomUUID()
      const { error: breakErr } = await adminSupa.from('session_breaks').insert({
        id: breakId,
        session_id: sessionId,
        start_time: new Date().toISOString(),
        reason: reason || 'Break'
      })
      if (breakErr) {
        return NextResponse.json({ success: false, error: breakErr.message }, { status: 500 })
      }

      await adminSupa
        .from('time_sessions')
        .update({ status: 'on_break', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('employee_id', targetEmployeeId)

      return NextResponse.json({ success: true, breakId })
    }

    if (action === 'resume') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
      }
      const now = new Date().toISOString()
      const { data: openBreak } = await adminSupa
        .from('session_breaks')
        .select('id, start_time')
        .eq('session_id', sessionId)
        .is('end_time', null)
        .maybeSingle()

      if (openBreak) {
        const start = new Date(openBreak.start_time).getTime()
        const duration = Math.max(0, Math.floor((new Date(now).getTime() - start) / 60000))
        await adminSupa
          .from('session_breaks')
          .update({ end_time: now, duration_minutes: duration })
          .eq('id', openBreak.id)
      }

      await adminSupa
        .from('time_sessions')
        .update({ status: 'working', updated_at: now })
        .eq('id', sessionId)
        .eq('employee_id', targetEmployeeId)

      return NextResponse.json({ success: true })
    }

    if (action === 'end') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
      }
      const now = new Date().toISOString()
      await adminSupa
        .from('time_sessions')
        .update({
          clock_out: now,
          status: 'completed',
          worked_minutes: workedMinutes || 0,
          active_minutes: activeMinutes || 0,
          suspended_seconds: suspendedSeconds || 0,
          updated_at: now
        })
        .eq('id', sessionId)
        .eq('employee_id', targetEmployeeId)

      await updateSessionStatus(sessionId, 'Expired')
      await logSecurityEvent({
        eventType: 'logout',
        status: 'Success',
        userId: targetEmployeeId,
        authMethod: 'Session Termination',
        ipAddress: geoMeta.ip,
        ipClassification: geoMeta.classification,
        location: geoMeta.location,
        userAgent,
        browser: clientInfo.displayName,
        os: clientInfo.fullOs,
        device: clientInfo.deviceType,
        clientType: clientInfo.clientType,
        appName: clientInfo.appName,
        appVersion: clientInfo.appVersion,
        runtime: clientInfo.runtime,
        sessionId,
        sessionStatus: 'Expired',
        clockOut: now,
        workedMinutes: workedMinutes || 0,
        activeMinutes: activeMinutes || 0,
        metadataSource: geoMeta.sourceHeader,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}
