import { describe, expect, it } from 'vitest';

import { activeLoansLendingsTab, isLoanDetailPath, isPersonDetailPath, loansLendingsTabs } from './loansLendingsTabs';

describe('loansLendingsTabs', () => {
  it('lists Lendings first, then Loans, on the Dinero routes', () => {
    expect(loansLendingsTabs.map((t) => [t.id, t.label, t.href])).toEqual([
      ['lendings', 'Lendings', '/loans/lendings'],
      ['loans', 'Loans', '/loans'],
    ]);
  });

  it('titles the top bar as the boards do', () => {
    expect(loansLendingsTabs.map((t) => t.title)).toEqual(['Lendings', 'Loans & lendings']);
  });

  it('picks the tab from the pathname', () => {
    expect(activeLoansLendingsTab('/loans/lendings').id).toBe('lendings');
    expect(activeLoansLendingsTab('/loans/lendings/').id).toBe('lendings');
    expect(activeLoansLendingsTab('/loans').id).toBe('loans');
    expect(activeLoansLendingsTab(null).id).toBe('loans');
  });
});

describe('isPersonDetailPath', () => {
  it("is true for one person's page and not for the tabs, a loan or a deeper path", () => {
    expect(isPersonDetailPath('/loans/lendings/p1')).toBe(true);
    expect(isPersonDetailPath('/loans/lendings/p1/')).toBe(true);
    expect(isPersonDetailPath('/loans/lendings')).toBe(false);
    expect(isPersonDetailPath('/loans/lendings/p1/extra')).toBe(false);
    expect(isPersonDetailPath('/loans/l1')).toBe(false);
    expect(isPersonDetailPath(null)).toBe(false);
  });

  it('keeps the loan check apart: a person is not a loan and a loan is not a person', () => {
    expect(isLoanDetailPath('/loans/lendings/p1')).toBe(false);
    expect(isPersonDetailPath('/loans/l1')).toBe(false);
  });
});
