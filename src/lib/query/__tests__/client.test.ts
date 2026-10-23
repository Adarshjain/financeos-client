import { describe, expect, it, vi } from 'vitest';

import { claimAuthExpired } from '@/lib/authExpiry';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { makeQueryClient } from '@/lib/query/client';

describe('queryClient configuration', () => {
  it('calls errorLog.record with source: api on queryCache and mutationCache errors', () => {
    const spyRecord = vi.spyOn(errorLog, 'record').mockImplementation(() => ({} as never));

    const client = makeQueryClient();

    const queryCache = client.getQueryCache();
    const mutationCache = client.getMutationCache();

    const queryError = new Error('Query failed');
    // Simulate queryCache error
    queryCache.config.onError?.(queryError, {} as never);
    expect(spyRecord).toHaveBeenCalledWith(queryError, { source: 'api' });

    const mutationError = new Error('Mutation failed');
    // Simulate mutationCache error
    mutationCache.config.onError?.(mutationError, {} as never, {} as never, {} as never, {} as never);
    expect(spyRecord).toHaveBeenCalledWith(mutationError, { source: 'api' });
  });
});

describe('queryClient session expiry', () => {
  const expired = { success: false, error: { code: 'UNAUTHORIZED', message: 'x', timestamp: 't' } };
  const listen = () => {
    const handler = vi.fn();
    window.addEventListener('financeos:auth-expired', handler);
    return { handler, off: () => window.removeEventListener('financeos:auth-expired', handler) };
  };

  it('raises auth-expired when a server action result inside a query or mutation is a 401, once claimed', () => {
    const release = claimAuthExpired();
    const { handler, off } = listen();
    const client = makeQueryClient();
    client.getQueryCache().config.onSuccess?.(expired as never, {} as never);
    client.getMutationCache().config.onSuccess?.(expired as never, {} as never, {} as never, {} as never, {} as never);
    expect(handler).toHaveBeenCalledTimes(2);
    off();
    release();
  });

  it('ignores ordinary results and other errors', () => {
    const release = claimAuthExpired();
    const { handler, off } = listen();
    const client = makeQueryClient();
    client.getQueryCache().config.onSuccess?.({ success: true, data: 1 } as never, {} as never);
    client.getQueryCache().config.onSuccess?.({ success: false, error: { code: 'VALIDATION_ERROR' } } as never, {} as never);
    client.getQueryCache().config.onSuccess?.([1, 2] as never, {} as never);
    expect(handler).not.toHaveBeenCalled();
    off();
    release();
  });

  it('stays silent where nothing claimed the event (Legacy keeps its own behaviour)', () => {
    const { handler, off } = listen();
    makeQueryClient().getQueryCache().config.onSuccess?.(expired as never, {} as never);
    expect(handler).not.toHaveBeenCalled();
    off();
  });
});
