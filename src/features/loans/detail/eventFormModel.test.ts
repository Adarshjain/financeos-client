import { describe, expect, it } from 'vitest';

import {
  chargeProblems,
  emptyChargeValues,
  emptyEventValues,
  eventProblems,
  eventTransactionHint,
} from './eventFormModel';

describe('event form', () => {
  it('opens on a rate change, today, reduce tenure', () => {
    expect(emptyEventValues('2026-10-13')).toEqual({
      eventType: 'rate_change',
      effectiveDate: '2026-10-13',
      newAnnualRatePct: '',
      amount: '',
      adjustmentMode: 'reduce_tenure',
      newEmiOverride: '',
    });
    expect(emptyEventValues('2026-10-13', 'prepayment').eventType).toBe('prepayment');
  });

  it('a rate change needs the new rate', () => {
    expect(eventProblems(emptyEventValues('2026-10-13')).map((p) => p.field)).toEqual(['newAnnualRatePct']);
    expect(eventProblems({ ...emptyEventValues('2026-10-13'), newAnnualRatePct: '9.25' })).toEqual([]);
  });

  it('an EMI override must be a usable amount when reducing the EMI, and is ignored otherwise', () => {
    const base = { ...emptyEventValues('2026-10-13', 'prepayment'), amount: '1000' };
    expect(eventProblems({ ...base, adjustmentMode: 'reduce_emi' })).toEqual([]);
    for (const bad of ['100/0', '5+', '0']) {
      expect(eventProblems({ ...base, adjustmentMode: 'reduce_emi', newEmiOverride: bad }).map((p) => p.field)).toEqual([
        'newEmiOverride',
      ]);
    }
    expect(eventProblems({ ...base, adjustmentMode: 'reduce_emi', newEmiOverride: '25000' })).toEqual([]);
    expect(eventProblems({ ...base, adjustmentMode: 'reduce_tenure', newEmiOverride: '5+' })).toEqual([]);
    expect(
      eventProblems({ ...emptyEventValues('2026-10-13', 'foreclosure'), amount: '1000', adjustmentMode: 'reduce_emi', newEmiOverride: '5+' }),
    ).toEqual([]);
  });

  it('prepayments and foreclosures need an amount above zero', () => {
    for (const eventType of ['prepayment', 'foreclosure'] as const) {
      const v = emptyEventValues('2026-10-13', eventType);
      expect(eventProblems(v).map((p) => p.field)).toEqual(['amount']);
      expect(eventProblems({ ...v, amount: '0' }).map((p) => p.field)).toEqual(['amount']);
      expect(eventProblems({ ...v, amount: '100000' })).toEqual([]);
    }
  });

  it('every event needs a date', () => {
    expect(eventProblems({ ...emptyEventValues('', 'prepayment'), amount: '5' }).map((p) => p.field)).toEqual(['effectiveDate']);
  });

  it('hints which transactions fit', () => {
    expect(eventTransactionHint('prepayment')).toContain('money-out (debit)');
    expect(eventTransactionHint('foreclosure')).toContain('money-out (debit)');
    expect(eventTransactionHint('rate_change')).toContain('rarely have a linked transaction');
  });
});

describe('charge form', () => {
  it('opens on a processing fee dated today', () => {
    expect(emptyChargeValues('2026-10-13')).toEqual({
      chargeType: 'processing_fee',
      amount: '',
      chargeDate: '2026-10-13',
      notes: '',
    });
  });

  it('needs an amount above zero and a date', () => {
    const v = emptyChargeValues('2026-10-13');
    expect(chargeProblems(v).map((p) => p.field)).toEqual(['amount']);
    expect(chargeProblems({ ...v, amount: '5000' })).toEqual([]);
    expect(chargeProblems({ ...v, amount: '5000', chargeDate: '' }).map((p) => p.field)).toEqual(['chargeDate']);
  });
});
