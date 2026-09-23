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
    <div className="flex items-center space-x-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
      <Checkbox 
        id={task.id} 
        checked={task.is_completed} 
        onCheckedChange={(checked) => handleToggle(checked === true)}
        disabled={isPending}
        className="border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 dark:data-[state=checked]:bg-white dark:data-[state=checked]:border-white dark:data-[state=checked]:text-black"
      />
      <div className="flex-1 flex items-center justify-between">
        <label 
          htmlFor={task.id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
            task.is_completed ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-700 dark:text-zinc-200"
          )}
        >
          {task.task_name}
        </label>
        {task.is_required ? (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-zinc-500 border-zinc-200 dark:border-zinc-800">Required</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-zinc-400 border-dashed border-zinc-200 dark:border-zinc-800">Optional</Badge>
        )}
      </div>
    </div>
  )
}
