import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { useDuplicateReport } from '../useDuplicateReport';

function setup() {
  const qc = createTestQueryClient();
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { spy, ...renderHook(() => useDuplicateReport(), { wrapper }) };
}

const src = {
  id: 'r1',
  name: 'Spend',
  description: 'desc',
  type: 'CHART',
  datasource: 'transactions',
  definition: { a: 1 },
  createdAt: 'x',
  updatedAt: 'y',
};

beforeEach(() => vi.resetAllMocks());

describe('useDuplicateReport', () => {
  it('fetches the source and creates "<name> (copy)" carrying only name/description/type/datasource/definition', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: src } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'r2' } } as never);
    const { result, spy } = setup();
    await act(async () => {
      await result.current.mutateAsync('r1');
    });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'r1' } } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reports', {
      body: { name: 'Spend (copy)', description: 'desc', type: 'CHART', datasource: 'transactions', definition: { a: 1 } },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.reports.all });
    expect(toast.success).toHaveBeenCalledWith('Report duplicated');
  });

  it('fails with a toast and no create when the source is missing', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    const { result, spy } = setup();
    await act(async () => {
      await result.current.mutateAsync('r1').catch(() => {});
    });
    expect(api.POST).not.toHaveBeenCalled();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to duplicate report'));
    expect(spy).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('surfaces a create error without invalidating', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: src } as never);
    vi.mocked(api.POST).mockResolvedValue({ error: { message: 'bad' } } as never);
    const { result, spy } = setup();
    await act(async () => {
      await result.current.mutateAsync('r1').catch(() => {});
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith({ message: 'bad' }, 'Failed to duplicate report'));
    expect(spy).not.toHaveBeenCalled();
  });
});
