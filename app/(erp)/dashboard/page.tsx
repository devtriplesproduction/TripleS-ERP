import { getDashboardAnnouncements } from '@/lib/actions/announcements'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pin, AlertCircle, Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DashboardAnnouncementReader } from '@/components/announcements/DashboardAnnouncementReader'

export default async function DashboardPage() {
  const { announcements, unreadCount } = await getDashboardAnnouncements()

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to TripleS ERP. Here is your overview.</p>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Announcements</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map(announcement => (
              <DashboardAnnouncementReader key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

