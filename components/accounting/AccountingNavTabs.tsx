'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Settings,
  Repeat,
  FileCheck,
  Receipt,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/accounting/dashboard', icon: LayoutDashboard },
  { label: 'Income', href: '/accounting/income', icon: ArrowDownLeft },
  { label: 'Recurring Income', href: '/accounting/retainers', icon: FileCheck },
  { label: 'Expenses', href: '/accounting/expenses', icon: ArrowUpRight },
  { label: 'Recurring Expenses', href: '/accounting/recurring-expenses', icon: Repeat },
  { label: 'Receivables', href: '/accounting/receivables', icon: Receipt },
  { label: 'Reports', href: '/accounting/reports', icon: BarChart3 },
  { label: 'Bank Accounts', href: '/accounting/bank-accounts', icon: Building2 },
  { label: 'Company Settings', href: '/accounting/company-settings', icon: Settings },
]

export function AccountingNavTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 border-b border-border scrollbar-none">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== '/accounting/dashboard' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
