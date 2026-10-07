'use client'

import { useState } from 'react'
import { Task } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dropdown } from '@/components/ui/Dropdown'
import { Search, Calendar, Clock, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProjectListTabProps {
  tasks: Task[]
}

export function ProjectListTab({ tasks }: ProjectListTabProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.task_id_display.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'border-destructive text-destructive font-bold'
      case 'HIGH': return 'border-foreground/80 text-foreground font-semibold'
      case 'MEDIUM': return 'border-border text-foreground'
      default: return 'border-border text-muted-foreground'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-foreground text-background font-semibold'
      case 'DONE': return 'bg-muted text-foreground border border-border'
      case 'ON_HOLD': return 'border-border text-muted-foreground'
      default: return 'border-border text-muted-foreground'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          Tasks
          <Badge variant="secondary" className="text-xs font-mono">{filteredTasks.length}</Badge>
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card border-border shadow-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Dropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'TODO', label: 'To Do' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'IN_REVIEW', label: 'In Review' },
                { value: 'DONE', label: 'Done' },
                { value: 'ON_HOLD', label: 'On Hold' },
              ]}
              buttonClassName="h-9 text-xs border-border bg-card w-[130px] shadow-xs"
            />
            <Dropdown
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Priority' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
              buttonClassName="h-9 text-xs border-border bg-card w-[130px] shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/40 border-b border-border/60 text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3 w-[40%]">Task</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3 text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm flex-col flex items-center justify-center">
                    <Search className="h-8 w-8 mb-2 opacity-20" />
                    No tasks found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const progressVal = t.estimated_hours && t.estimated_hours > 0 
                    ? Math.min(100, Math.round(((t.worked_hours || 0) / t.estimated_hours) * 100))
                    : 0;

                  return (
                    <tr key={t.id} className="hover:bg-secondary/30 transition-colors group cursor-pointer h-14">
                      <td className="px-5 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate max-w-[300px]">{t.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-secondary w-fit px-1.5 py-0.5 rounded">{t.task_id_display}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 font-semibold ${getStatusVariant(t.status)}`}>
                          {t.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 bg-background ${getPriorityVariant(t.priority)}`}>
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center -space-x-1.5">
                          {(t.assignees || []).slice(0, 3).map((a, idx) => {
                            const name = a.profile ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim() : 'User'
                            const initials = name.slice(0, 2).toUpperCase()
                            return (
                              <Avatar key={idx} className="h-7 w-7 border-2 border-card bg-secondary text-[9px] hover:z-10 transition-transform">
                                {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} alt={name} />}
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                            )
                          })}
                          {(t.assignees?.length || 0) > 3 && (
                            <div className="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground z-0">
                              +{(t.assignees?.length || 0) - 3}
                            </div>
                          )}
                          {(t.assignees?.length || 0) === 0 && (
                            <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-2 text-xs">
                        <span className={`flex items-center gap-1.5 font-medium ${t.is_overdue ? 'text-destructive' : 'text-foreground'}`}>
                          {t.is_overdue ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                          {t.due_date ? dayjs(t.due_date).format('MMM DD, YYYY') : '-'}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] font-mono font-medium text-foreground">
                            {progressVal}%
                          </span>
                          <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${progressVal}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
