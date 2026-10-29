'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Calendar,
  FileText,
  Printer,
  ExternalLink,
  Download,
  Paperclip,
  CheckCircle2,
  Clock,
  Briefcase,
} from 'lucide-react'
import { JournalEntry } from '@/types/accounting'

interface JournalEntryViewModalProps {
  isOpen: boolean
  onClose: () => void
  entry: JournalEntry | null
}

export function JournalEntryViewModal({
  isOpen,
  onClose,
  entry,
}: JournalEntryViewModalProps) {
  if (!entry) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl lg:max-w-5xl w-[96vw] bg-card border-border text-foreground p-0 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Journal Entry: {entry.entry_number}</span>
                  <Badge
                    variant={entry.status === 'Posted' ? 'default' : 'secondary'}
                    className={
                      entry.status === 'Posted'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }
                  >
                    {entry.status === 'Posted' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Posted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Double-entry accounting transaction record
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Voucher</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/10 border border-border">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Entry Date
              </div>
              <div className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{entry.entry_date}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Reference No.
              </div>
              <div className="text-sm font-mono text-foreground">
                {entry.reference_number || '—'}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Campaign / Project
              </div>
              <div className="text-sm text-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{entry.campaign_project || 'General Operations'}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Total Transaction
              </div>
              <div className="text-base font-bold font-mono text-foreground">
                ₹{entry.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Narration */}
          <div className="p-4 rounded-xl bg-muted/10 border border-border space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Description / Narration
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {entry.description}
            </p>
          </div>

          {/* Attachment Preview if exists */}
          {entry.attachment_url && (
            <div className="p-3.5 rounded-xl bg-muted/10 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Paperclip className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">Attached Proof Document</span>
              </div>
              <a
                href={entry.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <span>View Attachment</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Lines Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Accounting Journal Lines
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Account Code & Name</th>
                    <th className="py-2.5 px-3">Line Description</th>
                    <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                    <th className="py-2.5 px-3">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entry.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">
                          {line.account_name}
                        </div>
                        {line.account_code && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            Code: {line.account_code}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {line.description || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                        {line.debit > 0
                          ? `₹${line.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                        {line.credit > 0
                          ? `₹${line.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">
                        {line.reference_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/40 font-bold border-t border-border">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] text-muted-foreground">
                      Total
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-foreground">
                      ₹{entry.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-foreground">
                      ₹{entry.total_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
