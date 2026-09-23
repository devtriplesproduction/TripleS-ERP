import { getEmployees } from '@/lib/actions/onboarding'
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
import { AddEmployeeModal } from '@/components/hr/add-employee-modal'
import { 
  Plus, Users, Clock, CheckCircle2, XCircle, 
  Search, Filter, Calendar as CalendarIcon,
  Eye, Edit2, MoreHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function OnboardingListPage() {
  const employees = await getEmployees()
  
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

      {/* Filters and Table */}
      <div className="space-y-4">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2">
            <Button variant="outline" className="bg-foreground text-background border-foreground h-9">
              All ({total})
            </Button>
            <Button variant="outline" className="bg-transparent text-muted-foreground border-border hover:text-foreground h-9">
              In Progress ({inProgress})
            </Button>
            <Button variant="outline" className="bg-transparent text-muted-foreground border-border hover:text-foreground h-9">
              Completed ({completed})
            </Button>
            <Button variant="outline" className="bg-transparent text-muted-foreground border-border hover:text-foreground h-9">
              Not Started ({notStarted})
            </Button>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, department..." 
                className="w-full bg-input border-border pl-9 h-9 text-sm"
              />
            </div>
            <Button variant="outline" className="bg-transparent border-border h-9 shrink-0 text-muted-foreground">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" className="bg-transparent border-border h-9 shrink-0 text-muted-foreground">
              <CalendarIcon className="mr-2 h-4 w-4" /> Select Date Range
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-transparent hover:bg-transparent">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-12 text-center">
                  <input type="checkbox" className="rounded border-border bg-input" />
                </TableHead>
                <TableHead className="w-12 text-center text-muted-foreground font-medium">#</TableHead>
                <TableHead className="text-muted-foreground font-medium">Employee Name</TableHead>
                <TableHead className="text-muted-foreground font-medium">Department</TableHead>
                <TableHead className="text-muted-foreground font-medium">Joining Date ↕</TableHead>
                <TableHead className="text-muted-foreground font-medium">Status ↕</TableHead>
                <TableHead className="text-muted-foreground font-medium">Progress</TableHead>
                <TableHead className="text-right text-muted-foreground font-medium pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    No onboarding records found.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp, index) => (
                  <TableRow key={emp.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-border bg-input" />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-input text-foreground flex items-center justify-center text-xs font-bold border border-border">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{emp.department || 'Not Set'}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      {new Date(emp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "px-2.5 py-0.5 rounded-md text-xs font-medium border-border",
                          emp.status === 'Completed' ? "bg-foreground text-background border-foreground" : 
                          emp.status === 'In Progress' ? "bg-input text-foreground" : 
                          "bg-transparent text-muted-foreground"
                        )}
                      >
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-input rounded-full overflow-hidden w-24">
                          <div 
                            className="h-full bg-foreground" 
                            style={{ width: emp.status === 'Completed' ? '100%' : emp.status === 'In Progress' ? '50%' : '0%' }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {emp.status === 'Completed' ? '100%' : emp.status === 'In Progress' ? '50%' : '0%'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/hr/onboarding/${emp.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-input hover:bg-muted text-muted-foreground hover:text-foreground rounded-md border border-border">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-input hover:bg-muted text-muted-foreground hover:text-foreground rounded-md border border-border">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-input hover:bg-muted text-muted-foreground hover:text-foreground rounded-md border border-border">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
            <p className="text-sm text-muted-foreground">
              Showing 1 to {employees.length} of {employees.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-foreground text-background border-foreground">
                1
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted">
                2
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted">
                3
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
