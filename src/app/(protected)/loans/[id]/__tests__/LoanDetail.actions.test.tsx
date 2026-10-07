import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../components/useLoanDetail', () => ({
  useLoanDetail: vi.fn(),
}));

// The real PageActionBar only registers its children with a layout slot;
// render them inline so the mobile copy of the actions is reachable here.
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="action-bar">{children}</div>
  ),
}));

vi.mock('@/app/(protected)/loans/LoanForm', () => ({ LoanForm: () => null }));
vi.mock('../components/LoanAmortizationSchedule', () => ({ LoanAmortizationSchedule: () => null }));
vi.mock('../components/LoanDetailDialogs', () => ({ LoanDetailDialogs: () => null }));
vi.mock('../components/LoanEventsAndCharges', () => ({ LoanEventsAndCharges: () => null }));
vi.mock('../components/LoanHeroHeader', () => ({ LoanHeroHeader: () => <div data-testid="hero" /> }));
vi.mock('../components/LoanMatchSuggestionsBanner', () => ({ LoanMatchSuggestionsBanner: () => null }));

import { useLoanDetail } from '../components/useLoanDetail';
import { LoanDetail } from '../LoanDetail';

function hookReturn(status: 'active' | 'closed') {
  return {
    detail: { events: [], charges: [] },
    loan: { id: 'loan1', name: 'Car loan', status },
    schedule: null,
    expandedFYs: new Set<string>(),
    matchSuggestions: null,
    matchLoading: false,
    setEditOpen: vi.fn(),
    handleCloseLoan: vi.fn(),
    handleReopenLoan: vi.fn(),
    deleteLoanMutation: { mutateAsync: vi.fn() },
  };
}

describe('LoanDetail action bar — desktop card + mobile bar', () => {
  it('renders Edit, Close and Delete in both the desktop card and the mobile bar', () => {
    vi.mocked(useLoanDetail).mockReturnValue(hookReturn('active') as never);

    render(<LoanDetail loanId="loan1" />);

    const mobileBar = within(screen.getByTestId('action-bar'));
    for (const name of ['Edit', 'Close', 'Delete']) {
      expect(screen.getAllByRole('button', { name: new RegExp(`^${name}$`) })).toHaveLength(2);
      expect(mobileBar.getByRole('button', { name: new RegExp(`^${name}$`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /^Reopen$/ })).not.toBeInTheDocument();
  });

  it('offers Reopen instead of Close for a closed loan, again in both places', () => {
    vi.mocked(useLoanDetail).mockReturnValue(hookReturn('closed') as never);

    render(<LoanDetail loanId="loan1" />);

    expect(screen.getAllByRole('button', { name: /^Reopen$/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Close$/ })).not.toBeInTheDocument();
  });

  it('Edit opens the edit form from the desktop copy', () => {
    const hook = hookReturn('active');
    vi.mocked(useLoanDetail).mockReturnValue(hook as never);

    render(<LoanDetail loanId="loan1" />);

    const mobileBar = screen.getByTestId('action-bar');
    const desktopEdit = screen.getAllByRole('button', { name: /^Edit$/ }).find((b) => !mobileBar.contains(b));
    expect(desktopEdit).toBeDefined();
    fireEvent.click(desktopEdit!);
    expect(hook.setEditOpen).toHaveBeenCalledWith(true);
  });
});
