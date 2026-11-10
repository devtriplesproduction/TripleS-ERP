'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  children?: React.ReactNode
  title: string
  description?: string
  message?: string
  onConfirm: () => Promise<void> | void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'danger'
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
}

export function ConfirmModal({
  children,
  title,
  description,
  message,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  open: controlledOpen,
  isOpen,
  onOpenChange: controlledOnOpenChange,
  onCancel,
}: ConfirmModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const effectiveOpenProp = isOpen !== undefined ? isOpen : controlledOpen
  const isControlled = effectiveOpenProp !== undefined
  const open = isControlled ? effectiveOpenProp : internalOpen

  const handleOpenChange = (val: boolean) => {
    if (!val && onCancel) {
      onCancel()
    }
    if (isControlled) {
      controlledOnOpenChange?.(val)
    } else {
      setInternalOpen(val)
    }
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      handleOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const effectiveVariant = variant === 'danger' ? 'destructive' : variant
  const effectiveDescription = description || message || ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger render={React.isValidElement(children) ? (children as any) : <span />}>
          {React.isValidElement(children) ? undefined : children}
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {effectiveDescription && <DialogDescription>{effectiveDescription}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-3 justify-center sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) onCancel()
              handleOpenChange(false)
            }}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={effectiveVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
