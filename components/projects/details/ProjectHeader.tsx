'use client'

import Link from 'next/link'
import { Project } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Building2, Calendar, AlertCircle, Edit, Clock } from 'lucide-react'
import dayjs from 'dayjs'

interface ProjectHeaderProps {
  project: Project
  totalOperationalHours: number
  canEdit: boolean
  onEdit: () => void
}

export function ProjectHeader({
  project,
  totalOperationalHours,
  canEdit,
  onEdit,
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
    <div className="space-y-4 bg-card border border-border rounded-lg p-5 sm:p-6 shadow-xs">
      {/* Back button & ID */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/projects"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Projects
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {project.project_id_display}
          </span>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-3 text-xs"
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit Project
            </Button>
          )}
        </div>
      </div>

      {/* Title & Badges */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {project.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              {project.client_name}
            </span>
            {project.department && (
              <>
                <span>•</span>
                <span>{project.department}</span>
              </>
            )}
            {project.project_manager_name && (
              <>
                <span>•</span>
                <span>Manager: {project.project_manager_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`px-2.5 py-1 text-xs ${getPriorityVariant(project.priority)}`}>
            {project.priority}
          </Badge>
          <Badge className={`px-2.5 py-1 text-xs ${getStatusVariant(project.status)}`}>
            {project.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Meta Grid: Progress, Dates, Operational Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Delivery Progress</span>
            <span className="font-mono font-bold text-foreground">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-2 bg-secondary" />
        </div>

        {/* Dates */}
        <div className="text-xs space-y-1">
          <span className="text-muted-foreground font-medium block">Timeline</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {project.start_date ? dayjs(project.start_date).format('DD MMM YYYY') : 'Not set'}
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={`flex items-center gap-1 ${
                project.is_overdue ? 'text-destructive font-bold' : 'text-foreground'
              }`}
            >
              {project.is_overdue && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
              {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'No deadline'}
            </span>
          </div>
        </div>

        {/* Operational Hours */}
        <div className="text-xs space-y-1">
          <span className="text-muted-foreground font-medium block">Total Operational Hours</span>
          <div className="flex items-center gap-1.5 text-foreground font-bold">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{totalOperationalHours} hrs</span>
            <span className="text-[10px] text-muted-foreground font-normal">(project logged time)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
