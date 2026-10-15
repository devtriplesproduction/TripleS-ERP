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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Pencil,
  Calendar,
  Loader2,
  Check,
  Ban,
} from 'lucide-react'
import type {
  QuickTask,
  QuickTaskPriority,
  QuickTaskStatus,
  UpdateQuickTaskInput,
} from '@/types/quick-tasks'
import { updateQuickTaskAction } from '@/lib/actions/quick-tasks'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

interface QuickTaskEditModalProps {
  task: QuickTask | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated: (updatedTask: QuickTask) => void
}

export function QuickTaskEditModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
}: QuickTaskEditModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<QuickTaskPriority>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<QuickTaskStatus>('Pending')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'Medium')
      setDueDate(task.due_date || '')
      setStatus(task.status || 'Pending')
    }
  }, [task, isOpen])

  if (!task) return null

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Task title is required')
      return
    }

    setIsSubmitting(true)
    try {
      const input: UpdateQuickTaskInput = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || null,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-5 gap-4 bg-card border-border shadow-2xl rounded-2xl select-none">
        <DialogHeader className="p-0 border-b border-border/50 pb-3">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="p-1 rounded-md bg-muted text-foreground">
              <Pencil className="w-4 h-4" />
            </span>
            <span>Edit Quick Task</span>
          </DialogTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>Assigned to:</span>
            <span className="font-medium text-foreground">{task.assigned_to_name || 'Employee'}</span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Task Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs bg-background h-9 rounded-lg border-border"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="text-xs bg-background min-h-[64px] max-h-[120px] rounded-lg border-border resize-none leading-relaxed"
            />
          </div>

          {/* Status selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Status</label>
            <div className="grid grid-cols-3 gap-1 bg-muted/30 p-1 rounded-lg border border-border">
              {(['Pending', 'Completed', 'Cancelled'] as QuickTaskStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-1 text-center text-xs font-medium rounded-md transition-all cursor-pointer ${
                    status === s
                      ? s === 'Cancelled'
                        ? 'bg-destructive/10 text-destructive border border-destructive/30 font-semibold'
                        : 'bg-foreground text-background shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Priority</label>
              <div className="grid grid-cols-3 gap-1 bg-muted/30 p-1 rounded-lg border border-border">
                {(['Low', 'Medium', 'High'] as QuickTaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1 text-center text-xs font-medium rounded-md transition-all cursor-pointer ${
                      priority === p
                        ? 'bg-foreground text-background shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>Due Date</span>
              </label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
                className="text-xs bg-background h-9 rounded-lg border-border"
                isClearable
              />
            </div>
          </div>

          <DialogFooter className="p-0 pt-3 border-t border-border/40 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8 rounded-lg cursor-pointer border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="text-xs h-8 rounded-lg cursor-pointer bg-foreground text-background hover:bg-foreground/90 font-medium gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
