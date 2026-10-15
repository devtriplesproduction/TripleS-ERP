"use client"

import { useState, useEffect, useTransition } from "react"
import {
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dropdown } from "@/components/ui/Dropdown"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getWorklogDataAction, WorklogData } from "@/lib/actions/worklog"

const MONTH_OPTIONS = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" }
]

const YEAR_OPTIONS = [
  { label: "2024", value: "2024" },
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
  { label: "2027", value: "2027" }
]

export function WorklogView() {
  // Current month & year default to Asia/Kolkata
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        month: "numeric"
      }).format(new Date())
      return parseInt(parts, 10) || (new Date().getMonth() + 1)
    } catch {
      return new Date().getMonth() + 1
    }
  })

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric"
      }).format(new Date())
      return parseInt(parts, 10) || new Date().getFullYear()
    } catch {
      return new Date().getFullYear()
    }
  })

  const [data, setData] = useState<WorklogData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, startRefresh] = useTransition()

  const loadData = async (showToast = false) => {
    try {
      setIsLoading(true)
      const res = await getWorklogDataAction(selectedYear, selectedMonth)
      if (res.success && res.data) {
        setData(res.data)
        if (showToast) {
          toast.success(`Worklog updated for ${res.data.monthName} ${selectedYear}`)
        }
      } else {
        toast.error(res.error || "Failed to load worklog data")
      }
    } catch (err: any) {
      console.error("Worklog fetch error:", err)
      toast.error(err.message || "Failed to load worklog data")
    } finally {
      setIsLoading(false)
    }
  }

  // Load when month or year changes
  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const kpis = data?.kpis || {
    totalMonthHours: 0,
    thisWeekHours: 0,
    todayHours: 0,
    averageDailyHours: 0,
    activeDaysCount: 0
  }

  const contributions = data?.contributions || []

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Period Selectors matching TripleS 44px standard */}
      <div className="flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap pb-1">
        {/* Month Dropdown */}
        <div className="w-[150px] shrink-0">
          <Dropdown
            className="!space-y-0 !w-full"
            buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
            value={String(selectedMonth)}
            options={MONTH_OPTIONS}
            onChange={(val) => setSelectedMonth(parseInt(val, 10))}
            placeholder={
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Month</span>
              </span>
            }
          />
        </div>

        {/* Year Dropdown */}
        <div className="w-[110px] shrink-0">
          <Dropdown
            className="!space-y-0 !w-full"
            buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
            value={String(selectedYear)}
            options={YEAR_OPTIONS}
            onChange={(val) => setSelectedYear(parseInt(val, 10))}
            placeholder={
              <span className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Year</span>
              </span>
            }
          />
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          onClick={() => startRefresh(() => loadData(true))}
          disabled={isRefreshing || isLoading}
          className="h-11 w-11 p-0 shrink-0 rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh Worklog"
          aria-label="Refresh Worklog"
        >
          <RefreshCw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
        </Button>
      </div>

      {/* 2. Four Summary KPI Cards matching WorkLedger Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: TOTAL MONTH HOURS */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between min-h-[110px] relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              TOTAL MONTH HOURS
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {isLoading ? "—" : kpis.totalMonthHours.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-muted-foreground font-sans">
                hrs
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground/75 truncate block mt-2">
            Approved EOD hours in {data?.monthName || "month"}
          </span>
        </div>

        {/* Card 2: THIS WEEK */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              THIS WEEK
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {isLoading ? "—" : kpis.thisWeekHours.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-muted-foreground font-sans">
                hrs
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground/75 truncate block mt-2">
            Monday–Sunday current week
          </span>
        </div>

        {/* Card 3: TODAY */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              TODAY
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {isLoading ? "—" : kpis.todayHours.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-muted-foreground font-sans">
                hrs
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground/75 truncate block mt-2">
            Approved work today (IST)
          </span>
        </div>

        {/* Card 4: AVERAGE DAILY */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between min-h-[110px]">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              AVERAGE DAILY
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {isLoading ? "—" : kpis.averageDailyHours.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-muted-foreground font-sans">
                hrs
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground/75 truncate block mt-2">
            {kpis.activeDaysCount > 0
              ? `Across ${kpis.activeDaysCount} active ${kpis.activeDaysCount === 1 ? 'day' : 'days'}`
              : "No active days recorded"}
          </span>
        </div>
      </div>

      {/* 3. Contribution Breakdown Card matching WorkLedger Layout */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-sm font-bold text-foreground tracking-tight">
            Contribution Breakdown
          </h3>
          <span className="text-xs text-muted-foreground font-medium">
            {contributions.length} {contributions.length === 1 ? 'employee' : 'employees'}
          </span>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Calculating approved contributions...</p>
          </div>
        ) : contributions.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground border border-dashed border-border/70 rounded-xl">
            <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="font-semibold text-sm text-foreground">No approved worklogs found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              There are no approved EOD reports for {data?.monthName} {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {contributions.map((emp) => {
              // Extract initials for fallback
              const initials = emp.name
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 sm:gap-4 py-3 sm:py-3.5 hover:bg-muted/20 px-2 rounded-xl transition-colors group"
                >
                  {/* Left: Avatar & Name */}
                  <div className="flex items-center gap-3 w-44 sm:w-56 shrink-0 min-w-0">
                    <Avatar className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 border border-border/80">
                      <AvatarImage src={emp.profilePhoto || ""} alt={emp.name} />
                      <AvatarFallback className="text-xs font-semibold bg-secondary text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {emp.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {emp.department && emp.department !== '—' ? emp.department : emp.jobTitle}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Progress Bar */}
                  <div className="flex-1 min-w-[70px] sm:min-w-[120px] h-2 bg-secondary/70 dark:bg-zinc-800/80 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-foreground rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, emp.percentage))}%`
                      }}
                    />
                  </div>

                  {/* Right: Percentage */}
                  <div className="w-14 sm:w-16 text-right text-xs font-mono font-medium text-muted-foreground shrink-0">
                    {emp.percentage.toFixed(1)}%
                  </div>

                  {/* Right: Total Approved Hours */}
                  <div className="w-20 sm:w-24 text-right text-xs sm:text-sm font-mono font-bold text-foreground shrink-0">
                    {emp.approvedHours.toFixed(1)} hrs
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
