import { describe, expect, it } from 'vitest';

import { clampPage, DEFAULT_PAGE_SIZE, pageHref, parsePage, setPageParam } from './pagination';

describe('parsePage', () => {
  it('reads the address 1-based into a 0-based page', () => {
    expect(parsePage({ page: '1' }).page).toBe(0);
    expect(parsePage({ page: '2' }).page).toBe(1);
    expect(parsePage({ page: '10' }).page).toBe(9);
  });

  it('treats a missing or unusable page as the first page', () => {
    for (const page of [undefined, '', '0', '-3', 'abc', 'NaN']) expect(parsePage({ page }).page).toBe(0);
  });

  it('takes the first of a repeated page and rounds down', () => {
    expect(parsePage({ page: ['3', '5'] }).page).toBe(2);
    expect(parsePage({ page: '2.9' }).page).toBe(1);
  });

  it('falls back to the default size, or the one given', () => {
    expect(parsePage({}).size).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePage({}, { size: 50 }).size).toBe(50);
  });

  it('keeps only a size the list offers', () => {
    const opts = { size: 25, sizes: [10, 25, 50] };
    expect(parsePage({ size: '50' }, opts).size).toBe(50);
    expect(parsePage({ size: '7' }, opts).size).toBe(25);
    expect(parsePage({ size: 'x' }, opts).size).toBe(25);
  });

  it('accepts any whole size above zero when no sizes are listed', () => {
    expect(parsePage({ size: '40' }).size).toBe(40);
    expect(parsePage({ size: '0' }).size).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePage({ size: '2.5' }).size).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe('pageHref', () => {
  it('writes the page 1-based and leaves the first page out', () => {
    expect(pageHref('/loans', {}, 0)).toBe('/loans');
    expect(pageHref('/loans', {}, 1)).toBe('/loans?page=2');
    expect(pageHref('/loans', { q: 'home' }, 2)).toBe('/loans?q=home&page=3');
  });

  it('takes a URLSearchParams query and drops empty values from a record', () => {
    expect(pageHref('/x', new URLSearchParams('a=1&a=2'), 1)).toBe('/x?a=1&a=2&page=2');
    expect(pageHref('/x', { q: '', filter: undefined }, 0)).toBe('/x');
  });

  it('round-trips through parsePage', () => {
    const url = new URL(pageHref('/x', {}, 4), 'http://t');
    expect(parsePage(Object.fromEntries(url.searchParams)).page).toBe(4);
  });
});

describe('setPageParam', () => {
  it('sets page to the 1-based number, and nothing for the first page', () => {
    const q = new URLSearchParams();
    setPageParam(q, 0);
    expect(q.toString()).toBe('');
    setPageParam(q, 1);
    expect(q.toString()).toBe('page=2');
  });
});

describe('clampPage', () => {
  it('keeps a page that exists and pulls a page past the end back to the last', () => {
    expect(clampPage(1, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(4);
  });

  it('is the first page when there are no pages or the page is negative', () => {
    expect(clampPage(3, 0)).toBe(0);
    expect(clampPage(-1, 5)).toBe(0);
  });
});
