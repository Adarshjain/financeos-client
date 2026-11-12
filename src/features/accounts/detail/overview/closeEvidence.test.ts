import { describe, expect, it } from 'vitest';

import { closeEvidence } from './accountOverviewModel';

describe('closeEvidence', () => {
  it('states the last transaction with its age, the balance and when the account was added', () => {
    expect(
      closeEvidence({ lastTransactionDate: '2026-08-03', balance: 0, createdAt: '2026-05-02T08:00:00Z' }, '2026-11-12'),
    ).toBe('Last transaction on 03/08/26 (101 days ago). Balance ₹0.00. Added on 02/05/26.');
  });

  it('says so when there are no transactions, and leaves out an unknown added date', () => {
    expect(closeEvidence({ lastTransactionDate: null, balance: null }, '2026-11-12')).toBe('No transactions yet. Balance ₹0.00.');
  });

  it('reads one day as singular', () => {
    expect(closeEvidence({ lastTransactionDate: '2026-11-11', balance: 0 }, '2026-11-12')).toContain('(1 day ago)');
  });
});
