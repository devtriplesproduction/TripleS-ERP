'use client'

import { ProjectDashboardStats } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { FolderGit2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

interface ProjectStatsProps {
  stats: ProjectDashboardStats
}

export function ProjectStatsOverview({ stats }: ProjectStatsProps) {
  const statItems = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      icon: <FolderGit2 className="h-5 w-5 text-muted-foreground" />,
      desc: 'All recorded projects',
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      desc: 'Planned or In Progress',
    },
    {
      label: 'Completed Projects',
      value: stats.completedProjects,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      desc: 'Successfully delivered',
    },
    {
      label: 'Overdue Projects',
      value: stats.overdueProjects,
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      desc: 'Past target deadline',
      isWarning: stats.overdueProjects > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, idx) => (
        <Card
          key={idx}
          className="border-border/60 bg-card rounded-[14px] shadow-xs hover:border-border transition-all"
        >
          <CardContent className="p-[20px] flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {item.value}
              </h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/50 shrink-0 border border-border/40">
              {item.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
