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
  Plus,
  Loader2,
} from 'lucide-react'
import type {
  CreateQuickTaskInput,
  QuickTask,
} from '@/types/quick-tasks'
import { createQuickTasksAction } from '@/lib/actions/quick-tasks'
import { AssignableEmployee, getAssignableEmployees } from '@/lib/actions/team'
import { TaskAssigneeSelector } from '@/components/tasks/TaskAssigneeSelector'
import { toast } from 'sonner'
import type { AuthUser } from '@/lib/auth'

interface CreateQuickTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: (tasks: QuickTask[]) => void
  user?: AuthUser
}

export function CreateQuickTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  user,
}: CreateQuickTaskModalProps) {
  const isAdmin = user?.role === 'Admin'
  const [description, setDescription] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [employees, setEmployees] = useState<AssignableEmployee[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load assignable employees when opened (Admin only)
  useEffect(() => {
    if (isOpen && isAdmin) {
      getAssignableEmployees().then((res) => {
        if (res.success && res.data) {
          setEmployees(res.data)
        }
      })
    }
    if (!isOpen) {
      // Reset form state on close
      setDescription('')
      setSelectedUserIds([])
    }
  }, [isOpen, isAdmin])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const trimmed = description.trim()
    if (!trimmed) {
      toast.error('Task description is required')
      return
    }

    setIsSubmitting(true)
    try {
      const input: CreateQuickTaskInput = {
        description: trimmed,
        assigned_to: selectedUserIds,
      }

      const res = await createQuickTasksAction(input)

      if (res.success && res.data) {
        const isPersonal = selectedUserIds.length === 0 || (selectedUserIds.length === 1 && selectedUserIds[0] === user?.id)
        toast.success(
          isPersonal
            ? 'Personal task created'
            : selectedUserIds.length > 1
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
        toast.error(res.error || 'Failed to create task')
      }
    } catch {
      toast.error('Error creating task')
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
              <Plus className="w-4 h-4" />
            </span>
            <span>{isAdmin && selectedUserIds.length > 0 ? 'Assign Quick Task' : 'New Quick Task'}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAdmin
              ? 'Add a quick personal task, or select team members to assign it.'
              : 'Add a personal quick task for yourself.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Task Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Task Description</span>
              <span className="text-[10px] text-muted-foreground font-normal">Required</span>
            </label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Task details or notes..."
              rows={4}
              className="text-xs bg-background min-h-[90px] max-h-[180px] rounded-lg border-border resize-none leading-relaxed focus-visible:ring-1 focus-visible:ring-foreground"
              required
              autoFocus
            />
          </div>

          {/* Reused TaskAssigneeSelector component (Admin only) */}
          {isAdmin && (
            <div className="space-y-1">
              <TaskAssigneeSelector
                employees={employees}
                selectedAssignees={selectedUserIds}
                onChange={setSelectedUserIds}
                label="Assign To"
                popoverAlign="start"
              />
              <p className="text-[10px] text-muted-foreground/70">
                Leave empty to save as your own personal task.
              </p>
            </div>
          )}

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
              disabled={isSubmitting || !description.trim()}
              className="text-xs h-8 font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{selectedUserIds.length > 0 ? 'Assign Task' : 'Save Task'}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
