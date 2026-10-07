import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { toast } from 'sonner';

import { useDividendDialog } from '@/app/(protected)/investments/dialogs/dividend/useDividendDialog';
import type { Broker } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { createTestQueryClient } from '@/test/renderWithQuery';

const brokers = [{ id: 'broker-1', name: 'Zerodha' }] as unknown as Broker[];
const submitEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

function setup(props: Partial<Parameters<typeof useDividendDialog>[0]> = {}) {
  const queryClient = createTestQueryClient();
  const setOpen = vi.fn();
  const onSuccess = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    (p: { open: boolean }) =>
      useDividendDialog({
        brokerAccounts: brokers,
        initialInstrumentId: 'inst-1',
        open: p.open,
        setOpen,
        onSuccess,
        ...props,
      }),
    { wrapper, initialProps: { open: false } },
  );
  return { ...hook, queryClient, setOpen, onSuccess };
}

describe('useDividendDialog prefill + link props', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'new-1' } } as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'new-1' } } as never);
  });

  it('seeds amount and pay date from initialAmount / initialPayDate', () => {
    const { result } = setup({ initialAmount: 1234.5, initialPayDate: '2026-03-12' });
    expect(result.current.amount).toBe('1234.5');
    expect(result.current.payDate).toBe('2026-03-12');
  });

  it('leaves amount blank and pay date = today without the props (unchanged default)', () => {
    const { result } = setup();
    expect(result.current.amount).toBe('');
    expect(result.current.payDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('re-applies the prefill each time the dialog opens in create mode', () => {
    const { result, rerender } = setup({ initialAmount: 500, initialPayDate: '2026-02-01' });
    act(() => {
      result.current.setAmount('999');
      result.current.setPayDate('2026-05-05');
    });
    rerender({ open: true });
    expect(result.current.amount).toBe('500');
    expect(result.current.payDate).toBe('2026-02-01');
  });

  it('does not clobber typed values on open when no prefill is supplied', () => {
    const { result, rerender } = setup();
    act(() => result.current.setAmount('42'));
    rerender({ open: true });
    expect(result.current.amount).toBe('42');
  });

  it('creates, then PUTs the link with updateTds:false and toasts "recorded and linked"', async () => {
    const { result, setOpen, onSuccess, queryClient } = setup({
      initialAmount: 900,
      initialPayDate: '2026-03-10',
      linkTransactionId: 'tx-77',
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/dividends', {
      body: expect.objectContaining({ brokerAccountId: 'broker-1', instrumentId: 'inst-1', amount: 900, payDate: '2026-03-10' }),
    });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'new-1' } },
      body: { transactionId: 'tx-77', updateTds: false },
    });
    expect(toast.success).toHaveBeenCalledWith('Dividend recorded and linked');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('does not call the link endpoint without linkTransactionId and keeps the plain toast', async () => {
    const { result } = setup({ initialAmount: 900 });
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });
    expect(api.PUT).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Dividend recorded');
  });

  it('does not link when validation fails before the create', async () => {
    const { result } = setup({ linkTransactionId: 'tx-77' }); // no amount
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });
    expect(api.POST).not.toHaveBeenCalled();
    expect(api.PUT).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Please enter a valid amount.');
  });

  it('a failed link after a successful create still counts as recorded, and reports the link failure', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new Error('already linked'));
    const { result, setOpen, onSuccess } = setup({ initialAmount: 900, linkTransactionId: 'tx-77' });
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });
    expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Dividend recorded, but linking the bank credit failed');
    expect(toast.success).toHaveBeenCalledWith('Dividend recorded');
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('a failed create reports the error and never attempts the link', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('nope'));
    const { result, setOpen } = setup({ initialAmount: 900, linkTransactionId: 'tx-77' });
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });
    expect(api.PUT).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to save dividend');
    expect(setOpen).not.toHaveBeenCalled();
  });

  it('ignores linkTransactionId in edit mode', async () => {
    const dividend = {
      id: 'd1',
      brokerAccountId: 'broker-1',
      instrumentId: 'inst-1',
      type: 'dividend' as const,
      amount: 100,
      payDate: '2026-01-01',
    };
    const { result } = setup({ mode: 'edit', dividend, linkTransactionId: 'tx-77' });
    vi.mocked(api.PUT).mockResolvedValue({ data: dividend } as never);
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });
    expect(api.PUT).toHaveBeenCalledTimes(1);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}', expect.anything());
    expect(toast.success).toHaveBeenCalledWith('Dividend updated');
  });
});
