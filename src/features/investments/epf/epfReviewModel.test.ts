import { describe, expect, it } from 'vitest';

import { creditFacts, daysApartLine, differenceLine, entryFacts, kindLabel, whyLine } from './epfReviewModel';

const entry = { id: 'e1', creditedOn: '2026-02-10', kind: 'PARTIAL' as const, description: 'Claim settled', employerName: 'Test Employer', gross: 100000, received: 90000, tdsAmount: 10000 };

describe('epfReviewModel', () => {
  it('says why for every code, and nothing for an unknown one', () => {
    expect(whyLine('MULTIPLE_CREDITS')).toBe('More than one bank credit fits this withdrawal.');
    expect(whyLine('SHARED_CREDIT')).toBe('This credit also fits another withdrawal.');
    expect(whyLine('NEEDS_CONFIRMATION')).toBe('We always ask before linking EPF money.');
    expect(whyLine('OTHER')).toBeNull();
  });

  it('names the kind, falling back to the description and then a plain label', () => {
    expect(kindLabel(entry)).toBe('Partial withdrawal');
    expect(kindLabel({ ...entry, kind: 'FINAL_SETTLEMENT' })).toBe('Final settlement');
    expect(kindLabel({ ...entry, kind: 'PENSION' })).toBe('Pension withdrawal');
    expect(kindLabel({ ...entry, kind: null })).toBe('Claim settled');
    expect(kindLabel({ ...entry, kind: undefined, description: null })).toBe('EPF withdrawal');
  });

  it('says whether the amounts match', () => {
    expect(differenceLine(0)).toBe('Amounts match');
    expect(differenceLine(500)).toBe('Differs by ₹500');
    expect(differenceLine(-250.5)).toBe('Differs by ₹250.50');
  });

  it('says how many days apart, in singular and plural', () => {
    expect(daysApartLine(3)).toBe('3 days apart');
    expect(daysApartLine(1)).toBe('1 day apart');
    expect(daysApartLine(0)).toBe('Same day');
  });

  it('lays out the EPF side, leaving TDS out when there is none', () => {
    expect(entryFacts(entry)).toEqual({ creditedOn: '10/02/26', kind: 'Partial withdrawal', employer: 'Test Employer', gross: '₹1,00,000', tds: '₹10,000', received: '₹90,000' });
    expect(entryFacts({ ...entry, tdsAmount: null }).tds).toBeNull();
    expect(entryFacts({ ...entry, tdsAmount: 0 }).tds).toBeNull();
  });

  it('lays out the bank side with a fallback description', () => {
    const credit = { transactionId: 't1', date: '2026-02-12', amount: 90000, description: 'EPFO CLAIM', accountName: 'Test Bank ••1111' };
    expect(creditFacts(credit)).toEqual({ date: '12/02/26', amount: '₹90,000', description: 'EPFO CLAIM', account: 'Test Bank ••1111' });
    expect(creditFacts({ ...credit, description: undefined }).description).toBe('No description');
  });
});
