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
  it.each(['/legacy/dashboard', '/legacy/inbox', '/legacy/upcoming', '/legacy/accounts', '/legacy/accounts/abc', '/legacy/settings', '/legacy/settings/activity', '/'])(
    'uses the default bar on %s',
    (path) => {
      const ctx = getMobileNavContext(path);
      expect(ctx.mode).toBe('default');
      expect(hrefs(ctx.items)).toEqual(['/legacy/dashboard', '/legacy/inbox', '/legacy/upcoming', '/legacy/transactions']);
    },
  );

  it.each(['/legacy/reports', '/legacy/reports/123', '/legacy/dashboards', '/legacy/dashboards/new', '/legacy/chat'])(
    'insights mode covers %s',
    (path) => {
      const ctx = getMobileNavContext(path);
      expect(ctx.mode).toBe('insights');
      expect(hrefs(ctx.items)).toEqual(['/legacy/dashboards', '/legacy/reports', '/legacy/chat']);
    },
  );

  it.each(['/legacy/transactions', '/legacy/transactions/review', '/legacy/transactions/import', '/legacy/rules', '/legacy/rules/categories', '/legacy/categories'])(
    'transactions mode covers %s',
    (path) => {
      const ctx = getMobileNavContext(path);
      expect(ctx.mode).toBe('transactions');
      expect(hrefs(ctx.items)).toEqual([
        '/legacy/transactions',
        '/legacy/transactions/review',
        '/legacy/rules',
        '/legacy/rules/categories',
        '/legacy/transactions/import',
      ]);
    },
  );

  it.each(['/legacy/rewards', '/legacy/rewards/rules', '/legacy/rewards/recommend'])('rewards mode covers %s', (path) => {
    const ctx = getMobileNavContext(path);
    expect(ctx.mode).toBe('rewards');
    expect(hrefs(ctx.items)).toEqual(['/legacy/rewards', '/legacy/rewards/recommend', '/legacy/rewards/rules']);
  });

  it.each(['/legacy/investments', '/legacy/investments/instruments'])('investments mode covers %s', (path) => {
    const ctx = getMobileNavContext(path);
    expect(ctx.mode).toBe('investments');
    expect(hrefs(ctx.items)).toEqual([
      '/legacy/investments',
      '/legacy/investments/tradebook',
      '/legacy/investments/dividends',
      '/legacy/investments/fno',
      '/legacy/investments/corporate-actions',
    ]);
  });

  it.each(['/legacy/loans', '/legacy/loans/lendings', '/legacy/loans/abc'])('loans mode covers %s', (path) => {
    const ctx = getMobileNavContext(path);
    expect(ctx.mode).toBe('loans');
    expect(hrefs(ctx.items)).toEqual(['/legacy/loans', '/legacy/loans/lendings']);
  });
});

describe('isNavItemActive for relocated and new routes', () => {
  it('matches exact routes', () => {
    expect(isNavItemActive('/legacy/inbox', '/legacy/inbox')).toBe(true);
    expect(isNavItemActive('/legacy/upcoming', '/legacy/upcoming')).toBe(true);
    expect(isNavItemActive('/legacy/transactions/import', '/legacy/transactions/import')).toBe(true);
  });

  it('keeps Settings active on /settings/activity (no registered deeper route)', () => {
    expect(isNavItemActive('/legacy/settings/activity', '/legacy/settings')).toBe(true);
  });

  it('keeps Transactions inactive on /transactions/import and /transactions/review', () => {
    expect(isNavItemActive('/legacy/transactions/import', NAV_ITEMS.transactions.href)).toBe(false);
    expect(isNavItemActive('/legacy/transactions/review', NAV_ITEMS.transactions.href)).toBe(false);
  });

  it('keeps Transactions active on a detail sub-route', () => {
    expect(isNavItemActive('/legacy/transactions/123', NAV_ITEMS.transactions.href)).toBe(true);
  });

  it('keeps Rules inactive on the categories child route and Categories active', () => {
    expect(isNavItemActive('/legacy/rules/categories', '/legacy/rules')).toBe(false);
    expect(isNavItemActive('/legacy/rules/categories', '/legacy/rules/categories')).toBe(true);
  });

  it('keeps Accounts active on the account detail page', () => {
    expect(isNavItemActive('/legacy/accounts/abc', '/legacy/accounts')).toBe(true);
  });

  it('keeps Loans inactive on /loans/lendings', () => {
    expect(isNavItemActive('/legacy/loans/lendings', '/legacy/loans')).toBe(false);
  });

  it('does not match a path that merely shares a prefix', () => {
    expect(isNavItemActive('/inboxes', '/legacy/inbox')).toBe(false);
    expect(isNavItemActive('/legacy/upcoming-x', '/legacy/upcoming')).toBe(false);
  });

  it('is inactive for unrelated routes', () => {
    expect(isNavItemActive('/legacy/dashboard', '/legacy/inbox')).toBe(false);
  });
});

describe('nav item module contents', () => {
  it('registers the new nav hrefs', () => {
    expect(NAV_ITEMS.home.href).toBe('/legacy/dashboard');
    expect(NAV_ITEMS.inbox.href).toBe('/legacy/inbox');
    expect(NAV_ITEMS.upcoming.href).toBe('/legacy/upcoming');
    expect(NAV_ITEMS.transactionsImport.href).toBe('/legacy/transactions/import');
    expect(NAV_ITEMS.investmentsInstruments.href).toBe('/legacy/investments/instruments');
    expect(NAV_ITEMS.chat.shortLabel).toBe('Chat');
  });

  it('defines every module with its items', () => {
    expect(TRANSACTIONS_MODULE.label).toBe('Transactions');
    expect(hrefs(TRANSACTIONS_MODULE.items)).toContain('/legacy/transactions/import');
    expect(INSIGHTS_MODULE.label).toBe('Insights');
    expect(hrefs(INSIGHTS_MODULE.items)).toEqual(['/legacy/dashboards', '/legacy/reports', '/legacy/chat']);
    expect(hrefs(REWARDS_MODULE.items)).toEqual(['/legacy/rewards', '/legacy/rewards/recommend', '/legacy/rewards/rules']);
    expect(LOANS_MODULE.label).toBe('Loans & Lendings');
    expect(INVESTMENTS_MODULE.label).toBe('Investments & Portfolio');
  });

  it('leaves Instruments out of the investments module (reached from Holdings)', () => {
    expect(hrefs(INVESTMENTS_MODULE.items)).not.toContain('/legacy/investments/instruments');
  });
});

describe('getNavigationTree', () => {
  it('puts the inbox badge on the Inbox item only', () => {
    const tree = getNavigationTree(null, 7);
    expect(tree.find((i) => i.href === '/legacy/inbox')?.badge).toBe(7);
    expect(tree.filter((i) => i.badge != null)).toHaveLength(1);
  });

  it('defaults a missing inbox count to null', () => {
    expect(getNavigationTree().find((i) => i.href === '/legacy/inbox')?.badge).toBeNull();
  });

  it('adds the needs-review count to its label only when positive', () => {
    expect(getNavigationTree(3).find((i) => i.href === '/legacy/transactions/review')?.label).toBe('Needs Review (3)');
    expect(getNavigationTree(0).find((i) => i.href === '/legacy/transactions/review')?.label).toBe('Needs Review');
    expect(getNavigationTree(null).find((i) => i.href === '/legacy/transactions/review')?.label).toBe('Needs Review');
  });

  it('starts with Home, Inbox, Upcoming, Accounts', () => {
    expect(hrefs(getNavigationTree()).slice(0, 4)).toEqual(['/legacy/dashboard', '/legacy/inbox', '/legacy/upcoming', '/legacy/accounts']);
  });
});
