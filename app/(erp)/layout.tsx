import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ReactNode } from 'react'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasRouteAccess } from '@/config/rbac'

export default async function ERPLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
