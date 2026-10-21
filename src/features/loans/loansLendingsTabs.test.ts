import { describe, expect, it } from 'vitest';

import { activeLoansLendingsTab, loansLendingsTabs } from './loansLendingsTabs';

describe('loansLendingsTabs', () => {
  it('lists Lendings first, then Loans, on the Dinero routes', () => {
    expect(loansLendingsTabs.map((t) => [t.id, t.label, t.href])).toEqual([
      ['lendings', 'Lendings', '/ds/loans/lendings'],
      ['loans', 'Loans', '/ds/loans'],
    ]);
  });

  it('titles the top bar as the boards do', () => {
    expect(loansLendingsTabs.map((t) => t.title)).toEqual(['Lendings', 'Loans & lendings']);
  });

  it('picks the tab from the pathname', () => {
    expect(activeLoansLendingsTab('/ds/loans/lendings').id).toBe('lendings');
    expect(activeLoansLendingsTab('/ds/loans/lendings/').id).toBe('lendings');
    expect(activeLoansLendingsTab('/ds/loans').id).toBe('loans');
    expect(activeLoansLendingsTab(null).id).toBe('loans');
  });
});
