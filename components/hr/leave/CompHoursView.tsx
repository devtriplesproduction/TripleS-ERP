"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Undo2,
  Calendar,
  Sparkles,
  ChevronDown,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Dropdown } from "@/components/ui/Dropdown"
import { cn } from "@/lib/utils"
import { formatHoursMinutes } from "@/lib/utils/time"
import { format } from "date-fns"
import {
  CompOffOverviewData,
  EmployeeCompOffSummary,
  getCompOffOverview,
  getEmployeeCompOffDetails,
} from "@/lib/actions/compoff"
import { getProfilePhotoUrl } from "@/lib/utils/profile-photos"
import { toast } from "sonner"

interface CompHoursViewProps {
  initialData?: CompOffOverviewData | null
}

export function CompHoursView({ initialData }: CompHoursViewProps) {
  const [data, setData] = useState<CompOffOverviewData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isRefreshing, startRefresh] = useTransition()
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("ALL")
  const [eligibilityFilter, setEligibilityFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState<"avail_desc" | "avail_asc" | "name_asc" | "earned_desc">("avail_desc")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Detailed Modal state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Fetch or refresh overview
  const loadOverview = async (showToast = false) => {
    try {
      if (!data) setIsLoading(true)
      const res = await getCompOffOverview()
      setData(res)
      if (showToast) toast.success("Credits overview updated")
    } catch (err: any) {
      console.error("Failed to load comp off overview:", err)
      toast.error(err.message || "Failed to load comp off data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      loadOverview()
    }
  }, [initialData])

  // Open detailed employee ledger modal
  const handleOpenDetails = async (empId: string) => {
    setSelectedEmployeeId(empId)
    setIsDetailLoading(true)
    setDetailData(null)
    try {
      const details = await getEmployeeCompOffDetails(empId)
      setDetailData(details)
    } catch (err: any) {
      console.error("Failed to fetch employee comp off details:", err)
      toast.error(err.message || "Failed to load employee ledger details")
    } finally {
      setIsDetailLoading(false)
    }
  }

  // Extract departments
  const departments = useMemo(() => {
    if (!data?.employees) return ["ALL"]
    const unique = Array.from(new Set(data.employees.map((e) => e.department).filter(Boolean))).sort()
    return ["ALL", ...unique]
  }, [data?.employees])

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return []

    return data.employees
      .filter((emp) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase()
          const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase()
          const empId = (emp.employee_id_number || "").toLowerCase()
          const dept = (emp.department || "").toLowerCase()
          if (!fullName.includes(q) && !empId.includes(q) && !dept.includes(q)) {
            return false
          }
        }

        // Department filter
        if (department !== "ALL" && emp.department !== department) {
          return false
        }

        // Eligibility filter
        if (eligibilityFilter === "ELIGIBLE" && emp.availableHours < 8) return false
        if (eligibilityFilter === "HAS_BALANCE" && emp.availableHours <= 0) return false
        if (eligibilityFilter === "ZERO" && emp.availableHours > 0) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === "avail_desc") return b.availableHours - a.availableHours
        if (sortBy === "avail_asc") return a.availableHours - b.availableHours
        if (sortBy === "earned_desc") return b.earnedHours - a.earnedHours
        if (sortBy === "name_asc") return a.first_name.localeCompare(b.first_name)
        return 0
      })
  }, [data?.employees, search, department, eligibilityFilter, sortBy])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEmployees.slice(start, start + pageSize)
  }, [filteredEmployees, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, department, eligibilityFilter, sortBy])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading Credits overview...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Horizontal Filters Row matching 44px standard */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name, ID, or department..."
            className="!h-11 w-full !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border dark:hover:!border-border focus-visible:!border-neutral-500 !rounded-xl !pl-10 !pr-4 !text-sm !text-foreground placeholder:!text-muted-foreground !shadow-none transition-colors"
          />
        </div>

        {/* Department Filter */}
        <div className="w-full sm:w-[170px] lg:w-[190px] shrink-0">
          <Dropdown
            className="!space-y-0 !w-full"
            buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
            value={department}
            onChange={(val) => setDepartment(val as string)}
            placeholder="Department"
            options={departments.map((d) => ({
              label: d === "ALL" ? "All Departments" : d,
              value: d,
            }))}
          />
        </div>

        {/* Eligibility Filter */}
        <div className="w-full sm:w-[170px] lg:w-[190px] shrink-0">
          <Dropdown
            className="!space-y-0 !w-full"
            buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
            value={eligibilityFilter}
            onChange={(val) => setEligibilityFilter(val as string)}
            placeholder="Eligibility"
            options={[
              { label: "All Balances", value: "ALL" },
              { label: "Eligible (≥ 8h)", value: "ELIGIBLE" },
              { label: "Has Balance (> 0)", value: "HAS_BALANCE" },
              { label: "Zero Balance", value: "ZERO" },
            ]}
          />
        </div>

        {/* Sort Filter */}
        <div className="w-full sm:w-[190px] lg:w-[210px] shrink-0">
          <Dropdown
            className="!space-y-0 !w-full"
            buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            placeholder="Sort by"
            options={[
              { label: "Available Hours (High-Low)", value: "avail_desc" },
              { label: "Available Hours (Low-High)", value: "avail_asc" },
              { label: "Earned Hours (High-Low)", value: "earned_desc" },
              { label: "Employee Name (A-Z)", value: "name_asc" },
            ]}
          />
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          onClick={() => startRefresh(() => loadOverview(true))}
          disabled={isRefreshing}
          className="h-11 w-11 p-0 shrink-0 rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh Credits"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* 3. Employee Comp-Off Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 dark:bg-secondary/30 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Employee</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Employee ID</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Department</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Earned</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Used</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Available Hours</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Available Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="font-medium text-sm text-foreground">No employees found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Try adjusting your search query or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const isEligible = emp.availableHours >= 8

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(emp.id)}
                    >
                      {/* Employee Name & Avatar */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-9 h-9 shrink-0 border border-border/80">
                            <AvatarImage src={getProfilePhotoUrl(emp.profile_photo) || ""} />
                            <AvatarFallback className="text-xs font-semibold bg-secondary/80 text-foreground">
                              {emp.first_name?.[0]}
                              {emp.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                              {emp.first_name} {emp.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {emp.job_title}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-secondary/50 dark:bg-zinc-900 border border-border/70">
                          {emp.employee_id_number}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-foreground/90 font-medium">
                          {emp.department}
                        </span>
                      </td>

                      {/* Earned */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-xs font-medium text-foreground">
                          {formatHoursMinutes(emp.earnedHours)}
                        </span>
                      </td>

                      {/* Used */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {emp.usedHours > 0 ? `-${formatHoursMinutes(emp.usedHours)}` : "0h"}
                        </span>
                      </td>

                      {/* Available Hours */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            "text-sm font-bold tracking-tight",
                            emp.availableHours > 0 ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {formatHoursMinutes(emp.availableHours)}
                        </span>
                      </td>

                      {/* Available Days */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isEligible ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>
                              {emp.availableDays} {emp.availableDays === 1 ? "day" : "days"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">
                            {emp.availableDays} days
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (<768px) */}
        <div className="md:hidden divide-y divide-border/60">
          {paginatedEmployees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="font-medium text-sm text-foreground">No employees found</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try adjusting filters.</p>
            </div>
          ) : (
            paginatedEmployees.map((emp) => {
              const isEligible = emp.availableHours >= 8
              return (
                <div
                  key={emp.id}
                  onClick={() => handleOpenDetails(emp.id)}
                  className="p-4 space-y-3 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 shrink-0 border border-border">
                        <AvatarImage src={emp.profile_photo || ""} />
                        <AvatarFallback className="text-xs font-semibold bg-secondary text-foreground">
                          {emp.first_name?.[0]}
                          {emp.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm truncate">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {emp.employee_id_number} • {emp.department}
                        </div>
                      </div>
                    </div>
                    {isEligible && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                        {emp.availableDays}d Eligible
                      </span>
                    )}
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-secondary/30 border border-border/70 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Earned</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {formatHoursMinutes(emp.earnedHours)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Used</div>
                      <div className="font-semibold text-muted-foreground mt-0.5">
                        {formatHoursMinutes(emp.usedHours)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Available</div>
                      <div className="font-bold text-foreground mt-0.5">
                        {formatHoursMinutes(emp.availableHours)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Updated: {emp.lastUpdated ? format(new Date(emp.lastUpdated), "MMM d, yyyy") : "—"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetails(emp.id)
                      }}
                      className="h-7 px-2 text-xs font-medium text-foreground hover:bg-secondary/50"
                    >
                      View Ledger →
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} employees
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 rounded-lg border-border"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-medium text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 rounded-lg border-border"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Detailed Employee Ledger Modal */}
      <Dialog open={!!selectedEmployeeId} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border text-foreground p-5 sm:p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-foreground" />
              <span>Comp-Off Ledger Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official audit ledger and historical records for this employee.
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading employee audit records...</p>
            </div>
          ) : detailData ? (
            <div className="space-y-5 py-2">
              {/* Employee Banner */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11 shrink-0 border border-border">
                    <AvatarImage src={getProfilePhotoUrl(detailData.employee?.profile_photo) || ""} />
                    <AvatarFallback className="text-sm font-semibold bg-secondary text-foreground">
                      {detailData.employee?.first_name?.[0]}
                      {detailData.employee?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-tight">
                      {detailData.employee?.first_name} {detailData.employee?.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {detailData.employee?.employee_id_number} • {detailData.employee?.department} •{" "}
                      {detailData.employee?.job_title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-right sm:text-right">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Available</div>
                    <div className="text-lg font-bold text-foreground leading-tight">
                      {formatHoursMinutes(detailData.balance.availableHours)}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      {detailData.balance.availableDays} full {detailData.balance.availableDays === 1 ? "day" : "days"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/80 text-center text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Total Earned</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                    +{formatHoursMinutes(detailData.balance.earnedHours)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Total Used</span>
                  <span className="text-sm font-bold text-rose-400 mt-0.5 block">
                    -{formatHoursMinutes(detailData.balance.usedHours)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Total Ledger Entries</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {detailData.entries.length}
                  </span>
                </div>
              </div>

              {/* Ledger Entries List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Transaction Audit History
                </h4>

                {detailData.entries.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <p className="text-xs">No ledger activity recorded for this employee yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {detailData.entries.map((entry: any) => {
                      const isCredit = entry.transaction_type === "CREDIT"
                      const isDebit = entry.transaction_type === "DEBIT"
                      const isReversal = entry.transaction_type === "REVERSAL"

                      return (
                        <div
                          key={entry.id}
                          className="p-3 rounded-xl border border-border/70 bg-secondary/20 hover:bg-secondary/40 transition-colors flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Type Badge */}
                              {isCredit && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <ArrowUpRight className="w-3 h-3" />
                                  CREDIT
                                </span>
                              )}
                              {isDebit && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                  <ArrowDownRight className="w-3 h-3" />
                                  DEBIT
                                </span>
                              )}
                              {isReversal && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                  <Undo2 className="w-3 h-3" />
                                  REVERSAL
                                </span>
                              )}

                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                              </span>
                            </div>

                            {/* Linked Context Details */}
                            <div className="text-foreground/90 leading-relaxed pt-0.5">
                              {isCredit && entry.eod && (
                                <span>
                                  Earned via Approved EOD Report for{" "}
                                  <strong>{entry.eod.report_date}</strong> (
                                  {entry.eod.office_hours} worked hours).
                                  {entry.eod.summary && (
                                    <span className="block text-muted-foreground text-[11px] mt-0.5 line-clamp-1 italic">
                                      &ldquo;{entry.eod.summary}&rdquo;
                                    </span>
                                  )}
                                </span>
                              )}

                              {(isDebit || isReversal) && entry.leave && (
                                <span>
                                  {isDebit ? "Consumed for" : "Reversed for"} Comp-Off Leave from{" "}
                                  <strong>{entry.leave.start_date}</strong> to{" "}
                                  <strong>{entry.leave.end_date}</strong> ({entry.leave.status}).
                                  {entry.leave.reason && (
                                    <span className="block text-muted-foreground text-[11px] mt-0.5 line-clamp-1 italic">
                                      Reason: {entry.leave.reason}
                                    </span>
                                  )}
                                </span>
                              )}

                              {!entry.eod && !entry.leave && (
                                <span className="text-muted-foreground">
                                  Source reference ID: {entry.reference_id}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hours Amount */}
                          <div className="text-right shrink-0">
                            <span
                              className={cn(
                                "text-sm font-bold font-mono",
                                isCredit && "text-emerald-400",
                                isDebit && "text-rose-400",
                                isReversal && "text-blue-400"
                              )}
                            >
                              {isCredit ? `+${formatHoursMinutes(entry.hours)}` : isDebit ? `-${formatHoursMinutes(entry.hours)}` : `+${formatHoursMinutes(entry.hours)}`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
