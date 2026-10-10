'use client'

import Link from 'next/link'
import { Project, Task, ProjectTeamMemberStats } from '@/types/project-management'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
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
    <div className="flex flex-col gap-5 bg-[#0a0a0a] rounded-2xl p-4 sm:p-5 border border-border/40 shadow-sm">
      
      {/* Top Row: Title & Action Icons */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 min-w-0">
          <Link 
            href="/projects" 
            className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full border border-border/60 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
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
              variant="ghost" 
              size="icon" 
              onClick={onEdit} 
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete} 
              className="h-10 w-10 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 transition-all"
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
          <TabsList className="bg-white/5 border border-border/40 p-1.5 rounded-full h-auto inline-flex flex-nowrap shrink-0 gap-2 sm:gap-6 w-auto max-w-full overflow-x-auto no-scrollbar items-center shadow-xs">
            
            <TabsTrigger 
              value="overview" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              Overview
            </TabsTrigger>
            
            <TabsTrigger 
              value="list" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              List
            </TabsTrigger>
            
            <TabsTrigger 
              value="kanban" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              Kanban
            </TabsTrigger>
            
            <TabsTrigger 
              value="timeline" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              Timeline
            </TabsTrigger>
            
            <TabsTrigger 
              value="team" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              Team
            </TabsTrigger>

            <TabsTrigger 
              value="files" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              Files
            </TabsTrigger>

            <TabsTrigger 
              value="activity" 
              className="rounded-full px-5 py-2 text-[13px] font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              Activity
            </TabsTrigger>

          </TabsList>
        </div>

        {/* New Task Button */}
        {canManageTasks && onAddTask && (
          <Button 
            onClick={onAddTask} 
            className="h-10 px-5 rounded-full font-bold bg-foreground text-background hover:bg-foreground/90 shadow-sm tracking-wide text-[13px] shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={3} /> New Task
          </Button>
        )}
      </div>

    </div>
  )
}
