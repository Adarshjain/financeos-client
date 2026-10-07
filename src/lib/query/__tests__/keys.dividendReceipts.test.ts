import { describe, expect, it } from 'vitest';

import { keys } from '../keys';

describe('keys.investments dividend receipt keys', () => {
  it('nest under investments.all so a single invalidation refreshes them', () => {
    const base = keys.investments.all;
    for (const k of [
      keys.investments.dividendReceiptSummary({}),
      keys.investments.dividendReconciliation({}),
      keys.investments.dividendUnrecorded({}),
    ]) {
      expect(k.slice(0, base.length)).toEqual([...base]);
    }
  });

  it('carry their params and distinct segment names', () => {
    expect(keys.investments.dividendReceiptSummary({ brokerAccountId: 'b1' })).toEqual([
      'investments',
      'dividendReceiptSummary',
      { brokerAccountId: 'b1' },
    ]);
    expect(keys.investments.dividendReconciliation({ brokerAccountId: 'b1' })).toEqual([
      'investments',
      'dividendReconciliation',
      { brokerAccountId: 'b1' },
    ]);
    expect(keys.investments.dividendUnrecorded({})).toEqual(['investments', 'dividendUnrecorded', {}]);
  });

  it('default params to an empty object', () => {
    expect(keys.investments.dividendReceiptSummary()).toEqual(['investments', 'dividendReceiptSummary', {}]);
    expect(keys.investments.dividendReconciliation()).toEqual(['investments', 'dividendReconciliation', {}]);
    expect(keys.investments.dividendUnrecorded()).toEqual(['investments', 'dividendUnrecorded', {}]);
  });
});
