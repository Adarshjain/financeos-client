import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ShellPage } from '../ShellPage';

describe('ShellPage top-bar actions', () => {
  it('shows Ask the data and Notifications linking to the live routes', () => {
    render(<ShellPage title="Accounts">content</ShellPage>);
    expect(screen.getByRole('link', { name: 'Ask the data' })).toHaveAttribute(
      'href',
      '/chat',
    );
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '/settings/activity',
    );
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
    expect(links).toEqual(['Ask the data', 'Notifications', 'Add account']);
    const add = screen.getByRole('link', { name: 'Add account' });
    expect(add).toHaveAttribute('href', '/ds/accounts/new');
    expect(add.querySelector('span.hidden.desk\\:inline')?.textContent).toBe(
      'Add account',
    );
  });

  it('renders only the shared actions when the page has no add', () => {
    render(<ShellPage title="Home">content</ShellPage>);
    expect(
      screen.getAllByRole('link').map((l) => l.getAttribute('aria-label')),
    ).toEqual(['Ask the data', 'Notifications']);
  });
});
