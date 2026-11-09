'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  EmployeeIdCard,
  EmployeeIdCardData,
  CompanyCardSettings,
  DEFAULT_COMPANY
} from './EmployeeIdCard'
import {
  RotateCw,
  Printer,
  Sun,
  Moon,
  Columns,
  Layers,
  CreditCard,
  CheckCircle2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmployeeIdCardModalProps {
  isOpen: boolean
  onClose: () => void
  employee: EmployeeIdCardData
  company?: CompanyCardSettings
}

export function EmployeeIdCardModal({
  isOpen,
  onClose,
  employee,
  company = DEFAULT_COMPANY,
}: EmployeeIdCardModalProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [viewMode, setViewMode] = useState<'interactive' | 'side-by-side'>('interactive')

  const handlePrint = () => {
    window.print()
  }

  const employeeName =
    employee.fullName ||
    [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
    'Employee'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:!max-w-2xl md:!max-w-3xl lg:!max-w-4xl w-[95vw] p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* Printable Section Style Sheet */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #triples-print-badge-container,
            #triples-print-badge-container * {
              visibility: visible !important;
            }
            #triples-print-badge-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: flex !important;
              flex-direction: row !important;
              justify-content: center !important;
              gap: 20mm !important;
              padding: 15mm !important;
              background: transparent !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Modal Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-3.5 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap text-foreground">
                Staff Identity Badge
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-mono font-semibold shrink-0">
                {employee.employeeId || 'EMP-001'}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground truncate max-w-md">
              Official digital credential for {employeeName} ({employee.department || 'Staff'}).
            </DialogDescription>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer',
                  viewMode === 'interactive'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Single 3D Flip Card"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer',
                  viewMode === 'side-by-side'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="View Front & Back Side-by-Side"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2-Up View</span>
              </button>
            </div>

            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium cursor-pointer"
              title="Toggle Card Theme (Dark / Light)"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light Card</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Dark Card</span>
                </>
              )}
            </Button>

            {/* Dedicated Header Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Modal Center: Scrollable Card Display Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 bg-muted/15 flex flex-col items-center justify-center min-h-[460px] relative">
          {viewMode === 'interactive' ? (
            <div className="flex flex-col items-center gap-3.5 my-auto">
              <div className="relative group">
                <EmployeeIdCard
                  employee={employee}
                  company={company}
                  theme={theme}
                  isFlipped={isFlipped}
                  onFlip={() => setIsFlipped(!isFlipped)}
                  interactive={true}
                />
              </div>

              {/* Sub-hint & Flip Button */}
              <div className="flex items-center gap-2 mt-0.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="h-8 gap-1.5 text-xs font-semibold px-4 rounded-full shadow-xs cursor-pointer border border-border/50"
                >
                  <RotateCw className="w-3.5 h-3.5 text-primary" />
                  <span>Flip to {isFlipped ? 'Front Face' : 'Back Face'}</span>
                </Button>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  (Or click the card directly to flip)
                </span>
              </div>
            </div>
          ) : (
            /* 2-Up Side-by-Side View */
            <div className="flex flex-wrap items-center justify-center gap-6 w-full max-w-3xl my-auto py-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Front Face
                </span>
                <EmployeeIdCard
                  employee={employee}
                  company={company}
                  theme={theme}
                  isFlipped={false}
                  interactive={false}
                />
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Back Face
                </span>
                <EmployeeIdCard
                  employee={employee}
                  company={company}
                  theme={theme}
                  isFlipped={true}
                  interactive={false}
                />
              </div>
            </div>
          )}

          {/* Hidden Print Target Container (Active when window.print() is executed) */}
          <div
            id="triples-print-badge-container"
            className="hidden"
            style={{ display: 'none' }}
          >
            <EmployeeIdCard
              employee={employee}
              company={company}
              theme={theme}
              isFlipped={false}
              interactive={false}
            />
            <EmployeeIdCard
              employee={employee}
              company={company}
              theme={theme}
              isFlipped={true}
              interactive={false}
            />
          </div>
        </div>

        {/* Pinned Modal Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3 border-t border-border/50 bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>ISO CR80 standard badge format (53.98 × 85.6 mm) with scan verification.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none cursor-pointer"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="flex-1 sm:flex-none gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Badge</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
