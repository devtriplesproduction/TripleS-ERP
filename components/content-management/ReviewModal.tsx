'use client'

import React, { useState } from 'react'
import { CheckCircle2, AlertCircle, XCircle, FileText, Send, AlertTriangle, Plus, Trash2, Calendar } from 'lucide-react'
import { ContentItem, ReviewDecision } from '@/types/content-management'
import { reviewContentItem } from '@/lib/actions/content-management'
import { useToast } from '@/hooks/use-toast'

interface ReviewModalProps {
  item: ContentItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: ContentItem) => void
}

export function ReviewModal({ item, isOpen, onClose, onSuccess }: ReviewModalProps) {
  const [decision, setDecision] = useState<ReviewDecision>('Approved')
  const [comment, setComment] = useState('')
  const [corrections, setCorrections] = useState<string[]>([])
  const [newCorrectionInput, setNewCorrectionInput] = useState('')
  const [nextReviewDate, setNextReviewDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().slice(0, 10)
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  if (!isOpen || !item) return null

  const handleAddCorrection = () => {
    if (!newCorrectionInput.trim()) return
    setCorrections([...corrections, newCorrectionInput.trim()])
    setNewCorrectionInput('')
  }

  const handleRemoveCorrection = (index: number) => {
    setCorrections(corrections.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if ((decision === 'Changes Requested' || decision === 'Rejected') && !comment.trim()) {
      setError('A comment/reason is strictly required for ' + decision)
      return
    }

    setLoading(true)
    try {
      const res = await reviewContentItem(
        item.id,
        decision,
        comment,
        decision === 'Changes Requested' ? corrections : undefined,
        decision === 'Approved' ? nextReviewDate : undefined
      )
      if (res.success && res.data) {
        toast({
          title: 'Review Submitted',
          description: `Content "${item.title}" decision recorded as ${decision}.`,
        })
        onSuccess(res.data)
        onClose()
      } else {
        setError(res.error || 'Failed to submit review decision')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-zinc-100">Review Content</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-sm font-medium p-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content details */}
        <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800/80 text-xs text-zinc-400 space-y-1 shrink-0">
          <div className="text-sm font-medium text-zinc-200 line-clamp-1">{item.title}</div>
          <div className="flex items-center gap-4">
            <span>Author: <strong className="text-zinc-300">{item.owner_name}</strong></span>
            {item.project_name && <span>Project: <strong className="text-zinc-300">{item.project_name}</strong></span>}
            <span>Type: <strong className="text-zinc-300">{item.content_type}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decision Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Review Decision
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('Approved')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  decision === 'Approved'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mb-1.5 text-emerald-400" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('Changes Requested')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  decision === 'Changes Requested'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/50'
                    : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <AlertCircle className="w-5 h-5 mb-1.5 text-amber-400" />
                <span>Request Changes</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('Rejected')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  decision === 'Rejected'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/50'
                    : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <XCircle className="w-5 h-5 mb-1.5 text-rose-400" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          {/* Comment / Reason */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Review Comments / Feedback
              </label>
              {(decision === 'Changes Requested' || decision === 'Rejected') && (
                <span className="text-[11px] text-amber-400 font-medium">Required</span>
              )}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                decision === 'Changes Requested'
                  ? 'Specify feedback and necessary revisions...'
                  : decision === 'Rejected'
                  ? 'State rejection reason...'
                  : 'Optional approval notes (e.g. Content meets standards, ready for publish)...'
              }
              rows={3}
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Required Corrections Checklist (For Changes Requested) */}
          {decision === 'Changes Requested' && (
            <div className="space-y-2 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
                Required Corrections from Reviewer
              </label>
              <p className="text-[11px] text-zinc-400">
                Add specific actionable correction items for the developer/author to fix:
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCorrectionInput}
                  onChange={(e) => setNewCorrectionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCorrection()
                    }
                  }}
                  placeholder="e.g. Update OpenAPI schema to version 3.1..."
                  className="flex-1 bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddCorrection}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {corrections.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {corrections.map((corr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{corr}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCorrection(idx)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Next Review Date (When Approving) */}
          {decision === 'Approved' && (
            <div className="space-y-1.5 p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Schedule Next Freshness Review Date
              </label>
              <p className="text-[11px] text-zinc-400">
                Documentation review cadence for content freshness tracking:
              </p>
              <input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="w-full sm:w-60 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-md ${
                decision === 'Approved'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : decision === 'Changes Requested'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : `Submit ${decision}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
