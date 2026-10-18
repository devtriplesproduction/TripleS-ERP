import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    
    // Only Admin may query other employees; regular employees query only their own profile
    const requestedEmployeeId = searchParams.get('employeeId')
    if (requestedEmployeeId && requestedEmployeeId !== user.id && user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view another employee time summary' },
        { status: 403 }
      )
    }
    const targetEmployeeId = (user.role === 'Admin' && requestedEmployeeId) 
      ? requestedEmployeeId 
      : user.id

    // Default to Asia/Kolkata business date
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
    const date = searchParams.get('date') || today

    const adminSupa = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: sessions, error } = await adminSupa
      .from('time_sessions')
      .select('id, employee_id, session_date, clock_in, clock_out, status, worked_minutes, active_minutes, suspended_seconds')
      .eq('employee_id', targetEmployeeId)
      .eq('session_date', date)

    if (error) {
      console.error('[API /api/time-tracking/summary] Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve tracking sessions: ' + error.message },
        { status: 500 }
      )
    }

    // When no sessions exist, return clean empty state with ZERO hours (NEVER mock data)
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: true,
        employeeId: targetEmployeeId,
        date,
        totalWorkedMinutes: 0,
        totalActiveMinutes: 0,
        activeHoursDecimal: 0,
        formattedWorked: '0h 00m',
        formattedActive: '0h 00m',
        formattedHHMM: '0.00',
        sessions: [],
        isEmpty: true
      })
    }

    // Accumulate all non-overlapping sessions for the date
    const totalWorked = sessions.reduce((acc, s) => acc + (s.worked_minutes || 0), 0)
    const totalActive = sessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0)
    const activeHoursDecimal = Number((totalActive / 60).toFixed(6))

    const workedH = Math.floor(totalWorked / 60)
    const workedM = totalWorked % 60
    const activeH = Math.floor(totalActive / 60)
    const activeM = totalActive % 60

    return NextResponse.json({
      success: true,
      employeeId: targetEmployeeId,
      date,
      totalWorkedMinutes: totalWorked,
      totalActiveMinutes: totalActive,
      activeHoursDecimal,
      formattedWorked: `${workedH}h ${workedM.toString().padStart(2, '0')}m`,
      formattedActive: `${activeH}h ${activeM.toString().padStart(2, '0')}m`,
      formattedHHMM: `${activeH}.${activeM.toString().padStart(2, '0')}`,
      sessions,
      isEmpty: totalActive === 0
    })
  } catch (err: any) {
    console.error('[API /api/time-tracking/summary] Unhandled exception:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}
