'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import { Project, ProjectStatus, ProjectPriority, Client } from '@/types/project-management'
import { createProjectAction, updateProjectAction } from '@/lib/actions/projects'
import { AssignableEmployee } from '@/lib/actions/team'
import { toast } from 'sonner'
import { Loader2, Check, Eye, EyeOff } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clients: Client[]
  employees: AssignableEmployee[]
  projectToEdit?: Project | null
  currentUserId?: string
  currentUserDepartment?: string | null
}

const STATUS_OPTIONS: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
const PRIORITY_OPTIONS: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function ProjectModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  employees,
  projectToEdit,
  currentUserId,
  currentUserDepartment,
}: ProjectModalProps) {
  const isEditing = !!projectToEdit

  const [name, setName] = useState(projectToEdit?.name || '')
  const [clientId, setClientId] = useState(projectToEdit?.client_id || '')
  const [description, setDescription] = useState(projectToEdit?.description || '')
  const [startDate, setStartDate] = useState(projectToEdit?.start_date || '')
  const [deadline, setDeadline] = useState(projectToEdit?.deadline || '')
  const [status, setStatus] = useState<ProjectStatus>(projectToEdit?.status || 'PLANNED')
  const [priority, setPriority] = useState<ProjectPriority>(projectToEdit?.priority || 'MEDIUM')
  const [department, setDepartment] = useState(projectToEdit?.department || currentUserDepartment || 'Development')
  
  const isUserAnEmployee = employees.some(emp => emp.id === currentUserId)
  const [projectManagerId, setProjectManagerId] = useState(projectToEdit?.project_manager_id || (isUserAnEmployee ? currentUserId : ''))

  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    (projectToEdit?.members || []).map((m) => m.user_id)
  )
  const [objective, setObjective] = useState(projectToEdit?.objective || '')
  const [notes, setNotes] = useState(projectToEdit?.notes || '')

  const [showMembers, setShowMembers] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const toggleMember = (empId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMsg('Project Name is required.')
      return
    }

    if (!clientId) {
      setErrorMsg('Please select an existing Client.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && projectToEdit) {
        const res = await updateProjectAction({
          id: projectToEdit.id,
          name: trimmedName,
          client_id: clientId,
          description: description.trim() || null,
          start_date: startDate || null,
          deadline: deadline || null,
          status,
          priority,
          department: department.trim() || null,
          project_manager_id: projectManagerId || null,
          team_members: selectedMembers,
          objective: objective.trim() || null,
          notes: notes.trim() || null,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update project.')
          toast.error(res.error || 'Failed to update project.')
        } else {
          toast.success('Project updated successfully.')
          onSuccess()
          onClose()
        }
      } else {
        const res = await createProjectAction({
          name: trimmedName,
          client_id: clientId,
          description: description.trim() || null,
          start_date: startDate || null,
          deadline: deadline || null,
          status,
          priority,
          department: department.trim() || null,
          project_manager_id: projectManagerId || null,
          team_members: selectedMembers,
          objective: objective.trim() || null,
          notes: notes.trim() || null,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create project.')
          toast.error(res.error || 'Failed to create project.')
        } else {
          toast.success('Project created successfully.')
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
      <DialogContent className="!max-w-[1020px] w-[90vw] max-h-[90dvh] flex flex-col gap-0 bg-card border-border text-foreground p-0">
        <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 mx-5 sm:mx-6 mt-2 rounded-md shrink-0">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* Project Name & Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proj-name"
                placeholder="e.g. ERP Redesign & Migration"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-input border-border"
                required
              />
            </div>

            <Dropdown
              id="proj-client"
              label="Client"
              required
              placeholder="Select existing client"
              value={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.location})`,
              }))}
              buttonClassName="bg-input border-border w-full"
            />
          </div>

          {/* Objective & Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-objective" className="text-sm font-medium">
              Project Objective
            </Label>
            <Input
              id="proj-objective"
              placeholder="Primary milestone or deliverable objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc" className="text-sm font-medium">
              Description & Notes
            </Label>
            <textarea
              id="proj-desc"
              rows={3}
              placeholder="Scope, constraints, architecture notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm bg-input border border-border rounded-md p-2.5 outline-hidden focus:border-foreground/50 transition-colors"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Dropdown
              id="proj-status"
              label="Status"
              value={status}
              onChange={(val) => setStatus(val as ProjectStatus)}
              options={STATUS_OPTIONS.map((st) => ({
                value: st,
                label: st.replace('_', ' '),
              }))}
              buttonClassName="bg-input border-border w-full"
            />

            <Dropdown
              id="proj-priority"
              label="Priority"
              value={priority}
              onChange={(val) => setPriority(val as ProjectPriority)}
              options={PRIORITY_OPTIONS.map((pr) => ({
                value: pr,
                label: pr,
              }))}
              buttonClassName="bg-input border-border w-full"
            />

            <div className="space-y-1.5">
              <Label htmlFor="proj-department" className="text-sm font-medium">
                Department
              </Label>
              <Input
                id="proj-department"
                placeholder="e.g. Development, Content"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-input border-border"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start" className="text-sm font-medium">
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
              <Label htmlFor="proj-deadline" className="text-sm font-medium">
                Target Deadline
              </Label>
              <DatePicker
                value={deadline}
                onChange={setDeadline}
                placeholder="Select target deadline"
                className="h-10 text-xs sm:text-sm bg-input border-border"
              />
            </div>
          </div>

          {/* Project Manager / HOD Selection */}
          <Dropdown
            id="proj-manager"
            label="Project Manager / HOD Lead"
            placeholder="Select manager or lead"
            value={projectManagerId}
            onChange={setProjectManagerId}
            options={employees.map((emp) => ({
              value: emp.id,
              label: `${emp.name}${emp.designation ? ` (${emp.designation})` : ''}`,
            }))}
            buttonClassName="bg-input border-border w-full"
          />

          {/* Team Members Multi-Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Assign Team Members ({selectedMembers.length} selected)
              </Label>
              <button
                type="button"
                onClick={() => setShowMembers(!showMembers)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-sm hover:bg-secondary"
                aria-expanded={showMembers}
              >
                {showMembers ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide Members
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Show Members
                  </>
                )}
              </button>
            </div>
            
            {showMembers && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-secondary/20 border border-border rounded-md animate-in slide-in-from-top-2 duration-200">
                {employees.map((emp) => {
                  const isSelected = selectedMembers.includes(emp.id)
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleMember(emp.id)}
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
              {isEditing ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
