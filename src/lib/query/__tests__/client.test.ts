import { describe, expect, it, vi } from 'vitest';

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
