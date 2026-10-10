import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/RowBreakdownDialog', () => ({
  RowBreakdownDialog: (p: { datasource: string; rowId: string; title: string }) => (
    <div data-testid="breakdown-dialog" data-datasource={p.datasource} data-row={p.rowId} data-title={p.title} />
  ),
}));

import { api } from '@/lib/api/client';
import type { LoanResponse } from '@/lib/loan.types';
import { ACTIVE_LOANS_PAGE } from '@/lib/query/hooks/useLoans';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LoanNameSubtitle, LoanPayoffWidget, principalRepaidPct } from '../LoanPayoffWidget';

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

const respond = (loans: LoanResponse[]) =>
  vi.mocked(api.GET).mockResolvedValue({ data: { content: loans } } as never);

describe('principalRepaidPct', () => {
  it('is the repaid share of the original principal, clamped to 0–100', () => {
    expect(principalRepaidPct({ principal: 100, outstandingPrincipal: 69 })).toBe(31);
    expect(principalRepaidPct({ principal: 100, outstandingPrincipal: 120 })).toBe(0);
    expect(principalRepaidPct({ principal: 100, outstandingPrincipal: -5 })).toBe(100);
    expect(principalRepaidPct({ principal: 0, outstandingPrincipal: 0 })).toBe(0);
  });
});

describe('LoanPayoffWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads the active loans page and shows the skeleton meanwhile', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<LoanPayoffWidget loanId={null} />);
    expect(screen.getByTestId('loan-payoff-loading')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/loans', { params: { query: ACTIVE_LOANS_PAGE } });
  });

  it('shows the error state', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('x'));
    renderWithQuery(<LoanPayoffWidget loanId={null} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your loans");
  });

  it('no active loans → empty state linking to loans', async () => {
    respond([]);
    renderWithQuery(<LoanPayoffWidget loanId={null} />);
    expect(await screen.findByText('No active loans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to loans' })).toHaveAttribute('href', '/loans');
  });

  it('per loan: outstanding, % principal repaid, payoff date, interest to go and next EMI', async () => {
    respond([loan(), loan({ id: 'l2', name: 'Car loan', nextDueDate: null, projectedEndDate: null })]);
    renderWithQuery(<LoanPayoffWidget loanId={null} />);
    const rows = within(await screen.findByRole('list', { name: 'Loans' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Home loan');
    expect(rows[0]).toHaveTextContent('₹34,50,000 left');
    expect(within(rows[0]).getByRole('progressbar', { name: 'Home loan principal repaid' })).toHaveAttribute('aria-valuenow', '31');
    expect(rows[0]).toHaveTextContent('31% of principal repaid · paid off by 05/03/2041');
    expect(rows[0]).toHaveTextContent('₹21,60,000 interest to go · Next EMI ₹43,391 on 05/11/2026');
    // Without a schedule date the parts are left out.
    expect(rows[1]).toHaveTextContent('31% of principal repaid');
    expect(rows[1]).not.toHaveTextContent('paid off by');
    expect(rows[1]).not.toHaveTextContent('Next EMI');
  });

  it('a picked loan shows only that loan; a closed / missing one says so', async () => {
    respond([loan(), loan({ id: 'l2', name: 'Car loan' })]);
    const { unmount } = renderWithQuery(<LoanPayoffWidget loanId="l2" />);
    const rows = within(await screen.findByRole('list', { name: 'Loans' })).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Car loan');
    unmount();
    renderWithQuery(<LoanPayoffWidget loanId="gone" />);
    expect(await screen.findByText('This loan is closed or no longer exists')).toBeInTheDocument();
  });

  it('the outstanding figure opens the loan\'s net-worth breakdown', async () => {
    respond([loan()]);
    renderWithQuery(<LoanPayoffWidget loanId={null} />);
    await userEvent.click(await screen.findByRole('button', { name: /— view breakdown of Home loan$/ }));
    const dialog = await screen.findByTestId('breakdown-dialog');
    expect(dialog).toHaveAttribute('data-datasource', 'net_worth');
    expect(dialog).toHaveAttribute('data-row', 'l1');
    expect(dialog).toHaveAttribute('data-title', 'Home loan');
  });

  it('LoanNameSubtitle names the picked loan, "One loan" until known', async () => {
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
