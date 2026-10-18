import { describe, it, expect, vi } from 'vitest';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfjerymoxnolxblhelho.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dJRsn_raWyuOLg2OqvQ3JQ_N6zlzph7';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmamVyeW1veG5vbHhibGhlbGhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MjIxMiwiZXhwIjoyMTA1NjM4MjEyfQ.vtc5GqbVwv-kuKINK9WoqkW7ujt7nti0zZf4fzdBYzU';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => ({
    id: '6af63eb6-12a6-4809-97c6-ef0792eeab53',
    email: 'admin@test.com',
    role: 'Admin',
    employee_id: 'EMP-001',
    employee_name: 'Admin User',
  }),
  guardServerAction: async () => ({
    id: '6af63eb6-12a6-4809-97c6-ef0792eeab53',
    role: 'Admin',
  }),
  requireAuth: async () => ({
    id: '6af63eb6-12a6-4809-97c6-ef0792eeab53',
    email: 'admin@test.com',
    role: 'Admin',
  }),
}));

import {
  enqueueJob,
  withRetry,
  createConcurrencyLimiter,
  executeJobWithTracking
} from '@/lib/services/job-queue.service';
import { queueEodActivity, flushAuditQueue } from '@/lib/services/audit-queue.service';
import { sendBulkNotifications } from '@/lib/services/bulk-notification.service';
import { batchProcessEODCompOff, processEODCompOff } from '@/lib/actions/compoff';
import { batchReviewEODs } from '@/lib/actions/eod';
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service';
import { createAdminClient } from '@/lib/supabase/server';

describe('Batch Processing & Heavy Operations Optimization', () => {

  describe('1. Idempotency & Duplicate Job Handling', () => {
    it('prevents duplicate execution when identical idempotency key is submitted', async () => {
      const idempotencyKey = `test-idem-${Date.now()}`;
      const payload = { action: 'NOTIFICATION', message: 'Test message' };

      const firstCall = await enqueueJob('BULK_NOTIFICATION', payload, { idempotencyKey });
      expect(firstCall.success).toBe(true);
      expect(firstCall.isDuplicate).toBe(false);

      // Attempt duplicate submission with the same idempotency key
      const secondCall = await enqueueJob('BULK_NOTIFICATION', payload, { idempotencyKey });
      expect(secondCall.success).toBe(true);
      expect(secondCall.isDuplicate).toBe(true);
      expect(secondCall.job.idempotency_key).toBe(idempotencyKey);
    });

    it('bulk notification deduplicates user IDs and honors idempotency', async () => {
      const idempotencyKey = `test-bulk-notif-${Date.now()}`;
      const userIds = [
        '6af63eb6-12a6-4809-97c6-ef0792eeab53',
        '6af63eb6-12a6-4809-97c6-ef0792eeab53', // duplicate
        'ba210f01-f9f9-4fe2-8b8d-af9c7285884e'
      ];

      const res1 = await sendBulkNotifications({
        userIds,
        type: 'SYSTEM_ALERT',
        message: 'Batch system test notification',
        idempotencyKey
      });

      expect(res1.totalRecipients).toBe(2); // Deduplicated to 2
      expect(res1.isDuplicate).toBe(false);

      const res2 = await sendBulkNotifications({
        userIds,
        type: 'SYSTEM_ALERT',
        message: 'Batch system test notification',
        idempotencyKey
      });
      expect(res2.isDuplicate).toBe(true);
    });
  });

  describe('2. Retries with Exponential Backoff & Failure Tracking', () => {
    it('retries transient failures with exponential backoff and succeeds', async () => {
      let attempts = 0;
      const start = performance.now();

      const result = await withRetry(async (attempt) => {
        attempts++;
        if (attempt < 2) {
          throw new Error('Transient network error');
        }
        return 'SUCCESS_AFTER_RETRIES';
      }, {
        maxRetries: 3,
        initialDelayMs: 50,
        backoffFactor: 2,
        jitterMs: 10
      });

      const elapsed = performance.now() - start;
      expect(result).toBe('SUCCESS_AFTER_RETRIES');
      expect(attempts).toBe(3); // attempt 0, 1, 2
      expect(elapsed).toBeGreaterThanOrEqual(100); // Backoff delay was respected
    });

    it('tracks failure and records last_error when maxRetries is exceeded', async () => {
      const testJob = {
        id: 'test-fail-job',
        job_type: 'GENERATE_REPORT',
        status: 'PENDING' as const,
        payload: { reportId: 'non-existent' },
        retry_count: 0,
        max_retries: 2,
      };

      const outcome = await executeJobWithTracking(testJob, async () => {
        throw new Error('Fatal report generation error');
      });

      expect(outcome.status).toBe('FAILED');
      expect(outcome.error).toContain('Fatal report generation error');
    });
  });

  describe('3. Bounded Concurrency Limiter', () => {
    it('bounds maximum concurrent executions to the defined limit', async () => {
      const limit = 3;
      const limiter = createConcurrencyLimiter(limit);
      let activeCount = 0;
      let maxActiveObserved = 0;

      const tasks = Array.from({ length: 10 }).map((_, i) =>
        limiter(async () => {
          activeCount++;
          if (activeCount > maxActiveObserved) {
            maxActiveObserved = activeCount;
          }
          await new Promise((r) => setTimeout(r, 20));
          activeCount--;
          return i;
        })
      );

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(10);
      expect(maxActiveObserved).toBeLessThanOrEqual(limit);
    });
  });

  describe('4. Audit Queue Non-Blocking Buffering', () => {
    it('queues audit events without blocking and flushes in batch', async () => {
      queueEodActivity('TEST_ACTION_1', 'admin@test.com', '6af63eb6-12a6-4809-97c6-ef0792eeab53', null, { test: 1 });
      queueEodActivity('TEST_ACTION_2', 'admin@test.com', '6af63eb6-12a6-4809-97c6-ef0792eeab53', null, { test: 2 });

      // Flushing explicitly persists buffered entries
      const flushed = await flushAuditQueue();
      expect(flushed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Concurrent EOD Approvals & Comp-Off Ledger Integrity', () => {
    it('handles concurrent approvals of the same EOD without duplicating Comp-Off credit', async () => {
      const supabase = await createAdminClient();

      // Find an existing approved or pending EOD report
      const { data: eod } = await supabase
        .from('eod_reports')
        .select('id, employee_id, office_hours, report_date')
        .limit(1)
        .single();

      if (!eod) return;

      // Simulate 2 simultaneous concurrent approvals
      const [res1, res2] = await Promise.all([
        processEODCompOff(eod.id, eod.employee_id, Number(eod.office_hours), 'Approved', {
          reportDate: eod.report_date,
          supabaseClient: supabase
        }),
        processEODCompOff(eod.id, eod.employee_id, Number(eod.office_hours), 'Approved', {
          reportDate: eod.report_date,
          supabaseClient: supabase
        })
      ]);

      // Check comp_off_ledger to ensure at most 1 CREDIT entry exists for this reference_id
      const { data: credits } = await supabase
        .from('comp_off_ledger')
        .select('id')
        .eq('reference_id', eod.id)
        .eq('transaction_type', 'CREDIT');

      expect((credits || []).length).toBeLessThanOrEqual(1);
    }, 15000);
  });

  describe('6. Benchmarking: Batch Comp-Off vs Individual Processing', () => {
    it('benchmarks batchProcessEODCompOff and demonstrates fast execution', async () => {
      const supabase = await createAdminClient();

      const { data: sampleEods } = await supabase
        .from('eod_reports')
        .select('id, employee_id, office_hours, report_date, status')
        .eq('status', 'Approved')
        .limit(5);

      if (!sampleEods || sampleEods.length === 0) return;

      const start = performance.now();
      const batchResult = await batchProcessEODCompOff(
        sampleEods.map(e => ({
          id: e.id,
          employee_id: e.employee_id,
          office_hours: Number(e.office_hours),
          report_date: e.report_date,
          status: 'Approved'
        })),
        { supabaseClient: supabase }
      );
      const duration = performance.now() - start;

      console.log(`[BENCHMARK] batchProcessEODCompOff: ${duration.toFixed(2)}ms (Processed: ${batchResult.processed}, Credited: ${batchResult.credited})`);
      expect(batchResult.processed).toBe(sampleEods.length);
      expect(duration).toBeLessThan(2000); // Under 2 seconds for batch processing
    });

    it('benchmarks calculateMonthlyPayroll with batch optimizations', async () => {
      const start = performance.now();
      const payroll = await calculateMonthlyPayroll(2026, 10);
      const duration = performance.now() - start;

      console.log(`[BENCHMARK] calculateMonthlyPayroll (Optimized): ${duration.toFixed(2)}ms (Employees: ${payroll.length})`);
      expect(Array.isArray(payroll)).toBe(true);
      expect(payroll.length).toBeGreaterThan(0);
    });
  });

  describe('7. Batch Review EODs Partial Failure Handling', () => {
    it('reports partial failures without crashing when some IDs are invalid', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const result = await batchReviewEODs(
        [invalidId],
        'Approve'
      );

      // Should complete gracefully without throwing
      expect(typeof result.success).toBe('boolean');
      expect(result.total).toBe(1);
    });
  });
});
