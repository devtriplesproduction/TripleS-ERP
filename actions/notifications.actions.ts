'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'

export type NotificationType = 'rulebook' | 'holiday' | 'announcement'

export interface ERPNotificationItem {
  id: string
  rawId: string
  type: NotificationType
  typeLabel: 'Rulebook Policy' | 'Holiday' | 'Announcement'
  title: string
  description: string
  creatorName: string
  date: string
  createdAt: string
  link: string
  isRead: boolean
  priority?: 'low' | 'medium' | 'high'
  meta?: any
}

interface UserNotificationData {
  notifications: ERPNotificationItem[]
  unreadCount: number
}

// In-memory cache for ultra-fast repeated loads (TTL: 10s)
interface CacheEntry {
  data: UserNotificationData
  timestamp: number
}
const notificationCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10000

// In-memory creator name cache
const creatorNameCache = new Map<string, string>()

export interface UserClearRecord {
  cleared_at: string
  cleared_ids: string[]
  updated_at: string
}

// Fallback persistence file in case table migration is pending on remote Supabase
const FALLBACK_STORE_PATH = path.join(process.cwd(), 'scratch', 'notification_clears_store.json')

function ensureStoreDir(): void {
  const dir = path.dirname(FALLBACK_STORE_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readFallbackClears(userId: string): UserClearRecord | null {
  try {
    ensureStoreDir()
    if (!fs.existsSync(FALLBACK_STORE_PATH)) {
      return null
    }
    const raw = fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8')
    const all = JSON.parse(raw) as Record<string, UserClearRecord>
    return all[userId] || null
  } catch {
    return null
  }
}

function writeFallbackClear(userId: string, record: UserClearRecord): void {
  try {
    ensureStoreDir()
    let all: Record<string, UserClearRecord> = {}
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      try {
        all = JSON.parse(fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8'))
      } catch {
        all = {}
      }
    }
    all[userId] = record
    fs.writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(all, null, 2), 'utf-8')
  } catch (err) {
    console.error('[NotificationClears] Failed to write fallback store:', err)
  }
}

export async function invalidateNotificationCache(userId?: string) {
  if (userId) {
    notificationCache.delete(userId)
  } else {
    notificationCache.clear()
  }
}

export async function getUserNotificationsAction(): Promise<UserNotificationData> {
  // 1. Get cached authenticated user (already memoized by React cache in lib/auth)
  const user = await getCurrentUser()
  if (!user) {
    return { notifications: [], unreadCount: 0 }
  }

  // 2. Check in-memory notification cache
  const cached = notificationCache.get(user.id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const supabase = await createClient()

  // 3. Read cookie for persistent read states
  let readIds: string[] = []
  let readAllBefore: number = 0
  let cookieStore: any = null
  try {
    cookieStore = await cookies()
    const readCookie = cookieStore.get(`notif_reads_${user.id}`)?.value
    if (readCookie) {
      try {
        const parsed = JSON.parse(readCookie)
        readIds = Array.isArray(parsed.ids) ? parsed.ids : []
        readAllBefore = typeof parsed.readAllBefore === 'number' ? parsed.readAllBefore : 0
      } catch {
        // Ignore parse failure
      }
    }
  } catch {
    // Non-request context
  }

  // 3b. Read user cleared notification state (DB + fallback store + cookie)
  let userClearedAt: string | null = null
  let userClearedIds: string[] = []

  try {
    const { data: clearData, error: clearErr } = await supabase
      .from('user_notification_clears')
      .select('cleared_at, cleared_ids')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clearErr && clearData) {
      userClearedAt = clearData.cleared_at
      userClearedIds = Array.isArray(clearData.cleared_ids) ? clearData.cleared_ids : []
    }
  } catch {
    // DB unmigrated or unavailable
  }

  // Fallback to server store if not retrieved from DB
  if (!userClearedAt) {
    const fallback = readFallbackClears(user.id)
    if (fallback) {
      userClearedAt = fallback.cleared_at
      userClearedIds = fallback.cleared_ids || []
    }
  }

  // Also check cookie (takes newest timestamp)
  if (cookieStore) {
    try {
      const clearedCookie = cookieStore.get(`notif_cleared_${user.id}`)?.value
      if (clearedCookie) {
        const parsed = JSON.parse(clearedCookie)
        if (parsed.clearedAt) {
          if (!userClearedAt || new Date(parsed.clearedAt).getTime() > new Date(userClearedAt).getTime()) {
            userClearedAt = parsed.clearedAt
            if (Array.isArray(parsed.clearedIds) && parsed.clearedIds.length > 0) {
              userClearedIds = Array.from(new Set([...userClearedIds, ...parsed.clearedIds]))
            }
          }
        }
      }
    } catch {
      // Ignore cookie parse failure
    }
  }

  const empIdentifiers = [user.id, user.employee_id].filter(Boolean) as string[]

  // 4. Fetch all data in PARALLEL via Promise.all
  const [
    rulesRes,
    acksRes,
    holidaysRes,
    announcementsRes,
  ] = await Promise.all([
    supabase
      .from('company_rules')
      .select('id, title, category, description, version, status, created_by, published_at, created_at')
      .eq('status', 'Published')
      .order('created_at', { ascending: false })
      .limit(10),

    empIdentifiers.length > 0
      ? supabase
          .from('employee_rule_acknowledgements')
          .select('rule_id, version')
          .in('employee_id', empIdentifiers)
      : Promise.resolve({ data: [] }),

    supabase
      .from('holidays')
      .select('id, name, date, is_optional, holiday_type, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('announcements')
      .select(`
        id, title, message, target_audience, target_department, priority, status, created_by, created_at, published_at,
        created_by_profile:profiles!announcements_created_by_fkey(first_name, last_name),
        announcement_reads(user_id, read_at)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const rules = rulesRes.data || []
  const acks = acksRes.data || []
  const holidays = holidaysRes.data || []
  const announcements = announcementsRes.data || []

  // Build acknowledgment lookup set
  const ackKeys = new Set<string>()
  acks.forEach((a: any) => {
    const v = String(a.version).trim()
    ackKeys.add(`${a.rule_id}_${v}`)
    if (!v.includes('.')) ackKeys.add(`${a.rule_id}_${v}.0`)
  })

  // Filter announcements for target audience
  const userDept = user.department || null
  const eligibleAnnouncements = announcements.filter((a: any) => {
    if (a.target_audience === 'all') return true
    if (a.target_audience === 'department' && userDept && a.target_department === userDept) return true
    return false
  })

  // 5. Fast creator name resolution using in-memory cache
  const creatorIds = [
    ...new Set([
      ...rules.map((r: any) => r.created_by).filter(Boolean),
      ...holidays.map((h: any) => h.created_by).filter(Boolean),
    ]),
  ]

  const uncachedCreatorIds = creatorIds.filter((id) => !creatorNameCache.has(id))
  if (uncachedCreatorIds.length > 0) {
    const { data: profilesById } = await supabase
      .from('profiles')
      .select('id, employee_id, first_name, last_name')
      .in('id', uncachedCreatorIds)

    if (profilesById) {
      profilesById.forEach((p) => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
        if (fullName) {
          creatorNameCache.set(p.id, fullName)
          if (p.employee_id) creatorNameCache.set(p.employee_id, fullName)
        }
      })
    }
  }

  // 6. Construct unified notification items
  const items: ERPNotificationItem[] = []

  // Add Company Rules
  rules.forEach((r: any) => {
    const notifId = `rule_${r.id}`
    const vStr = String(r.version || '1.0').trim()
    const isAcked = ackKeys.has(`${r.id}_${vStr}`) || ackKeys.has(`${r.id}_${vStr}.0`)
    const createdAtIso = r.published_at || r.created_at || new Date().toISOString()
    const isMarkedRead =
      readIds.includes(notifId) ||
      (new Date(createdAtIso).getTime() <= readAllBefore)

    const creatorName = (r.created_by && creatorNameCache.get(r.created_by))
      ? creatorNameCache.get(r.created_by)!
      : 'HR / Management'

    items.push({
      id: notifId,
      rawId: r.id,
      type: 'rulebook',
      typeLabel: 'Rulebook Policy',
      title: `${r.title} (v${r.version || '1.0'})`,
      description: r.description
        ? (r.description.length > 90 ? `${r.description.slice(0, 90)}...` : r.description)
        : 'New policy published.',
      creatorName,
      date: r.published_at || r.created_at,
      createdAt: createdAtIso,
      link: '/rulebook',
      isRead: isAcked || isMarkedRead,
      meta: r,
    })
  })

  // Add Holidays
  const userRole = user.role
  const holidayLink =
    userRole === 'Admin'
      ? '/admin-holiday'
      : userRole === 'HR'
      ? '/hr/holidays'
      : '/employee-holiday'

  holidays.forEach((h: any) => {
    const notifId = `holiday_${h.id}`
    const createdAtIso = h.created_at || new Date(h.date).toISOString()
    const isMarkedRead =
      readIds.includes(notifId) ||
      (new Date(createdAtIso).getTime() <= readAllBefore)

    const creatorName =
      h.created_by && creatorNameCache.get(h.created_by)
        ? creatorNameCache.get(h.created_by)!
        : 'HR & Administration'

    items.push({
      id: notifId,
      rawId: h.id,
      type: 'holiday',
      typeLabel: 'Holiday',
      title: `Holiday: ${h.name}`,
      description: `Scheduled on ${dayjs(h.date).format('dddd, MMMM D, YYYY')}${h.is_optional ? ' (Optional)' : ''}`,
      creatorName,
      date: h.created_at || h.date,
      createdAt: createdAtIso,
      link: holidayLink,
      isRead: isMarkedRead,
      meta: h,
    })
  })

  // Add Announcements
  eligibleAnnouncements.forEach((a: any) => {
    const notifId = `announcement_${a.id}`
    const createdAtIso = a.published_at || a.created_at || new Date().toISOString()
    const isReadDb =
      (a.announcement_reads || []).some((ar: any) => ar.user_id === user.id) ||
      a.created_by === user.id
    const isMarkedRead =
      isReadDb ||
      readIds.includes(notifId) ||
      (new Date(createdAtIso).getTime() <= readAllBefore)

    const creatorName = a.created_by_profile
      ? `${a.created_by_profile.first_name || ''} ${a.created_by_profile.last_name || ''}`.trim()
      : (a.created_by && creatorNameCache.get(a.created_by))
      ? creatorNameCache.get(a.created_by)!
      : 'Management'

    items.push({
      id: notifId,
      rawId: a.id,
      type: 'announcement',
      typeLabel: 'Announcement',
      title: a.title,
      description: a.message,
      creatorName: creatorName || 'Management',
      date: a.published_at || a.created_at,
      createdAt: createdAtIso,
      link: '/announcements',
      isRead: isMarkedRead,
      priority: a.priority,
      meta: a,
    })
  })

  // 7. Filter out cleared notifications for this user
  const clearedTime = userClearedAt ? new Date(userClearedAt).getTime() : 0
  const clearedIdSet = new Set(userClearedIds)

  const visibleItems = items.filter((item) => {
    // 1. Explicitly cleared ID check
    if (clearedIdSet.has(item.id)) return false
    // 2. Created on or before user clear timestamp
    if (clearedTime > 0) {
      const itemTime = new Date(item.createdAt).getTime()
      if (!isNaN(itemTime) && itemTime <= clearedTime) {
        return false
      }
    }
    return true
  })

  // Sort by createdAt descending
  visibleItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const unreadCount = visibleItems.filter((n) => !n.isRead).length
  const result: UserNotificationData = { notifications: visibleItems, unreadCount }

  // Save to in-memory cache
  notificationCache.set(user.id, {
    data: result,
    timestamp: Date.now(),
  })

  return result
}

export async function clearUserNotificationsAction(): Promise<{ success: boolean; error?: string }> {
  // 1. Derive user strictly from authenticated session
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Unauthorized: User session required' }
  }

  const nowIso = new Date().toISOString()

  // Invalidate in-memory cache for this user immediately
  notificationCache.delete(user.id)

  const supabase = await createClient()

  // 2. Fetch current notifications to capture current notification IDs
  let currentNotifIds: string[] = []
  try {
    const currentData = await getUserNotificationsAction()
    currentNotifIds = currentData.notifications.map((n) => n.id)
  } catch (err) {
    console.warn('[NotificationClears] Could not pre-fetch current IDs:', err)
  }

  // Merge with existing fallback cleared IDs
  const existingFallback = readFallbackClears(user.id)
  const existingClearedIds = existingFallback?.cleared_ids || []
  const allClearedIds = Array.from(new Set([...existingClearedIds, ...currentNotifIds]))

  // 3. Attempt upsert into database table
  try {
    const { error: dbErr } = await supabase
      .from('user_notification_clears')
      .upsert(
        {
          user_id: user.id,
          cleared_at: nowIso,
          cleared_ids: allClearedIds,
          updated_at: nowIso,
        },
        { onConflict: 'user_id' }
      )
    if (dbErr && dbErr.code !== 'PGRST205') {
      console.warn('[NotificationClears] DB upsert warning:', dbErr.message)
    }
  } catch (err) {
    console.warn('[NotificationClears] DB upsert exception:', err)
  }

  // 4. Persist to server fallback store
  writeFallbackClear(user.id, {
    cleared_at: nowIso,
    cleared_ids: allClearedIds,
    updated_at: nowIso,
  })

  // 5. Persist to user-isolated cookie
  try {
    const cookieStore = await cookies()
    cookieStore.set(
      `notif_cleared_${user.id}`,
      JSON.stringify({
        clearedAt: nowIso,
        clearedIds: allClearedIds,
      }),
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
      }
    )
  } catch (err) {
    console.warn('[NotificationClears] Cookie set error:', err)
  }

  // 6. Invalidate cache again
  notificationCache.delete(user.id)

  try {
    revalidatePath('/', 'layout')
  } catch {
    // Ignore in non-request contexts
  }

  return { success: true }
}

export async function markNotificationAsReadAction(
  notifId: string,
  rawId: string,
  type: NotificationType
) {
  const user = await getCurrentUser()
  if (!user) return

  // Invalidate in-memory cache for this user
  notificationCache.delete(user.id)

  const supabase = await createClient()

  // If announcement, record in announcement_reads table
  if (type === 'announcement') {
    await supabase.from('announcement_reads').upsert(
      {
        announcement_id: rawId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id, user_id' }
    )
  }

  // Persist in cookie
  try {
    const cookieStore = await cookies()
    const cookieKey = `notif_reads_${user.id}`
    const existingCookie = cookieStore.get(cookieKey)?.value
    let currentIds: string[] = []
    let readAllBefore = 0

    if (existingCookie) {
      try {
        const parsed = JSON.parse(existingCookie)
        currentIds = Array.isArray(parsed.ids) ? parsed.ids : []
        readAllBefore = typeof parsed.readAllBefore === 'number' ? parsed.readAllBefore : 0
      } catch {
        // Ignore
      }
    }

    if (!currentIds.includes(notifId)) {
      currentIds = [notifId, ...currentIds].slice(0, 50)
    }

    cookieStore.set(cookieKey, JSON.stringify({ ids: currentIds, readAllBefore }), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
    })
  } catch {
    // Non-request context
  }

  try {
    revalidatePath('/', 'layout')
  } catch {}
}

export async function markAllNotificationsAsReadAction(
  notifications: { notifId: string; rawId: string; type: NotificationType }[]
) {
  const user = await getCurrentUser()
  if (!user) return

  // Invalidate in-memory cache for this user
  notificationCache.delete(user.id)

  const supabase = await createClient()

  // Batch insert all announcements into announcement_reads
  const announcementReads = notifications
    .filter((n) => n.type === 'announcement')
    .map((n) => ({
      announcement_id: n.rawId,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }))

  if (announcementReads.length > 0) {
    await supabase
      .from('announcement_reads')
      .upsert(announcementReads, { onConflict: 'announcement_id, user_id' })
  }

  // Set readAllBefore in cookie
  try {
    const cookieStore = await cookies()
    const cookieKey = `notif_reads_${user.id}`
    const allIds = notifications.map((n) => n.notifId).slice(0, 50)

    cookieStore.set(
      cookieKey,
      JSON.stringify({
        ids: allIds,
        readAllBefore: Date.now(),
      }),
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: 'lax',
      }
    )
  } catch {
    // Non-request context
  }

  try {
    revalidatePath('/', 'layout')
  } catch {}
}

