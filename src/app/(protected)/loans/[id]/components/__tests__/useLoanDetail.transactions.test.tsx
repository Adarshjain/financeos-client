import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import type { InstallmentDto } from '@/lib/types';

import { useLoanDetail } from '../useLoanDetail';

type Mock = ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function mockApiGet() {
  (api.GET as Mock).mockImplementation((path: string) => {
    if (path.includes('/schedule')) return Promise.resolve({ data: {} });
    if (path.includes('/match-suggestions')) return Promise.resolve({ data: { suggestions: [] } });
    return Promise.resolve({ data: { loan: { id: 'loan-1' }, events: [], charges: [] } });
  });
}

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

function makeTx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    accountId: 'acc-1',
    date: '2026-03-10',
    amount: -4500,
    source: 'manual',
    createdAt: '2026-03-10T00:00:00Z',
    ...overrides,
  };
}

const installment: InstallmentDto = {
  seq: 1,
  dueDate: '2026-03-05',
  openingBalance: 100000,
  emi: 5000,
  interest: 500,
  principal: 4500,
  closingBalance: 95000,
  status: 'upcoming',
};

function renderLoanDetail() {
  return renderHook(() => useLoanDetail({ loanId: 'loan-1' }), { wrapper: createWrapper() });
}

describe('useLoanDetail transaction links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    (api.POST as Mock).mockResolvedValue({ data: { id: 'created-1' } });
    (api.DELETE as Mock).mockResolvedValue({ data: null });
  });

  describe('payment payload', () => {
    it('carries transactionId when a transaction is picked', async () => {
      const { result } = renderLoanDetail();

      act(() => result.current.handleOpenMarkPaid(installment));
      act(() => result.current.onSelectPaymentTx(makeTx({ id: 'tx-pay' })));

      await act(async () => {
        await result.current.handleSettlePayment(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', {
        params: { path: { id: 'loan-1' } },
        body: expect.objectContaining({ transactionId: 'tx-pay' }),
      });
    });

    it('omits transactionId when no transaction is picked', async () => {
      const { result } = renderLoanDetail();

      act(() => result.current.handleOpenMarkPaid(installment));

      await act(async () => {
        await result.current.handleSettlePayment(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', {
        params: { path: { id: 'loan-1' } },
        body: expect.objectContaining({ transactionId: undefined }),
      });
    });
  });

  describe('charge payload', () => {
    it('carries transactionId when a transaction is picked', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setChargeAmount('2500');
      });
      act(() => result.current.onSelectChargeTx(makeTx({ id: 'tx-charge', amount: -2500 })));

      await act(async () => {
        await result.current.handleAddCharge(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/charges', {
        params: { path: { id: 'loan-1' } },
        body: expect.objectContaining({ transactionId: 'tx-charge' }),
      });
    });

    it('omits transactionId when no transaction is picked', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setChargeAmount('2500');
      });

      await act(async () => {
        await result.current.handleAddCharge(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/charges', {
        params: { path: { id: 'loan-1' } },
        body: expect.objectContaining({ transactionId: undefined }),
      });
    });
  });

  describe('event payload', () => {
    it('carries transactionId when a transaction is picked', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setEventType('prepayment');
        result.current.setEventAmount('10000');
      });
      act(() => result.current.onSelectEventTx(makeTx({ id: 'tx-event', amount: -10000 })));

      await act(async () => {
        await result.current.handleAddEvent(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/events', {
        params: { path: { id: 'loan-1' } },
        body: expect.objectContaining({ transactionId: 'tx-event' }),
      });
    });

    it('omits transactionId when no transaction is picked', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setEventType('prepayment');
        result.current.setEventAmount('10000');
      });

      await act(async () => {
        await result.current.handleAddEvent(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/events', {
        params: { path: { id: 'loan-1' } },
        body: expect.objectContaining({ transactionId: undefined }),
      });
    });
  });

  describe('prefill-when-empty and no-overwrite', () => {
    it('prefills paymentAmount (abs) and paymentDate from the selected transaction when both are empty', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.onSelectPaymentTx(makeTx({ id: 't1', amount: -4500, date: '2026-04-01' })));

      expect(result.current.paymentAmount).toBe('4500');
      expect(result.current.paymentDate).toBe('2026-04-01');
    });

    it('does not overwrite an already-filled paymentAmount/paymentDate', () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setPaymentAmount('999');
        result.current.setPaymentDate('2026-01-01');
      });
      act(() => result.current.onSelectPaymentTx(makeTx({ id: 't1', amount: -4500, date: '2026-04-01' })));

      expect(result.current.paymentAmount).toBe('999');
      expect(result.current.paymentDate).toBe('2026-01-01');
    });

    it('prefills chargeAmount (abs) and chargeDate from the selected transaction when both are empty', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.setChargeDate(''));
      act(() => result.current.onSelectChargeTx(makeTx({ id: 't2', amount: -750, date: '2026-05-02' })));

      expect(result.current.chargeAmount).toBe('750');
      expect(result.current.chargeDate).toBe('2026-05-02');
    });

    it('does not overwrite an already-filled chargeAmount/chargeDate', () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setChargeAmount('321');
        result.current.setChargeDate('2026-02-02');
      });
      act(() => result.current.onSelectChargeTx(makeTx({ id: 't2', amount: -750, date: '2026-05-02' })));

      expect(result.current.chargeAmount).toBe('321');
      expect(result.current.chargeDate).toBe('2026-02-02');
    });

    it('prefills eventAmount and effectiveDate from the selected transaction when both are empty', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.setEffectiveDate(''));
      act(() => result.current.onSelectEventTx(makeTx({ id: 't3', amount: -12000, date: '2026-06-15' })));

      expect(result.current.eventAmount).toBe('12000');
      expect(result.current.effectiveDate).toBe('2026-06-15');
    });

    it('does not overwrite an already-filled eventAmount/effectiveDate', () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setEventAmount('55');
        result.current.setEffectiveDate('2026-03-03');
      });
      act(() => result.current.onSelectEventTx(makeTx({ id: 't3', amount: -12000, date: '2026-06-15' })));

      expect(result.current.eventAmount).toBe('55');
      expect(result.current.effectiveDate).toBe('2026-03-03');
    });
  });

  describe('eventType change clears eventTx', () => {
    it('clears the selected eventTx when eventType changes', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.onSelectEventTx(makeTx({ id: 't1' })));
      expect(result.current.eventTx).not.toBeNull();

      act(() => result.current.setEventType('prepayment'));

      expect(result.current.eventTx).toBeNull();
    });
  });

  describe('reset on dialog open/close and after success', () => {
    it('resets paymentTx whenever markPaidOpen is set to true or false', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.onSelectPaymentTx(makeTx({ id: 't1' })));
      expect(result.current.paymentTx).not.toBeNull();
      act(() => result.current.setMarkPaidOpen(true));
      expect(result.current.paymentTx).toBeNull();

      act(() => result.current.onSelectPaymentTx(makeTx({ id: 't1' })));
      expect(result.current.paymentTx).not.toBeNull();
      act(() => result.current.setMarkPaidOpen(false));
      expect(result.current.paymentTx).toBeNull();
    });

    it('resets eventTx whenever addEventOpen is set to true or false', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.onSelectEventTx(makeTx({ id: 't1' })));
      expect(result.current.eventTx).not.toBeNull();
      act(() => result.current.setAddEventOpen(true));
      expect(result.current.eventTx).toBeNull();

      act(() => result.current.onSelectEventTx(makeTx({ id: 't1' })));
      act(() => result.current.setAddEventOpen(false));
      expect(result.current.eventTx).toBeNull();
    });

    it('resets chargeTx whenever addChargeOpen is set to true or false', () => {
      const { result } = renderLoanDetail();

      act(() => result.current.onSelectChargeTx(makeTx({ id: 't1' })));
      expect(result.current.chargeTx).not.toBeNull();
      act(() => result.current.setAddChargeOpen(true));
      expect(result.current.chargeTx).toBeNull();

      act(() => result.current.onSelectChargeTx(makeTx({ id: 't1' })));
      act(() => result.current.setAddChargeOpen(false));
      expect(result.current.chargeTx).toBeNull();
    });

    it('resets paymentTx and closes the dialog after a successful settle-payment submit', async () => {
      const { result } = renderLoanDetail();

      act(() => result.current.handleOpenMarkPaid(installment));
      act(() => result.current.onSelectPaymentTx(makeTx({ id: 't1' })));
      expect(result.current.paymentTx).not.toBeNull();

      await act(async () => {
        await result.current.handleSettlePayment(submitEvent());
      });

      expect(result.current.paymentTx).toBeNull();
      expect(result.current.markPaidOpen).toBe(false);
    });

    it('resets eventTx and closes the dialog after a successful add-event submit', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setAddEventOpen(true);
        result.current.setEventType('prepayment');
        result.current.setEventAmount('10000');
      });
      act(() => result.current.onSelectEventTx(makeTx({ id: 't1', amount: -10000 })));
      expect(result.current.eventTx).not.toBeNull();

      await act(async () => {
        await result.current.handleAddEvent(submitEvent());
      });

      expect(result.current.eventTx).toBeNull();
      expect(result.current.addEventOpen).toBe(false);
    });

    it('resets chargeTx and closes the dialog after a successful add-charge submit', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setAddChargeOpen(true);
        result.current.setChargeAmount('2500');
      });
      act(() => result.current.onSelectChargeTx(makeTx({ id: 't1', amount: -2500 })));
      expect(result.current.chargeTx).not.toBeNull();

      await act(async () => {
        await result.current.handleAddCharge(submitEvent());
      });

      expect(result.current.chargeTx).toBeNull();
      expect(result.current.addChargeOpen).toBe(false);
    });
  });

  describe('exact mutation payloads', () => {
    it('addPayment receives installmentSeq, paymentDate, amount and transactionId exactly', async () => {
      const { result } = renderLoanDetail();

      act(() => result.current.handleOpenMarkPaid(installment));
      act(() => result.current.setPaymentAmount('5000'));
      act(() => result.current.onSelectPaymentTx(makeTx({ id: 'tx-pay' })));

      await act(async () => {
        await result.current.handleSettlePayment(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', {
        params: { path: { id: 'loan-1' } },
        body: {
          installmentSeq: 1,
          paymentDate: '2026-03-05',
          amount: 5000,
          transactionId: 'tx-pay',
        },
      });
    });

    it('addEvent receives the full event body exactly', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setEventType('prepayment');
        result.current.setEffectiveDate('2026-06-15');
        result.current.setEventAmount('10000');
        result.current.setAdjustmentMode('reduce_tenure');
      });
      act(() => result.current.onSelectEventTx(makeTx({ id: 'tx-event', amount: -10000 })));

      await act(async () => {
        await result.current.handleAddEvent(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/events', {
        params: { path: { id: 'loan-1' } },
        body: {
          eventType: 'prepayment',
          effectiveDate: '2026-06-15',
          newAnnualRatePct: undefined,
          amount: 10000,
          adjustmentMode: 'reduce_tenure',
          newEmiOverride: undefined,
          transactionId: 'tx-event',
        },
      });
    });

    it('addCharge receives the full charge body exactly', async () => {
      const { result } = renderLoanDetail();

      act(() => {
        result.current.setChargeType('late_fee');
        result.current.setChargeAmount('2500');
        result.current.setChargeDate('2026-05-02');
        result.current.setChargeNotes('  Late fee  ');
      });
      act(() => result.current.onSelectChargeTx(makeTx({ id: 'tx-charge', amount: -2500 })));

      await act(async () => {
        await result.current.handleAddCharge(submitEvent());
      });

      expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/charges', {
        params: { path: { id: 'loan-1' } },
        body: {
          chargeType: 'late_fee',
          amount: 2500,
          chargeDate: '2026-05-02',
          notes: 'Late fee',
          transactionId: 'tx-charge',
        },
      });
    });
  });

  it('sanity: the loan detail query resolves via the mocked GET (no crash on mount)', async () => {
    const { result } = renderLoanDetail();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loan).toEqual({ id: 'loan-1' });
  });
});
