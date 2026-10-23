import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';

import { useLoanPaymentLink } from './useLoanPaymentLink';

type Mock = ReturnType<typeof vi.fn>;

const txn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-10',
  amount: -30000,
  description: 'EMI HDFC',
  source: 'manual',
  createdAt: '2026-07-10T00:00:00Z',
};

async function setupSelected() {
  (api.GET as Mock).mockImplementation((path: string) =>
    Promise.resolve({
      data:
        path === '/api/v1/loans'
          ? { content: [{ id: 'l1', name: 'Home' }] }
          : { pending: [{ seq: 3, dueDate: '2026-07-10', status: 'pending', emi: 30000 }] },
    }),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const hook = renderHook(() => useLoanPaymentLink({ transaction: txn, open: true, onOpenChange: vi.fn() }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  await waitFor(() => expect(hook.result.current.amount).toBe('30000'));
  act(() => hook.result.current.setLoanId('l1'));
  await waitFor(() => expect(hook.result.current.installmentSeq).toBe(3));
  return hook;
}

describe('useLoanPaymentLink amount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a field error and blocks submit for an invalid amount expression', async () => {
    const { result } = await setupSelected();
    expect(result.current.canSubmit).toBe(true);
    expect(result.current.amountError).toBeUndefined();
    for (const bad of ['100/0', '5+', '100-200']) {
      act(() => result.current.setAmount(bad));
      expect(result.current.canSubmit).toBe(false);
      expect(result.current.amountError).toBe('Enter an amount greater than zero');
      act(() => result.current.handleSubmit());
    }
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('sends the evaluated number for an expression', async () => {
    (api.POST as Mock).mockResolvedValue({ data: { installmentSeq: 3 } });
    const { result } = await setupSelected();
    act(() => result.current.setAmount('20000+10000'));
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect((api.POST as Mock).mock.calls[0][1].body).toMatchObject({ amount: 30000, installmentSeq: 3 });
  });
});
