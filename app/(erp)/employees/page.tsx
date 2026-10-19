import { getEmployees } from '@/lib/actions/onboarding'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/PageHeader'
import { AddEmployeeModal } from '@/components/hr/onboarding/add-employee-modal'
import { OnboardingTable } from '@/components/hr/onboarding/onboarding-table'
import { Users, ShieldCheck, Clock } from 'lucide-react'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Employees Directory | TripleS ERP',
  description: 'Manage staff records, onboarding lifecycle, and employee profiles',
}

export default async function EmployeesPage() {
  await requireRole('/employees')
  const employees = await getEmployees()

  const supabase = await createClient()
  const { count: adminsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['Admin', 'HR'])

  const total = employees.length
  const activeAccounts = employees.filter(
    (e) => e.employment_status === 'Active' || e.employment_status === 'Probation'
  ).length
  const admins = adminsCount || 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Employees"
        subtitle="Manage employee records, organizational roles, and onboarding workflows."
        icon={Users}
        actions={<AddEmployeeModal />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TOTAL STAFF */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Staff
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{total}</h3>
          </div>
        </div>

        {/* ACTIVE WORKFORCE */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active / In Service
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{activeAccounts}</h3>
          </div>
        </div>

        {/* SYSTEM ADMINISTRATORS */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Management & HR
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{admins}</h3>
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <OnboardingTable employees={employees} />
    </div>
  )
}
