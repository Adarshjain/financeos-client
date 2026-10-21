import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ShellPage } from '../ShellPage';

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
