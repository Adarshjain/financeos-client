import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/components/bills/MarkPaidDialog', () => ({
  MarkPaidDialog: (p: {
    open: boolean;
    bill: { statementId?: string | null } | null;
    prefill?: unknown;
    onSubmit: (b: object) => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    p.open ? (
      <div data-testid="mark-paid" data-statement={p.bill?.statementId} data-prefill={JSON.stringify(p.prefill ?? null)}>
        <button onClick={() => p.onSubmit({ amount: 9 })}>do-paid</button>
        <button onClick={() => p.onOpenChange(false)}>x-paid</button>
      </div>
    ) : null,
}));
vi.mock('@/components/bills/BillDetailsDialog', () => ({
  BillDetailsDialog: (p: {
    open: boolean;
    bill: { statementId?: string | null } | null;
    onSubmit: (b: object) => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    p.open ? (
      <div data-testid="details" data-statement={p.bill?.statementId}>
        <button onClick={() => p.onSubmit({ totalAmountDue: 1 })}>do-details</button>
        <button onClick={() => p.onOpenChange(false)}>x-details</button>
      </div>
    ) : null,
}));

import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxBillDialogs, type PendingBillAction, toPendingBillAction } from '../InboxBillDialogs';
import { action, item } from './fixtures';

describe('toPendingBillAction', () => {
  it('maps mark_paid and set_details with the payload statement id, no prefill', () => {
    const row = item({ key: 'k' });
    expect(toPendingBillAction(row, action({ type: 'mark_paid', payload: { statementId: 's1' } }))).toEqual({
      type: 'mark_paid', statementId: 's1', prefill: null,
    });
    expect(toPendingBillAction(row, action({ type: 'set_details', payload: { statementId: 's2' } }))).toEqual({
      type: 'set_details', statementId: 's2', prefill: null,
    });
  });

  it('falls back to the row refs statement id', () => {
    const row = item({ key: 'k', refs: { statementId: 'from-refs' } });
    expect(toPendingBillAction(row, action({ type: 'mark_paid' }))?.statementId).toBe('from-refs');
  });

  it('the payload statement id wins over the row refs', () => {
    const row = item({ key: 'k', refs: { statementId: 'from-refs' } });
    expect(toPendingBillAction(row, action({ type: 'mark_paid', payload: { statementId: 'p' } }))?.statementId).toBe('p');
  });

  it('is null when no statement id exists anywhere', () => {
    expect(toPendingBillAction(item({ key: 'k' }), action({ type: 'mark_paid' }))).toBeNull();
  });

  it('is null for non-bill actions even with a statement id', () => {
    const row = item({ key: 'k', refs: { statementId: 's' } });
    expect(toPendingBillAction(row, action({ type: 'open', payload: { statementId: 's' } }))).toBeNull();
    expect(toPendingBillAction(row, action({ type: 'snooze' }))).toBeNull();
  });

  it('confirm_payment prefills amount and date from the payload', () => {
    const row = item({ key: 'k' });
    const out = toPendingBillAction(row, action({ type: 'confirm_payment', payload: { statementId: 's', amount: 1500, date: '2026-10-06' } }));
    expect(out).toEqual({ type: 'confirm_payment', statementId: 's', prefill: { amount: 1500, paidOn: '2026-10-06' } });
  });

  it('confirm_payment without a date prefills an empty date; a zero amount still prefills', () => {
    const row = item({ key: 'k' });
    expect(toPendingBillAction(row, action({ type: 'confirm_payment', payload: { statementId: 's', amount: 0 } }))?.prefill).toEqual({ amount: 0, paidOn: '' });
  });

  it('confirm_payment without an amount has no prefill', () => {
    const row = item({ key: 'k' });
    expect(toPendingBillAction(row, action({ type: 'confirm_payment', payload: { statementId: 's' } }))?.prefill).toBeNull();
  });

  it('mark_paid never prefills even if the payload carries an amount', () => {
    const row = item({ key: 'k' });
    expect(toPendingBillAction(row, action({ type: 'mark_paid', payload: { statementId: 's', amount: 5 } }))?.prefill).toBeNull();
  });
});

describe('InboxBillDialogs', () => {
  const bill = { statementId: 's1', status: 'OPEN', accountName: 'HDFC', paymentDueDate: '2026-10-12' } as CardBillResponse;
  const pend = (over: Partial<PendingBillAction> = {}): PendingBillAction => ({ type: 'mark_paid', statementId: 's1', prefill: null, ...over });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: bill } as never);
  });

  it('with nothing pending it loads nothing and shows no dialog', () => {
    renderWithQuery(<InboxBillDialogs pending={null} onClose={vi.fn()} />);
    expect(api.GET).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mark-paid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('details')).not.toBeInTheDocument();
  });

  it('loads the bill by statement id and only then opens mark paid', async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(api.GET).mockReturnValue(new Promise((r) => { resolve = r; }) as never);
    renderWithQuery(<InboxBillDialogs pending={pend()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('mark-paid')).not.toBeInTheDocument();
    resolve({ data: bill });
    expect(await screen.findByTestId('mark-paid')).toHaveAttribute('data-statement', 's1');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills/{statementId}', { params: { path: { statementId: 's1' } } });
  });

  it('confirm_payment opens mark paid with the prefill', async () => {
    renderWithQuery(<InboxBillDialogs pending={pend({ type: 'confirm_payment', prefill: { amount: 10, paidOn: '2026-10-06' } })} onClose={vi.fn()} />);
    expect(await screen.findByTestId('mark-paid')).toHaveAttribute('data-prefill', JSON.stringify({ amount: 10, paidOn: '2026-10-06' }));
  });

  it('mark_paid does not pass a prefill', async () => {
    renderWithQuery(<InboxBillDialogs pending={pend({ prefill: { amount: 10, paidOn: 'x' } })} onClose={vi.fn()} />);
    expect(await screen.findByTestId('mark-paid')).toHaveAttribute('data-prefill', 'null');
  });

  it('set_details opens the details dialog, not mark paid', async () => {
    renderWithQuery(<InboxBillDialogs pending={pend({ type: 'set_details' })} onClose={vi.fn()} />);
    expect(await screen.findByTestId('details')).toHaveAttribute('data-statement', 's1');
    expect(screen.queryByTestId('mark-paid')).not.toBeInTheDocument();
  });

  it('a bill load failure toasts and closes', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('gone'));
    const onClose = vi.fn();
    renderWithQuery(<InboxBillDialogs pending={pend()} onClose={onClose} />);
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId('mark-paid')).not.toBeInTheDocument();
  });

  it('closing the dialog calls onClose', async () => {
    const onClose = vi.fn();
    renderWithQuery(<InboxBillDialogs pending={pend()} onClose={onClose} />);
    fireEvent.click(await screen.findByText('x-paid'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submitting mark paid POSTs, closes, toasts "Bill marked as paid" and invalidates the inbox', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { ...bill, status: 'PAID' } } as never);
    const onClose = vi.fn();
    const { queryClient } = renderWithQuery(<InboxBillDialogs pending={pend()} onClose={onClose} />);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(await screen.findByText('do-paid'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: 's1' } },
      body: { amount: 9 },
    });
    expect(toastMock.success).toHaveBeenCalledWith('Bill marked as paid');
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: keys.inbox.all }));
  });

  it('a partial result toasts "Partial payment recorded"', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { ...bill, status: 'PARTIAL' } } as never);
    renderWithQuery(<InboxBillDialogs pending={pend()} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByText('do-paid'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Partial payment recorded'));
  });

  it('a failed mark paid toasts, keeps the dialog open (no onClose) and still refreshes the inbox', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('no'));
    const onClose = vi.fn();
    const { queryClient } = renderWithQuery(<InboxBillDialogs pending={pend()} onClose={onClose} />);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(await screen.findByText('do-paid'));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.inbox.all });
  });

  it('submitting details PATCHes, closes and toasts', async () => {
    vi.mocked(api.PATCH).mockResolvedValue({ data: bill } as never);
    const onClose = vi.fn();
    renderWithQuery(<InboxBillDialogs pending={pend({ type: 'set_details' })} onClose={onClose} />);
    fireEvent.click(await screen.findByText('do-details'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/bills/{statementId}/details', {
      params: { path: { statementId: 's1' } },
      body: { totalAmountDue: 1 },
    });
    expect(toastMock.success).toHaveBeenCalledWith('Statement details saved');
  });

  it('a failed details save toasts and does not close', async () => {
    vi.mocked(api.PATCH).mockRejectedValue(new Error('no'));
    const onClose = vi.fn();
    renderWithQuery(<InboxBillDialogs pending={pend({ type: 'set_details' })} onClose={onClose} />);
    fireEvent.click(await screen.findByText('do-details'));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
