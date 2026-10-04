'use client'

import Link from 'next/link'
import { Project } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar, AlertCircle, ArrowRight, Building2, CheckCircle2, Clock } from 'lucide-react'
import dayjs from 'dayjs'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
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

  const summary = project.task_summary || { total: 0, done: 0, in_progress: 0, in_review: 0, todo: 0, on_hold: 0 }
  const members = project.members || []

  return (
    <Card className="border-border bg-card shadow-xs hover:border-foreground/40 transition-all flex flex-col justify-between group">
      <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        {/* Header: Project ID, Priority, Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted-foreground">{project.project_id_display}</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${getPriorityVariant(project.priority)}`}>
                {project.priority}
              </Badge>
              <Badge className={`text-[10px] px-2 py-0.5 ${getStatusVariant(project.status)}`}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg text-foreground group-hover:text-foreground/90 transition-colors line-clamp-1">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium line-clamp-1">{project.client_name}</span>
            </div>
          </div>
        </div>

        {/* Description / Objective preview if present */}
        {(project.objective || project.description) && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {project.objective || project.description}
          </p>
        )}

        {/* Progress & Task Summary */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Progress</span>
            <span className="font-mono font-bold text-foreground">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-2 bg-secondary" />

          {/* Micro Task Summary Chips */}
          <div className="grid grid-cols-4 gap-1 pt-1 text-[11px] text-center text-muted-foreground font-medium">
            <div className="bg-secondary/40 py-1 rounded-sm">
              <span className="font-bold text-foreground">{summary.total}</span> Total
            </div>
            <div className="bg-secondary/40 py-1 rounded-sm">
              <span className="font-bold text-foreground">{summary.done}</span> Done
            </div>
            <div className="bg-secondary/40 py-1 rounded-sm">
              <span className="font-bold text-foreground">{summary.in_progress}</span> Active
            </div>
            <div className="bg-secondary/40 py-1 rounded-sm">
              <span className="font-bold text-foreground">{summary.todo + summary.in_review}</span> Pending
            </div>
          </div>
        </div>

        {/* Team Avatars & Deadline */}
        <div className="pt-2 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            {/* Team member avatars */}
            <div className="flex items-center -space-x-2 overflow-hidden">
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
                <div className="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +{members.length - 4}
                </div>
              )}
              {members.length === 0 && (
                <span className="text-muted-foreground text-[11px]">No team assigned</span>
              )}
            </div>

            {/* Deadline / Overdue flag */}
            <div className="flex items-center gap-1.5 text-right">
              {project.is_overdue ? (
                <span className="flex items-center gap-1 text-destructive font-semibold text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Overdue
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground text-[11px]">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'No deadline'}
                </span>
              )}
            </div>
          </div>

          {/* Open Project CTA */}
          <Link href={`/projects/${project.id}`} className="block">
            <Button
              variant="outline"
              className="w-full h-10 text-xs font-semibold justify-between group/btn hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <span>Open Project</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
