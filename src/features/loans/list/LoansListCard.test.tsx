import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoansListCard, type LoansListCardProps } from './LoansListCard';
import type { LoanRow } from './loansListModel';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const loadClosedLoans = vi.hoisted(() => vi.fn());
vi.mock('./closedLoanActions', () => ({ loadClosedLoans }));

const row = (id: string, name: string, closed = false): LoanRow => ({
  id,
  name,
  lender: 'SBI',
  kind: 'home',
  rate: '8% fixed',
  emi: '100',
  outstanding: '1,000',
  progressPct: 10,
  progressText: '1 of 10',
  next: closed ? { kind: 'status', label: 'Closed' } : { kind: 'date', label: '5 Nov' },
  phoneSub: 'sub',
  closed,
  href: `/loans/${id}`,
});

const props = (over: Partial<LoansListCardProps> = {}): LoansListCardProps => ({
  state: { q: '', page: 0, size: 25 },
  rows: [row('l1', 'Home Loan')],
  totalElements: 1,
  totalPages: 1,
  closedLine: 'Closed · 1',
  ...over,
});

const user = userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => {
  vi.clearAllMocks();
  loadClosedLoans.mockResolvedValue({ success: true, data: [row('l9', 'Old Bike Loan', true)] });
});

describe('LoansListCard closed loans', () => {
  it('shows the lender between the name and the type', () => {
    render(<LoansListCard {...props()} />);
    expect(screen.getAllByText((_, el) => el?.textContent === 'Home Loan · SBI · home').length).toBeGreaterThan(0);
  });

  it('keeps the Show control after a search change, and Show loads the closed loans for the new search', async () => {
    const { rerender } = render(<LoansListCard {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    await waitFor(() => expect(screen.getAllByText('Old Bike Loan').length).toBeGreaterThan(0));

    const next = props({ state: { q: 'bike', page: 0, size: 25 }, rows: [row('l1', 'Home Loan')] });
    rerender(<LoansListCard {...next} />);
    expect(screen.queryByText('Old Bike Loan')).toBeNull();
    expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();

    loadClosedLoans.mockResolvedValue({ success: true, data: [row('l8', 'Bike Loan Two', true)] });
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    await waitFor(() => expect(screen.getAllByText('Bike Loan Two').length).toBeGreaterThan(0));
    expect(loadClosedLoans).toHaveBeenLastCalledWith('bike');
    expect(screen.getByRole('button', { name: /Hide/ })).toBeInTheDocument();
  });

  it('loads the closed loans again after a refresh while they are shown', async () => {
    const { rerender } = render(<LoansListCard {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    await waitFor(() => expect(screen.getAllByText('Old Bike Loan').length).toBeGreaterThan(0));
    expect(loadClosedLoans).toHaveBeenCalledTimes(1);

    loadClosedLoans.mockResolvedValue({ success: true, data: [row('l9', 'Old Bike Loan', true), row('l7', 'Fresh Closed', true)] });
    rerender(<LoansListCard {...props({ rows: [row('l1', 'Home Loan')], closedLine: 'Closed · 2' })} />);
    await waitFor(() => expect(screen.getAllByText('Fresh Closed').length).toBeGreaterThan(0));
    expect(loadClosedLoans).toHaveBeenCalledTimes(2);
  });
});

describe('LoansListCard paging', () => {
  it('a new page size goes back to the first page', async () => {
    render(<LoansListCard {...props({ state: { q: 'sbi', page: 2, size: 25 }, totalElements: 90, totalPages: 4 })} />);
    await user.click(screen.getAllByRole('button', { name: 'Rows per page' })[0]);
    await user.click(screen.getByRole('option', { name: '10 / page' }));
    expect(router.push).toHaveBeenCalledWith('/loans?q=sbi&size=10', { scroll: false });
  });
});
