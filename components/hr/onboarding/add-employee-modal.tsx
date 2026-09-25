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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-foreground text-background hover:bg-foreground/90" />}>
        <Plus className="mr-2 h-4 w-4" /> Add Employee
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-[1200px] w-full max-h-[98vh] overflow-hidden p-4 xl:p-6 border-border bg-background">
        <OnboardWizard onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
