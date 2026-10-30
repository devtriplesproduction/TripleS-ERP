'use client'

import React, { useState, useEffect } from 'react'
import { UserCheck, Calendar, AlertTriangle, Send, UserX } from 'lucide-react'
import { ContentItem, ContentPriority, AssignedRole } from '@/types/content-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { assignContentItem } from '@/lib/actions/content-management'
import { useToast } from '@/hooks/use-toast'

interface AssignReassignModalProps {
  item: ContentItem | null
  employees: AssignableEmployee[]
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: ContentItem) => void
}

export function AssignReassignModal({
  item,
  employees,
  isOpen,
  onClose,
  onSuccess,
}: AssignReassignModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignedRole, setAssignedRole] = useState<AssignedRole>('Developer')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<ContentPriority>('Medium')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (item) {
      setSelectedUserId(item.assigned_to_id || '')
      setAssignedRole(item.assigned_role || 'Developer')
      setDueDate(item.due_date || '')
      setPriority(item.priority || 'Medium')
      setReason('')
      setError(null)
    }
  }, [item])

  if (!isOpen || !item) return null

  const isReassignment = item.assigned_to_id && item.assigned_to_id !== selectedUserId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedUserId) {
      setError('Please select an assignee')
      return
    }

    if (!dueDate) {
      setError('Due date is required')
      return
    }

    if (isReassignment && !reason.trim()) {
      setError('A reason is required when reassigning content to another team member')
      return
    }

    const selectedEmp = employees.find(e => e.id === selectedUserId)
    const empName = selectedEmp ? selectedEmp.name : 'Assigned User'

    setLoading(true)
    try {
      const res = await assignContentItem(
        item.id,
        selectedUserId,
        empName,
        assignedRole,
        dueDate,
        priority,
        reason.trim()
      )

      if (res.success && res.data) {
        toast({
          title: isReassignment ? 'Content Reassigned' : 'Content Assigned',
          description: `"${item.title}" successfully assigned to ${empName}.`,
        })
        onSuccess(res.data)
        onClose()
      } else {
        setError(res.error || 'Failed to assign content')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-zinc-100">
              {item.assigned_to_id ? 'Reassign Content' : 'Assign Content'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-sm font-medium p-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content details banner */}
        <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800/80 text-xs text-zinc-400 space-y-1">
          <div className="text-sm font-medium text-zinc-200 line-clamp-1">{item.title}</div>
          <div className="flex items-center gap-3">
            <span>Current Status: <strong className="text-zinc-300">{item.status}</strong></span>
            <span>
              Current Assignee:{' '}
              <strong className={item.assigned_to_name ? 'text-indigo-400' : 'text-zinc-500'}>
                {item.assigned_to_name || 'Unassigned'}
              </strong>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Assignee Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Select Assignee (Developer / Team Lead) *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>-- Select team member --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.designation ? `(${emp.designation})` : ''} - {emp.department || 'General'}
                </option>
              ))}
            </select>
          </div>

          {/* Role and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Assigned Role *
              </label>
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value as AssignedRole)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Developer">Developer</option>
                <option value="Team Lead">Team Lead</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ContentPriority)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Due Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Reason for Reassignment */}
          {isReassignment && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Reason for Reassignment *
                </label>
                <span className="text-[11px] text-amber-400 font-medium">Required</span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Workload reassignment, domain expertise alignment..."
                rows={2}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Assigning...' : isReassignment ? 'Confirm Reassignment' : 'Assign Content'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
