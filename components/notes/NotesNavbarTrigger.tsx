'use client'

import React, { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { NotesPopoverPanel } from './NotesPopoverPanel'

export function NotesNavbarTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 data-[state=open]:text-foreground data-[state=open]:bg-muted/80 transition-colors outline-none cursor-pointer group"
        aria-label="Personal Notes"
        title="Personal Notes"
      >
        <Lightbulb className="h-5 w-5 transition-transform group-hover:scale-105" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-[420px] p-0 shadow-2xl border border-border bg-card rounded-2xl overflow-hidden"
      >
        <NotesPopoverPanel onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
