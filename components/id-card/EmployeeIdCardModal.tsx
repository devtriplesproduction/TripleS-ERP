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
        className="w-[96vw] sm:!max-w-3xl md:!max-w-4xl lg:!max-w-5xl p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl min-h-[660px] max-h-[95vh] flex flex-col shadow-2xl"
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
        <div className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <DialogTitle className="text-sm sm:text-base font-bold tracking-tight whitespace-nowrap text-foreground">
                Staff Identity Badge
              </DialogTitle>
              <Badge variant="outline" className="text-[11px] font-mono font-semibold shrink-0">
                {employee.employeeId || 'EMP-001'}
              </Badge>
            </div>
            <DialogDescription className="text-[11px] text-muted-foreground truncate max-w-sm sm:max-w-md">
              Official digital credential for {employeeName} ({employee.department || 'Staff'}) • {company.companyName || 'Triple S Production'}
            </DialogDescription>
          </div>

          {/* Quick Toolbar: Three Buttons in One Line + Close */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap self-end sm:self-auto overflow-x-auto py-0.5">
            {/* 1. Flip View Button */}
            <button
              type="button"
              onClick={() => {
                if (viewMode !== 'interactive') {
                  setViewMode('interactive')
                } else {
                  setIsFlipped(!isFlipped)
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border',
                viewMode === 'interactive'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
              )}
              title={viewMode === 'interactive' ? 'Flip card face' : 'Switch to Single 3D Flip Card'}
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>Flip View</span>
            </button>

            {/* 2. 2-Up View Button */}
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border',
                viewMode === 'side-by-side'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
              )}
              title="View Front & Back Side-by-Side"
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span>2-Up View</span>
            </button>

            {/* 3. Light Card View Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border',
                theme === 'light'
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
              )}
              title="Toggle Card Theme (Dark / Light)"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Light Card View</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Dark Card View</span>
                </>
              )}
            </button>

            {/* Dedicated Header Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ml-0.5"
              title="Close modal"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Modal Center: Full ID Card Single-View (No scroll down needed, plenty of width and length) */}
        <div
          className={cn(
            'flex-1 px-4 py-4 sm:py-6 flex flex-col items-center justify-center relative transition-colors duration-300 overflow-y-auto sm:overflow-hidden min-h-[530px]',
            theme === 'dark' ? 'bg-muted/15' : 'bg-slate-200/50'
          )}
        >
          {viewMode === 'interactive' ? (
            <div className="flex flex-col items-center justify-center">
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
            </div>
          ) : (
            /* 2-Up Side-by-Side View */
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 w-full max-w-4xl py-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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

              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
        <div className="shrink-0 px-4 sm:px-6 py-2.5 border-t border-border/50 bg-background flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>ISO CR80 standard badge format (53.98 × 85.6 mm) with scan verification.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs flex-1 sm:flex-none cursor-pointer"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs flex-1 sm:flex-none gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save Badge</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
