import { describe, expect, it } from 'vitest';

import { obligationRefHref } from './obligationRefHref';

describe('obligationRefHref', () => {
  it('sends an EPF withdrawal to the EPF tab, with no parameters', () => {
    expect(obligationRefHref('EPF_WITHDRAWAL', 'employer-1')).toBe('/investments/retirement/epf');
  });
  it('sends an NPS contribution to the NPS tab', () => {
    expect(obligationRefHref('NPS_CONTRIBUTION', 'acc-1')).toBe('/investments/retirement/nps');
  });
  it('keeps the other kinds', () => {
    expect(obligationRefHref('LENDING', 'p1')).toBe('/lending/p1');
    expect(obligationRefHref('DIVIDEND', 'i1')).toBe('/investments/activity/dividends?instrumentId=i1');
    expect(obligationRefHref('LOAN_PAYMENT', 'l1')).toBe('/loans/l1');
  });
});
