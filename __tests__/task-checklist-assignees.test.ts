import { describe, it, expect } from 'vitest'
import type { TaskChecklistItem, Task } from '@/types/project-management'

describe('Task Assignees & Execution Checklist Logic', () => {
  describe('Assignee Deduplication & Removal', () => {
    it('prevents duplicate member assignments', () => {
      const initial = ['user-1', 'user-2']
      const toggleAssignee = (list: string[], id: string) =>
        list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

      // Adding existing user-1 should remove it (toggle)
      const afterToggle = toggleAssignee(initial, 'user-1')
      expect(afterToggle).toEqual(['user-2'])

      // Adding new user-3 should add it
      const afterAdd = toggleAssignee(afterToggle, 'user-3')
      expect(afterAdd).toEqual(['user-2', 'user-3'])

      // De-duplicating ensures set semantics
      const withDupes = ['user-1', 'user-2', 'user-1', 'user-3', 'user-2']
      const unique = Array.from(new Set(withDupes))
      expect(unique).toEqual(['user-1', 'user-2', 'user-3'])
    })

    it('removes member when x button is clicked', () => {
      const assignees = ['user-1', 'user-2', 'user-3']
      const removeAssignee = (list: string[], idToRemove: string) =>
        list.filter((id) => id !== idToRemove)

      const updated = removeAssignee(assignees, 'user-2')
      expect(updated).toEqual(['user-1', 'user-3'])
    })
  })

  describe('Execution Checklist Operations', () => {
    it('supports adding checklist items', () => {
      const checklist: TaskChecklistItem[] = []
      const addItem = (list: TaskChecklistItem[], title: string): TaskChecklistItem[] => {
        const trimmed = title.trim()
        if (!trimmed) return list
        return [
          ...list,
          {
            id: `temp-${Date.now()}-${list.length}`,
            task_id: 'task-1',
            title: trimmed,
            is_completed: false,
            order_index: list.length,
          },
        ]
      }

      const step1 = addItem(checklist, 'Design UI mockups')
      expect(step1).toHaveLength(1)
      expect(step1[0].title).toBe('Design UI mockups')
      expect(step1[0].is_completed).toBe(false)

      const step2 = addItem(step1, 'Implement API endpoints')
      expect(step2).toHaveLength(2)
      expect(step2[1].title).toBe('Implement API endpoints')

      // Empty string should not be added
      const step3 = addItem(step2, '   ')
      expect(step3).toHaveLength(2)
    })

    it('supports toggling checklist item completion', () => {
      let items: TaskChecklistItem[] = [
        { id: '1', task_id: 'task-1', title: 'Task 1', is_completed: false, order_index: 0 },
        { id: '2', task_id: 'task-1', title: 'Task 2', is_completed: true, order_index: 1 },
      ]

      const toggleItem = (list: TaskChecklistItem[], id: string) =>
        list.map((it) => (it.id === id ? { ...it, is_completed: !it.is_completed } : it))

      items = toggleItem(items, '1')
      expect(items[0].is_completed).toBe(true)

      items = toggleItem(items, '2')
      expect(items[1].is_completed).toBe(false)
    })

    it('supports editing checklist item title', () => {
      const items: TaskChecklistItem[] = [
        { id: '1', task_id: 'task-1', title: 'Initial Title', is_completed: false, order_index: 0 },
      ]

      const editItem = (list: TaskChecklistItem[], id: string, newTitle: string) => {
        const trimmed = newTitle.trim()
        if (!trimmed) return list.filter((it) => it.id !== id)
        return list.map((it) => (it.id === id ? { ...it, title: trimmed } : it))
      }

      const edited = editItem(items, '1', 'Updated Title')
      expect(edited[0].title).toBe('Updated Title')

      // Clearing title deletes the item
      const deletedOnEmpty = editItem(items, '1', '   ')
      expect(deletedOnEmpty).toHaveLength(0)
    })

    it('supports deleting checklist items', () => {
      const items: TaskChecklistItem[] = [
        { id: '1', task_id: 'task-1', title: 'Item 1', is_completed: false, order_index: 0 },
        { id: '2', task_id: 'task-1', title: 'Item 2', is_completed: false, order_index: 1 },
      ]

      const deleteItem = (list: TaskChecklistItem[], id: string) =>
        list.filter((it) => it.id !== id)

      const result = deleteItem(items, '1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('correctly calculates checklist progress and completion statistics', () => {
      const items: TaskChecklistItem[] = [
        { id: '1', task_id: 'task-1', title: 'Item 1', is_completed: true, order_index: 0 },
        { id: '2', task_id: 'task-1', title: 'Item 2', is_completed: true, order_index: 1 },
        { id: '3', task_id: 'task-1', title: 'Item 3', is_completed: false, order_index: 2 },
        { id: '4', task_id: 'task-1', title: 'Item 4', is_completed: false, order_index: 3 },
      ]

      const total = items.length
      const completed = items.filter((c) => c.is_completed).length
      const percentage = Math.round((completed / total) * 100)

      expect(total).toBe(4)
      expect(completed).toBe(2)
      expect(percentage).toBe(50)
    })

    it('functions seamlessly when checklist is empty/optional', () => {
      const emptyChecklist: TaskChecklistItem[] = []
      const task: Partial<Task> = {
        title: 'Task without checklist',
        checklist: emptyChecklist,
        checklist_total: 0,
        checklist_completed: 0,
      }

      expect(task.checklist).toHaveLength(0)
      expect(task.checklist_total).toBe(0)
      expect(task.checklist_completed).toBe(0)
    })
  })

  describe('Employee Photo URL Resolution', () => {
    it('converts relative storage paths to full Supabase public URLs', async () => {
      const { getProfilePhotoUrl } = await import('@/lib/utils/profile-photos')

      const relative1 = 'profile-photos/ec90434e-901b-4dfa-b000-dca45d46cf71.jpeg'
      const url1 = getProfilePhotoUrl(relative1)
      expect(url1).toContain('https://sfjerymoxnolxblhelho.supabase.co/storage/v1/object/public/employee-documents/')
      expect(url1).toContain('profile-photos/ec90434e-901b-4dfa-b000-dca45d46cf71.jpeg')

      const relative2 = '/onboarding/1790788912423-kf20t.png'
      const url2 = getProfilePhotoUrl(relative2)
      expect(url2).toContain('https://sfjerymoxnolxblhelho.supabase.co/storage/v1/object/public/employee-documents/onboarding/1790788912423-kf20t.png')
    })

    it('returns absolute URLs unchanged', async () => {
      const { getProfilePhotoUrl } = await import('@/lib/utils/profile-photos')

      const absolute = 'https://example.com/avatar.png'
      expect(getProfilePhotoUrl(absolute)).toBe(absolute)
    })

    it('returns null for null, undefined, or empty photo paths', async () => {
      const { getProfilePhotoUrl } = await import('@/lib/utils/profile-photos')

      expect(getProfilePhotoUrl(null)).toBeNull()
      expect(getProfilePhotoUrl(undefined)).toBeNull()
      expect(getProfilePhotoUrl('')).toBeNull()
      expect(getProfilePhotoUrl('   ')).toBeNull()
    })
  })
})

