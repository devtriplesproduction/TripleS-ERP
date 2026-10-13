'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { RulebookCategory, CompanyRule, acknowledgeRule, getRuleHistory } from '@/lib/actions/rulebook'
import { broadcastNotificationUpdate } from '@/lib/notifications-client'
import { toast } from 'sonner'
import {
  FileText,
  Shield,
  Calendar,
  CalendarCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  SlidersHorizontal,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  History,
  Edit,
  Trash2,
  Clock,
  BookOpen,
  ArrowUpDown,
  Loader2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'

export interface RuleAcknowledgment {
  id?: string
  rule_id: string
  version: string | number
  acknowledged_at?: string
}

interface RulebookClientProps {
  initialRules: CompanyRule[]
  userRole: 'Admin' | 'HR' | 'Employee'
  employeeId: string
  acknowledgedRules: RuleAcknowledgment[]
}

const CATEGORIES: RulebookCategory[] = [
  'Work Policy',
  'Security & IT',
  'Leave & PTO',
  'Attendance',
  'Human Resources'
]

const CATEGORY_META: Record<RulebookCategory, { title: string; subtitle: string; icon: React.ElementType }> = {
  'Work Policy': {
    title: 'Work Policies',
    subtitle: 'Read and acknowledge company work rules, guidelines, and workplace standards.',
    icon: FileText
  },
  'Security & IT': {
    title: 'Security & IT Policies',
    subtitle: 'Read and acknowledge company security, IT guidelines, and data compliance.',
    icon: Shield
  },
  'Leave & PTO': {
    title: 'Leave & PTO Policies',
    subtitle: 'Read and acknowledge the latest leave and PTO related policies.',
    icon: Calendar
  },
  'Attendance': {
    title: 'Attendance Policies',
    subtitle: 'Read and acknowledge workplace timing, working hours, and attendance regulations.',
    icon: CalendarCheck
  },
  'Human Resources': {
    title: 'Human Resources Policies',
    subtitle: 'Read and acknowledge human resources policies, conduct, and organizational standards.',
    icon: Users
  }
}

type SortOption = 'latest' | 'oldest' | 'title-asc' | 'title-desc' | 'pending-first' | 'acknowledged-first'

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const formattedDay = day < 10 ? `0${day}` : `${day}`
      return `${formattedDay} ${months[month - 1]} ${year}`
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const day = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return '-'
  }
}

function normalizeVersion(v: string | number | undefined | null) {
  if (!v) return '1.0'
  const str = String(v).trim()
  return str.includes('.') ? str : `${str}.0`
}

export function RulebookClient({ initialRules, userRole, employeeId, acknowledgedRules }: RulebookClientProps) {
  const [activeCategory, setActiveCategory] = useState<RulebookCategory>('Leave & PTO')
  const [rules, setRules] = useState<CompanyRule[]>(initialRules)
  const [acks, setAcks] = useState<RuleAcknowledgment[]>(acknowledgedRules)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('latest')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newRule, setNewRule] = useState<Partial<CompanyRule>>({ status: 'Draft', category: 'Leave & PTO' })
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [changeType, setChangeType] = useState<'Minor' | 'Major'>('Minor')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingAckId, setSubmittingAckId] = useState<string | null>(null)

  // History Modal
  const [historyRule, setHistoryRule] = useState<CompanyRule | null>(null)
  const [historyList, setHistoryList] = useState<CompanyRule[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Expanded cards state for description toggle
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({})

  const toggleExpand = (ruleId: string) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }))
  }

  const getAck = (ruleId: string, version: string | number) => {
    return acks.find(a => a.rule_id === ruleId && normalizeVersion(a.version) === normalizeVersion(version))
  }

  const hasAcknowledged = (ruleId: string, version: string | number) => {
    return !!getAck(ruleId, version)
  }

  const handleAcknowledge = async (ruleId: string, version: string) => {
    setSubmittingAckId(ruleId)
    try {
      await acknowledgeRule(employeeId, ruleId, version)
      const nowIso = new Date().toISOString()
      setAcks(prev => [
        ...prev.filter(a => !(a.rule_id === ruleId && normalizeVersion(a.version) === normalizeVersion(version))),
        { rule_id: ruleId, version, acknowledged_at: nowIso }
      ])
      toast.success("Policy acknowledged successfully.")
    } catch {
      toast.error("Failed to acknowledge policy.")
    } finally {
      setSubmittingAckId(null)
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      const { deleteRule } = await import('@/lib/actions/rulebook')
      await deleteRule(ruleId)
      setRules(rules.filter(r => r.id !== ruleId))
      toast.success("Rule deleted successfully.")
      broadcastNotificationUpdate()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete rule.")
    }
  }

  const handleOpenEdit = (rule: CompanyRule) => {
    setEditingRuleId(rule.id)
    setNewRule(rule)
    setChangeType('Minor')
    setIsAddOpen(true)
  }

  const handleOpenHistory = async (rule: CompanyRule) => {
    setHistoryRule(rule)
    setIsLoadingHistory(true)
    try {
      const history = await getRuleHistory(rule.id)
      setHistoryList(history)
    } catch {
      toast.error("Failed to load history.")
      setHistoryList([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleCreateRule = async () => {
    if (!newRule.title || !newRule.description || !newRule.category) {
      toast.error("Please fill all required fields.")
      return
    }
    setIsSubmitting(true)
    try {
      if (editingRuleId) {
        const existing = rules.find(r => r.id === editingRuleId)
        const isPublished = existing?.status === 'Published'
        const createNewVersion = isPublished

        const { updateRule } = await import('@/lib/actions/rulebook')
        const updated = await updateRule(editingRuleId, {
          title: newRule.title,
          category: newRule.category as RulebookCategory,
          description: newRule.description,
          status: newRule.status as any,
          created_by: employeeId,
          effective_date: newRule.effective_date || undefined
        }, createNewVersion, changeType)

        if (createNewVersion) {
          setRules([updated, ...rules])
        } else {
          setRules(rules.map(r => r.id === editingRuleId ? updated : r))
        }
        toast.success(createNewVersion ? "New version created!" : "Rule updated successfully!")
        broadcastNotificationUpdate()
      } else {
        const { createRule } = await import('@/lib/actions/rulebook')
        const created = await createRule({
          title: newRule.title,
          category: newRule.category as RulebookCategory,
          description: newRule.description,
          status: newRule.status as any,
          created_by: employeeId,
          published_at: newRule.status === 'Published' ? new Date().toISOString() : undefined,
          effective_date: newRule.effective_date || undefined
        })
        setRules([created, ...rules])
        toast.success("Rule created successfully!")
        broadcastNotificationUpdate()
      }
      setIsAddOpen(false)
      setNewRule({ status: 'Draft', category: activeCategory })
      setEditingRuleId(null)
      setChangeType('Minor')
    } catch (e: any) {
      toast.error(e.message || "Failed to create rule")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter & Sort
  const filteredRules = useMemo(() => {
    let list = rules.filter(r => r.category === activeCategory)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        String(r.version)?.toLowerCase().includes(q)
      )
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'latest') {
        const dateA = new Date(a.published_at || a.effective_date || a.created_at).getTime()
        const dateB = new Date(b.published_at || b.effective_date || b.created_at).getTime()
        return dateB - dateA
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.published_at || a.effective_date || a.created_at).getTime()
        const dateB = new Date(b.published_at || b.effective_date || b.created_at).getTime()
        return dateA - dateB
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title)
      }
      if (sortBy === 'pending-first') {
        const ackA = hasAcknowledged(a.id, a.version) ? 1 : 0
        const ackB = hasAcknowledged(b.id, b.version) ? 1 : 0
        return ackA - ackB
      }
      if (sortBy === 'acknowledged-first') {
        const ackA = hasAcknowledged(a.id, a.version) ? 1 : 0
        const ackB = hasAcknowledged(b.id, b.version) ? 1 : 0
        return ackB - ackA
      }
      return 0
    })
  }, [rules, activeCategory, searchQuery, sortBy, acks])

  const currentMeta = CATEGORY_META[activeCategory]
  const ActiveCategoryIcon = currentMeta.icon

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              Company Rulebook
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              View and acknowledge the latest company policies and rules.
            </p>
          </div>
        </div>

        {(userRole === 'Admin' || userRole === 'HR') && (
          <Button
            onClick={() => {
              setEditingRuleId(null)
              setNewRule({ status: 'Draft', category: activeCategory })
              setIsAddOpen(true)
            }}
            className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="border-b border-border overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 min-w-max pb-0">
          {CATEGORIES.map(cat => {
            const Icon = CATEGORY_META[cat].icon
            const isActive = activeCategory === cat

            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat)
                  setSearchQuery('')
                }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs sm:text-sm font-medium transition-all shrink-0",
                  isActive
                    ? "bg-card border border-border border-b-transparent text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-foreground" : "text-muted-foreground")} />
                <span>{cat}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-sm" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Header & Filter Panel */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Category Icon, Title, Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border flex items-center justify-center shrink-0 shadow-xs">
              <ActiveCategoryIcon className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {currentMeta.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Search and Sorting controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search policies..."
                className="w-full h-10 pl-10 pr-8 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="shrink-0 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger className="w-full sm:w-[130px] h-10 px-3.5 bg-background border border-border text-foreground text-xs sm:text-sm font-medium rounded-xl gap-2 hover:bg-muted/50 transition-colors">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Latest" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-popover-foreground">
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                  <SelectItem value="pending-first">Pending First</SelectItem>
                  <SelectItem value="acknowledged-first">Acknowledged First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Cards List Container */}
      <div className="space-y-3 sm:space-y-3.5">
        {filteredRules.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-card">
            <BookOpen className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No policies found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "No policies match your search query. Try searching for something else or clear the search filter."
                : `No policies have been published under ${activeCategory} yet.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-3 py-1.5 text-xs text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors border border-border"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredRules.map(rule => {
            const ack = getAck(rule.id, rule.version)
            const isAcked = !!ack
            const isDraft = rule.status === 'Draft'
            const isExpanded = !!expandedCardIds[rule.id]

            const effectiveDateStr = isDraft && !rule.effective_date ? '-' : formatDate(rule.effective_date)
            const publishedDateStr = isDraft && !rule.published_at ? '-' : formatDate(rule.published_at || rule.created_at)

            return (
              <div
                key={rule.id}
                className="rounded-2xl border border-border bg-card hover:border-border/80 transition-all p-4 sm:p-5 shadow-xs"
              >
                {/* Horizontal Card Row */}
                <div
                  onClick={() => toggleExpand(rule.id)}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none group"
                >
                  {/* Left: Document Icon & Details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Document Icon Box */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border flex items-center justify-center shrink-0 group-hover:border-foreground/30 transition-colors">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Title + Badges horizontally beside it */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight group-hover:text-foreground/90 transition-colors">
                          {rule.title}
                        </h3>

                        {/* Published / Draft badge */}
                        {rule.status === 'Published' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 leading-tight">
                            Published
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 leading-tight">
                            Draft
                          </span>
                        )}

                        {/* Version badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-medium text-muted-foreground border border-border bg-secondary/30 dark:bg-zinc-800/40 leading-tight">
                          v{normalizeVersion(rule.version)}
                        </span>
                      </div>

                      {/* Dates below title with calendar icon */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Effective: {effectiveDateStr}</span>
                        <span className="text-muted-foreground/60">|</span>
                        <span>Published: {publishedDateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge & Expand Chevron */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {/* Status Pill */}
                    {isDraft ? (
                      <div className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium shrink-0">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Pending</span>
                      </div>
                    ) : isAcked ? (
                      <div className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Acknowledged</span>
                      </div>
                    ) : (
                      <div className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl border border-border bg-secondary/30 dark:bg-zinc-800/30 flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>Not Acknowledged</span>
                      </div>
                    )}

                    {/* Expand Chevron Button */}
                    <div
                      className="p-1.5 sm:p-2 text-muted-foreground group-hover:text-foreground transition-colors rounded-lg shrink-0"
                      aria-label={isExpanded ? "Collapse policy description" : "Expand policy description"}
                    >
                      <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </div>
                  </div>
                </div>

                {/* Inline Expanded Description Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">
                        Policy Description
                      </h4>

                      {/* Admin / HR Controls */}
                      {(userRole === 'Admin' || userRole === 'HR') && (
                        <div className="flex items-center gap-3 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenHistory(rule)
                            }}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <History className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>History</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEdit(rule)
                            }}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Edit</span>
                          </button>
                          <div className="h-3.5 w-[1px] bg-border" />
                          <ConfirmModal
                            title="Delete Rule"
                            description="Are you sure you want to delete this rule? This action cannot be undone."
                            confirmText="Delete"
                            onConfirm={() => handleDelete(rule.id)}
                          >
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete</span>
                            </button>
                          </ConfirmModal>
                        </div>
                      )}
                    </div>

                    {/* Plain text directly inside the card */}
                    <div className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap py-1">
                      {rule.description || 'No description provided.'}
                    </div>

                    {/* Acknowledgement Action / Status Banner */}
                    {!isDraft && !isAcked && (
                      <div className="mt-3 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60">
                        <p className="text-xs text-muted-foreground">
                          Please review and acknowledge that you have read and understood this policy version.
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcknowledge(rule.id, String(rule.version))
                          }}
                          disabled={submittingAckId === rule.id}
                          className="h-9 px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                        >
                          {submittingAckId === rule.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Acknowledge Policy (v{normalizeVersion(rule.version)})</span>
                        </button>
                      </div>
                    )}

                    {!isDraft && isAcked && (
                      <div className="mt-2 pt-2.5 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 border-t border-border/50">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Acknowledged v{normalizeVersion(rule.version)}{ack?.acknowledged_at ? ` on ${formatDate(ack.acknowledged_at)}` : ''}</span>
                      </div>
                    )}

                    {isDraft && (
                      <div className="mt-2 pt-2.5 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 border-t border-border/50">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>This policy is currently in Draft status. It will require employee acknowledgement once published.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={!!historyRule} onOpenChange={(open) => !open && setHistoryRule(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-foreground" />
              Version History — {historyRule?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Audit trail of previous versions and updates
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {isLoadingHistory ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Loading version history...
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No previous version history found.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                {historyList.map((ver, idx) => (
                  <div key={ver.id} className="relative">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-muted border-2 border-border" />
                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-xs text-foreground">
                          v{normalizeVersion(ver.version)} {idx === 0 && "(Current)"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(ver.effective_date || ver.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {ver.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHistoryRule(null)}
              className="text-xs h-9 px-4"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Rule Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(val) => {
        setIsAddOpen(val)
        if (!val) {
          setEditingRuleId(null)
          setNewRule({ status: 'Draft', category: activeCategory })
          setChangeType('Minor')
        }
      }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[600px] max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-foreground">
              <BookOpen className="h-5 w-5 text-foreground shrink-0" />
              {editingRuleId ? 'Edit Rule' : 'Add New Rule'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingRuleId
                ? 'Update rule details or create a new version.'
                : 'Create a new company policy for employees to view and acknowledge.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1.5 sm:gap-4">
              <Label className="text-left sm:text-right text-xs sm:text-sm text-foreground">Title</Label>
              <Input
                className="col-span-1 sm:col-span-3 min-h-[40px] text-xs sm:text-sm"
                value={newRule.title || ''}
                onChange={e => setNewRule({ ...newRule, title: e.target.value })}
                placeholder="e.g. Leave & PTO Policy"
              />
            </div>

            {/* Category */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1.5 sm:gap-4">
              <Label className="text-left sm:text-right text-xs sm:text-sm text-foreground">Category</Label>
              <div className="col-span-1 sm:col-span-3">
                <Select
                  value={newRule.category}
                  onValueChange={(val) => setNewRule({ ...newRule, category: val as any })}
                >
                  <SelectTrigger className="min-h-[40px] w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1.5 sm:gap-4">
              <Label className="text-left sm:text-right text-xs sm:text-sm text-foreground">Status</Label>
              <div className="col-span-1 sm:col-span-3">
                <Select
                  value={newRule.status}
                  onValueChange={(val) => setNewRule({ ...newRule, status: val as any })}
                >
                  <SelectTrigger className="min-h-[40px] w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Change Type (if editing published rule) */}
            {editingRuleId && (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1.5 sm:gap-4">
                <Label className="text-left sm:text-right text-xs sm:text-sm text-foreground">Change Type</Label>
                <div className="col-span-1 sm:col-span-3">
                  <Select
                    value={changeType}
                    onValueChange={(val) => setChangeType(val as any)}
                  >
                    <SelectTrigger className="min-h-[40px] w-full text-xs sm:text-sm">
                      <SelectValue placeholder="Select Change Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="Minor">Minor (e.g. v1.0 → v1.1)</SelectItem>
                      <SelectItem value="Major">Major (e.g. v1.0 → v2.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Effective Date */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1.5 sm:gap-4">
              <Label className="text-left sm:text-right text-xs sm:text-sm text-foreground">Effective Date</Label>
              <div className="col-span-1 sm:col-span-3">
                <DatePicker
                  value={newRule.effective_date || ''}
                  onChange={val => setNewRule({ ...newRule, effective_date: val })}
                  placeholder="Select Date"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-1.5 sm:gap-4">
              <Label className="text-left sm:text-right text-xs sm:text-sm text-foreground mt-1 sm:mt-3">Description</Label>
              <textarea
                className="col-span-1 sm:col-span-3 flex min-h-[140px] w-full rounded-md border border-input bg-input-bg px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={newRule.description || ''}
                onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Rule details, conditions, eligibility, and procedures..."
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-center sm:justify-center gap-3 border-t border-border pt-3">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={handleCreateRule}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
