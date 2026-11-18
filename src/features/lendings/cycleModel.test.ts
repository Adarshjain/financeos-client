import { describe, expect, it } from 'vitest';

import { cycleLabel } from './cycleModel';

describe('cycleLabel', () => {
  it('says an open cycle runs from its first day', () => {
    expect(cycleLabel({ number: 3, startDate: '2026-10-06', endDate: '2026-10-20', settled: false })).toBe('Cycle 3 · from 6 Oct 26');
  });

  it('gives a settled cycle its first and last day', () => {
    expect(cycleLabel({ number: 2, startDate: '2026-08-12', endDate: '2026-10-04', settled: true })).toBe('Cycle 2 · 12 Aug 26 – 4 Oct 26');
  });

  it('gives a settled cycle of one day a single date', () => {
    expect(cycleLabel({ number: 2, startDate: '2026-08-12', endDate: '2026-08-12', settled: true })).toBe('Cycle 2 · 12 Aug 26');
  });
});
