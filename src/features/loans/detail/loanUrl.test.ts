import { describe, expect, it } from 'vitest';

import { parseLoanUrl } from './loanUrl';

describe('parseLoanUrl', () => {
  it('reads the installment to highlight', () => {
    expect(parseLoanUrl({ installment: '7' })).toEqual({ highlightSeq: 7 });
  });

  it('takes the first of a repeated key', () => {
    expect(parseLoanUrl({ installment: ['3', '4'] })).toEqual({ highlightSeq: 3 });
  });

  it('ignores anything that is not a positive whole number', () => {
    expect(parseLoanUrl({ installment: 'abc' })).toEqual({ highlightSeq: null });
    expect(parseLoanUrl({ installment: '0' })).toEqual({ highlightSeq: null });
    expect(parseLoanUrl({})).toEqual({ highlightSeq: null });
  });
});
