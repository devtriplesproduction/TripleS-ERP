'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Shield,
  Calendar
} from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'
import { type AppRole, hasRouteAccess } from '@/config/rbac'

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
      { label: 'Leave', href: '/hr/leave' },
      { label: 'EOD Reports', href: '/eod', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
      { label: 'HR Holiday', href: '/hr/holidays', icon: <Calendar className="mr-3 h-5 w-5" /> },
      { label: 'HR Payroll', href: '/hr/payroll' },
    ],
  },
  { label: 'Employee Leave', href: '/hr/employee-leave', icon: <Calendar className="mr-3 h-5 w-5" /> },
  { label: 'Employee EOD', href: '/employee-eod', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
  { label: 'Employee Holiday', href: '/employee-holiday', icon: <Calendar className="mr-3 h-5 w-5" /> },
  { label: 'Admin EOD', href: '/admin-eod', icon: <ClipboardList className="mr-3 h-5 w-5" /> },
  { label: 'Admin Holiday', href: '/admin-holiday', icon: <Calendar className="mr-3 h-5 w-5" /> },
  { label: 'Admin Payroll', href: '/admin-payroll' },
  { label: 'Super Admin Leave', href: '/super-admin/leave', icon: <Shield className="mr-3 h-5 w-5" /> },
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
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

  return (
    <div className="w-60 border-r border-border bg-background flex flex-col h-full text-muted-foreground shrink-0">
      <div className="h-16 flex items-center px-2 border-b border-border shrink-0">
        <div className="flex items-center text-foreground">
          {/* Company Logo */}
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg shrink-0 -ml-2">
            {/* Make sure to place your logo image in the 'public' folder and update the src if necessary */}
            <Image src="/logo.png" alt="Company Logo" fill sizes="72px" className="object-contain" />
          </div>
          <h2 className="text-xl font-bold tracking-tight truncate -ml-3">TripleS ERP</h2>
        </div>
      </div>

      <div className="flex-1 py-6 overflow-y-auto">
        <nav className="space-y-1 px-2">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
              pathname === '/dashboard'
                ? "bg-foreground text-background"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Dashboard
          </Link>

          {visibleItems.length > 0 && (
            <div className="pt-6 pb-2">
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
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-colors",
                      openModule === item.moduleKey ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => toggleModule(item.moduleKey!)}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openModule === item.moduleKey ? "" : "-rotate-90")} />
                  </div>

                  {openModule === item.moduleKey && (
                    <div className="pt-1 pb-2 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href as any}
                          className={cn(
                            "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
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
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors mt-2",
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

      <div className="p-4 border-t border-border shrink-0">
        <Link
          href="/settings"
          className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  )
}
