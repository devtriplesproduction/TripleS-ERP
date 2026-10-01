'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getDashboardAnnouncements, markAnnouncementAsRead } from '@/lib/actions/announcements'
import dayjs from 'dayjs'
import { Badge } from '@/components/ui/badge'

export function NotificationBell() {
  const [data, setData] = useState<{ announcements: any[], unreadCount: number }>({ announcements: [], unreadCount: 0 })
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)

  useEffect(() => {
    getDashboardAnnouncements().then(setData).catch(console.error)
  }, [])

  const handleOpenAnnouncement = async (announcement: any) => {
    setSelectedAnnouncement(announcement)
    
    // Mark as read if not read
    if (!announcement.isRead) {
      await markAnnouncementAsRead(announcement.id)
      setData(prev => {
        const newAnn = prev.announcements.map(a => a.id === announcement.id ? { ...a, isRead: true } : a)
        return {
          announcements: newAnn,
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }
      })
    }
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger className="relative text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer">
          <Bell className="h-5 w-5" />
          {data.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {data.unreadCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h4 className="font-semibold">Notifications</h4>
            {data.unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {data.unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {data.announcements.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              data.announcements.map((announcement) => (
                <button
                  key={announcement.id}
                  onClick={() => {
                    handleOpenAnnouncement(announcement)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left flex flex-col gap-1 border-b p-4 transition-colors hover:bg-muted ${!announcement.isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {!announcement.isRead && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium text-sm truncate">{announcement.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{announcement.message}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {dayjs(announcement.published_at).format('MMM D, YYYY h:mm A')}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {selectedAnnouncement?.title}
              {selectedAnnouncement?.priority === 'high' && (
                <Badge variant="destructive">High Priority</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 whitespace-pre-wrap text-sm text-foreground">
            {selectedAnnouncement?.message}
          </div>
          <div className="text-xs text-muted-foreground border-t pt-4">
            Published on {dayjs(selectedAnnouncement?.published_at).format('MMMM D, YYYY [at] h:mm A')} <br />
            By {selectedAnnouncement?.created_by_profile?.first_name} {selectedAnnouncement?.created_by_profile?.last_name}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
