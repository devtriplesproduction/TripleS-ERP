import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { User, Shield, Briefcase, Mail, Building, Key, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Settings & Profile | TripleS ERP',
  description: 'Manage your profile details and application preferences',
}

export default async function SettingsPage() {
  const user = await requireRole('/settings')

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <PageHeader
        title="Settings & Profile"
        subtitle="Manage your profile information, system preferences, and security settings."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Overview */}
        <Card className="md:col-span-2 shadow-sm border border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  User Profile
                </CardTitle>
                <CardDescription>
                  Your corporate identity and organization assignments.
                </CardDescription>
              </div>
              <Badge variant="outline" className="px-3 py-1 font-semibold text-xs uppercase tracking-wider">
                {user.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Full Name
                </span>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {user.employee_name || 'Not Specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Corporate Email
                </span>
                <p className="font-semibold text-foreground text-sm sm:text-base break-all">
                  {user.email}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Employee ID
                </span>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {user.employee_id || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" /> Department
                </span>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {user.department || 'General'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Designation
                </span>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {user.designation || 'Staff Member'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Head of Department (HOD)
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={user.is_hod ? 'default' : 'secondary'} className="text-xs">
                    {user.is_hod ? 'Yes (HOD Access Active)' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences & Security Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-sm border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>
                Customize how TripleS ERP looks on your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                <div>
                  <p className="text-sm font-medium">Theme Mode</p>
                  <p className="text-xs text-muted-foreground">Toggle between Light and Dark interface</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Security & Session
              </CardTitle>
              <CardDescription>
                Active session authentication status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Session is securely authenticated</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Role-based access permissions are enforced on every request using strict server-side RBAC validation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
