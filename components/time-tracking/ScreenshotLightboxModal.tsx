'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  Laptop,
  Clock,
  HardDrive,
  User,
  Calendar,
  Trash2,
  Monitor,
  Info
} from 'lucide-react'
import type { ScreenshotItem } from '@/lib/actions/time-tracking'
import { DeleteScreenshotConfirmationModal } from './DeleteScreenshotConfirmationModal'

interface ScreenshotLightboxModalProps {
  screenshots: ScreenshotItem[]
  initialIndex?: number
  employeeName?: string
  onClose: () => void
  onDeleteScreenshot?: (screenshotId: string) => Promise<boolean>
}

export function ScreenshotLightboxModal({
  screenshots,
  initialIndex = 0,
  employeeName,
  onClose,
  onDeleteScreenshot
}: ScreenshotLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [imageError, setImageError] = useState<boolean>(false)

  // Ensure index remains in bounds
  const validIndex = Math.min(Math.max(0, currentIndex), Math.max(0, screenshots.length - 1))
  const current = screenshots[validIndex]

  // Reset zoom & error on index change
  useEffect(() => {
    setZoomLevel(1)
    setImageError(false)
  }, [validIndex])

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : screenshots.length - 1))
  }, [screenshots.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < screenshots.length - 1 ? prev + 1 : 0))
  }, [screenshots.length])

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => setZoomLevel(1)

  const handleConfirmDelete = async () => {
    if (!current || !onDeleteScreenshot) return
    setIsDeleting(true)
    try {
      const ok = await onDeleteScreenshot(current.id)
      if (ok) {
        setShowDeleteConfirm(false)
        if (screenshots.length <= 1) {
          onClose()
        } else {
          setCurrentIndex(prev => (prev > 0 ? prev - 1 : 0))
        }
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleResetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext, onClose])

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origOverflow
    }
  }, [])

  if (!current) return null

  const displayName = current.employeeName || employeeName || 'Employee'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/90 shrink-0 gap-4 flex-wrap">
        {/* Left: Employee info & Timestamp */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
            {displayName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'E'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{displayName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-mono shrink-0">
                {validIndex + 1} of {screenshots.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={12} className="text-primary" />
              <span>{current.capturedAtFormatted || current.capturedAt}</span>
              {current.sessionDate && (
                <>
                  <span>•</span>
                  <Calendar size={12} />
                  <span>{current.sessionDate}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: App & Window info */}
        <div className="hidden md:flex items-center gap-2 max-w-md lg:max-w-xl truncate px-3 py-1 rounded-xl bg-muted/40 border border-border shadow-xs">
          <Laptop size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-foreground shrink-0">{current.appName}</span>
          {current.windowTitle && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground truncate" title={current.windowTitle}>
                {current.windowTitle}
              </span>
            </>
          )}
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-xs">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-[11px] font-mono font-medium text-foreground hover:bg-muted/60 rounded transition-colors"
              title="Reset Zoom (0)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Open full size in new tab */}
          {current.imageUrl && (
            <a
              href={current.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shadow-xs"
              title="Open Original in New Tab"
            >
              <ExternalLink size={15} />
            </a>
          )}

          {/* Download image */}
          {current.imageUrl && (
            <a
              href={current.imageUrl}
              download={`screenshot-${current.employeeId}-${current.sessionDate}-${current.id}.jpg`}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shadow-xs"
              title="Download Screenshot"
            >
              <Download size={15} />
            </a>
          )}

          {/* Delete screenshot button */}
          {onDeleteScreenshot && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm"
              title="Delete Screenshot"
            >
              <Trash2 size={15} />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-xs ml-1"
            title="Close Lightbox (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden select-none">
        {/* Navigation Arrows */}
        {screenshots.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full border border-border/80 bg-card/90 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg backdrop-blur-sm"
              title="Previous Screenshot (Left Arrow)"
              aria-label="Previous Screenshot"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full border border-border/80 bg-card/90 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg backdrop-blur-sm"
              title="Next Screenshot (Right Arrow)"
              aria-label="Next Screenshot"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Scaled Image or Fallback */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {!imageError && current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.imageUrl}
              alt={current.windowTitle || `Screenshot taken at ${current.capturedAtFormatted}`}
              onError={() => setImageError(true)}
              className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl border border-border shadow-2xl bg-black/40"
            />
          ) : (
            <div className="w-[85vw] max-w-2xl h-[55vh] flex flex-col items-center justify-center rounded-2xl border border-border bg-card/90 p-8 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                <Monitor size={36} className="opacity-60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Screen Capture Frame</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Desktop telemetry frame captured on {current.sessionDate} at {current.capturedAtFormatted}.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-left w-full max-w-md space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Application:</span>
                  <span className="font-semibold text-foreground">{current.appName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window Title:</span>
                  <span className="font-semibold text-foreground truncate max-w-[200px]" title={current.windowTitle}>
                    {current.windowTitle || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capture Time:</span>
                  <span className="text-foreground">{current.capturedAtFormatted}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Telemetry metadata & Filmstrip */}
      <div className="border-t border-border bg-card/90 px-4 sm:px-6 py-2.5 shrink-0 space-y-2">
        {/* Window title & shortcuts hint */}
        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">{current.appName}</span>
            <span className="truncate max-w-md">{current.windowTitle}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            {current.fileSizeFormatted && (
              <span className="flex items-center gap-1">
                <HardDrive size={11} />
                {current.fileSizeFormatted}
              </span>
            )}
            <span>Session: {current.sessionId.slice(0, 8)}...</span>
            <span className="hidden lg:inline text-muted-foreground/70">• ESC to close • ← / → to navigate • +/- to zoom</span>
          </div>
        </div>

        {/* Filmstrip thumbnails (if multiple screenshots) */}
        {screenshots.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
            {screenshots.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setZoomLevel(1)
                  setCurrentIndex(idx)
                }}
                className={`relative shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === validIndex
                    ? 'border-primary ring-2 ring-primary/30 scale-105'
                    : 'border-border/60 opacity-60 hover:opacity-100 hover:border-foreground/30'
                }`}
                title={`${s.appName} - ${s.capturedAtFormatted}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imageUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteScreenshotConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          itemCount={1}
          isDeleting={isDeleting}
          screenshotTitle={current.windowTitle || `${current.appName} - ${current.capturedAtFormatted}`}
        />
      )}
    </div>
  )
}
