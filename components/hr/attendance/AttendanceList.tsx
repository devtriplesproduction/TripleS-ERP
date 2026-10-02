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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Attendance</h1>
          <p className="text-muted-foreground">Monitor attendance across the organization</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={month.toString()} onValueChange={v => setMonth(parseInt(v || "1"))}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i+1} value={(i+1).toString()}>
                  {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={v => setYear(parseInt(v || "2000"))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-4 bg-background/50 backdrop-blur-sm border-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
          <Select value={department} onValueChange={v => setDepartment(v || "All")}>
            <SelectTrigger className="w-full md:w-[200px]">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(emp => (
          <Card key={emp.id} className="p-5 hover:bg-muted/50 transition-colors cursor-pointer border-border" onClick={() => router.push(`${basePath}/${emp.id}`)}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={emp.profile_photo || ''} />
                  <AvatarFallback>{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">{emp.first_name} {emp.last_name}</h3>
                  <p className="text-xs text-muted-foreground">{emp.employee_id} • {emp.department}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm bg-muted/30 rounded-lg p-2">
              <div>
                <div className="text-emerald-500 font-semibold">{emp.summary.present}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Present</div>
              </div>
              <div>
                <div className="text-blue-500 font-semibold">{emp.summary.wfh}</div>
                <div className="text-[10px] text-muted-foreground uppercase">WFH</div>
              </div>
              <div>
                <div className="text-orange-500 font-semibold">{emp.summary.leave}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Leave</div>
              </div>
              <div>
                <div className="text-red-500 font-semibold">{emp.summary.absent}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Absent</div>
              </div>
              <div>
                <div className="text-amber-500 font-semibold">{emp.summary.pending}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Pending</div>
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
