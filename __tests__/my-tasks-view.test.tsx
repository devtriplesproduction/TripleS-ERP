import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MyTasksView } from '@/components/tasks/MyTasksView'
import { Task } from '@/types/project-management'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/my-tasks',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/actions/tasks', () => ({
  updateTaskStatusAction: vi.fn(),
  getTaskByIdAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/components/tasks/TaskDetailsModal', () => ({
  TaskDetailsModal: () => <div data-testid="task-details-modal" />,
}))

const mockTasks: Task[] = [
  {
    id: 'task-1',
    task_id_display: 'TSK-010',
    title: 'Completed Task',
    description: 'No description provided.',
    project_id: 'proj-1',
    project_name: 'New Project',
    priority: 'MEDIUM',
    status: 'IN_REVIEW',
    start_date: '2026-10-01',
    due_date: '2026-10-07',
    estimated_hours: 8,
    worked_hours: 0,
    dependencies: [],
    attachments: [],
    order_index: 1,
    created_by: 'user-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    comments_count: 0,
    is_overdue: true,
    assignees: [
      {
        id: 'assignee-1',
        task_id: 'task-1',
        user_id: 'u-1',
        assigned_at: '2026-10-01T00:00:00Z',
        profile: {
          id: 'u-1',
          first_name: 'John',
          last_name: 'Doe',
          employee_id: 'EMP-001',
        },
      },
    ],
  },
  {
    id: 'task-2',
    task_id_display: 'TSK-011',
    title: 'High Priority Task',
    description: 'Working on core design system tokens.',
    project_id: 'proj-2',
    project_name: 'Design System',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    start_date: '2026-10-05',
    due_date: '2026-10-20',
    estimated_hours: 12,
    worked_hours: 4.5,
    dependencies: [],
    attachments: [{ name: 'spec.pdf', url: 'https://example.com/spec.pdf' }],
    order_index: 2,
    created_by: 'user-2',
    created_at: '2026-10-05T00:00:00Z',
    updated_at: '2026-10-05T00:00:00Z',
    comments_count: 3,
    is_overdue: false,
    assignees: [],
  },
]

describe('MyTasksView Component', () => {
  it('renders correctly with tasks in list (table) mode', () => {
    const html = renderToStaticMarkup(
      <MyTasksView
        todayTasks={mockTasks}
        upcomingTasks={[]}
        pendingTasks={[]}
        overdueTasks={[]}
        recentlyAssignedTasks={[]}
        completedTasks={[]}
        userProjects={[]}
        userRole="Employee"
        isHod={false}
        defaultViewMode="list"
      />
    )

    // Table elements (Action column removed, all 8 data columns present)
    expect(html).toContain('Task ID')
    expect(html).toContain('Task Title')
    expect(html).toContain('Project')
    expect(html).toContain('Priority')
    expect(html).toContain('Due Date')
    expect(html).toContain('Status')
    expect(html).toContain('Assignee')
    expect(html).toContain('Metrics')
    expect(html).not.toContain('<span>Action</span>')
    expect(html).not.toContain('title="View task details"')

    // Task 1 data in table
    expect(html).toContain('TSK-010')
    expect(html).toContain('Completed Task')
    expect(html).toContain('New Project')
    expect(html).toContain('MEDIUM')
    expect(html).toContain('07 Oct 2026')
    expect(html).toContain('In Review')

    // Task 2 data in table
    expect(html).toContain('TSK-011')
    expect(html).toContain('High Priority Task')
    expect(html).toContain('Design System')
    expect(html).toContain('HIGH')
    expect(html).toContain('20 Oct 2026')
    expect(html).toContain('In Progress')
    expect(html).toContain('4.5h')
    expect(html).toContain('Unassigned')
  })

  it('truncates descriptions exceeding 12 words in List View and appends ellipsis', () => {
    const longDescTask: Task = {
      ...mockTasks[0],
      id: 'task-long-desc',
      description: 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen words here.',
    }

    const html = renderToStaticMarkup(
      <MyTasksView
        todayTasks={[longDescTask]}
        upcomingTasks={[]}
        pendingTasks={[]}
        overdueTasks={[]}
        recentlyAssignedTasks={[]}
        completedTasks={[]}
        userProjects={[]}
        userRole="Employee"
        isHod={false}
        defaultViewMode="list"
      />
    )

    // Truncated to 12 words + '...'
    expect(html).toContain('One two three four five six seven eight nine ten eleven twelve...')
    // Full description still preserved in title tooltip
    expect(html).toContain('title="One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen words here."')
  })

  it('renders correctly in grid (compact card) mode with corner priority and bottom-left details button', () => {
    const html = renderToStaticMarkup(
      <MyTasksView
        todayTasks={mockTasks}
        upcomingTasks={[]}
        pendingTasks={[]}
        overdueTasks={[]}
        recentlyAssignedTasks={[]}
        completedTasks={[]}
        userProjects={[]}
        userRole="Employee"
        isHod={false}
        defaultViewMode="grid"
      />
    )

    // Card grid container with 12-16px gap (gap-3.5 = 14px)
    expect(html).toContain('gap-3.5')

    // Task 1 Card assertions
    expect(html).toContain('TSK-010')
    expect(html).toContain('Completed Task')
    expect(html).toContain('New Project')
    expect(html).toContain('MEDIUM')

    // Priority badge in top corner with uppercase styling
    expect(html).toContain('uppercase tracking-wider')
    expect(html).toContain('border-amber-500')

    // Aligned Due date and Status dropdown
    expect(html).toContain('Due Date')
    expect(html).toContain('07 Oct 2026')
    expect(html).toContain('In Review')

    // Details navigation button in bottom-left corner with "Open task details" title
    expect(html).toContain('title="Open task details"')

    // Footer metrics on the right: hours, attachments, comments
    expect(html).toContain('0 hrs')
    expect(html).toContain('Operational hours logged')
    expect(html).toContain('Attachments count')
    expect(html).toContain('Comments count')
  })

  it('renders empty queue message when no tasks exist', () => {
    const html = renderToStaticMarkup(
      <MyTasksView
        todayTasks={[]}
        upcomingTasks={[]}
        pendingTasks={[]}
        overdueTasks={[]}
        recentlyAssignedTasks={[]}
        completedTasks={[]}
        userProjects={[]}
        userRole="Employee"
        isHod={false}
      />
    )

    expect(html).toContain('All clear for today!')
    expect(html).toContain('You have no tasks in this queue right now.')
  })
})
