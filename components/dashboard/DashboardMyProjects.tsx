'use client'

import Link from 'next/link'
import { Project } from '@/types/project-management'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderGit2, ArrowRight } from 'lucide-react'
import dayjs from 'dayjs'

interface DashboardMyProjectsProps {
  projects: Project[]
}

export function DashboardMyProjects({ projects }: DashboardMyProjectsProps) {
  if (projects.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <FolderGit2 className="h-5 w-5 text-foreground" />
          My Projects
        </h2>

        {/* Normal employees might not have access to the full /projects page if they are not HOD, 
            so we'll just show the cards directly here. If they click a card, it takes them to /projects/[id]
            which they DO have access to if they are a member. */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((p) => {
          const isOverdue = p.is_overdue
          
          return (
            <Card key={p.id} className={`border-border bg-card shadow-xs flex flex-col justify-between transition-colors hover:border-foreground/30 ${isOverdue ? 'border-destructive/40' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 overflow-hidden">
                    <CardTitle className="text-sm font-semibold truncate text-foreground" title={p.name}>
                      {p.name}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground truncate" title={p.client_name}>
                      Client: {p.client_name}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] shrink-0 font-mono px-1 py-0 ${isOverdue ? 'border-destructive text-destructive' : 'border-border'}`}>
                    {p.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end pt-2 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className={isOverdue ? 'text-destructive font-medium' : 'text-foreground'}>
                      {p.deadline ? dayjs(p.deadline).format('DD MMM YYYY') : 'Unset'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{p.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${(p.progress ?? 0) === 100 ? 'bg-emerald-500' : 'bg-foreground'}`}
                        style={{ width: `${Math.max(0, Math.min(100, p.progress ?? 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Link href={`/projects/${p.id}`} className="block pt-1">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8">
                    View Workspace
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
