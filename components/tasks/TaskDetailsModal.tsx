'use client'

import { useState } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types/project-management'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-5 sm:p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
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

          <DialogTitle className="text-xl font-bold leading-tight text-foreground">
            {task.title}
          </DialogTitle>

          {task.project_name && (
            <p className="text-xs text-muted-foreground">Project: {task.project_name}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Quick status & Priority */}
          <div className="flex items-center justify-between gap-4 p-3 bg-secondary/30 rounded-lg flex-wrap">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Current Status</span>
              <Select
                value={task.status}
                onValueChange={(val) => handleStatusChange(val as TaskStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="bg-card border-border h-9 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ALL_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[11px] font-medium text-muted-foreground uppercase block">Priority</span>
              <Badge variant="outline" className="text-xs px-2.5 py-1">
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1.5">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase">Description</h5>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words break-all bg-secondary/15 p-3 rounded-md border border-border/50 overflow-hidden">
                {task.description}
              </p>
            </div>
          )}

          {/* Meta Grid: Dates & Operational Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Dates */}
            <div className="p-3 bg-secondary/20 rounded-md border border-border/60 space-y-1.5">
              <span className="text-muted-foreground font-medium block">Schedule</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start:</span>
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
            <div className="p-3 bg-secondary/20 rounded-md border border-border/60 space-y-1.5">
              <span className="text-muted-foreground font-medium block">Operational Hours</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span className="font-mono font-medium text-foreground">{task.estimated_hours || 0} hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Logged:</span>
                  <span className="font-mono font-bold text-foreground">{task.worked_hours || 0} hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Log Operational Hours Form */}
          <form onSubmit={handleLogHours} className="p-3 bg-secondary/20 rounded-md border border-border/60 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              placeholder="Add worked hours (e.g. 2.5)"
              value={hoursToAdd}
              onChange={(e) => setHoursToAdd(e.target.value)}
              className="h-9 text-xs bg-card border-border"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loggingHours}
              className="h-9 px-3 text-xs shrink-0 bg-primary text-primary-foreground"
            >
              {loggingHours && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Log Time
            </Button>
          </form>

          {/* Assignees */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase">
              Assigned Team ({assignees.length})
            </h5>
            {assignees.length === 0 ? (
              <p className="text-xs text-muted-foreground">No assignees yet.</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {assignees.map((a) => {
                  const name = a.profile
                    ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim()
                    : 'User'
                  const initials = name.slice(0, 2).toUpperCase()
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 p-1.5 pr-3 bg-secondary/40 border border-border rounded-full text-xs"
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
            <h5 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Comments & Discussion ({comments.length})
            </h5>

            {/* Comment Thread */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto p-1">
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
                className="h-10 px-4 shrink-0 bg-primary text-primary-foreground"
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

        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
