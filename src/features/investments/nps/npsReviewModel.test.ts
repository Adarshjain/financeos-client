import { describe, expect, it } from 'vitest';

import type { NpsReviewAccount, NpsReviewUnrecorded } from '@/lib/api/types';

import { accountLabel, contributionFacts, matchedLine, matchWhy, paymentFacts, recordOptions, reviewCount, setupLine, sinceLine, sourceLine } from './npsReviewModel';

const account = (over: Partial<NpsReviewAccount> = {}): NpsReviewAccount => ({ id: 'a1', pranLast4: '0000', holderName: 'Test Holder', relation: 'SELF', tiers: ['I'], ...over });
const payment = { transactionId: 't1', date: '2026-01-05', amount: 5000.5, description: 'NPS TRUST A/C', accountName: 'Test Bank ••1111' };
const contribution = { id: 'c1', account: account(), tier: 'I' as const, date: '2026-01-05', amount: 5000, source: 'STATEMENT' as const, statementPeriodStart: '2026-01-01', statementPeriodEnd: '2026-03-31' };
const unrecorded = (over: Partial<NpsReviewUnrecorded> = {}): NpsReviewUnrecorded => ({ payment, matchedOn: 'NPS', daysSince: 12, recordTo: [account()], ...over });

describe('npsReviewModel', () => {
  it('says why for every code, and nothing for an unknown one', () => {
    expect(matchWhy('MULTIPLE_CANDIDATES')).toBe('More than one bank payment fits this contribution.');
    expect(matchWhy('SHARED_PAYMENT')).toBe('This payment also fits another contribution.');
    expect(matchWhy('OTHER')).toBeNull();
  });

  it('counts matches, unrecorded payments and the setup offer', () => {
    expect(reviewCount(null)).toBe(0);
    expect(reviewCount({ matches: [], unrecorded: [], setup: undefined } as never)).toBe(0);
    expect(reviewCount({ matches: [{}, {}], unrecorded: [{}], setup: {} } as never)).toBe(4);
  });

  it('names the account with and without a holder', () => {
    expect(accountLabel(account())).toBe('PRAN ••0000 · Test Holder');
    expect(accountLabel(account({ holderName: null }))).toBe('PRAN ••0000');
  });

  it('gives the source with the statement period when there is one', () => {
    expect(sourceLine(contribution)).toBe('NPS statement, 01/01/26–31/03/26');
    expect(sourceLine({ ...contribution, statementPeriodStart: null, statementPeriodEnd: null })).toBe('NPS statement');
    expect(sourceLine({ ...contribution, source: 'MANUAL', statementPeriodStart: null, statementPeriodEnd: null })).toBe('Added by hand');
    expect(sourceLine({ ...contribution, source: 'EMAIL', statementPeriodStart: null, statementPeriodEnd: null })).toBe('NPS email');
    expect(sourceLine({ ...contribution, source: 'BANK', statementPeriodStart: undefined, statementPeriodEnd: undefined })).toBe('Bank payment');
  });

  it('lays out a contribution and a payment, with paise and a fallback description', () => {
    expect(contributionFacts(contribution)).toMatchObject({ amount: '₹5,000', date: '05/01/26', tier: 'Tier I', account: 'PRAN ••0000 · Test Holder' });
    expect(paymentFacts(payment)).toEqual({ date: '05/01/26', amount: '₹5,000.50', description: 'NPS TRUST A/C', account: 'Test Bank ••1111' });
    expect(paymentFacts({ ...payment, description: null }).description).toBe('No description');
  });

  it('says what the payment looked like, or nothing when there was no keyword', () => {
    expect(matchedLine(unrecorded())).toBe('Looks like NPS because the description has “NPS”');
    expect(matchedLine(unrecorded({ matchedOn: null }))).toBeNull();
  });

  it('says how long ago, in singular and plural', () => {
    expect(sinceLine(12)).toBe('12 days ago, and no NPS statement has it yet');
    expect(sinceLine(1)).toBe('1 day ago, and no NPS statement has it yet');
    expect(sinceLine(0)).toBe('Today, and no NPS statement has it yet');
  });

  it('offers every account and tier to record to', () => {
    const options = recordOptions(unrecorded({ recordTo: [account(), account({ id: 'a2', pranLast4: '1111', holderName: null, tiers: ['I', 'II'] })] }));
    expect(options.map((o) => o.value)).toEqual(['a1:I', 'a2:I', 'a2:II']);
    expect(options[2]).toMatchObject({ accountId: 'a2', tier: 'II', label: 'PRAN ••1111 · Tier II' });
    expect(recordOptions(unrecorded({ recordTo: [] }))).toEqual([]);
  });

  it('sums up the setup offer', () => {
    expect(setupLine({ paymentCount: 6, totalAmount: 120000, firstDate: '2026-01-05', lastDate: '2026-06-05', sample: [] })).toBe('6 payments, ₹1,20,000 from 05/01/26 to 05/06/26');
    expect(setupLine({ paymentCount: 1, totalAmount: 500, firstDate: '2026-01-05', lastDate: '2026-01-05', sample: [] })).toBe('1 payment, ₹500 from 05/01/26 to 05/01/26');
  });
});
