import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { changeEmployeePasswordAction } from '@/lib/actions/password'

export async function POST(req: NextRequest) {
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
        { success: false, error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || !body.employeeId || !body.newPassword || !body.confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: employeeId, newPassword, confirmPassword',
        },
        { status: 400 }
      )
    }

    const result = await changeEmployeePasswordAction({
      employeeId: body.employeeId,
      newPassword: body.newPassword,
      confirmPassword: body.confirmPassword,
    })

    if (!result.success) {
      const status = result.error?.includes('rate-limit')
        ? 429
        : result.error?.includes('Unauthorized') || result.error?.includes('Forbidden')
        ? 403
        : 400
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    console.error('API /api/admin/change-password error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
