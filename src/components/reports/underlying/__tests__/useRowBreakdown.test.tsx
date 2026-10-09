import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { useBreakdownSection, useRowBreakdown } from '../useRowBreakdown';

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

describe('useRowBreakdown', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: { title: 'HDFC' } } as never);
  });

  it('reads the breakdown with 25-row sections', async () => {
    const { result } = renderHook(() => useRowBreakdown('net_worth', 'a1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ title: 'HDFC' }));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', {
      params: { path: { name: 'net_worth', rowId: 'a1' }, query: { size: 25 } },
    });
  });

});

describe('useBreakdownSection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: { type: 'TABLE', mode: 'raw' } } as never);
  });

  it('does not fetch page 0 (it comes with the breakdown)', async () => {
    const { result } = renderHook(() => useBreakdownSection('net_worth', 'a1', 'transactions', 0, 25), {
      wrapper: Wrapper,
    });
    await Promise.resolve();
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('reads a later page from the section endpoint', async () => {
    const { result } = renderHook(() => useBreakdownSection('net_worth', 'a1', 'transactions', 2, 25), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual({ type: 'TABLE', mode: 'raw' }));
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}',
      { params: { path: { name: 'net_worth', rowId: 'a1', section: 'transactions' }, query: { page: 2, size: 25 } } },
    );
  });
});
