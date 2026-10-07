'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import { Task, TaskStatus, TaskPriority, Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { createTaskAction, updateTaskAction } from '@/lib/actions/tasks'
import { toast } from 'sonner'
import { Loader2, Check } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projects: Array<{ id: string; name: string }>
  employees: AssignableEmployee[]
  defaultProjectId?: string
  defaultStatus?: TaskStatus
  taskToEdit?: Task | null
}

const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ON_HOLD']
const ALL_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function TaskModal({
  isOpen,
  onClose,
  onSuccess,
  projects,
  employees,
  defaultProjectId,
  defaultStatus,
  taskToEdit,
}: TaskModalProps) {
  const isEditing = !!taskToEdit

  const [title, setTitle] = useState(taskToEdit?.title || '')
  const [description, setDescription] = useState(taskToEdit?.description || '')
  const [projectId, setProjectId] = useState(taskToEdit?.project_id || defaultProjectId || '')
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority || 'MEDIUM')
  const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status || defaultStatus || 'TODO')
  const [startDate, setStartDate] = useState(taskToEdit?.start_date || '')
  const [dueDate, setDueDate] = useState(taskToEdit?.due_date || '')
  const [estimatedHours, setEstimatedHours] = useState(
    taskToEdit?.estimated_hours ? String(taskToEdit.estimated_hours) : ''
  )
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    (taskToEdit?.assignees || []).map((a) => a.user_id)
  )

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const toggleAssignee = (empId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMsg('Task Title is required.')
      return
    }

    if (!projectId) {
      setErrorMsg('Please select a project.')
      return
    }

    setLoading(true)

    try {
      const parsedHours = estimatedHours ? parseFloat(estimatedHours) : 0

      if (isEditing && taskToEdit) {
        const res = await updateTaskAction({
          id: taskToEdit.id,
          title: trimmedTitle,
          description: description.trim() || null,
          priority,
          status,
          start_date: startDate || null,
          due_date: dueDate || null,
          estimated_hours: parsedHours,
          assignees: selectedAssignees,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update task.')
          toast.error(res.error || 'Failed to update task.')
        } else {
          toast.success('Task updated successfully.')
          onSuccess()
          onClose()
        }
      } else {
        const res = await createTaskAction({
          title: trimmedTitle,
          description: description.trim() || null,
          project_id: projectId,
          priority,
          status,
          start_date: startDate || null,
          due_date: dueDate || null,
          estimated_hours: parsedHours,
          assignees: selectedAssignees,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create task.')
          toast.error(res.error || 'Failed to create task.')
        } else {
          toast.success('Task created successfully.')
          onSuccess()
          onClose()
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Task Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="e.g. Implement Authentication and RBAC"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input border-border"
              required
            />
          </div>

          {/* Project & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Dropdown
              id="task-project"
              label="Project"
              required
              placeholder="Select project"
              value={projectId}
              onChange={setProjectId}
              disabled={isEditing || !!defaultProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              buttonClassName="bg-input border-border w-full"
            />

            <Dropdown
              id="task-priority"
              label="Priority"
              value={priority}
              onChange={(val) => setPriority(val as TaskPriority)}
              options={ALL_PRIORITIES.map((pr) => ({ value: pr, label: pr }))}
              buttonClassName="bg-input border-border w-full"
            />
          </div>

          {/* Status & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Dropdown
              id="task-status"
              label="Status"
              value={status}
              onChange={(val) => setStatus(val as TaskStatus)}
              options={ALL_STATUSES.map((st) => ({
                value: st,
                label: st.replace('_', ' '),
              }))}
              buttonClassName="bg-input border-border w-full"
            />

            <div className="space-y-1.5">
              <Label htmlFor="task-hours" className="text-sm font-medium">
                Estimated Hours
              </Label>
              <Input
                id="task-hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 8"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="bg-input border-border"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start" className="text-sm font-medium">
                Start Date
              </Label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
                className="h-10 text-xs sm:text-sm bg-input border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due" className="text-sm font-medium">
                Due Date
              </Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
                className="h-10 text-xs sm:text-sm bg-input border-border"
              />
            </div>
          </div>

          {/* Multi-Assignee Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Assign Team Members ({selectedAssignees.length} selected)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-secondary/20 border border-border rounded-md">
              {employees.map((emp) => {
                const isSelected = selectedAssignees.includes(emp.id)
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleAssignee(emp.id)}
                    className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-accent border-foreground/40 text-foreground font-medium'
                        : 'border-transparent hover:bg-secondary/60 text-muted-foreground'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-foreground truncate">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.designation || 'Team Member'}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-foreground shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-sm font-medium">
              Description & Specifications
            </Label>
            <textarea
              id="task-desc"
              rows={3}
              placeholder="Task details, requirements, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm bg-input border border-border rounded-md p-2.5 outline-hidden focus:border-foreground/50 transition-colors"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
