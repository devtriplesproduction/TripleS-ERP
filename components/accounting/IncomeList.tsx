'use client'

import { useState, useMemo } from 'react'
import { IncomeRecord, BankAccount } from '@/types/accounting'
import {
  Search,
  Plus,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { IncomeModal } from './IncomeModal'
import { AccountingNavTabs } from './AccountingNavTabs'
import { deleteIncomeAction } from '@/lib/actions/accounting'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface IncomeListProps {
  initialIncome: IncomeRecord[]
  bankAccounts: BankAccount[]
  existingClients: { id: string; name: string }[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function IncomeList({
  initialIncome,
  bankAccounts,
  existingClients,
}: IncomeListProps) {
  const [incomeList, setIncomeList] = useState<IncomeRecord[]>(initialIncome)
  const [search, setSearch] = useState('')

  // Date and Time Range Filtering
  const [selectedMonth, setSelectedMonth] = useState<number>(10) // 10 is November
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [quickFilter, setQuickFilter] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME'>('LAST_MONTH')

  // Dropdown UI states
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [incomeToEdit, setIncomeToEdit] = useState<IncomeRecord | null>(null)
  const [isTrendsOpen, setIsTrendsOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Format table date: "Nov 06, 2026"
  const formatTableDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const [y, m, d] = dateStr.split('-')
    const monthIndex = parseInt(m, 10) - 1
    const shortMonth = SHORT_MONTH_NAMES[monthIndex] || m
    const day = d ? d.padStart(2, '0') : ''
    return `${shortMonth} ${day}, ${y}`
  }

  // Handle Quick Filter Change
  const handleQuickFilter = (type: 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME') => {
    setQuickFilter(type)
    setCurrentPage(1)
    const now = new Date()
    if (type === 'THIS_MONTH') {
      setSelectedMonth(now.getMonth())
      setSelectedYear(now.getFullYear())
    } else if (type === 'LAST_MONTH') {
      const prevMonth = (now.getMonth() - 1 + 12) % 12
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      setSelectedMonth(prevMonth)
      setSelectedYear(prevYear)
    }
  }

  // Month navigation: < and >
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((prev) => prev - 1)
    } else {
      setSelectedMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((prev) => prev + 1)
    } else {
      setSelectedMonth((prev) => prev + 1)
    }
  }

  // Filter list
  const filteredList = useMemo(() => {
    return incomeList.filter((item) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.customer_name?.toLowerCase().includes(q) ||
        item.campaign_project?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.income_number?.toLowerCase().includes(q) ||
        String(item.amount).includes(q)

      if (!matchesSearch) return false

      if (quickFilter === 'ALL_TIME') {
        return true
      }

      if (item.income_date) {
        const [y, m] = item.income_date.split('-')
        const itemYear = parseInt(y, 10)
        const itemMonth = parseInt(m, 10) - 1
        return itemYear === selectedYear && itemMonth === selectedMonth
      }

      return true
    })
  }, [incomeList, search, quickFilter, selectedMonth, selectedYear])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage])

  const totalRevenue = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (curr.total_amount || curr.amount || 0), 0)
  }, [filteredList])

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    filteredList.forEach((item) => {
      const cat = item.category || 'Other'
      map[cat] = (map[cat] || 0) + (item.total_amount || item.amount || 0)
    })
    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
    }))
  }, [filteredList, totalRevenue])

  const handleOpenCreate = () => {
    setIncomeToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (record: IncomeRecord) => {
    setIncomeToEdit(record)
    setIsModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteIncomeAction(deletingId)
      if (res.success) {
        toast.success('Income record deleted successfully.')
        setIncomeList((prev) => prev.filter((i) => i.id !== deletingId))
        setIsDeleteModalOpen(false)
        setDeletingId(null)
      } else {
        toast.error(res.error || 'Failed to delete record.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting record.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Nav Tabs */}
      <AccountingNavTabs />

      {/* Main Income Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Income
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage revenue streams and invoices.
          </p>
        </div>

        {/* Common Button components without orange */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsTrendsOpen(true)}
            className="rounded-lg"
          >
            <BarChart2 className="w-4 h-4 mr-1.5" />
            <span>View Revenue Trends</span>
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleOpenCreate}
            className="rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Income</span>
          </Button>
        </div>
      </div>

      {/* Filter and Time Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        {/* Search Input using common Input */}
        <div className="relative min-w-[260px] lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search income..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 h-10"
          />
        </div>

        {/* Center: Month/Year Nav & Right: Quick Ranges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month & Year Navigator */}
          <div className="flex items-center bg-card border border-border rounded-xl px-2 py-1 text-sm text-foreground relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Month Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsYearPickerOpen(false)
                  setIsMonthPickerOpen(!isMonthPickerOpen)
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium hover:text-foreground transition-colors cursor-pointer"
              >
                <span>{MONTH_NAMES[selectedMonth]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {isMonthPickerOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-2xl py-1 w-36 max-h-56 overflow-y-auto">
                  {MONTH_NAMES.map((m, idx) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(idx)
                        setIsMonthPickerOpen(false)
                        setQuickFilter('ALL_TIME')
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        selectedMonth === idx
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Year Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMonthPickerOpen(false)
                  setIsYearPickerOpen(!isYearPickerOpen)
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium hover:text-foreground transition-colors cursor-pointer"
              >
                <span>{selectedYear}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {isYearPickerOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-2xl py-1 w-24">
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setSelectedYear(y)
                        setIsYearPickerOpen(false)
                        setQuickFilter('ALL_TIME')
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        selectedYear === y
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Range Selector using standard common styles */}
          <div className="flex items-center bg-card border border-border rounded-xl p-1 gap-1 text-xs font-semibold">
            <Button
              type="button"
              variant={quickFilter === 'THIS_MONTH' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => handleQuickFilter('THIS_MONTH')}
              className="rounded-lg text-xs"
            >
              THIS MONTH
            </Button>
            <Button
              type="button"
              variant={quickFilter === 'LAST_MONTH' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => handleQuickFilter('LAST_MONTH')}
              className="rounded-lg text-xs"
            >
              LAST MONTH
            </Button>
            <Button
              type="button"
              variant={quickFilter === 'ALL_TIME' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => handleQuickFilter('ALL_TIME')}
              className="rounded-lg text-xs"
            >
              ALL TIME
            </Button>
          </div>
        </div>
      </div>

      {/* Income Records Table Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                <th className="py-4 px-5">DATE</th>
                <th className="py-4 px-5">CLIENT</th>
                <th className="py-4 px-5">PROJECT DETAILS</th>
                <th className="py-4 px-5">CATEGORY</th>
                <th className="py-4 px-5">AMOUNT</th>
                <th className="py-4 px-5">STATUS</th>
                <th className="py-4 px-5 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <p className="text-base font-medium">No income records found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;+ Add Income&quot; to record your first revenue entry.
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td colSpan={7} className="py-3 px-5 bg-muted/20">
                      <Badge variant="outline" className="font-semibold uppercase tracking-wider text-[11px]">
                        {MONTH_NAMES[selectedMonth]}
                      </Badge>
                    </td>
                  </tr>

                  {paginatedList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      <td className="py-4 px-5 whitespace-nowrap text-muted-foreground font-normal">
                        {formatTableDate(item.income_date)}
                      </td>

                      <td className="py-4 px-5 font-semibold text-foreground whitespace-nowrap">
                        {item.customer_name}
                      </td>

                      <td className="py-4 px-5 text-muted-foreground max-w-xs truncate">
                        {item.campaign_project || item.description || '-'}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <Badge variant="secondary" className="font-normal text-xs px-3 py-1">
                          {item.category || 'General'}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 font-bold text-foreground whitespace-nowrap tracking-tight font-mono">
                        {formatCurrency(item.total_amount || item.amount || 0)}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {item.status === 'Received' ? 'RECEIVED' : item.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit entry"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setDeletingId(item.id)
                              setIsDeleteModalOpen(true)
                            }}
                            className="text-muted-foreground hover:text-destructive"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination using common Button */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border text-xs text-muted-foreground">
          <div>
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Revenue Trends Modal */}
      {isTrendsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-card border border-border text-card-foreground rounded-2xl shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Revenue Trends & Analytics</h3>
                  <p className="text-xs text-muted-foreground">
                    Insights for {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsTrendsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-5">
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Revenue
                </span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(totalRevenue)}
                </p>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {filteredList.length} transactions
                </span>
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Average Ticket
                </span>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatCurrency(filteredList.length ? totalRevenue / filteredList.length : 0)}
                </p>
                <span className="text-[11px] text-muted-foreground mt-1 block">Per recorded entry</span>
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Top Category
                </span>
                <p className="text-base font-bold text-primary mt-1 truncate">
                  {categoryBreakdown[0]?.category || 'N/A'}
                </p>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {categoryBreakdown[0]?.percentage || 0}% of revenue
                </span>
              </div>
            </div>

            {/* Category Distribution Meters */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Revenue Inflow by Category
              </h4>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No category data recorded yet</p>
                ) : (
                  categoryBreakdown.map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{item.category}</span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(item.amount)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-center pt-5 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTrendsOpen(false)}
                className="rounded-lg px-6 hover:bg-transparent hover:text-foreground font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Income Modal */}
      <IncomeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setIncomeToEdit(null)
        }}
        onSuccess={handleSuccess}
        incomeToEdit={incomeToEdit}
        bankAccounts={bankAccounts}
        existingClients={existingClients}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => {
          setIsDeleteModalOpen(false)
          setDeletingId(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Income Record"
        description="Are you sure you want to permanently delete this income record? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant="destructive"
      />
    </div>
  )
}
