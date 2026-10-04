'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import { Client, ClientStatus } from '@/types/project-management'
import { createClientAction, updateClientAction } from '@/lib/actions/clients'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clientToEdit?: Client | null
}

export function ClientModal({ isOpen, onClose, onSuccess, clientToEdit }: ClientModalProps) {
  const isEditing = !!clientToEdit

  const [name, setName] = useState(clientToEdit?.name || '')
  const [location, setLocation] = useState(clientToEdit?.location || '')
  const [contactNumber, setContactNumber] = useState(clientToEdit?.contact_number || '')
  const [whatsappNumber, setWhatsappNumber] = useState(clientToEdit?.whatsapp_number || '')
  const [email, setEmail] = useState(clientToEdit?.email || '')
  const [status, setStatus] = useState<ClientStatus>(clientToEdit?.status || 'Active')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = name.trim()
    const trimmedLocation = location.trim()

    if (!trimmedName) {
      setErrorMsg('Client Name is required.')
      return
    }

    if (!trimmedLocation) {
      setErrorMsg('Location is required.')
      return
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && clientToEdit) {
        const res = await updateClientAction({
          id: clientToEdit.id,
          name: trimmedName,
          location: trimmedLocation,
          contact_number: contactNumber.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          email: email.trim() || null,
          status,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update client.')
          toast.error(res.error || 'Failed to update client.')
        } else {
          toast.success('Client updated successfully.')
          onSuccess()
          onClose()
        }
      } else {
        const res = await createClientAction({
          name: trimmedName,
          location: trimmedLocation,
          contact_number: contactNumber.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          email: email.trim() || null,
          status,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create client.')
          toast.error(res.error || 'Failed to create client.')
        } else {
          toast.success('Client created successfully.')
          onSuccess()
          onClose()
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg w-full bg-card border-border text-foreground p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Client' : 'Create New Client'}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="client-name" className="text-sm font-medium">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input border-border"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-location" className="text-sm font-medium">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-location"
              placeholder="e.g. Mumbai, Maharashtra"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-input border-border"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-phone" className="text-sm font-medium">
                Contact Number
              </Label>
              <Input
                id="client-phone"
                placeholder="+91 98765 43210"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-whatsapp" className="text-sm font-medium">
                WhatsApp Number
              </Label>
              <Input
                id="client-whatsapp"
                placeholder="+91 98765 43210"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="client-email"
                type="email"
                placeholder="contact@client.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <Dropdown
              id="client-status"
              label="Status"
              value={status}
              onChange={(val) => setStatus(val as ClientStatus)}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              buttonClassName="bg-input border-border w-full"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
