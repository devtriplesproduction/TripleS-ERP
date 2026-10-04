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
      {/* Privacy Notice Banner */}
      <div className="bg-secondary/30 border border-border p-3.5 rounded-lg flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
          <span>
            <strong>Operational Hour Transparency:</strong> Hours displayed indicate task-dedicated operational time. Financial compensation, salary, and stipend records remain strictly private and restricted to HR/Super Admin.
          </span>
        </div>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted border-b border-border text-muted-foreground uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 font-medium">Team Member</th>
              <th className="p-4 font-medium">Role / Designation</th>
              <th className="p-4 text-center font-medium">Assigned Tasks</th>
              <th className="p-4 text-center font-medium">Completed Tasks</th>
              <th className="p-4 text-right font-medium">Operational Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teamStats.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No team members assigned to this project yet.
                </td>
              </tr>
            ) : (
              teamStats.map((member) => {
                const initials = member.name.slice(0, 2).toUpperCase()
                return (
                  <tr key={member.userId} className="hover:bg-accent/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-secondary border border-border">
                          {member.profilePhoto && <AvatarImage src={member.profilePhoto} alt={member.name} />}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {member.designation}
                      </Badge>
                    </td>
                    <td className="p-4 text-center font-mono font-medium text-foreground">
                      {member.assignedTasks}
                    </td>
                    <td className="p-4 text-center font-mono font-medium text-foreground">
                      {member.completedTasks}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-foreground">
                      {member.operationalHours} hrs
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
