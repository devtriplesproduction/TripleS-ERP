import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserChangePasswordButton } from '@/components/settings/UserChangePasswordModal'
import { UserProfileIdCardButton } from '@/components/id-card/UserProfileIdCardButton'
import { Settings, User, Shield, Briefcase, Mail, Building, Key, CheckCircle2, Download, ExternalLink, Clock, CreditCard } from 'lucide-react'

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
        icon={Settings}
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

            {/* Employee ID Badge Quick Action - User side only (hidden on Admin side) */}
            {user.role !== 'Admin' && user.role !== 'HR' && (
              <div className="p-4 rounded-xl border border-border/60 bg-gradient-to-r from-muted/30 via-background to-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" /> Official Staff Identity Badge
                  </p>
                  <p className="text-xs text-muted-foreground">
                    View, flip, and print your standardized corporate identity card with verification QR.
                  </p>
                </div>
                <UserProfileIdCardButton user={user} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences & Security Sidebar */}
        <div className="space-y-6">
          {/* Time Tracker Software Download */}
          <Card className="shadow-sm border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Time Tracker
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                  Desktop App
                </Badge>
              </div>
              <CardDescription>
                Download the TripleS desktop application for employee work and session tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href="https://triples-time-tracker.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Download Time Tracker
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Windows & Desktop Releases
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
              </a>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Employees and administrators can run the desktop tracker to record project hours and activity metrics automatically.
              </p>
            </CardContent>
          </Card>

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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  Security & Password
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                  Account
                </Badge>
              </div>
              <CardDescription>
                Active session authentication and login credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Session is securely authenticated</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Role-based access permissions are enforced on every request using strict server-side RBAC validation.
              </p>
              <div className="pt-2 border-t border-border/50 flex justify-center">
                <UserChangePasswordButton
                  userEmail={user.email}
                  userName={user.employee_name}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
