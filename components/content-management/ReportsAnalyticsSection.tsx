'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Calendar,
  Building2,
  ShieldAlert,
  Layers,
  Filter,
  Eye,
  CheckCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ContentItem,
  ContentType,
  ContentCategory,
  ContentActivityRecord,
  computeFreshnessState,
  computeDeadlineState,
} from '@/types/content-management'
import { Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { jsPDF } from 'jspdf'
import dayjs from 'dayjs'

interface ReportsAnalyticsSectionProps {
  items: ContentItem[]
  types: ContentType[]
  categories: ContentCategory[]
  activities: ContentActivityRecord[]
  projects: Project[]
  employees: AssignableEmployee[]
  onViewItem?: (item: ContentItem) => void
}

export function ReportsAnalyticsSection({
  items,
  types,
  categories,
  activities,
  projects,
  employees,
  onViewItem,
}: ReportsAnalyticsSectionProps) {
  // Filters for published content report
  const [publishedProjectFilter, setPublishedProjectFilter] = useState('All')
  const [publishedTypeFilter, setPublishedTypeFilter] = useState('All')
  const [publishedOwnerFilter, setPublishedOwnerFilter] = useState('All')
  const [publishedStartDate, setPublishedStartDate] = useState('')
  const [publishedEndDate, setPublishedEndDate] = useState('')

  // 1. Status Distribution
  const statusStats = useMemo(() => {
    const total = items.length
    const draft = items.filter((i) => i.status === 'Draft').length
    const inReview = items.filter((i) => i.status === 'In Review').length
    const changesRequested = items.filter((i) => i.status === 'Changes Requested').length
    const approved = items.filter((i) => i.status === 'Approved').length
    const published = items.filter((i) => i.status === 'Published').length
    const archived = items.filter((i) => i.status === 'Archived').length
    const completionRate = total > 0 ? Math.round(((published + approved) / total) * 100) : 0

    return { total, draft, inReview, changesRequested, approved, published, archived, completionRate }
  }, [items])

  // 2. Developer-wise workload and completion
  const developerWorkload = useMemo(() => {
    // Map of assignee name/id -> stats
    const map = new Map<
      string,
      {
        developerName: string
        assignedCount: number
        publishedCount: number
        inReviewCount: number
        draftCount: number
        overdueCount: number
      }
    >()

    // Initialize with all assigned items
    items.forEach((item) => {
      const devName = item.assigned_to_name || item.owner_name || 'Unassigned'
      if (!map.has(devName)) {
        map.set(devName, {
          developerName: devName,
          assignedCount: 0,
          publishedCount: 0,
          inReviewCount: 0,
          draftCount: 0,
          overdueCount: 0,
        })
      }
      const entry = map.get(devName)!
      entry.assignedCount += 1
      if (item.status === 'Published' || item.status === 'Approved') entry.publishedCount += 1
      if (item.status === 'In Review') entry.inReviewCount += 1
      if (item.status === 'Draft') entry.draftCount += 1
      if (computeDeadlineState(item.due_date, item.status) === 'Overdue') entry.overdueCount += 1
    })

    return Array.from(map.values()).sort((a, b) => b.assignedCount - a.assignedCount)
  }, [items])

  // 3. Pending & Overdue Approvals
  const pendingApprovals = useMemo(() => {
    const now = dayjs()
    return items
      .filter((i) => i.status === 'In Review')
      .map((item) => {
        const submittedDate = item.updated_at ? dayjs(item.updated_at) : dayjs(item.created_at)
        const daysPending = now.diff(submittedDate, 'day')
        const isOverdue = daysPending >= 3 || computeDeadlineState(item.due_date, item.status) === 'Overdue'
        return {
          item,
          daysPending,
          isOverdue,
          submittedDate: submittedDate.format('DD MMM YYYY'),
        }
      })
      .sort((a, b) => b.daysPending - a.daysPending)
  }, [items])

  // 4. Published content report with multi-facet filters
  const filteredPublishedItems = useMemo(() => {
    return items.filter((item) => {
      if (item.status !== 'Published') return false
      if (publishedProjectFilter !== 'All' && item.project_id !== publishedProjectFilter) return false
      if (publishedTypeFilter !== 'All' && item.content_type !== publishedTypeFilter) return false
      if (publishedOwnerFilter !== 'All' && item.owner_id !== publishedOwnerFilter) return false
      if (publishedStartDate) {
        const pubDate = item.published_at || item.updated_at
        if (dayjs(pubDate).isBefore(dayjs(publishedStartDate), 'day')) return false
      }
      if (publishedEndDate) {
        const pubDate = item.published_at || item.updated_at
        if (dayjs(pubDate).isAfter(dayjs(publishedEndDate), 'day')) return false
      }
      return true
    })
  }, [items, publishedProjectFilter, publishedTypeFilter, publishedOwnerFilter, publishedStartDate, publishedEndDate])

  // 5. Outdated documentation report
  const outdatedDocumentation = useMemo(() => {
    return items
      .filter((item) => {
        const state = computeFreshnessState(item)
        return state === 'Outdated' || state === 'Due Soon'
      })
      .map((item) => ({
        item,
        state: computeFreshnessState(item),
        nextReview: item.next_review_date ? dayjs(item.next_review_date).format('DD MMM YYYY') : 'None set',
        lastReviewed: item.last_reviewed_at ? dayjs(item.last_reviewed_at).format('DD MMM YYYY') : 'Never',
      }))
  }, [items])

  // 6. Turnaround Time & Audit Metrics
  const auditMetrics = useMemo(() => {
    const publishedWithHistory = items.filter((i) => i.status === 'Published' && i.published_at)
    let totalDays = 0
    let count = 0

    publishedWithHistory.forEach((item) => {
      const created = dayjs(item.created_at)
      const published = dayjs(item.published_at)
      const diffDays = published.diff(created, 'day', true)
      if (diffDays >= 0) {
        totalDays += diffDays
        count += 1
      }
    })

    const avgTurnaroundDays = count > 0 ? (totalDays / count).toFixed(1) : 'N/A'
    const totalRevisions = items.reduce((acc, curr) => acc + (curr.version_history?.length || 1), 0)
    const totalReviewsLogged = items.reduce((acc, curr) => acc + ((curr.reviews || curr.review_history)?.length || 0), 0)
    const duplicateCount = items.filter((i) => i.is_duplicate).length
    const followUpCount = items.filter((i) => i.follow_up_required).length

    return {
      avgTurnaroundDays,
      totalRevisions,
      totalReviewsLogged,
      duplicateCount,
      followUpCount,
      recentActivities: activities.slice(0, 10),
    }
  }, [items, activities])

  // ================= EXPORT TO CSV =================
  const handleExportCSV = () => {
    const rows: string[] = []

    // Section 1: Executive Summary
    rows.push('TRIPLE S PRODUCTION - CONTENT MANAGEMENT REPORT')
    rows.push(`Generated at,"${dayjs().format('YYYY-MM-DD HH:mm:ss')}"`)
    rows.push('')
    rows.push('--- EXECUTIVE SUMMARY ---')
    rows.push('Metric,Count')
    rows.push(`Total Content Items,${statusStats.total}`)
    rows.push(`Published Items,${statusStats.published}`)
    rows.push(`Approved Items,${statusStats.approved}`)
    rows.push(`In Review Items,${statusStats.inReview}`)
    rows.push(`Draft Items,${statusStats.draft}`)
    rows.push(`Changes Requested,${statusStats.changesRequested}`)
    rows.push(`Completion Rate,${statusStats.completionRate}%`)
    rows.push(`Average Turnaround (Days),${auditMetrics.avgTurnaroundDays}`)
    rows.push(`Outdated Documentation Items,${outdatedDocumentation.length}`)
    rows.push('')

    // Section 2: Developer Workload
    rows.push('--- DEVELOPER ASSIGNMENT & COMPLETION ---')
    rows.push('Developer Name,Total Assigned,Published/Approved,In Review,Drafts,Overdue,Completion Rate %')
    developerWorkload.forEach((d) => {
      const rate = d.assignedCount > 0 ? Math.round((d.publishedCount / d.assignedCount) * 100) : 0
      rows.push(
        `"${d.developerName}",${d.assignedCount},${d.publishedCount},${d.inReviewCount},${d.draftCount},${d.overdueCount},${rate}%`
      )
    })
    rows.push('')

    // Section 3: Pending & Overdue Approvals
    rows.push('--- PENDING & OVERDUE APPROVALS ---')
    rows.push('Content ID,Title,Type,Owner,Submitted Date,Days Pending,Overdue Status')
    pendingApprovals.forEach((p) => {
      rows.push(
        `"${p.item.id}","${p.item.title.replace(/"/g, '""')}","${p.item.content_type}","${p.item.owner_name}","${
          p.submittedDate
        }",${p.daysPending},"${p.isOverdue ? 'OVERDUE' : 'PENDING'}"`
      )
    })
    rows.push('')

    // Section 4: Published Catalog
    rows.push('--- PUBLISHED CONTENT CATALOG ---')
    rows.push('Content ID,Title,Type,Project,Owner,Version,Published Date,Next Review Date')
    filteredPublishedItems.forEach((item) => {
      rows.push(
        `"${item.id}","${item.title.replace(/"/g, '""')}","${item.content_type}","${item.project_name || 'N/A'}","${
          item.owner_name
        }","${item.version_number || 'v1.0'}","${
          item.published_at ? dayjs(item.published_at).format('YYYY-MM-DD') : 'N/A'
        }","${item.next_review_date ? dayjs(item.next_review_date).format('YYYY-MM-DD') : 'N/A'}"`
      )
    })
    rows.push('')

    // Section 5: Outdated Documentation
    rows.push('--- OUTDATED & DUE SOON DOCUMENTATION ---')
    rows.push('Content ID,Title,Freshness Status,Last Reviewed,Next Review Date,Owner')
    outdatedDocumentation.forEach((od) => {
      rows.push(
        `"${od.item.id}","${od.item.title.replace(/"/g, '""')}","${od.state}","${od.lastReviewed}","${od.nextReview}","${
          od.item.owner_name
        }"`
      )
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'))
    const link = document.createElement('a')
    link.setAttribute('href', csvContent)
    link.setAttribute('download', `triple-s-content-report-${dayjs().format('YYYY-MM-DD')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ================= EXPORT TO PDF =================
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const primaryColor = [24, 24, 27] // Zinc 900
    const accentColor = [99, 102, 241] // Indigo 500
    const mutedColor = [113, 113, 122] // Zinc 500
    const lightBg = [248, 250, 252]

    // Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 28, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('TRIPLE S PRODUCTION', 14, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 200, 200)
    doc.text('ENTERPRISE RESOURCE PLANNING (ERP) - CONTENT AUDIT & ANALYTICS', 14, 18)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(`DATE: ${dayjs().format('DD MMM YYYY, HH:mm')}`, 196, 15, { align: 'right' })

    let y = 36

    // Section 1: Executive KPI Cards
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2])
    doc.roundedRect(14, y, 182, 24, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, y, 182, 24, 2, 2, 'S')

    doc.setFontSize(8)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.setFont('helvetica', 'normal')
    doc.text('Total Items', 20, y + 8)
    doc.text('Published', 60, y + 8)
    doc.text('In Review', 100, y + 8)
    doc.text('Completion Rate', 140, y + 8)

    doc.setFontSize(12)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text(String(statusStats.total), 20, y + 18)
    doc.text(String(statusStats.published), 60, y + 18)
    doc.text(String(statusStats.inReview), 100, y + 18)
    doc.text(`${statusStats.completionRate}%`, 140, y + 18)

    y += 32

    // Section 2: Status Breakdown
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('1. Content Status Distribution', 14, y)
    y += 6

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.text(
      `Draft: ${statusStats.draft}  |  In Review: ${statusStats.inReview}  |  Changes Requested: ${statusStats.changesRequested}  |  Approved: ${statusStats.approved}  |  Published: ${statusStats.published}  |  Archived: ${statusStats.archived}`,
      14,
      y
    )
    y += 10

    // Section 3: Developer Workload Table
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('2. Developer Assignment & Completion Report', 14, y)
    y += 6

    // Table Header
    doc.setFillColor(241, 245, 249)
    doc.rect(14, y, 182, 6, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('Developer / Owner', 16, y + 4.5)
    doc.text('Assigned', 80, y + 4.5)
    doc.text('Published', 110, y + 4.5)
    doc.text('In Review', 140, y + 4.5)
    doc.text('Completion', 170, y + 4.5)
    y += 7

    // Table Rows
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const topDevs = developerWorkload.slice(0, 7)
    topDevs.forEach((dev) => {
      const rate = dev.assignedCount > 0 ? Math.round((dev.publishedCount / dev.assignedCount) * 100) : 0
      doc.text(dev.developerName.substring(0, 32), 16, y + 4)
      doc.text(String(dev.assignedCount), 80, y + 4)
      doc.text(String(dev.publishedCount), 110, y + 4)
      doc.text(String(dev.inReviewCount), 140, y + 4)
      doc.text(`${rate}%`, 170, y + 4)
      y += 6
    })

    y += 6

    // Section 4: Pending Approvals
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(`3. Pending Approvals Queue (${pendingApprovals.length} pending)`, 14, y)
    y += 6

    if (pendingApprovals.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
      doc.text('All submissions have been reviewed. No pending approval backlog.', 14, y + 2)
      y += 8
    } else {
      doc.setFillColor(241, 245, 249)
      doc.rect(14, y, 182, 6, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('Content Title', 16, y + 4.5)
      doc.text('Type', 90, y + 4.5)
      doc.text('Owner', 125, y + 4.5)
      doc.text('Days Pending', 165, y + 4.5)
      y += 7

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      pendingApprovals.slice(0, 6).forEach((p) => {
        doc.text(p.item.title.substring(0, 36), 16, y + 4)
        doc.text(p.item.content_type.substring(0, 16), 90, y + 4)
        doc.text(p.item.owner_name.substring(0, 18), 125, y + 4)
        doc.text(`${p.daysPending} days ${p.isOverdue ? '(OVERDUE)' : ''}`, 165, y + 4)
        y += 6
      })
    }

    y += 6

    // Section 5: Outdated Documentation & Quality Warning
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(`4. Freshness & Quality Review Schedule (${outdatedDocumentation.length} flags)`, 14, y)
    y += 6

    if (outdatedDocumentation.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
      doc.text('All published documentation is fresh and within review cycles.', 14, y + 2)
    } else {
      doc.setFillColor(254, 242, 242)
      doc.rect(14, y, 182, 6, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(153, 27, 27)
      doc.text('Title', 16, y + 4.5)
      doc.text('Status', 100, y + 4.5)
      doc.text('Next Review Date', 140, y + 4.5)
      y += 7

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      outdatedDocumentation.slice(0, 5).forEach((od) => {
        doc.text(od.item.title.substring(0, 42), 16, y + 4)
        doc.text(od.state, 100, y + 4)
        doc.text(od.nextReview, 140, y + 4)
        y += 6
      })
    }

    // Footer
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.text('Confidential - Triple S Production ERP internal content operations report', 14, 285)
    doc.text('Page 1 of 1', 196, 285, { align: 'right' })

    doc.save(`triple-s-content-analytics-${dayjs().format('YYYY-MM-DD')}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Export Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Content Reports & Analytics
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Holistic insights into content velocity, developer workload, review turnaround, and document freshness.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:text-white flex-1 sm:flex-none text-xs"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1 sm:flex-none text-xs"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export PDF Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium">Completion Rate</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{statusStats.completionRate}%</div>
            <span className="text-[11px] text-zinc-500">
              {statusStats.published + statusStats.approved} of {statusStats.total} finalized
            </span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium">Avg Turnaround Time</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{auditMetrics.avgTurnaroundDays}d</div>
            <span className="text-[11px] text-zinc-500">Draft to publish speed</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium">Pending Approvals</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{pendingApprovals.length}</div>
            <span className="text-[11px] text-zinc-500">
              {pendingApprovals.filter((p) => p.isOverdue).length} overdue (&gt;3 days)
            </span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium">Outdated Docs</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{outdatedDocumentation.length}</div>
            <span className="text-[11px] text-zinc-500">Scheduled review passed</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800 col-span-2 sm:col-span-1">
          <CardContent className="p-3.5">
            <span className="text-xs text-zinc-400 font-medium">Total Versions</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{auditMetrics.totalRevisions}</div>
            <span className="text-[11px] text-zinc-500">{auditMetrics.totalReviewsLogged} reviews logged</span>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Status Distribution & Developer Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Distribution */}
        <Card className="lg:col-span-5 bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
              <span>Status Distribution</span>
              <Badge variant="outline" className="text-[11px] font-normal border-zinc-700">
                {statusStats.total} Items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { label: 'Published', count: statusStats.published, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Approved', count: statusStats.approved, color: 'bg-teal-500', text: 'text-teal-400' },
              { label: 'In Review', count: statusStats.inReview, color: 'bg-amber-500', text: 'text-amber-400' },
              {
                label: 'Changes Requested',
                count: statusStats.changesRequested,
                color: 'bg-rose-500',
                text: 'text-rose-400',
              },
              { label: 'Draft', count: statusStats.draft, color: 'bg-zinc-500', text: 'text-zinc-400' },
              { label: 'Archived', count: statusStats.archived, color: 'bg-purple-500', text: 'text-purple-400' },
            ].map((s) => {
              const pct = statusStats.total > 0 ? Math.round((s.count / statusStats.total) * 100) : 0
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{s.label}</span>
                    <span className={`font-semibold ${s.text}`}>
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Developer-wise Assignment & Completion */}
        <Card className="lg:col-span-7 bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
              <span>Developer Assignment & Completion</span>
              <Badge variant="outline" className="text-[11px] font-normal border-zinc-700">
                {developerWorkload.length} Contributors
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/40 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2.5">Developer / Owner</th>
                  <th className="px-3 py-2.5 text-center">Assigned</th>
                  <th className="px-3 py-2.5 text-center">Completed</th>
                  <th className="px-3 py-2.5 text-center">In Review</th>
                  <th className="px-3 py-2.5 text-center">Overdue</th>
                  <th className="px-3 py-2.5 text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {developerWorkload.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-zinc-500">
                      No assignments tracked yet.
                    </td>
                  </tr>
                ) : (
                  developerWorkload.map((dev) => {
                    const rate =
                      dev.assignedCount > 0 ? Math.round((dev.publishedCount / dev.assignedCount) * 100) : 0
                    return (
                      <tr key={dev.developerName} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-zinc-200">{dev.developerName}</td>
                        <td className="px-3 py-2.5 text-center text-zinc-300">{dev.assignedCount}</td>
                        <td className="px-3 py-2.5 text-center text-emerald-400 font-semibold">
                          {dev.publishedCount}
                        </td>
                        <td className="px-3 py-2.5 text-center text-amber-400">{dev.inReviewCount}</td>
                        <td className="px-3 py-2.5 text-center">
                          {dev.overdueCount > 0 ? (
                            <span className="text-rose-400 font-semibold">{dev.overdueCount}</span>
                          ) : (
                            <span className="text-zinc-600">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-zinc-200">{rate}%</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Pending & Overdue Approvals Report */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending & Overdue Approval Report
            </CardTitle>
            <Badge
              variant="outline"
              className={
                pendingApprovals.filter((p) => p.isOverdue).length > 0
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs'
                  : 'border-zinc-700 text-zinc-400 text-xs'
              }
            >
              {pendingApprovals.filter((p) => p.isOverdue).length} Overdue Reviews
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {pendingApprovals.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
              No pending approvals. The review backlog is completely clear!
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/40 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Content Type</th>
                  <th className="px-3 py-2.5">Owner / Submitter</th>
                  <th className="px-3 py-2.5">Submitted Date</th>
                  <th className="px-3 py-2.5">Days In Queue</th>
                  <th className="px-3 py-2.5">Review Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {pendingApprovals.map((p) => (
                  <tr key={p.item.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-zinc-200 max-w-xs truncate">{p.item.title}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.item.content_type}</td>
                    <td className="px-3 py-2.5 text-zinc-300">{p.item.owner_name}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.submittedDate}</td>
                    <td className="px-3 py-2.5">
                      <span className={p.daysPending >= 3 ? 'text-rose-400 font-bold' : 'text-zinc-300 font-medium'}>
                        {p.daysPending} {p.daysPending === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.isOverdue ? (
                        <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                          Overdue Review
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                          Pending Review
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {onViewItem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewItem(p.item)}
                          className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Published Content Report with Faceted Filter Controls */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Published Content Catalog Report
              </CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Filter and analyze live published assets across projects, content types, authors, and dates.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-xs w-fit">
              {filteredPublishedItems.length} Published Matches
            </Badge>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-3">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Project</label>
              <select
                value={publishedProjectFilter}
                onChange={(e) => setPublishedProjectFilter(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
              >
                <option value="All">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Content Type</label>
              <select
                value={publishedTypeFilter}
                onChange={(e) => setPublishedTypeFilter(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
              >
                <option value="All">All Types</option>
                {types.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Owner</label>
              <select
                value={publishedOwnerFilter}
                onChange={(e) => setPublishedOwnerFilter(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
              >
                <option value="All">All Authors</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-semibold">From Date</label>
              <input
                type="date"
                value={publishedStartDate}
                onChange={(e) => setPublishedStartDate(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-semibold">To Date</label>
              <input
                type="date"
                value={publishedEndDate}
                onChange={(e) => setPublishedEndDate(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {filteredPublishedItems.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              No published content matches the selected filters.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/40 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Project</th>
                  <th className="px-3 py-2.5">Author</th>
                  <th className="px-3 py-2.5">Version</th>
                  <th className="px-3 py-2.5">Published Date</th>
                  <th className="px-3 py-2.5">Freshness Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPublishedItems.map((item) => {
                  const freshness = computeFreshnessState(item)
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-zinc-200 max-w-xs truncate">{item.title}</td>
                      <td className="px-3 py-2.5 text-zinc-400">{item.content_type}</td>
                      <td className="px-3 py-2.5 text-zinc-300">{item.project_name || '—'}</td>
                      <td className="px-3 py-2.5 text-zinc-300">{item.owner_name}</td>
                      <td className="px-3 py-2.5 font-mono text-zinc-400">{item.version_number || 'v1.0'}</td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {item.published_at ? dayjs(item.published_at).format('DD MMM YYYY') : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={
                            freshness === 'Fresh'
                              ? 'border-emerald-500/30 text-emerald-300 text-[10px]'
                              : freshness === 'Due Soon'
                              ? 'border-amber-500/30 text-amber-300 text-[10px]'
                              : freshness === 'Outdated'
                              ? 'border-rose-500/30 text-rose-300 text-[10px]'
                              : 'border-zinc-700 text-zinc-400 text-[10px]'
                          }
                        >
                          {freshness}
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
                            View
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

      {/* Outdated Documentation Audit Report */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Outdated Documentation & Renewal Report
            </CardTitle>
            <Badge variant="outline" className="border-rose-500/30 text-rose-300 text-xs">
              {outdatedDocumentation.length} Requires Review
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {outdatedDocumentation.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
              All published documentation assets are up-to-date and compliant with quality schedules.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/40 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Last Reviewed</th>
                  <th className="px-3 py-2.5">Next Review Due</th>
                  <th className="px-3 py-2.5">Freshness State</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {outdatedDocumentation.map((od) => (
                  <tr key={od.item.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-zinc-200 max-w-xs truncate">{od.item.title}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{od.item.content_type}</td>
                    <td className="px-3 py-2.5 text-zinc-300">{od.item.owner_name}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{od.lastReviewed}</td>
                    <td className="px-3 py-2.5 font-medium text-rose-400">{od.nextReview}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        className={
                          od.state === 'Outdated'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]'
                        }
                      >
                        {od.state}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {onViewItem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewItem(od.item)}
                          className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Update / Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

