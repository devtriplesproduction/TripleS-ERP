'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Pin, Globe, Building2, Megaphone } from 'lucide-react'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface Announcement {
  id: string
  title: string
  message: string
  target_audience: string
  target_department: string | null
  priority: 'low' | 'medium' | 'high'
  pinned: boolean
  status: 'draft' | 'published' | 'archived'
  created_at: string
  published_at: string | null
  created_by_profile?: {
    first_name: string
    last_name: string
  }
}

export function AnnouncementsClientPage({ announcements, departments }: { announcements: Announcement[], departments: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_audience: 'all',
    target_department: '',
    priority: 'low' as 'low' | 'medium' | 'high',
    pinned: false,
    status: 'draft' as 'draft' | 'published' | 'archived',
  })

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

    try {
      const dataToSubmit = {
        ...formData,
        target_department: formData.target_audience === 'department' ? formData.target_department : null,
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      }

      if (editingId) {
        await updateAnnouncement(editingId, dataToSubmit)
        toast.success('Announcement updated')
      } else {
        await createAnnouncement(dataToSubmit)
        toast.success('Announcement created')
      }
      setIsOpen(false)
      resetForm()
    } catch (err: any) {
      toast.error(err.message || 'Error saving announcement')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(id)
        toast.success('Announcement deleted')
      } catch (err: any) {
        toast.error(err.message || 'Error deleting')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <p className="text-muted-foreground">Manage company announcements</p>
        </div>
        <Button onClick={() => { resetForm(); setIsOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> New Announcement
        </Button>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="sm:max-w-[650px] w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Megaphone className="h-5 w-5 text-indigo-500" />
                {editingId ? 'Edit' : 'Create'} Announcement
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Announcement title..." />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.message} 
                  onChange={(e) => setFormData({...formData, message: e.target.value})} 
                  placeholder="Type your message here..." 
                />
              </div>
              <div className={`grid gap-6 ${formData.target_audience === 'department' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={formData.target_audience as string} onValueChange={(v: any) => setFormData({...formData, target_audience: v})}>
                    <SelectTrigger className="w-full capitalize"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select dept" /></SelectTrigger>
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
                    <SelectTrigger className="w-full capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status as string} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="w-full capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="pinned" checked={formData.pinned} onCheckedChange={(c) => setFormData({...formData, pinned: c as boolean})} />
                <Label htmlFor="pinned" className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Pin announcement (Appears at top)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className={announcement.pinned ? 'border-primary/50 bg-primary/5 shadow-sm' : ''}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {announcement.pinned && <Pin className="h-4 w-4 text-primary" />}
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {announcement.target_audience === 'all' ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    {announcement.target_audience === 'all' ? 'Company Wide' : announcement.target_department}
                  </span>
                  <span>•</span>
                  <span>{dayjs(announcement.created_at).format('MMM D, YYYY')}</span>
                  <span>•</span>
                  <span>By {announcement.created_by_profile?.first_name} {announcement.created_by_profile?.last_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={announcement.status === 'published' ? 'default' : 'secondary'}>
                  {announcement.status}
                </Badge>
                <Badge variant={announcement.priority === 'high' ? 'destructive' : announcement.priority === 'medium' ? 'default' : 'outline'}>
                  {announcement.priority}
                </Badge>
                <div className="ml-2 flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(announcement)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{announcement.message}</p>
            </CardContent>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-10 border rounded-lg border-dashed text-muted-foreground">
            <Megaphone className="mx-auto h-8 w-8 mb-3 opacity-50" />
            <p>No announcements found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
