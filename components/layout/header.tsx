'use client'

import { Bell, LogOut, Search, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NotificationBell } from '@/components/announcements/NotificationBell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import React from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { logoutAction } from '@/actions/auth.actions'
import { type AuthUser } from '@/lib/auth'
import { useSidebar } from './sidebar-context'

interface HeaderProps {
  user: AuthUser
}

export function Header({ user }: HeaderProps) {
  const { toggleSidebar } = useSidebar()

  const initials = user.employee_name
    ? user.employee_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0]?.toUpperCase() || 'U'

  const displayName = user.employee_name || user.email

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2 sm:gap-4 select-none">
      {/* Left side: Hamburger button on mobile/tablet + Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:flex relative w-60 lg:w-80 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search employees, tasks, documents..." 
            className="w-full bg-input/50 border-border pl-10 pr-12 rounded-lg h-9 text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>
      
      {/* Right side: Theme toggle, Notifications, Profile, Signout */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <ThemeToggle />
        
        <NotificationBell />
        
        <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-border">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0">
            <AvatarFallback className="bg-muted text-xs font-medium text-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col min-w-0 max-w-[130px] md:max-w-[180px]">
            <span className="text-sm font-semibold leading-none truncate text-foreground">{displayName}</span>
            <span className="text-xs text-muted-foreground mt-1 truncate">{user.role}</span>
          </div>
          <form action={logoutAction} className="flex items-center">
            <button
              type="submit"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
