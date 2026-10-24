import { describe, expect, it } from 'vitest';

import { seriesColor } from '@/components/charts/chart-format';

describe('seriesColor', () => {
  it('maps slots 0–7 onto the --chart-1..8 tokens', () => {
    expect(seriesColor(0)).toBe('hsl(var(--chart-1))');
    expect(seriesColor(7)).toBe('hsl(var(--chart-8))');
  });

  it('wraps past the eighth slot (only reached by non-additive overflow)', () => {
    expect(seriesColor(8)).toBe('hsl(var(--chart-1))');
  });
});
