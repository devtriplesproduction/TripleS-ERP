'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Shield,
  Calendar,
  Book,
  X,
  ClipboardList,
  Megaphone,
  FolderKanban,
  Kanban,
  CheckSquare,
  Building2
} from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type AppRole, hasRouteAccess } from '@/config/rbac'
import { useSidebar } from './sidebar-context'

interface SidebarProps {
  userRole: AppRole
}

/**
 * Sidebar nav items configuration.
 * Each item has a route and optionally children.
 * The sidebar only renders items the user's role can access.
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

const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: 'HR Department',
    href: '',
    moduleKey: 'hr',
    icon: <Users className="mr-3 h-5 w-5" />,
    children: [
      { label: 'Employee Onboarding', href: '/hr/onboarding' },
      { label: 'Attendance', href: '/hr/attendance' },
      { label: 'Leave', href: '/hr/leave' },
      { label: 'EOD Reports', href: '/eod', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
      { label: 'HR Holiday', href: '/hr/holidays', icon: <Calendar className="mr-3 h-5 w-5" /> },
      { label: 'HR Payroll', href: '/hr/payroll' },
    ],
  },
  {
    label: 'Project Management',
    href: '',
    moduleKey: 'pm',
    icon: <FolderKanban className="mr-3 h-5 w-5" />,
    children: [
      { label: 'Projects', href: '/projects' },
      { label: 'Tasks & Kanban', href: '/tasks' },
      { label: 'My Tasks', href: '/my-tasks' },
      { label: 'Clients', href: '/clients' },
    ],
  },
  { label: 'Attendance', href: '/attendance', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
  { label: 'Request Leave / WFH', href: '/hr/employee-leave', icon: <Calendar className="mr-3 h-5 w-5" /> },
  { label: 'Employee EOD', href: '/employee-eod', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
  { label: 'Employee Holiday', href: '/employee-holiday', icon: <Calendar className="mr-3 h-5 w-5" /> },
  { label: 'Admin Attendance', href: '/super-admin/attendance', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
  { label: 'Admin EOD', href: '/admin-eod', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
  { label: 'Admin Holiday', href: '/admin-holiday', icon: <Calendar className="mr-3 h-5 w-5" /> },
  { label: 'Admin Payroll', href: '/admin-payroll' },
  { label: 'Super Admin Leave', href: '/super-admin/leave', icon: <Shield className="mr-3 h-5 w-5" /> },
  { label: 'Rulebook', href: '/rulebook', icon: <Book className="mr-3 h-5 w-5" /> },
  { label: 'Announcements', href: '/announcements', icon: <Megaphone className="mr-3 h-5 w-5" /> },
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, closeSidebar } = useSidebar()
  const [openModule, setOpenModule] = useState<string | null>(null)

  const toggleModule = (moduleName: string) => {
    setOpenModule(openModule === moduleName ? null : moduleName)
  }

  /**
   * Filter nav items based on user role.
   * For group items, filter children and only show the group if it has visible children.
   */
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.reduce<NavItem[]>((acc, item) => {
      if (item.children) {
        // Filter children by role access
        const visibleChildren = item.children.filter(child =>
          hasRouteAccess(userRole, child.href)
        )
        if (visibleChildren.length > 0) {
          acc.push({ ...item, children: visibleChildren })
        }
      } else {
        // Standalone item
        if (hasRouteAccess(userRole, item.href)) {
          acc.push(item)
        }
      }
      return acc
    }, [])
  }

  const visibleItems = filterItems(ALL_NAV_ITEMS)

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

          {visibleItems.length > 0 && (
            <div className="pt-5 pb-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Modules
              </p>
            </div>
          )}

          {visibleItems.map((item) => {
            // Group/expandable module
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
                            pathname.startsWith(child.href)
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {child.icon || renderDotIcon(pathname.startsWith(child.href))}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            // Standalone item
            return (
              <Link
                key={item.href}
                href={item.href as any}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors mt-1",
                  pathname.startsWith(item.href)
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon || renderDotIcon(pathname.startsWith(item.href))}
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
