'use client'

import { ProjectTeamMemberStats } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, CheckCircle2, ListTodo, ShieldCheck } from 'lucide-react'

interface ProjectTeamTabProps {
  teamStats: ProjectTeamMemberStats[]
}

export function ProjectTeamTab({ teamStats }: ProjectTeamTabProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          Project Team
          <Badge variant="secondary" className="text-xs font-mono">{teamStats.length}</Badge>
        </h3>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-secondary/30 border border-border/50 p-3.5 rounded-xl flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
          <span>
            <strong>Operational Hour Transparency:</strong> Hours displayed indicate task-dedicated operational time. Financial compensation, salary, and stipend records remain strictly private.
          </span>
        </div>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-5 py-3 w-[40%]">Team Member</th>
              <th className="px-5 py-3">Role / Designation</th>
              <th className="px-5 py-3 text-center">Assigned Tasks</th>
              <th className="px-5 py-3 text-center">Completed</th>
              <th className="px-5 py-3 text-right">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {teamStats.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm flex-col flex items-center justify-center">
                  <Users className="h-8 w-8 mb-2 opacity-20" />
                  No team members assigned yet.
                </td>
              </tr>
            ) : (
              teamStats.map((member) => {
                const initials = member.name.slice(0, 2).toUpperCase()
                return (
                  <tr key={member.userId} className="hover:bg-secondary/30 transition-colors h-14">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-secondary border border-border/50 shadow-xs">
                          {member.profilePhoto && <AvatarImage src={member.profilePhoto} alt={member.name} />}
                          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground text-sm">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <Badge variant="outline" className="border-border text-[10px] px-2 py-0.5 bg-background">
                        {member.designation || 'Team Member'}
                      </Badge>
                    </td>
                    <td className="px-5 py-2 text-center font-mono font-medium text-foreground text-xs">
                      {member.assignedTasks}
                    </td>
                    <td className="px-5 py-2 text-center font-mono font-medium text-emerald-600 dark:text-emerald-500 text-xs">
                      {member.completedTasks}
                    </td>
                    <td className="px-5 py-2 text-right font-mono font-bold text-foreground text-xs">
                      {member.operationalHours}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Grid (< 768px) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {teamStats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No team members assigned to this project yet.
          </div>
        ) : (
          teamStats.map((member) => {
            const initials = member.name.slice(0, 2).toUpperCase()
            return (
              <Card key={member.userId} className="border-border bg-card shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 bg-secondary border border-border">
                        {member.profilePhoto && <AvatarImage src={member.profilePhoto} alt={member.name} />}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{member.name}</h4>
                        <p className="text-xs text-muted-foreground">{member.designation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center text-xs">
                    <div className="bg-secondary/30 p-2 rounded-sm">
                      <span className="text-[10px] text-muted-foreground block">Assigned</span>
                      <span className="font-bold text-foreground text-sm">{member.assignedTasks}</span>
                    </div>

                    <div className="bg-secondary/30 p-2 rounded-sm">
                      <span className="text-[10px] text-muted-foreground block">Done</span>
                      <span className="font-bold text-foreground text-sm">{member.completedTasks}</span>
                    </div>

                    <div className="bg-secondary/30 p-2 rounded-sm">
                      <span className="text-[10px] text-muted-foreground block">Worked</span>
                      <span className="font-bold text-foreground text-sm">{member.operationalHours}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
