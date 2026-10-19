"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User as UserIcon, BarChart3, Clock, Home, CalendarDays, UserX, UserCheck, Briefcase } from "lucide-react"
import { getEmployeeAttendance, getAttendanceEmployeeProfile, DerivedAttendance, AttendanceStatus } from "@/lib/actions/attendance"
import { calculateAttendanceSummary } from "@/lib/utils/attendance-summary"
import { getISTDateString, formatMinutesAsHHMM, formatOfficeHoursAsHHMM } from "@/lib/utils/time"
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
      case 'Holiday Work': return 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20'
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
      case 'Holiday Work': return 'bg-[#8b5cf6]'
      default: return 'bg-transparent'
    }
  }

  const summary = calculateAttendanceSummary(attendance)
  const todayStr = getISTDateString()

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

  // Selected date details
  const selectedDateStr = selectedDate 
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;
  const selectedAtt = attendance.find(a => a.date === selectedDateStr);

  if (loading && !employee) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <PageHeader
        title="Attendance & Leaves"
        subtitle="Track team attendance, leaves, holidays, and working-day status."
        icon={CalendarDays}
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
      <div className="flex flex-col lg:flex-row gap-3">
        
        {/* Left Area - Calendar */}
        <div className="flex-1">
          <div className="bg-card border border-border rounded-[16px] overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="py-2.5 text-center text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((dayNum, i) => {
                if (!dayNum) {
                  return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-border/50 bg-muted/20" />
                }
                
                const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const att = attendance.find(a => a.date === dStr)
                
                const isSelected = selectedDate?.getDate() === dayNum && selectedDate?.getMonth() === currentDate.getMonth() && selectedDate?.getFullYear() === currentDate.getFullYear()
                const isToday = dStr === todayStr
                
                return (
                  <div 
                    key={dStr} 
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum))}
                    className={`min-h-[90px] p-2 sm:p-2.5 border-b border-r border-border relative cursor-pointer transition-colors hover:bg-muted/50 flex flex-col items-center justify-between
                      ${isSelected ? 'bg-muted/60 ring-1 ring-inset ring-foreground/60' : isToday ? 'ring-1 ring-inset ring-foreground/25 bg-muted/20' : 'bg-transparent'}`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className={`text-[13px] font-medium ${isToday ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{dayNum}</span>
                      {isToday && (
                        <span className="text-[9px] uppercase font-semibold tracking-wider px-1 py-0.2 rounded border border-border text-foreground bg-muted/50">
                          Today
                        </span>
                      )}
                    </div>
                    
                    {att && att.status !== 'Weekend' && att.status !== 'Not Marked' && (
                      <div className="mt-auto w-full flex justify-center pb-0.5">
                        <div 
                          title={att.holiday?.name ? `${att.status} (${att.holiday.name})` : att.status}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${getStatusColor(att.status)}`}
                        >
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

        {/* Right Area - Context, Details & Insights */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">
          
          {/* Personnel Context Card */}
          <Card className="bg-card border-border rounded-[16px] p-3 shadow-none">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-md">
                <UserIcon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base">Personnel Context</h3>
            </div>
            
            <div className="space-y-3">
              {employee && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
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
                <div className="grid grid-cols-[1fr_auto] gap-y-2 text-[13px] pt-1">
                  <div className="text-muted-foreground">Department</div>
                  <div className="text-right font-medium">{employee.department}</div>
                  <div className="text-muted-foreground">Designation</div>
                  <div className="text-right font-medium">{employee.designation}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Day Details Card */}
          <Card className="bg-card border-border rounded-[16px] p-3 shadow-none">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-muted text-muted-foreground rounded-md">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-base">Day Details</h3>
              </div>
              {selectedDate && (
                <span className="text-[12px] font-medium text-muted-foreground">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            {selectedAtt ? (
              <div className="space-y-2.5 text-[13px]">
                {/* Primary Status Banner */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-muted-foreground text-xs">Primary Status</span>
                  {selectedAtt.status !== 'Not Marked' ? (
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusColor(selectedAtt.status)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusIconColor(selectedAtt.status)}`} />
                      {selectedAtt.status}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">Not Marked</span>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-y-2 text-xs pt-0.5">
                  <div className="text-muted-foreground">Employee</div>
                  <div className="text-right font-medium text-foreground">
                    {employee ? `${employee.first_name} ${employee.last_name}` : '—'}
                  </div>

                  <div className="text-muted-foreground">EOD Status</div>
                  <div className="text-right font-medium">
                    {selectedAtt.eod ? (
                      <span className={
                        selectedAtt.eod.status === 'Approved' ? 'text-emerald-500 font-semibold' :
                        selectedAtt.eod.status === 'Pending' ? 'text-amber-500 font-semibold' :
                        selectedAtt.eod.status === 'Rejected' ? 'text-red-500 font-semibold' : 'text-foreground'
                      }>
                        {selectedAtt.eod.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not Submitted</span>
                    )}
                  </div>

                  <div className="text-muted-foreground">Worked Hours</div>
                  <div className="text-right font-medium text-foreground">
                    {selectedAtt.workedHours > 0 
                      ? `${formatOfficeHoursAsHHMM(selectedAtt.workedHours)} hrs (${selectedAtt.workedHours}h)`
                      : '0.00 hrs'}
                  </div>

                  {selectedAtt.compOffMinutes > 0 && (
                    <>
                      <div className="text-muted-foreground">Comp-Off Credit</div>
                      <div className="text-right font-semibold text-[#8b5cf6]">
                        +{formatMinutesAsHHMM(selectedAtt.compOffMinutes)} hrs
                      </div>
                    </>
                  )}

                  <div className="text-muted-foreground">Approval Details</div>
                  <div className="text-right font-medium text-foreground">
                    {selectedAtt.eod?.status === 'Approved' ? (
                      <span className="text-emerald-500">Approved</span>
                    ) : selectedAtt.eod?.status === 'Pending' ? (
                      <span className="text-amber-500">Awaiting HR/Admin</span>
                    ) : selectedAtt.eod?.status === 'Rejected' ? (
                      <span className="text-red-500 truncate max-w-[150px] inline-block" title={selectedAtt.eod.rejection_reason || 'Rejected'}>
                        {selectedAtt.eod.rejection_reason ? `Rejected: ${selectedAtt.eod.rejection_reason}` : 'Rejected'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No review required</span>
                    )}
                  </div>

                  <div className="text-muted-foreground">Holiday / Leave Info</div>
                  <div className="text-right font-medium text-foreground">
                    {selectedAtt.holiday ? (
                      <span className="text-[#8b5cf6]">
                        {selectedAtt.holiday.name} {selectedAtt.holiday.name === 'Sunday' ? '(Weekly Off)' : '(Holiday)'}
                      </span>
                    ) : selectedAtt.leave ? (
                      <span className="text-orange-500">
                        {selectedAtt.leave.request_type || 'Leave'}{selectedAtt.leave.is_half_day ? ' (Half Day)' : ''}
                      </span>
                    ) : selectedAtt.wfh ? (
                      <span className="text-blue-500">
                        WFH{selectedAtt.wfh.is_half_day ? ' (Half Day)' : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Regular Working Day</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Click a calendar date to view details.
              </div>
            )}
          </Card>
          
          {/* Monthly Insights Card */}
          <Card className="bg-card border-border rounded-[16px] p-3 shadow-none flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-muted text-muted-foreground rounded-md">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base">Monthly Insights</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-0 border border-border rounded-xl overflow-hidden">
              <div className="p-2 sm:p-2.5 border-b border-r border-border flex flex-col gap-0.5 relative justify-center">
                <span className="text-[12px] text-muted-foreground">Present</span>
                <span className="text-xl font-bold text-emerald-500">{summary.present}</span>
                <CalendarIcon className="w-4 h-4 text-emerald-500/50 absolute right-3 top-3" />
              </div>
              <div className="p-2 sm:p-2.5 border-b border-border flex flex-col gap-0.5 relative justify-center">
                <span className="text-[12px] text-muted-foreground">Holiday Work</span>
                <span className="text-xl font-bold text-[#8b5cf6]">{summary.holidayWork}</span>
                <Briefcase className="w-4 h-4 text-[#8b5cf6]/50 absolute right-3 top-3" />
              </div>
              <div className="p-2 sm:p-2.5 border-b border-r border-border flex flex-col gap-0.5 relative justify-center">
                <span className="text-[12px] text-muted-foreground">WFH</span>
                <span className="text-xl font-bold text-blue-500">{summary.wfh}</span>
                <Home className="w-4 h-4 text-blue-500/50 absolute right-3 top-3" />
              </div>
              <div className="p-2 sm:p-2.5 border-b border-border flex flex-col gap-0.5 relative justify-center">
                <span className="text-[12px] text-muted-foreground">Leave</span>
                <span className="text-xl font-bold text-orange-500">{summary.leave}</span>
                <CalendarDays className="w-4 h-4 text-orange-500/50 absolute right-3 top-3" />
              </div>
              <div className="p-2 sm:p-2.5 border-b border-r border-border flex flex-col gap-0.5 relative justify-center">
                <span className="text-[12px] text-muted-foreground">Half Days</span>
                <span className="text-xl font-bold text-yellow-500">{summary.halfDay}</span>
                <Clock className="w-4 h-4 text-yellow-500/50 absolute right-3 top-3" />
              </div>
              <div className="p-2 sm:p-2.5 border-b border-border flex flex-col gap-0.5 relative justify-center">
                <span className="text-[12px] text-muted-foreground">Absent</span>
                <span className="text-xl font-bold text-red-500">{summary.absent}</span>
                <UserX className="w-4 h-4 text-red-500/50 absolute right-3 top-3" />
              </div>
              <div className="p-2 sm:p-2.5 col-span-2 flex items-center justify-between relative bg-muted/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] text-muted-foreground">Pending</span>
                  <span className="text-xl font-bold text-amber-500">{summary.pending}</span>
                </div>
                <Clock className="w-4 h-4 text-amber-500/50" />
              </div>
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  )
}
