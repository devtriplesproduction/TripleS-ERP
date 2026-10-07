import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { ReactNode } from 'react'
import { requireAuth } from '@/lib/auth'
import { checkEmployeeProjectAccess } from '@/lib/actions/projects'

export default async function ERPLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth()
  const hasProjectAccess = await checkEmployeeProjectAccess(user.id)

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar userRole={user.role} isHod={user.is_hod} hasProjectAccess={hasProjectAccess} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-5 lg:p-8 min-w-0 w-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
