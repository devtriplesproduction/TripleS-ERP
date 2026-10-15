'use client'

import { Project, Task } from '@/types/project-management'
import { ProjectGanttTab } from './ProjectGanttTab'

interface ProjectTimelineTabProps {
  project: Project
  tasks: Task[]
  canManageTasks?: boolean
  onTaskClick?: (task: Task) => void
  onAddTask?: () => void
}

export function ProjectTimelineTab({
  project,
  tasks,
  canManageTasks,
  onTaskClick = () => {},
  onAddTask,
}: ProjectTimelineTabProps) {
  return (
    <ProjectGanttTab
      project={project}
      tasks={tasks}
      canManageTasks={canManageTasks}
      onTaskClick={onTaskClick}
      onAddTask={onAddTask}
    />
  )
}

export { ProjectGanttTab }
