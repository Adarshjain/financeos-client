import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoanMatchSuggestions, LoanResponse, LoansSummaryDetail } from '@/lib/loan.types';
import type { Page } from '@/lib/pagination';
import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsLoansPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/loans',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-21',
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const batch = vi.hoisted(() => vi.fn());
vi.mock('@/features/loans/loanPaymentsBatch', async (orig) => ({
  ...(await orig<typeof import('@/features/loans/loanPaymentsBatch')>()),
  postLoanPaymentsBatch: batch,
}));

const loadClosedLoans = vi.hoisted(() => vi.fn());
vi.mock('@/features/loans/list/closedLoansAction', () => ({ loadClosedLoans }));

const server = vi.hoisted(() => ({
  fetchLoans: vi.fn(),
  fetchLoansSummary: vi.fn(),
  fetchLoanMatches: vi.fn(),
}));
vi.mock('@/features/loans/loansServerApi', () => server);

const loan = (over: Partial<LoanResponse>): LoanResponse =>
  ({
    id: 'l1',
    name: 'Home Loan · SBI MaxGain',
    loanType: 'home',
    rateType: 'floating',
    currentAnnualRatePct: 8.25,
    currentEmi: 36603,
    outstandingPrincipal: 4192327,
    totalInstallments: 240,
    settledInstallments: 13,
    nextDueDate: '2026-10-05',
    projectedEndDate: '2045-01-05',
    status: 'active',
    ...over,
  }) as LoanResponse;

const loans = [
  loan({}),
  loan({ id: 'l2', name: 'Car Loan · HDFC Bank', loanType: 'car', rateType: 'fixed', currentAnnualRatePct: 9.25, currentEmi: 17748, outstandingPrincipal: 752118, totalInstallments: 60, settledInstallments: 7, nextDueDate: '2026-11-07', projectedEndDate: '2031-02-07' }),
];

const pageOf = (content: LoanResponse[], over: Partial<Page<LoanResponse>> = {}): Page<LoanResponse> => ({
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

const summary: LoansSummaryDetail = {
  totalOutstanding: 5050000,
  activeLoanCount: 3,
  lentOutstanding: 0,
  borrowedOutstanding: 1200000,
  netReceivable: 0,
  borrowedPrincipal: 5550000,
  monthlyEmiTotal: 63954,
  emiDueDays: [5, 7, 10],
  overdueAmount: 63954,
  overdueCount: 3,
  interestPaidThisFy: 388210,
  fyStart: '2026-04-01',
  closedLoanCount: 1,
};

const tx = (id: string, date: string, amount: number) => ({ id, date, amount, accountId: 'a1' }) as Transaction;
const matches: LoanMatchSuggestions[] = [
  { loanId: 'l1', loanName: 'Home Loan', suggestions: [{ installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [tx('t1', '2026-10-05', -36603)] }] },
  { loanId: 'l2', loanName: 'Car Loan', suggestions: [{ installmentSeq: 8, dueDate: '2026-10-07', expectedAmount: 17748, candidates: [tx('t2', '2026-10-07', -17748)] }] },
  { loanId: 'l3', loanName: 'Personal', suggestions: [{ installmentSeq: 20, dueDate: '2026-10-10', expectedAmount: 9603, candidates: [tx('t3', '2026-10-10', -9603)] }] },
];

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsLoansPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchLoans.mockResolvedValue(pageOf(loans));
  server.fetchLoansSummary.mockResolvedValue(summary);
  server.fetchLoanMatches.mockResolvedValue([]);
  batch.mockImplementation(async (_id: string, body: { items: unknown[] }) => ({ created: body.items.length }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('/loans', () => {
  it('asks the server for the first page of active loans', async () => {
    await renderPage();
    expect(server.fetchLoans).toHaveBeenCalledWith({ status: 'active', q: '', page: 0, size: 25 });
  });

  it('passes the search, page and size from the URL to the server', async () => {
    await renderPage({ q: 'sbi', page: '2', size: '10' });
    expect(server.fetchLoans).toHaveBeenCalledWith({ status: 'active', q: 'sbi', page: 1, size: 10 });
  });

  it('shows the four tiles from the summary', async () => {
    await renderPage();
    for (const [label, value, context] of [
      ['Outstanding', '₹50.5L', 'of ₹55.5L borrowed'],
      ['EMIs per month', '₹63,954', '3 loans · 5th, 7th, 10th'],
      ['Overdue', '₹63,954', '3 EMIs unpaid'],
      ['Interest this FY', '₹3,88,210', 'Apr – Oct 2026'],
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
      expect(screen.getByText(context)).toBeInTheDocument();
    }
  });

  it('says so under each tile label when the summary fails, and still lists the loans', async () => {
    server.fetchLoansSummary.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getAllByText("Couldn't load this figure. Try again.")).toHaveLength(4);
    expect(screen.getAllByText('Car Loan · HDFC Bank').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Closed ·/)).toBeNull();
  });

  it('lists each loan with rate, EMI, outstanding, progress and next', async () => {
    await renderPage();
    for (const text of [
      'Home Loan · SBI MaxGain', '8.25% floating', '36,603', '41,92,327', '13 of 240 · ends January 2045', '#14 overdue',
      'Car Loan · HDFC Bank', '9.25% fixed', '17,748', '7,52,118', '7 of 60 · ends February 2031', '7 Nov',
    ]) {
      expect(screen.getAllByText(text).length, text).toBeGreaterThan(0);
    }
    for (const header of ['Loan', 'Rate', 'EMI', 'Outstanding', 'Progress', 'Next']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('progressbar').length).toBe(2);
  });

  it('shows the overdue installment as a danger badge only for the overdue loan', async () => {
    await renderPage();
    expect(screen.getAllByText('#14 overdue')).toHaveLength(1);
    expect(screen.queryByText('#8 overdue')).toBeNull();
  });

  it('gives the phone row its second line', async () => {
    await renderPage();
    expect(screen.getByText('8.25% · EMI ₹36,603 · 13 of 240 paid')).toBeInTheDocument();
  });

  it('opens the loan page when the row is pressed', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('Car Loan · HDFC Bank')[0]);
    expect(router.push).toHaveBeenCalledWith('/loans/l2');
    expect(screen.getByRole('link', { name: 'Open Car Loan · HDFC Bank' })).toHaveAttribute('href', '/loans/l2');
  });

  it('shows the Pager above and below with the server totals, and pages through the URL', async () => {
    server.fetchLoans.mockResolvedValue(pageOf(loans, { totalElements: 60, totalPages: 3 }));
    await renderPage({ q: 'bank' });
    expect(screen.getAllByText('/ 60').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/loans?q=bank&page=2', { scroll: false });
  });

  it('searches the server once typing pauses, from the first page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderPage({ page: '3' });
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'sbi' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/loans?q=sbi', { scroll: false });
  });

  it('says nothing matches when a search finds no loan, and invites one when there are none', async () => {
    server.fetchLoans.mockResolvedValue(pageOf([]));
    await renderPage({ q: 'zzz' });
    expect(screen.getByText('No loans match')).toBeInTheDocument();
  });

  it('invites a first loan when there are none at all', async () => {
    server.fetchLoans.mockResolvedValue(pageOf([]));
    await renderPage();
    expect(screen.getByText('No loans yet. Add a loan to track its EMIs.')).toBeInTheDocument();
  });

  it('shows an error with Retry when the loans fail to load', async () => {
    server.fetchLoans.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText("Couldn't load loans")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(router.refresh).toHaveBeenCalled();
  });

  describe('matching line', () => {
    it('is hidden when no installment has exactly one candidate', async () => {
      await renderPage();
      expect(screen.queryByText(/marked paid/)).toBeNull();
      server.fetchLoanMatches.mockResolvedValue([
        { loanId: 'l1', loanName: 'Home Loan', suggestions: [{ installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 1, candidates: [tx('a', '2026-10-05', -1), tx('b', '2026-10-06', -1)] }] },
      ]);
      document.body.innerHTML = '';
      await renderPage();
      expect(screen.queryByText(/marked paid/)).toBeNull();
    });

    it('is hidden when the suggestions request fails', async () => {
      server.fetchLoanMatches.mockRejectedValue(new Error('down'));
      await renderPage();
      expect(screen.queryByText(/marked paid/)).toBeNull();
      expect(screen.getAllByText('Home Loan · SBI MaxGain').length).toBeGreaterThan(0);
    });

    it('says how many EMIs are unpaid and which bank debits match them', async () => {
      server.fetchLoanMatches.mockResolvedValue(matches);
      await renderPage();
      expect(screen.getByText('October EMIs are not marked paid. Three bank debits on 5, 7 and 10 Oct match them.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Link all three' })).toBeInTheDocument();
    });

    it('Link all confirms each loan through the batch endpoint, then toasts and refreshes', async () => {
      server.fetchLoanMatches.mockResolvedValue(matches);
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Link all three' }));
      await waitFor(() => expect(router.refresh).toHaveBeenCalled());
      expect(batch).toHaveBeenCalledTimes(3);
      expect(batch).toHaveBeenCalledWith('l1', { items: [{ installmentSeq: 14, paymentDate: '2026-10-05', amount: 36603, transactionId: 't1' }] });
      expect(batch).toHaveBeenCalledWith('l2', { items: [{ installmentSeq: 8, paymentDate: '2026-10-07', amount: 17748, transactionId: 't2' }] });
      expect(batch).toHaveBeenCalledWith('l3', { items: [{ installmentSeq: 20, paymentDate: '2026-10-10', amount: 9603, transactionId: 't3' }] });
      expect(toast).toHaveBeenCalledWith('Marked 3 EMIs paid');
    });

    it('leaves out installments that have several candidates', async () => {
      server.fetchLoanMatches.mockResolvedValue([
        { loanId: 'l1', loanName: 'Home Loan', suggestions: [
          { installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 1, candidates: [tx('t1', '2026-10-05', -36603)] },
          { installmentSeq: 15, dueDate: '2026-11-05', expectedAmount: 1, candidates: [tx('a', '2026-11-04', -1), tx('b', '2026-11-06', -1)] },
        ] },
      ]);
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Link it' }));
      await waitFor(() => expect(batch).toHaveBeenCalledTimes(1));
      expect(batch.mock.calls[0][1].items).toHaveLength(1);
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Marked 1 EMI paid'));
    });

    it('toasts the failure, stops, and does not refresh when nothing was recorded', async () => {
      server.fetchLoanMatches.mockResolvedValue(matches);
      batch.mockRejectedValue(new Error('nope'));
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Link all three' }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't record batch loan payments. Try again.", { tone: 'danger' }));
      expect(batch).toHaveBeenCalledTimes(1);
      expect(router.refresh).not.toHaveBeenCalled();
    });

    it('still reports what was recorded when a later loan fails', async () => {
      server.fetchLoanMatches.mockResolvedValue(matches);
      batch.mockResolvedValueOnce({ created: 1 }).mockRejectedValueOnce(new Error('nope'));
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Link all three' }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Marked 1 EMI paid'));
      expect(toast).toHaveBeenCalledWith("Couldn't record batch loan payments. Try again.", { tone: 'danger' });
      expect(router.refresh).toHaveBeenCalled();
    });
  });

  describe('Closed line', () => {
    const closedRow = {
      id: 'l9',
      name: 'Old Bike Loan',
      kind: 'two wheeler',
      rate: '12% fixed',
      emi: '3,000',
      outstanding: '0',
      progressPct: 100,
      progressText: '24 of 24',
      next: { kind: 'status', label: 'Closed' },
      phoneSub: '12% · EMI ₹3,000 · 24 of 24 paid',
      closed: true,
      href: '/loans/l9',
    };

    it('reads "Closed · n" with a Show button, and loads nothing until it is pressed', async () => {
      await renderPage();
      expect(screen.getByText('Closed · 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();
      expect(loadClosedLoans).not.toHaveBeenCalled();
      expect(screen.queryByText('Old Bike Loan')).toBeNull();
    });

    it('is not shown when there are no closed loans', async () => {
      server.fetchLoansSummary.mockResolvedValue({ ...summary, closedLoanCount: 0 });
      await renderPage();
      expect(screen.queryByText(/Closed ·/)).toBeNull();
    });

    it('Show reveals the closed loans below the active ones in place, and Hide puts them away', async () => {
      loadClosedLoans.mockResolvedValue({ success: true, data: [closedRow] });
      await renderPage({ q: 'bike' });
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      await waitFor(() => expect(screen.getAllByText('Old Bike Loan').length).toBeGreaterThan(0));
      expect(loadClosedLoans).toHaveBeenCalledWith('bike');
      expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
      expect(router.push).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Hide/ }));
      expect(screen.queryByText('Old Bike Loan')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getAllByText('Old Bike Loan').length).toBeGreaterThan(0);
      expect(loadClosedLoans).toHaveBeenCalledTimes(1);
    });

    it('says so when no closed loan matches the search', async () => {
      loadClosedLoans.mockResolvedValue({ success: true, data: [] });
      await renderPage({ q: 'zzz' });
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith('No closed loans match.'));
      expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();
    });

    it('toasts the failure when the closed loans cannot be loaded', async () => {
      loadClosedLoans.mockResolvedValue({ success: false, error: { message: "Couldn't load closed loans. Try again." } });
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't load closed loans. Try again.", { tone: 'danger' }));
      expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();
    });
  });
});
