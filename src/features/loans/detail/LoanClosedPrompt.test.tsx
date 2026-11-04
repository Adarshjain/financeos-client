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
vi.mock('@/features/loans/loanActions', async (importActual) => ({
  ...(await importActual<typeof import('@/features/loans/loanActions')>()),
  dismissLoanClosedPrompt: dismiss,
}));

import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

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

describe('loan page: Is this loan closed?', () => {
  it('shows nothing unless the server asks', () => {
    renderView(detailFixture({ askClosed: false }));
    expect(screen.queryByText('Is this loan closed?')).toBeNull();
  });

  it('shows the question with both answers when askClosed', () => {
    renderView(detailFixture({ askClosed: true }));
    expect(screen.getByText('Is this loan closed?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, closed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeInTheDocument();
  });

  it('Yes, closed closes the loan', async () => {
    renderView(detailFixture({ askClosed: true }));
    await user.click(screen.getByRole('button', { name: 'Yes, closed' }));
    await waitFor(() => expect(m.closeLoan.mutateAsync).toHaveBeenCalledTimes(1));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('Not yet calls the dismiss endpoint for this loan and refreshes', async () => {
    renderView(detailFixture({ askClosed: true }));
    await user.click(screen.getByRole('button', { name: 'Not yet' }));
    await waitFor(() => expect(dismiss).toHaveBeenCalledWith('l1'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(m.closeLoan.mutateAsync).not.toHaveBeenCalled();
  });
});
