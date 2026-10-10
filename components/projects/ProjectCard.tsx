'use client'

import Link from 'next/link'
import { Project } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Users, ClipboardList, Building2, FolderGit2, Eye } from 'lucide-react'
import dayjs from 'dayjs'

interface ProjectCardProps {
  project: Project
  viewMode?: 'GRID' | 'LIST'
}

export function ProjectCard({ project, viewMode = 'GRID' }: ProjectCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-500 font-semibold'
      case 'COMPLETED':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold'
      case 'ON_HOLD':
        return 'border-border text-muted-foreground font-medium'
      case 'CANCELLED':
        return 'border-destructive/30 bg-destructive/10 text-destructive font-medium'
      default:
        return 'border-border text-muted-foreground font-medium'
    }
  }

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-destructive/10 text-destructive border-destructive/30 font-bold'
      case 'HIGH':
        return 'bg-destructive/10 text-destructive border-destructive/30 font-semibold'
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-medium'
      case 'LOW':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30 font-medium'
      default:
        return 'bg-secondary text-muted-foreground border-border font-medium'
    }
  }

  const summary = project.task_summary || { total: 0, done: 0, in_progress: 0, in_review: 0, todo: 0, on_hold: 0 }
  const members = project.members || []
  const isOverdue = project.is_overdue && project.status !== 'COMPLETED'
  const isList = viewMode === 'LIST'

  const ProjectContent = () => (
    <>
      <div className="p-5 flex flex-col h-full flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-secondary border border-border/40 shrink-0 text-foreground group-hover:text-primary transition-colors">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-tight font-sans">
              {project.name}
            </h3>
          </div>

        </div>

        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded-sm uppercase tracking-wider ${getPriorityVariant(project.priority)}`}>
            {project.priority}
          </Badge>
          <span className="font-mono text-[10px] text-muted-foreground">{project.project_id_display}</span>
          <Badge variant="outline" className={`text-[9px] px-2 py-0 rounded-sm uppercase tracking-wider ${getStatusVariant(project.status)}`}>
            {project.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{project.client_name || 'No Client'}</span>
        </div>

        {project.description && project.description !== 'NA' && (
          <p className="mt-2.5 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        <div className="mt-auto pt-6">
          <div className="flex flex-col justify-center space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progress</span>
              <span className="text-[11px] font-bold text-foreground">{project.progress || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex">
              {(project.progress || 0) > 0 && (
                <div
                  className={`h-full transition-all duration-500 rounded-full ${project.progress === 100 ? 'bg-emerald-500' : 'bg-foreground'}`}
                  style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-secondary/40 border-t border-border/40 px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 text-[11px] text-muted-foreground font-medium flex-wrap">
          <span className="flex items-center gap-1.5" title="Tasks">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            {summary.total}
          </span>
          <span className="flex items-center gap-1.5" title="Members">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {members.length}
          </span>
          <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-bold' : ''}`} title="Deadline">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {isOverdue ? '🔴 ' : ''}{project.deadline ? dayjs(project.deadline).format('DD MMM') : 'Unset'}
          </span>
        </div>

        <div className="flex items-center -space-x-2 overflow-hidden shrink-0">
          {members.slice(0, 3).map((m, idx) => {
            const name = m.profile ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim() : 'User'
            const initials = name.slice(0, 2).toUpperCase()
            return (
              <Avatar key={idx} className="h-6 w-6 border-2 border-background bg-muted text-[9px]">
                {m.profile?.profile_photo && <AvatarImage src={m.profile.profile_photo} alt={name} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )
          })}
          {members.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-foreground z-10">
              +{members.length - 3}
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (isList) {
    return (
      <Card className="border-border/60 bg-card shadow-xs hover:border-border hover:shadow-md hover:-translate-y-[1px] transition-all flex group relative rounded-[10px] !py-0">
        <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10" aria-label={`View ${project.name}`} />
        <CardContent className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between w-full relative z-0 gap-5 md:gap-0">
          
          {/* LEFT: Project Info */}
          <div className="flex-[1.2] flex flex-col justify-center min-w-0 md:pr-6">
            <h3 className="font-bold text-[16px] text-foreground group-hover:text-primary transition-colors truncate font-sans">
              {project.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{project.client_name || 'No Client Assigned'}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/50 shrink-0">•</span>
              <span className="font-mono text-[11px] shrink-0">{project.project_id_display}</span>
            </div>
          </div>
          
          {/* MIDDLE: Meta (Deadline, Tasks, Members) */}
          <div className="flex-1 flex flex-col gap-3 md:px-6 md:border-l md:border-border/50 h-full justify-center">
            <div className="flex items-center gap-5 text-[12px] text-muted-foreground font-medium">
               <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-bold' : ''}`}>
                 <Calendar className="h-3.5 w-3.5 shrink-0" />
                 {isOverdue ? '🔴 ' : ''}{project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Unset'}
               </span>
               <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 shrink-0" /> {summary.total} Tasks</span>
            </div>
          </div>

          {/* RIGHT: Progress & Action */}
          <div className="flex-1 flex items-center justify-between gap-6 md:pl-6 md:border-l md:border-border/50">
            <div className="w-full max-w-[140px] flex flex-col justify-center gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progress</span>
                <span className="text-[11px] font-bold text-foreground">{project.progress || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex">
                {(project.progress || 0) > 0 && (
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${project.progress === 100 ? 'bg-emerald-500' : 'bg-foreground'}`}
                    style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }}
                  />
                )}
              </div>
            </div>

            <div className="relative z-20 shrink-0">
              {/* Button is purely visual, the absolute Link covers the card, but pointer-events-none lets the Link register click while button looks active */}
              <button 
                className="flex items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 sm:px-5 shadow-sm h-9 text-xs font-semibold transition-colors pointer-events-none"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card shadow-xs hover:border-border hover:shadow-md hover:-translate-y-[1px] transition-all flex flex-col group relative overflow-hidden rounded-[14px]">
      <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10" aria-label={`View ${project.name}`} />
      <CardContent className="p-0 flex-1 flex flex-col h-full relative z-0">
        <ProjectContent />
      </CardContent>
    </Card>
  )
}
