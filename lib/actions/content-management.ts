'use server'

import { getCurrentUser, AuthUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  ContentItem,
  ContentType,
  ContentStatus,
  ContentTaskComment,
  ContentPriority,
  ReviewDecision,
  AssignedRole,
  ReviewRecord,
  AssignmentRecord,
  ContentActivityRecord,
  ContentNotificationRecord,
  ContentAttachment,
  ContentVersionRecord,
  ContentCategory,
  ContentTag,
  ContentFilterOptions,
  CreateContentInput,
  UpdateContentInput,
  computeDeadlineState,
  computeFreshnessState,
} from '@/types/content-management'
import fs from 'fs'
import path from 'path'

const FALLBACK_DIR = path.join(process.cwd(), 'scratch')
const CONTENT_ITEMS_FILE = 'content_items_store.json'
const CONTENT_TYPES_FILE = 'content_types_store.json'
const CONTENT_ACTIVITIES_FILE = 'content_activities_store.json'
const CONTENT_NOTIFICATIONS_FILE = 'content_notifications_store.json'
const CONTENT_FILES_FILE = 'content_files_store.json'
const CONTENT_CATEGORIES_FILE = 'content_categories_store.json'
const CONTENT_TAGS_FILE = 'content_tags_store.json'

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

const DEFAULT_CATEGORIES: ContentCategory[] = [
  { id: 'cat-1', name: 'Technical Documentation', description: 'System specs, architecture and infrastructure guides', color: '#6366f1', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'cat-2', name: 'API Reference', description: 'API endpoints, schemas, authentication contracts and webhooks', color: '#06b6d4', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'cat-3', name: 'Standard Operating Procedures', description: 'Operational runbooks, workflows and incident handling SOPs', color: '#10b981', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'cat-4', name: 'Product Guides', description: 'User guides, onboarding walkthroughs and customer manuals', color: '#f59e0b', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'cat-5', name: 'Release Notes & Changelogs', description: 'Version releases, patch updates and sprint deliverables', color: '#ec4899', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'cat-6', name: 'Developer Tooling & SDKs', description: 'SDK references, developer setup and library documentation', color: '#8b5cf6', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'cat-7', name: 'Security & Compliance', description: 'Security policies, compliance audits and RBAC standards', color: '#ef4444', is_active: true, created_at: '2026-10-01T00:00:00.000Z' },
]

const DEFAULT_TAGS: ContentTag[] = [
  { id: 'tag-1', name: 'Frontend', color: '#3b82f6', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-2', name: 'Backend', color: '#10b981', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-3', name: 'API', color: '#06b6d4', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-4', name: 'Database', color: '#8b5cf6', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-5', name: 'Security', color: '#ef4444', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-6', name: 'DevOps', color: '#f59e0b', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-7', name: 'Release', color: '#ec4899', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-8', name: 'Architecture', color: '#6366f1', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-9', name: 'UI/UX', color: '#14b8a6', created_at: '2026-10-01T00:00:00.000Z' },
  { id: 'tag-10', name: 'Integration', color: '#d946ef', created_at: '2026-10-01T00:00:00.000Z' },
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

function normalizeContentItem(item: ContentItem): ContentItem {
  const version = item.version || 1
  const versionNumber = item.version_number ?? `v${version}.0`
  let versionHistory = item.version_history
  if (!versionHistory || versionHistory.length === 0) {
    versionHistory = [
      {
        id: 'VER-init-' + item.id,
        content_id: item.id,
        version_number: 1,
        version_label: 'v1.0',
        title: item.title,
        summary: item.summary,
        body: item.body,
        content_type: item.content_type,
        category: item.category || (item.content_type === 'API Documentation' ? 'API Reference' : item.content_type === 'Release Notes' ? 'Release Notes & Changelogs' : 'Technical Documentation'),
        tags: item.tags || [],
        status: item.status,
        created_at: item.created_at,
        created_by_id: item.owner_id || 'system',
        created_by_name: item.owner_name || 'System',
        change_summary: 'Initial version snapshot',
      },
    ]
  }

  const category = item.category || (
    item.content_type === 'API Documentation' ? 'API Reference' :
      item.content_type === 'Release Notes' ? 'Release Notes & Changelogs' :
        item.content_type === 'User Guides' ? 'Product Guides' :
          'Technical Documentation'
  )
  const department = item.department || (item.content_type === 'User Guides' ? 'Human Resources' : 'Engineering')
  const product = item.product || 'TripleS ERP 2.0'

  let lastReviewed = item.last_reviewed_date || item.last_reviewed_at || null
  let nextReviewed = item.next_review_date || null
  if (item.status === 'Published' && !lastReviewed) {
    lastReviewed = item.updated_at || item.created_at
    const d = new Date(lastReviewed)
    d.setDate(d.getDate() + 90)
    nextReviewed = d.toISOString().slice(0, 10)
  }

  const publishedAt = item.published_at || (item.status === 'Published' ? (item.completion_date || item.updated_at || item.created_at) : null)
  const reviews = item.reviews || item.review_history || []
  const reviewHistory = item.review_history || item.reviews || []
  const followUpReason = item.follow_up_reason || item.follow_up_note || null

  const calculatedProgress = typeof item.progress === 'number'
    ? item.progress
    : (item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved' ? 100 : item.status === 'In Review' ? 75 : item.status === 'In Progress' ? 40 : 0);

  return {
    ...item,
    start_date: item.start_date || (item.created_at ? item.created_at.slice(0, 10) : null),
    instructions: item.instructions || item.creative_brief || null,
    progress: calculatedProgress,
    reference_attachment: item.reference_attachment || null,
    comments: item.comments || [],
    version,
    version_number: versionNumber,
    version_history: versionHistory,
    review_history: reviewHistory,
    reviews: reviews,
    published_at: publishedAt,
    category,
    department,
    product,
    last_reviewed_date: lastReviewed,
    last_reviewed_at: lastReviewed,
    next_review_date: nextReviewed,
    review_frequency_days: item.review_frequency_days || 90,
    review_frequency: item.review_frequency || item.review_frequency_days || 90,
    is_duplicate: item.is_duplicate || false,
    duplicate_of_id: item.duplicate_of_id || null,
    duplicate_of_title: item.duplicate_of_title || null,
    duplicate_reason: item.duplicate_reason || null,
    related_content_ids: item.related_content_ids || [],
    follow_up_required: item.follow_up_required || false,
    follow_up_reason: followUpReason,
    follow_up_note: followUpReason,
    follow_up_date: item.follow_up_date || null,
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
    if (activities.length > 250) activities.length = 250
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

export async function markAllContentNotificationsRead(userId?: string): Promise<{ success: boolean }> {
  const notifications = readStore<ContentNotificationRecord[]>(CONTENT_NOTIFICATIONS_FILE, [])
  notifications.forEach(n => {
    if (!userId || n.user_id === userId) {
      n.is_read = true
    }
  })
  writeStore(CONTENT_NOTIFICATIONS_FILE, notifications)
  return { success: true }
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

    let accessible = all.filter(att => {
      if (!att.is_private) return true
      if (isAdmin || isHod) return true
      return att.uploaded_by_id === user?.id
    })

    if (contentId) {
      accessible = accessible.filter(att => att.content_id === contentId)
    }

    return { success: true, data: accessible }
  } catch {
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

    const MAX_FILE_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File exceeds maximum allowed size of 25MB.' }
    }

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
      const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, []).map(normalizeContentItem)
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
      uploaded_by_name: user.employee_name || 'Staff Member',
      created_at: now.toISOString(),
      content_id: contentId || null,
      content_title: contentTitle,
      project_id: projectId,
      project_name: projectName,
      is_private: isPrivate,
    }

    const allAttachments = readStore<ContentAttachment[]>(CONTENT_FILES_FILE, DEFAULT_ATTACHMENTS)
    allAttachments.unshift(attachmentRecord)
    writeStore(CONTENT_FILES_FILE, allAttachments)

    if (contentId) {
      const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, []).map(normalizeContentItem)
      const idx = items.findIndex(i => i.id === contentId)
      if (idx !== -1) {
        const currentAtts = items[idx].attachments || []
        items[idx].attachments = [attachmentRecord, ...currentAtts]
        items[idx].updated_at = now.toISOString()
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
    } catch { }

    if (target.content_id) {
      const items = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, []).map(normalizeContentItem)
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

// ----------------- CATEGORIES -----------------
export async function getContentCategories(): Promise<{ success: boolean; data: ContentCategory[] }> {
  const categories = readStore<ContentCategory[]>(CONTENT_CATEGORIES_FILE, DEFAULT_CATEGORIES)
  return { success: true, data: categories }
}

export async function createContentCategory(
  nameOrInput: string | { name: string; description?: string; color?: string; department?: string },
  description?: string,
  color?: string
): Promise<{ success: boolean; data?: ContentCategory; error?: string }> {
  try {
    const user = await getCurrentUser()
    const name = typeof nameOrInput === 'string' ? nameOrInput : nameOrInput.name
    const desc = typeof nameOrInput === 'string' ? description : (nameOrInput.description ?? description)
    const col = typeof nameOrInput === 'string' ? color : (nameOrInput.color ?? color)
    const dept = typeof nameOrInput === 'object' ? nameOrInput.department : undefined

    if (!name || !name.trim()) return { success: false, error: 'Category name is required' }

    const categories = readStore<ContentCategory[]>(CONTENT_CATEGORIES_FILE, DEFAULT_CATEGORIES)
    const normalized = name.trim().toLowerCase()
    if (categories.some(c => c.name.trim().toLowerCase() === normalized)) {
      return { success: false, error: `Category "${name.trim()}" already exists. Duplicate categories are not allowed.` }
    }

    const newCat: ContentCategory = {
      id: 'cat-' + Date.now().toString(36),
      name: name.trim(),
      description: desc?.trim() || '',
      color: col || '#6366f1',
      department: dept?.trim() || undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: user?.employee_name || 'Admin',
    }

    categories.push(newCat)
    writeStore(CONTENT_CATEGORIES_FILE, categories)
    safeRevalidatePath('/content-management')
    return { success: true, data: newCat }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create category' }
  }
}

export async function updateContentCategory(
  id: string,
  name: string,
  description?: string,
  color?: string,
  is_active?: boolean
): Promise<{ success: boolean; data?: ContentCategory; error?: string }> {
  try {
    const categories = readStore<ContentCategory[]>(CONTENT_CATEGORIES_FILE, DEFAULT_CATEGORIES)
    const index = categories.findIndex(c => c.id === id)
    if (index === -1) return { success: false, error: 'Category not found' }

    const normalized = name.trim().toLowerCase()
    if (categories.some(c => c.id !== id && c.name.trim().toLowerCase() === normalized)) {
      return { success: false, error: `Another category named "${name.trim()}" already exists.` }
    }

    categories[index] = {
      ...categories[index],
      name: name.trim(),
      description: description !== undefined ? description.trim() : categories[index].description,
      color: color || categories[index].color,
      is_active: is_active !== undefined ? is_active : categories[index].is_active,
    }

    writeStore(CONTENT_CATEGORIES_FILE, categories)
    safeRevalidatePath('/content-management')
    return { success: true, data: categories[index] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update category' }
  }
}

export async function toggleContentCategoryStatus(id: string): Promise<{ success: boolean; data?: ContentCategory; error?: string }> {
  try {
    const categories = readStore<ContentCategory[]>(CONTENT_CATEGORIES_FILE, DEFAULT_CATEGORIES)
    const index = categories.findIndex(c => c.id === id)
    if (index === -1) return { success: false, error: 'Category not found' }

    categories[index].is_active = !categories[index].is_active
    writeStore(CONTENT_CATEGORIES_FILE, categories)
    safeRevalidatePath('/content-management')
    return { success: true, data: categories[index] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle category' }
  }
}

export async function deleteContentCategory(id: string, name?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const categories = readStore<ContentCategory[]>(CONTENT_CATEGORIES_FILE, DEFAULT_CATEGORIES)
    const filtered = categories.filter(c => c.id !== id && c.name.toLowerCase() !== id.toLowerCase())
    if (filtered.length === categories.length) return { success: false, error: 'Category not found' }

    writeStore(CONTENT_CATEGORIES_FILE, filtered)
    safeRevalidatePath('/content-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category' }
  }
}

// ----------------- TAGS -----------------
export async function getContentTags(): Promise<{ success: boolean; data: ContentTag[] }> {
  const tags = readStore<ContentTag[]>(CONTENT_TAGS_FILE, DEFAULT_TAGS)
  return { success: true, data: tags }
}

export async function createContentTag(name: string, color?: string): Promise<{ success: boolean; data?: ContentTag; error?: string }> {
  try {
    if (!name || !name.trim()) return { success: false, error: 'Tag name is required' }

    const tags = readStore<ContentTag[]>(CONTENT_TAGS_FILE, DEFAULT_TAGS)
    const normalized = name.trim().toLowerCase()
    if (tags.some(t => t.name.trim().toLowerCase() === normalized)) {
      return { success: false, error: `Tag "${name.trim()}" already exists. Duplicate tags are prevented.` }
    }

    const colors = ['#3b82f6', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newTag: ContentTag = {
      id: 'tag-' + Date.now().toString(36),
      name: name.trim(),
      color: color || randomColor,
      created_at: new Date().toISOString(),
    }

    tags.push(newTag)
    writeStore(CONTENT_TAGS_FILE, tags)
    safeRevalidatePath('/content-management')
    return { success: true, data: newTag }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create tag' }
  }
}

export async function deleteContentTag(id: string, name?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tags = readStore<ContentTag[]>(CONTENT_TAGS_FILE, DEFAULT_TAGS)
    const filtered = tags.filter(t => t.id !== id && t.name.toLowerCase() !== id.toLowerCase())
    if (filtered.length === tags.length) return { success: false, error: 'Tag not found' }

    writeStore(CONTENT_TAGS_FILE, filtered)
    safeRevalidatePath('/content-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete tag' }
  }
}

// ----------------- CONTENT ITEMS & VERSIONS -----------------
export async function getContentItems(options?: ContentFilterOptions): Promise<{ success: boolean; data: ContentItem[]; total: number }> {
  try {
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)

    let filtered = [...items]

    // 1. Text Search across Title and relevant metadata
    if (options?.search) {
      const q = options.search.trim().toLowerCase()
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.owner_name.toLowerCase().includes(q) ||
        (i.assigned_to_name && i.assigned_to_name.toLowerCase().includes(q)) ||
        (i.project_name && i.project_name.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.department && i.department.toLowerCase().includes(q)) ||
        (i.product && i.product.toLowerCase().includes(q)) ||
        (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
      )
    }

    // 2. Status Filter
    if (options?.status && options.status !== 'All') {
      filtered = filtered.filter(i => i.status === options.status)
    }

    // 3. Content Type Filter
    if (options?.contentType && options.contentType !== 'All') {
      filtered = filtered.filter(i => i.content_type === options.contentType)
    }

    // 4. Project Filter
    if (options?.projectId && options.projectId !== 'All') {
      filtered = filtered.filter(i => i.project_id === options.projectId)
    }

    // 5. Category Filter
    if (options?.category && options.category !== 'All') {
      filtered = filtered.filter(i => i.category === options.category)
    }

    // 6. Tag Filter
    if (options?.tag && options.tag !== 'All') {
      filtered = filtered.filter(i => i.tags && i.tags.includes(options.tag!))
    }

    // 7. Developer / Assignee Filter
    if (options?.assigneeId && options.assigneeId !== 'All') {
      filtered = filtered.filter(i => i.assigned_to_id === options.assigneeId)
    }

    // 8. Owner Filter
    if (options?.ownerId && options.ownerId !== 'All') {
      filtered = filtered.filter(i => i.owner_id === options.ownerId)
    }

    // 9. Priority Filter
    if (options?.priority && options.priority !== 'All') {
      filtered = filtered.filter(i => i.priority === options.priority)
    }

    // 10. Deadline State Filter
    if (options?.deadlineState && options.deadlineState !== 'All') {
      filtered = filtered.filter(i => computeDeadlineState(i.due_date, i.status) === options.deadlineState)
    }

    // 11. Freshness State Filter
    if (options?.freshnessState && options.freshnessState !== 'All') {
      filtered = filtered.filter(i => computeFreshnessState(i) === options.freshnessState)
    }

    // 12. Date Range Filter
    if (options?.startDate) {
      const start = new Date(options.startDate).getTime()
      filtered = filtered.filter(i => new Date(i.created_at).getTime() >= start)
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime() + (24 * 60 * 60 * 1000)
      filtered = filtered.filter(i => new Date(i.created_at).getTime() <= end)
    }

    // 13. Sorting
    const sortBy = options?.sortBy || 'newest'
    const sortOrder = options?.sortOrder || 'desc'
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'newest':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          break
        case 'last_updated':
          comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          break
        case 'due_date': {
          const aTime = a.due_date ? new Date(a.due_date).getTime() : 9999999999999
          const bTime = b.due_date ? new Date(b.due_date).getTime() : 9999999999999
          comparison = aTime - bTime
          break
        }
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = 0
      }
      return sortOrder === 'desc' ? comparison : -comparison
    })

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

    if (input.start_date && input.due_date && input.due_date.slice(0, 10) < input.start_date.slice(0, 10)) {
      return { success: false, error: 'Deadline cannot be earlier than the start date.' }
    }

    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)

    const now = new Date()
    const id = 'CNT-' + (items.length + 101).toString()

    const initialVersion: ContentVersionRecord = {
      id: 'VER-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content_id: id,
      version_number: 1,
      version_label: 'v1.0',
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      content_type: input.content_type,
      category: input.category || 'Technical Documentation',
      tags: input.tags || [],
      status: input.status || 'Draft',
      created_at: now.toISOString(),
      created_by_id: user?.id || 'unknown',
      created_by_name: user?.employee_name || 'Staff Member',
      change_summary: input.change_summary || 'Initial content creation',
    }

    const newItem: ContentItem = {
      id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      content_type: input.content_type,
      category: input.category || 'Technical Documentation',
      department: input.department || 'Engineering',
      product: input.product || 'TripleS ERP 2.0',
      project_id: input.project_id || null,
      project_name: input.project_name || null,
      owner_id: input.owner_id || user?.id || 'unknown',
      owner_name: input.owner_name || user?.employee_name || 'Anonymous',
      status: input.status || 'To Do',
      tags: input.tags || [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      start_date: input.start_date || now.toISOString().slice(0, 10),
      due_date: input.due_date || null,
      instructions: input.instructions || null,
      progress: input.progress ?? (input.status === 'Completed' ? 100 : input.status === 'In Review' ? 75 : input.status === 'In Progress' ? 40 : 0),
      reference_attachment: input.reference_attachment || null,
      version: 1,
      version_history: [initialVersion],
      assigned_to_id: input.assigned_to_id || null,
      assigned_to_name: input.assigned_to_name || null,
      assigned_role: input.assigned_role || 'Developer',
      priority: input.priority || 'Medium',
      assignment_history: [],
      review_history: [],
      attachments: input.attachments || [],
      last_reviewed_date: null,
      next_review_date: input.next_review_date || null,
      review_frequency_days: input.review_frequency_days || 90,
      is_duplicate: false,
      follow_up_required: false,
      client_name: input.client_name || null,
      campaign_name: input.campaign_name || null,
      target_platforms: input.target_platforms || [],
      primary_platform: input.primary_platform || null,
      target_audience: input.target_audience || null,
      content_objective: input.content_objective || null,
      tone_of_voice: input.tone_of_voice || null,
      call_to_action: input.call_to_action || null,
      primary_keywords: input.primary_keywords || [],
      hashtags: input.hashtags || [],
      creative_format: input.creative_format || null,
      creative_brief: input.creative_brief || null,
      scheduled_publish_time: input.scheduled_publish_time || null,
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
      `Created as ${newItem.status} (v1.0) by ${user?.employee_name || 'User'}`,
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
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
    const index = items.findIndex(i => i.id === id)

    if (index === -1) {
      return { success: false, error: 'Content not found' }
    }

    const current = items[index]
    const now = new Date()

    const effectiveStart = input.start_date !== undefined ? input.start_date : current.start_date
    const effectiveDue = input.due_date !== undefined ? input.due_date : current.due_date
    if (effectiveStart && effectiveDue && effectiveDue.slice(0, 10) < effectiveStart.slice(0, 10)) {
      return { success: false, error: 'Deadline cannot be earlier than the start date.' }
    }

    // Meaningful changes check for automated version increment
    const isMeaningfulChange =
      (input.title !== undefined && input.title.trim() !== current.title) ||
      (input.summary !== undefined && input.summary.trim() !== current.summary) ||
      (input.body !== undefined && input.body.trim() !== current.body) ||
      (input.content_type !== undefined && input.content_type !== current.content_type) ||
      (input.category !== undefined && input.category !== current.category) ||
      (input.tags !== undefined && JSON.stringify(input.tags) !== JSON.stringify(current.tags))

    let newVersionNum = current.version || 1
    const versionHistory = [...(current.version_history || [])]

    if (isMeaningfulChange) {
      newVersionNum = newVersionNum + 1
      const newVersionSnapshot: ContentVersionRecord = {
        id: 'VER-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        content_id: current.id,
        version_number: newVersionNum,
        version_label: `v${newVersionNum}.0`,
        title: input.title !== undefined ? input.title.trim() : current.title,
        summary: input.summary !== undefined ? input.summary.trim() : current.summary,
        body: input.body !== undefined ? input.body.trim() : current.body,
        content_type: input.content_type || current.content_type,
        category: input.category !== undefined ? input.category : current.category,
        tags: input.tags !== undefined ? input.tags : current.tags,
        status: input.status || current.status,
        created_at: now.toISOString(),
        created_by_id: user?.id || 'unknown',
        created_by_name: user?.employee_name || 'Staff Member',
        change_summary: input.change_summary || 'Updated content content and specifications',
      }
      versionHistory.unshift(newVersionSnapshot)
    }

    const isAssigneeChanged =
      (input.assigned_to_id !== undefined && input.assigned_to_id !== current.assigned_to_id) ||
      (input.assigned_to_name !== undefined && input.assigned_to_name !== current.assigned_to_name)

    let assignmentHistory = [...(current.assignment_history || [])]
    if (isAssigneeChanged && (input.assigned_to_id || input.assigned_to_name)) {
      assignmentHistory.unshift({
        id: 'ASG-' + Date.now().toString(36),
        previous_assignee_id: current.assigned_to_id || null,
        previous_assignee_name: current.assigned_to_name || null,
        new_assignee_id: input.assigned_to_id || '',
        new_assignee_name: input.assigned_to_name || 'Staff Member',
        changed_by_id: user?.id || 'system',
        changed_by_name: user?.employee_name || 'Manager',
        date: formatDate(now),
        time: formatTime(now),
        reason: 'Reassigned task deliverable',
        created_at: now.toISOString(),
      })
    }

    const updated: ContentItem = {
      ...current,
      assignment_history: assignmentHistory,
      title: input.title !== undefined ? input.title.trim() : current.title,
      summary: input.summary !== undefined ? input.summary.trim() : current.summary,
      body: input.body !== undefined ? input.body.trim() : current.body,
      content_type: input.content_type || current.content_type,
      category: input.category !== undefined ? input.category : current.category,
      department: input.department !== undefined ? input.department : current.department,
      product: input.product !== undefined ? input.product : current.product,
      project_id: input.project_id !== undefined ? input.project_id : current.project_id,
      project_name: input.project_name !== undefined ? input.project_name : current.project_name,
      owner_id: input.owner_id || current.owner_id,
      owner_name: input.owner_name || current.owner_name,
      status: input.status || current.status,
      tags: input.tags !== undefined ? input.tags : current.tags,
      start_date: input.start_date !== undefined ? input.start_date : current.start_date,
      due_date: input.due_date !== undefined ? input.due_date : current.due_date,
      assigned_to_id: input.assigned_to_id !== undefined ? input.assigned_to_id : current.assigned_to_id,
      assigned_to_name: input.assigned_to_name !== undefined ? input.assigned_to_name : current.assigned_to_name,
      assigned_role: input.assigned_role || current.assigned_role,
      priority: input.priority || current.priority,
      attachments: input.attachments !== undefined ? input.attachments : current.attachments,
      version: newVersionNum,
      version_history: versionHistory,
      last_reviewed_date: input.last_reviewed_date !== undefined ? input.last_reviewed_date : current.last_reviewed_date,
      next_review_date: input.next_review_date !== undefined ? input.next_review_date : current.next_review_date,
      review_frequency_days: input.review_frequency_days !== undefined ? input.review_frequency_days : current.review_frequency_days,
      is_duplicate: input.is_duplicate !== undefined ? input.is_duplicate : current.is_duplicate,
      duplicate_of_id: input.duplicate_of_id !== undefined ? input.duplicate_of_id : current.duplicate_of_id,
      duplicate_of_title: input.duplicate_of_title !== undefined ? input.duplicate_of_title : current.duplicate_of_title,
      related_content_ids: input.related_content_ids !== undefined ? input.related_content_ids : current.related_content_ids,
      follow_up_required: input.follow_up_required !== undefined ? input.follow_up_required : current.follow_up_required,
      follow_up_reason: input.follow_up_reason !== undefined ? input.follow_up_reason : current.follow_up_reason,
      follow_up_date: input.follow_up_date !== undefined ? input.follow_up_date : current.follow_up_date,
      client_name: input.client_name !== undefined ? input.client_name : current.client_name,
      campaign_name: input.campaign_name !== undefined ? input.campaign_name : current.campaign_name,
      target_platforms: input.target_platforms !== undefined ? input.target_platforms : current.target_platforms,
      primary_platform: input.primary_platform !== undefined ? input.primary_platform : current.primary_platform,
      target_audience: input.target_audience !== undefined ? input.target_audience : current.target_audience,
      content_objective: input.content_objective !== undefined ? input.content_objective : current.content_objective,
      tone_of_voice: input.tone_of_voice !== undefined ? input.tone_of_voice : current.tone_of_voice,
      call_to_action: input.call_to_action !== undefined ? input.call_to_action : current.call_to_action,
      primary_keywords: input.primary_keywords !== undefined ? input.primary_keywords : current.primary_keywords,
      hashtags: input.hashtags !== undefined ? input.hashtags : current.hashtags,
      creative_format: input.creative_format !== undefined ? input.creative_format : current.creative_format,
      creative_brief: input.creative_brief !== undefined ? input.creative_brief : current.creative_brief,
      scheduled_publish_time: input.scheduled_publish_time !== undefined ? input.scheduled_publish_time : current.scheduled_publish_time,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Created',
      `Updated content details (v${newVersionNum}.0) by ${user?.employee_name || 'User'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update content' }
  }
}

// ----------------- RESTORE VERSION (CREATES A NEW VERSION) -----------------
export async function restoreContentVersion(
  contentId: string,
  targetVersionNumber: number | string
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const isHod = user.is_hod || /\b(hod|head of department|head of content)\b/i.test(user.designation || '')
    const isAdmin = user.role === 'Admin'
    if (!isAdmin && !isHod) {
      return { success: false, error: 'Only authorized reviewers/HOD or Admin can restore previous versions.' }
    }

    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
    const index = items.findIndex(i => i.id === contentId)
    if (index === -1) return { success: false, error: 'Content item not found' }

    const current = items[index]
    const history = current.version_history || []
    const targetNum = typeof targetVersionNumber === 'string' ? parseInt(targetVersionNumber.replace(/[^\d]/g, ''), 10) : targetVersionNumber
    const targetVersion = history.find(v => v.version_number === targetNum)
    if (!targetVersion) {
      return { success: false, error: `Version v${targetVersionNumber}.0 not found in history.` }
    }

    const now = new Date()
    // Restoring ALWAYS creates a NEW version; never deletes or erases previous history!
    const nextVersionNum = (current.version || history.length || 1) + 1
    const changeSummary = `Restored from version v${targetVersion.version_number}.0 (originally created by ${targetVersion.created_by_name})`

    const restoredSnapshot: ContentVersionRecord = {
      id: 'VER-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content_id: current.id,
      version_number: nextVersionNum,
      version_label: `v${nextVersionNum}.0`,
      title: targetVersion.title,
      summary: targetVersion.summary,
      body: targetVersion.body,
      content_type: targetVersion.content_type,
      category: targetVersion.category || current.category,
      tags: targetVersion.tags || current.tags,
      status: current.status,
      created_at: now.toISOString(),
      created_by_id: user.id,
      created_by_name: user.employee_name || 'HOD',
      change_summary: changeSummary,
    }

    const updated: ContentItem = {
      ...current,
      title: targetVersion.title,
      summary: targetVersion.summary,
      body: targetVersion.body,
      content_type: targetVersion.content_type,
      category: targetVersion.category || current.category,
      tags: targetVersion.tags || current.tags,
      version: nextVersionNum,
      version_history: [restoredSnapshot, ...history],
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Version Restored',
      `Restored version v${targetVersion.version_number}.0 (created v${nextVersionNum}.0) by ${user.employee_name || 'Manager'}`,
      user.id,
      user.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to restore version' }
  }
}

// ----------------- CONTENT QUALITY & FRESHNESS -----------------
export async function updateContentQualityFlags(
  id: string,
  flags: {
    is_duplicate?: boolean
    duplicate_of_id?: string | null
    duplicate_of_title?: string | null
    duplicate_reason?: string | null
    related_content_ids?: string[]
    follow_up_required?: boolean
    follow_up_reason?: string | null
    follow_up_note?: string | null
    follow_up_date?: string | null
    last_reviewed_date?: string | null
    last_reviewed_at?: string | null
    next_review_date?: string | null
    review_frequency_days?: number | null
    review_frequency?: 'monthly' | 'quarterly' | 'biannual' | 'annual' | number | null
  }
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
    const index = items.findIndex(i => i.id === id)
    if (index === -1) return { success: false, error: 'Content item not found' }

    const current = items[index]
    const now = new Date()

    let freqDays = flags.review_frequency_days
    if (freqDays === undefined && flags.review_frequency !== undefined) {
      if (typeof flags.review_frequency === 'number') {
        freqDays = flags.review_frequency
      } else if (flags.review_frequency === 'monthly') {
        freqDays = 30
      } else if (flags.review_frequency === 'quarterly') {
        freqDays = 90
      } else if (flags.review_frequency === 'biannual') {
        freqDays = 180
      } else if (flags.review_frequency === 'annual') {
        freqDays = 365
      }
    }

    const lastReviewed = flags.last_reviewed_date ?? flags.last_reviewed_at ?? current.last_reviewed_date
    const followUpReason = flags.follow_up_reason ?? flags.follow_up_note ?? current.follow_up_reason

    const updated: ContentItem = {
      ...current,
      is_duplicate: flags.is_duplicate !== undefined ? flags.is_duplicate : current.is_duplicate,
      duplicate_of_id: flags.duplicate_of_id !== undefined ? flags.duplicate_of_id : current.duplicate_of_id,
      duplicate_of_title: flags.duplicate_of_title !== undefined ? flags.duplicate_of_title : current.duplicate_of_title,
      duplicate_reason: flags.duplicate_reason !== undefined ? flags.duplicate_reason : current.duplicate_reason,
      related_content_ids: flags.related_content_ids !== undefined ? flags.related_content_ids : current.related_content_ids,
      follow_up_required: flags.follow_up_required !== undefined ? flags.follow_up_required : current.follow_up_required,
      follow_up_reason: followUpReason,
      follow_up_note: followUpReason,
      follow_up_date: flags.follow_up_date !== undefined ? flags.follow_up_date : current.follow_up_date,
      last_reviewed_date: lastReviewed,
      last_reviewed_at: lastReviewed,
      next_review_date: flags.next_review_date !== undefined ? flags.next_review_date : current.next_review_date,
      review_frequency_days: freqDays !== undefined ? freqDays : current.review_frequency_days,
      review_frequency: flags.review_frequency !== undefined ? flags.review_frequency : current.review_frequency,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    let flagSummary = 'Updated quality & freshness attributes'
    if (flags.is_duplicate) flagSummary = `Marked as duplicate of "${flags.duplicate_of_title || flags.duplicate_of_id}"`
    else if (flags.follow_up_required) flagSummary = `Flagged for follow-up: "${flags.follow_up_reason || 'Needs review'}"`
    else if (flags.last_reviewed_date) flagSummary = `Freshness review recorded on ${flags.last_reviewed_date}`

    await logContentActivity(
      updated.id,
      updated.title,
      'Quality Flag Updated',
      `${flagSummary} by ${user?.employee_name || 'Reviewer'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update quality flags' }
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
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
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
      reason: reason || (isReassignment ? 'Workload rebalance' : 'Content assignment'),
      created_at: now.toISOString(),
    }

    const assignmentHistory = current.assignment_history ? [...current.assignment_history] : []
    assignmentHistory.push(historyRecord)

    const updated: ContentItem = {
      ...current,
      assigned_to_id: assignedUserId,
      assigned_to_name: assignedUserName,
      assigned_role: assignedRole,
      due_date: dueDate || current.due_date,
      priority: priority || current.priority,
      assignment_history: assignmentHistory,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    const notifType = isReassignment ? 'New Assignment' : 'New Assignment'
    const notifTitle = isReassignment ? 'Content Reassigned to You' : 'New Content Assigned'
    await createContentNotification(
      assignedUserId,
      notifType,
      notifTitle,
      `You have been assigned to "${current.title}" (${assignedRole}) with due date ${dueDate || 'TBD'}.`,
      current.id,
      current.title,
      reason
    )

    await logContentActivity(
      current.id,
      current.title,
      isReassignment ? 'Reassigned' : 'Assigned',
      `${isReassignment ? 'Reassigned' : 'Assigned'} to ${assignedUserName} (${assignedRole}) by ${user?.employee_name || 'Manager'}` +
      (reason ? `: "${reason}"` : ''),
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign content' }
  }
}

// ----------------- SUBMIT FOR REVIEW -----------------
export async function submitForReview(
  contentId: string,
  reviewerId?: string,
  reviewerName?: string
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
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

// ----------------- REVIEW CONTENT ITEM -----------------
export async function reviewContentItem(
  contentId: string,
  decision: ReviewDecision,
  comment: string,
  requiredCorrections?: string[],
  nextReviewDate?: string | null
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!comment && (decision === 'Changes Requested' || decision === 'Rejected')) {
      return { success: false, error: 'Comment/reason is required for this decision' }
    }

    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
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
      required_corrections: requiredCorrections || [],
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

    let lastReviewed = current.last_reviewed_date
    let nextReviewed = current.next_review_date
    if (decision === 'Approved') {
      lastReviewed = now.toISOString()
      if (nextReviewDate) {
        nextReviewed = nextReviewDate
      } else {
        const d = new Date()
        d.setDate(d.getDate() + (current.review_frequency_days || 90))
        nextReviewed = d.toISOString().slice(0, 10)
      }
    }

    const updated: ContentItem = {
      ...current,
      status: nextStatus,
      review_history: history,
      last_reviewed_date: lastReviewed,
      next_review_date: nextReviewed,
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

// ----------------- PUBLISHING -----------------
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

    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
    const index = items.findIndex(i => i.id === contentId)
    if (index === -1) {
      return { success: false, error: 'Content item not found' }
    }

    const current = items[index]
    if (current.status !== 'Approved') {
      return { success: false, error: 'Content must be in "Approved" status before it can be published.' }
    }

    const now = new Date()
    const newVersionNum = (current.version || 1) + 1

    const publishedVersionSnapshot: ContentVersionRecord = {
      id: 'VER-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content_id: current.id,
      version_number: newVersionNum,
      version_label: `v${newVersionNum}.0`,
      title: current.title,
      summary: current.summary,
      body: current.body,
      content_type: current.content_type,
      category: current.category || null,
      tags: current.tags || [],
      status: 'Published',
      created_at: now.toISOString(),
      created_by_id: user.id,
      created_by_name: user.employee_name || 'HOD',
      change_summary: 'Published officially to portal',
    }

    const nextRev = new Date()
    nextRev.setDate(nextRev.getDate() + (current.review_frequency_days || 90))

    const updated: ContentItem = {
      ...current,
      status: 'Published',
      version: newVersionNum,
      version_history: [publishedVersionSnapshot, ...(current.version_history || [])],
      completion_date: now.toISOString(),
      last_reviewed_date: now.toISOString(),
      next_review_date: nextRev.toISOString().slice(0, 10),
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    await logContentActivity(
      updated.id,
      updated.title,
      'Published',
      `Published officially by ${user.employee_name || 'Manager'}`,
      user.id,
      user.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to publish content' }
  }
}

export async function archiveContentItem(id: string): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
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

    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
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

export async function addContentTaskComment(
  taskId: string,
  commentText: string,
  parentId?: string
): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const user = await getCurrentUser()
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
    const index = items.findIndex(i => i.id === taskId)
    if (index === -1) {
      return { success: false, error: 'Task not found' }
    }

    const now = new Date()
    const newComment: ContentTaskComment = {
      id: 'CMT-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      task_id: taskId,
      user_id: user?.id || 'system',
      user_name: user?.employee_name || 'Team Member',
      content: commentText.trim(),
      parent_id: parentId || null,
      created_at: now.toISOString(),
    }

    const current = items[index]
    const updatedComments = [...(current.comments || []), newComment]

    const updated: ContentItem = {
      ...current,
      comments: updatedComments,
      updated_at: now.toISOString(),
    }

    items[index] = updated
    writeStore(CONTENT_ITEMS_FILE, items)

    if (current.assigned_to_id && current.assigned_to_id !== user?.id) {
      await createContentNotification(
        current.assigned_to_id,
        'Review Due',
        'New Comment on Task',
        `${user?.employee_name || 'A team member'} commented on "${current.title}": "${commentText.slice(0, 60)}"`,
        current.id,
        current.title
      )
    }

    await logContentActivity(
      updated.id,
      updated.title,
      'Created',
      `New comment added by ${user?.employee_name || 'User'}`,
      user?.id,
      user?.employee_name
    )

    safeRevalidatePath('/content-management')
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add comment' }
  }
}

export async function updateContentStatus(id: string, status: ContentStatus, comment?: string): Promise<{ success: boolean; data?: ContentItem; error?: string }> {
  try {
    const rawItems = readStore<ContentItem[]>(CONTENT_ITEMS_FILE, [])
    const items = rawItems.map(normalizeContentItem)
    const index = items.findIndex(i => i.id === id)
    if (index === -1) {
      return { success: false, error: 'Content not found' }
    }

    const user = await getCurrentUser()
    const now = new Date()
    const current = items[index]

    const newProgress = (status === 'Completed' || status === 'Published' || status === 'Approved')
      ? 100
      : status === 'In Review'
      ? 75
      : status === 'In Progress'
      ? 40
      : 0;

    const updated: ContentItem = {
      ...current,
      status,
      progress: newProgress,
      updated_at: now.toISOString(),
      completion_date: status === 'Completed' || status === 'Published' || status === 'Approved' ? now.toISOString() : current.completion_date,
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
