import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import DsIndexPage from './page';

vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('DsIndexPage', () => {
  it('renders Signed out section with links to /login, /signup, /offline', () => {
    render(<DsIndexPage />);

    expect(screen.getByText('Signed out')).toBeDefined();
    expect(screen.getByText('Sign in')).toBeDefined();
    expect(screen.getByText('/login')).toBeDefined();
    expect(screen.getByText('Sign up')).toBeDefined();
    expect(screen.getByText('/signup')).toBeDefined();
    expect(screen.getByText('Offline')).toBeDefined();
    expect(screen.getByText('/offline')).toBeDefined();

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/login');
    expect(hrefs).toContain('/signup');
    expect(hrefs).toContain('/offline');
  });

  it('renders Signed in section with a link to /accounts', () => {
    render(<DsIndexPage />);

    expect(screen.getByText('Signed in')).toBeDefined();
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('/accounts')).toBeDefined();
  });

  it('links to /settings from the Signed in section', () => {
    render(<DsIndexPage />);

    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('/settings')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/settings');
  });

  it('links to /inbox and /upcoming from the Signed in section', () => {
    render(<DsIndexPage />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/inbox');
    expect(hrefs).toContain('/upcoming');
  });

  it('links to /notifications from the Signed in section', () => {
    render(<DsIndexPage />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/notifications');
  });

  it('links every top-level /ds page, so a new page is never left off the index', () => {
    const groups = ['(app)', '(public)'].map((g) => path.resolve(process.cwd(), 'src/app/(ds)', g));
    const routes = groups.flatMap((dir) =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        // `ds` is the index itself.
        .filter((e) => e.isDirectory() && e.name !== 'ds' && fs.existsSync(path.join(dir, e.name, 'page.tsx')))
        .map((e) => `/${e.name}`),
    );
    render(<DsIndexPage />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(hrefs, `${route} is missing from the index`).toContain(route);
  });

  it('links Ask the data and has no to-build list left', () => {
    render(<DsIndexPage />);

    expect(screen.queryByText('To build')).toBeNull();
    expect(screen.getByText('/chat')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/chat');
  });

  it('lists the built report page (via Reports) and no longer lists it as to build', () => {
    render(<DsIndexPage />);
    expect(screen.getByText('/reports/[id]')).toBeDefined();
    expect(screen.queryByText('Report view and breakdown')).toBeNull();
    expect(screen.queryByText('Underlying data')).toBeNull();
  });

  it('links every built Investments tab page', () => {
    render(<DsIndexPage />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    for (const tab of ['tradebook', 'dividends', 'fno', 'corporate-actions', 'instruments']) {
      expect(hrefs).toContain(`/investments/${tab}`);
    }
  });
});
