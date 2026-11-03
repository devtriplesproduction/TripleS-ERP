import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTimeTrackingDashboardData,
  getMonthlyTrackingSummary,
  getScreenshotsForEmployeeAndDate,
  deleteScreenshotsAction
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

    // Role enforcement: Admin or authorized HR
    if (user.role !== 'Admin' && user.role !== 'HR') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or authorized HR access required for time tracking analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'daily'
    const department = searchParams.get('department') || 'All'
    const date = searchParams.get('date') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const startTime = searchParams.get('startTime') || undefined
    const endTime = searchParams.get('endTime') || undefined
    const month = searchParams.get('month') || undefined
    const status = searchParams.get('status') || 'All'
    const employeeId = searchParams.get('employeeId') || 'All'
    const sessionId = searchParams.get('sessionId') || undefined

    if (mode === 'screenshots') {
      const screenshotsResult = await getScreenshotsForEmployeeAndDate({
        employeeId,
        date,
        startDate,
        endDate,
        startTime,
        endTime,
        sessionId
      })

      if (!screenshotsResult.success) {
        const isAuthErr = screenshotsResult.error?.toLowerCase().includes('unauthorized') ||
                          screenshotsResult.error?.toLowerCase().includes('forbidden') ||
                          screenshotsResult.error?.toLowerCase().includes('permissions')
        return NextResponse.json(
          { success: false, error: screenshotsResult.error || 'Failed to retrieve screenshots' },
          { status: isAuthErr ? 403 : 500 }
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
        const isAuthErr = summaryResult.error?.toLowerCase().includes('unauthorized') ||
                          summaryResult.error?.toLowerCase().includes('forbidden') ||
                          summaryResult.error?.toLowerCase().includes('permissions')
        return NextResponse.json(
          { success: false, error: summaryResult.error || 'Failed to retrieve monthly tracking summary' },
          { status: isAuthErr ? 403 : 500 }
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
      const isAuthErr = dailyResult.error?.toLowerCase().includes('unauthorized') ||
                        dailyResult.error?.toLowerCase().includes('forbidden') ||
                        dailyResult.error?.toLowerCase().includes('permissions')
      return NextResponse.json(
        { success: false, error: dailyResult.error || 'Failed to retrieve daily tracking reports' },
        { status: isAuthErr ? 403 : 500 }
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }

    if (user.role !== 'Admin' && user.role !== 'HR') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or authorized HR access required to delete screenshots' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { screenshotIds } = body

    if (!screenshotIds || !Array.isArray(screenshotIds) || screenshotIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty screenshotIds array' },
        { status: 400 }
      )
    }

    const deleteResult = await deleteScreenshotsAction(screenshotIds)
    return NextResponse.json(deleteResult, { status: deleteResult.success ? 200 : 400 })
  } catch (err: any) {
    console.error('[API DELETE /api/time-tracking/admin/reports] Exception:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
