import { describe, expect, it } from 'vitest';

import { pageItems } from '@/lib/pagination';

/** Readable form: 1-based page numbers, '…' for a gap. */
const show = (current: number, total: number, siblings?: number) =>
  pageItems(current, total, siblings)
    .map((i) => (i === 'gap' ? '…' : String(i + 1)))
    .join(' ');

describe('pageItems', () => {
  it('lists every page when they all fit in the slots', () => {
    expect(show(0, 1)).toBe('1');
    expect(show(3, 7)).toBe('1 2 3 4 5 6 7');
    expect(show(2, 5, 0)).toBe('1 2 3 4 5');
  });

  it('has no slots for an empty list', () => {
    expect(pageItems(0, 0)).toEqual([]);
  });

  it('near the start: a run from page 1, a gap, then the last page', () => {
    expect(show(0, 20)).toBe('1 2 3 4 5 … 20');
    // The last position that still counts as "near the start".
    expect(show(3, 20)).toBe('1 2 3 4 5 … 20');
  });

  it('in the middle: first, gap, the current page with a sibling each side, gap, last', () => {
    expect(show(4, 20)).toBe('1 … 4 5 6 … 20');
    expect(show(9, 20)).toBe('1 … 9 10 11 … 20');
    expect(show(15, 20)).toBe('1 … 15 16 17 … 20');
  });

  it('near the end: first, a gap, then a run up to the last page', () => {
    // The first position that counts as "near the end".
    expect(show(16, 20)).toBe('1 … 16 17 18 19 20');
    expect(show(19, 20)).toBe('1 … 16 17 18 19 20');
  });

  it('keeps the same number of slots wherever the current page is', () => {
    for (let current = 0; current < 30; current++) {
      expect(pageItems(current, 30)).toHaveLength(7);
      expect(pageItems(current, 30, 0)).toHaveLength(5);
    }
  });

  it('always includes the current, first and last page', () => {
    for (let current = 0; current < 30; current++) {
      const items = pageItems(current, 30);
      expect(items).toContain(current);
      expect(items[0]).toBe(0);
      expect(items.at(-1)).toBe(29);
    }
  });

  it('with no siblings (phones) shows only the current page between the ends', () => {
    expect(show(0, 20, 0)).toBe('1 2 3 … 20');
    expect(show(2, 20, 0)).toBe('1 2 3 … 20');
    expect(show(3, 20, 0)).toBe('1 … 4 … 20');
    expect(show(17, 20, 0)).toBe('1 … 18 19 20');
  });
});
