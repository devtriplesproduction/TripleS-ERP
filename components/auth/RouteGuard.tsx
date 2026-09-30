/**
 * RouteGuard - Server component that enforces role-based access.
 * Wrap protected page content in this component.
 * Redirects to /unauthorized if the user's role doesn't have access to the given pathname.
 */
import { requireRole } from '@/lib/auth'
import { type AppRole } from '@/config/rbac'

interface RouteGuardProps {
  pathname: string
  children: React.ReactNode
}

export async function RouteGuard({ pathname, children }: RouteGuardProps) {
  // This will redirect to /login if not authenticated,
  // or /unauthorized if the user doesn't have permission
  await requireRole(pathname)
  
  return <>{children}</>
}
