import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { useObligations } from '../useObligations';

function setup() {
  const qc = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('useObligations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requests months with undefined kinds when none given and returns items', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { items: [{ type: 'emi' }] } } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => useObligations(3), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ type: 'emi' }]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/obligations/upcoming', {
      params: { query: { months: 3, kinds: undefined } },
    });
  });

  it('joins kinds as CSV; an empty list sends none', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { items: [] } } as never);
    const { wrapper } = setup();
    renderHook(() => useObligations(6, ['emi', 'card_bill']), { wrapper });
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(vi.mocked(api.GET).mock.calls[0][1]).toEqual({ params: { query: { months: 6, kinds: 'emi,card_bill' } } });

    vi.mocked(api.GET).mockClear();
    renderHook(() => useObligations(1, []), { wrapper });
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(vi.mocked(api.GET).mock.calls[0][1]).toEqual({ params: { query: { months: 1, kinds: undefined } } });
  });

  it('returns [] when the response has no data', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => useObligations(3), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('caches under keys.obligations.upcoming so the server prefetch key matches', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { items: [{ type: 'emi' }] } } as never);
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useObligations(3), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryData(keys.obligations.upcoming({ months: 3, kinds: undefined }))).toEqual([{ type: 'emi' }]);
  });
});
