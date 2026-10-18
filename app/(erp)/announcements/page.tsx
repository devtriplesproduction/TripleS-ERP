import { getAnnouncements, getDashboardAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementsClientPage } from '@/components/announcements/AnnouncementsClientPage'
import { EmployeeAnnouncementsPage } from '@/components/announcements/EmployeeAnnouncementsPage'
import { requireRole } from '@/lib/auth'
import { DEPARTMENTS } from '@/config/roles'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Announcements | TripleS ERP',
}

export default async function AnnouncementsPage() {
  const user = await requireRole('/announcements')
  const isAdminOrHR = user.role === 'Admin' || user.role === 'HR'

  // Admin / HR Management View
  if (isAdminOrHR) {
    const announcements = await getAnnouncements()
    const depts = DEPARTMENTS.map((d) => d.name)

    return <AnnouncementsClientPage announcements={announcements || []} departments={depts} />
  }

  // Employee View
  const { announcements } = await getDashboardAnnouncements()

  return <EmployeeAnnouncementsPage announcements={announcements || []} />
}
