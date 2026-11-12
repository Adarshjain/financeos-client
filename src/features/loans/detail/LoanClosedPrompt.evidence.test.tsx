import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/loans/l1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));

const m = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    addPayment: mutation(),
    addPaymentsBatch: mutation(),
    deletePayment: mutation(),
    addEvent: mutation(),
    deleteEvent: mutation(),
    addCharge: mutation(),
    deleteCharge: mutation(),
    closeLoan: mutation(),
    reopenLoan: mutation(),
    deleteLoan: mutation(),
  };
});
vi.mock('@/features/loans/useLoanMutations', async (importActual) => ({
  ...(await importActual<typeof import('@/features/loans/useLoanMutations')>()),
  useLoanMutations: () => m,
}));
const dismiss = vi.hoisted(() => vi.fn());
const loadEvidence = vi.hoisted(() => vi.fn());
vi.mock('@/features/loans/loanActions', async (importActual) => ({
  ...(await importActual<typeof import('@/features/loans/loanActions')>()),
  dismissLoanClosedPrompt: dismiss,
  loadLoanCloseEvidence: loadEvidence,
}));

import { formatDate, formatMoney } from '@/lib/format';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LoanClosedPrompt } from '../LoanClosedPrompt';
import { detailFixture, scheduleFixture, TODAY } from './loanDetail.fixtures';
import { LoanDetailScreen } from './LoanDetailScreen';

pinClock();
const user = userEvent.setup({ pointerEventsCheck: 0 });

function renderView(detail = detailFixture()) {
  return renderWithQuery(
    <LoanDetailScreen detail={detail} schedule={scheduleFixture()} today={TODAY} highlightSeq={null} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dismiss.mockResolvedValue({ success: true, data: undefined });
});

const EVIDENCE = {
  oldestUnpaidSeq: 7,
  oldestUnpaidDueDate: '2026-09-05',
  daysOverdue: 68,
  lastPaymentDate: '2026-08-05',
  lastPaymentAmount: 12000,
  settledInstallments: 6,
  totalInstallments: 24,
  outstandingPrincipal: 150000,
};

describe('loan page: the evidence behind "Is this loan closed?"', () => {
  it('shows the unpaid EMI, the last payment and the progress before the answers', () => {
    renderView(detailFixture({ askClosed: true, closeEvidence: EVIDENCE }));
    expect(screen.getByText(`EMI #7 was due on ${formatDate('2026-09-05', 'list')} and has no payment for 68 days.`)).toBeInTheDocument();
    expect(screen.getByText(`Last payment ${formatMoney(12000, { decimals: 'auto' })} on ${formatDate('2026-08-05', 'list')}.`)).toBeInTheDocument();
    expect(screen.getByText(`6 of 24 EMIs paid · ${formatMoney(150000, { decimals: 'auto' })} principal left.`)).toBeInTheDocument();
  });

  it('shows only the question when the server sent no evidence', () => {
    renderView(detailFixture({ askClosed: true, closeEvidence: null }));
    expect(screen.queryByText(/was due on/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Yes, closed' })).toBeInTheDocument();
  });

  it('Not yet still calls the same dismiss action with evidence shown', async () => {
    renderView(detailFixture({ askClosed: true, closeEvidence: EVIDENCE }));
    await user.click(screen.getByRole('button', { name: 'Not yet' }));
    await waitFor(() => expect(dismiss).toHaveBeenCalledWith('l1'));
  });

  it('loads the evidence itself when the caller has only the loan id', async () => {
    loadEvidence.mockResolvedValue({ success: true, data: EVIDENCE });
    renderWithQuery(<LoanClosedPrompt loanId="l9" />);
    expect(await screen.findByText(/EMI #7 was due on/)).toBeInTheDocument();
    expect(loadEvidence).toHaveBeenCalledWith('l9');
  });

  it('hides itself when the loaded loan no longer asks to close', async () => {
    loadEvidence.mockResolvedValue({ success: true, data: null });
    renderWithQuery(<LoanClosedPrompt loanId="l8" />);
    await waitFor(() => expect(loadEvidence).toHaveBeenCalledWith('l8'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Yes, closed' })).toBeNull());
  });

  it('keeps showing the question while the evidence loads', () => {
    loadEvidence.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<LoanClosedPrompt loanId="l7" />);
    expect(screen.getByRole('button', { name: 'Yes, closed' })).toBeInTheDocument();
  });
});
