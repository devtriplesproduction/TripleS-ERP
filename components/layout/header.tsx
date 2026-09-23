'use client'

import { Bell, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import React from 'react'

export function Header() {
  const pathname = usePathname()
  
  // Simple breadcrumb generator based on pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = []
    
    if (segments[0] === 'hr') {
      breadcrumbs.push('HR Department')
      if (segments[1] === 'onboarding') {
        breadcrumbs.push('Employee Onboarding')
        if (segments[2] === 'add') {
          breadcrumbs.push('Add Employee')
        }
      }
    } else {
      breadcrumbs.push(segments[0]?.charAt(0).toUpperCase() + segments[0]?.slice(1) || 'Dashboard')
    }
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center flex-1 gap-8">
        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb}>
              <span className={index === breadcrumbs.length - 1 ? "text-foreground" : ""}>
                {crumb}
              </span>
              {index < breadcrumbs.length - 1 && <span>›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search employees, tasks, documents..." 
            className="w-full bg-input/50 border-border pl-10 pr-12 rounded-lg h-9"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
        
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-3 pl-2 border-l border-border">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-muted text-xs font-medium text-foreground">OS</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">Omkar Sawant</span>
            <span className="text-xs text-muted-foreground mt-1">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
