import { getEmployees } from '@/lib/actions/onboarding'
import { createClient } from '@/lib/supabase/client'
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
import { AddEmployeeModal } from '@/components/hr/onboarding/add-employee-modal'
import { OnboardingTable } from '@/components/hr/onboarding/onboarding-table'
import { 
  Plus, Users, Clock, CheckCircle2, XCircle, 
  Search, Filter, Calendar as CalendarIcon,
  Eye, Edit2, MoreHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function OnboardingListPage() {
  const employees = await getEmployees()
  const supabase = createClient()
  
  const total = employees.length
  const inProgress = employees.filter(e => e.status === 'In Progress').length
  const completed = employees.filter(e => e.status === 'Completed').length
  const notStarted = employees.filter(e => e.status === 'Not Started').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track new employee onboarding process.</p>
        </div>
        <AddEmployeeModal />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-sm font-medium text-foreground">Total Onboardings</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{inProgress}</p>
            <p className="text-sm font-medium text-foreground">In Progress</p>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
            <div className="bg-foreground text-background rounded-full p-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{completed}</p>
            <p className="text-sm font-medium text-foreground">Completed</p>
            <p className="text-xs text-muted-foreground">Successfully onboarded</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
             <div className="bg-foreground text-background rounded-full p-0.5">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{notStarted}</p>
            <p className="text-sm font-medium text-foreground">Not Started</p>
            <p className="text-xs text-muted-foreground">Yet to begin</p>
          </div>
        </div>

      </div>

        <OnboardingTable employees={employees} />
    </div>
  )
}
