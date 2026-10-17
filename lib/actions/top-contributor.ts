'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getISTDateString, canonicalOfficeHoursToMinutes } from '@/lib/utils/time'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import {
  formatHours,
  type LeaderboardEntry,
  type PeriodInfo,
  type TopContributorData,
} from '@/lib/utils/top-contributor'

export type { LeaderboardEntry, PeriodInfo, TopContributorData }

export interface TopContributorResponse {
  success: boolean
  error?: string
  data: TopContributorData | null
}

/**
 * Fetch Top Contributor and Leaderboard exclusively from approved EOD reports.
 * Defaults to the current month in Asia/Kolkata timezone.
 * Enforces admin authorization.
 */
export async function getTopContributorData(options?: {
  month?: number
  year?: number
}): Promise<TopContributorResponse> {
  try {
    // 1. Verify Authentication & Admin Role
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Authentication required', data: null }
    }

    const roleLower = (currentUser.role || '').toLowerCase()
    const isAdmin =
      roleLower === 'admin' ||
      roleLower === 'super admin' ||
      roleLower === 'super_admin'

    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required', data: null }
    }

    // 2. Determine Reporting Period in Asia/Kolkata timezone
    const todayIST = getISTDateString() // YYYY-MM-DD
    const [currentYearStr, currentMonthStr] = todayIST.split('-')
    const currentYear = parseInt(currentYearStr, 10)
    const currentMonth = parseInt(currentMonthStr, 10)

    const targetYear = options?.year ?? currentYear
    const targetMonth = options?.month ?? currentMonth // 1-12

    const padMonth = String(targetMonth).padStart(2, '0')
    const startDate = `${targetYear}-${padMonth}-01`
    const lastDayNum = new Date(targetYear, targetMonth, 0).getDate()
    const endDate = `${targetYear}-${padMonth}-${String(lastDayNum).padStart(2, '0')}`

    const monthDate = new Date(targetYear, targetMonth - 1, 1)
    const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const period: PeriodInfo = {
      year: targetYear,
      month: targetMonth,
      monthName,
      startDate,
      endDate,
    }

    // 3. Query Approved EOD Reports for the period
    const supabaseAdmin = await createAdminClient()

    const { data: eods, error: eodError } = await supabaseAdmin
      .from('eod_reports')
      .select(`
        employee_id,
        office_hours,
        status,
        report_date,
        profile:profiles!eod_reports_employee_id_fkey(
          id,
          first_name,
          last_name,
          employee_id
        )
      `)
      .eq('status', 'Approved')
      .gte('report_date', startDate)
      .lte('report_date', endDate)

    if (eodError) {
      console.error('Failed to fetch approved EOD reports for top contributor:', eodError)
      return { success: false, error: `Failed to retrieve contributor data: ${eodError.message} (${eodError.details || eodError.hint || ''})`, data: null }
    }

    if (!eods || eods.length === 0) {
      return {
        success: true,
        data: {
          topContributor: null,
          leaderboard: [],
          period,
        },
      }
    }

    // 4. Sum approved office_hours per employee
    interface TempEmployee {
      employeeId: string
      employeeCode: string | null
      name: string
      totalHours: number
      isActive: boolean
    }

    const empMap = new Map<string, TempEmployee>()

    for (const eod of eods) {
      const empId = eod.employee_id
      if (!empId) continue

      const prof = (eod as any).profile
      const hours = canonicalOfficeHoursToMinutes(Number(eod.office_hours) || 0) / 60
      if (hours <= 0) continue

      if (!empMap.has(empId)) {
        const firstName = prof?.first_name?.trim() || ''
        const lastName = prof?.last_name?.trim() || ''
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Employee'
        const employeeCode = prof?.employee_id || null

        empMap.set(empId, {
          employeeId: empId,
          employeeCode,
          name: fullName,
          totalHours: 0,
          isActive: true,
        })
      }

      const existing = empMap.get(empId)!
      existing.totalHours += hours
    }

    if (empMap.size === 0) {
      return {
        success: true,
        data: {
          topContributor: null,
          leaderboard: [],
          period,
        },
      }
    }

    // 5. Resolve Employee Avatars and verify active employment status from employee_onboarding
    const employeeCodes = Array.from(
      new Set(
        Array.from(empMap.values())
          .map((e) => e.employeeCode)
          .filter((code): code is string => Boolean(code))
      )
    )

    const photoMap = new Map<string, string>()
    const inactiveEmployeeCodes = new Set<string>()

    if (employeeCodes.length > 0) {
      const { data: onboardingRows, error: onbError } = await supabaseAdmin
        .from('employee_onboarding')
        .select('employee_id_number, profile_photo, employment_status')
        .in('employee_id_number', employeeCodes)

      if (!onbError && onboardingRows) {
        onboardingRows.forEach((row: any) => {
          const status = (row.employment_status || '').toLowerCase()
          if (status === 'inactive' || status === 'terminated' || (status && status !== 'active')) {
            inactiveEmployeeCodes.add(row.employee_id_number)
            return
          }

          const url = getProfilePhotoUrl(row.profile_photo)
          if (url && row.employee_id_number) {
            photoMap.set(row.employee_id_number, url)
          }
        })
      }
    }

    // Exclude employees with inactive onboarding status from active rankings
    const activeEmployees = Array.from(empMap.values()).filter(
      (emp) => !emp.employeeCode || !inactiveEmployeeCodes.has(emp.employeeCode)
    )

    if (activeEmployees.length === 0) {
      return {
        success: true,
        data: {
          topContributor: null,
          leaderboard: [],
          period,
        },
      }
    }

    // 6. Sort employees: Primary sort by totalHours descending, secondary sort by name ascending
    const sortedEmployees = activeEmployees.sort((a, b) => {
      if (Math.abs(b.totalHours - a.totalHours) > 0.0001) {
        return b.totalHours - a.totalHours
      }
      return a.name.localeCompare(b.name)
    })

    // 7. Format Top 3 Leaderboard and Top Contributor
    const leaderboard: LeaderboardEntry[] = sortedEmployees.slice(0, 3).map((emp, index) => {
      const { formatted, detailed } = formatHours(emp.totalHours)
      const avatarUrl = emp.employeeCode ? photoMap.get(emp.employeeCode) || null : null

      return {
        rank: index + 1,
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode,
        name: emp.name,
        avatarUrl,
        totalHours: emp.totalHours,
        formattedHours: formatted,
        detailedHours: detailed,
      }
    })

    const topContributor = leaderboard.length > 0 ? leaderboard[0] : null

    return {
      success: true,
      data: {
        topContributor,
        leaderboard,
        period,
      },
    }
  } catch (error) {
    console.error('getTopContributorData error:', error)
    return { success: false, error: 'Internal server error while fetching contributor data', data: null }
  }
}
