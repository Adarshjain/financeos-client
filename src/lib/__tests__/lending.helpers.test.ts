import { describe, expect, it } from 'vitest';

import { suggestCounterparty } from '../lending.helpers';

describe('suggestCounterparty', () => {
  const rahul = { id: 'cp-rahul', name: 'Rahul Sharma' };

  it('returns null for null, undefined, or empty text', () => {
    expect(suggestCounterparty(null, [rahul])).toBeNull();
    expect(suggestCounterparty(undefined, [rahul])).toBeNull();
    expect(suggestCounterparty('', [rahul])).toBeNull();
  });

  it('returns null when there are no counterparties to match against', () => {
    expect(suggestCounterparty('Dinner with Rahul Sharma', [])).toBeNull();
  });

  it('returns null when no counterparty token overlaps the text', () => {
    expect(suggestCounterparty('Amazon Purchase Order', [rahul])).toBeNull();
  });

  it('returns the id of a single-token match', () => {
    expect(suggestCounterparty('Dinner split with Rahul', [rahul])).toBe('cp-rahul');
  });

  it('picks the counterparty with the higher token overlap over a lower one', () => {
    const partial = { id: 'cp-partial', name: 'Rahul' };
    const full = { id: 'cp-full', name: 'Rahul Sharma' };
    expect(suggestCounterparty('UPI to Rahul Sharma', [partial, full])).toBe('cp-full');
  });

  it('keeps the first-listed counterparty on a tied score', () => {
    const first = { id: 'cp-first', name: 'Rahul Sharma' };
    const second = { id: 'cp-second', name: 'Sharma Rahul' };
    expect(suggestCounterparty('Rahul Sharma', [first, second])).toBe('cp-first');
  });

  it('ignores tokens shorter than 3 characters on both the text and name side', () => {
    // "to"/"re"/"ab" are all under the 3-char floor, so nothing here can ever score.
    const shortNamed = { id: 'cp-short', name: 'To Re AB' };
    expect(suggestCounterparty('to re AB', [shortNamed])).toBeNull();
  });

  it('strips punctuation and case before matching', () => {
    expect(suggestCounterparty('UPI/P2P/RAHUL-SHARMA', [rahul])).toBe('cp-rahul');
  });
});
