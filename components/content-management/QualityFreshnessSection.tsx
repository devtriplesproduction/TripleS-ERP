'use client'

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Copy,
  Calendar,
  Eye,
  FileText,
  Filter,
  CheckSquare,
  AlertCircle,
  Link2,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ContentItem,
  computeFreshnessState,
  FreshnessState,
  ReviewRecord,
} from '@/types/content-management'
import { AuthUser } from '@/lib/auth'
import dayjs from 'dayjs'

interface QualityFreshnessSectionProps {
  items: ContentItem[]
  user: AuthUser
  onViewItem?: (item: ContentItem) => void
  onUpdateQuality?: (item: ContentItem) => void
}

export function QualityFreshnessSection({
  items,
  user,
  onViewItem,
  onUpdateQuality,
}: QualityFreshnessSectionProps) {
  const [activeTab, setActiveTab] = useState<'freshness' | 'corrections' | 'duplicates' | 'followups'>('freshness')
  const [freshnessFilter, setFreshnessFilter] = useState<'All' | FreshnessState>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Freshness Breakdown
  const freshnessStats = useMemo(() => {
    let fresh = 0
    let dueSoon = 0
    let outdated = 0
    let unscheduled = 0

    items.forEach((item) => {
      const state = computeFreshnessState(item)
      if (state === 'Fresh') fresh++
      else if (state === 'Due Soon') dueSoon++
      else if (state === 'Outdated') outdated++
      else unscheduled++
    })

    return { fresh, dueSoon, outdated, unscheduled, total: items.length }
  }, [items])

  // 2. Filtered Freshness List
  const filteredFreshnessItems = useMemo(() => {
    return items.filter((item) => {
      const state = computeFreshnessState(item)
      if (freshnessFilter !== 'All' && state !== freshnessFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!item.title.toLowerCase().includes(q) && !item.content_type.toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [items, freshnessFilter, searchQuery])

  // 3. Items with Required Corrections
  const correctionsItems = useMemo(() => {
    return items.filter((item) => {
      const reviewList = item.reviews || item.review_history || []
      const pendingCorrections = reviewList.some(
        (r: ReviewRecord) => r.required_corrections && r.required_corrections.length > 0 && r.decision === 'Changes Requested'
      )
      return pendingCorrections || item.status === 'Changes Requested'
    })
  }, [items])

  // 4. Duplicate items list
  const duplicateItems = useMemo(() => {
    return items.filter((item) => item.is_duplicate)
  }, [items])

  // 5. Follow-up items list
  const followUpItems = useMemo(() => {
    return items.filter((item) => item.follow_up_required)
  }, [items])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Content Quality & Freshness Hub
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Maintain high documentation fidelity with review schedules, correction tracking, and non-destructive duplicate management.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('freshness')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'freshness'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Freshness ({freshnessStats.outdated + freshnessStats.dueSoon})
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'corrections'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Corrections ({correctionsItems.length})
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'duplicates'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Duplicates ({duplicateItems.length})
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'followups'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Follow-ups ({followUpItems.length})
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          onClick={() => {
            setActiveTab('freshness')
            setFreshnessFilter('Outdated')
          }}
          className="bg-zinc-900/40 border-zinc-800 cursor-pointer hover:border-rose-500/40 transition-colors"
        >
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Outdated Documentation</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{freshnessStats.outdated}</div>
            <span className="text-[11px] text-zinc-500">Scheduled review date passed</span>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('freshness')
            setFreshnessFilter('Due Soon')
          }}
          className="bg-zinc-900/40 border-zinc-800 cursor-pointer hover:border-amber-500/40 transition-colors"
        >
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Due Soon for Review</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{freshnessStats.dueSoon}</div>
            <span className="text-[11px] text-zinc-500">Expiring in next 14 days</span>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('freshness')
            setFreshnessFilter('Fresh')
          }}
          className="bg-zinc-900/40 border-zinc-800 cursor-pointer hover:border-emerald-500/40 transition-colors"
        >
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Fresh & Verified</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{freshnessStats.fresh}</div>
            <span className="text-[11px] text-zinc-500">Compliant with quality cycles</span>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('corrections')}
          className="bg-zinc-900/40 border-zinc-800 cursor-pointer hover:border-indigo-500/40 transition-colors"
        >
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Actionable Corrections</span>
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{correctionsItems.length}</div>
            <span className="text-[11px] text-zinc-500">Review feedback pending author</span>
          </CardContent>
        </Card>
      </div>

      {/* TAB 1: FRESHNESS QUEUE */}
      {activeTab === 'freshness' && (
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Documentation Freshness Cadence
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automated freshness tracking based on review dates and recurrence periods.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title..."
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 w-48"
                />

                <select
                  value={freshnessFilter}
                  onChange={(e) => setFreshnessFilter(e.target.value as any)}
                  className="h-8 bg-zinc-950 border border-zinc-800 rounded px-2.5 text-xs text-zinc-200"
                >
                  <option value="All">All States ({items.length})</option>
                  <option value="Outdated">Outdated ({freshnessStats.outdated})</option>
                  <option value="Due Soon">Due Soon ({freshnessStats.dueSoon})</option>
                  <option value="Fresh">Fresh ({freshnessStats.fresh})</option>
                  <option value="Unscheduled">Unscheduled ({freshnessStats.unscheduled})</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {filteredFreshnessItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No content matching the selected freshness criteria.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-950/40 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Owner / Assignee</th>
                    <th className="px-3 py-2.5">Last Reviewed</th>
                    <th className="px-3 py-2.5">Next Review Due</th>
                    <th className="px-3 py-2.5">Cadence</th>
                    <th className="px-3 py-2.5">Freshness State</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredFreshnessItems.map((item) => {
                    const state = computeFreshnessState(item)
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-zinc-200 max-w-xs truncate">{item.title}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-zinc-400 font-mono text-[11px]">{item.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-300">{item.owner_name}</td>
                        <td className="px-3 py-2.5 text-zinc-400">
                          {item.last_reviewed_at ? dayjs(item.last_reviewed_at).format('DD MMM YYYY') : 'Never'}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.next_review_date ? (
                            <span
                              className={
                                state === 'Outdated'
                                  ? 'text-rose-400 font-semibold'
                                  : state === 'Due Soon'
                                  ? 'text-amber-400 font-medium'
                                  : 'text-zinc-300'
                              }
                            >
                              {dayjs(item.next_review_date).format('DD MMM YYYY')}
                            </span>
                          ) : (
                            <span className="text-zinc-600">None set</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400 capitalize">
                          {item.review_frequency || 'quarterly'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={
                              state === 'Fresh'
                                ? 'border-emerald-500/30 text-emerald-300 text-[10px]'
                                : state === 'Due Soon'
                                ? 'border-amber-500/30 text-amber-300 text-[10px]'
                                : state === 'Outdated'
                                ? 'border-rose-500/30 text-rose-300 text-[10px]'
                                : 'border-zinc-700 text-zinc-400 text-[10px]'
                            }
                          >
                            {state}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {onViewItem && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onViewItem(item)}
                              className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View / Audit
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: REQUIRED CORRECTIONS */}
      {activeTab === 'corrections' && (
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                Actionable Reviewer Corrections Queue
              </span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs font-normal">
                {correctionsItems.length} Content Items Awaiting Author Revisions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {correctionsItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No active change requests or reviewer correction checklists pending.
              </div>
            ) : (
              correctionsItems.map((item) => {
                const reviews = item.reviews || item.review_history || []
                const latestReview = reviews[reviews.length - 1]
                const corrections = latestReview?.required_corrections || []
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">{item.title}</h4>
                          <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                            {item.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          Author: <span className="text-zinc-200">{item.owner_name}</span> &bull; Type:{' '}
                          <span className="text-zinc-200">{item.content_type}</span>
                          {latestReview && (
                            <span>
                              {' '}
                              &bull; Reviewed by: <span className="text-zinc-200">{latestReview.reviewer_name}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {onViewItem && (
                        <Button
                          size="sm"
                          onClick={() => onViewItem(item)}
                          className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Open Document
                        </Button>
                      )}
                    </div>

                    {latestReview?.feedback && (
                      <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                        <span className="font-semibold block mb-0.5">Reviewer Feedback:</span>
                        {latestReview.feedback}
                      </div>
                    )}

                    {corrections.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                          Required Changes Checklist:
                        </span>
                        <div className="space-y-1">
                          {corrections.map((corr: string, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-900/60 p-2 rounded border border-zinc-800/80"
                            >
                              <span className="text-rose-400 font-bold">&bull;</span>
                              <span>{corr}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: DUPLICATE CONTENT REGISTRY */}
      {activeTab === 'duplicates' && (
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-purple-400" />
                  Duplicate Content Registry
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Non-destructive duplicate flagging. Documents remain preserved in history and are never auto-deleted.
                </p>
              </div>
              <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                {duplicateItems.length} Marked Duplicates
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {duplicateItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No documents are currently marked as duplicates.
              </div>
            ) : (
              duplicateItems.map((item) => {
                const canonicalTarget = items.find((i) => i.id === item.duplicate_of_id)
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-200">{item.title}</span>
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                          Duplicate Flag
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-400">
                        Author: <span className="text-zinc-200">{item.owner_name}</span> &bull; Status: {item.status}
                      </div>
                      {item.duplicate_reason && (
                        <p className="text-xs text-zinc-400 italic">Reason: &ldquo;{item.duplicate_reason}&rdquo;</p>
                      )}
                      {canonicalTarget && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium pt-0.5">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Canonical Source:</span>
                          <span className="underline">{canonicalTarget.title}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onViewItem && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewItem(item)}
                          className="h-8 border-zinc-800 text-zinc-300 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Duplicate
                        </Button>
                      )}
                      {canonicalTarget && onViewItem && (
                        <Button
                          size="sm"
                          onClick={() => onViewItem(canonicalTarget)}
                          className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                        >
                          View Canonical
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: FOLLOW-UPS REQUIRED */}
      {activeTab === 'followups' && (
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Follow-Up Queue
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Content items earmarked for subsequent updates, API spec syncs, or version migrations.
                </p>
              </div>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 text-xs">
                {followUpItems.length} Marked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {followUpItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No items currently marked with follow-up requirements.
              </div>
            ) : (
              followUpItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-200">{item.title}</span>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px]">
                        Follow-Up
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Owner: <span className="text-zinc-200">{item.owner_name}</span> &bull; Target Date:{' '}
                      <span className="text-cyan-300 font-medium">
                        {item.follow_up_date ? dayjs(item.follow_up_date).format('DD MMM YYYY') : 'Not specified'}
                      </span>
                    </div>
                    {item.follow_up_note && (
                      <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2 rounded border border-zinc-800">
                        {item.follow_up_note}
                      </p>
                    )}
                  </div>

                  {onViewItem && (
                    <Button
                      size="sm"
                      onClick={() => onViewItem(item)}
                      className="h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Item
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

