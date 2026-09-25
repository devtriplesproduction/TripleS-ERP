'use client'

import { useState } from 'react'
import { deleteEmployee } from '@/lib/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function DeleteEmployeeButton({ employeeId, employeeName }: { employeeId: string, employeeName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleDelete = async () => {
    setIsPending(true)
    try {
      await deleteEmployee(employeeId)
      // The server action handles redirect
    } catch (error) {
      console.error(error)
      setIsPending(false)
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={<Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" />}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete Record
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Delete Employee Onboarding</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the onboarding record for <strong>{employeeName}</strong>? This action cannot be undone and will remove all associated tasks.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending} className="border-border text-foreground hover:bg-accent">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
