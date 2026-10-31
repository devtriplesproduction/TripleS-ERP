import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTimeTrackingDashboardData,
  getMonthlyTrackingSummary,
  getScreenshotsForEmployeeAndDate
} from '@/lib/actions/time-tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }

    // STRICT ADMIN-ONLY ENFORCEMENT (HR and regular employees denied)
    if (user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required for time tracking analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'daily'
    const department = searchParams.get('department') || 'All'
    const date = searchParams.get('date') || undefined
    const month = searchParams.get('month') || undefined
    const status = searchParams.get('status') || 'All'
    const employeeId = searchParams.get('employeeId') || 'All'
    const sessionId = searchParams.get('sessionId') || undefined

    if (mode === 'screenshots') {
      const screenshotsResult = await getScreenshotsForEmployeeAndDate({
        employeeId,
        date,
        sessionId
      })

      if (!screenshotsResult.success) {
        return NextResponse.json(
          { success: false, error: screenshotsResult.error || 'Failed to retrieve screenshots' },
          { status: 500 }
        )
      }

      return NextResponse.json(screenshotsResult)
    }

    if (mode === 'monthly') {
      const summaryResult = await getMonthlyTrackingSummary({
        month,
        department
      })

      if (!summaryResult.success) {
        return NextResponse.json(
          { success: false, error: summaryResult.error || 'Failed to retrieve monthly tracking summary' },
          { status: 500 }
        )
      }

      return NextResponse.json(summaryResult)
    }

    // Default daily mode
    const dailyResult = await getTimeTrackingDashboardData({
      date,
      department,
      status,
      employeeId
    })

    if (!dailyResult.success) {
      return NextResponse.json(
        { success: false, error: dailyResult.error || 'Failed to retrieve daily tracking reports' },
        { status: 500 }
      )
    }

    return NextResponse.json(dailyResult)
  } catch (err: any) {
    console.error('[API /api/time-tracking/admin/reports] Unhandled exception:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
