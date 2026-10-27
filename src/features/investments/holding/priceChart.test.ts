import { describe, expect, it } from 'vitest';

import type { CorporateAction, PriceHistoryPoint } from '@/lib/types';

import { adjustForSplits, splitsOf } from './priceChart';

const px = (asOf: string, close: number) => ({ asOf, close }) as unknown as PriceHistoryPoint;
const closes = (ps: PriceHistoryPoint[]) => ps.map((p) => Number(p.close));
const act = (over: Record<string, unknown>) => ({ id: 'a', instrumentId: 'i', ...over }) as unknown as CorporateAction;

describe('adjustForSplits', () => {
  const history = [px('2026-10-25', 2000), px('2026-10-26', 2010), px('2026-10-27', 1015), px('2026-10-28', 1020)];

  it('is the identity with no splits', () => {
    expect(adjustForSplits(history, [])).toEqual(history);
  });

  it('divides prices before the ex-date and leaves the ex-date itself and later prices real', () => {
    expect(closes(adjustForSplits(history, [{ exDate: '2026-10-27', factor: 2 }]))).toEqual([1000, 1005, 1015, 1020]);
  });

  it('is cumulative across several later splits', () => {
    const out = adjustForSplits([px('2020-01-01', 1200), px('2022-01-01', 600), px('2024-01-01', 300)], [
      { exDate: '2021-01-01', factor: 2 },
      { exDate: '2023-01-01', factor: 3 },
    ]);
    expect(closes(out)).toEqual([200, 200, 300]);
  });

  it('does not change the stored points', () => {
    adjustForSplits(history, [{ exDate: '2026-10-27', factor: 2 }]);
    expect(Number(history[0].close)).toBe(2000);
  });
});

describe('splitsOf', () => {
  it('takes splits and bonuses as ratioTo / ratioFrom', () => {
    const out = splitsOf([
      act({ type: 'split', ratioFrom: 1, ratioTo: 2, exDate: '2026-10-27' }),
      act({ type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: '2025-06-10' }),
      act({ actionType: 'split', ratioFrom: 2, ratioTo: 1, exDate: '2024-01-01' }),
    ]);
    expect(out).toEqual([
      { exDate: '2026-10-27', factor: 2 },
      { exDate: '2025-06-10', factor: 2 },
      { exDate: '2024-01-01', factor: 0.5 },
    ]);
  });

  it('ignores demergers, mergers, reverted or draft actions and ones without a date or ratio', () => {
    expect(
      splitsOf([
        act({ type: 'demerger', ratioFrom: 1, ratioTo: 2, exDate: '2026-01-01' }),
        act({ type: 'merger', ratioFrom: 1, ratioTo: 2, exDate: '2026-01-01' }),
        act({ type: 'split', ratioFrom: 1, ratioTo: 2, exDate: '2026-01-01', status: 'REVERTED' }),
        act({ type: 'split', ratioFrom: 1, ratioTo: 2, exDate: '2026-01-01', status: 'DRAFT' }),
        act({ type: 'split', ratioFrom: 1, ratioTo: 2 }),
        act({ type: 'split', exDate: '2026-01-01' }),
      ])
    ).toEqual([]);
  });
});
