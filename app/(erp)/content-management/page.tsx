import { requireRole } from '@/lib/auth'
import {
  getContentItems,
  getContentTypes,
  getContentCategories,
  getContentTags,
  getContentActivities,
  getContentNotifications,
  getContentAttachments,
  getContentEmployees,
} from '@/lib/actions/content-management'
import { getProjects } from '@/lib/actions/projects'
import { getAssignableEmployees } from '@/lib/actions/team'
import { ContentManagementView } from '@/components/content-management/ContentManagementView'

export const metadata = {
  title: 'Content Management | TripleS ERP',
  description: 'Manage, review, publish, and organize technical documentation, guides, and departmental content assets.',
}

export default async function ContentManagementPage() {
  const user = await requireRole('/content-management')

  const [
    itemsRes,
    typesRes,
    categoriesRes,
    tagsRes,
    activitiesRes,
    notifsRes,
    attachmentsRes,
    projectsRes,
    employeesRes,
  ] = await Promise.all([
    getContentItems(),
    getContentTypes(),
    getContentCategories(),
    getContentTags(),
    getContentActivities(),
    getContentNotifications(user.id),
    getContentAttachments(),
    getProjects(),
    getContentEmployees(),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ContentManagementView
        initialItems={itemsRes.data || []}
        initialTypes={typesRes.data || []}
        initialCategories={categoriesRes.data || []}
        initialTags={tagsRes.data || []}
        initialActivities={activitiesRes.data || []}
        initialNotifications={notifsRes.data || []}
        initialAttachments={attachmentsRes.data || []}
        projects={projectsRes.data || []}
        employees={employeesRes.data || []}
        user={user}
      />
    </div>
  )
}
