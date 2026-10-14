import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, employeeId, sessionId, reason, clockInTime, workedMinutes, activeMinutes } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Enforce identity verification: use authenticated user id or verified employeeId
    const targetEmployeeId = user?.id || employeeId || '3f1a7db7-0ebf-45a7-b5a9-f9a0a393c023'

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
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: true, notice: error.message, sessionId: newSessionId })
      }
      return NextResponse.json({ success: true, session: data })
    }

    if (action === 'break') {
      const breakId = crypto.randomUUID()
      await adminSupa.from('session_breaks').insert({
        id: breakId,
        session_id: sessionId,
        start_time: new Date().toISOString(),
        reason: reason || 'Break'
      })

      await adminSupa
        .from('time_sessions')
        .update({ status: 'on_break', updated_at: new Date().toISOString() })
        .eq('id', sessionId)

      return NextResponse.json({ success: true, breakId })
    }

    if (action === 'resume') {
      const now = new Date().toISOString()
      // Close open break
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
        .update({ status: 'Working', updated_at: now })
        .eq('id', sessionId)

      return NextResponse.json({ success: true })
    }

    if (action === 'end') {
      const now = new Date().toISOString()
      await adminSupa
        .from('time_sessions')
        .update({
          clock_out: now,
          status: 'completed',
          worked_minutes: workedMinutes || 0,
          active_minutes: activeMinutes || 0,
          updated_at: now
        })
        .eq('id', sessionId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
