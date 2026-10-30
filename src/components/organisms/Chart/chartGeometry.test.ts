import { describe, expect, it } from 'vitest';

import {
  areaPath,
  barLayout,
  barRadii,
  categoryIndexAt,
  linePath,
  placeFloat,
  roundedBarPath,
  stackSegments,
  textWidth,
  visibleTicks,
} from './chartGeometry';

describe('textWidth', () => {
  it('grows with the text and the font size', () => {
    expect(textWidth('', 12)).toBe(0);
    expect(textWidth('abcd', 10)).toBeCloseTo(24);
  });
});

describe('linePath / areaPath', () => {
  it('draws a smooth line through the points and closes the area on the baseline', () => {
    const pts = [
      [0, 10],
      [10, 0],
      [20, 5],
    ] as const;
    expect(linePath([...pts])).toMatch(/^M0,10C/);
    const area = areaPath([...pts], 20);
    expect(area).toMatch(/^M0,10C/);
    expect(area).toMatch(/L20,20C.*,0,20Z$/);
  });

  it('is empty for no points', () => {
    expect(linePath([])).toBe('');
  });
});

describe('roundedBarPath', () => {
  it('rounds the corners asked for and keeps the others square', () => {
    const d = roundedBarPath(0, 0, 20, 40, [4, 4, 0, 0]);
    expect(d.startsWith('M4,0 H16 A4,4 0 0 1 20,4')).toBe(true);
    expect(d).toContain('A0,0 0 0 1 0,40');
  });

  it('never rounds past half the bar', () => {
    expect(roundedBarPath(0, 0, 20, 2, [4, 4, 0, 0])).toContain('A1,1 0 0 1 20,1');
  });
});

describe('barRadii', () => {
  it('rounds the end away from the baseline', () => {
    expect(barRadii(4, false, false)).toEqual([4, 4, 0, 0]);
    expect(barRadii(4, false, true)).toEqual([0, 0, 4, 4]);
    expect(barRadii(4, true, false)).toEqual([0, 4, 4, 0]);
    expect(barRadii(4, true, true)).toEqual([4, 0, 0, 4]);
  });
});

describe('barLayout', () => {
  it('centres the group in its cell, capped by the max bar size', () => {
    const one = barLayout(100, 1, 28);
    expect(one.size).toBe(28);
    expect(one.offset).toBeCloseTo(36);
    const two = barLayout(100, 2, 28);
    expect(two.size).toBeCloseTo(25);
    expect(two.step).toBeCloseTo(27);
    expect(two.offset).toBeCloseTo(24);
  });

  it('shrinks bars to fit a tight cell', () => {
    const tight = barLayout(20, 2, 28);
    expect(tight.size).toBeCloseTo((20 * 0.52 - 2) / 2);
  });
});

describe('stackSegments', () => {
  it('climbs positives from zero and descends negatives from zero, skipping nulls', () => {
    const out = stackSegments(
      [
        { data: [10, -5, null] },
        { data: [20, -5, 7] },
      ],
      3
    );
    expect(out[0]).toEqual([{ lo: 0, hi: 10 }, { lo: -5, hi: 0 }, null]);
    expect(out[1]).toEqual([{ lo: 10, hi: 30 }, { lo: -10, hi: -5 }, { lo: 0, hi: 7 }]);
  });
});

describe('visibleTicks', () => {
  it('keeps the first and last and drops labels that would collide', () => {
    const ticks = [0, 10, 50, 60, 100].map((pos) => ({ pos, width: 24 }));
    expect(visibleTicks(ticks, 8)).toEqual([true, false, true, false, true]);
  });

  it('keeps everything that fits', () => {
    const ticks = [0, 50, 100].map((pos) => ({ pos, width: 20 }));
    expect(visibleTicks(ticks, 8)).toEqual([true, true, true]);
  });

  it('drops a middle label that would touch the last one', () => {
    const ticks = [
      { pos: 0, width: 20 },
      { pos: 90, width: 20 },
      { pos: 100, width: 20 },
    ];
    expect(visibleTicks(ticks, 8)).toEqual([true, false, true]);
  });

  it('handles none and one', () => {
    expect(visibleTicks([], 8)).toEqual([]);
    expect(visibleTicks([{ pos: 5, width: 10 }], 8)).toEqual([true]);
  });
});

describe('categoryIndexAt', () => {
  it('maps a coordinate to a band cell, clamped to the ends', () => {
    expect(categoryIndexAt(0, 0, 300, 3, 'band')).toBe(0);
    expect(categoryIndexAt(150, 0, 300, 3, 'band')).toBe(1);
    expect(categoryIndexAt(299, 0, 300, 3, 'band')).toBe(2);
    expect(categoryIndexAt(900, 0, 300, 3, 'band')).toBe(2);
    expect(categoryIndexAt(-5, 0, 300, 3, 'band')).toBe(0);
  });

  it('maps a coordinate to the nearest point', () => {
    expect(categoryIndexAt(40, 0, 300, 4, 'point')).toBe(0);
    expect(categoryIndexAt(60, 0, 300, 4, 'point')).toBe(1);
    expect(categoryIndexAt(300, 0, 300, 4, 'point')).toBe(3);
  });

  it('is 0 for a single category', () => {
    expect(categoryIndexAt(100, 0, 300, 1, 'point')).toBe(0);
  });
});

describe('placeFloat', () => {
  it('sits right and below the pointer when it fits', () => {
    expect(placeFloat(20, 20, 400, 300, 100, 60)).toEqual({ left: 30, top: 30 });
  });

  it('flips left and above when it would overflow', () => {
    expect(placeFloat(380, 280, 400, 300, 100, 60)).toEqual({ left: 270, top: 210 });
  });

  it('clamps inside the chart when even the flipped card overflows', () => {
    // Narrow chart: the flipped card would start at a negative x.
    expect(placeFloat(60, 20, 100, 300, 90, 60).left).toBe(0);
    expect(placeFloat(20, 280, 400, 100, 100, 90).top).toBe(10);
    expect(placeFloat(5, 5, 50, 40, 120, 80)).toEqual({ left: 0, top: 0 });
  });
});
