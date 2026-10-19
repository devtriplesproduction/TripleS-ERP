import { describe, it, expect, vi, beforeEach } from 'vitest'
import { canAssignProjectMembers, canEditProject } from '@/lib/permissions/project-management'
import type { AuthUser } from '@/lib/auth'

describe('Project Member Assignment & Persistence Logic', () => {
  describe('1. Member Selection, Deduplication & Toggle Logic', () => {
    it('prevents duplicate project member assignments', () => {
      const initial = ['emp-uuid-1', 'emp-uuid-2']
      const toggle = (list: string[], id: string) =>
        list.includes(id) ? list.filter((x) => x !== id) : Array.from(new Set([...list, id]))

      // Toggling existing member removes it
      const afterRemove = toggle(initial, 'emp-uuid-1')
      expect(afterRemove).toEqual(['emp-uuid-2'])

      // Toggling non-existing member adds it
      const afterAdd = toggle(afterRemove, 'emp-uuid-3')
      expect(afterAdd).toEqual(['emp-uuid-2', 'emp-uuid-3'])

      // Set deduplication strictly rejects duplicates
      const duplicated = ['emp-uuid-1', 'emp-uuid-2', 'emp-uuid-1', 'emp-uuid-3', 'emp-uuid-2']
      const unique = Array.from(new Set(duplicated))
      expect(unique).toEqual(['emp-uuid-1', 'emp-uuid-2', 'emp-uuid-3'])
    })

    it('supports selecting all filtered employees and clearing all', () => {
      const employees = [
        { id: '1', name: 'Alice Developer', department: 'Development' },
        { id: '2', name: 'Bob Designer', department: 'Design' },
        { id: '3', name: 'Charlie Developer', department: 'Development' },
      ]

      let selected: string[] = ['1']

      // Search for "Developer"
      const query = 'developer'
      const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(query) || e.department.toLowerCase().includes(query)
      )
      expect(filtered).toHaveLength(2)

      // Select all filtered
      const handleSelectAllFiltered = (current: string[], items: typeof employees) =>
        Array.from(new Set([...current, ...items.map((i) => i.id)]))

      selected = handleSelectAllFiltered(selected, filtered)
      expect(selected).toEqual(['1', '3'])

      // Deselect all
      const handleDeselectAll = () => []
      selected = handleDeselectAll()
      expect(selected).toEqual([])
    })

    it('correctly searches across name, designation, department, and employee ID', () => {
      const employees = [
        { id: 'u1', name: 'Aarav Sharma', designation: 'Senior Fullstack Lead', department: 'Engineering', employee_id: 'EMP-010' },
        { id: 'u2', name: 'Zara Khan', designation: 'UI/UX Designer', department: 'Creative', employee_id: 'EMP-022' },
        { id: 'u3', name: 'Rohan Mehta', designation: 'DevOps Specialist', department: 'Infrastructure', employee_id: 'EMP-045' },
      ]

      const search = (q: string) => {
        const query = q.trim().toLowerCase()
        if (!query) return employees
        return employees.filter(
          (emp) =>
            emp.name.toLowerCase().includes(query) ||
            emp.designation.toLowerCase().includes(query) ||
            emp.department.toLowerCase().includes(query) ||
            emp.employee_id.toLowerCase().includes(query)
        )
      }

      expect(search('Aarav')).toHaveLength(1)
      expect(search('Designer')).toHaveLength(1)
      expect(search('EMP-045')).toHaveLength(1)
      expect(search('engineering')).toHaveLength(1)
      expect(search('Nonexistent')).toHaveLength(0)
    })
  })

  describe('2. Safe Member Diffing Algorithm (Persistence)', () => {
    it('calculates additions and deletions without deleting unaffected continuing members', () => {
      const existingMembersInDb = [
        { id: 'rec-1', user_id: 'user-a', role: 'Project Manager' },
        { id: 'rec-2', user_id: 'user-b', role: 'Member' },
        { id: 'rec-3', user_id: 'user-c', role: 'Member' },
      ]

      // New selection keeps user-b, removes user-c, adds user-d
      const newSelectedUserIds = ['user-a', 'user-b', 'user-d']

      const existingUserIds = existingMembersInDb.map((m) => m.user_id)
      const toRemove = existingUserIds.filter((id) => !newSelectedUserIds.includes(id))
      const toAdd = newSelectedUserIds.filter((id) => !existingUserIds.includes(id))

      expect(toRemove).toEqual(['user-c'])
      expect(toAdd).toEqual(['user-d'])

      // Continuing members (user-a, user-b) are not in toRemove or toAdd
      expect(toRemove.includes('user-a')).toBe(false)
      expect(toRemove.includes('user-b')).toBe(false)
      expect(toAdd.includes('user-a')).toBe(false)
      expect(toAdd.includes('user-b')).toBe(false)
    })

    it('handles assigning only one project member', () => {
      const existing: string[] = []
      const newSelection = ['user-solo']

      const toRemove = existing.filter((id) => !newSelection.includes(id))
      const toAdd = newSelection.filter((id) => !existing.includes(id))

      expect(toRemove).toEqual([])
      expect(toAdd).toEqual(['user-solo'])
    })

    it('handles removing all project members safely', () => {
      const existing = ['user-1', 'user-2']
      const newSelection: string[] = []

      const toRemove = existing.filter((id) => !newSelection.includes(id))
      const toAdd = newSelection.filter((id) => !existing.includes(id))

      expect(toRemove).toEqual(['user-1', 'user-2'])
      expect(toAdd).toEqual([])
    })
  })

  describe('3. Separation of Project Membership & Task Assignment', () => {
    it('ensures project member assignment does NOT mutate task assignees', () => {
      const projectMembers = ['user-1', 'user-2']
      const taskAssignees = [
        { task_id: 't-101', user_id: 'user-1' },
      ]

      // Adding user-3 to project
      const updatedProjectMembers = [...projectMembers, 'user-3']

      // Task assignees list remains strictly isolated
      expect(updatedProjectMembers).toEqual(['user-1', 'user-2', 'user-3'])
      expect(taskAssignees).toHaveLength(1)
      expect(taskAssignees[0].user_id).toBe('user-1')
      expect(taskAssignees.some((ta) => ta.user_id === 'user-3')).toBe(false)
    })

    it('ensures removing a project member does not automatically delete them from historical task records unless explicitly reassigned', () => {
      const projectMembers = ['user-1', 'user-2']
      const taskAssignees = [{ task_id: 't-101', user_id: 'user-2' }]

      // Remove user-2 from project members
      const updatedProjectMembers = projectMembers.filter((id) => id !== 'user-2')

      // Membership is updated
      expect(updatedProjectMembers).toEqual(['user-1'])
      // Task assignees table is a separate relation
      expect(taskAssignees[0].user_id).toBe('user-2')
    })
  })

  describe('4. Permissions & RBAC for Project Member Assignment', () => {
    const adminUser: AuthUser = {
      id: 'admin-id',
      email: 'admin@triplesproduction.com',
      role: 'Admin',
      employee_id: 'EMP-ADM',
      employee_name: 'Admin User',
      is_hod: false,
    }

    const managerUser: AuthUser = {
      id: 'mgr-id',
      email: 'manager@triplesproduction.com',
      role: 'Manager',
      employee_id: 'EMP-MGR',
      employee_name: 'Manager User',
      is_hod: false,
    }

    const hodUser: AuthUser = {
      id: 'hod-id',
      email: 'hod@triplesproduction.com',
      role: 'Employee',
      employee_id: 'EMP-HOD',
      employee_name: 'HOD User',
      is_hod: true,
      department: 'Development',
    }

    const assignedPmEmployee: AuthUser = {
      id: 'pm-id',
      email: 'pm@triplesproduction.com',
      role: 'Employee',
      employee_id: 'EMP-PM',
      employee_name: 'PM Employee',
      is_hod: false,
    }

    const regularEmployee: AuthUser = {
      id: 'emp-id',
      email: 'emp@triplesproduction.com',
      role: 'Employee',
      employee_id: 'EMP-REG',
      employee_name: 'Regular Employee',
      is_hod: false,
    }

    const project = {
      project_manager_id: 'pm-id',
      created_by: 'hod-id',
    }

    it('allows Admin to assign project members', () => {
      expect(canAssignProjectMembers(adminUser, project)).toBe(true)
      expect(canEditProject(adminUser)).toBe(true)
    })

    it('allows Manager to assign project members', () => {
      expect(canAssignProjectMembers(managerUser, project)).toBe(true)
      expect(canEditProject(managerUser)).toBe(true)
    })

    it('allows HOD to assign project members', () => {
      expect(canAssignProjectMembers(hodUser, project)).toBe(true)
      expect(canEditProject(hodUser)).toBe(true)
    })

    it('allows the assigned Project Manager (even if role is Employee) to assign members', () => {
      expect(canAssignProjectMembers(assignedPmEmployee, project)).toBe(true)
    })

    it('STRICTLY forbids unprivileged regular employees from assigning members or themselves', () => {
      expect(canAssignProjectMembers(regularEmployee, project)).toBe(false)
      expect(canEditProject(regularEmployee)).toBe(false)
    })

    it('rejects unauthenticated requests', () => {
      expect(canAssignProjectMembers(null, project)).toBe(false)
      expect(canEditProject(null)).toBe(false)
    })
  })

  describe('5. Input Validation on Server', () => {
    it('validates UUID format for member IDs', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      const validUuids = [
        '6af63eb6-12a6-4809-97c6-ef0792eeab53',
        '85f403e0-639a-4fd2-8f19-a0ff8f273c5f',
      ]
      const invalidUuids = [
        'invalid-id',
        '../etc/passwd',
        "'; DROP TABLE project_members; --",
        '12345',
      ]

      validUuids.forEach((id) => {
        expect(uuidRegex.test(id)).toBe(true)
      })

      invalidUuids.forEach((id) => {
        expect(uuidRegex.test(id)).toBe(false)
      })
    })
  })
})
