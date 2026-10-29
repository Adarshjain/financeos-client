import { describe, expect, it } from 'vitest';

import { activeLoansLendingsTab } from './loansLendingsTabs';

describe('activeLoansLendingsTab on a detail page', () => {
  it('a loan page counts under the Loans tab for the title and counts', () => {
    expect(activeLoansLendingsTab('/loans/abc-123').id).toBe('loans');
  });
});
