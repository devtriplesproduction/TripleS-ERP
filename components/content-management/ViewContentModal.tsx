'use client'

import React, { useState } from 'react'
import {
  FileText,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Check,
  Paperclip,
  ExternalLink,
  Edit,
  ArrowRight,
  Sparkles,
  Layers,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ContentItem, ContentStatus, ContentPriority, computeDeadlineState } from '@/types/content-management'
import { AuthUser } from '@/lib/auth'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

interface ViewContentModalProps {
  item: ContentItem | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (item: ContentItem) => void
  onStatusChange?: (itemId: string, status: ContentStatus) => Promise<void> | void
  user?: AuthUser
}

export function ViewContentModal({
  item,
  isOpen,
  onClose,
  onEdit,
  onStatusChange,
  user,
}: ViewContentModalProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  if (!isOpen || !item) return null

  const deadlineState = computeDeadlineState(item.due_date, item.status)
  const isOverdue = deadlineState === 'Overdue' && item.status !== 'Completed' && item.status !== 'Published' && item.status !== 'Approved'

  const getPriorityBadge = (p?: ContentPriority) => {
    switch (p) {
      case 'Urgent':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">Urgent</Badge>
      case 'High':
        return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">High</Badge>
      case 'Medium':
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">Medium</Badge>
      case 'Low':
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600">Low</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'Completed':
      case 'Approved':
      case 'Published':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Completed</Badge>
      case 'In Review':
        return <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30">In Review</Badge>
      case 'In Progress':
      case 'Changes Requested':
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">In Progress</Badge>
      case 'To Do':
      case 'Draft':
      default:
        return <Badge className="bg-zinc-500/15 text-zinc-300 border-zinc-600">To Do</Badge>
    }
  }

  const progress = typeof item.progress === 'number'
    ? Math.min(100, Math.max(0, item.progress))
    : item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved'
    ? 100
    : item.status === 'In Review'
    ? 75
    : item.status === 'In Progress'
    ? 40
    : 0

  const handleStatusClick = async (newStatus: ContentStatus) => {
    if (!onStatusChange) return
    setUpdatingStatus(newStatus)
    try {
      await onStatusChange(item.id, newStatus)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const statusOptions: { label: string; value: ContentStatus; color: string }[] = [
    { label: 'To Do', value: 'To Do', color: 'hover:border-zinc-500 hover:text-zinc-200' },
    { label: 'In Progress', value: 'In Progress', color: 'hover:border-amber-500 hover:text-amber-300' },
    { label: 'In Review', value: 'In Review', color: 'hover:border-indigo-500 hover:text-indigo-300' },
    { label: 'Completed', value: 'Completed', color: 'hover:border-emerald-500 hover:text-emerald-300' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                {item.id}
              </span>
              <Badge variant="outline" className="border-border text-xs font-medium">
                {item.content_type || 'Content'}
              </Badge>
              {getPriorityBadge(item.priority)}
              {getStatusBadge(item.status)}
              {isOverdue && (
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[11px] font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Overdue</span>
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground leading-snug break-words">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onEdit(item)
                }}
                className="h-8 text-xs border-border/80 bg-card hover:bg-secondary/50 text-foreground rounded-md shadow-xs"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                <span>Edit</span>
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Task Completion</span>
              <span className="font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  progress >= 100
                    ? "bg-emerald-500"
                    : progress >= 60
                    ? "bg-indigo-500"
                    : progress >= 30
                    ? "bg-amber-500"
                    : "bg-zinc-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Key Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assigned Employee */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Assigned Employee</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {item.assigned_to_name || 'Unassigned'}
              </p>
              {item.assigned_role && (
                <span className="text-[11px] text-muted-foreground block">{item.assigned_role}</span>
              )}
            </div>

            {/* Dates (Start & Due) */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Schedule & Deadlines</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-medium text-foreground">
                  {item.start_date ? dayjs(item.start_date).format('DD MMM YYYY') : 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Due Date:</span>
                <span className={cn("font-medium", isOverdue ? "text-rose-400 font-bold" : "text-foreground")}>
                  {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Task Description
            </h3>
            <div className="p-4 rounded-xl bg-muted/20 border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {item.summary || item.body || 'No description provided.'}
            </div>
          </div>

          {/* Task Instructions */}
          {(item.instructions || item.creative_brief) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Task Instructions & Guidelines
              </h3>
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {item.instructions || item.creative_brief}
              </div>
            </div>
          )}

          {/* Reference Attachment */}
          {(item.reference_attachment || (item.attachments && item.attachments.length > 0)) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reference Attachment
              </h3>
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  <Paperclip className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {item.reference_attachment || item.attachments?.[0]?.file_name || 'Attached Reference Document'}
                  </span>
                </div>
                {item.attachments?.[0]?.file_url && (
                  <a
                    href={item.attachments[0].file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Status Quick Switcher */}
          {onStatusChange && (
            <div className="space-y-2.5 pt-2 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Update Task Status
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {statusOptions.map((opt) => {
                  const isCurrent =
                    item.status === opt.value ||
                    (opt.value === 'Completed' && (item.status === 'Published' || item.status === 'Approved')) ||
                    (opt.value === 'In Progress' && item.status === 'Changes Requested') ||
                    (opt.value === 'To Do' && (item.status === 'Draft' || item.status === 'Rejected'))

                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusClick(opt.value)}
                      disabled={isCurrent || updatingStatus !== null}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all shadow-xs cursor-pointer",
                        isCurrent
                          ? "bg-foreground text-background border-transparent"
                          : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                        updatingStatus === opt.value && "animate-pulse"
                      )}
                    >
                      {isCurrent ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/80 bg-card flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Created by <span className="font-medium text-foreground">{item.owner_name}</span> on{' '}
            {dayjs(item.created_at).format('DD MMM YYYY')}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="border-border/80 bg-card hover:bg-secondary/50 text-foreground rounded-md shadow-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
