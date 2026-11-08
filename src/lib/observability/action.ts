import { SpanStatusCode, trace } from '@opentelemetry/api';
import { unstable_rethrow } from 'next/navigation';

import { logger } from '@/lib/observability/logger';

const tracer = trace.getTracer('financeos-client');

let coldStartPending = true;

type Outcome = 'ok' | 'error' | 'rejected' | 'redirect' | 'not_found';

export interface ActionOptions {
  /** 'slow' (default) logs only calls taking 1s or more, or errors (thrown, 5xx, network); 'always' logs every call. Spans are always recorded. */
  log?: 'always' | 'slow';
}

const SLOW_MS = 1000;

/** True for Next's control-flow errors (redirect, notFound, forbidden, bailouts): they must pass through untouched. */
function isNextControlFlow(error: unknown): boolean {
  try {
    unstable_rethrow(error);
    return false;
  } catch {
    return true;
  }
}

/** Next's public API has no redirect/notFound predicates, so tell them apart by the error digest. */
function controlFlowOutcome(error: unknown): Outcome {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest === 'string' && digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404')) return 'not_found';
  return 'redirect';
}

/**
 * An ApiResult-style failure returned as data. Expected failures (4xx, validation, AppError codes) are 'rejected';
 * a backend 5xx, or an unexpected exception or network failure (UNKNOWN_ERROR with no HTTP status) is a real 'error'.
 */
function failure(result: unknown): { code?: string; outcome: 'rejected' | 'error'; status?: number } | null {
  if (typeof result !== 'object' || result === null || (result as { success?: unknown }).success !== false) return null;
  const rawCode = (result as { error?: { code?: unknown } }).error?.code;
  const code = typeof rawCode === 'string' ? rawCode : undefined;
  const rawStatus = (result as { status?: unknown }).status;
  const status = typeof rawStatus === 'number' ? rawStatus : undefined;
  const isError = (status !== undefined && status >= 500) || (status === undefined && (code === undefined || code === 'UNKNOWN_ERROR'));
  return { code, status, outcome: isError ? 'error' : 'rejected' };
}

/**
 * Wraps a server action in a `next.action <name>` span and logs its duration.
 * Same parameters and return type; redirect()/notFound() are rethrown untouched.
 */
export function action<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>,
  options: ActionOptions = {},
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    const startMs = Date.now();
    const coldStart = coldStartPending;
    coldStartPending = false;

    return tracer.startActiveSpan(`next.action ${name}`, async (span) => {
      let outcome: Outcome = 'ok';
      try {
        span.setAttribute('action.name', name);
        if (coldStart) span.setAttribute('faas.coldstart', true);
      } catch {
        // Telemetry must never break an action.
      }
      try {
        const result = await fn(...args);
        const failed = failure(result);
        if (failed) {
          outcome = failed.outcome;
          try {
            if (failed.code) span.setAttribute('error.code', failed.code);
            if (failed.status !== undefined) span.setAttribute('http.response.status_code', failed.status);
            if (failed.outcome === 'error') span.setStatus({ code: SpanStatusCode.ERROR });
          } catch {
            // ignore
          }
        }
        return result;
      } catch (error) {
        if (isNextControlFlow(error)) {
          outcome = controlFlowOutcome(error);
        } else {
          outcome = 'error';
          try {
            span.recordException(error instanceof Error ? error : String(error));
            span.setStatus({ code: SpanStatusCode.ERROR });
          } catch {
            // ignore
          }
        }
        throw error;
      } finally {
        try {
          span.setAttribute('outcome', outcome);
          span.end();
          const durationMs = Date.now() - startMs;
          if (options.log === 'always' || outcome === 'error' || durationMs >= SLOW_MS) {
            logger.log(outcome === 'error' ? 'WARN' : 'INFO', 'client.action.call', {
            action: name,
            outcome,
            durationMs,
          });
          }
        } catch {
          // ignore
        }
      }
    });
  };
}
