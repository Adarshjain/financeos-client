import { describe, expect, it } from 'vitest';

import { buildChargeRequest, buildEventRequest, buildPaymentRequest, isCashEvent, prefillAmount, prefillDate } from './loanRequests';

describe('prefill from a picked transaction', () => {
  it('fills what is empty and keeps what was typed', () => {
    expect(prefillAmount('', { amount: -2300 })).toBe('2300');
    expect(prefillAmount('1500', { amount: -2300 })).toBe('1500');
    expect(prefillDate('', { date: '2026-09-13' })).toBe('2026-09-13');
    expect(prefillDate('2026-10-01', { date: '2026-09-13' })).toBe('2026-10-01');
  });
});

describe('buildPaymentRequest', () => {
  it('records what was paid, with the debit when there is one', () => {
    expect(buildPaymentRequest({ installmentSeq: 14, paymentDate: '2026-10-05', amount: '39052', transactionId: 't1' })).toEqual({
      installmentSeq: 14,
      paymentDate: '2026-10-05',
      amount: 39052,
      transactionId: 't1',
    });
    expect(buildPaymentRequest({ installmentSeq: 14, paymentDate: '2026-10-05', amount: '36603' }).transactionId).toBeUndefined();
  });
});

describe('buildEventRequest', () => {
  const base = {
    effectiveDate: '2026-10-13',
    newAnnualRatePct: '',
    amount: '',
    adjustmentMode: 'reduce_tenure' as const,
    newEmiOverride: '',
  };

  it('a rate change carries the rate and the adjustment', () => {
    expect(buildEventRequest({ ...base, eventType: 'rate_change', newAnnualRatePct: '9.25' })).toEqual({
      eventType: 'rate_change',
      effectiveDate: '2026-10-13',
      newAnnualRatePct: 9.25,
      amount: undefined,
      adjustmentMode: 'reduce_tenure',
      newEmiOverride: undefined,
      transactionId: undefined,
    });
  });

  it('an EMI override only goes with a reduce-EMI adjustment', () => {
    const withOverride = { ...base, eventType: 'prepayment' as const, amount: '100000', newEmiOverride: '30000' };
    expect(buildEventRequest({ ...withOverride, adjustmentMode: 'reduce_emi' }).newEmiOverride).toBe(30000);
    expect(buildEventRequest({ ...withOverride, adjustmentMode: 'reduce_tenure' }).newEmiOverride).toBeUndefined();
    expect(buildEventRequest({ ...withOverride, adjustmentMode: 'reduce_emi', newEmiOverride: '' }).newEmiOverride).toBeUndefined();
  });

  it('a foreclosure has no adjustment and no override', () => {
    const request = buildEventRequest({
      ...base,
      eventType: 'foreclosure',
      amount: '4000000',
      adjustmentMode: 'reduce_emi',
      newEmiOverride: '30000',
      transactionId: 't1',
    });
    expect(request).toMatchObject({ amount: 4000000, adjustmentMode: undefined, newEmiOverride: undefined, transactionId: 't1' });
  });

  it('knows which events move money', () => {
    expect(isCashEvent('prepayment')).toBe(true);
    expect(isCashEvent('foreclosure')).toBe(true);
    expect(isCashEvent('rate_change')).toBe(false);
  });
});

describe('buildChargeRequest', () => {
  it('trims the note and drops it when blank', () => {
    expect(buildChargeRequest({ chargeType: 'late_fee', amount: '500', chargeDate: '2026-10-05', notes: '  late  ' }).notes).toBe('late');
    expect(buildChargeRequest({ chargeType: 'late_fee', amount: '500', chargeDate: '2026-10-05', notes: '   ' }).notes).toBeUndefined();
    expect(buildChargeRequest({ chargeType: 'late_fee', amount: '500', chargeDate: '2026-10-05', notes: '', transactionId: 't1' })).toMatchObject({
      amount: 500,
      transactionId: 't1',
    });
  });
});
