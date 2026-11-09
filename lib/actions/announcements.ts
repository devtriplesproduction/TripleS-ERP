'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { invalidateNotificationCache } from '@/actions/notifications.actions'
import { guardServerAction } from '@/lib/auth'
import type { Announcement } from '@/components/announcements/AnnouncementsClientPage'

export type AnnouncementItem = Announcement

export async function createAnnouncement(data: Record<string, unknown>) {
  const user = await guardServerAction(['Admin', 'HR'])
  const supabase = await createClient()

  const { error } = await supabase.from('announcements').insert({
    ...data,
    created_by: user.id,
  })

  if (error) {
    console.error("Error creating announcement:", error)
    throw new Error(error.message)
  }
  await invalidateNotificationCache()
  revalidatePath('/announcements')
  revalidatePath('/dashboard')
  revalidatePath('/', 'layout')
}

export async function updateAnnouncement(id: string, data: Record<string, unknown>) {
  await guardServerAction(['Admin', 'HR'])
  const supabase = await createClient()
  const { error } = await supabase.from('announcements').update(data).eq('id', id)
  if (error) {
    console.error("Error updating announcement:", error)
    throw new Error(error.message)
  }

  // Clear reads if status changed to published or it was republished
  if (data.status === 'published' || data.published_at) {
    await supabase.from('announcement_reads').delete().eq('announcement_id', id)
  }

  await invalidateNotificationCache()
  revalidatePath('/announcements')
  revalidatePath('/dashboard')
  revalidatePath('/', 'layout')
}

export async function deleteAnnouncement(id: string) {
  await guardServerAction(['Admin', 'HR'])
  const supabase = await createClient()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) {
    console.error("Error deleting announcement:", error)
    throw new Error(error.message)
  }
  await invalidateNotificationCache()
  revalidatePath('/announcements')
  revalidatePath('/dashboard')
  revalidatePath('/', 'layout')
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('announcements')
    .select(`*, created_by_profile:profiles!announcements_created_by_fkey(first_name, last_name)`)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching announcements:", error)
    return []
  }
  // Sorting: Active announcements (published) first, Inactive announcements at the bottom
  return ((data || []) as unknown as AnnouncementItem[]).sort((a, b) => {
    const aActive = a.status === 'published' ? 1 : 0
    const bActive = b.status === 'published' ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export async function markAnnouncementAsRead(announcementId: string) {
  const supabase = await createClient()
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) return

  const { error } = await supabase.from('announcement_reads').upsert({
    announcement_id: announcementId,
    user_id: userAuth.user.id,
    read_at: new Date().toISOString()
  }, { onConflict: 'announcement_id, user_id' })

  if (error) {
    console.error("Error marking announcement as read:", error)
    return
  }
  revalidatePath('/dashboard')
}

export async function getDashboardAnnouncements() {
  const supabase = await createClient()
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) return { announcements: [], unreadCount: 0 }

  const { data: profile } = await supabase.from('profiles').select('id, department, roles').eq('id', userAuth.user.id).single()

  const { data: announcements, error } = await supabase
    .from('announcements')
    .select(`
      *, 
      created_by_profile:profiles!announcements_created_by_fkey(first_name, last_name),
      announcement_reads(user_id, read_at)
    `)
    .eq('status', 'published')
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })

  if (error) {
    console.error("Error fetching dashboard announcements:", error)
    return { announcements: [], unreadCount: 0 }
  }

  const filtered = (announcements || []).filter(a => {
    if (a.created_by === userAuth.user.id) return false;
    if (a.target_audience === 'all') return true;
    if (a.target_audience === 'department' && profile?.department === a.target_department) return true;
    return false;
  })

  let unreadCount = 0;

  const enriched = filtered.map(a => {
    const isRead = a.announcement_reads.some((r: { user_id: string }) => r.user_id === userAuth.user.id)
    if (!isRead) {
      unreadCount++;
    }
    return { ...a, isRead }
  })

  return { announcements: enriched, unreadCount }
}
