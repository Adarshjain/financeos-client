import { describe, expect, it } from 'vitest';

import { parseRewardsUrl } from './rewardsUrl';

describe('parseRewardsUrl', () => {
  it('keeps the rewards tab keys and drops everything else', () => {
    expect(parseRewardsUrl({ rule: 'r1', period: 'LAST_MONTH', from: '2026-05-01', to: '2026-06-30', page: '2', size: '25', other: 'x' })).toEqual({
      rule: 'r1',
      period: 'LAST_MONTH',
      from: '2026-05-01',
      to: '2026-06-30',
      page: '2',
      size: '25',
    });
  });

  it('is empty for an address without them', () => {
    expect(parseRewardsUrl({ foo: 'bar' })).toEqual({ rule: undefined, period: undefined, from: undefined, to: undefined, page: undefined, size: undefined });
  });
});
