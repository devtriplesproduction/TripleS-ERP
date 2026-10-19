import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Task } from '@/types/project-management'

const baseTask: Task = {
  id: 'task-1',
  task_id_display: 'TSK-001',
  title: 'Completed Task',
  description: 'Sample description',
  project_id: 'proj-1',
  project_name: 'Core ERP',
  priority: 'MEDIUM',
  status: 'DONE',
  start_date: '2026-10-01',
  due_date: '2026-10-07',
  estimated_hours: 40,
  worked_hours: 45,
  dependencies: [],
  attachments: [],
  order_index: 0,
  created_by: 'user-1',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  comments_count: 3,
  is_overdue: true,
  assignees: [
    {
      id: 'asg-1',
      task_id: 'task-1',
      user_id: 'u-1',
      assigned_at: '2026-10-01T00:00:00Z',
      profile: {
        id: 'u-1',
        first_name: 'Omkar',
        last_name: 'Sawant',
        employee_id: 'EMP-001',
        profile_photo: 'https://example.com/photo1.jpg',
      },
    },
    {
      id: 'asg-2',
      task_id: 'task-1',
      user_id: 'u-2',
      assigned_at: '2026-10-01T00:00:00Z',
      profile: {
        id: 'u-2',
        first_name: 'Pravin',
        last_name: 'Farkade',
        employee_id: 'EMP-002',
        profile_photo: null,
      },
    },
    {
      id: 'asg-3',
      task_id: 'task-1',
      user_id: 'u-3',
      assigned_at: '2026-10-01T00:00:00Z',
      profile: {
        id: 'u-3',
        first_name: 'Third',
        last_name: 'Member',
        employee_id: 'EMP-003',
        profile_photo: null,
      },
    },
    {
      id: 'asg-4',
      task_id: 'task-1',
      user_id: 'u-4',
      assigned_at: '2026-10-01T00:00:00Z',
      profile: {
        id: 'u-4',
        first_name: 'Fourth',
        last_name: 'Member',
        employee_id: 'EMP-004',
        profile_photo: null,
      },
    },
    {
      id: 'asg-5',
      task_id: 'task-1',
      user_id: 'u-5',
      assigned_at: '2026-10-01T00:00:00Z',
      profile: {
        id: 'u-5',
        first_name: 'Fifth',
        last_name: 'Member',
        employee_id: 'EMP-005',
        profile_photo: null,
      },
    },
  ],
}

describe('Kanban TaskCard Component Layout', () => {
  it('1. Renders title on the left and Priority badge on the right in the same header row', () => {
    const html = renderToStaticMarkup(
      <TaskCard
        task={baseTask}
        onClick={vi.fn()}
        canManage={true}
      />
    )

    // Task title and priority badge
    expect(html).toContain('Completed Task')
    expect(html).toContain('MEDIUM')

    // Single horizontal header row with justify-between
    expect(html).toContain('justify-between')

    // Priority badge has uppercase and bold styling
    expect(html).toContain('uppercase tracking-wider')
    expect(html).toContain('border-amber-500')
  })

  it('2. Renders metadata: due date, comments, tracked hours, and avatars', () => {
    const html = renderToStaticMarkup(
      <TaskCard
        task={baseTask}
        onClick={vi.fn()}
        canManage={true}
      />
    )

    // Formatted due date Oct 07
    expect(html).toContain('Oct 07')

    // Comments count
    expect(html).toContain('3')

    // Tracked worked hours
    expect(html).toContain('45h')

    // Assignee avatars: PF fallback and +2 pill for 5 assignees
    expect(html).toContain('PF')
    expect(html).toContain('+2')
  })

  it('3. Renders solid red dot for overdue tasks', () => {
    const overdueTask: Task = {
      ...baseTask,
      status: 'IN_PROGRESS',
      is_overdue: true,
    }

    const html = renderToStaticMarkup(
      <TaskCard
        task={overdueTask}
        onClick={vi.fn()}
        canManage={true}
      />
    )

    expect(html).toContain('bg-red-500')
    expect(html).toContain('text-red-500')
  })

  it('4. Applies square-corner styling (3-4px border radius) to badge and compact padding to card container', () => {
    const html = renderToStaticMarkup(
      <TaskCard
        task={baseTask}
        onClick={vi.fn()}
        canManage={true}
      />
    )

    // Square corner style (3-4px border radius)
    expect(html).toContain('rounded-[3.5px]')
    // Compact vertical padding (py-2.5 sm:py-3)
    expect(html).toContain('py-2.5')
  })

  it('5. Handles unassigned task gracefully without rendering avatar list', () => {
    const unassignedTask: Task = {
      ...baseTask,
      assignees: [],
    }

    const html = renderToStaticMarkup(
      <TaskCard
        task={unassignedTask}
        onClick={vi.fn()}
        canManage={true}
      />
    )

    // Task title and metadata still render cleanly
    expect(html).toContain('Completed Task')
    expect(html).toContain('Oct 07')
    // No avatars rendered
    expect(html).not.toContain('PF')
    expect(html).not.toContain('+2')
  })

  it('6. Completely omits bottom row for tasks with no metadata or assignees to eliminate empty space', () => {
    const emptyMetadataTask: Task = {
      ...baseTask,
      due_date: null,
      comments_count: 0,
      worked_hours: 0,
      assignees: [],
    }

    const html = renderToStaticMarkup(
      <TaskCard
        task={emptyMetadataTask}
        onClick={vi.fn()}
        canManage={true}
      />
    )

    // Renders header row
    expect(html).toContain('Completed Task')
    expect(html).toContain('MEDIUM')
    // Omits bottom metadata container
    expect(html).not.toContain('min-h-[22px]')
  })
})
