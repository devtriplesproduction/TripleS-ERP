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
      icon: <FolderGit2 className="h-5 w-5 text-foreground" />,
      desc: 'All recorded projects',
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: <Clock className="h-5 w-5 text-foreground" />,
      desc: 'Planned or In Progress',
    },
    {
      label: 'Completed Projects',
      value: stats.completedProjects,
      icon: <CheckCircle2 className="h-5 w-5 text-foreground" />,
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {statItems.map((item, idx) => (
        <Card
          key={idx}
          className={`border-border bg-card shadow-xs transition-shadow hover:shadow-sm ${
            item.isWarning ? 'border-destructive/40 bg-destructive/5' : ''
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                {item.value}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-accent/60 shrink-0">{item.icon}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
