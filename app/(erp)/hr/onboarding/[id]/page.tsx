import { getEmployeeById } from '@/lib/actions/onboarding'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Briefcase, Calendar, Building2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ChecklistItem } from '@/components/hr/checklist-item'
import { DeleteEmployeeButton } from '@/components/hr/delete-employee-button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { employee, tasks } = await getEmployeeById(id)

  if (!employee) {
    notFound()
  }

  const completedTasksCount = tasks.filter(t => t.is_completed).length
  const totalTasksCount = tasks.length
  const progressPercentage = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header Area */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/hr/onboarding" className="text-muted-foreground hover:text-foreground flex items-center text-sm font-medium mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Onboarding List
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {employee.first_name} {employee.last_name}
            </h1>
            <Badge 
              variant="outline" 
              className={cn(
                "px-2.5 py-0.5 rounded-md text-xs font-medium border-border",
                employee.status === 'Completed' ? 'bg-foreground text-background border-foreground' : 
                employee.status === 'In Progress' ? 'bg-input text-foreground' : 
                'bg-transparent text-muted-foreground'
              )}
            >
              {employee.status}
            </Badge>
          </div>
        </div>
        <DeleteEmployeeButton employeeId={employee.id} employeeName={`${employee.first_name} ${employee.last_name}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card border-border rounded-xl shadow-none overflow-hidden">
            <CardHeader className="pb-4 bg-input border-b border-border">
              <CardTitle className="text-base font-semibold">Employee Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              
              <div className="flex items-center text-sm gap-4">
                <div className="p-2 rounded-lg bg-input shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">EMP ID</p>
                  <p className="font-medium text-foreground">{employee.employee_id_number || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center text-sm gap-4">
                <div className="p-2 rounded-lg bg-input shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Work Email</p>
                  <p className="font-medium text-foreground">{employee.email}</p>
                </div>
              </div>

              {employee.phone && (
                <div className="flex items-center text-sm gap-4">
                  <div className="p-2 rounded-lg bg-input shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Phone</p>
                    <p className="font-medium text-foreground">{employee.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center text-sm gap-4">
                <div className="p-2 rounded-lg bg-input shrink-0">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Role & Type</p>
                  <p className="font-medium text-foreground">{employee.job_title} <span className="text-muted-foreground font-normal">({employee.employment_type})</span></p>
                </div>
              </div>

              <div className="flex items-center text-sm gap-4">
                <div className="p-2 rounded-lg bg-input shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Department</p>
                  <p className="font-medium text-foreground">{employee.department}</p>
                </div>
              </div>

              <div className="flex items-center text-sm gap-4">
                <div className="p-2 rounded-lg bg-input shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Joined</p>
                  <p className="font-medium text-foreground">{new Date(employee.joining_date).toLocaleDateString()}</p>
                </div>
              </div>

              {employee.salary && (
                <div className="flex items-center text-sm gap-4">
                  <div className="p-2 rounded-lg bg-input shrink-0">
                    <span className="h-4 w-4 flex items-center justify-center font-bold text-muted-foreground">₹</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Salary</p>
                    <p className="font-medium text-foreground">{employee.salary}</p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Checklist */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border rounded-xl shadow-none overflow-hidden">
            <CardHeader className="pb-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Onboarding Tasks</CardTitle>
                  <CardDescription className="text-sm mt-1">Track the checklist progress</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-foreground">{progressPercentage}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{completedTasksCount} OF {totalTasksCount} TASKS</div>
                </div>
              </div>
              <div className="mt-6 h-2 w-full bg-input rounded-full overflow-hidden">
                <div 
                  className="h-full bg-foreground transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No onboarding tasks found for this employee.
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map(task => (
                    <ChecklistItem key={task.id} task={task} employeeId={employee.id} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
