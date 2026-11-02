import { requireRole } from '@/lib/auth'
import { getDashboardAnnouncements } from '@/lib/actions/announcements'
import { getMyTasks } from '@/lib/actions/tasks'
import { getMyProjects } from '@/lib/actions/projects'
import { getTopContributorData } from '@/lib/actions/top-contributor'
import { getAccountingDashboardData } from '@/lib/actions/accounting'
import { getClients } from '@/lib/actions/clients'
import { UnifiedDashboardView } from '@/components/dashboard/UnifiedDashboardView'

export default async function DashboardPage() {
  const user = await requireRole('/dashboard')
  const isAdmin = user.role === 'Admin'

  const [
    announcementsRes,
    myTasksRes,
    myProjectsRes,
    topContributorRes,
    accountingRes,
    clientsRes,
  ] = await Promise.all([
    getDashboardAnnouncements(),
    getMyTasks(),
    getMyProjects(),
    isAdmin ? getTopContributorData() : Promise.resolve(null),
    getAccountingDashboardData().catch(() => ({ success: false, data: undefined })),
    getClients().catch(() => ({ success: false, data: [] })),
  ])

  const { announcements } = announcementsRes
  const taskData = myTasksRes.data
  const myProjects = myProjectsRes.data || []
  const topContributorData = topContributorRes?.data

  const accountingData = accountingRes?.data || {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    bankAccountBalance: 0,
    activeBankAccountsCount: 0,
    pendingIncomeCount: 0,
    pendingExpensesCount: 0,
    recentTransactions: [],
    monthlyBreakdown: [],
    topExpenseCategories: [],
    topIncomeCategories: [],
    bankAccounts: [],
  }

  const existingClients = (clientsRes?.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
  }))

  return (
    <UnifiedDashboardView
      user={user}
      announcements={announcements}
      myProjects={myProjects}
      taskData={taskData}
      topContributorData={topContributorData}
      accountingData={accountingData}
      existingClients={existingClients}
    />
  )
}
