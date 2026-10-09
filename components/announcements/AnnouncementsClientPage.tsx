'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search, Loader2, Megaphone, Check } from 'lucide-react'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/PageHeader'

interface Announcement {
  id: string
  title: string
  message: string
  target_audience: string
  target_department: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  pinned: boolean
  status: 'draft' | 'published' | 'archived'
  created_at: string
  published_at: string | null
  created_by_profile?: {
    first_name: string
    last_name: string
  }
}

// Compact Custom Toggle Component
function CustomToggle({ checked, onChange, disabled, loading }: { checked: boolean, onChange: (c: boolean) => void, disabled?: boolean, loading?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Deactivate announcement" : "Activate announcement"}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked 
          ? 'bg-emerald-500/20 border-emerald-500/30' 
          : 'bg-muted/50 border-border'
      }`}
    >
      <span 
        className={`pointer-events-none flex items-center justify-center h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin text-neutral-800" />}
      </span>
    </button>
  )
}

function DeleteDialog({ isOpen, onClose, onConfirm, isDeleting }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, isDeleting: boolean }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete announcement?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This announcement will be permanently removed.</p>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AnnouncementsClientPage({ announcements: initialAnnouncements, departments }: { announcements: Announcement[], departments: string[] }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  
  // Search & Filter State
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_audience: 'all',
    target_department: '',
    priority: 'low' as 'low' | 'medium' | 'high' | 'urgent',
    pinned: false,
    status: 'draft' as 'draft' | 'published' | 'archived',
  })

  // Stats
  const stats = useMemo(() => {
    return {
      total: announcements.length,
      active: announcements.filter(a => a.status === 'published').length,
      inactive: announcements.filter(a => a.status !== 'published').length,
      urgent: announcements.filter(a => a.priority === 'urgent' && a.status === 'published').length
    }
  }, [announcements])

  // Filtered List
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.message.toLowerCase().includes(search.toLowerCase())
      const matchPriority = priorityFilter === 'all' || a.priority === priorityFilter
      const matchStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' 
          ? a.status === 'published' 
          : a.status !== 'published'
      return matchSearch && matchPriority && matchStatus
    })
  }, [announcements, search, priorityFilter, statusFilter])

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      target_audience: 'all',
      target_department: '',
      priority: 'low',
      pinned: false,
      status: 'draft',
    })
    setEditingId(null)
  }

  const handleOpenEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      message: announcement.message,
      target_audience: announcement.target_audience,
      target_department: announcement.target_department || '',
      priority: announcement.priority,
      pinned: announcement.pinned,
      status: announcement.status,
    })
    setEditingId(announcement.id)
    setIsOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required')
      return
    }
    setIsSubmitting(true)
    try {
      const dataToSubmit = {
        ...formData,
        target_department: formData.target_audience === 'department' ? formData.target_department : null,
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      }

      if (editingId) {
        await updateAnnouncement(editingId, dataToSubmit)
        // Optimistic update locally
        setAnnouncements(prev => prev.map(a => a.id === editingId ? { ...a, ...dataToSubmit } as any : a))
        toast.success('Announcement updated successfully')
      } else {
        await createAnnouncement(dataToSubmit)
        // Refresh page or let the server action revalidate handled by next
        window.location.reload()
      }
      setIsOpen(false)
      resetForm()
    } catch (err: any) {
      toast.error('Unable to save announcement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const triggerDelete = (id: string) => {
    setAnnouncementToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!announcementToDelete) return
    setIsDeletingId(announcementToDelete)
    try {
      await deleteAnnouncement(announcementToDelete)
      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete))
      toast.success('Announcement deleted')
      setDeleteDialogOpen(false)
      setAnnouncementToDelete(null)
    } catch (err: any) {
      toast.error('Unable to delete announcement')
    } finally {
      setIsDeletingId(null)
    }
  }

  const toggleStatus = async (announcement: Announcement) => {
    if (togglingId) return // prevent rapid toggling
    
    const isCurrentlyActive = announcement.status === 'published'
    const newStatus = isCurrentlyActive ? 'archived' : 'published'
    
    setTogglingId(announcement.id)
    try {
      await updateAnnouncement(announcement.id, { 
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : announcement.published_at 
      })
      setAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, status: newStatus } : a))
      toast.success(`Announcement ${newStatus === 'published' ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(`Unable to update announcement`)
    } finally {
      setTogglingId(null)
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
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <PageHeader 
          title="Announcements"
          subtitle="Create and manage important company updates."
          icon={Megaphone}
          actions={
            <Button onClick={() => { resetForm(); setIsOpen(true) }} className="filter-control w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-border bg-card p-4 rounded-xl flex flex-col gap-1">
            <span className="text-sm text-muted-foreground font-medium">Total</span>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <div className="border border-border bg-card p-4 rounded-xl flex flex-col gap-1">
            <span className="text-sm text-emerald-600 font-medium">Active</span>
            <span className="text-2xl font-bold">{stats.active}</span>
          </div>
          <div className="border border-border bg-card p-4 rounded-xl flex flex-col gap-1">
            <span className="text-sm text-muted-foreground font-medium">Inactive</span>
            <span className="text-2xl font-bold">{stats.inactive}</span>
          </div>
          <div className="border border-border bg-card p-4 rounded-xl flex flex-col gap-1">
            <span className="text-sm text-red-600 font-medium">Urgent</span>
            <span className="text-2xl font-bold">{stats.urgent}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search announcements..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 bg-background filter-control"
            />
          </div>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-[140px] bg-background filter-control capitalize"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-[140px] bg-background filter-control capitalize"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAnnouncements.map((announcement) => {
          const isActive = announcement.status === 'published'
          return (
            <Card key={announcement.id} className="flex flex-col overflow-hidden border border-border bg-card rounded-[16px] transition-shadow hover:shadow-sm">
              <div className="px-5 pt-4 pb-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(announcement.priority)}`}>
                      {announcement.priority}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <CustomToggle 
                      checked={isActive} 
                      onChange={() => toggleStatus(announcement)} 
                      loading={togglingId === announcement.id} 
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive/80 hover:text-destructive" onClick={() => triggerDelete(announcement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div 
                  className="flex flex-col gap-1.5 mt-2 cursor-pointer group"
                  onClick={() => handleOpenEdit(announcement)}
                >
                  <h3 className="text-[18px] sm:text-[20px] font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
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
                  {dayjs(announcement.created_at).format('DD MMM YYYY')}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-16 border rounded-xl border-dashed bg-muted/10 text-muted-foreground">
          <Megaphone className="mx-auto h-10 w-10 mb-4 opacity-30" />
          <p className="text-base font-medium text-foreground">No announcements found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new announcement.</p>
        </div>
      )}

      <DeleteDialog 
        isOpen={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)} 
        onConfirm={confirmDelete}
        isDeleting={isDeletingId !== null}
      />

      {/* Create / Edit Modal */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (isSubmitting) return
        setIsOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[650px] w-full">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Create'} Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Announcement title..." className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Message <span className="text-destructive">*</span></Label>
              <textarea 
                className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                value={formData.message} 
                onChange={(e) => setFormData({...formData, message: e.target.value})} 
                placeholder="Type your message here..." 
              />
            </div>
            
            <div className={`grid gap-6 ${formData.target_audience === 'department' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={formData.target_audience as string} onValueChange={(v: any) => setFormData({...formData, target_audience: v})}>
                  <SelectTrigger className="w-full h-11 capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Company Wide</SelectItem>
                    <SelectItem value="department">Specific Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.target_audience === 'department' && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.target_department as string} onValueChange={(v: any) => setFormData({...formData, target_department: v})}>
                    <SelectTrigger className="w-full h-11 capitalize"><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority as string} onValueChange={(v: any) => setFormData({...formData, priority: v})}>
                  <SelectTrigger className="w-full h-11 capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status as string} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="w-full h-11 capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Inactive)</SelectItem>
                    <SelectItem value="published">Published (Active)</SelectItem>
                    <SelectItem value="archived">Archived (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {editingId ? 'Updating...' : 'Creating...'}</>
              ) : (
                editingId ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
