import { describe, expect, it } from 'vitest';

import type { ImportRecordResponse } from '@/lib/api/types';
import { pinClock } from '@/test/pinClock';

import { importRow, importsUrl, parseImportsUrl } from './importsModel';

pinClock();

const record = (over: Partial<ImportRecordResponse>): ImportRecordResponse =>
  ({
    id: 'statement:s1',
    kind: 'statement',
    source: 'upload',
    status: 'done',
    fileName: 'hdfc-oct.pdf',
    accountId: 'a1',
    accountName: 'HDFC Bank',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    count: 42,
    errorMessage: null,
    createdAt: '2026-11-02T10:00:00Z',
    ...over,
  }) as unknown as ImportRecordResponse;

describe('importRow', () => {
  it('a statement: account name, file, period and transactions; links to the account statements', () => {
    const row = importRow(record({}));
    expect(row.title).toBe('HDFC Bank statement');
    expect(row.detail).toBe('hdfc-oct.pdf · 1 Oct–31 Oct · 42 transactions');
    expect(row.date).toBe('2 Nov');
    expect(row.status).toBeUndefined();
    expect(row.href).toBe('/accounts/a1/statements');
  });

  it('a Gmail statement says where it came from; one transaction is singular', () => {
    const row = importRow(record({ source: 'gmail', fileName: null as never, count: 1 }));
    expect(row.detail).toBe('From Gmail · 1 Oct–31 Oct · 1 transaction');
  });

  it('a statement without an account has a plain title and no link', () => {
    const row = importRow(record({ accountId: null as never, accountName: null as never }));
    expect(row.title).toBe('Statement');
    expect(row.href).toBeUndefined();
  });

  it('an NPS statement links to its account and counts contributions', () => {
    const row = importRow(record({ id: 'nps:n1', kind: 'nps_statement', source: 'gmail', fileName: null as never, accountName: null as never, accountId: 'n-acc', count: 18 }));
    expect(row.title).toBe('NPS statement');
    expect(row.detail).toBe('From Gmail · 1 Oct–31 Oct · 18 contributions');
    expect(row.href).toBe('/investments/nps?account=n-acc');
  });

  it('an EPF passbook counts entries and links to EPF', () => {
    const row = importRow(record({ id: 'epf:e1', kind: 'epf_passbook', fileName: null as never, accountName: null as never, accountId: null as never, count: 18 }));
    expect(row.title).toBe('EPF passbook');
    expect(row.detail).toBe('1 Oct–31 Oct · 18 entries');
    expect(row.href).toBe('/investments/epf');
  });

  it('a broker import has no period or count and links to Activity', () => {
    const row = importRow(record({ id: 'job:j1', kind: 'broker', accountName: null as never, accountId: null as never, periodStart: null as never, periodEnd: null as never, count: null as never, fileName: 'tradebook.csv' }));
    expect(row.title).toBe('Broker import');
    expect(row.detail).toBe('tradebook.csv');
    expect(row.href).toBe('/investments/tradebook');
  });

  it('a failed import says so, shows the error and links to the failed jobs', () => {
    const row = importRow(record({ id: 'job:j2', status: 'failed', errorMessage: 'Could not read the file', periodStart: null as never, periodEnd: null as never, count: null as never }));
    expect(row.status).toEqual({ tone: 'danger', label: "Couldn't import" });
    expect(row.detail).toBe('hdfc-oct.pdf · Could not read the file');
    expect(row.href).toBe('/data-sources/sync?status=failed');
  });

  it('a held file waits for an account and links to where held files are resolved', () => {
    const row = importRow(record({ id: 'held:h-1', status: 'held', accountId: null as never, accountName: null as never, errorMessage: 'No account matched this file', count: null as never, periodStart: null as never, periodEnd: null as never }));
    expect(row.status).toEqual({ tone: 'warning', label: 'Waiting for an account' });
    expect(row.detail).toBe('hdfc-oct.pdf · No account matched this file');
    expect(row.href).toBe('/transactions/import?held=h-1');
  });
});

describe('parseImportsUrl', () => {
  it('reads page (1-based), size and kind', () => {
    expect(parseImportsUrl({ page: '3', size: '50', kind: 'epf_passbook' })).toEqual({ page: 2, size: 50, kind: 'epf_passbook' });
  });

  it('defaults to the first page, 25 and every kind; an unknown kind or size is ignored', () => {
    expect(parseImportsUrl({})).toEqual({ page: 0, size: 25, kind: '' });
    expect(parseImportsUrl({ page: 'x', size: '7', kind: 'nope' })).toEqual({ page: 0, size: 25, kind: '' });
  });
});

describe('importsUrl', () => {
  it('leaves defaults out and counts pages from 1', () => {
    expect(importsUrl({ kind: '', size: 25 })).toBe('/data-sources/imports');
    expect(importsUrl({ kind: 'broker', size: 25 })).toBe('/data-sources/imports?kind=broker');
    expect(importsUrl({ kind: 'statement', size: 50 }, 2)).toBe('/data-sources/imports?kind=statement&size=50&page=3');
  });
});
