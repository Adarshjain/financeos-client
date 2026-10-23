import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

import { categoriesUrl, clampedCategoriesUrl, parseCategoriesUrl, uncategorizedData } from './categoriesModel';

describe('categories address', () => {
  it('reads the first q and a valid page, falling back to the first page', () => {
    expect(parseCategoriesUrl({ q: [' a ', 'b'], page: '2' })).toEqual({ q: 'a', page: 2 });
    expect(parseCategoriesUrl({ page: '-1' })).toEqual({ q: '', page: 0 });
    expect(parseCategoriesUrl({ page: 'x' })).toEqual({ q: '', page: 0 });
  });
  it('writes q and page, leaving defaults out', () => {
    expect(categoriesUrl({ q: 'a b', page: 1 })).toBe('?q=a+b&page=1');
    expect(categoriesUrl({ q: '', page: 0 })).toBe('?');
  });
});

describe('uncategorizedData', () => {
  const t = { id: 't1', description: 'IKEA India', date: '2026-10-03', amount: -7430 } as Transaction;
  it('is null when nothing lacks a category', () => {
    expect(uncategorizedData({ content: [], totalElements: 0 }, '/x')).toBeNull();
  });
  it('gives the count, the rows and the review link', () => {
    const data = uncategorizedData({ content: [t], totalElements: 23 }, '/x');
    expect(data?.count).toBe(23);
    expect(data?.reviewHref).toBe('/x');
    expect(data?.rows).toEqual([{ id: 't1', description: 'IKEA India', detail: '3 Oct · ₹7,430' }]);
  });
});

describe('clampedCategoriesUrl', () => {
  const empty = { content: [], totalPages: 2 };
  it('goes to the last page when the page asked for is past the end', () => {
    expect(clampedCategoriesUrl({ q: 'a', page: 9 }, empty)).toBe('?q=a&page=1');
    expect(clampedCategoriesUrl({ q: '', page: 2 }, { content: [], totalPages: 1 })).toBe('?');
  });
  it('stays put when the page has rows, is in range, or nothing exists', () => {
    expect(clampedCategoriesUrl({ q: '', page: 1 }, { content: [{}], totalPages: 2 })).toBeNull();
    expect(clampedCategoriesUrl({ q: '', page: 1 }, empty)).toBeNull();
    expect(clampedCategoriesUrl({ q: 'zzz', page: 0 }, { content: [], totalPages: 0 })).toBeNull();
  });
});
