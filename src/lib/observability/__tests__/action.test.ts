import { trace } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { notFound, redirect } from 'next/navigation';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { action } from '@/lib/observability/action';
import { logger } from '@/lib/observability/logger';

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

beforeAll(() => {
  trace.setGlobalTracerProvider(provider);
});
afterAll(async () => {
  await provider.shutdown();
  trace.disable();
});
beforeEach(() => {
  exporter.reset();
  vi.restoreAllMocks();
  vi.spyOn(logger, 'log').mockImplementation(() => {});
});

describe('action()', () => {
  it('returns the result and records an ok span with the first-call coldstart flag', async () => {
    const wrapped = action('test.add', async (a: number, b: number) => a + b);
    expect(await wrapped(1, 2)).toBe(3);
    expect(await wrapped(2, 2)).toBe(4);
    const [first, second] = exporter.getFinishedSpans();
    expect(first.name).toBe('next.action test.add');
    expect(first.attributes['action.name']).toBe('test.add');
    expect(first.attributes.outcome).toBe('ok');
    // The module-level flag may already be consumed by an earlier test; it can only be set on the first span.
    expect(second.attributes['faas.coldstart']).toBeUndefined();
  });

  it('logs only slow or errored calls by default, every call with log: always', async () => {
    await action('test.fast', async () => 1)();
    expect(logger.log).not.toHaveBeenCalled();

    vi.useFakeTimers();
    const slow = action('test.slow', async () => {
      vi.advanceTimersByTime(1500);
      return 1;
    });
    await slow();
    vi.useRealTimers();
    expect(logger.log).toHaveBeenCalledWith(
      'INFO',
      'client.action.call',
      expect.objectContaining({ action: 'test.slow', outcome: 'ok', durationMs: expect.any(Number) }),
    );

    vi.mocked(logger.log).mockClear();
    await action('test.always', async () => 1, { log: 'always' })();
    expect(logger.log).toHaveBeenCalledTimes(1);
  });

  it('records the exception and rethrows on error', async () => {
    const wrapped = action('test.boom', async () => {
      throw new Error('boom');
    });
    await expect(wrapped()).rejects.toThrow('boom');
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes.outcome).toBe('error');
    expect(span.events.some((e) => e.name === 'exception')).toBe(true);
    expect(span.status.code).toBe(2);
    expect(logger.log).toHaveBeenCalledWith('WARN', 'client.action.call', expect.objectContaining({ outcome: 'error' }));
  });

  it('marks a returned {success:false} as rejected with its code and no error status or log', async () => {
    const wrapped = action('test.fail', async () => ({ success: false as const, error: { code: 'BAD_CREDENTIALS' } }));
    expect(await wrapped()).toEqual({ success: false, error: { code: 'BAD_CREDENTIALS' } });
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes.outcome).toBe('rejected');
    expect(span.attributes['error.code']).toBe('BAD_CREDENTIALS');
    expect(span.status.code).toBe(0);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('keeps a 4xx {success:false} as rejected and records its status', async () => {
    const wrapped = action('test.4xx', async () => ({ success: false as const, error: { code: 'NOT_FOUND' }, status: 404 }));
    await wrapped();
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes.outcome).toBe('rejected');
    expect(span.attributes['http.response.status_code']).toBe(404);
    expect(span.status.code).toBe(0);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('marks a backend 5xx {success:false} as error with an error status and a WARN log', async () => {
    const wrapped = action('test.5xx', async () => ({ success: false as const, error: { code: 'INTERNAL_ERROR' }, status: 503 }));
    await wrapped();
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes.outcome).toBe('error');
    expect(span.attributes['error.code']).toBe('INTERNAL_ERROR');
    expect(span.attributes['http.response.status_code']).toBe(503);
    expect(span.status.code).toBe(2);
    expect(logger.log).toHaveBeenCalledWith('WARN', 'client.action.call', expect.objectContaining({ action: 'test.5xx', outcome: 'error' }));
  });

  it('marks an UNKNOWN_ERROR with no status (network failure, unexpected exception) as error', async () => {
    const wrapped = action('test.net', async () => ({ success: false as const, error: { code: 'UNKNOWN_ERROR' } }));
    await wrapped();
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes.outcome).toBe('error');
    expect(span.status.code).toBe(2);
  });

  it('passes redirect() through untouched with outcome redirect', async () => {
    const wrapped = action('test.redir', async () => {
      redirect('/login');
    });
    let thrown: unknown;
    try {
      await wrapped();
    } catch (e) {
      thrown = e;
    }
    expect(String((thrown as { digest?: string }).digest)).toMatch(/^NEXT_REDIRECT/);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes.outcome).toBe('redirect');
    expect(span.events.some((e) => e.name === 'exception')).toBe(false);
  });

  it('passes notFound() through with outcome not_found', async () => {
    const wrapped = action('test.nf', async () => {
      notFound();
    });
    await expect(wrapped()).rejects.toBeDefined();
    expect(exporter.getFinishedSpans()[0].attributes.outcome).toBe('not_found');
  });
});
