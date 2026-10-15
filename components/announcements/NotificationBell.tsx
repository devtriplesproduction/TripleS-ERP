'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BookOpen,
  Calendar,
  Megaphone,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type ERPNotificationItem,
  type NotificationType,
} from '@/actions/notifications.actions'
import { createClient } from '@/lib/supabase/client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<ERPNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'rulebook' | 'holiday' | 'announcement'>('all')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<ERPNotificationItem | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // Track if component is mounted
  const isMountedRef = useRef(true)

  // Load notifications from server action
  const loadNotifications = useCallback(async () => {
    try {
      const res = await getUserNotificationsAction()
      if (isMountedRef.current) {
        setNotifications(res.notifications || [])
        setUnreadCount(res.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadNotifications()

    // 1. Setup Supabase Realtime subscriptions
    const supabase = createClient()
    const channel = supabase
      .channel('erp-realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          loadNotifications()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_rules' },
        () => {
          loadNotifications()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'holidays' },
        () => {
          loadNotifications()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quick_tasks' },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    // 2. Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('erp-notifications-channel')
      bc.onmessage = () => {
        loadNotifications()
      }
    } catch {
      // Fallback if not supported
    }

    // 3. In-tab custom event listener
    const handleCustomUpdate = () => {
      loadNotifications()
    }
    window.addEventListener('erp-notification-update', handleCustomUpdate)
    window.addEventListener('erp-quick-tasks-update', handleCustomUpdate)

    // 4. Fallback interval polling (every 30 seconds when tab is active)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadNotifications()
      }
    }, 30000)

    return () => {
      isMountedRef.current = false
      supabase.removeChannel(channel)
      if (bc) bc.close()
      window.removeEventListener('erp-notification-update', handleCustomUpdate)
      window.removeEventListener('erp-quick-tasks-update', handleCustomUpdate)
      clearInterval(interval)
    }
  }, [loadNotifications])

  // Handle clicking on a notification item
  const handleItemClick = async (notif: ERPNotificationItem) => {
    // Optimistically mark as read locally
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      // Call server action in background
      markNotificationAsReadAction(notif.id, notif.rawId, notif.type).catch(console.error)
    }

    setIsOpen(false)

    if (notif.type === 'announcement') {
      setSelectedAnnouncement(notif)
    } else {
      router.push(notif.link)
    }
  }

  // Handle Mark All as Read
  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0 || unreadCount === 0 || isMarkingAll) return
    setIsMarkingAll(true)

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)

    try {
      await markAllNotificationsAsReadAction(
        notifications.map((n) => ({
          notifId: n.id,
          rawId: n.rawId,
          type: n.type,
        }))
      )
    } catch (err) {
      console.error('Error marking all as read:', err)
    } finally {
      setIsMarkingAll(false)
    }
  }

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true
    return n.type === activeTab
  })

  // Format date helper
  const formatTime = (dateStr: string) => {
    if (!dateStr) return ''
    const d = dayjs(dateStr)
    const now = dayjs()
    if (now.diff(d, 'day') < 2) {
      return d.fromNow()
    }
    return d.format('MMM D, YYYY')
  }

  // Icon and badge styling per type
  const getTypeConfig = (type: NotificationType) => {
    switch (type) {
      case 'quick_task':
        return {
          icon: CheckSquare,
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        }
      case 'rulebook':
        return {
          icon: BookOpen,
          badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        }
      case 'holiday':
        return {
          icon: Calendar,
          badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        }
      case 'announcement':
      default:
        return {
          icon: Megaphone,
          badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        }
    }
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors outline-none cursor-pointer"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </PopoverTrigger>

        <PopoverContent
          className="w-88 sm:w-96 p-0 shadow-xl border border-border bg-card overflow-hidden"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-medium">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-background text-xs overflow-x-auto no-scrollbar">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'rulebook', label: 'Policies' },
                { key: 'holiday', label: 'Holidays' },
                { key: 'announcement', label: 'Announcements' },
              ] as const
            ).map((tab) => {
              const count =
                tab.key === 'all'
                  ? notifications.length
                  : notifications.filter((n) => n.type === tab.key).length

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-medium ${
                    activeTab === tab.key
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1 opacity-70 text-[10px]">({count})</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
                  <Bell className="w-5 h-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You are all caught up with policies, holidays, and announcements.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const config = getTypeConfig(notif.type)
                const IconComponent = config.icon

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-muted/60 relative group ${
                      !notif.isRead ? 'bg-primary/4 dark:bg-primary/8' : ''
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {!notif.isRead && (
                      <span className="absolute left-0 top-3 bottom-3 w-0.5 bg-primary rounded-r" />
                    )}

                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${config.iconBg}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${config.badgeColor}`}
                        >
                          {notif.typeLabel}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>

                      <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {notif.title}
                      </div>

                      {notif.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span className="truncate">By {notif.creatorName}</span>
                        <span className="inline-flex items-center gap-0.5 text-foreground/80 font-medium group-hover:translate-x-0.5 transition-transform">
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2 bg-muted/20 flex items-center justify-between text-xs px-3">
            <span className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                router.push('/announcements')
              }}
              className="text-[11px] text-foreground font-medium hover:underline flex items-center gap-1"
            >
              <span>All Announcements</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Announcement Detail Modal */}
      <Dialog
        open={!!selectedAnnouncement}
        onOpenChange={(open) => !open && setSelectedAnnouncement(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center justify-between gap-2">
              <span className="truncate">{selectedAnnouncement?.title}</span>
              {selectedAnnouncement?.priority === 'high' && (
                <Badge variant="destructive" className="shrink-0 text-xs">
                  High Priority
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {selectedAnnouncement?.description}
          </div>

          <div className="text-xs text-muted-foreground border-t border-border pt-3 flex flex-col gap-1">
            <div>
              Published on{' '}
              {selectedAnnouncement?.date
                ? dayjs(selectedAnnouncement.date).format('MMMM D, YYYY [at] h:mm A')
                : 'Recent'}
            </div>
            <div>By {selectedAnnouncement?.creatorName}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAnnouncement(null)}
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedAnnouncement(null)
                router.push('/announcements')
              }}
            >
              Go to Announcements
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
