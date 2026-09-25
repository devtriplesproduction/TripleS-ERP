'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { toggleTaskStatus } from '@/lib/actions/onboarding'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function ChecklistItem({ 
  task, 
  employeeId 
}: { 
  task: { id: string, task_name: string, is_completed: boolean, is_required: boolean },
  employeeId: string
}) {
  const [isPending, setIsPending] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setIsPending(true)
    try {
      await toggleTaskStatus(task.id, checked, employeeId)
    } catch (error) {
      console.error(error)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
      <Checkbox 
        id={task.id} 
        checked={task.is_completed} 
        onCheckedChange={(checked) => handleToggle(checked === true)}
        disabled={isPending}
        className="border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
      />
      <div className="flex-1 flex items-center justify-between">
        <label 
          htmlFor={task.id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
            task.is_completed ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {task.task_name}
        </label>
        {task.is_required ? (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground border-border">Required</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground border-dashed border-border">Optional</Badge>
        )}
      </div>
    </div>
  )
}
