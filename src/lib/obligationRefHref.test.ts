import { describe, expect, it } from 'vitest';

import { obligationRefHref } from './obligationRefHref';

describe('obligationRefHref', () => {
  it('sends an EPF withdrawal to the EPF tab, with no parameters', () => {
    expect(obligationRefHref('EPF_WITHDRAWAL', 'employer-1')).toBe('/investments/epf');
  });
  it('keeps the other kinds', () => {
    expect(obligationRefHref('LENDING', 'p1')).toBe('/loans/lendings/p1');
    expect(obligationRefHref('DIVIDEND', 'i1')).toBe('/investments/dividends?instrumentId=i1');
    expect(obligationRefHref('LOAN_PAYMENT', 'l1')).toBe('/loans/l1');
  });
});
