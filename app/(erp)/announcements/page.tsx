import { getAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementsClientPage } from '@/components/announcements/AnnouncementsClientPage'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DEPARTMENTS } from '@/config/roles'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: userAuth } = await supabase.auth.getUser()
  
  if (!userAuth.user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userAuth.user.id).single()
  
  const roleUpper = profile?.role?.toUpperCase()
  const hasAccess = roleUpper === 'ADMIN' || roleUpper === 'HR' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN'
  if (!hasAccess) {
    redirect('/dashboard')
  }

  const announcements = await getAnnouncements()
  
  // Get departments from config instead of distinct profiles query
  const depts = DEPARTMENTS.map(d => d.name)

  return (
    <div className="p-8">
      <AnnouncementsClientPage announcements={announcements || []} departments={depts} />
    </div>
  )
}
