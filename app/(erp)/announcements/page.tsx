import { getAnnouncements, getDashboardAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementsClientPage } from '@/components/announcements/AnnouncementsClientPage'
import { EmployeeAnnouncementsPage } from '@/components/announcements/EmployeeAnnouncementsPage'
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
  const isAdminOrHR = roleUpper === 'ADMIN' || roleUpper === 'HR' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN'

  // Admin / HR Management View
  if (isAdminOrHR) {
    const announcements = await getAnnouncements()
    const depts = DEPARTMENTS.map(d => d.name)

    return <AnnouncementsClientPage announcements={announcements || []} departments={depts} />
  }

  // Employee View
  const { announcements } = await getDashboardAnnouncements()
  
  return <EmployeeAnnouncementsPage announcements={announcements || []} />
}
