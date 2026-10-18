import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export const metadata = {
  title: 'Page Not Found | TripleS ERP',
}

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
          <FileQuestion className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Error 404
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Page Not Found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The route or resource you are trying to access does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: 'default', className: 'gap-2' })}
          >
            <Home className="h-4 w-4" />
            Return to Dashboard
          </Link>

          <Link
            href="/login"
            className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Login
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          TripleS ERP System &bull; Role-Based Access Control
        </p>
      </div>
    </div>
  )
}
