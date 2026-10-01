'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pin, AlertCircle, Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { markAnnouncementAsRead } from '@/lib/actions/announcements'
import { useRouter } from 'next/navigation'

export function DashboardAnnouncementReader({ announcement }: { announcement: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleOpen = async () => {
    setIsOpen(true)
    if (!announcement.isRead) {
      await markAnnouncementAsRead(announcement.id)
      router.refresh()
    }
  }

  return (
    <>
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${announcement.pinned ? 'border-primary/50 bg-primary/5' : ''} ${!announcement.isRead ? 'ring-1 ring-destructive ring-offset-1' : ''}`}
        onClick={handleOpen}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg line-clamp-2">
              {announcement.pinned && <Pin className="h-4 w-4 text-primary inline mr-2" />}
              {announcement.title}
            </CardTitle>
            {announcement.priority === 'high' && (
              <Badge variant="destructive" className="shrink-0 text-[10px]">High</Badge>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dayjs(announcement.published_at).format('MMM D')}
            </span>
            {!announcement.isRead && (
              <span className="flex items-center gap-1 text-destructive font-medium">
                <AlertCircle className="h-3 w-3" />
                Action Required
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{announcement.message}</p>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {announcement.title}
                {announcement.priority === 'high' && <Badge variant="destructive">High Priority</Badge>}
              </div>
              <div className="text-xs text-muted-foreground font-normal">
                By {announcement.created_by_profile?.first_name} {announcement.created_by_profile?.last_name} • {dayjs(announcement.published_at).format('MMMM D, YYYY h:mm A')}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 whitespace-pre-wrap text-sm text-foreground">
            {announcement.message}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
