import { describe, expect, it } from 'vitest';

import { clock12, hm12 } from '../clock12';

describe('12-hour clock', () => {
  it('formats the edge hours', () => {
    expect(hm12(0, 5)).toBe('12:05 am');
    expect(hm12(12, 0)).toBe('12:00 pm');
    expect(hm12(15, 30)).toBe('3:30 pm');
    expect(hm12(9, 5)).toBe('9:05 am');
    expect(hm12(23, 59)).toBe('11:59 pm');
  });

  it('reads an instant in IST', () => {
    expect(clock12(new Date('2026-10-13T10:00:00Z'))).toBe('3:30 pm');
    expect(clock12(new Date('2026-10-12T18:35:00Z'))).toBe('12:05 am');
    expect(clock12(new Date('2026-10-13T06:30:00Z'))).toBe('12:00 pm');
  });
});
