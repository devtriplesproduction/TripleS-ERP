'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { markAnnouncementAsRead } from '@/lib/actions/announcements'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

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

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      default: return 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20'
    }
  }

  return (
    <>
      <Card 
        onClick={handleOpen}
        className={`flex flex-col overflow-hidden border border-border bg-card rounded-[16px] transition-all hover:shadow-md cursor-pointer relative ${!announcement.isRead ? 'ring-1 ring-primary/50' : ''}`}
      >
        {!announcement.isRead && (
          <div className="absolute top-5 right-5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary">NEW</span>
          </div>
        )}

        <div className="px-5 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(announcement.priority)}`}>
              {announcement.priority}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-1">
            <h3 className="text-[16px] font-semibold text-foreground line-clamp-2 leading-tight pr-12">
              {announcement.title}
            </h3>
            <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed mt-1">
              {announcement.message}
            </p>
          </div>
        </div>

        <div className="mt-auto px-5 py-3 border-t border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2 text-[13px] text-foreground font-medium">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
              {announcement.created_by_profile?.first_name?.[0]}{announcement.created_by_profile?.last_name?.[0]}
            </div>
            {announcement.created_by_profile?.first_name} {announcement.created_by_profile?.last_name}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {dayjs(announcement.published_at || announcement.created_at).format('DD MMM YYYY')}
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(announcement.priority)}`}>
                  {announcement.priority}
                </Badge>
              </div>
              <span className="leading-tight">{announcement.title}</span>
            </DialogTitle>
            <div className="text-sm text-muted-foreground font-medium pt-1">
              By {announcement.created_by_profile?.first_name} {announcement.created_by_profile?.last_name} • {dayjs(announcement.published_at || announcement.created_at).format('MMMM D, YYYY h:mm A')}
            </div>
          </DialogHeader>
          <div className="py-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {announcement.message}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
