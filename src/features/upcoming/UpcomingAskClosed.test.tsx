import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _p, ...r }: { href: string; children?: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...r}>
      {children}
    </a>
  ),
}));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
const loanActions = vi.hoisted(() => ({
  closeLoan: vi.fn(),
  dismissLoanClosedPrompt: vi.fn(),
  reopenLoan: vi.fn(),
}));
vi.mock('@/features/loans/loanActions', async (importActual) => ({
  ...(await importActual<typeof import('@/features/loans/loanActions')>()),
  ...loanActions,
}));

import { renderWithQuery } from '@/test/renderWithQuery';

import type { ObligationItem } from './obligationsModel';
import { askClosedRows } from './obligationsModel';
import { UpcomingList } from './UpcomingList';

const emi = (o: Partial<ObligationItem>): ObligationItem =>
  ({ type: 'emi', status: 'upcoming', amount: 100, askClosed: false, ...o }) as ObligationItem;

const ITEMS = [
  emi({ title: 'Home loan EMI #3', loanId: 'L1', installmentSeq: 3, date: '2026-11-06', askClosed: true }),
  emi({ title: 'Home loan EMI #4', loanId: 'L1', installmentSeq: 4, date: '2026-12-06', askClosed: true }),
  emi({ title: 'Car loan EMI #9', loanId: 'L2', installmentSeq: 9, date: '2026-11-10', askClosed: false }),
  emi({ title: 'Bike loan EMI #2', loanId: 'L3', installmentSeq: 2, date: '2026-11-12', askClosed: true }),
];

function renderList(items = ITEMS) {
  return renderWithQuery(
    <UpcomingList items={items} today="2026-11-04" highlightStatementId={null} onMarkPaid={vi.fn()} onSettle={vi.fn()} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  loanActions.closeLoan.mockResolvedValue({ success: true, data: undefined });
  loanActions.dismissLoanClosedPrompt.mockResolvedValue({ success: true, data: undefined });
});

describe('askClosedRows', () => {
  it('picks the oldest askClosed EMI row of each loan, in any order', () => {
    const reversed = [...ITEMS].reverse();
    expect(askClosedRows(reversed).size).toBe(2);
    expect([...askClosedRows(reversed)].map((i) => i.installmentSeq).sort()).toEqual([2, 3]);
  });
});

describe('Upcoming: Is this loan closed?', () => {
  it('asks once per qualifying loan, on its oldest row, not on every row', () => {
    renderList();
    expect(screen.getAllByText('Is this loan closed?')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Yes, closed' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Not yet' })).toHaveLength(2);
  });

  it('Yes, closed closes that loan', async () => {
    renderList();
    await userEvent.click(screen.getAllByRole('button', { name: 'Yes, closed' })[0]);
    await waitFor(() => expect(loanActions.closeLoan).toHaveBeenCalledTimes(1));
    expect(loanActions.dismissLoanClosedPrompt).not.toHaveBeenCalled();
    expect(['L1', 'L3']).toContain(loanActions.closeLoan.mock.calls[0][0]);
  });

  it('Not yet dismisses that loan and refreshes', async () => {
    renderList();
    await userEvent.click(screen.getAllByRole('button', { name: 'Not yet' })[0]);
    await waitFor(() => expect(loanActions.dismissLoanClosedPrompt).toHaveBeenCalledTimes(1));
    expect(['L1', 'L3']).toContain(loanActions.dismissLoanClosedPrompt.mock.calls[0][0]);
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(loanActions.closeLoan).not.toHaveBeenCalled();
  });

  it('asks nothing when no row has askClosed', () => {
    renderList(ITEMS.map((i) => ({ ...i, askClosed: false })));
    expect(screen.queryByText('Is this loan closed?')).toBeNull();
  });
});
