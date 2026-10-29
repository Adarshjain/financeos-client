import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AccountsListError from './accounts/(list)/error';
import AccountError from './accounts/[id]/error';
import AccountTabNotFound from './accounts/[id]/not-found';
import AccountNotFound from './accounts/not-found';
import ChatNotFound from './chat/[id]/not-found';
import ChatError from './chat/error';
import HomeError from './dashboard/error';
import DashboardsListError from './dashboards/(list)/error';
import DsAppError from './error';
import InboxError from './inbox/error';
import InvestmentsError from './investments/(tabs)/error';
import HoldingNotFound from './investments/[id]/not-found';
import LoansError from './loans/(tabs)/error';
import LoanError from './loans/[id]/error';
import PersonError from './loans/lendings/[id]/error';
import DsAppNotFound from './not-found';
import NotificationsError from './notifications/error';
import ReportsListError from './reports/(list)/error';
import RewardsError from './rewards/(tabs)/error';
import SettingsError from './settings/error';
import TransactionsError from './transactions/error';
import UpcomingError from './upcoming/error';

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
    ['chat', ChatError, "Couldn't load this chat"],
    ['settings', SettingsError, "Couldn't load this page"],
    ['upcoming', UpcomingError, "Couldn't load upcoming"],
    ['inbox', InboxError, "Couldn't load your inbox"],
    ['notifications', NotificationsError, "Couldn't load notifications"],
    ['rewards', RewardsError, "Couldn't load rewards"],
    ['investments', InvestmentsError, "Couldn't load investments"],
    ['home', HomeError, "Couldn't load Home"],
    ['accounts list', AccountsListError, "Couldn't load accounts"],
    ['loans', LoansError, "Couldn't load loans"],
    ['dashboards list', DashboardsListError, "Couldn't load dashboards"],
    ['reports list', ReportsListError, "Couldn't load reports"],
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
    expect(screen.getByRole('link', { name: 'Go to Home' })).toBeInTheDocument();
    unmount();
    render(<AccountNotFound />);
    expect(screen.getByText('Account not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to accounts' })).toBeInTheDocument();
  });
});

describe('area boundaries and the app bar', () => {
  it('a page that mounts its own bar keeps it when it fails', () => {
    render(<NotificationsError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('an area whose layout mounts the bar renders only the message, so the bar is not doubled', () => {
    render(<SettingsError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
  });

  it('every [id] not-found offers its area as the way back', () => {
    const { unmount } = render(<ChatNotFound />);
    expect(screen.getByText('Chat not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Ask the data' })).toBeInTheDocument();
    unmount();
    render(<HoldingNotFound />);
    expect(screen.getByText('Holding not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to investments' })).toBeInTheDocument();
  });

  it('a missing account brings its own bar; a tab the account has none of sits under the account bar', () => {
    const { unmount } = render(<AccountNotFound />);
    expect(screen.getAllByText('Accounts', { exact: true }).length).toBeGreaterThan(0);
    unmount();
    render(<AccountTabNotFound />);
    expect(screen.getByText('Account not found')).toBeInTheDocument();
    expect(screen.queryByText('Accounts', { exact: true })).toBeNull();
  });
});
