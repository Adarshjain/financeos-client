import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { CounterpartyListItem, CounterpartyMatchSuggestions, CounterpartySummary, UnrecordedTransfer } from '@/lib/lending.types';
import type { Page } from '@/lib/pagination';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsLendingsPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  unstable_rethrow: () => undefined,
  useRouter: () => router,
  usePathname: () => '/loans/lendings',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ PUT: vi.fn(), DELETE: vi.fn(), GET: vi.fn(), POST: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));

const server = vi.hoisted(() => ({
  fetchPeople: vi.fn(),
  fetchPeopleSummary: vi.fn(),
  fetchPeopleMatches: vi.fn(),
  fetchUnrecordedTransfers: vi.fn(),
  fetchAccounts: vi.fn(),
}));
vi.mock('@/features/loans/loansServerApi', () => server);

const person = (over: Partial<CounterpartyListItem>): CounterpartyListItem => ({
  id: 'p1',
  name: 'Rahul Sharma',
  notes: null,
  entryCount: 2, linkedEntryCount: 0,
  netPosition: 15000,
  repaidByYou: 0,
  repaidToYou: 10000,
  totalBorrowed: 0,
  totalLent: 25000,
  lastEntryDate: '2026-10-10',
  lastEntryType: 'borrowed',
  lastEntryKind: 'settlement',
  lastEntryAmount: 10000,
  expectedReturnDate: '2026-10-28',
  ...over,
});

const people = [
  person({}),
  person({
    id: 'p2',
    name: 'Priya Nair',
    netPosition: -12000,
    expectedReturnDate: '2026-10-23',
    lastEntryKind: 'principal',
    lastEntryType: 'borrowed',
    lastEntryDate: '2026-09-23',
  }),
  person({ id: 'p3', name: 'Dad', netPosition: -100000, expectedReturnDate: null, lastEntryType: 'lent', lastEntryDate: '2026-07-15', lastEntryAmount: 50000 }),
  person({ id: 'p4', name: 'Goa trip pool', netPosition: 0, expectedReturnDate: null, lastEntryDate: '2026-08-24', lastEntryAmount: 4200 }),
];

const pageOf = (content: CounterpartyListItem[], over: Partial<Page<CounterpartyListItem>> = {}): Page<CounterpartyListItem> => ({
  content,
  number: 0,
  size: 25,
  totalElements: content.length,
  totalPages: 1,
  first: true,
  last: true,
  empty: content.length === 0,
  ...over,
});

const summary: CounterpartySummary = {
  owedToYou: 19200,
  owedToYouCount: 2,
  youOwe: 112000,
  youOweCount: 2,
  dueThisMonth: { amount: 12000, count: 1, nextName: 'Priya', nextDate: '2026-10-23' },
  expectedBack: { amount: 15000, count: 1, nextName: 'Rahul', nextDate: '2026-10-28' },
};

const tx = (id: string, over: Partial<Transaction> = {}): Transaction =>
  ({ id, accountId: 'a1', date: '2026-09-13', amount: 2300, description: 'IMPS from Priya Nair', source: 'manual', createdAt: '', ...over }) as Transaction;

const matches: CounterpartyMatchSuggestions[] = [
  {
    counterpartyId: 'p2',
    counterpartyName: 'Priya Nair',
    suggestions: [{ lendingId: 'l1', direction: 'borrowed', amount: 2300, entryDate: '2026-09-12', notes: 'split', candidates: [tx('t1')] }],
  },
];

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsLendingsPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchPeople.mockResolvedValue(pageOf(people));
  server.fetchPeopleSummary.mockResolvedValue(summary);
  server.fetchPeopleMatches.mockResolvedValue([]);
  server.fetchUnrecordedTransfers.mockResolvedValue([]);
  server.fetchAccounts.mockResolvedValue([{ id: 'a1', name: 'HDFC Savings' }]);
  api.PUT.mockResolvedValue({ data: {} });
  api.POST.mockResolvedValue({ data: { id: 'new1' } });
  api.DELETE.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('/loans/lendings', () => {
  it('asks the server for the first page with no filter by default', async () => {
    await renderPage();
    expect(server.fetchPeople).toHaveBeenCalledWith({ q: '', direction: undefined, page: 0, size: 25 });
  });

  it('passes the search, chip, page and size from the URL to the server', async () => {
    await renderPage({ q: 'pri', filter: 'owe', page: '3', size: '10' });
    expect(server.fetchPeople).toHaveBeenCalledWith({ q: 'pri', direction: 'YOU_OWE', page: 2, size: 10 });
  });

  it('shows the four tiles from the summary', async () => {
    await renderPage();
    for (const [label, value, context] of [
      ['Owed to you', '₹19,200', '2 people'],
      ['You owe', '₹1,12,000', '2 people'],
      ['Due this month', '₹12,000', 'Priya · 23 Oct'],
      ['Expected back', '₹15,000', 'Rahul · 28 Oct'],
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
      expect(screen.getAllByText(context).length).toBeGreaterThan(0);
    }
  });

  it('says so under each tile label when the summary fails, and still lists the people', async () => {
    server.fetchPeopleSummary.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getAllByText("Couldn't load this figure. Try again.")).toHaveLength(4);
    expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
  });

  it('lists each person with direction, balance, expected and last entry', async () => {
    await renderPage();
    for (const text of [
      'Rahul Sharma', 'Owes you', '+15,000', '28 Oct · in 15 d', '10 Oct · repaid ₹10,000',
      'Priya Nair', 'You owe', '12,000', '23 Oct · in 10 d', '23 Sep · borrowed',
      'Dad', '1,00,000', '15 Jul · repaid ₹50,000',
      'Goa trip pool', 'Settled', '24 Aug · settled ₹4,200',
    ]) {
      expect(screen.getAllByText(text).length, text).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('no date').length).toBe(2);
    for (const header of ['Person', 'Direction', 'Balance', 'Expected', 'Last entry']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('gives the phone row its second line', async () => {
    await renderPage();
    expect(screen.getByText('expected 28 Oct · last entry 10 Oct')).toBeInTheDocument();
    expect(screen.getByText('due 23 Oct · last entry 23 Sep')).toBeInTheDocument();
  });

  it('opens a person on the Dinero page when the row is pressed', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('Priya Nair')[0]);
    expect(router.push).toHaveBeenCalledWith('/loans/lendings/p2');
    expect(screen.getByRole('link', { name: 'Open Priya Nair' })).toHaveAttribute('href', '/loans/lendings/p2');
  });

  it('shows the Pager above and below with the server totals', async () => {
    server.fetchPeople.mockResolvedValue(pageOf(people, { totalElements: 60, totalPages: 3 }));
    await renderPage();
    expect(screen.getAllByText('/ 60').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('1–25').length).toBeGreaterThanOrEqual(2);
  });

  it('goes to the next page through the URL', async () => {
    server.fetchPeople.mockResolvedValue(pageOf(people, { totalElements: 60, totalPages: 3 }));
    await renderPage({ filter: 'owed' });
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/loans/lendings?filter=owed&page=2', { scroll: false });
  });

  it('marks the chip of the current filter and navigates on another chip', async () => {
    await renderPage({ filter: 'owe' });
    expect(screen.getByRole('button', { name: 'You owe' }).className).toContain('bg-brand-tint');
    expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-brand-tint');
    fireEvent.click(screen.getByRole('button', { name: 'Settled' }));
    expect(router.push).toHaveBeenCalledWith('/loans/lendings?filter=settled', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(router.push).toHaveBeenLastCalledWith('/loans/lendings', { scroll: false });
  });

  it('searches the server once typing pauses, from the first page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderPage({ page: '3', filter: 'owed' });
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'pri' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/loans/lendings?q=pri&filter=owed', { scroll: false });
  });

  it('says nothing matches when a search or chip finds no one, and invites an entry when there is no one at all', async () => {
    server.fetchPeople.mockResolvedValue(pageOf([]));
    await renderPage({ q: 'zzz' });
    expect(screen.getByText('No people match')).toBeInTheDocument();
  });

  it('invites a first entry when there are no people at all', async () => {
    server.fetchPeople.mockResolvedValue(pageOf([]));
    await renderPage();
    expect(screen.getByText('No lendings yet. Add a lending to start a ledger.')).toBeInTheDocument();
  });

  it('shows an error with Retry and the reference when the people fail to load', async () => {
    server.fetchPeople.mockRejectedValue(new ApiError(500, { code: 'X', message: 'boom', timestamp: '' }, { requestId: 'req-42' }));
    await renderPage();
    expect(screen.getByText("Couldn't load people")).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.getByText('Owed to you')).toBeInTheDocument();
  });

  describe('Unlinked bank transfers', () => {
    it('is not shown when there are no suggestions', async () => {
      await renderPage();
      expect(screen.queryByText('Unlinked bank transfers')).toBeNull();
      expect(server.fetchAccounts).not.toHaveBeenCalled();
    });

    it('is not shown when the suggestions request fails', async () => {
      server.fetchPeopleMatches.mockRejectedValue(new Error('down'));
      await renderPage();
      expect(screen.queryByText('Unlinked bank transfers')).toBeNull();
    });

    it('lists each (entry, candidate) pair with description, amount, date, account and notes', async () => {
      server.fetchPeopleMatches.mockResolvedValue(matches);
      await renderPage();
      expect(screen.getByText('Unlinked bank transfers')).toBeInTheDocument();
      expect(screen.getByText('Look like lending entries')).toBeInTheDocument();
      expect(screen.getByText('IMPS from Priya Nair · ₹2,300')).toBeInTheDocument();
      expect(screen.getByText('13 Sep · HDFC Savings · "split"')).toBeInTheDocument();
      expect(screen.queryByText('Record as settlement')).toBeNull();
    });

    it('still lists the pair, without the account, when the accounts fail', async () => {
      server.fetchPeopleMatches.mockResolvedValue(matches);
      server.fetchAccounts.mockRejectedValue(new Error('down'));
      await renderPage();
      expect(screen.getByText('13 Sep · "split"')).toBeInTheDocument();
    });

    it('Link attaches the transaction and keeps the row as linked until the next refresh; Undo restores it', async () => {
      server.fetchPeopleMatches.mockResolvedValue(matches);
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Link' }));
      await waitFor(() => expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
        params: { path: { id: 'l1' } },
        body: { transactionId: 't1' },
      }));
      expect(await screen.findByText('Linked')).toBeInTheDocument();
      expect(screen.getByText('13 Sep · already linked to the 12 Sep entry')).toBeInTheDocument();
      expect(screen.getByText('IMPS from Priya Nair · ₹2,300')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Link' })).toBeNull();
      expect(router.refresh).not.toHaveBeenCalled();
      const [message, options] = toast.mock.calls[0];
      expect(message).toBe('Linked to Priya Nair');
      expect(options.action.label).toBe('Undo');

      await act(async () => options.action.onSelect());
      await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', { params: { path: { id: 'l1' } } }));
      expect(await screen.findByRole('button', { name: 'Link' })).toBeInTheDocument();
      expect(screen.queryByText('Linked')).toBeNull();
      expect(screen.getByText('13 Sep · HDFC Savings · "split"')).toBeInTheDocument();
    });

    it('hides the other rows of a linked entry or transaction, and Undo brings them back', async () => {
      const two = [{
        ...matches[0],
        suggestions: [
          { ...matches[0].suggestions[0], candidates: [tx('t1'), tx('t2', { description: 'Second candidate' })] },
          { ...matches[0].suggestions[0], lendingId: 'l2', candidates: [tx('t1', { description: 'Same transaction' })] },
        ],
      }];
      server.fetchPeopleMatches.mockResolvedValue(two);
      await renderPage();
      expect(screen.getAllByRole('button', { name: 'Link' })).toHaveLength(3);
      fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[0]);
      expect(await screen.findByText('Linked')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Link' })).toBeNull();
      expect(screen.queryByText(/Second candidate/)).toBeNull();
      expect(screen.queryByText(/Same transaction/)).toBeNull();

      await act(async () => toast.mock.calls[0][1].action.onSelect());
      expect(await screen.findAllByRole('button', { name: 'Link' })).toHaveLength(3);
    });

    it('toasts the failure and does not refresh when linking fails', async () => {
      server.fetchPeopleMatches.mockResolvedValue(matches);
      api.PUT.mockRejectedValue(new Error('nope'));
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Link' }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't link transaction. Try again.", { tone: 'danger' }));
      expect(router.refresh).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Link' })).toBeEnabled();
    });
  });

  describe('Unrecorded transfers', () => {
    const unrecorded: UnrecordedTransfer[] = [
      { counterpartyId: 'p1', counterpartyName: 'Rahul Sharma', direction: 'borrowed', transaction: tx('t9', { date: '2026-10-13', amount: 2000, description: 'UPI Rahul Sharma' }) },
      { counterpartyId: 'p2', counterpartyName: 'Priya Nair', direction: 'lent', transaction: tx('t8', { date: '2026-10-11', amount: -1500, description: 'UPI Priya Nair' }) },
    ];

    it('is hidden when both lists are empty', async () => {
      await renderPage();
      expect(screen.queryByText('Unlinked bank transfers')).toBeNull();
    });

    it('shows the card for unrecorded transfers alone, with person, amount, date, account and direction', async () => {
      server.fetchUnrecordedTransfers.mockResolvedValue(unrecorded);
      await renderPage();
      expect(screen.getByText('Unlinked bank transfers')).toBeInTheDocument();
      expect(screen.getByText('Received from Rahul Sharma · ₹2,000')).toBeInTheDocument();
      expect(screen.getByText('13 Oct · HDFC Savings')).toBeInTheDocument();
      expect(screen.getByText('Paid to Priya Nair · ₹1,500')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Record as settlement' })).toHaveLength(2);
    });

    it('records the transfer, hides the row and toasts with Undo, which deletes the entry', async () => {
      server.fetchUnrecordedTransfers.mockResolvedValue(unrecorded);
      await renderPage();
      fireEvent.click(screen.getAllByRole('button', { name: 'Record as settlement' })[0]);
      await waitFor(() =>
        expect(api.POST).toHaveBeenCalledWith('/api/v1/counterparties/{id}/settlements', {
          params: { path: { id: 'p1' } },
          body: { transactionId: 't9' },
        }),
      );
      await waitFor(() => expect(screen.queryByText('Received from Rahul Sharma · ₹2,000')).toBeNull());
      expect(screen.getByText('Paid to Priya Nair · ₹1,500')).toBeInTheDocument();
      expect(router.refresh).toHaveBeenCalled();
      const [message, options] = toast.mock.calls[0];
      expect(message).toBe('Recorded as settlement with Rahul Sharma');
      expect(options.action.label).toBe('Undo');

      await act(async () => options.action.onSelect());
      await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}', { params: { path: { id: 'new1' } } }));
      expect(await screen.findByText('Received from Rahul Sharma · ₹2,000')).toBeInTheDocument();
    });

    it('shows the server message and keeps the row when recording fails', async () => {
      server.fetchUnrecordedTransfers.mockResolvedValue(unrecorded);
      api.POST.mockRejectedValue(new ApiError(409, { message: 'Already recorded' } as never));
      await renderPage();
      fireEvent.click(screen.getAllByRole('button', { name: 'Record as settlement' })[0]);
      await waitFor(() => expect(toast).toHaveBeenCalled());
      expect(toast.mock.calls[0][0]).toBe('Already recorded');
      expect(toast.mock.calls[0][1]).toEqual({ tone: 'danger' });
      expect(screen.getByText('Received from Rahul Sharma · ₹2,000')).toBeInTheDocument();
    });
  });
});
