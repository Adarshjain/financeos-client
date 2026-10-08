import { describe, expect, it } from 'vitest';

import { parseReviewSearchParams } from '@/components/transactions/review-browser/reviewDeepLink';

const ACC = '3f2b9c8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const ACC2 = '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d';

describe('parseReviewSearchParams', () => {
  it('reads account, reason and a valid period', () => {
    expect(parseReviewSearchParams({ account: ACC, reason: 'UNRECONCILED', from: '2026-09-01', to: '2026-09-30' })).toEqual({
      accountIds: [ACC],
      reason: 'UNRECONCILED',
      dateRange: { from: '2026-09-01', to: '2026-09-30' },
    });
  });

  it('accepts a comma list of accounts and drops junk ids', () => {
    expect(parseReviewSearchParams({ account: `${ACC},not-an-id,${ACC2}` })).toEqual({ accountIds: [ACC, ACC2] });
  });

  it('drops unknown reasons, half periods, malformed and inverted dates', () => {
    expect(parseReviewSearchParams({ reason: 'SOMETHING_ELSE' })).toBeUndefined();
    expect(parseReviewSearchParams({ from: '2026-09-01' })).toBeUndefined();
    expect(parseReviewSearchParams({ from: '01/09/2026', to: '30/09/2026' })).toBeUndefined();
    expect(parseReviewSearchParams({ from: '2026-09-30', to: '2026-09-01' })).toBeUndefined();
  });

  it('takes the first value of repeated params and returns undefined for nothing useful', () => {
    expect(parseReviewSearchParams({ account: [ACC, ACC2], reason: ['DUPLICATE_SUSPECT', 'UNRECONCILED'] })).toEqual({
      accountIds: [ACC],
      reason: 'DUPLICATE_SUSPECT',
    });
    expect(parseReviewSearchParams(undefined)).toBeUndefined();
    expect(parseReviewSearchParams({})).toBeUndefined();
    expect(parseReviewSearchParams({ account: '' })).toBeUndefined();
  });
});
