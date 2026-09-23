'use client'

import Link from 'next/link'
import {
  Users,
  LayoutDashboard,
  Settings,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const [isHROpen, setIsHROpen] = useState(true)

  return (
    <div className="w-60 border-r border-border bg-background flex flex-col h-full text-muted-foreground shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-foreground">
          {/* Mock Logo */}
          <div className="h-8 w-8 bg-foreground rounded-lg flex items-center justify-center">
            <span className="text-background font-black text-xl leading-none">X</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">TripleS ERP</h2>
        </div>
      </div>

      <div className="flex-1 py-6 overflow-y-auto">
        <nav className="space-y-1 px-4">
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

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Modules
            </p>
          </div>

          {/* HR Department */}
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-colors",
                isHROpen ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => setIsHROpen(!isHROpen)}
            >
              <Users className="mr-3 h-5 w-5" />
              <span className="flex-1">HR Department</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isHROpen ? "" : "-rotate-90")} />
            </div>

            {isHROpen && (
              <div className="pt-1 pb-2 space-y-1">
                <Link
                  href="/hr/onboarding"
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    pathname.startsWith('/hr/onboarding')
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="w-5 flex justify-center mr-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full", pathname.startsWith('/hr/onboarding') ? "bg-background" : "bg-muted-foreground/50")} />
                  </div>
                  Employee Onboarding
                </Link>
              </div>
            )}
          </div>
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
