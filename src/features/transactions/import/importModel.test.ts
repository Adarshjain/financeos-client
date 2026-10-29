import { describe, expect, it } from 'vitest';

import type { JobResponse } from '@/lib/types';

import { importJobTitle, importTotals, importUrl, isJobId, parseImportAccount, parseImportPage, recentImportsSince } from './importModel';

const file = (filename: string, linesParsed: number) => ({ filename, status: 'SUCCESS' as const, linesParsed, errorMessage: null });
const job = (files: ReturnType<typeof file>[], status: JobResponse['status'] = 'SUCCEEDED') =>
  ({ id: 'j', type: 'STATEMENT_INGEST', status, result: { filesProcessed: files.length, totalCreated: 5, totalDuplicatesFound: 2, fileDetails: files } }) as JobResponse;

describe('importModel', () => {
  it('reads the starting account from ?account=, the first of a repeated key', () => {
    expect(parseImportAccount({ account: 'a1' })).toBe('a1');
    expect(parseImportAccount({ account: ['a2', 'a1'] })).toBe('a2');
    expect(parseImportAccount({})).toBeUndefined();
  });

  it('titles a job by its file, "n files" for several, and a plain name before it has a result', () => {
    expect(importJobTitle(job([file('a.pdf', 3)]))).toBe('a.pdf');
    expect(importJobTitle(job([file('a.pdf', 3), file('b.pdf', 4)]))).toBe('2 files');
    expect(importJobTitle(job([], 'RUNNING'))).toBe('Statement import');
  });

  it('totals files, lines, created and duplicates', () => {
    expect(importTotals(job([file('a.pdf', 3), file('b.pdf', 4)]).result as never)).toEqual({ files: 2, lines: 7, created: 5, duplicates: 2 });
  });

  it('starts Recent imports at the start of the app-zone day 30 days back, as an instant', () => {
    expect(recentImportsSince('2026-10-23')).toBe('2026-09-22T18:30:00.000Z');
    expect(recentImportsSince('2026-03-05')).toBe('2026-02-02T18:30:00.000Z');
  });

  it('accepts a job id and nothing else', () => {
    expect(isJobId('0a1b2c3d-4e5f-6789-abcd-ef0123456789')).toBe(true);
    expect(isJobId('abc')).toBe(false);
    expect(isJobId('../settings')).toBe(false);
  });

  it('reads the page from the address: 1-based into a 0-based page, and the first page for anything unusable', () => {
    expect(parseImportPage({ page: '3' })).toBe(2);
    expect(parseImportPage({ page: ['2', '5'] })).toBe(1);
    expect(parseImportPage({})).toBe(0);
    expect(parseImportPage({ page: '1' })).toBe(0);
    expect(parseImportPage({ page: '0' })).toBe(0);
    expect(parseImportPage({ page: '-1' })).toBe(0);
    expect(parseImportPage({ page: 'abc' })).toBe(0);
  });

  it('builds the Import address with the page and account only when set', () => {
    expect(importUrl()).toMatch(/\/transactions\/import$/);
    expect(importUrl({ page: 0 })).toMatch(/\/transactions\/import$/);
    expect(importUrl({ page: 2 })).toMatch(/\/transactions\/import\?page=3$/);
    expect(importUrl({ account: 'a1', page: 1 })).toMatch(/\?account=a1&page=2$/);
  });
});
