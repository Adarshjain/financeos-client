import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));

vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportRowBreakdownDialog: (p: { datasource: string; rowId: string; title: string; onClose: () => void }) => (
    <button type="button" data-testid="breakdown" data-datasource={p.datasource} data-row-id={p.rowId} data-title={p.title} onClick={p.onClose} />
  ),
}));
import { api } from '@/lib/api/client';
import type { LoanResponse } from '@/lib/loan.types';
import { ACTIVE_LOANS_PAGE } from '@/lib/query/hooks/useLoans';
import { renderWithQuery } from '@/test/renderWithQuery';

import { principalRepaidPct } from './loanPayoff';
import { LoanNameSubtitle, LoanPayoffBody } from './LoanPayoffBody';

const loan = (over: Partial<LoanResponse> = {}): LoanResponse => ({
  id: 'l1',
  name: 'Home loan',
  loanType: 'home',
  principal: 5000000,
  annualRatePct: 8.5,
  rateType: 'floating',
  tenureMonths: 240,
  startDate: '2021-03-01',
  firstEmiDate: '2021-04-05',
  emiAmount: 43391,
  status: 'active',
  createdAt: '2021-03-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  currentAnnualRatePct: 8.5,
  currentEmi: 43391,
  outstandingPrincipal: 3450000,
  totalInstallments: 240,
  settledInstallments: 66,
  nextDueDate: '2026-11-05',
  projectedEndDate: '2041-03-05',
  totalInterestPaid: 1200000,
  totalInterestRemaining: 2160000,
  ...over,
});
const respond = (loans: LoanResponse[]) => vi.mocked(api.GET).mockResolvedValue({ data: { content: loans } } as never);

describe('principalRepaidPct', () => {
  it('is the repaid share of the original principal, clamped to 0–100', () => {
    expect(principalRepaidPct({ principal: 100, outstandingPrincipal: 69 })).toBe(31);
    expect(principalRepaidPct({ principal: 100, outstandingPrincipal: 120 })).toBe(0);
    expect(principalRepaidPct({ principal: 100, outstandingPrincipal: -5 })).toBe(100);
    expect(principalRepaidPct({ principal: 0, outstandingPrincipal: 0 })).toBe(0);
  });
});

describe('LoanPayoffBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads the active loans page and shows the skeleton meanwhile', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<LoanPayoffBody loanId={null} />);
    expect(screen.getByTestId('loan-payoff-loading')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/loans', { params: { query: ACTIVE_LOANS_PAGE } });
  });

  it('a failed load says what failed and Retry fetches again', async () => {
    vi.mocked(api.GET).mockRejectedValueOnce(new Error('x'));
    renderWithQuery(<LoanPayoffBody loanId={null} />);
    expect(await screen.findByText("Couldn't load your loans")).toBeInTheDocument();
    respond([loan()]);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Home loan')).toBeInTheDocument();
  });

  it('no active loans: an empty state with a way to Loans', async () => {
    respond([]);
    renderWithQuery(<LoanPayoffBody loanId={null} />);
    expect(await screen.findByText('No active loans')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to loans' }));
    expect(nav.push).toHaveBeenCalledWith(expect.stringContaining('/loans'));
  });

  it('per loan: name, amount left and a repaid bar only; the amount left opens the loan breakdown', async () => {
    respond([loan(), loan({ id: 'l2', name: 'Car loan', nextDueDate: null, projectedEndDate: null })]);
    renderWithQuery(<LoanPayoffBody loanId={null} />);
    const rows = within(await screen.findByRole('list', { name: 'Loans' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Home loan');
    expect(rows[0]).toHaveTextContent('₹34,50,000 left');
    expect(within(rows[0]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '31');
    // No second or third text line.
    expect(rows[0]).not.toHaveTextContent('of principal repaid');
    expect(rows[0]).not.toHaveTextContent('paid off by');
    expect(rows[0]).not.toHaveTextContent('interest to go');
    expect(rows[0]).not.toHaveTextContent('Next EMI');
    expect(within(rows[0]).queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(within(rows[0]).getByRole('button', { name: '₹34,50,000 left' }));
    const dialog = screen.getByTestId('breakdown');
    expect(dialog).toHaveAttribute('data-datasource', 'net_worth');
    expect(dialog).toHaveAttribute('data-row-id', 'l1');
    expect(dialog).toHaveAttribute('data-title', 'Home loan');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('breakdown')).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '31');
  });

  it('a picked loan shows only that loan; a closed or missing one says so', async () => {
    respond([loan(), loan({ id: 'l2', name: 'Car loan' })]);
    const { unmount } = renderWithQuery(<LoanPayoffBody loanId="l2" />);
    const rows = within(await screen.findByRole('list', { name: 'Loans' })).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Car loan');
    unmount();
    renderWithQuery(<LoanPayoffBody loanId="gone" />);
    expect(await screen.findByText('This loan is closed or no longer exists')).toBeInTheDocument();
  });

  it('LoanNameSubtitle names the picked loan, "One loan" until known or when gone', async () => {
    respond([loan()]);
    const { unmount } = renderWithQuery(<LoanNameSubtitle loanId="l1" />);
    expect(screen.getByText('One loan')).toBeInTheDocument();
    expect(await screen.findByText('Home loan')).toBeInTheDocument();
    unmount();
    renderWithQuery(<LoanNameSubtitle loanId="other" />);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('One loan')).toBeInTheDocument();
  });
});
