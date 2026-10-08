import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockPath = '/dashboard';
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('@/actions/auth', () => ({ logout: vi.fn() }));

import { MobileMenuSheet } from '../MobileMenuSheet';

function openSheet(email?: string) {
  render(<MobileMenuSheet userEmail={email} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
  return screen.getByRole('dialog');
}

beforeEach(() => {
  mockPath = '/dashboard';
});

describe('MobileMenuSheet', () => {
  it('has an accessible trigger and is closed initially', () => {
    render(<MobileMenuSheet />);
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog with Chat and Accounts rows and a Settings group', () => {
    const d = openSheet();
    expect(within(d).getByRole('link', { name: /Ask your data/ })).toHaveAttribute('href', '/chat');
    expect(within(d).getByText('Ask your data')).toBeInTheDocument();
    expect(within(d).getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(within(d).getByText('Settings')).toBeInTheDocument();
    expect(within(d).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('lists every settings page as a chip in the Settings group', () => {
    const d = openSheet();
    const expected: Record<string, string> = {
      'Profile & appearance': '/settings',
      Connections: '/settings/gmail',
      'AI keys': '/settings/llm-keys',
      Notifications: '/settings/notifications',
      Activity: '/settings/activity',
      Debug: '/debug',
    };
    for (const [label, href] of Object.entries(expected)) {
      expect(within(d).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('activates Profile & appearance only on the settings index', () => {
    mockPath = '/settings';
    let d = openSheet();
    expect(within(d).getByRole('link', { name: 'Profile & appearance' })).toHaveAttribute('aria-current', 'page');
    expect(within(d).getByRole('link', { name: 'Connections' })).not.toHaveAttribute('aria-current');
    cleanup();

    mockPath = '/settings/notifications';
    d = openSheet();
    expect(within(d).getByRole('link', { name: 'Profile & appearance' })).not.toHaveAttribute('aria-current');
    expect(within(d).getByRole('link', { name: 'Notifications' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps a settings chip active on its sub-pages and only that chip', () => {
    mockPath = '/settings/gmail/senders';
    const d = openSheet();
    expect(within(d).getByRole('link', { name: 'Connections' })).toHaveAttribute('aria-current', 'page');
    for (const other of ['Profile & appearance', 'AI keys', 'Notifications', 'Activity', 'Debug']) {
      expect(within(d).getByRole('link', { name: other })).not.toHaveAttribute('aria-current');
    }
  });

  it('activates the Debug chip on /debug', () => {
    mockPath = '/debug';
    const d = openSheet();
    expect(within(d).getByRole('link', { name: 'Debug' })).toHaveAttribute('aria-current', 'page');
  });

  it('lists all five groups with their chips', () => {
    const d = openSheet();
    for (const g of ['Transactions', 'Investments & Portfolio', 'Loans & Lendings', 'Rewards', 'Insights']) {
      expect(within(d).getByText(g)).toBeInTheDocument();
    }
    const expected: Record<string, string> = {
      All: '/transactions',
      Review: '/transactions/review',
      Rules: '/rules',
      Categories: '/rules/categories',
      Import: '/transactions/import',
      Holdings: '/investments',
      Tradebook: '/investments/tradebook',
      Dividends: '/investments/dividends',
      FnO: '/investments/fno',
      'Corporate Actions': '/investments/corporate-actions',
      Loans: '/loans',
      Lendings: '/loans/lendings',
      Overview: '/rewards',
      'Card Picker': '/rewards/recommend',
      'Earning rules': '/rewards/rules',
      Dashboards: '/dashboards',
      Reports: '/reports',
    };
    for (const [label, href] of Object.entries(expected)) {
      expect(within(d).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('labels the Transactions landing chip "All" and no other group landing chip', () => {
    const d = openSheet();
    expect(within(d).getAllByRole('link', { name: 'All' })).toHaveLength(1);
    // Chat chip under Insights keeps its own short label.
    expect(within(d).getAllByRole('link', { name: 'Chat' }).length).toBeGreaterThanOrEqual(1);
  });

  it('marks the current row active with aria-current and the gradient', () => {
    mockPath = '/accounts';
    const d = openSheet();
    const accounts = within(d).getByRole('link', { name: 'Accounts' });
    expect(accounts).toHaveAttribute('aria-current', 'page');
    expect(accounts).toHaveAttribute('data-active', 'true');
    expect(within(d).getByRole('link', { name: 'Profile & appearance' })).not.toHaveAttribute('aria-current');
  });

  it('marks the Activity chip active on /settings/activity', () => {
    mockPath = '/settings/activity';
    const d = openSheet();
    expect(within(d).getByRole('link', { name: 'Activity' })).toHaveAttribute('aria-current', 'page');
  });

  it('activates only the Import chip on /transactions/import', () => {
    mockPath = '/transactions/import';
    const d = openSheet();
    expect(within(d).getByRole('link', { name: 'Import' }).className).toContain('from-emerald-600');
    expect(within(d).getByRole('link', { name: 'All' }).className).not.toContain('from-emerald-600');
  });

  it('activates the Chat row on /chat', () => {
    mockPath = '/chat';
    const d = openSheet();
    expect(within(d).getByRole('link', { name: /Ask your data/ })).toHaveAttribute('aria-current', 'page');
  });

  it('uses one neutral decorative icon treatment for rows', () => {
    const d = openSheet();
    const icons = d.querySelectorAll('span[aria-hidden="true"].h-5.w-5');
    expect(icons.length).toBeGreaterThanOrEqual(8);
    icons.forEach((el) => {
      expect(el.className).toContain('text-slate-500');
      expect(el.className).not.toMatch(/text-(emerald|rose|amber|blue)-/);
    });
  });

  it.each([
    ['Accounts', /^Accounts$/],
    ['Settings chip', /^Connections$/],
    ['Import chip', /^Import$/],
    ['Chat row', /Ask your data/],
  ])('closes after clicking the %s link', (_n, name) => {
    const d = openSheet();
    fireEvent.click(within(d).getByRole('link', { name }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the signed-in email when given and omits the block otherwise', () => {
    const d = openSheet('me@example.com');
    expect(within(d).getByText('Signed in as')).toBeInTheDocument();
    expect(within(d).getByText('me@example.com')).toBeInTheDocument();
  });

  it('omits the signed-in block without an email', () => {
    const d = openSheet();
    expect(within(d).queryByText('Signed in as')).not.toBeInTheDocument();
  });

  it('renders a sign out submit button inside a form', () => {
    const d = openSheet('me@example.com');
    const btn = within(d).getByRole('button', { name: /Sign out/ });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn.closest('form')).not.toBeNull();
  });
});
