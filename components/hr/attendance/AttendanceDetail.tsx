"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User as UserIcon, BarChart3, Clock, Home, CalendarDays, UserX, UserCheck } from "lucide-react"
import { getEmployeeAttendance, getAttendanceEmployeeProfile, DerivedAttendance, AttendanceStatus } from "@/lib/actions/attendance"
import { calculateAttendanceSummary } from "@/lib/utils/attendance-summary"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/PageHeader"

export function AttendanceDetail({ employeeId, basePath = '/hr/attendance' }: { employeeId: string, basePath?: string }) {
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<DerivedAttendance[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  
  const router = useRouter()

  const isHRAdmin = basePath.includes('/hr') || basePath.includes('/super-admin')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const emp = await getAttendanceEmployeeProfile(employeeId)
      
      if (emp) setEmployee(emp)
      
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const data = await getEmployeeAttendance(employeeId, month, year)
      setAttendance(data)
      setLoading(false)
    }
    loadData()
  }, [currentDate, employeeId])

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Present': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'WFH': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'Leave': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'Half Day + Present': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'Half Day + WFH': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'Half Day': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'Absent': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'Pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'Holiday': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      default: return 'bg-transparent text-transparent border-transparent'
    }
  }
  
  const getStatusIconColor = (status: string) => {
    switch(status) {
      case 'Present': return 'bg-emerald-500'
      case 'WFH': return 'bg-blue-500'
      case 'Leave': return 'bg-orange-500'
      case 'Half Day + Present': return 'bg-yellow-500'
      case 'Half Day + WFH': return 'bg-yellow-500'
      case 'Half Day': return 'bg-yellow-500'
      case 'Absent': return 'bg-red-500'
      case 'Pending': return 'bg-amber-500'
      case 'Holiday': return 'bg-slate-400'
      default: return 'bg-transparent'
    }
  }

  const summary = calculateAttendanceSummary(attendance)

  // Calendar generation logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  
  const calendarDays = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }
  
  const totalCells = Math.ceil(calendarDays.length / 7) * 7
  while (calendarDays.length < totalCells) {
    calendarDays.push(null)
  }

  if (loading && !employee) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      {/* Header */}
      <PageHeader
        title="Attendance & Leaves"
        subtitle="Track team attendance, leaves, holidays, and working-day status."
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-card border border-border rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => {
                const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d);
              }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-[140px] flex items-center justify-center text-sm font-medium">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => {
                const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d);
              }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

          </div>
        }
      />

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Area - Calendar */}
        <div className="flex-1">
          <div className="bg-card border border-border rounded-[16px] overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="py-4 text-center text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((dayNum, i) => {
                if (!dayNum) {
                  return <div key={`empty-${i}`} className="min-h-[120px] border-b border-r border-border/50 bg-muted/20" />
                }
                
                const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const att = attendance.find(a => a.date === dStr)
                
                const isSelected = selectedDate?.getDate() === dayNum && selectedDate?.getMonth() === currentDate.getMonth() && selectedDate?.getFullYear() === currentDate.getFullYear()
                
                return (
                  <div 
                    key={dStr} 
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum))}
                    className={`min-h-[120px] p-3 border-b border-r border-border relative cursor-pointer transition-colors hover:bg-muted/50 flex flex-col items-center justify-between
                      ${isSelected ? 'bg-muted/50 ring-1 ring-inset ring-primary/50' : 'bg-transparent'}`}
                  >
                    <span className="absolute top-3 left-3 text-[14px] font-medium text-muted-foreground">{dayNum}</span>
                    
                    {att && att.status !== 'Weekend' && att.status !== 'Not Marked' && (
                      <div className="mt-auto w-full flex justify-center">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-opacity-10 text-[11px] font-medium ${getStatusColor(att.status)}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusIconColor(att.status)}`} />
                          {att.status.replace('Half Day + ', '')}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Area - Context & Insights */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          
          {/* Personnel Context Card */}
          <Card className="bg-card border-border rounded-[16px] p-5 shadow-none">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-md">
                <UserIcon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base">Personnel Context</h3>
            </div>
            
            <div className="space-y-5">

              
              {employee && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={employee.profile_photo || ''} />
                    <AvatarFallback className="bg-muted text-muted-foreground">{employee.first_name?.[0]}{employee.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{employee.first_name} {employee.last_name}</p>
                    <p className="text-[12px] text-muted-foreground">{employee.employee_id}</p>
                  </div>
                </div>
              )}
              
              {employee && (
                <div className="grid grid-cols-[1fr_auto] gap-y-2.5 text-[13px] pt-1">
                  <div className="text-muted-foreground">Department</div>
                  <div className="text-right font-medium">{employee.department}</div>
                  <div className="text-muted-foreground">Designation</div>
                  <div className="text-right font-medium">{employee.designation}</div>

                </div>
              )}
              

            </div>
          </Card>
          
          {/* Monthly Insights Card */}
          <Card className="bg-card border-border rounded-[16px] p-5 shadow-none">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 bg-muted text-muted-foreground rounded-md">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base">Monthly Insights</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-0 border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-r border-border flex flex-col gap-1 relative">
                <span className="text-[12px] text-muted-foreground">Present</span>
                <span className="text-xl font-bold text-emerald-500">{summary.present}</span>
                <CalendarIcon className="w-4 h-4 text-emerald-500/50 absolute right-4 top-4" />
              </div>
              <div className="p-4 border-b border-border flex flex-col gap-1 relative">
                <span className="text-[12px] text-muted-foreground">WFH</span>
                <span className="text-xl font-bold text-blue-500">{summary.wfh}</span>
                <Home className="w-4 h-4 text-blue-500/50 absolute right-4 top-4" />
              </div>
              <div className="p-4 border-b border-r border-border flex flex-col gap-1 relative">
                <span className="text-[12px] text-muted-foreground">Leave</span>
                <span className="text-xl font-bold text-orange-500">{summary.leave}</span>
                <CalendarDays className="w-4 h-4 text-orange-500/50 absolute right-4 top-4" />
              </div>
              <div className="p-4 border-b border-border flex flex-col gap-1 relative">
                <span className="text-[12px] text-muted-foreground">Half Days</span>
                <span className="text-xl font-bold text-yellow-500">{summary.halfDay}</span>
                <Clock className="w-4 h-4 text-yellow-500/50 absolute right-4 top-4" />
              </div>
              <div className="p-4 border-r border-border flex flex-col gap-1 relative">
                <span className="text-[12px] text-muted-foreground">Absent</span>
                <span className="text-xl font-bold text-red-500">{summary.absent}</span>
                <UserX className="w-4 h-4 text-red-500/50 absolute right-4 top-4" />
              </div>
              <div className="p-4 flex flex-col gap-1 relative">
                <span className="text-[12px] text-muted-foreground">Pending</span>
                <span className="text-xl font-bold text-amber-500">{summary.pending}</span>
                <Clock className="w-4 h-4 text-amber-500/50 absolute right-4 top-4" />
              </div>
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  )
}
