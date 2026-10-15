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
  Check,
  Calendar,
  Loader2,
  Plus,
} from 'lucide-react'
import type {
  QuickTaskPriority,
  CreateQuickTaskInput,
  QuickTask,
} from '@/types/quick-tasks'
import { createQuickTasksAction } from '@/lib/actions/quick-tasks'
import { AssignableEmployee, getAssignableEmployees } from '@/lib/actions/team'
import { TaskAssigneeSelector } from '@/components/tasks/TaskAssigneeSelector'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

interface CreateQuickTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: (tasks: QuickTask[]) => void
}

export function CreateQuickTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
}: CreateQuickTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [priority, setPriority] = useState<QuickTaskPriority>('Medium')
  const [dueDate, setDueDate] = useState('')

  const [employees, setEmployees] = useState<AssignableEmployee[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load assignable employees when opened
  useEffect(() => {
    if (isOpen) {
      getAssignableEmployees().then((res) => {
        if (res.success && res.data) {
          setEmployees(res.data)
        }
      })
    } else {
      // Reset form state on close
      setTitle('')
      setDescription('')
      setSelectedUserIds([])
      setPriority('Medium')
      setDueDate('')
    }
  }, [isOpen])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Task title is required')
      return
    }

    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one assignee')
      return
    }

    setIsSubmitting(true)
    try {
      const input: CreateQuickTaskInput = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        assigned_to: selectedUserIds,
        due_date: dueDate || undefined,
        priority,
      }

      const res = await createQuickTasksAction(input)

      if (res.success && res.data) {
        toast.success(
          selectedUserIds.length > 1
            ? `Assigned task to ${selectedUserIds.length} members`
            : 'Task assigned successfully'
        )

        // Broadcast notifications
        try {
          const bc = new BroadcastChannel('erp-notifications-channel')
          bc.postMessage({ type: 'QUICK_TASK_CREATED' })
          bc.close()
        } catch {}
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))

        onTaskCreated(res.data)
        onClose()
      } else {
        toast.error(res.error || 'Failed to assign task')
      }
    } catch {
      toast.error('Error assigning task')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-5 gap-4 bg-card border-border shadow-2xl rounded-2xl select-none">
        <DialogHeader className="p-0 border-b border-border/50 pb-3">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="p-1 rounded-md bg-muted text-foreground">
              <Plus className="w-4 h-4" />
            </span>
            <span>Assign Quick Task</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and assign casual, non-project tasks to HR or employees.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Task Title</span>
              <span className="text-[10px] text-muted-foreground font-normal">Required</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verify onboarding doc signoff"
              className="text-xs bg-background h-9 rounded-lg border-border focus-visible:ring-1 focus-visible:ring-foreground"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Description</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
            </label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Add relevant notes or instructions..."
              className="text-xs bg-background min-h-[64px] max-h-[120px] rounded-lg border-border resize-none leading-relaxed focus-visible:ring-1 focus-visible:ring-foreground"
            />
          </div>

          {/* Reused TaskAssigneeSelector component */}
          <TaskAssigneeSelector
            employees={employees}
            selectedAssignees={selectedUserIds}
            onChange={setSelectedUserIds}
            label="Assign To"
            popoverAlign="start"
          />

          {/* Row: Priority & Due Date */}
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
              disabled={isSubmitting || !title.trim() || selectedUserIds.length === 0}
              className="text-xs h-8 rounded-lg cursor-pointer bg-foreground text-background hover:bg-foreground/90 font-medium gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Assign Task{selectedUserIds.length > 1 ? ` (${selectedUserIds.length})` : ''}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
