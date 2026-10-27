import { describe, expect, it } from 'vitest';

import { activeLoansLendingsTab, isLoanDetailPath } from './loansLendingsTabs';

describe('isLoanDetailPath', () => {
  it('is true for a loan page', () => {
    expect(isLoanDetailPath('/loans/abc-123')).toBe(true);
    expect(isLoanDetailPath('/loans/abc-123/')).toBe(true);
  });

  it('is false for the two tabs and for what lives under Lendings', () => {
    expect(isLoanDetailPath('/loans')).toBe(false);
    expect(isLoanDetailPath('/loans/')).toBe(false);
    expect(isLoanDetailPath('/loans/lendings')).toBe(false);
    expect(isLoanDetailPath('/loans/lendings/c1')).toBe(false);
  });

  it('is false for other pages and for nothing', () => {
    expect(isLoanDetailPath('/accounts/a1')).toBe(false);
    expect(isLoanDetailPath('/loans/a1/b2')).toBe(false);
    expect(isLoanDetailPath(null)).toBe(false);
    expect(isLoanDetailPath(undefined)).toBe(false);
  });

  it('a loan page still counts under the Loans tab for the title and counts', () => {
    expect(activeLoansLendingsTab('/loans/abc-123').id).toBe('loans');
  });
});
