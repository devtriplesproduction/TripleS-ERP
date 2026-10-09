'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { OnboardWizard } from './onboard-wizard'

export function AddEmployeeModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { if (newOpen) setOpen(true) }}>
      <DialogTrigger render={<Button className="bg-foreground text-background hover:bg-foreground/90 min-h-[44px] sm:min-h-9" />}>
        <Plus className="mr-2 h-4 w-4" /> Onboard Employee
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:max-w-[90vw] lg:max-w-[1000px] h-[92vh] max-h-[calc(100dvh-1rem)] overflow-hidden p-0 border-border bg-background">
        <div className="h-full flex flex-col overflow-hidden p-4 sm:p-5">
          <OnboardWizard onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
