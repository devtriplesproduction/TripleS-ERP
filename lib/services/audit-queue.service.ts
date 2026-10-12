import { createAdminClient } from '@/lib/supabase/server';
import { withRetry } from './job-queue.service';

export interface AuditLogEntry {
  action: string;
  actor_email: string;
  user_id: string;
  target_user_id?: string | null;
  details?: any;
  severity?: string | null;
  timestamp?: string;
}

class AuditQueue {
  private buffer: AuditLogEntry[] = [];
  private isFlushing = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 25;
  private readonly flushIntervalMs = 1500;

  constructor() {
    // Non-blocking timer
  }

  /**
   * Enqueue an audit log entry for background batching
   */
  public enqueue(entry: AuditLogEntry) {
    this.buffer.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    if (this.buffer.length >= this.maxBatchSize) {
      // Immediate flush when buffer reaches threshold
      this.flush().catch((err) => console.error('[AuditQueue] Flush error:', err));
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush().catch((err) => console.error('[AuditQueue] Timer flush error:', err));
      }, this.flushIntervalMs);
    }
  }

  /**
   * Flush pending audit entries in batches
   */
  public async flush(): Promise<number> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.isFlushing || this.buffer.length === 0) return 0;
    this.isFlushing = true;

    const toProcess = this.buffer.splice(0, this.maxBatchSize);

    try {
      await withRetry(async () => {
        const supabase = await createAdminClient();
        const records = toProcess.map((e) => ({
          action: e.action,
          actor_email: e.actor_email,
          user_id: e.user_id,
          target_user_id: e.target_user_id || null,
          details: e.details || null,
          severity: e.severity || 'INFO',
          created_at: e.timestamp || new Date().toISOString(),
        }));

        const { error } = await supabase.from('activity_logs').insert(records);
        if (error) {
          if (error.code === 'PGRST205') {
            // Table unmigrated in remote environment, fall back gracefully
            return;
          }
          throw new Error(`Batch activity_logs insert failed: ${error.message}`);
        }
      }, { maxRetries: 2, initialDelayMs: 150 });

      return toProcess.length;
    } catch (err) {
      console.error('[AuditQueue] Failed to persist audit batch after retries:', err);
      // Re-queue items at the front (capped to prevent memory growth)
      if (this.buffer.length < 200) {
        this.buffer.unshift(...toProcess);
      }
      return 0;
    } finally {
      this.isFlushing = false;
      // If items remain in buffer, schedule next flush
      if (this.buffer.length > 0 && !this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          this.flush().catch(() => {});
        }, this.flushIntervalMs);
      }
    }
  }

  public get pendingCount(): number {
    return this.buffer.length;
  }
}

export const auditQueue = new AuditQueue();

/**
 * Queue non-critical EOD activity log asynchronously
 */
export function queueEodActivity(
  action: string,
  actor_email: string,
  user_id: string,
  target_user_id: string | null,
  details: any
) {
  auditQueue.enqueue({
    action,
    actor_email,
    user_id,
    target_user_id,
    details,
  });
}

/**
 * Explicitly flush any queued audit logs (e.g. before test completion or shutdown)
 */
export async function flushAuditQueue(): Promise<number> {
  return await auditQueue.flush();
}
