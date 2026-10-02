"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Info } from "lucide-react"
import { getEmployeeAttendance, getAttendanceEmployeeProfile, DerivedAttendance, AttendanceStatus } from "@/lib/actions/attendance"
import { calculateAttendanceSummary } from "@/lib/utils/attendance-summary"
import { formatWorkedTime } from "@/lib/utils/time"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function AttendanceDetail({ employeeId, basePath = '/hr/attendance' }: { employeeId: string, basePath?: string }) {
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<DerivedAttendance[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  
  const router = useRouter()

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
      case 'Half Day + Present': return 'bg-teal-500/10 text-teal-500 border-teal-500/20'
      case 'Half Day + WFH': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
      case 'Absent': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'Pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'Holiday': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'Weekend': return 'bg-muted text-muted-foreground border-border'
      default: return 'bg-transparent text-muted-foreground border-border'
    }
  }
  
  const getStatusIconColor = (status: string) => {
    switch(status) {
      case 'Present': return 'bg-emerald-500'
      case 'WFH': return 'bg-blue-500'
      case 'Leave': return 'bg-orange-500'
      case 'Half Day + Present': return 'bg-teal-500'
      case 'Half Day + WFH': return 'bg-cyan-500'
      case 'Absent': return 'bg-red-500'
      case 'Pending': return 'bg-amber-500'
      case 'Holiday': return 'bg-purple-500'
      case 'Weekend': return 'bg-slate-400'
      default: return 'bg-transparent'
    }
  }

  const selectedAttendance = selectedDate ? attendance.find(a => {
    const sd = selectedDate;
    const dateStr = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
    return a.date === dateStr;
  }) : null

  const summary = calculateAttendanceSummary(attendance)

  if (loading && !employee) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push(basePath)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {employee && (
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-12 h-12">
              <AvatarImage src={employee.profile_photo || ''} />
              <AvatarFallback>{employee.first_name?.[0]}{employee.last_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{employee.first_name} {employee.last_name}</h1>
              <p className="text-sm text-muted-foreground">{employee.employee_id} • {employee.department} • {employee.designation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="p-4 flex flex-col justify-center items-center bg-emerald-500/5 border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-500">{summary.present}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Present</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-blue-500/5 border-blue-500/20">
          <div className="text-2xl font-bold text-blue-500">{summary.wfh}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">WFH</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-orange-500/5 border-orange-500/20">
          <div className="text-2xl font-bold text-orange-500">{summary.leave}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Leave</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-teal-500/5 border-teal-500/20">
          <div className="text-2xl font-bold text-teal-500">{summary.halfDay}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Half Days</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-red-500/5 border-red-500/20">
          <div className="text-2xl font-bold text-red-500">{summary.absent}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Absent</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-amber-500/5 border-amber-500/20">
          <div className="text-2xl font-bold text-amber-500">{summary.pending}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Pending</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-primary/5 border-primary/20">
          <div className="text-2xl font-bold text-foreground">{formatWorkedTime(Math.round(summary.workedHours * 60))}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Total Hours</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-indigo-500/5 border-indigo-500/20">
          <div className="text-2xl font-bold text-indigo-500">{formatWorkedTime(Math.round(summary.extraHours * 60))}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium">Extra Hours</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-6 bg-card border-border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
              {employee ? `${employee.first_name} ${employee.last_name} — Attendance` : 'Attendance Calendar'}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => {
                const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d);
              }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="font-medium min-w-[120px] text-center">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="outline" size="icon" onClick={() => {
                const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d);
              }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="border border-border rounded-xl overflow-hidden p-2 bg-background/50">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentDate}
              onMonthChange={setCurrentDate}
              hideNavigation
              className="w-full flex"
              classNames={{
                months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
                month: "space-y-4 w-full flex flex-col",
              }}
              components={{
                DayButton: ({ day, ...props }) => {
                  // Standard react-day-picker day rendering
                  // Adjusting to show small dot based on attendance status
                  
                  const d = day.date;
                  // normalize to local noon for strict yyyy-mm-dd matching
                  const dStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                  
                  const att = attendance.find(a => a.date === dStr)
                  
                  return (
                    <button {...props} className={`w-full h-full flex flex-col items-center justify-center rounded-lg relative ${props.className}`}>
                      <span>{d.getDate()}</span>
                      {att && (
                        <div className={`w-1.5 h-1.5 rounded-full absolute bottom-2 ${getStatusIconColor(att.status)}`} />
                      )}
                    </button>
                  )
                }
              }}
            />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border flex flex-col h-full">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-muted-foreground" />
            Day Details
          </h2>
          
          {selectedDate && selectedAttendance ? (
            <div className="space-y-6 flex-1">
              <div className="flex flex-col items-center p-6 bg-muted/20 rounded-xl border border-border">
                <h3 className="text-lg font-medium">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <Badge variant="outline" className={`mt-3 px-3 py-1 text-sm ${getStatusColor(selectedAttendance.status)}`}>
                  {selectedAttendance.status}
                </Badge>
              </div>

              {(selectedAttendance.workedHours > 0 || selectedAttendance.extraHours > 0) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Hours Tracked</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background border border-border p-3 rounded-lg flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Worked</div>
                        <div className="font-semibold">{formatWorkedTime(Math.round(selectedAttendance.workedHours * 60))}</div>
                      </div>
                    </div>
                    {selectedAttendance.extraHours > 0 && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg flex items-center gap-3">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        <div>
                          <div className="text-xs text-indigo-500">Extra</div>
                          <div className="font-semibold text-indigo-600 dark:text-indigo-400">{formatWorkedTime(Math.round(selectedAttendance.extraHours * 60))}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedAttendance.eod && (
                <div className="space-y-2 text-sm border-t border-border pt-4 mt-4">
                  <h4 className="font-medium text-foreground">Approved EOD Report</h4>
                  <div className="bg-background border border-border p-3 rounded-lg text-muted-foreground break-words text-xs">
                    {selectedAttendance.eod.tasks_accomplished}
                  </div>
                </div>
              )}
              
              {selectedAttendance.leave && (
                <div className="space-y-2 text-sm border-t border-border pt-4 mt-4">
                  <h4 className="font-medium text-orange-500">Approved Leave</h4>
                  <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-lg text-orange-600 dark:text-orange-400 text-xs">
                    {selectedAttendance.leave.leave_type} - {selectedAttendance.leave.reason}
                  </div>
                </div>
              )}

              {selectedAttendance.wfh && (
                <div className="space-y-2 text-sm border-t border-border pt-4 mt-4">
                  <h4 className="font-medium text-blue-500">Approved WFH</h4>
                  <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg text-blue-600 dark:text-blue-400 text-xs">
                    {selectedAttendance.wfh.reason}
                  </div>
                </div>
              )}

              {selectedAttendance.holiday && (
                <div className="space-y-2 text-sm border-t border-border pt-4 mt-4">
                  <h4 className="font-medium text-purple-500">Holiday</h4>
                  <div className="bg-purple-500/5 border border-purple-500/20 p-3 rounded-lg text-purple-600 dark:text-purple-400 text-xs">
                    {selectedAttendance.holiday.name}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/10 rounded-xl border border-dashed border-border">
              <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a date to view detailed attendance information.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
