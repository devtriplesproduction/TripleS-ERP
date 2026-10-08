import { getEmployees } from '@/lib/actions/onboarding'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { AddEmployeeModal } from '@/components/hr/onboarding/add-employee-modal'
import { OnboardingTable } from '@/components/hr/onboarding/onboarding-table'
import { 
  Plus, Users, Clock, CheckCircle2, XCircle, 
  Search, Filter, Calendar as CalendarIcon,
  Eye, Edit2, MoreHorizontal, ChevronLeft, ChevronRight,
  ShieldCheck, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function OnboardingListPage() {
  await requireRole('/hr/onboarding')
  const employees = await getEmployees()
  
  const supabase = await createClient()
  const { count: adminsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['Admin', 'HR'])

  const total = employees.length
  const activeAccounts = employees.filter(e => e.employment_status === 'Active' || e.employment_status === 'Probation').length
  const admins = adminsCount || 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <PageHeader 
        title="Employees"
        subtitle="Manage and track new employee onboarding process."
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Staff</p>
            <p className="text-2xl font-bold text-foreground leading-none">{total}</p>
          </div>
        </div>

        {/* ACTIVE ACCOUNTS */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Accounts</p>
            <p className="text-2xl font-bold text-foreground leading-none">{activeAccounts}</p>
          </div>
        </div>

        {/* ADMINS */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Admins</p>
            <p className="text-2xl font-bold text-foreground leading-none">{admins}</p>
          </div>
        </div>

      </div>

        <OnboardingTable employees={employees} />
    </div>
  )
}
