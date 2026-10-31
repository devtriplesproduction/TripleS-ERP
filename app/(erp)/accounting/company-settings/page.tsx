import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { AccountingNavTabs } from '@/components/accounting/AccountingNavTabs'
import { CompanySettingsView } from '@/components/accounting/CompanySettingsView'
import { Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Company Settings | TripleS ERP',
  description: "Manage your company's registered details and contact information.",
}

export default async function CompanySettingsPage() {
  await requireRole('/accounting')

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Company Settings"
        subtitle="Manage your company's registered details and contact information."
        icon={Settings}
      />

      <AccountingNavTabs />

      <CompanySettingsView />
    </div>
  )
}
