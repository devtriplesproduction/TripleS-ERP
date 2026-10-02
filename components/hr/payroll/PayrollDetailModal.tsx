import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndianRupee, Clock, CalendarDays, Wallet, ArrowRight, MinusCircle, PlusCircle, LayoutList } from 'lucide-react'
import { PayrollResult } from '@/lib/services/payroll.service'

interface PayrollDetailModalProps {
  isOpen: boolean
  onClose: () => void
  payroll: PayrollResult | null
}

export function PayrollDetailModal({ isOpen, onClose, payroll }: PayrollDetailModalProps) {
  if (!payroll) return null

  const StatItem = ({ label, value, valueClass = "font-semibold" }: { label: string, value: React.ReactNode, valueClass?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Payroll Detail: {payroll.name}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {payroll.department} | ID: {payroll.employeeId.slice(0,8).toUpperCase()}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Salary Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Financial Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <StatItem label="Monthly Gross (Base)" value={`₹${payroll.salary.toFixed(2)}`} />
              <StatItem label="Overtime Pay (+)" value={`₹${payroll.overtimePay.toFixed(2)}`} valueClass="font-semibold text-emerald-500" />
              <StatItem label="Unpaid Leave (-)" value={`₹${payroll.unpaidLeaveDeduction.toFixed(2)}`} valueClass="font-semibold text-rose-500" />
              <StatItem label="Short Hours (-)" value={`₹${payroll.shortHoursDeduction.toFixed(2)}`} valueClass="font-semibold text-rose-500" />
              
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold text-foreground">Net Payable</span>
                <span className="text-lg font-bold text-foreground">₹{payroll.netPayable.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Time & Attendance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time & Attendance (Hours)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <StatItem label="Standard Expected" value={payroll.standardHours.toFixed(1)} />
              <StatItem label="Actual Worked" value={payroll.actualWorkedHours.toFixed(1)} />
              <StatItem label="Paid Leave Credited" value={payroll.creditedLeaveHours.toFixed(1)} />
              <StatItem label="Unpaid Leave" value={payroll.unpaidLeaveHours.toFixed(1)} valueClass="text-rose-500" />
              <StatItem label="Paid Holidays" value={payroll.paidHolidayHours.toFixed(1)} />
              <StatItem label="WFH Hours" value={payroll.wfhHours.toFixed(1)} />
              
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <StatItem label="Extra Hours (Overtime Eligible)" value={payroll.extraHours.toFixed(1)} valueClass="text-emerald-500" />
                <StatItem label="Short Hours (Deficit)" value={payroll.shortHours.toFixed(1)} valueClass="text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
