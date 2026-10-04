'use client'

import { Project } from '@/types/project-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, FileText, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react'

interface ProjectOverviewTabProps {
  project: Project
  totalOperationalHours: number
}

export function ProjectOverviewTab({ project, totalOperationalHours }: ProjectOverviewTabProps) {
  const summary = project.task_summary || { total: 0, done: 0, in_progress: 0, in_review: 0, todo: 0, on_hold: 0 }

  return (
    <div className="space-y-6">
      {/* Objective & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-foreground" />
              Project Objective
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {project.objective || 'No primary objective stated for this project.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-foreground" />
              Description & Scope Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {project.description || project.notes || 'No extra notes provided.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task Breakdown Stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-foreground" />
          Task Operational Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-border bg-card shadow-xs p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Total Tasks</p>
            <h4 className="text-2xl font-bold text-foreground mt-1">{summary.total}</h4>
          </Card>

          <Card className="border-border bg-card shadow-xs p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Completed</p>
            <h4 className="text-2xl font-bold text-foreground mt-1">{summary.done}</h4>
          </Card>

          <Card className="border-border bg-card shadow-xs p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">In Progress</p>
            <h4 className="text-2xl font-bold text-foreground mt-1">{summary.in_progress}</h4>
          </Card>

          <Card className="border-border bg-card shadow-xs p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">In Review</p>
            <h4 className="text-2xl font-bold text-foreground mt-1">{summary.in_review}</h4>
          </Card>

          <Card className="border-border bg-card shadow-xs p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Pending / Todo</p>
            <h4 className="text-2xl font-bold text-foreground mt-1">{summary.todo}</h4>
          </Card>

          <Card className="border-border bg-card shadow-xs p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">On Hold</p>
            <h4 className="text-2xl font-bold text-foreground mt-1">{summary.on_hold}</h4>
          </Card>
        </div>
      </div>
    </div>
  )
}
