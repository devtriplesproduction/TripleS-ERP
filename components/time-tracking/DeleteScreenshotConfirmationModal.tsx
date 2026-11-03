'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'

interface DeleteScreenshotConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  itemCount: number
  isDeleting?: boolean
  screenshotTitle?: string
}

export function DeleteScreenshotConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  isDeleting = false,
  screenshotTitle
}: DeleteScreenshotConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-base font-bold text-foreground">
                {itemCount === 1 ? 'Delete Screenshot?' : `Delete ${itemCount} Screenshots?`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanent deletion confirmation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground">
          {screenshotTitle && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-foreground font-medium truncate">
              {screenshotTitle}
            </div>
          )}

          <p>
            Are you sure you want to delete {itemCount === 1 ? 'this screenshot' : `these ${itemCount} screenshots`}?
            The screenshot image files will be permanently removed from Supabase storage and their database records will be erased.
          </p>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Telemetry & Sessions Preserved:</span>
              <p className="text-[11px] leading-relaxed">
                Activity logs, working sessions, breaks, active hours, and employee attendance will <strong>NOT</strong> be deleted. Only the desktop screenshot capture is removed.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors shadow-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>{itemCount === 1 ? 'Delete Screenshot' : `Delete ${itemCount} Screenshots`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

