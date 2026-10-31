'use client'

import { useState, useMemo } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Eye,
  Send,
  Loader2,
  ArrowRightLeft,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { toast } from 'sonner'
import { JournalEntry, LedgerAccount } from '@/types/accounting'
import {
  deleteJournalEntryAction,
  postJournalEntryAction,
} from '@/lib/actions/accounting'
import { JournalEntryModal } from './JournalEntryModal'
import { JournalEntryViewModal } from './JournalEntryViewModal'

interface JournalEntryListProps {
  initialEntries: JournalEntry[]
  ledgerAccounts: LedgerAccount[]
}

export function JournalEntryList({
  initialEntries,
  ledgerAccounts,
}: JournalEntryListProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Status options
  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'Posted', label: 'Posted' },
    { value: 'Draft', label: 'Draft' },
  ]

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        e.entry_number.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.reference_number && e.reference_number.toLowerCase().includes(q)) ||
        e.lines.some((l) => l.account_name.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter

      let matchesDate = true
      if (startDate) matchesDate = matchesDate && e.entry_date >= startDate
      if (endDate) matchesDate = matchesDate && e.entry_date <= endDate

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [entries, search, statusFilter, startDate, endDate])

  // Summary counts
  const stats = useMemo(() => {
    const total = entries.length
    const posted = entries.filter((e) => e.status === 'Posted').length
    const drafts = entries.filter((e) => e.status === 'Draft').length
    const postedVolume = entries
      .filter((e) => e.status === 'Posted')
      .reduce((sum, e) => sum + e.total_debit, 0)

    return { total, posted, drafts, postedVolume }
  }, [entries])

  // Reload handler after mutation
  const refreshEntries = async () => {
    try {
      const { getJournalEntries } = await import('@/lib/actions/accounting')
      const res = await getJournalEntries()
      if (res.success && res.data) {
        setEntries(res.data)
      }
    } catch {
      // Ignore
    }
  }

  // Delete draft handler
  const handleDeleteDraft = async (id: string, entryNum: string) => {
    if (!confirm(`Are you sure you want to delete draft journal entry ${entryNum}?`)) {
      return
    }

    setActionLoadingId(id)
    try {
      const res = await deleteJournalEntryAction(id)
      if (!res.success) {
        toast.error(res.error || 'Failed to delete draft.')
      } else {
        toast.success(`Draft ${entryNum} deleted successfully.`)
        setEntries((prev) => prev.filter((e) => e.id !== id))
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting draft.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Quick post handler
  const handlePostDraft = async (id: string, entryNum: string) => {
    setActionLoadingId(id)
    try {
      const res = await postJournalEntryAction(id)
      if (!res.success) {
        toast.error(res.error || 'Journal entry cannot be posted because Total Debit and Total Credit must be equal.')
      } else {
        toast.success(`Journal entry ${entryNum} posted successfully!`)
        await refreshEntries()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error posting journal entry.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Entries</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground mt-1">General journal records</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Posted Entries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.posted}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Synced to ledger accounts</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Draft Entries</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {stats.drafts}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Pending review & balancing</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Posted Volume</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ₹{stats.postedVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Total posted transactions</div>
        </div>
      </div>

      {/* Control Bar: Filters & New JE Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by entry #, reference, narration, account..."
              className="text-xs pl-9 bg-background h-9"
            />
          </div>

          {/* Status filter */}
          <div className="w-36">
            <Dropdown
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              className="text-xs h-9 bg-background"
            />
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9 w-32 bg-background"
              title="Filter from date"
            />
            <span className="text-muted-foreground text-xs font-bold">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9 w-32 bg-background"
              title="Filter to date"
            />
          </div>

          {(search || statusFilter !== 'ALL' || startDate || endDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setStatusFilter('ALL')
                setStartDate('')
                setEndDate('')
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={() => {
            setEditingEntry(null)
            setIsCreateModalOpen(true)
          }}
          className="text-xs h-9 gap-1.5 font-medium shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal Entry</span>
        </Button>
      </div>

      {/* Journal Entries Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Entry Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 min-w-[280px]">Narration / Description</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Debit / Credit</th>
                <th className="py-3 px-4 text-center">Lines</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                      <div className="text-sm font-semibold text-foreground">No Journal Entries Found</div>
                      <p className="text-xs max-w-sm text-muted-foreground">
                        {search || statusFilter !== 'ALL' || startDate || endDate
                          ? 'Try adjusting your search query or filter options.'
                          : 'Create your first balanced journal entry using the button above.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Entry Number */}
                    <td className="py-3 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setViewingEntry(entry)}
                        className="hover:text-primary hover:underline transition-colors flex items-center gap-1.5"
                      >
                        <span>{entry.entry_number}</span>
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {entry.entry_date}
                    </td>

                    {/* Narration */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground line-clamp-1">
                        {entry.description}
                      </div>
                      {entry.campaign_project && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Campaign: {entry.campaign_project}
                        </div>
                      )}
                    </td>

                    {/* Reference */}
                    <td className="py-3 px-4 text-muted-foreground font-mono whitespace-nowrap">
                      {entry.reference_number || '—'}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      ₹{entry.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Line count */}
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        {entry.lines.length} lines
                      </Badge>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant={entry.status === 'Posted' ? 'default' : 'secondary'}
                        className={
                          entry.status === 'Posted'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium'
                        }
                      >
                        {entry.status === 'Posted' ? 'Posted' : 'Draft'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingEntry(entry)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="View Journal Entry"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Edit (Drafts only) */}
                        {entry.status === 'Draft' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingEntry(entry)
                              setIsCreateModalOpen(true)
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Edit Draft Entry"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Quick Post (Drafts only) */}
                        {entry.status === 'Draft' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePostDraft(entry.id, entry.entry_number)}
                            disabled={actionLoadingId === entry.id}
                            className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            title="Post Journal Entry"
                          >
                            {actionLoadingId === entry.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}

                        {/* Delete (Drafts only) */}
                        {entry.status === 'Draft' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDraft(entry.id, entry.entry_number)}
                            disabled={actionLoadingId === entry.id}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal (Spacious & Multi-Column) */}
      <JournalEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingEntry(null)
        }}
        onSuccess={async () => {
          await refreshEntries()
        }}
        entryToEdit={editingEntry}
        ledgerAccounts={ledgerAccounts}
      />

      {/* View Detail Modal */}
      <JournalEntryViewModal
        isOpen={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        entry={viewingEntry}
      />
    </div>
  )
}
