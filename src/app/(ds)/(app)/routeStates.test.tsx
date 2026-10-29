import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AccountError from './accounts/[id]/error';
import AccountNotFound from './accounts/not-found';
import DsAppError from './error';
import LoanError from './loans/[id]/error';
import PersonError from './loans/lendings/[id]/error';
import DsAppNotFound from './not-found';
import TransactionsError from './transactions/error';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('route error and not-found pages', () => {
  it.each([
    ['generic', DsAppError, "Couldn't load this page"],
    ['transactions', TransactionsError, "Couldn't load transactions"],
    ['account', AccountError, "Couldn't load this account"],
    ['loan', LoanError, "Couldn't load this loan"],
    ['person', PersonError, "Couldn't load this person"],
  ])('%s error says what failed and Retry resets', (_n, Page, title) => {
    const reset = vi.fn();
    render(<Page error={new Error('raw secret')} reset={reset} />);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByText(/raw secret/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('generic not-found offers Home; account not-found offers the accounts list', () => {
    const { unmount } = render(<DsAppNotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
    unmount();
    render(<AccountNotFound />);
    expect(screen.getByText('Account not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to accounts' })).toBeInTheDocument();
  });
});
