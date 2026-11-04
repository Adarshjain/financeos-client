import { describe, expect, it } from 'vitest';

import type { RecurringSeriesDto } from '@/lib/api/types';

import { loanPrefillValues, proposalLine } from './recurringModel';

const base: RecurringSeriesDto = {
  id: 'r1',
  kind: 'SUBSCRIPTION',
  displayName: 'Netflix',
  period: 'MONTHLY',
  amount: 649,
  lastPaidOn: '2026-10-02',
  nextDueOn: '2026-11-02',
  paymentCount: 6,
  accountName: 'HDFC Regalia',
  status: 'PROPOSED',
};

describe('proposalLine', () => {
  it('joins amount and period, count, last date and account', () => {
    expect(proposalLine(base)).toBe('₹649.00 monthly · 6 payments · last 2 Oct · HDFC Regalia');
  });
  it('words each period and leaves the account out when absent', () => {
    expect(proposalLine({ ...base, period: 'QUARTERLY', accountName: null })).toContain('every 3 months · 6 payments');
    expect(proposalLine({ ...base, period: 'WEEKLY', accountName: null })).toContain('weekly');
    expect(proposalLine({ ...base, period: 'YEARLY', accountName: null })).toContain('yearly');
    expect(proposalLine({ ...base, accountName: null })).not.toMatch(/HDFC/);
  });
});

describe('loanPrefillValues', () => {
  it('maps only the fields the loan form has', () => {
    const v = loanPrefillValues({
      ...base,
      kind: 'EMI',
      loanPrefill: { name: 'Car loan', emiAmount: 17540, emiDayOfMonth: 5, firstPaymentGuess: '2026-01-05', accountId: 'b1' },
    });
    expect(v).toEqual({ name: 'Car loan', emiAmount: '17540', firstEmiDate: '2026-01-05', paymentAccountId: 'b1' });
  });
  it('skips a missing date and account', () => {
    const v = loanPrefillValues({ ...base, kind: 'EMI', loanPrefill: { name: 'X', emiAmount: 10, emiDayOfMonth: 1 } });
    expect(v).toEqual({ name: 'X', emiAmount: '10' });
  });
});
