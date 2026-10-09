"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Search, ChevronRight, Loader2, Calendar } from "lucide-react"
import { getAttendanceEmployees, DerivedAttendance, AttendanceStatus } from "@/lib/actions/attendance"
import { PageHeader } from "@/components/PageHeader"

export function AttendanceList({ basePath = '/hr/attendance' }: { basePath?: string }) {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("All")
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const router = useRouter()

  useEffect(() => {
    async function loadEmployees() {
      setLoading(true)
      try {
        const data = await getAttendanceEmployees(month, year)
        setEmployees(data || [])
      } catch (err) {
        console.error("Error loading employees:", err)
        setEmployees([])
      } finally {
        setLoading(false)
      }
    }
    loadEmployees()
  }, [month, year])

  const filtered = employees.filter(e => {
    if (department !== "All" && e.department !== department) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(e.first_name || '').toLowerCase().includes(q) && 
          !(e.last_name || '').toLowerCase().includes(q) && 
          !(e.employee_id || '').toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  const departments = ["All", ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Attendance"
        subtitle="Monitor attendance across the organization"
        actions={
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select value={month.toString()} onValueChange={v => setMonth(parseInt(v || "1"))}>
              <SelectTrigger className="flex-1 sm:w-[140px] filter-control">
                <Calendar className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate flex-1 text-left">{new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}</span>
              </SelectTrigger>
              <SelectContent className="max-h-[160px]">
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={v => setYear(parseInt(v || "2000"))}>
              <SelectTrigger className="w-[100px] filter-control">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Card className="p-3 sm:p-4 bg-background/50 backdrop-blur-sm border-border">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input 
              placeholder="Search by name or ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 filter-control"
            />
          </div>
          <Select value={department} onValueChange={v => setDepartment(v || "All")}>
            <SelectTrigger className="w-full md:w-[200px] filter-control">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(emp => (
          <Card key={emp.id} className="p-4 sm:p-5 hover:bg-muted/50 transition-colors cursor-pointer border-border" onClick={() => router.push(`${basePath}/${emp.id}`)}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="shrink-0">
                  <AvatarImage src={emp.profile_photo || ''} />
                  <AvatarFallback>{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{emp.first_name} {emp.last_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{emp.employee_id} • {emp.department}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
            </div>
            
            <div className="mt-4 grid grid-cols-5 gap-1 sm:gap-2 text-center text-xs sm:text-sm bg-muted/30 rounded-lg p-2">
              <div>
                <div className="text-emerald-500 font-semibold">{emp.summary.present}</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-tight">Present</div>
              </div>
              <div>
                <div className="text-blue-500 font-semibold">{emp.summary.wfh}</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-tight">WFH</div>
              </div>
              <div>
                <div className="text-orange-500 font-semibold">{emp.summary.leave}</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-tight">Leave</div>
              </div>
              <div>
                <div className="text-red-500 font-semibold">{emp.summary.absent}</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-tight">Absent</div>
              </div>
              <div>
                <div className="text-amber-500 font-semibold">{emp.summary.pending}</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-tight">Pending</div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            {search || department !== 'All'
              ? 'No employees found matching your criteria.'
              : `No attendance records found for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}.`}
          </div>
        )}
      </div>
    </div>
  )
}
