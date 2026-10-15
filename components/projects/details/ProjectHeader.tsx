'use client'

import Link from 'next/link'
import { Project, Task, ProjectTeamMemberStats } from '@/types/project-management'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Pencil, Plus, Trash2, ChartGantt } from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProjectHeaderProps {
  project: Project
  tasks?: Task[]
  teamStats?: ProjectTeamMemberStats[]
  totalOperationalHours: number
  canEdit: boolean
  canManageTasks?: boolean
  canDelete?: boolean
  onEdit: () => void
  onAddTask?: () => void
  onDelete?: () => void
}

export function ProjectHeader({
  project,
  tasks = [],
  teamStats = [],
  totalOperationalHours,
  canEdit,
  canManageTasks,
  canDelete = true, // Default to true or determine by permissions
  onEdit,
  onAddTask,
  onDelete,
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-5 bg-card text-foreground rounded-2xl p-4 sm:p-5 border border-border/80 shadow-xs">
      
      {/* Top Row: Title & Action Icons */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 min-w-0">
          <Link 
            href="/projects" 
            className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-colors shadow-xs"
            title="Back to Projects"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl sm:text-[22px] font-bold tracking-tight text-foreground truncate font-sans">
              {project.name}
            </h1>
            <p className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase mt-1 truncate">
              {project.project_id_display} <span className="mx-1.5 opacity-50">•</span> {project.client_name || 'NO CLIENT'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onEdit} 
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs"
              title="Edit Project"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onDelete} 
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors shadow-xs"
              title="Delete Project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Row: Tabs & New Task */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex-1 w-full overflow-x-auto no-scrollbar">
          <TabsList className="bg-secondary/60 border border-border/70 p-1 rounded-full h-auto inline-flex flex-nowrap shrink-0 gap-1 sm:gap-1.5 w-auto max-w-full overflow-x-auto no-scrollbar items-center shadow-xs">
            
            <TabsTrigger 
              value="overview" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap cursor-pointer"
            >
              Overview
            </TabsTrigger>
            
            <TabsTrigger 
              value="list" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap cursor-pointer"
            >
              List
            </TabsTrigger>
            
            <TabsTrigger 
              value="kanban" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap cursor-pointer"
            >
              Kanban
            </TabsTrigger>
            
            <TabsTrigger 
              value="gantt" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer"
            >
              <ChartGantt className="w-3.5 h-3.5" />
              <span>Gantt Chart</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="team" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap cursor-pointer"
            >
              Team
            </TabsTrigger>

            <TabsTrigger 
              value="files" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap cursor-pointer"
            >
              Files
            </TabsTrigger>

            <TabsTrigger 
              value="activity" 
              className="rounded-full px-4 sm:px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground transition-all whitespace-nowrap cursor-pointer"
            >
              Activity
            </TabsTrigger>

          </TabsList>
        </div>

        {/* New Task Button */}
        {canManageTasks && onAddTask && (
          <Button 
            onClick={onAddTask} 
            className="h-10 px-5 rounded-full font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs tracking-wide text-[13px] shrink-0 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={3} /> New Task
          </Button>
        )}
      </div>

    </div>
  )
}
