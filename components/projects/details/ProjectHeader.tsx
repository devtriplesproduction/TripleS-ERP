'use client'

import Link from 'next/link'
import { Project, Task, ProjectTeamMemberStats } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Calendar, AlertCircle, Edit, Clock, CheckCircle2, Users } from 'lucide-react'
import dayjs from 'dayjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader } from '@/components/PageHeader'

interface ProjectHeaderProps {
  project: Project
  tasks?: Task[]
  teamStats?: ProjectTeamMemberStats[]
  totalOperationalHours: number
  canEdit: boolean
  canManageTasks?: boolean
  onEdit: () => void
  onAddTask?: () => void
}

export function ProjectHeader({
  project,
  tasks = [],
  teamStats = [],
  totalOperationalHours,
  canEdit,
  canManageTasks,
  onEdit,
  onAddTask,
}: ProjectHeaderProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-foreground text-background font-semibold'
      case 'COMPLETED':
        return 'bg-muted text-foreground border border-border'
      case 'ON_HOLD':
        return 'border-border text-muted-foreground'
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive border-destructive/30'
      default:
        return 'border-border text-muted-foreground'
    }
  }

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-destructive text-destructive font-bold'
      case 'HIGH':
        return 'border-foreground/80 text-foreground font-semibold'
      case 'MEDIUM':
        return 'border-border text-foreground'
      default:
        return 'border-border text-muted-foreground'
    }
  }

  return (
    <div className="relative overflow-hidden space-y-5 rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-emerald-500 opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        {/* Back button */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/projects"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Projects
          </Link>
        </div>

      {/* Title & Metadata */}
      <div className="flex flex-col gap-5">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <span>{project.name}</span>
              <span className="font-mono text-xs font-semibold text-muted-foreground bg-secondary/60 border border-border/50 px-2.5 py-1 rounded-md mb-1">
                {project.project_id_display}
              </span>
            </div>
          }
          subtitle={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 bg-secondary/20 px-4 py-2.5 rounded-lg border border-border/30 w-fit">
              {/* Client */}
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">{project.client_name}</span>
              </div>
              
              <div className="w-px h-4 bg-border hidden sm:block" />

              {/* Status */}
              <Badge className={`px-2.5 py-0.5 text-xs font-semibold rounded-md shadow-xs ${getStatusVariant(project.status)}`}>
                {project.status.replace('_', ' ')}
              </Badge>

              <div className="w-px h-4 bg-border hidden sm:block" />

              {/* Priority */}
              <Badge variant="outline" className={`px-2.5 py-0.5 text-xs bg-background shadow-xs ${getPriorityVariant(project.priority)}`}>
                {project.priority}
              </Badge>

              <div className="w-px h-4 bg-border hidden sm:block" />

              {/* Deadline */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Deadline:</span>
                <span className={project.is_overdue ? 'text-destructive font-bold' : 'text-foreground font-semibold'}>
                  {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Not set'}
                </span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 mt-2 md:mt-0">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-10 px-4 text-xs font-semibold bg-card border-border hover:bg-secondary/80 hover:text-foreground shadow-xs"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit Project
                </Button>
              )}
              {canManageTasks && onAddTask && (
                <Button
                  size="sm"
                  onClick={onAddTask}
                  className="h-10 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                >
                  + Add Task
                </Button>
              )}
            </div>
          }
        />
      </div>

      <hr className="border-border/60 my-2" />

      {/* Unified Metrics Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm font-medium">
          {/* Tasks Count */}
          <div className="flex items-center gap-2">
            <span className="text-foreground font-bold">{tasks.length}</span>
            <span className="text-muted-foreground">Tasks</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-border" />

          {/* Completed */}
          <div className="flex items-center gap-2">
            <span className="text-foreground font-bold">{project.task_summary?.done || 0}</span>
            <span className="text-muted-foreground">Completed</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-border" />

          {/* In Progress */}
          <div className="flex items-center gap-2">
            <span className="text-foreground font-bold">{(project.task_summary?.in_progress || 0) + (project.task_summary?.in_review || 0)}</span>
            <span className="text-muted-foreground">In Progress</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-border" />

          {/* Team Members */}
          <div className="flex items-center gap-2">
            <span className="text-foreground font-bold">{teamStats.length}</span>
            <span className="text-muted-foreground">Members</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-border" />

          {/* Progress */}
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold">{project.progress || 0}%</span>
            <span className="text-muted-foreground">Progress</span>
          </div>
        </div>

        {/* Team Avatars */}
        {teamStats.length > 0 && (
          <div className="flex items-center -space-x-2 overflow-hidden py-1">
            {teamStats.slice(0, 5).map((member, i) => {
              const initials = member.name.substring(0, 2).toUpperCase()
              return (
                <Avatar key={member.userId} className="h-8 w-8 border-2 border-card shadow-xs transition-transform hover:scale-110 hover:z-10 cursor-pointer">
                  {member.profilePhoto ? (
                    <AvatarImage src={member.profilePhoto} alt={member.name} />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
                </Avatar>
              )
            })}
            {teamStats.length > 5 && (
              <Avatar className="h-8 w-8 border-2 border-card shadow-xs">
                <AvatarFallback className="bg-muted text-[10px]">+{teamStats.length - 5}</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
