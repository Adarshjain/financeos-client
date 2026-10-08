import { describe, expect, it } from 'vitest';

import {
  getMobileNavContext,
  getNavigationTree,
  INSIGHTS_MODULE,
  INVESTMENTS_MODULE,
  isNavItemActive,
  LOANS_MODULE,
  NAV_ITEMS,
  REWARDS_MODULE,
  TRANSACTIONS_MODULE,
} from '../navigation';

const hrefs = (items: { href: string }[]) => items.map((i) => i.href);

describe('getMobileNavContext', () => {
  it.each(['/dashboard', '/inbox', '/upcoming', '/accounts', '/accounts/abc', '/settings', '/settings/activity', '/'])(
    'uses the default bar on %s',
    (path) => {
      const ctx = getMobileNavContext(path);
      expect(ctx.mode).toBe('default');
      expect(hrefs(ctx.items)).toEqual(['/dashboard', '/inbox', '/upcoming', '/transactions']);
    },
  );

  it.each(['/reports', '/reports/123', '/dashboards', '/dashboards/new', '/chat'])(
    'insights mode covers %s',
    (path) => {
      const ctx = getMobileNavContext(path);
      expect(ctx.mode).toBe('insights');
      expect(hrefs(ctx.items)).toEqual(['/dashboards', '/reports', '/chat']);
    },
  );

  it.each(['/transactions', '/transactions/review', '/transactions/import', '/rules', '/rules/categories', '/categories'])(
    'transactions mode covers %s',
    (path) => {
      const ctx = getMobileNavContext(path);
      expect(ctx.mode).toBe('transactions');
      expect(hrefs(ctx.items)).toEqual([
        '/transactions',
        '/transactions/review',
        '/rules',
        '/rules/categories',
        '/transactions/import',
      ]);
    },
  );

  it.each(['/rewards', '/rewards/rules', '/rewards/recommend'])('rewards mode covers %s', (path) => {
    const ctx = getMobileNavContext(path);
    expect(ctx.mode).toBe('rewards');
    expect(hrefs(ctx.items)).toEqual(['/rewards', '/rewards/recommend', '/rewards/rules']);
  });

  it.each(['/investments', '/investments/instruments'])('investments mode covers %s', (path) => {
    const ctx = getMobileNavContext(path);
    expect(ctx.mode).toBe('investments');
    expect(hrefs(ctx.items)).toEqual([
      '/investments',
      '/investments/tradebook',
      '/investments/dividends',
      '/investments/fno',
      '/investments/corporate-actions',
    ]);
  });

  it.each(['/loans', '/loans/lendings', '/loans/abc'])('loans mode covers %s', (path) => {
    const ctx = getMobileNavContext(path);
    expect(ctx.mode).toBe('loans');
    expect(hrefs(ctx.items)).toEqual(['/loans', '/loans/lendings']);
  });
});

describe('isNavItemActive for relocated and new routes', () => {
  it('matches exact routes', () => {
    expect(isNavItemActive('/inbox', '/inbox')).toBe(true);
    expect(isNavItemActive('/upcoming', '/upcoming')).toBe(true);
    expect(isNavItemActive('/transactions/import', '/transactions/import')).toBe(true);
  });

  it('keeps Settings active on /settings/activity (no registered deeper route)', () => {
    expect(isNavItemActive('/settings/activity', '/settings')).toBe(true);
  });

  it('keeps Transactions inactive on /transactions/import and /transactions/review', () => {
    expect(isNavItemActive('/transactions/import', NAV_ITEMS.transactions.href)).toBe(false);
    expect(isNavItemActive('/transactions/review', NAV_ITEMS.transactions.href)).toBe(false);
  });

  it('keeps Transactions active on a detail sub-route', () => {
    expect(isNavItemActive('/transactions/123', NAV_ITEMS.transactions.href)).toBe(true);
  });

  it('keeps Rules inactive on the categories child route and Categories active', () => {
    expect(isNavItemActive('/rules/categories', '/rules')).toBe(false);
    expect(isNavItemActive('/rules/categories', '/rules/categories')).toBe(true);
  });

  it('keeps Accounts active on the account detail page', () => {
    expect(isNavItemActive('/accounts/abc', '/accounts')).toBe(true);
  });

  it('keeps Loans inactive on /loans/lendings', () => {
    expect(isNavItemActive('/loans/lendings', '/loans')).toBe(false);
  });

  it('does not match a path that merely shares a prefix', () => {
    expect(isNavItemActive('/inboxes', '/inbox')).toBe(false);
    expect(isNavItemActive('/upcoming-x', '/upcoming')).toBe(false);
  });

  it('is inactive for unrelated routes', () => {
    expect(isNavItemActive('/dashboard', '/inbox')).toBe(false);
  });
});

describe('nav item module contents', () => {
  it('registers the new nav hrefs', () => {
    expect(NAV_ITEMS.home.href).toBe('/dashboard');
    expect(NAV_ITEMS.inbox.href).toBe('/inbox');
    expect(NAV_ITEMS.upcoming.href).toBe('/upcoming');
    expect(NAV_ITEMS.transactionsImport.href).toBe('/transactions/import');
    expect(NAV_ITEMS.investmentsInstruments.href).toBe('/investments/instruments');
    expect(NAV_ITEMS.chat.shortLabel).toBe('Chat');
  });

  it('defines every module with its items', () => {
    expect(TRANSACTIONS_MODULE.label).toBe('Transactions');
    expect(hrefs(TRANSACTIONS_MODULE.items)).toContain('/transactions/import');
    expect(INSIGHTS_MODULE.label).toBe('Insights');
    expect(hrefs(INSIGHTS_MODULE.items)).toEqual(['/dashboards', '/reports', '/chat']);
    expect(hrefs(REWARDS_MODULE.items)).toEqual(['/rewards', '/rewards/recommend', '/rewards/rules']);
    expect(LOANS_MODULE.label).toBe('Loans & Lendings');
    expect(INVESTMENTS_MODULE.label).toBe('Investments & Portfolio');
  });

  it('leaves Instruments out of the investments module (reached from Holdings)', () => {
    expect(hrefs(INVESTMENTS_MODULE.items)).not.toContain('/investments/instruments');
  });
});

describe('getNavigationTree', () => {
  it('puts the inbox badge on the Inbox item only', () => {
    const tree = getNavigationTree(null, 7);
    expect(tree.find((i) => i.href === '/inbox')?.badge).toBe(7);
    expect(tree.filter((i) => i.badge != null)).toHaveLength(1);
  });

  it('defaults a missing inbox count to null', () => {
    expect(getNavigationTree().find((i) => i.href === '/inbox')?.badge).toBeNull();
  });

  it('adds the needs-review count to its label only when positive', () => {
    expect(getNavigationTree(3).find((i) => i.href === '/transactions/review')?.label).toBe('Needs Review (3)');
    expect(getNavigationTree(0).find((i) => i.href === '/transactions/review')?.label).toBe('Needs Review');
    expect(getNavigationTree(null).find((i) => i.href === '/transactions/review')?.label).toBe('Needs Review');
  });

  it('starts with Home, Inbox, Upcoming, Accounts', () => {
    expect(hrefs(getNavigationTree()).slice(0, 4)).toEqual(['/dashboard', '/inbox', '/upcoming', '/accounts']);
  });
});
