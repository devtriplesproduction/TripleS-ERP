'use client'

import Link from 'next/link'
import { Project } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Users, ClipboardList, MoreHorizontal, Building2, FolderGit2 } from 'lucide-react'
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-secondary border border-border/40 shrink-0">
            <FolderGit2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-tight font-sans">
            {project.name}
          </h3>
        </div>
        <button 
          className="relative z-20 p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-secondary transition-colors"
          onClick={(e) => {
            e.preventDefault()
            // In a real app this opens a dropdown with Edit / Delete etc.
          }}
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded-sm uppercase tracking-wider ${getPriorityVariant(project.priority)}`}>
          {project.priority}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground">{project.project_id_display}</span>
      </div>

      <div className="mt-2.5">
        <Badge variant="outline" className={`text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-wider ${getStatusVariant(project.status)}`}>
          {project.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{project.client_name || 'No Client'}</span>
      </div>

      {project.description && (
        <p className="mt-3 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="flex-1 min-h-[16px]" />

      <div className="mt-4 flex flex-col justify-center space-y-2.5">
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

      <div className="pt-4 mt-5 border-t border-border/40 text-[11px] text-muted-foreground font-medium space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            {summary.total} Tasks
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {members.length} Members
          </span>
          <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-bold' : ''}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {isOverdue ? '🔴 ' : ''}Due {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Unset'}
          </span>
        </div>

        <div className="flex items-center -space-x-2 overflow-hidden pt-1">
          {members.slice(0, 4).map((m, idx) => {
            const name = m.profile ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim() : 'User'
            const initials = name.slice(0, 2).toUpperCase()
            return (
              <Avatar key={idx} className="h-7 w-7 border-2 border-card bg-secondary text-[10px]">
                {m.profile?.profile_photo && <AvatarImage src={m.profile.profile_photo} alt={name} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )
          })}
          {members.length > 4 && (
            <div className="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10">
              +{members.length - 4}
            </div>
          )}
          {members.length === 0 && (
            <span className="text-muted-foreground text-[10px] ml-2">No assignees</span>
          )}
        </div>
      </div>
    </>
  )

  if (isList) {
    return (
      <Card className="border-border/60 bg-card shadow-xs hover:border-border hover:shadow-md hover:-translate-y-[1px] transition-all flex group relative rounded-[10px]">
        <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10" aria-label={`View ${project.name}`} />
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between w-full relative z-0 gap-4">
          <div className="flex-1 flex items-start gap-4">
            <div className="p-2 rounded-md bg-secondary border border-border/40 shrink-0 mt-1 md:mt-0">
              <FolderGit2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors line-clamp-1 font-sans">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded-sm uppercase tracking-wider ${getPriorityVariant(project.priority)}`}>
                  {project.priority}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">{project.project_id_display}</span>
                <Badge variant="outline" className={`text-[9px] px-2 py-0 rounded-sm uppercase tracking-wider ${getStatusVariant(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.client_name || 'No Client'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-[0.5] hidden md:flex flex-col justify-center px-4 border-l border-border/40 h-full min-h-[50px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Progress</span>
              <span className="text-[10px] font-bold text-foreground">{project.progress || 0}%</span>
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

          <div className="flex-[0.8] flex flex-col items-start md:items-end justify-center px-2 md:px-4 md:border-l border-border/40 text-[11px] text-muted-foreground gap-1.5">
             <span className="flex items-center gap-1.5"><ClipboardList className="h-3 w-3" /> {summary.total} Tasks</span>
             <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-bold' : ''}`}>
               <Calendar className="h-3 w-3" />
               {isOverdue ? '🔴 ' : ''}{project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Unset'}
             </span>
          </div>
          
          <div className="flex shrink-0 items-center -space-x-2 overflow-hidden px-2">
            {members.slice(0, 3).map((m, idx) => {
              const name = m.profile ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim() : 'User'
              const initials = name.slice(0, 2).toUpperCase()
              return (
                <Avatar key={idx} className="h-7 w-7 border-2 border-card bg-secondary text-[10px]">
                  {m.profile?.profile_photo && <AvatarImage src={m.profile.profile_photo} alt={name} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )
            })}
            {members.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10">
                +{members.length - 3}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card shadow-xs hover:border-border hover:shadow-md hover:-translate-y-[1px] transition-all flex flex-col group relative overflow-hidden rounded-[14px]">
      <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10" aria-label={`View ${project.name}`} />
      <CardContent className="p-5 flex-1 flex flex-col h-full relative z-0">
        <ProjectContent />
      </CardContent>
    </Card>
  )
}
