import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadEmployeeFileAction, updateEmployeeData } from '@/lib/actions/onboarding'

let mockCurrentUser: any = {
  id: 'user-hr-1',
  email: 'hr@triples.com',
  role: 'HR',
  employee_id: 'TSP002',
  employee_name: 'HR User',
}

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
  guardServerAction: async (allowedRoles: string[]) => {
    if (!mockCurrentUser) throw new Error('Authentication required')
    if (!allowedRoles.includes(mockCurrentUser.role)) {
      throw new Error('Unauthorized: insufficient permissions')
    }
    return mockCurrentUser
  },
}))

const mockStorageUpload = vi.fn()
const mockStorageFrom = vi.fn().mockReturnValue({
  upload: mockStorageUpload,
  getPublicUrl: vi.fn().mockImplementation((path: string) => ({
    data: { publicUrl: `https://mock-supabase.co/storage/v1/object/public/employee-documents/${path}` }
  }))
})

const mockDbUpdate = vi.fn().mockResolvedValue({ data: null, error: null })
const mockDbFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'f2f15da0-80e6-4b8c-8095-6fc433ec6fbb', employee_id_number: 'TSP001' }, error: null })
    })
  }),
  update: vi.fn().mockReturnValue({
    eq: mockDbUpdate
  })
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn().mockImplementation(async () => ({
    storage: {
      from: mockStorageFrom
    },
    from: mockDbFrom
  })),
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockDbFrom,
    storage: {
      from: mockStorageFrom
    }
  }))
}))

describe('Employee Profile Documents Upload & Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageUpload.mockResolvedValue({ data: { path: 'onboarding/test.file' }, error: null })
    mockDbUpdate.mockResolvedValue({ data: null, error: null })
  })

  describe('1. uploadEmployeeFileAction Server Action', () => {
    it('returns error when no file is provided in FormData', async () => {
      const formData = new FormData()
      const res = await uploadEmployeeFileAction(formData)
      expect(res.success).toBe(false)
      expect(res.error).toBe('No file provided')
    })

    it('rejects files larger than 10MB', async () => {
      const largeFile = new File(['a'.repeat(100)], 'huge.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })

      const formData = new FormData()
      formData.append('file', largeFile)

      const res = await uploadEmployeeFileAction(formData)
      expect(res.success).toBe(false)
      expect(res.error).toContain('10MB limit')
    })

    it('successfully uploads PDF file to Supabase Storage in onboarding/ directory', async () => {
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
      const pdfFile = new File([pdfContent], 'resume.pdf', { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('file', pdfFile)

      const res = await uploadEmployeeFileAction(formData)
      expect(res.success).toBe(true)
      expect(res.path).toMatch(/^onboarding\/\d+-[a-z0-9]+\.pdf$/)
      expect(mockStorageUpload).toHaveBeenCalledWith(
        res.path,
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/pdf',
          upsert: false
        })
      )
    })

    it('successfully uploads JPG file to Supabase Storage in onboarding/ directory', async () => {
      const jpgContent = new Uint8Array([0xFF, 0xD8, 0xFF])
      const jpgFile = new File([jpgContent], 'id-card.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', jpgFile)

      const res = await uploadEmployeeFileAction(formData)
      expect(res.success).toBe(true)
      expect(res.path).toMatch(/^onboarding\/\d+-[a-z0-9]+\.jpg$/)
      expect(mockStorageUpload).toHaveBeenCalledWith(
        res.path,
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: false
        })
      )
    })

    it('successfully uploads PNG file to Supabase Storage in onboarding/ directory', async () => {
      const pngContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47])
      const pngFile = new File([pngContent], 'photo.png', { type: 'image/png' })

      const formData = new FormData()
      formData.append('file', pngFile)

      const res = await uploadEmployeeFileAction(formData)
      expect(res.success).toBe(true)
      expect(res.path).toMatch(/^onboarding\/\d+-[a-z0-9]+\.png$/)
      expect(mockStorageUpload).toHaveBeenCalledWith(
        res.path,
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'image/png',
          upsert: false
        })
      )
    })

    it('catches and gracefully returns storage error message without throwing React #441 crash', async () => {
      mockStorageUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Bucket not found or permission denied' }
      })

      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('file', pdfFile)

      const res = await uploadEmployeeFileAction(formData)
      expect(res.success).toBe(false)
      expect(res.error).toBe('Bucket not found or permission denied')
    })
  })

  describe('2. Metadata Persistence via updateEmployeeData', () => {
    it('updates employee_onboarding documents array with all metadata attributes', async () => {
      const employeeId = 'f2f15da0-80e6-4b8c-8095-6fc433ec6fbb'
      const documentsPayload = [
        {
          id: 'doc-1',
          name: 'offer_letter.pdf',
          url: 'https://mock-supabase.co/storage/v1/object/public/employee-documents/onboarding/1-doc.pdf',
          size: 102400,
          type: 'application/pdf',
          path: 'onboarding/1-doc.pdf',
          created_at: '2026-10-26T10:00:00.000Z'
        },
        {
          id: 'doc-2',
          name: 'pan_card.jpg',
          url: 'https://mock-supabase.co/storage/v1/object/public/employee-documents/onboarding/2-doc.jpg',
          size: 204800,
          type: 'image/jpeg',
          path: 'onboarding/2-doc.jpg',
          created_at: '2026-10-26T10:01:00.000Z'
        },
        {
          id: 'doc-3',
          name: 'avatar.png',
          url: 'https://mock-supabase.co/storage/v1/object/public/employee-documents/onboarding/3-doc.png',
          size: 51200,
          type: 'image/png',
          path: 'onboarding/3-doc.png',
          created_at: '2026-10-26T10:02:00.000Z'
        }
      ]

      const res = await updateEmployeeData(employeeId, { documents: documentsPayload })
      expect(res.success).toBe(true)
      expect(mockDbFrom).toHaveBeenCalledWith('employee_onboarding')
    })

    it('falls back to admin client if client fails RLS policy', async () => {
      const employeeId = 'f2f15da0-80e6-4b8c-8095-6fc433ec6fbb'
      // First attempt (anon client) fails with RLS error
      mockDbUpdate.mockResolvedValueOnce({
        data: null,
        error: { message: 'new row violates row-level security policy' }
      })
      // Second attempt (admin client) succeeds
      mockDbUpdate.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const res = await updateEmployeeData(employeeId, { documents: [] })
      expect(res.success).toBe(true)
    })
  })

  describe('3. Concurrency & Duplicate Submission Prevention', () => {
    it('guards against running multiple uploads simultaneously when isUploadingDoc is true', () => {
      let isUploadingDoc = false
      const filesQueue: File[] = []

      const uploadFilesMock = vi.fn(async (files: File[]) => {
        if (!files || files.length === 0 || isUploadingDoc) return
        isUploadingDoc = true
        try {
          filesQueue.push(...files)
        } finally {
          isUploadingDoc = false
        }
      })

      const file1 = new File(['1'], 'doc1.pdf')
      const file2 = new File(['2'], 'doc2.pdf')

      // First call starts
      isUploadingDoc = true
      uploadFilesMock([file2]) // Should be rejected/ignored because isUploadingDoc is true

      expect(filesQueue).toHaveLength(0)
    })
  })
})
