import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => searchParams,
}));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

// The real dialogs have their own tests; here we assert what the widget hands them.
vi.mock('../MarkPaidDialog', () => ({
  MarkPaidDialog: (p: {
    open: boolean;
    bill: { statementId?: string | null } | null;
    prefill?: { amount: number; paidOn: string } | null;
    onSubmit: (b: object) => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    p.open ? (
      <div data-testid="mark-paid-dialog" data-statement={p.bill?.statementId} data-prefill={JSON.stringify(p.prefill ?? null)}>
        <button onClick={() => p.onSubmit({ amount: 5 })}>submit-paid</button>
        <button onClick={() => p.onOpenChange(false)}>close-paid</button>
      </div>
    ) : null,
}));
vi.mock('../BillDetailsDialog', () => ({
  BillDetailsDialog: (p: {
    open: boolean;
    bill: { statementId?: string | null } | null;
    onSubmit: (b: object) => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    p.open ? (
      <div data-testid="details-dialog" data-statement={p.bill?.statementId}>
        <button onClick={() => p.onSubmit({ paymentDueDate: '2026-10-20' })}>submit-details</button>
        <button onClick={() => p.onOpenChange(false)}>close-details</button>
      </div>
    ) : null,
}));

import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { BillsDueWidget } from '../BillsDueWidget';

function bill(over: Partial<CardBillResponse> & { accountId: string }): CardBillResponse {
  return {
    accountName: 'HDFC',
    last4: '1111',
    status: 'OPEN',
    muted: false,
    paidSource: 'NONE',
    possiblePayments: [],
    ...over,
  } as CardBillResponse;
}

function seed(bills: CardBillResponse[]) {
  vi.mocked(api.GET).mockResolvedValue({ data: bills } as never);
}

const overdue = bill({
  accountId: 'a-over', accountName: 'Overdue Card', last4: '1', statementId: 's-over', status: 'OVERDUE',
  remainingAmount: 5000, totalAmountDue: 5000, paymentDueDate: '2026-10-01', daysUntilDue: -7,
});
const open = bill({
  accountId: 'a-open', accountName: 'Open Card', last4: '2', statementId: 's-open', status: 'OPEN',
  remainingAmount: 2000, totalAmountDue: 2000, minimumAmountDue: 200, paymentDueDate: '2026-10-12', daysUntilDue: 4,
  unbilledAmount: 300,
});
const awaiting = bill({
  accountId: 'a-wait', accountName: 'Wait Card', last4: '3', status: 'AWAITING_STATEMENT',
  unbilledAmount: 800, nextStatementExpectedOn: '2026-10-15',
});
const idle = bill({
  accountId: 'a-idle', accountName: 'Idle Card', last4: '4', status: 'AWAITING_STATEMENT',
  unbilledAmount: 0, nextStatementExpectedOn: '2026-10-15',
});

describe('BillsDueWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    searchParams = new URLSearchParams();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('shows a skeleton while loading', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<BillsDueWidget />);
    expect(screen.getByTestId('bills-widget-loading')).toBeInTheDocument();
  });

  it('shows the error message when loading fails', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('boom'));
    renderWithQuery(<BillsDueWidget />);
    expect(await screen.findByText(/Couldn't load bills/)).toBeInTheDocument();
  });

  it('empty with no accountId: "No credit cards yet" with a link to accounts', async () => {
    renderWithQuery(<BillsDueWidget />);
    expect(await screen.findByText('No credit cards yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', '/accounts');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills', { params: { query: {} } });
  });

  it('empty with an accountId: "No current bill for this card" and no accounts link; query carries accountId', async () => {
    renderWithQuery(<BillsDueWidget accountId="acc-9" />);
    expect(await screen.findByText('No current bill for this card')).toBeInTheDocument();
    expect(screen.queryByText('No credit cards yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to accounts' })).not.toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills', { params: { query: { accountId: 'acc-9' } } });
  });

  it('renders rows sorted overdue, arrived, awaiting with header totals', async () => {
    seed([awaiting, open, overdue]);
    renderWithQuery(<BillsDueWidget />);
    const rows = await screen.findAllByTestId('bill-row');
    expect(rows.map((r) => r.getAttribute('data-phase'))).toEqual(['overdue', 'arrived', 'awaiting']);
    const totals = screen.getByTestId('bills-widget-totals');
    expect(totals).toHaveTextContent(/To pay\s*₹\s*7,000/);
    // 300 (open) + 800 (awaiting)
    expect(totals).toHaveTextContent(/Unbilled\s*₹\s*1,100/);
  });

  it('overdue row: escalated copy, headline is the amount to pay', async () => {
    seed([overdue]);
    renderWithQuery(<BillsDueWidget />);
    const row = await screen.findByTestId('bill-row');
    expect(within(row).getByText('Overdue Card ••1')).toBeInTheDocument();
    expect(within(row).getByText(/Overdue by 7 days/)).toBeInTheDocument();
    expect(within(row).getByTestId('bill-headline')).toHaveTextContent(/5,000/);
    expect(within(row).getByTestId('bill-status')).toHaveTextContent('Overdue');
  });

  it('arrived row: due phrase, min due, unbilled-since-statement line', async () => {
    seed([open]);
    renderWithQuery(<BillsDueWidget />);
    const row = await screen.findByTestId('bill-row');
    expect(within(row).getByText(/Due in 4 days/)).toBeInTheDocument();
    expect(within(row).getByText(/Min\s*₹\s*200/)).toBeInTheDocument();
    expect(within(row).getByTestId('bill-unbilled')).toHaveTextContent(/300\.00 spent since this statement/);
    expect(within(row).queryByTestId('bill-partial')).not.toBeInTheDocument();
  });

  it('PARTIAL row shows paid-of-total progress', async () => {
    seed([bill({ accountId: 'p', statementId: 's-p', status: 'PARTIAL', totalAmountDue: 1000, paidAmount: 400, remainingAmount: 600, paymentDueDate: '2026-10-12', daysUntilDue: 4 })]);
    renderWithQuery(<BillsDueWidget />);
    expect(await screen.findByTestId('bill-partial')).toHaveTextContent(/Paid\s*₹\s*400.*of\s*₹\s*1,000/);
    expect(screen.getByTestId('bill-headline')).toHaveTextContent(/600/);
  });

  it('DUE_UNKNOWN row has no date suffix and offers Set details', async () => {
    seed([bill({ accountId: 'u', statementId: 's-u', status: 'DUE_UNKNOWN', totalAmountDue: 900, paymentDueDate: '2026-10-20' })]);
    renderWithQuery(<BillsDueWidget />);
    const row = await screen.findByTestId('bill-row');
    expect(within(row).getByText('Set the due date to start reminders')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Set details/ })).toBeInTheDocument();
  });

  it('awaiting row: unbilled headline, expected date, no Mark paid', async () => {
    seed([awaiting]);
    renderWithQuery(<BillsDueWidget />);
    const row = await screen.findByTestId('bill-row');
    expect(within(row).getByTestId('bill-headline')).toHaveTextContent(/800/);
    expect(within(row).getByText('unbilled')).toBeInTheDocument();
    expect(within(row).getByTestId('bill-expected')).toHaveTextContent('Statement expected 15 Oct 26');
    expect(within(row).queryByRole('button', { name: /Mark paid/ })).not.toBeInTheDocument();
  });

  it('awaiting row whose statement date has passed reads "Statement due since"', async () => {
    seed([bill({ ...awaiting, accountId: 'late', nextStatementExpectedOn: '2026-10-05' })]);
    renderWithQuery(<BillsDueWidget />);
    expect(await screen.findByTestId('bill-expected')).toHaveTextContent('Statement due since 5 Oct 26');
  });

  it('awaiting row without an expected date renders no expected line', async () => {
    seed([bill({ ...awaiting, nextStatementExpectedOn: null })]);
    renderWithQuery(<BillsDueWidget />);
    await screen.findByTestId('bill-row');
    expect(screen.queryByTestId('bill-expected')).not.toBeInTheDocument();
  });

  describe('Nothing pending group', () => {
    it('is collapsed by default with a count, and expands/collapses on click', async () => {
      seed([open, idle, bill({ accountId: 'paid', accountName: 'Paid Card', last4: '5', status: 'PAID', paidMarkedOn: '2026-10-02' })]);
      renderWithQuery(<BillsDueWidget />);
      const toggle = await screen.findByRole('button', { name: /Nothing pending · 2 cards/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getAllByTestId('bill-row')).toHaveLength(1);

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByTestId('bill-row')).toHaveLength(3);
      expect(screen.getByText('Paid on 2 Oct 26')).toBeInTheDocument();
      expect(screen.getByText('Statement expected 15 Oct 26')).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(screen.getAllByTestId('bill-row')).toHaveLength(1);
    });

    it('singular label for one card; hidden entirely when there are none', async () => {
      seed([open, idle]);
      const { unmount } = renderWithQuery(<BillsDueWidget />);
      expect(await screen.findByRole('button', { name: /Nothing pending · 1 card$/ })).toBeInTheDocument();
      unmount();
      seed([open]);
      renderWithQuery(<BillsDueWidget />);
      await screen.findByTestId('bill-row');
      expect(screen.queryByTestId('bills-nothing-pending')).not.toBeInTheDocument();
    });

    it('a settled card with no expected date says "No spend since the last statement"; late says due since', async () => {
      seed([
        bill({ accountId: 'x', accountName: 'X', status: 'NO_DUE' }),
        bill({ accountId: 'y', accountName: 'Y', status: 'AWAITING_STATEMENT', unbilledAmount: 0, nextStatementExpectedOn: '2026-10-01' }),
      ]);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Nothing pending/ }));
      expect(screen.getByText('No spend since the last statement')).toBeInTheDocument();
      expect(screen.getByText('Statement due since 1 Oct 26')).toBeInTheDocument();
    });

    it('auto-expands when the highlighted card (?card=) is inside it', async () => {
      searchParams = new URLSearchParams('card=a-idle');
      seed([open, idle]);
      renderWithQuery(<BillsDueWidget />);
      const toggle = await screen.findByRole('button', { name: /Nothing pending/ });
      await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'));
      const idleRow = document.querySelector('[data-account-id="a-idle"]') as HTMLElement;
      expect(idleRow.className).toMatch(/ring-emerald/);
    });

    it('stays collapsed when the highlight is on a visible row', async () => {
      searchParams = new URLSearchParams('card=a-open');
      seed([open, idle]);
      renderWithQuery(<BillsDueWidget />);
      const toggle = await screen.findByRole('button', { name: /Nothing pending/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('highlight', () => {
    it('rings the row matching the highlightStatementId prop and scrolls to it', async () => {
      const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
      vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { cb(0); return 1; });
      vi.stubGlobal('cancelAnimationFrame', () => {});
      seed([overdue, open]);
      renderWithQuery(<BillsDueWidget highlightStatementId="s-open" />);
      await screen.findAllByTestId('bill-row');
      const rows = screen.getAllByTestId('bill-row');
      expect(rows[1].className).toMatch(/ring-emerald/);
      expect(rows[0].className).not.toMatch(/ring-emerald/);
      await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'center' }));
      vi.unstubAllGlobals();
      scroll.mockRestore();
    });

    it('falls back to ?bill= and ?card= params; the prop wins over ?bill=', async () => {
      searchParams = new URLSearchParams('bill=s-over');
      seed([overdue, open]);
      const { unmount } = renderWithQuery(<BillsDueWidget />);
      let rows = await screen.findAllByTestId('bill-row');
      expect(rows[0].className).toMatch(/ring-emerald/);
      unmount();

      renderWithQuery(<BillsDueWidget highlightStatementId="s-open" />);
      rows = await screen.findAllByTestId('bill-row');
      expect(rows[0].className).not.toMatch(/ring-emerald/);
      expect(rows[1].className).toMatch(/ring-emerald/);
    });

    it('rings nothing when the highlight matches no card', async () => {
      searchParams = new URLSearchParams('bill=nope');
      seed([overdue]);
      renderWithQuery(<BillsDueWidget />);
      const row = await screen.findByTestId('bill-row');
      expect(row.className).not.toMatch(/ring-emerald/);
    });
  });

  describe('actions', () => {
    it('Mark paid opens the dialog for that statement with no prefill; submit calls the API and toasts', async () => {
      seed([open]);
      vi.mocked(api.POST).mockResolvedValue({ data: { ...open, status: 'PAID', statementId: 's-open' } } as never);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Mark paid/ }));
      const dialog = screen.getByTestId('mark-paid-dialog');
      expect(dialog).toHaveAttribute('data-statement', 's-open');
      expect(dialog).toHaveAttribute('data-prefill', 'null');

      fireEvent.click(screen.getByText('submit-paid'));
      await waitFor(() =>
        expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
          params: { path: { statementId: 's-open' } },
          body: { amount: 5 },
        }),
      );
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Bill marked as paid'));
      await waitFor(() => expect(screen.queryByTestId('mark-paid-dialog')).not.toBeInTheDocument());
    });

    it('a partial result toasts "Partial payment recorded"', async () => {
      seed([open]);
      vi.mocked(api.POST).mockResolvedValue({ data: { ...open, status: 'PARTIAL' } } as never);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Mark paid/ }));
      fireEvent.click(screen.getByText('submit-paid'));
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Partial payment recorded'));
    });

    it('a failed mark-paid toasts the error and keeps the dialog open', async () => {
      seed([open]);
      vi.mocked(api.POST).mockRejectedValue(new Error('nope'));
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Mark paid/ }));
      fireEvent.click(screen.getByText('submit-paid'));
      await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
      expect(screen.getByTestId('mark-paid-dialog')).toBeInTheDocument();
    });

    it('closing the dialog clears it', async () => {
      seed([open]);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Mark paid/ }));
      fireEvent.click(screen.getByText('close-paid'));
      expect(screen.queryByTestId('mark-paid-dialog')).not.toBeInTheDocument();
    });

    it('Confirm on a possible payment opens mark-paid prefilled with its amount and date', async () => {
      seed([bill({ ...open, possiblePayments: [{ transactionId: 't1', amount: 1500, date: '2026-10-06', description: 'NEFT' }] })]);
      renderWithQuery(<BillsDueWidget />);
      const list = await screen.findByTestId('possible-payments');
      expect(list).toHaveTextContent(/Looks like a payment/);
      fireEvent.click(within(list).getByRole('button', { name: 'Confirm' }));
      expect(screen.getByTestId('mark-paid-dialog')).toHaveAttribute('data-prefill', JSON.stringify({ amount: 1500, paidOn: '2026-10-06' }));
    });

    it('a later Mark paid after Confirm clears the prefill', async () => {
      seed([bill({ ...open, possiblePayments: [{ transactionId: 't1', amount: 1500, date: '2026-10-06' }] })]);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
      fireEvent.click(screen.getByText('close-paid'));
      fireEvent.click(screen.getByRole('button', { name: /Mark paid/ }));
      expect(screen.getByTestId('mark-paid-dialog')).toHaveAttribute('data-prefill', 'null');
    });

    it('Set details opens the details dialog; submit PATCHes and toasts', async () => {
      const unk = bill({ accountId: 'u', statementId: 's-u', status: 'DUE_UNKNOWN', totalAmountDue: 900 });
      seed([unk]);
      vi.mocked(api.PATCH).mockResolvedValue({ data: { ...unk, status: 'OPEN' } } as never);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Set details/ }));
      expect(screen.getByTestId('details-dialog')).toHaveAttribute('data-statement', 's-u');
      fireEvent.click(screen.getByText('submit-details'));
      await waitFor(() =>
        expect(api.PATCH).toHaveBeenCalledWith('/api/v1/bills/{statementId}/details', {
          params: { path: { statementId: 's-u' } },
          body: { paymentDueDate: '2026-10-20' },
        }),
      );
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Statement details saved'));
    });

    it('a failed details save toasts an error', async () => {
      seed([bill({ accountId: 'u', statementId: 's-u', status: 'DUE_UNKNOWN' })]);
      vi.mocked(api.PATCH).mockRejectedValue(new Error('bad'));
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Set details/ }));
      fireEvent.click(screen.getByText('submit-details'));
      await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    });

    it('Set details is offered only for DUE_UNKNOWN', async () => {
      seed([open]);
      renderWithQuery(<BillsDueWidget />);
      await screen.findByRole('button', { name: /Mark paid/ });
      expect(screen.queryByRole('button', { name: /Set details/ })).not.toBeInTheDocument();
    });

    it('Undo shows for a MANUAL partial payment and DELETEs the mark', async () => {
      seed([bill({ ...open, status: 'PARTIAL', paidSource: 'MANUAL', paidAmount: 500 })]);
      vi.mocked(api.DELETE).mockResolvedValue({ data: { ...open } } as never);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Undo/ }));
      await waitFor(() =>
        expect(api.DELETE).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
          params: { path: { statementId: 's-open' } },
        }),
      );
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Payment mark removed'));
    });

    it('no Undo for a LINK-sourced partial, or a MANUAL one with nothing paid', async () => {
      seed([
        bill({ ...open, accountId: 'l', status: 'PARTIAL', paidSource: 'LINK', paidAmount: 500 }),
        bill({ ...open, accountId: 'm', status: 'PARTIAL', paidSource: 'MANUAL', paidAmount: 0 }),
      ]);
      renderWithQuery(<BillsDueWidget />);
      await screen.findAllByTestId('bill-row');
      expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
    });

    it('a failed undo toasts the error', async () => {
      seed([bill({ ...open, status: 'PARTIAL', paidSource: 'MANUAL', paidAmount: 500 })]);
      vi.mocked(api.DELETE).mockRejectedValue(new Error('x'));
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Undo/ }));
      await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    });

    it('MANUAL PAID card with unbilled spend (awaiting row) offers Undo paid', async () => {
      const paid = bill({ accountId: 'pd', statementId: 's-pd', status: 'PAID', paidSource: 'MANUAL', unbilledAmount: 120, paidMarkedOn: '2026-10-03' });
      seed([paid]);
      vi.mocked(api.DELETE).mockResolvedValue({ data: paid } as never);
      renderWithQuery(<BillsDueWidget />);
      const row = await screen.findByTestId('bill-row');
      expect(within(row).getByText('Paid on 3 Oct 26')).toBeInTheDocument();
      fireEvent.click(within(row).getByRole('button', { name: 'Undo paid' }));
      await waitFor(() =>
        expect(api.DELETE).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: 's-pd' } } }),
      );
    });

    it('MANUAL PAID card inside Nothing pending offers Undo paid; LINK paid and statement-less do not', async () => {
      seed([
        bill({ accountId: 'm', accountName: 'M', statementId: 's-m', status: 'PAID', paidSource: 'MANUAL' }),
        bill({ accountId: 'l', accountName: 'L', statementId: 's-l', status: 'PAID', paidSource: 'LINK' }),
        bill({ accountId: 'n', accountName: 'N', status: 'PAID', paidSource: 'MANUAL', statementId: null }),
      ]);
      vi.mocked(api.DELETE).mockResolvedValue({ data: {} } as never);
      renderWithQuery(<BillsDueWidget />);
      fireEvent.click(await screen.findByRole('button', { name: /Nothing pending · 3 cards/ }));
      const undo = screen.getAllByRole('button', { name: 'Undo paid' });
      expect(undo).toHaveLength(1);
      fireEvent.click(undo[0]);
      await waitFor(() =>
        expect(api.DELETE).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: 's-m' } } }),
      );
    });

    it('rows without a statement id render no action buttons', async () => {
      seed([bill({ accountId: 'x', status: 'OPEN', statementId: null, totalAmountDue: 10 })]);
      renderWithQuery(<BillsDueWidget />);
      await screen.findByTestId('bill-row');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
