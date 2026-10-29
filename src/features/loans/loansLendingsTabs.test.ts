import { describe, expect, it } from 'vitest';

import { activeLoansLendingsTab, loansLendingsTabs } from './loansLendingsTabs';

describe('loansLendingsTabs', () => {
  it('lists Lendings first, then Loans, on the Dinero routes', () => {
    expect(loansLendingsTabs.map((t) => [t.id, t.label, t.href])).toEqual([
      ['lendings', 'Lendings', '/loans/lendings'],
      ['loans', 'Loans', '/loans'],
    ]);
  });

  it('titles the top bar as the boards do', () => {
    expect(loansLendingsTabs.map((t) => t.title)).toEqual(['Loans & lendings', 'Loans & lendings']);
  });

  it('picks the tab from the pathname', () => {
    expect(activeLoansLendingsTab('/loans/lendings').id).toBe('lendings');
    expect(activeLoansLendingsTab('/loans/lendings/').id).toBe('lendings');
    expect(activeLoansLendingsTab('/loans').id).toBe('loans');
    expect(activeLoansLendingsTab(null).id).toBe('loans');
  });
});
