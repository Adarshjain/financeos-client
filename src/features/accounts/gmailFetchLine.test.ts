import { describe, expect, it } from 'vitest';

import { gmailFetchLine } from './gmailFetchLine';

describe('gmailFetchLine', () => {
  it('reads the progress', () => {
    expect(gmailFetchLine({ monthsDone: 8, monthsTotal: 12 })).toBe('Fetching older emails · 8 of 12 months');
  });
  it('is absent without progress', () => {
    expect(gmailFetchLine(null)).toBeNull();
    expect(gmailFetchLine(undefined)).toBeNull();
  });
});
