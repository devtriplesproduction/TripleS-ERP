'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CheckSquare } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { QuickTasksPopoverPanel } from './QuickTasksPopoverPanel'
import {
  getQuickTasksBadgeCountAction,
  markQuickTasksSeenAction,
} from '@/lib/actions/quick-tasks'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/lib/auth'

interface QuickTasksNavbarTriggerProps {
  user: AuthUser
}

export function QuickTasksNavbarTrigger({ user }: QuickTasksNavbarTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnreadAssignment, setHasUnreadAssignment] = useState<boolean>(false)
  const isMountedRef = useRef(true)

  const loadBadgeState = useCallback(async () => {
    try {
      const res = await getQuickTasksBadgeCountAction()
      if (isMountedRef.current) {
        setHasUnreadAssignment(Boolean(res.hasUnreadAssignment))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadBadgeState()

    // 1. Supabase Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('quick-tasks-badge-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quick_tasks' },
        () => {
          loadBadgeState()
        }
      )
      .subscribe()

    // 2. In-tab custom event
    const handleUpdate = () => {
      loadBadgeState()
    }
    window.addEventListener('erp-quick-tasks-update', handleUpdate)

    // 3. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('erp-notifications-channel')
      bc.onmessage = (msg) => {
        if (
          msg.data?.type === 'QUICK_TASK_CREATED' ||
          msg.data?.type === 'QUICK_TASK_UPDATED' ||
          msg.data?.type === 'QUICK_TASK_SEEN'
        ) {
          loadBadgeState()
        }
      }
    } catch {}

    // 4. Active fallback polling (every 4 seconds when tab is active)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadBadgeState()
      }
    }, 4000)

    // 5. Re-check immediately on window focus or visibility change
    const handleFocus = () => {
      loadBadgeState()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBadgeState()
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMountedRef.current = false
      supabase.removeChannel(channel)
      window.removeEventListener('erp-quick-tasks-update', handleUpdate)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [loadBadgeState])

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open)
    if (open) {
      if (hasUnreadAssignment) {
        // Optimistically remove the red dot immediately upon opening
        setHasUnreadAssignment(false)
      }

      // Persist seen state in Supabase
      try {
        await markQuickTasksSeenAction()
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        try {
          const bc = new BroadcastChannel('erp-notifications-channel')
          bc.postMessage({ type: 'QUICK_TASK_SEEN' })
          bc.close()
        } catch {}
      } catch (err) {
        console.error('[QuickTasksNavbarTrigger] Error marking tasks as seen:', err)
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=open]:text-foreground data-[state=open]:bg-muted/80 transition-colors outline-none cursor-pointer group"
        aria-label={`Quick Tasks${hasUnreadAssignment ? ' (New task assignment)' : ''}`}
        title="Quick Tasks"
      >
        <CheckSquare className="h-5 w-5 transition-transform group-hover:scale-105" />

        {/* Small red circular indicator for unread task assignment */}
        {hasUnreadAssignment && (
          <span
            data-testid="quick-tasks-unread-dot"
            className="absolute top-1.5 right-1.5 z-10 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-in zoom-in-50 duration-200 pointer-events-none"
            aria-hidden="true"
          />
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
