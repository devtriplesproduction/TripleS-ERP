'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Pencil,
  Loader2,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import type {
  QuickTask,
  QuickTaskStatus,
  UpdateQuickTaskInput,
} from '@/types/quick-tasks'
import {
  updateQuickTaskAction,
  deleteQuickTaskAction,
} from '@/lib/actions/quick-tasks'
import { toast } from 'sonner'

interface QuickTaskEditModalProps {
  task: QuickTask | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated: (updatedTask: QuickTask) => void
  onTaskDeleted?: (taskId: string) => void
  currentUserId?: string
}

export function QuickTaskEditModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  currentUserId,
}: QuickTaskEditModalProps) {
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<QuickTaskStatus>('Pending')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (task && isOpen) {
      setDescription(task.description || task.title || '')
      setStatus(task.status || 'Pending')
    }
  }, [task, isOpen])

  if (!task) return null

  const isPersonal = Boolean(task.is_personal || task.assigned_by === task.assigned_to)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const trimmed = description.trim()
    if (!trimmed) {
      toast.error('Task description is required')
      return
    }

    setIsSubmitting(true)
    try {
      const input: UpdateQuickTaskInput = {
        description: trimmed,
        title: trimmed.split('\n')[0].slice(0, 100),
        status,
      }

      const res = await updateQuickTaskAction(task.id, input)

      if (res.success && res.data) {
        toast.success('Task updated successfully')
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))
        onTaskUpdated(res.data)
        onClose()
      } else {
        toast.error(res.error || 'Failed to update task')
      }
    } catch {
      toast.error('Error updating task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    setIsDeleting(true)
    try {
      const res = await deleteQuickTaskAction(task.id)
      if (res.success) {
        toast.success('Task deleted')
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))
        if (onTaskDeleted) onTaskDeleted(task.id)
        onClose()
      } else {
        toast.error(res.error || 'Failed to delete task')
      }
    } catch {
      toast.error('Error deleting task')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-5 gap-4 bg-card border-border shadow-2xl rounded-2xl select-none">
        <DialogHeader className="p-0 border-b border-border/50 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="p-1 rounded-md bg-muted text-foreground">
                <Pencil className="w-4 h-4" />
              </span>
              <span>Edit Quick Task</span>
            </DialogTitle>
            {isPersonal ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border/70 bg-muted/60 text-muted-foreground flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                Personal
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                Assigned
              </span>
            )}
          </div>
          {!isPersonal && task.assigned_to_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span>Assigned to:</span>
              <span className="font-medium text-foreground">{task.assigned_to_name}</span>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Description input only */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Task Description</label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Task details or notes..."
              rows={4}
              className="text-xs bg-background min-h-[90px] max-h-[180px] rounded-lg border-border resize-none leading-relaxed"
              required
              autoFocus
            />
          </div>

          {/* Status selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Status</label>
            <div className="grid grid-cols-2 gap-1.5 bg-muted/30 p-1 rounded-lg border border-border">
              {(['Pending', 'Completed'] as QuickTaskStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-1 text-center text-xs font-medium rounded-md transition-all cursor-pointer ${
                    status === s
                      ? 'bg-foreground text-background shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="p-0 pt-3 border-t border-border/40 flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer gap-1.5 px-2.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="text-xs h-8 rounded-lg cursor-pointer border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || isDeleting || !description.trim()}
                className="text-xs h-8 font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
