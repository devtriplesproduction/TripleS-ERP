'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import { Task, TaskStatus, TaskPriority } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { createTaskAction, updateTaskAction } from '@/lib/actions/tasks'
import { toast } from 'sonner'
import { Loader2, Check, User, CheckSquare, Plus, X, Search, Pencil, Trash2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import { TaskAssigneeSelector } from './TaskAssigneeSelector'
import { cn } from '@/lib/utils'

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (task?: Task) => void
  projects: Array<{ id: string; name: string }>
  employees: AssignableEmployee[]
  defaultProjectId?: string
  defaultStatus?: TaskStatus
  taskToEdit?: Task | null
}

const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ON_HOLD']
const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  ON_HOLD: 'On Hold',
}

const ALL_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSuccess,
  projects,
  employees,
  defaultProjectId,
  defaultStatus = 'TODO',
  taskToEdit,
}: TaskFormModalProps) {
  const isEditing = !!taskToEdit

  const [title, setTitle] = useState(taskToEdit?.title || '')
  const [description, setDescription] = useState(taskToEdit?.description || '')
  const [projectId, setProjectId] = useState(taskToEdit?.project_id || defaultProjectId || '')
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority || 'MEDIUM')
  const [status, setStatus] = useState<TaskStatus>(
    isEditing ? (taskToEdit?.status || 'TODO') : 'TODO'
  )
  const [startDate, setStartDate] = useState(taskToEdit?.start_date || '')
  const [dueDate, setDueDate] = useState(taskToEdit?.due_date || '')
  const [estimatedHours, setEstimatedHours] = useState(
    taskToEdit?.estimated_hours ? String(taskToEdit.estimated_hours) : ''
  )

  // Assignees state
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    (taskToEdit?.assignees || []).map((a) => a.user_id)
  )
  const [isMemberPopoverOpen, setIsMemberPopoverOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  // Execution Checklist state
  const [checklist, setChecklist] = useState<Array<{ id: string; title: string; is_completed: boolean; order_index: number }>>(
    (taskToEdit?.checklist || []).map((c, i) => ({
      id: c.id,
      title: c.title,
      is_completed: c.is_completed,
      order_index: c.order_index ?? i,
    }))
  )
  const [newChecklistText, setNewChecklistText] = useState('')
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((emp) =>
      emp.name.toLowerCase().includes(q) ||
      (emp.designation && emp.designation.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    )
  }, [employees, memberSearchQuery])

  const removeAssignee = (empId: string) => {
    setSelectedAssignees((prev) => prev.filter((id) => id !== empId))
  }

  const toggleAssignee = (empId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistText.trim()
    if (!trimmed) return
    const newItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: trimmed,
      is_completed: false,
      order_index: checklist.length,
    }
    setChecklist((prev) => [...prev, newItem])
    setNewChecklistText('')
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_completed: !item.is_completed } : item
      )
    )
  }

  const deleteChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id))
  }

  const startEditChecklistItem = (id: string, currentTitle: string) => {
    setEditingChecklistId(id)
    setEditingChecklistText(currentTitle)
  }

  const saveEditChecklistItem = (id: string) => {
    const trimmed = editingChecklistText.trim()
    if (!trimmed) {
      deleteChecklistItem(id)
    } else {
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, title: trimmed } : item
        )
      )
    }
    setEditingChecklistId(null)
    setEditingChecklistText('')
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
      const formattedChecklist = checklist.map((item, idx) => ({
        id: item.id.startsWith('temp-') ? undefined : item.id,
        title: item.title,
        is_completed: item.is_completed,
        order_index: idx,
      }))

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
          checklist: formattedChecklist,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update task.')
          toast.error(res.error || 'Failed to update task.')
        } else {
          toast.success('Task updated successfully.')
          onSuccess(res.data)
          onClose()
        }
      } else {
        const res = await createTaskAction({
          title: trimmedTitle,
          description: description.trim() || null,
          project_id: projectId,
          priority,
          status: 'TODO',
          start_date: startDate || null,
          due_date: dueDate || null,
          estimated_hours: parsedHours,
          assignees: selectedAssignees,
          checklist: formattedChecklist,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create task.')
          toast.error(res.error || 'Failed to create task.')
        } else {
          toast.success('Task created successfully.')
          onSuccess(res.data)
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
      <DialogContent 
        className="!max-w-[1020px] w-[90vw] max-h-[90dvh] flex flex-col gap-0 bg-card border-border text-foreground p-0 overflow-hidden"
      >
        <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 mx-5 sm:mx-6 mt-2 rounded-md shrink-0">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
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
                className="bg-background border-border"
                required
              />
            </div>

            {/* Project & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Dropdown
                id="task-project"
                label="Project"
                required
                placeholder="Select project"
                value={projectId}
                onChange={setProjectId}
                disabled={isEditing || !!defaultProjectId}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                buttonClassName="bg-background border-border w-full"
              />

              <Dropdown
                id="task-priority"
                label="Priority"
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={ALL_PRIORITIES.map((pr) => ({ value: pr, label: priorityLabels[pr] }))}
                buttonClassName="bg-background border-border w-full"
              />
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
                className="w-full text-sm bg-background border border-border rounded-md p-2.5 outline-hidden focus:border-foreground/50 transition-colors"
              />
            </div>

            {/* Status & Estimated Hours & Dates */}
            {isEditing ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <Dropdown
                    id="task-status"
                    label="Status"
                    value={status}
                    onChange={(val) => setStatus(val as TaskStatus)}
                    options={ALL_STATUSES.map((st) => ({
                      value: st,
                      label: statusLabels[st],
                    }))}
                    buttonClassName="bg-background border-border w-full"
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
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-start" className="text-sm font-medium">
                      Start Date
                    </Label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                      className="h-10 text-xs sm:text-sm bg-background border-border"
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
                      className="h-10 text-xs sm:text-sm bg-background border-border"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-start" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                    className="h-10 text-xs sm:text-sm bg-background border-border"
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
                    className="h-10 text-xs sm:text-sm bg-background border-border"
                  />
                </div>
              </div>
            )}

            {/* 1. Assign Members — Multi-select (Matching UI Reference) */}
            <TaskAssigneeSelector
              employees={employees}
              selectedAssignees={selectedAssignees}
              onChange={setSelectedAssignees}
              taskAssigneesFallback={taskToEdit?.assignees}
            />

            {/* 2. Execution Checklist — Optional (Matching UI Reference) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>EXECUTION CHECKLIST (OPTIONAL)</span>
                </div>
                {checklist.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {checklist.filter((c) => c.is_completed).length}/{checklist.length} completed
                  </span>
                )}
              </div>

              {/* Input Row */}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Add a checklist item + Enter"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddChecklistItem()
                    }
                  }}
                  className="h-10 text-xs sm:text-sm bg-background border-border/80 rounded-xl focus:border-foreground/50 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    handleAddChecklistItem()
                  }}
                  className="h-10 px-5 rounded-full bg-secondary/80 hover:bg-secondary text-foreground font-semibold text-xs border border-border/60 shrink-0 cursor-pointer"
                >
                  Add
                </Button>
              </div>

              {/* Checklist Items List */}
              {checklist.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {checklist.map((item) => {
                    const isEditingThis = editingChecklistId === item.id
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-background/50 transition-colors group",
                          item.is_completed ? "border-border/40 bg-muted/20" : "border-border/70 hover:border-border"
                        )}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleChecklistItem(item.id)}
                            className={cn(
                              "w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                              item.is_completed
                                ? "bg-foreground border-foreground text-background"
                                : "border-muted-foreground/50 hover:border-foreground text-foreground"
                            )}
                            aria-label={item.is_completed ? "Mark incomplete" : "Mark complete"}
                          >
                            {item.is_completed && <Check className="h-3 w-3 stroke-[3]" />}
                          </button>

                          {isEditingThis ? (
                            <input
                              type="text"
                              value={editingChecklistText}
                              onChange={(e) => setEditingChecklistText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  saveEditChecklistItem(item.id)
                                } else if (e.key === 'Escape') {
                                  setEditingChecklistId(null)
                                }
                              }}
                              onBlur={() => saveEditChecklistItem(item.id)}
                              autoFocus
                              className="flex-1 bg-background px-2 py-0.5 text-xs rounded border border-foreground/50 text-foreground outline-none"
                            />
                          ) : (
                            <span
                              onClick={() => startEditChecklistItem(item.id, item.title)}
                              className={cn(
                                "text-xs truncate cursor-pointer select-none",
                                item.is_completed ? "line-through text-muted-foreground" : "text-foreground font-medium"
                              )}
                              title="Click to edit item"
                            >
                              {item.title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          {!isEditingThis && (
                            <button
                              type="button"
                              onClick={() => startEditChecklistItem(item.id, item.title)}
                              className="p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteChecklistItem(item.id)}
                            className="p-1 rounded-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-center justify-center items-center gap-4 px-5 sm:px-6 py-4 border-t border-border/50 bg-card shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-[128px] h-[44px] bg-transparent text-foreground border-border hover:bg-secondary/50 rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-[128px] h-[44px] bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium"
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
