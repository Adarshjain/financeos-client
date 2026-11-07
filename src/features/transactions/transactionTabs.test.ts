import { describe, expect, it } from 'vitest';

import { activeTransactionsTab, TRANSACTION_TABS } from './transactionTabs';

describe('transactions tabs', () => {
  it('lists All and Tags in order', () => {
    expect(TRANSACTION_TABS.map((t) => t.label)).toEqual(['All', 'Tags']);
  });

  it('reads the active tab from the pathname', () => {
    expect(activeTransactionsTab('/transactions')).toBe('all');
    expect(activeTransactionsTab('/transactions/tags')).toBe('rules');
    expect(activeTransactionsTab('/transactions/tags/')).toBe('rules');
    expect(activeTransactionsTab('/transactions/import')).toBe('all');
  });

  it('counts the import pages and anything else under All', () => {
    expect(activeTransactionsTab('/transactions/import/9f3c')).toBe('all');
    expect(activeTransactionsTab('/accounts')).toBe('all');
    expect(activeTransactionsTab(null)).toBe('all');
  });
});
