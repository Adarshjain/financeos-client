import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { commitRoute, resetInAppNavigation } from './navigationStore';
import { ShellPage } from './ShellPage';

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('ShellPage top-bar actions', () => {
  it('has no Ask the data shortcut (it lives in the rail and the phone Menu) and no Notifications link', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.queryByRole('link', { name: 'Ask the data' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Notifications' })).toBeNull();
  });

  it('has a Search button (it opens the app-wide search), not a link', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Search' })).toBeNull();
  });

  it('has no hide-amounts eye (the choice lives in the More sheet and Settings)', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.queryByRole('button', { name: 'Hide amounts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show amounts' })).toBeNull();
  });

  it('puts the add action after the shared actions, labelled on desktop only', () => {
    render(
      <ShellPage title="Accounts" addHref="/accounts/new" addLabel="Add account">
        content
      </ShellPage>,
    );
    const links = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('aria-label'));
    expect(links).toEqual(['Add account']);
    const add = screen.getByRole('link', { name: 'Add account' });
    expect(add).toHaveAttribute('href', '/accounts/new');
    expect(add.querySelector('span.hidden.desk\\:inline')?.textContent).toBe(
      'Add account',
    );
  });

  it('calls onAdd for a same-page add instead of navigating or changing the URL', () => {
    window.history.replaceState(null, '', '/accounts');
    const push = vi.spyOn(window.history, 'pushState');
    const onAdd = vi.fn();
    render(
      <ShellPage title="Accounts" onAdd={onAdd} addLabel="Add account">
        content
      </ShellPage>,
    );
    expect(screen.queryAllByRole('link')).toEqual([]);
    screen.getByRole('button', { name: 'Add account' }).click();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
  });

  it('renders only the shared actions when the page has no add', () => {
    render(<ShellPage title="Home">content</ShellPage>);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});

describe('ShellPage content area', () => {
  it('keeps the top padding by default', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.getByRole('main').className).not.toContain('pt-0');
  });

  it('drops the top padding when the content starts with tabs', () => {
    render(
      <ShellPage title="Accounts" flushTop>
        content
      </ShellPage>,
    );
    expect(screen.getByRole('main').className).toContain('pt-0 desk:pt-0');
  });
});

describe('ShellPage back', () => {
  beforeEach(() => {
    resetInAppNavigation();
    router.back.mockClear();
    router.push.mockClear();
  });

  it('goes back in history when the user arrived from inside the app', () => {
    commitRoute('/accounts');
    commitRoute('/accounts/1');
    render(<ShellPage title="Detail" backHref="/accounts">content</ShellPage>);
    const back = screen.getByRole('link', { name: 'Back' });
    expect(back).toHaveAttribute('href', '/accounts');
    fireEvent.click(back);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('detail pages (backHref) have no Notifications or Search in the bar', () => {
    render(<ShellPage title="Detail" backHref="/accounts" addHref="/x/new" addLabel="Add thing">content</ShellPage>);
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ask the data' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add thing/ })).toBeInTheDocument();
  });

  it('falls back to the parent route on a direct landing', () => {
    render(<ShellPage title="Detail" backHref="/accounts">content</ShellPage>);
    fireEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(router.push).toHaveBeenCalledWith('/accounts');
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('ShellPage crumb depth', () => {
  it('a crumb two or more deep gives the back arrow to its list, no backHref needed', () => {
    render(<ShellPage title="Import" crumb="Money / Transactions / Import">content</ShellPage>);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/transactions');
    expect(screen.getByText('Money / Transactions')).toBeInTheDocument();
  });

  it('an explicit backHref wins over the crumb', () => {
    render(<ShellPage title="Loan" crumb="Owe & lend / Loans" backHref="/elsewhere">content</ShellPage>);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/elsewhere');
  });

  it('a tabbed page (flushTop) gets no derived back arrow: tabs are siblings', () => {
    render(<ShellPage title="Rules" crumb="Money / Transactions / Rules" flushTop>content</ShellPage>);
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull();
  });

  it('a tabbed page with an explicit backHref still gets it', () => {
    render(<ShellPage title="Account" crumb="Money / Accounts" backHref="/accounts" flushTop>content</ShellPage>);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/accounts');
  });

  it('a list (one-segment crumb) has no back arrow', () => {
    render(<ShellPage title="Accounts" crumb="Money">content</ShellPage>);
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull();
  });

  it('the crumb never repeats the title', () => {
    render(<ShellPage title="Notifications" crumb="Inbox / Notifications">content</ShellPage>);
    expect(screen.queryByText('Inbox / Notifications')).toBeNull();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });
});
