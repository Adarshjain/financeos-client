import { describe, expect, it } from 'vitest';

import { approvedMessage, approveTitle, countReasons, getPresentReasons, mapBatchFailures, mapBatchSkips } from './reviewModel';

const txns = [
  { id: 'a', description: 'Swiggy', reviewReasons: ['DUPLICATE_SUSPECT', 'DATE_CORRECTED'] as const },
  { id: 'b', description: null, sourcedDescription: 'IKEA', reviewReasons: ['DATE_CORRECTED'] as const },
  { id: 'c' },
].map((t) => ({ ...t, reviewReasons: t.reviewReasons ? [...t.reviewReasons] : undefined }));

describe('reviewHelpers', () => {
  it('lists the distinct reasons present', () => {
    expect(getPresentReasons({ content: txns }, ['a', 'b', 'c']).sort()).toEqual(['DATE_CORRECTED', 'DUPLICATE_SUSPECT']);
    expect(getPresentReasons({ content: txns }, ['b'])).toEqual(['DATE_CORRECTED']);
    expect(getPresentReasons(null, ['a'])).toEqual([]);
  });

  it('counts every approvable reason in board order, zero included', () => {
    expect(countReasons(txns).map((r) => [r.reason, r.count])).toEqual([
      ['UNRECONCILED', 0],
      ['DUPLICATE_SUSPECT', 1],
      ['DATE_CORRECTED', 2],
    ]);
  });

  it('describes failed and skipped rows, falling back to the id', () => {
    const page = { content: txns };
    expect(mapBatchFailures([{ id: 'b', reason: 'NOT_OWNED' }, { id: 'zz' }], page)).toEqual([
      { description: 'IKEA', reason: expect.any(String) },
      { description: 'Transaction ID: zz', reason: '' },
    ]);
    expect(mapBatchSkips(['a', 'zz'], page)).toEqual(['Swiggy', 'Transaction ID: zz']);
    expect(mapBatchSkips(undefined, null)).toEqual([]);
  });

  it('words the title and the toast for one and many', () => {
    expect(approveTitle(1)).toBe('Approve 1 transaction');
    expect(approveTitle(9)).toBe('Approve 9 transactions');
    expect(approvedMessage(1)).toBe('Approved');
    expect(approvedMessage(3)).toBe('Approved 3 transactions');
  });
});
