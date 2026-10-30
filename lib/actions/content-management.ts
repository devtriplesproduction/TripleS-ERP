'use server'

import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  ContentItem,
  ContentType,
  ContentStatus,
  ContentPriority,
  ReviewDecision,
  AssignedRole,
  ReviewRecord,
  AssignmentRecord,
  ContentActivityRecord,
  ContentNotificationRecord,
  ContentAttachment,
  ContentFilterOptions,
  CreateContentInput,
  UpdateContentInput,
  computeDeadlineState,
} from '@/types/content-management'
import fs from 'fs'
import path from 'path'

const FALLBACK_DIR = path.join(process.cwd(), 'scratch')
const CONTENT_ITEMS_FILE = 'content_items_store.json'
const CONTENT_TYPES_FILE = 'content_types_store.json'
const CONTENT_ACTIVITIES_FILE = 'content_activities_store.json'
const CONTENT_NOTIFICATIONS_FILE = 'content_notifications_store.json'
const CONTENT_FILES_FILE = 'content_files_store.json'

function safeRevalidatePath(pathUrl: string) {
  try {
    revalidatePath(pathUrl)
  } catch {
    // In test runner or non-request contexts, ignore static generation store invariant
  }
}

function ensureStoreDir(): void {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true })
  }
}

function formatDate(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = date.getDate()
  const m = months[date.getMonth()]
  const y = date.getFullYear()
  return `${d} ${m} ${y}`
}

function formatTime(date: Date = new Date()): string {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const minStr = minutes < 10 ? '0' + minutes : minutes
  return `${hours}:${minStr} ${ampm}`
}

const DEFAULT_CONTENT_TYPES: ContentType[] = [
  { id: 'ct-1', name: 'Technical Documentation', description: 'System specs and technical architecture guides', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-2', name: 'Project Documentation', description: 'Milestones, delivery roadmaps and project scope', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-3', name: 'API Documentation', description: 'Endpoint references, auth specs and schema contracts', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-4', name: 'User Guides', description: 'End-user tutorials and walkthrough documentation', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-5', name: 'Developer Guides', description: 'Onboarding guides, coding conventions and setup checklists', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-6', name: 'Release Notes', description: 'Version changelog, sprint releases and patch notes', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-7', name: 'Knowledge Base Articles', description: 'Internal SOPs, troubleshooting guides and runbooks', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'ct-8', name: 'FAQs', description: 'Frequently asked questions for clients and cross-functional teams', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
]

const DEFAULT_ATTACHMENTS: ContentAttachment[] = [
  {
    id: 'att-101',
    file_name: 'TripleS-ERP2.0-Architecture-Diagram.png',
    file_size: 1420580,
    mime_type: 'image/png',
    file_url: '/file.svg',
    uploaded_by_id: 'af354098-e268-4294-889f-130387cf916b',
    uploaded_by_name: 'Kavita Verma',
    created_at: '2026-10-24T14:30:00.000Z',
    content_id: 'CNT-104',
    content_title: 'TripleS ERP 2.0 Architectural Overview',
    project_id: null,
    project_name: 'Core Platform',
    is_private: false,
  },
  {
    id: 'att-102',
    file_name: 'Payment-Gateway-OpenAPI-Specification.json',
    file_size: 350208,
    mime_type: 'application/json',
    file_url: '/file.svg',
    uploaded_by_id: 'af354098-e268-4294-889f-130387cf916b',
    uploaded_by_name: 'Prince Nandagawali',
    created_at: '2026-10-27T16:00:00.000Z',
    content_id: 'CNT-102',
    content_title: 'REST & GraphQL API Documentation — Payment Module',
    project_id: null,
    project_name: 'Financial Microservices',
    is_private: false,
  },
  {
    id: 'att-103',
    file_name: 'Employee-HR-Onboarding-Checklist-v2.pdf',
    file_size: 2154300,
    mime_type: 'application/pdf',
    file_url: '/file.svg',
    uploaded_by_id: 'af354098-e268-4294-889f-130387cf916b',
    uploaded_by_name: 'Kavita Verma',
    created_at: '2026-10-28T16:00:00.000Z',
    content_id: 'CNT-103',
    content_title: 'Employee Onboarding & HR Self-Service User Guide',
    project_id: null,
    project_name: 'People & HR',
    is_private: false,
  },
  {
    id: 'att-104',
    file_name: 'SDK-NodeJS-Client-Bundle.zip',
    file_size: 4920000,
    mime_type: 'application/zip',
    file_url: '/file.svg',
    uploaded_by_id: 'af354098-e268-4294-889f-130387cf916b',
    uploaded_by_name: 'Harishchandra Nanavare',
    created_at: '2026-10-28T10:00:00.000Z',
    content_id: 'CNT-101',
    content_title: 'Q4 Product Launch Press Release & Release Notes',
    project_id: null,
    project_name: 'Core Platform',
    is_private: true,
  },
]

function readStore<T>(filename: string, defaultValue: T): T {
  try {
    ensureStoreDir()
    const filePath = path.join(FALLBACK_DIR, filename)
    if (!fs.existsSync(filePath)) {
      writeStore(filename, defaultValue)
      return defaultValue
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data) as T
  } catch (err) {
    console.error(`[ContentStore] Error reading ${filename}:`, err)
    return defaultValue
  }
}

function writeStore<T>(filename: string, data: T): void {
  try {
    ensureStoreDir()
    const filePath = path.join(FALLBACK_DIR, filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`[ContentStore] Error writing ${filename}:`, err)
  }
}

// ----------------- ACTIVITIES -----------------
export async function logContentActivity(
  contentId: string,
  contentTitle: string,
  action: ContentActivityRecord['action'],
  details: string,
  userId?: string | null,
  userName?: string | null
) {
  try {
    const activities = readStore<ContentActivityRecord[]>(CONTENT_ACTIVITIES_FILE, [])
    const now = new Date()
    const record: ContentActivityRecord = {
      id: 'ACT-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content_id: contentId,
      content_title: contentTitle,
      action,
      user_id: userId || 'system',
      user_name: userName || 'System',
      details,
      created_at: now.toISOString(),
      timestamp_display: `${formatDate(now)} ${formatTime(now)}`,
    }
    activities.unshift(record)
    if (activities.length > 200) activities.length = 200
    writeStore(CONTENT_ACTIVITIES_FILE, activities)
  } catch (err) {
    console.error('[ContentStore] Error logging activity:', err)
  }
}

export async function getContentActivities(): Promise<{ success: boolean; data: ContentActivityRecord[] }> {
  const activities = readStore<ContentActivityRecord[]>(CONTENT_ACTIVITIES_FILE, [])
  return { success: true, data: activities }
}

// ----------------- NOTIFICATIONS -----------------
export async function createContentNotification(
  userId: string,
  type: ContentNotificationRecord['type'],
  title: string,
  message: string,
  contentId: string,
  contentTitle: string,
  reason?: string
) {
  try {
    const notifications = readStore<ContentNotificationRecord[]>(CONTENT_NOTIFICATIONS_FILE, [])
    const record: ContentNotificationRecord = {
      id: 'NOTIF-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      user_id: userId,
      type,
      title,
      message,
      content_id: contentId,
      content_title: contentTitle,
      reason,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    notifications.unshift(record)
    writeStore(CONTENT_NOTIFICATIONS_FILE, notifications)
  } catch (err) {
    console.error('[ContentStore] Error logging notification:', err)
  }
}

export async function getContentNotifications(userId?: string): Promise<{ success: boolean; data: ContentNotificationRecord[] }> {
  const notifications = readStore<ContentNotificationRecord[]>(CONTENT_NOTIFICATIONS_FILE, [])
  if (userId) {
    return { success: true, data: notifications.filter(n => n.user_id === userId) }
  }
  return { success: true, data: notifications }
}

export async function markContentNotificationRead(id: string): Promise<{ success: boolean }> {
  const notifications = readStore<ContentNotificationRecord[]>(CONTENT_NOTIFICATIONS_FILE, [])
  const item = notifications.find(n => n.id === id)
  if (item) {
    item.is_read = true
    writeStore(CONTENT_NOTIFICATIONS_FILE, notifications)
  }
  return { success: true }
}

// ----------------- MEDIA & FILE ATTACHMENTS -----------------
export async function getContentAttachments(contentId?: string): Promise<{ success: boolean; data: ContentAttachment[] }> {
  try {
    const user = await getCurrentUser()
    const all = readStore<ContentAttachment[]>(CONTENT_FILES_FILE, DEFAULT_ATTACHMENTS)
    const isHod = user?.is_hod || /\b(hod|head of department|head of content)\b/i.test(user?.designation || '')
    const isAdmin = user?.role === 'Admin'

    // Prevent unauthorized access to private attachments
    let accessible = all.filter(att => {
      if (!att.is_private) return true
      if (isAdmin || isHod) return true
      return att.uploaded_by_id === user?.id
    })

    if (contentId) {
      accessible = accessible.filter(att => att.content_id === contentId)
    }

    return { success: true, data: accessible }
  } catch (err: any) {
    return { success: false, data: [] }
  }
}

export async function uploadContentAttachment(
  formData: FormData,
  contentId?: string,
  isPrivate: boolean = false
): Promise<{ success: boolean; data?: ContentAttachment; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file selected for upload' }

    // 1. File size validation (Max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File exceeds maximum allowed size of 25MB.' }
    }

    // 2. Allowed file types validation
    const fileName = file.name
    const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.ps1', '.msi', '.com']
    if (dangerousExtensions.includes(fileExt)) {
      return { success: false, error: 'Executable and script files are strictly blocked for security.' }
    }

    const allowedMimeOrExt = [
      'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif',
      'application/pdf', 'application/json', 'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/markdown', 'text/csv',
      '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.md', '.txt', '.json', '.zip', '.csv', '.doc', '.docx'
    ]

    const isAllowed = allowedMimeOrExt.some(val =>
      file.type.toLowerCase().includes(val) || fileExt === val
    )

    if (!isAllowed) {
      return {
        success: false,
        error: `File type "${fileExt}" is not permitted. Allowed: Images, PDFs, Markdown, Docs, JSON, ZIP.`,
      }
    }

    // Ensure uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'content')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const uniqueId = 'att-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const diskFileName = `${uniqueId}-${sanitizedName}`
    const diskPath = path.join(uploadsDir, diskFileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(diskPath, buffer)

    const publicUrl = `/uploads/content/${diskFileName}`
    const now = new Date()

    let contentTitle = null
    let projectId = null
    let projectName = null

    if (contentId) {
      const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
      const matched = items.find(i => i.id === contentId)
      if (matched) {
        contentTitle = matched.title
        projectId = matched.project_id
        projectName = matched.project_name
      }
    }

    const attachmentRecord: ContentAttachment = {
      id: uniqueId,
      file_name: fileName,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      file_url: publicUrl,
      uploaded_by_id: user.id,
      uploaded_by_name: user.employee_name || 'Staff',
      created_at: now.toISOString(),
      content_id: contentId || null,
      content_title: contentTitle,
      project_id: projectId || null,
      project_name: projectName || null,
      is_private: isPrivate,
    }

    const allAttachments = readStore<ContentAttachment[]>(CONTENT_FILES_FILE, DEFAULT_ATTACHMENTS)
    allAttachments.unshift(attachmentRecord)
    writeStore(CONTENT_FILES_FILE, allAttachments)

    // Update content item if contentId provided
    if (contentId) {
      const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
      const idx = items.findIndex(i => i.id === contentId)
      if (idx !== -1) {
        const itemAttachments = items[idx].attachments ? [...items[idx].attachments!] : []
        itemAttachments.push(attachmentRecord)
        items[idx].attachments = itemAttachments
        writeStore(CONTENT_ITEMS_FILE, items)
      }
    }

    await logContentActivity(
      contentId || uniqueId,
      contentTitle || fileName,
      'Created',
      `Uploaded attachment "${fileName}" (${Math.round(file.size / 1024)} KB) by ${user.employee_name || 'Staff'}`,
      user.id,
      user.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: attachmentRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload attachment' }
  }
}

export async function deleteContentAttachment(attachmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const allAttachments = readStore<ContentAttachment[]>(CONTENT_FILES_FILE, DEFAULT_ATTACHMENTS)
    const target = allAttachments.find(a => a.id === attachmentId)
    if (!target) return { success: false, error: 'Attachment not found' }

    const isHod = user.is_hod || /\b(hod|head of department|head of content)\b/i.test(user.designation || '')
    const isAdmin = user.role === 'Admin'
    const isOwner = target.uploaded_by_id === user.id

    if (!isAdmin && !isHod && !isOwner) {
      return { success: false, error: 'You are not authorized to delete this attachment.' }
    }

    const filtered = allAttachments.filter(a => a.id !== attachmentId)
    writeStore(CONTENT_FILES_FILE, filtered)

    try {
      const diskPath = path.join(process.cwd(), 'public', target.file_url)
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath)
      }
    } catch {}

    if (target.content_id) {
      const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
      const idx = items.findIndex(i => i.id === target.content_id)
      if (idx !== -1 && items[idx].attachments) {
        items[idx].attachments = items[idx].attachments!.filter(a => a.id !== attachmentId)
        writeStore(CONTENT_ITEMS_FILE, items)
      }
    }

    safeRevalidatePath('/content-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete attachment' }
  }
}

// ----------------- CONTENT TYPES -----------------
export async function getContentTypes(): Promise<{ success: boolean; data: ContentType[] }> {
  const types = readStore<ContentType[]>(CONTENT_TYPES_FILE, DEFAULT_CONTENT_TYPES)
  return { success: true, data: types }
}

export async function createContentType(name: string, description?: string): Promise<{ success: boolean; data?: ContentType; error?: string }> {
  try {
    const user = await getCurrentUser()
    const types = readStore<ContentType[]>(CONTENT_TYPES_FILE, DEFAULT_CONTENT_TYPES)
    const normalized = name.trim().toLowerCase()
    if (types.some(t => t.name.trim().toLowerCase() === normalized)) {
      return { success: false, error: 'A content type with this name already exists' }
    }
    const newType: ContentType = {
      id: 'ct-' + Date.now().toString(36),
      name: name.trim(),
      description: description?.trim() || '',
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: user?.employee_name || 'Admin',
    }
    types.push(newType)
    writeStore(CONTENT_TYPES_FILE, types)
    safeRevalidatePath('/content-management')
    return { success: true, data: newType }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create content type' }
  }
}

export async function toggleContentTypeStatus(id: string): Promise<{ success: boolean; data?: ContentType; error?: string }> {
  try {
    const types = readStore<ContentType[]>(CONTENT_TYPES_FILE, DEFAULT_CONTENT_TYPES)
    const index = types.findIndex(t => t.id === id)
    if (index === -1) {
      return { success: false, error: 'Content type not found' }
    }
    types[index].is_active = !types[index].is_active
    writeStore(CONTENT_TYPES_FILE, types)
    safeRevalidatePath('/content-management')
    return { success: true, data: types[index] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle content type status' }
  }
}

// ----------------- CONTENT ITEMS -----------------
export async function getContentItems(options?: ContentFilterOptions): Promise<{ success: boolean; data: ContentItem[]; total: number }> {
  try {
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])

    let filtered = [...items]

    if (options?.search) {
      const q = options.search.toLowerCase()
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.owner_name.toLowerCase().includes(q) ||
        (i.assigned_to_name && i.assigned_to_name.toLowerCase().includes(q)) ||
        (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
      )
    }

    if (options?.status && options.status !== 'All') {
      filtered = filtered.filter(i => i.status === options.status)
    }

    if (options?.contentType && options.contentType !== 'All') {
      filtered = filtered.filter(i => i.content_type === options.contentType)
    }

    if (options?.projectId && options.projectId !== 'All') {
      filtered = filtered.filter(i => i.project_id === options.projectId)
    }

    if (options?.assigneeId && options.assigneeId !== 'All') {
      filtered = filtered.filter(i => i.assigned_to_id === options.assigneeId)
    }

    if (options?.priority && options.priority !== 'All') {
      filtered = filtered.filter(i => i.priority === options.priority)
    }

    if (options?.deadlineState && options.deadlineState !== 'All') {
      filtered = filtered.filter(i => computeDeadlineState(i.due_date, i.status) === options.deadlineState)
    }

    return {
      success: true,
      data: filtered,
      total: filtered.length,
    }
  } catch (err) {
    console.error('[ContentStore] Error fetching content items:', err)
    return { success: false, data: [], total: 0 }
  }
}

export async function createContentItem(input: CreateContentInput): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])

    const now = new Date()
    const id = 'CNT-' + (items.length + 101).toString()

    const newItem: ContentItem = {
      id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      content_type: input.content_type,
      project_id: input.project_id || null,
      project_name: input.project_name || null,
      owner_id: input.owner_id || user?.id || 'unknown',
      owner_name: input.owner_name || user?.employee_name || 'Anonymous',
      status: input.status || 'Draft',
      tags: input.tags || [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      due_date: input.due_date || null,
      assigned_to_id: input.assigned_to_id || null,
      assigned_to_name: input.assigned_to_name || null,
      assigned_role: input.assigned_role || 'Developer',
      priority: input.priority || 'Medium',
      assignment_history: [],
      review_history: [],
      attachments: input.attachments || [],
    }

    if (newItem.assigned_to_id && newItem.assigned_to_name) {
      newItem.assignment_history = [
        {
          id: 'ASG-' + Date.now().toString(36),
          previous_assignee_id: null,
          previous_assignee_name: null,
          new_assignee_id: newItem.assigned_to_id,
          new_assignee_name: newItem.assigned_to_name,
          changed_by_id: user?.id || 'system',
          changed_by_name: user?.employee_name || 'Head of Content',
          date: formatDate(now),
          time: formatTime(now),
          reason: 'Initial assignment',
          created_at: now.toISOString(),
        },
      ]
      await createContentNotification(
        newItem.assigned_to_id,
        'New Assignment',
        'New Content Assigned',
        `You have been assigned to "${newItem.title}" with priority ${newItem.priority}.`,
        newItem.id,
        newItem.title
      )
    }

    items.unshift(newItem)
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      newItem.id,
      newItem.title,
      'Created',
      `Created as ${newItem.status} by ${user?.employee_name || 'User'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: newItem }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create content' }
  }
}

export async function updateContentItem(id: string, input: UpdateContentInput): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === id)

    if (index === -1) {
      return { success: false, error: 'Content not found' }
    }

    const current = items[index]
    const now = new Date()

    const updated: ContentItem = {
      ...current,
      title: input.title !== undefined ? input.title.trim() : current.title,
      summary: input.summary !== undefined ? input.summary.trim() : current.summary,
      body: input.body !== undefined ? input.body.trim() : current.body,
      content_type: input.content_type || current.content_type,
      project_id: input.project_id !== undefined ? input.project_id : current.project_id,
      project_name: input.project_name !== undefined ? input.project_name : current.project_name,
      owner_id: input.owner_id || current.owner_id,
      owner_name: input.owner_name || current.owner_name,
      status: input.status || current.status,
      tags: input.tags !== undefined ? input.tags : current.tags,
      due_date: input.due_date !== undefined ? input.due_date : current.due_date,
      assigned_to_id: input.assigned_to_id !== undefined ? input.assigned_to_id : current.assigned_to_id,
      assigned_to_name: input.assigned_to_name !== undefined ? input.assigned_to_name : current.assigned_to_name,
      assigned_role: input.assigned_role || current.assigned_role,
      priority: input.priority || current.priority,
      attachments: input.attachments !== undefined ? input.attachments : current.attachments,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Created',
      `Updated content details by ${user?.employee_name || 'User'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update content' }
  }
}

// ----------------- ASSIGNMENT & REASSIGNMENT -----------------
export async function assignContentItem(
  contentId: string,
  assignedUserId: string,
  assignedUserName: string,
  assignedRole: AssignedRole,
  dueDate: string,
  priority: ContentPriority,
  reason?: string
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === contentId)
    if (index === -1) {
      return { success: false, error: 'Content item not found' }
    }

    const current = items[index]
    const now = new Date()
    const isReassignment = current.assigned_to_id && current.assigned_to_id !== assignedUserId

    const historyRecord: AssignmentRecord = {
      id: 'ASG-' + Date.now().toString(36),
      previous_assignee_id: current.assigned_to_id || null,
      previous_assignee_name: current.assigned_to_name || null,
      new_assignee_id: assignedUserId,
      new_assignee_name: assignedUserName,
      changed_by_id: user?.id || 'system',
      changed_by_name: user?.employee_name || 'Head of Content',
      date: formatDate(now),
      time: formatTime(now),
      reason: reason || (isReassignment ? 'Workload reassignment' : 'New assignment'),
      created_at: now.toISOString(),
    }

    const history = current.assignment_history ? [...current.assignment_history] : []
    history.push(historyRecord)

    const updated: ContentItem = {
      ...current,
      assigned_to_id: assignedUserId,
      assigned_to_name: assignedUserName,
      assigned_role: assignedRole,
      due_date: dueDate,
      priority,
      assignment_history: history,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await createContentNotification(
      assignedUserId,
      'New Assignment',
      isReassignment ? 'Content Reassigned' : 'New Content Assignment',
      `You have been assigned to "${updated.title}". Due date: ${dueDate}, Priority: ${priority}.`,
      updated.id,
      updated.title,
      reason
    )

    await logContentActivity(
      updated.id,
      updated.title,
      isReassignment ? 'Reassigned' : 'Assigned',
      `Assigned to ${assignedUserName} (${assignedRole}) by ${user?.employee_name || 'Head of Content'}` + (reason ? ` (Reason: ${reason})` : ''),
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign content' }
  }
}

// ----------------- APPROVAL & REVIEW WORKFLOW -----------------
export async function submitForReview(
  contentId: string,
  reviewerId?: string,
  reviewerName?: string
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === contentId)
    if (index === -1) {
      return { success: false, error: 'Content not found' }
    }

    const current = items[index]
    const now = new Date()

    const updated: ContentItem = {
      ...current,
      status: 'In Review',
      submission_date: now.toISOString(),
      current_reviewer_id: reviewerId || null,
      current_reviewer_name: reviewerName || 'Head of Content',
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Submitted',
      `Submitted for review by ${user?.employee_name || 'Author'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit for review' }
  }
}

export async function reviewContentItem(
  contentId: string,
  decision: ReviewDecision,
  comment: string
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!comment && (decision === 'Changes Requested' || decision === 'Rejected')) {
      return { success: false, error: 'Comment/reason is required for this decision' }
    }

    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === contentId)
    if (index === -1) {
      return { success: false, error: 'Content item not found' }
    }

    const current = items[index]
    const now = new Date()

    const reviewRecord: ReviewRecord = {
      id: 'REV-' + Date.now().toString(36),
      reviewer_id: user?.id || 'reviewer',
      reviewer_name: user?.employee_name || 'Reviewer',
      decision,
      comment: comment.trim(),
      date: formatDate(now),
      time: formatTime(now),
      created_at: now.toISOString(),
    }

    const history = current.review_history ? [...current.review_history] : []
    history.push(reviewRecord)

    let nextStatus: ContentStatus = current.status
    if (decision === 'Approved') nextStatus = 'Approved'
    else if (decision === 'Changes Requested') nextStatus = 'Changes Requested'
    else if (decision === 'Rejected') nextStatus = 'Rejected'

    const updated: ContentItem = {
      ...current,
      status: nextStatus,
      review_history: history,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    if (decision === 'Changes Requested' && current.owner_id) {
      await createContentNotification(
        current.owner_id,
        'Changes Requested',
        'Content Review Update',
        `Changes have been requested by the reviewer for "${current.title}".`,
        current.id,
        current.title,
        comment
      )
    }

    await logContentActivity(
      updated.id,
      updated.title,
      decision,
      `${decision} by ${user?.employee_name || 'Reviewer'}` + (comment ? `: "${comment}"` : ''),
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit review' }
  }
}

// ----------------- PUBLISHING PERMISSION ENFORCEMENT -----------------
export async function publishContentItem(contentId: string): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const isHod = user.is_hod || /\b(hod|head of department|head of content)\b/i.test(user.designation || '')
    const isAdmin = user.role === 'Admin'

    if (!isAdmin && !isHod) {
      return { success: false, error: 'Only authorized reviewers/HOD or Admin can publish content.' }
    }

    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === contentId)
    if (index === -1) {
      return { success: false, error: 'Content item not found' }
    }

    const current = items[index]
    if (current.status !== 'Approved') {
      return { success: false, error: 'Content must be in "Approved" status before it can be published.' }
    }

    const now = new Date()
    const updated: ContentItem = {
      ...current,
      status: 'Published',
      completion_date: now.toISOString(),
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Published',
      `Published by ${user.employee_name || 'HOD'}`,
      user.id,
      user.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to publish content' }
  }
}

// ----------------- ARCHIVE & DELETE -----------------
export async function archiveContentItem(id: string): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === id)

    if (index === -1) {
      return { success: false, error: 'Content not found' }
    }

    const current = items[index]
    const updated: ContentItem = {
      ...current,
      status: 'Archived',
      updated_at: new Date().toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Archived',
      `Archived by ${user?.employee_name || 'User'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to archive content' }
  }
}

export async function deleteContentItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Admin') {
      return { success: false, error: 'Unauthorized: Only administrators can permanently delete content' }
    }

    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const target = items.find(i => i.id === id)
    const filtered = items.filter(i => i.id !== id)

    if (filtered.length === items.length) {
      return { success: false, error: 'Content not found' }
    }

    writeStore(CONTENT_ITEMS_FILE, filtered)

    if (target) {
      await logContentActivity(
        target.id,
        target.title,
        'Archived',
        `Permanently deleted by ${user.employee_name || 'Admin'}`,
        user.id,
        user.employee_name
      )
    }

    safeRevalidatePath('/content-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete content' }
  }
}

export async function updateContentStatus(id: string, status: ContentStatus, comment?: string): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const index = items.findIndex(i => i.id === id)
    if (index === -1) {
      return { success: false, error: 'Content not found' }
    }

    const user = await getCurrentUser()
    const now = new Date()
    const current = items[index]

    const updated: ContentItem = {
      ...current,
      status,
      updated_at: now.toISOString(),
      completion_date: status === 'Published' || status === 'Approved' ? now.toISOString() : current.completion_date,
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Created',
      `Status changed to ${status} by ${user?.employee_name || 'User'}` + (comment ? ` (${comment})` : ''),
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update status' }
  }
}
