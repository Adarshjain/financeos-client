import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/bills/MarkPaidDialog', () => ({
  MarkPaidDialog: (p: { open: boolean; bill: { statementId?: string; accountName?: string } | null }) =>
    p.open ? <div data-testid="mark-paid" data-statement={p.bill?.statementId} data-account={p.bill?.accountName} /> : null,
}));
vi.mock('@/components/bills/BillDetailsDialog', () => ({
  BillDetailsDialog: (p: { open: boolean; bill: { statementId?: string } | null }) =>
    p.open ? <div data-testid="details" data-statement={p.bill?.statementId} /> : null,
}));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxBillDialogs, type PendingBillAction } from '../InboxBillDialogs';

const billA = { statementId: 'A', status: 'OPEN', accountName: 'Card A' };
const billB = { statementId: 'B', status: 'OPEN', accountName: 'Card B' };
const pend = (statementId: string, type: PendingBillAction['type'] = 'mark_paid'): PendingBillAction => ({ type, statementId, prefill: null });

describe('InboxBillDialogs stale-bill guard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('while B is loading no dialog shows A\'s figures; once B resolves it opens with B', async () => {
    let resolveB!: (v: unknown) => void;
    vi.mocked(api.GET).mockImplementation(((_url: string, opts: { params: { path: { statementId: string } } }) =>
      opts.params.path.statementId === 'A'
        ? Promise.resolve({ data: billA })
        : new Promise((r) => { resolveB = r; })) as never);

    const onClose = vi.fn();
    const { rerender } = renderWithQuery(<InboxBillDialogs pending={pend('A')} onClose={onClose} />);
    expect(await screen.findByTestId('mark-paid')).toHaveAttribute('data-account', 'Card A');

    rerender(<InboxBillDialogs pending={pend('B')} onClose={onClose} />);
    expect(screen.queryByTestId('mark-paid')).not.toBeInTheDocument();
    expect(screen.queryByText('Card A')).not.toBeInTheDocument();

    await act(async () => { resolveB({ data: billB }); });
    const dialog = await screen.findByTestId('mark-paid');
    expect(dialog).toHaveAttribute('data-statement', 'B');
    expect(dialog).toHaveAttribute('data-account', 'Card B');
  });

  it('the same guard holds for set_details', async () => {
    let resolveB!: (v: unknown) => void;
    vi.mocked(api.GET).mockImplementation(((_url: string, opts: { params: { path: { statementId: string } } }) =>
      opts.params.path.statementId === 'A'
        ? Promise.resolve({ data: billA })
        : new Promise((r) => { resolveB = r; })) as never);

    const { rerender } = renderWithQuery(<InboxBillDialogs pending={pend('A', 'set_details')} onClose={vi.fn()} />);
    expect(await screen.findByTestId('details')).toHaveAttribute('data-statement', 'A');
    rerender(<InboxBillDialogs pending={pend('B', 'set_details')} onClose={vi.fn()} />);
    expect(screen.queryByTestId('details')).not.toBeInTheDocument();
    await act(async () => { resolveB({ data: billB }); });
    expect(await screen.findByTestId('details')).toHaveAttribute('data-statement', 'B');
  });
});
