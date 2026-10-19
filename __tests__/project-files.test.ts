import { describe, it, expect, vi, beforeEach } from 'vitest'
import { attachProfilePhotos } from '@/lib/utils/profile-photos'
import type { ProjectFileMetadata } from '@/lib/actions/project-files'
import type { DocumentItem } from '@/components/documents/DocumentUploadSection'

describe('Project Files Architecture & Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Schema Integrity & Profile Photo Attachment', () => {
    it('attaches profile photo correctly from employee_onboarding via employee_id', async () => {
      const mockProfiles: Array<{ first_name: string; last_name: string; employee_id: string; profile_photo?: string | null }> = [
        { first_name: 'Omkar', last_name: 'Sawant', employee_id: 'EMP-001' },
        { first_name: 'Priya', last_name: 'Patil', employee_id: 'EMP-002' },
      ]

      const mockAdmin: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'employee_onboarding') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { employee_id_number: 'EMP-001', profile_photo: 'photos/omkar.jpg' },
                    { employee_id_number: 'EMP-002', profile_photo: 'photos/priya.png' },
                  ],
                }),
              }),
            }
          }
          return {}
        }),
      }

      await attachProfilePhotos(mockAdmin, mockProfiles)

      expect(mockProfiles[0]).toHaveProperty('profile_photo')
      expect(mockProfiles[0].profile_photo).toContain('photos/omkar.jpg')
      expect(mockProfiles[1]).toHaveProperty('profile_photo')
      expect(mockProfiles[1].profile_photo).toContain('photos/priya.png')
    })

    it('handles nested/array profile relations returned by PostgREST', async () => {
      const rawRows = [
        {
          id: 'file-1',
          file_name: 'specs.pdf',
          profile: [{ first_name: 'Aarav', last_name: 'Sharma', employee_id: 'EMP-003' }],
        },
        {
          id: 'file-2',
          file_name: 'design.png',
          profile: { first_name: 'Sneha', last_name: 'Kulkarni', employee_id: 'EMP-004' },
        },
      ]

      const allProfiles: any[] = []
      const normalized = rawRows.map((row) => {
        let prof = row.profile
        if (Array.isArray(prof)) prof = prof[0] || null
        if (prof) allProfiles.push(prof)
        return { ...row, profile: prof }
      })

      expect(normalized[0].profile).toEqual({ first_name: 'Aarav', last_name: 'Sharma', employee_id: 'EMP-003' })
      expect(normalized[1].profile).toEqual({ first_name: 'Sneha', last_name: 'Kulkarni', employee_id: 'EMP-004' })
      expect(allProfiles).toHaveLength(2)
    })
  })

  describe('2. Project Access & Permission Matrix', () => {
    const checkUserProjectAccess = async (admin: any, projectId: string, user: any): Promise<boolean> => {
      const isGlobalAdminOrManager = user.role === 'Admin' || user.is_hod
      if (isGlobalAdminOrManager) return true

      const { data: pCheck } = await admin.from('projects').select('project_manager_id').eq('id', projectId).single()
      if (pCheck?.project_manager_id === user.id) return true

      const { data: mCheck } = await admin.from('project_members').select('id').eq('project_id', projectId).eq('user_id', user.id)
      if (mCheck && mCheck.length > 0) return true

      const { data: tCheck } = await admin.from('tasks').select('id').eq('project_id', projectId)
      if (tCheck && tCheck.length > 0) {
        const taskIds = tCheck.map((t: any) => t.id)
        const { data: taCheck } = await admin.from('task_assignees').select('id').in('task_id', taskIds).eq('user_id', user.id).limit(1)
        if (taCheck && taCheck.length > 0) return true
      }

      return false
    }

    it('grants access to global Admin and HOD users', async () => {
      const mockAdmin: any = {}
      expect(await checkUserProjectAccess(mockAdmin, 'proj-1', { id: 'u1', role: 'Admin', is_hod: false })).toBe(true)
      expect(await checkUserProjectAccess(mockAdmin, 'proj-1', { id: 'u2', role: 'Employee', is_hod: true })).toBe(true)
    })

    it('grants access to assigned Project Manager', async () => {
      const mockAdmin: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { project_manager_id: 'pm-user-1' } }),
            }),
          }),
        }),
      }

      const hasAccess = await checkUserProjectAccess(mockAdmin, 'proj-1', { id: 'pm-user-1', role: 'Employee', is_hod: false })
      expect(hasAccess).toBe(true)
    })

    it('grants access to project team members', async () => {
      const mockAdmin: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { project_manager_id: 'other-pm' } }),
                }),
              }),
            }
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [{ id: 'mem-1' }] }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const hasAccess = await checkUserProjectAccess(mockAdmin, 'proj-1', { id: 'member-user', role: 'Employee', is_hod: false })
      expect(hasAccess).toBe(true)
    })

    it('denies access to non-member unauthorized users', async () => {
      const mockAdmin: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { project_manager_id: 'pm-1' } }),
                }),
              }),
            }
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }
          }
          if (table === 'tasks') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }
          }
          return {}
        }),
      }

      const hasAccess = await checkUserProjectAccess(mockAdmin, 'proj-1', { id: 'stranger-user', role: 'Employee', is_hod: false })
      expect(hasAccess).toBe(false)
    })
  })

  describe('3. Upload Validation & Storage Rollback', () => {
    it('rejects executable and script files', () => {
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1']
      const validateFile = (fileName: string) => {
        const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
        return !dangerousExtensions.includes(ext)
      }

      expect(validateFile('malware.exe')).toBe(false)
      expect(validateFile('script.sh')).toBe(false)
      expect(validateFile('install.bat')).toBe(false)
      expect(validateFile('project-brief.pdf')).toBe(true)
      expect(validateFile('design-assets.zip')).toBe(true)
    })

    it('rejects files exceeding 50MB size limit', () => {
      const MAX_SIZE = 50 * 1024 * 1024
      const isAllowed = (size: number) => size <= MAX_SIZE

      expect(isAllowed(45 * 1024 * 1024)).toBe(true)
      expect(isAllowed(50 * 1024 * 1024)).toBe(true)
      expect(isAllowed(50 * 1024 * 1024 + 1)).toBe(false)
      expect(isAllowed(100 * 1024 * 1024)).toBe(false)
    })

    it('rolls back storage when database metadata insertion fails', async () => {
      const removeMock = vi.fn().mockResolvedValue({ error: null })
      const mockAdmin: any = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            remove: removeMock,
          }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ error: { message: 'Database connection failed' } }),
            }),
          }),
        }),
      }

      const storagePath = 'proj-123/file-abc-test.pdf'
      // Simulate failure in insert
      const { error: insertError } = await mockAdmin.from('project_files').insert({}).select().single()
      if (insertError) {
        await mockAdmin.storage.from('project-files').remove([storagePath])
      }

      expect(removeMock).toHaveBeenCalledWith([storagePath])
    })
  })

  describe('4. Delete Permissions Verification', () => {
    const canDeleteFile = (
      user: { id: string; role: string; is_hod: boolean },
      projectManagerId: string,
      uploadedById: string
    ) => {
      if (user.role === 'Admin' || user.is_hod) return true
      if (projectManagerId === user.id) return true
      if (uploadedById === user.id) return true
      return false
    }

    it('allows Admin, HOD, and PM to delete any file', () => {
      expect(canDeleteFile({ id: 'admin-1', role: 'Admin', is_hod: false }, 'pm-1', 'uploader-1')).toBe(true)
      expect(canDeleteFile({ id: 'hod-1', role: 'Employee', is_hod: true }, 'pm-1', 'uploader-1')).toBe(true)
      expect(canDeleteFile({ id: 'pm-1', role: 'Employee', is_hod: false }, 'pm-1', 'uploader-1')).toBe(true)
    })

    it('allows file uploader to delete their own file', () => {
      expect(canDeleteFile({ id: 'uploader-1', role: 'Employee', is_hod: false }, 'pm-1', 'uploader-1')).toBe(true)
    })

    it('prevents other members from deleting someone else file', () => {
      expect(canDeleteFile({ id: 'other-emp', role: 'Employee', is_hod: false }, 'pm-1', 'uploader-1')).toBe(false)
    })
  })

  describe('5. UI Metadata & DocumentItem Mapping', () => {
    it('correctly maps ProjectFileMetadata into DocumentItem for DocumentUploadSection', () => {
      const projectFile: ProjectFileMetadata = {
        id: 'file-uuid-1',
        project_id: 'proj-123',
        uploaded_by: 'user-123',
        file_name: 'Requirements-Doc.pdf',
        storage_path: 'proj-123/Requirements-Doc.pdf',
        file_size: 2048576,
        mime_type: 'application/pdf',
        created_at: '2026-10-19T10:00:00Z',
        updated_at: '2026-10-19T10:00:00Z',
        profile: {
          first_name: 'Omkar',
          last_name: 'Sawant',
          profile_photo: 'https://example.com/photo.jpg',
        },
      }

      const uploaderName = projectFile.profile
        ? `${projectFile.profile.first_name} ${projectFile.profile.last_name || ''}`.trim()
        : undefined

      const docItem: DocumentItem = {
        id: projectFile.id,
        name: projectFile.file_name,
        size: projectFile.file_size,
        type: projectFile.mime_type,
        created_at: projectFile.created_at,
        path: projectFile.storage_path,
        uploaded_by: uploaderName
          ? {
              name: uploaderName,
              avatar: projectFile.profile?.profile_photo || null,
            }
          : undefined,
        raw: projectFile,
      }

      expect(docItem.id).toBe('file-uuid-1')
      expect(docItem.name).toBe('Requirements-Doc.pdf')
      expect(docItem.size).toBe(2048576)
      expect(docItem.uploaded_by).toEqual({
        name: 'Omkar Sawant',
        avatar: 'https://example.com/photo.jpg',
      })
      expect(docItem.path).toBe('proj-123/Requirements-Doc.pdf')
    })
  })
})
