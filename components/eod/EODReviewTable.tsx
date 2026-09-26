// @ts-nocheck
'use client';

import { useState } from 'react';
import { reviewEODAction } from '@/actions/eod.actions';
import { useRouter } from 'next/navigation';
import { EODReport } from '@/lib/actions/eod';
import { usePrompt } from "@/hooks/use-prompt";
import { Button } from "@/components/ui/button";

export function EODReviewTable({ eods }: { eods: (EODReport & { profiles: { first_name: string, last_name: string, employee_id: string } | null })[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const { prompt, PromptComponent } = usePrompt();

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
      router.refresh();
    }
    
    setLoading(null);
  }

  if (!eods || eods.length === 0) {
    return <div className="text-gray-500 bg-card text-card-foreground border-border p-6 rounded-lg border text-center">No pending EODs to review.</div>;
  }

  return (
    <div className="bg-card text-card-foreground border-border rounded-lg border shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-card text-card-foreground border-border divide-y divide-gray-200">
          {eods.map((eod) => (
            <tr key={eod.id}>
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
                {eod.office_hours}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <Button 
                  onClick={() => handleReview(eod.id, 'Approve')}
                  disabled={loading === eod.id}
                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                >
                  Approve
                </Button>
                <Button 
                  onClick={() => handleReview(eod.id, 'Reject')}
                  disabled={loading === eod.id}
                  className="text-zinc-900 dark:text-zinc-100 hover:text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                >
                  Reject
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {PromptComponent}
    </div>
  );
}
