'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Megaphone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { markAnnouncementAsRead } from '@/lib/actions/announcements'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface Announcement {
  id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  pinned: boolean
  published_at: string | null
  created_at: string
  created_by_profile?: {
    first_name: string
    last_name: string
  }
  isRead: boolean
}

export function EmployeeAnnouncementsPage({ announcements: initialAnnouncements }: { announcements: Announcement[] }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const router = useRouter()

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.message.toLowerCase().includes(search.toLowerCase())
      
      let matchFilter = true
      if (filter === 'urgent') matchFilter = a.priority === 'urgent'
      if (filter === 'important') matchFilter = a.priority === 'high'
      if (filter === 'general') matchFilter = a.priority === 'low' || a.priority === 'medium'
      
      return matchSearch && matchFilter
    })
  }, [announcements, search, filter])

  const handleOpen = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    if (!announcement.isRead) {
      await markAnnouncementAsRead(announcement.id)
      setAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, isRead: true } : a))
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
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Stay updated with the latest company news and important updates.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search announcements..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 bg-background min-h-[44px] sm:min-h-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background min-h-[44px] sm:min-h-10 capitalize"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="important">Important (High)</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAnnouncements.map((announcement) => {
          return (
            <Card 
              key={announcement.id} 
              onClick={() => handleOpen(announcement)}
              className={`flex flex-col overflow-hidden border border-border bg-card rounded-[16px] transition-all hover:shadow-md cursor-pointer relative ${!announcement.isRead ? 'ring-1 ring-primary/50' : ''}`}
            >
              {/* Unread indicator */}
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
                
                <div className="flex flex-col gap-1.5 mt-2">
                  <h3 className="text-[18px] sm:text-[20px] font-semibold text-foreground line-clamp-2 leading-tight pr-12">
                    {announcement.title}
                  </h3>
                  <p className="text-[14px] text-muted-foreground line-clamp-4 leading-relaxed mt-1">
                    {announcement.message}
                  </p>
                </div>
              </div>

              <div className="mt-auto px-5 py-3 border-t border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {announcement.created_by_profile?.first_name?.[0]}{announcement.created_by_profile?.last_name?.[0]}
                  </div>
                  {announcement.created_by_profile?.first_name} {announcement.created_by_profile?.last_name}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {dayjs(announcement.published_at || announcement.created_at).format('DD MMM YYYY')}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-16 border rounded-xl border-dashed bg-muted/10 text-muted-foreground">
          <Megaphone className="mx-auto h-10 w-10 mb-4 opacity-30" />
          <p className="text-base font-medium text-foreground">No announcements available</p>
          <p className="text-sm mt-1">
            {search || filter !== 'all' ? 'No announcements match your filters.' : 'Check back later for important updates.'}
          </p>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(selectedAnnouncement.priority)}`}>
                      {selectedAnnouncement.priority}
                    </Badge>
                  </div>
                  <span className="leading-tight">{selectedAnnouncement.title}</span>
                </DialogTitle>
                <div className="text-sm text-muted-foreground font-medium pt-1">
                  By {selectedAnnouncement.created_by_profile?.first_name} {selectedAnnouncement.created_by_profile?.last_name} • {dayjs(selectedAnnouncement.published_at || selectedAnnouncement.created_at).format('MMMM D, YYYY h:mm A')}
                </div>
              </DialogHeader>
              <div className="py-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {selectedAnnouncement.message}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
