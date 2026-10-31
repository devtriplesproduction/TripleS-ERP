'use server'

import { getCurrentUser, guardServerAction } from '@/lib/auth'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export interface ScreenshotItem {
  id: string
  sessionId: string
  employeeId: string
  employeeName?: string
  sessionDate: string
  capturedAt: string
  capturedAtFormatted: string
  storagePath?: string | null
  imageUrl: string
  fileSizeBytes: number
  fileSizeFormatted: string
  appName: string
  windowTitle: string
}

export interface EmployeeReportItem {
  id: string
  name: string
  employee_id: string | null
  department: string
  designation: string
  status: 'Working' | 'On Break' | 'Idle' | 'Clocked Out' | 'Not Started'
  clockInTime: string
  clockOutTime: string
  workedHours: string
  activeHours: string
  idleHours: string
  workedMinutes: number
  activeMinutes: number
  idleMinutes: number
  suspendedSeconds: number
  lastSync: string
  lastSyncFormatted: string
  sessionCount: number
  screenshotCount: number
  screenshots: ScreenshotItem[]
  sessions: Array<{
    id: string
    clock_in: string
    clock_out: string | null
    status: string
    worked_minutes: number
    active_minutes: number
    suspended_seconds: number
    breaks: Array<{
      id: string
      start_time: string
      end_time: string | null
      duration_minutes: number
      reason: string
    }>
  }>
  timeline: Array<{
    id: string
    time: string
    timestamp: string
    type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'activity' | 'suspend'
    title: string
    subtitle: string
    appName?: string
    duration?: string
  }>
  applications: Array<{
    name: string
    duration: string
    durationMinutes: number
    percent: number
    sampleWindows: string[]
  }>
  breaks: Array<{
    id: string
    startTime: string
    endTime: string
    duration: string
    reason: string
  }>
  idleIntervals: Array<{
    description: string
    durationMinutes: number
    durationFormatted: string
  }>
  syncHealth: {
    isHealthy: boolean
    lastSyncTime: string | null
    warningMessage: string | null
  }
}

export interface OverviewMetrics {
  totalEmployees: number
  currentlyWorking: number
  onBreak: number
  currentlyIdle: number
  clockedOut: number
  notStarted: number
  totalWorkedMinutes: number
  totalActiveMinutes: number
  totalWorkedHoursFormatted: string
  totalActiveHoursFormatted: string
  activeEfficiencyPercent: number
  totalScreenshots: number
  hourlyData: Array<{ hour: string; worked: number; active: number }>
}

export interface MonthlyEmployeeSummary {
  id: string
  name: string
  employee_id: string | null
  department: string
  designation: string
  daysWorked: number
  totalWorkedMinutes: number
  totalActiveMinutes: number
  totalWorkedHours: string
  totalActiveHours: string
  avgActivePerDayHours: string
  completedSessions: number
  totalSessions: number
}

export interface MonthlyOverviewMetrics {
  month: string
  totalEmployees: number
  totalStaffWithSessions: number
  totalDaysLogged: number
  totalMonthlyWorkedMinutes: number
  totalMonthlyActiveMinutes: number
  totalMonthlyWorkedHours: string
  totalMonthlyActiveHours: string
  avgDailyActiveHours: string
  dailyTrends: Array<{ date: string; workedHours: number; activeHours: number }>
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function getCurrentMonthIST(): string {
  return getTodayIST().slice(0, 7)
}

function formatISTTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '-'
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d)
  } catch {
    return '-'
  }
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getAdminSupabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Fetch Admin Time Tracking Dashboard Data
 * Strictly restricted to Admin role.
 */
export async function getTimeTrackingDashboardData(params?: {
  date?: string
  department?: string
  status?: string
  employeeId?: string
}): Promise<{
  success: boolean
  date: string
  overview: OverviewMetrics
  employees: EmployeeReportItem[]
  error?: string
}> {
  // STRICT ADMIN ROLE GUARD
  await guardServerAction(['Admin'])

  try {
    const adminSupa = getAdminSupabase()
    const targetDate = params?.date || getTodayIST()
    const filterDept = params?.department || 'All'
    const filterStatus = params?.status || 'All'
    const filterEmpId = params?.employeeId || 'All'

    // 1. Fetch real profiles from ERP database
    const { data: dbProfiles, error: profileErr } = await adminSupa
      .from('profiles')
      .select('id, first_name, last_name, employee_id, department, designation, role')
      .order('first_name', { ascending: true })

    if (profileErr) {
      throw new Error(`Failed to query employee profiles: ${profileErr.message}`)
    }

    const profiles = dbProfiles || []

    // 2. Fetch real time sessions for target business date
    const { data: dbSessions, error: sessionErr } = await adminSupa
      .from('time_sessions')
      .select('id, employee_id, session_date, clock_in, clock_out, status, worked_minutes, active_minutes, suspended_seconds, updated_at')
      .eq('session_date', targetDate)
      .order('clock_in', { ascending: true })

    if (sessionErr) {
      throw new Error(`Failed to query time sessions: ${sessionErr.message}`)
    }

    const sessions = dbSessions || []
    const sessionIds = sessions.map(s => s.id)

    // 3. Fetch real session breaks for these sessions
    let sessionBreaks: any[] = []
    if (sessionIds.length > 0) {
      const { data: breaksData, error: breakErr } = await adminSupa
        .from('session_breaks')
        .select('id, session_id, start_time, end_time, duration_minutes, reason')
        .in('session_id', sessionIds)
        .order('start_time', { ascending: true })

      if (!breakErr && breaksData) {
        sessionBreaks = breaksData
      }
    }

    // 4. Fetch activity logs for foreground apps and activity intervals
    let activityLogs: any[] = []
    if (sessionIds.length > 0) {
      const { data: logsData, error: logsErr } = await adminSupa
        .from('activity_logs')
        .select('id, session_id, employee_id, start_time, end_time, active_seconds, app_name, window_title')
        .in('session_id', sessionIds)
        .order('start_time', { ascending: true })

      if (!logsErr && logsData) {
        activityLogs = logsData
      }
    }

    // 5. Fetch screenshots for target business date (or matching sessions)
    let sessionScreenshots: any[] = []
    const { data: screensData, error: screenErr } = await adminSupa
      .from('session_screenshots')
      .select('id, session_id, employee_id, session_date, captured_at, storage_path, image_url, file_size_bytes, app_name, window_title')
      .eq('session_date', targetDate)
      .order('captured_at', { ascending: false })

    if (!screenErr && screensData && screensData.length > 0) {
      sessionScreenshots = screensData
    } else if (sessionIds.length > 0) {
      const { data: screensBySession, error: sErr } = await adminSupa
        .from('session_screenshots')
        .select('id, session_id, employee_id, session_date, captured_at, storage_path, image_url, file_size_bytes, app_name, window_title')
        .in('session_id', sessionIds)
        .order('captured_at', { ascending: false })

      if (!sErr && screensBySession) {
        sessionScreenshots = screensBySession
      }
    }

    const now = Date.now()
    const isToday = targetDate === getTodayIST()

    // 6. Build Employee Report items
    const employees: EmployeeReportItem[] = profiles.map(profile => {
      const empSessions = sessions.filter(s => s.employee_id === profile.id)
      const empBreaks = sessionBreaks.filter(b => empSessions.some(s => s.id === b.session_id))
      const empLogs = activityLogs.filter(l => l.employee_id === profile.id)
      const empScreenshotsRaw = sessionScreenshots.filter(s => s.employee_id === profile.id)

      const empScreenshots: ScreenshotItem[] = empScreenshotsRaw.map(s => {
        let url = s.image_url
        if (!url && s.storage_path) {
          const { data: pubData } = adminSupa.storage.from('screenshots').getPublicUrl(s.storage_path)
          url = pubData?.publicUrl || ''
        }
        return {
          id: s.id,
          sessionId: s.session_id,
          employeeId: s.employee_id,
          employeeName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Employee',
          sessionDate: s.session_date,
          capturedAt: s.captured_at,
          capturedAtFormatted: formatISTTime(s.captured_at),
          storagePath: s.storage_path,
          imageUrl: url,
          fileSizeBytes: Number(s.file_size_bytes || 0),
          fileSizeFormatted: formatBytes(Number(s.file_size_bytes || 0)),
          appName: s.app_name || 'Active Screen',
          windowTitle: s.window_title || ''
        }
      })

      const workedMins = empSessions.reduce((acc, s) => acc + (s.worked_minutes || 0), 0)
      const activeMins = empSessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0)
      const idleMins = Math.max(0, workedMins - activeMins)
      const suspendedSecs = empSessions.reduce((acc, s) => acc + (s.suspended_seconds || 0), 0)

      // Determine accurate tracking status
      let status: 'Working' | 'On Break' | 'Idle' | 'Clocked Out' | 'Not Started' = 'Not Started'
      let clockInTime = '-'
      let clockOutTime = '-'
      let latestSyncIso: string | null = null

      if (empSessions.length === 0) {
        status = 'Not Started'
      } else {
        // Earliest clock-in
        const firstSession = empSessions[0]
        clockInTime = formatISTTime(firstSession.clock_in)

        // Check if there is an active session
        const activeSession = empSessions.find(
          s => s.status === 'working' || s.status === 'Working' || s.status === 'on_break' || s.status === 'On Break' || !s.clock_out
        )

        // Find latest sync timestamp across session updated_at and activity logs
        for (const s of empSessions) {
          if (s.updated_at && (!latestSyncIso || new Date(s.updated_at) > new Date(latestSyncIso))) {
            latestSyncIso = s.updated_at
          }
        }
        for (const l of empLogs) {
          if (l.end_time && (!latestSyncIso || new Date(l.end_time) > new Date(latestSyncIso))) {
            latestSyncIso = l.end_time
          }
        }

        if (activeSession) {
          clockOutTime = 'In Progress'

          // Check for open break
          const hasOpenBreak = empBreaks.some(b => b.session_id === activeSession.id && !b.end_time)
          const isBreakStatus = activeSession.status === 'on_break' || activeSession.status === 'On Break'

          if (hasOpenBreak || isBreakStatus) {
            status = 'On Break'
          } else {
            // Check recency of activity
            const lastActiveTime = latestSyncIso ? new Date(latestSyncIso).getTime() : new Date(activeSession.clock_in).getTime()
            const timeSinceLastActiveMs = Math.max(0, now - lastActiveTime)

            // Idle threshold: if active session has no update for > 5 mins (on current date)
            if (isToday && timeSinceLastActiveMs > 5 * 60 * 1000) {
              status = 'Idle'
            } else if (!isToday) {
              status = 'Idle'
            } else {
              status = 'Working'
            }
          }
        } else {
          status = 'Clocked Out'
          // Latest clock-out
          const lastSessionWithClockOut = [...empSessions].reverse().find(s => s.clock_out)
          if (lastSessionWithClockOut) {
            clockOutTime = formatISTTime(lastSessionWithClockOut.clock_out)
          }
        }
      }

      // Build structured session records
      const formattedSessions = empSessions.map(s => ({
        id: s.id,
        clock_in: s.clock_in,
        clock_out: s.clock_out,
        status: s.status,
        worked_minutes: s.worked_minutes || 0,
        active_minutes: s.active_minutes || 0,
        suspended_seconds: s.suspended_seconds || 0,
        breaks: empBreaks
          .filter(b => b.session_id === s.id)
          .map(b => ({
            id: b.id,
            start_time: b.start_time,
            end_time: b.end_time,
            duration_minutes: b.duration_minutes || 0,
            reason: b.reason || 'Break'
          }))
      }))

      // Application breakdown
      const appMap: Record<string, { seconds: number; windows: Set<string> }> = {}
      for (const log of empLogs) {
        const app = log.app_name || 'Desktop Work'
        if (!appMap[app]) {
          appMap[app] = { seconds: 0, windows: new Set() }
        }
        appMap[app].seconds += log.active_seconds || 0
        if (log.window_title) {
          appMap[app].windows.add(log.window_title.slice(0, 80))
        }
      }

      const totalAppSeconds = Object.values(appMap).reduce((a, b) => a + b.seconds, 0)
      const applications = Object.entries(appMap)
        .map(([name, data]) => {
          const durMins = Math.floor(data.seconds / 60)
          const h = Math.floor(durMins / 60)
          const m = durMins % 60
          return {
            name,
            duration: h > 0 ? `${h}h ${m}m` : `${m}m`,
            durationMinutes: durMins,
            percent: totalAppSeconds > 0 ? Math.round((data.seconds / totalAppSeconds) * 100) : 0,
            sampleWindows: Array.from(data.windows).slice(0, 3)
          }
        })
        .sort((a, b) => b.durationMinutes - a.durationMinutes)

      // Chronological Activity Timeline
      const timeline: Array<{
        id: string
        time: string
        timestamp: string
        type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'activity' | 'suspend'
        title: string
        subtitle: string
        appName?: string
        duration?: string
      }> = []

      for (const s of empSessions) {
        timeline.push({
          id: `in-${s.id}`,
          time: formatISTTime(s.clock_in),
          timestamp: s.clock_in,
          type: 'clock_in',
          title: 'Clock In',
          subtitle: `Session started (${s.status})`
        })

        if (s.suspended_seconds > 0) {
          timeline.push({
            id: `suspend-${s.id}`,
            time: formatISTTime(s.clock_in),
            timestamp: s.clock_in,
            type: 'suspend',
            title: 'System Suspend / Sleep',
            subtitle: `${Math.round(s.suspended_seconds / 60)}m system sleep excluded from worked hours`
          })
        }

        if (s.clock_out) {
          timeline.push({
            id: `out-${s.id}`,
            time: formatISTTime(s.clock_out),
            timestamp: s.clock_out,
            type: 'clock_out',
            title: 'Clock Out',
            subtitle: `Session completed • ${formatMinutesToHours(s.worked_minutes)} worked`
          })
        }
      }

      for (const b of empBreaks) {
        timeline.push({
          id: `b-start-${b.id}`,
          time: formatISTTime(b.start_time),
          timestamp: b.start_time,
          type: 'break_start',
          title: 'Break Started',
          subtitle: `Reason: ${b.reason || 'Break'}`
        })

        if (b.end_time) {
          timeline.push({
            id: `b-end-${b.id}`,
            time: formatISTTime(b.end_time),
            timestamp: b.end_time,
            type: 'break_end',
            title: 'Break Ended',
            subtitle: `Duration: ${b.duration_minutes || 0}m`
          })
        }
      }

      // Sample activity events from logs (first and top active intervals)
      for (const log of empLogs.slice(0, 15)) {
        timeline.push({
          id: `log-${log.id}`,
          time: formatISTTime(log.start_time),
          timestamp: log.start_time,
          type: 'activity',
          title: log.app_name || 'Active Work',
          subtitle: log.window_title ? log.window_title.slice(0, 75) : 'Foreground work',
          appName: log.app_name,
          duration: `${Math.round((log.active_seconds || 0) / 60)}m`
        })
      }

      // Sort timeline chronologically
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Break interval list
      const breaks = empBreaks.map(b => ({
        id: b.id,
        startTime: formatISTTime(b.start_time),
        endTime: b.end_time ? formatISTTime(b.end_time) : 'Active Break',
        duration: `${b.duration_minutes || 0}m`,
        reason: b.reason || 'Break'
      }))

      // Idle intervals summary
      const idleIntervals = idleMins > 0 ? [{
        description: `Total recorded idle during active session intervals`,
        durationMinutes: idleMins,
        durationFormatted: formatMinutesToHours(idleMins)
      }] : []

      // Sync Health & Warnings
      let warningMessage: string | null = null
      let isHealthy = true

      if (status === 'Working' || status === 'Idle') {
        if (!latestSyncIso && empSessions.length > 0) {
          warningMessage = 'Active session has not synced any telemetry data yet.'
          isHealthy = false
        } else if (latestSyncIso && isToday) {
          const diffMinutes = Math.floor((now - new Date(latestSyncIso).getTime()) / 60000)
          if (diffMinutes > 15) {
            warningMessage = `Active session telemetry delayed (${diffMinutes}m since last sync).`
            isHealthy = false
          }
        } else if (!isToday) {
          warningMessage = 'Past session was not formally clocked out by employee.'
          isHealthy = false
        }
      }

      return {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Employee',
        employee_id: profile.employee_id || null,
        department: profile.department || 'General',
        designation: profile.designation || 'Staff',
        status,
        clockInTime,
        clockOutTime,
        workedHours: formatMinutesToHours(workedMins),
        activeHours: formatMinutesToHours(activeMins),
        idleHours: formatMinutesToHours(idleMins),
        workedMinutes: workedMins,
        activeMinutes: activeMins,
        idleMinutes: idleMins,
        suspendedSeconds: suspendedSecs,
        lastSync: latestSyncIso || '-',
        lastSyncFormatted: latestSyncIso ? formatISTTime(latestSyncIso) : '-',
        sessionCount: empSessions.length,
        screenshotCount: empScreenshots.length,
        screenshots: empScreenshots,
        sessions: formattedSessions,
        timeline,
        applications,
        breaks,
        idleIntervals,
        syncHealth: {
          isHealthy,
          lastSyncTime: latestSyncIso ? formatISTTime(latestSyncIso) : null,
          warningMessage
        }
      }
    })

    // Filter employees according to filter criteria
    let filteredEmployees = employees

    if (filterDept !== 'All') {
      filteredEmployees = filteredEmployees.filter(
        e => e.department.toLowerCase() === filterDept.toLowerCase()
      )
    }

    if (filterStatus !== 'All') {
      filteredEmployees = filteredEmployees.filter(e => e.status === filterStatus)
    }

    if (filterEmpId !== 'All') {
      filteredEmployees = filteredEmployees.filter(e => e.id === filterEmpId)
    }

    // Overview KPIs
    const totalEmployees = profiles.length
    const currentlyWorking = employees.filter(e => e.status === 'Working').length
    const onBreak = employees.filter(e => e.status === 'On Break').length
    const currentlyIdle = employees.filter(e => e.status === 'Idle').length
    const clockedOut = employees.filter(e => e.status === 'Clocked Out').length
    const notStarted = employees.filter(e => e.status === 'Not Started').length

    const totalWorkedMinutes = employees.reduce((acc, e) => acc + e.workedMinutes, 0)
    const totalActiveMinutes = employees.reduce((acc, e) => acc + e.activeMinutes, 0)
    const activeEfficiencyPercent = totalWorkedMinutes > 0
      ? Math.min(100, Math.round((totalActiveMinutes / totalWorkedMinutes) * 100))
      : 0
    const totalScreenshots = sessionScreenshots.length

    // Hourly distribution for target date (9 AM to 6 PM IST)
    const hourlyData = [
      { hour: '9 AM', worked: 0, active: 0 },
      { hour: '10 AM', worked: 0, active: 0 },
      { hour: '11 AM', worked: 0, active: 0 },
      { hour: '12 PM', worked: 0, active: 0 },
      { hour: '1 PM', worked: 0, active: 0 },
      { hour: '2 PM', worked: 0, active: 0 },
      { hour: '3 PM', worked: 0, active: 0 },
      { hour: '4 PM', worked: 0, active: 0 },
      { hour: '5 PM', worked: 0, active: 0 },
      { hour: '6 PM', worked: 0, active: 0 }
    ]

    for (const log of activityLogs) {
      if (!log.start_time) continue
      const logDate = new Date(log.start_time)
      const istHours = Number(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: 'Asia/Kolkata'
        }).format(logDate)
      )

      if (istHours >= 9 && istHours <= 18) {
        const slotIdx = istHours - 9
        if (hourlyData[slotIdx]) {
          hourlyData[slotIdx].active += Number(((log.active_seconds || 0) / 3600).toFixed(2))
        }
      }
    }

    return {
      success: true,
      date: targetDate,
      overview: {
        totalEmployees,
        currentlyWorking,
        onBreak,
        currentlyIdle,
        clockedOut,
        notStarted,
        totalWorkedMinutes,
        totalActiveMinutes,
        totalWorkedHoursFormatted: formatMinutesToHours(totalWorkedMinutes),
        totalActiveHoursFormatted: formatMinutesToHours(totalActiveMinutes),
        activeEfficiencyPercent,
        totalScreenshots,
        hourlyData
      },
      employees: filteredEmployees
    }
  } catch (err: any) {
    console.error('[Action getTimeTrackingDashboardData] Error:', err)
    return {
      success: false,
      date: params?.date || getTodayIST(),
      error: err.message || 'Failed to retrieve tracking dashboard data',
      overview: {
        totalEmployees: 0,
        currentlyWorking: 0,
        onBreak: 0,
        currentlyIdle: 0,
        clockedOut: 0,
        notStarted: 0,
        totalWorkedMinutes: 0,
        totalActiveMinutes: 0,
        totalWorkedHoursFormatted: '0h 00m',
        totalActiveHoursFormatted: '0h 00m',
        activeEfficiencyPercent: 0,
        totalScreenshots: 0,
        hourlyData: []
      },
      employees: []
    }
  }
}

/**
 * Fetch Monthly Time Tracking Summary
 * Strictly restricted to Admin role.
 */
export async function getMonthlyTrackingSummary(params?: {
  month?: string
  department?: string
}): Promise<{
  success: boolean
  overview: MonthlyOverviewMetrics
  employees: MonthlyEmployeeSummary[]
  error?: string
}> {
  // STRICT ADMIN ROLE GUARD
  await guardServerAction(['Admin'])

  try {
    const adminSupa = getAdminSupabase()
    const targetMonth = params?.month || getCurrentMonthIST()
    const filterDept = params?.department || 'All'

    const startDate = `${targetMonth}-01`
    const endDate = `${targetMonth}-31`

    // Fetch profiles
    const { data: dbProfiles, error: profileErr } = await adminSupa
      .from('profiles')
      .select('id, first_name, last_name, employee_id, department, designation, role')
      .order('first_name', { ascending: true })

    if (profileErr) {
      throw new Error(`Failed to query profiles: ${profileErr.message}`)
    }

    const profiles = dbProfiles || []

    // Fetch monthly sessions
    const { data: dbSessions, error: sessionErr } = await adminSupa
      .from('time_sessions')
      .select('id, employee_id, session_date, clock_in, clock_out, status, worked_minutes, active_minutes')
      .gte('session_date', startDate)
      .lte('session_date', endDate)

    if (sessionErr) {
      throw new Error(`Failed to query monthly sessions: ${sessionErr.message}`)
    }

    const sessions = dbSessions || []

    // Map summaries per employee
    const employeeSummaries: MonthlyEmployeeSummary[] = profiles.map(p => {
      const empSessions = sessions.filter(s => s.employee_id === p.id)
      const uniqueDates = new Set(empSessions.map(s => s.session_date))
      const daysWorked = uniqueDates.size

      const totalWorked = empSessions.reduce((acc, s) => acc + (s.worked_minutes || 0), 0)
      const totalActive = empSessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0)
      const avgActiveMins = daysWorked > 0 ? Math.round(totalActive / daysWorked) : 0
      const completedSessions = empSessions.filter(s => s.status === 'completed' || s.status === 'Completed').length

      return {
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Employee',
        employee_id: p.employee_id || null,
        department: p.department || 'General',
        designation: p.designation || 'Staff',
        daysWorked,
        totalWorkedMinutes: totalWorked,
        totalActiveMinutes: totalActive,
        totalWorkedHours: formatMinutesToHours(totalWorked),
        totalActiveHours: formatMinutesToHours(totalActive),
        avgActivePerDayHours: formatMinutesToHours(avgActiveMins),
        completedSessions,
        totalSessions: empSessions.length
      }
    })

    const filtered = filterDept === 'All'
      ? employeeSummaries
      : employeeSummaries.filter(e => e.department.toLowerCase() === filterDept.toLowerCase())

    const totalStaffWithSessions = filtered.filter(e => e.daysWorked > 0).length
    const totalDaysLogged = filtered.reduce((acc, e) => acc + e.daysWorked, 0)
    const totalMonthlyWorkedMinutes = filtered.reduce((acc, e) => acc + e.totalWorkedMinutes, 0)
    const totalMonthlyActiveMinutes = filtered.reduce((acc, e) => acc + e.totalActiveMinutes, 0)
    const avgDailyActiveMins = totalDaysLogged > 0 ? Math.round(totalMonthlyActiveMinutes / totalDaysLogged) : 0

    // Daily trends across the month
    const dateMap: Record<string, { worked: number; active: number }> = {}
    for (const s of sessions) {
      if (!dateMap[s.session_date]) {
        dateMap[s.session_date] = { worked: 0, active: 0 }
      }
      dateMap[s.session_date].worked += (s.worked_minutes || 0)
      dateMap[s.session_date].active += (s.active_minutes || 0)
    }

    const dailyTrends = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        workedHours: Number((data.worked / 60).toFixed(2)),
        activeHours: Number((data.active / 60).toFixed(2))
      }))

    return {
      success: true,
      overview: {
        month: targetMonth,
        totalEmployees: profiles.length,
        totalStaffWithSessions,
        totalDaysLogged,
        totalMonthlyWorkedMinutes,
        totalMonthlyActiveMinutes,
        totalMonthlyWorkedHours: formatMinutesToHours(totalMonthlyWorkedMinutes),
        totalMonthlyActiveHours: formatMinutesToHours(totalMonthlyActiveMinutes),
        avgDailyActiveHours: formatMinutesToHours(avgDailyActiveMins),
        dailyTrends
      },
      employees: filtered
    }
  } catch (err: any) {
    console.error('[Action getMonthlyTrackingSummary] Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to retrieve monthly summary',
      overview: {
        month: params?.month || getCurrentMonthIST(),
        totalEmployees: 0,
        totalStaffWithSessions: 0,
        totalDaysLogged: 0,
        totalMonthlyWorkedMinutes: 0,
        totalMonthlyActiveMinutes: 0,
        totalMonthlyWorkedHours: '0h 00m',
        totalMonthlyActiveHours: '0h 00m',
        avgDailyActiveHours: '0h 00m',
        dailyTrends: []
      },
      employees: []
    }
  }
}

/**
 * Fetch Screenshots for Admin Dashboard
 * Strictly restricted to Admin role.
 */
export async function getScreenshotsForEmployeeAndDate(params?: {
  employeeId?: string
  date?: string
  sessionId?: string
}): Promise<{
  success: boolean
  date: string
  screenshots: ScreenshotItem[]
  totalCount: number
  error?: string
}> {
  await guardServerAction(['Admin'])

  try {
    const adminSupa = getAdminSupabase()
    const targetDate = params?.date || getTodayIST()
    const filterEmpId = params?.employeeId && params.employeeId !== 'All' ? params.employeeId : undefined
    const filterSessionId = params?.sessionId && params.sessionId !== 'All' ? params.sessionId : undefined

    // 1. Fetch profiles for name resolution
    const { data: dbProfiles } = await adminSupa
      .from('profiles')
      .select('id, first_name, last_name, employee_id')

    const profileMap = new Map<string, string>()
    if (dbProfiles) {
      for (const p of dbProfiles) {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Employee'
        profileMap.set(p.id, fullName)
      }
    }

    // 2. Query screenshots
    let query = adminSupa
      .from('session_screenshots')
      .select('id, session_id, employee_id, session_date, captured_at, storage_path, image_url, file_size_bytes, app_name, window_title')
      .eq('session_date', targetDate)
      .order('captured_at', { ascending: false })

    if (filterEmpId) {
      query = query.eq('employee_id', filterEmpId)
    }

    if (filterSessionId) {
      query = query.eq('session_id', filterSessionId)
    }

    const { data: rawScreens, error } = await query

    if (error) {
      throw new Error(`Failed to query screenshots: ${error.message}`)
    }

    const screenshots: ScreenshotItem[] = (rawScreens || []).map(s => {
      let url = s.image_url
      if (!url && s.storage_path) {
        const { data: pubData } = adminSupa.storage.from('screenshots').getPublicUrl(s.storage_path)
        url = pubData?.publicUrl || ''
      }
      return {
        id: s.id,
        sessionId: s.session_id,
        employeeId: s.employee_id,
        employeeName: profileMap.get(s.employee_id) || 'Employee',
        sessionDate: s.session_date,
        capturedAt: s.captured_at,
        capturedAtFormatted: formatISTTime(s.captured_at),
        storagePath: s.storage_path,
        imageUrl: url,
        fileSizeBytes: Number(s.file_size_bytes || 0),
        fileSizeFormatted: formatBytes(Number(s.file_size_bytes || 0)),
        appName: s.app_name || 'Active Screen',
        windowTitle: s.window_title || ''
      }
    })

    return {
      success: true,
      date: targetDate,
      screenshots,
      totalCount: screenshots.length
    }
  } catch (err: any) {
    console.error('[getScreenshotsForEmployeeAndDate] Error:', err)
    return {
      success: false,
      date: params?.date || getTodayIST(),
      screenshots: [],
      totalCount: 0,
      error: err.message || 'Failed to fetch screenshots'
    }
  }
}
