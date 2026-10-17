// @ts-nocheck
'use client';

import { useState } from 'react';
import { reviewEODAction, batchReviewEODAction } from '@/actions/eod.actions';
import { useRouter } from 'next/navigation';
import { EODReport } from '@/lib/actions/eod';
import { usePrompt } from "@/hooks/use-prompt";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { formatCanonicalDuration } from "@/lib/utils/time";

export function EODReviewTable({ eods }: { eods: (EODReport & { profiles: { first_name: string, last_name: string, employee_id: string } | null })[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchError, setBatchError] = useState<string | null>(null);
  const router = useRouter();
  const { prompt, PromptComponent } = usePrompt();

  const toggleSelectAll = () => {
    if (selectedIds.size === eods.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eods.map(e => e.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  async function handleBatchReview(action: 'Approve' | 'Reject') {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const reason = action === 'Reject' ? await prompt("Enter rejection reason for selected reports:") : undefined;
    if (action === 'Reject' && (!reason || reason.trim() === '')) {
      alert("Rejection reason is required.");
      return;
    }

    setBatchLoading(true);
    setBatchError(null);

    const idempotencyKey = `batch-review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const res = await batchReviewEODAction({
      eod_ids: ids,
      action,
      rejection_reason: reason,
      idempotency_key: idempotencyKey,
    });

    setBatchLoading(false);

    if (res.success) {
      setSelectedIds(new Set());
      router.refresh();
    } else {
      const errMsg = res.error || (res.failed && res.failed.length > 0 ? `${res.failed.length} reports failed to update: ${res.failed[0].error}` : 'Batch review failed');
      setBatchError(errMsg);
      alert(errMsg);
      router.refresh();
    }
  }

  async function handleReview(eodId: string, action: 'Approve' | 'Reject') {
    const reason = action === 'Reject' ? await prompt("Enter rejection reason:") : undefined;
    
    if (action === 'Reject' && (!reason || reason.trim() === '')) {
      alert("Rejection reason is required.");
      return;
    }

    setLoading(eodId);
    
    const formData = new FormData();
    formData.append('eod_id', eodId);
    formData.append('action', action);
    if (reason) formData.append('rejection_reason', reason);

    const res = await reviewEODAction(formData);
    
    if (!res.success) {
      alert(res.error || 'Failed to review EOD');
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(eodId);
        return next;
      });
      router.refresh();
    }
    
    setLoading(null);
  }

  if (!eods || eods.length === 0) {
    return <div className="text-gray-500 bg-card text-card-foreground border-border p-6 rounded-lg border text-center">No pending EODs to review.</div>;
  }

  const allSelected = eods.length > 0 && selectedIds.size === eods.length;

  return (
    <div className="bg-card text-card-foreground border-border rounded-lg border shadow-sm overflow-hidden flex flex-col space-y-2">
      {/* Batch Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-muted/60 p-3 px-6 flex flex-wrap items-center justify-between gap-3 border-b border-border transition-all">
          <div className="text-sm font-medium">
            <span className="font-semibold text-primary">{selectedIds.size}</span> of {eods.length} reports selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={batchLoading}
              onClick={() => handleBatchReview('Approve')}
            >
              {batchLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              Approve Selected ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={batchLoading}
              onClick={() => handleBatchReview('Reject')}
            >
              {batchLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
              Reject Selected ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={batchLoading}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {batchError && (
        <div className="mx-6 my-2 p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          {batchError}
        </div>
      )}

      <div className="overflow-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all reports"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card text-card-foreground border-border divide-y divide-gray-200">
          {eods.map((eod) => {
            const isSelected = selectedIds.has(eod.id);
            return (
              <tr key={eod.id} className={isSelected ? 'bg-primary/5' : undefined}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelectOne(eod.id)}
                    aria-label={`Select report for ${eod.profiles?.first_name}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {eod.profiles?.first_name} {eod.profiles?.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {eod.report_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {eod.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCanonicalDuration(Number(eod.office_hours))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button 
                    onClick={() => handleReview(eod.id, 'Approve')}
                    disabled={loading === eod.id || batchLoading}
                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                  >
                    {loading === eod.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                  </Button>
                  <Button 
                    onClick={() => handleReview(eod.id, 'Reject')}
                    disabled={loading === eod.id || batchLoading}
                    className="text-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {loading === eod.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {PromptComponent}
    </div>
  );
}
