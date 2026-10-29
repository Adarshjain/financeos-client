import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import * as actions from './loanActions';

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({ data: { id: 'x' } });
});

const path = (id: string, extra: Record<string, string> = {}) => ({ params: { path: { id, ...extra } } });

describe('loans actions', () => {
  it('createLoan posts and updateLoan puts the loan', async () => {
    expect(await actions.createLoan({ name: 'x' } as never)).toEqual({ success: true, data: { id: 'x' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans', { body: { name: 'x' } });
    await actions.updateLoan('l1', { name: 'y' } as never);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/loans/{id}', { ...path('l1'), body: { name: 'y' } });
  });

  it('closeLoan, reopenLoan and deleteLoan hit the loan', async () => {
    await actions.closeLoan('l1');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/close', path('l1'));
    await actions.reopenLoan('l1');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/reopen', path('l1'));
    expect(await actions.deleteLoan('l1')).toEqual({ success: true, data: undefined });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/loans/{id}', path('l1'));
  });

  it('addLoanPayment and deleteLoanPayment', async () => {
    const body = { installmentSeq: 3, paymentDate: '2026-10-05', amount: 100 };
    await actions.addLoanPayment('l1', body);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', { ...path('l1'), body });
    await actions.deleteLoanPayment('l1', 'p1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/loans/{id}/payments/{paymentId}', path('l1', { paymentId: 'p1' }));
  });

  it('addLoanPaymentsBatch posts the items and counts them', async () => {
    const items = [{ installmentSeq: 1, paymentDate: '2026-10-05', amount: 1, transactionId: 't' }];
    expect(await actions.addLoanPaymentsBatch('l1', { items })).toEqual({ success: true, data: { created: 1 } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments/batch', { ...path('l1'), body: { items } });
  });

  it('addLoanEvent and deleteLoanEvent', async () => {
    const body = { eventType: 'prepayment', effectiveDate: '2026-10-05' } as never;
    await actions.addLoanEvent('l1', body);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/events', { ...path('l1'), body });
    await actions.deleteLoanEvent('l1', 'e1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/loans/{id}/events/{eventId}', path('l1', { eventId: 'e1' }));
  });

  it('addLoanCharge and deleteLoanCharge', async () => {
    const body = { amount: 10 } as never;
    await actions.addLoanCharge('l1', body);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/charges', { ...path('l1'), body });
    await actions.deleteLoanCharge('l1', 'c1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/loans/{id}/charges/{chargeId}', path('l1', { chargeId: 'c1' }));
  });

  it('reports a failure with the call site message instead of throwing', async () => {
    api.DELETE.mockRejectedValue(new Error('down'));
    expect(await actions.deleteLoanEvent('l1', 'e1')).toMatchObject({
      success: false,
      error: { message: "Couldn't delete loan event. Try again." },
    });
  });
});
