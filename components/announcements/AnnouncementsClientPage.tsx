'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Search, Loader2, Megaphone } from 'lucide-react'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { broadcastNotificationUpdate } from '@/lib/notifications-client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Dropdown } from '@/components/ui/Dropdown'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/PageHeader'

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent'
export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export interface Announcement {
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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked 
          ? 'bg-emerald-500 border-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:border-emerald-600 dark:hover:bg-emerald-500' 
          : 'bg-neutral-200 border-neutral-300 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700'
      }`}
    >
      <span 
        className={`pointer-events-none flex items-center justify-center h-4 w-4 rounded-full bg-white shadow-sm border border-black/10 dark:border-transparent ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin text-neutral-800" />}
      </span>
    </button>
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

  // Filtered List: Active first, Inactive announcements at the bottom
  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter(a => {
        const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.message.toLowerCase().includes(search.toLowerCase())
        const matchPriority = priorityFilter === 'all' || a.priority === priorityFilter
        const matchStatus = statusFilter === 'all' 
          ? true 
          : statusFilter === 'active' 
            ? a.status === 'published' 
            : a.status !== 'published'
        return matchSearch && matchPriority && matchStatus
      })
      .sort((a, b) => {
        const aActive = a.status === 'published' ? 1 : 0
        const bActive = b.status === 'published' ? 1 : 0

        // Inactive announcements shown at bottom
        if (aActive !== bActive) {
          return bActive - aActive
        }

        // Pinned announcements first
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1
        }

        // Most recent first
        const aDate = new Date(a.published_at || a.created_at).getTime()
        const bDate = new Date(b.published_at || b.created_at).getTime()
        return bDate - aDate
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
        setAnnouncements(prev => prev.map(a => a.id === editingId ? { ...a, ...dataToSubmit } : a))
        toast.success('Announcement updated successfully')
        broadcastNotificationUpdate()
      } else {
        await createAnnouncement(dataToSubmit)
        broadcastNotificationUpdate()
        // Refresh page or let the server action revalidate handled by next
        window.location.reload()
      }
      setIsOpen(false)
      resetForm()
    } catch {
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
      broadcastNotificationUpdate()
      setDeleteDialogOpen(false)
      setAnnouncementToDelete(null)
    } catch {
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
      broadcastNotificationUpdate()
    } catch {
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
            <Button onClick={() => { resetForm(); setIsOpen(true) }} className="h-9 sm:h-10 rounded-xl gap-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold bg-black text-white hover:bg-black hover:text-white border border-black dark:bg-white dark:text-black dark:hover:bg-white dark:hover:text-black dark:border-white cursor-pointer shadow-xs">
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          }
        />

        {/* Search, Filters & Stats all in One Single Line with No Gap */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full">
          <div className="relative w-64 sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search announcements..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 bg-background h-10 text-xs sm:text-sm w-full rounded-lg border border-border"
            />
          </div>
          <Dropdown
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v)}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            className="w-[125px] shrink-0"
            buttonClassName="bg-background capitalize h-10 text-xs sm:text-sm rounded-lg border border-border"
          />
          <Dropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="w-[125px] shrink-0"
            buttonClassName="bg-background capitalize h-10 text-xs sm:text-sm rounded-lg border border-border"
          />

          {/* Same Sized Stat Boxes (Total, Active, Inactive, Urgent) right next to filters with no large gap */}
          <div className="w-[100px] min-w-[100px] max-w-[100px] h-10 flex items-center justify-between px-2.5 rounded-lg border border-border bg-card text-xs shrink-0 shadow-2xs">
            <span className="text-muted-foreground font-medium">Total</span>
            <span className="font-bold text-foreground">{stats.total}</span>
          </div>
          <div className="w-[100px] min-w-[100px] max-w-[100px] h-10 flex items-center justify-between px-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-xs shrink-0 shadow-2xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Active</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{stats.active}</span>
          </div>
          <div className="w-[100px] min-w-[100px] max-w-[100px] h-10 flex items-center justify-between px-2.5 rounded-lg border border-border bg-card text-xs shrink-0 shadow-2xs">
            <span className="text-muted-foreground font-medium">Inactive</span>
            <span className="font-bold text-foreground">{stats.inactive}</span>
          </div>
          <div className="w-[100px] min-w-[100px] max-w-[100px] h-10 flex items-center justify-between px-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-xs shrink-0 shadow-2xs">
            <span className="text-red-700 dark:text-red-400 font-medium">Urgent</span>
            <span className="font-bold text-red-700 dark:text-red-400">{stats.urgent}</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAnnouncements.map((announcement) => {
          const isActive = announcement.status === 'published'
          return (
            <Card key={announcement.id} className="flex flex-col overflow-hidden border border-border bg-card rounded-xl transition-all hover:border-border/80 hover:shadow-xs">
              <div className="p-4 flex flex-col gap-2.5 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(announcement.priority)}`}>
                      {announcement.priority}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {announcement.target_audience === 'department' && announcement.target_department && (
                      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-md border bg-primary/5 text-primary border-primary/20">
                        {announcement.target_department}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CustomToggle 
                      checked={isActive} 
                      onChange={() => toggleStatus(announcement)} 
                      loading={togglingId === announcement.id} 
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive/80 hover:text-destructive cursor-pointer" onClick={() => triggerDelete(announcement.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div 
                  className="flex flex-col gap-1 cursor-pointer group"
                  onClick={() => handleOpenEdit(announcement)}
                >
                  <h3 className="text-base font-semibold text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors">
                    {announcement.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {announcement.message}
                  </p>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between bg-muted/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold uppercase">
                    {(announcement.created_by_profile?.first_name?.[0] || 'A').toUpperCase()}
                  </div>
                  <span className="capitalize text-xs">
                    {announcement.created_by_profile?.first_name || 'Admin'} {announcement.created_by_profile?.last_name || ''}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">
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

      <ConfirmModal
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingId) {
            setDeleteDialogOpen(open)
            if (!open) setAnnouncementToDelete(null)
          }
        }}
        title="Delete announcement?"
        description="This announcement will be permanently removed."
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />

      {/* Create / Edit Modal */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (isSubmitting) return
          setIsOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[540px] w-[calc(100vw-2rem)] p-5 sm:p-6 gap-0 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden font-sans">
          <DialogHeader className="p-0 pb-4 pr-8 border-b border-border/60 bg-transparent flex flex-col gap-1">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {editingId ? 'Edit Announcement' : 'Create Announcement'}
                </DialogTitle>
                <DialogDescription className="sr-only">Announcement details</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="pt-4 space-y-3.5 font-sans">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="announcement-title" className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>Title <span className="text-destructive">*</span></span>
              </Label>
              <Input
                id="announcement-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Office closed on Diwali, Town Hall meeting..."
                className="h-10 text-sm bg-background rounded-lg border border-border text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-foreground transition-all"
                required
                autoFocus
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="announcement-message" className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>Message <span className="text-destructive">*</span></span>
              </Label>
              <Textarea
                id="announcement-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write the full announcement details here..."
                rows={3}
                className="text-sm bg-background min-h-[85px] max-h-[140px] rounded-lg border border-border text-foreground placeholder:text-muted-foreground/70 resize-none leading-relaxed focus-visible:ring-1 focus-visible:ring-foreground transition-all"
                required
              />
            </div>

            {/* Target Audience, Priority & Status - Compact & Proportional to eliminate negative space */}
            {formData.target_audience === 'department' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Dropdown
                    id="announcement-target-audience"
                    label="Target Audience"
                    labelClassName="text-sm font-medium text-foreground"
                    value={formData.target_audience}
                    onChange={(val) => setFormData({ ...formData, target_audience: val })}
                    options={[
                      { value: 'all', label: 'Company Wide' },
                      { value: 'department', label: 'Specific Department' },
                    ]}
                    buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                  />
                  <Dropdown
                    id="announcement-department"
                    label="Department"
                    labelClassName="text-sm font-medium text-foreground"
                    placeholder="Select department"
                    value={formData.target_department}
                    onChange={(val) => setFormData({ ...formData, target_department: val })}
                    options={departments.map((d) => ({ value: d, label: d }))}
                    buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Dropdown
                    id="announcement-priority"
                    label="Priority"
                    labelClassName="text-sm font-medium text-foreground"
                    value={formData.priority}
                    onChange={(val) => setFormData({ ...formData, priority: val as AnnouncementPriority })}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                    ]}
                    buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                  />
                  <Dropdown
                    id="announcement-status"
                    label="Status"
                    labelClassName="text-sm font-medium text-foreground"
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val as AnnouncementStatus })}
                    options={[
                      { value: 'draft', label: 'Draft (Inactive)' },
                      { value: 'published', label: 'Published (Active)' },
                      { value: 'archived', label: 'Archived (Inactive)' },
                    ]}
                    buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Dropdown
                  id="announcement-target-audience"
                  label="Target Audience"
                  labelClassName="text-sm font-medium text-foreground"
                  value={formData.target_audience}
                  onChange={(val) => setFormData({ ...formData, target_audience: val })}
                  options={[
                    { value: 'all', label: 'Company Wide' },
                    { value: 'department', label: 'Specific Department' },
                  ]}
                  buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                />
                <Dropdown
                  id="announcement-priority"
                  label="Priority"
                  labelClassName="text-sm font-medium text-foreground"
                  value={formData.priority}
                  onChange={(val) => setFormData({ ...formData, priority: val as AnnouncementPriority })}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                  buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                />
                <Dropdown
                  id="announcement-status"
                  label="Status"
                  labelClassName="text-sm font-medium text-foreground"
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val as AnnouncementStatus })}
                  options={[
                    { value: 'draft', label: 'Draft (Inactive)' },
                    { value: 'published', label: 'Published (Active)' },
                    { value: 'archived', label: 'Archived (Inactive)' },
                  ]}
                  buttonClassName="h-10 text-sm bg-background rounded-lg border border-border"
                />
              </div>
            )}

            {/* Right-aligned Modal Footer with Solid Black Action Button */}
            <DialogFooter className="pt-4 border-t border-border/60 flex flex-row items-center justify-center sm:justify-center gap-3 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 bg-muted/15 rounded-b-2xl mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="text-sm h-10 px-5 rounded-lg cursor-pointer border-border hover:bg-muted font-medium transition-all min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-sm h-10 px-6 font-semibold rounded-lg bg-black text-white hover:bg-black hover:text-white border border-black shadow-xs cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-white dark:hover:text-black dark:border-white min-w-[170px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>{editingId ? 'Updating…' : 'Creating…'}</span>
                  </>
                ) : (
                  <span>{editingId ? 'Save Changes' : 'Create Announcement'}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
