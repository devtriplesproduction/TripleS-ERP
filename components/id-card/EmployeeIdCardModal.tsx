'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  EmployeeIdCard,
  EmployeeIdCardData,
  CompanyCardSettings,
  DEFAULT_COMPANY
} from './EmployeeIdCard'
import {
  RotateCw,
  Download,
  X
} from 'lucide-react'

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

  const handleExportPDF = () => {
    window.print()
  }

  const employeeName =
    employee.fullName ||
    [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
    'Staff Member'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] sm:max-w-xl md:max-w-2xl p-6 sm:p-8 overflow-hidden border-zinc-800 bg-[#0b0c0e]/95 backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl rounded-3xl"
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
              flex-direction: column !important;
              align-items: center !important;
              gap: 15mm !important;
              padding: 15mm !important;
              background: transparent !important;
            }
          }
        `}</style>

        {/* Top Header Row with Centered Title & Right Close */}
        <div className="w-full relative flex items-center justify-center mb-2">
          {/* Centered Pill & Title */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10.5px] font-semibold tracking-widest uppercase border border-purple-500/35 bg-purple-500/10 text-purple-300">
              OFFICIAL DOCUMENT
            </span>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white mt-1.5">
              Digital Identity Card
            </DialogTitle>
            <DialogDescription className="sr-only">
              Official digital identity badge for {employeeName}
            </DialogDescription>
          </div>

          {/* Top Right Dedicated Close Button */}
          <div className="absolute right-0 top-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Center Card Container */}
        <div className="my-5 flex justify-center w-full">
          <EmployeeIdCard
            employee={employee}
            company={company}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            interactive={true}
          />
        </div>

        {/* Bottom Action Buttons (Matching Screenshot) */}
        <div className="flex items-center justify-center gap-3 mt-1">
          {/* Flip Card Pill */}
          <Button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-10 px-5 rounded-xl font-semibold bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md gap-2 cursor-pointer transition-all"
            title="Click to flip ID card"
          >
            <RotateCw className="w-4 h-4" />
            <span>Flip Card</span>
          </Button>

          {/* Export as PDF Pill */}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPDF}
            className="h-10 px-5 rounded-xl font-medium border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white shadow-sm gap-2 cursor-pointer transition-all"
            title="Print or export ID badge as PDF"
          >
            <Download className="w-4 h-4" />
            <span>Export as PDF</span>
          </Button>
        </div>

        {/* Hidden Print Target Container */}
        <div
          id="triples-print-badge-container"
          className="hidden"
          style={{ display: 'none' }}
        >
          <EmployeeIdCard
            employee={employee}
            company={company}
            isFlipped={false}
            interactive={false}
          />
          <EmployeeIdCard
            employee={employee}
            company={company}
            isFlipped={true}
            interactive={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
