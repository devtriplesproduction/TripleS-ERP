'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export interface TaskManagementStatsData {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
}

interface TaskManagementStatsProps {
  stats: TaskManagementStatsData
}

export function TaskManagementStats({ stats }: TaskManagementStatsProps) {
  const statCards = [
    {
      id: 'task-stat-total',
      label: 'Total Tasks',
      value: stats.totalTasks,
      desc: 'All project development tasks',
      icon: CheckSquare,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
    },
    {
      id: 'task-stat-completed',
      label: 'Completed Tasks',
      value: stats.completedTasks,
      desc: 'Finished and delivered',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
    },
    {
      id: 'task-stat-pending',
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      desc: 'To Do and In Progress',
      icon: Clock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      id: 'task-stat-overdue',
      label: 'Overdue Tasks',
      value: stats.overdueTasks,
      desc: 'Past target completion date',
      icon: AlertTriangle,
      iconColor: stats.overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground',
      iconBg: stats.overdueTasks > 0 ? 'bg-destructive/10' : 'bg-secondary',
      highlight: stats.overdueTasks > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => {
        const IconComponent = card.icon
        return (
          <Card
            key={card.id}
            data-testid={card.id}
            className={`border-border/60 bg-card rounded-xl shadow-xs hover:border-border transition-all ${
              card.highlight ? 'border-destructive/30' : ''
            }`}
          >
            <CardContent className="p-4 sm:p-5 flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                  {card.value}
                </h3>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${card.iconBg} ${card.iconColor} shrink-0`}>
                <IconComponent className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
