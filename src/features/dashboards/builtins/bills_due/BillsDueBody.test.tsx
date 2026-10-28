import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const push = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { api, ApiError } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { bodyProps, NOW } from '../testFixtures';
import { BillsDueBody } from './BillsDueBody';

function bill(over: Partial<CardBillResponse> & { accountId: string }): CardBillResponse {
  return { accountName: 'HDFC', last4: '1111', status: 'OPEN', muted: false, paidSource: 'NONE', ...over } as CardBillResponse;
}

const overdue = bill({
  accountId: 'a-over', accountName: 'Overdue Card', last4: '1', statementId: 's-over', status: 'OVERDUE',
  remainingAmount: 5000, totalAmountDue: 5000, paymentDueDate: '2026-10-01', daysUntilDue: -7,
});
const open = bill({
  accountId: 'a-open', accountName: 'Open Card', last4: '2', statementId: 's-open', status: 'OPEN',
  remainingAmount: 2000, totalAmountDue: 2000, minimumAmountDue: 200, paymentDueDate: '2026-10-12', daysUntilDue: 4, unbilledAmount: 300,
});
const awaiting = bill({
  accountId: 'a-wait', accountName: 'Wait Card', last4: '3', status: 'AWAITING_STATEMENT',
  unbilledAmount: 1500, nextStatementExpectedOn: '2026-10-15',
});
const late = bill({
  accountId: 'a-late', accountName: 'Late Card', last4: '4', status: 'AWAITING_STATEMENT',
  unbilledAmount: 100, nextStatementExpectedOn: '2026-10-05',
});
const quiet = bill({ accountId: 'a-quiet', accountName: 'Quiet Card', last4: '5', status: 'NO_DUE', unbilledAmount: 0 });
const paidManually = bill({
  accountId: 'a-paid', accountName: 'Paid Card', last4: '6', statementId: 's-paid', status: 'PAID', paidSource: 'MANUAL',
  paidAmount: 800, paidMarkedOn: '2026-10-08', unbilledAmount: 0,
});

function seed(bills: CardBillResponse[]) {
  vi.mocked(api.GET).mockResolvedValue({ data: bills } as never);
}
const render = (params: Record<string, unknown> = {}) => renderWithQuery(<BillsDueBody {...bodyProps('bills_due', params)} />);

describe('BillsDueBody', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search.value = '';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  it('shows the loading rows while the bills load', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    render();
    expect(screen.getByTestId('bills-widget-loading')).toBeInTheDocument();
  });

  it('overdue first, then arrived by due date, then awaiting; totals above', async () => {
    seed([awaiting, open, overdue]);
    render();
    const rows = await screen.findAllByTestId('bill-row');
    expect(rows.map((r) => r.getAttribute('data-phase'))).toEqual(['overdue', 'arrived', 'awaiting']);
    expect(screen.getByTestId('bills-widget-totals')).toHaveTextContent('To pay ₹7,000');
    expect(screen.getByTestId('bills-widget-totals')).toHaveTextContent('Unbilled ₹1,800');
  });

  it('an arrived card: name, due date and amount due only (no countdown, minimum or spent-since line)', async () => {
    seed([open]);
    render();
    const row = await screen.findByTestId('bill-row');
    expect(row).toHaveTextContent('Open Card ••2');
    expect(row).toHaveTextContent('Due 12 Oct');
    expect(row).not.toHaveTextContent('Due in 4 days');
    expect(row).not.toHaveTextContent('spent since this statement');
    expect(within(row).getByTestId('bill-headline')).toHaveTextContent('₹2,000');
    expect(row).not.toHaveTextContent('Min ₹200');
  });

  it('an overdue card says Overdue in colour beside its amount', async () => {
    seed([overdue]);
    render();
    const row = await screen.findByTestId('bill-row');
    expect(within(row).getByTestId('bill-status')).toHaveTextContent('Overdue');
    expect(row).not.toHaveTextContent('Overdue by 7 days');
  });

  it('an overdue card shows the date it was due', async () => {
    seed([overdue]);
    render();
    expect(await screen.findByTestId('bill-row')).toHaveTextContent('Due 1 Oct');
  });

  it('a bill with no due date set and an awaiting card show no due line', async () => {
    seed([awaiting, bill({ accountId: 'x', accountName: 'Unknown Card', statementId: 's-x', status: 'DUE_UNKNOWN', remainingAmount: 900 })]);
    render();
    const rows = await screen.findAllByTestId('bill-row');
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r).not.toHaveTextContent(/Due/);
  });

  it('an awaiting card headlines its unbilled spend with the word unbilled; a late statement says so in colour', async () => {
    seed([awaiting, late]);
    render();
    const [lateRow, wait] = await screen.findAllByTestId('bill-row');
    expect(within(wait).getByTestId('bill-headline')).toHaveTextContent('₹1,500');
    expect(wait).toHaveTextContent('unbilled');
    expect(wait).not.toHaveTextContent('Statement expected');
    expect(wait).not.toHaveTextContent('Mark paid');
    expect(within(lateRow).getByTestId('bill-status')).toHaveTextContent('Statement late');
  });

  it('rows are read-only: no buttons on any row, whatever the bill state', async () => {
    seed([overdue, open, awaiting, bill({ accountId: 'x', statementId: 's-x', status: 'DUE_UNKNOWN', remainingAmount: 900, totalAmountDue: 900 })]);
    render();
    const rows = await screen.findAllByTestId('bill-row');
    expect(rows).toHaveLength(4);
    for (const r of rows) expect(within(r).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Mark paid|Set details|Undo/ })).toBeNull();
  });

  it('cards with nothing to pay and nothing unbilled collapse into one group that expands', async () => {
    seed([quiet, paidManually, open]);
    render();
    await screen.findAllByTestId('bill-row');
    expect(screen.getAllByTestId('bill-row')).toHaveLength(1);
    await user().click(screen.getByRole('button', { name: 'Nothing pending · 2 cards' }));
    expect(screen.getAllByTestId('bill-row')).toHaveLength(3);
    expect(screen.getByText('Quiet Card ••5')).toBeInTheDocument();
    expect(screen.queryByText('Paid on 8 Oct')).toBeNull();
  });

  it('a manually paid card in the Nothing pending group has no Undo', async () => {
    seed([paidManually]);
    render();
    await user().click(await screen.findByRole('button', { name: 'Nothing pending · 1 card' }));
    expect(await screen.findByText('Paid Card ••6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('one card (accountId): asks the server for that card only; no bill says so', async () => {
    seed([]);
    render({ accountId: 'a1' });
    expect(await screen.findByText('No current bill for this card')).toBeInTheDocument();
    expect(vi.mocked(api.GET).mock.calls[0][1]).toMatchObject({ params: { query: { accountId: 'a1' } } });
  });

  it('no cards at all: an empty state that goes to accounts', async () => {
    seed([]);
    render();
    expect(await screen.findByText('No credit cards yet')).toBeInTheDocument();
    await user().click(screen.getByRole('button', { name: 'Go to accounts' }));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/\/accounts$/));
  });

  it('a link from elsewhere (?card=) highlights that card and opens the group holding it', async () => {
    search.value = 'card=a-quiet';
    seed([quiet, open]);
    render();
    await screen.findAllByTestId('bill-row');
    await vi.waitFor(() => expect(screen.getAllByTestId('bill-row')).toHaveLength(2));
    expect(screen.getAllByTestId('bill-row').find((r) => r.getAttribute('data-account-id') === 'a-quiet')).toBeDefined();
  });

  it('a failure names it and offers Retry', async () => {
    vi.mocked(api.GET).mockRejectedValue(new ApiError(500, { code: 'X', message: 'Bills are down' }));
    render();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Bills are down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
