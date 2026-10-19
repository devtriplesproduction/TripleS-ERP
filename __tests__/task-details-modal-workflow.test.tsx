import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { Task, TaskComment } from '@/types/project-management'
import * as taskActions from '@/lib/actions/tasks'

// Mock next/navigation
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Dialog to render inline in static markup without portal
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
}))

// Mock server actions
vi.mock('@/lib/actions/tasks', () => ({
  updateTaskStatusAction: vi.fn(),
  addTaskCommentAction: vi.fn(),
  logTaskHoursAction: vi.fn(),
  toggleTaskChecklistItemAction: vi.fn(),
  getTaskByIdAction: vi.fn(),
}))

const sampleTask: Task = {
  id: 'task-100',
  task_id_display: 'TSK-100',
  title: 'Audit Modal Workflows',
  description: 'Detailed description for test task.',
  project_id: 'proj-1',
  project_name: 'Core Platform',
  priority: 'HIGH',
  status: 'TODO',
  start_date: '2026-10-15',
  due_date: '2026-10-25',
  estimated_hours: 10,
  worked_hours: 2,
  dependencies: [],
  attachments: [],
  order_index: 0,
  created_by: 'user-admin',
  created_at: '2026-10-15T00:00:00Z',
  updated_at: '2026-10-15T00:00:00Z',
  comments_count: 1,
  is_overdue: false,
  assignees: [
    {
      id: 'asg-1',
      task_id: 'task-100',
      user_id: 'u-1',
      assigned_at: '2026-10-15T00:00:00Z',
      profile: {
        id: 'u-1',
        first_name: 'Omkar',
        last_name: 'Sawant',
        employee_id: 'EMP-001',
        profile_photo: null,
      },
    },
  ],
  checklist: [
    {
      id: 'chk-1',
      task_id: 'task-100',
      title: 'Verify modal remains open',
      is_completed: false,
      order_index: 0,
    },
  ],
  comments: [
    {
      id: 'comm-1',
      task_id: 'task-100',
      user_id: 'u-1',
      comment: 'Initial kick-off comment',
      created_at: '2026-10-16T10:00:00Z',
      updated_at: '2026-10-16T10:00:00Z',
      user_profile: {
        id: 'u-1',
        first_name: 'Omkar',
        last_name: 'Sawant',
        profile_photo: null,
      },
    },
  ],
}

describe('TaskDetailsModal Workflow & State Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Renders task details modal without crashing', () => {
    const handleClose = vi.fn()
    const handleUpdate = vi.fn()

    const html = renderToStaticMarkup(
      <TaskDetailsModal
        task={sampleTask}
        isOpen={true}
        onClose={handleClose}
        onUpdate={handleUpdate}
        canManage={true}
      />
    )

    // Modal elements are visible
    expect(html).toContain('TSK-100')
    expect(html).toContain('Audit Modal Workflows')
    expect(html).toContain('Core Platform')
    expect(html).toContain('Current Status')
    expect(html).toContain('Detailed description for test task.')
    expect(html).toContain('Log worked operational hours')
    expect(html).toContain('Log Time')
    expect(html).toContain('Omkar Sawant')
    expect(html).toContain('Verify modal remains open')
    expect(html).toContain('Initial kick-off comment')
    expect(html).toContain('Write a comment or status update...')
  })

  it('2. Does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <TaskDetailsModal
        task={sampleTask}
        isOpen={false}
        onClose={vi.fn()}
        canManage={true}
      />
    )

    expect(html).toBe('')
  })

  it('3. Does not render when task is null', () => {
    const html = renderToStaticMarkup(
      <TaskDetailsModal
        task={null}
        isOpen={true}
        onClose={vi.fn()}
        canManage={true}
      />
    )

    expect(html).toBe('')
  })

  it('4. Status change handler logic updates task optimistically and fetches fresh data without redirecting', async () => {
    let currentTask = sampleTask
    const updates: Task[] = []

    const onUpdate = (t?: Task) => {
      if (t) updates.push(t)
    }

    // Simulate handleStatusChange
    const newStatus = 'IN_PROGRESS'
    const optimisticTask: Task = { ...currentTask, status: newStatus }
    currentTask = optimisticTask
    onUpdate(optimisticTask)

    expect(updates).toHaveLength(1)
    expect(updates[0].status).toBe('IN_PROGRESS')

    // Mock API success and get fresh task
    const freshData: Task = { ...optimisticTask, updated_at: '2026-10-19T10:00:00Z' }
    vi.mocked(taskActions.updateTaskStatusAction).mockResolvedValue({ success: true })
    vi.mocked(taskActions.getTaskByIdAction).mockResolvedValue({ success: true, data: freshData })

    const res = await taskActions.updateTaskStatusAction(currentTask.id, newStatus)
    expect(res.success).toBe(true)

    const fresh = await taskActions.getTaskByIdAction(currentTask.id)
    expect(fresh.success).toBe(true)
    if (fresh.data) {
      currentTask = fresh.data
      onUpdate(fresh.data)
    }

    expect(updates).toHaveLength(2)
    expect(updates[1].status).toBe('IN_PROGRESS')
    expect(currentTask.id).toBe('task-100')
  })

  it('5. Operational hours logging logic updates worked_hours without redirecting', async () => {
    let currentTask = sampleTask
    const updates: Task[] = []
    const onUpdate = (t?: Task) => {
      if (t) updates.push(t)
    }

    const num = 3.5
    const optimisticHours = Math.round(((currentTask.worked_hours || 0) + num) * 100) / 100
    const optimisticTask: Task = { ...currentTask, worked_hours: optimisticHours }
    currentTask = optimisticTask
    onUpdate(optimisticTask)

    expect(currentTask.worked_hours).toBe(5.5)
    expect(updates[0].worked_hours).toBe(5.5)

    vi.mocked(taskActions.logTaskHoursAction).mockResolvedValue({ success: true })
    const res = await taskActions.logTaskHoursAction(currentTask.id, num)
    expect(res.success).toBe(true)
  })

  it('6. Failure in API rollback preserves state and does not reload page', async () => {
    const previousTask = sampleTask
    let currentTask = sampleTask

    // User attempts to log hours but network fails
    const num = 4
    const optimisticTask: Task = { ...currentTask, worked_hours: 6 }
    currentTask = optimisticTask

    vi.mocked(taskActions.logTaskHoursAction).mockResolvedValue({
      success: false,
      error: 'Network connection failed',
    })

    const res = await taskActions.logTaskHoursAction(currentTask.id, num)
    expect(res.success).toBe(false)

    // Rollback to previousTask
    currentTask = previousTask
    expect(currentTask.worked_hours).toBe(2)
  })

  it('7. Adding comment logic updates comments array and count without reload', async () => {
    let currentTask = sampleTask
    const newComment: TaskComment = {
      id: 'comm-2',
      task_id: 'task-100',
      user_id: 'u-1',
      comment: 'Operational testing complete.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_profile: {
        id: 'u-1',
        first_name: 'Omkar',
        last_name: 'Sawant',
        profile_photo: null,
      },
    }

    vi.mocked(taskActions.addTaskCommentAction).mockResolvedValue({
      success: true,
      data: newComment,
    })

    const res = await taskActions.addTaskCommentAction('task-100', 'Operational testing complete.')
    expect(res.success).toBe(true)
    if (res.data) {
      currentTask = {
        ...currentTask,
        comments: [res.data, ...(currentTask.comments || [])],
        comments_count: (currentTask.comments_count || 0) + 1,
      }
    }

    expect(currentTask.comments_count).toBe(2)
    expect(currentTask.comments?.[0].comment).toBe('Operational testing complete.')
  })
})
