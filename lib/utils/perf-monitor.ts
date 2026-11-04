/**
 * TripleS ERP — Enterprise Performance Monitoring & Latency Tracer
 *
 * Lightweight, zero-overhead rolling performance telemetry for API routes,
 * Server Actions, and Supabase database operations.
 * Tracks P50, P95, P99, error rates, and identifies slowest operations.
 */

export interface MetricSample {
  operation: string;
  durationMs: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface OperationStats {
  operation: string;
  count: number;
  errorCount: number;
  errorRate: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

const MAX_SAMPLES_PER_OP = 200;
const rollingSamples = new Map<string, MetricSample[]>();

/**
 * Measure execution duration of an async operation with automatic latency recording.
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  let success = true;
  try {
    return await fn();
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    recordMetric({
      operation,
      durationMs,
      success,
      timestamp: Date.now(),
      metadata,
    });

    if (durationMs > 1000 && process.env.NODE_ENV !== 'production') {
      console.warn(`[SLOW OP WARNING] ${operation} took ${durationMs}ms`);
    }
  }
}

/**
 * Record a raw execution sample into the rolling window
 */
export function recordMetric(sample: MetricSample): void {
  let list = rollingSamples.get(sample.operation);
  if (!list) {
    list = [];
    rollingSamples.set(sample.operation, list);
  }

  list.push(sample);
  if (list.length > MAX_SAMPLES_PER_OP) {
    list.shift(); // Evict oldest sample to maintain ring buffer bounds
  }
}

/**
 * Calculate statistical percentiles (P50, P95, P99) for an operation
 */
export function getOperationStats(operation: string): OperationStats | null {
  const samples = rollingSamples.get(operation);
  if (!samples || samples.length === 0) return null;

  const sorted = [...samples].map((s) => s.durationMs).sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);
  const errorCount = samples.filter((s) => !s.success).length;

  const p50Idx = Math.floor(sorted.length * 0.5);
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p99Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));

  return {
    operation,
    count: samples.length,
    errorCount,
    errorRate: Math.round((errorCount / samples.length) * 10000) / 100,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    avgMs: Math.round((total / sorted.length) * 100) / 100,
    p50Ms: sorted[p50Idx],
    p95Ms: sorted[p95Idx],
    p99Ms: sorted[p99Idx],
  };
}

/**
 * Returns the top slowest operations across the entire application
 */
export function getSlowestOperations(limit: number = 20): OperationStats[] {
  const allStats: OperationStats[] = [];
  for (const op of rollingSamples.keys()) {
    const stats = getOperationStats(op);
    if (stats) allStats.push(stats);
  }

  return allStats.sort((a, b) => b.p95Ms - a.p95Ms).slice(0, limit);
}

/**
 * Clear metrics (useful between test runs)
 */
export function resetMetrics(): void {
  rollingSamples.clear();
}
