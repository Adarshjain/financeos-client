import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { commitRoute, resetInAppNavigation } from '../navigationStore';
import { ShellPage } from '../ShellPage';

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('ShellPage top-bar actions', () => {
  it('shows Ask the data linking to the live route and no Notifications', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.getByRole('link', { name: 'Ask the data' })).toHaveAttribute(
      'href',
      '/chat',
    );
    expect(screen.queryByRole('link', { name: 'Notifications' })).toBeNull();
  });

  it('has no Search action (the live app has no global search)', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.queryByRole('link', { name: 'Search' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
  });

  it('has no hide-amounts eye (the choice lives in the More sheet and Settings)', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.queryByRole('button', { name: 'Hide amounts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show amounts' })).toBeNull();
  });

  it('puts the add action after the shared actions, labelled on desktop only', () => {
    render(
      <ShellPage title="Accounts" addHref="/ds/accounts/new" addLabel="Add account">
        content
      </ShellPage>,
    );
    const links = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('aria-label'));
    expect(links).toEqual(['Ask the data', 'Add account']);
    const add = screen.getByRole('link', { name: 'Add account' });
    expect(add).toHaveAttribute('href', '/ds/accounts/new');
    expect(add.querySelector('span.hidden.desk\\:inline')?.textContent).toBe(
      'Add account',
    );
  });

  it('calls onAdd for a same-page add instead of navigating or changing the URL', () => {
    window.history.replaceState(null, '', '/ds/accounts');
    const push = vi.spyOn(window.history, 'pushState');
    const onAdd = vi.fn();
    render(
      <ShellPage title="Accounts" onAdd={onAdd} addLabel="Add account">
        content
      </ShellPage>,
    );
    expect(screen.getAllByRole('link').map((l) => l.getAttribute('aria-label'))).toEqual(['Ask the data']);
    screen.getByRole('button', { name: 'Add account' }).click();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
  });

  it('renders only the shared actions when the page has no add', () => {
    render(<ShellPage title="Home">content</ShellPage>);
    expect(
      screen.getAllByRole('link').map((l) => l.getAttribute('aria-label')),
    ).toEqual(['Ask the data']);
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
    commitRoute('/ds/accounts');
    commitRoute('/ds/accounts/1');
    render(<ShellPage title="Detail" backHref="/ds/accounts">content</ShellPage>);
    const back = screen.getByRole('link', { name: 'Back' });
    expect(back).toHaveAttribute('href', '/ds/accounts');
    fireEvent.click(back);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('falls back to the parent route on a direct landing', () => {
    render(<ShellPage title="Detail" backHref="/ds/accounts">content</ShellPage>);
    fireEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(router.push).toHaveBeenCalledWith('/ds/accounts');
    expect(router.back).not.toHaveBeenCalled();
  });
});
