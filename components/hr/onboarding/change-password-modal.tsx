'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  User,
  Mail,
  Hash,
  CheckCircle2,
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { validatePassword, PasswordRuleCheck } from '@/lib/validations/password'
import {
  changeEmployeePasswordAction,
  getEmployeePasswordChangeInfo,
} from '@/lib/actions/password'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ChangePasswordModalProps {
  employee: Employee
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({
  employee,
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { toast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showConfirmError, setShowConfirmError] = useState(false)

  const [isCheckingAccount, setIsCheckingAccount] = useState(true)
  const [hasAccount, setHasAccount] = useState(true)
  const [canChangePassword, setCanChangePassword] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
  const employeeId = employee.employee_id_number || 'Not assigned'
  const email = employee.email || 'No email'

  // Reset form and check account status on modal open
  useEffect(() => {
    if (isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setIsConfirmed(false)
      setShowConfirmError(false)
      setSubmitError(null)
      setIsCheckingAccount(true)

      getEmployeePasswordChangeInfo(employee.id)
        .then((info) => {
          setHasAccount(info.hasAccount)
          setCanChangePassword(info.canChangePassword)
          setAccountError(info.errorMessage || null)
        })
        .catch((err) => {
          setAccountError(err.message || 'Failed to verify employee account status.')
        })
        .finally(() => {
          setIsCheckingAccount(false)
        })
    }
  }, [isOpen, employee.id])

  // Live password validation
  const validation = validatePassword(newPassword, confirmPassword, {
    email: employee.email,
    employeeName: fullName,
  })

  // Strength colors
  const strengthColor =
    validation.strengthScore <= 1
      ? 'bg-red-500'
      : validation.strengthScore === 2
      ? 'bg-amber-500'
      : validation.strengthScore === 3
      ? 'bg-blue-500'
      : 'bg-emerald-500'

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    setSubmitError(null)
    setShowConfirmError(false)

    // 1. Account and authorization verification
    if (!hasAccount) {
      setSubmitError('This employee does not have a linked Supabase Auth login account.')
      return
    }
    if (!canChangePassword) {
      setSubmitError(accountError || 'You do not have permission to change this password.')
      return
    }

    // 2. Form input completeness
    if (!newPassword.trim()) {
      setSubmitError('Please enter a new password.')
      return
    }
    if (!confirmPassword.trim()) {
      setSubmitError('Please re-enter the password in the confirm field.')
      return
    }

    // 3. Password match
    if (newPassword !== confirmPassword) {
      setSubmitError('New password and confirm password do not match.')
      return
    }

    // 4. Policy validation check
    if (!validation.valid) {
      const topError = validation.errors[0] || 'Password does not meet complexity requirements.'
      setSubmitError(topError)
      return
    }

    // 5. Explicit Confirmation Checkbox
    if (!isConfirmed) {
      setShowConfirmError(true)
      setSubmitError(`Please check the confirmation box below to confirm changing the password for ${fullName}.`)
      return
    }

    // All checks satisfied, submit to server action
    setIsSubmitting(true)

    try {
      const result = await changeEmployeePasswordAction({
        employeeId: employee.id,
        newPassword,
        confirmPassword,
      })

      if (result.success) {
        toast({
          title: 'Password Updated',
          description:
            result.message ||
            `Password for ${fullName} has been updated successfully.`,
        })
        onClose()
      } else {
        const errorMsg =
          result.error ||
          (result.errors && result.errors[0]) ||
          'Failed to change password. Please check requirements.'
        setSubmitError(errorMsg)
        toast({
          title: 'Update Failed',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred.'
      setSubmitError(errMsg)
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto bg-card text-foreground border border-border/80 shadow-2xl rounded-2xl p-5 sm:p-6"
        showCloseButton={!isSubmitting}
      >
        <DialogHeader className="gap-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground/10 border border-foreground/15 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Change Password
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set a secure login password for this employee account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Target Employee Identity Confirmation Card */}
        <div className="bg-muted/40 border border-border/60 rounded-xl p-3 sm:p-3.5 space-y-2 text-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Target Employee Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground truncate">{fullName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                {employeeId}
              </Badge>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{email}</span>
            </div>
          </div>
        </div>

        {/* Account Status / Permissions Alerts */}
        {isCheckingAccount ? (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            Verifying Supabase Auth account...
          </div>
        ) : !hasAccount ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">No Login Account Found</div>
              <div className="text-[11px] text-amber-500/90 mt-0.5">
                This employee does not currently have a linked Supabase Auth account.
                Please create their login account before setting a password.
              </div>
            </div>
          </div>
        ) : !canChangePassword && accountError ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Action Restricted</div>
              <div className="text-[11px] text-red-400/90 mt-0.5">{accountError}</div>
            </div>
          </div>
        ) : null}

        {/* Action Error Banner */}
        {submitError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{submitError}</div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* New Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-password-input"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>New Password</span>
              {newPassword.length > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  Strength:{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      validation.strengthScore <= 1 && 'text-red-400',
                      validation.strengthScore === 2 && 'text-amber-400',
                      validation.strengthScore === 3 && 'text-blue-400',
                      validation.strengthScore === 4 && 'text-emerald-400'
                    )}
                  >
                    {validation.strengthLabel}
                  </span>
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                id="new-password-input"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (submitError) setSubmitError(null)
                }}
                placeholder="Enter new password"
                disabled={!hasAccount || !canChangePassword || isSubmitting}
                className="pr-10 bg-background text-sm font-sans"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    strengthColor
                  )}
                  style={{
                    width: `${Math.max(15, (validation.strengthScore / 4) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Confirm New Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password-input"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Confirm New Password</span>
              {confirmPassword.length > 0 && (
                <span className="text-[11px] font-medium">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Matches
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <X className="w-3 h-3" /> Does not match
                    </span>
                  )}
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (submitError) setSubmitError(null)
                }}
                placeholder="Re-enter new password"
                disabled={!hasAccount || !canChangePassword || isSubmitting}
                className="pr-10 bg-background text-sm font-sans"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password Policy Checklist */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-1.5">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">
              Password Requirements:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {validation.checks.map((rule: PasswordRuleCheck) => {
                const isPassed = newPassword.length > 0 && rule.passed
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] transition-colors',
                      newPassword.length === 0
                        ? 'text-muted-foreground'
                        : isPassed
                        ? 'text-emerald-400 font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-border/80 shrink-0" />
                    )}
                    <span>{rule.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Special warnings (trivial / name tokens) */}
            {newPassword.length > 0 && validation.errors.some(e => e.includes('common') || e.includes('name') || e.includes('username')) && (
              <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{validation.errors.find(e => e.includes('common') || e.includes('name') || e.includes('username'))}</span>
              </div>
            )}
          </div>

          {/* Confirmation Checkbox Requirement */}
          <div
            className={cn(
              'p-3 rounded-xl border transition-all',
              showConfirmError
                ? 'border-red-500/50 bg-red-500/10'
                : 'border-border/50 bg-muted/20'
            )}
          >
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked)
                  if (e.target.checked) {
                    setShowConfirmError(false)
                    if (submitError?.includes('confirmation box')) {
                      setSubmitError(null)
                    }
                  }
                }}
                disabled={!hasAccount || !canChangePassword || isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-border text-foreground accent-foreground focus:ring-foreground/20 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                I confirm that I want to change the password for{' '}
                <strong className="text-foreground">{fullName}</strong> ({employeeId}).
                The employee must use this new password on their next sign-in.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="gap-2 sm:gap-3 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isCheckingAccount}
              className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-medium cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
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
