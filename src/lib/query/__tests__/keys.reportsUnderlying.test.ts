import { describe, expect, it } from 'vitest';

import { keys } from '../keys';

describe('keys.reports underlying / breakdown', () => {
  it('nest under reports.all so one invalidation refreshes them', () => {
    const base = keys.reports.all;
    for (const k of [
      keys.reports.underlying({ kind: 'saved', reportId: 'r1' }),
      keys.reports.breakdown('net_worth', 'a1'),
    ]) {
      expect(k.slice(0, base.length)).toEqual([...base]);
    }
  });

  it('carry the source and params', () => {
    expect(keys.reports.underlying({ kind: 'saved', reportId: 'r1' }, { period: 'current', page: 0 })).toEqual([
      'reports',
      'underlying',
      { kind: 'saved', reportId: 'r1' },
      { period: 'current', page: 0 },
    ]);
    expect(keys.reports.breakdown('positions', 'h1', { section: 'lots', page: 1, size: 25 })).toEqual([
      'reports',
      'breakdown',
      'positions',
      'h1',
      { section: 'lots', page: 1, size: 25 },
    ]);
  });

  it('default params to an empty object', () => {
    expect(keys.reports.underlying({ kind: 'builtin' })).toEqual(['reports', 'underlying', { kind: 'builtin' }, {}]);
    expect(keys.reports.breakdown('net_worth', 'a1')).toEqual(['reports', 'breakdown', 'net_worth', 'a1', {}]);
  });
});
