'use client'

import { useState } from 'react'
import {
  AlertCircle,
  PauseCircle,
  Search,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { ReceivableRecord, ReceivableStatus } from '@/types/accounting'
import { AccountingNavTabs } from './AccountingNavTabs'
import { CreateReceivableModal } from './CreateReceivableModal'
import { ExtendReceivableModal } from './ExtendReceivableModal'
import {
  markReceivablePaidAction,
  toggleReceivableHoldAction,
  deleteReceivableAction,
} from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface ReceivablesViewProps {
  initialReceivables: ReceivableRecord[]
}

export function ReceivablesView({ initialReceivables }: ReceivablesViewProps) {
  const [receivables, setReceivables] = useState<ReceivableRecord[]>(initialReceivables)
  const [activeTab, setActiveTab] = useState<'Overdue' | 'On Hold' | 'All'>('Overdue')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedReceivableForExtend, setSelectedReceivableForExtend] = useState<ReceivableRecord | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Counts
  const overdueCount = receivables.filter((r) => r.status === 'Overdue').length
  const onHoldCount = receivables.filter((r) => r.status === 'On Hold').length

  // Filtered list
  const filteredReceivables = receivables.filter((r) => {
    if (activeTab === 'Overdue' && r.status !== 'Overdue') return false
    if (activeTab === 'On Hold' && r.status !== 'On Hold') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchClient = r.client_name.toLowerCase().includes(q)
      const matchPlan = r.project_plan.toLowerCase().includes(q)
      const matchAmount = r.amount.toString().includes(q)
      return matchClient || matchPlan || matchAmount
    }
    return true
  })

  // Format currency
  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN')
  }

  // Format date: e.g. "Oct 31, 2025"
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Actions
  const handleMarkReceived = async (item: ReceivableRecord) => {
    setActionLoadingId(item.id)
    try {
      const res = await markReceivablePaidAction(item.id)
      if (res.success) {
        toast.success(`Marked ${formatCurrency(item.amount)} as received from ${item.client_name}`)
        setReceivables((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: 'Received' } : r))
        )
      } else {
        toast.error(res.error || 'Failed to mark as received')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleToggleHold = async (item: ReceivableRecord) => {
    setActionLoadingId(item.id)
    try {
      const res = await toggleReceivableHoldAction(item.id)
      if (res.success && res.data) {
        const nextStatus = res.data.status
        toast.success(
          nextStatus === 'On Hold'
            ? `Paused collection for ${item.client_name}`
            : `Resumed collection for ${item.client_name}`
        )
        setReceivables((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: nextStatus } : r))
        )
      } else {
        toast.error(res.error || 'Failed to toggle status')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (item: ReceivableRecord) => {
    if (!confirm(`Are you sure you want to remove receivable for ${item.client_name}?`)) {
      return
    }
    setActionLoadingId(item.id)
    try {
      const res = await deleteReceivableAction(item.id)
      if (res.success) {
        toast.success('Receivable deleted')
        setReceivables((prev) => prev.filter((r) => r.id !== item.id))
      } else {
        toast.error(res.error || 'Failed to delete receivable')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setActionLoadingId(null)
    }
  }

  const refreshData = async () => {
    const { getReceivables } = await import('@/lib/actions/accounting')
    const res = await getReceivables()
    if (res.success && res.data) {
      setReceivables(res.data)
    }
  }

  return (
    <div className="space-y-6">
      <AccountingNavTabs />

      {/* Header section matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Receivables</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage overdue payments and paused collections.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-lg h-9 px-4 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Receivable
          </Button>
        </div>
      </div>

      {/* Tabs and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs (Square buttons) */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeTab === 'Overdue' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('Overdue')}
            className={`rounded-lg h-9 px-3.5 text-xs font-semibold transition-all ${
              activeTab === 'Overdue'
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-red-400" />
            Overdue ({overdueCount})
          </Button>

          <Button
            type="button"
            variant={activeTab === 'On Hold' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('On Hold')}
            className={`rounded-lg h-9 px-3.5 text-xs font-semibold transition-all ${
              activeTab === 'On Hold'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            On Hold ({onHoldCount})
          </Button>

          <Button
            type="button"
            variant={activeTab === 'All' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('All')}
            className="rounded-lg h-9 px-3.5 text-xs font-semibold"
          >
            All ({receivables.length})
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receivables..."
            className="rounded-lg h-9 text-xs pl-8 bg-card border-border"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Receivables Table Card */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">CLIENT / PROJECT</th>
                  <th className="py-3.5 px-4">EXPECTED DATE</th>
                  <th className="py-3.5 px-4">OVERDUE BY</th>
                  <th className="py-3.5 px-4">AMOUNT</th>
                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No receivable records found.
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((item) => {
                    const isLoading = actionLoadingId === item.id
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* CLIENT / PROJECT */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground text-sm">
                            {item.client_name}
                          </div>
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">
                            {item.project_plan}
                          </div>
                        </td>

                        {/* EXPECTED DATE */}
                        <td className="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(item.expected_date)}
                        </td>

                        {/* OVERDUE BY */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.status === 'Overdue' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              {item.overdue_days} Days
                            </span>
                          ) : item.status === 'On Hold' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Paused
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Collected
                            </span>
                          )}
                        </td>

                        {/* AMOUNT */}
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground text-sm whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Mark Paid (Green Checkmark Button) */}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={isLoading || item.status === 'Received'}
                              onClick={() => handleMarkReceived(item)}
                              title="Mark Received"
                              className="rounded-lg h-7 w-7 border-border text-emerald-500 hover:bg-muted"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>

                            {/* Reschedule Date (Clock Button) */}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={isLoading}
                              onClick={() => setSelectedReceivableForExtend(item)}
                              title="Extend / Reschedule Date"
                              className="rounded-lg h-7 w-7 border-border text-sky-400 hover:bg-muted"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </Button>

                            {/* Pause / Hold Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={isLoading}
                              onClick={() => handleToggleHold(item)}
                              title={item.status === 'On Hold' ? 'Resume Collection' : 'Put on Hold'}
                              className="rounded-lg h-7 w-7 border-border text-amber-400 hover:bg-muted"
                            >
                              {item.status === 'On Hold' ? (
                                <Play className="w-3.5 h-3.5" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            {/* Delete Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isLoading}
                              onClick={() => handleDelete(item)}
                              title="Delete Record"
                              className="rounded-lg h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Receivable Modal */}
      <CreateReceivableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshData}
      />

      {/* Extend Date Modal */}
      <ExtendReceivableModal
        isOpen={!!selectedReceivableForExtend}
        receivable={selectedReceivableForExtend}
        onClose={() => setSelectedReceivableForExtend(null)}
        onSuccess={refreshData}
      />
    </div>
  )
}

