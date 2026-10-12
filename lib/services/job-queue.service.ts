import { createAdminClient } from '@/lib/supabase/server';

export interface JobDefinition<T = any, R = any> {
  id?: string;
  job_type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payload: T;
  result?: R;
  idempotency_key?: string;
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitterMs?: number;
}

/**
 * Concurrency limiter to bound parallel database / HTTP operations
 */
export function createConcurrencyLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    active--;
    if (queue.length > 0 && active < limit) {
      active++;
      const run = queue.shift();
      if (run) run();
    }
  };

  return async function runWithLimit<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    } else {
      active++;
    }

    try {
      return await task();
    } finally {
      next();
    }
  };
}

/**
 * Executes an async function with exponential backoff and jitter
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 200,
    maxDelayMs = 3000,
    backoffFactor = 2,
    jitterMs = 100,
  } = options;

  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err: any) {
      lastError = err;
      if (attempt === maxRetries) break;

      const delay = Math.min(
        initialDelayMs * Math.pow(backoffFactor, attempt) + Math.random() * jitterMs,
        maxDelayMs
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// In-memory fallback cache for idempotency and jobs if DB table is unmigrated
const inMemoryJobStore = new Map<string, JobDefinition>();

/**
 * Enqueue a background job with idempotency key and retry configuration
 */
export async function enqueueJob<T = any>(
  jobType: string,
  payload: T,
  options: { idempotencyKey?: string; maxRetries?: number } = {}
): Promise<{ success: boolean; job: JobDefinition; isDuplicate: boolean }> {
  const { idempotencyKey, maxRetries = 3 } = options;

  try {
    const supabase = await createAdminClient();

    // 1. Idempotency Check: if key provided, check for existing job
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          job: existing as JobDefinition,
          isDuplicate: true,
        };
      }
    }

    // 2. Insert new job
    const newJob = {
      job_type: jobType,
      status: 'PENDING' as const,
      payload,
      idempotency_key: idempotencyKey || null,
      retry_count: 0,
      max_retries: maxRetries,
      last_error: null,
    };

    const { data: inserted, error } = await supabase
      .from('background_jobs')
      .insert(newJob)
      .select('*')
      .single();

    if (error) {
      // If error is unique constraint on idempotency_key due to concurrent insert, fetch it
      if (idempotencyKey && (error.code === '23505' || error.message.includes('unique'))) {
        const { data: existingAfterConflict } = await supabase
          .from('background_jobs')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        if (existingAfterConflict) {
          return { success: true, job: existingAfterConflict as JobDefinition, isDuplicate: true };
        }
      }
      throw error;
    }

    return { success: true, job: inserted as JobDefinition, isDuplicate: false };
  } catch (err: any) {
    // In-memory fallback if background_jobs table does not exist
    if (idempotencyKey && inMemoryJobStore.has(idempotencyKey)) {
      return {
        success: true,
        job: inMemoryJobStore.get(idempotencyKey)!,
        isDuplicate: true,
      };
    }

    const fallbackJob: JobDefinition = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      job_type: jobType,
      status: 'PENDING',
      payload,
      idempotency_key: idempotencyKey,
      retry_count: 0,
      max_retries: maxRetries,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (idempotencyKey) {
      inMemoryJobStore.set(idempotencyKey, fallbackJob);
    }

    return { success: true, job: fallbackJob, isDuplicate: false };
  }
}

/**
 * Worker execution function to process a single job with retries and failure tracking
 */
export async function executeJobWithTracking<T = any, R = any>(
  job: JobDefinition<T, R>,
  handler: (payload: T) => Promise<R>
): Promise<{ status: 'COMPLETED' | 'FAILED'; result?: R; error?: string }> {
  try {
    const result = await withRetry(
      () => handler(job.payload),
      { maxRetries: job.max_retries }
    );

    await updateJobStatus(job.id, 'COMPLETED', result, null);
    if (job.idempotency_key && inMemoryJobStore.has(job.idempotency_key)) {
      const stored = inMemoryJobStore.get(job.idempotency_key)!;
      stored.status = 'COMPLETED';
      stored.result = result;
    }
    return { status: 'COMPLETED', result };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    await updateJobStatus(job.id, 'FAILED', null, errorMsg, (job.retry_count || 0) + 1);
    if (job.idempotency_key && inMemoryJobStore.has(job.idempotency_key)) {
      const stored = inMemoryJobStore.get(job.idempotency_key)!;
      stored.status = 'FAILED';
      stored.last_error = errorMsg;
      stored.retry_count++;
    }
    return { status: 'FAILED', error: errorMsg };
  }
}

async function updateJobStatus(
  jobId?: string,
  status?: string,
  result?: any,
  error?: string | null,
  retryCount?: number
) {
  if (!jobId || jobId.startsWith('mem-')) return;
  try {
    const supabase = await createAdminClient();
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (result !== undefined) updatePayload.result = result;
    if (error !== undefined) updatePayload.last_error = error;
    if (retryCount !== undefined) updatePayload.retry_count = retryCount;

    await supabase.from('background_jobs').update(updatePayload).eq('id', jobId);
  } catch {
    // Non-blocking
  }
}
