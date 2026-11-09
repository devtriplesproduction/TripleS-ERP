'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { validatePassword } from '@/lib/validations/password'
import { changeOwnPasswordAction } from '@/lib/actions/password'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UserChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userName?: string | null
}

export function UserChangePasswordModal({
  isOpen,
  onClose,
  userEmail,
  userName,
}: UserChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Live password validation
  const validation = validatePassword(newPassword, confirmPassword, {
    email: userEmail,
    employeeName: userName,
  })

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setSubmitError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    setSubmitError(null)

    if (!currentPassword.trim()) {
      const msg = 'Please enter your current password.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    if (!newPassword.trim()) {
      const msg = 'Please enter a new password.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    if (!confirmPassword.trim()) {
      const msg = 'Please re-enter your new password in the confirmation field.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirm password do not match.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    if (currentPassword === newPassword) {
      const msg = 'New password must be different from your current password.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    if (!validation.valid) {
      const topError = validation.errors[0] || 'Password does not meet complexity requirements.'
      setSubmitError(topError)
      toast.error(topError)
      return
    }

    setIsSubmitting(true)

    try {
      const result = await changeOwnPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (result.success) {
        toast.success(result.message || 'Password changed successfully.')
        handleClose()
      } else {
        const errorMsg =
          result.error ||
          (result.errors && result.errors[0]) ||
          'Failed to change password. Please verify your credentials and try again.'
        setSubmitError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err: any) {
      const errMsg = err?.message || 'An unexpected error occurred.'
      setSubmitError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isSubmitting) return
        if (!open) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-[650px] w-full no-scrollbar">
        <DialogHeader className="pb-1 sm:pb-2">
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-0">
          {submitError && (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{submitError}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div className="space-y-1.5">
            <Label>Current Password <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  if (submitError) setSubmitError(null)
                }}
                placeholder="Enter current password..."
                className="h-10 pr-10"
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 cursor-pointer"
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password & Confirm Password Grid (Side-by-Side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>New Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (submitError) setSubmitError(null)
                  }}
                  placeholder="Enter new strong password..."
                  className="h-10 pr-10"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 cursor-pointer"
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Confirm New Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (submitError) setSubmitError(null)
                  }}
                  placeholder="Re-enter new password..."
                  className="h-10 pr-10"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Strength & Requirements */}
          {newPassword.length > 0 && (
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Password Strength</span>
                <span
                  className={cn(
                    'font-semibold uppercase tracking-wider text-[11px]',
                    validation.strengthScore <= 1 && 'text-destructive',
                    validation.strengthScore === 2 && 'text-amber-500',
                    validation.strengthScore === 3 && 'text-blue-500',
                    validation.strengthScore >= 4 && 'text-emerald-500'
                  )}
                >
                  {validation.strengthLabel}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-200',
                      validation.strengthScore >= step
                        ? validation.strengthScore <= 1
                          ? 'bg-destructive'
                          : validation.strengthScore === 2
                          ? 'bg-amber-500'
                          : validation.strengthScore === 3
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                        : 'bg-muted-foreground/20'
                    )}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {validation.checks.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-center gap-1.5 text-xs transition-colors',
                      rule.passed ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {rule.passed ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="text-[11px]">{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Centered Footer Actions - Without button hover color changes */}
          <DialogFooter className="flex flex-row items-center justify-center sm:justify-center gap-3 mt-4 py-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="min-w-[110px] hover:bg-background hover:text-foreground transition-none cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-[140px] bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground transition-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UserChangePasswordButton({
  userEmail,
  userName,
  className,
}: {
  userEmail?: string | null
  userName?: string | null
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn('w-full sm:w-auto hover:bg-primary hover:text-primary-foreground transition-none cursor-pointer', className)}
      >
        <KeyRound className="mr-2 h-4 w-4" /> Change Password
      </Button>

      {isOpen && (
        <UserChangePasswordModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          userEmail={userEmail}
          userName={userName}
        />
      )}
    </>
  )
}
