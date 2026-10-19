'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Users, Loader2 } from 'lucide-react'
import { TaskAssigneeSelector } from '@/components/tasks/TaskAssigneeSelector'
import { AssignableEmployee } from '@/lib/actions/team'
import { assignProjectMembersAction } from '@/lib/actions/projects'
import { ProjectMember } from '@/types/project-management'
import { toast } from 'sonner'

interface EditProjectMembersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedMembers?: ProjectMember[]) => void
  projectId: string
  projectName: string
  projectIdDisplay: string
  currentMembers?: ProjectMember[]
  employees: AssignableEmployee[]
}

export function EditProjectMembersModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  projectName,
  projectIdDisplay,
  currentMembers = [],
  employees,
}: EditProjectMembersModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    currentMembers.map((m) => m.user_id)
  )
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(currentMembers.map((m) => m.user_id))
      setErrorMsg(null)
    }
  }, [isOpen, currentMembers])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSaving(true)

    try {
      const res = await assignProjectMembersAction(projectId, selectedMembers)
      if (!res.success) {
        const err = res.error || 'Failed to update project members.'
        setErrorMsg(err)
        toast.error(err)
      } else {
        toast.success('Project members updated successfully.')
        onSuccess(res.data)
        onClose()
      }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="!max-w-[620px] w-[95vw] sm:w-[90vw] flex flex-col gap-0 bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-2xl">
        <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/50 shrink-0 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
              <Users className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Assign Project Members
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                {projectIdDisplay} • {projectName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/30 text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <TaskAssigneeSelector
                employees={employees}
                selectedAssignees={selectedMembers}
                onChange={setSelectedMembers}
                label="PROJECT MEMBERS"
                placeholder="No project members assigned"
                searchPlaceholder="Search employees by name, role, department..."
                membersFallback={currentMembers}
                disabled={saving}
              />
            </div>

            <div className="bg-secondary/30 border border-border/50 rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed">
              Assigned project members receive access to collaborate on this project. Task assignments remain separate.
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end items-center gap-3 px-5 sm:px-6 py-4 border-t border-border/50 bg-secondary/10 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-4 h-9 text-xs border-border hover:bg-secondary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 h-9 text-xs bg-foreground text-background hover:bg-foreground/90 font-medium cursor-pointer"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Members
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
