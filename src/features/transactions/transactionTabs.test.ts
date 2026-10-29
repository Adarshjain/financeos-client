import { describe, expect, it } from 'vitest';

import { activeTransactionsTab, TRANSACTION_TABS } from './transactionTabs';

describe('transactions tabs', () => {
  it('lists All, Rules, Categories and Import in order', () => {
    expect(TRANSACTION_TABS.map((t) => t.label)).toEqual(['All', 'Rules', 'Categories', 'Import']);
  });

  it('reads the active tab from the pathname', () => {
    expect(activeTransactionsTab('/transactions')).toBe('all');
    expect(activeTransactionsTab('/transactions/rules')).toBe('rules');
    expect(activeTransactionsTab('/transactions/categories')).toBe('categories');
    expect(activeTransactionsTab('/transactions/import')).toBe('import');
    expect(activeTransactionsTab('/transactions/import/')).toBe('import');
  });

  it('counts an import job page under Import and anything else under All', () => {
    expect(activeTransactionsTab('/transactions/import/9f3c')).toBe('import');
    expect(activeTransactionsTab('/accounts')).toBe('all');
    expect(activeTransactionsTab(null)).toBe('all');
  });
});
