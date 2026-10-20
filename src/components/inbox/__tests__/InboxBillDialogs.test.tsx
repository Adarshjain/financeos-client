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
    onSubmit: (b: object) => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    p.open ? (
      <div data-testid="mark-paid" data-statement={p.bill?.statementId}>
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

import { type PendingBillAction, toPendingBillAction } from '@/features/inbox/inboxBillAction';
import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxBillDialogs } from '../InboxBillDialogs';
import { action, item } from './fixtures';

describe('toPendingBillAction', () => {
  it('maps mark_paid and set_details with the payload statement id', () => {
    const row = item({ key: 'k' });
    expect(toPendingBillAction(row, action({ type: 'mark_paid', payload: { statementId: 's1' } }))).toEqual({
      type: 'mark_paid', statementId: 's1',
    });
    expect(toPendingBillAction(row, action({ type: 'set_details', payload: { statementId: 's2' } }))).toEqual({
      type: 'set_details', statementId: 's2',
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
    expect(toPendingBillAction(row, action({ type: 'confirm_payment', payload: { statementId: 's', amount: 5 } })),
      'the server no longer offers it: credits settle the bill on their own').toBeNull();
  });
});

describe('InboxBillDialogs', () => {
  const bill = { statementId: 's1', status: 'OPEN', accountName: 'HDFC', paymentDueDate: '2026-10-12' } as CardBillResponse;
  const pend = (over: Partial<PendingBillAction> = {}): PendingBillAction => ({ type: 'mark_paid', statementId: 's1', ...over });

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
