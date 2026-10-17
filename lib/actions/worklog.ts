'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import { canonicalOfficeHoursToMinutes } from '@/lib/utils/time'

export interface WorklogEmployeeContribution {
  id: string
  name: string
  employeeIdNumber: string
  department: string
  jobTitle: string
  profilePhoto: string | null
  approvedHours: number
  percentage: number
}

export interface WorklogData {
  year: number
  month: number
  monthName: string
  kpis: {
    totalMonthHours: number
    thisWeekHours: number
    todayHours: number
    averageDailyHours: number
    activeDaysCount: number
  }
  contributions: WorklogEmployeeContribution[]
}

export interface WorklogActionResult {
  success: boolean
  data?: WorklogData
  error?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/** Get current business date string in Asia/Kolkata (YYYY-MM-DD). */
function getISTDateString(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)
  const y = parts.find(p => p.type === 'year')?.value || '2026'
  const m = parts.find(p => p.type === 'month')?.value || '10'
  const day = parts.find(p => p.type === 'day')?.value || '01'
  return `${y}-${m}-${day}`
}

/** Get current week's Monday and Sunday in Asia/Kolkata (YYYY-MM-DD). */
function getWeekRangeIST(dateStr: string): { monday: string; sunday: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Construct UTC date to safely compute day of week arithmetic
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const dayOfWeek = dt.getUTCDay() // 0 = Sunday, 1 = Monday...
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mon = new Date(dt)
  mon.setUTCDate(dt.getUTCDate() + diffToMon)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)

  const fmt = (date: Date) => date.toISOString().slice(0, 10)
  return { monday: fmt(mon), sunday: fmt(sun) }
}

export async function getWorklogDataAction(year: number, month: number): Promise<WorklogActionResult> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: Please log in' }
    }

    if (!Number.isInteger(year) || year < 2020 || year > 2035) {
      return { success: false, error: 'Invalid year specified' }
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { success: false, error: 'Invalid month specified' }
    }

    const supabase = await createAdminClient()

    // 1. Calculate boundaries in Asia/Kolkata
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const todayIST = getISTDateString()
    const { monday: currentWeekMonday, sunday: currentWeekSunday } = getWeekRangeIST(todayIST)

    // Current week intersected with the selected month
    const weekIntersectStart = currentWeekMonday > startDate ? currentWeekMonday : startDate
    const weekIntersectEnd = currentWeekSunday < endDate ? currentWeekSunday : endDate
    const hasWeekIntersection = weekIntersectStart <= weekIntersectEnd

    // 2. Query Approved EOD reports for the selected month
    let eodQuery = supabase
      .from('eod_reports')
      .select('id, employee_id, report_date, office_hours, status')
      .eq('status', 'Approved')
      .gte('report_date', startDate)
      .lte('report_date', endDate)

    // If an employee accesses this, restrict to their own records only
    const isPrivileged = currentUser.role === 'Admin' || currentUser.role === 'HR'
    if (!isPrivileged) {
      eodQuery = eodQuery.eq('employee_id', currentUser.id)
    }

    const { data: eodRows, error: eodErr } = await eodQuery

    if (eodErr) {
      console.error('Failed to query approved EOD reports for worklog:', eodErr)
      return { success: false, error: 'Failed to load approved worklog data' }
    }

    const eods = eodRows || []

    // 3. Query all profiles and onboarding records for resolving employee metadata
    const [profilesRes, onboardingRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, employee_id, role, department, designation'),
      supabase.from('employee_onboarding').select('id, employee_id_number, first_name, last_name, profile_photo, department, job_title, employment_status')
    ])

    const profiles = profilesRes.data || []
    const onboarding = onboardingRes.data || []

    // Map onboarding by employee_id_number (e.g. 'EMP-001')
    const onboardingByNumber = new Map<string, any>()
    for (const o of onboarding) {
      if (o.employee_id_number) {
        onboardingByNumber.set(o.employee_id_number, o)
      }
    }

    // 4. Process EOD reports with idempotency (no duplicate counting for same employee on same date)
    const seenEmpDate = new Set<string>()
    const empMinutesMap = new Map<string, number>()
    const activeDates = new Set<string>()

    let totalMonthMinutes = 0
    let thisWeekMinutes = 0
    let todayMinutes = 0

    for (const e of eods) {
      const key = `${e.employee_id}_${e.report_date}`
      if (seenEmpDate.has(key)) {
        continue // Skip duplicate approved EOD for the same employee and day
      }
      seenEmpDate.add(key)

      const mins = canonicalOfficeHoursToMinutes(Number(e.office_hours || 0))
      if (mins <= 0) continue

      totalMonthMinutes += mins
      activeDates.add(e.report_date)

      // This week: sum approved EOD hours from Monday through Sunday of current week, intersected with selected period
      if (
        hasWeekIntersection &&
        e.report_date >= weekIntersectStart &&
        e.report_date <= weekIntersectEnd
      ) {
        thisWeekMinutes += mins
      }

      // Today: sum approved EOD hours for today's date, only when today falls within selected period
      if (e.report_date === todayIST && todayIST >= startDate && todayIST <= endDate) {
        todayMinutes += mins
      }

      empMinutesMap.set(e.employee_id, (empMinutesMap.get(e.employee_id) || 0) + mins)
    }

    // 5. Calculate KPI hours (rounded to 1 decimal place)
    const totalMonthHours = Math.round((totalMonthMinutes / 60) * 10) / 10
    const thisWeekHours = Math.round((thisWeekMinutes / 60) * 10) / 10
    const todayHours = Math.round((todayMinutes / 60) * 10) / 10
    const activeDaysCount = activeDates.size
    const averageDailyHours = activeDaysCount > 0
      ? Math.round((totalMonthHours / activeDaysCount) * 10) / 10
      : 0

    // 6. Build Contribution Breakdown
    // If privileged, show all active non-admin employees (or current employee only if not privileged)
    const targetProfiles = (isPrivileged
      ? profiles.filter(p => p.role !== 'Admin')
      : profiles.filter(p => p.id === currentUser.id)
    ).filter(p => {
      const pAny = p as any
      if (pAny.is_active === false || pAny.deactivated_at != null) return false
      if (p.employee_id) {
        const onb = onboardingByNumber.get(p.employee_id)
        if (onb) {
          const status = (onb.employment_status || '').toLowerCase()
          if (status === 'inactive' || status === 'terminated' || (status && status !== 'active') || onb.deactivated_at != null) {
            return false
          }
        }
      }
      return true
    })

    const contributions: WorklogEmployeeContribution[] = targetProfiles.map(p => {
      const onbRecord = p.employee_id ? onboardingByNumber.get(p.employee_id) : null
      const mins = empMinutesMap.get(p.id) || 0
      const approvedHours = Math.round((mins / 60) * 10) / 10

      // Safe division: percentage of total month approved hours
      const percentage = totalMonthHours > 0
        ? Math.round(((approvedHours / totalMonthHours) * 100) * 10) / 10
        : 0

      const fullName = onbRecord
        ? `${onbRecord.first_name} ${onbRecord.last_name || ''}`.trim()
        : `${p.first_name || ''} ${p.last_name || ''}`.trim()

      return {
        id: p.id,
        name: fullName || 'Employee',
        employeeIdNumber: p.employee_id || onbRecord?.employee_id_number || '—',
        department: onbRecord?.department || p.department || '—',
        jobTitle: onbRecord?.job_title || p.designation || 'Team Member',
        profilePhoto: getProfilePhotoUrl(onbRecord?.profile_photo || null),
        approvedHours,
        percentage
      }
    })

    // Sort by total approved hours, highest first. Secondary sort by name ascending.
    contributions.sort((a, b) => {
      if (b.approvedHours !== a.approvedHours) {
        return b.approvedHours - a.approvedHours
      }
      return a.name.localeCompare(b.name)
    })

    return {
      success: true,
      data: {
        year,
        month,
        monthName: MONTH_NAMES[month - 1],
        kpis: {
          totalMonthHours,
          thisWeekHours,
          todayHours,
          averageDailyHours,
          activeDaysCount
        },
        contributions
      }
    }
  } catch (err: any) {
    console.error('getWorklogDataAction error:', err)
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export const getApprovedWorklogOverview = getWorklogDataAction

