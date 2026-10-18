import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute } from '@/config/rbac'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Allow static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Deactivated account → revoke ERP access and redirect
  if (user.app_metadata?.deactivated || user.banned_until) {
    return NextResponse.redirect(new URL('/access-disabled', request.url))
  }

  // For root path, redirect authenticated users directly to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Canonical Route Migration Redirections
  const legacyToCanonicalMap: Record<string, string> = {
    '/hr/onboarding': '/employees',
    '/hr/onboarding/add': '/employees/add',
    '/hr/leave': '/leave',
    '/super-admin/leave': '/leave',
    '/hr/employee-leave': '/leave',
    '/hr/holidays': '/holidays',
    '/admin-holiday': '/holidays',
    '/employee-holiday': '/holidays',
    '/hr/payroll': '/payroll',
    '/admin-payroll': '/payroll',
    '/hr/attendance': '/attendance',
    '/super-admin/attendance': '/attendance',
    '/admin-eod': '/eod',
    '/employee-eod': '/eod',
  }

  let targetCanonical: string | null = legacyToCanonicalMap[pathname] || null
  if (!targetCanonical) {
    if (pathname.startsWith('/hr/onboarding/')) {
      targetCanonical = pathname.replace('/hr/onboarding/', '/employees/')
    } else if (pathname.startsWith('/hr/attendance/')) {
      targetCanonical = pathname.replace('/hr/attendance/', '/attendance/')
    } else if (pathname.startsWith('/super-admin/attendance/')) {
      targetCanonical = pathname.replace('/super-admin/attendance/', '/attendance/')
    }
  }

  if (targetCanonical) {
    const targetUrl = new URL(targetCanonical, request.url)
    targetUrl.search = request.nextUrl.search
    return NextResponse.redirect(targetUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (logo.png etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
