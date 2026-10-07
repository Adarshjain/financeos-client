import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dividendsApi } from '@/lib/apiClient';

describe('dividendsApi.receiptSummary', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const payload = { buckets: [], coverageEnd: '2026-03-31', totalCount: 0 };

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });

  const lastUrl = () => {
    const arg = fetchSpy.mock.calls[0][0] as Request | string;
    return new URL(typeof arg === 'string' ? arg : arg.url);
  };

  it('GETs receipts/summary with no query when unfiltered and returns the body', async () => {
    const result = await dividendsApi.receiptSummary();
    expect(result).toEqual(payload);
    const url = lastUrl();
    expect(url.pathname).toBe('/api/v1/investments/dividends/receipts/summary');
    expect(url.search).toBe('');
  });

  it('forwards holdingId, brokerAccountId, instrumentId and type', async () => {
    await dividendsApi.receiptSummary({ holdingId: 'h', brokerAccountId: 'b', instrumentId: 'i', type: 'interest' });
    const q = lastUrl().searchParams;
    expect(q.get('holdingId')).toBe('h');
    expect(q.get('brokerAccountId')).toBe('b');
    expect(q.get('instrumentId')).toBe('i');
    expect(q.get('type')).toBe('interest');
  });
});
