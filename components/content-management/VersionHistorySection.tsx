'use client'

import React, { useState } from 'react'
import {
  GitBranch,
  RotateCcw,
  Eye,
  FileText,
  Calendar,
  User,
  Search,
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ContentItem, ContentVersionRecord } from '@/types/content-management'
import dayjs from 'dayjs'

interface VersionHistorySectionProps {
  items: ContentItem[]
  isAuthorizedManager?: boolean
  user?: any
  onRestoreVersion: (contentId: string, versionNumber: number) => Promise<void>
  onViewContent?: (item: ContentItem) => void
  onViewItem?: (item: ContentItem) => void
}

export function VersionHistorySection({
  items,
  isAuthorizedManager: isAuthProp,
  user,
  onRestoreVersion,
  onViewContent,
  onViewItem,
}: VersionHistorySectionProps) {
  const isAuthorizedManager = isAuthProp ?? (user ? (user.role === 'Admin' || user.is_hod) : false)
  const viewHandler = onViewContent || onViewItem || (() => {})
  const [selectedContentId, setSelectedContentId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [inspectVersion, setInspectVersion] = useState<ContentVersionRecord | null>(null)
  const [restoringVersionNumber, setRestoringVersionNumber] = useState<{ contentId: string; ver: number } | null>(null)

  // Aggregate all version records across items
  interface FlatVersionEntry extends ContentVersionRecord {
    current_item_title: string
    is_latest: boolean
  }

  const allVersions: FlatVersionEntry[] = []
  items.forEach(item => {
    const history = item.version_history || []
    history.forEach(ver => {
      allVersions.push({
        ...ver,
        current_item_title: item.title,
        is_latest: ver.version_number === (item.version || 1),
      })
    })
  })

  // Filter versions
  const filteredVersions = allVersions.filter(ver => {
    const matchesContent = selectedContentId === 'ALL' || ver.content_id === selectedContentId
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q ||
      ver.title.toLowerCase().includes(q) ||
      ver.current_item_title.toLowerCase().includes(q) ||
      ver.created_by_name.toLowerCase().includes(q) ||
      (ver.change_summary && ver.change_summary.toLowerCase().includes(q))
    return matchesContent && matchesSearch
  })

  // Sort newest first
  filteredVersions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const handleRestore = async (contentId: string, versionNumber: number, title: string) => {
    const confirmed = window.confirm(
      `Restore revision v${versionNumber}.0 of "${title}"? This will create a NEW version preserving all historical records.`
    )
    if (!confirmed) return

    setRestoringVersionNumber({ contentId, ver: versionNumber })
    try {
      await onRestoreVersion(contentId, versionNumber)
    } finally {
      setRestoringVersionNumber(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            <span>Version Management & Historical Snapshots</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Full immutable revision history of all document iterations. Restoring a previous version generates a new version without overwriting past revisions.
          </p>
        </div>

        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs py-1 px-3">
          {allVersions.length} Total Revisions Recorded
        </Badge>
      </div>

      {/* Filter Bar */}
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardContent className="pt-4 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or change note..."
              className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-200"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedContentId}
              onChange={(e) => setSelectedContentId(e.target.value)}
              className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Documents ({items.length})</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.id}] {item.title} (v{item.version || 1}.0)
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Version Table / Cards */}
      <div className="space-y-3">
        {filteredVersions.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-950/40">
            <CardContent className="py-12 text-center text-xs text-zinc-500">
              <History className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              No version history records match your search query or filter.
            </CardContent>
          </Card>
        ) : (
          filteredVersions.map((entry) => {
            const isRestoring = restoringVersionNumber?.contentId === entry.content_id && restoringVersionNumber?.ver === entry.version_number
            const isInspecting = inspectVersion?.id === entry.id
            const parentItem = items.find(i => i.id === entry.content_id)

            return (
              <div
                key={entry.id}
                className={`p-4 bg-zinc-950/80 border rounded-xl transition-all ${
                  entry.is_latest
                    ? 'border-indigo-500/40 shadow-xs'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                        {entry.version_label || `v${entry.version_number}.0`}
                      </span>
                      {entry.is_latest ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Active Head Version
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800">
                          Historical Revision
                        </Badge>
                      )}
                      <span className="text-zinc-600">&bull;</span>
                      <span className="text-xs font-mono text-zinc-400">{entry.content_id}</span>
                      <span className="text-zinc-600">&bull;</span>
                      <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                        {entry.status}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100 truncate">{entry.title}</h3>

                    {entry.change_summary && (
                      <p className="text-xs text-zinc-300 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60 inline-block">
                        <strong className="text-zinc-500 not-italic">Change Summary: </strong>
                        {entry.change_summary}
                      </p>
                    )}
                  </div>

                  {/* Metadata and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-2 lg:pt-0">
                    <div className="text-xs text-zinc-400 space-y-0.5 lg:text-right">
                      <div>
                        Modified by <strong className="text-zinc-200">{entry.created_by_name}</strong>
                      </div>
                      <div className="text-zinc-500 text-[11px] flex items-center lg:justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dayjs(entry.created_at).format('DD MMM YYYY, hh:mm A')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectVersion(isInspecting ? null : entry)}
                        className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {isInspecting ? 'Hide Snapshot' : 'Inspect'}
                      </Button>

                      {!entry.is_latest && isAuthorizedManager && (
                        <Button
                          size="sm"
                          disabled={isRestoring}
                          onClick={() => handleRestore(entry.content_id, entry.version_number, entry.title)}
                          className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          {isRestoring ? 'Restoring...' : 'Restore as New Version'}
                        </Button>
                      )}

                      {parentItem && (
                        <Button
                          size="sm"
                          onClick={() => viewHandler(parentItem)}
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                        >
                          View Live Doc
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inspect Snapshot Modal/Accordion */}
                {isInspecting && (
                  <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                        <span>Snapshot Content ({entry.version_label || `v${entry.version_number}.0`})</span>
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">
                          {entry.content_type}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">ID: {entry.id}</span>
                    </div>

                    {entry.summary && (
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Executive Summary</span>
                        <p className="text-xs text-zinc-300 p-2.5 bg-zinc-950 rounded border border-zinc-800 italic">
                          {entry.summary}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Markdown Body Snapshot</span>
                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                        {entry.body}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

