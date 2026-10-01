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
      <DialogTrigger render={<Button className="bg-foreground text-background hover:bg-foreground/90" />}>
        <Plus className="mr-2 h-4 w-4" /> Onboard Employee
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-[90vw] lg:max-w-[1000px] w-full h-[90vh] overflow-hidden p-0 border-border bg-background">
        <div className="h-full flex flex-col overflow-hidden p-6 xl:p-8">
          <OnboardWizard onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
