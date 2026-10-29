import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/renderWithQuery';

import { useDividendReconcile } from './useDividendReconcile';

const http = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  api: http,
}));

const sonner = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: sonner }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

const item = {
  dividend: { id: 'd1', tds: null },
  candidates: [{ tier: 'EXACT', reasons: [], impliedTds: null, transaction: { id: 'c1' } }],
};

beforeEach(() => {
  vi.clearAllMocks();
  http.GET.mockResolvedValue({ data: { items: [item], unresolvedCount: 1, withCandidates: 1, coverageEnd: null } });
});

async function loaded(notify?: (m: string, t?: 'danger') => void) {
  const view = renderHook(() => useDividendReconcile({ notify }), { wrapper });
  await act(async () => {
    await view.result.current.refetch();
  });
  await waitFor(() => expect(view.result.current.items).toHaveLength(1));
  return view;
}

describe('useDividendReconcile: where results go', () => {
  it('reports through the notifier it is given, not the Legacy toaster', async () => {
    http.POST.mockResolvedValue({ data: { linked: [{}], skipped: [{ reason: 'Already linked' }] } });
    const notify = vi.fn();
    const view = await loaded(notify);
    await act(async () => {
      await view.result.current.confirmOne('d1');
    });
    expect(notify).toHaveBeenCalledWith('Linked 1 of 1', undefined);
    expect(notify).toHaveBeenCalledWith('Already linked', 'danger');
    expect(sonner.success).not.toHaveBeenCalled();
    expect(sonner.error).not.toHaveBeenCalled();
  });

  it('says a failed confirm through the notifier too', async () => {
    http.POST.mockRejectedValue(new Error('x'));
    const notify = vi.fn();
    const view = await loaded(notify);
    await act(async () => {
      await view.result.current.confirmAll();
    });
    expect(notify).toHaveBeenCalledWith("Couldn't link dividends. Try again.", 'danger');
  });

  it('keeps using the Legacy toaster without a notifier', async () => {
    http.POST.mockResolvedValue({ data: { linked: [{}], skipped: [] } });
    const view = await loaded();
    await act(async () => {
      await view.result.current.confirmOne('d1');
    });
    expect(sonner.success).toHaveBeenCalledWith('Linked 1 of 1');
  });
});
