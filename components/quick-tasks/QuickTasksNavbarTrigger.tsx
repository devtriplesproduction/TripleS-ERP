'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CheckSquare } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { QuickTasksPopoverPanel } from './QuickTasksPopoverPanel'
import { getQuickTasksBadgeCountAction } from '@/lib/actions/quick-tasks'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/lib/auth'

interface QuickTasksNavbarTriggerProps {
  user: AuthUser
}

export function QuickTasksNavbarTrigger({ user }: QuickTasksNavbarTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState<number>(0)

  const loadBadgeCount = useCallback(async () => {
    try {
      const res = await getQuickTasksBadgeCountAction()
      setPendingCount(res.pendingCount || 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadBadgeCount()

    // 1. Supabase Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('quick-tasks-badge-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quick_tasks' },
        () => {
          loadBadgeCount()
        }
      )
      .subscribe()

    // 2. In-tab custom event
    const handleUpdate = () => {
      loadBadgeCount()
    }
    window.addEventListener('erp-quick-tasks-update', handleUpdate)

    // 3. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('erp-notifications-channel')
      bc.onmessage = () => {
        loadBadgeCount()
      }
    } catch {}

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('erp-quick-tasks-update', handleUpdate)
      if (bc) bc.close()
    }
  }, [loadBadgeCount])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=open]:text-foreground data-[state=open]:bg-muted/80 transition-colors outline-none cursor-pointer group"
        aria-label={`Quick Tasks ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`}
        title="Quick Tasks"
      >
        <CheckSquare className="h-5 w-5 transition-transform group-hover:scale-105" />

        {/* Small pending/unread badge */}
        {pendingCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background animate-in zoom-in-50 duration-200">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-1.5rem)] sm:w-[440px] max-w-[440px] p-0 shadow-2xl border border-border bg-card rounded-2xl overflow-hidden"
      >
        <QuickTasksPopoverPanel onClose={() => setIsOpen(false)} user={user} />
      </PopoverContent>
    </Popover>
  )
}
