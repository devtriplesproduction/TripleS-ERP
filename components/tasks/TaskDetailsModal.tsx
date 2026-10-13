'use client'

import { useState } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types/project-management'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { updateTaskStatusAction, addTaskCommentAction, logTaskHoursAction } from '@/lib/actions/tasks'
import { toast } from 'sonner'
import { Calendar, Clock, AlertCircle, MessageSquare, Send, User, Loader2, Edit } from 'lucide-react'
import dayjs from 'dayjs'

interface TaskDetailsModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  canManage: boolean
  onEditTask?: (task: Task) => void
}

const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ON_HOLD']

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onUpdate,
  canManage,
  onEditTask,
}: TaskDetailsModalProps) {
  const [commentText, setCommentText] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [hoursToAdd, setHoursToAdd] = useState('')
  const [loggingHours, setLoggingHours] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  if (!task) return null

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setUpdatingStatus(true)
    try {
      const res = await updateTaskStatusAction(task.id, newStatus)
      if (!res.success) {
        toast.error(res.error || 'Failed to update status.')
      } else {
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
        onUpdate()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = commentText.trim()
    if (!trimmed) return

    setAddingComment(true)
    try {
      const res = await addTaskCommentAction(task.id, trimmed)
      if (!res.success) {
        toast.error(res.error || 'Failed to add comment.')
      } else {
        setCommentText('')
        toast.success('Comment added.')
        onUpdate()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding comment')
    } finally {
      setAddingComment(false)
    }
  }

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(hoursToAdd)
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid positive number of hours.')
      return
    }

    setLoggingHours(true)
    try {
      const res = await logTaskHoursAction(task.id, num)
      if (!res.success) {
        toast.error(res.error || 'Failed to log hours.')
      } else {
        setHoursToAdd('')
        toast.success(`Logged ${num} operational hours.`)
        onUpdate()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error logging hours')
    } finally {
      setLoggingHours(false)
    }
  }

  const assignees = task.assignees || []
  const comments = task.comments || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[950px] w-[95vw] sm:w-[90vw] max-h-[90vh] flex flex-col gap-0 bg-card border-border text-foreground p-0 overflow-hidden">
        <DialogHeader className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-border/50 shrink-0 pr-14 space-y-2 bg-card">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-semibold text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border/50">
              {task.task_id_display}
            </span>
            <div className="flex items-center gap-2">
              {canManage && onEditTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onEditTask(task)
                  }}
                  className="h-8 px-3 text-xs"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit Task
                </Button>
              )}
            </div>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
            {task.title}
          </DialogTitle>

          {task.project_name && (
            <p className="text-xs text-muted-foreground">
              Project: <span className="font-medium text-foreground">{task.project_name}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Quick status & Priority */}
          <div className="flex items-center justify-between gap-4 p-3.5 sm:p-4 bg-secondary/30 rounded-lg flex-wrap border border-border/40">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Status</span>
              <Select
                value={task.status}
                onValueChange={(val) => handleStatusChange(val as TaskStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="bg-card border-border h-9 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ALL_STATUSES.filter(st => canManage || st !== 'DONE').map((st) => (
                    <SelectItem key={st} value={st}>
                      {st.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority:</span>
              <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold">
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</h5>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words break-all bg-secondary/15 p-4 rounded-lg border border-border/50 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Meta Grid: Dates & Operational Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Dates */}
            <div className="p-3.5 sm:p-4 bg-secondary/20 rounded-lg border border-border/60 space-y-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px] block">Schedule</span>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="text-foreground font-medium">
                    {task.start_date ? dayjs(task.start_date).format('DD MMM YYYY') : 'Unset'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className={task.is_overdue ? 'text-destructive font-bold' : 'text-foreground font-medium'}>
                    {task.due_date ? dayjs(task.due_date).format('DD MMM YYYY') : 'Unset'}
                  </span>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="p-3.5 sm:p-4 bg-secondary/20 rounded-lg border border-border/60 space-y-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px] block">Operational Hours</span>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated Hours:</span>
                  <span className="font-mono font-medium text-foreground">{task.estimated_hours || 0} hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Logged Hours:</span>
                  <span className="font-mono font-bold text-foreground">{task.worked_hours || 0} hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Log Operational Hours Form */}
          <form onSubmit={handleLogHours} className="p-3.5 bg-secondary/20 rounded-lg border border-border/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Log worked operational hours:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="e.g. 2.5"
                value={hoursToAdd}
                onChange={(e) => setHoursToAdd(e.target.value)}
                className="h-9 text-xs bg-card border-border w-full sm:w-48"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loggingHours}
                className="h-9 px-4 text-xs shrink-0 bg-primary text-primary-foreground font-medium"
              >
                {loggingHours && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Log Time
              </Button>
            </div>
          </form>

          {/* Assignees */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Team ({assignees.length})
            </h5>
            {assignees.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No team members assigned yet.</p>
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap">
                {assignees.map((a) => {
                  const name = a.profile
                    ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim()
                    : 'User'
                  const initials = name.slice(0, 2).toUpperCase()
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 py-1 px-3 bg-secondary/40 border border-border rounded-full text-xs"
                    >
                      <Avatar className="h-6 w-6 border border-card bg-secondary text-[10px]">
                        {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} alt={name} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{name}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Comments & Discussion ({comments.length})
            </h5>

            {/* Comment Thread */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto p-1">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No comments yet. Start the conversation below.</p>
              ) : (
                comments.map((c) => {
                  const author = c.user_profile
                    ? `${c.user_profile.first_name || ''} ${c.user_profile.last_name || ''}`.trim()
                    : 'Team Member'
                  return (
                    <div key={c.id} className="p-3 bg-secondary/30 border border-border/70 rounded-md space-y-1 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground">{author}</span>
                        <span className="text-[10px] shrink-0 ml-2">{dayjs(c.created_at).format('DD MMM, hh:mm A')}</span>
                      </div>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words break-all overflow-hidden">{c.comment}</p>
                    </div>
                  )
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <Input
                placeholder="Write a comment or status update..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-10 text-xs bg-card border-border"
              />
              <Button
                type="submit"
                disabled={addingComment}
                className="h-10 px-4 shrink-0 bg-primary text-primary-foreground font-medium"
              >
                {addingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
