import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { flushAuditQueue } from '@/lib/services/audit-queue.service';
import { sendBulkNotifications } from '@/lib/services/bulk-notification.service';
import { batchReviewEODs } from '@/lib/actions/eod';
import { executeJobWithTracking, JobDefinition } from '@/lib/services/job-queue.service';

export const dynamic = 'force-dynamic';

/**
 * Worker endpoint for executing scheduled / queued background jobs
 * Compatible with Vercel Cron and authenticated internal server requests
 */
export async function POST(req: NextRequest) {
  // Authorization check: Verify CRON_SECRET or bearer token
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const results: any[] = [];

  try {
    // 1. Flush any pending non-critical audit log buffers
    const flushedAudits = await flushAuditQueue();

    // 2. Fetch pending background jobs from database
    const supabase = await createAdminClient();
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error || !jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending background jobs to process',
        flushedAudits,
        processed: 0,
      });
    }

    for (const job of jobs as JobDefinition[]) {
      let outcome: any;

      if (job.job_type === 'BULK_NOTIFICATION') {
        outcome = await executeJobWithTracking(job, async (payload) => {
          return await sendBulkNotifications(payload);
        });
      } else if (job.job_type === 'BATCH_EOD_REVIEW') {
        outcome = await executeJobWithTracking(job, async (payload) => {
          return await batchReviewEODs(
            payload.eod_ids,
            payload.action,
            payload.rejection_reason,
            { idempotencyKey: job.idempotency_key }
          );
        });
      } else {
        outcome = { status: 'FAILED', error: `Unknown job_type: ${job.job_type}` };
      }

      results.push({ jobId: job.id, type: job.job_type, outcome });
    }

    return NextResponse.json({
      success: true,
      flushedAudits,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[Worker API] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Worker processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
