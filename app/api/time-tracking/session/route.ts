import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
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

    if (action === 'start') {
      const newSessionId = sessionId || crypto.randomUUID()
      const { data, error } = await adminSupa
        .from('time_sessions')
        .upsert({
          id: newSessionId,
          employee_id: targetEmployeeId,
          session_date: today,
          clock_in: clockInTime || new Date().toISOString(),
          status: 'working',
          worked_minutes: workedMinutes || 0,
          active_minutes: activeMinutes || 0,
          suspended_seconds: suspendedSeconds || 0,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
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

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}
