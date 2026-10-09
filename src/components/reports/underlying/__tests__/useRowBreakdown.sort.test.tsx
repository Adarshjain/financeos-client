import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { useBreakdownSection } from '../useRowBreakdown';

const SECTION = '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}';

describe('useBreakdownSection sort', () => {
  let client: ReturnType<typeof createTestQueryClient>;
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    client = createTestQueryClient();
    vi.mocked(api.GET).mockResolvedValue({ data: { type: 'TABLE', mode: 'raw' } } as never);
  });

  it('fetches page 0 when sorted (the embedded page is unsorted), sending sort=key,dir', async () => {
    const { result } = renderHook(
      () => useBreakdownSection('net_worth', 'a1', 'transactions', 0, 25, { key: 'amount', direction: 'desc' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.data).toEqual({ type: 'TABLE', mode: 'raw' }));
    expect(api.GET).toHaveBeenCalledWith(SECTION, {
      params: {
        path: { name: 'net_worth', rowId: 'a1', section: 'transactions' },
        query: { page: 0, size: 25, sort: 'amount,desc' },
      },
    });
  });

  it('sends a later page with its sort', async () => {
    const { result } = renderHook(
      () => useBreakdownSection('net_worth', 'a1', 'transactions', 3, 25, { key: 'date', direction: 'asc' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith(SECTION, {
      params: {
        path: { name: 'net_worth', rowId: 'a1', section: 'transactions' },
        query: { page: 3, size: 25, sort: 'date,asc' },
      },
    });
  });

  it('keys the cache by sort, so each sort of a page is its own entry', async () => {
    const { result, rerender } = renderHook(
      ({ dir }: { dir: 'asc' | 'desc' }) =>
        useBreakdownSection('net_worth', 'a1', 'transactions', 0, 25, { key: 'amount', direction: dir }),
      { wrapper: Wrapper, initialProps: { dir: 'asc' } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ dir: 'desc' });
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(2));
    const desc = keys.reports.breakdown('net_worth', 'a1', { section: 'transactions', page: 0, size: 25, sort: 'amount,desc' });
    await waitFor(() => expect(client.getQueryData(desc)).toBeDefined());
    const sorts = (vi.mocked(api.GET).mock.calls as unknown as [string, { params: { query: { sort?: string } } }][]).map(
      ([, init]) => init.params.query.sort,
    );
    expect(sorts).toEqual(['amount,asc', 'amount,desc']);
  });
});
