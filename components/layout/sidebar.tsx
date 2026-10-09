'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Calendar,
  Book,
  X,
  ClipboardList,
  Megaphone,
  FolderKanban,
  CreditCard,
  Briefcase,
  CheckSquare,
} from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type AppRole, hasRouteAccess, canAccessProjectManagement } from '@/config/rbac'
import { useSidebar } from './sidebar-context'

interface SidebarProps {
  userRole: AppRole
  isHod?: boolean
  hasProjectAccess?: boolean
  hasTasks?: boolean
}

/**
 * Sidebar nav item configuration.
 * Each item has a route and optionally children for expandable groups.
 */
interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  /** If true, this is a group header with children */
  children?: NavItem[]
  /** The key for expandable modules */
  moduleKey?: string
}

/**
 * Standardized navigation items generator based on role.
 * Enforces the exact 6-module sequence without role prefixes:
 * 1. Employees
 * 2. EOD Reports
 * 3. Request Leave / WFH
 * 4. Attendance
 * 5. Holiday
 * 6. Payroll
 * Followed by other modules (Project Management, Rulebook, Announcements) per RBAC.
 */
function getRoleNavItems(userRole: AppRole, isHod?: boolean, hasProjectAccess?: boolean, hasTasks?: boolean): NavItem[] {
  const employeesHref = '/hr/onboarding'
  const eodHref = userRole === 'Admin' ? '/admin-eod' : userRole === 'Employee' || userRole === 'Manager' ? '/employee-eod' : '/eod'
  const leaveHref = userRole === 'Admin' ? '/super-admin/leave' : userRole === 'Employee' || userRole === 'Manager' ? '/hr/employee-leave' : '/hr/leave'
  const attendanceHref = userRole === 'Admin' ? '/super-admin/attendance' : userRole === 'Employee' || userRole === 'Manager' ? '/attendance' : '/hr/attendance'
  const holidayHref = userRole === 'Admin' ? '/admin-holiday' : userRole === 'Employee' || userRole === 'Manager' ? '/employee-holiday' : '/hr/holidays'
  const payrollHref = userRole === 'Admin' ? '/admin-payroll' : '/hr/payroll'
  
  const allItems: NavItem[] = []

  if (userRole === 'Employee' || userRole === 'Manager') {
    if (hasTasks) {
      allItems.push({ label: 'My Tasks', href: '/my-tasks', icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    }
    if (hasTasks) {
      allItems.push({ label: 'Projects', href: '/projects', icon: <FolderKanban className="mr-3 h-5 w-5 shrink-0" /> })
    }
    if (isHod) {
      allItems.push({ label: 'Tasks & Kanban', href: '/tasks', icon: <CheckSquare className="mr-3 h-5 w-5 shrink-0" /> })
      allItems.push({ label: 'Clients', href: '/clients', icon: <Briefcase className="mr-3 h-5 w-5 shrink-0" /> })
    }
    allItems.push({ label: 'EOD Reports', href: eodHref, icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Request Leave / WFH', href: leaveHref, icon: <Calendar className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Attendance', href: attendanceHref, icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Holiday', href: holidayHref, icon: <Calendar className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Rulebook', href: '/rulebook', icon: <Book className="mr-3 h-5 w-5 shrink-0" /> })
  } else if (userRole === 'HR') {
    allItems.push({ label: 'Employees', href: employeesHref, icon: <Users className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Projects', href: '/projects', icon: <FolderKanban className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'My Tasks', href: '/my-tasks', icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Payroll', href: payrollHref, icon: <CreditCard className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Review EOD', href: eodHref, icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Review Leave / WFH', href: leaveHref, icon: <Calendar className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Attendance', href: attendanceHref, icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Holiday', href: holidayHref, icon: <Calendar className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Announcements', href: '/announcements', icon: <Megaphone className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Rulebook', href: '/rulebook', icon: <Book className="mr-3 h-5 w-5 shrink-0" /> })
  } else if (userRole === 'Admin') {
    allItems.push({ label: 'Employees', href: employeesHref, icon: <Users className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Projects', href: '/projects', icon: <FolderKanban className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Tasks & Kanban', href: '/tasks', icon: <CheckSquare className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Clients', href: '/clients', icon: <Briefcase className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Payroll', href: payrollHref, icon: <CreditCard className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Review EOD', href: eodHref, icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Review Leave / WFH', href: leaveHref, icon: <Calendar className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Attendance', href: attendanceHref, icon: <ClipboardList className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Holiday', href: holidayHref, icon: <Calendar className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Announcements', href: '/announcements', icon: <Megaphone className="mr-3 h-5 w-5 shrink-0" /> })
    allItems.push({ label: 'Rulebook', href: '/rulebook', icon: <Book className="mr-3 h-5 w-5 shrink-0" /> })
  }

  return allItems.filter(item => hasRouteAccess(userRole, item.href, isHod))
}

export function Sidebar({ userRole, isHod, hasProjectAccess, hasTasks }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, closeSidebar } = useSidebar()
  const [openModule, setOpenModule] = useState<string | null>(() => {
    if (
      pathname.startsWith('/projects') ||
      pathname.startsWith('/tasks') ||
      pathname.startsWith('/my-tasks') ||
      pathname.startsWith('/clients')
    ) {
      return 'pm'
    }
    return null
  })

  const toggleModule = (moduleName: string) => {
    setOpenModule(openModule === moduleName ? null : moduleName)
  }

  const visibleItems = getRoleNavItems(userRole, isHod, hasProjectAccess, hasTasks)

  const isItemActive = (href: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderDotIcon = (isActive: boolean) => (
    <div className="w-5 flex justify-center mr-3">
      <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-background" : "bg-muted-foreground/50")} />
    </div>
  )

  const renderNavContent = () => (
    <>
      <div className="flex-1 py-4 sm:py-6 overflow-y-auto">
        <nav className="space-y-1 px-2">
          <Link
            href="/dashboard"
            onClick={closeSidebar}
            className={cn(
              "flex items-center px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
              pathname === '/dashboard'
                ? "bg-foreground text-background"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="mr-3 h-5 w-5 shrink-0" />
            Dashboard
          </Link>



          {visibleItems.map((item) => {
            // Group/expandable module (e.g., Project Management)
            if (item.children && item.moduleKey) {
              return (
                <div key={item.moduleKey} className="space-y-1">
                  <div
                    className={cn(
                      "flex items-center px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg cursor-pointer transition-colors",
                      openModule === item.moduleKey ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => toggleModule(item.moduleKey!)}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openModule === item.moduleKey ? "" : "-rotate-90")} />
                  </div>

                  {openModule === item.moduleKey && (
                    <div className="pt-1 pb-2 space-y-1 pl-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href as any}
                          onClick={closeSidebar}
                          className={cn(
                            "flex items-center px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
                            isItemActive(child.href)
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {child.icon || renderDotIcon(isItemActive(child.href))}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            // Standalone module
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href as any}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors mt-1",
                  isItemActive(item.href)
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon || renderDotIcon(isItemActive(item.href))}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-3 sm:p-4 border-t border-border shrink-0">
        <Link
          href="/settings"
          onClick={closeSidebar}
          className="flex items-center px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="mr-3 h-5 w-5 shrink-0" />
          Settings
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex w-60 border-r border-border bg-background flex-col h-full text-muted-foreground shrink-0 select-none">
        <div className="h-16 flex items-center px-3 border-b border-border shrink-0">
          <div className="flex items-center text-foreground">
            <div className="relative h-12 w-12 overflow-hidden rounded-lg shrink-0">
              <Image src="/logo.png" alt="Company Logo" fill sizes="48px" className="object-contain" priority />
            </div>
            <h2 className="text-xl font-bold tracking-tight truncate ml-2">TripleS ERP</h2>
          </div>
        </div>

        {renderNavContent()}
      </aside>

      {/* Mobile & Tablet Drawer (< 1024px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={closeSidebar}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-background border-r border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-300">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
              <div className="flex items-center text-foreground">
                <div className="relative h-10 w-10 overflow-hidden rounded-lg shrink-0">
                  <Image src="/logo.png" alt="Company Logo" fill sizes="40px" className="object-contain" priority />
                </div>
                <h2 className="text-lg font-bold tracking-tight truncate ml-2">TripleS ERP</h2>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  )
}
