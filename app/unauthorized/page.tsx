import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
          <ShieldOff className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-[28px] font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-sm mb-8">
          You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-6 bg-foreground text-background font-medium rounded-lg hover:bg-foreground/90 transition-colors text-sm"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
